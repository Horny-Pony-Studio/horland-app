using Horand.Application.DTOs.Member;
using Horand.Application.Interfaces;
using Horand.Domain.Entities;
using Horand.Domain.Enums;
using Horand.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;

namespace Horand.Application.Services;

public class MemberService : IMemberService
{
    private readonly HorandDbContext _dbContext;
    private readonly IAuditLogService _auditLog;

    public MemberService(HorandDbContext dbContext, IAuditLogService auditLog)
    {
        _dbContext = dbContext;
        _auditLog = auditLog;
    }

    public async Task<List<MemberResponse>> GetMembersAsync(Guid companyId, Guid userId)
    {
        await EnsureMemberAsync(companyId, userId);

        var members = await _dbContext.CompanyMembers
            .Where(cm => cm.CompanyId == companyId)
            .Include(cm => cm.User)
            .Select(cm => new MemberResponse(
                cm.Id,
                cm.UserId,
                cm.User.Email,
                cm.User.FullName,
                cm.Role.ToString(),
                cm.CreatedAt
            ))
            .ToListAsync();

        return members;
    }

    public async Task<MemberResponse> AddMemberAsync(Guid companyId, AddMemberRequest request, Guid userId)
    {
        await EnsureOwnerAsync(companyId, userId);

        var user = await _dbContext.Users
            .FirstOrDefaultAsync(u => u.Email == request.Email);

        if (user == null)
            throw new KeyNotFoundException("User not found");

        var existingMember = await _dbContext.CompanyMembers
            .AnyAsync(cm => cm.CompanyId == companyId && cm.UserId == user.Id);

        if (existingMember)
            throw new InvalidOperationException("User is already a member of this company");

        var member = new CompanyMember
        {
            Id = Guid.NewGuid(),
            UserId = user.Id,
            CompanyId = companyId,
            Role = MemberRole.Editor
        };

        _dbContext.CompanyMembers.Add(member);
        await _dbContext.SaveChangesAsync();

        await _auditLog.LogAsync(companyId, userId, "Added", "Member", member.Id,
            newValues: new { Email = user.Email, Role = "Editor" });

        return new MemberResponse(
            member.Id,
            user.Id,
            user.Email,
            user.FullName,
            member.Role.ToString(),
            member.CreatedAt
        );
    }

    public async Task<MemberResponse> ToggleEditorAsync(Guid companyId, Guid memberId, Guid userId)
    {
        await EnsureOwnerAsync(companyId, userId);

        var member = await _dbContext.CompanyMembers
            .Include(cm => cm.User)
            .FirstOrDefaultAsync(cm => cm.Id == memberId && cm.CompanyId == companyId);

        if (member == null)
            throw new KeyNotFoundException("Member not found");

        if (member.Role == MemberRole.Owner)
            throw new InvalidOperationException("Cannot change Owner role");

        var oldRole = member.Role;
        member.Role = member.Role == MemberRole.Editor ? MemberRole.Viewer : MemberRole.Editor;

        await _dbContext.SaveChangesAsync();

        await _auditLog.LogAsync(companyId, userId, "Updated", "Member", memberId,
            oldValues: new { Role = oldRole.ToString() },
            newValues: new { Role = member.Role.ToString() });

        return new MemberResponse(
            member.Id,
            member.UserId,
            member.User.Email,
            member.User.FullName,
            member.Role.ToString(),
            member.CreatedAt
        );
    }

    public async Task RemoveMemberAsync(Guid companyId, Guid memberId, Guid userId)
    {
        await EnsureOwnerAsync(companyId, userId);

        var member = await _dbContext.CompanyMembers
            .Include(cm => cm.User)
            .FirstOrDefaultAsync(cm => cm.Id == memberId && cm.CompanyId == companyId);

        if (member == null)
            throw new KeyNotFoundException("Member not found");

        if (member.UserId == userId)
            throw new InvalidOperationException("You cannot remove yourself from the company");

        _dbContext.CompanyMembers.Remove(member);
        await _dbContext.SaveChangesAsync();

        await _auditLog.LogAsync(companyId, userId, "Removed", "Member", memberId,
            oldValues: new { Email = member.User.Email, Role = member.Role.ToString() });
    }

    private async Task<CompanyMember> EnsureMemberAsync(Guid companyId, Guid userId)
    {
        var member = await _dbContext.CompanyMembers
            .FirstOrDefaultAsync(m => m.CompanyId == companyId && m.UserId == userId);
        if (member == null)
            throw new UnauthorizedAccessException("You are not a member of this company");
        return member;
    }

    private async Task<CompanyMember> EnsureOwnerAsync(Guid companyId, Guid userId)
    {
        var member = await EnsureMemberAsync(companyId, userId);
        if (member.Role != MemberRole.Owner)
            throw new UnauthorizedAccessException("Only owners can perform this action");
        return member;
    }
}
