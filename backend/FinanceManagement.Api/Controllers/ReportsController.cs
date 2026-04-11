using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using FinanceManagement.Api.Models;

namespace FinanceManagement.Api.Controllers;

/// <summary>
/// Reports feature — PDF report generation with optional AI executive summary.
/// Currently a stub; full implementation lands in subsequent commits.
/// </summary>
[ApiController]
[Route("api/reports")]
[Authorize]
[EnableRateLimiting("reports")]
public class ReportsController : ControllerBase
{
    [HttpPost("generate")]
    public IActionResult Generate()
    {
        return StatusCode(501, new ApiError
        {
            Error = new ErrorDetail
            {
                Code = "NOT_IMPLEMENTED",
                Message = "Report generation is being rolled out. Please check back shortly.",
            },
        });
    }
}
