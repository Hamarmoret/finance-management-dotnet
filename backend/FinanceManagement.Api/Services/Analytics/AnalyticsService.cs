using System.Text.Json.Serialization;
using Dapper;
using FinanceManagement.Api.Database;

namespace FinanceManagement.Api.Services.Analytics;

public class AnalyticsService
{
    private readonly DbContext _db;

    public AnalyticsService(DbContext db) => _db = db;

    public async Task<DashboardSummaryDto> GetDashboardSummaryAsync(string? pnlCenterId)
    {
        await using var conn = _db.CreateConnection();
        await conn.OpenAsync();

        var now = DateTime.UtcNow;
        var currentMonthStart = new DateTime(now.Year, now.Month, 1, 0, 0, 0, DateTimeKind.Utc);
        var prevMonthStart = currentMonthStart.AddMonths(-1);

        string incomeFilter = "", expenseFilter = "";
        var p = new DynamicParameters();
        p.Add("CurrentStart", currentMonthStart);
        p.Add("CurrentEnd", currentMonthStart.AddMonths(1));
        p.Add("PrevStart", prevMonthStart);
        p.Add("PrevEnd", currentMonthStart);

        if (!string.IsNullOrEmpty(pnlCenterId))
        {
            incomeFilter = " AND i.id IN (SELECT income_id FROM income_allocations WHERE pnl_center_id = @PnlCenterId)";
            expenseFilter = " AND e.id IN (SELECT expense_id FROM expense_allocations WHERE pnl_center_id = @PnlCenterId)";
            p.Add("PnlCenterId", Guid.Parse(pnlCenterId));
        }

        var curIncome = await conn.ExecuteScalarAsync<decimal>(
            $"SELECT COALESCE(SUM(amount), 0) FROM income i WHERE income_date >= @CurrentStart AND income_date < @CurrentEnd{incomeFilter}", p);
        var curExpense = await conn.ExecuteScalarAsync<decimal>(
            $"SELECT COALESCE(SUM(amount), 0) FROM expenses e WHERE expense_date >= @CurrentStart AND expense_date < @CurrentEnd{expenseFilter}", p);
        var prevIncome = await conn.ExecuteScalarAsync<decimal>(
            $"SELECT COALESCE(SUM(amount), 0) FROM income i WHERE income_date >= @PrevStart AND income_date < @PrevEnd{incomeFilter}", p);
        var prevExpense = await conn.ExecuteScalarAsync<decimal>(
            $"SELECT COALESCE(SUM(amount), 0) FROM expenses e WHERE expense_date >= @PrevStart AND expense_date < @PrevEnd{expenseFilter}", p);

        var pendingInvoices = await conn.ExecuteScalarAsync<int>(
            "SELECT COUNT(*) FROM income WHERE invoice_status IN ('draft', 'sent')");
        var overdueInvoices = await conn.ExecuteScalarAsync<int>(
            "SELECT COUNT(*) FROM income WHERE invoice_status = 'overdue' OR (payment_due_date < CURRENT_DATE AND invoice_status = 'sent')");

        static decimal PctChange(decimal current, decimal previous) =>
            previous == 0 ? 0 : Math.Round((current - previous) / previous * 100, 2);

        return new DashboardSummaryDto
        {
            TotalIncome = curIncome,
            TotalExpenses = curExpense,
            NetProfit = curIncome - curExpense,
            IncomeChange = PctChange(curIncome, prevIncome),
            ExpenseChange = PctChange(curExpense, prevExpense),
            ProfitChange = PctChange(curIncome - curExpense, prevIncome - prevExpense),
            PendingInvoices = pendingInvoices,
            OverdueInvoices = overdueInvoices,
        };
    }

