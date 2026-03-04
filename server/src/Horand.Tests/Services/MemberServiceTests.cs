using FluentAssertions;
using Horand.Application.DTOs.Member;
using Horand.Application.Interfaces;
using Horand.Application.Services;
using Horand.Domain.Entities;
using Horand.Domain.Enums;
using Horand.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;
using Moq;
using Xunit;

namespace Horand.Tests.Services;

public class MemberServiceTests
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

    private async Task<(Guid OwnerId, Guid CompanyId, Guid OwnerMemberId)> SeedOwnerAndCompany(HorandDbContext dbContext)
    {
        var ownerId = Guid.NewGuid();
        var companyId = Guid.NewGuid();
        var memberId = Guid.NewGuid();

        dbContext.Users.Add(new User { Id = ownerId, Email = "owner@test.com", PasswordHash = "hash", FullName = "Owner" });
        dbContext.Companies.Add(new Company { Id = companyId, Name = "Co", Type = CompanyType.Company, CreatedById = ownerId });
        dbContext.CompanyMembers.Add(new CompanyMember { Id = memberId, UserId = ownerId, CompanyId = companyId, Role = MemberRole.Owner });
        await dbContext.SaveChangesAsync();

        return (ownerId, companyId, memberId);
    }

    [Fact]
    public async Task AddMember_ValidData_ShouldAdd()
    {
        // Arrange
        var dbContext = CreateInMemoryContext();
        var auditLog = CreateAuditLogMock();
        var service = new MemberService(dbContext, auditLog.Object);
        var (ownerId, companyId, _) = await SeedOwnerAndCompany(dbContext);

        var newUserId = Guid.NewGuid();
        dbContext.Users.Add(new User { Id = newUserId, Email = "new@test.com", PasswordHash = "hash", FullName = "New User" });
        await dbContext.SaveChangesAsync();

        // Act
        var result = await service.AddMemberAsync(companyId, new AddMemberRequest("new@test.com", "Editor"), ownerId);

        // Assert
        result.Should().NotBeNull();
        result.Email.Should().Be("new@test.com");
        result.Role.Should().Be("Editor");
        (await dbContext.CompanyMembers.CountAsync(m => m.CompanyId == companyId)).Should().Be(2);
    }

    [Fact]
    public async Task AddMember_UserNotFound_ShouldThrow()
    {
        // Arrange
        var dbContext = CreateInMemoryContext();
        var auditLog = CreateAuditLogMock();
        var service = new MemberService(dbContext, auditLog.Object);
        var (ownerId, companyId, _) = await SeedOwnerAndCompany(dbContext);

        // Act
        var act = () => service.AddMemberAsync(companyId, new AddMemberRequest("nobody@test.com", "Editor"), ownerId);

        // Assert
        await act.Should().ThrowAsync<KeyNotFoundException>()
            .WithMessage("*User*not found*");
    }

    [Fact]
    public async Task AddMember_AlreadyMember_ShouldThrow()
    {
        // Arrange
        var dbContext = CreateInMemoryContext();
        var auditLog = CreateAuditLogMock();
        var service = new MemberService(dbContext, auditLog.Object);
        var (ownerId, companyId, _) = await SeedOwnerAndCompany(dbContext);

        // Act — try to add the owner again
        var act = () => service.AddMemberAsync(companyId, new AddMemberRequest("owner@test.com", "Editor"), ownerId);

        // Assert
        await act.Should().ThrowAsync<InvalidOperationException>()
            .WithMessage("*already a member*");
    }

    [Fact]
    public async Task AddMember_EditorCannotAdd_ShouldThrow()
    {
        // Arrange
        var dbContext = CreateInMemoryContext();
        var auditLog = CreateAuditLogMock();
        var service = new MemberService(dbContext, auditLog.Object);
        var (_, companyId, _) = await SeedOwnerAndCompany(dbContext);

        var editorId = Guid.NewGuid();
        dbContext.Users.Add(new User { Id = editorId, Email = "editor@test.com", PasswordHash = "hash", FullName = "Editor" });
        dbContext.CompanyMembers.Add(new CompanyMember { Id = Guid.NewGuid(), UserId = editorId, CompanyId = companyId, Role = MemberRole.Editor });

        var targetId = Guid.NewGuid();
        dbContext.Users.Add(new User { Id = targetId, Email = "target@test.com", PasswordHash = "hash", FullName = "Target" });
        await dbContext.SaveChangesAsync();

        // Act
        var act = () => service.AddMemberAsync(companyId, new AddMemberRequest("target@test.com", "Editor"), editorId);

        // Assert
        await act.Should().ThrowAsync<UnauthorizedAccessException>();
    }

    [Fact]
    public async Task AddMember_NonMember_ShouldThrow()
    {
        // Arrange
        var dbContext = CreateInMemoryContext();
        var auditLog = CreateAuditLogMock();
        var service = new MemberService(dbContext, auditLog.Object);
        var (_, companyId, _) = await SeedOwnerAndCompany(dbContext);

        var outsiderId = Guid.NewGuid();
        var targetId = Guid.NewGuid();
        dbContext.Users.Add(new User { Id = targetId, Email = "target@test.com", PasswordHash = "hash", FullName = "Target" });
        await dbContext.SaveChangesAsync();

        // Act
        var act = () => service.AddMemberAsync(companyId, new AddMemberRequest("target@test.com", "Editor"), outsiderId);

        // Assert
        await act.Should().ThrowAsync<UnauthorizedAccessException>();
    }

    [Fact]
    public async Task ToggleEditor_OwnerTogglesEditor_ShouldSucceed()
    {
        // Arrange
        var dbContext = CreateInMemoryContext();
        var auditLog = CreateAuditLogMock();
        var service = new MemberService(dbContext, auditLog.Object);
        var (ownerId, companyId, _) = await SeedOwnerAndCompany(dbContext);

        var editorId = Guid.NewGuid();
        var editorMemberId = Guid.NewGuid();
        dbContext.Users.Add(new User { Id = editorId, Email = "editor@test.com", PasswordHash = "hash", FullName = "Editor" });
        dbContext.CompanyMembers.Add(new CompanyMember { Id = editorMemberId, UserId = editorId, CompanyId = companyId, Role = MemberRole.Editor });
        await dbContext.SaveChangesAsync();

        // Act — toggle Editor → Viewer
        var result = await service.ToggleEditorAsync(companyId, editorMemberId, ownerId);

        // Assert
        result.Role.Should().Be("Viewer");

        // Act — toggle Viewer → Editor
        var result2 = await service.ToggleEditorAsync(companyId, editorMemberId, ownerId);

        // Assert
        result2.Role.Should().Be("Editor");
    }

    [Fact]
    public async Task ToggleEditor_CannotToggleOwner_ShouldThrow()
    {
        // Arrange
        var dbContext = CreateInMemoryContext();
        var auditLog = CreateAuditLogMock();
        var service = new MemberService(dbContext, auditLog.Object);
        var (ownerId, companyId, ownerMemberId) = await SeedOwnerAndCompany(dbContext);

        // Add a second owner to call toggle on the first
        var owner2Id = Guid.NewGuid();
        var owner2MemberId = Guid.NewGuid();
        dbContext.Users.Add(new User { Id = owner2Id, Email = "owner2@test.com", PasswordHash = "hash", FullName = "Owner2" });
        dbContext.CompanyMembers.Add(new CompanyMember { Id = owner2MemberId, UserId = owner2Id, CompanyId = companyId, Role = MemberRole.Owner });
        await dbContext.SaveChangesAsync();

        // Act — try to toggle an Owner
        var act = () => service.ToggleEditorAsync(companyId, ownerMemberId, owner2Id);

        // Assert
        await act.Should().ThrowAsync<InvalidOperationException>()
            .WithMessage("*Owner*");
    }

    [Fact]
    public async Task ToggleEditor_EditorCannotToggle_ShouldThrow()
    {
        // Arrange
        var dbContext = CreateInMemoryContext();
        var auditLog = CreateAuditLogMock();
        var service = new MemberService(dbContext, auditLog.Object);
        var (_, companyId, _) = await SeedOwnerAndCompany(dbContext);

        var editorId = Guid.NewGuid();
        var editorMemberId = Guid.NewGuid();
        dbContext.Users.Add(new User { Id = editorId, Email = "editor@test.com", PasswordHash = "hash", FullName = "Editor" });
        dbContext.CompanyMembers.Add(new CompanyMember { Id = editorMemberId, UserId = editorId, CompanyId = companyId, Role = MemberRole.Editor });

        var editor2Id = Guid.NewGuid();
        var editor2MemberId = Guid.NewGuid();
        dbContext.Users.Add(new User { Id = editor2Id, Email = "editor2@test.com", PasswordHash = "hash", FullName = "Editor2" });
        dbContext.CompanyMembers.Add(new CompanyMember { Id = editor2MemberId, UserId = editor2Id, CompanyId = companyId, Role = MemberRole.Editor });
        await dbContext.SaveChangesAsync();

        // Act — editor tries to toggle another editor
        var act = () => service.ToggleEditorAsync(companyId, editor2MemberId, editorId);

        // Assert
        await act.Should().ThrowAsync<UnauthorizedAccessException>();
    }

    [Fact]
    public async Task ToggleEditor_MemberNotFound_ShouldThrow()
    {
        // Arrange
        var dbContext = CreateInMemoryContext();
        var auditLog = CreateAuditLogMock();
        var service = new MemberService(dbContext, auditLog.Object);
        var (ownerId, companyId, _) = await SeedOwnerAndCompany(dbContext);

        // Act
        var act = () => service.ToggleEditorAsync(companyId, Guid.NewGuid(), ownerId);

        // Assert
        await act.Should().ThrowAsync<KeyNotFoundException>();
    }

    [Fact]
    public async Task RemoveMember_OwnerRemovesEditor_ShouldSucceed()
    {
        // Arrange
        var dbContext = CreateInMemoryContext();
        var auditLog = CreateAuditLogMock();
        var service = new MemberService(dbContext, auditLog.Object);
        var (ownerId, companyId, _) = await SeedOwnerAndCompany(dbContext);

        var editorId = Guid.NewGuid();
        var editorMemberId = Guid.NewGuid();
        dbContext.Users.Add(new User { Id = editorId, Email = "editor@test.com", PasswordHash = "hash", FullName = "Editor" });
        dbContext.CompanyMembers.Add(new CompanyMember { Id = editorMemberId, UserId = editorId, CompanyId = companyId, Role = MemberRole.Editor });
        await dbContext.SaveChangesAsync();

        // Act
        await service.RemoveMemberAsync(companyId, editorMemberId, ownerId);

        // Assert
        (await dbContext.CompanyMembers.CountAsync(m => m.CompanyId == companyId)).Should().Be(1);
    }

    [Fact]
    public async Task RemoveMember_CannotRemoveSelf_ShouldThrow()
    {
        // Arrange
        var dbContext = CreateInMemoryContext();
        var auditLog = CreateAuditLogMock();
        var service = new MemberService(dbContext, auditLog.Object);
        var (ownerId, companyId, ownerMemberId) = await SeedOwnerAndCompany(dbContext);

        // Act
        var act = () => service.RemoveMemberAsync(companyId, ownerMemberId, ownerId);

        // Assert
        await act.Should().ThrowAsync<InvalidOperationException>()
            .WithMessage("*cannot remove yourself*");
    }

    [Fact]
    public async Task RemoveMember_EditorCannotRemove_ShouldThrow()
    {
        // Arrange
        var dbContext = CreateInMemoryContext();
        var auditLog = CreateAuditLogMock();
        var service = new MemberService(dbContext, auditLog.Object);
        var (_, companyId, _) = await SeedOwnerAndCompany(dbContext);

        var editorId = Guid.NewGuid();
        dbContext.Users.Add(new User { Id = editorId, Email = "editor@test.com", PasswordHash = "hash", FullName = "Editor" });
        dbContext.CompanyMembers.Add(new CompanyMember { Id = Guid.NewGuid(), UserId = editorId, CompanyId = companyId, Role = MemberRole.Editor });

        var editor2Id = Guid.NewGuid();
        var editor2MemberId = Guid.NewGuid();
        dbContext.Users.Add(new User { Id = editor2Id, Email = "editor2@test.com", PasswordHash = "hash", FullName = "Editor2" });
        dbContext.CompanyMembers.Add(new CompanyMember { Id = editor2MemberId, UserId = editor2Id, CompanyId = companyId, Role = MemberRole.Editor });
        await dbContext.SaveChangesAsync();

        // Act
        var act = () => service.RemoveMemberAsync(companyId, editor2MemberId, editorId);

        // Assert
        await act.Should().ThrowAsync<UnauthorizedAccessException>();
    }

    [Fact]
    public async Task RemoveMember_MemberNotFound_ShouldThrow()
    {
        // Arrange
        var dbContext = CreateInMemoryContext();
        var auditLog = CreateAuditLogMock();
        var service = new MemberService(dbContext, auditLog.Object);
        var (ownerId, companyId, _) = await SeedOwnerAndCompany(dbContext);

        // Act
        var act = () => service.RemoveMemberAsync(companyId, Guid.NewGuid(), ownerId);

        // Assert
        await act.Should().ThrowAsync<KeyNotFoundException>();
    }

    [Fact]
    public async Task GetMembers_ShouldReturnAllCompanyMembers()
    {
        // Arrange
        var dbContext = CreateInMemoryContext();
        var auditLog = CreateAuditLogMock();
        var service = new MemberService(dbContext, auditLog.Object);
        var (ownerId, companyId, _) = await SeedOwnerAndCompany(dbContext);

        var editorId = Guid.NewGuid();
        dbContext.Users.Add(new User { Id = editorId, Email = "editor@test.com", PasswordHash = "hash", FullName = "Editor" });
        dbContext.CompanyMembers.Add(new CompanyMember { Id = Guid.NewGuid(), UserId = editorId, CompanyId = companyId, Role = MemberRole.Editor });
        await dbContext.SaveChangesAsync();

        // Act
        var result = await service.GetMembersAsync(companyId, ownerId);

        // Assert
        result.Should().HaveCount(2);
    }
}
