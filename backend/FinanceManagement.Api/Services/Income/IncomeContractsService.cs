using System.Text.Json.Serialization;
using Dapper;
using FinanceManagement.Api.Database;
using FinanceManagement.Api.Middleware;

namespace FinanceManagement.Api.Services.Income;

// =============================================
// DTOs
// =============================================

public class IncomeContractSummaryDto
{
    [JsonPropertyName("id")]
    public Guid Id { get; set; }

    [JsonPropertyName("title")]
    public string Title { get; set; } = string.Empty;

    [JsonPropertyName("contractNumber")]
    public string? ContractNumber { get; set; }

    [JsonPropertyName("contractType")]
    public string ContractType { get; set; } = string.Empty;

    [JsonPropertyName("serviceType")]
    public string? ServiceType { get; set; }

    [JsonPropertyName("status")]
    public string Status { get; set; } = string.Empty;

    [JsonPropertyName("clientId")]
    public Guid? ClientId { get; set; }

    [JsonPropertyName("clientName")]
    public string? ClientName { get; set; }

    [JsonPropertyName("currency")]
    public string Currency { get; set; } = "ILS";

    [JsonPropertyName("totalValue")]
    public decimal TotalValue { get; set; }

    [JsonPropertyName("totalPaid")]
    public decimal TotalPaid { get; set; }

    [JsonPropertyName("totalOutstanding")]
    public decimal TotalOutstanding { get; set; }

    [JsonPropertyName("overdueCount")]
    public int OverdueCount { get; set; }

    [JsonPropertyName("upcomingCount")]
    public int UpcomingCount { get; set; }

    [JsonPropertyName("milestoneCount")]
    public int MilestoneCount { get; set; }

    [JsonPropertyName("paidCount")]
    public int PaidCount { get; set; }

    [JsonPropertyName("startDate")]
    public string? StartDate { get; set; }

    [JsonPropertyName("endDate")]
    public string? EndDate { get; set; }

    [JsonPropertyName("createdAt")]
    public DateTime CreatedAt { get; set; }

    [JsonPropertyName("updatedAt")]
    public DateTime UpdatedAt { get; set; }
}

public class IncomeContractDto : IncomeContractSummaryDto
{
    [JsonPropertyName("proposalId")]
    public Guid? ProposalId { get; set; }

    [JsonPropertyName("categoryId")]
    public Guid? CategoryId { get; set; }

    [JsonPropertyName("pnlCenterId")]
    public Guid? PnlCenterId { get; set; }

    [JsonPropertyName("vatApplicable")]
    public bool VatApplicable { get; set; }

    [JsonPropertyName("vatPercentage")]
    public decimal? VatPercentage { get; set; }

    [JsonPropertyName("paymentTermsDays")]
    public int PaymentTermsDays { get; set; }

    [JsonPropertyName("retainerMonthlyAmount")]
    public decimal? RetainerMonthlyAmount { get; set; }

    [JsonPropertyName("retainerBillingDay")]
    public int? RetainerBillingDay { get; set; }

    [JsonPropertyName("notes")]
    public string? Notes { get; set; }

    [JsonPropertyName("tags")]
    public string[] Tags { get; set; } = [];

    [JsonPropertyName("createdBy")]
    public Guid? CreatedBy { get; set; }

    [JsonPropertyName("milestones")]
    public List<IncomeMilestoneDto> Milestones { get; set; } = [];

    [JsonPropertyName("attachments")]
    public List<ContractAttachmentDto> Attachments { get; set; } = [];
}

public class IncomeMilestoneDto
{
    [JsonPropertyName("id")]
    public Guid Id { get; set; }

    [JsonPropertyName("contractId")]
    public Guid ContractId { get; set; }

    [JsonPropertyName("contractTitle")]
    public string? ContractTitle { get; set; }

    [JsonPropertyName("clientName")]
    public string? ClientName { get; set; }

    [JsonPropertyName("sortOrder")]
    public int SortOrder { get; set; }

    [JsonPropertyName("description")]
    public string Description { get; set; } = string.Empty;

    [JsonPropertyName("amountDue")]
    public decimal AmountDue { get; set; }

    [JsonPropertyName("currency")]
    public string Currency { get; set; } = "ILS";

    [JsonPropertyName("dueDate")]
    public string DueDate { get; set; } = string.Empty;

    [JsonPropertyName("status")]
    public string Status { get; set; } = string.Empty;

    [JsonPropertyName("proformaInvoiceNumber")]
    public string? ProformaInvoiceNumber { get; set; }

    [JsonPropertyName("proformaInvoiceDate")]
    public string? ProformaInvoiceDate { get; set; }

    [JsonPropertyName("proformaAmount")]
    public decimal? ProformaAmount { get; set; }

    [JsonPropertyName("taxInvoiceNumber")]
    public string? TaxInvoiceNumber { get; set; }

    [JsonPropertyName("taxInvoiceDate")]
    public string? TaxInvoiceDate { get; set; }

    [JsonPropertyName("paymentReceivedDate")]
    public string? PaymentReceivedDate { get; set; }

    [JsonPropertyName("paymentMethod")]
    public string? PaymentMethod { get; set; }

    [JsonPropertyName("actualAmountPaid")]
    public decimal? ActualAmountPaid { get; set; }

    [JsonPropertyName("incomeId")]
    public Guid? IncomeId { get; set; }

    [JsonPropertyName("notes")]
    public string? Notes { get; set; }

    [JsonPropertyName("attachments")]
    public List<ContractAttachmentDto> Attachments { get; set; } = [];

    [JsonPropertyName("createdAt")]
    public DateTime CreatedAt { get; set; }

    [JsonPropertyName("updatedAt")]
    public DateTime UpdatedAt { get; set; }
}

// Projected milestone (unpaid) for forecasting
public class MilestoneProjectionDto
{
    [JsonPropertyName("month")]
    public string Month { get; set; } = string.Empty; // "YYYY-MM"

    [JsonPropertyName("projectedAmount")]
    public decimal ProjectedAmount { get; set; }

    [JsonPropertyName("milestoneCount")]
    public int MilestoneCount { get; set; }

    [JsonPropertyName("overdueAmount")]
    public decimal OverdueAmount { get; set; }
}

public class ContractStatsDto
{
    [JsonPropertyName("totalContracts")]
    public int TotalContracts { get; set; }

    [JsonPropertyName("activeContracts")]
    public int ActiveContracts { get; set; }

    [JsonPropertyName("completedContracts")]
    public int CompletedContracts { get; set; }

    [JsonPropertyName("totalValue")]
    public decimal TotalValue { get; set; }

    [JsonPropertyName("totalCollected")]
    public decimal TotalCollected { get; set; }

    [JsonPropertyName("totalOutstanding")]
    public decimal TotalOutstanding { get; set; }

    [JsonPropertyName("overduePayments")]
    public int OverduePayments { get; set; }

    [JsonPropertyName("overdueAmount")]
    public decimal OverdueAmount { get; set; }
}

public class ClientContractStatsDto
{
    [JsonPropertyName("clientId")]
    public Guid? ClientId { get; set; }

    [JsonPropertyName("clientName")]
    public string ClientName { get; set; } = string.Empty;

    [JsonPropertyName("contractCount")]
    public int ContractCount { get; set; }

    [JsonPropertyName("totalValue")]
    public decimal TotalValue { get; set; }

    [JsonPropertyName("totalCollected")]
    public decimal TotalCollected { get; set; }

    [JsonPropertyName("totalOutstanding")]
    public decimal TotalOutstanding { get; set; }

    [JsonPropertyName("overdueCount")]
    public int OverdueCount { get; set; }

    [JsonPropertyName("overdueAmount")]
    public decimal OverdueAmount { get; set; }

    [JsonPropertyName("latestContractDate")]
    public string? LatestContractDate { get; set; }
}

public class ContractAttachmentDto
{
    [JsonPropertyName("url")]
    public string Url { get; set; } = string.Empty;

    [JsonPropertyName("name")]
    public string Name { get; set; } = string.Empty;

    [JsonPropertyName("size")]
    public long Size { get; set; }

    [JsonPropertyName("mimeType")]
    public string MimeType { get; set; } = string.Empty;

    [JsonPropertyName("documentType")]
    public string DocumentType { get; set; } = "other";

    [JsonPropertyName("uploadedAt")]
    public string UploadedAt { get; set; } = string.Empty;
}

public class PatchAttachmentsRequest
{
    [JsonPropertyName("attachments")]
    public List<ContractAttachmentDto> Attachments { get; set; } = [];
}

// =============================================
// Request models
// =============================================

public class CreateContractRequest
{
    [JsonPropertyName("title")]
    public string Title { get; set; } = string.Empty;

    [JsonPropertyName("contractType")]
    public string ContractType { get; set; } = string.Empty;

    [JsonPropertyName("serviceType")]
    public string? ServiceType { get; set; }

    [JsonPropertyName("clientId")]
    public Guid? ClientId { get; set; }

    [JsonPropertyName("clientName")]
    public string? ClientName { get; set; }

    [JsonPropertyName("proposalId")]
    public Guid? ProposalId { get; set; }

    [JsonPropertyName("categoryId")]
    public Guid? CategoryId { get; set; }

    [JsonPropertyName("pnlCenterId")]
    public Guid? PnlCenterId { get; set; }

    [JsonPropertyName("currency")]
    public string Currency { get; set; } = "ILS";

    [JsonPropertyName("totalValue")]
    public decimal TotalValue { get; set; }

    [JsonPropertyName("vatApplicable")]
    public bool VatApplicable { get; set; }

    [JsonPropertyName("vatPercentage")]
    public decimal? VatPercentage { get; set; }

