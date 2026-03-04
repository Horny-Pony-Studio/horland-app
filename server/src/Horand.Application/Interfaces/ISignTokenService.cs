namespace Horand.Application.Interfaces;

public interface ISignTokenService
{
    string GenerateToken(Guid agreementId, Guid partnerId);
    (Guid AgreementId, Guid PartnerId)? ValidateToken(string token);
}
