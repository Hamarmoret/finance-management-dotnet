using System.Text.Json.Serialization;

namespace FinanceManagement.Api.Models.Analytics;

// =============================================
// DTOs (API contract - camelCase JSON)
// =============================================

public class DashboardSummaryDto
{
    [JsonPropertyName("totalIncome")]
    public decimal TotalIncome { get; set; }

    [JsonPropertyName("totalExpenses")]
    public decimal TotalExpenses { get; set; }

    [JsonPropertyName("netProfit")]
    public decimal NetProfit { get; set; }

    [JsonPropertyName("incomeChange")]
    public decimal IncomeChange { get; set; }

    [JsonPropertyName("expenseChange")]
    public decimal ExpenseChange { get; set; }

    [JsonPropertyName("profitChange")]
    public decimal ProfitChange { get; set; }
}

public class MonthlyBreakdownDto
{
    [JsonPropertyName("month")]
    public string Month { get; set; } = string.Empty;

    [JsonPropertyName("year")]
    public int Year { get; set; }

    [JsonPropertyName("income")]
    public decimal Income { get; set; }

    [JsonPropertyName("expenses")]
    public decimal Expenses { get; set; }

    [JsonPropertyName("profit")]
    public decimal Profit { get; set; }
}

public class CategoryBreakdownDto
{
    [JsonPropertyName("categoryId")]
    public string CategoryId { get; set; } = string.Empty;

    [JsonPropertyName("categoryName")]
    public string CategoryName { get; set; } = string.Empty;

    [JsonPropertyName("amount")]
    public decimal Amount { get; set; }

    [JsonPropertyName("percentage")]
    public decimal Percentage { get; set; }
}

public class PeriodComparisonDto
{
    [JsonPropertyName("currentPeriod")]
    public PeriodDataDto CurrentPeriod { get; set; } = new();

    [JsonPropertyName("previousPeriod")]
    public PeriodDataDto PreviousPeriod { get; set; } = new();

    [JsonPropertyName("incomeChange")]
    public decimal IncomeChange { get; set; }

    [JsonPropertyName("expenseChange")]
    public decimal ExpenseChange { get; set; }

    [JsonPropertyName("profitChange")]
    public decimal ProfitChange { get; set; }
}

public class PeriodDataDto
{
    [JsonPropertyName("startDate")]
    public string StartDate { get; set; } = string.Empty;

    [JsonPropertyName("endDate")]
    public string EndDate { get; set; } = string.Empty;

    [JsonPropertyName("totalIncome")]
    public decimal TotalIncome { get; set; }

    [JsonPropertyName("totalExpenses")]
    public decimal TotalExpenses { get; set; }

    [JsonPropertyName("netProfit")]
    public decimal NetProfit { get; set; }
}

public class TrendDataPointDto
{
    [JsonPropertyName("date")]
    public string Date { get; set; } = string.Empty;

    [JsonPropertyName("value")]
    public decimal Value { get; set; }

    [JsonPropertyName("label")]
    [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
    public string? Label { get; set; }
}

public class PnlCenterStatsDto
{
    [JsonPropertyName("id")]
    public string Id { get; set; } = string.Empty;

    [JsonPropertyName("name")]
    public string Name { get; set; } = string.Empty;

    [JsonPropertyName("totalIncome")]
    public decimal TotalIncome { get; set; }

    [JsonPropertyName("totalExpenses")]
    public decimal TotalExpenses { get; set; }

    [JsonPropertyName("netProfit")]
    public decimal NetProfit { get; set; }
}

public class AnalyticsDashboardResponse
{
    [JsonPropertyName("summary")]
    public DashboardSummaryDto Summary { get; set; } = new();

    [JsonPropertyName("monthlyData")]
    public List<MonthlyBreakdownDto> MonthlyData { get; set; } = [];

    [JsonPropertyName("expensesByCategory")]
    public List<CategoryBreakdownDto> ExpensesByCategory { get; set; } = [];

    [JsonPropertyName("incomeByCategory")]
    public List<CategoryBreakdownDto> IncomeByCategory { get; set; } = [];

    [JsonPropertyName("pnlCenters")]
    public List<PnlCenterStatsDto> PnlCenters { get; set; } = [];
}
