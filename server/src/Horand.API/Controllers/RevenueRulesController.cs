namespace Horand.API.Controllers;

using Horand.Application.DTOs.Revenue;
using Horand.Application.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;

[ApiController]
[Route("api/companies/{companyId:guid}/revenue-rules")]
[Authorize]
public class RevenueRulesController : ControllerBase
{
    private readonly IRevenueRuleService _revenueRuleService;

    public RevenueRulesController(IRevenueRuleService revenueRuleService)
    {
        _revenueRuleService = revenueRuleService;
    }

    [HttpGet]
    public async Task<IActionResult> GetRevenueRules(Guid companyId)
    {
        var rules = await _revenueRuleService.GetRevenueRulesAsync(companyId, GetUserId());
        return Ok(rules);
    }

    [HttpPost]
    public async Task<IActionResult> CreateRevenueRule(Guid companyId, [FromBody] CreateRevenueRuleRequest request)
    {
        var rule = await _revenueRuleService.CreateRevenueRuleAsync(companyId, request, GetUserId());
        return StatusCode(201, rule);
    }

    [HttpPut("{ruleId:guid}")]
    public async Task<IActionResult> UpdateRevenueRule(Guid companyId, Guid ruleId, [FromBody] UpdateRevenueRuleRequest request)
    {
        var rule = await _revenueRuleService.UpdateRevenueRuleAsync(companyId, ruleId, request, GetUserId());
        return Ok(rule);
    }

    [HttpDelete("{ruleId:guid}")]
    public async Task<IActionResult> DeleteRevenueRule(Guid companyId, Guid ruleId)
    {
        await _revenueRuleService.DeleteRevenueRuleAsync(companyId, ruleId, GetUserId());
        return NoContent();
    }

    private Guid GetUserId() => Guid.Parse(User.FindFirst(ClaimTypes.NameIdentifier)?.Value
        ?? throw new UnauthorizedAccessException("User not authenticated"));
}
