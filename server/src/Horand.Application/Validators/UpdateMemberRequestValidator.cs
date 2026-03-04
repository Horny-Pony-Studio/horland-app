namespace Horand.Application.Validators;

using FluentValidation;
using Horand.Application.DTOs.Member;

public class UpdateMemberRequestValidator : AbstractValidator<UpdateMemberRequest>
{
    public UpdateMemberRequestValidator()
    {
        RuleFor(x => x.Role)
            .NotEmpty().WithMessage("Role is required")
            .Must(r => r is "Owner" or "Editor")
            .WithMessage("Role must be 'Owner' or 'Editor'");
    }
}
