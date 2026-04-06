using System.Text.Json.Serialization;
using Dapper;
using FinanceManagement.Api.Database;
using FinanceManagement.Api.Middleware;

namespace FinanceManagement.Api.Services.PnlCenters;

// =============================================
// DTOs
// =============================================

public class PnlCenterDto
{
    [JsonPropertyName("id")]
    public string Id { get; set; } = string.Empty;

    [JsonPropertyName("name")]
    public string Name { get; set; } = string.Empty;

    [JsonPropertyName("description")]
    [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
    public string? Description { get; set; }

    [JsonPropertyName("isActive")]
    public bool IsActive { get; set; }

    [JsonPropertyName("createdBy")]
    [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
    public string? CreatedBy { get; set; }

    [JsonPropertyName("createdAt")]
    public DateTime CreatedAt { get; set; }

    [JsonPropertyName("updatedAt")]
    public DateTime UpdatedAt { get; set; }
}

public class PnlCenterWithStatsDto : PnlCenterDto
{
    [JsonPropertyName("totalIncome")]
    public decimal TotalIncome { get; set; }

    [JsonPropertyName("totalExpenses")]
    public decimal TotalExpenses { get; set; }

    [JsonPropertyName("netProfit")]
    public decimal NetProfit { get; set; }
}

public class PnlDistributionDefaultDto
{
    [JsonPropertyName("pnlCenterId")]
    public string PnlCenterId { get; set; } = string.Empty;

    [JsonPropertyName("pnlCenterName")]
    public string PnlCenterName { get; set; } = string.Empty;

    [JsonPropertyName("percentage")]
    public decimal Percentage { get; set; }
}

// =============================================
// Request models
// =============================================

public class CreatePnlCenterRequest
{
    [JsonPropertyName("name")]
    public string Name { get; set; } = string.Empty;

    [JsonPropertyName("description")]
    public string? Description { get; set; }
}

public class UpdatePnlCenterRequest
{
    [JsonPropertyName("name")]
    public string? Name { get; set; }

    [JsonPropertyName("description")]
    public string? Description { get; set; }

    [JsonPropertyName("isActive")]
    public bool? IsActive { get; set; }
}

public class SetDistributionDefaultsRequest
{
    [JsonPropertyName("allocations")]
    public List<DistributionAllocationInput> Allocations { get; set; } = [];
}

public class DistributionAllocationInput
{
    [JsonPropertyName("pnlCenterId")]
    public string PnlCenterId { get; set; } = string.Empty;

    [JsonPropertyName("percentage")]
    public decimal Percentage { get; set; }
}

// =============================================
// Database row types
// =============================================

public class PnlCenterRow
{
    public Guid Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string? Description { get; set; }
    public bool Is_Active { get; set; }
    public Guid? Created_By { get; set; }
    public DateTime Created_At { get; set; }
    public DateTime Updated_At { get; set; }
    public decimal Total_Income { get; set; }
    public decimal Total_Expenses { get; set; }
    public decimal Net_Profit { get; set; }
}

public class DistributionDefaultRow
{
    public Guid Id { get; set; }
    public Guid Pnl_Center_Id { get; set; }
    public string Pnl_Center_Name { get; set; } = string.Empty;
    public decimal Percentage { get; set; }
    public Guid? Created_By { get; set; }
    public DateTime Created_At { get; set; }
    public DateTime Updated_At { get; set; }
}

// =============================================
// Service
// =============================================

public class PnlCentersService
{
    private readonly DbContext _db;
    private readonly ILogger<PnlCentersService> _logger;

    public PnlCentersService(DbContext db, ILogger<PnlCentersService> logger)
    {
        _db = db;
        _logger = logger;
    }

    public async Task<List<PnlCenterWithStatsDto>> GetAllAsync(bool includeInactive = false, DateTime? startDate = null, DateTime? endDate = null)
    {
        await using var conn = _db.CreateConnection();
        await conn.OpenAsync();

        var whereClause = includeInactive ? "" : "WHERE pc.is_active = true";
        var incomeDateFilter = "";
        var expenseDateFilter = "";
        if (startDate.HasValue) { incomeDateFilter += " AND i.income_date >= @StartDate"; expenseDateFilter += " AND e.expense_date >= @StartDate"; }
        if (endDate.HasValue) { incomeDateFilter += " AND i.income_date <= @EndDate"; expenseDateFilter += " AND e.expense_date <= @EndDate"; }

        var rows = await conn.QueryAsync<PnlCenterRow>(
            $"""
            SELECT
                pc.*,
                COALESCE(income_stats.total_income, 0) as total_income,
                COALESCE(expense_stats.total_expenses, 0) as total_expenses,
                COALESCE(income_stats.total_income, 0) - COALESCE(expense_stats.total_expenses, 0) as net_profit
            FROM pnl_centers pc
            LEFT JOIN (
                SELECT
                    ia.pnl_center_id,
                    SUM(ia.allocated_amount) as total_income
                FROM income_allocations ia
                JOIN income i ON i.id = ia.income_id
                WHERE 1=1{incomeDateFilter}
                GROUP BY ia.pnl_center_id
            ) income_stats ON income_stats.pnl_center_id = pc.id
            LEFT JOIN (
                SELECT
                    ea.pnl_center_id,
                    SUM(ea.allocated_amount) as total_expenses
                FROM expense_allocations ea
                JOIN expenses e ON e.id = ea.expense_id
                WHERE 1=1{expenseDateFilter}
                GROUP BY ea.pnl_center_id
            ) expense_stats ON expense_stats.pnl_center_id = pc.id
            {whereClause}
            ORDER BY pc.name ASC
            """,
            new { StartDate = startDate, EndDate = endDate });

        return rows.Select(MapToStatsDto).ToList();
    }

    public async Task<PnlCenterWithStatsDto> GetByIdAsync(Guid id)
    {
        await using var conn = _db.CreateConnection();
        await conn.OpenAsync();

        var row = await conn.QuerySingleOrDefaultAsync<PnlCenterRow>(
            """
            SELECT
                pc.*,
                COALESCE(income_stats.total_income, 0) as total_income,
                COALESCE(expense_stats.total_expenses, 0) as total_expenses,
                COALESCE(income_stats.total_income, 0) - COALESCE(expense_stats.total_expenses, 0) as net_profit
            FROM pnl_centers pc
            LEFT JOIN (
                SELECT
                    ia.pnl_center_id,
                    SUM(ia.allocated_amount) as total_income
                FROM income_allocations ia
                JOIN income i ON i.id = ia.income_id
                GROUP BY ia.pnl_center_id
            ) income_stats ON income_stats.pnl_center_id = pc.id
            LEFT JOIN (
                SELECT
                    ea.pnl_center_id,
                    SUM(ea.allocated_amount) as total_expenses
                FROM expense_allocations ea
                JOIN expenses e ON e.id = ea.expense_id
                GROUP BY ea.pnl_center_id
            ) expense_stats ON expense_stats.pnl_center_id = pc.id
            WHERE pc.id = @Id
            """,
            new { Id = id });

        if (row == null)
            throw new AppException("P&L Center not found", 404, "NOT_FOUND");

        return MapToStatsDto(row);
    }

    public async Task<PnlCenterDto> CreateAsync(string name, string? description, Guid userId)
    {
        await using var conn = _db.CreateConnection();
        await conn.OpenAsync();

        var row = await conn.QuerySingleAsync<PnlCenterRow>(
            """
            INSERT INTO pnl_centers (name, description, created_by)
            VALUES (@Name, @Description, @CreatedBy)
            RETURNING *, 0 as total_income, 0 as total_expenses, 0 as net_profit
            """,
            new { Name = name, Description = description, CreatedBy = userId });

        await conn.ExecuteAsync(
            "INSERT INTO audit_logs (user_id, action, entity_type, entity_id) VALUES (@UserId, @Action, @EntityType, @EntityId)",
            new { UserId = userId, Action = "create", EntityType = "pnl_center", EntityId = row.Id });

        return MapToDto(row);
    }

    public async Task<PnlCenterDto> UpdateAsync(Guid id, string? name, string? description, bool? isActive, Guid userId)
    {
        await using var conn = _db.CreateConnection();
        await conn.OpenAsync();

        // Build dynamic update
        var setClauses = new List<string>();
        var parameters = new DynamicParameters();
        parameters.Add("Id", id);

        if (name != null)
        {
            setClauses.Add("name = @Name");
            parameters.Add("Name", name);
        }
        if (description != null)
        {
            setClauses.Add("description = @Description");
            parameters.Add("Description", description);
        }
        if (isActive.HasValue)
        {
            setClauses.Add("is_active = @IsActive");
            parameters.Add("IsActive", isActive.Value);
        }

        if (setClauses.Count == 0)
        {
            return (await GetByIdAsync(id));
        }

        setClauses.Add("updated_at = NOW()");

        var row = await conn.QuerySingleOrDefaultAsync<PnlCenterRow>(
            $"""
            UPDATE pnl_centers
            SET {string.Join(", ", setClauses)}
            WHERE id = @Id
            RETURNING *, 0 as total_income, 0 as total_expenses, 0 as net_profit
            """,
            parameters);

        if (row == null)
            throw new AppException("P&L Center not found", 404, "NOT_FOUND");

        await conn.ExecuteAsync(
            "INSERT INTO audit_logs (user_id, action, entity_type, entity_id) VALUES (@UserId, @Action, @EntityType, @EntityId)",
            new { UserId = userId, Action = "update", EntityType = "pnl_center", EntityId = id });

        return MapToDto(row);
    }

    public async Task DeleteAsync(Guid id, Guid userId)
    {
        await using var conn = _db.CreateConnection();
        await conn.OpenAsync();

        var affected = await conn.ExecuteAsync(
            """
            UPDATE pnl_centers
            SET is_active = false, updated_at = NOW()
            WHERE id = @Id AND is_active = true
            """,
            new { Id = id });

        if (affected == 0)
            throw new AppException("P&L Center not found", 404, "NOT_FOUND");

        await conn.ExecuteAsync(
            "INSERT INTO audit_logs (user_id, action, entity_type, entity_id) VALUES (@UserId, @Action, @EntityType, @EntityId)",
            new { UserId = userId, Action = "delete", EntityType = "pnl_center", EntityId = id });
    }

    // =============================================
    // Distribution Defaults
    // =============================================

    public async Task<List<PnlDistributionDefaultDto>> GetDistributionDefaultsAsync()
    {
        await using var conn = _db.CreateConnection();
        await conn.OpenAsync();

        var rows = await conn.QueryAsync<DistributionDefaultRow>(
            """
            SELECT
                pdd.*,
                pc.name as pnl_center_name
            FROM pnl_distribution_defaults pdd
            JOIN pnl_centers pc ON pc.id = pdd.pnl_center_id
            WHERE pc.is_active = true
            ORDER BY pdd.percentage DESC
            """);

        return rows.Select(r => new PnlDistributionDefaultDto
        {
            PnlCenterId = r.Pnl_Center_Id.ToString(),
            PnlCenterName = r.Pnl_Center_Name,
            Percentage = r.Percentage,
        }).ToList();
    }

    public async Task<List<PnlDistributionDefaultDto>> SetDistributionDefaultsAsync(
        List<DistributionAllocationInput> allocations, Guid userId)
    {
        await using var conn = _db.CreateConnection();
        await conn.OpenAsync();
        await using var tx = await conn.BeginTransactionAsync();

        try
        {
            // Delete existing defaults
            await conn.ExecuteAsync("DELETE FROM pnl_distribution_defaults", transaction: tx);

            // Insert new defaults
            if (allocations.Count > 0)
            {
                foreach (var alloc in allocations)
                {
                    await conn.ExecuteAsync(
                        """
                        INSERT INTO pnl_distribution_defaults (pnl_center_id, percentage, created_by)
                        VALUES (@PnlCenterId, @Percentage, @CreatedBy)
                        """,
                        new
                        {
                            PnlCenterId = Guid.Parse(alloc.PnlCenterId),
                            alloc.Percentage,
                            CreatedBy = userId,
                        },
                        transaction: tx);
                }
            }

            await tx.CommitAsync();
        }
        catch
        {
            await tx.RollbackAsync();
            throw;
        }

        return await GetDistributionDefaultsAsync();
    }

    // =============================================
    // Mapping helpers
    // =============================================

    private static PnlCenterDto MapToDto(PnlCenterRow row) => new()
    {
        Id = row.Id.ToString(),
        Name = row.Name,
        Description = row.Description,
        IsActive = row.Is_Active,
        CreatedBy = row.Created_By?.ToString(),
        CreatedAt = row.Created_At,
        UpdatedAt = row.Updated_At,
    };

    private static PnlCenterWithStatsDto MapToStatsDto(PnlCenterRow row) => new()
    {
        Id = row.Id.ToString(),
        Name = row.Name,
        Description = row.Description,
        IsActive = row.Is_Active,
        CreatedBy = row.Created_By?.ToString(),
        CreatedAt = row.Created_At,
        UpdatedAt = row.Updated_At,
        TotalIncome = row.Total_Income,
        TotalExpenses = row.Total_Expenses,
        NetProfit = row.Net_Profit,
    };
}
