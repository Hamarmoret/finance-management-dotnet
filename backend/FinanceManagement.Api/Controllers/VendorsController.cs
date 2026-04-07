using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using FinanceManagement.Api.Middleware;
using FinanceManagement.Api.Models;
using FinanceManagement.Api.Services.Vendors;

namespace FinanceManagement.Api.Controllers;

[ApiController]
[Route("api/vendors")]
[Authorize]
public class VendorsController : ControllerBase
{
    private readonly VendorsService _vendorsService;

    public VendorsController(VendorsService vendorsService) => _vendorsService = vendorsService;

    [HttpGet]
    public async Task<IActionResult> GetAll(
        [FromQuery] int page = 1,
        [FromQuery] int limit = 20,
        [FromQuery] string? search = null,
        [FromQuery] string? payeeType = null,
        [FromQuery] string? status = null)
    {
        var (vendors, total) = await _vendorsService.GetAllAsync(page, limit, search, payeeType, status);
        return Ok(new PaginatedResponse<VendorDto>
        {
            Data = vendors,
            Pagination = new PaginationInfo
            {
                Page = page, Limit = limit, Total = total,
                TotalPages = (int)Math.Ceiling(total / (double)limit),
            },
        });
    }

    [HttpGet("{id}")]
    public async Task<IActionResult> GetById(string id)
    {
        if (!Guid.TryParse(id, out var guid))
            throw new AppException("Invalid vendor ID", 400, "VALIDATION_ERROR");

        var vendor = await _vendorsService.GetByIdAsync(guid);
        if (vendor == null)
            throw new AppException("Vendor not found", 404, "NOT_FOUND");

        return Ok(ApiResponse<VendorDto>.Ok(vendor));
    }

    [HttpPost]
    public async Task<IActionResult> Create([FromBody] CreateVendorRequest request)
    {
        if (string.IsNullOrWhiteSpace(request.Name))
            throw new AppException("Name is required", 400, "VALIDATION_ERROR");

        var userId = Guid.Parse(HttpContext.GetUserId()!);
        var vendor = await _vendorsService.CreateAsync(request, userId);
        return StatusCode(201, ApiResponse<VendorDto>.Ok(vendor));
    }

    [HttpPut("{id}")]
    public async Task<IActionResult> Update(string id, [FromBody] UpdateVendorRequest request)
    {
        if (!Guid.TryParse(id, out var guid))
            throw new AppException("Invalid vendor ID", 400, "VALIDATION_ERROR");

        var userId = Guid.Parse(HttpContext.GetUserId()!);
        var vendor = await _vendorsService.UpdateAsync(guid, request, userId);
        if (vendor == null)
            throw new AppException("Vendor not found", 404, "NOT_FOUND");

        return Ok(ApiResponse<VendorDto>.Ok(vendor));
    }

    [HttpDelete("{id}")]
    public async Task<IActionResult> Delete(string id)
    {
        if (!Guid.TryParse(id, out var guid))
            throw new AppException("Invalid vendor ID", 400, "VALIDATION_ERROR");

        var userId = Guid.Parse(HttpContext.GetUserId()!);
        var deleted = await _vendorsService.DeleteAsync(guid, userId);
        if (!deleted)
            throw new AppException("Vendor not found", 404, "NOT_FOUND");

        return Ok(ApiResponse<object>.Ok(new { message = "Vendor deleted successfully" }));
    }
}