    [JsonPropertyName("paymentTermsDays")]
    public int PaymentTermsDays { get; set; } = 30;

    [JsonPropertyName("startDate")]
    public string? StartDate { get; set; }

    [JsonPropertyName("endDate")]
    public string? EndDate { get; set; }

    [JsonPropertyName("retainerMonthlyAmount")]
    public decimal? RetainerMonthlyAmount { get; set; }

    [JsonPropertyName("retainerBillingDay")]
    public int? RetainerBillingDay { get; set; }

    [JsonPropertyName("notes")]
    public string? Notes { get; set; }

    [JsonPropertyName("tags")]
    public string[]? Tags { get; set; }

    [JsonPropertyName("milestones")]
    public List<CreateMilestoneRequest> Milestones { get; set; } = [];
}

public class UpdateContractRequest
{
    [JsonPropertyName("title")]
    public string? Title { get; set; }

    [JsonPropertyName("serviceType")]
    public string? ServiceType { get; set; }

    [JsonPropertyName("status")]
    public string? Status { get; set; }

    [JsonPropertyName("clientId")]
    public Guid? ClientId { get; set; }

    [JsonPropertyName("clientName")]
    public string? ClientName { get; set; }

    [JsonPropertyName("categoryId")]
    public Guid? CategoryId { get; set; }

    [JsonPropertyName("pnlCenterId")]
    public Guid? PnlCenterId { get; set; }

    [JsonPropertyName("currency")]
    public string? Currency { get; set; }

    [JsonPropertyName("totalValue")]
    public decimal? TotalValue { get; set; }

    [JsonPropertyName("vatApplicable")]
    public bool? VatApplicable { get; set; }

    [JsonPropertyName("vatPercentage")]
    public decimal? VatPercentage { get; set; }

    [JsonPropertyName("paymentTermsDays")]
    public int? PaymentTermsDays { get; set; }

    [JsonPropertyName("startDate")]
    public string? StartDate { get; set; }

    [JsonPropertyName("endDate")]
    public string? EndDate { get; set; }

    [JsonPropertyName("retainerMonthlyAmount")]
    public decimal? RetainerMonthlyAmount { get; set; }

    [JsonPropertyName("retainerBillingDay")]
    public int? RetainerBillingDay { get; set; }

    [JsonPropertyName("notes")]
    public string? Notes { get; set; }

    [JsonPropertyName("tags")]
    public string[]? Tags { get; set; }
}

public class CreateMilestoneRequest
{
    [JsonPropertyName("description")]
    public string Description { get; set; } = string.Empty;

    [JsonPropertyName("amountDue")]
    public decimal AmountDue { get; set; }

    [JsonPropertyName("dueDate")]
    public string DueDate { get; set; } = string.Empty;

    [JsonPropertyName("sortOrder")]
    public int SortOrder { get; set; }

    [JsonPropertyName("notes")]
    public string? Notes { get; set; }
}

public class UpdateMilestoneRequest
{
    [JsonPropertyName("description")]
    public string? Description { get; set; }

    [JsonPropertyName("amountDue")]
    public decimal? AmountDue { get; set; }

    [JsonPropertyName("dueDate")]
    public string? DueDate { get; set; }

    [JsonPropertyName("status")]
    public string? Status { get; set; }

    [JsonPropertyName("proformaInvoiceNumber")]
    public string? ProformaInvoiceNumber { get; set; }

    [JsonPropertyName("proformaInvoiceDate")]
    public string? ProformaInvoiceDate { get; set; }

    [JsonPropertyName("proformaAmount")]
    public decimal? ProformaAmount { get; set; }

    [JsonPropertyName("taxInvoiceNumber")]
    public string? TaxInvoiceNumber { get; set; }

    [JsonPropertyName("taxInvoiceDate")]
    public string? TaxInvoiceDate { get; set; }

    [JsonPropertyName("notes")]
    public string? Notes { get; set; }

    [JsonPropertyName("sortOrder")]
    public int? SortOrder { get; set; }
}

public class DuplicateContractRequest
{
    [JsonPropertyName("title")]
    public string? Title { get; set; }

    [JsonPropertyName("clientId")]
    public Guid? ClientId { get; set; }

    [JsonPropertyName("clientName")]
    public string? ClientName { get; set; }

    [JsonPropertyName("totalValue")]
    public decimal? TotalValue { get; set; }

    [JsonPropertyName("currency")]
    public string? Currency { get; set; }

    [JsonPropertyName("startDate")]
    public string? StartDate { get; set; }

    [JsonPropertyName("endDate")]
    public string? EndDate { get; set; }

    [JsonPropertyName("notes")]
    public string? Notes { get; set; }

    [JsonPropertyName("copyMilestones")]
    public bool CopyMilestones { get; set; } = true;
}


public class GenerateRetainerMilestonesRequest
{
    [JsonPropertyName("startDate")]
    public string StartDate { get; set; } = string.Empty;

    [JsonPropertyName("monthCount")]
    public int MonthCount { get; set; }
}

public class MarkMilestonePaidRequest
{
    [JsonPropertyName("paymentReceivedDate")]
    public string PaymentReceivedDate { get; set; } = string.Empty;

    [JsonPropertyName("paymentMethod")]
    public string? PaymentMethod { get; set; }

    [JsonPropertyName("actualAmountPaid")]
    public decimal? ActualAmountPaid { get; set; }

    [JsonPropertyName("allocations")]
    public List<AllocationInput> Allocations { get; set; } = [];

    [JsonPropertyName("proformaInvoiceNumber")]
    public string? ProformaInvoiceNumber { get; set; }

    [JsonPropertyName("proformaInvoiceDate")]
    public string? ProformaInvoiceDate { get; set; }

    [JsonPropertyName("taxInvoiceNumber")]
    public string? TaxInvoiceNumber { get; set; }

    [JsonPropertyName("taxInvoiceDate")]
    public string? TaxInvoiceDate { get; set; }
}

public class ConvertProposalToContractRequest
{
    [JsonPropertyName("proposalId")]
    public Guid ProposalId { get; set; }

    [JsonPropertyName("contractType")]
    public string ContractType { get; set; } = string.Empty;

    [JsonPropertyName("title")]
    public string? Title { get; set; }

    [JsonPropertyName("paymentTermsDays")]
    public int? PaymentTermsDays { get; set; }

    [JsonPropertyName("startDate")]
    public string? StartDate { get; set; }

    [JsonPropertyName("endDate")]
    public string? EndDate { get; set; }

    [JsonPropertyName("milestones")]
    public List<CreateMilestoneRequest> Milestones { get; set; } = [];

    // Retainer-specific
    [JsonPropertyName("retainerMonthlyAmount")]
    public decimal? RetainerMonthlyAmount { get; set; }

    [JsonPropertyName("retainerBillingDay")]
    public int? RetainerBillingDay { get; set; }

    [JsonPropertyName("retainerMonthCount")]
    public int? RetainerMonthCount { get; set; }
}

public class ContractFilters
{
    public int Page { get; set; } = 1;
    public int Limit { get; set; } = 20;
    public string? ClientId { get; set; }
    public string? ContractType { get; set; }
    public string? Status { get; set; }
    public string? Search { get; set; }
    public string? StartDate { get; set; }
    public string? EndDate { get; set; }
}

// =============================================
// DB row types
// =============================================

public class DbContractRow
{
    public Guid id { get; set; }
    public string title { get; set; } = string.Empty;
    public string? contract_number { get; set; }
    public string contract_type { get; set; } = string.Empty;
    public string? service_type { get; set; }
    public string status { get; set; } = string.Empty;
    public Guid? client_id { get; set; }
    public string? client_name { get; set; }
    public Guid? proposal_id { get; set; }
    public Guid? category_id { get; set; }
    public Guid? pnl_center_id { get; set; }
    public string currency { get; set; } = "ILS";
    public decimal total_value { get; set; }
    public bool vat_applicable { get; set; }
    public decimal? vat_percentage { get; set; }
    public int payment_terms_days { get; set; }
    public DateTime? start_date { get; set; }
    public DateTime? end_date { get; set; }
    public decimal? retainer_monthly_amount { get; set; }
    public int? retainer_billing_day { get; set; }
    public string? notes { get; set; }
    public string[]? tags { get; set; }
    public string? attachments { get; set; }
    public Guid? created_by { get; set; }
    public DateTime created_at { get; set; }
    public DateTime updated_at { get; set; }
    // Aggregated from LATERAL join
    public decimal total_paid { get; set; }
    public decimal total_outstanding { get; set; }
    public int overdue_count { get; set; }
    public int upcoming_count { get; set; }
    public int milestone_count { get; set; }
    public int paid_count { get; set; }
}

public class DbMilestoneRow
{
    public Guid id { get; set; }
    public Guid contract_id { get; set; }
    public string? contract_title { get; set; }
    public string? client_name { get; set; }
    public int sort_order { get; set; }
    public string description { get; set; } = string.Empty;
    public decimal amount_due { get; set; }
    public string currency { get; set; } = "ILS";
    public DateTime due_date { get; set; }
    public string status { get; set; } = string.Empty;
    public string? proforma_invoice_number { get; set; }
    public DateTime? proforma_invoice_date { get; set; }
    public decimal? proforma_amount { get; set; }
    public string? tax_invoice_number { get; set; }
    public DateTime? tax_invoice_date { get; set; }
    public DateTime? payment_received_date { get; set; }
    public string? payment_method { get; set; }
    public decimal? actual_amount_paid { get; set; }
    public Guid? income_id { get; set; }
    public string? notes { get; set; }
    public string? attachments { get; set; }
    public DateTime created_at { get; set; }
    public DateTime updated_at { get; set; }
}

