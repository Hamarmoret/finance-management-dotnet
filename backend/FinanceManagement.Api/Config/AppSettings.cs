namespace FinanceManagement.Api.Config;

public class AppSettings
{
    public DatabaseSettings Database { get; set; } = new();
    public JwtSettings Jwt { get; set; } = new();
    public PasswordSettings Password { get; set; } = new();
    public SessionSettings Session { get; set; } = new();
    public CorsSettings Cors { get; set; } = new();
    public string EncryptionKey { get; set; } = string.Empty;
    public GcsSettings Gcs { get; set; } = new();
    public GeminiSettings Gemini { get; set; } = new();
}

public class GeminiSettings
{
    /// <summary>
    /// Google AI Studio (Gemini) API key. Optional — if empty, AI summary generation
    /// is disabled and reports still render with a "AI summary unavailable" placeholder.
    /// Get a free-tier key at https://aistudio.google.com/app/apikey
    /// </summary>
    public string ApiKey { get; set; } = string.Empty;

    /// <summary>
    /// Model name for Gemini generateContent API. Defaults to gemini-2.5-flash
    /// (free tier, fast, good at structured output).
    /// </summary>
    public string Model { get; set; } = "gemini-2.5-flash";

    public bool IsConfigured => !string.IsNullOrWhiteSpace(ApiKey);
}

public class GcsSettings
{
    public string BucketName { get; set; } = "finance-management-uploads";
}

public class DatabaseSettings
{
    public string Host { get; set; } = "localhost";
    public int Port { get; set; } = 5432;
    public string Name { get; set; } = "finance_management";
    public string User { get; set; } = "postgres";
    public string Password { get; set; } = string.Empty;
    public bool Ssl { get; set; }
    public int PoolMin { get; set; } = 2;
    public int PoolMax { get; set; } = 10;

    public string ConnectionString =>
        $"Host={Host};Port={Port};Database={Name};Username={User};Password={Password}" +
        (Ssl ? ";SSL Mode=Require;Trust Server Certificate=true" : "");
}

public class JwtSettings
{
    public string AccessSecret { get; set; } = string.Empty;
    public string RefreshSecret { get; set; } = string.Empty;
    public string AccessExpiration { get; set; } = "24h";
    public string RefreshExpiration { get; set; } = "30d";

    public TimeSpan AccessExpirationTimeSpan => ParseDuration(AccessExpiration);
    public TimeSpan RefreshExpirationTimeSpan => ParseDuration(RefreshExpiration);

    private static TimeSpan ParseDuration(string duration)
    {
        if (string.IsNullOrEmpty(duration)) return TimeSpan.FromMinutes(15);
        var value = int.Parse(duration[..^1]);
        return duration[^1] switch
        {
            'm' => TimeSpan.FromMinutes(value),
            'h' => TimeSpan.FromHours(value),
            'd' => TimeSpan.FromDays(value),
            _ => TimeSpan.FromMinutes(15)
        };
    }
}

public class PasswordSettings
{
    public int MinLength { get; set; } = 12;
    public bool RequireUppercase { get; set; } = true;
    public bool RequireLowercase { get; set; } = true;
    public bool RequireNumber { get; set; } = true;
    public bool RequireSpecial { get; set; } = true;
    public int HistoryCount { get; set; } = 5;
    public int ExpiryDays { get; set; } = 90;
}

public class SessionSettings
{
    public int TimeoutMinutes { get; set; } = 30;
    public int MaxConcurrent { get; set; } = 5;
}

public class CorsSettings
{
    public string Origin { get; set; } = "http://localhost:3000";
    public bool Credentials { get; set; } = true;
}
