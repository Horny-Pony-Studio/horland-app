namespace Horand.Application.Validators;

using FluentValidation;
using Horand.Application.DTOs.Member;

public class AddMemberRequestValidator : AbstractValidator<AddMemberRequest>
{
    public AddMemberRequestValidator()
    {
        RuleFor(x => x.Email)
            .NotEmpty().WithMessage("Email is required")
            .EmailAddress().WithMessage("Invalid email format");

        RuleFor(x => x.Role)
            .Must(r => r is "Owner" or "Editor")
            .WithMessage("Role must be 'Owner' or 'Editor'");
    }
}
