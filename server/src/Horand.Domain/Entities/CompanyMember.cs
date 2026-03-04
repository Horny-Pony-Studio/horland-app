using Horand.Domain.Enums;

namespace Horand.Domain.Entities;

public class CompanyMember
{
    public Guid Id { get; set; }

    public Guid UserId { get; set; }

    public Guid CompanyId { get; set; }

    public MemberRole Role { get; set; }

    public DateTime CreatedAt { get; set; }

    public User User { get; set; } = null!;

    public Company Company { get; set; } = null!;
}
