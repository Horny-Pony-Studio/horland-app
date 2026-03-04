using FluentAssertions;
using Horand.Application.Services;
using Horand.Domain.Entities;
using Horand.Domain.Enums;
using Horand.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;
using Xunit;

namespace Horand.Tests.Services;

public class AuditLogServiceTests
{
    private HorandDbContext CreateInMemoryContext()
    {
        var options = new DbContextOptionsBuilder<HorandDbContext>()
            .UseInMemoryDatabase(databaseName: Guid.NewGuid().ToString())
            .Options;
        return new HorandDbContext(options);
    }

    private async Task<(Guid UserId, Guid CompanyId)> SeedUserAndCompany(
        HorandDbContext dbContext, MemberRole role = MemberRole.Owner)
    {
        var userId = Guid.NewGuid();
        var companyId = Guid.NewGuid();

        dbContext.Users.Add(new User { Id = userId, Email = "test@test.com", PasswordHash = "hash", FullName = "Test User" });
        dbContext.Companies.Add(new Company { Id = companyId, Name = "Co", Type = CompanyType.Company, CreatedById = userId });
        dbContext.CompanyMembers.Add(new CompanyMember { Id = Guid.NewGuid(), UserId = userId, CompanyId = companyId, Role = role });
        await dbContext.SaveChangesAsync();

        return (userId, companyId);
    }

    [Fact]
    public async Task LogAsync_ShouldCreateAuditLogEntry()
    {
        // Arrange
        var dbContext = CreateInMemoryContext();
        var service = new AuditLogService(dbContext);
        var (userId, companyId) = await SeedUserAndCompany(dbContext);
        var entityId = Guid.NewGuid();

        // Act
        await service.LogAsync(companyId, userId, "Created", "Partner", entityId);

        // Assert
        var log = await dbContext.AuditLogs.FirstOrDefaultAsync();
        log.Should().NotBeNull();
        log!.Action.Should().Be("Created");
        log.EntityType.Should().Be("Partner");
        log.EntityId.Should().Be(entityId);
    }

    [Fact]
    public async Task LogAsync_WithOldAndNewValues_ShouldSerializeJson()
    {
        // Arrange
        var dbContext = CreateInMemoryContext();
        var service = new AuditLogService(dbContext);
        var (userId, companyId) = await SeedUserAndCompany(dbContext);

        // Act
        await service.LogAsync(companyId, userId, "Updated", "Company", companyId,
            oldValues: new { Name = "Old" },
            newValues: new { Name = "New" });

        // Assert
        var log = await dbContext.AuditLogs.FirstOrDefaultAsync();
        log.Should().NotBeNull();
        log!.OldValues.Should().Contain("Old");
        log.NewValues.Should().Contain("New");
    }

    [Fact]
    public async Task LogAsync_NullValues_ShouldStoreNull()
    {
        // Arrange
        var dbContext = CreateInMemoryContext();
        var service = new AuditLogService(dbContext);
        var (userId, companyId) = await SeedUserAndCompany(dbContext);

        // Act
        await service.LogAsync(companyId, userId, "Deleted", "Partner", Guid.NewGuid());

        // Assert
        var log = await dbContext.AuditLogs.FirstOrDefaultAsync();
        log.Should().NotBeNull();
        log!.OldValues.Should().BeNull();
        log.NewValues.Should().BeNull();
    }

    [Fact]
    public async Task GetAuditLogs_OwnerAccess_ShouldReturn()
    {
        // Arrange
        var dbContext = CreateInMemoryContext();
        var service = new AuditLogService(dbContext);
        var (userId, companyId) = await SeedUserAndCompany(dbContext, MemberRole.Owner);

        await service.LogAsync(companyId, userId, "Created", "Partner", Guid.NewGuid());
        await service.LogAsync(companyId, userId, "Updated", "Partner", Guid.NewGuid());

        // Act
        var result = await service.GetAuditLogsAsync(companyId, userId);

        // Assert
        result.Items.Should().HaveCount(2);
        result.TotalCount.Should().Be(2);
    }

    [Fact]
    public async Task GetAuditLogs_EditorAccess_ShouldThrow()
    {
        // Arrange
        var dbContext = CreateInMemoryContext();
        var service = new AuditLogService(dbContext);
        var (userId, companyId) = await SeedUserAndCompany(dbContext, MemberRole.Editor);

        // Act
        var act = () => service.GetAuditLogsAsync(companyId, userId);

        // Assert
        await act.Should().ThrowAsync<UnauthorizedAccessException>()
            .WithMessage("*owners*");
    }

    [Fact]
    public async Task GetAuditLogs_NonMember_ShouldThrow()
    {
        // Arrange
        var dbContext = CreateInMemoryContext();
        var service = new AuditLogService(dbContext);
        var (_, companyId) = await SeedUserAndCompany(dbContext);

        // Act
        var act = () => service.GetAuditLogsAsync(companyId, Guid.NewGuid());

        // Assert
        await act.Should().ThrowAsync<UnauthorizedAccessException>();
    }

    [Fact]
    public async Task GetAuditLogs_Pagination_ShouldRespectPageSize()
    {
        // Arrange
        var dbContext = CreateInMemoryContext();
        var service = new AuditLogService(dbContext);
        var (userId, companyId) = await SeedUserAndCompany(dbContext, MemberRole.Owner);

        for (int i = 0; i < 5; i++)
        {
            await service.LogAsync(companyId, userId, "Created", "Partner", Guid.NewGuid());
        }

        // Act
        var result = await service.GetAuditLogsAsync(companyId, userId, page: 1, pageSize: 2);

        // Assert
        result.Items.Should().HaveCount(2);
        result.TotalCount.Should().Be(5);
        result.PageSize.Should().Be(2);
    }

    [Fact]
    public async Task GetAuditLogs_OrderedByCreatedAtDesc()
    {
        // Arrange
        var dbContext = CreateInMemoryContext();
        var service = new AuditLogService(dbContext);
        var (userId, companyId) = await SeedUserAndCompany(dbContext, MemberRole.Owner);

        await service.LogAsync(companyId, userId, "First", "Partner", Guid.NewGuid());
        await service.LogAsync(companyId, userId, "Second", "Partner", Guid.NewGuid());
        await service.LogAsync(companyId, userId, "Third", "Partner", Guid.NewGuid());

        // Act
        var result = await service.GetAuditLogsAsync(companyId, userId);

        // Assert
        result.Items.Should().HaveCount(3);
        // Ordered by CreatedAt desc — most recent first
        result.Items[0].Action.Should().Be("Third");
        result.Items[2].Action.Should().Be("First");
    }
}
