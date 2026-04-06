using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using FinanceManagement.Api.Middleware;
using FinanceManagement.Api.Models;
using FinanceManagement.Api.Services.Income;

namespace FinanceManagement.Api.Controllers;

[ApiController]
[Route("api/income-contracts")]
[Authorize]
public class IncomeContractsController : ControllerBase
{
    private readonly IncomeContractsService _service;

    public IncomeContractsController(IncomeContractsService service)
    {
        _service = service;
    }

    // ── Stats & Grouping (must appear before {id:guid} route) ─────────────────

    [HttpGet("stats")]
    public async Task<IActionResult> GetStats()
    {
        var stats = await _service.GetStatsAsync();
        return Ok(ApiResponse<ContractStatsDto>.Ok(stats));
    }

    [HttpGet("by-client")]
    public async Task<IActionResult> GetByClient(
        [FromQuery] string? search = null,
        [FromQuery] string? status = null,
        [FromQuery] string? startDate = null,
        [FromQuery] string? endDate = null)
    {
        var items = await _service.GetByClientAsync(search, status, startDate, endDate);
        return Ok(ApiResponse<List<ClientContractStatsDto>>.Ok(items));
    }

    // ── Contracts ─────────────────────────────────────────────────────────────

    [HttpGet]
    public async Task<IActionResult> GetAll(
        [FromQuery] int page = 1,
        [FromQuery] int limit = 20,
        [FromQuery] string? clientId = null,
        [FromQuery] string? contractType = null,
        [FromQuery] string? status = null,
        [FromQuery] string? search = null,
        [FromQuery] string? startDate = null,
        [FromQuery] string? endDate = null)
    {
        var (items, total) = await _service.GetAllAsync(new ContractFilters
        {
            Page = page,
            Limit = limit,
            ClientId = clientId,
            ContractType = contractType,
            Status = status,
            Search = search,
            StartDate = startDate,
            EndDate = endDate,
        });

        return Ok(new PaginatedResponse<IncomeContractSummaryDto>
        {
            Data = items,
            Pagination = new PaginationInfo
            {
                Page = page,
                Limit = limit,
                Total = total,
                TotalPages = (int)Math.Ceiling((double)total / limit),
            }
        });
    }

    [HttpGet("{id:guid}")]
    public async Task<IActionResult> GetById(Guid id)
    {
        var contract = await _service.GetByIdAsync(id);
        if (contract == null)
            throw new AppException("Contract not found", 404, "NOT_FOUND");
        return Ok(ApiResponse<IncomeContractDto>.Ok(contract));
    }

    [HttpPost]
    public async Task<IActionResult> Create([FromBody] CreateContractRequest request)
    {
        var userId = Guid.Parse(HttpContext.GetUserId()!);
        var contract = await _service.CreateAsync(request, userId);
        return StatusCode(201, ApiResponse<IncomeContractDto>.Ok(contract));
    }

    [HttpPut("{id:guid}")]
    public async Task<IActionResult> Update(Guid id, [FromBody] UpdateContractRequest request)
    {
        var userId = Guid.Parse(HttpContext.GetUserId()!);
        var contract = await _service.UpdateAsync(id, request, userId);
        return Ok(ApiResponse<IncomeContractDto>.Ok(contract));
    }

    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> Delete(Guid id)
    {
        var userId = Guid.Parse(HttpContext.GetUserId()!);
        await _service.DeleteAsync(id, userId);
        return Ok(ApiResponse<object>.Ok(new { message = "Contract deleted" }));
    }

    [HttpPost("{id:guid}/duplicate")]
    public async Task<IActionResult> Duplicate(Guid id, [FromBody] DuplicateContractRequest request)
    {
        var userId = Guid.Parse(HttpContext.GetUserId()!);
        var contract = await _service.DuplicateAsync(id, request, userId);
        return StatusCode(201, ApiResponse<IncomeContractDto>.Ok(contract));
    }

    // ── Milestones ────────────────────────────────────────────────────────────

    [HttpGet("{id:guid}/milestones")]
    public async Task<IActionResult> GetMilestones(Guid id)
    {
        var milestones = await _service.GetMilestonesAsync(id);
        return Ok(ApiResponse<List<IncomeMilestoneDto>>.Ok(milestones));
    }

