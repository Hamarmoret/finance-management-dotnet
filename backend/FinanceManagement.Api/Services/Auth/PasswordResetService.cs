using System.Security.Cryptography;
using System.Text;
using Dapper;
using FinanceManagement.Api.Config;
using FinanceManagement.Api.Database;
using FinanceManagement.Api.Middleware;
using Konscious.Security.Cryptography;

namespace FinanceManagement.Api.Services.Auth;

public class PasswordResetService
{
    private readonly DbContext _db;
    private readonly AppSettings _settings;
    private readonly ILogger<PasswordResetService> _logger;
    private readonly EmailService _emailService;

    private const int TokenExpiryHours    = 1;
    private const int MaxRequestsPerHour  = 3;

    // Argon2id params — used only for hashing the new PASSWORD, not the token.
    private const int Argon2MemoryCost  = 65536;
    private const int Argon2TimeCost    = 3;
    private const int Argon2Parallelism = 4;
    private const int Argon2HashLength  = 32;

    public PasswordResetService(DbContext db, AppSettings settings, ILogger<PasswordResetService> logger, EmailService emailService)
    {
        _db           = db;
        _settings     = settings;
        _logger       = logger;
        _emailService = emailService;
    }

    /// <summary>
    /// Request a password reset. Always returns the same response to prevent email enumeration.
    /// </summary>
    public async Task<string?> RequestPasswordResetAsync(string email)
    {
        await using var conn = _db.CreateConnection();
        await conn.OpenAsync();

        var user = await conn.QuerySingleOrDefaultAsync<dynamic>(
            "SELECT id, email, first_name FROM users WHERE email = @Email AND is_active = true",
            new { Email = email.ToLowerInvariant() });

        if (user == null)
        {
            _logger.LogDebug("Password reset requested for non-existent email: {Email}", email);
            return null;
        }

        // Check per-user rate limit
        var recentCount = await conn.ExecuteScalarAsync<int>(
            """
            SELECT COUNT(*) FROM password_reset_tokens
            WHERE user_id = @UserId AND created_at > CURRENT_TIMESTAMP - INTERVAL '1 hour'
            """,
            new { UserId = (Guid)user.id });

        if (recentCount >= MaxRequestsPerHour)
        {
            _logger.LogWarning("Password reset rate limit exceeded for user {UserId}", (Guid)user.id);
            return null;
        }

        // 64 random bytes → 128 hex chars (cryptographically strong; no need for slow hash)
        var tokenBytes = RandomNumberGenerator.GetBytes(64);
        var token      = Convert.ToHexString(tokenBytes).ToLowerInvariant();
        // SHA-256 of the random token is safe as the token lookup key.
        // Slow hashing (Argon2) is only needed for low-entropy inputs like passwords.
        var tokenHash  = HashTokenSha256(token);

        var expiresAt = DateTime.UtcNow.AddHours(TokenExpiryHours);

        // Invalidate existing tokens for this user
        await conn.ExecuteAsync(
            "UPDATE password_reset_tokens SET used_at = NOW() WHERE user_id = @UserId AND used_at IS NULL",
            new { UserId = (Guid)user.id });

        // Store new token — looked up in O(1) by its SHA-256 hash
        await conn.ExecuteAsync(
            """
            INSERT INTO password_reset_tokens (user_id, token_hash, expires_at)
            VALUES (@UserId, @TokenHash, @ExpiresAt)
            """,
            new { UserId = (Guid)user.id, TokenHash = tokenHash, ExpiresAt = expiresAt });

        _logger.LogInformation("Password reset token created for user {UserId}", (Guid)user.id);

        var firstName = (string?)user.first_name ?? "User";
        var emailSent = await _emailService.SendPasswordResetAsync((string)user.email, firstName, token);
        if (!emailSent)
            _logger.LogWarning("Failed to send password reset email to {Email}", (string)user.email);

        return token;
    }

    /// <summary>Validate a reset token. Returns userId if valid.</summary>
    public async Task<Guid?> ValidateResetTokenAsync(string token)
    {
        await using var conn = _db.CreateConnection();
        await conn.OpenAsync();

        // O(1) lookup by SHA-256 hash — no linear scan, no Argon2 computation
        var tokenHash = HashTokenSha256(token);

        var row = await conn.QuerySingleOrDefaultAsync<dynamic>(
            """
            SELECT user_id FROM password_reset_tokens
            WHERE token_hash = @Hash AND used_at IS NULL AND expires_at > CURRENT_TIMESTAMP
            """,
            new { Hash = tokenHash });

        return row != null ? (Guid?)row.user_id : null;
    }

    /// <summary>Reset password using a valid token.</summary>
    public async Task ResetPasswordAsync(string token, string newPassword)
    {
        var userId = await ValidateResetTokenAsync(token);

        if (userId == null)
            throw new AppException("Invalid or expired reset token", 400, "INVALID_TOKEN");

        await using var conn = _db.CreateConnection();
        await conn.OpenAsync();

        // Passwords still use Argon2id — slow hash is appropriate for user-chosen secrets
        var newPasswordHash = HashPasswordArgon2(newPassword);

        var currentHash = await conn.ExecuteScalarAsync<string>(
            "SELECT password_hash FROM users WHERE id = @Id",
            new { Id = userId.Value });

        await conn.ExecuteAsync(
            """
            UPDATE users SET
                password_hash = @Hash,
                password_history = array_prepend(@CurrentHash, COALESCE(password_history, '{}')),
                password_changed_at = CURRENT_TIMESTAMP,
                failed_login_attempts = 0,
                locked_until = NULL
            WHERE id = @Id
            """,
            new { Hash = newPasswordHash, CurrentHash = currentHash, Id = userId.Value });

        // Invalidate all tokens for this user
        await conn.ExecuteAsync(
            "UPDATE password_reset_tokens SET used_at = NOW() WHERE user_id = @UserId AND used_at IS NULL",
            new { UserId = userId.Value });

        // Invalidate all sessions (force re-login after password reset)
        await conn.ExecuteAsync(
            "DELETE FROM sessions WHERE user_id = @UserId",
            new { UserId = userId.Value });

        _logger.LogInformation("Password reset successful for user {UserId}", userId.Value);
    }

    // ── Hashing helpers ───────────────────────────────────────────────────────

    /// <summary>
    /// SHA-256 hex digest — appropriate for storing random, high-entropy tokens.
    /// Matches AuthService.HashToken so the same pattern is used throughout.
    /// </summary>
    private static string HashTokenSha256(string token)
    {
        var bytes = SHA256.HashData(Encoding.UTF8.GetBytes(token));
        return Convert.ToHexString(bytes).ToLowerInvariant();
    }

    /// <summary>Argon2id PHC string — used only for password hashing, not tokens.</summary>
    private static string HashPasswordArgon2(string password)
    {
        var salt         = RandomNumberGenerator.GetBytes(16);
        var passwordBytes = Encoding.UTF8.GetBytes(password);

        using var argon2 = new Argon2id(passwordBytes)
        {
            Salt                = salt,
            MemorySize          = Argon2MemoryCost,
            Iterations          = Argon2TimeCost,
            DegreeOfParallelism = Argon2Parallelism,
        };

        var hash = argon2.GetBytes(Argon2HashLength);

        var saltB64 = Convert.ToBase64String(salt).TrimEnd('=');
        var hashB64 = Convert.ToBase64String(hash).TrimEnd('=');

        return $"$argon2id$v=19$m={Argon2MemoryCost},t={Argon2TimeCost},p={Argon2Parallelism}${saltB64}${hashB64}";
    }
}
