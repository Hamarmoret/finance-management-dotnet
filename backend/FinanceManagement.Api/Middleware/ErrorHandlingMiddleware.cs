using System.Text.Json;
using FinanceManagement.Api.Models;

namespace FinanceManagement.Api.Middleware;

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

            // Handle 404 for unmatched routes
            if (context.Response.StatusCode == 404 && !context.Response.HasStarted)
            {
                context.Response.ContentType = "application/json";
                var error = new ApiError
                {
                    Error = new ErrorDetail
                    {
                        Code = "NOT_FOUND",
                        Message = $"Route {context.Request.Method} {context.Request.Path} not found"
                    }
                };
                await context.Response.WriteAsync(JsonSerializer.Serialize(error));
            }
        }
        catch (AppException ex)
        {
            _logger.LogWarning(ex, "Application error: {Message}", ex.Message);
            await WriteErrorResponse(context, ex.StatusCode, ex.ErrorCode, ex.Message);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Unhandled exception: {Message}", ex.Message);
            await WriteErrorResponse(context, 500, "INTERNAL_ERROR", "Internal server error");
        }
    }

    private static async Task WriteErrorResponse(HttpContext context, int statusCode, string code, string message)
    {
        context.Response.StatusCode = statusCode;
        context.Response.ContentType = "application/json";
        var error = new ApiError
        {
            Error = new ErrorDetail { Code = code, Message = message }
        };
        await context.Response.WriteAsync(JsonSerializer.Serialize(error));
    }
}

public class AppException : Exception
{
    public int StatusCode { get; }
    public string ErrorCode { get; }

    public AppException(string message, int statusCode = 400, string errorCode = "BAD_REQUEST")
        : base(message)
    {
        StatusCode = statusCode;
        ErrorCode = errorCode;
    }
}
