using System.Text.Json.Serialization;
using Dapper;
using FinanceManagement.Api.Database;
using FinanceManagement.Api.Middleware;
using FinanceManagement.Api.Models;

namespace FinanceManagement.Api.Services.Users;

// =============================================
// DTOs
// =============================================

public class UserWithPermissionsDto : UserDto
{
    [JsonPropertyName("pnlPermissions")]
    public List<PnlPermissionDto> PnlPermissions { get; set; } = [];
}

public class PnlPermissionDto
{
    [JsonPropertyName("pnlCenterId")]
    public string PnlCenterId { get; set; } = string.Empty;

    [JsonPropertyName("pnlCenterName")]
    public string PnlCenterName { get; set; } = string.Empty;

    [JsonPropertyName("permissionLevel")]
    public string PermissionLevel { get; set; } = string.Empty;
}

// =============================================
// Request models
// =============================================

public class UpdateRoleRequest
{
    [JsonPropertyName("role")]
    public string Role { get; set; } = string.Empty;
}

public class ToggleActiveRequest
{
    [JsonPropertyName("isActive")]
    public bool IsActive { get; set; }
}

public class SetPnlPermissionsRequest
{
    [JsonPropertyName("permissions")]
    public List<PnlPermissionInput> Permissions { get; set; } = [];
}

public class PnlPermissionInput
{
    [JsonPropertyName("pnlCenterId")]
    public string PnlCenterId { get; set; } = string.Empty;

    [JsonPropertyName("permissionLevel")]
    public string PermissionLevel { get; set; } = string.Empty;
}

public class InviteUserRequest
{
    [JsonPropertyName("email")]
    public string Email { get; set; } = string.Empty;

    [JsonPropertyName("firstName")]
    public string FirstName { get; set; } = string.Empty;

    [JsonPropertyName("lastName")]
    public string LastName { get; set; } = string.Empty;

    [JsonPropertyName("role")]
    public string Role { get; set; } = "viewer";
}

// =============================================
// Database row types
// =============================================

public class PnlPermissionRow
{
    public Guid Pnl_Center_Id { get; set; }
    public string Pnl_Center_Name { get; set; } = string.Empty;
    public string Permission_Level { get; set; } = string.Empty;
}

// =============================================
// Service
// =============================================

public class UsersService
{
    private readonly DbContext _db;
    private readonly ILogger<UsersService> _logger;

    public UsersService(DbContext db, ILogger<UsersService> logger)
    {
        _db = db;
        _logger = logger;
    }

    public async Task<(List<UserDto> Users, int Total)> GetAllAsync(
        int page = 1, int limit = 20, string? search = null, string? role = null, bool? isActive = null)
    {
        await using var conn = _db.CreateConnection();
        await conn.OpenAsync();

        var whereClauses = new List<string>();
        var parameters = new DynamicParameters();

        if (isActive.HasValue)
        {
            whereClauses.Add("is_active = @IsActive");
            parameters.Add("IsActive", isActive.Value);
        }

        if (!string.IsNullOrWhiteSpace(search))
        {
            whereClauses.Add("(email ILIKE @Search OR first_name ILIKE @Search OR last_name ILIKE @Search)");
            parameters.Add("Search", $"%{search}%");
        }

        if (!string.IsNullOrWhiteSpace(role))
        {
            whereClauses.Add("role = @Role");
            parameters.Add("Role", role);
        }

        var whereClause = whereClauses.Count > 0
            ? "WHERE " + string.Join(" AND ", whereClauses)
            : "";

        var total = await conn.ExecuteScalarAsync<int>(
            $"SELECT COUNT(*) FROM users {whereClause}",
            parameters);

        var offset = (page - 1) * limit;
        parameters.Add("Limit", limit);
        parameters.Add("Offset", offset);

        var rows = await conn.QueryAsync<UserEntity>(
            $"""
            SELECT id, email, first_name, last_name, role, mfa_enabled, is_active,
                   password_changed_at, created_at, updated_at
            FROM users
            {whereClause}
            ORDER BY created_at DESC
            LIMIT @Limit OFFSET @Offset
            """,
            parameters);

        var users = rows.Select(r => r.ToDto()).ToList();
        return (users, total);
    }

