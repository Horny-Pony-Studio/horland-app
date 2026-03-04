using FluentAssertions;
using Horand.Application.Interfaces;
using Horand.Application.Services;
using Horand.Domain.Entities;
using Horand.Domain.Enums;
using Horand.Domain.Interfaces;
using Horand.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;
using Moq;
using Xunit;

namespace Horand.Tests.Services;

public class AgreementServiceTests
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

    private async Task<(Guid P1, Guid P2)> SeedValidAgreementPrerequisites(HorandDbContext dbContext, Guid companyId)
    {
        var p1 = Guid.NewGuid();
        var p2 = Guid.NewGuid();

        dbContext.Partners.Add(new Partner { Id = p1, CompanyId = companyId, UserId = Guid.NewGuid(), FullName = "P1", CompanyShare = 50m });
        dbContext.Partners.Add(new Partner { Id = p2, CompanyId = companyId, UserId = Guid.NewGuid(), FullName = "P2", CompanyShare = 50m });

        // Add all 3 required rule types
        foreach (var type in new[] { RevenueRuleType.Project, RevenueRuleType.ClientIncome, RevenueRuleType.NetProfit })
        {
            var ruleId = Guid.NewGuid();
            dbContext.RevenueRules.Add(new RevenueRule { Id = ruleId, CompanyId = companyId, Type = type, Name = $"{type} Rule" });
            dbContext.RevenueShares.Add(new RevenueShare { Id = Guid.NewGuid(), RevenueRuleId = ruleId, PartnerId = p1, Percentage = 60m });
            dbContext.RevenueShares.Add(new RevenueShare { Id = Guid.NewGuid(), RevenueRuleId = ruleId, PartnerId = p2, Percentage = 40m });
        }

        await dbContext.SaveChangesAsync();
        return (p1, p2);
    }

    [Fact]
    public async Task GenerateAgreement_AllPrerequisites_ShouldCreate()
    {
        // Arrange
        var dbContext = CreateInMemoryContext();
        var auditLog = CreateAuditLogMock();
        var fileStorage = new Mock<IFileStorageService>();
        var pdfService = new Mock<IPdfService>();
        var service = new AgreementService(dbContext, auditLog.Object, fileStorage.Object, pdfService.Object);
        var (userId, companyId) = await SeedUserAndCompany(dbContext);
        await SeedValidAgreementPrerequisites(dbContext, companyId);

        // Act
        var result = await service.GenerateAgreementAsync(companyId, userId);

        // Assert
        result.Should().NotBeNull();
        result.Version.Should().Be(1);
        result.Status.Should().Be("Draft");
        (await dbContext.Agreements.CountAsync()).Should().Be(1);
    }

    [Fact]
    public async Task GenerateAgreement_LessThan2Partners_ShouldThrow()
    {
        // Arrange
        var dbContext = CreateInMemoryContext();
        var auditLog = CreateAuditLogMock();
        var fileStorage = new Mock<IFileStorageService>();
        var pdfService = new Mock<IPdfService>();
        var service = new AgreementService(dbContext, auditLog.Object, fileStorage.Object, pdfService.Object);
        var (userId, companyId) = await SeedUserAndCompany(dbContext);

        dbContext.Partners.Add(new Partner { Id = Guid.NewGuid(), CompanyId = companyId, UserId = Guid.NewGuid(), FullName = "P1", CompanyShare = 100m });
        await dbContext.SaveChangesAsync();

        // Act
        var act = () => service.GenerateAgreementAsync(companyId, userId);

        // Assert
        await act.Should().ThrowAsync<InvalidOperationException>()
            .WithMessage("*2 partners*");
    }

    [Fact]
    public async Task GenerateAgreement_SharesNot100_ShouldThrow()
    {
        // Arrange
        var dbContext = CreateInMemoryContext();
        var auditLog = CreateAuditLogMock();
        var fileStorage = new Mock<IFileStorageService>();
        var pdfService = new Mock<IPdfService>();
        var service = new AgreementService(dbContext, auditLog.Object, fileStorage.Object, pdfService.Object);
        var (userId, companyId) = await SeedUserAndCompany(dbContext);

        dbContext.Partners.Add(new Partner { Id = Guid.NewGuid(), CompanyId = companyId, UserId = Guid.NewGuid(), FullName = "P1", CompanyShare = 40m });
        dbContext.Partners.Add(new Partner { Id = Guid.NewGuid(), CompanyId = companyId, UserId = Guid.NewGuid(), FullName = "P2", CompanyShare = 40m });
        await dbContext.SaveChangesAsync();

        // Act
        var act = () => service.GenerateAgreementAsync(companyId, userId);

        // Assert
        await act.Should().ThrowAsync<InvalidOperationException>()
            .WithMessage("*shares*100*");
    }

    [Fact]
    public async Task GenerateAgreement_MissingProjectRule_ShouldThrow()
    {
        // Arrange
        var dbContext = CreateInMemoryContext();
        var auditLog = CreateAuditLogMock();
        var fileStorage = new Mock<IFileStorageService>();
        var pdfService = new Mock<IPdfService>();
        var service = new AgreementService(dbContext, auditLog.Object, fileStorage.Object, pdfService.Object);
        var (userId, companyId) = await SeedUserAndCompany(dbContext);

        var p1 = Guid.NewGuid();
        var p2 = Guid.NewGuid();
        dbContext.Partners.Add(new Partner { Id = p1, CompanyId = companyId, UserId = Guid.NewGuid(), FullName = "P1", CompanyShare = 50m });
        dbContext.Partners.Add(new Partner { Id = p2, CompanyId = companyId, UserId = Guid.NewGuid(), FullName = "P2", CompanyShare = 50m });

        // Only ClientIncome and NetProfit — missing Project
        foreach (var type in new[] { RevenueRuleType.ClientIncome, RevenueRuleType.NetProfit })
        {
            var ruleId = Guid.NewGuid();
            dbContext.RevenueRules.Add(new RevenueRule { Id = ruleId, CompanyId = companyId, Type = type, Name = $"{type}" });
            dbContext.RevenueShares.Add(new RevenueShare { Id = Guid.NewGuid(), RevenueRuleId = ruleId, PartnerId = p1, Percentage = 50m });
            dbContext.RevenueShares.Add(new RevenueShare { Id = Guid.NewGuid(), RevenueRuleId = ruleId, PartnerId = p2, Percentage = 50m });
        }
        await dbContext.SaveChangesAsync();

        // Act
        var act = () => service.GenerateAgreementAsync(companyId, userId);

        // Assert
        await act.Should().ThrowAsync<InvalidOperationException>()
            .WithMessage("*Project*");
    }

    [Fact]
    public async Task GenerateAgreement_MissingClientIncomeRule_ShouldThrow()
    {
        // Arrange
        var dbContext = CreateInMemoryContext();
        var auditLog = CreateAuditLogMock();
        var fileStorage = new Mock<IFileStorageService>();
        var pdfService = new Mock<IPdfService>();
        var service = new AgreementService(dbContext, auditLog.Object, fileStorage.Object, pdfService.Object);
        var (userId, companyId) = await SeedUserAndCompany(dbContext);

        var p1 = Guid.NewGuid();
        var p2 = Guid.NewGuid();
        dbContext.Partners.Add(new Partner { Id = p1, CompanyId = companyId, UserId = Guid.NewGuid(), FullName = "P1", CompanyShare = 50m });
        dbContext.Partners.Add(new Partner { Id = p2, CompanyId = companyId, UserId = Guid.NewGuid(), FullName = "P2", CompanyShare = 50m });

        foreach (var type in new[] { RevenueRuleType.Project, RevenueRuleType.NetProfit })
        {
            var ruleId = Guid.NewGuid();
            dbContext.RevenueRules.Add(new RevenueRule { Id = ruleId, CompanyId = companyId, Type = type, Name = $"{type}" });
            dbContext.RevenueShares.Add(new RevenueShare { Id = Guid.NewGuid(), RevenueRuleId = ruleId, PartnerId = p1, Percentage = 50m });
            dbContext.RevenueShares.Add(new RevenueShare { Id = Guid.NewGuid(), RevenueRuleId = ruleId, PartnerId = p2, Percentage = 50m });
        }
        await dbContext.SaveChangesAsync();

        // Act
        var act = () => service.GenerateAgreementAsync(companyId, userId);

        // Assert
        await act.Should().ThrowAsync<InvalidOperationException>()
            .WithMessage("*ClientIncome*");
    }

    [Fact]
    public async Task GenerateAgreement_MissingNetProfitRule_ShouldThrow()
    {
        // Arrange
        var dbContext = CreateInMemoryContext();
        var auditLog = CreateAuditLogMock();
        var fileStorage = new Mock<IFileStorageService>();
        var pdfService = new Mock<IPdfService>();
        var service = new AgreementService(dbContext, auditLog.Object, fileStorage.Object, pdfService.Object);
        var (userId, companyId) = await SeedUserAndCompany(dbContext);

        var p1 = Guid.NewGuid();
        var p2 = Guid.NewGuid();
        dbContext.Partners.Add(new Partner { Id = p1, CompanyId = companyId, UserId = Guid.NewGuid(), FullName = "P1", CompanyShare = 50m });
        dbContext.Partners.Add(new Partner { Id = p2, CompanyId = companyId, UserId = Guid.NewGuid(), FullName = "P2", CompanyShare = 50m });

        foreach (var type in new[] { RevenueRuleType.Project, RevenueRuleType.ClientIncome })
        {
            var ruleId = Guid.NewGuid();
            dbContext.RevenueRules.Add(new RevenueRule { Id = ruleId, CompanyId = companyId, Type = type, Name = $"{type}" });
            dbContext.RevenueShares.Add(new RevenueShare { Id = Guid.NewGuid(), RevenueRuleId = ruleId, PartnerId = p1, Percentage = 50m });
            dbContext.RevenueShares.Add(new RevenueShare { Id = Guid.NewGuid(), RevenueRuleId = ruleId, PartnerId = p2, Percentage = 50m });
        }
        await dbContext.SaveChangesAsync();

        // Act
        var act = () => service.GenerateAgreementAsync(companyId, userId);

        // Assert
        await act.Should().ThrowAsync<InvalidOperationException>()
            .WithMessage("*NetProfit*");
    }

    [Fact]
    public async Task GenerateAgreement_RuleSharesNot100_ShouldThrow()
    {
        // Arrange
        var dbContext = CreateInMemoryContext();
        var auditLog = CreateAuditLogMock();
        var fileStorage = new Mock<IFileStorageService>();
        var pdfService = new Mock<IPdfService>();
        var service = new AgreementService(dbContext, auditLog.Object, fileStorage.Object, pdfService.Object);
        var (userId, companyId) = await SeedUserAndCompany(dbContext);

        var p1 = Guid.NewGuid();
        var p2 = Guid.NewGuid();
        dbContext.Partners.Add(new Partner { Id = p1, CompanyId = companyId, UserId = Guid.NewGuid(), FullName = "P1", CompanyShare = 50m });
        dbContext.Partners.Add(new Partner { Id = p2, CompanyId = companyId, UserId = Guid.NewGuid(), FullName = "P2", CompanyShare = 50m });

        // Add all 3 types, but make one with shares != 100
        foreach (var type in new[] { RevenueRuleType.Project, RevenueRuleType.ClientIncome })
        {
            var ruleId = Guid.NewGuid();
            dbContext.RevenueRules.Add(new RevenueRule { Id = ruleId, CompanyId = companyId, Type = type, Name = $"{type}" });
            dbContext.RevenueShares.Add(new RevenueShare { Id = Guid.NewGuid(), RevenueRuleId = ruleId, PartnerId = p1, Percentage = 50m });
            dbContext.RevenueShares.Add(new RevenueShare { Id = Guid.NewGuid(), RevenueRuleId = ruleId, PartnerId = p2, Percentage = 50m });
        }

        // NetProfit with bad shares (sum = 90)
        var badRuleId = Guid.NewGuid();
        dbContext.RevenueRules.Add(new RevenueRule { Id = badRuleId, CompanyId = companyId, Type = RevenueRuleType.NetProfit, Name = "Bad" });
        dbContext.RevenueShares.Add(new RevenueShare { Id = Guid.NewGuid(), RevenueRuleId = badRuleId, PartnerId = p1, Percentage = 60m });
        dbContext.RevenueShares.Add(new RevenueShare { Id = Guid.NewGuid(), RevenueRuleId = badRuleId, PartnerId = p2, Percentage = 30m });
        await dbContext.SaveChangesAsync();

        // Act
        var act = () => service.GenerateAgreementAsync(companyId, userId);

        // Assert
        await act.Should().ThrowAsync<InvalidOperationException>()
            .WithMessage("*shares*100*");
    }

    [Fact]
    public async Task GenerateAgreement_EditorRole_ShouldThrow()
    {
        // Arrange
        var dbContext = CreateInMemoryContext();
        var auditLog = CreateAuditLogMock();
        var fileStorage = new Mock<IFileStorageService>();
        var pdfService = new Mock<IPdfService>();
        var service = new AgreementService(dbContext, auditLog.Object, fileStorage.Object, pdfService.Object);
        var (userId, companyId) = await SeedUserAndCompany(dbContext, MemberRole.Editor);

        // Act
        var act = () => service.GenerateAgreementAsync(companyId, userId);

        // Assert
        await act.Should().ThrowAsync<UnauthorizedAccessException>();
    }

    [Fact]
    public async Task GenerateAgreement_AutoArchivesPreviousActive()
    {
        // Arrange
        var dbContext = CreateInMemoryContext();
        var auditLog = CreateAuditLogMock();
        var fileStorage = new Mock<IFileStorageService>();
        var pdfService = new Mock<IPdfService>();
        var service = new AgreementService(dbContext, auditLog.Object, fileStorage.Object, pdfService.Object);
        var (userId, companyId) = await SeedUserAndCompany(dbContext);
        await SeedValidAgreementPrerequisites(dbContext, companyId);

        // Create an existing Active agreement
        dbContext.Agreements.Add(new Agreement
        {
            Id = Guid.NewGuid(),
            CompanyId = companyId,
            Version = 1,
            Status = AgreementStatus.Active,
            GeneratedAt = DateTime.UtcNow
        });
        await dbContext.SaveChangesAsync();

        // Act
        await service.GenerateAgreementAsync(companyId, userId);

        // Assert
        var oldAgreement = await dbContext.Agreements.FirstAsync(a => a.Version == 1);
        oldAgreement.Status.Should().Be(AgreementStatus.Archived);
    }

    [Fact]
    public async Task GenerateAgreement_AutoArchivesPreviousDraft()
    {
        // Arrange
        var dbContext = CreateInMemoryContext();
        var auditLog = CreateAuditLogMock();
        var fileStorage = new Mock<IFileStorageService>();
        var pdfService = new Mock<IPdfService>();
        var service = new AgreementService(dbContext, auditLog.Object, fileStorage.Object, pdfService.Object);
        var (userId, companyId) = await SeedUserAndCompany(dbContext);
        await SeedValidAgreementPrerequisites(dbContext, companyId);

        dbContext.Agreements.Add(new Agreement
        {
            Id = Guid.NewGuid(),
            CompanyId = companyId,
            Version = 1,
            Status = AgreementStatus.Draft,
            GeneratedAt = DateTime.UtcNow
        });
        await dbContext.SaveChangesAsync();

        // Act
        await service.GenerateAgreementAsync(companyId, userId);

        // Assert
        var oldAgreement = await dbContext.Agreements.FirstAsync(a => a.Version == 1);
        oldAgreement.Status.Should().Be(AgreementStatus.Archived);
    }

    [Fact]
    public async Task GenerateAgreement_VersionIncrementsCorrectly()
    {
        // Arrange
        var dbContext = CreateInMemoryContext();
        var auditLog = CreateAuditLogMock();
        var fileStorage = new Mock<IFileStorageService>();
        var pdfService = new Mock<IPdfService>();
        var service = new AgreementService(dbContext, auditLog.Object, fileStorage.Object, pdfService.Object);
        var (userId, companyId) = await SeedUserAndCompany(dbContext);
        await SeedValidAgreementPrerequisites(dbContext, companyId);

        dbContext.Agreements.Add(new Agreement
        {
            Id = Guid.NewGuid(),
            CompanyId = companyId,
            Version = 3,
            Status = AgreementStatus.Archived,
            GeneratedAt = DateTime.UtcNow
        });
        await dbContext.SaveChangesAsync();

        // Act
        var result = await service.GenerateAgreementAsync(companyId, userId);

        // Assert
        result.Version.Should().Be(4);
    }

    [Fact]
    public async Task SignAgreement_ValidSignature_ShouldCreate()
    {
        // Arrange
        var dbContext = CreateInMemoryContext();
        var auditLog = CreateAuditLogMock();
        var fileStorage = new Mock<IFileStorageService>();
        fileStorage.Setup(f => f.SaveFileAsync(It.IsAny<Stream>(), It.IsAny<string>(), It.IsAny<string>()))
            .ReturnsAsync("https://cdn.example.com/sig.png");
        var pdfService = new Mock<IPdfService>();
        var service = new AgreementService(dbContext, auditLog.Object, fileStorage.Object, pdfService.Object);
        var (userId, companyId) = await SeedUserAndCompany(dbContext);

        // Partner with UserId = userId so the service can find it
        var partnerId = Guid.NewGuid();
        dbContext.Partners.Add(new Partner { Id = partnerId, CompanyId = companyId, UserId = userId, FullName = "P1", CompanyShare = 50m });
        dbContext.Partners.Add(new Partner { Id = Guid.NewGuid(), CompanyId = companyId, UserId = Guid.NewGuid(), FullName = "P2", CompanyShare = 50m });

        var agreementId = Guid.NewGuid();
        dbContext.Agreements.Add(new Agreement
        {
            Id = agreementId,
            CompanyId = companyId,
            Version = 1,
            Status = AgreementStatus.Draft,
            GeneratedAt = DateTime.UtcNow
        });
        await dbContext.SaveChangesAsync();

        // Act — service finds partner by userId, not partnerId
        var result = await service.SignAgreementAsync(companyId, agreementId, Stream.Null, userId);

        // Assert
        result.Should().NotBeNull();
        result.Signatures.Should().HaveCount(1);
        (await dbContext.AgreementSigns.CountAsync()).Should().Be(1);
    }

    [Fact]
    public async Task SignAgreement_AllPartnersSigned_SetsStatusToSigned()
    {
        // Arrange
        var dbContext = CreateInMemoryContext();
        var auditLog = CreateAuditLogMock();
        var fileStorage = new Mock<IFileStorageService>();
        fileStorage.Setup(f => f.SaveFileAsync(It.IsAny<Stream>(), It.IsAny<string>(), It.IsAny<string>()))
            .ReturnsAsync("https://cdn.example.com/sig.png");
        var pdfService = new Mock<IPdfService>();
        var service = new AgreementService(dbContext, auditLog.Object, fileStorage.Object, pdfService.Object);
        var (userId, companyId) = await SeedUserAndCompany(dbContext);

        // Create a second user for partner 2
        var user2Id = Guid.NewGuid();
        dbContext.Users.Add(new User { Id = user2Id, Email = "p2@test.com", PasswordHash = "hash", FullName = "P2 User" });
        dbContext.CompanyMembers.Add(new CompanyMember { Id = Guid.NewGuid(), UserId = user2Id, CompanyId = companyId, Role = MemberRole.Editor });

        var p1 = Guid.NewGuid();
        var p2 = Guid.NewGuid();
        dbContext.Partners.Add(new Partner { Id = p1, CompanyId = companyId, UserId = userId, FullName = "P1", CompanyShare = 50m });
        dbContext.Partners.Add(new Partner { Id = p2, CompanyId = companyId, UserId = user2Id, FullName = "P2", CompanyShare = 50m });

        var agreementId = Guid.NewGuid();
        dbContext.Agreements.Add(new Agreement
        {
            Id = agreementId,
            CompanyId = companyId,
            Version = 1,
            Status = AgreementStatus.Draft,
            GeneratedAt = DateTime.UtcNow
        });

        // P1 already signed
        dbContext.AgreementSigns.Add(new AgreementSign
        {
            Id = Guid.NewGuid(),
            AgreementId = agreementId,
            PartnerId = p1,
            SignatureUrl = "sig1.png",
            SignedAt = DateTime.UtcNow
        });
        await dbContext.SaveChangesAsync();

        // Act — P2 signs (via user2Id), completing all signatures
        await service.SignAgreementAsync(companyId, agreementId, Stream.Null, user2Id);

        // Assert
        var agreement = await dbContext.Agreements.FindAsync(agreementId);
        agreement!.Status.Should().Be(AgreementStatus.Signed);
    }

    [Fact]
    public async Task SignAgreement_AgreementNotFound_ShouldThrow()
    {
        // Arrange
        var dbContext = CreateInMemoryContext();
        var auditLog = CreateAuditLogMock();
        var fileStorage = new Mock<IFileStorageService>();
        var pdfService = new Mock<IPdfService>();
        var service = new AgreementService(dbContext, auditLog.Object, fileStorage.Object, pdfService.Object);
        var (userId, companyId) = await SeedUserAndCompany(dbContext);

        // Act
        var act = () => service.SignAgreementAsync(companyId, Guid.NewGuid(), Stream.Null, userId);

        // Assert
        await act.Should().ThrowAsync<KeyNotFoundException>()
            .WithMessage("*Agreement*");
    }

    [Fact]
    public async Task SignAgreement_PartnerNotFound_ShouldThrow()
    {
        // Arrange
        var dbContext = CreateInMemoryContext();
        var auditLog = CreateAuditLogMock();
        var fileStorage = new Mock<IFileStorageService>();
        var pdfService = new Mock<IPdfService>();
        var service = new AgreementService(dbContext, auditLog.Object, fileStorage.Object, pdfService.Object);
        var (userId, companyId) = await SeedUserAndCompany(dbContext);

        // userId is NOT a partner in this company
        var agreementId = Guid.NewGuid();
        dbContext.Agreements.Add(new Agreement
        {
            Id = agreementId,
            CompanyId = companyId,
            Version = 1,
            Status = AgreementStatus.Draft,
            GeneratedAt = DateTime.UtcNow
        });
        await dbContext.SaveChangesAsync();

        // Act — userId has no partner record
        var act = () => service.SignAgreementAsync(companyId, agreementId, Stream.Null, userId);

        // Assert
        await act.Should().ThrowAsync<KeyNotFoundException>()
            .WithMessage("*not a partner*");
    }

    [Fact]
    public async Task SignAgreement_ArchivedAgreement_ShouldThrow()
    {
        // Arrange
        var dbContext = CreateInMemoryContext();
        var auditLog = CreateAuditLogMock();
        var fileStorage = new Mock<IFileStorageService>();
        var pdfService = new Mock<IPdfService>();
        var service = new AgreementService(dbContext, auditLog.Object, fileStorage.Object, pdfService.Object);
        var (userId, companyId) = await SeedUserAndCompany(dbContext);

        dbContext.Partners.Add(new Partner { Id = Guid.NewGuid(), CompanyId = companyId, UserId = userId, FullName = "P1", CompanyShare = 100m });

        var agreementId = Guid.NewGuid();
        dbContext.Agreements.Add(new Agreement
        {
            Id = agreementId,
            CompanyId = companyId,
            Version = 1,
            Status = AgreementStatus.Archived,
            GeneratedAt = DateTime.UtcNow
        });
        await dbContext.SaveChangesAsync();

        // Act
        var act = () => service.SignAgreementAsync(companyId, agreementId, Stream.Null, userId);

        // Assert
        await act.Should().ThrowAsync<InvalidOperationException>()
            .WithMessage("*archived*");
    }

    [Fact]
    public async Task SignAgreement_AlreadySigned_ShouldThrow()
    {
        // Arrange
        var dbContext = CreateInMemoryContext();
        var auditLog = CreateAuditLogMock();
        var fileStorage = new Mock<IFileStorageService>();
        fileStorage.Setup(f => f.SaveFileAsync(It.IsAny<Stream>(), It.IsAny<string>(), It.IsAny<string>()))
            .ReturnsAsync("https://cdn.example.com/sig.png");
        var pdfService = new Mock<IPdfService>();
        var service = new AgreementService(dbContext, auditLog.Object, fileStorage.Object, pdfService.Object);
        var (userId, companyId) = await SeedUserAndCompany(dbContext);

        var partnerId = Guid.NewGuid();
        dbContext.Partners.Add(new Partner { Id = partnerId, CompanyId = companyId, UserId = userId, FullName = "P1", CompanyShare = 50m });
        dbContext.Partners.Add(new Partner { Id = Guid.NewGuid(), CompanyId = companyId, UserId = Guid.NewGuid(), FullName = "P2", CompanyShare = 50m });

        var agreementId = Guid.NewGuid();
        dbContext.Agreements.Add(new Agreement
        {
            Id = agreementId,
            CompanyId = companyId,
            Version = 1,
            Status = AgreementStatus.Draft,
            GeneratedAt = DateTime.UtcNow
        });

        // Already signed by this partner
        dbContext.AgreementSigns.Add(new AgreementSign
        {
            Id = Guid.NewGuid(),
            AgreementId = agreementId,
            PartnerId = partnerId,
            SignatureUrl = "sig.png",
            SignedAt = DateTime.UtcNow
        });
        await dbContext.SaveChangesAsync();

        // Act
        var act = () => service.SignAgreementAsync(companyId, agreementId, Stream.Null, userId);

        // Assert
        await act.Should().ThrowAsync<InvalidOperationException>()
            .WithMessage("*already signed*");
    }

    [Fact]
    public async Task GetAgreementPdf_ShouldCallPdfService()
    {
        // Arrange
        var dbContext = CreateInMemoryContext();
        var auditLog = CreateAuditLogMock();
        var fileStorage = new Mock<IFileStorageService>();
        var pdfService = new Mock<IPdfService>();
        var pdfBytes = new byte[] { 0x25, 0x50, 0x44, 0x46 };
        pdfService.Setup(p => p.GenerateAgreementPdf(
            It.IsAny<Company>(), It.IsAny<List<Partner>>(),
            It.IsAny<List<RevenueRule>>(), It.IsAny<Agreement>(), It.IsAny<List<AgreementSign>>()))
            .Returns(pdfBytes);
        var service = new AgreementService(dbContext, auditLog.Object, fileStorage.Object, pdfService.Object);
        var (userId, companyId) = await SeedUserAndCompany(dbContext);

        dbContext.Partners.Add(new Partner { Id = Guid.NewGuid(), CompanyId = companyId, UserId = Guid.NewGuid(), FullName = "P", CompanyShare = 100m });

        var agreementId = Guid.NewGuid();
        dbContext.Agreements.Add(new Agreement
        {
            Id = agreementId,
            CompanyId = companyId,
            Version = 1,
            Status = AgreementStatus.Draft,
            GeneratedAt = DateTime.UtcNow
        });
        await dbContext.SaveChangesAsync();

        // Act
        var result = await service.GetAgreementPdfAsync(companyId, agreementId, userId);

        // Assert
        result.Should().BeEquivalentTo(pdfBytes);
        pdfService.Verify(p => p.GenerateAgreementPdf(
            It.IsAny<Company>(), It.IsAny<List<Partner>>(),
            It.IsAny<List<RevenueRule>>(), It.IsAny<Agreement>(), It.IsAny<List<AgreementSign>>()), Times.Once);
    }

    [Fact]
    public async Task GetAgreementPdf_NotFound_ShouldThrow()
    {
        // Arrange
        var dbContext = CreateInMemoryContext();
        var auditLog = CreateAuditLogMock();
        var fileStorage = new Mock<IFileStorageService>();
        var pdfService = new Mock<IPdfService>();
        var service = new AgreementService(dbContext, auditLog.Object, fileStorage.Object, pdfService.Object);
        var (userId, companyId) = await SeedUserAndCompany(dbContext);

        // Act
        var act = () => service.GetAgreementPdfAsync(companyId, Guid.NewGuid(), userId);

        // Assert
        await act.Should().ThrowAsync<KeyNotFoundException>();
    }

    [Fact]
    public async Task GetAgreements_ShouldReturnOrderedByVersionDesc()
    {
        // Arrange
        var dbContext = CreateInMemoryContext();
        var auditLog = CreateAuditLogMock();
        var fileStorage = new Mock<IFileStorageService>();
        var pdfService = new Mock<IPdfService>();
        var service = new AgreementService(dbContext, auditLog.Object, fileStorage.Object, pdfService.Object);
        var (userId, companyId) = await SeedUserAndCompany(dbContext);

        dbContext.Agreements.Add(new Agreement { Id = Guid.NewGuid(), CompanyId = companyId, Version = 1, Status = AgreementStatus.Archived, GeneratedAt = DateTime.UtcNow });
        dbContext.Agreements.Add(new Agreement { Id = Guid.NewGuid(), CompanyId = companyId, Version = 3, Status = AgreementStatus.Draft, GeneratedAt = DateTime.UtcNow });
        dbContext.Agreements.Add(new Agreement { Id = Guid.NewGuid(), CompanyId = companyId, Version = 2, Status = AgreementStatus.Archived, GeneratedAt = DateTime.UtcNow });
        await dbContext.SaveChangesAsync();

        // Act
        var result = await service.GetAgreementsAsync(companyId, userId);

        // Assert
        result.Should().HaveCount(3);
        result[0].Version.Should().Be(3);
        result[1].Version.Should().Be(2);
        result[2].Version.Should().Be(1);
    }

    [Fact]
    public async Task GetAgreement_NotFound_ShouldThrow()
    {
        // Arrange
        var dbContext = CreateInMemoryContext();
        var auditLog = CreateAuditLogMock();
        var fileStorage = new Mock<IFileStorageService>();
        var pdfService = new Mock<IPdfService>();
        var service = new AgreementService(dbContext, auditLog.Object, fileStorage.Object, pdfService.Object);
        var (userId, companyId) = await SeedUserAndCompany(dbContext);

        // Act
        var act = () => service.GetAgreementAsync(companyId, Guid.NewGuid(), userId);

        // Assert
        await act.Should().ThrowAsync<KeyNotFoundException>();
    }
}
