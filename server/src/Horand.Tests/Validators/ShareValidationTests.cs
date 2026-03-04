using FluentAssertions;
using Horand.Application.Validators;
using Horand.Application.DTOs.Partner;
using Horand.Application.DTOs.Revenue;
using Xunit;

namespace Horand.Tests.Validators;

public class ShareValidationTests
{
    // --- CreatePartnerRequest validation ---

    [Theory]
    [InlineData(0)]
    [InlineData(-1)]
    [InlineData(100)]
    [InlineData(99.001)]
    public void CreatePartner_InvalidShare_ShouldFail(decimal share)
    {
        var validator = new CreatePartnerRequestValidator();
        var request = new CreatePartnerRequest(Guid.NewGuid(), share);

        var result = validator.Validate(request);

        result.IsValid.Should().BeFalse();
    }

    [Theory]
    [InlineData(1)]
    [InlineData(50)]
    [InlineData(99)]
    [InlineData(33.33)]
    public void CreatePartner_ValidShare_ShouldPass(decimal share)
    {
        var validator = new CreatePartnerRequestValidator();
        var request = new CreatePartnerRequest(Guid.NewGuid(), share);

        var result = validator.Validate(request);

        result.IsValid.Should().BeTrue();
    }

    [Fact]
    public void CreatePartner_EmptyUserId_ShouldFail()
    {
        var validator = new CreatePartnerRequestValidator();
        var request = new CreatePartnerRequest(Guid.Empty, 50);

        var result = validator.Validate(request);

        result.IsValid.Should().BeFalse();
    }

    // --- UpdatePartnerRequest validation ---

    [Theory]
    [InlineData(1)]
    [InlineData(50)]
    [InlineData(99)]
    [InlineData(33.33)]
    public void UpdatePartner_ValidShare_ShouldPass(decimal share)
    {
        var validator = new UpdatePartnerRequestValidator();
        var request = new UpdatePartnerRequest(share);

        var result = validator.Validate(request);

        result.IsValid.Should().BeTrue();
    }

    [Theory]
    [InlineData(0)]
    [InlineData(-1)]
    [InlineData(100)]
    [InlineData(99.001)]
    public void UpdatePartner_InvalidShare_ShouldFail(decimal share)
    {
        var validator = new UpdatePartnerRequestValidator();
        var request = new UpdatePartnerRequest(share);

        var result = validator.Validate(request);

        result.IsValid.Should().BeFalse();
    }

    // --- CreateRevenueRuleRequest validation ---

    [Fact]
    public void RevenueRule_SharesSumNot100_ShouldFail()
    {
        var validator = new CreateRevenueRuleRequestValidator();
        var request = new CreateRevenueRuleRequest(
            "Project",
            "Test Rule",
            new List<RevenueShareInput>
            {
                new(Guid.NewGuid(), 60),
                new(Guid.NewGuid(), 30)
            }
        );

        var result = validator.Validate(request);

        result.IsValid.Should().BeFalse();
    }

    [Fact]
    public void RevenueRule_SharesSum100_ShouldPass()
    {
        var validator = new CreateRevenueRuleRequestValidator();
        var request = new CreateRevenueRuleRequest(
            "Project",
            "Test Rule",
            new List<RevenueShareInput>
            {
                new(Guid.NewGuid(), 60),
                new(Guid.NewGuid(), 40)
            }
        );

        var result = validator.Validate(request);

        result.IsValid.Should().BeTrue();
    }

    [Fact]
    public void RevenueRule_InvalidType_ShouldFail()
    {
        var validator = new CreateRevenueRuleRequestValidator();
        var request = new CreateRevenueRuleRequest(
            "InvalidType",
            "Test Rule",
            new List<RevenueShareInput>
            {
                new(Guid.NewGuid(), 100)
            }
        );

        var result = validator.Validate(request);

        result.IsValid.Should().BeFalse();
    }

    // --- UpdateRevenueRuleRequest validation ---

    [Fact]
    public void UpdateRevenueRule_ValidData_ShouldPass()
    {
        var validator = new UpdateRevenueRuleRequestValidator();
        var request = new UpdateRevenueRuleRequest(
            "Updated Rule",
            new List<RevenueShareInput>
            {
                new(Guid.NewGuid(), 60),
                new(Guid.NewGuid(), 40)
            }
        );

        var result = validator.Validate(request);

        result.IsValid.Should().BeTrue();
    }

    [Fact]
    public void UpdateRevenueRule_SharesNot100_ShouldFail()
    {
        var validator = new UpdateRevenueRuleRequestValidator();
        var request = new UpdateRevenueRuleRequest(
            "Bad Rule",
            new List<RevenueShareInput>
            {
                new(Guid.NewGuid(), 60),
                new(Guid.NewGuid(), 30)
            }
        );

        var result = validator.Validate(request);

        result.IsValid.Should().BeFalse();
    }

    [Fact]
    public void UpdateRevenueRule_EmptyName_ShouldFail()
    {
        var validator = new UpdateRevenueRuleRequestValidator();
        var request = new UpdateRevenueRuleRequest(
            "",
            new List<RevenueShareInput>
            {
                new(Guid.NewGuid(), 100)
            }
        );

        var result = validator.Validate(request);

        result.IsValid.Should().BeFalse();
    }

    [Fact]
    public void UpdateRevenueRule_EmptyShares_ShouldFail()
    {
        var validator = new UpdateRevenueRuleRequestValidator();
        var request = new UpdateRevenueRuleRequest(
            "Rule",
            new List<RevenueShareInput>()
        );

        var result = validator.Validate(request);

        result.IsValid.Should().BeFalse();
    }
}
