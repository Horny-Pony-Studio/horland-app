namespace Horand.Application.Interfaces;
using Horand.Application.DTOs.Auth;
public interface IAuthService
{
    Task<(AuthResponse User, TokenPair Tokens)> RegisterAsync(RegisterRequest request);
    Task<(AuthResponse User, TokenPair Tokens)> LoginAsync(LoginRequest request);
    Task<TokenPair> RefreshTokenAsync(string refreshToken);
    Task LogoutAsync(string refreshToken);
    Task<AuthResponse> GetCurrentUserAsync(Guid userId);
}
