using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using Dapper;
using FinanceManagement.Api.Config;
using FinanceManagement.Api.Database;
using FinanceManagement.Api.Middleware;
using FinanceManagement.Api.Models;
using FinanceManagement.Api.Models.Auth;

namespace FinanceManagement.Api.Services.Auth;

public class AuthService
{
    private readonly DbContext _db;
    private readonly AppSettings _settings;
    private readonly ILogger<AuthService> _logger;

    public AuthService(DbContext db, AppSettings settings, ILogger<AuthService> logger)
    {
        _db = db;
        _settings = settings;
        _logger = logger;
    }

    public async Task<LoginResponse> RegisterAsync(RegisterRequest request, string? ipAddress, string? userAgent)
    {
        await using var conn = _db.CreateConnection();
        await conn.OpenAsync();

        // Check if email exists
        var exists = await conn.ExecuteScalarAsync<bool>(
            "SELECT EXISTS(SELECT 1 FROM users WHERE email = @Email)",
            new { request.Email });

        if (exists)
            throw new AppException("Email already registered", 409, "EMAIL_EXISTS");

        var passwordHash = BCrypt.Net.BCrypt.HashPassword(request.Password);

        var user = await conn.QuerySingleAsync<UserEntity>(
            """
            INSERT INTO users (email, password_hash, first_name, last_name, password_changed_at)
            VALUES (@Email, @PasswordHash, @FirstName, @LastName, CURRENT_TIMESTAMP)
            RETURNING *
            """,
            new { request.Email, PasswordHash = passwordHash, request.FirstName, request.LastName });

        // Check if this is the first user — make them admin
        var userCount = await conn.ExecuteScalarAsync<int>("SELECT COUNT(*) FROM users");
        if (userCount == 1)
        {
            await conn.ExecuteAsync(
                "UPDATE users SET role = 'admin' WHERE id = @Id",
                new { user.Id });
            user.Role = "admin";
        }

        // Create session
        var refreshToken = JwtHelper.GenerateRefreshToken(user.Id, user.Email, user.Role, _settings.Jwt);
        var refreshTokenHash = HashToken(refreshToken);
        var deviceInfo = BuildDeviceInfo(userAgent);

        await conn.ExecuteAsync(
            """
            INSERT INTO sessions (user_id, refresh_token_hash, device_info, ip_address, user_agent, expires_at)
            VALUES (@UserId, @TokenHash, @DeviceInfo::jsonb, @IpAddress::inet, @UserAgent, @ExpiresAt)
            """,
            new
            {
                UserId = user.Id,
                TokenHash = refreshTokenHash,
                DeviceInfo = JsonSerializer.Serialize(deviceInfo),
                IpAddress = ipAddress,
                UserAgent = userAgent,
                ExpiresAt = DateTime.UtcNow.Add(_settings.Jwt.RefreshExpirationTimeSpan),
            });

        var accessToken = JwtHelper.GenerateAccessToken(user.Id, user.Email, user.Role, _settings.Jwt);

        // Audit log
        await LogAuditAsync(conn, user.Id, "login", "user", user.Id, ipAddress, userAgent);

        return new LoginResponse
        {
            User = user.ToDto(),
            AccessToken = accessToken,
        };
    }

