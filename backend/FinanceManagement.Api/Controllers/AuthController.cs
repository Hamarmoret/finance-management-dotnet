using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
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

    public AuthController(AuthService authService, PasswordResetService passwordResetService)
    {
        _authService = authService;
        _passwordResetService = passwordResetService;
    }

    [HttpPost("register")]
    [AllowAnonymous]
    public async Task<IActionResult> Register([FromBody] RegisterRequest request)
    {
        var result = await _authService.RegisterAsync(request, GetIpAddress(), GetUserAgent());
        return Ok(ApiResponse<LoginResponse>.Ok(result));
    }

    [HttpPost("login")]
    [AllowAnonymous]
    public async Task<IActionResult> Login([FromBody] LoginRequest request)
    {
        var result = await _authService.LoginAsync(request, GetIpAddress(), GetUserAgent());
        return Ok(ApiResponse<LoginResponse>.Ok(result));
    }

    [HttpPost("refresh")]
    [AllowAnonymous]
    public async Task<IActionResult> Refresh([FromBody] RefreshRequest request)
    {
        var result = await _authService.RefreshAsync(request.RefreshToken, GetIpAddress(), GetUserAgent());
        return Ok(ApiResponse<object>.Ok(result));
    }

    [HttpPost("logout")]
    [Authorize]
    public async Task<IActionResult> Logout()
    {
        var userId = Guid.Parse(HttpContext.GetUserId()!);
        await _authService.LogoutAsync(userId, GetIpAddress(), GetUserAgent());
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
    public async Task<IActionResult> ForgotPassword([FromBody] ForgotPasswordRequest request)
    {
        var token = await _passwordResetService.RequestPasswordResetAsync(request.Email);

        // Always return success to prevent email enumeration
        var response = new { message = "If an account exists with that email, a password reset link has been sent." };

        if (token != null && Environment.GetEnvironmentVariable("NODE_ENV") != "production")
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

    private string? GetIpAddress() =>
        HttpContext.Connection.RemoteIpAddress?.ToString();

    private string? GetUserAgent() =>
        HttpContext.Request.Headers.UserAgent.ToString();
}
