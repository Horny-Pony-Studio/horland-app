namespace Horand.Application.DTOs.AuditLog;
public record AuditLogResponse(Guid Id, Guid UserId, string UserName, string Action, string EntityType, Guid EntityId, string? OldValues, string? NewValues, DateTime CreatedAt);
public record AuditLogPageResponse(List<AuditLogResponse> Items, int TotalCount, int Page, int PageSize);
