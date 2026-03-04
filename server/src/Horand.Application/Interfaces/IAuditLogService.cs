namespace Horand.Application.Interfaces;
using Horand.Application.DTOs.AuditLog;
public interface IAuditLogService
{
    Task<AuditLogPageResponse> GetAuditLogsAsync(Guid companyId, Guid userId, int page = 1, int pageSize = 20);
    Task LogAsync(Guid companyId, Guid userId, string action, string entityType, Guid entityId, object? oldValues = null, object? newValues = null);
}
