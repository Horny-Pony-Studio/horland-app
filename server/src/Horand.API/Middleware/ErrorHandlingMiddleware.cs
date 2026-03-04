namespace Horand.API.Middleware;

using System.Net;
using System.Text.Json;
using FluentValidation;

public class ErrorHandlingMiddleware
{
    private readonly RequestDelegate _next;
    private readonly ILogger<ErrorHandlingMiddleware> _logger;

    public ErrorHandlingMiddleware(RequestDelegate next, ILogger<ErrorHandlingMiddleware> logger)
    {
        _next = next;
        _logger = logger;
    }

    public async Task InvokeAsync(HttpContext context)
    {
        try
        {
            await _next(context);
        }
        catch (Exception ex)
        {
            await HandleExceptionAsync(context, ex);
        }
    }

    private async Task HandleExceptionAsync(HttpContext context, Exception exception)
    {
        context.Response.ContentType = "application/json";

        var (statusCode, response) = exception switch
        {
            UnauthorizedAccessException ex => (
                (int)HttpStatusCode.Unauthorized,
                (object)new { error = ex.Message ?? "Unauthorized" }
            ),
            KeyNotFoundException ex => (
                (int)HttpStatusCode.NotFound,
                (object)new { error = ex.Message ?? "Resource not found" }
            ),
            InvalidOperationException ex => (
                (int)HttpStatusCode.BadRequest,
                (object)new { error = ex.Message ?? "Invalid operation" }
            ),
            ValidationException ex => (
                (int)HttpStatusCode.BadRequest,
                (object)new
                {
                    error = "Validation failed",
                    errors = ex.Errors
                        .GroupBy(e => e.PropertyName)
                        .ToDictionary(
                            g => g.Key,
                            g => g.Select(e => e.ErrorMessage).ToArray()
                        )
                }
            ),
            _ => (
                (int)HttpStatusCode.InternalServerError,
                (object)new { error = "An unexpected error occurred" }
            )
        };

        if (statusCode == (int)HttpStatusCode.InternalServerError)
        {
            _logger.LogError(exception, "Unhandled exception occurred");
        }
        else
        {
            _logger.LogWarning(exception, "Handled exception: {Message}", exception.Message);
        }

        context.Response.StatusCode = statusCode;
        var json = JsonSerializer.Serialize(response, new JsonSerializerOptions
        {
            PropertyNamingPolicy = JsonNamingPolicy.CamelCase
        });
        await context.Response.WriteAsync(json);
    }
}
