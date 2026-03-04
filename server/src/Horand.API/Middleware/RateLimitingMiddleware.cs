namespace Horand.API.Middleware;

using System.Collections.Concurrent;

public class RateLimitingMiddleware
{
    private readonly RequestDelegate _next;
    private static readonly ConcurrentDictionary<string, List<DateTime>> _requestLog = new();
    private const int GlobalLimit = 600;
    private const int AuthLimit = 30;
    private static readonly TimeSpan Window = TimeSpan.FromMinutes(1);

    public RateLimitingMiddleware(RequestDelegate next)
    {
        _next = next;
    }

    public async Task InvokeAsync(HttpContext context)
    {
        var ip = context.Connection.RemoteIpAddress?.ToString() ?? "unknown";
        var path = context.Request.Path.Value ?? "";
        var isAuthRoute = path.StartsWith("/api/auth", StringComparison.OrdinalIgnoreCase);
        var key = isAuthRoute ? $"{ip}:auth" : ip;
        var limit = isAuthRoute ? AuthLimit : GlobalLimit;

        var now = DateTime.UtcNow;
        var timestamps = _requestLog.GetOrAdd(key, _ => new List<DateTime>());

        lock (timestamps)
        {
            timestamps.RemoveAll(t => now - t > Window);

            if (timestamps.Count >= limit)
            {
                context.Response.StatusCode = StatusCodes.Status429TooManyRequests;
                context.Response.Headers["Retry-After"] = "60";
                context.Response.ContentType = "application/json";
                context.Response.WriteAsync("{\"error\":\"Too many requests. Please try again later.\"}");
                return;
            }

            timestamps.Add(now);
        }

        await _next(context);
    }
}
