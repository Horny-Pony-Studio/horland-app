using FluentAssertions;
using Horand.Application.DTOs.Auth;
using Horand.Application.Services;
using Horand.Domain.Entities;
using Horand.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Xunit;

namespace Horand.Tests.Services;

public class AuthServiceTests
{
    private HorandDbContext CreateInMemoryContext()
    {
        var options = new DbContextOptionsBuilder<HorandDbContext>()
            .UseInMemoryDatabase(databaseName: Guid.NewGuid().ToString())
            .Options;
        return new HorandDbContext(options);
    }

    private IConfiguration CreateConfiguration()
    {
        var inMemorySettings = new Dictionary<string, string?>
        {
            { "Jwt:Secret", "ThisIsASuperSecretKeyForTestingPurposes123456!" },
            { "Jwt:Issuer", "TestIssuer" },
            { "Jwt:Audience", "TestAudience" }
        };

        return new ConfigurationBuilder()
            .AddInMemoryCollection(inMemorySettings)
            .Build();
    }

    [Fact]
    public async Task Register_ValidData_ShouldCreateUser()
    {
        // Arrange
        var dbContext = CreateInMemoryContext();
        var config = CreateConfiguration();
        var service = new AuthService(dbContext, config);

        // Act
        var (user, tokens) = await service.RegisterAsync(new RegisterRequest("test@example.com", "Password1", "Test User"));

        // Assert
        user.Should().NotBeNull();
        user.Email.Should().Be("test@example.com");
        user.FullName.Should().Be("Test User");
        tokens.AccessToken.Should().NotBeNullOrEmpty();
        tokens.RefreshToken.Should().NotBeNullOrEmpty();
        (await dbContext.Users.CountAsync()).Should().Be(1);
        (await dbContext.RefreshTokens.CountAsync()).Should().Be(1);
    }

    [Fact]
    public async Task Register_DuplicateEmail_ShouldThrow()
    {
        // Arrange
        var dbContext = CreateInMemoryContext();
        var config = CreateConfiguration();
        var service = new AuthService(dbContext, config);

        await service.RegisterAsync(new RegisterRequest("test@example.com", "Password1", "Test User"));

        // Act
        var act = () => service.RegisterAsync(new RegisterRequest("test@example.com", "Password2", "Other User"));

        // Assert
        await act.Should().ThrowAsync<InvalidOperationException>()
            .WithMessage("*already taken*");
    }

    [Fact]
    public async Task Login_ValidCredentials_ShouldReturnTokens()
    {
        // Arrange
        var dbContext = CreateInMemoryContext();
        var config = CreateConfiguration();
        var service = new AuthService(dbContext, config);

        await service.RegisterAsync(new RegisterRequest("test@example.com", "Password1", "Test User"));

        // Act
        var (user, tokens) = await service.LoginAsync(new LoginRequest("test@example.com", "Password1"));

        // Assert
        user.Email.Should().Be("test@example.com");
        tokens.AccessToken.Should().NotBeNullOrEmpty();
        tokens.RefreshToken.Should().NotBeNullOrEmpty();
    }

    [Fact]
    public async Task Login_InvalidEmail_ShouldThrow()
    {
        // Arrange
        var dbContext = CreateInMemoryContext();
        var config = CreateConfiguration();
        var service = new AuthService(dbContext, config);

        // Act
        var act = () => service.LoginAsync(new LoginRequest("nobody@example.com", "Password1"));

        // Assert
        await act.Should().ThrowAsync<UnauthorizedAccessException>()
            .WithMessage("*Invalid credentials*");
    }

    [Fact]
    public async Task Login_WrongPassword_ShouldThrow()
    {
        // Arrange
        var dbContext = CreateInMemoryContext();
        var config = CreateConfiguration();
        var service = new AuthService(dbContext, config);

        await service.RegisterAsync(new RegisterRequest("test@example.com", "Password1", "Test User"));

        // Act
        var act = () => service.LoginAsync(new LoginRequest("test@example.com", "WrongPassword1"));

        // Assert
        await act.Should().ThrowAsync<UnauthorizedAccessException>()
            .WithMessage("*Invalid credentials*");
    }

