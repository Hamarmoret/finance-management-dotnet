using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using FinanceManagement.Api.Models;
using FinanceManagement.Api.Services.Analytics;

namespace FinanceManagement.Api.Controllers;

[ApiController]
[Route("api/analytics")]
[Authorize]
public class AnalyticsController : ControllerBase
{
    private readonly AnalyticsService _analyticsService;

    public AnalyticsController(AnalyticsService analyticsService) => _analyticsService = analyticsService;

    [HttpGet("dashboard")]
    public async Task<IActionResult> GetDashboard([FromQuery] string? pnlCenterId = null)
    {
        var summary = await _analyticsService.GetDashboardSummaryAsync(pnlCenterId);
        return Ok(ApiResponse<DashboardSummaryDto>.Ok(summary));
    }

    [HttpGet("monthly")]
    public async Task<IActionResult> GetMonthlyBreakdown(
        [FromQuery] int? year = null, [FromQuery] string? pnlCenterId = null)
    {
        var y = year ?? DateTime.UtcNow.Year;
        var breakdown = await _analyticsService.GetMonthlyBreakdownAsync(y, pnlCenterId);
        return Ok(ApiResponse<List<MonthlyBreakdownDto>>.Ok(breakdown));
    }

    [HttpGet("expense-categories")]
    public async Task<IActionResult> GetExpenseCategoryBreakdown(
        [FromQuery] string? dateFrom = null, [FromQuery] string? dateTo = null)
    {
        var breakdown = await _analyticsService.GetExpenseCategoryBreakdownAsync(dateFrom, dateTo);
        return Ok(ApiResponse<List<CategoryBreakdownDto>>.Ok(breakdown));
    }
}
