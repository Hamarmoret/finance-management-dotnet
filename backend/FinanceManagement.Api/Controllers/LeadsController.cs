using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using FinanceManagement.Api.Middleware;
using FinanceManagement.Api.Models;
using FinanceManagement.Api.Services.Pipeline;

namespace FinanceManagement.Api.Controllers;

[ApiController]
[Route("api/leads")]
[Authorize]
public class LeadsController : ControllerBase
{
    private readonly LeadsService _leadsService;

    public LeadsController(LeadsService leadsService)
    {
        _leadsService = leadsService;
    }

    [HttpGet]
    public async Task<IActionResult> GetAll(
        [FromQuery] int page = 1,
        [FromQuery] int limit = 20,
        [FromQuery] string? search = null,
        [FromQuery] string? status = null,
        [FromQuery] string? assignedTo = null,
        [FromQuery] string? startDate = null,
        [FromQuery] string? endDate = null)
    {
        var (leads, total) = await _leadsService.GetAllAsync(
            page, limit, search, status, assignedTo, startDate, endDate);

        return Ok(new PaginatedResponse<LeadDto>
        {
            Data = leads,
            Pagination = new PaginationInfo
            {
                Page = page,
                Limit = limit,
                Total = total,
                TotalPages = (int)Math.Ceiling((double)total / limit),
            },
        });
    }

    [HttpGet("{id}")]
    public async Task<IActionResult> GetById(string id)
    {
        if (!Guid.TryParse(id, out var guid))
            throw new AppException("Invalid lead ID", 400, "VALIDATION_ERROR");

        var lead = await _leadsService.GetByIdAsync(guid);
        if (lead == null)
            throw new AppException("Lead not found", 404, "NOT_FOUND");

        return Ok(ApiResponse<LeadDto>.Ok(lead));
    }

    [HttpPost]
    public async Task<IActionResult> Create([FromBody] CreateLeadRequest request)
    {
        var userId = Guid.Parse(HttpContext.GetUserId()!);
        var lead = await _leadsService.CreateAsync(request, userId);
        return StatusCode(201, ApiResponse<LeadDto>.Ok(lead));
    }

    [HttpPut("{id}")]
    public async Task<IActionResult> Update(string id, [FromBody] UpdateLeadRequest request)
    {
        if (!Guid.TryParse(id, out var guid))
            throw new AppException("Invalid lead ID", 400, "VALIDATION_ERROR");

        var lead = await _leadsService.UpdateAsync(guid, request);
        if (lead == null)
            throw new AppException("Lead not found", 404, "NOT_FOUND");

        return Ok(ApiResponse<LeadDto>.Ok(lead));
    }

    [HttpDelete("{id}")]
    public async Task<IActionResult> Delete(string id)
    {
        if (!Guid.TryParse(id, out var guid))
            throw new AppException("Invalid lead ID", 400, "VALIDATION_ERROR");

        var deleted = await _leadsService.DeleteAsync(guid);
        if (!deleted)
            throw new AppException("Lead not found", 404, "NOT_FOUND");

        return Ok(ApiResponse<object>.Ok(new { message = "Lead deleted successfully" }));
    }

    // =============================================
    // Lead Activities
    // =============================================

    [HttpGet("{id}/activities")]
    public async Task<IActionResult> GetActivities(string id)
    {
        if (!Guid.TryParse(id, out var guid))
            throw new AppException("Invalid lead ID", 400, "VALIDATION_ERROR");

        var activities = await _leadsService.GetActivitiesAsync(guid);
        return Ok(ApiResponse<List<LeadActivityDto>>.Ok(activities));
    }

    [HttpPost("{id}/activities")]
    public async Task<IActionResult> CreateActivity(string id, [FromBody] CreateLeadActivityRequest request)
    {
        if (!Guid.TryParse(id, out var guid))
            throw new AppException("Invalid lead ID", 400, "VALIDATION_ERROR");

        var userId = Guid.Parse(HttpContext.GetUserId()!);
        var activity = await _leadsService.CreateActivityAsync(guid, request, userId);
        return StatusCode(201, ApiResponse<LeadActivityDto>.Ok(activity));
    }
}
