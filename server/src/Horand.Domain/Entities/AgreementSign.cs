namespace Horand.Domain.Entities;

public class AgreementSign
{
    public Guid Id { get; set; }

    public Guid AgreementId { get; set; }

    public Guid PartnerId { get; set; }

    public string SignatureUrl { get; set; } = string.Empty;

    public DateTime SignedAt { get; set; }

    public Agreement Agreement { get; set; } = null!;

    public Partner Partner { get; set; } = null!;
}
