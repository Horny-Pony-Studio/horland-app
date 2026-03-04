namespace Horand.API.Services;

using System.Security.Cryptography;
using System.Text;
using Horand.Application.Interfaces;

public class SignTokenService : ISignTokenService
{
    private readonly byte[] _key;

    public SignTokenService(IConfiguration configuration)
    {
        var secret = configuration["Jwt:Secret"] ?? throw new InvalidOperationException("Jwt:Secret not configured");
        _key = Encoding.UTF8.GetBytes(secret);
    }

    public string GenerateToken(Guid agreementId, Guid partnerId)
    {
        var payload = $"{agreementId}:{partnerId}";
        var payloadBase64 = Convert.ToBase64String(Encoding.UTF8.GetBytes(payload))
            .TrimEnd('=').Replace('+', '-').Replace('/', '_');

        using var hmac = new HMACSHA256(_key);
        var hash = hmac.ComputeHash(Encoding.UTF8.GetBytes(payload));
        var hashBase64 = Convert.ToBase64String(hash)
            .TrimEnd('=').Replace('+', '-').Replace('/', '_');

        return $"{payloadBase64}~{hashBase64}";
    }

    public (Guid AgreementId, Guid PartnerId)? ValidateToken(string token)
    {
        var parts = token.Split('~');
        if (parts.Length != 2) return null;

        try
        {
            var payloadBase64 = parts[0].Replace('-', '+').Replace('_', '/');
            switch (payloadBase64.Length % 4)
            {
                case 2: payloadBase64 += "=="; break;
                case 3: payloadBase64 += "="; break;
            }

            var payload = Encoding.UTF8.GetString(Convert.FromBase64String(payloadBase64));
            var ids = payload.Split(':');
            if (ids.Length != 2) return null;

            using var hmac = new HMACSHA256(_key);
            var expectedHash = hmac.ComputeHash(Encoding.UTF8.GetBytes(payload));
            var expectedBase64 = Convert.ToBase64String(expectedHash)
                .TrimEnd('=').Replace('+', '-').Replace('/', '_');

            if (parts[1] != expectedBase64) return null;

            return (Guid.Parse(ids[0]), Guid.Parse(ids[1]));
        }
        catch
        {
            return null;
        }
    }
}
