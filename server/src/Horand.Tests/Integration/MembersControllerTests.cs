namespace Horand.Tests.Integration;

using System.Net;
using System.Net.Http.Json;
using FluentAssertions;
using Xunit;

public class MembersControllerTests : IClassFixture<CustomWebApplicationFactory>
{
    private readonly HttpClient _client;

    public MembersControllerTests(CustomWebApplicationFactory factory)
    {
        _client = factory.CreateClient();
    }

    private async Task<(string CompanyId, string EditorEmail)> SetupCompanyWithEditor()
    {
        var ownerEmail = $"owner_{Guid.NewGuid():N}@example.com";
        var editorEmail = $"editor_{Guid.NewGuid():N}@example.com";

        // Register both users
        await _client.PostAsJsonAsync("/api/auth/register", new
        {
            Email = ownerEmail,
            Password = "Password1",
            FullName = "Owner User"
        });

        await _client.PostAsJsonAsync("/api/auth/register", new
        {
            Email = editorEmail,
            Password = "Password1",
            FullName = "Editor User"
        });

        // Login as owner
        await _client.PostAsJsonAsync("/api/auth/login", new
        {
            Email = ownerEmail,
            Password = "Password1"
        });

        var companyResponse = await _client.PostAsJsonAsync("/api/companies", new
        {
            Name = "Member Co",
            Type = "Company"
        });
        var company = await companyResponse.Content.ReadFromJsonAsync<IdDto>();

        return (company!.Id, editorEmail);
    }

    [Fact]
    public async Task Add_ValidData_Returns201()
    {
        var (companyId, editorEmail) = await SetupCompanyWithEditor();

        var response = await _client.PostAsJsonAsync($"/api/companies/{companyId}/members", new
        {
            Email = editorEmail,
            Role = "Editor"
        });

        response.StatusCode.Should().Be(HttpStatusCode.Created);
    }

    [Fact]
    public async Task Add_EditorRole_ReturnsForbidden()
    {
        var (companyId, editorEmail) = await SetupCompanyWithEditor();

        // First add the editor
        await _client.PostAsJsonAsync($"/api/companies/{companyId}/members", new
        {
            Email = editorEmail,
            Role = "Editor"
        });

        // Login as the editor
        await _client.PostAsJsonAsync("/api/auth/login", new
        {
            Email = editorEmail,
            Password = "Password1"
        });

        // Try to add another member as editor
        var thirdEmail = $"third_{Guid.NewGuid():N}@example.com";
        await _client.PostAsJsonAsync("/api/auth/register", new
        {
            Email = thirdEmail,
            Password = "Password1",
            FullName = "Third User"
        });

        // Re-login as editor
        await _client.PostAsJsonAsync("/api/auth/login", new
        {
            Email = editorEmail,
            Password = "Password1"
        });

        var response = await _client.PostAsJsonAsync($"/api/companies/{companyId}/members", new
        {
            Email = thirdEmail,
            Role = "Editor"
        });

        response.StatusCode.Should().Be(HttpStatusCode.Forbidden);
    }

    [Fact]
    public async Task GetAll_Returns200()
    {
        var (companyId, _) = await SetupCompanyWithEditor();

        var response = await _client.GetAsync($"/api/companies/{companyId}/members");

        response.StatusCode.Should().Be(HttpStatusCode.OK);
    }

    [Fact]
    public async Task Remove_OwnerRole_Returns204()
    {
        var (companyId, editorEmail) = await SetupCompanyWithEditor();

        var addResponse = await _client.PostAsJsonAsync($"/api/companies/{companyId}/members", new
        {
            Email = editorEmail,
            Role = "Editor"
        });
        var member = await addResponse.Content.ReadFromJsonAsync<IdDto>();

        var response = await _client.DeleteAsync($"/api/companies/{companyId}/members/{member!.Id}");

        response.StatusCode.Should().Be(HttpStatusCode.NoContent);
    }

    private record IdDto
    {
        public string Id { get; init; } = default!;
    }
}
