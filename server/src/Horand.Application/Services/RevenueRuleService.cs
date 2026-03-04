using Horand.Application.DTOs.Revenue;
using Horand.Application.Interfaces;
using Horand.Domain.Entities;
using Horand.Domain.Enums;
using Horand.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;

namespace Horand.Application.Services;

public class RevenueRuleService : IRevenueRuleService
{
    private readonly HorandDbContext _dbContext;
    private readonly IAuditLogService _auditLog;

    public RevenueRuleService(HorandDbContext dbContext, IAuditLogService auditLog)
    {
        _dbContext = dbContext;
        _auditLog = auditLog;
    }

    public async Task<List<RevenueRuleResponse>> GetRevenueRulesAsync(Guid companyId, Guid userId)
    {
        await EnsureMemberAsync(companyId, userId);

        var rules = await _dbContext.RevenueRules
            .Where(r => r.CompanyId == companyId)
            .Include(r => r.Shares)
                .ThenInclude(s => s.Partner)
            .Select(r => new RevenueRuleResponse(
                r.Id,
                r.Type.ToString(),
                r.Name,
                r.Shares.Select(s => new RevenueShareResponse(
                    s.Id,
                    s.PartnerId,
                    s.Partner.FullName,
                    s.Percentage
                )).ToList(),
                r.CreatedAt
            ))
            .ToListAsync();

        return rules;
    }

    public async Task<RevenueRuleResponse> CreateRevenueRuleAsync(Guid companyId, CreateRevenueRuleRequest request, Guid userId)
    {
        await EnsureEditorOrOwnerAsync(companyId, userId);

        if (!Enum.TryParse<RevenueRuleType>(request.Type, true, out var ruleType))
            throw new InvalidOperationException($"Invalid revenue rule type: {request.Type}");

        var sharesSum = request.Shares.Sum(s => s.Percentage);
        if (sharesSum != 100)
            throw new InvalidOperationException("Revenue shares must sum to exactly 100%");

        var partnerIds = request.Shares.Select(s => s.PartnerId).ToList();
        var existingPartnerIds = await _dbContext.Partners
            .Where(p => p.CompanyId == companyId && partnerIds.Contains(p.Id))
            .Select(p => p.Id)
            .ToListAsync();

        if (existingPartnerIds.Count != partnerIds.Count)
            throw new InvalidOperationException("One or more partners do not belong to this company");

        var rule = new RevenueRule
        {
            Id = Guid.NewGuid(),
            CompanyId = companyId,
            Type = ruleType,
            Name = request.Name
        };

        _dbContext.RevenueRules.Add(rule);

        var shares = request.Shares.Select(s => new RevenueShare
        {
            Id = Guid.NewGuid(),
            RevenueRuleId = rule.Id,
            PartnerId = s.PartnerId,
            Percentage = s.Percentage
        }).ToList();

        _dbContext.RevenueShares.AddRange(shares);
        await _dbContext.SaveChangesAsync();

        await _auditLog.LogAsync(companyId, userId, "Created", "RevenueRule", rule.Id,
            newValues: new { rule.Name, Type = rule.Type.ToString(), Shares = request.Shares });

        var partners = await _dbContext.Partners
            .Where(p => partnerIds.Contains(p.Id))
            .ToDictionaryAsync(p => p.Id, p => p.FullName);

        return new RevenueRuleResponse(
            rule.Id,
            rule.Type.ToString(),
            rule.Name,
            shares.Select(s => new RevenueShareResponse(
                s.Id,
                s.PartnerId,
                partners[s.PartnerId],
                s.Percentage
            )).ToList(),
            rule.CreatedAt
        );
    }

    public async Task<RevenueRuleResponse> UpdateRevenueRuleAsync(Guid companyId, Guid ruleId, UpdateRevenueRuleRequest request, Guid userId)
    {
        await EnsureEditorOrOwnerAsync(companyId, userId);

        var rule = await _dbContext.RevenueRules
            .Include(r => r.Shares)
            .FirstOrDefaultAsync(r => r.Id == ruleId && r.CompanyId == companyId);

        if (rule == null)
            throw new KeyNotFoundException("Revenue rule not found");

        var sharesSum = request.Shares.Sum(s => s.Percentage);
        if (sharesSum != 100)
            throw new InvalidOperationException("Revenue shares must sum to exactly 100%");

        var partnerIds = request.Shares.Select(s => s.PartnerId).ToList();
        var existingPartnerIds = await _dbContext.Partners
            .Where(p => p.CompanyId == companyId && partnerIds.Contains(p.Id))
            .Select(p => p.Id)
            .ToListAsync();

        if (existingPartnerIds.Count != partnerIds.Count)
            throw new InvalidOperationException("One or more partners do not belong to this company");

        var oldValues = new { rule.Name, Shares = rule.Shares.Select(s => new { s.PartnerId, s.Percentage }) };

        _dbContext.RevenueShares.RemoveRange(rule.Shares);

        rule.Name = request.Name;

        var newShares = request.Shares.Select(s => new RevenueShare
        {
            Id = Guid.NewGuid(),
            RevenueRuleId = rule.Id,
            PartnerId = s.PartnerId,
            Percentage = s.Percentage
        }).ToList();

        _dbContext.RevenueShares.AddRange(newShares);
        await _dbContext.SaveChangesAsync();

        await _auditLog.LogAsync(companyId, userId, "Updated", "RevenueRule", ruleId,
            oldValues: oldValues,
            newValues: new { request.Name, Shares = request.Shares });

        var partners = await _dbContext.Partners
            .Where(p => partnerIds.Contains(p.Id))
            .ToDictionaryAsync(p => p.Id, p => p.FullName);

        return new RevenueRuleResponse(
            rule.Id,
            rule.Type.ToString(),
            rule.Name,
            newShares.Select(s => new RevenueShareResponse(
                s.Id,
                s.PartnerId,
                partners[s.PartnerId],
                s.Percentage
            )).ToList(),
            rule.CreatedAt
        );
    }

    public async Task DeleteRevenueRuleAsync(Guid companyId, Guid ruleId, Guid userId)
    {
        await EnsureOwnerAsync(companyId, userId);

        var rule = await _dbContext.RevenueRules
            .FirstOrDefaultAsync(r => r.Id == ruleId && r.CompanyId == companyId);

        if (rule == null)
            throw new KeyNotFoundException("Revenue rule not found");

        _dbContext.RevenueRules.Remove(rule);
        await _dbContext.SaveChangesAsync();

        await _auditLog.LogAsync(companyId, userId, "Deleted", "RevenueRule", ruleId,
            oldValues: new { rule.Name, Type = rule.Type.ToString() });
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

    private async Task EnsureEditorOrOwnerAsync(Guid companyId, Guid userId)
    {
        var member = await EnsureMemberAsync(companyId, userId);
        if (member.Role != MemberRole.Owner && member.Role != MemberRole.Editor)
            throw new UnauthorizedAccessException("Only owners or editors can perform this action");
    }
}
