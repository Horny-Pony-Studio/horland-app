namespace Horand.Application.DTOs.Company;
public record CompanyDetailResponse(Guid Id, string Name, string Type, int PartnersCount, decimal TotalShares, string UserRole, DateTime CreatedAt, DateTime UpdatedAt);
