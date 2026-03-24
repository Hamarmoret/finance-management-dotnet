using System.Text.Json.Serialization;
using Dapper;
using FinanceManagement.Api.Database;
using FinanceManagement.Api.Models;

namespace FinanceManagement.Api.Services.AuditLogs;

public class AuditLogsService
{
    private readonly DbContext _db;

    public AuditLogsService(DbContext db) => _db = db;

    public async Task<(List<AuditLogDto> Logs, int Total)> GetAllAsync(
        int page, int limit, string? userId, string? action, string? entityType,
        string? dateFrom, string? dateTo)
    {
        await using var conn = _db.CreateConnection();
        await conn.OpenAsync();

        var conditions = new List<string>();
        var p = new DynamicParameters();

        if (!string.IsNullOrEmpty(userId)) { conditions.Add("al.user_id = @UserId::uuid"); p.Add("UserId", userId); }
        if (!string.IsNullOrEmpty(action)) { conditions.Add("al.action = @Action"); p.Add("Action", action); }
        if (!string.IsNullOrEmpty(entityType)) { conditions.Add("al.entity_type = @EntityType"); p.Add("EntityType", entityType); }
        if (!string.IsNullOrEmpty(dateFrom)) { conditions.Add("al.created_at >= @DateFrom::timestamptz"); p.Add("DateFrom", dateFrom); }
        if (!string.IsNullOrEmpty(dateTo)) { conditions.Add("al.created_at <= @DateTo::timestamptz"); p.Add("DateTo", dateTo); }

        var where = conditions.Count > 0 ? "WHERE " + string.Join(" AND ", conditions) : "";

        var total = await conn.ExecuteScalarAsync<int>($"SELECT COUNT(*) FROM audit_logs al {where}", p);

        p.Add("Offset", (page - 1) * limit);
        p.Add("Limit", limit);

        var logs = await conn.QueryAsync<AuditLogDto>(
            $"""
            SELECT al.id, al.user_id, u.email AS user_email, u.first_name, u.last_name,
                   al.action, al.entity_type, al.entity_id,
                   al.old_values::text, al.new_values::text,
                   al.ip_address::text, al.user_agent, al.created_at
            FROM audit_logs al
            LEFT JOIN users u ON al.user_id = u.id
            {where}
            ORDER BY al.created_at DESC
            OFFSET @Offset LIMIT @Limit
            """, p);

        return (logs.ToList(), total);
    }
}

public class AuditLogDto
{
    [JsonPropertyName("id")] public string Id { get; set; } = string.Empty;
    [JsonPropertyName("userId")] public string? UserId { get; set; }
    [JsonPropertyName("userEmail")] public string? UserEmail { get; set; }
    [JsonPropertyName("firstName")] public string? FirstName { get; set; }
    [JsonPropertyName("lastName")] public string? LastName { get; set; }
    [JsonPropertyName("action")] public string Action { get; set; } = string.Empty;
    [JsonPropertyName("entityType")] public string EntityType { get; set; } = string.Empty;
    [JsonPropertyName("entityId")] public string? EntityId { get; set; }
    [JsonPropertyName("oldValues")] public string? OldValues { get; set; }
    [JsonPropertyName("newValues")] public string? NewValues { get; set; }
    [JsonPropertyName("ipAddress")] public string? IpAddress { get; set; }
    [JsonPropertyName("userAgent")] public string? UserAgent { get; set; }
    [JsonPropertyName("createdAt")] public DateTime CreatedAt { get; set; }
}
