using System.Text;
using System.Text.Json;
using System.Text.Json.Serialization;
using Dapper;
using FinanceManagement.Api.Database;
using FinanceManagement.Api.Middleware;

namespace FinanceManagement.Api.Services.Income;

// =============================================
// DTOs
// =============================================

public class IncomeCategoryDto
{
    [JsonPropertyName("id")]
    public Guid Id { get; set; }

    [JsonPropertyName("name")]
    public string Name { get; set; } = string.Empty;

    [JsonPropertyName("type")]
    public string Type { get; set; } = string.Empty;

    [JsonPropertyName("isActive")]
    public bool IsActive { get; set; }
}

public class IncomeAllocationDto
{
    [JsonPropertyName("id")]
    public Guid Id { get; set; }

    [JsonPropertyName("pnlCenterId")]
    public Guid PnlCenterId { get; set; }

    [JsonPropertyName("pnlCenterName")]
    public string PnlCenterName { get; set; } = string.Empty;

    [JsonPropertyName("percentage")]
    public decimal Percentage { get; set; }

    [JsonPropertyName("allocatedAmount")]
    public decimal AllocatedAmount { get; set; }
}

public class IncomeDto
{
    [JsonPropertyName("id")]
    public Guid Id { get; set; }

    [JsonPropertyName("description")]
    public string Description { get; set; } = string.Empty;

    [JsonPropertyName("amount")]
    public decimal Amount { get; set; }

    [JsonPropertyName("currency")]
    public string Currency { get; set; } = "USD";

    [JsonPropertyName("categoryId")]
    public Guid? CategoryId { get; set; }

