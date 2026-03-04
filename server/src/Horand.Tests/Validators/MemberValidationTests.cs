using FluentAssertions;
using Horand.Application.Validators;
using Horand.Application.DTOs.Member;
using Xunit;

namespace Horand.Tests.Validators;

public class MemberValidationTests
{
    [Fact]
    public void AddMember_ValidData_ShouldPass()
    {
        var validator = new AddMemberRequestValidator();
        var request = new AddMemberRequest("user@example.com", "Editor");

        var result = validator.Validate(request);

        result.IsValid.Should().BeTrue();
    }

    [Fact]
    public void AddMember_OwnerRole_ShouldPass()
    {
        var validator = new AddMemberRequestValidator();
        var request = new AddMemberRequest("user@example.com", "Owner");

        var result = validator.Validate(request);

        result.IsValid.Should().BeTrue();
    }

    [Fact]
    public void AddMember_InvalidEmail_ShouldFail()
    {
        var validator = new AddMemberRequestValidator();
        var request = new AddMemberRequest("not-an-email", "Editor");

        var result = validator.Validate(request);

        result.IsValid.Should().BeFalse();
    }

    [Fact]
    public void AddMember_EmptyEmail_ShouldFail()
    {
        var validator = new AddMemberRequestValidator();
        var request = new AddMemberRequest("", "Editor");

        var result = validator.Validate(request);

        result.IsValid.Should().BeFalse();
    }

    [Fact]
    public void AddMember_InvalidRole_ShouldFail()
    {
        var validator = new AddMemberRequestValidator();
        var request = new AddMemberRequest("user@example.com", "Admin");

        var result = validator.Validate(request);

        result.IsValid.Should().BeFalse();
    }

    [Fact]
    public void UpdateMember_ValidData_ShouldPass()
    {
        var validator = new UpdateMemberRequestValidator();
        var request = new UpdateMemberRequest("Owner");

        var result = validator.Validate(request);

        result.IsValid.Should().BeTrue();
    }

    [Fact]
    public void UpdateMember_EditorRole_ShouldPass()
    {
        var validator = new UpdateMemberRequestValidator();
        var request = new UpdateMemberRequest("Editor");

        var result = validator.Validate(request);

        result.IsValid.Should().BeTrue();
    }

    [Fact]
    public void UpdateMember_InvalidRole_ShouldFail()
    {
        var validator = new UpdateMemberRequestValidator();
        var request = new UpdateMemberRequest("Admin");

        var result = validator.Validate(request);

        result.IsValid.Should().BeFalse();
    }

    [Fact]
    public void UpdateMember_EmptyRole_ShouldFail()
    {
        var validator = new UpdateMemberRequestValidator();
        var request = new UpdateMemberRequest("");

        var result = validator.Validate(request);

        result.IsValid.Should().BeFalse();
    }
}
