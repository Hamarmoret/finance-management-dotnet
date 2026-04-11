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
    private readonly AiSummaryService _aiSummary;
    private readonly ILogger<ReportsController> _logger;

    public ReportsController(
        ReportsService reports,
        AiSummaryService aiSummary,
        ILogger<ReportsController> logger)
    {
        _reports = reports;
        _aiSummary = aiSummary;
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

        if (request.IncludeAiSummary)
        {
            data.AiSummary = await _aiSummary.SummarizeAsync(data, request.Prompt, ct);
        }

        var pdf = ReportPdfBuilder.Render(data);

        await _reports.LogGenerationAsync(
            userId,
            request,
            pdf.Length,
            aiSummaryUsed: request.IncludeAiSummary,
            aiSummaryFallback: data.AiSummary?.IsFallback ?? false);

        var filename = $"report-{request.Template}-{request.StartDate}-{request.EndDate}.pdf";
        return File(pdf, "application/pdf", filename);
    }
}
