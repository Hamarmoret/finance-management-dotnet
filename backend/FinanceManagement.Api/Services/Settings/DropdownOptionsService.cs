using System.Text.Json.Serialization;
using Dapper;
using FinanceManagement.Api.Database;
using FinanceManagement.Api.Middleware;

namespace FinanceManagement.Api.Services.Settings;

// =============================================
// DTOs
// =============================================

public class DropdownOptionDto
{
    [JsonPropertyName("id")]
    public Guid Id { get; set; }

    [JsonPropertyName("category")]
    public string Category { get; set; } = string.Empty;

    [JsonPropertyName("value")]
    public string Value { get; set; } = string.Empty;

    [JsonPropertyName("label")]
    public string Label { get; set; } = string.Empty;

    [JsonPropertyName("sortOrder")]
    public int SortOrder { get; set; }

    [JsonPropertyName("isActive")]
    public bool IsActive { get; set; } = true;
}

public class CreateDropdownOptionRequest
{
    [JsonPropertyName("category")]
    public string Category { get; set; } = string.Empty;

    [JsonPropertyName("value")]
    public string Value { get; set; } = string.Empty;

    [JsonPropertyName("label")]
    public string Label { get; set; } = string.Empty;

    [JsonPropertyName("sortOrder")]
    public int SortOrder { get; set; }
}

public class UpdateDropdownOptionRequest
{
    [JsonPropertyName("label")]
    public string? Label { get; set; }

    [JsonPropertyName("value")]
    public string? Value { get; set; }

    [JsonPropertyName("sortOrder")]
    public int? SortOrder { get; set; }

    [JsonPropertyName("isActive")]
    public bool? IsActive { get; set; }
}

// =============================================
// DB Row
// =============================================

public class DbDropdownOptionRow
{
    public Guid id { get; set; }
    public string category { get; set; } = string.Empty;
    public string value { get; set; } = string.Empty;
    public string label { get; set; } = string.Empty;
    public int sort_order { get; set; }
    public bool is_active { get; set; }
    public DateTime created_at { get; set; }
    public DateTime updated_at { get; set; }
}

// =============================================
// Service
// =============================================

public class DropdownOptionsService
{
    private readonly DbContext _db;

    public DropdownOptionsService(DbContext db)
    {
        _db = db;
    }

    public async Task<List<DropdownOptionDto>> GetByCategoryAsync(string category)
    {
        await using var conn = _db.CreateConnection();
        await conn.OpenAsync();

        var rows = await conn.QueryAsync<DbDropdownOptionRow>(
            "SELECT * FROM dropdown_options WHERE category = @Category ORDER BY sort_order, label",
            new { Category = category });

        return rows.Select(MapOption).ToList();
    }

    public async Task<Dictionary<string, List<DropdownOptionDto>>> GetAllGroupedAsync()
    {
        await using var conn = _db.CreateConnection();
        await conn.OpenAsync();

        var rows = await conn.QueryAsync<DbDropdownOptionRow>(
            "SELECT * FROM dropdown_options ORDER BY category, sort_order, label");

        return rows.GroupBy(r => r.category)
            .ToDictionary(g => g.Key, g => g.Select(MapOption).ToList());
    }

    public async Task<DropdownOptionDto> CreateAsync(CreateDropdownOptionRequest request)
    {
        if (string.IsNullOrWhiteSpace(request.Category))
            throw new AppException("Category is required", 400, "VALIDATION");
        if (string.IsNullOrWhiteSpace(request.Value))
            throw new AppException("Value is required", 400, "VALIDATION");
        if (string.IsNullOrWhiteSpace(request.Label))
            throw new AppException("Label is required", 400, "VALIDATION");

        await using var conn = _db.CreateConnection();
        await conn.OpenAsync();

        var row = await conn.QuerySingleAsync<DbDropdownOptionRow>(
            """
            INSERT INTO dropdown_options (category, value, label, sort_order)
            VALUES (@Category, @Value, @Label, @SortOrder)
            RETURNING *
            """,
            new
            {
                request.Category,
                Value = request.Value.Trim().ToLowerInvariant().Replace(" ", "_"),
                Label = request.Label.Trim(),
                request.SortOrder,
            });

        return MapOption(row);
    }

    public async Task<DropdownOptionDto> UpdateAsync(Guid id, UpdateDropdownOptionRequest request)
    {
        await using var conn = _db.CreateConnection();
        await conn.OpenAsync();

        var existing = await conn.QuerySingleOrDefaultAsync<DbDropdownOptionRow>(
            "SELECT * FROM dropdown_options WHERE id = @Id", new { Id = id });

        if (existing == null)
            throw new AppException("Dropdown option not found", 404, "NOT_FOUND");

        var row = await conn.QuerySingleAsync<DbDropdownOptionRow>(
            """
            UPDATE dropdown_options SET
                label = COALESCE(@Label, label),
                value = COALESCE(@Value, value),
                sort_order = COALESCE(@SortOrder, sort_order),
                is_active = COALESCE(@IsActive, is_active),
                updated_at = NOW()
            WHERE id = @Id
            RETURNING *
            """,
            new
            {
                Id = id,
                Label = request.Label?.Trim(),
                Value = request.Value?.Trim().ToLowerInvariant().Replace(" ", "_"),
                request.SortOrder,
                request.IsActive,
            });

        return MapOption(row);
    }

    public async Task DeleteAsync(Guid id)
    {
        await using var conn = _db.CreateConnection();
        await conn.OpenAsync();

        var affected = await conn.ExecuteAsync(
            "DELETE FROM dropdown_options WHERE id = @Id", new { Id = id });

        if (affected == 0)
            throw new AppException("Dropdown option not found", 404, "NOT_FOUND");
    }

    private static DropdownOptionDto MapOption(DbDropdownOptionRow r) => new()
    {
        Id = r.id,
        Category = r.category,
        Value = r.value,
        Label = r.label,
        SortOrder = r.sort_order,
        IsActive = r.is_active,
    };
}