    [JsonPropertyName("category")]
    [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
    public IncomeCategoryDto? Category { get; set; }

    [JsonPropertyName("incomeDate")]
    public string IncomeDate { get; set; } = string.Empty;

    [JsonPropertyName("isRecurring")]
    public bool IsRecurring { get; set; }

    [JsonPropertyName("recurringPattern")]
    [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
    public object? RecurringPattern { get; set; }

    [JsonPropertyName("clientName")]
    public string? ClientName { get; set; }

    [JsonPropertyName("clientId")]
    public Guid? ClientId { get; set; }

    [JsonPropertyName("invoiceNumber")]
    public string? InvoiceNumber { get; set; }

    [JsonPropertyName("invoiceType")]
    public string? InvoiceType { get; set; }

    [JsonPropertyName("invoiceStatus")]
    public string? InvoiceStatus { get; set; }

    [JsonPropertyName("paymentDueDate")]
    public string? PaymentDueDate { get; set; }

    [JsonPropertyName("paymentReceivedDate")]
    public string? PaymentReceivedDate { get; set; }

    [JsonPropertyName("proformaInvoiceDate")]
    public string? ProformaInvoiceDate { get; set; }

    [JsonPropertyName("taxInvoiceDate")]
    public string? TaxInvoiceDate { get; set; }

    [JsonPropertyName("notes")]
    public string? Notes { get; set; }

    [JsonPropertyName("tags")]
    public string[] Tags { get; set; } = [];

    [JsonPropertyName("billableHoursRegular")]
    public decimal? BillableHoursRegular { get; set; }

    [JsonPropertyName("billableHours150")]
    public decimal? BillableHours150 { get; set; }

    [JsonPropertyName("billableHours200")]
    public decimal? BillableHours200 { get; set; }

    [JsonPropertyName("hourlyRateRegular")]
    public decimal? HourlyRateRegular { get; set; }

    [JsonPropertyName("hourlyRate150")]
    public decimal? HourlyRate150 { get; set; }

    [JsonPropertyName("hourlyRate200")]
    public decimal? HourlyRate200 { get; set; }

    [JsonPropertyName("vatApplicable")]
    public bool VatApplicable { get; set; }

    [JsonPropertyName("vatPercentage")]
    public decimal? VatPercentage { get; set; }

    [JsonPropertyName("paymentMethod")]
    public string? PaymentMethod { get; set; }

    [JsonPropertyName("allocations")]
    public List<IncomeAllocationDto> Allocations { get; set; } = [];

    [JsonPropertyName("createdBy")]
    public Guid? CreatedBy { get; set; }

    [JsonPropertyName("createdAt")]
    public DateTime CreatedAt { get; set; }

    [JsonPropertyName("updatedAt")]
    public DateTime UpdatedAt { get; set; }
}

public class CreateIncomeRequest
{
    [JsonPropertyName("description")]
    public string Description { get; set; } = string.Empty;

    [JsonPropertyName("amount")]
    public decimal Amount { get; set; }

    [JsonPropertyName("currency")]
    public string Currency { get; set; } = "USD";

    [JsonPropertyName("categoryId")]
    public Guid? CategoryId { get; set; }

    [JsonPropertyName("incomeDate")]
    public string IncomeDate { get; set; } = string.Empty;

    [JsonPropertyName("isRecurring")]
    public bool IsRecurring { get; set; }

    [JsonPropertyName("recurringPattern")]
    public object? RecurringPattern { get; set; }

    [JsonPropertyName("clientName")]
    public string? ClientName { get; set; }

    [JsonPropertyName("clientId")]
    public Guid? ClientId { get; set; }

    [JsonPropertyName("invoiceNumber")]
    public string? InvoiceNumber { get; set; }

    [JsonPropertyName("invoiceType")]
    public string? InvoiceType { get; set; }

    [JsonPropertyName("invoiceStatus")]
    public string? InvoiceStatus { get; set; }

    [JsonPropertyName("paymentDueDate")]
    public string? PaymentDueDate { get; set; }

    [JsonPropertyName("paymentReceivedDate")]
    public string? PaymentReceivedDate { get; set; }

    [JsonPropertyName("proformaInvoiceDate")]
    public string? ProformaInvoiceDate { get; set; }

    [JsonPropertyName("taxInvoiceDate")]
    public string? TaxInvoiceDate { get; set; }

    [JsonPropertyName("notes")]
    public string? Notes { get; set; }

    [JsonPropertyName("tags")]
    public string[]? Tags { get; set; }

    [JsonPropertyName("billableHoursRegular")]
    public decimal? BillableHoursRegular { get; set; }

    [JsonPropertyName("billableHours150")]
    public decimal? BillableHours150 { get; set; }

    [JsonPropertyName("billableHours200")]
    public decimal? BillableHours200 { get; set; }

    [JsonPropertyName("hourlyRateRegular")]
    public decimal? HourlyRateRegular { get; set; }

    [JsonPropertyName("hourlyRate150")]
    public decimal? HourlyRate150 { get; set; }

    [JsonPropertyName("hourlyRate200")]
    public decimal? HourlyRate200 { get; set; }

    [JsonPropertyName("vatApplicable")]
    public bool? VatApplicable { get; set; }

    [JsonPropertyName("vatPercentage")]
    public decimal? VatPercentage { get; set; }

    [JsonPropertyName("paymentMethod")]
    public string? PaymentMethod { get; set; }

    [JsonPropertyName("allocations")]
    public List<AllocationInput> Allocations { get; set; } = [];
}

public class UpdateIncomeRequest
{
    [JsonPropertyName("description")]
    public string? Description { get; set; }

    [JsonPropertyName("amount")]
    public decimal? Amount { get; set; }

    [JsonPropertyName("currency")]
    public string? Currency { get; set; }

    [JsonPropertyName("categoryId")]
    public Guid? CategoryId { get; set; }

    [JsonPropertyName("incomeDate")]
    public string? IncomeDate { get; set; }

    [JsonPropertyName("isRecurring")]
    public bool? IsRecurring { get; set; }

    [JsonPropertyName("recurringPattern")]
    public object? RecurringPattern { get; set; }

    [JsonPropertyName("clientName")]
    public string? ClientName { get; set; }

    [JsonPropertyName("clientId")]
    public Guid? ClientId { get; set; }

    [JsonPropertyName("invoiceNumber")]
    public string? InvoiceNumber { get; set; }

    [JsonPropertyName("invoiceType")]
    public string? InvoiceType { get; set; }

    [JsonPropertyName("invoiceStatus")]
    public string? InvoiceStatus { get; set; }

    [JsonPropertyName("paymentDueDate")]
    public string? PaymentDueDate { get; set; }

    [JsonPropertyName("paymentReceivedDate")]
    public string? PaymentReceivedDate { get; set; }

    [JsonPropertyName("proformaInvoiceDate")]
    public string? ProformaInvoiceDate { get; set; }

    [JsonPropertyName("taxInvoiceDate")]
    public string? TaxInvoiceDate { get; set; }

    [JsonPropertyName("notes")]
    public string? Notes { get; set; }

    [JsonPropertyName("tags")]
    public string[]? Tags { get; set; }

    [JsonPropertyName("billableHoursRegular")]
    public decimal? BillableHoursRegular { get; set; }

    [JsonPropertyName("billableHours150")]
    public decimal? BillableHours150 { get; set; }

    [JsonPropertyName("billableHours200")]
    public decimal? BillableHours200 { get; set; }

    [JsonPropertyName("hourlyRateRegular")]
    public decimal? HourlyRateRegular { get; set; }

    [JsonPropertyName("hourlyRate150")]
    public decimal? HourlyRate150 { get; set; }

    [JsonPropertyName("hourlyRate200")]
    public decimal? HourlyRate200 { get; set; }

    [JsonPropertyName("vatApplicable")]
    public bool? VatApplicable { get; set; }

    [JsonPropertyName("vatPercentage")]
    public decimal? VatPercentage { get; set; }

    [JsonPropertyName("paymentMethod")]
    public string? PaymentMethod { get; set; }

    [JsonPropertyName("allocations")]
    public List<AllocationInput>? Allocations { get; set; }
}

public class AllocationInput
{
    [JsonPropertyName("pnlCenterId")]
    public Guid PnlCenterId { get; set; }

    [JsonPropertyName("percentage")]
    public decimal Percentage { get; set; }
}

public class CreateCategoryRequest
{
    [JsonPropertyName("name")]
    public string Name { get; set; } = string.Empty;

    [JsonPropertyName("type")]
    public string Type { get; set; } = string.Empty;
}

public class UpdateCategoryRequest
{
    [JsonPropertyName("name")]
    public string? Name { get; set; }

    [JsonPropertyName("type")]
    public string? Type { get; set; }

    [JsonPropertyName("isActive")]
    public bool? IsActive { get; set; }
}

public class IncomeFilters
{
    public int Page { get; set; } = 1;
    public int Limit { get; set; } = 20;
    public string? DateFrom { get; set; }
    public string? DateTo { get; set; }
    public Guid? CategoryId { get; set; }
    public string? ClientName { get; set; }
    public string? InvoiceStatus { get; set; }
    public bool? IsRecurring { get; set; }
    public decimal? MinAmount { get; set; }
    public decimal? MaxAmount { get; set; }
    public string? Search { get; set; }
    public string? PnlCenterId { get; set; }
    public string SortBy { get; set; } = "income_date";
    public string SortOrder { get; set; } = "desc";
}

// =============================================
// Database row types
// =============================================

internal class DbIncomeRow
{
    public Guid id { get; set; }
    public string description { get; set; } = string.Empty;
    public decimal amount { get; set; }
    public string currency { get; set; } = "USD";
    public Guid? category_id { get; set; }
    public DateTime income_date { get; set; }
    public bool is_recurring { get; set; }
    public string? recurring_pattern { get; set; }
    public string? client_name { get; set; }
    public Guid? client_id { get; set; }
    public string? invoice_number { get; set; }
    public string? invoice_type { get; set; }
    public string? invoice_status { get; set; }
    public DateTime? payment_due_date { get; set; }
    public DateTime? payment_received_date { get; set; }
    public DateTime? proforma_invoice_date { get; set; }
    public DateTime? tax_invoice_date { get; set; }
    public string? notes { get; set; }
    public string[]? tags { get; set; }
    public decimal? billable_hours_regular { get; set; }
    public decimal? billable_hours_150 { get; set; }
    public decimal? billable_hours_200 { get; set; }
    public decimal? hourly_rate_regular { get; set; }
    public decimal? hourly_rate_150 { get; set; }
    public decimal? hourly_rate_200 { get; set; }
    public bool vat_applicable { get; set; }
    public decimal? vat_percentage { get; set; }
    public string? payment_method { get; set; }
    public Guid? created_by { get; set; }
    public DateTime created_at { get; set; }
    public DateTime updated_at { get; set; }
    // Joined category fields
    public string? category_name { get; set; }
    public string? category_type { get; set; }
    public bool? category_is_active { get; set; }
}

internal class DbAllocationRow
{
    public Guid id { get; set; }
    public Guid income_id { get; set; }
    public Guid pnl_center_id { get; set; }
    public string pnl_center_name { get; set; } = string.Empty;
    public decimal percentage { get; set; }
    public decimal allocated_amount { get; set; }
}

internal class DbCategoryRow
{
    public Guid id { get; set; }
    public string name { get; set; } = string.Empty;
    public string type { get; set; } = string.Empty;
    public bool is_active { get; set; }
}

// =============================================
// Service
// =============================================

public class IncomeService
{
    private readonly DbContext _db;
    private readonly ILogger<IncomeService> _logger;

    public IncomeService(DbContext db, ILogger<IncomeService> logger)
    {
        _db = db;
        _logger = logger;
    }

    // =============================================
    // Income CRUD
    // =============================================

    public async Task<(List<IncomeDto> Items, int Total)> GetAllAsync(IncomeFilters filters)
    {
        await using var conn = _db.CreateConnection();
        await conn.OpenAsync();

        var conditions = new List<string>();
        var parameters = new DynamicParameters();

        if (!string.IsNullOrEmpty(filters.DateFrom))
        {
            conditions.Add("i.income_date >= @DateFrom");
            parameters.Add("DateFrom", filters.DateFrom);
        }
        if (!string.IsNullOrEmpty(filters.DateTo))
        {
            conditions.Add("i.income_date <= @DateTo");
            parameters.Add("DateTo", filters.DateTo);
        }
        if (filters.CategoryId.HasValue)
        {
            conditions.Add("i.category_id = @CategoryId");
            parameters.Add("CategoryId", filters.CategoryId.Value);
        }
        if (!string.IsNullOrEmpty(filters.ClientName))
        {
            conditions.Add("i.client_name ILIKE @ClientName");
            parameters.Add("ClientName", $"%{filters.ClientName}%");
        }
        if (!string.IsNullOrEmpty(filters.InvoiceStatus))
        {
            conditions.Add("i.invoice_status = @InvoiceStatus");
            parameters.Add("InvoiceStatus", filters.InvoiceStatus);
        }
        if (filters.IsRecurring.HasValue)
        {
            conditions.Add("i.is_recurring = @IsRecurring");
            parameters.Add("IsRecurring", filters.IsRecurring.Value);
        }
        if (filters.MinAmount.HasValue)
        {
            conditions.Add("i.amount >= @MinAmount");
            parameters.Add("MinAmount", filters.MinAmount.Value);
        }
        if (filters.MaxAmount.HasValue)
        {
            conditions.Add("i.amount <= @MaxAmount");
            parameters.Add("MaxAmount", filters.MaxAmount.Value);
        }
        if (!string.IsNullOrEmpty(filters.Search))
        {
            conditions.Add("(i.description ILIKE @Search OR i.client_name ILIKE @Search OR i.invoice_number ILIKE @Search)");
            parameters.Add("Search", $"%{filters.Search}%");
        }
        if (!string.IsNullOrEmpty(filters.PnlCenterId))
        {
            conditions.Add("EXISTS (SELECT 1 FROM income_allocations ia WHERE ia.income_id = i.id AND ia.pnl_center_id = @PnlCenterId)");
            parameters.Add("PnlCenterId", Guid.Parse(filters.PnlCenterId));
        }

        var whereClause = conditions.Count > 0 ? "WHERE " + string.Join(" AND ", conditions) : "";

        // Validate sort column to prevent SQL injection
        var allowedSortColumns = new HashSet<string>(StringComparer.OrdinalIgnoreCase)
        {
            "income_date", "amount", "description", "created_at", "updated_at", "client_name"
        };
        var sortBy = allowedSortColumns.Contains(filters.SortBy) ? filters.SortBy : "income_date";
        var sortOrder = filters.SortOrder.Equals("asc", StringComparison.OrdinalIgnoreCase) ? "ASC" : "DESC";

        // Get total count
        var countSql = $"SELECT COUNT(*) FROM income i {whereClause}";
        var total = await conn.ExecuteScalarAsync<int>(countSql, parameters);

        // Get income with categories
        var offset = (filters.Page - 1) * filters.Limit;
        parameters.Add("Limit", filters.Limit);
        parameters.Add("Offset", offset);

        var incomeSql = $"""
            SELECT
                i.*,
                ic.name as category_name,
                ic.type as category_type,
                ic.is_active as category_is_active
            FROM income i
            LEFT JOIN income_categories ic ON ic.id = i.category_id
            {whereClause}
            ORDER BY i.{sortBy} {sortOrder}, i.created_at DESC
            LIMIT @Limit OFFSET @Offset
            """;

        var rows = (await conn.QueryAsync<DbIncomeRow>(incomeSql, parameters)).ToList();

        // Get allocations for all income records
        var allocationsMap = new Dictionary<Guid, List<IncomeAllocationDto>>();
        if (rows.Count > 0)
        {
            var incomeIds = rows.Select(r => r.id).ToArray();
            var allocSql = """
                SELECT
                    ia.id,
                    ia.income_id,
                    ia.pnl_center_id,
                    pc.name as pnl_center_name,
                    ia.percentage,
                    ia.allocated_amount
                FROM income_allocations ia
                JOIN pnl_centers pc ON pc.id = ia.pnl_center_id
                WHERE ia.income_id = ANY(@IncomeIds)
                """;

            var allocRows = await conn.QueryAsync<DbAllocationRow>(allocSql, new { IncomeIds = incomeIds });
            foreach (var ar in allocRows)
            {
                if (!allocationsMap.ContainsKey(ar.income_id))
                    allocationsMap[ar.income_id] = [];

                allocationsMap[ar.income_id].Add(MapAllocation(ar));
            }
        }

        var items = rows.Select(r => MapIncome(r, allocationsMap.GetValueOrDefault(r.id, []))).ToList();
        return (items, total);
    }

    public async Task<IncomeDto?> GetByIdAsync(Guid id)
    {
        await using var conn = _db.CreateConnection();
        await conn.OpenAsync();

        var sql = """
            SELECT
                i.*,
                ic.name as category_name,
                ic.type as category_type,
                ic.is_active as category_is_active
            FROM income i
            LEFT JOIN income_categories ic ON ic.id = i.category_id
            WHERE i.id = @Id
            """;

        var row = await conn.QuerySingleOrDefaultAsync<DbIncomeRow>(sql, new { Id = id });
        if (row == null) return null;

        var allocSql = """
            SELECT
                ia.id,
                ia.pnl_center_id,
                pc.name as pnl_center_name,
                ia.percentage,
                ia.allocated_amount
            FROM income_allocations ia
            JOIN pnl_centers pc ON pc.id = ia.pnl_center_id
            WHERE ia.income_id = @Id
            """;

        var allocRows = await conn.QueryAsync<DbAllocationRow>(allocSql, new { Id = id });
        return MapIncome(row, allocRows.Select(MapAllocation).ToList());
    }

    public async Task<IncomeDto> CreateAsync(CreateIncomeRequest request, Guid userId)
    {
        await using var conn = _db.CreateConnection();
        await conn.OpenAsync();
        await using var tx = await conn.BeginTransactionAsync();

        try
        {
            var resolvedClientId = await GetOrCreateClientIdAsync(conn, tx, request.ClientId, request.ClientName, userId);

            var recurringPatternJson = request.RecurringPattern != null
                ? JsonSerializer.Serialize(request.RecurringPattern)
                : null;

            var insertSql = """
                INSERT INTO income (
                    description, amount, currency, category_id, income_date,
                    is_recurring, recurring_pattern, client_name, client_id, invoice_number,
                    invoice_type, invoice_status, payment_due_date, payment_received_date,
                    proforma_invoice_date, tax_invoice_date, notes, tags,
                    billable_hours_regular, billable_hours_150, billable_hours_200,
                    hourly_rate_regular, hourly_rate_150, hourly_rate_200,
                    vat_applicable, vat_percentage, payment_method, created_by
                )
                VALUES (
                    @Description, @Amount, @Currency, @CategoryId, @IncomeDate::date,
                    @IsRecurring, @RecurringPattern::jsonb, @ClientName, @ClientId, @InvoiceNumber,
                    @InvoiceType, @InvoiceStatus, @PaymentDueDate::date, @PaymentReceivedDate::date,
                    @ProformaInvoiceDate::date, @TaxInvoiceDate::date, @Notes, @Tags,
                    @BillableHoursRegular, @BillableHours150, @BillableHours200,
                    @HourlyRateRegular, @HourlyRate150, @HourlyRate200,
                    @VatApplicable, @VatPercentage, @PaymentMethod, @CreatedBy
                )
                RETURNING *
                """;

            var income = await conn.QuerySingleAsync<DbIncomeRow>(insertSql, new
            {
                request.Description,
                request.Amount,
                request.Currency,
                CategoryId = request.CategoryId,
                IncomeDate = request.IncomeDate,
                request.IsRecurring,
                RecurringPattern = recurringPatternJson,
                request.ClientName,
                ClientId = resolvedClientId,
                request.InvoiceNumber,
                request.InvoiceType,
                request.InvoiceStatus,
                PaymentDueDate = request.PaymentDueDate,
                PaymentReceivedDate = request.PaymentReceivedDate,
                ProformaInvoiceDate = request.ProformaInvoiceDate,
                TaxInvoiceDate = request.TaxInvoiceDate,
                request.Notes,
                Tags = request.Tags ?? [],
                BillableHoursRegular = request.BillableHoursRegular,
                BillableHours150 = request.BillableHours150,
                BillableHours200 = request.BillableHours200,
                HourlyRateRegular = request.HourlyRateRegular,
                HourlyRate150 = request.HourlyRate150,
                HourlyRate200 = request.HourlyRate200,
                VatApplicable = request.VatApplicable ?? false,
                VatPercentage = request.VatPercentage,
                PaymentMethod = request.PaymentMethod,
                CreatedBy = userId,
            }, tx);

            // Insert allocations
            var allocations = new List<IncomeAllocationDto>();
            if (request.Allocations.Count > 0)
            {
                var sb = new StringBuilder();
                sb.Append("INSERT INTO income_allocations (income_id, pnl_center_id, percentage, allocated_amount) VALUES ");
                var allocParams = new DynamicParameters();
                allocParams.Add("IncomeId", income.id);

                for (var i = 0; i < request.Allocations.Count; i++)
                {
                    var alloc = request.Allocations[i];
                    var allocatedAmount = request.Amount * alloc.Percentage / 100m;
                    if (i > 0) sb.Append(", ");
                    sb.Append($"(@IncomeId, @PnlCenterId{i}, @Percentage{i}, @AllocatedAmount{i})");
                    allocParams.Add($"PnlCenterId{i}", alloc.PnlCenterId);
                    allocParams.Add($"Percentage{i}", alloc.Percentage);
                    allocParams.Add($"AllocatedAmount{i}", allocatedAmount);
                }

                await conn.ExecuteAsync(sb.ToString(), allocParams, tx);

                // Fetch allocations with P&L center names
                var allocSql = """
                    SELECT
                        ia.id,
                        ia.income_id,
                        ia.pnl_center_id,
                        pc.name as pnl_center_name,
                        ia.percentage,
                        ia.allocated_amount
                    FROM income_allocations ia
                    LEFT JOIN pnl_centers pc ON pc.id = ia.pnl_center_id
                    WHERE ia.income_id = @IncomeId
                    """;

                var allocRows = await conn.QueryAsync<DbAllocationRow>(allocSql, new { IncomeId = income.id }, tx);
                allocations = allocRows.Select(MapAllocation).ToList();
            }

            // Audit log
            await LogAuditAsync(conn, tx, userId, "create", "income", income.id);

            await tx.CommitAsync();

            _logger.LogInformation("Income {IncomeId} created by user {UserId}", income.id, userId);
            return MapIncome(income, allocations);
        }
        catch
        {
            await tx.RollbackAsync();
            throw;
        }
    }

    public async Task<IncomeDto> UpdateAsync(Guid id, UpdateIncomeRequest request, Guid userId)
    {
        await using var conn = _db.CreateConnection();
        await conn.OpenAsync();
        await using var tx = await conn.BeginTransactionAsync();

        try
        {
            // Build dynamic update
            var fields = new List<string>();
            var parameters = new DynamicParameters();
            parameters.Add("Id", id);

            if (request.Description != null)
            {
                fields.Add("description = @Description");
                parameters.Add("Description", request.Description);
            }
            if (request.Amount.HasValue)
            {
                fields.Add("amount = @Amount");
                parameters.Add("Amount", request.Amount.Value);
            }
            if (request.Currency != null)
            {
                fields.Add("currency = @Currency");
                parameters.Add("Currency", request.Currency);
            }
            if (request.CategoryId.HasValue)
            {
                fields.Add("category_id = @CategoryId");
                parameters.Add("CategoryId", request.CategoryId.Value);
            }
            if (request.IncomeDate != null)
            {
                fields.Add("income_date = @IncomeDate::date");
                parameters.Add("IncomeDate", request.IncomeDate);
            }
            if (request.IsRecurring.HasValue)
            {
                fields.Add("is_recurring = @IsRecurring");
                parameters.Add("IsRecurring", request.IsRecurring.Value);
            }
            if (request.RecurringPattern != null)
            {
                fields.Add("recurring_pattern = @RecurringPattern::jsonb");
                parameters.Add("RecurringPattern", JsonSerializer.Serialize(request.RecurringPattern));
            }
            if (request.ClientName != null)
            {
                fields.Add("client_name = @ClientName");
                parameters.Add("ClientName", request.ClientName);
            }
            if (request.InvoiceNumber != null)
            {
                fields.Add("invoice_number = @InvoiceNumber");
                parameters.Add("InvoiceNumber", request.InvoiceNumber);
            }
            if (request.InvoiceType != null)
            {
                fields.Add("invoice_type = @InvoiceType");
                parameters.Add("InvoiceType", request.InvoiceType);
            }
            if (request.InvoiceStatus != null)
            {
                fields.Add("invoice_status = @InvoiceStatus");
                parameters.Add("InvoiceStatus", request.InvoiceStatus);
            }
            if (request.PaymentDueDate != null)
            {
                fields.Add("payment_due_date = @PaymentDueDate::date");
                parameters.Add("PaymentDueDate", request.PaymentDueDate);
            }
            if (request.PaymentReceivedDate != null)
            {
                fields.Add("payment_received_date = @PaymentReceivedDate::date");
                parameters.Add("PaymentReceivedDate", request.PaymentReceivedDate);
            }
            if (request.ProformaInvoiceDate != null)
            {
                fields.Add("proforma_invoice_date = @ProformaInvoiceDate::date");
                parameters.Add("ProformaInvoiceDate", request.ProformaInvoiceDate);
            }
            if (request.TaxInvoiceDate != null)
            {
                fields.Add("tax_invoice_date = @TaxInvoiceDate::date");
                parameters.Add("TaxInvoiceDate", request.TaxInvoiceDate);
            }
            if (request.Notes != null)
            {
                fields.Add("notes = @Notes");
                parameters.Add("Notes", request.Notes);
            }
            if (request.Tags != null)
            {
                fields.Add("tags = @Tags");
                parameters.Add("Tags", request.Tags);
            }
            if (request.ClientId.HasValue)
            {
                fields.Add("client_id = @ClientId");
                parameters.Add("ClientId", request.ClientId.Value);
            }
            if (request.BillableHoursRegular.HasValue)
            {
                fields.Add("billable_hours_regular = @BillableHoursRegular");
                parameters.Add("BillableHoursRegular", request.BillableHoursRegular.Value);
            }
            if (request.BillableHours150.HasValue)
            {
                fields.Add("billable_hours_150 = @BillableHours150");
                parameters.Add("BillableHours150", request.BillableHours150.Value);
            }
            if (request.BillableHours200.HasValue)
            {
                fields.Add("billable_hours_200 = @BillableHours200");
                parameters.Add("BillableHours200", request.BillableHours200.Value);
            }
            if (request.HourlyRateRegular.HasValue)
            {
                fields.Add("hourly_rate_regular = @HourlyRateRegular");
                parameters.Add("HourlyRateRegular", request.HourlyRateRegular.Value);
            }
            if (request.HourlyRate150.HasValue)
            {
                fields.Add("hourly_rate_150 = @HourlyRate150");
                parameters.Add("HourlyRate150", request.HourlyRate150.Value);
            }
            if (request.HourlyRate200.HasValue)
            {
                fields.Add("hourly_rate_200 = @HourlyRate200");
                parameters.Add("HourlyRate200", request.HourlyRate200.Value);
            }
            if (request.VatApplicable.HasValue)
            {
                fields.Add("vat_applicable = @VatApplicable");
                parameters.Add("VatApplicable", request.VatApplicable.Value);
            }
            if (request.VatPercentage.HasValue)
            {
                fields.Add("vat_percentage = @VatPercentage");
                parameters.Add("VatPercentage", request.VatPercentage.Value);
            }
            if (request.PaymentMethod != null)
            {
                fields.Add("payment_method = @PaymentMethod");
                parameters.Add("PaymentMethod", request.PaymentMethod);
            }

            if (fields.Count > 0)
            {
                fields.Add("updated_at = NOW()");
                var updateSql = $"UPDATE income SET {string.Join(", ", fields)} WHERE id = @Id";
                var affected = await conn.ExecuteAsync(updateSql, parameters, tx);
                if (affected == 0)
                    throw new AppException("Income not found", 404, "NOT_FOUND");
            }

            // Update allocations if provided
            if (request.Allocations != null)
            {
                // Get current amount for recalculating allocations
                var currentAmount = await conn.ExecuteScalarAsync<decimal>(
                    "SELECT amount FROM income WHERE id = @Id", new { Id = id }, tx);

                // Delete old allocations
                await conn.ExecuteAsync(
                    "DELETE FROM income_allocations WHERE income_id = @Id", new { Id = id }, tx);

                // Create new allocations
                if (request.Allocations.Count > 0)
                {
                    var sb = new StringBuilder();
                    sb.Append("INSERT INTO income_allocations (income_id, pnl_center_id, percentage, allocated_amount) VALUES ");
                    var allocParams = new DynamicParameters();
                    allocParams.Add("IncomeId", id);

                    for (var i = 0; i < request.Allocations.Count; i++)
                    {
                        var alloc = request.Allocations[i];
                        var allocatedAmount = currentAmount * alloc.Percentage / 100m;
                        if (i > 0) sb.Append(", ");
                        sb.Append($"(@IncomeId, @PnlCenterId{i}, @Percentage{i}, @AllocatedAmount{i})");
                        allocParams.Add($"PnlCenterId{i}", alloc.PnlCenterId);
                        allocParams.Add($"Percentage{i}", alloc.Percentage);
                        allocParams.Add($"AllocatedAmount{i}", allocatedAmount);
                    }

                    await conn.ExecuteAsync(sb.ToString(), allocParams, tx);
                }
            }

            // Audit log
            await LogAuditAsync(conn, tx, userId, "update", "income", id);

            await tx.CommitAsync();

            _logger.LogInformation("Income {IncomeId} updated by user {UserId}", id, userId);

            // Return the full updated record
            var result = await GetByIdAsync(id);
            return result ?? throw new AppException("Income not found after update", 404, "NOT_FOUND");
        }
        catch (AppException)
        {
            await tx.RollbackAsync();
            throw;
        }
        catch
        {
            await tx.RollbackAsync();
            throw;
        }
    }

    public async Task DeleteAsync(Guid id, Guid userId)
    {
        await using var conn = _db.CreateConnection();
        await conn.OpenAsync();

        // Audit log before delete
        await LogAuditAsync(conn, null, userId, "delete", "income", id);

        var affected = await conn.ExecuteAsync("DELETE FROM income WHERE id = @Id", new { Id = id });
        if (affected == 0)
            throw new AppException("Income not found", 404, "NOT_FOUND");

        _logger.LogInformation("Income {IncomeId} deleted by user {UserId}", id, userId);
    }

    // =============================================
    // Categories
    // =============================================

    public async Task<List<IncomeCategoryDto>> GetCategoriesAsync()
    {
        await using var conn = _db.CreateConnection();
        await conn.OpenAsync();

        var rows = await conn.QueryAsync<DbCategoryRow>(
            "SELECT * FROM income_categories WHERE is_active = true ORDER BY name ASC");

        return rows.Select(MapCategory).ToList();
    }

    public async Task<IncomeCategoryDto> CreateCategoryAsync(string name, string type)
    {
        await using var conn = _db.CreateConnection();
        await conn.OpenAsync();

        var row = await conn.QuerySingleAsync<DbCategoryRow>(
            "INSERT INTO income_categories (name, type) VALUES (@Name, @Type) RETURNING *",
            new { Name = name, Type = type });

        _logger.LogInformation("Income category {CategoryId} created", row.id);
        return MapCategory(row);
    }

    public async Task<IncomeCategoryDto> UpdateCategoryAsync(Guid id, string? name, string? type)
    {
        await using var conn = _db.CreateConnection();
        await conn.OpenAsync();

        var fields = new List<string>();
        var parameters = new DynamicParameters();
        parameters.Add("Id", id);

        if (name != null)
        {
            fields.Add("name = @Name");
            parameters.Add("Name", name);
        }
        if (type != null)
        {
            fields.Add("type = @Type");
            parameters.Add("Type", type);
        }

        if (fields.Count == 0)
        {
            var existing = await conn.QuerySingleOrDefaultAsync<DbCategoryRow>(
                "SELECT * FROM income_categories WHERE id = @Id", new { Id = id });
            if (existing == null)
                throw new AppException("Category not found", 404, "NOT_FOUND");
            return MapCategory(existing);
        }

        var sql = $"UPDATE income_categories SET {string.Join(", ", fields)} WHERE id = @Id RETURNING *";
        var row = await conn.QuerySingleOrDefaultAsync<DbCategoryRow>(sql, parameters);

        if (row == null)
            throw new AppException("Category not found", 404, "NOT_FOUND");

        _logger.LogInformation("Income category {CategoryId} updated", id);
        return MapCategory(row);
    }

    public async Task DeleteCategoryAsync(Guid id)
    {
        await using var conn = _db.CreateConnection();
        await conn.OpenAsync();

        var affected = await conn.ExecuteAsync(
            "UPDATE income_categories SET is_active = false WHERE id = @Id AND is_active = true",
            new { Id = id });

        if (affected == 0)
            throw new AppException("Category not found", 404, "NOT_FOUND");

        _logger.LogInformation("Income category {CategoryId} soft-deleted", id);
    }

    // =============================================
    // Mappers
    // =============================================

    private static IncomeDto MapIncome(DbIncomeRow row, List<IncomeAllocationDto> allocations)
    {
        return new IncomeDto
        {
            Id = row.id,
            Description = row.description,
            Amount = row.amount,
            Currency = row.currency,
            CategoryId = row.category_id,
            Category = row.category_name != null
                ? new IncomeCategoryDto
                {
                    Id = row.category_id!.Value,
                    Name = row.category_name,
                    Type = row.category_type ?? string.Empty,
                    IsActive = row.category_is_active ?? true,
                }
                : null,
            IncomeDate = row.income_date.ToString("yyyy-MM-dd"),
            IsRecurring = row.is_recurring,
            RecurringPattern = row.recurring_pattern != null
                ? JsonSerializer.Deserialize<object>(row.recurring_pattern)
                : null,
            ClientName = row.client_name,
            ClientId = row.client_id,
            InvoiceNumber = row.invoice_number,
            InvoiceType = row.invoice_type,
            InvoiceStatus = row.invoice_status,
            PaymentDueDate = row.payment_due_date?.ToString("yyyy-MM-dd"),
            PaymentReceivedDate = row.payment_received_date?.ToString("yyyy-MM-dd"),
            ProformaInvoiceDate = row.proforma_invoice_date?.ToString("yyyy-MM-dd"),
            TaxInvoiceDate = row.tax_invoice_date?.ToString("yyyy-MM-dd"),
            Notes = row.notes,
            Tags = row.tags ?? [],
            BillableHoursRegular = row.billable_hours_regular,
            BillableHours150 = row.billable_hours_150,
            BillableHours200 = row.billable_hours_200,
            HourlyRateRegular = row.hourly_rate_regular,
            HourlyRate150 = row.hourly_rate_150,
            HourlyRate200 = row.hourly_rate_200,
            VatApplicable = row.vat_applicable,
            VatPercentage = row.vat_percentage,
            PaymentMethod = row.payment_method,
            Allocations = allocations,
            CreatedBy = row.created_by,
            CreatedAt = row.created_at,
            UpdatedAt = row.updated_at,
        };
    }

    private static IncomeAllocationDto MapAllocation(DbAllocationRow row)
    {
        return new IncomeAllocationDto
        {
            Id = row.id,
            PnlCenterId = row.pnl_center_id,
            PnlCenterName = row.pnl_center_name,
            Percentage = row.percentage,
            AllocatedAmount = row.allocated_amount,
        };
    }

    private static IncomeCategoryDto MapCategory(DbCategoryRow row)
    {
        return new IncomeCategoryDto
        {
            Id = row.id,
            Name = row.name,
            Type = row.type,
            IsActive = row.is_active,
        };
    }

    private static async Task LogAuditAsync(Npgsql.NpgsqlConnection conn, System.Data.Common.DbTransaction? tx,
        Guid userId, string action, string entityType, Guid entityId)
    {
        await conn.ExecuteAsync(
            """
            INSERT INTO audit_logs (user_id, action, entity_type, entity_id)
            VALUES (@UserId, @Action, @EntityType, @EntityId)
            """,
            new { UserId = userId, Action = action, EntityType = entityType, EntityId = entityId },
            tx);
    }

    private static async Task<Guid?> GetOrCreateClientIdAsync(
        Npgsql.NpgsqlConnection conn,
        Npgsql.NpgsqlTransaction tx,
        Guid? clientId,
        string? clientName,
        Guid userId)
    {
        if (string.IsNullOrWhiteSpace(clientName))
            return clientId;

        if (clientId.HasValue)
        {
            var exists = await conn.ExecuteScalarAsync<int>(
                "SELECT COUNT(1) FROM clients WHERE id = @Id", new { Id = clientId.Value }, tx);
            if (exists > 0) return clientId;
        }

        var existingId = await conn.ExecuteScalarAsync<Guid?>(
            "SELECT id FROM clients WHERE LOWER(TRIM(name)) = LOWER(TRIM(@Name)) OR LOWER(TRIM(company_name)) = LOWER(TRIM(@Name)) LIMIT 1",
            new { Name = clientName }, tx);

        if (existingId.HasValue) return existingId;

        return await conn.ExecuteScalarAsync<Guid>(
            "INSERT INTO clients (name, status, created_by) VALUES (@Name, 'active', @CreatedBy) RETURNING id",
            new { Name = clientName.Trim(), CreatedBy = userId }, tx);
    }
}
