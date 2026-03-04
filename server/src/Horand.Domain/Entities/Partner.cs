namespace Horand.Domain.Entities;

public class Partner
{
    public Guid Id { get; set; }

    public Guid CompanyId { get; set; }

    public Guid UserId { get; set; }

    public string FullName { get; set; } = string.Empty;

    public decimal CompanyShare { get; set; }

    public string? PhotoUrl { get; set; }

    public DateTime CreatedAt { get; set; }

    public DateTime UpdatedAt { get; set; }

    public Company Company { get; set; } = null!;

    public User User { get; set; } = null!;

    public ICollection<RevenueShare> RevenueShares { get; set; } = new List<RevenueShare>();

    public ICollection<AgreementSign> Signatures { get; set; } = new List<AgreementSign>();
}
