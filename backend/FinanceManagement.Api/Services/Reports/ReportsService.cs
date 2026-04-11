using FinanceManagement.Api.Middleware;
using FinanceManagement.Api.Models.Reports;
using FinanceManagement.Api.Services.Analytics;
using FinanceManagement.Api.Services.Expenses;
using FinanceManagement.Api.Services.Income;
using FinanceManagement.Api.Services.Pipeline;
using FinanceManagement.Api.Services.PnlCenters;

namespace FinanceManagement.Api.Services.Reports;

/// <summary>
/// Orchestrates report generation: collects period-filtered data from the
/// existing domain services and (later) hands the assembled ReportData off to
/// AiSummaryService + ReportPdfBuilder. Nothing here queries the database
/// directly — we reuse the same DTOs the UI already consumes so the report
/// matches what the user sees on screen.
/// </summary>
public class ReportsService
{
    private readonly AnalyticsService _analytics;
    private readonly PnlCentersService _pnlCenters;
    private readonly IncomeContractsService _contracts;
    private readonly IncomeService _income;
    private readonly ExpensesService _expenses;
    private readonly LeadsService _leads;
    private readonly ProposalsService _proposals;
    private readonly ILogger<ReportsService> _logger;

    public ReportsService(
        AnalyticsService analytics,
        PnlCentersService pnlCenters,
        IncomeContractsService contracts,
        IncomeService income,
        ExpensesService expenses,
        LeadsService leads,
        ProposalsService proposals,
        ILogger<ReportsService> logger)
    {
        _analytics = analytics;
        _pnlCenters = pnlCenters;
        _contracts = contracts;
        _income = income;
        _expenses = expenses;
        _leads = leads;
        _proposals = proposals;
        _logger = logger;
    }

    /// <summary>
    /// Resolves the requested section list for a template, validates the
    /// period, then fetches every requested section in parallel. Gracefully
    /// degrades — if any individual section errors, we log and continue so
    /// the PDF still renders the rest.
    /// </summary>
    public async Task<ReportData> CollectAsync(ReportRequest request, CancellationToken ct = default)
    {
        // ── Validate + parse the period ───────────────────────────────────
        if (!DateTime.TryParse(request.StartDate, out var start))
            throw new AppException("Invalid startDate format", 400, "VALIDATION_ERROR");
        if (!DateTime.TryParse(request.EndDate, out var end))
            throw new AppException("Invalid endDate format", 400, "VALIDATION_ERROR");
        if (end < start)
            throw new AppException("endDate must be on or after startDate", 400, "VALIDATION_ERROR");

        // ── Resolve section list (explicit > template defaults) ──────────
        var sections = (request.Sections is { Count: > 0 }
            ? request.Sections
            : ReportSections.TemplateDefaults.TryGetValue(request.Template, out var defaults)
                ? defaults.ToList()
                : ReportSections.All.ToList())
            .Where(ReportSections.All.Contains)
            .Distinct()
            .ToList();

        var data = new ReportData
        {
            Period = new ReportPeriod
            {
                StartDate = start.Date,
                EndDate = end.Date,
                GeneratedAt = DateTime.UtcNow,
            },
            Template = request.Template,
            Sections = sections,
            UserPrompt = request.Prompt,
        };

        var startStr = start.ToString("yyyy-MM-dd");
        var endStr = end.ToString("yyyy-MM-dd");

        // ── Fetch every requested section in parallel ─────────────────────
        // Each task catches its own failures so a single bad section doesn't
        // kill the whole report.
        var tasks = new List<Task>();

        if (sections.Contains(ReportSections.Kpis))
            tasks.Add(SafeFetch("kpis", async () =>
                data.Kpis = await _analytics.GetDashboardSummaryAsync(null)));

        if (sections.Contains(ReportSections.MonthlyBreakdown))
            tasks.Add(SafeFetch("monthly", async () =>
                data.Monthly = await _analytics.GetMonthlyBreakdownAsync(start.Year, null)));

        if (sections.Contains(ReportSections.ExpenseCategories))
            tasks.Add(SafeFetch("expenseCategories", async () =>
                data.ExpenseCategories = await _analytics.GetExpenseCategoryBreakdownAsync(startStr, endStr)));

        if (sections.Contains(ReportSections.PnlCenters))
            tasks.Add(SafeFetch("pnlCenters", async () =>
                data.PnlCenters = await _pnlCenters.GetAllAsync(false, start, end)));

        if (sections.Contains(ReportSections.ContractStats))
            tasks.Add(SafeFetch("contractStats", async () =>
                data.ContractStats = await _contracts.GetStatsAsync()));

        if (sections.Contains(ReportSections.TopClients))
            tasks.Add(SafeFetch("topClients", async () =>
            {
                var clients = await _contracts.GetByClientAsync(null, null, startStr, endStr);
                data.TopClients = clients
                    .OrderByDescending(c => c.TotalValue)
                    .Take(10)
                    .ToList();
            }));

        if (sections.Contains(ReportSections.OverdueMilestones))
            tasks.Add(SafeFetch("overdueMilestones", async () =>
                data.OverdueMilestones = await _contracts.GetOverdueMilestonesAsync()));

        if (sections.Contains(ReportSections.Projections))
            tasks.Add(SafeFetch("projections", async () =>
                data.Projections = await _contracts.GetProjectionsAsync(12)));

        if (sections.Contains(ReportSections.IncomeRows))
            tasks.Add(SafeFetch("incomeRows", async () =>
            {
                var (items, _) = await _income.GetAllAsync(new IncomeFilters
                {
                    Page = 1,
                    Limit = 200,
                    DateFrom = startStr,
                    DateTo = endStr,
                    SortBy = "income_date",
                    SortOrder = "desc",
                });
                data.IncomeRows = items;
            }));

        if (sections.Contains(ReportSections.ExpenseRows))
            tasks.Add(SafeFetch("expenseRows", async () =>
            {
                var (items, _) = await _expenses.GetAllAsync(
                    page: 1, limit: 200,
                    dateFrom: startStr, dateTo: endStr,
                    sortBy: "expense_date", sortOrder: "desc");
                data.ExpenseRows = items;
            }));

        if (sections.Contains(ReportSections.SalesPipeline))
        {
            tasks.Add(SafeFetch("leads", async () =>
            {
                var (items, _) = await _leads.GetAllAsync(
                    page: 1, limit: 100, startDate: startStr, endDate: endStr);
                data.Leads = items;
            }));
            tasks.Add(SafeFetch("proposals", async () =>
            {
                var (items, _) = await _proposals.GetAllAsync(
                    page: 1, limit: 100, startDate: startStr, endDate: endStr);
                data.Proposals = items;
            }));
        }

        await Task.WhenAll(tasks);
        ct.ThrowIfCancellationRequested();

        return data;
    }

    private async Task SafeFetch(string section, Func<Task> fetch)
    {
        try
        {
            await fetch();
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Report section {Section} failed to load; continuing without it", section);
        }
    }
}
