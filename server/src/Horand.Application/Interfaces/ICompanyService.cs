namespace Horand.Application.Interfaces;
using Horand.Application.DTOs.Company;
public interface ICompanyService
{
    Task<List<CompanyResponse>> GetUserCompaniesAsync(Guid userId);
    Task<CompanyDetailResponse> GetCompanyAsync(Guid companyId, Guid userId);
    Task<CompanyResponse> CreateCompanyAsync(CreateCompanyRequest request, Guid userId);
    Task<CompanyResponse> UpdateCompanyAsync(Guid companyId, UpdateCompanyRequest request, Guid userId);
    Task DeleteCompanyAsync(Guid companyId, Guid userId);
}
