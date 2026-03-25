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

        var rows = await conn.QueryAsync<AuditLogRow>(
            $"""
            SELECT al.id, al.user_id, u.email AS user_email, u.first_name, u.last_name,
                   al.action, al.entity_type, al.entity_id,
                   al.old_values::text AS old_values, al.new_values::text AS new_values,
                   al.ip_address::text AS ip_address, al.user_agent, al.created_at,
                   t.first_name AS target_first_name, t.last_name AS target_last_name, t.email AS target_email
            FROM audit_logs al
            LEFT JOIN users u ON al.user_id = u.id
            LEFT JOIN users t ON al.entity_type = 'user' AND al.entity_id = t.id
            {where}
            ORDER BY al.created_at DESC
            OFFSET @Offset LIMIT @Limit
            """, p);

        var logs = rows.Select(r => new AuditLogDto
        {
            Id = r.Id.ToString(),
            UserId = r.User_Id?.ToString(),
            UserEmail = r.User_Email,
            FirstName = r.First_Name,
            LastName = r.Last_Name,
            Action = r.Action,
            EntityType = r.Entity_Type,
            EntityId = r.Entity_Id?.ToString(),
            OldValues = ParseJsonOrNull(r.Old_Values),
            NewValues = ParseJsonOrNull(r.New_Values),
            IpAddress = r.Ip_Address,
            UserAgent = r.User_Agent,
            CreatedAt = r.Created_At,
            TargetFirstName = r.Target_First_Name,
            TargetLastName = r.Target_Last_Name,
            TargetEmail = r.Target_Email,
        }).ToList();

        return (logs, total);
    }

    private static object? ParseJsonOrNull(string? json)
    {
        if (string.IsNullOrWhiteSpace(json)) return null;
        try
        {
            return System.Text.Json.JsonSerializer.Deserialize<object>(json);
        }
        catch
        {
            return json;
        }
    }
}

internal class AuditLogRow
{
    public Guid Id { get; set; }
    public Guid? User_Id { get; set; }
    public string? User_Email { get; set; }
    public string? First_Name { get; set; }
    public string? Last_Name { get; set; }
    public string Action { get; set; } = string.Empty;
    public string Entity_Type { get; set; } = string.Empty;
    public Guid? Entity_Id { get; set; }
    public string? Old_Values { get; set; }
    public string? New_Values { get; set; }
    public string? Ip_Address { get; set; }
    public string? User_Agent { get; set; }
    public DateTime Created_At { get; set; }
    public string? Target_First_Name { get; set; }
    public string? Target_Last_Name { get; set; }
    public string? Target_Email { get; set; }
}

public class AuditLogDto
{
    [JsonPropertyName("id")] public string Id { get; set; } = string.Empty;
    [JsonPropertyName("userId")] public string? UserId { get; set; }
    [JsonPropertyName("userEmail")] public string? UserEmail { get; set; }
    [JsonPropertyName("userFirstName")] public string? FirstName { get; set; }
    [JsonPropertyName("userLastName")] public string? LastName { get; set; }
    [JsonPropertyName("action")] public string Action { get; set; } = string.Empty;
    [JsonPropertyName("entityType")] public string EntityType { get; set; } = string.Empty;
    [JsonPropertyName("entityId")] public string? EntityId { get; set; }
    [JsonPropertyName("oldValues")] public object? OldValues { get; set; }
    [JsonPropertyName("newValues")] public object? NewValues { get; set; }
    [JsonPropertyName("ipAddress")] public string? IpAddress { get; set; }
    [JsonPropertyName("userAgent")] public string? UserAgent { get; set; }
    [JsonPropertyName("createdAt")] public DateTime CreatedAt { get; set; }
    [JsonPropertyName("targetFirstName")] public string? TargetFirstName { get; set; }
    [JsonPropertyName("targetLastName")] public string? TargetLastName { get; set; }
    [JsonPropertyName("targetEmail")] public string? TargetEmail { get; set; }
}
