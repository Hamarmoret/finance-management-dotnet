using System.Text.Json.Serialization;
using FinanceManagement.Api.Models.Expenses;
using FinanceManagement.Api.Services.Analytics;
using FinanceManagement.Api.Services.Income;
using FinanceManagement.Api.Services.Pipeline;
using FinanceManagement.Api.Services.PnlCenters;

namespace FinanceManagement.Api.Models.Reports;

// =============================================
// Request DTO (from frontend)
// =============================================

public class ReportRequest
{
    [JsonPropertyName("startDate")]
    public string StartDate { get; set; } = string.Empty;

    [JsonPropertyName("endDate")]
    public string EndDate { get; set; } = string.Empty;

    /// <summary>
    /// Which pre-built template to render.
    /// Valid values: "full", "dashboard", "pnl", "contracts", "sales", "ai-custom".
    /// </summary>
    [JsonPropertyName("template")]
    public string Template { get; set; } = "full";

    /// <summary>
    /// Explicit list of section keys to include. If empty, the template's
    /// default section list is used. See ReportSections for valid keys.
    /// </summary>
    [JsonPropertyName("sections")]
    public List<string> Sections { get; set; } = [];

    /// <summary>
    /// Free-text user prompt for AI custom reports.
    /// Ignored when template != "ai-custom".
    /// </summary>
    [JsonPropertyName("prompt")]
    public string? Prompt { get; set; }

    [JsonPropertyName("includeAiSummary")]
    public bool IncludeAiSummary { get; set; } = true;
}

/// <summary>
/// Canonical section keys. Frontend mirror lives in Reports.tsx.
/// </summary>
public static class ReportSections
{
    public const string Kpis              = "kpis";
    public const string MonthlyBreakdown  = "monthly";
    public const string ExpenseCategories = "expenseCategories";
    public const string PnlCenters        = "pnlCenters";
    public const string ContractStats     = "contractStats";
    public const string TopClients        = "topClients";
    public const string OverdueMilestones = "overdueMilestones";
    public const string Projections       = "projections";
    public const string IncomeRows        = "incomeRows";
    public const string ExpenseRows       = "expenseRows";
    public const string SalesPipeline     = "salesPipeline";

    public static readonly string[] All =
    [
        Kpis, MonthlyBreakdown, ExpenseCategories, PnlCenters,
        ContractStats, TopClients, OverdueMilestones, Projections,
        IncomeRows, ExpenseRows, SalesPipeline,
    ];

    public static readonly Dictionary<string, string[]> TemplateDefaults = new()
    {
        ["full"]      = All,
        ["dashboard"] = [Kpis, MonthlyBreakdown, ExpenseCategories],
        ["pnl"]       = [Kpis, PnlCenters, MonthlyBreakdown],
        ["contracts"] = [Kpis, ContractStats, TopClients, OverdueMilestones, Projections],
        ["sales"]     = [SalesPipeline, TopClients],
        ["ai-custom"] = All,
    };
}

// =============================================
// Collected data (passed to PDF renderer + AI service)
// =============================================

public class ReportData
{
    public ReportPeriod Period { get; set; } = new();
    public string Template { get; set; } = "full";
    public List<string> Sections { get; set; } = [];
    public string? UserPrompt { get; set; }

    public DashboardSummaryDto? Kpis { get; set; }
    public List<MonthlyBreakdownDto>? Monthly { get; set; }
    public List<CategoryBreakdownDto>? ExpenseCategories { get; set; }
    public List<PnlCenterWithStatsDto>? PnlCenters { get; set; }
    public ContractStatsDto? ContractStats { get; set; }
    public List<ClientContractStatsDto>? TopClients { get; set; }
    public List<IncomeMilestoneDto>? OverdueMilestones { get; set; }
    public List<MilestoneProjectionDto>? Projections { get; set; }
    public List<IncomeDto>? IncomeRows { get; set; }
    public List<ExpenseDto>? ExpenseRows { get; set; }
    public List<LeadDto>? Leads { get; set; }
    public List<ProposalDto>? Proposals { get; set; }

    public AiSummary? AiSummary { get; set; }
}

public class ReportPeriod
{
    public DateTime StartDate { get; set; }
    public DateTime EndDate { get; set; }
    public DateTime GeneratedAt { get; set; } = DateTime.UtcNow;

    public string Label =>
        $"{StartDate:yyyy-MM-dd} — {EndDate:yyyy-MM-dd}";
}

public class AiSummary
{
    public string ExecutiveSummary { get; set; } = string.Empty;
    public List<string> KeyFindings { get; set; } = [];
    public List<string> Recommendations { get; set; } = [];
    public bool IsFallback { get; set; }
}
