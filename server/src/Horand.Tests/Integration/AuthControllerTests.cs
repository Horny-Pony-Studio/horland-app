namespace Horand.Tests.Integration;

using System.Net;
using System.Net.Http.Json;
using FluentAssertions;
using Xunit;

public class AuthControllerTests : IClassFixture<CustomWebApplicationFactory>
{
    private readonly HttpClient _client;

    public AuthControllerTests(CustomWebApplicationFactory factory)
    {
        _client = factory.CreateClient();
    }

    [Fact]
    public async Task Register_ValidData_Returns201()
    {
        var response = await _client.PostAsJsonAsync("/api/auth/register", new
        {
            Email = $"test_{Guid.NewGuid():N}@example.com",
            Password = "Password1",
            FullName = "Test User"
        });

        response.StatusCode.Should().Be(HttpStatusCode.Created);
    }

    [Fact]
    public async Task Login_ValidCredentials_Returns200()
    {
        var email = $"login_{Guid.NewGuid():N}@example.com";

        await _client.PostAsJsonAsync("/api/auth/register", new
        {
            Email = email,
            Password = "Password1",
            FullName = "Login User"
        });

        var response = await _client.PostAsJsonAsync("/api/auth/login", new
        {
            Email = email,
            Password = "Password1"
        });

        response.StatusCode.Should().Be(HttpStatusCode.OK);
    }

    [Fact]
    public async Task Login_InvalidCredentials_Returns401()
    {
        var response = await _client.PostAsJsonAsync("/api/auth/login", new
        {
            Email = "nonexistent@example.com",
            Password = "WrongPass1"
        });

        response.StatusCode.Should().Be(HttpStatusCode.Unauthorized);
    }
}
