namespace Horand.API.Controllers;

using Horand.Application.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;

[ApiController]
[Route("api/companies/{companyId:guid}/agreements")]
[Authorize]
public class AgreementsController : ControllerBase
{
    private readonly IAgreementService _agreementService;
    private readonly ISignTokenService _signTokenService;

    public AgreementsController(IAgreementService agreementService, ISignTokenService signTokenService)
    {
        _agreementService = agreementService;
        _signTokenService = signTokenService;
    }

    [HttpGet]
    public async Task<IActionResult> GetAgreements(Guid companyId)
    {
        var agreements = await _agreementService.GetAgreementsAsync(companyId, GetUserId());
        return Ok(agreements);
    }

    [HttpPost]
    public async Task<IActionResult> GenerateAgreement(Guid companyId)
    {
        var agreement = await _agreementService.GenerateAgreementAsync(companyId, GetUserId());
        return StatusCode(201, agreement);
    }

    [HttpGet("{agreementId:guid}")]
    public async Task<IActionResult> GetAgreement(Guid companyId, Guid agreementId)
    {
        var agreement = await _agreementService.GetAgreementAsync(companyId, agreementId, GetUserId());
        return Ok(agreement);
    }

    [HttpGet("{agreementId:guid}/pdf")]
    public async Task<IActionResult> GetAgreementPdf(Guid companyId, Guid agreementId)
    {
        var bytes = await _agreementService.GetAgreementPdfAsync(companyId, agreementId, GetUserId());
        return File(bytes, "application/pdf", "agreement.pdf");
    }

    [HttpGet("{agreementId:guid}/sign-links")]
    public async Task<IActionResult> GetSignLinks(Guid companyId, Guid agreementId)
    {
        var agreement = await _agreementService.GetAgreementAsync(companyId, agreementId, GetUserId());
        var partners = await _agreementService.GetPartnersForCompanyAsync(companyId, GetUserId());

        var links = partners.Select(p => new
        {
            partnerId = p.Id,
            partnerName = p.FullName,
            token = _signTokenService.GenerateToken(agreementId, p.Id),
            signed = agreement.Signatures.Any(s => s.PartnerId == p.Id)
        });

        return Ok(links);
    }

    [HttpPost("{agreementId:guid}/sign")]
    public async Task<IActionResult> SignAgreement(Guid companyId, Guid agreementId, IFormFile signature)
    {
        if (signature == null || signature.Length == 0)
            return BadRequest(new { error = "Signature file is required" });

        if (signature.Length > 2 * 1024 * 1024)
            return BadRequest(new { error = "Signature must be smaller than 2MB" });

        var extension = Path.GetExtension(signature.FileName)?.ToLowerInvariant();
        if (extension != ".png" || signature.ContentType != "image/png")
            return BadRequest(new { error = "Signature must be PNG" });

        using var stream = signature.OpenReadStream();
        var agreement = await _agreementService.SignAgreementAsync(companyId, agreementId, stream, GetUserId());
        return Ok(agreement);
    }

    private Guid GetUserId() => Guid.Parse(User.FindFirst(ClaimTypes.NameIdentifier)?.Value
        ?? throw new UnauthorizedAccessException("User not authenticated"));
}
