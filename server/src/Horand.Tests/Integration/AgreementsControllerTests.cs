namespace Horand.Tests.Integration;

using System.Net;
using System.Net.Http.Json;
using FluentAssertions;
using Xunit;

public class AgreementsControllerTests : IClassFixture<CustomWebApplicationFactory>
{
    private readonly CustomWebApplicationFactory _factory;

    public AgreementsControllerTests(CustomWebApplicationFactory factory)
    {
        _factory = factory;
    }

    private async Task<string> RegisterSecondUser(string emailPrefix = "agrpartner")
    {
        var tempClient = _factory.CreateClient();
        var email = $"{emailPrefix}_{Guid.NewGuid():N}@example.com";

        var response = await tempClient.PostAsJsonAsync("/api/auth/register", new
        {
            Email = email,
            Password = "Password1",
            FullName = $"{emailPrefix} User"
        });
        var user = await response.Content.ReadFromJsonAsync<UserDto>();
        return user!.Id;
    }

    private async Task<(HttpClient Client, string CompanyId)> SetupCompanyWithAllPrerequisites()
    {
        var client = _factory.CreateClient();
        var email = $"agreement_{Guid.NewGuid():N}@example.com";

        var registerResponse = await client.PostAsJsonAsync("/api/auth/register", new
        {
            Email = email,
            Password = "Password1",
            FullName = "Agreement Test User"
        });
        var user = await registerResponse.Content.ReadFromJsonAsync<UserDto>();
        var user2Id = await RegisterSecondUser();

        var companyResponse = await client.PostAsJsonAsync("/api/companies", new
        {
            Name = "Agreement Co",
            Type = "Company"
        });
        var company = await companyResponse.Content.ReadFromJsonAsync<IdDto>();
        var companyId = company!.Id;

        // Create 2 partners (50/50)
        var p1Response = await client.PostAsJsonAsync($"/api/companies/{companyId}/partners", new
        {
            UserId = user!.Id,
            CompanyShare = 50m
        });
        var p1 = await p1Response.Content.ReadFromJsonAsync<IdDto>();

        var p2Response = await client.PostAsJsonAsync($"/api/companies/{companyId}/partners", new
        {
            UserId = user2Id,
            CompanyShare = 50m
        });
        var p2 = await p2Response.Content.ReadFromJsonAsync<IdDto>();

        // Create all 3 required revenue rule types
        foreach (var type in new[] { "Project", "ClientIncome", "NetProfit" })
        {
            await client.PostAsJsonAsync($"/api/companies/{companyId}/revenue-rules", new
            {
                Type = type,
                Name = $"{type} Rule",
                Shares = new[]
                {
                    new { PartnerId = p1!.Id, Percentage = 50m },
                    new { PartnerId = p2!.Id, Percentage = 50m }
                }
            });
        }

        return (client, companyId);
    }

    [Fact]
    public async Task Generate_AllPrerequisites_Returns201()
    {
        var (client, companyId) = await SetupCompanyWithAllPrerequisites();

        var response = await client.PostAsync($"/api/companies/{companyId}/agreements/generate", null);

        response.StatusCode.Should().Be(HttpStatusCode.Created);
    }

    [Fact]
    public async Task Generate_MissingPrerequisites_Returns400()
    {
        var client = _factory.CreateClient();
        var email = $"agreement_bad_{Guid.NewGuid():N}@example.com";

        var registerResponse = await client.PostAsJsonAsync("/api/auth/register", new
        {
            Email = email,
            Password = "Password1",
            FullName = "Bad Test User"
        });
        var user = await registerResponse.Content.ReadFromJsonAsync<UserDto>();

        var companyResponse = await client.PostAsJsonAsync("/api/companies", new
        {
            Name = "Bad Co",
            Type = "Company"
        });
        var company = await companyResponse.Content.ReadFromJsonAsync<IdDto>();

        // Only 1 partner — should fail (need >= 2)
        await client.PostAsJsonAsync($"/api/companies/{company!.Id}/partners", new
        {
            UserId = user!.Id,
            CompanyShare = 99m
        });

        var response = await client.PostAsync($"/api/companies/{company.Id}/agreements/generate", null);

        response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
    }

    [Fact]
    public async Task GetAll_Returns200()
    {
        var (client, companyId) = await SetupCompanyWithAllPrerequisites();

        // Generate an agreement first
        await client.PostAsync($"/api/companies/{companyId}/agreements/generate", null);

        var response = await client.GetAsync($"/api/companies/{companyId}/agreements");

        response.StatusCode.Should().Be(HttpStatusCode.OK);
    }

    private record IdDto
    {
        public string Id { get; init; } = default!;
    }

    private record UserDto
    {
        public string Id { get; init; } = default!;
    }
}