public class DbProposalMinRow
{
    public Guid id { get; set; }
    public string? title { get; set; }
    public Guid? client_id { get; set; }
    public string? client_name { get; set; }
    public decimal total { get; set; }
    public string currency { get; set; } = "USD";
    public string status { get; set; } = string.Empty;
    public Guid? converted_to_contract_id { get; set; }
}

// =============================================
// Service
// =============================================

public class IncomeContractsService
{
    private readonly DbContext _db;
    private readonly IncomeService _incomeService;
    private readonly ILogger<IncomeContractsService> _logger;

    public IncomeContractsService(
        DbContext db,
        IncomeService incomeService,
        ILogger<IncomeContractsService> logger)
    {
        _db = db;
        _incomeService = incomeService;
        _logger = logger;
    }

    // ── Contracts ─────────────────────────────────────────────────────────────

    public async Task<(List<IncomeContractSummaryDto> Items, int Total)> GetAllAsync(ContractFilters filters)
    {
        await using var conn = _db.CreateConnection();
        await conn.OpenAsync();

        var where = new List<string>();
        var p = new DynamicParameters();

        if (!string.IsNullOrWhiteSpace(filters.ClientId))
        {
            where.Add("ic.client_id = @ClientId");
            p.Add("ClientId", Guid.Parse(filters.ClientId));
        }
        if (!string.IsNullOrWhiteSpace(filters.ContractType))
        {
            where.Add("ic.contract_type = @ContractType");
            p.Add("ContractType", filters.ContractType);
        }
        if (!string.IsNullOrWhiteSpace(filters.Status))
        {
            where.Add("ic.status = @Status");
            p.Add("Status", filters.Status);
        }
        if (!string.IsNullOrWhiteSpace(filters.Search))
        {
            where.Add("(ic.title ILIKE @Search OR ic.client_name ILIKE @Search OR ic.contract_number ILIKE @Search)");
            p.Add("Search", $"%{filters.Search}%");
        }
        if (!string.IsNullOrWhiteSpace(filters.StartDate))
        {
            where.Add("ic.created_at >= @StartDate::date");
            p.Add("StartDate", filters.StartDate);
        }
        if (!string.IsNullOrWhiteSpace(filters.EndDate))
        {
            where.Add("ic.created_at < (@EndDate::date + INTERVAL '1 day')");
            p.Add("EndDate", filters.EndDate);
        }

        var whereClause = where.Count > 0 ? "WHERE " + string.Join(" AND ", where) : "";

        var total = await conn.ExecuteScalarAsync<int>(
            $"SELECT COUNT(*) FROM income_contracts ic {whereClause}", p);

        var offset = (filters.Page - 1) * filters.Limit;
        p.Add("Limit", filters.Limit);
        p.Add("Offset", offset);

        var sql = $"""
            SELECT
                ic.*,
                COALESCE(ms.total_paid, 0) as total_paid,
                COALESCE(ms.total_outstanding, 0) as total_outstanding,
                COALESCE(ms.overdue_count, 0) as overdue_count,
                COALESCE(ms.upcoming_count, 0) as upcoming_count,
                COALESCE(ms.milestone_count, 0) as milestone_count,
                COALESCE(ms.paid_count, 0) as paid_count
            FROM income_contracts ic
            LEFT JOIN LATERAL (
                SELECT
                    SUM(CASE WHEN m.status = 'paid' THEN COALESCE(m.actual_amount_paid, m.amount_due) ELSE 0 END) as total_paid,
                    SUM(CASE WHEN m.status != 'paid' THEN m.amount_due ELSE 0 END) as total_outstanding,
                    COUNT(*) FILTER (WHERE m.status != 'paid' AND m.due_date < CURRENT_DATE) as overdue_count,
                    COUNT(*) FILTER (WHERE m.status != 'paid' AND m.due_date >= CURRENT_DATE AND m.due_date <= CURRENT_DATE + 7) as upcoming_count,
                    COUNT(*) as milestone_count,
                    COUNT(*) FILTER (WHERE m.status = 'paid') as paid_count
                FROM income_milestones m
                WHERE m.contract_id = ic.id
            ) ms ON TRUE
            {whereClause}
            ORDER BY ic.created_at DESC
            LIMIT @Limit OFFSET @Offset
            """;

        var rows = await conn.QueryAsync<DbContractRow>(sql, p);
        return (rows.Select(MapContractSummary).ToList(), total);
    }

    public async Task<IncomeContractDto?> GetByIdAsync(Guid id)
    {
        await using var conn = _db.CreateConnection();
        await conn.OpenAsync();

        var sql = """
            SELECT
                ic.*,
                COALESCE(ms.total_paid, 0) as total_paid,
                COALESCE(ms.total_outstanding, 0) as total_outstanding,
                COALESCE(ms.overdue_count, 0) as overdue_count,
                COALESCE(ms.upcoming_count, 0) as upcoming_count,
                COALESCE(ms.milestone_count, 0) as milestone_count,
                COALESCE(ms.paid_count, 0) as paid_count
            FROM income_contracts ic
            LEFT JOIN LATERAL (
                SELECT
                    SUM(CASE WHEN m.status = 'paid' THEN COALESCE(m.actual_amount_paid, m.amount_due) ELSE 0 END) as total_paid,
                    SUM(CASE WHEN m.status != 'paid' THEN m.amount_due ELSE 0 END) as total_outstanding,
                    COUNT(*) FILTER (WHERE m.status != 'paid' AND m.due_date < CURRENT_DATE) as overdue_count,
                    COUNT(*) FILTER (WHERE m.status != 'paid' AND m.due_date >= CURRENT_DATE AND m.due_date <= CURRENT_DATE + 7) as upcoming_count,
                    COUNT(*) as milestone_count,
                    COUNT(*) FILTER (WHERE m.status = 'paid') as paid_count
                FROM income_milestones m
                WHERE m.contract_id = ic.id
            ) ms ON TRUE
            WHERE ic.id = @Id
            """;

        var row = await conn.QuerySingleOrDefaultAsync<DbContractRow>(sql, new { Id = id });
        if (row == null) return null;

        var milestones = await GetMilestonesInternalAsync(conn, id);
        var dto = MapContractDetail(row);
        dto.Milestones = milestones;
        return dto;
    }

    public async Task<IncomeContractDto> CreateAsync(CreateContractRequest request, Guid userId)
    {
        await using var conn = _db.CreateConnection();
        await conn.OpenAsync();
        await using var tx = await conn.BeginTransactionAsync();

        try
        {
            var resolvedClientId = await GetOrCreateClientIdAsync(conn, tx, request.ClientId, request.ClientName, userId);

            var row = await conn.QuerySingleAsync<DbContractRow>(
                """
                INSERT INTO income_contracts (
                    title, contract_type, service_type, status, client_id, client_name,
                    proposal_id, category_id, pnl_center_id, currency, total_value,
                    vat_applicable, vat_percentage, payment_terms_days,
                    start_date, end_date, retainer_monthly_amount, retainer_billing_day,
                    notes, tags, created_by
                ) VALUES (
                    @Title, @ContractType, @ServiceType, 'active', @ClientId, @ClientName,
                    @ProposalId, @CategoryId, @PnlCenterId, @Currency, @TotalValue,
                    @VatApplicable, @VatPercentage, @PaymentTermsDays,
                    @StartDate::date, @EndDate::date, @RetainerMonthlyAmount, @RetainerBillingDay,
                    @Notes, @Tags, @CreatedBy
                )
                RETURNING *,
                    0::decimal as total_paid, 0::decimal as total_outstanding,
                    0 as overdue_count, 0 as upcoming_count,
                    0 as milestone_count, 0 as paid_count
                """,
                new
                {
                    request.Title,
                    ContractType = request.ContractType,
                    ServiceType = request.ServiceType,
                    ClientId = resolvedClientId,
                    ClientName = request.ClientName,
                    ProposalId = request.ProposalId,
                    CategoryId = request.CategoryId,
                    PnlCenterId = request.PnlCenterId,
                    Currency = request.Currency,
                    TotalValue = request.TotalValue,
                    VatApplicable = request.VatApplicable,
                    VatPercentage = request.VatPercentage,
                    PaymentTermsDays = request.PaymentTermsDays,
                    StartDate = request.StartDate,
                    EndDate = request.EndDate,
                    RetainerMonthlyAmount = request.RetainerMonthlyAmount,
                    RetainerBillingDay = request.RetainerBillingDay,
                    Notes = request.Notes,
                    Tags = request.Tags ?? [],
                    CreatedBy = userId,
                }, tx);

            var milestones = new List<IncomeMilestoneDto>();
            if (request.Milestones.Count > 0)
                milestones = await InsertMilestonesAsync(conn, tx, row.id, request.Milestones, row.currency);

            await conn.ExecuteAsync(
                "INSERT INTO audit_logs (user_id, action, entity_type, entity_id) VALUES (@UserId, @Action, @EntityType, @EntityId)",
                new { UserId = userId, Action = "create", EntityType = "contract", EntityId = row.id }, tx);

            await tx.CommitAsync();

            var dto = MapContractDetail(row);
            dto.Milestones = milestones;
            return dto;
        }
        catch
        {
            await tx.RollbackAsync();
            throw;
        }
    }

