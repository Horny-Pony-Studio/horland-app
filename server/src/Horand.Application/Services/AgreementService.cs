using Horand.Application.DTOs.Agreement;
using Horand.Application.Interfaces;
using Horand.Domain.Entities;
using Horand.Domain.Enums;
using Horand.Domain.Interfaces;
using Horand.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;

namespace Horand.Application.Services;

public class AgreementService : IAgreementService
{
    private readonly HorandDbContext _dbContext;
    private readonly IAuditLogService _auditLog;
    private readonly IFileStorageService _fileStorage;
    private readonly IPdfService _pdfService;

    public AgreementService(HorandDbContext dbContext, IAuditLogService auditLog, IFileStorageService fileStorage, IPdfService pdfService)
    {
        _dbContext = dbContext;
        _auditLog = auditLog;
        _fileStorage = fileStorage;
        _pdfService = pdfService;
    }

    public async Task<List<AgreementResponse>> GetAgreementsAsync(Guid companyId, Guid userId)
    {
        await EnsureMemberAsync(companyId, userId);

        var agreements = await _dbContext.Agreements
            .Where(a => a.CompanyId == companyId)
            .Include(a => a.Signatures)
                .ThenInclude(s => s.Partner)
            .OrderByDescending(a => a.Version)
            .Select(a => new AgreementResponse(
                a.Id,
                a.CompanyId,
                a.Version,
                a.Status.ToString(),
                a.GeneratedAt,
                a.PdfUrl,
                a.Signatures.Select(s => new AgreementSignResponse(
                    s.Id,
                    s.PartnerId,
                    s.Partner.FullName,
                    s.SignatureUrl,
                    s.SignedAt
                )).ToList()
            ))
            .ToListAsync();

        return agreements;
    }

    public async Task<AgreementResponse> GetAgreementAsync(Guid companyId, Guid agreementId, Guid userId)
    {
        await EnsureMemberAsync(companyId, userId);

        var agreement = await _dbContext.Agreements
            .Where(a => a.Id == agreementId && a.CompanyId == companyId)
            .Include(a => a.Signatures)
                .ThenInclude(s => s.Partner)
            .FirstOrDefaultAsync();

        if (agreement == null)
            throw new KeyNotFoundException("Agreement not found");

        return new AgreementResponse(
            agreement.Id,
            agreement.CompanyId,
            agreement.Version,
            agreement.Status.ToString(),
            agreement.GeneratedAt,
            agreement.PdfUrl,
            agreement.Signatures.Select(s => new AgreementSignResponse(
                s.Id,
                s.PartnerId,
                s.Partner.FullName,
                s.SignatureUrl,
                s.SignedAt
            )).ToList()
        );
    }

    public async Task<AgreementResponse> GenerateAgreementAsync(Guid companyId, Guid userId)
    {
        await EnsureOwnerAsync(companyId, userId);

        var partners = await _dbContext.Partners
            .Where(p => p.CompanyId == companyId)
            .ToListAsync();

        if (partners.Count < 2)
            throw new InvalidOperationException("At least 2 partners are required to generate an agreement");

        var sharesSum = partners.Sum(p => p.CompanyShare);
        if (sharesSum != 100)
            throw new InvalidOperationException("Partner shares must sum to exactly 100%");

        var rules = await _dbContext.RevenueRules
            .Where(r => r.CompanyId == companyId)
            .Include(r => r.Shares)
            .ToListAsync();

        var ruleTypes = rules.Select(r => r.Type).Distinct().ToList();

        if (!ruleTypes.Contains(RevenueRuleType.Project))
            throw new InvalidOperationException("At least one Project revenue rule is required");
        if (!ruleTypes.Contains(RevenueRuleType.ClientIncome))
            throw new InvalidOperationException("At least one ClientIncome revenue rule is required");
        if (!ruleTypes.Contains(RevenueRuleType.NetProfit))
            throw new InvalidOperationException("At least one NetProfit revenue rule is required");

        foreach (var rule in rules)
        {
            var ruleSharesSum = rule.Shares.Sum(s => s.Percentage);
            if (ruleSharesSum != 100)
                throw new InvalidOperationException($"Revenue rule '{rule.Name}' shares must sum to exactly 100%");
        }

        // Archive previous active agreements
        var activeAgreements = await _dbContext.Agreements
            .Where(a => a.CompanyId == companyId && (a.Status == AgreementStatus.Active || a.Status == AgreementStatus.Draft))
            .ToListAsync();

        foreach (var active in activeAgreements)
        {
            active.Status = AgreementStatus.Archived;
        }

        // Get next version number
        var maxVersion = await _dbContext.Agreements
            .Where(a => a.CompanyId == companyId)
            .MaxAsync(a => (int?)a.Version) ?? 0;

        var agreement = new Agreement
        {
            Id = Guid.NewGuid(),
            CompanyId = companyId,
            Version = maxVersion + 1,
            Status = AgreementStatus.Draft,
            GeneratedAt = DateTime.UtcNow
        };

        _dbContext.Agreements.Add(agreement);
        await _dbContext.SaveChangesAsync();

        await _auditLog.LogAsync(companyId, userId, "Generated", "Agreement", agreement.Id,
            newValues: new { agreement.Version, Status = agreement.Status.ToString() });

        return new AgreementResponse(
            agreement.Id,
            agreement.CompanyId,
            agreement.Version,
            agreement.Status.ToString(),
            agreement.GeneratedAt,
            agreement.PdfUrl,
            new List<AgreementSignResponse>()
        );
    }

