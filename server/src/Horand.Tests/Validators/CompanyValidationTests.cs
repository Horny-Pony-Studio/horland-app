using FluentAssertions;
using Horand.Application.Validators;
using Horand.Application.DTOs.Company;
using Xunit;

namespace Horand.Tests.Validators;

public class CompanyValidationTests
{
    [Fact]
    public void CreateCompany_ValidData_ShouldPass()
    {
        var validator = new CreateCompanyRequestValidator();
        var request = new CreateCompanyRequest("My Company", "Company");

        var result = validator.Validate(request);

        result.IsValid.Should().BeTrue();
    }

    [Fact]
    public void CreateCompany_ProjectType_ShouldPass()
    {
        var validator = new CreateCompanyRequestValidator();
        var request = new CreateCompanyRequest("My Project", "Project");

        var result = validator.Validate(request);

        result.IsValid.Should().BeTrue();
    }

    [Fact]
    public void CreateCompany_EmptyName_ShouldFail()
    {
        var validator = new CreateCompanyRequestValidator();
        var request = new CreateCompanyRequest("", "Company");

        var result = validator.Validate(request);

        result.IsValid.Should().BeFalse();
    }

    [Fact]
    public void CreateCompany_TooLongName_ShouldFail()
    {
        var validator = new CreateCompanyRequestValidator();
        var request = new CreateCompanyRequest(new string('A', 201), "Company");

        var result = validator.Validate(request);

        result.IsValid.Should().BeFalse();
    }

    [Fact]
    public void CreateCompany_InvalidType_ShouldFail()
    {
        var validator = new CreateCompanyRequestValidator();
        var request = new CreateCompanyRequest("My Company", "InvalidType");

        var result = validator.Validate(request);

        result.IsValid.Should().BeFalse();
    }

    [Fact]
    public void UpdateCompany_ValidData_ShouldPass()
    {
        var validator = new UpdateCompanyRequestValidator();
        var request = new UpdateCompanyRequest("Updated Name");

        var result = validator.Validate(request);

        result.IsValid.Should().BeTrue();
    }

    [Fact]
    public void UpdateCompany_EmptyName_ShouldFail()
    {
        var validator = new UpdateCompanyRequestValidator();
        var request = new UpdateCompanyRequest("");

        var result = validator.Validate(request);

        result.IsValid.Should().BeFalse();
    }

    [Fact]
    public void UpdateCompany_TooLongName_ShouldFail()
    {
        var validator = new UpdateCompanyRequestValidator();
        var request = new UpdateCompanyRequest(new string('A', 201));

        var result = validator.Validate(request);

        result.IsValid.Should().BeFalse();
    }
}
