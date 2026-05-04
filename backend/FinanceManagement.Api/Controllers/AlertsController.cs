using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using FinanceManagement.Api.Middleware;
using FinanceManagement.Api.Models;
using FinanceManagement.Api.Models.Alerts;
using FinanceManagement.Api.Services.Alerts;

namespace FinanceManagement.Api.Controllers;

[ApiController]
[Route("api/alerts")]
[Authorize]
public class AlertsController(AlertsService service) : ControllerBase
{
    private readonly AlertsService _service = service;

    [HttpGet]
    public async Task<IActionResult> GetAlerts()
    {
        var userId = HttpContext.GetRequiredUserId();
        var alerts = await _service.GetAlertsAsync(userId);
        return Ok(ApiResponse<List<AlertDto>>.Ok(alerts));
    }

    [HttpPost("dismiss")]
    public async Task<IActionResult> Dismiss([FromBody] DismissAlertRequest request)
    {
        var userId = HttpContext.GetRequiredUserId();
        await _service.DismissAsync(userId, request.AlertType, request.EntityId, request.Justification);
        return Ok(ApiResponse<object>.Ok(new { success = true }));
    }

    [HttpPost("snooze")]
    public async Task<IActionResult> Snooze([FromBody] SnoozeAlertRequest request)
    {
        var userId = HttpContext.GetRequiredUserId();
        await _service.SnoozeAsync(userId, request.AlertType, request.EntityId, request.SnoozeUntil);
        return Ok(ApiResponse<object>.Ok(new { success = true }));
    }
}
