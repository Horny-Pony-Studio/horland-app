namespace Horand.Application.Interfaces;
using Horand.Application.DTOs.Revenue;
public interface IRevenueRuleService
{
    Task<List<RevenueRuleResponse>> GetRevenueRulesAsync(Guid companyId, Guid userId);
    Task<RevenueRuleResponse> CreateRevenueRuleAsync(Guid companyId, CreateRevenueRuleRequest request, Guid userId);
    Task<RevenueRuleResponse> UpdateRevenueRuleAsync(Guid companyId, Guid ruleId, UpdateRevenueRuleRequest request, Guid userId);
    Task DeleteRevenueRuleAsync(Guid companyId, Guid ruleId, Guid userId);
}
