using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using FinanceManagement.Api.Middleware;
using FinanceManagement.Api.Models;
using FinanceManagement.Api.Models.Auth;
using FinanceManagement.Api.Services.Auth;

namespace FinanceManagement.Api.Controllers;

[ApiController]
[Route("api/auth")]
public class AuthController : ControllerBase
{
    private readonly AuthService _authService;
    private readonly PasswordResetService _passwordResetService;
    private readonly IWebHostEnvironment _env;

    private const string RefreshTokenCookie = "refresh_token";

    public AuthController(AuthService authService, PasswordResetService passwordResetService, IWebHostEnvironment env)
    {
        _authService = authService;
        _passwordResetService = passwordResetService;
        _env = env;
    }

    [HttpPost("register")]
    [AllowAnonymous]
    [EnableRateLimiting("register")]
    public async Task<IActionResult> Register([FromBody] RegisterRequest request)
    {
        var result = await _authService.RegisterAsync(request, GetIpAddress(), GetUserAgent());
        SetRefreshTokenCookie(result.RefreshToken);
        result.RefreshToken = null; // strip from body — delivered via HttpOnly cookie
        return Ok(ApiResponse<LoginResponse>.Ok(result));
    }

    [HttpPost("login")]
    [AllowAnonymous]
    [EnableRateLimiting("login")]
    public async Task<IActionResult> Login([FromBody] LoginRequest request)
    {
        var result = await _authService.LoginAsync(request, GetIpAddress(), GetUserAgent());
        if (result.RefreshToken != null)
        {
            SetRefreshTokenCookie(result.RefreshToken);
            result.RefreshToken = null; // strip from body — delivered via HttpOnly cookie
        }
        return Ok(ApiResponse<LoginResponse>.Ok(result));
    }

    [HttpPost("refresh")]
    [AllowAnonymous]
    [EnableRateLimiting("refresh")]
    public async Task<IActionResult> Refresh([FromBody] RefreshRequest? request)
    {
        // Prefer the HttpOnly cookie; fall back to body for clients that haven't upgraded yet
        var token = HttpContext.Request.Cookies[RefreshTokenCookie]
                    ?? request?.RefreshToken;

        if (string.IsNullOrEmpty(token))
            throw new AppException("Refresh token required", 401, "INVALID_TOKEN");

        var result = await _authService.RefreshAsync(token, GetIpAddress(), GetUserAgent());

        // Set the rotated token as a new HttpOnly cookie
        if (result.NewRefreshToken != null)
        {
            SetRefreshTokenCookie(result.NewRefreshToken);
        }

        return Ok(ApiResponse<object>.Ok(new { user = result.User, accessToken = result.AccessToken }));
    }

    [HttpPost("logout")]
    [Authorize]
    public async Task<IActionResult> Logout()
    {
        var userId = Guid.Parse(HttpContext.GetUserId()!);
        await _authService.LogoutAsync(userId, GetIpAddress(), GetUserAgent());
        ClearRefreshTokenCookie();
        return Ok(ApiResponse<object>.Ok(new { message = "Logged out successfully" }));
    }

    [HttpGet("me")]
    [Authorize]
    public async Task<IActionResult> GetMe()
    {
        var userId = Guid.Parse(HttpContext.GetUserId()!);
        var user = await _authService.GetMeAsync(userId);
        return Ok(ApiResponse<UserDto>.Ok(user));
    }

    [HttpPost("change-password")]
    [Authorize]
    public async Task<IActionResult> ChangePassword([FromBody] ChangePasswordRequest request)
    {
        var userId = Guid.Parse(HttpContext.GetUserId()!);
        await _authService.ChangePasswordAsync(userId, request.CurrentPassword, request.NewPassword,
            GetIpAddress(), GetUserAgent());
        return Ok(ApiResponse<object>.Ok(new { message = "Password changed successfully" }));
    }

    [HttpPost("forgot-password")]
    [AllowAnonymous]
    [EnableRateLimiting("forgot-password")]
    public async Task<IActionResult> ForgotPassword([FromBody] ForgotPasswordRequest request)
    {
        var token = await _passwordResetService.RequestPasswordResetAsync(request.Email);

        // Always return the same response to prevent email enumeration
        var response = new { message = "If an account exists with that email, a password reset link has been sent." };

        // Only expose the raw token in development environments (#2 fix: use .NET env, not NODE_ENV)
        if (token != null && _env.IsDevelopment())
        {
            var frontendUrl = Environment.GetEnvironmentVariable("FRONTEND_URL") ?? "http://localhost:5173";
            return Ok(ApiResponse<object>.Ok(new
            {
                message = response.message,
                resetToken = token,
                resetLink = $"{frontendUrl}/reset-password?token={token}",
            }));
        }

        return Ok(ApiResponse<object>.Ok(response));
    }

    [HttpGet("reset-password/{token}")]
    [AllowAnonymous]
    public async Task<IActionResult> ValidateResetToken(string token)
    {
        var userId = await _passwordResetService.ValidateResetTokenAsync(token);
        return Ok(ApiResponse<object>.Ok(new { valid = userId != null }));
    }

    [HttpPost("reset-password")]
    [AllowAnonymous]
    public async Task<IActionResult> ResetPassword([FromBody] ResetPasswordRequest request)
    {
        await _passwordResetService.ResetPasswordAsync(request.Token, request.NewPassword);
        return Ok(ApiResponse<object>.Ok(new { message = "Password has been reset successfully. Please log in with your new password." }));
    }

    // ── Cookie helpers ────────────────────────────────────────────────────────

    private void SetRefreshTokenCookie(string? token)
    {
        if (string.IsNullOrEmpty(token)) return;

        var opts = new CookieOptions
        {
            HttpOnly  = true,
            Secure    = true,          // HTTPS only (Cloud Run always uses HTTPS)
            SameSite  = SameSiteMode.None, // required for cross-origin frontend ↔ backend
            Path      = "/",
            MaxAge    = TimeSpan.FromDays(7),
        };
        Response.Cookies.Append(RefreshTokenCookie, token, opts);
    }

    private void ClearRefreshTokenCookie()
    {
        Response.Cookies.Delete(RefreshTokenCookie, new CookieOptions
        {
            HttpOnly = true,
            Secure   = true,
            SameSite = SameSiteMode.None,
            Path     = "/",
        });
    }

    // ── Request helpers ───────────────────────────────────────────────────────

    /// <summary>
    /// Returns the real client IP. Behind Cloud Run the actual IP is in X-Forwarded-For.
    /// </summary>
    private string? GetIpAddress()
    {
        var forwarded = HttpContext.Request.Headers["X-Forwarded-For"].FirstOrDefault();
        if (!string.IsNullOrEmpty(forwarded))
            return forwarded.Split(',')[0].Trim(); // leftmost entry is the original client

        return HttpContext.Connection.RemoteIpAddress?.ToString();
    }

    private string? GetUserAgent() =>
        HttpContext.Request.Headers.UserAgent.ToString();
}