    public async Task<IncomeContractDto> UpdateAsync(Guid id, UpdateContractRequest request, Guid userId)
    {
        await using var conn = _db.CreateConnection();
        await conn.OpenAsync();

        var sets = new List<string>();
        var p = new DynamicParameters();
        p.Add("Id", id);

        if (request.Title != null) { sets.Add("title = @Title"); p.Add("Title", request.Title); }
        if (request.ServiceType != null) { sets.Add("service_type = @ServiceType"); p.Add("ServiceType", request.ServiceType == "" ? null : request.ServiceType); }
        if (request.Status != null) { sets.Add("status = @Status"); p.Add("Status", request.Status); }
        if (request.ClientId != null) { sets.Add("client_id = @ClientId"); p.Add("ClientId", request.ClientId); }
        if (request.ClientName != null) { sets.Add("client_name = @ClientName"); p.Add("ClientName", request.ClientName); }
        if (request.CategoryId != null) { sets.Add("category_id = @CategoryId"); p.Add("CategoryId", request.CategoryId); }
        if (request.PnlCenterId != null) { sets.Add("pnl_center_id = @PnlCenterId"); p.Add("PnlCenterId", request.PnlCenterId); }
        if (request.Currency != null) { sets.Add("currency = @Currency"); p.Add("Currency", request.Currency); }
        if (request.TotalValue != null) { sets.Add("total_value = @TotalValue"); p.Add("TotalValue", request.TotalValue); }
        if (request.VatApplicable != null) { sets.Add("vat_applicable = @VatApplicable"); p.Add("VatApplicable", request.VatApplicable); }
        if (request.VatPercentage != null) { sets.Add("vat_percentage = @VatPercentage"); p.Add("VatPercentage", request.VatPercentage); }
        if (request.PaymentTermsDays != null) { sets.Add("payment_terms_days = @PaymentTermsDays"); p.Add("PaymentTermsDays", request.PaymentTermsDays); }
        if (request.StartDate != null) { sets.Add("start_date = @StartDate::date"); p.Add("StartDate", request.StartDate); }
        if (request.EndDate != null) { sets.Add("end_date = @EndDate::date"); p.Add("EndDate", request.EndDate); }
        if (request.RetainerMonthlyAmount != null) { sets.Add("retainer_monthly_amount = @RetainerMonthlyAmount"); p.Add("RetainerMonthlyAmount", request.RetainerMonthlyAmount); }
        if (request.RetainerBillingDay != null) { sets.Add("retainer_billing_day = @RetainerBillingDay"); p.Add("RetainerBillingDay", request.RetainerBillingDay); }
        if (request.Notes != null) { sets.Add("notes = @Notes"); p.Add("Notes", request.Notes); }
        if (request.Tags != null) { sets.Add("tags = @Tags"); p.Add("Tags", request.Tags); }

        if (sets.Count == 0)
            return (await GetByIdAsync(id))!;

        if (await conn.QuerySingleOrDefaultAsync<DbContractRow>(
            $"""
            UPDATE income_contracts SET {string.Join(", ", sets)}
            WHERE id = @Id
            RETURNING *,
                0::decimal as total_paid, 0::decimal as total_outstanding,
                0 as overdue_count, 0 as upcoming_count,
                0 as milestone_count, 0 as paid_count
            """, p) == null)
            throw new AppException("Contract not found", 404, "NOT_FOUND");

        await conn.ExecuteAsync(
            "INSERT INTO audit_logs (user_id, action, entity_type, entity_id) VALUES (@UserId, @Action, @EntityType, @EntityId)",
            new { UserId = userId, Action = "update", EntityType = "contract", EntityId = id });

        return (await GetByIdAsync(id))!;
    }

    public async Task DeleteAsync(Guid id, Guid userId)
    {
        await using var conn = _db.CreateConnection();
        await conn.OpenAsync();

        var affected = await conn.ExecuteAsync(
            "DELETE FROM income_contracts WHERE id = @Id", new { Id = id });

        if (affected == 0)
            throw new AppException("Contract not found", 404, "NOT_FOUND");

        await conn.ExecuteAsync(
            "INSERT INTO audit_logs (user_id, action, entity_type, entity_id) VALUES (@UserId, @Action, @EntityType, @EntityId)",
            new { UserId = userId, Action = "delete", EntityType = "contract", EntityId = id });
    }

    // ── Duplicate ─────────────────────────────────────────────────────────────

    public async Task<IncomeContractDto> DuplicateAsync(Guid sourceId, DuplicateContractRequest overrides, Guid userId)
    {
        await using var conn = _db.CreateConnection();
        await conn.OpenAsync();
        await using var tx = await conn.BeginTransactionAsync();

        try
        {
            // Fetch the source contract
            var source = await conn.QuerySingleOrDefaultAsync<DbContractRow>(
                "SELECT * FROM income_contracts WHERE id = @Id",
                new { Id = sourceId }, tx);

            if (source == null)
                throw new AppException("Contract not found", 404, "NOT_FOUND");

            // Resolve overrides client (or inherit source client), ensuring a clients record exists
            var dupClientId = overrides.ClientId ?? source.client_id;
            var dupClientName = overrides.ClientName ?? source.client_name;
            var resolvedDupClientId = await GetOrCreateClientIdAsync(conn, tx, dupClientId, dupClientName, userId);

            // Insert duplicate with reset status
            var row = await conn.QuerySingleAsync<DbContractRow>(
                """
                INSERT INTO income_contracts (
                    title, contract_type, service_type, status, client_id, client_name,
                    proposal_id, category_id, pnl_center_id, currency, total_value,
                    vat_applicable, vat_percentage, payment_terms_days,
                    start_date, end_date, retainer_monthly_amount, retainer_billing_day,
                    notes, tags, created_by
                ) VALUES (
                    @Title, @ContractType, @ServiceType, 'active', @ClientId, @ClientName,
                    NULL, @CategoryId, @PnlCenterId, @Currency, @TotalValue,
                    @VatApplicable, @VatPercentage, @PaymentTermsDays,
                    @StartDate::date, @EndDate::date, @RetainerMonthlyAmount, @RetainerBillingDay,
                    @Notes, @Tags, @CreatedBy
                )
                RETURNING *,
                    0::decimal as total_paid, 0::decimal as total_outstanding,
                    0 as overdue_count, 0 as upcoming_count,
                    0 as milestone_count, 0 as paid_count
                """,
                new
                {
                    Title = overrides.Title ?? source.title + " (Copy)",
                    ContractType = source.contract_type,
                    ServiceType = source.service_type,
                    ClientId = resolvedDupClientId,
                    ClientName = dupClientName,
                    CategoryId = source.category_id,
                    PnlCenterId = source.pnl_center_id,
                    Currency = overrides.Currency ?? source.currency,
                    TotalValue = overrides.TotalValue ?? source.total_value,
                    VatApplicable = source.vat_applicable,
                    VatPercentage = source.vat_percentage,
                    PaymentTermsDays = source.payment_terms_days,
                    StartDate = overrides.StartDate ?? source.start_date?.ToString("yyyy-MM-dd"),
                    EndDate = overrides.EndDate ?? source.end_date?.ToString("yyyy-MM-dd"),
                    RetainerMonthlyAmount = source.retainer_monthly_amount,
                    RetainerBillingDay = source.retainer_billing_day,
                    Notes = overrides.Notes ?? source.notes,
                    Tags = source.tags ?? [],
                    CreatedBy = userId,
                }, tx);

            // Duplicate milestones (reset statuses)
            List<DbMilestoneRow> sourceMilestones = [];
            if (overrides.CopyMilestones)
                sourceMilestones = (await conn.QueryAsync<DbMilestoneRow>(
                    "SELECT * FROM income_milestones WHERE contract_id = @Id ORDER BY sort_order, due_date",
                    new { Id = sourceId }, tx)).ToList();

            var newMilestones = new List<IncomeMilestoneDto>();
            foreach (var sm in sourceMilestones)
            {
                var mRow = await conn.QuerySingleAsync<DbMilestoneRow>(
                    """
                    INSERT INTO income_milestones (
                        contract_id, sort_order, description, amount_due, currency, due_date, notes
                    ) VALUES (
                        @ContractId, @SortOrder, @Description, @AmountDue, @Currency, @DueDate::date, @Notes
                    )
                    RETURNING *
                    """,
                    new
                    {
                        ContractId = row.id,
                        SortOrder = sm.sort_order,
                        Description = sm.description,
                        AmountDue = sm.amount_due,
                        Currency = row.currency,
                        DueDate = sm.due_date.ToString("yyyy-MM-dd"),
                        Notes = sm.notes,
                    }, tx);

                newMilestones.Add(MapMilestone(mRow));
            }

            await tx.CommitAsync();

            var dto = MapContractDetail(row);
            dto.Milestones = newMilestones;
            return dto;
        }
        catch
        {
            await tx.RollbackAsync();
            throw;
        }
    }

    // ── Milestones ────────────────────────────────────────────────────────────

    public async Task<List<IncomeMilestoneDto>> GetMilestonesAsync(Guid contractId)
    {
        await using var conn = _db.CreateConnection();
        await conn.OpenAsync();
        return await GetMilestonesInternalAsync(conn, contractId);
    }

