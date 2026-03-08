using Horand.Application.DTOs.Partner;
using Horand.Application.Interfaces;
using Horand.Domain.Entities;
using Horand.Domain.Enums;
using Horand.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;

namespace Horand.Application.Services;

public class PartnerService : IPartnerService
{
    private readonly HorandDbContext _dbContext;
    private readonly IAuditLogService _auditLog;
    private readonly IFileStorageService _fileStorage;

    public PartnerService(HorandDbContext dbContext, IAuditLogService auditLog, IFileStorageService fileStorage)
    {
        _dbContext = dbContext;
        _auditLog = auditLog;
        _fileStorage = fileStorage;
    }

    public async Task<List<PartnerResponse>> GetPartnersAsync(Guid companyId, Guid userId)
    {
        await EnsureMemberAsync(companyId, userId);

        var partners = await _dbContext.Partners
            .Where(p => p.CompanyId == companyId)
            .Select(p => new PartnerResponse(
                p.Id,
                p.UserId,
                p.FullName,
                p.CompanyShare,
                p.PhotoUrl,
                p.CreatedAt,
                p.UpdatedAt
            ))
            .ToListAsync();

        return partners;
    }

    public async Task<PartnerResponse> GetPartnerAsync(Guid companyId, Guid partnerId, Guid userId)
    {
        await EnsureMemberAsync(companyId, userId);

        var partner = await _dbContext.Partners
            .FirstOrDefaultAsync(p => p.Id == partnerId && p.CompanyId == companyId);

        if (partner == null)
            throw new KeyNotFoundException("Partner not found");

        return new PartnerResponse(
            partner.Id,
            partner.UserId,
            partner.FullName,
            partner.CompanyShare,
            partner.PhotoUrl,
            partner.CreatedAt,
            partner.UpdatedAt
        );
    }

    public async Task<PartnerResponse> CreatePartnerAsync(Guid companyId, CreatePartnerRequest request, Guid userId)
    {
        await EnsureEditorOrOwnerAsync(companyId, userId);

        var user = await _dbContext.Users.FindAsync(request.UserId);
        if (user == null)
            throw new KeyNotFoundException("User not found");

        var alreadyPartner = await _dbContext.Partners
            .AnyAsync(p => p.CompanyId == companyId && p.UserId == request.UserId);
        if (alreadyPartner)
            throw new InvalidOperationException("This user is already a partner in this company");

        var existingShareSum = await _dbContext.Partners
            .Where(p => p.CompanyId == companyId)
            .SumAsync(p => p.CompanyShare);

        if (existingShareSum + request.CompanyShare > 100)
            throw new InvalidOperationException("Total company shares cannot exceed 100%");

        var partner = new Partner
        {
            Id = Guid.NewGuid(),
            CompanyId = companyId,
            UserId = request.UserId,
            FullName = user.FullName,
            CompanyShare = request.CompanyShare
        };

        _dbContext.Partners.Add(partner);

        // Auto-add as company member (Editor) if not already a member
        var isMember = await _dbContext.CompanyMembers
            .AnyAsync(cm => cm.CompanyId == companyId && cm.UserId == request.UserId);
        if (!isMember)
        {
            _dbContext.CompanyMembers.Add(new CompanyMember
            {
                Id = Guid.NewGuid(),
                UserId = request.UserId,
                CompanyId = companyId,
                Role = MemberRole.Editor
            });
        }

        await _dbContext.SaveChangesAsync();

        await _auditLog.LogAsync(companyId, userId, "Created", "Partner", partner.Id,
            newValues: new { partner.FullName, partner.CompanyShare });

        return new PartnerResponse(
            partner.Id,
            partner.UserId,
            partner.FullName,
            partner.CompanyShare,
            partner.PhotoUrl,
            partner.CreatedAt,
            partner.UpdatedAt
        );
    }

    public async Task<PartnerResponse> UpdatePartnerAsync(Guid companyId, Guid partnerId, UpdatePartnerRequest request, Guid userId)
    {
        await EnsureEditorOrOwnerAsync(companyId, userId);

        var partner = await _dbContext.Partners
            .FirstOrDefaultAsync(p => p.Id == partnerId && p.CompanyId == companyId);

        if (partner == null)
            throw new KeyNotFoundException("Partner not found");

        var existingShareSum = await _dbContext.Partners
            .Where(p => p.CompanyId == companyId && p.Id != partnerId)
            .SumAsync(p => p.CompanyShare);

        if (existingShareSum + request.CompanyShare > 100)
            throw new InvalidOperationException("Total company shares cannot exceed 100%");

        var oldValues = new { partner.FullName, partner.CompanyShare };

        partner.CompanyShare = request.CompanyShare;

        await _dbContext.SaveChangesAsync();

        await _auditLog.LogAsync(companyId, userId, "Updated", "Partner", partnerId,
            oldValues: oldValues,
            newValues: new { partner.FullName, request.CompanyShare });

        return new PartnerResponse(
            partner.Id,
            partner.UserId,
            partner.FullName,
            partner.CompanyShare,
            partner.PhotoUrl,
            partner.CreatedAt,
            partner.UpdatedAt
        );
    }

    public async Task DeletePartnerAsync(Guid companyId, Guid partnerId, Guid userId)
    {
        await EnsureEditorOrOwnerAsync(companyId, userId);

        var partner = await _dbContext.Partners
            .FirstOrDefaultAsync(p => p.Id == partnerId && p.CompanyId == companyId);

        if (partner == null)
            throw new KeyNotFoundException("Partner not found");

        var relatedSigns = await _dbContext.AgreementSigns
            .Where(s => s.PartnerId == partnerId)
            .ToListAsync();

        var relatedShares = await _dbContext.RevenueShares
            .Where(rs => rs.PartnerId == partnerId)
            .ToListAsync();

        _dbContext.AgreementSigns.RemoveRange(relatedSigns);
        _dbContext.RevenueShares.RemoveRange(relatedShares);
        _dbContext.Partners.Remove(partner);

        // Also remove company member access (unless they are the Owner)
        var member = await _dbContext.CompanyMembers
            .FirstOrDefaultAsync(cm => cm.UserId == partner.UserId && cm.CompanyId == companyId);
        if (member != null && member.Role != MemberRole.Owner)
        {
            _dbContext.CompanyMembers.Remove(member);
        }

        await _dbContext.SaveChangesAsync();

        await _auditLog.LogAsync(companyId, userId, "Deleted", "Partner", partnerId,
            oldValues: new { partner.FullName, partner.CompanyShare });
    }

    public async Task<string> UploadPhotoAsync(Guid companyId, Guid partnerId, Stream fileStream, string fileName, Guid userId)
    {
        await EnsureEditorOrOwnerAsync(companyId, userId);

        var partner = await _dbContext.Partners
            .FirstOrDefaultAsync(p => p.Id == partnerId && p.CompanyId == companyId);

        if (partner == null)
            throw new KeyNotFoundException("Partner not found");

        var url = await _fileStorage.SaveFileAsync(fileStream, fileName, "partners");

        partner.PhotoUrl = url;
        await _dbContext.SaveChangesAsync();

        return url;
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

    private async Task EnsureEditorOrOwnerAsync(Guid companyId, Guid userId)
    {
        var member = await EnsureMemberAsync(companyId, userId);
        if (member.Role != MemberRole.Owner && member.Role != MemberRole.Editor)
            throw new UnauthorizedAccessException("Only owners or editors can perform this action");
    }
}
