namespace Horand.API.Controllers;

using System.Security.Claims;
using Horand.Application.Interfaces;
using Horand.Infrastructure.Data;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

[ApiController]
[Route("api/sign")]
[Authorize]
public class SignController : ControllerBase
{
    private readonly ISignTokenService _tokenService;
    private readonly HorandDbContext _dbContext;
    private readonly IFileStorageService _fileStorage;
    private readonly IAuditLogService _auditLog;

    public SignController(ISignTokenService tokenService, HorandDbContext dbContext, IFileStorageService fileStorage, IAuditLogService auditLog)
    {
        _tokenService = tokenService;
        _dbContext = dbContext;
        _fileStorage = fileStorage;
        _auditLog = auditLog;
    }

    [HttpGet("{token}")]
    public async Task<IActionResult> GetSignInfo(string token)
    {
        var parsed = _tokenService.ValidateToken(token);
        if (parsed == null)
            return BadRequest(new { error = "Invalid or expired sign link" });

        var (agreementId, partnerId) = parsed.Value;

        var agreement = await _dbContext.Agreements
            .Include(a => a.Company)
            .Include(a => a.Signatures)
            .FirstOrDefaultAsync(a => a.Id == agreementId);

        if (agreement == null)
            return NotFound(new { error = "Agreement not found" });

        var partner = await _dbContext.Partners
            .FirstOrDefaultAsync(p => p.Id == partnerId && p.CompanyId == agreement.CompanyId);

        if (partner == null)
            return NotFound(new { error = "Partner not found" });

        var userId = GetUserId();
        if (partner.UserId != userId)
            return Forbid();

        var alreadySigned = agreement.Signatures.Any(s => s.PartnerId == partnerId);

        return Ok(new
        {
            companyName = agreement.Company.Name,
            partnerName = partner.FullName,
            version = agreement.Version,
            status = agreement.Status.ToString(),
            alreadySigned
        });
    }

    [HttpPost("{token}")]
    public async Task<IActionResult> SignWithToken(string token, IFormFile signature)
    {
        var parsed = _tokenService.ValidateToken(token);
        if (parsed == null)
            return BadRequest(new { error = "Invalid or expired sign link" });

        var (agreementId, partnerId) = parsed.Value;

        if (signature == null || signature.Length == 0)
            return BadRequest(new { error = "Signature file is required" });

        if (signature.Length > 2 * 1024 * 1024)
            return BadRequest(new { error = "Signature must be smaller than 2MB" });

        var extension = Path.GetExtension(signature.FileName)?.ToLowerInvariant();
        if (extension != ".png" || signature.ContentType != "image/png")
            return BadRequest(new { error = "Signature must be PNG" });

        var agreement = await _dbContext.Agreements
            .Include(a => a.Signatures)
            .FirstOrDefaultAsync(a => a.Id == agreementId);

        if (agreement == null)
            return NotFound(new { error = "Agreement not found" });

        if (agreement.Status == Domain.Enums.AgreementStatus.Archived)
            return BadRequest(new { error = "Agreement is archived" });

        var partner = await _dbContext.Partners
            .FirstOrDefaultAsync(p => p.Id == partnerId && p.CompanyId == agreement.CompanyId);

        if (partner == null)
            return NotFound(new { error = "Partner not found" });

        var userId = GetUserId();
        if (partner.UserId != userId)
            return Forbid();

        if (agreement.Signatures.Any(s => s.PartnerId == partnerId))
            return BadRequest(new { error = "Partner has already signed this agreement" });

        using var stream = signature.OpenReadStream();
        var signatureUrl = await _fileStorage.SaveFileAsync(stream, $"{agreementId}_{partnerId}.png", "signatures");

        var sign = new Domain.Entities.AgreementSign
        {
            Id = Guid.NewGuid(),
            AgreementId = agreementId,
            PartnerId = partnerId,
            SignatureUrl = signatureUrl,
            SignedAt = DateTime.UtcNow
        };

        _dbContext.AgreementSigns.Add(sign);

        var totalPartners = await _dbContext.Partners.CountAsync(p => p.CompanyId == agreement.CompanyId);
        if (agreement.Signatures.Count + 1 >= totalPartners)
        {
            agreement.Status = Domain.Enums.AgreementStatus.Signed;
        }

        await _dbContext.SaveChangesAsync();

        await _auditLog.LogAsync(agreement.CompanyId, userId, "Signed", "Agreement", agreementId,
            newValues: new { PartnerId = partnerId, PartnerName = partner.FullName });

        return Ok(new { message = "Signed successfully" });
    }

    private Guid GetUserId() => Guid.Parse(User.FindFirst(ClaimTypes.NameIdentifier)?.Value
        ?? throw new UnauthorizedAccessException());
}
