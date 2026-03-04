namespace Horand.Application.Validators;

using FluentValidation;
using Horand.Application.DTOs.Partner;

public class UpdatePartnerRequestValidator : AbstractValidator<UpdatePartnerRequest>
{
    public UpdatePartnerRequestValidator()
    {
        RuleFor(x => x.CompanyShare)
            .GreaterThan(0).WithMessage("Company share must be greater than 0")
            .LessThanOrEqualTo(99).WithMessage("Company share must be at most 99")
            .Must(share => decimal.Round(share, 2) == share)
            .WithMessage("Company share must have at most 2 decimal places");
    }
}
