namespace Horand.API.Controllers;

using Horand.Application.DTOs.Auth;
using Horand.Application.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;

[ApiController]
[Route("api/auth")]
public class AuthController : ControllerBase
{
    private readonly IAuthService _authService;
    private readonly IWebHostEnvironment _env;

    public AuthController(IAuthService authService, IWebHostEnvironment env)
    {
        _authService = authService;
        _env = env;
    }

    [HttpPost("register")]
    public async Task<IActionResult> Register([FromBody] RegisterRequest request)
    {
        var (user, tokens) = await _authService.RegisterAsync(request);
        SetTokenCookies(tokens);
        return StatusCode(201, user);
    }

    [HttpPost("login")]
    public async Task<IActionResult> Login([FromBody] LoginRequest request)
    {
        var (user, tokens) = await _authService.LoginAsync(request);
        SetTokenCookies(tokens);
        return Ok(user);
    }

    [HttpPost("refresh")]
    public async Task<IActionResult> Refresh()
    {
        var refreshToken = Request.Cookies["refreshToken"]
            ?? throw new UnauthorizedAccessException("Refresh token not found");

        var tokens = await _authService.RefreshTokenAsync(refreshToken);
        SetTokenCookies(tokens);
        return Ok();
    }

    [Authorize]
    [HttpPost("logout")]
    public async Task<IActionResult> Logout()
    {
        var refreshToken = Request.Cookies["refreshToken"]
            ?? throw new UnauthorizedAccessException("Refresh token not found");

        await _authService.LogoutAsync(refreshToken);
        ClearTokenCookies();
        return NoContent();
    }

    [Authorize]
    [HttpGet("me")]
    public async Task<IActionResult> Me()
    {
        var userId = GetUserId();
        var user = await _authService.GetCurrentUserAsync(userId);
        return Ok(user);
    }

    private void SetTokenCookies(TokenPair tokens)
    {
        Response.Cookies.Append("accessToken", tokens.AccessToken, GetCookieOptions());
        Response.Cookies.Append("refreshToken", tokens.RefreshToken, GetCookieOptions(isRefreshToken: true));
    }

    private void ClearTokenCookies()
    {
        Response.Cookies.Delete("accessToken");
        Response.Cookies.Delete("refreshToken");
    }

    private CookieOptions GetCookieOptions(bool isRefreshToken = false) => new()
    {
        HttpOnly = true,
        Secure = false,
        SameSite = SameSiteMode.Lax,
        Expires = isRefreshToken ? DateTimeOffset.UtcNow.AddDays(7) : DateTimeOffset.UtcNow.AddMinutes(15)
    };

    private Guid GetUserId() => Guid.Parse(User.FindFirst(ClaimTypes.NameIdentifier)?.Value
        ?? throw new UnauthorizedAccessException("User not authenticated"));
}
