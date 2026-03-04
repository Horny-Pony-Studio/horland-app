using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Security.Cryptography;
using System.Text;
using Horand.Application.DTOs.Auth;
using Horand.Application.Interfaces;
using Horand.Domain.Entities;
using Horand.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.IdentityModel.Tokens;

namespace Horand.Application.Services;

public class AuthService : IAuthService
{
    private readonly HorandDbContext _dbContext;
    private readonly IConfiguration _configuration;

    public AuthService(HorandDbContext dbContext, IConfiguration configuration)
    {
        _dbContext = dbContext;
        _configuration = configuration;
    }

    public async Task<(AuthResponse User, TokenPair Tokens)> RegisterAsync(RegisterRequest request)
    {
        var existingUser = await _dbContext.Users
            .AnyAsync(u => u.Email == request.Email);

        if (existingUser)
            throw new InvalidOperationException("Email is already taken");

        var user = new User
        {
            Id = Guid.NewGuid(),
            Email = request.Email,
            PasswordHash = BCrypt.Net.BCrypt.HashPassword(request.Password, 12),
            FullName = request.FullName
        };

        _dbContext.Users.Add(user);
        await _dbContext.SaveChangesAsync();

        var tokenPair = await GenerateTokenPair(user);
        var authResponse = new AuthResponse(user.Id, user.Email, user.FullName);

        return (authResponse, tokenPair);
    }

    public async Task<(AuthResponse User, TokenPair Tokens)> LoginAsync(LoginRequest request)
    {
        var user = await _dbContext.Users
            .FirstOrDefaultAsync(u => u.Email == request.Email);

        if (user == null || !BCrypt.Net.BCrypt.Verify(request.Password, user.PasswordHash))
            throw new UnauthorizedAccessException("Invalid credentials");

        var tokenPair = await GenerateTokenPair(user);
        var authResponse = new AuthResponse(user.Id, user.Email, user.FullName);

        return (authResponse, tokenPair);
    }

    public async Task<TokenPair> RefreshTokenAsync(string refreshToken)
    {
        var storedToken = await _dbContext.RefreshTokens
            .Include(rt => rt.User)
            .FirstOrDefaultAsync(rt => rt.Token == refreshToken);

        if (storedToken == null || storedToken.ExpiresAt < DateTime.UtcNow)
            throw new UnauthorizedAccessException("Invalid or expired refresh token");

        _dbContext.RefreshTokens.Remove(storedToken);

        var tokenPair = await GenerateTokenPair(storedToken.User);

        return tokenPair;
    }

    public async Task LogoutAsync(string refreshToken)
    {
        var storedToken = await _dbContext.RefreshTokens
            .FirstOrDefaultAsync(rt => rt.Token == refreshToken);

        if (storedToken != null)
        {
            _dbContext.RefreshTokens.Remove(storedToken);
            await _dbContext.SaveChangesAsync();
        }
    }

    public async Task<AuthResponse> GetCurrentUserAsync(Guid userId)
    {
        var user = await _dbContext.Users.FindAsync(userId);

        if (user == null)
            throw new KeyNotFoundException("User not found");

        return new AuthResponse(user.Id, user.Email, user.FullName);
    }

    private async Task<TokenPair> GenerateTokenPair(User user)
    {
        var secret = _configuration["Jwt:Secret"]!;
        var issuer = _configuration["Jwt:Issuer"];
        var audience = _configuration["Jwt:Audience"];

        var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(secret));
        var credentials = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);

        var claims = new[]
        {
            new Claim(JwtRegisteredClaimNames.Sub, user.Id.ToString()),
            new Claim(JwtRegisteredClaimNames.Email, user.Email),
            new Claim(JwtRegisteredClaimNames.Name, user.FullName)
        };

        var accessToken = new JwtSecurityToken(
            issuer: issuer,
            audience: audience,
            claims: claims,
            expires: DateTime.UtcNow.AddMinutes(15),
            signingCredentials: credentials
        );

        var accessTokenString = new JwtSecurityTokenHandler().WriteToken(accessToken);

        var randomBytes = RandomNumberGenerator.GetBytes(64);
        var refreshTokenString = Convert.ToBase64String(randomBytes);

        var refreshToken = new RefreshToken
        {
            Id = Guid.NewGuid(),
            Token = refreshTokenString,
            UserId = user.Id,
            ExpiresAt = DateTime.UtcNow.AddDays(7)
        };

        _dbContext.RefreshTokens.Add(refreshToken);
        await _dbContext.SaveChangesAsync();

        return new TokenPair(accessTokenString, refreshTokenString);
    }
}
