namespace Horand.Application.Validators;

using FluentValidation;
using Horand.Application.DTOs.Company;

public class CreateCompanyRequestValidator : AbstractValidator<CreateCompanyRequest>
{
    public CreateCompanyRequestValidator()
    {
        RuleFor(x => x.Name)
            .NotEmpty().WithMessage("Name is required")
            .MaximumLength(200);

        RuleFor(x => x.Type)
            .Must(t => t is "Company" or "Project")
            .WithMessage("Type must be 'Company' or 'Project'");
    }
}
