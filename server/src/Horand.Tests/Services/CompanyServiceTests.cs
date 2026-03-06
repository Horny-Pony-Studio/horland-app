using FluentAssertions;
using Horand.Application.DTOs.Company;
using Horand.Application.Interfaces;
using Horand.Application.Services;
using Horand.Application.DTOs.Partner;
using Horand.Domain.Entities;
using Horand.Domain.Enums;
using Horand.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;
using Moq;
using Xunit;

namespace Horand.Tests.Services;

public class CompanyServiceTests
{
    private HorandDbContext CreateInMemoryContext()
    {
        var options = new DbContextOptionsBuilder<HorandDbContext>()
            .UseInMemoryDatabase(databaseName: Guid.NewGuid().ToString())
            .Options;
        return new HorandDbContext(options);
    }

    [Fact]
    public async Task CreateCompany_ShouldCreateCompanyAndAddOwner()
    {
        // Arrange
        var dbContext = CreateInMemoryContext();
        var auditLog = new Mock<IAuditLogService>();
        auditLog.Setup(a => a.LogAsync(It.IsAny<Guid>(), It.IsAny<Guid>(), It.IsAny<string>(),
            It.IsAny<string>(), It.IsAny<Guid>(), It.IsAny<object?>(), It.IsAny<object?>()))
            .Returns(Task.CompletedTask);

        var service = new CompanyService(dbContext, auditLog.Object);
        var userId = Guid.NewGuid();

        // Create user first
        dbContext.Users.Add(new User
        {
            Id = userId,
            Email = "test@test.com",
            PasswordHash = "hash",
            FullName = "Test User"
        });
        await dbContext.SaveChangesAsync();

        // Act
        var result = await service.CreateCompanyAsync(
            new CreateCompanyRequest("Test Company", "Company"),
            userId
        );

        // Assert
        result.Should().NotBeNull();
        result.Name.Should().Be("Test Company");
        result.Type.Should().Be("Company");

        var company = await dbContext.Companies.FirstOrDefaultAsync();
        company.Should().NotBeNull();
        company!.Name.Should().Be("Test Company");

        var member = await dbContext.CompanyMembers.FirstOrDefaultAsync();
        member.Should().NotBeNull();
        member!.Role.Should().Be(MemberRole.Owner);
        member.UserId.Should().Be(userId);

        // Creator should be automatically added as the first partner with 100% share
        var partner = await dbContext.Partners.FirstOrDefaultAsync();
        partner.Should().NotBeNull();
        partner!.UserId.Should().Be(userId);
        partner.CompanyShare.Should().Be(100m);
        partner.FullName.Should().Be("Test User");

        result.PartnersCount.Should().Be(1);
    }

    [Fact]
    public async Task GetUserCompanies_ShouldReturnOnlyUserCompanies()
    {
        // Arrange
        var dbContext = CreateInMemoryContext();
        var auditLog = new Mock<IAuditLogService>();
        var service = new CompanyService(dbContext, auditLog.Object);

        var user1 = new User { Id = Guid.NewGuid(), Email = "user1@test.com", PasswordHash = "hash", FullName = "User 1" };
        var user2 = new User { Id = Guid.NewGuid(), Email = "user2@test.com", PasswordHash = "hash", FullName = "User 2" };
        dbContext.Users.AddRange(user1, user2);

        var company1 = new Company { Id = Guid.NewGuid(), Name = "Company 1", Type = CompanyType.Company, CreatedById = user1.Id };
        var company2 = new Company { Id = Guid.NewGuid(), Name = "Company 2", Type = CompanyType.Project, CreatedById = user2.Id };
        dbContext.Companies.AddRange(company1, company2);

        dbContext.CompanyMembers.Add(new CompanyMember { Id = Guid.NewGuid(), UserId = user1.Id, CompanyId = company1.Id, Role = MemberRole.Owner });
        dbContext.CompanyMembers.Add(new CompanyMember { Id = Guid.NewGuid(), UserId = user2.Id, CompanyId = company2.Id, Role = MemberRole.Owner });

        await dbContext.SaveChangesAsync();

        // Act
        var result = await service.GetUserCompaniesAsync(user1.Id);

        // Assert
        result.Should().HaveCount(1);
        result[0].Name.Should().Be("Company 1");
    }

    private Mock<IAuditLogService> CreateAuditLogMock()
    {
        var mock = new Mock<IAuditLogService>();
        mock.Setup(a => a.LogAsync(It.IsAny<Guid>(), It.IsAny<Guid>(), It.IsAny<string>(),
            It.IsAny<string>(), It.IsAny<Guid>(), It.IsAny<object?>(), It.IsAny<object?>()))
            .Returns(Task.CompletedTask);
        return mock;
    }

    private async Task<(Guid UserId, Guid CompanyId)> SeedUserAndCompany(
        HorandDbContext dbContext, MemberRole role = MemberRole.Owner)
    {
        var userId = Guid.NewGuid();
        var companyId = Guid.NewGuid();

        dbContext.Users.Add(new User { Id = userId, Email = "test@test.com", PasswordHash = "hash", FullName = "Test User" });
        dbContext.Companies.Add(new Company { Id = companyId, Name = "Test Company", Type = CompanyType.Company, CreatedById = userId });
        dbContext.CompanyMembers.Add(new CompanyMember { Id = Guid.NewGuid(), UserId = userId, CompanyId = companyId, Role = role });
        dbContext.Partners.Add(new Partner { Id = Guid.NewGuid(), CompanyId = companyId, FullName = "P1", CompanyShare = 50m });
        await dbContext.SaveChangesAsync();

        return (userId, companyId);
    }

