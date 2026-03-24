using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using FinanceManagement.Api.Middleware;
using FinanceManagement.Api.Models;
using FinanceManagement.Api.Models.Expenses;
using FinanceManagement.Api.Services.Expenses;

namespace FinanceManagement.Api.Controllers;

[ApiController]
[Route("api/expenses")]
[Authorize]
public class ExpensesController : ControllerBase
{
    private readonly ExpensesService _expensesService;

    public ExpensesController(ExpensesService expensesService)
    {
        _expensesService = expensesService;
    }

    /// <summary>
    /// List expenses with filtering, sorting, and pagination.
    /// </summary>
    [HttpGet]
    public async Task<IActionResult> GetAll(
        [FromQuery] int page = 1,
        [FromQuery] int limit = 20,
        [FromQuery] string? dateFrom = null,
        [FromQuery] string? dateTo = null,
        [FromQuery] string? categoryId = null,
        [FromQuery] string? vendor = null,
        [FromQuery] bool? isRecurring = null,
        [FromQuery] decimal? minAmount = null,
        [FromQuery] decimal? maxAmount = null,
        [FromQuery] string? search = null,
        [FromQuery] string? sortBy = null,
        [FromQuery] string? sortOrder = null)
    {
        var (expenses, total) = await _expensesService.GetAllAsync(
            page, limit, dateFrom, dateTo, categoryId, vendor,
            isRecurring, minAmount, maxAmount, search, sortBy, sortOrder);

        return Ok(new PaginatedResponse<ExpenseDto>
        {
            Data = expenses,
            Pagination = new PaginationInfo
            {
                Page = page,
                Limit = limit,
                Total = total,
                TotalPages = (int)Math.Ceiling((double)total / limit),
            },
        });
    }

    /// <summary>
    /// Get a single expense by ID.
    /// </summary>
    [HttpGet("{id}")]
    public async Task<IActionResult> GetById(string id)
    {
        var expense = await _expensesService.GetByIdAsync(id);
        return Ok(ApiResponse<ExpenseDto>.Ok(expense));
    }

    /// <summary>
    /// Create a new expense.
    /// </summary>
    [HttpPost]
    public async Task<IActionResult> Create([FromBody] CreateExpenseRequest request)
    {
        var userId = HttpContext.GetUserId()!;
        var expense = await _expensesService.CreateAsync(request, userId);
        return StatusCode(201, ApiResponse<ExpenseDto>.Ok(expense));
    }

    /// <summary>
    /// Update an existing expense.
    /// </summary>
    [HttpPut("{id}")]
    public async Task<IActionResult> Update(string id, [FromBody] UpdateExpenseRequest request)
    {
        var userId = HttpContext.GetUserId()!;
        var expense = await _expensesService.UpdateAsync(id, request, userId);
        return Ok(ApiResponse<ExpenseDto>.Ok(expense));
    }

    /// <summary>
    /// Delete an expense.
    /// </summary>
    [HttpDelete("{id}")]
    public async Task<IActionResult> Delete(string id)
    {
        var userId = HttpContext.GetUserId()!;
        await _expensesService.DeleteAsync(id, userId);
        return Ok(ApiResponse<object>.Ok(new { message = "Expense deleted successfully" }));
    }

    // =============================================
    // Categories
    // =============================================

    /// <summary>
    /// List all active expense categories.
    /// </summary>
    [HttpGet("categories")]
    public async Task<IActionResult> GetCategories()
    {
        var categories = await _expensesService.GetCategoriesAsync();
        return Ok(ApiResponse<List<ExpenseCategoryDto>>.Ok(categories));
    }

    /// <summary>
    /// Create a new expense category.
    /// </summary>
    [HttpPost("categories")]
    public async Task<IActionResult> CreateCategory([FromBody] CreateCategoryRequest request)
    {
        var category = await _expensesService.CreateCategoryAsync(request.Name, request.Type, request.ParentId);
        return StatusCode(201, ApiResponse<ExpenseCategoryDto>.Ok(category));
    }

    /// <summary>
    /// Update an expense category.
    /// </summary>
    [HttpPut("categories/{id}")]
    public async Task<IActionResult> UpdateCategory(string id, [FromBody] UpdateCategoryRequest request)
    {
        var category = await _expensesService.UpdateCategoryAsync(id, request.Name, request.Type, request.ParentId);
        return Ok(ApiResponse<ExpenseCategoryDto>.Ok(category));
    }

    /// <summary>
    /// Soft-delete an expense category.
    /// </summary>
    [HttpDelete("categories/{id}")]
    public async Task<IActionResult> DeleteCategory(string id)
    {
        await _expensesService.DeleteCategoryAsync(id);
        return Ok(ApiResponse<object>.Ok(new { message = "Category deleted successfully" }));
    }
}
