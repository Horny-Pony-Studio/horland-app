namespace Horand.API.Controllers;

using Horand.Application.DTOs.Partner;
using Horand.Application.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;

[ApiController]
[Route("api/companies/{companyId:guid}/partners")]
[Authorize]
public class PartnersController : ControllerBase
{
    private readonly IPartnerService _partnerService;

    public PartnersController(IPartnerService partnerService)
    {
        _partnerService = partnerService;
    }

    [HttpGet]
    public async Task<IActionResult> GetPartners(Guid companyId)
    {
        var partners = await _partnerService.GetPartnersAsync(companyId, GetUserId());
        return Ok(partners);
    }

    [HttpPost]
    public async Task<IActionResult> CreatePartner(Guid companyId, [FromBody] CreatePartnerRequest request)
    {
        var partner = await _partnerService.CreatePartnerAsync(companyId, request, GetUserId());
        return StatusCode(201, partner);
    }

    [HttpGet("{partnerId:guid}")]
    public async Task<IActionResult> GetPartner(Guid companyId, Guid partnerId)
    {
        var partner = await _partnerService.GetPartnerAsync(companyId, partnerId, GetUserId());
        return Ok(partner);
    }

    [HttpPut("{partnerId:guid}")]
    public async Task<IActionResult> UpdatePartner(Guid companyId, Guid partnerId, [FromBody] UpdatePartnerRequest request)
    {
        var partner = await _partnerService.UpdatePartnerAsync(companyId, partnerId, request, GetUserId());
        return Ok(partner);
    }

    [HttpDelete("{partnerId:guid}")]
    public async Task<IActionResult> DeletePartner(Guid companyId, Guid partnerId)
    {
        await _partnerService.DeletePartnerAsync(companyId, partnerId, GetUserId());
        return NoContent();
    }

    [HttpPost("{partnerId:guid}/photo")]
    public async Task<IActionResult> UploadPhoto(Guid companyId, Guid partnerId, IFormFile file)
    {
        if (file == null || file.Length == 0)
            return BadRequest(new { error = "No file provided" });

        if (file.Length > 5 * 1024 * 1024)
            return BadRequest(new { error = "File size must not exceed 5MB" });

        var allowedExtensions = new[] { ".jpg", ".jpeg", ".png", ".webp" };
        var extension = Path.GetExtension(file.FileName).ToLowerInvariant();
        if (!allowedExtensions.Contains(extension))
            return BadRequest(new { error = "Only JPG, PNG, and WebP files are allowed" });

        using var stream = file.OpenReadStream();
        var photoUrl = await _partnerService.UploadPhotoAsync(companyId, partnerId, stream, file.FileName, GetUserId());
        return Ok(new { photoUrl });
    }

    private Guid GetUserId() => Guid.Parse(User.FindFirst(ClaimTypes.NameIdentifier)?.Value
        ?? throw new UnauthorizedAccessException("User not authenticated"));
}
