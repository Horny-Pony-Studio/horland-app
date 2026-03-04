using FluentAssertions;
using Horand.Application.Validators;
using Horand.Application.DTOs.Auth;
using Xunit;

namespace Horand.Tests.Validators;

public class AuthValidationTests
{
    [Fact]
    public void Register_ValidData_ShouldPass()
    {
        var validator = new RegisterRequestValidator();
        var request = new RegisterRequest("test@example.com", "Password1", "John Doe");

        var result = validator.Validate(request);

        result.IsValid.Should().BeTrue();
    }

    [Fact]
    public void Register_WeakPassword_ShouldFail()
    {
        var validator = new RegisterRequestValidator();
        var request = new RegisterRequest("test@example.com", "weak", "John Doe");

        var result = validator.Validate(request);

        result.IsValid.Should().BeFalse();
    }

    [Fact]
    public void Register_NoUppercase_ShouldFail()
    {
        var validator = new RegisterRequestValidator();
        var request = new RegisterRequest("test@example.com", "password1", "John Doe");

        var result = validator.Validate(request);

        result.IsValid.Should().BeFalse();
    }

    [Fact]
    public void Register_NoDigit_ShouldFail()
    {
        var validator = new RegisterRequestValidator();
        var request = new RegisterRequest("test@example.com", "Password", "John Doe");

        var result = validator.Validate(request);

        result.IsValid.Should().BeFalse();
    }

    [Fact]
    public void Register_InvalidEmail_ShouldFail()
    {
        var validator = new RegisterRequestValidator();
        var request = new RegisterRequest("not-an-email", "Password1", "John Doe");

        var result = validator.Validate(request);

        result.IsValid.Should().BeFalse();
    }

    [Fact]
    public void Register_ShortName_ShouldFail()
    {
        var validator = new RegisterRequestValidator();
        var request = new RegisterRequest("test@example.com", "Password1", "J");

        var result = validator.Validate(request);

        result.IsValid.Should().BeFalse();
    }

    [Fact]
    public void Login_ValidData_ShouldPass()
    {
        var validator = new LoginRequestValidator();
        var request = new LoginRequest("test@example.com", "password");

        var result = validator.Validate(request);

        result.IsValid.Should().BeTrue();
    }

    [Fact]
    public void Login_EmptyEmail_ShouldFail()
    {
        var validator = new LoginRequestValidator();
        var request = new LoginRequest("", "password");

        var result = validator.Validate(request);

        result.IsValid.Should().BeFalse();
    }
}
