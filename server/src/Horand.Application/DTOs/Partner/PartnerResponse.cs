namespace Horand.Application.DTOs.Partner;
public record PartnerResponse(Guid Id, Guid UserId, string FullName, decimal CompanyShare, string? PhotoUrl, DateTime CreatedAt, DateTime UpdatedAt);
