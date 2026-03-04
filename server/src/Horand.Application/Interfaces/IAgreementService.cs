namespace Horand.Application.Interfaces;
using Horand.Application.DTOs.Agreement;
using Horand.Domain.Entities;
public interface IAgreementService
{
    Task<List<AgreementResponse>> GetAgreementsAsync(Guid companyId, Guid userId);
    Task<AgreementResponse> GetAgreementAsync(Guid companyId, Guid agreementId, Guid userId);
    Task<AgreementResponse> GenerateAgreementAsync(Guid companyId, Guid userId);
    Task<byte[]> GetAgreementPdfAsync(Guid companyId, Guid agreementId, Guid userId);
    Task<AgreementResponse> SignAgreementAsync(Guid companyId, Guid agreementId, Stream signatureStream, Guid userId);
    Task<List<Partner>> GetPartnersForCompanyAsync(Guid companyId, Guid userId);
}
