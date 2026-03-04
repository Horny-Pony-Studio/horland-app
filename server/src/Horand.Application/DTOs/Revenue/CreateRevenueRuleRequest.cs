namespace Horand.Application.DTOs.Revenue;
public record CreateRevenueRuleRequest(string Type, string Name, List<RevenueShareInput> Shares);
public record RevenueShareInput(Guid PartnerId, decimal Percentage);