    public async Task<LoginResponse> LoginAsync(LoginRequest request, string? ipAddress, string? userAgent)
    {
        await using var conn = _db.CreateConnection();
        await conn.OpenAsync();

        var user = await conn.QuerySingleOrDefaultAsync<UserEntity>(
            "SELECT * FROM users WHERE email = @Email",
            new { request.Email });

        if (user == null)
            throw new AppException("Invalid email or password", 401, "INVALID_CREDENTIALS");

        if (!user.IsActive)
            throw new AppException("Account is deactivated", 403, "ACCOUNT_DEACTIVATED");

        if (user.LockedUntil.HasValue && user.LockedUntil > DateTime.UtcNow)
            throw new AppException("Account is temporarily locked", 423, "ACCOUNT_LOCKED");

        if (!BCrypt.Net.BCrypt.Verify(request.Password, user.PasswordHash))
        {
            // Increment failed attempts
            await conn.ExecuteAsync(
                """
                UPDATE users SET failed_login_attempts = failed_login_attempts + 1,
                locked_until = CASE WHEN failed_login_attempts >= 4 THEN CURRENT_TIMESTAMP + INTERVAL '15 minutes' ELSE locked_until END
                WHERE id = @Id
                """,
                new { user.Id });

            await LogAuditAsync(conn, user.Id, "login_failed", "user", user.Id, ipAddress, userAgent);
            throw new AppException("Invalid email or password", 401, "INVALID_CREDENTIALS");
        }

        // Reset failed attempts
        await conn.ExecuteAsync(
            "UPDATE users SET failed_login_attempts = 0, locked_until = NULL WHERE id = @Id",
            new { user.Id });

        // Enforce max concurrent sessions
        var sessionCount = await conn.ExecuteScalarAsync<int>(
            "SELECT COUNT(*) FROM sessions WHERE user_id = @UserId AND expires_at > CURRENT_TIMESTAMP",
            new { UserId = user.Id });

        if (sessionCount >= _settings.Session.MaxConcurrent)
        {
            // Delete oldest session
            await conn.ExecuteAsync(
                """
                DELETE FROM sessions WHERE id = (
                  SELECT id FROM sessions WHERE user_id = @UserId ORDER BY created_at ASC LIMIT 1
                )
                """,
                new { UserId = user.Id });
        }

        // Create session
        var refreshToken = JwtHelper.GenerateRefreshToken(user.Id, user.Email, user.Role, _settings.Jwt);
        var refreshTokenHash = HashToken(refreshToken);
        var deviceInfo = BuildDeviceInfo(userAgent);

        await conn.ExecuteAsync(
            """
            INSERT INTO sessions (user_id, refresh_token_hash, device_info, ip_address, user_agent, expires_at)
            VALUES (@UserId, @TokenHash, @DeviceInfo::jsonb, @IpAddress::inet, @UserAgent, @ExpiresAt)
            """,
            new
            {
                UserId = user.Id,
                TokenHash = refreshTokenHash,
                DeviceInfo = JsonSerializer.Serialize(deviceInfo),
                IpAddress = ipAddress,
                UserAgent = userAgent,
                ExpiresAt = DateTime.UtcNow.Add(_settings.Jwt.RefreshExpirationTimeSpan),
            });

        var accessToken = JwtHelper.GenerateAccessToken(user.Id, user.Email, user.Role, _settings.Jwt);

        await LogAuditAsync(conn, user.Id, "login", "user", user.Id, ipAddress, userAgent);

        return new LoginResponse
        {
            User = user.ToDto(),
            AccessToken = accessToken,
        };
    }

    public async Task<object> RefreshAsync(string refreshToken, string? ipAddress, string? userAgent)
    {
        var principal = JwtHelper.ValidateRefreshToken(refreshToken, _settings.Jwt);
        if (principal == null)
            throw new AppException("Invalid refresh token", 401, "INVALID_TOKEN");

        var userId = principal.FindFirst("userId")?.Value;
        if (userId == null)
            throw new AppException("Invalid refresh token", 401, "INVALID_TOKEN");

        await using var conn = _db.CreateConnection();
        await conn.OpenAsync();

        var refreshTokenHash = HashToken(refreshToken);

        // Find and validate session
        var session = await conn.QuerySingleOrDefaultAsync<dynamic>(
            "SELECT id FROM sessions WHERE refresh_token_hash = @Hash AND expires_at > CURRENT_TIMESTAMP",
            new { Hash = refreshTokenHash });

        if (session == null)
            throw new AppException("Session not found or expired", 401, "SESSION_EXPIRED");

        var user = await conn.QuerySingleOrDefaultAsync<UserEntity>(
            "SELECT * FROM users WHERE id = @Id AND is_active = true",
            new { Id = Guid.Parse(userId) });

        if (user == null)
            throw new AppException("User not found or deactivated", 401, "USER_NOT_FOUND");

        // Rotate refresh token
        var newRefreshToken = JwtHelper.GenerateRefreshToken(user.Id, user.Email, user.Role, _settings.Jwt);
        var newRefreshTokenHash = HashToken(newRefreshToken);

        await conn.ExecuteAsync(
            """
            UPDATE sessions SET refresh_token_hash = @NewHash, last_activity_at = CURRENT_TIMESTAMP,
            ip_address = @IpAddress::inet, user_agent = @UserAgent
            WHERE id = @SessionId
            """,
            new { NewHash = newRefreshTokenHash, IpAddress = ipAddress, UserAgent = userAgent, SessionId = (Guid)session.id });

        var accessToken = JwtHelper.GenerateAccessToken(user.Id, user.Email, user.Role, _settings.Jwt);

        return new { user = user.ToDto(), accessToken };
    }

