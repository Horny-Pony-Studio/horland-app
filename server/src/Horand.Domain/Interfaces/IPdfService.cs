namespace Horand.Domain.Interfaces;

using Horand.Domain.Entities;

public interface IPdfService
{
    byte[] GenerateAgreementPdf(Company company, List<Partner> partners, List<RevenueRule> revenueRules, Agreement agreement, List<AgreementSign> signatures);
}
