namespace Horand.Domain.Entities;

public class User
{
    public Guid Id { get; set; }

    public string Email { get; set; } = string.Empty;

    public string PasswordHash { get; set; } = string.Empty;

    public string FullName { get; set; } = string.Empty;

    public DateTime CreatedAt { get; set; }

    public DateTime UpdatedAt { get; set; }

    public ICollection<RefreshToken> RefreshTokens { get; set; } = new List<RefreshToken>();

    public ICollection<CompanyMember> CompanyMemberships { get; set; } = new List<CompanyMember>();

    public ICollection<AuditLog> AuditLogs { get; set; } = new List<AuditLog>();
}