    public async Task<IncomeMilestoneDto> CreateMilestoneAsync(Guid contractId, CreateMilestoneRequest request)
    {
        await using var conn = _db.CreateConnection();
        await conn.OpenAsync();

        var contract = await conn.QuerySingleOrDefaultAsync<DbContractRow>(
            """
            SELECT *, 0::decimal as total_paid, 0::decimal as total_outstanding,
                0 as overdue_count, 0 as upcoming_count, 0 as milestone_count, 0 as paid_count
            FROM income_contracts WHERE id = @Id
            """,
            new { Id = contractId });

        if (contract == null)
            throw new AppException("Contract not found", 404, "NOT_FOUND");

        // Validate: sum of existing milestones + new amount must not exceed contract total
        if (contract.total_value > 0)
        {
            var existingTotal = await conn.ExecuteScalarAsync<decimal>(
                "SELECT COALESCE(SUM(amount_due), 0) FROM income_milestones WHERE contract_id = @ContractId",
                new { ContractId = contractId });

            if (existingTotal + request.AmountDue > contract.total_value)
                throw new AppException(
                    $"Milestone amount exceeds contract value. " +
                    $"Already allocated: {existingTotal:F2} {contract.currency}, " +
                    $"contract total: {contract.total_value:F2} {contract.currency}",
                    400, "MILESTONE_EXCEEDS_CONTRACT");
        }

        var row = await conn.QuerySingleAsync<DbMilestoneRow>(
            """
            INSERT INTO income_milestones (contract_id, description, amount_due, currency, due_date, sort_order, notes)
            VALUES (@ContractId, @Description, @AmountDue, @Currency, @DueDate::date, @SortOrder, @Notes)
            RETURNING *
            """,
            new
            {
                ContractId = contractId,
                request.Description,
                request.AmountDue,
                Currency = contract.currency,
                DueDate = request.DueDate,
                SortOrder = request.SortOrder,
                request.Notes,
            });

        return MapMilestone(row, contract.title, contract.client_name);
    }

    public async Task<IncomeMilestoneDto> UpdateMilestoneAsync(Guid milestoneId, UpdateMilestoneRequest request)
    {
        await using var conn = _db.CreateConnection();
        await conn.OpenAsync();

        var existing = await conn.QuerySingleOrDefaultAsync<DbMilestoneRow>(
            "SELECT m.*, ic.title as contract_title, ic.client_name FROM income_milestones m JOIN income_contracts ic ON ic.id = m.contract_id WHERE m.id = @Id",
            new { Id = milestoneId });

        if (existing == null)
            throw new AppException("Milestone not found", 404, "NOT_FOUND");

        var sets = new List<string>();
        var p = new DynamicParameters();
        p.Add("Id", milestoneId);

        if (request.Description != null) { sets.Add("description = @Description"); p.Add("Description", request.Description); }
        if (request.AmountDue != null)
        {
            // Validate: sum of OTHER milestones + new amount must not exceed contract total
            var contractTotal = await conn.ExecuteScalarAsync<decimal>(
                "SELECT total_value FROM income_contracts WHERE id = @Id",
                new { Id = existing.contract_id });

            if (contractTotal > 0)
            {
                var otherTotal = await conn.ExecuteScalarAsync<decimal>(
                    "SELECT COALESCE(SUM(amount_due), 0) FROM income_milestones WHERE contract_id = @ContractId AND id != @MilestoneId",
                    new { ContractId = existing.contract_id, MilestoneId = milestoneId });

                if (otherTotal + request.AmountDue > contractTotal)
                    throw new AppException(
                        $"Milestone amount exceeds contract value. " +
                        $"Other milestones total: {otherTotal:F2}, contract total: {contractTotal:F2}",
                        400, "MILESTONE_EXCEEDS_CONTRACT");
            }

            sets.Add("amount_due = @AmountDue"); p.Add("AmountDue", request.AmountDue);
        }
        if (request.DueDate != null) { sets.Add("due_date = @DueDate::date"); p.Add("DueDate", request.DueDate); }
        if (request.Status != null && request.Status != "paid") // paid only via mark-paid
        {
            sets.Add("status = @Status");
            p.Add("Status", request.Status);
        }
        if (request.ProformaInvoiceNumber != null) { sets.Add("proforma_invoice_number = @ProformaInvoiceNumber"); p.Add("ProformaInvoiceNumber", request.ProformaInvoiceNumber); }
        if (request.ProformaInvoiceDate != null) { sets.Add("proforma_invoice_date = @ProformaInvoiceDate::date"); p.Add("ProformaInvoiceDate", request.ProformaInvoiceDate); }
        if (request.ProformaAmount != null) { sets.Add("proforma_amount = @ProformaAmount"); p.Add("ProformaAmount", request.ProformaAmount); }
        if (request.TaxInvoiceNumber != null) { sets.Add("tax_invoice_number = @TaxInvoiceNumber"); p.Add("TaxInvoiceNumber", request.TaxInvoiceNumber); }
        if (request.TaxInvoiceDate != null) { sets.Add("tax_invoice_date = @TaxInvoiceDate::date"); p.Add("TaxInvoiceDate", request.TaxInvoiceDate); }
        if (request.Notes != null) { sets.Add("notes = @Notes"); p.Add("Notes", request.Notes); }
        if (request.SortOrder != null) { sets.Add("sort_order = @SortOrder"); p.Add("SortOrder", request.SortOrder); }

        if (sets.Count == 0)
            return MapMilestone(existing, existing.contract_title, existing.client_name);

        var updated = await conn.QuerySingleAsync<DbMilestoneRow>(
            $"UPDATE income_milestones SET {string.Join(", ", sets)} WHERE id = @Id RETURNING *, null::text as contract_title, null::text as client_name",
            p);

        return MapMilestone(updated, existing.contract_title, existing.client_name);
    }

    public async Task DeleteMilestoneAsync(Guid milestoneId)
    {
        await using var conn = _db.CreateConnection();
        await conn.OpenAsync();

        var existing = await conn.QuerySingleOrDefaultAsync<DbMilestoneRow>(
            "SELECT * FROM income_milestones WHERE id = @Id", new { Id = milestoneId });

        if (existing == null)
            throw new AppException("Milestone not found", 404, "NOT_FOUND");

        if (existing.status == "paid")
            throw new AppException("Cannot delete a paid milestone", 400, "BAD_REQUEST");

        await conn.ExecuteAsync("DELETE FROM income_milestones WHERE id = @Id", new { Id = milestoneId });
    }

    // ── Generate retainer milestones ──────────────────────────────────────────

    public async Task<List<IncomeMilestoneDto>> GenerateRetainerMilestonesAsync(
        Guid contractId, GenerateRetainerMilestonesRequest request, Guid userId)
    {
        await using var conn = _db.CreateConnection();
        await conn.OpenAsync();

        var contract = await conn.QuerySingleOrDefaultAsync<DbContractRow>(
            """
            SELECT *, 0::decimal as total_paid, 0::decimal as total_outstanding,
                0 as overdue_count, 0 as upcoming_count, 0 as milestone_count, 0 as paid_count
            FROM income_contracts WHERE id = @Id
            """,
            new { Id = contractId });

        if (contract == null)
            throw new AppException("Contract not found", 404, "NOT_FOUND");

        if (contract.contract_type != "retainer")
            throw new AppException("Only retainer contracts support milestone generation", 400, "VALIDATION_ERROR");

        if (contract.retainer_monthly_amount == null)
            throw new AppException("Retainer monthly amount is not set on this contract", 400, "VALIDATION_ERROR");

        var startDate = DateOnly.Parse(request.StartDate);
        var billingDay = contract.retainer_billing_day ?? startDate.Day;
        var monthlyAmount = contract.retainer_monthly_amount.Value;

        // Get max existing sort_order
        var maxSort = await conn.ExecuteScalarAsync<int?>(
            "SELECT MAX(sort_order) FROM income_milestones WHERE contract_id = @ContractId",
            new { ContractId = contractId }) ?? 0;

        var toInsert = new List<CreateMilestoneRequest>();
        for (var i = 0; i < request.MonthCount; i++)
        {
            var totalMonths = startDate.Month - 1 + i;
            var year = startDate.Year + totalMonths / 12;
            var month = totalMonths % 12 + 1;
            var day = Math.Min(billingDay, DateTime.DaysInMonth(year, month));
            var billingDate = new DateOnly(year, month, day);
            var dueDate = billingDate.AddDays(contract.payment_terms_days);

            toInsert.Add(new CreateMilestoneRequest
            {
                Description = $"Retainer – {billingDate:MMMM yyyy}",
                AmountDue = monthlyAmount,
                DueDate = dueDate.ToString("yyyy-MM-dd"),
                SortOrder = maxSort + i + 1,
            });
        }

        await using var tx = await conn.BeginTransactionAsync();
        try
        {
            var result = await InsertMilestonesAsync(conn, tx, contractId, toInsert, contract.currency);
            await tx.CommitAsync();
            return result;
        }
        catch
        {
            await tx.RollbackAsync();
            throw;
        }
    }

    // ── Mark milestone paid ───────────────────────────────────────────────────