    public async Task<List<MonthlyBreakdownDto>> GetMonthlyBreakdownAsync(int year, string? pnlCenterId)
    {
        await using var conn = _db.CreateConnection();
        await conn.OpenAsync();

        var p = new DynamicParameters();
        p.Add("Year", year);

        string incomeFilter = "", expenseFilter = "";
        if (!string.IsNullOrEmpty(pnlCenterId))
        {
            incomeFilter = " AND i.id IN (SELECT income_id FROM income_allocations WHERE pnl_center_id = @PnlCenterId)";
            expenseFilter = " AND e.id IN (SELECT expense_id FROM expense_allocations WHERE pnl_center_id = @PnlCenterId)";
            p.Add("PnlCenterId", Guid.Parse(pnlCenterId));
        }

        var incomeByMonth = await conn.QueryAsync<dynamic>(
            $"SELECT EXTRACT(MONTH FROM income_date)::int AS month, COALESCE(SUM(amount), 0) AS total FROM income i WHERE EXTRACT(YEAR FROM income_date) = @Year{incomeFilter} GROUP BY month", p);

        var expenseByMonth = await conn.QueryAsync<dynamic>(
            $"SELECT EXTRACT(MONTH FROM expense_date)::int AS month, COALESCE(SUM(amount), 0) AS total FROM expenses e WHERE EXTRACT(YEAR FROM expense_date) = @Year{expenseFilter} GROUP BY month", p);

        var incomeMap = incomeByMonth.ToDictionary(x => (int)x.month, x => (decimal)x.total);
        var expenseMap = expenseByMonth.ToDictionary(x => (int)x.month, x => (decimal)x.total);

        var months = new[] { "Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec" };
        var result = new List<MonthlyBreakdownDto>();

        for (int m = 1; m <= 12; m++)
        {
            var inc = incomeMap.GetValueOrDefault(m, 0);
            var exp = expenseMap.GetValueOrDefault(m, 0);
            result.Add(new MonthlyBreakdownDto
            {
                Month = months[m - 1],
                Year = year,
                Income = inc,
                Expenses = exp,
                Profit = inc - exp,
            });
        }

        return result;
    }

    public async Task<List<CategoryBreakdownDto>> GetExpenseCategoryBreakdownAsync(string? dateFrom, string? dateTo)
    {
        await using var conn = _db.CreateConnection();
        await conn.OpenAsync();

        var conditions = new List<string>();
        var p = new DynamicParameters();

        if (!string.IsNullOrEmpty(dateFrom)) { conditions.Add("e.expense_date >= @DateFrom::date"); p.Add("DateFrom", dateFrom); }
        if (!string.IsNullOrEmpty(dateTo)) { conditions.Add("e.expense_date <= @DateTo::date"); p.Add("DateTo", dateTo); }

        var where = conditions.Count > 0 ? "WHERE " + string.Join(" AND ", conditions) : "";

        var results = await conn.QueryAsync<CategoryBreakdownDto>(
            $"""
            SELECT ec.id AS category_id, ec.name AS category_name, COALESCE(SUM(e.amount), 0) AS amount, 0 AS percentage
            FROM expenses e LEFT JOIN expense_categories ec ON e.category_id = ec.id
            {where}
            GROUP BY ec.id, ec.name ORDER BY amount DESC
            """, p);

        var list = results.ToList();
        var total = list.Sum(x => x.Amount);
        foreach (var item in list)
            item.Percentage = total > 0 ? Math.Round(item.Amount / total * 100, 2) : 0;

        return list;
    }
}

public class DashboardSummaryDto
{
    [JsonPropertyName("totalIncome")] public decimal TotalIncome { get; set; }
    [JsonPropertyName("totalExpenses")] public decimal TotalExpenses { get; set; }
    [JsonPropertyName("netProfit")] public decimal NetProfit { get; set; }
    [JsonPropertyName("incomeChange")] public decimal IncomeChange { get; set; }
    [JsonPropertyName("expenseChange")] public decimal ExpenseChange { get; set; }
    [JsonPropertyName("profitChange")] public decimal ProfitChange { get; set; }
    [JsonPropertyName("pendingInvoices")] public int PendingInvoices { get; set; }
    [JsonPropertyName("overdueInvoices")] public int OverdueInvoices { get; set; }
    [JsonPropertyName("upcomingExpenses")] public int UpcomingExpenses { get; set; }
}

public class MonthlyBreakdownDto
{
    [JsonPropertyName("month")] public string Month { get; set; } = string.Empty;
    [JsonPropertyName("year")] public int Year { get; set; }
    [JsonPropertyName("income")] public decimal Income { get; set; }
    [JsonPropertyName("expenses")] public decimal Expenses { get; set; }
    [JsonPropertyName("profit")] public decimal Profit { get; set; }
}

public class CategoryBreakdownDto
{
    [JsonPropertyName("categoryId")] public string? CategoryId { get; set; }
    [JsonPropertyName("categoryName")] public string? CategoryName { get; set; }
    [JsonPropertyName("amount")] public decimal Amount { get; set; }
    [JsonPropertyName("percentage")] public decimal Percentage { get; set; }
}
