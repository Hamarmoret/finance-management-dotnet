using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using FinanceManagement.Api.Middleware;
using FinanceManagement.Api.Models;
using FinanceManagement.Api.Services.AuditLogs;

namespace FinanceManagement.Api.Controllers;

[ApiController]
[Route("api/audit")]
[Authorize]
public class AuditLogsController : ControllerBase
{
    private readonly AuditLogsService _auditLogsService;

    public AuditLogsController(AuditLogsService auditLogsService) => _auditLogsService = auditLogsService;

    [HttpGet]
    public async Task<IActionResult> GetAll(
        [FromQuery] int page = 1, [FromQuery] int limit = 50,
        [FromQuery] string? userId = null, [FromQuery] string? action = null,
        [FromQuery] string? entityType = null,
        [FromQuery] string? dateFrom = null, [FromQuery] string? dateTo = null)
    {
        var requesterId = HttpContext.GetRequiredUserId().ToString();
        var requesterRole = HttpContext.GetUserRole();
        var isAdmin = requesterRole is "admin" or "owner";

        // Non-admins can only query their own audit logs
        var effectiveUserId = isAdmin ? userId : requesterId;

        var (logs, total) = await _auditLogsService.GetAllAsync(page, limit, effectiveUserId, action, entityType, dateFrom, dateTo);
        return Ok(new PaginatedResponse<AuditLogDto>
        {
            Data = logs,
            Pagination = new PaginationInfo
            {
                Page = page, Limit = limit, Total = total,
                TotalPages = (int)Math.Ceiling(total / (double)limit)
            }
        });
    }
}