    public async Task<UserWithPermissionsDto> GetByIdAsync(Guid id)
    {
        await using var conn = _db.CreateConnection();
        await conn.OpenAsync();

        var user = await conn.QuerySingleOrDefaultAsync<UserEntity>(
            """
            SELECT id, email, first_name, last_name, role, mfa_enabled, is_active,
                   password_changed_at, created_at, updated_at
            FROM users WHERE id = @Id
            """,
            new { Id = id });

        if (user == null)
            throw new AppException("User not found", 404, "NOT_FOUND");

        var permissions = await GetPnlPermissionsInternalAsync(conn, id);

        var dto = user.ToDto();
        return new UserWithPermissionsDto
        {
            Id = dto.Id,
            Email = dto.Email,
            FirstName = dto.FirstName,
            LastName = dto.LastName,
            Role = dto.Role,
            MfaEnabled = dto.MfaEnabled,
            IsActive = dto.IsActive,
            PasswordChangedAt = dto.PasswordChangedAt,
            CreatedAt = dto.CreatedAt,
            UpdatedAt = dto.UpdatedAt,
            PnlPermissions = permissions,
        };
    }

    public async Task<UserDto> UpdateRoleAsync(Guid id, string role, Guid adminUserId)
    {
        await using var conn = _db.CreateConnection();
        await conn.OpenAsync();

        var user = await conn.QuerySingleOrDefaultAsync<UserEntity>(
            "SELECT * FROM users WHERE id = @Id",
            new { Id = id });

        if (user == null)
            throw new AppException("User not found", 404, "NOT_FOUND");

        if (user.Role == role)
            return user.ToDto();

        // Prevent demoting the last admin
        if (user.Role == "admin" && role != "admin")
        {
            var adminCount = await conn.ExecuteScalarAsync<int>(
                "SELECT COUNT(*) FROM users WHERE role = 'admin' AND is_active = true");
            if (adminCount <= 1)
                throw new AppException("Cannot demote the last admin user", 400, "BAD_REQUEST");
        }

        var updated = await conn.QuerySingleAsync<UserEntity>(
            """
            UPDATE users
            SET role = @Role, updated_at = NOW()
            WHERE id = @Id
            RETURNING id, email, first_name, last_name, role, mfa_enabled, is_active,
                      password_changed_at, created_at, updated_at
            """,
            new { Role = role, Id = id });

        return updated.ToDto();
    }

    public async Task<UserDto> ToggleActiveAsync(Guid id, bool isActive, Guid adminUserId)
    {
        await using var conn = _db.CreateConnection();
        await conn.OpenAsync();

        var user = await conn.QuerySingleOrDefaultAsync<UserEntity>(
            "SELECT * FROM users WHERE id = @Id",
            new { Id = id });

        if (user == null)
            throw new AppException("User not found", 404, "NOT_FOUND");

        if (id == adminUserId)
            throw new AppException("Cannot modify your own active status", 400, "BAD_REQUEST");

        // Prevent deactivating the last admin
        if (!isActive && user.Role == "admin")
        {
            var adminCount = await conn.ExecuteScalarAsync<int>(
                "SELECT COUNT(*) FROM users WHERE role = 'admin' AND is_active = true");
            if (adminCount <= 1)
                throw new AppException("Cannot deactivate the last admin user", 400, "BAD_REQUEST");
        }

        var updated = await conn.QuerySingleAsync<UserEntity>(
            """
            UPDATE users
            SET is_active = @IsActive, updated_at = NOW()
            WHERE id = @Id
            RETURNING id, email, first_name, last_name, role, mfa_enabled, is_active,
                      password_changed_at, created_at, updated_at
            """,
            new { IsActive = isActive, Id = id });

        return updated.ToDto();
    }

    public async Task DeleteAsync(Guid id, Guid adminUserId)
    {
        await using var conn = _db.CreateConnection();
        await conn.OpenAsync();

        var user = await conn.QuerySingleOrDefaultAsync<UserEntity>(
            "SELECT * FROM users WHERE id = @Id",
            new { Id = id });

        if (user == null)
            throw new AppException("User not found", 404, "NOT_FOUND");

        if (id == adminUserId)
            throw new AppException("Cannot delete your own account", 400, "BAD_REQUEST");

        // Prevent deleting the last admin
        if (user.Role == "admin")
        {
            var adminCount = await conn.ExecuteScalarAsync<int>(
                "SELECT COUNT(*) FROM users WHERE role = 'admin' AND is_active = true");
            if (adminCount <= 1)
                throw new AppException("Cannot delete the last admin user", 400, "BAD_REQUEST");
        }

        // Delete related data first (foreign key constraints)
        await conn.ExecuteAsync("DELETE FROM user_pnl_permissions WHERE user_id = @Id", new { Id = id });
        await conn.ExecuteAsync("DELETE FROM sessions WHERE user_id = @Id", new { Id = id });
        await conn.ExecuteAsync("DELETE FROM audit_logs WHERE user_id = @Id", new { Id = id });

        // Delete the user
        await conn.ExecuteAsync("DELETE FROM users WHERE id = @Id", new { Id = id });
    }

