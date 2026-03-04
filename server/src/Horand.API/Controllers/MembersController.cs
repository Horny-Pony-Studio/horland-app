namespace Horand.API.Controllers;

using Horand.Application.DTOs.Member;
using Horand.Application.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;

[ApiController]
[Route("api/companies/{companyId:guid}/members")]
[Authorize]
public class MembersController : ControllerBase
{
    private readonly IMemberService _memberService;

    public MembersController(IMemberService memberService)
    {
        _memberService = memberService;
    }

    [HttpGet]
    public async Task<IActionResult> GetMembers(Guid companyId)
    {
        var members = await _memberService.GetMembersAsync(companyId, GetUserId());
        return Ok(members);
    }

    [HttpPost]
    public async Task<IActionResult> AddMember(Guid companyId, [FromBody] AddMemberRequest request)
    {
        var member = await _memberService.AddMemberAsync(companyId, request, GetUserId());
        return StatusCode(201, member);
    }

    [HttpPatch("{memberId:guid}/toggle-editor")]
    public async Task<IActionResult> ToggleEditor(Guid companyId, Guid memberId)
    {
        var member = await _memberService.ToggleEditorAsync(companyId, memberId, GetUserId());
        return Ok(member);
    }

    [HttpDelete("{memberId:guid}")]
    public async Task<IActionResult> RemoveMember(Guid companyId, Guid memberId)
    {
        await _memberService.RemoveMemberAsync(companyId, memberId, GetUserId());
        return NoContent();
    }

    private Guid GetUserId() => Guid.Parse(User.FindFirst(ClaimTypes.NameIdentifier)?.Value
        ?? throw new UnauthorizedAccessException("User not authenticated"));
}
