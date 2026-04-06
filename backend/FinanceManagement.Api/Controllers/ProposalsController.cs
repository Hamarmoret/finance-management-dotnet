using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using FinanceManagement.Api.Middleware;
using FinanceManagement.Api.Models;
using FinanceManagement.Api.Services.Pipeline;

namespace FinanceManagement.Api.Controllers;

[ApiController]
[Route("api/proposals")]
[Authorize]
public class ProposalsController : ControllerBase
{
    private readonly ProposalsService _proposalsService;

    public ProposalsController(ProposalsService proposalsService)
    {
        _proposalsService = proposalsService;
    }

    [HttpGet]
    public async Task<IActionResult> GetAll(
        [FromQuery] int page = 1,
        [FromQuery] int limit = 20,
        [FromQuery] string? search = null,
        [FromQuery] string? status = null,
        [FromQuery] string? clientId = null,
        [FromQuery] string? startDate = null,
        [FromQuery] string? endDate = null)
    {
        var (proposals, total) = await _proposalsService.GetAllAsync(page, limit, search, status, clientId, startDate, endDate);

        return Ok(new PaginatedResponse<ProposalDto>
        {
            Data = proposals,
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
            throw new AppException("Invalid proposal ID", 400, "VALIDATION_ERROR");

        var proposal = await _proposalsService.GetByIdAsync(guid);
        if (proposal == null)
            throw new AppException("Proposal not found", 404, "NOT_FOUND");

        return Ok(ApiResponse<ProposalDto>.Ok(proposal));
    }

    [HttpPost]
    public async Task<IActionResult> Create([FromBody] CreateProposalRequest request)
    {
        var userId = Guid.Parse(HttpContext.GetUserId()!);
        var proposal = await _proposalsService.CreateAsync(request, userId);
        return StatusCode(201, ApiResponse<ProposalDto>.Ok(proposal));
    }

    [HttpPut("{id}")]
    public async Task<IActionResult> Update(string id, [FromBody] UpdateProposalRequest request)
    {
        if (!Guid.TryParse(id, out var guid))
            throw new AppException("Invalid proposal ID", 400, "VALIDATION_ERROR");

        var userId = Guid.Parse(HttpContext.GetUserId()!);
        var proposal = await _proposalsService.UpdateAsync(guid, request, userId);
        if (proposal == null)
            throw new AppException("Proposal not found", 404, "NOT_FOUND");

        return Ok(ApiResponse<ProposalDto>.Ok(proposal));
    }

    [HttpDelete("{id}")]
    public async Task<IActionResult> Delete(string id)
    {
        if (!Guid.TryParse(id, out var guid))
            throw new AppException("Invalid proposal ID", 400, "VALIDATION_ERROR");

        var userId = Guid.Parse(HttpContext.GetUserId()!);
        var deleted = await _proposalsService.DeleteAsync(guid, userId);
        if (!deleted)
            throw new AppException("Proposal not found", 404, "NOT_FOUND");

        return Ok(ApiResponse<object>.Ok(new { message = "Proposal deleted successfully" }));
    }
}
