using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using FinanceManagement.Api.Middleware;
using FinanceManagement.Api.Models;
using FinanceManagement.Api.Models.BusinessPlans;
using FinanceManagement.Api.Services.BusinessPlans;

namespace FinanceManagement.Api.Controllers;

[ApiController]
[Route("api/business-plans")]
[Authorize]
public class BusinessPlansController : ControllerBase
{
    private readonly BusinessPlansService _businessPlansService;

    public BusinessPlansController(BusinessPlansService businessPlansService)
    {
        _businessPlansService = businessPlansService;
    }

    // =============================================
    // Core CRUD
    // =============================================

    /// <summary>
    /// List business plans with filtering and pagination.
    /// </summary>
    [HttpGet]
    public async Task<IActionResult> GetAll(
        [FromQuery] int page = 1,
        [FromQuery] int limit = 20,
        [FromQuery] int? fiscalYear = null,
        [FromQuery] string? status = null,
        [FromQuery] string? planType = null,
        [FromQuery] string? pnlCenterId = null)
    {
        Guid? pnlCenterGuid = Guid.TryParse(pnlCenterId, out var parsedPnl) ? parsedPnl : null;
        var (plans, total) = await _businessPlansService.GetAllAsync(
            page, limit, fiscalYear, status, planType, pnlCenterGuid);

        return Ok(new PaginatedResponse<BusinessPlanDto>
        {
            Data = plans,
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
    /// Get a single business plan by ID.
    /// </summary>
    [HttpGet("{id}")]
    public async Task<IActionResult> GetById(string id)
    {
        if (!Guid.TryParse(id, out var guid))
            throw new AppException("Invalid business plan ID", 400, "VALIDATION_ERROR");

        var plan = await _businessPlansService.GetByIdAsync(guid);
        return Ok(ApiResponse<BusinessPlanWithDetailsDto>.Ok(plan));
    }

    /// <summary>
    /// Create a new business plan.
    /// </summary>
    [HttpPost]
    public async Task<IActionResult> Create([FromBody] CreateBusinessPlanRequest request)
    {
        var userId = Guid.Parse(HttpContext.GetUserId()!);
        var plan = await _businessPlansService.CreateAsync(request, userId);
        return StatusCode(201, ApiResponse<BusinessPlanDto>.Ok(plan));
    }

    /// <summary>
    /// Update an existing business plan.
    /// </summary>
    [HttpPatch("{id}")]
    public async Task<IActionResult> Update(string id, [FromBody] UpdateBusinessPlanRequest request)
    {
        if (!Guid.TryParse(id, out var guid))
            throw new AppException("Invalid business plan ID", 400, "VALIDATION_ERROR");

        var plan = await _businessPlansService.UpdateAsync(guid, request);
        return Ok(ApiResponse<BusinessPlanDto>.Ok(plan));
    }

    /// <summary>
    /// Archive a business plan.
    /// </summary>
    [HttpDelete("{id}")]
    public async Task<IActionResult> Archive(string id)
    {
        if (!Guid.TryParse(id, out var guid))
            throw new AppException("Invalid business plan ID", 400, "VALIDATION_ERROR");

        await _businessPlansService.DeleteAsync(guid);
        return Ok(ApiResponse<object>.Ok(new { message = "Business plan archived successfully" }));
    }

    // =============================================
    // Projections
    // =============================================

    /// <summary>
    /// Update projections for a business plan.
    /// </summary>
    [HttpPut("{id}/projections")]
    public async Task<IActionResult> UpdateProjections(string id, [FromBody] UpdateProjectionsRequest request)
    {
        if (!Guid.TryParse(id, out var guid))
            throw new AppException("Invalid business plan ID", 400, "VALIDATION_ERROR");

        var projections = await _businessPlansService.UpdateProjectionsAsync(guid, request.Projections);
        return Ok(ApiResponse<List<ProjectionDto>>.Ok(projections));
    }

    // =============================================
    // Goals
    // =============================================

    /// <summary>
    /// Create a goal for a business plan.
    /// </summary>
    [HttpPost("{id}/goals")]
    public async Task<IActionResult> CreateGoal(string id, [FromBody] CreateGoalRequest request)
    {
        if (!Guid.TryParse(id, out var guid))
            throw new AppException("Invalid business plan ID", 400, "VALIDATION_ERROR");

        var goal = await _businessPlansService.CreateGoalAsync(guid, request);
        return StatusCode(201, ApiResponse<GoalDto>.Ok(goal));
    }

    /// <summary>
    /// Update a goal.
    /// </summary>
    [HttpPatch("{id}/goals/{goalId}")]
    public async Task<IActionResult> UpdateGoal(string id, string goalId, [FromBody] UpdateGoalRequest request)
    {
        if (!Guid.TryParse(id, out var planGuid))
            throw new AppException("Invalid business plan ID", 400, "VALIDATION_ERROR");
        if (!Guid.TryParse(goalId, out var goalGuid))
            throw new AppException("Invalid goal ID", 400, "VALIDATION_ERROR");

        var goal = await _businessPlansService.UpdateGoalAsync(planGuid, goalGuid, request);
        return Ok(ApiResponse<GoalDto>.Ok(goal));
    }

    /// <summary>
    /// Delete a goal.
    /// </summary>
    [HttpDelete("{id}/goals/{goalId}")]
    public async Task<IActionResult> DeleteGoal(string id, string goalId)
    {
        if (!Guid.TryParse(id, out var planGuid))
            throw new AppException("Invalid business plan ID", 400, "VALIDATION_ERROR");
        if (!Guid.TryParse(goalId, out var goalGuid))
            throw new AppException("Invalid goal ID", 400, "VALIDATION_ERROR");

        await _businessPlansService.DeleteGoalAsync(planGuid, goalGuid);
        return Ok(ApiResponse<object>.Ok(new { message = "Goal deleted successfully" }));
    }

    // =============================================
    // Actuals
    // =============================================

    /// <summary>
    /// Get actuals for a business plan.
    /// </summary>
    [HttpGet("{id}/actuals")]
    public async Task<IActionResult> GetActuals(string id)
    {
        if (!Guid.TryParse(id, out var guid))
            throw new AppException("Invalid business plan ID", 400, "VALIDATION_ERROR");

        var actuals = await _businessPlansService.GetActualsComparisonAsync(guid);
        return Ok(ApiResponse<ActualsComparisonDto>.Ok(actuals));
    }

    // =============================================
    // Engine (full driver-based planning data)
    // =============================================

    /// <summary>
    /// Get the full engine data for a business plan (plan with all driver-based planning data).
    /// </summary>
    [HttpGet("{id}/engine")]
    public async Task<IActionResult> GetEngine(string id)
    {
        if (!Guid.TryParse(id, out var guid))
            throw new AppException("Invalid business plan ID", 400, "VALIDATION_ERROR");

        var engine = await _businessPlansService.GetEngineAsync(guid);
        return Ok(ApiResponse<BusinessPlanWithEngineDto>.Ok(engine));
    }

    // =============================================
    // Scenarios
    // =============================================

    /// <summary>
    /// Get all scenarios for a business plan.
    /// </summary>
    [HttpGet("{id}/scenarios")]
    public async Task<IActionResult> GetScenarios(string id)
    {
        if (!Guid.TryParse(id, out var guid))
            throw new AppException("Invalid business plan ID", 400, "VALIDATION_ERROR");

        var scenarios = await _businessPlansService.GetScenariosAsync(guid);
        return Ok(ApiResponse<List<ScenarioDto>>.Ok(scenarios));
    }

    /// <summary>
    /// Create a scenario for a business plan.
    /// </summary>
    [HttpPost("{id}/scenarios")]
    public async Task<IActionResult> CreateScenario(string id, [FromBody] CreateScenarioRequest request)
    {
        if (!Guid.TryParse(id, out var guid))
            throw new AppException("Invalid business plan ID", 400, "VALIDATION_ERROR");

        var scenario = await _businessPlansService.CreateScenarioAsync(guid, request);
        return StatusCode(201, ApiResponse<ScenarioDto>.Ok(scenario));
    }

    /// <summary>
    /// Update a scenario.
    /// </summary>
    [HttpPatch("{id}/scenarios/{scenarioId}")]
    public async Task<IActionResult> UpdateScenario(string id, string scenarioId, [FromBody] UpdateScenarioRequest request)
    {
        if (!Guid.TryParse(id, out var planGuid))
            throw new AppException("Invalid business plan ID", 400, "VALIDATION_ERROR");
        if (!Guid.TryParse(scenarioId, out var scenarioGuid))
            throw new AppException("Invalid scenario ID", 400, "VALIDATION_ERROR");

        var scenario = await _businessPlansService.UpdateScenarioAsync(planGuid, scenarioGuid, request);
        return Ok(ApiResponse<ScenarioDto>.Ok(scenario));
    }

    /// <summary>
    /// Delete a scenario.
    /// </summary>
    [HttpDelete("{id}/scenarios/{scenarioId}")]
    public async Task<IActionResult> DeleteScenario(string id, string scenarioId)
    {
        if (!Guid.TryParse(id, out var planGuid))
            throw new AppException("Invalid business plan ID", 400, "VALIDATION_ERROR");
        if (!Guid.TryParse(scenarioId, out var scenarioGuid))
            throw new AppException("Invalid scenario ID", 400, "VALIDATION_ERROR");

        await _businessPlansService.DeleteScenarioAsync(planGuid, scenarioGuid);
        return Ok(ApiResponse<object>.Ok(new { message = "Scenario deleted successfully" }));
    }

    // =============================================
    // Drivers
    // =============================================

    /// <summary>
    /// Get all drivers for a business plan.
    /// </summary>
    [HttpGet("{id}/drivers")]
    public async Task<IActionResult> GetDrivers(string id)
    {
        if (!Guid.TryParse(id, out var guid))
            throw new AppException("Invalid business plan ID", 400, "VALIDATION_ERROR");

        var drivers = await _businessPlansService.GetDriversAsync(guid);
        return Ok(ApiResponse<List<DriverDto>>.Ok(drivers));
    }

    /// <summary>
    /// Create a driver for a business plan.
    /// </summary>
    [HttpPost("{id}/drivers")]
    public async Task<IActionResult> CreateDriver(string id, [FromBody] CreateDriverRequest request)
    {
        if (!Guid.TryParse(id, out var guid))
            throw new AppException("Invalid business plan ID", 400, "VALIDATION_ERROR");

        var driver = await _businessPlansService.CreateDriverAsync(guid, request);
        return StatusCode(201, ApiResponse<DriverDto>.Ok(driver));
    }

    /// <summary>
    /// Update a driver.
    /// </summary>
    [HttpPatch("{id}/drivers/{driverId}")]
    public async Task<IActionResult> UpdateDriver(string id, string driverId, [FromBody] UpdateDriverRequest request)
    {
        if (!Guid.TryParse(id, out var planGuid))
            throw new AppException("Invalid business plan ID", 400, "VALIDATION_ERROR");
        if (!Guid.TryParse(driverId, out var driverGuid))
            throw new AppException("Invalid driver ID", 400, "VALIDATION_ERROR");

        var driver = await _businessPlansService.UpdateDriverAsync(planGuid, driverGuid, request);
        return Ok(ApiResponse<DriverDto>.Ok(driver));
    }

    /// <summary>
    /// Bulk update drivers for a business plan.
    /// </summary>
    [HttpPut("{id}/drivers/bulk")]
    public async Task<IActionResult> BulkUpdateDrivers(string id, [FromBody] BulkUpdateDriversRequest request)
    {
        if (!Guid.TryParse(id, out var guid))
            throw new AppException("Invalid business plan ID", 400, "VALIDATION_ERROR");

        var drivers = await _businessPlansService.BulkUpdateDriversAsync(guid, request.Drivers);
        return Ok(ApiResponse<List<DriverDto>>.Ok(drivers));
    }

    /// <summary>
    /// Delete a driver.
    /// </summary>
    [HttpDelete("{id}/drivers/{driverId}")]
    public async Task<IActionResult> DeleteDriver(string id, string driverId)
    {
        if (!Guid.TryParse(id, out var planGuid))
            throw new AppException("Invalid business plan ID", 400, "VALIDATION_ERROR");
        if (!Guid.TryParse(driverId, out var driverGuid))
            throw new AppException("Invalid driver ID", 400, "VALIDATION_ERROR");

        await _businessPlansService.DeleteDriverAsync(planGuid, driverGuid);
        return Ok(ApiResponse<object>.Ok(new { message = "Driver deleted successfully" }));
    }

    // =============================================
    // Revenue Models
    // =============================================

    /// <summary>
    /// Get revenue models for a business plan.
    /// </summary>
    [HttpGet("{id}/revenue-models")]
    public async Task<IActionResult> GetRevenueModels(string id)
    {
        if (!Guid.TryParse(id, out var guid))
            throw new AppException("Invalid business plan ID", 400, "VALIDATION_ERROR");

        var models = await _businessPlansService.GetRevenueModelsAsync(guid);
        return Ok(ApiResponse<List<RevenueModelDto>>.Ok(models));
    }

    /// <summary>
    /// Upsert revenue models for a business plan.
    /// </summary>
    [HttpPut("{id}/revenue-models")]
    public async Task<IActionResult> UpsertRevenueModels(string id, [FromBody] UpsertRevenueModelsRequest request)
    {
        if (!Guid.TryParse(id, out var guid))
            throw new AppException("Invalid business plan ID", 400, "VALIDATION_ERROR");

        var models = await _businessPlansService.UpsertRevenueModelsAsync(guid, request.Models);
        return Ok(ApiResponse<List<RevenueModelDto>>.Ok(models));
    }

    // =============================================
    // Cost Categories
    // =============================================

    /// <summary>
    /// Get cost categories for a business plan.
    /// </summary>
    [HttpGet("{id}/cost-categories")]
    public async Task<IActionResult> GetCostCategories(string id)
    {
        if (!Guid.TryParse(id, out var guid))
            throw new AppException("Invalid business plan ID", 400, "VALIDATION_ERROR");

        var categories = await _businessPlansService.GetCostCategoriesAsync(guid);
        return Ok(ApiResponse<List<CostCategoryDto>>.Ok(categories));
    }

    /// <summary>
    /// Create a cost category for a business plan.
    /// </summary>
    [HttpPost("{id}/cost-categories")]
    public async Task<IActionResult> CreateCostCategory(string id, [FromBody] CreateCostCategoryRequest request)
    {
        if (!Guid.TryParse(id, out var guid))
            throw new AppException("Invalid business plan ID", 400, "VALIDATION_ERROR");

        var category = await _businessPlansService.CreateCostCategoryAsync(guid, request);
        return StatusCode(201, ApiResponse<CostCategoryDto>.Ok(category));
    }

    /// <summary>
    /// Update a cost category.
    /// </summary>
    [HttpPatch("{id}/cost-categories/{categoryId}")]
    public async Task<IActionResult> UpdateCostCategory(string id, string categoryId, [FromBody] UpdateCostCategoryRequest request)
    {
        if (!Guid.TryParse(id, out var planGuid))
            throw new AppException("Invalid business plan ID", 400, "VALIDATION_ERROR");
        if (!Guid.TryParse(categoryId, out var categoryGuid))
            throw new AppException("Invalid cost category ID", 400, "VALIDATION_ERROR");

        var category = await _businessPlansService.UpdateCostCategoryAsync(planGuid, categoryGuid, request);
        return Ok(ApiResponse<CostCategoryDto>.Ok(category));
    }

    /// <summary>
    /// Delete a cost category.
    /// </summary>
    [HttpDelete("{id}/cost-categories/{categoryId}")]
    public async Task<IActionResult> DeleteCostCategory(string id, string categoryId)
    {
        if (!Guid.TryParse(id, out var planGuid))
            throw new AppException("Invalid business plan ID", 400, "VALIDATION_ERROR");
        if (!Guid.TryParse(categoryId, out var categoryGuid))
            throw new AppException("Invalid cost category ID", 400, "VALIDATION_ERROR");

        await _businessPlansService.DeleteCostCategoryAsync(planGuid, categoryGuid);
        return Ok(ApiResponse<object>.Ok(new { message = "Cost category deleted successfully" }));
    }

    // =============================================
    // Staffing
    // =============================================

    /// <summary>
    /// Get staffing rules for a business plan.
    /// </summary>
    [HttpGet("{id}/staffing")]
    public async Task<IActionResult> GetStaffing(string id)
    {
        if (!Guid.TryParse(id, out var guid))
            throw new AppException("Invalid business plan ID", 400, "VALIDATION_ERROR");

        var staffing = await _businessPlansService.GetStaffingAsync(guid);
        return Ok(ApiResponse<List<StaffingDto>>.Ok(staffing));
    }

    /// <summary>
    /// Create a staffing rule for a business plan.
    /// </summary>
    [HttpPost("{id}/staffing")]
    public async Task<IActionResult> CreateStaffing(string id, [FromBody] CreateStaffingRequest request)
    {
        if (!Guid.TryParse(id, out var guid))
            throw new AppException("Invalid business plan ID", 400, "VALIDATION_ERROR");

        var staffing = await _businessPlansService.CreateStaffingAsync(guid, request);
        return StatusCode(201, ApiResponse<StaffingDto>.Ok(staffing));
    }

    /// <summary>
    /// Update a staffing rule.
    /// </summary>
    [HttpPatch("{id}/staffing/{ruleId}")]
    public async Task<IActionResult> UpdateStaffing(string id, string ruleId, [FromBody] UpdateStaffingRequest request)
    {
        if (!Guid.TryParse(id, out var planGuid))
            throw new AppException("Invalid business plan ID", 400, "VALIDATION_ERROR");
        if (!Guid.TryParse(ruleId, out var ruleGuid))
            throw new AppException("Invalid staffing rule ID", 400, "VALIDATION_ERROR");

        var staffing = await _businessPlansService.UpdateStaffingAsync(planGuid, ruleGuid, request);
        return Ok(ApiResponse<StaffingDto>.Ok(staffing));
    }

    /// <summary>
    /// Delete a staffing rule.
    /// </summary>
    [HttpDelete("{id}/staffing/{ruleId}")]
    public async Task<IActionResult> DeleteStaffing(string id, string ruleId)
    {
        if (!Guid.TryParse(id, out var planGuid))
            throw new AppException("Invalid business plan ID", 400, "VALIDATION_ERROR");
        if (!Guid.TryParse(ruleId, out var ruleGuid))
            throw new AppException("Invalid staffing rule ID", 400, "VALIDATION_ERROR");

        await _businessPlansService.DeleteStaffingAsync(planGuid, ruleGuid);
        return Ok(ApiResponse<object>.Ok(new { message = "Staffing rule deleted successfully" }));
    }

    // =============================================
    // Calculation & Results
    // =============================================

    /// <summary>
    /// Trigger calculation for a business plan.
    /// </summary>
    [HttpPost("{id}/calculate")]
    public async Task<IActionResult> Calculate(string id)
    {
        if (!Guid.TryParse(id, out var guid))
            throw new AppException("Invalid business plan ID", 400, "VALIDATION_ERROR");

        await _businessPlansService.CalculateAsync(guid);
        return Ok(new { success = true, message = "Calculation completed" });
    }

    /// <summary>
    /// Get calculation results for a business plan.
    /// </summary>
    [HttpGet("{id}/results")]
    public async Task<IActionResult> GetResults(string id, [FromQuery] string? scenarioId = null)
    {
        if (!Guid.TryParse(id, out var guid))
            throw new AppException("Invalid business plan ID", 400, "VALIDATION_ERROR");

        Guid? scenarioGuid = null;
        if (scenarioId != null)
        {
            if (!Guid.TryParse(scenarioId, out var parsed))
                throw new AppException("Invalid scenario ID", 400, "VALIDATION_ERROR");
            scenarioGuid = parsed;
        }

        var results = await _businessPlansService.GetResultsAsync(guid, scenarioGuid);
        return Ok(ApiResponse<List<CalculatedResultDto>>.Ok(results));
    }

    /// <summary>
    /// Compare calculation results across scenarios.
    /// </summary>
    [HttpGet("{id}/results/compare")]
    public async Task<IActionResult> CompareResults(string id)
    {
        if (!Guid.TryParse(id, out var guid))
            throw new AppException("Invalid business plan ID", 400, "VALIDATION_ERROR");

        var comparison = await _businessPlansService.CompareResultsAsync(guid);
        return Ok(ApiResponse<ScenarioComparisonDto>.Ok(comparison));
    }
}
