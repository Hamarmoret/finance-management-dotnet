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

    private const int TokenExpiryHours = 1;
    private const int MaxRequestsPerHour = 3;

    // Argon2id config matching Node.js
    private const int Argon2MemoryCost = 65536;
    private const int Argon2TimeCost = 3;
    private const int Argon2Parallelism = 4;
    private const int Argon2HashLength = 32;

    public PasswordResetService(DbContext db, AppSettings settings, ILogger<PasswordResetService> logger, EmailService emailService)
    {
        _db = db;
        _settings = settings;
        _logger = logger;
        _emailService = emailService;
    }

    /// <summary>
    /// Request a password reset. Returns the token (in production would be emailed).
    /// Always succeeds from the caller's perspective to prevent email enumeration.
    /// </summary>
    public async Task<string?> RequestPasswordResetAsync(string email)
    {
        await using var conn = _db.CreateConnection();
        await conn.OpenAsync();

        // Find user
        var user = await conn.QuerySingleOrDefaultAsync<dynamic>(
            "SELECT id, email, first_name FROM users WHERE email = @Email AND is_active = true",
            new { Email = email.ToLowerInvariant() });

        if (user == null)
        {
            _logger.LogDebug("Password reset requested for non-existent email: {Email}", email);
            return null;
        }

        // Check rate limit
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

        // Generate secure token (64 bytes = 128 hex characters)
        var tokenBytes = RandomNumberGenerator.GetBytes(64);
        var token = Convert.ToHexString(tokenBytes).ToLowerInvariant();

        // Hash the token before storing (using Argon2id like Node.js)
        var tokenHash = HashArgon2(token);

        var expiresAt = DateTime.UtcNow.AddHours(TokenExpiryHours);

        // Invalidate existing tokens for this user
        await conn.ExecuteAsync(
            "UPDATE password_reset_tokens SET used_at = NOW() WHERE user_id = @UserId AND used_at IS NULL",
            new { UserId = (Guid)user.id });

        // Store new token
        await conn.ExecuteAsync(
            """
            INSERT INTO password_reset_tokens (user_id, token_hash, expires_at)
            VALUES (@UserId, @TokenHash, @ExpiresAt)
            """,
            new { UserId = (Guid)user.id, TokenHash = tokenHash, ExpiresAt = expiresAt });

        _logger.LogInformation("Password reset token created for user {UserId}", (Guid)user.id);

        // Send the reset email
        var firstName = (string?)user.first_name ?? "User";
        var emailSent = await _emailService.SendPasswordResetAsync((string)user.email, firstName, token);
        if (!emailSent)
        {
            _logger.LogWarning("Failed to send password reset email to {Email}", (string)user.email);
        }

        return token;
    }

    /// <summary>
    /// Validate a reset token. Returns userId if valid.
    /// </summary>
    public async Task<Guid?> ValidateResetTokenAsync(string token)
    {
        await using var conn = _db.CreateConnection();
        await conn.OpenAsync();

        // Get all unused, non-expired tokens
        var tokens = await conn.QueryAsync<dynamic>(
            """
            SELECT id, user_id, token_hash, expires_at
            FROM password_reset_tokens
            WHERE used_at IS NULL AND expires_at > CURRENT_TIMESTAMP
            ORDER BY created_at DESC
            LIMIT 100
            """);

        foreach (var row in tokens)
        {
            if (VerifyArgon2(token, (string)row.token_hash))
            {
                return (Guid)row.user_id;
            }
        }

        return null;
    }

    /// <summary>
    /// Reset password using a valid token.
    /// </summary>
    public async Task ResetPasswordAsync(string token, string newPassword)
    {
        var userId = await ValidateResetTokenAsync(token);

        if (userId == null)
            throw new AppException("Invalid or expired reset token", 400, "INVALID_TOKEN");

        await using var conn = _db.CreateConnection();
        await conn.OpenAsync();

        // Hash the new password
        var newPasswordHash = HashArgon2(newPassword);

        // Get current password hash for history
        var currentHash = await conn.ExecuteScalarAsync<string>(
            "SELECT password_hash FROM users WHERE id = @Id",
            new { Id = userId.Value });

        // Update password
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

        // Invalidate all sessions
        await conn.ExecuteAsync(
            "DELETE FROM sessions WHERE user_id = @UserId",
            new { UserId = userId.Value });

        _logger.LogInformation("Password reset successful for user {UserId}", userId.Value);
    }

    private static string HashArgon2(string input)
    {
        var salt = RandomNumberGenerator.GetBytes(16);
        var inputBytes = Encoding.UTF8.GetBytes(input);

        using var argon2 = new Argon2id(inputBytes)
        {
            Salt = salt,
            MemorySize = Argon2MemoryCost,
            Iterations = Argon2TimeCost,
            DegreeOfParallelism = Argon2Parallelism,
        };

        var hash = argon2.GetBytes(Argon2HashLength);

        var saltB64 = Convert.ToBase64String(salt).TrimEnd('=');
        var hashB64 = Convert.ToBase64String(hash).TrimEnd('=');

        return $"$argon2id$v=19$m={Argon2MemoryCost},t={Argon2TimeCost},p={Argon2Parallelism}${saltB64}${hashB64}";
    }

    private static bool VerifyArgon2(string input, string encodedHash)
    {
        try
        {
            var parts = encodedHash.Split('$', StringSplitOptions.RemoveEmptyEntries);
            if (parts.Length < 5) return false;

            var paramStr = parts[2];
            var paramDict = new Dictionary<string, int>();
            foreach (var param in paramStr.Split(','))
            {
                var kv = param.Split('=');
                if (kv.Length == 2 && int.TryParse(kv[1], out var val))
                    paramDict[kv[0]] = val;
            }

            var memoryCost = paramDict.GetValueOrDefault("m", Argon2MemoryCost);
            var timeCost = paramDict.GetValueOrDefault("t", Argon2TimeCost);
            var parallelism = paramDict.GetValueOrDefault("p", Argon2Parallelism);

            var salt = Base64DecodeNoPadding(parts[3]);
            var expectedHash = Base64DecodeNoPadding(parts[4]);

            var inputBytes = Encoding.UTF8.GetBytes(input);

            using var argon2 = new Argon2id(inputBytes)
            {
                Salt = salt,
                MemorySize = memoryCost,
                Iterations = timeCost,
                DegreeOfParallelism = parallelism,
            };

            var computedHash = argon2.GetBytes(expectedHash.Length);
            return CryptographicOperations.FixedTimeEquals(computedHash, expectedHash);
        }
        catch
        {
            return false;
        }
    }

    private static byte[] Base64DecodeNoPadding(string input)
    {
        var padded = input;
        switch (input.Length % 4)
        {
            case 2: padded += "=="; break;
            case 3: padded += "="; break;
        }
        return Convert.FromBase64String(padded);
    }
}
