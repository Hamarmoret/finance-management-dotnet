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

    public AuthController(AuthService authService)
    {
        _authService = authService;
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

    private string? GetIpAddress() =>
        HttpContext.Connection.RemoteIpAddress?.ToString();

    private string? GetUserAgent() =>
        HttpContext.Request.Headers.UserAgent.ToString();
}