    [HttpPost("{id:guid}/milestones")]
    public async Task<IActionResult> CreateMilestone(Guid id, [FromBody] CreateMilestoneRequest request)
    {
        var milestone = await _service.CreateMilestoneAsync(id, request);
        return StatusCode(201, ApiResponse<IncomeMilestoneDto>.Ok(milestone));
    }

    [HttpPut("milestones/{milestoneId:guid}")]
    public async Task<IActionResult> UpdateMilestone(Guid milestoneId, [FromBody] UpdateMilestoneRequest request)
    {
        var milestone = await _service.UpdateMilestoneAsync(milestoneId, request);
        return Ok(ApiResponse<IncomeMilestoneDto>.Ok(milestone));
    }

    [HttpDelete("milestones/{milestoneId:guid}")]
    public async Task<IActionResult> DeleteMilestone(Guid milestoneId)
    {
        await _service.DeleteMilestoneAsync(milestoneId);
        return Ok(ApiResponse<object>.Ok(new { message = "Milestone deleted" }));
    }

    [HttpPost("{id:guid}/milestones/generate")]
    public async Task<IActionResult> GenerateMilestones(
        Guid id, [FromBody] GenerateRetainerMilestonesRequest request)
    {
        var userId = Guid.Parse(HttpContext.GetUserId()!);
        var milestones = await _service.GenerateRetainerMilestonesAsync(id, request, userId);
        return Ok(ApiResponse<List<IncomeMilestoneDto>>.Ok(milestones));
    }

    [HttpPost("milestones/{milestoneId:guid}/mark-paid")]
    public async Task<IActionResult> MarkMilestonePaid(
        Guid milestoneId, [FromBody] MarkMilestonePaidRequest request)
    {
        var userId = Guid.Parse(HttpContext.GetUserId()!);
        var milestone = await _service.MarkMilestonePaidAsync(milestoneId, request, userId);
        return Ok(ApiResponse<IncomeMilestoneDto>.Ok(milestone));
    }

    // ── Proposal conversion ───────────────────────────────────────────────────

    [HttpPost("convert-proposal")]
    public async Task<IActionResult> ConvertProposal([FromBody] ConvertProposalToContractRequest request)
    {
        var userId = Guid.Parse(HttpContext.GetUserId()!);
        var contract = await _service.ConvertProposalAsync(request, userId);
        return StatusCode(201, ApiResponse<IncomeContractDto>.Ok(contract));
    }

    // ── Alerts ────────────────────────────────────────────────────────────────

    [HttpGet("alerts/upcoming")]
    public async Task<IActionResult> GetUpcoming([FromQuery] int days = 7)
    {
        var milestones = await _service.GetUpcomingMilestonesAsync(days);
        return Ok(ApiResponse<List<IncomeMilestoneDto>>.Ok(milestones));
    }

    [HttpGet("alerts/overdue")]
    public async Task<IActionResult> GetOverdue()
    {
        var milestones = await _service.GetOverdueMilestonesAsync();
        return Ok(ApiResponse<List<IncomeMilestoneDto>>.Ok(milestones));
    }

    // ── Projections ───────────────────────────────────────────────────────────

    [HttpGet("projections")]
    public async Task<IActionResult> GetProjections([FromQuery] int months = 12)
    {
        var projections = await _service.GetProjectionsAsync(months);
        return Ok(ApiResponse<List<MilestoneProjectionDto>>.Ok(projections));
    }

    // ── Attachments ───────────────────────────────────────────────────────────

    [HttpPatch("{id:guid}/attachments")]
    public async Task<IActionResult> PatchContractAttachments(Guid id, [FromBody] PatchAttachmentsRequest request)
    {
        var contract = await _service.PatchContractAttachmentsAsync(id, request.Attachments);
        return Ok(ApiResponse<IncomeContractDto>.Ok(contract));
    }

    [HttpPatch("milestones/{milestoneId:guid}/attachments")]
    public async Task<IActionResult> PatchMilestoneAttachments(Guid milestoneId, [FromBody] PatchAttachmentsRequest request)
    {
        var milestone = await _service.PatchMilestoneAttachmentsAsync(milestoneId, request.Attachments);
        return Ok(ApiResponse<IncomeMilestoneDto>.Ok(milestone));
    }
}
