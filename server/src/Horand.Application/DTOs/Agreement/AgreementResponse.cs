namespace Horand.Application.DTOs.Agreement;
public record AgreementResponse(Guid Id, Guid CompanyId, int Version, string Status, DateTime GeneratedAt, string? PdfUrl, List<AgreementSignResponse> Signatures);
public record AgreementSignResponse(Guid Id, Guid PartnerId, string PartnerName, string SignatureUrl, DateTime SignedAt);
