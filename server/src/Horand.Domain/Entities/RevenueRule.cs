using Horand.Domain.Enums;

namespace Horand.Domain.Entities;

public class RevenueRule
{
    public Guid Id { get; set; }

    public Guid CompanyId { get; set; }

    public RevenueRuleType Type { get; set; }

    public string Name { get; set; } = string.Empty;

    public DateTime CreatedAt { get; set; }

    public Company Company { get; set; } = null!;

    public ICollection<RevenueShare> Shares { get; set; } = new List<RevenueShare>();
}
