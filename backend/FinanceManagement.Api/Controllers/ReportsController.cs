using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using FinanceManagement.Api.Middleware;
using FinanceManagement.Api.Models.Reports;
using FinanceManagement.Api.Services.Reports;

namespace FinanceManagement.Api.Controllers;

/// <summary>
/// Reports feature — PDF report generation with optional AI executive summary.
/// AI summary wiring lands in a later commit; this commit renders the PDF from
/// the collected data with a placeholder summary when IncludeAiSummary is on.
/// </summary>
[ApiController]
[Route("api/reports")]
[Authorize]
[EnableRateLimiting("reports")]
public class ReportsController : ControllerBase
{
    private readonly ReportsService _reports;
    private readonly ILogger<ReportsController> _logger;

    public ReportsController(ReportsService reports, ILogger<ReportsController> logger)
    {
        _reports = reports;
        _logger = logger;
    }

    [HttpPost("generate")]
    public async Task<IActionResult> Generate([FromBody] ReportRequest request, CancellationToken ct)
    {
        var userId = HttpContext.GetRequiredUserId();
        _logger.LogInformation(
            "Generating report template={Template} period={Start}..{End} user={UserId}",
            request.Template, request.StartDate, request.EndDate, userId);

        var data = await _reports.CollectAsync(request, ct);

        // AI summary placeholder until AiSummaryService lands.
        if (request.IncludeAiSummary)
        {
            data.AiSummary = new AiSummary
            {
                ExecutiveSummary = "AI-generated executive summary will be available shortly. " +
                                   "The report below contains the raw figures for the selected period.",
                IsFallback = true,
            };
        }

        var pdf = ReportPdfBuilder.Render(data);

        var filename = $"report-{request.Template}-{request.StartDate}-{request.EndDate}.pdf";
        return File(pdf, "application/pdf", filename);
    }
}
