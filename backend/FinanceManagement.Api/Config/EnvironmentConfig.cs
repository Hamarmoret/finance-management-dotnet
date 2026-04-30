namespace FinanceManagement.Api.Config;

/// <summary>
/// Maps environment variables to AppSettings, matching the Node.js environment.ts config.
/// </summary>
public static class EnvironmentConfig
{
    public static AppSettings Load()
    {
        return new AppSettings
        {
            Database = new DatabaseSettings
            {
                Host = Env("DATABASE_HOST", "localhost"),
                Port = EnvInt("DATABASE_PORT", 5432),
                Name = Env("DATABASE_NAME", "finance_management"),
                User = Env("DATABASE_USER", "postgres"),
                Password = Env("DATABASE_PASSWORD", ""),
                Ssl = EnvBool("DATABASE_SSL", false),
                PoolMin = EnvInt("DATABASE_POOL_MIN", 2),
                PoolMax = EnvInt("DATABASE_POOL_MAX", 10),
            },
            Jwt = new JwtSettings
            {
                AccessSecret = Env("JWT_ACCESS_SECRET", ""),
                RefreshSecret = Env("JWT_REFRESH_SECRET", ""),
                AccessExpiration = Env("JWT_ACCESS_EXPIRATION", "24h"),
                RefreshExpiration = Env("JWT_REFRESH_EXPIRATION", "30d"),
            },
            Password = new PasswordSettings
            {
                MinLength = EnvInt("PASSWORD_MIN_LENGTH", 12),
                RequireUppercase = EnvBool("PASSWORD_REQUIRE_UPPERCASE", true),
                RequireLowercase = EnvBool("PASSWORD_REQUIRE_LOWERCASE", true),
                RequireNumber = EnvBool("PASSWORD_REQUIRE_NUMBER", true),
                RequireSpecial = EnvBool("PASSWORD_REQUIRE_SPECIAL", true),
                HistoryCount = EnvInt("PASSWORD_HISTORY_COUNT", 5),
                ExpiryDays = EnvInt("PASSWORD_EXPIRY_DAYS", 90),
            },
            Session = new SessionSettings
            {
                TimeoutMinutes = EnvInt("SESSION_TIMEOUT_MINUTES", 30),
                MaxConcurrent = EnvInt("MAX_CONCURRENT_SESSIONS", 5),
            },
            Cors = new CorsSettings
            {
                Origin = Env("CORS_ORIGIN", "http://localhost:3000"),
                Credentials = EnvBool("CORS_CREDENTIALS", true),
            },
            EncryptionKey = Env("ENCRYPTION_KEY", ""),
            Gcs = new GcsSettings
            {
                BucketName = Env("GCS_BUCKET", "finance-management-uploads"),
            },
            Gemini = new GeminiSettings
            {
                // Optional — if missing, reports still render without AI summary.
                // Free tier key: https://aistudio.google.com/app/apikey
                ApiKey = Env("GEMINI_API_KEY", ""),
                Model  = Env("GEMINI_MODEL", "gemini-2.5-flash"),
            },
        };
    }

    private static string Env(string key, string defaultValue) =>
        Environment.GetEnvironmentVariable(key) ?? defaultValue;

    private static int EnvInt(string key, int defaultValue) =>
        int.TryParse(Environment.GetEnvironmentVariable(key), out var v) ? v : defaultValue;

    private static bool EnvBool(string key, bool defaultValue) =>
        bool.TryParse(Environment.GetEnvironmentVariable(key), out var v) ? v : defaultValue;
}
