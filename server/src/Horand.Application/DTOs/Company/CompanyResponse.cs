namespace Horand.Application.DTOs.Company;
public record CompanyResponse(Guid Id, string Name, string Type, int PartnersCount, string UserRole, DateTime CreatedAt);