    public async Task<byte[]> GetAgreementPdfAsync(Guid companyId, Guid agreementId, Guid userId)
    {
        await EnsureMemberAsync(companyId, userId);

        var agreement = await _dbContext.Agreements
            .Include(a => a.Signatures)
            .FirstOrDefaultAsync(a => a.Id == agreementId && a.CompanyId == companyId)
            ?? throw new KeyNotFoundException("Agreement not found");

        var company = await _dbContext.Companies
            .FirstAsync(c => c.Id == companyId);

        var partners = await _dbContext.Partners
            .Where(p => p.CompanyId == companyId)
            .ToListAsync();

        var revenueRules = await _dbContext.RevenueRules
            .Where(r => r.CompanyId == companyId)
            .Include(r => r.Shares)
            .ToListAsync();

        return _pdfService.GenerateAgreementPdf(company, partners, revenueRules, agreement, agreement.Signatures.ToList());
    }

    public async Task<AgreementResponse> SignAgreementAsync(Guid companyId, Guid agreementId, Stream signatureStream, Guid userId)
    {
        await EnsureMemberAsync(companyId, userId);

        var agreement = await _dbContext.Agreements
            .Include(a => a.Signatures)
            .FirstOrDefaultAsync(a => a.Id == agreementId && a.CompanyId == companyId);

        if (agreement == null)
            throw new KeyNotFoundException("Agreement not found");

        if (agreement.Status == AgreementStatus.Archived)
            throw new InvalidOperationException("Agreement is archived");

        var partner = await _dbContext.Partners
            .FirstOrDefaultAsync(p => p.UserId == userId && p.CompanyId == companyId);

        if (partner == null)
            throw new KeyNotFoundException("You are not a partner in this company");

        var partnerId = partner.Id;

        if (agreement.Signatures.Any(s => s.PartnerId == partnerId))
            throw new InvalidOperationException("Partner has already signed this agreement");

        var signatureUrl = await _fileStorage.SaveFileAsync(signatureStream, $"{agreementId}_{partnerId}.png", "signatures");

        var sign = new AgreementSign
        {
            Id = Guid.NewGuid(),
            AgreementId = agreementId,
            PartnerId = partnerId,
            SignatureUrl = signatureUrl,
            SignedAt = DateTime.UtcNow
        };

        _dbContext.AgreementSigns.Add(sign);

        // Check if all partners have signed
        var totalPartners = await _dbContext.Partners
            .CountAsync(p => p.CompanyId == companyId);

        var signedCount = agreement.Signatures.Count + 1; // +1 for the current signature

        if (signedCount >= totalPartners)
        {
            agreement.Status = AgreementStatus.Signed;
        }

        await _dbContext.SaveChangesAsync();

        await _auditLog.LogAsync(companyId, userId, "Signed", "Agreement", agreementId,
            newValues: new { PartnerId = partnerId, PartnerName = partner.FullName });

        // Reload with signatures for response
        var updatedAgreement = await _dbContext.Agreements
            .Where(a => a.Id == agreementId)
            .Include(a => a.Signatures)
                .ThenInclude(s => s.Partner)
            .FirstAsync();

        return new AgreementResponse(
            updatedAgreement.Id,
            updatedAgreement.CompanyId,
            updatedAgreement.Version,
            updatedAgreement.Status.ToString(),
            updatedAgreement.GeneratedAt,
            updatedAgreement.PdfUrl,
            updatedAgreement.Signatures.Select(s => new AgreementSignResponse(
                s.Id,
                s.PartnerId,
                s.Partner.FullName,
                s.SignatureUrl,
                s.SignedAt
            )).ToList()
        );
    }

    public async Task<List<Partner>> GetPartnersForCompanyAsync(Guid companyId, Guid userId)
    {
        await EnsureMemberAsync(companyId, userId);
        return await _dbContext.Partners.Where(p => p.CompanyId == companyId).ToListAsync();
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
}
