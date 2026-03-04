namespace Horand.Tests.Integration;

using System.Net;
using System.Net.Http.Json;
using FluentAssertions;
using Xunit;

public class CompaniesControllerTests : IClassFixture<CustomWebApplicationFactory>
{
    private readonly HttpClient _client;

    public CompaniesControllerTests(CustomWebApplicationFactory factory)
    {
        _client = factory.CreateClient();
    }

    private async Task<string> RegisterAndLogin()
    {
        var email = $"company_{Guid.NewGuid():N}@example.com";

        await _client.PostAsJsonAsync("/api/auth/register", new
        {
            Email = email,
            Password = "Password1",
            FullName = "Company Test User"
        });

        await _client.PostAsJsonAsync("/api/auth/login", new
        {
            Email = email,
            Password = "Password1"
        });

        return email;
    }

    private async Task<string> RegisterLoginAndCreateCompany()
    {
        await RegisterAndLogin();

        var companyResponse = await _client.PostAsJsonAsync("/api/companies", new
        {
            Name = "Test Company",
            Type = "Company"
        });

        var company = await companyResponse.Content.ReadFromJsonAsync<CompanyDto>();
        return company!.Id;
    }

    [Fact]
    public async Task Create_ValidData_Returns201()
    {
        await RegisterAndLogin();

        var response = await _client.PostAsJsonAsync("/api/companies", new
        {
            Name = "New Company",
            Type = "Company"
        });

        response.StatusCode.Should().Be(HttpStatusCode.Created);
    }

    [Fact]
    public async Task GetAll_ReturnsOwnCompanies()
    {
        await RegisterLoginAndCreateCompany();

        var response = await _client.GetAsync("/api/companies");

        response.StatusCode.Should().Be(HttpStatusCode.OK);
    }

    [Fact]
    public async Task GetById_Returns200()
    {
        var companyId = await RegisterLoginAndCreateCompany();

        var response = await _client.GetAsync($"/api/companies/{companyId}");

        response.StatusCode.Should().Be(HttpStatusCode.OK);
    }

    [Fact]
    public async Task Update_OwnerRole_Returns200()
    {
        var companyId = await RegisterLoginAndCreateCompany();

        var response = await _client.PutAsJsonAsync($"/api/companies/{companyId}", new
        {
            Name = "Updated Company"
        });

        response.StatusCode.Should().Be(HttpStatusCode.OK);
    }

    [Fact]
    public async Task Delete_OwnerRole_Returns204()
    {
        var companyId = await RegisterLoginAndCreateCompany();

        var response = await _client.DeleteAsync($"/api/companies/{companyId}");

        response.StatusCode.Should().Be(HttpStatusCode.NoContent);
    }

    [Fact]
    public async Task Unauthorized_NoToken_Returns401()
    {
        // Fresh client with no auth cookies
        var response = await _client.GetAsync("/api/companies");

        response.StatusCode.Should().Be(HttpStatusCode.Unauthorized);
    }

    private record CompanyDto
    {
        public string Id { get; init; } = default!;
    }
}
