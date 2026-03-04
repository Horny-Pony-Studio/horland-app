using FluentAssertions;
using Horand.Application.DTOs.Revenue;
using Horand.Application.Interfaces;
using Horand.Application.Services;
using Horand.Domain.Entities;
using Horand.Domain.Enums;
using Horand.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;
using Moq;
using Xunit;

namespace Horand.Tests.Services;

public class RevenueRuleServiceTests
{
    private HorandDbContext CreateInMemoryContext()
    {
        var options = new DbContextOptionsBuilder<HorandDbContext>()
            .UseInMemoryDatabase(databaseName: Guid.NewGuid().ToString())
            .Options;
        return new HorandDbContext(options);
    }

    private Mock<IAuditLogService> CreateAuditLogMock()
    {
        var mock = new Mock<IAuditLogService>();
        mock.Setup(a => a.LogAsync(It.IsAny<Guid>(), It.IsAny<Guid>(), It.IsAny<string>(),
            It.IsAny<string>(), It.IsAny<Guid>(), It.IsAny<object?>(), It.IsAny<object?>()))
            .Returns(Task.CompletedTask);
        return mock;
    }

    private async Task<(Guid UserId, Guid CompanyId, Guid Partner1Id, Guid Partner2Id)> SeedCompanyWithPartners(
        HorandDbContext dbContext, MemberRole role = MemberRole.Owner)
    {
        var userId = Guid.NewGuid();
        var companyId = Guid.NewGuid();
        var p1 = Guid.NewGuid();
        var p2 = Guid.NewGuid();

        dbContext.Users.Add(new User { Id = userId, Email = "test@test.com", PasswordHash = "hash", FullName = "Test User" });
        dbContext.Companies.Add(new Company { Id = companyId, Name = "Co", Type = CompanyType.Company, CreatedById = userId });
        dbContext.CompanyMembers.Add(new CompanyMember { Id = Guid.NewGuid(), UserId = userId, CompanyId = companyId, Role = role });
        dbContext.Partners.Add(new Partner { Id = p1, CompanyId = companyId, FullName = "Partner 1", CompanyShare = 50m });
        dbContext.Partners.Add(new Partner { Id = p2, CompanyId = companyId, FullName = "Partner 2", CompanyShare = 50m });
        await dbContext.SaveChangesAsync();

        return (userId, companyId, p1, p2);
    }

    [Fact]
    public async Task CreateRevenueRule_ValidData_ShouldCreate()
    {
        // Arrange
        var dbContext = CreateInMemoryContext();
        var auditLog = CreateAuditLogMock();
        var service = new RevenueRuleService(dbContext, auditLog.Object);
        var (userId, companyId, p1, p2) = await SeedCompanyWithPartners(dbContext);

        var request = new CreateRevenueRuleRequest("Project", "Rule A", new List<RevenueShareInput>
        {
            new(p1, 60m),
            new(p2, 40m)
        });

        // Act
        var result = await service.CreateRevenueRuleAsync(companyId, request, userId);

        // Assert
        result.Should().NotBeNull();
        result.Name.Should().Be("Rule A");
        result.Type.Should().Be("Project");
        result.Shares.Should().HaveCount(2);
        (await dbContext.RevenueRules.CountAsync()).Should().Be(1);
    }

    [Fact]
    public async Task CreateRevenueRule_SharesNot100_ShouldThrow()
    {
        // Arrange
        var dbContext = CreateInMemoryContext();
        var auditLog = CreateAuditLogMock();
        var service = new RevenueRuleService(dbContext, auditLog.Object);
        var (userId, companyId, p1, p2) = await SeedCompanyWithPartners(dbContext);

        var request = new CreateRevenueRuleRequest("Project", "Rule", new List<RevenueShareInput>
        {
            new(p1, 60m),
            new(p2, 30m)
        });

        // Act
        var act = () => service.CreateRevenueRuleAsync(companyId, request, userId);

        // Assert
        await act.Should().ThrowAsync<InvalidOperationException>()
            .WithMessage("*sum*100*");
    }

