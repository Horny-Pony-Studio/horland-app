namespace Horand.Application.Validators;

using FluentValidation;
using Horand.Application.DTOs.Revenue;

public class UpdateRevenueRuleRequestValidator : AbstractValidator<UpdateRevenueRuleRequest>
{
    public UpdateRevenueRuleRequestValidator()
    {
        RuleFor(x => x.Name)
            .NotEmpty().WithMessage("Name is required")
            .MaximumLength(200);

        RuleFor(x => x.Shares)
            .NotEmpty().WithMessage("Shares are required");

        RuleForEach(x => x.Shares).ChildRules(share =>
        {
            share.RuleFor(s => s.PartnerId)
                .NotEmpty().WithMessage("Partner ID is required");

            share.RuleFor(s => s.Percentage)
                .GreaterThan(0).WithMessage("Percentage must be greater than 0")
                .LessThanOrEqualTo(100).WithMessage("Percentage must be at most 100");
        });

        RuleFor(x => x.Shares)
            .Must(shares => shares != null && shares.Sum(s => s.Percentage) == 100)
            .WithMessage("Sum of all share percentages must equal 100");
    }
}
