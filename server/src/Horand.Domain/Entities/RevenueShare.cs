namespace Horand.Domain.Entities;

public class RevenueShare
{
    public Guid Id { get; set; }

    public Guid RevenueRuleId { get; set; }

    public Guid PartnerId { get; set; }

    public decimal Percentage { get; set; }

    public RevenueRule RevenueRule { get; set; } = null!;

    public Partner Partner { get; set; } = null!;
}