    [Fact]
    public async Task RefreshToken_ValidToken_ShouldReturnNewPair()
    {
        // Arrange
        var dbContext = CreateInMemoryContext();
        var config = CreateConfiguration();
        var service = new AuthService(dbContext, config);

        var (_, tokens) = await service.RegisterAsync(new RegisterRequest("test@example.com", "Password1", "Test User"));

        // Act
        var newTokens = await service.RefreshTokenAsync(tokens.RefreshToken);

        // Assert
        newTokens.AccessToken.Should().NotBeNullOrEmpty();
        newTokens.RefreshToken.Should().NotBeNullOrEmpty();
        // Old refresh token should be removed, new one added
        (await dbContext.RefreshTokens.CountAsync()).Should().Be(1);
    }

    [Fact]
    public async Task RefreshToken_ExpiredToken_ShouldThrow()
    {
        // Arrange
        var dbContext = CreateInMemoryContext();
        var config = CreateConfiguration();
        var service = new AuthService(dbContext, config);

        var userId = Guid.NewGuid();
        dbContext.Users.Add(new User { Id = userId, Email = "test@example.com", PasswordHash = "hash", FullName = "Test" });
        dbContext.RefreshTokens.Add(new RefreshToken
        {
            Id = Guid.NewGuid(),
            Token = "expired-token",
            UserId = userId,
            ExpiresAt = DateTime.UtcNow.AddDays(-1) // expired
        });
        await dbContext.SaveChangesAsync();

        // Act
        var act = () => service.RefreshTokenAsync("expired-token");

        // Assert
        await act.Should().ThrowAsync<UnauthorizedAccessException>()
            .WithMessage("*Invalid or expired*");
    }

    [Fact]
    public async Task RefreshToken_InvalidToken_ShouldThrow()
    {
        // Arrange
        var dbContext = CreateInMemoryContext();
        var config = CreateConfiguration();
        var service = new AuthService(dbContext, config);

        // Act
        var act = () => service.RefreshTokenAsync("nonexistent-token");

        // Assert
        await act.Should().ThrowAsync<UnauthorizedAccessException>()
            .WithMessage("*Invalid or expired*");
    }

    [Fact]
    public async Task Logout_ExistingToken_ShouldRemove()
    {
        // Arrange
        var dbContext = CreateInMemoryContext();
        var config = CreateConfiguration();
        var service = new AuthService(dbContext, config);

        var (_, tokens) = await service.RegisterAsync(new RegisterRequest("test@example.com", "Password1", "Test User"));
        (await dbContext.RefreshTokens.CountAsync()).Should().Be(1);

        // Act
        await service.LogoutAsync(tokens.RefreshToken);

        // Assert
        (await dbContext.RefreshTokens.CountAsync()).Should().Be(0);
    }

    [Fact]
    public async Task Logout_NonExistentToken_ShouldNotThrow()
    {
        // Arrange
        var dbContext = CreateInMemoryContext();
        var config = CreateConfiguration();
        var service = new AuthService(dbContext, config);

        // Act & Assert — should not throw
        await service.LogoutAsync("nonexistent-token");
    }

    [Fact]
    public async Task GetCurrentUser_ValidId_ShouldReturnUser()
    {
        // Arrange
        var dbContext = CreateInMemoryContext();
        var config = CreateConfiguration();
        var service = new AuthService(dbContext, config);

        var (registeredUser, _) = await service.RegisterAsync(new RegisterRequest("test@example.com", "Password1", "Test User"));

        // Act
        var user = await service.GetCurrentUserAsync(registeredUser.Id);

        // Assert
        user.Email.Should().Be("test@example.com");
        user.FullName.Should().Be("Test User");
    }

    [Fact]
    public async Task GetCurrentUser_InvalidId_ShouldThrow()
    {
        // Arrange
        var dbContext = CreateInMemoryContext();
        var config = CreateConfiguration();
        var service = new AuthService(dbContext, config);

        // Act
        var act = () => service.GetCurrentUserAsync(Guid.NewGuid());

        // Assert
        await act.Should().ThrowAsync<KeyNotFoundException>()
            .WithMessage("*User*not found*");
    }
}
