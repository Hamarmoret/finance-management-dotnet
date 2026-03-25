using System.Text.Json.Serialization;

namespace FinanceManagement.Api.Models.Auth;

public class LoginRequest
{
    [JsonPropertyName("email")]
    public string Email { get; set; } = string.Empty;

    [JsonPropertyName("password")]
    public string Password { get; set; } = string.Empty;

    [JsonPropertyName("mfaCode")]
    public string? MfaCode { get; set; }
}

public class RegisterRequest
{
    [JsonPropertyName("email")]
    public string Email { get; set; } = string.Empty;

    [JsonPropertyName("password")]
    public string Password { get; set; } = string.Empty;

    [JsonPropertyName("firstName")]
    public string FirstName { get; set; } = string.Empty;

    [JsonPropertyName("lastName")]
    public string LastName { get; set; } = string.Empty;
}

public class LoginResponse
{
    [JsonPropertyName("user")]
    public UserDto User { get; set; } = new();

    [JsonPropertyName("accessToken")]
    public string AccessToken { get; set; } = string.Empty;

    [JsonPropertyName("refreshToken")]
    [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
    public string? RefreshToken { get; set; }

    [JsonPropertyName("requiresMfa")]
    public bool RequiresMfa { get; set; }

    [JsonPropertyName("mfaToken")]
    [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
    public string? MfaToken { get; set; }
}

public class RefreshRequest
{
    [JsonPropertyName("refreshToken")]
    public string RefreshToken { get; set; } = string.Empty;
}

public class ChangePasswordRequest
{
    [JsonPropertyName("currentPassword")]
    public string CurrentPassword { get; set; } = string.Empty;

    [JsonPropertyName("newPassword")]
    public string NewPassword { get; set; } = string.Empty;
}

public class ForgotPasswordRequest
{
    [JsonPropertyName("email")]
    public string Email { get; set; } = string.Empty;
}

public class ResetPasswordRequest
{
    [JsonPropertyName("token")]
    public string Token { get; set; } = string.Empty;

    [JsonPropertyName("newPassword")]
    public string NewPassword { get; set; } = string.Empty;
}