    [Fact]
    public async Task CreateRevenueRule_InvalidPartners_ShouldThrow()
    {
        // Arrange
        var dbContext = CreateInMemoryContext();
        var auditLog = CreateAuditLogMock();
        var service = new RevenueRuleService(dbContext, auditLog.Object);
        var (userId, companyId, _, _) = await SeedCompanyWithPartners(dbContext);

        var fakePartnerId = Guid.NewGuid();
        var request = new CreateRevenueRuleRequest("Project", "Rule", new List<RevenueShareInput>
        {
            new(fakePartnerId, 100m)
        });

        // Act
        var act = () => service.CreateRevenueRuleAsync(companyId, request, userId);

        // Assert
        await act.Should().ThrowAsync<InvalidOperationException>()
            .WithMessage("*partners*not belong*");
    }

    [Fact]
    public async Task CreateRevenueRule_InvalidType_ShouldThrow()
    {
        // Arrange
        var dbContext = CreateInMemoryContext();
        var auditLog = CreateAuditLogMock();
        var service = new RevenueRuleService(dbContext, auditLog.Object);
        var (userId, companyId, p1, _) = await SeedCompanyWithPartners(dbContext);

        var request = new CreateRevenueRuleRequest("InvalidType", "Rule", new List<RevenueShareInput>
        {
            new(p1, 100m)
        });

        // Act
        var act = () => service.CreateRevenueRuleAsync(companyId, request, userId);

        // Assert
        await act.Should().ThrowAsync<InvalidOperationException>()
            .WithMessage("*Invalid revenue rule type*");
    }

    [Fact]
    public async Task CreateRevenueRule_EditorRole_ShouldSucceed()
    {
        // Arrange
        var dbContext = CreateInMemoryContext();
        var auditLog = CreateAuditLogMock();
        var service = new RevenueRuleService(dbContext, auditLog.Object);
        var (userId, companyId, p1, p2) = await SeedCompanyWithPartners(dbContext, MemberRole.Editor);

        var request = new CreateRevenueRuleRequest("ClientIncome", "Rule", new List<RevenueShareInput>
        {
            new(p1, 50m),
            new(p2, 50m)
        });

        // Act
        var result = await service.CreateRevenueRuleAsync(companyId, request, userId);

        // Assert
        result.Should().NotBeNull();
        result.Type.Should().Be("ClientIncome");
    }

    [Fact]
    public async Task CreateRevenueRule_NonMember_ShouldThrow()
    {
        // Arrange
        var dbContext = CreateInMemoryContext();
        var auditLog = CreateAuditLogMock();
        var service = new RevenueRuleService(dbContext, auditLog.Object);
        var (_, companyId, p1, p2) = await SeedCompanyWithPartners(dbContext);

        var outsiderId = Guid.NewGuid();
        var request = new CreateRevenueRuleRequest("Project", "Rule", new List<RevenueShareInput>
        {
            new(p1, 60m),
            new(p2, 40m)
        });

        // Act
        var act = () => service.CreateRevenueRuleAsync(companyId, request, outsiderId);

        // Assert
        await act.Should().ThrowAsync<UnauthorizedAccessException>();
    }

    [Fact]
    public async Task UpdateRevenueRule_ValidData_ShouldUpdate()
    {
        // Arrange
        var dbContext = CreateInMemoryContext();
        var auditLog = CreateAuditLogMock();
        var service = new RevenueRuleService(dbContext, auditLog.Object);
        var (userId, companyId, p1, p2) = await SeedCompanyWithPartners(dbContext);

        var ruleId = Guid.NewGuid();
        dbContext.RevenueRules.Add(new RevenueRule { Id = ruleId, CompanyId = companyId, Type = RevenueRuleType.Project, Name = "Old" });
        dbContext.RevenueShares.Add(new RevenueShare { Id = Guid.NewGuid(), RevenueRuleId = ruleId, PartnerId = p1, Percentage = 100m });
        await dbContext.SaveChangesAsync();

        var request = new UpdateRevenueRuleRequest("Updated", new List<RevenueShareInput>
        {
            new(p1, 70m),
            new(p2, 30m)
        });

        // Act
        var result = await service.UpdateRevenueRuleAsync(companyId, ruleId, request, userId);

        // Assert
        result.Name.Should().Be("Updated");
        result.Shares.Should().HaveCount(2);
    }