    public async Task<IncomeMilestoneDto> MarkMilestonePaidAsync(
        Guid milestoneId, MarkMilestonePaidRequest request, Guid userId)
    {
        await using var conn = _db.CreateConnection();
        await conn.OpenAsync();

        var milestone = await conn.QuerySingleOrDefaultAsync<DbMilestoneRow>(
            "SELECT * FROM income_milestones WHERE id = @Id", new { Id = milestoneId });

        if (milestone == null)
            throw new AppException("Milestone not found", 404, "NOT_FOUND");

        if (milestone.status == "paid")
            throw new AppException("Milestone is already marked as paid", 400, "BAD_REQUEST");

        var contract = await conn.QuerySingleOrDefaultAsync<DbContractRow>(
            """
            SELECT *, 0::decimal as total_paid, 0::decimal as total_outstanding,
                0 as overdue_count, 0 as upcoming_count, 0 as milestone_count, 0 as paid_count
            FROM income_contracts WHERE id = @Id
            """,
            new { Id = milestone.contract_id });

        if (contract == null)
            throw new AppException("Contract not found", 404, "NOT_FOUND");

        var actualAmount = request.ActualAmountPaid ?? milestone.amount_due;

        // Merge invoice data: request values take precedence over what was already on the milestone
        var proformaInvoiceNumber = request.ProformaInvoiceNumber ?? milestone.proforma_invoice_number;
        var proformaInvoiceDate   = request.ProformaInvoiceDate   ?? milestone.proforma_invoice_date?.ToString("yyyy-MM-dd");
        var taxInvoiceNumber      = request.TaxInvoiceNumber      ?? milestone.tax_invoice_number;
        var taxInvoiceDate        = request.TaxInvoiceDate        ?? milestone.tax_invoice_date?.ToString("yyyy-MM-dd");

        // Create the income record
        var incomeRequest = new CreateIncomeRequest
        {
            Description = $"{contract.title} – {milestone.description}",
            Amount = actualAmount,
            Currency = milestone.currency,
            CategoryId = contract.category_id,
            ClientId = contract.client_id,
            ClientName = contract.client_name,
            IncomeDate = request.PaymentReceivedDate,
            InvoiceNumber = taxInvoiceNumber ?? proformaInvoiceNumber,
            InvoiceType = taxInvoiceNumber != null ? "tax" : (proformaInvoiceNumber != null ? "proforma" : "standard"),
            InvoiceStatus = "paid",
            PaymentReceivedDate = request.PaymentReceivedDate,
            PaymentMethod = request.PaymentMethod,
            ProformaInvoiceDate = proformaInvoiceDate,
            TaxInvoiceDate = taxInvoiceDate,
            VatApplicable = contract.vat_applicable,
            VatPercentage = contract.vat_percentage,
            // If no allocations were explicitly provided but the contract is
            // linked to a P&L center, auto-allocate 100% to that center so the
            // income shows up in the P&L breakdown.
            Allocations = request.Allocations.Count > 0
                ? request.Allocations
                : contract.pnl_center_id.HasValue
                    ? [new AllocationInput { PnlCenterId = contract.pnl_center_id.Value, Percentage = 100 }]
                    : [],
        };

        var incomeDto = await _incomeService.CreateAsync(incomeRequest, userId);

        // Update the milestone — also write back invoice fields if supplied in the request
        var updated = await conn.QuerySingleAsync<DbMilestoneRow>(
            """
            UPDATE income_milestones SET
                status = 'paid',
                income_id = @IncomeId,
                payment_received_date = @PaymentReceivedDate::date,
                payment_method = @PaymentMethod,
                actual_amount_paid = @ActualAmountPaid,
                proforma_invoice_number = COALESCE(@ProformaInvoiceNumber, proforma_invoice_number),
                proforma_invoice_date   = COALESCE(@ProformaInvoiceDate::date, proforma_invoice_date),
                tax_invoice_number      = COALESCE(@TaxInvoiceNumber, tax_invoice_number),
                tax_invoice_date        = COALESCE(@TaxInvoiceDate::date, tax_invoice_date)
            WHERE id = @Id
            RETURNING *, null::text as contract_title, null::text as client_name
            """,
            new
            {
                IncomeId = incomeDto.Id,
                PaymentReceivedDate = request.PaymentReceivedDate,
                PaymentMethod = request.PaymentMethod,
                ActualAmountPaid = actualAmount,
                ProformaInvoiceNumber = proformaInvoiceNumber,
                ProformaInvoiceDate = proformaInvoiceDate,
                TaxInvoiceNumber = taxInvoiceNumber,
                TaxInvoiceDate = taxInvoiceDate,
                Id = milestoneId,
            });

        _logger.LogInformation(
            "Milestone {MilestoneId} marked paid, income record {IncomeId} created",
            milestoneId, incomeDto.Id);

        return MapMilestone(updated, contract.title, contract.client_name);
    }

    // ── Unmark milestone paid ─────────────────────────────────────────────────

    public async Task<IncomeMilestoneDto> UnmarkMilestonePaidAsync(Guid milestoneId, Guid userId)
    {
        await using var conn = _db.CreateConnection();
        await conn.OpenAsync();

        var milestone = await conn.QuerySingleOrDefaultAsync<DbMilestoneRow>(
            "SELECT * FROM income_milestones WHERE id = @Id", new { Id = milestoneId });

        if (milestone == null)
            throw new AppException("Milestone not found", 404, "NOT_FOUND");

        if (milestone.status != "paid")
            throw new AppException("Milestone is not marked as paid", 400, "BAD_REQUEST");

        var contract = await conn.QuerySingleOrDefaultAsync<DbContractRow>(
            """
            SELECT *, 0::decimal as total_paid, 0::decimal as total_outstanding,
                0 as overdue_count, 0 as upcoming_count, 0 as milestone_count, 0 as paid_count
            FROM income_contracts WHERE id = @Id
            """,
            new { Id = milestone.contract_id });

        if (contract == null)
            throw new AppException("Contract not found", 404, "NOT_FOUND");

        await using var tx = await conn.BeginTransactionAsync();
        try
        {
            // Delete the linked income record
            if (milestone.income_id.HasValue)
                await conn.ExecuteAsync(
                    "DELETE FROM income WHERE id = @IncomeId",
                    new { IncomeId = milestone.income_id.Value }, tx);

            // Reset milestone: revert status based on due date
            var updated = await conn.QuerySingleAsync<DbMilestoneRow>(
                """
                UPDATE income_milestones SET
                    status = CASE WHEN due_date < CURRENT_DATE THEN 'overdue' ELSE 'pending' END,
                    income_id = NULL,
                    payment_received_date = NULL,
                    payment_method = NULL,
                    actual_amount_paid = NULL
                WHERE id = @Id
                RETURNING *, null::text as contract_title, null::text as client_name
                """,
                new { Id = milestoneId }, tx);

            await conn.ExecuteAsync(
                "INSERT INTO audit_logs (user_id, action, entity_type, entity_id) VALUES (@UserId, @Action, @EntityType, @EntityId)",
                new { UserId = userId, Action = "unmark_paid", EntityType = "milestone", EntityId = milestoneId }, tx);

            await tx.CommitAsync();

            _logger.LogInformation("Milestone {MilestoneId} payment reverted by user {UserId}", milestoneId, userId);

            return MapMilestone(updated, contract.title, contract.client_name);
        }
        catch
        {
            await tx.RollbackAsync();
            throw;
        }
    }

    // ── Proposal → Contract conversion ────────────────────────────────────────

    public async Task<IncomeContractDto> ConvertProposalAsync(
        ConvertProposalToContractRequest request, Guid userId)
    {
        await using var conn = _db.CreateConnection();
        await conn.OpenAsync();

        var proposal = await conn.QuerySingleOrDefaultAsync<DbProposalMinRow>(
            "SELECT id, title, client_id, client_name, total, currency, status, converted_to_contract_id FROM proposals WHERE id = @Id",
            new { Id = request.ProposalId });

        if (proposal == null)
            throw new AppException("Proposal not found", 404, "NOT_FOUND");

        if (proposal.status != "accepted")
            throw new AppException("Only accepted proposals can be converted to contracts", 400, "VALIDATION_ERROR");

        if (proposal.converted_to_contract_id != null)
            throw new AppException("Proposal is already linked to a contract", 409, "CONFLICT");

        // Get client payment terms if available
        var paymentTerms = request.PaymentTermsDays ?? 30;
        if (proposal.client_id.HasValue)
        {
            var clientTerms = await conn.ExecuteScalarAsync<int?>(
                "SELECT payment_terms FROM clients WHERE id = @Id",
                new { Id = proposal.client_id.Value });
            if (clientTerms.HasValue)
                paymentTerms = clientTerms.Value;
        }

        await using var tx = await conn.BeginTransactionAsync();
        try
        {
            var row = await conn.QuerySingleAsync<DbContractRow>(
                """
                INSERT INTO income_contracts (
                    title, contract_type, status, client_id, client_name,
                    proposal_id, currency, total_value, payment_terms_days,
                    start_date, end_date, retainer_monthly_amount, retainer_billing_day,
                    created_by
                ) VALUES (
                    @Title, @ContractType, 'active', @ClientId, @ClientName,
                    @ProposalId, @Currency, @TotalValue, @PaymentTermsDays,
                    @StartDate::date, @EndDate::date, @RetainerMonthlyAmount, @RetainerBillingDay,
                    @CreatedBy
                )
                RETURNING *,
                    0::decimal as total_paid, 0::decimal as total_outstanding,
                    0 as overdue_count, 0 as upcoming_count,
                    0 as milestone_count, 0 as paid_count
                """,
                new
                {
                    Title = request.Title ?? proposal.title ?? "Contract",
                    ContractType = request.ContractType,
                    ClientId = proposal.client_id,
                    ClientName = proposal.client_name,
                    ProposalId = proposal.id,
                    Currency = proposal.currency,
                    TotalValue = proposal.total,
                    PaymentTermsDays = paymentTerms,
                    StartDate = request.StartDate,
                    EndDate = request.EndDate,
                    RetainerMonthlyAmount = request.RetainerMonthlyAmount,
                    RetainerBillingDay = request.RetainerBillingDay,
                    CreatedBy = userId,
                }, tx);

            // Mark proposal as converted
            await conn.ExecuteAsync(
                "UPDATE proposals SET status = 'converted', converted_to_contract_id = @ContractId, status_changed_at = NOW() WHERE id = @ProposalId",
                new { ContractId = row.id, ProposalId = proposal.id }, tx);

            var milestones = new List<IncomeMilestoneDto>();

            if (request.Milestones.Count > 0)
                milestones = await InsertMilestonesAsync(conn, tx, row.id, request.Milestones, row.currency);

            await tx.CommitAsync();

            // Generate retainer milestones after commit if needed
            if (request.ContractType == "retainer"
                && request.RetainerMonthCount.HasValue
                && request.RetainerMonthCount > 0
                && !string.IsNullOrEmpty(request.StartDate))
            {
                milestones = await GenerateRetainerMilestonesAsync(row.id,
                    new GenerateRetainerMilestonesRequest
                    {
                        StartDate = request.StartDate,
                        MonthCount = request.RetainerMonthCount.Value,
                    }, userId);
            }

            var dto = MapContractDetail(row);
            dto.Milestones = milestones;
            return dto;
        }
        catch
        {
            await tx.RollbackAsync();
            throw;
        }
    }

