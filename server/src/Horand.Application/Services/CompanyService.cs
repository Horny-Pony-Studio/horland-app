using Horand.Application.DTOs.Company;
using Horand.Application.Interfaces;
using Horand.Domain.Entities;
using Horand.Domain.Enums;
using Horand.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;

namespace Horand.Application.Services;

public class CompanyService : ICompanyService
{
    private readonly HorandDbContext _dbContext;
    private readonly IAuditLogService _auditLog;

    public CompanyService(HorandDbContext dbContext, IAuditLogService auditLog)
    {
        _dbContext = dbContext;
        _auditLog = auditLog;
    }

    public async Task<List<CompanyResponse>> GetUserCompaniesAsync(Guid userId)
    {
        var companies = await _dbContext.CompanyMembers
            .Where(cm => cm.UserId == userId)
            .Include(cm => cm.Company)
                .ThenInclude(c => c.Partners)
            .Select(cm => new CompanyResponse(
                cm.Company.Id,
                cm.Company.Name,
                cm.Company.Type.ToString(),
                cm.Company.Partners.Count,
                cm.Role.ToString(),
                cm.Company.CreatedAt
            ))
            .ToListAsync();

        return companies;
    }

    public async Task<CompanyDetailResponse> GetCompanyAsync(Guid companyId, Guid userId)
    {
        var member = await EnsureMemberAsync(companyId, userId);

        var company = await _dbContext.Companies
            .Include(c => c.Partners)
            .FirstOrDefaultAsync(c => c.Id == companyId);

        if (company == null)
            throw new KeyNotFoundException("Company not found");

        var totalShares = company.Partners.Sum(p => p.CompanyShare);

        return new CompanyDetailResponse(
            company.Id,
            company.Name,
            company.Type.ToString(),
            company.Partners.Count,
            totalShares,
            member.Role.ToString(),
            company.CreatedAt,
            company.UpdatedAt
        );
    }

    public async Task<CompanyResponse> CreateCompanyAsync(CreateCompanyRequest request, Guid userId)
    {
        if (!Enum.TryParse<CompanyType>(request.Type, true, out var companyType))
            throw new InvalidOperationException($"Invalid company type: {request.Type}");

        var company = new Company
        {
            Id = Guid.NewGuid(),
            Name = request.Name,
            Type = companyType,
            CreatedById = userId
        };

        var member = new CompanyMember
        {
            Id = Guid.NewGuid(),
            UserId = userId,
            CompanyId = company.Id,
            Role = MemberRole.Owner
        };

        _dbContext.Companies.Add(company);
        _dbContext.CompanyMembers.Add(member);
        await _dbContext.SaveChangesAsync();

        await _auditLog.LogAsync(company.Id, userId, "Created", "Company", company.Id,
            newValues: new { company.Name, Type = company.Type.ToString() });

        return new CompanyResponse(
            company.Id,
            company.Name,
            company.Type.ToString(),
            0,
            member.Role.ToString(),
            company.CreatedAt
        );
    }

    public async Task<CompanyResponse> UpdateCompanyAsync(Guid companyId, UpdateCompanyRequest request, Guid userId)
    {
        var member = await EnsureOwnerAsync(companyId, userId);

        var company = await _dbContext.Companies
            .Include(c => c.Partners)
            .FirstOrDefaultAsync(c => c.Id == companyId);

        if (company == null)
            throw new KeyNotFoundException("Company not found");

        var oldName = company.Name;
        company.Name = request.Name;

        await _dbContext.SaveChangesAsync();

        await _auditLog.LogAsync(companyId, userId, "Updated", "Company", companyId,
            oldValues: new { Name = oldName },
            newValues: new { Name = request.Name });

        return new CompanyResponse(
            company.Id,
            company.Name,
            company.Type.ToString(),
            company.Partners.Count,
            member.Role.ToString(),
            company.CreatedAt
        );
    }

    public async Task DeleteCompanyAsync(Guid companyId, Guid userId)
    {
        await EnsureOwnerAsync(companyId, userId);

        var company = await _dbContext.Companies
            .FirstOrDefaultAsync(c => c.Id == companyId);

        if (company == null)
            throw new KeyNotFoundException("Company not found");

        _dbContext.Companies.Remove(company);
        await _dbContext.SaveChangesAsync();
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
