namespace Horand.Application.DTOs.Revenue;
public record UpdateRevenueRuleRequest(string Name, List<RevenueShareInput> Shares);