    // ── Alerts ────────────────────────────────────────────────────────────────

    public async Task<List<IncomeMilestoneDto>> GetUpcomingMilestonesAsync(int days = 7)
    {
        await using var conn = _db.CreateConnection();
        await conn.OpenAsync();

        var rows = await conn.QueryAsync<DbMilestoneRow>(
            """
            SELECT m.*, ic.title as contract_title, ic.client_name
            FROM income_milestones m
            JOIN income_contracts ic ON ic.id = m.contract_id
            WHERE m.status != 'paid'
              AND m.due_date >= CURRENT_DATE
              AND m.due_date <= CURRENT_DATE + @Days
            ORDER BY m.due_date ASC
            """,
            new { Days = days });

        return rows.Select(r => MapMilestone(r, r.contract_title, r.client_name)).ToList();
    }

    public async Task<List<IncomeMilestoneDto>> GetOverdueMilestonesAsync()
    {
        await using var conn = _db.CreateConnection();
        await conn.OpenAsync();

        var rows = await conn.QueryAsync<DbMilestoneRow>(
            """
            SELECT m.*, ic.title as contract_title, ic.client_name
            FROM income_milestones m
            JOIN income_contracts ic ON ic.id = m.contract_id
            WHERE m.status != 'paid'
              AND m.due_date < CURRENT_DATE
            ORDER BY m.due_date ASC
            """);

        return rows.Select(r => MapMilestone(r, r.contract_title, r.client_name, forceOverdue: true)).ToList();
    }

    public async Task<List<IncomeMilestoneDto>> GetOutstandingMilestonesAsync()
    {
        await using var conn = _db.CreateConnection();
        await conn.OpenAsync();

        var rows = await conn.QueryAsync<DbMilestoneRow>(
            """
            SELECT m.*, ic.title as contract_title, ic.client_name
            FROM income_milestones m
            JOIN income_contracts ic ON ic.id = m.contract_id
            WHERE m.status != 'paid'
              AND ic.status IN ('active', 'on_hold')
            ORDER BY m.due_date ASC
            """);

        return rows.Select(r => MapMilestone(r, r.contract_title, r.client_name)).ToList();
    }

    public async Task<List<IncomeMilestoneDto>> GetPaidMilestonesAsync(int limit = 200)
    {
        await using var conn = _db.CreateConnection();
        await conn.OpenAsync();

        var rows = await conn.QueryAsync<DbMilestoneRow>(
            """
            SELECT m.*, ic.title as contract_title, ic.client_name
            FROM income_milestones m
            JOIN income_contracts ic ON ic.id = m.contract_id
            WHERE m.status = 'paid'
              AND ic.status IN ('active', 'on_hold')
            ORDER BY COALESCE(m.payment_received_date, m.due_date) DESC
            LIMIT @Limit
            """,
            new { Limit = limit });

        return rows.Select(r => MapMilestone(r, r.contract_title, r.client_name)).ToList();
    }

    // ── Projections ───────────────────────────────────────────────────────────

    public async Task<List<MilestoneProjectionDto>> GetProjectionsAsync(int months = 12)
    {
        await using var conn = _db.CreateConnection();
        await conn.OpenAsync();

        var rows = await conn.QueryAsync<dynamic>(
            """
            SELECT
                to_char(m.due_date, 'YYYY-MM') as month,
                SUM(m.amount_due) as projected_amount,
                COUNT(*) as milestone_count,
                SUM(CASE WHEN m.due_date < CURRENT_DATE THEN m.amount_due ELSE 0 END) as overdue_amount
            FROM income_milestones m
            JOIN income_contracts ic ON ic.id = m.contract_id
            WHERE m.status != 'paid'
              AND ic.status = 'active'
              AND m.due_date <= CURRENT_DATE + (@Months * INTERVAL '1 month')
            GROUP BY to_char(m.due_date, 'YYYY-MM')
            ORDER BY month ASC
            """,
            new { Months = months });

        return rows.Select(r => new MilestoneProjectionDto
        {
            Month = (string)r.month,
            ProjectedAmount = (decimal)r.projected_amount,
            MilestoneCount = (int)r.milestone_count,
            OverdueAmount = (decimal)r.overdue_amount,
        }).ToList();
    }

    // =============================================
    // Private helpers
    // =============================================

    private async Task<List<IncomeMilestoneDto>> GetMilestonesInternalAsync(
        Npgsql.NpgsqlConnection conn, Guid contractId)
    {
        var contract = await conn.QuerySingleOrDefaultAsync<DbContractRow>(
            """
            SELECT *, 0::decimal as total_paid, 0::decimal as total_outstanding,
                0 as overdue_count, 0 as upcoming_count, 0 as milestone_count, 0 as paid_count
            FROM income_contracts WHERE id = @Id
            """,
            new { Id = contractId });

        var rows = await conn.QueryAsync<DbMilestoneRow>(
            "SELECT m.*, null::text as contract_title, null::text as client_name FROM income_milestones m WHERE m.contract_id = @ContractId ORDER BY m.sort_order, m.due_date",
            new { ContractId = contractId });

        return rows.Select(r => MapMilestone(r, contract?.title, contract?.client_name)).ToList();
    }

    private static async Task<List<IncomeMilestoneDto>> InsertMilestonesAsync(
        Npgsql.NpgsqlConnection conn,
        Npgsql.NpgsqlTransaction tx,
        Guid contractId,
        List<CreateMilestoneRequest> milestones,
        string currency)
    {
        var result = new List<IncomeMilestoneDto>();
        foreach (var m in milestones)
        {
            var row = await conn.QuerySingleAsync<DbMilestoneRow>(
                """
                INSERT INTO income_milestones (contract_id, description, amount_due, currency, due_date, sort_order, notes)
                VALUES (@ContractId, @Description, @AmountDue, @Currency, @DueDate::date, @SortOrder, @Notes)
                RETURNING *, null::text as contract_title, null::text as client_name
                """,
                new
                {
                    ContractId = contractId,
                    m.Description,
                    m.AmountDue,
                    Currency = currency,
                    DueDate = m.DueDate,
                    SortOrder = m.SortOrder,
                    m.Notes,
                }, tx);
            result.Add(MapMilestone(row));
        }
        return result;
    }

    private static string ComputeMilestoneStatus(string stored, DateTime dueDate, bool forceOverdue = false)
    {
        if (stored == "paid") return "paid";
        if (forceOverdue || dueDate.Date < DateTime.UtcNow.Date) return "overdue";
        return stored;
    }

    private static IncomeMilestoneDto MapMilestone(
        DbMilestoneRow r,
        string? contractTitle = null,
        string? clientName = null,
        bool forceOverdue = false) => new()
    {
        Id = r.id,
        ContractId = r.contract_id,
        ContractTitle = contractTitle ?? r.contract_title,
        ClientName = clientName ?? r.client_name,
        SortOrder = r.sort_order,
        Description = r.description,
        AmountDue = r.amount_due,
        Currency = r.currency,
        DueDate = r.due_date.ToString("yyyy-MM-dd"),
        Status = ComputeMilestoneStatus(r.status, r.due_date, forceOverdue),
        ProformaInvoiceNumber = r.proforma_invoice_number,
        ProformaInvoiceDate = r.proforma_invoice_date?.ToString("yyyy-MM-dd"),
        ProformaAmount = r.proforma_amount,
        TaxInvoiceNumber = r.tax_invoice_number,
        TaxInvoiceDate = r.tax_invoice_date?.ToString("yyyy-MM-dd"),
        PaymentReceivedDate = r.payment_received_date?.ToString("yyyy-MM-dd"),
        PaymentMethod = r.payment_method,
        ActualAmountPaid = r.actual_amount_paid,
        IncomeId = r.income_id,
        Notes = r.notes,
        Attachments = DeserializeAttachments(r.attachments),
        CreatedAt = r.created_at,
        UpdatedAt = r.updated_at,
    };

    private static IncomeContractSummaryDto MapContractSummary(DbContractRow r) => new()
    {
        Id = r.id,
        Title = r.title,
        ContractNumber = r.contract_number,
        ContractType = r.contract_type,
        ServiceType = r.service_type,
        Status = r.status,
        ClientId = r.client_id,
        ClientName = r.client_name,
        Currency = r.currency,
        TotalValue = r.total_value,
        TotalPaid = r.total_paid,
        TotalOutstanding = r.total_outstanding,
        OverdueCount = r.overdue_count,
        UpcomingCount = r.upcoming_count,
        MilestoneCount = r.milestone_count,
        PaidCount = r.paid_count,
        StartDate = r.start_date?.ToString("yyyy-MM-dd"),
        EndDate = r.end_date?.ToString("yyyy-MM-dd"),
        CreatedAt = r.created_at,
        UpdatedAt = r.updated_at,
    };