    public async Task<List<PnlPermissionDto>> GetPnlPermissionsAsync(Guid userId)
    {
        await using var conn = _db.CreateConnection();
        await conn.OpenAsync();

        // Verify user exists
        var exists = await conn.ExecuteScalarAsync<bool>(
            "SELECT EXISTS(SELECT 1 FROM users WHERE id = @Id)",
            new { Id = userId });

        if (!exists)
            throw new AppException("User not found", 404, "NOT_FOUND");

        return await GetPnlPermissionsInternalAsync(conn, userId);
    }

    public async Task<List<PnlPermissionDto>> SetPnlPermissionsAsync(
        Guid userId, List<PnlPermissionInput> permissions, Guid adminUserId)
    {
        await using var conn = _db.CreateConnection();
        await conn.OpenAsync();

        // Verify user exists
        var exists = await conn.ExecuteScalarAsync<bool>(
            "SELECT EXISTS(SELECT 1 FROM users WHERE id = @Id)",
            new { Id = userId });

        if (!exists)
            throw new AppException("User not found", 404, "NOT_FOUND");

        await using var tx = await conn.BeginTransactionAsync();

        try
        {
            // Delete existing permissions
            await conn.ExecuteAsync(
                "DELETE FROM user_pnl_permissions WHERE user_id = @UserId",
                new { UserId = userId },
                transaction: tx);

            // Insert new permissions
            foreach (var perm in permissions)
            {
                await conn.ExecuteAsync(
                    """
                    INSERT INTO user_pnl_permissions (user_id, pnl_center_id, permission_level)
                    VALUES (@UserId, @PnlCenterId, @PermissionLevel)
                    """,
                    new
                    {
                        UserId = userId,
                        PnlCenterId = Guid.Parse(perm.PnlCenterId),
                        PermissionLevel = perm.PermissionLevel,
                    },
                    transaction: tx);
            }

            await tx.CommitAsync();
        }
        catch
        {
            await tx.RollbackAsync();
            throw;
        }

        return await GetPnlPermissionsInternalAsync(conn, userId);
    }

    public async Task<UserDto> InviteUserAsync(string email, string firstName, string lastName, string role, Guid adminUserId)
    {
        await using var conn = _db.CreateConnection();
        await conn.OpenAsync();

        // Check if email already exists
        var exists = await conn.ExecuteScalarAsync<bool>(
            "SELECT EXISTS(SELECT 1 FROM users WHERE email = @Email)",
            new { Email = email });

        if (exists)
            throw new AppException("Email already registered", 409, "EMAIL_EXISTS");

        // Create user with a temporary password
        var tempPassword = GenerateTempPassword();
        var passwordHash = BCrypt.Net.BCrypt.HashPassword(tempPassword);

        var user = await conn.QuerySingleAsync<UserEntity>(
            """
            INSERT INTO users (email, password_hash, first_name, last_name, role)
            VALUES (@Email, @PasswordHash, @FirstName, @LastName, @Role)
            RETURNING id, email, first_name, last_name, role, mfa_enabled, is_active,
                      password_changed_at, created_at, updated_at
            """,
            new
            {
                Email = email,
                PasswordHash = passwordHash,
                FirstName = firstName,
                LastName = lastName,
                Role = role,
            });

        _logger.LogInformation("User invited: {Email} with role {Role} by admin {AdminId}", email, role, adminUserId);

        return user.ToDto();
    }

    // =============================================
    // Private helpers
    // =============================================

    private static async Task<List<PnlPermissionDto>> GetPnlPermissionsInternalAsync(
        Npgsql.NpgsqlConnection conn, Guid userId)
    {
        var rows = await conn.QueryAsync<PnlPermissionRow>(
            """
            SELECT upp.pnl_center_id, pc.name as pnl_center_name, upp.permission_level
            FROM user_pnl_permissions upp
            JOIN pnl_centers pc ON upp.pnl_center_id = pc.id
            WHERE upp.user_id = @UserId AND pc.is_active = true
            """,
            new { UserId = userId });

        return rows.Select(r => new PnlPermissionDto
        {
            PnlCenterId = r.Pnl_Center_Id.ToString(),
            PnlCenterName = r.Pnl_Center_Name,
            PermissionLevel = r.Permission_Level,
        }).ToList();
    }

    private static string GenerateTempPassword()
    {
        const string chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789!@#$%";
        var random = new Random();
        return new string(Enumerable.Range(0, 16).Select(_ => chars[random.Next(chars.Length)]).ToArray());
    }
}