    [Fact]
    public async Task UpdateRevenueRule_SharesNot100_ShouldThrow()
    {
        // Arrange
        var dbContext = CreateInMemoryContext();
        var auditLog = CreateAuditLogMock();
        var service = new RevenueRuleService(dbContext, auditLog.Object);
        var (userId, companyId, p1, p2) = await SeedCompanyWithPartners(dbContext);

        var ruleId = Guid.NewGuid();
        dbContext.RevenueRules.Add(new RevenueRule { Id = ruleId, CompanyId = companyId, Type = RevenueRuleType.Project, Name = "R" });
        dbContext.RevenueShares.Add(new RevenueShare { Id = Guid.NewGuid(), RevenueRuleId = ruleId, PartnerId = p1, Percentage = 100m });
        await dbContext.SaveChangesAsync();

        var request = new UpdateRevenueRuleRequest("R", new List<RevenueShareInput>
        {
            new(p1, 50m),
            new(p2, 40m)
        });

        // Act
        var act = () => service.UpdateRevenueRuleAsync(companyId, ruleId, request, userId);

        // Assert
        await act.Should().ThrowAsync<InvalidOperationException>()
            .WithMessage("*sum*100*");
    }

    [Fact]
    public async Task UpdateRevenueRule_InvalidPartners_ShouldThrow()
    {
        // Arrange
        var dbContext = CreateInMemoryContext();
        var auditLog = CreateAuditLogMock();
        var service = new RevenueRuleService(dbContext, auditLog.Object);
        var (userId, companyId, p1, _) = await SeedCompanyWithPartners(dbContext);

        var ruleId = Guid.NewGuid();
        dbContext.RevenueRules.Add(new RevenueRule { Id = ruleId, CompanyId = companyId, Type = RevenueRuleType.Project, Name = "R" });
        dbContext.RevenueShares.Add(new RevenueShare { Id = Guid.NewGuid(), RevenueRuleId = ruleId, PartnerId = p1, Percentage = 100m });
        await dbContext.SaveChangesAsync();

        var request = new UpdateRevenueRuleRequest("R", new List<RevenueShareInput>
        {
            new(Guid.NewGuid(), 100m)
        });

        // Act
        var act = () => service.UpdateRevenueRuleAsync(companyId, ruleId, request, userId);

        // Assert
        await act.Should().ThrowAsync<InvalidOperationException>()
            .WithMessage("*partners*not belong*");
    }

    [Fact]
    public async Task UpdateRevenueRule_NotFound_ShouldThrow()
    {
        // Arrange
        var dbContext = CreateInMemoryContext();
        var auditLog = CreateAuditLogMock();
        var service = new RevenueRuleService(dbContext, auditLog.Object);
        var (userId, companyId, p1, _) = await SeedCompanyWithPartners(dbContext);

        var request = new UpdateRevenueRuleRequest("R", new List<RevenueShareInput>
        {
            new(p1, 100m)
        });

        // Act
        var act = () => service.UpdateRevenueRuleAsync(companyId, Guid.NewGuid(), request, userId);

        // Assert
        await act.Should().ThrowAsync<KeyNotFoundException>();
    }

    [Fact]
    public async Task UpdateRevenueRule_ReplacesOldShares()
    {
        // Arrange
        var dbContext = CreateInMemoryContext();
        var auditLog = CreateAuditLogMock();
        var service = new RevenueRuleService(dbContext, auditLog.Object);
        var (userId, companyId, p1, p2) = await SeedCompanyWithPartners(dbContext);

        var ruleId = Guid.NewGuid();
        dbContext.RevenueRules.Add(new RevenueRule { Id = ruleId, CompanyId = companyId, Type = RevenueRuleType.Project, Name = "R" });
        dbContext.RevenueShares.Add(new RevenueShare { Id = Guid.NewGuid(), RevenueRuleId = ruleId, PartnerId = p1, Percentage = 100m });
        await dbContext.SaveChangesAsync();

        var request = new UpdateRevenueRuleRequest("R", new List<RevenueShareInput>
        {
            new(p1, 50m),
            new(p2, 50m)
        });

        // Act
        await service.UpdateRevenueRuleAsync(companyId, ruleId, request, userId);

        // Assert — old single share replaced with two new ones
        var shares = await dbContext.RevenueShares.Where(s => s.RevenueRuleId == ruleId).ToListAsync();
        shares.Should().HaveCount(2);
    }

