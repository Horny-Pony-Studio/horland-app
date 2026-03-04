using Horand.Domain.Enums;

namespace Horand.Domain.Entities;

public class Agreement
{
    public Guid Id { get; set; }

    public Guid CompanyId { get; set; }

    public int Version { get; set; }

    public AgreementStatus Status { get; set; }

    public string? PdfUrl { get; set; }

    public DateTime GeneratedAt { get; set; }

    public DateTime CreatedAt { get; set; }

    public Company Company { get; set; } = null!;

    public ICollection<AgreementSign> Signatures { get; set; } = new List<AgreementSign>();
}
