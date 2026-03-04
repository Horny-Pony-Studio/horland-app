using Horand.Domain.Enums;

namespace Horand.Domain.Entities;

public class Company
{
    public Guid Id { get; set; }

    public string Name { get; set; } = string.Empty;

    public CompanyType Type { get; set; }

    public Guid CreatedById { get; set; }

    public DateTime CreatedAt { get; set; }

    public DateTime UpdatedAt { get; set; }

    public User CreatedBy { get; set; } = null!;

    public ICollection<CompanyMember> Members { get; set; } = new List<CompanyMember>();

    public ICollection<Partner> Partners { get; set; } = new List<Partner>();

    public ICollection<RevenueRule> RevenueRules { get; set; } = new List<RevenueRule>();

    public ICollection<Agreement> Agreements { get; set; } = new List<Agreement>();

    public ICollection<AuditLog> AuditLogs { get; set; } = new List<AuditLog>();
}
