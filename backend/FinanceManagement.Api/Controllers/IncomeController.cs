using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using FinanceManagement.Api.Middleware;
using FinanceManagement.Api.Models;
using FinanceManagement.Api.Services.Income;

namespace FinanceManagement.Api.Controllers;

[ApiController]
[Route("api/income")]
[Authorize]
public class IncomeController : ControllerBase
{
    private readonly IncomeService _incomeService;

    public IncomeController(IncomeService incomeService)
    {
        _incomeService = incomeService;
    }

    [HttpGet]
    public async Task<IActionResult> GetAll(
        [FromQuery] int page = 1,
        [FromQuery] int limit = 20,
        [FromQuery] string? dateFrom = null,
        [FromQuery] string? dateTo = null,
        [FromQuery] Guid? categoryId = null,
        [FromQuery] string? clientName = null,
        [FromQuery] string? invoiceStatus = null,
        [FromQuery] bool? isRecurring = null,
        [FromQuery] decimal? minAmount = null,
        [FromQuery] decimal? maxAmount = null,
        [FromQuery] string? search = null,
        [FromQuery] string? pnlCenterId = null,
        [FromQuery] string sortBy = "income_date",
        [FromQuery] string sortOrder = "desc")
    {
        var filters = new IncomeFilters
        {
            Page = page,
            Limit = limit,
            DateFrom = dateFrom,
            DateTo = dateTo,
            CategoryId = categoryId,
            ClientName = clientName,
            InvoiceStatus = invoiceStatus,
            IsRecurring = isRecurring,
            MinAmount = minAmount,
            MaxAmount = maxAmount,
            Search = search,
            PnlCenterId = pnlCenterId,
            SortBy = sortBy,
            SortOrder = sortOrder,
        };

        var (items, total) = await _incomeService.GetAllAsync(filters);

        return Ok(new PaginatedResponse<IncomeDto>
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
        var income = await _incomeService.GetByIdAsync(id);
        if (income == null)
            throw new AppException("Income not found", 404, "NOT_FOUND");

        return Ok(ApiResponse<IncomeDto>.Ok(income));
    }

    [HttpPost]
    public async Task<IActionResult> Create([FromBody] CreateIncomeRequest request)
    {
        var userId = HttpContext.GetRequiredUserId();
        var income = await _incomeService.CreateAsync(request, userId);
        return StatusCode(201, ApiResponse<IncomeDto>.Ok(income));
    }

    [HttpPut("{id:guid}")]
    public async Task<IActionResult> Update(Guid id, [FromBody] UpdateIncomeRequest request)
    {
        var userId = HttpContext.GetRequiredUserId();
        var income = await _incomeService.UpdateAsync(id, request, userId);
        return Ok(ApiResponse<IncomeDto>.Ok(income));
    }

    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> Delete(Guid id)
    {
        var userId = HttpContext.GetRequiredUserId();
        await _incomeService.DeleteAsync(id, userId);
        return Ok(ApiResponse<object>.Ok(new { message = "Income deleted successfully" }));
    }

    // =============================================
    // Categories
    // =============================================

    [HttpGet("categories")]
    public async Task<IActionResult> GetCategories()
    {
        var categories = await _incomeService.GetCategoriesAsync();
        return Ok(ApiResponse<List<IncomeCategoryDto>>.Ok(categories));
    }

    [HttpPost("categories")]
    public async Task<IActionResult> CreateCategory([FromBody] CreateCategoryRequest request)
    {
        var category = await _incomeService.CreateCategoryAsync(request.Name, request.Type);
        return StatusCode(201, ApiResponse<IncomeCategoryDto>.Ok(category));
    }

    [HttpPut("categories/{id:guid}")]
    public async Task<IActionResult> UpdateCategory(Guid id, [FromBody] UpdateCategoryRequest request)
    {
        var category = await _incomeService.UpdateCategoryAsync(id, request.Name, request.Type);
        return Ok(ApiResponse<IncomeCategoryDto>.Ok(category));
    }

    [HttpDelete("categories/{id:guid}")]
    public async Task<IActionResult> DeleteCategory(Guid id)
    {
        await _incomeService.DeleteCategoryAsync(id);
        return Ok(ApiResponse<object>.Ok(new { message = "Category deleted successfully" }));
    }
}