    private static IncomeContractDto MapContractDetail(DbContractRow r)
    {
        var s = MapContractSummary(r);
        return new IncomeContractDto
        {
            Id = s.Id,
            Title = s.Title,
            ContractNumber = s.ContractNumber,
            ContractType = s.ContractType,
            ServiceType = s.ServiceType,
            Status = s.Status,
            ClientId = s.ClientId,
            ClientName = s.ClientName,
            Currency = s.Currency,
            TotalValue = s.TotalValue,
            TotalPaid = s.TotalPaid,
            TotalOutstanding = s.TotalOutstanding,
            OverdueCount = s.OverdueCount,
            UpcomingCount = s.UpcomingCount,
            MilestoneCount = s.MilestoneCount,
            PaidCount = s.PaidCount,
            StartDate = s.StartDate,
            EndDate = s.EndDate,
            CreatedAt = s.CreatedAt,
            UpdatedAt = s.UpdatedAt,
            ProposalId = r.proposal_id,
            CategoryId = r.category_id,
            PnlCenterId = r.pnl_center_id,
            VatApplicable = r.vat_applicable,
            VatPercentage = r.vat_percentage,
            PaymentTermsDays = r.payment_terms_days,
            RetainerMonthlyAmount = r.retainer_monthly_amount,
            RetainerBillingDay = r.retainer_billing_day,
            Notes = r.notes,
            Tags = r.tags ?? [],
            CreatedBy = r.created_by,
            Attachments = DeserializeAttachments(r.attachments),
            Milestones = [],
        };
    }

    private static List<ContractAttachmentDto> DeserializeAttachments(string? json)
    {
        if (string.IsNullOrEmpty(json)) return [];
        try { return System.Text.Json.JsonSerializer.Deserialize<List<ContractAttachmentDto>>(json) ?? []; }
        catch { return []; }
    }

    // ── Stats ─────────────────────────────────────────────────────────────────

    public async Task<ContractStatsDto> GetStatsAsync()
    {
        await using var conn = _db.CreateConnection();
        await conn.OpenAsync();

        var row = await conn.QuerySingleAsync<dynamic>("""
            SELECT
                COUNT(DISTINCT ic.id) as total_contracts,
                COUNT(DISTINCT ic.id) FILTER (WHERE ic.status = 'active') as active_contracts,
                COUNT(DISTINCT ic.id) FILTER (WHERE ic.status = 'completed') as completed_contracts,
                COALESCE(SUM(ic.total_value), 0) as total_value,
                COALESCE(SUM(CASE WHEN m.status = 'paid' THEN COALESCE(m.actual_amount_paid, m.amount_due) ELSE 0 END), 0) as total_collected,
                COALESCE(SUM(CASE WHEN m.status != 'paid' THEN m.amount_due ELSE 0 END), 0) as total_outstanding,
                COUNT(m.id) FILTER (WHERE m.status != 'paid' AND m.due_date < CURRENT_DATE) as overdue_payments,
                COALESCE(SUM(m.amount_due) FILTER (WHERE m.status != 'paid' AND m.due_date < CURRENT_DATE), 0) as overdue_amount
            FROM income_contracts ic
            LEFT JOIN income_milestones m ON m.contract_id = ic.id
            WHERE ic.status IN ('active', 'on_hold')
            """);

        return new ContractStatsDto
        {
            TotalContracts = (int)row.total_contracts,
            ActiveContracts = (int)row.active_contracts,
            CompletedContracts = (int)row.completed_contracts,
            TotalValue = (decimal)row.total_value,
            TotalCollected = (decimal)row.total_collected,
            TotalOutstanding = (decimal)row.total_outstanding,
            OverduePayments = (int)row.overdue_payments,
            OverdueAmount = (decimal)row.overdue_amount,
        };
    }

    // ── By Client ─────────────────────────────────────────────────────────────

    public async Task<List<ClientContractStatsDto>> GetByClientAsync(string? search, string? status, string? startDate = null, string? endDate = null)
    {
        await using var conn = _db.CreateConnection();
        await conn.OpenAsync();

        var where = new List<string>();
        var p = new DynamicParameters();

        if (!string.IsNullOrWhiteSpace(status))
        {
            where.Add("ic.status = @Status");
            p.Add("Status", status);
        }
        if (!string.IsNullOrWhiteSpace(search))
        {
            where.Add("LOWER(COALESCE(ic.client_name, '')) LIKE @Search");
            p.Add("Search", $"%{search.ToLower()}%");
        }
        if (!string.IsNullOrWhiteSpace(startDate))
        {
            where.Add("ic.created_at >= @StartDate::date");
            p.Add("StartDate", startDate);
        }
        if (!string.IsNullOrWhiteSpace(endDate))
        {
            where.Add("ic.created_at < (@EndDate::date + INTERVAL '1 day')");
            p.Add("EndDate", endDate);
        }

        var whereClause = where.Count > 0 ? "WHERE " + string.Join(" AND ", where) : "";

        var sql = $"""
            SELECT
                ic.client_id,
                COALESCE(ic.client_name, 'Unknown Client') as client_name,
                COUNT(DISTINCT ic.id) as contract_count,
                COALESCE(SUM(ic.total_value), 0) as total_value,
                COALESCE(SUM(CASE WHEN m.status = 'paid' THEN COALESCE(m.actual_amount_paid, m.amount_due) ELSE 0 END), 0) as total_collected,
                COALESCE(SUM(CASE WHEN m.status != 'paid' THEN m.amount_due ELSE 0 END), 0) as total_outstanding,
                COUNT(m.id) FILTER (WHERE m.status != 'paid' AND m.due_date < CURRENT_DATE) as overdue_count,
                COALESCE(SUM(m.amount_due) FILTER (WHERE m.status != 'paid' AND m.due_date < CURRENT_DATE), 0) as overdue_amount,
                MAX(ic.created_at)::date as latest_contract_date
            FROM income_contracts ic
            LEFT JOIN income_milestones m ON m.contract_id = ic.id
            {whereClause}
            GROUP BY ic.client_id, ic.client_name
            ORDER BY total_value DESC
            """;

        var rows = await conn.QueryAsync<dynamic>(sql, p);
        return rows.Select(r => new ClientContractStatsDto
        {
            ClientId = r.client_id,
            ClientName = (string)r.client_name,
            ContractCount = (int)r.contract_count,
            TotalValue = (decimal)r.total_value,
            TotalCollected = (decimal)r.total_collected,
            TotalOutstanding = (decimal)r.total_outstanding,
            OverdueCount = (int)r.overdue_count,
            OverdueAmount = (decimal)r.overdue_amount,
            LatestContractDate = r.latest_contract_date != null ? ((DateTime)r.latest_contract_date).ToString("yyyy-MM-dd") : null,
        }).ToList();
    }

    // ── Attachments ───────────────────────────────────────────────────────────

    public async Task<IncomeContractDto> PatchContractAttachmentsAsync(Guid contractId, List<ContractAttachmentDto> attachments)
    {
        await using var conn = _db.CreateConnection();
        await conn.OpenAsync();

        var json = System.Text.Json.JsonSerializer.Serialize(attachments);
        var affected = await conn.ExecuteAsync(
            "UPDATE income_contracts SET attachments = @Json::jsonb, updated_at = NOW() WHERE id = @Id",
            new { Json = json, Id = contractId });

        if (affected == 0)
            throw new AppException("Contract not found", 404, "NOT_FOUND");

        return (await GetByIdAsync(contractId))!;
    }

    public async Task<IncomeMilestoneDto> PatchMilestoneAttachmentsAsync(Guid milestoneId, List<ContractAttachmentDto> attachments)
    {
        await using var conn = _db.CreateConnection();
        await conn.OpenAsync();

        var json = System.Text.Json.JsonSerializer.Serialize(attachments);
        var row = await conn.QuerySingleOrDefaultAsync<DbMilestoneRow>(
            """
            UPDATE income_milestones SET attachments = @Json::jsonb, updated_at = NOW()
            WHERE id = @Id
            RETURNING *
            """,
            new { Json = json, Id = milestoneId });

        if (row == null)
            throw new AppException("Milestone not found", 404, "NOT_FOUND");

        var contract = await conn.QuerySingleOrDefaultAsync<DbContractRow>(
            """
            SELECT *, 0::decimal as total_paid, 0::decimal as total_outstanding,
                0 as overdue_count, 0 as upcoming_count, 0 as milestone_count, 0 as paid_count
            FROM income_contracts WHERE id = @Id
            """,
            new { Id = row.contract_id });

        return MapMilestone(row, contract?.title, contract?.client_name);
    }

    // ── Client auto-link ──────────────────────────────────────────────────────

    /// <summary>
    /// Given a free-text client name (and optional clientId), ensures a record
    /// exists in the clients table and returns its ID. If clientId is already
    /// provided and valid, returns it unchanged. Otherwise finds by name (exact,
    /// case-insensitive) or creates a minimal client record.
    /// </summary>
    private static async Task<Guid?> GetOrCreateClientIdAsync(
        Npgsql.NpgsqlConnection conn,
        Npgsql.NpgsqlTransaction tx,
        Guid? clientId,
        string? clientName,
        Guid userId)
    {
        if (string.IsNullOrWhiteSpace(clientName))
            return clientId;

        // If caller already provided a valid clientId, trust it
        if (clientId.HasValue)
        {
            var exists = await conn.ExecuteScalarAsync<int>(
                "SELECT COUNT(1) FROM clients WHERE id = @Id",
                new { Id = clientId.Value }, tx);
            if (exists > 0) return clientId;
        }

        // Look for an existing client with this name
        var existingId = await conn.ExecuteScalarAsync<Guid?>(
            "SELECT id FROM clients WHERE LOWER(TRIM(name)) = LOWER(TRIM(@Name)) OR LOWER(TRIM(company_name)) = LOWER(TRIM(@Name)) LIMIT 1",
            new { Name = clientName }, tx);

        if (existingId.HasValue) return existingId;

        // Create a minimal client record
        var newId = await conn.ExecuteScalarAsync<Guid>(
            """
            INSERT INTO clients (name, status, created_by)
            VALUES (@Name, 'active', @CreatedBy)
            RETURNING id
            """,
            new { Name = clientName.Trim(), CreatedBy = userId }, tx);

        return newId;
    }
}