    [Fact]
    public async Task UpdateCompany_OwnerRole_ShouldUpdate()
    {
        // Arrange
        var dbContext = CreateInMemoryContext();
        var auditLog = CreateAuditLogMock();
        var service = new CompanyService(dbContext, auditLog.Object);
        var (userId, companyId) = await SeedUserAndCompany(dbContext);

        // Act
        var result = await service.UpdateCompanyAsync(companyId, new UpdateCompanyRequest("Updated Name"), userId);

        // Assert
        result.Name.Should().Be("Updated Name");
    }

    [Fact]
    public async Task UpdateCompany_EditorRole_ShouldThrow()
    {
        // Arrange
        var dbContext = CreateInMemoryContext();
        var auditLog = CreateAuditLogMock();
        var service = new CompanyService(dbContext, auditLog.Object);
        var (userId, companyId) = await SeedUserAndCompany(dbContext, MemberRole.Editor);

        // Act
        var act = () => service.UpdateCompanyAsync(companyId, new UpdateCompanyRequest("New"), userId);

        // Assert
        await act.Should().ThrowAsync<UnauthorizedAccessException>();
    }

    [Fact]
    public async Task UpdateCompany_NotFound_ShouldThrow()
    {
        // Arrange
        var dbContext = CreateInMemoryContext();
        var auditLog = CreateAuditLogMock();
        var service = new CompanyService(dbContext, auditLog.Object);
        var (userId, _) = await SeedUserAndCompany(dbContext);

        // Create membership for a fake company to pass member check
        var fakeCompanyId = Guid.NewGuid();
        dbContext.CompanyMembers.Add(new CompanyMember { Id = Guid.NewGuid(), UserId = userId, CompanyId = fakeCompanyId, Role = MemberRole.Owner });
        await dbContext.SaveChangesAsync();

        // Act
        var act = () => service.UpdateCompanyAsync(fakeCompanyId, new UpdateCompanyRequest("X"), userId);

        // Assert
        await act.Should().ThrowAsync<KeyNotFoundException>();
    }

    [Fact]
    public async Task DeleteCompany_OwnerRole_ShouldDelete()
    {
        // Arrange
        var dbContext = CreateInMemoryContext();
        var auditLog = CreateAuditLogMock();
        var service = new CompanyService(dbContext, auditLog.Object);
        var (userId, companyId) = await SeedUserAndCompany(dbContext);

        // Act
        await service.DeleteCompanyAsync(companyId, userId);

        // Assert
        (await dbContext.Companies.FindAsync(companyId)).Should().BeNull();
    }

    [Fact]
    public async Task DeleteCompany_EditorRole_ShouldThrow()
    {
        // Arrange
        var dbContext = CreateInMemoryContext();
        var auditLog = CreateAuditLogMock();
        var service = new CompanyService(dbContext, auditLog.Object);
        var (userId, companyId) = await SeedUserAndCompany(dbContext, MemberRole.Editor);

        // Act
        var act = () => service.DeleteCompanyAsync(companyId, userId);

        // Assert
        await act.Should().ThrowAsync<UnauthorizedAccessException>();
    }

    [Fact]
    public async Task DeleteCompany_NotFound_ShouldThrow()
    {
        // Arrange
        var dbContext = CreateInMemoryContext();
        var auditLog = CreateAuditLogMock();
        var service = new CompanyService(dbContext, auditLog.Object);
        var (userId, _) = await SeedUserAndCompany(dbContext);

        var fakeCompanyId = Guid.NewGuid();
        dbContext.CompanyMembers.Add(new CompanyMember { Id = Guid.NewGuid(), UserId = userId, CompanyId = fakeCompanyId, Role = MemberRole.Owner });
        await dbContext.SaveChangesAsync();

        // Act
        var act = () => service.DeleteCompanyAsync(fakeCompanyId, userId);

        // Assert
        await act.Should().ThrowAsync<KeyNotFoundException>();
    }

    [Fact]
    public async Task GetCompany_ShouldReturnDetailWithShares()
    {
        // Arrange
        var dbContext = CreateInMemoryContext();
        var auditLog = CreateAuditLogMock();
        var service = new CompanyService(dbContext, auditLog.Object);
        var (userId, companyId) = await SeedUserAndCompany(dbContext);

        // Act
        var result = await service.GetCompanyAsync(companyId, userId);

        // Assert
        result.Should().NotBeNull();
        result.Name.Should().Be("Test Company");
        result.TotalShares.Should().Be(50m);
        result.PartnersCount.Should().Be(1);
    }

    [Fact]
    public async Task GetCompany_NonMember_ShouldThrow()
    {
        // Arrange
        var dbContext = CreateInMemoryContext();
        var auditLog = CreateAuditLogMock();
        var service = new CompanyService(dbContext, auditLog.Object);
        var (_, companyId) = await SeedUserAndCompany(dbContext);

        // Act
        var act = () => service.GetCompanyAsync(companyId, Guid.NewGuid());

        // Assert
        await act.Should().ThrowAsync<UnauthorizedAccessException>();
    }

    [Fact]
    public async Task CreateCompany_InvalidType_ShouldThrow()
    {
        // Arrange
        var dbContext = CreateInMemoryContext();
        var auditLog = CreateAuditLogMock();
        var service = new CompanyService(dbContext, auditLog.Object);
        var userId = Guid.NewGuid();
        dbContext.Users.Add(new User { Id = userId, Email = "u@t.com", PasswordHash = "h", FullName = "U" });
        await dbContext.SaveChangesAsync();

        // Act
        var act = () => service.CreateCompanyAsync(new CreateCompanyRequest("Co", "InvalidType"), userId);

        // Assert
        await act.Should().ThrowAsync<InvalidOperationException>()
            .WithMessage("*Invalid company type*");
    }
}
