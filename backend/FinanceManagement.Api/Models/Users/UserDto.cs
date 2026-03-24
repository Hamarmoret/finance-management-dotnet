using System.Text.Json.Serialization;

namespace FinanceManagement.Api.Models;

public class UserDto
{
    [JsonPropertyName("id")]
    public string Id { get; set; } = string.Empty;

    [JsonPropertyName("email")]
    public string Email { get; set; } = string.Empty;

    [JsonPropertyName("firstName")]
    public string FirstName { get; set; } = string.Empty;

    [JsonPropertyName("lastName")]
    public string LastName { get; set; } = string.Empty;

    [JsonPropertyName("role")]
    public string Role { get; set; } = "viewer";

    [JsonPropertyName("mfaEnabled")]
    public bool MfaEnabled { get; set; }

    [JsonPropertyName("isActive")]
    public bool IsActive { get; set; } = true;

    [JsonPropertyName("passwordChangedAt")]
    public DateTime? PasswordChangedAt { get; set; }

    [JsonPropertyName("notificationPreferences")]
    [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
    public object? NotificationPreferences { get; set; }

    [JsonPropertyName("createdAt")]
    public DateTime CreatedAt { get; set; }

    [JsonPropertyName("updatedAt")]
    public DateTime UpdatedAt { get; set; }
}

public class UserEntity
{
    public Guid Id { get; set; }
    public string Email { get; set; } = string.Empty;
    public string PasswordHash { get; set; } = string.Empty;
    public string FirstName { get; set; } = string.Empty;
    public string LastName { get; set; } = string.Empty;
    public string Role { get; set; } = "viewer";
    public string? MfaSecret { get; set; }
    public bool MfaEnabled { get; set; }
    public string[]? MfaBackupCodes { get; set; }
    public bool IsActive { get; set; } = true;
    public DateTime? PasswordChangedAt { get; set; }
    public string[]? PasswordHistory { get; set; }
    public int FailedLoginAttempts { get; set; }
    public DateTime? LockedUntil { get; set; }
    public string? NotificationPreferences { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }

    public UserDto ToDto() => new()
    {
        Id = Id.ToString(),
        Email = Email,
        FirstName = FirstName,
        LastName = LastName,
        Role = Role,
        MfaEnabled = MfaEnabled,
        IsActive = IsActive,
        PasswordChangedAt = PasswordChangedAt,
        NotificationPreferences = NotificationPreferences != null
            ? System.Text.Json.JsonSerializer.Deserialize<object>(NotificationPreferences)
            : null,
        CreatedAt = CreatedAt,
        UpdatedAt = UpdatedAt,
    };
}
