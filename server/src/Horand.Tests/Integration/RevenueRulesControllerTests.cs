namespace Horand.Tests.Integration;

using System.Net;
using System.Net.Http.Json;
using FluentAssertions;
using Xunit;

public class RevenueRulesControllerTests : IClassFixture<CustomWebApplicationFactory>
{
    private readonly CustomWebApplicationFactory _factory;

    public RevenueRulesControllerTests(CustomWebApplicationFactory factory)
    {
        _factory = factory;
    }

    private async Task<string> RegisterSecondUser(string emailPrefix = "revpartner")
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

    private async Task<(HttpClient Client, string CompanyId, string Partner1Id, string Partner2Id)> SetupCompanyWithPartners()
    {
        var client = _factory.CreateClient();
        var email = $"revenue_{Guid.NewGuid():N}@example.com";

        var registerResponse = await client.PostAsJsonAsync("/api/auth/register", new
        {
            Email = email,
            Password = "Password1",
            FullName = "Revenue Test User"
        });
        var user = await registerResponse.Content.ReadFromJsonAsync<UserDto>();
        var user2Id = await RegisterSecondUser();

        var companyResponse = await client.PostAsJsonAsync("/api/companies", new
        {
            Name = "Revenue Co",
            Type = "Company"
        });
        var company = await companyResponse.Content.ReadFromJsonAsync<IdDto>();

        var p1Response = await client.PostAsJsonAsync($"/api/companies/{company!.Id}/partners", new
        {
            UserId = user!.Id,
            CompanyShare = 60m
        });
        var p1 = await p1Response.Content.ReadFromJsonAsync<IdDto>();

        var p2Response = await client.PostAsJsonAsync($"/api/companies/{company.Id}/partners", new
        {
            UserId = user2Id,
            CompanyShare = 40m
        });
        var p2 = await p2Response.Content.ReadFromJsonAsync<IdDto>();

        return (client, company.Id, p1!.Id, p2!.Id);
    }

    [Fact]
    public async Task Create_ValidData_Returns201()
    {
        var (client, companyId, p1Id, p2Id) = await SetupCompanyWithPartners();

        var response = await client.PostAsJsonAsync($"/api/companies/{companyId}/revenue-rules", new
        {
            Type = "Project",
            Name = "Rule A",
            Shares = new[]
            {
                new { PartnerId = p1Id, Percentage = 60m },
                new { PartnerId = p2Id, Percentage = 40m }
            }
        });

        response.StatusCode.Should().Be(HttpStatusCode.Created);
    }

    [Fact]
    public async Task Create_SharesNot100_Returns400()
    {
        var (client, companyId, p1Id, p2Id) = await SetupCompanyWithPartners();

        var response = await client.PostAsJsonAsync($"/api/companies/{companyId}/revenue-rules", new
        {
            Type = "Project",
            Name = "Bad Rule",
            Shares = new[]
            {
                new { PartnerId = p1Id, Percentage = 60m },
                new { PartnerId = p2Id, Percentage = 30m }
            }
        });

        response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
    }

    [Fact]
    public async Task GetAll_Returns200()
    {
        var (client, companyId, p1Id, p2Id) = await SetupCompanyWithPartners();

        // Create a rule first
        await client.PostAsJsonAsync($"/api/companies/{companyId}/revenue-rules", new
        {
            Type = "Project",
            Name = "Rule A",
            Shares = new[]
            {
                new { PartnerId = p1Id, Percentage = 60m },
                new { PartnerId = p2Id, Percentage = 40m }
            }
        });

        var response = await client.GetAsync($"/api/companies/{companyId}/revenue-rules");

        response.StatusCode.Should().Be(HttpStatusCode.OK);
    }

    [Fact]
    public async Task Delete_OwnerRole_Returns204()
    {
        var (client, companyId, p1Id, p2Id) = await SetupCompanyWithPartners();

        var createResponse = await client.PostAsJsonAsync($"/api/companies/{companyId}/revenue-rules", new
        {
            Type = "Project",
            Name = "To Delete",
            Shares = new[]
            {
                new { PartnerId = p1Id, Percentage = 60m },
                new { PartnerId = p2Id, Percentage = 40m }
            }
        });
        var rule = await createResponse.Content.ReadFromJsonAsync<IdDto>();

        var response = await client.DeleteAsync($"/api/companies/{companyId}/revenue-rules/{rule!.Id}");

        response.StatusCode.Should().Be(HttpStatusCode.NoContent);
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
