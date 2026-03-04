using System.Text.Json;
using Horand.Application.DTOs.AuditLog;
using Horand.Application.Interfaces;
using Horand.Domain.Entities;
using Horand.Domain.Enums;
using Horand.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;

namespace Horand.Application.Services;

public class AuditLogService : IAuditLogService
{
    private readonly HorandDbContext _dbContext;

    public AuditLogService(HorandDbContext dbContext)
    {
        _dbContext = dbContext;
    }

    public async Task<AuditLogPageResponse> GetAuditLogsAsync(Guid companyId, Guid userId, int page = 1, int pageSize = 20)
    {
        var member = await _dbContext.CompanyMembers
            .FirstOrDefaultAsync(m => m.CompanyId == companyId && m.UserId == userId);

        if (member == null)
            throw new UnauthorizedAccessException("You are not a member of this company");

        if (member.Role != MemberRole.Owner)
            throw new UnauthorizedAccessException("Only owners can view audit logs");

        var query = _dbContext.AuditLogs
            .Where(al => al.CompanyId == companyId)
            .Include(al => al.User)
            .OrderByDescending(al => al.CreatedAt);

        var totalCount = await query.CountAsync();

        var items = await query
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .Select(al => new AuditLogResponse(
                al.Id,
                al.UserId,
                al.User.FullName,
                al.Action,
                al.EntityType,
                al.EntityId,
                al.OldValues,
                al.NewValues,
                al.CreatedAt
            ))
            .ToListAsync();

        return new AuditLogPageResponse(items, totalCount, page, pageSize);
    }

    public async Task LogAsync(Guid companyId, Guid userId, string action, string entityType, Guid entityId, object? oldValues = null, object? newValues = null)
    {
        var auditLog = new AuditLog
        {
            Id = Guid.NewGuid(),
            CompanyId = companyId,
            UserId = userId,
            Action = action,
            EntityType = entityType,
            EntityId = entityId,
            OldValues = oldValues != null ? JsonSerializer.Serialize(oldValues) : null,
            NewValues = newValues != null ? JsonSerializer.Serialize(newValues) : null
        };

        _dbContext.AuditLogs.Add(auditLog);
        await _dbContext.SaveChangesAsync();
    }
}