    public async Task LogoutAsync(Guid userId, string? ipAddress, string? userAgent)
    {
        await using var conn = _db.CreateConnection();
        await conn.OpenAsync();

        // Delete all sessions for user (logout from all devices)
        await conn.ExecuteAsync("DELETE FROM sessions WHERE user_id = @UserId", new { UserId = userId });

        await LogAuditAsync(conn, userId, "logout", "user", userId, ipAddress, userAgent);
    }

    public async Task<UserDto> GetMeAsync(Guid userId)
    {
        await using var conn = _db.CreateConnection();
        await conn.OpenAsync();

        var user = await conn.QuerySingleOrDefaultAsync<UserEntity>(
            "SELECT * FROM users WHERE id = @Id", new { Id = userId });

        if (user == null)
            throw new AppException("User not found", 404, "USER_NOT_FOUND");

        return user.ToDto();
    }

    public async Task ChangePasswordAsync(Guid userId, string currentPassword, string newPassword,
        string? ipAddress, string? userAgent)
    {
        await using var conn = _db.CreateConnection();
        await conn.OpenAsync();

        var user = await conn.QuerySingleOrDefaultAsync<UserEntity>(
            "SELECT * FROM users WHERE id = @Id", new { Id = userId });

        if (user == null)
            throw new AppException("User not found", 404, "USER_NOT_FOUND");

        if (!BCrypt.Net.BCrypt.Verify(currentPassword, user.PasswordHash))
            throw new AppException("Current password is incorrect", 400, "INVALID_PASSWORD");

        var newHash = BCrypt.Net.BCrypt.HashPassword(newPassword);

        await conn.ExecuteAsync(
            """
            UPDATE users SET password_hash = @Hash, password_changed_at = CURRENT_TIMESTAMP,
            password_history = array_prepend(@Hash, COALESCE(password_history, '{}'))
            WHERE id = @Id
            """,
            new { Hash = newHash, Id = userId });

        await LogAuditAsync(conn, userId, "password_change", "user", userId, ipAddress, userAgent);
    }

    private static string HashToken(string token)
    {
        var bytes = SHA256.HashData(Encoding.UTF8.GetBytes(token));
        return Convert.ToHexString(bytes).ToLowerInvariant();
    }

    private static object? BuildDeviceInfo(string? userAgent)
    {
        if (string.IsNullOrEmpty(userAgent)) return null;
        return new { userAgent };
    }

    private static async Task LogAuditAsync(Npgsql.NpgsqlConnection conn, Guid userId,
        string action, string entityType, Guid entityId, string? ipAddress, string? userAgent)
    {
        await conn.ExecuteAsync(
            """
            INSERT INTO audit_logs (user_id, action, entity_type, entity_id, ip_address, user_agent)
            VALUES (@UserId, @Action, @EntityType, @EntityId, @IpAddress::inet, @UserAgent)
            """,
            new { UserId = userId, Action = action, EntityType = entityType, EntityId = entityId, IpAddress = ipAddress, UserAgent = userAgent });
    }
}
