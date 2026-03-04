namespace Horand.API.Controllers;

using Horand.Application.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;

[ApiController]
[Route("api/companies/{companyId:guid}/audit-log")]
[Authorize]
public class AuditLogController : ControllerBase
{
    private readonly IAuditLogService _auditLogService;

    public AuditLogController(IAuditLogService auditLogService)
    {
        _auditLogService = auditLogService;
    }

    [HttpGet]
    public async Task<IActionResult> GetAuditLogs(Guid companyId, [FromQuery] int page = 1, [FromQuery] int pageSize = 20)
    {
        var logs = await _auditLogService.GetAuditLogsAsync(companyId, GetUserId(), page, pageSize);
        return Ok(logs);
    }

    private Guid GetUserId() => Guid.Parse(User.FindFirst(ClaimTypes.NameIdentifier)?.Value
        ?? throw new UnauthorizedAccessException("User not authenticated"));
}