    [Fact]
    public async Task DeleteRevenueRule_OwnerRole_ShouldDelete()
    {
        // Arrange
        var dbContext = CreateInMemoryContext();
        var auditLog = CreateAuditLogMock();
        var service = new RevenueRuleService(dbContext, auditLog.Object);
        var (userId, companyId, _, _) = await SeedCompanyWithPartners(dbContext, MemberRole.Owner);

        var ruleId = Guid.NewGuid();
        dbContext.RevenueRules.Add(new RevenueRule { Id = ruleId, CompanyId = companyId, Type = RevenueRuleType.Project, Name = "R" });
        await dbContext.SaveChangesAsync();

        // Act
        await service.DeleteRevenueRuleAsync(companyId, ruleId, userId);

        // Assert
        (await dbContext.RevenueRules.CountAsync()).Should().Be(0);
    }

    [Fact]
    public async Task DeleteRevenueRule_EditorRole_ShouldThrow()
    {
        // Arrange
        var dbContext = CreateInMemoryContext();
        var auditLog = CreateAuditLogMock();
        var service = new RevenueRuleService(dbContext, auditLog.Object);
        var (userId, companyId, _, _) = await SeedCompanyWithPartners(dbContext, MemberRole.Editor);

        var ruleId = Guid.NewGuid();
        dbContext.RevenueRules.Add(new RevenueRule { Id = ruleId, CompanyId = companyId, Type = RevenueRuleType.Project, Name = "R" });
        await dbContext.SaveChangesAsync();

        // Act
        var act = () => service.DeleteRevenueRuleAsync(companyId, ruleId, userId);

        // Assert
        await act.Should().ThrowAsync<UnauthorizedAccessException>();
    }

    [Fact]
    public async Task DeleteRevenueRule_NotFound_ShouldThrow()
    {
        // Arrange
        var dbContext = CreateInMemoryContext();
        var auditLog = CreateAuditLogMock();
        var service = new RevenueRuleService(dbContext, auditLog.Object);
        var (userId, companyId, _, _) = await SeedCompanyWithPartners(dbContext, MemberRole.Owner);

        // Act
        var act = () => service.DeleteRevenueRuleAsync(companyId, Guid.NewGuid(), userId);

        // Assert
        await act.Should().ThrowAsync<KeyNotFoundException>();
    }

    [Fact]
    public async Task GetRevenueRules_ShouldReturnOnlyCompanyRules()
    {
        // Arrange
        var dbContext = CreateInMemoryContext();
        var auditLog = CreateAuditLogMock();
        var service = new RevenueRuleService(dbContext, auditLog.Object);
        var (userId, companyId, p1, p2) = await SeedCompanyWithPartners(dbContext);

        var otherCompanyId = Guid.NewGuid();
        dbContext.Companies.Add(new Company { Id = otherCompanyId, Name = "Other", Type = CompanyType.Company, CreatedById = userId });

        dbContext.RevenueRules.Add(new RevenueRule { Id = Guid.NewGuid(), CompanyId = companyId, Type = RevenueRuleType.Project, Name = "Mine" });
        dbContext.RevenueRules.Add(new RevenueRule { Id = Guid.NewGuid(), CompanyId = otherCompanyId, Type = RevenueRuleType.Project, Name = "Other" });
        await dbContext.SaveChangesAsync();

        // Act
        var result = await service.GetRevenueRulesAsync(companyId, userId);

        // Assert
        result.Should().HaveCount(1);
        result[0].Name.Should().Be("Mine");
    }
}
