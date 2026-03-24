using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using FinanceManagement.Api.Middleware;
using FinanceManagement.Api.Models;
using FinanceManagement.Api.Services.PnlCenters;

namespace FinanceManagement.Api.Controllers;

[ApiController]
[Route("api/pnl-centers")]
[Authorize]
public class PnlCentersController : ControllerBase
{
    private readonly PnlCentersService _pnlCentersService;

    public PnlCentersController(PnlCentersService pnlCentersService)
    {
        _pnlCentersService = pnlCentersService;
    }

    /// <summary>
    /// GET /api/pnl-centers
    /// List all P&amp;L centers with stats
    /// </summary>
    [HttpGet]
    public async Task<IActionResult> GetAll([FromQuery] bool includeInactive = false)
    {
        var pnlCenters = await _pnlCentersService.GetAllAsync(includeInactive);
        return Ok(ApiResponse<List<PnlCenterWithStatsDto>>.Ok(pnlCenters));
    }

    /// <summary>
    /// GET /api/pnl-centers/distribution-defaults
    /// Get all distribution defaults
    /// </summary>
    [HttpGet("distribution-defaults")]
    public async Task<IActionResult> GetDistributionDefaults()
    {
        var defaults = await _pnlCentersService.GetDistributionDefaultsAsync();
        return Ok(ApiResponse<List<PnlDistributionDefaultDto>>.Ok(defaults));
    }

    /// <summary>
    /// PUT /api/pnl-centers/distribution-defaults
    /// Set distribution defaults (replaces all existing)
    /// </summary>
    [HttpPut("distribution-defaults")]
    public async Task<IActionResult> SetDistributionDefaults([FromBody] SetDistributionDefaultsRequest request)
    {
        var userId = Guid.Parse(HttpContext.GetUserId()!);
        var defaults = await _pnlCentersService.SetDistributionDefaultsAsync(request.Allocations, userId);
        return Ok(ApiResponse<List<PnlDistributionDefaultDto>>.Ok(defaults));
    }

    /// <summary>
    /// GET /api/pnl-centers/{id}
    /// Get a single P&amp;L center with stats
    /// </summary>
    [HttpGet("{id:guid}")]
    public async Task<IActionResult> GetById(Guid id)
    {
        var pnlCenter = await _pnlCentersService.GetByIdAsync(id);
        return Ok(ApiResponse<PnlCenterWithStatsDto>.Ok(pnlCenter));
    }

    /// <summary>
    /// POST /api/pnl-centers
    /// Create a new P&amp;L center
    /// </summary>
    [HttpPost]
    public async Task<IActionResult> Create([FromBody] CreatePnlCenterRequest request)
    {
        var userId = Guid.Parse(HttpContext.GetUserId()!);
        var pnlCenter = await _pnlCentersService.CreateAsync(request.Name, request.Description, userId);
        return StatusCode(201, ApiResponse<PnlCenterDto>.Ok(pnlCenter));
    }

    /// <summary>
    /// PUT /api/pnl-centers/{id}
    /// Update a P&amp;L center
    /// </summary>
    [HttpPut("{id:guid}")]
    public async Task<IActionResult> Update(Guid id, [FromBody] UpdatePnlCenterRequest request)
    {
        var userId = Guid.Parse(HttpContext.GetUserId()!);
        var pnlCenter = await _pnlCentersService.UpdateAsync(id, request.Name, request.Description, request.IsActive, userId);
        return Ok(ApiResponse<PnlCenterDto>.Ok(pnlCenter));
    }

    /// <summary>
    /// DELETE /api/pnl-centers/{id}
    /// Soft delete a P&amp;L center
    /// </summary>
    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> Delete(Guid id)
    {
        var userId = Guid.Parse(HttpContext.GetUserId()!);
        await _pnlCentersService.DeleteAsync(id, userId);
        return Ok(ApiResponse<object>.Ok(new { message = "P&L Center deleted successfully" }));
    }
}
