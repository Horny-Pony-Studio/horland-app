namespace Horand.Application.DTOs.Revenue;
public record RevenueRuleResponse(Guid Id, string Type, string Name, List<RevenueShareResponse> Shares, DateTime CreatedAt);
public record RevenueShareResponse(Guid Id, Guid PartnerId, string PartnerName, decimal Percentage);
