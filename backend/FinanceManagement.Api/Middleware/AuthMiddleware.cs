using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using Microsoft.IdentityModel.Tokens;
using FinanceManagement.Api.Config;

namespace FinanceManagement.Api.Middleware;

public static class AuthExtensions
{
    public static string? GetUserId(this HttpContext context) =>
        context.User.FindFirstValue("userId");

    public static string? GetUserRole(this HttpContext context) =>
        // JwtBearer maps "role" → ClaimTypes.Role during token validation; check both
        context.User.FindFirstValue(ClaimTypes.Role) ?? context.User.FindFirstValue("role");

    public static string? GetUserEmail(this HttpContext context) =>
        context.User.FindFirstValue(ClaimTypes.Email);

    /// <summary>
    /// Returns the authenticated user's ID as a <see cref="Guid"/>.
    /// Throws <see cref="AppException"/> (401) if the claim is absent or malformed.
    /// Use on every [Authorize] endpoint instead of <c>Guid.Parse(GetUserId()!)</c>.
    /// </summary>
    public static Guid GetRequiredUserId(this HttpContext context)
    {
        var raw = context.User.FindFirstValue("userId");
        if (string.IsNullOrEmpty(raw))
            throw new AppException("Authentication required", 401, "UNAUTHORIZED");
        if (!Guid.TryParse(raw, out var guid))
            throw new AppException("Invalid authentication token", 401, "INVALID_TOKEN");
        return guid;
    }
}

public static class JwtHelper
{
    // Pinned issuer + audience must match the values in Program.cs.
    // Callers pass these explicitly or rely on these defaults — keep them in sync.
    public const string DefaultIssuer   = "finance-management-api";
    public const string DefaultAudience = "finance-management-clients";

    public static string GenerateAccessToken(
        Guid userId, string email, string role, JwtSettings settings,
        string issuer = DefaultIssuer, string audience = DefaultAudience)
    {
        var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(settings.AccessSecret));
        var credentials = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);

        var claims = new[]
        {
            new Claim("userId", userId.ToString()),
            new Claim(ClaimTypes.Email, email),
            new Claim("role", role),
            new Claim("type", "access"),
        };

        var token = new JwtSecurityToken(
            issuer: issuer,
            audience: audience,
            claims: claims,
            expires: DateTime.UtcNow.Add(settings.AccessExpirationTimeSpan),
            signingCredentials: credentials
        );

        return new JwtSecurityTokenHandler().WriteToken(token);
    }

    public static string GenerateRefreshToken(
        Guid userId, string email, string role, JwtSettings settings,
        string issuer = DefaultIssuer, string audience = DefaultAudience)
    {
        var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(settings.RefreshSecret));
        var credentials = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);

        var claims = new[]
        {
            new Claim("userId", userId.ToString()),
            new Claim(ClaimTypes.Email, email),
            new Claim("role", role),
            new Claim("type", "refresh"),
        };

        var token = new JwtSecurityToken(
            issuer: issuer,
            audience: audience,
            claims: claims,
            expires: DateTime.UtcNow.Add(settings.RefreshExpirationTimeSpan),
            signingCredentials: credentials
        );

        return new JwtSecurityTokenHandler().WriteToken(token);
    }

    public static ClaimsPrincipal? ValidateRefreshToken(
        string token, JwtSettings settings,
        string issuer = DefaultIssuer, string audience = DefaultAudience)
    {
        var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(settings.RefreshSecret));
        var handler = new JwtSecurityTokenHandler();

        try
        {
            return handler.ValidateToken(token, new TokenValidationParameters
            {
                ValidateIssuerSigningKey = true,
                IssuerSigningKey = key,
                ValidateIssuer   = true,
                ValidIssuer      = issuer,
                ValidateAudience = true,
                ValidAudience    = audience,
                ClockSkew        = TimeSpan.Zero,
            }, out _);
        }
        catch
        {
            return null;
        }
    }
}
