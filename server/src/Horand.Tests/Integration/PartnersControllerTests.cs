namespace Horand.Tests.Integration;

using System.Net;
using System.Net.Http.Json;
using FluentAssertions;
using Xunit;

public class PartnersControllerTests : IClassFixture<CustomWebApplicationFactory>
{
    private readonly CustomWebApplicationFactory _factory;

    public PartnersControllerTests(CustomWebApplicationFactory factory)
    {
        _factory = factory;
    }

    private async Task<(HttpClient Client, string UserId, string CompanyId)> RegisterAndSetup()
    {
        var client = _factory.CreateClient();
        var email = $"partner_{Guid.NewGuid():N}@example.com";

        var registerResponse = await client.PostAsJsonAsync("/api/auth/register", new
        {
            Email = email,
            Password = "Password1",
            FullName = "Partner Test User"
        });
        var user = await registerResponse.Content.ReadFromJsonAsync<UserDto>();

        var companyResponse = await client.PostAsJsonAsync("/api/companies", new
        {
            Name = "Test Company",
            Type = "Company"
        });
        var company = await companyResponse.Content.ReadFromJsonAsync<IdDto>();

        return (client, user!.Id, company!.Id);
    }

    private async Task<string> RegisterSecondUser(string emailPrefix = "partner2")
    {
        // Use a separate client to register a second user without affecting auth of the first
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

    [Fact]
    public async Task Create_ValidData_Returns201()
    {
        var (client, userId, companyId) = await RegisterAndSetup();

        var response = await client.PostAsJsonAsync($"/api/companies/{companyId}/partners", new
        {
            UserId = userId,
            CompanyShare = 50m
        });

        response.StatusCode.Should().Be(HttpStatusCode.Created);
    }

    [Fact]
    public async Task Create_SharesExceed100_Returns400()
    {
        var (client, userId, companyId) = await RegisterAndSetup();
        var user2Id = await RegisterSecondUser();

        await client.PostAsJsonAsync($"/api/companies/{companyId}/partners", new
        {
            UserId = userId,
            CompanyShare = 60m
        });

        var response = await client.PostAsJsonAsync($"/api/companies/{companyId}/partners", new
        {
            UserId = user2Id,
            CompanyShare = 50m
        });

        response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
    }

    private record IdDto
    {
        public string Id { get; init; } = default!;
    }

    private record UserDto
    {
        public string Id { get; init; } = default!;
        public string Email { get; init; } = default!;
    }
}
