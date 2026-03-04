using FluentAssertions;
using Horand.Application.DTOs.Partner;
using Horand.Application.Interfaces;
using Horand.Application.Services;
using Horand.Domain.Entities;
using Horand.Domain.Enums;
using Horand.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;
using Moq;
using Xunit;

namespace Horand.Tests.Services;

public class PartnerServiceTests
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

    private async Task<(Guid UserId, Guid CompanyId, Guid MemberId)> SeedUserAndCompany(
        HorandDbContext dbContext, MemberRole role = MemberRole.Owner)
    {
        var userId = Guid.NewGuid();
        var companyId = Guid.NewGuid();
        var memberId = Guid.NewGuid();

        dbContext.Users.Add(new User
        {
            Id = userId,
            Email = "test@test.com",
            PasswordHash = "hash",
            FullName = "Test User"
        });
        dbContext.Companies.Add(new Company
        {
            Id = companyId,
            Name = "Test Company",
            Type = CompanyType.Company,
            CreatedById = userId
        });
        dbContext.CompanyMembers.Add(new CompanyMember
        {
            Id = memberId,
            UserId = userId,
            CompanyId = companyId,
            Role = role
        });
        await dbContext.SaveChangesAsync();

        return (userId, companyId, memberId);
    }

    private async Task<Guid> SeedTargetUser(HorandDbContext dbContext, string email = "partner@test.com", string fullName = "Partner User")
    {
        var targetUserId = Guid.NewGuid();
        dbContext.Users.Add(new User
        {
            Id = targetUserId,
            Email = email,
            PasswordHash = "hash",
            FullName = fullName
        });
        await dbContext.SaveChangesAsync();
        return targetUserId;
    }

    [Fact]
    public async Task CreatePartner_ValidData_ShouldCreatePartner()
    {
        // Arrange
        var dbContext = CreateInMemoryContext();
        var auditLog = CreateAuditLogMock();
        var fileStorage = new Mock<IFileStorageService>();
        var service = new PartnerService(dbContext, auditLog.Object, fileStorage.Object);
        var (userId, companyId, _) = await SeedUserAndCompany(dbContext);
        var targetUserId = await SeedTargetUser(dbContext, "partnerA@test.com", "Partner A");

        // Act
        var result = await service.CreatePartnerAsync(companyId, new CreatePartnerRequest(targetUserId, 40m), userId);

        // Assert
        result.Should().NotBeNull();
        result.FullName.Should().Be("Partner A");
        result.CompanyShare.Should().Be(40m);
        (await dbContext.Partners.CountAsync()).Should().Be(1);
    }

    [Fact]
    public async Task CreatePartner_SharesExceed100_ShouldThrow()
    {
        // Arrange
        var dbContext = CreateInMemoryContext();
        var auditLog = CreateAuditLogMock();
        var fileStorage = new Mock<IFileStorageService>();
        var service = new PartnerService(dbContext, auditLog.Object, fileStorage.Object);
        var (userId, companyId, _) = await SeedUserAndCompany(dbContext);
        var targetUserId = await SeedTargetUser(dbContext);

        dbContext.Partners.Add(new Partner { Id = Guid.NewGuid(), CompanyId = companyId, UserId = Guid.NewGuid(), FullName = "Existing", CompanyShare = 70m });
        await dbContext.SaveChangesAsync();

        // Act
        var act = () => service.CreatePartnerAsync(companyId, new CreatePartnerRequest(targetUserId, 40m), userId);

        // Assert
        await act.Should().ThrowAsync<InvalidOperationException>()
            .WithMessage("*exceed*100*");
    }

    [Fact]
    public async Task CreatePartner_EditorRole_ShouldSucceed()
    {
        // Arrange
        var dbContext = CreateInMemoryContext();
        var auditLog = CreateAuditLogMock();
        var fileStorage = new Mock<IFileStorageService>();
        var service = new PartnerService(dbContext, auditLog.Object, fileStorage.Object);
        var (userId, companyId, _) = await SeedUserAndCompany(dbContext, MemberRole.Editor);
        var targetUserId = await SeedTargetUser(dbContext, "partnerB@test.com", "Partner B");

        // Act
        var result = await service.CreatePartnerAsync(companyId, new CreatePartnerRequest(targetUserId, 25m), userId);

        // Assert
        result.Should().NotBeNull();
        result.FullName.Should().Be("Partner B");
    }

    [Fact]
    public async Task CreatePartner_NonMember_ShouldThrow()
    {
        // Arrange
        var dbContext = CreateInMemoryContext();
        var auditLog = CreateAuditLogMock();
        var fileStorage = new Mock<IFileStorageService>();
        var service = new PartnerService(dbContext, auditLog.Object, fileStorage.Object);
        var (_, companyId, _) = await SeedUserAndCompany(dbContext);
        var outsiderId = Guid.NewGuid();
        var targetUserId = await SeedTargetUser(dbContext);

        // Act
        var act = () => service.CreatePartnerAsync(companyId, new CreatePartnerRequest(targetUserId, 10m), outsiderId);

        // Assert
        await act.Should().ThrowAsync<UnauthorizedAccessException>();
    }

    [Fact]
    public async Task CreatePartner_AlreadyPartner_ShouldThrow()
    {
        // Arrange
        var dbContext = CreateInMemoryContext();
        var auditLog = CreateAuditLogMock();
        var fileStorage = new Mock<IFileStorageService>();
        var service = new PartnerService(dbContext, auditLog.Object, fileStorage.Object);
        var (userId, companyId, _) = await SeedUserAndCompany(dbContext);
        var targetUserId = await SeedTargetUser(dbContext);

        // First creation
        await service.CreatePartnerAsync(companyId, new CreatePartnerRequest(targetUserId, 20m), userId);

        // Act — duplicate
        var act = () => service.CreatePartnerAsync(companyId, new CreatePartnerRequest(targetUserId, 10m), userId);

        // Assert
        await act.Should().ThrowAsync<InvalidOperationException>()
            .WithMessage("*already a partner*");
    }

    [Fact]
    public async Task CreatePartner_UserNotFound_ShouldThrow()
    {
        // Arrange
        var dbContext = CreateInMemoryContext();
        var auditLog = CreateAuditLogMock();
        var fileStorage = new Mock<IFileStorageService>();
        var service = new PartnerService(dbContext, auditLog.Object, fileStorage.Object);
        var (userId, companyId, _) = await SeedUserAndCompany(dbContext);

        // Act — use a random Guid that doesn't exist in Users
        var act = () => service.CreatePartnerAsync(companyId, new CreatePartnerRequest(Guid.NewGuid(), 10m), userId);

        // Assert
        await act.Should().ThrowAsync<KeyNotFoundException>()
            .WithMessage("*User*not found*");
    }

    [Fact]
    public async Task CreatePartner_AutoAddsMemberIfNotMember()
    {
        // Arrange
        var dbContext = CreateInMemoryContext();
        var auditLog = CreateAuditLogMock();
        var fileStorage = new Mock<IFileStorageService>();
        var service = new PartnerService(dbContext, auditLog.Object, fileStorage.Object);
        var (userId, companyId, _) = await SeedUserAndCompany(dbContext);
        var targetUserId = await SeedTargetUser(dbContext, "nonmember@test.com", "Non Member");

        // targetUser is NOT a member yet
        var memberBefore = await dbContext.CompanyMembers
            .AnyAsync(cm => cm.UserId == targetUserId && cm.CompanyId == companyId);
        memberBefore.Should().BeFalse();

        // Act
        await service.CreatePartnerAsync(companyId, new CreatePartnerRequest(targetUserId, 20m), userId);

        // Assert — should be auto-added as Editor
        var member = await dbContext.CompanyMembers
            .FirstOrDefaultAsync(cm => cm.UserId == targetUserId && cm.CompanyId == companyId);
        member.Should().NotBeNull();
        member!.Role.Should().Be(MemberRole.Editor);
    }

    [Fact]
    public async Task UpdatePartner_ValidData_ShouldUpdate()
    {
        // Arrange
        var dbContext = CreateInMemoryContext();
        var auditLog = CreateAuditLogMock();
        var fileStorage = new Mock<IFileStorageService>();
        var service = new PartnerService(dbContext, auditLog.Object, fileStorage.Object);
        var (userId, companyId, _) = await SeedUserAndCompany(dbContext);

        var partnerId = Guid.NewGuid();
        dbContext.Partners.Add(new Partner { Id = partnerId, CompanyId = companyId, UserId = Guid.NewGuid(), FullName = "Old Name", CompanyShare = 30m });
        await dbContext.SaveChangesAsync();

        // Act
        var result = await service.UpdatePartnerAsync(companyId, partnerId, new UpdatePartnerRequest(50m), userId);

        // Assert
        result.CompanyShare.Should().Be(50m);
    }

    [Fact]
    public async Task UpdatePartner_SharesExceedWithOthers_ShouldThrow()
    {
        // Arrange
        var dbContext = CreateInMemoryContext();
        var auditLog = CreateAuditLogMock();
        var fileStorage = new Mock<IFileStorageService>();
        var service = new PartnerService(dbContext, auditLog.Object, fileStorage.Object);
        var (userId, companyId, _) = await SeedUserAndCompany(dbContext);

        var p1 = Guid.NewGuid();
        var p2 = Guid.NewGuid();
        dbContext.Partners.Add(new Partner { Id = p1, CompanyId = companyId, UserId = Guid.NewGuid(), FullName = "P1", CompanyShare = 60m });
        dbContext.Partners.Add(new Partner { Id = p2, CompanyId = companyId, UserId = Guid.NewGuid(), FullName = "P2", CompanyShare = 30m });
        await dbContext.SaveChangesAsync();

        // Act — update P2 to 50, but P1 has 60 => total 110
        var act = () => service.UpdatePartnerAsync(companyId, p2, new UpdatePartnerRequest(50m), userId);

        // Assert
        await act.Should().ThrowAsync<InvalidOperationException>();
    }

    [Fact]
    public async Task UpdatePartner_SamePartnerNewShare_ShouldSucceed()
    {
        // Arrange
        var dbContext = CreateInMemoryContext();
        var auditLog = CreateAuditLogMock();
        var fileStorage = new Mock<IFileStorageService>();
        var service = new PartnerService(dbContext, auditLog.Object, fileStorage.Object);
        var (userId, companyId, _) = await SeedUserAndCompany(dbContext);

        var partnerId = Guid.NewGuid();
        dbContext.Partners.Add(new Partner { Id = partnerId, CompanyId = companyId, UserId = Guid.NewGuid(), FullName = "P1", CompanyShare = 80m });
        await dbContext.SaveChangesAsync();

        // Act — update from 80 to 90 (only partner, so others sum = 0)
        var result = await service.UpdatePartnerAsync(companyId, partnerId, new UpdatePartnerRequest(90m), userId);

        // Assert
        result.CompanyShare.Should().Be(90m);
    }

    [Fact]
    public async Task UpdatePartner_NotFound_ShouldThrow()
    {
        // Arrange
        var dbContext = CreateInMemoryContext();
        var auditLog = CreateAuditLogMock();
        var fileStorage = new Mock<IFileStorageService>();
        var service = new PartnerService(dbContext, auditLog.Object, fileStorage.Object);
        var (userId, companyId, _) = await SeedUserAndCompany(dbContext);

        // Act
        var act = () => service.UpdatePartnerAsync(companyId, Guid.NewGuid(), new UpdatePartnerRequest(10m), userId);

        // Assert
        await act.Should().ThrowAsync<KeyNotFoundException>();
    }

    [Fact]
    public async Task UpdatePartner_EditorRole_ShouldSucceed()
    {
        // Arrange
        var dbContext = CreateInMemoryContext();
        var auditLog = CreateAuditLogMock();
        var fileStorage = new Mock<IFileStorageService>();
        var service = new PartnerService(dbContext, auditLog.Object, fileStorage.Object);
        var (userId, companyId, _) = await SeedUserAndCompany(dbContext, MemberRole.Editor);

        var partnerId = Guid.NewGuid();
        dbContext.Partners.Add(new Partner { Id = partnerId, CompanyId = companyId, UserId = Guid.NewGuid(), FullName = "P", CompanyShare = 20m });
        await dbContext.SaveChangesAsync();

        // Act
        var result = await service.UpdatePartnerAsync(companyId, partnerId, new UpdatePartnerRequest(25m), userId);

        // Assert
        result.CompanyShare.Should().Be(25m);
    }

    [Fact]
    public async Task DeletePartner_OwnerRole_ShouldDelete()
    {
        // Arrange
        var dbContext = CreateInMemoryContext();
        var auditLog = CreateAuditLogMock();
        var fileStorage = new Mock<IFileStorageService>();
        var service = new PartnerService(dbContext, auditLog.Object, fileStorage.Object);
        var (userId, companyId, _) = await SeedUserAndCompany(dbContext, MemberRole.Owner);

        var partnerId = Guid.NewGuid();
        dbContext.Partners.Add(new Partner { Id = partnerId, CompanyId = companyId, UserId = Guid.NewGuid(), FullName = "To Delete", CompanyShare = 10m });
        await dbContext.SaveChangesAsync();

        // Act
        await service.DeletePartnerAsync(companyId, partnerId, userId);

        // Assert
        (await dbContext.Partners.CountAsync()).Should().Be(0);
    }

    [Fact]
    public async Task DeletePartner_EditorRole_ShouldSucceed()
    {
        // Arrange
        var dbContext = CreateInMemoryContext();
        var auditLog = CreateAuditLogMock();
        var fileStorage = new Mock<IFileStorageService>();
        var service = new PartnerService(dbContext, auditLog.Object, fileStorage.Object);
        var (userId, companyId, _) = await SeedUserAndCompany(dbContext, MemberRole.Editor);

        var partnerId = Guid.NewGuid();
        dbContext.Partners.Add(new Partner { Id = partnerId, CompanyId = companyId, UserId = Guid.NewGuid(), FullName = "P", CompanyShare = 10m });
        await dbContext.SaveChangesAsync();

        // Act — editors CAN delete (EnsureEditorOrOwnerAsync)
        await service.DeletePartnerAsync(companyId, partnerId, userId);

        // Assert
        (await dbContext.Partners.CountAsync()).Should().Be(0);
    }

    [Fact]
    public async Task DeletePartner_NotFound_ShouldThrow()
    {
        // Arrange
        var dbContext = CreateInMemoryContext();
        var auditLog = CreateAuditLogMock();
        var fileStorage = new Mock<IFileStorageService>();
        var service = new PartnerService(dbContext, auditLog.Object, fileStorage.Object);
        var (userId, companyId, _) = await SeedUserAndCompany(dbContext, MemberRole.Owner);

        // Act
        var act = () => service.DeletePartnerAsync(companyId, Guid.NewGuid(), userId);

        // Assert
        await act.Should().ThrowAsync<KeyNotFoundException>();
    }

    [Fact]
    public async Task DeletePartner_RemovesRelatedRevenueShares()
    {
        // Arrange
        var dbContext = CreateInMemoryContext();
        var auditLog = CreateAuditLogMock();
        var fileStorage = new Mock<IFileStorageService>();
        var service = new PartnerService(dbContext, auditLog.Object, fileStorage.Object);
        var (userId, companyId, _) = await SeedUserAndCompany(dbContext, MemberRole.Owner);

        var partnerId = Guid.NewGuid();
        var ruleId = Guid.NewGuid();
        dbContext.Partners.Add(new Partner { Id = partnerId, CompanyId = companyId, UserId = Guid.NewGuid(), FullName = "P", CompanyShare = 50m });
        dbContext.RevenueRules.Add(new RevenueRule { Id = ruleId, CompanyId = companyId, Type = RevenueRuleType.Project, Name = "R1" });
        dbContext.RevenueShares.Add(new RevenueShare { Id = Guid.NewGuid(), RevenueRuleId = ruleId, PartnerId = partnerId, Percentage = 100m });
        await dbContext.SaveChangesAsync();

        // Act
        await service.DeletePartnerAsync(companyId, partnerId, userId);

        // Assert
        (await dbContext.RevenueShares.CountAsync()).Should().Be(0);
    }

    [Fact]
    public async Task GetPartners_ShouldReturnOnlyCompanyPartners()
    {
        // Arrange
        var dbContext = CreateInMemoryContext();
        var auditLog = CreateAuditLogMock();
        var fileStorage = new Mock<IFileStorageService>();
        var service = new PartnerService(dbContext, auditLog.Object, fileStorage.Object);
        var (userId, companyId, _) = await SeedUserAndCompany(dbContext);

        var otherCompanyId = Guid.NewGuid();
        dbContext.Companies.Add(new Company { Id = otherCompanyId, Name = "Other", Type = CompanyType.Company, CreatedById = userId });
        dbContext.Partners.Add(new Partner { Id = Guid.NewGuid(), CompanyId = companyId, UserId = Guid.NewGuid(), FullName = "Mine", CompanyShare = 30m });
        dbContext.Partners.Add(new Partner { Id = Guid.NewGuid(), CompanyId = otherCompanyId, UserId = Guid.NewGuid(), FullName = "Other", CompanyShare = 20m });
        await dbContext.SaveChangesAsync();

        // Act
        var result = await service.GetPartnersAsync(companyId, userId);

        // Assert
        result.Should().HaveCount(1);
        result[0].FullName.Should().Be("Mine");
    }

    [Fact]
    public async Task GetPartner_NotFound_ShouldThrow()
    {
        // Arrange
        var dbContext = CreateInMemoryContext();
        var auditLog = CreateAuditLogMock();
        var fileStorage = new Mock<IFileStorageService>();
        var service = new PartnerService(dbContext, auditLog.Object, fileStorage.Object);
        var (userId, companyId, _) = await SeedUserAndCompany(dbContext);

        // Act
        var act = () => service.GetPartnerAsync(companyId, Guid.NewGuid(), userId);

        // Assert
        await act.Should().ThrowAsync<KeyNotFoundException>();
    }

    [Fact]
    public async Task UploadPhoto_ShouldUpdatePhotoUrl()
    {
        // Arrange
        var dbContext = CreateInMemoryContext();
        var auditLog = CreateAuditLogMock();
        var fileStorage = new Mock<IFileStorageService>();
        fileStorage.Setup(f => f.SaveFileAsync(It.IsAny<Stream>(), It.IsAny<string>(), It.IsAny<string>()))
            .ReturnsAsync("https://cdn.example.com/photo.jpg");
        var service = new PartnerService(dbContext, auditLog.Object, fileStorage.Object);
        var (userId, companyId, _) = await SeedUserAndCompany(dbContext);

        var partnerId = Guid.NewGuid();
        dbContext.Partners.Add(new Partner { Id = partnerId, CompanyId = companyId, UserId = Guid.NewGuid(), FullName = "P", CompanyShare = 20m });
        await dbContext.SaveChangesAsync();

        // Act
        var url = await service.UploadPhotoAsync(companyId, partnerId, Stream.Null, "photo.jpg", userId);

        // Assert
        url.Should().Be("https://cdn.example.com/photo.jpg");
        var partner = await dbContext.Partners.FindAsync(partnerId);
        partner!.PhotoUrl.Should().Be("https://cdn.example.com/photo.jpg");
    }

    [Fact]
    public async Task UploadPhoto_PartnerNotFound_ShouldThrow()
    {
        // Arrange
        var dbContext = CreateInMemoryContext();
        var auditLog = CreateAuditLogMock();
        var fileStorage = new Mock<IFileStorageService>();
        var service = new PartnerService(dbContext, auditLog.Object, fileStorage.Object);
        var (userId, companyId, _) = await SeedUserAndCompany(dbContext);

        // Act
        var act = () => service.UploadPhotoAsync(companyId, Guid.NewGuid(), Stream.Null, "photo.jpg", userId);

        // Assert
        await act.Should().ThrowAsync<KeyNotFoundException>();
    }
}
