using System.Text.Json.Serialization;

namespace FinanceManagement.Api.Models.BusinessPlans;

// =============================================
// DTOs (API contract - camelCase JSON)
// =============================================

public class BusinessPlanDto
{
    [JsonPropertyName("id")]
    public Guid Id { get; set; }

    [JsonPropertyName("name")]
    public string Name { get; set; } = string.Empty;

    [JsonPropertyName("description")]
    [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
    public string? Description { get; set; }

    [JsonPropertyName("planType")]
    public string PlanType { get; set; } = string.Empty;

    [JsonPropertyName("fiscalYear")]
    public int FiscalYear { get; set; }

    [JsonPropertyName("status")]
    public string Status { get; set; } = "draft";

    [JsonPropertyName("startDate")]
    [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
    public string? StartDate { get; set; }

    [JsonPropertyName("endDate")]
    [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
    public string? EndDate { get; set; }

    [JsonPropertyName("pnlCenterId")]
    [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
    public Guid? PnlCenterId { get; set; }

    [JsonPropertyName("pnlCenterName")]
    [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
    public string? PnlCenterName { get; set; }

    [JsonPropertyName("targetRevenue")]
    public decimal TargetRevenue { get; set; }

    [JsonPropertyName("targetExpenses")]
    public decimal TargetExpenses { get; set; }

    [JsonPropertyName("targetProfit")]
    public decimal TargetProfit { get; set; }

    [JsonPropertyName("currency")]
    public string Currency { get; set; } = "USD";

    [JsonPropertyName("createdBy")]
    [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
    public Guid? CreatedBy { get; set; }

    [JsonPropertyName("createdAt")]
    public DateTime CreatedAt { get; set; }

    [JsonPropertyName("updatedAt")]
    public DateTime UpdatedAt { get; set; }
}

public class PlanProjectionDto
{
    [JsonPropertyName("id")]
    public string Id { get; set; } = string.Empty;

    [JsonPropertyName("planId")]
    public string PlanId { get; set; } = string.Empty;

    [JsonPropertyName("periodLabel")]
    public string PeriodLabel { get; set; } = string.Empty;

    [JsonPropertyName("periodStart")]
    public string PeriodStart { get; set; } = string.Empty;

    [JsonPropertyName("periodEnd")]
    public string PeriodEnd { get; set; } = string.Empty;

    [JsonPropertyName("projectedRevenue")]
    public decimal ProjectedRevenue { get; set; }

    [JsonPropertyName("projectedExpenses")]
    public decimal ProjectedExpenses { get; set; }

    [JsonPropertyName("projectedProfit")]
    public decimal ProjectedProfit { get; set; }

    [JsonPropertyName("notes")]
    [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
    public string? Notes { get; set; }

    [JsonPropertyName("sortOrder")]
    public int SortOrder { get; set; }
}

public class PlanGoalDto
{
    [JsonPropertyName("id")]
    public string Id { get; set; } = string.Empty;

    [JsonPropertyName("planId")]
    public string PlanId { get; set; } = string.Empty;

    [JsonPropertyName("title")]
    public string Title { get; set; } = string.Empty;

    [JsonPropertyName("description")]
    [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
    public string? Description { get; set; }

    [JsonPropertyName("category")]
    public string Category { get; set; } = "custom";

    [JsonPropertyName("targetValue")]
    public decimal TargetValue { get; set; }

    [JsonPropertyName("currentValue")]
    public decimal CurrentValue { get; set; }

    [JsonPropertyName("unit")]
    [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
    public string? Unit { get; set; }

    [JsonPropertyName("status")]
    public string Status { get; set; } = "not_started";

    [JsonPropertyName("priority")]
    public string Priority { get; set; } = "medium";

    [JsonPropertyName("dueDate")]
    [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
    public string? DueDate { get; set; }

    [JsonPropertyName("sortOrder")]
    public int SortOrder { get; set; }
}

public class PlanScenarioDto
{
    [JsonPropertyName("id")]
    public string Id { get; set; } = string.Empty;

    [JsonPropertyName("planId")]
    public string PlanId { get; set; } = string.Empty;

    [JsonPropertyName("name")]
    public string Name { get; set; } = string.Empty;

    [JsonPropertyName("description")]
    [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
    public string? Description { get; set; }

    [JsonPropertyName("adjustmentFactor")]
    public decimal AdjustmentFactor { get; set; }

    [JsonPropertyName("isDefault")]
    public bool IsDefault { get; set; }

    [JsonPropertyName("createdAt")]
    public DateTime CreatedAt { get; set; }
}

public class PlanDriverDto
{
    [JsonPropertyName("id")]
    public string Id { get; set; } = string.Empty;

    [JsonPropertyName("planId")]
    public string PlanId { get; set; } = string.Empty;

    [JsonPropertyName("scenarioId")]
    [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
    public string? ScenarioId { get; set; }

    [JsonPropertyName("code")]
    public string Code { get; set; } = string.Empty;

    [JsonPropertyName("name")]
    public string Name { get; set; } = string.Empty;

    [JsonPropertyName("description")]
    [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
    public string? Description { get; set; }

    [JsonPropertyName("value")]
    public decimal Value { get; set; }

    [JsonPropertyName("dataType")]
    public string DataType { get; set; } = "number";

    [JsonPropertyName("category")]
    public string Category { get; set; } = "input";

    [JsonPropertyName("isEditable")]
    public bool IsEditable { get; set; } = true;

    [JsonPropertyName("sortOrder")]
    public int SortOrder { get; set; }
}

public class PlanRevenueModelDto
{
    [JsonPropertyName("id")]
    public string Id { get; set; } = string.Empty;

    [JsonPropertyName("planId")]
    public string PlanId { get; set; } = string.Empty;

    [JsonPropertyName("periodLabel")]
    public string PeriodLabel { get; set; } = string.Empty;

    [JsonPropertyName("modelType")]
    public string ModelType { get; set; } = "manual";

    [JsonPropertyName("inputs")]
    [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
    public object? Inputs { get; set; }

    [JsonPropertyName("createdAt")]
    public DateTime CreatedAt { get; set; }

    [JsonPropertyName("updatedAt")]
    public DateTime UpdatedAt { get; set; }
}

public class PlanCostCategoryDto
{
    [JsonPropertyName("id")]
    public string Id { get; set; } = string.Empty;

    [JsonPropertyName("planId")]
    public string PlanId { get; set; } = string.Empty;

    [JsonPropertyName("name")]
    public string Name { get; set; } = string.Empty;

    [JsonPropertyName("costType")]
    public string CostType { get; set; } = "fixed";

    [JsonPropertyName("monthlyAmount")]
    public decimal MonthlyAmount { get; set; }

    [JsonPropertyName("formula")]
    [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
    public string? Formula { get; set; }

    [JsonPropertyName("driverCode")]
    [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
    public string? DriverCode { get; set; }

    [JsonPropertyName("notes")]
    [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
    public string? Notes { get; set; }

    [JsonPropertyName("sortOrder")]
    public int SortOrder { get; set; }
}

public class PlanStaffingDto
{
    [JsonPropertyName("id")]
    public string Id { get; set; } = string.Empty;

    [JsonPropertyName("planId")]
    public string PlanId { get; set; } = string.Empty;

    [JsonPropertyName("roleName")]
    public string RoleName { get; set; } = string.Empty;

    [JsonPropertyName("department")]
    [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
    public string? Department { get; set; }

    [JsonPropertyName("triggerDriverCode")]
    [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
    public string? TriggerDriverCode { get; set; }

    [JsonPropertyName("threshold")]
    [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
    public decimal? Threshold { get; set; }

    [JsonPropertyName("annualSalary")]
    public decimal AnnualSalary { get; set; }

    [JsonPropertyName("benefitsPercentage")]
    public decimal BenefitsPercentage { get; set; }

    [JsonPropertyName("currentHeadcount")]
    public int CurrentHeadcount { get; set; }

    [JsonPropertyName("notes")]
    [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
    public string? Notes { get; set; }

    [JsonPropertyName("sortOrder")]
    public int SortOrder { get; set; }
}

public class PlanCalculatedResultDto
{
    [JsonPropertyName("id")]
    public string Id { get; set; } = string.Empty;

    [JsonPropertyName("planId")]
    public string PlanId { get; set; } = string.Empty;

    [JsonPropertyName("scenarioId")]
    [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
    public string? ScenarioId { get; set; }

    [JsonPropertyName("periodLabel")]
    public string PeriodLabel { get; set; } = string.Empty;

    [JsonPropertyName("revenue")]
    public decimal Revenue { get; set; }

    [JsonPropertyName("fixedCosts")]
    public decimal FixedCosts { get; set; }

    [JsonPropertyName("variableCosts")]
    public decimal VariableCosts { get; set; }

    [JsonPropertyName("cogs")]
    public decimal Cogs { get; set; }

    [JsonPropertyName("totalCosts")]
    public decimal TotalCosts { get; set; }

    [JsonPropertyName("grossProfit")]
    public decimal GrossProfit { get; set; }

    [JsonPropertyName("netProfit")]
    public decimal NetProfit { get; set; }

    [JsonPropertyName("headcount")]
    public int Headcount { get; set; }

    [JsonPropertyName("newHires")]
    public int NewHires { get; set; }

    [JsonPropertyName("staffingCost")]
    public decimal StaffingCost { get; set; }

    [JsonPropertyName("calculationDetails")]
    [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
    public object? CalculationDetails { get; set; }

    [JsonPropertyName("calculatedAt")]
    public DateTime CalculatedAt { get; set; }
}

// =============================================
// Composite DTOs
// =============================================

public class BusinessPlanWithDetailsDto
{
    [JsonPropertyName("id")]
    public Guid Id { get; set; }

    [JsonPropertyName("name")]
    public string Name { get; set; } = string.Empty;

    [JsonPropertyName("description")]
    [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
    public string? Description { get; set; }

    [JsonPropertyName("planType")]
    public string PlanType { get; set; } = string.Empty;

    [JsonPropertyName("status")]
    public string Status { get; set; } = "draft";

    [JsonPropertyName("fiscalYear")]
    public int FiscalYear { get; set; }

    [JsonPropertyName("startDate")]
    [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
    public string? StartDate { get; set; }

    [JsonPropertyName("endDate")]
    [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
    public string? EndDate { get; set; }

    [JsonPropertyName("pnlCenterId")]
    [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
    public Guid? PnlCenterId { get; set; }

    [JsonPropertyName("pnlCenterName")]
    [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
    public string? PnlCenterName { get; set; }

    [JsonPropertyName("targetRevenue")]
    public decimal TargetRevenue { get; set; }

    [JsonPropertyName("targetExpenses")]
    public decimal TargetExpenses { get; set; }

    [JsonPropertyName("targetProfit")]
    public decimal TargetProfit { get; set; }

    [JsonPropertyName("currency")]
    public string Currency { get; set; } = "USD";

    [JsonPropertyName("createdBy")]
    [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
    public Guid? CreatedBy { get; set; }

    [JsonPropertyName("createdAt")]
    public DateTime CreatedAt { get; set; }

    [JsonPropertyName("updatedAt")]
    public DateTime UpdatedAt { get; set; }

    [JsonPropertyName("projections")]
    public List<ProjectionDto> Projections { get; set; } = [];

    [JsonPropertyName("goals")]
    public List<GoalDto> Goals { get; set; } = [];
}

public class BusinessPlanWithEngineDto
{
    [JsonPropertyName("plan")]
    public BusinessPlanDto Plan { get; set; } = new();

    [JsonPropertyName("scenarios")]
    public List<ScenarioDto> Scenarios { get; set; } = [];

    [JsonPropertyName("drivers")]
    public List<DriverDto> Drivers { get; set; } = [];

    [JsonPropertyName("revenueModels")]
    public List<RevenueModelDto> RevenueModels { get; set; } = [];

    [JsonPropertyName("costCategories")]
    public List<CostCategoryDto> CostCategories { get; set; } = [];

    [JsonPropertyName("staffing")]
    public List<StaffingDto> Staffing { get; set; } = [];

    [JsonPropertyName("calculatedResults")]
    public List<CalculatedResultDto> CalculatedResults { get; set; } = [];
}

// =============================================
// Request DTOs
// =============================================

public class CreateBusinessPlanRequest
{
    [JsonPropertyName("name")]
    public string Name { get; set; } = string.Empty;

    [JsonPropertyName("description")]
    public string? Description { get; set; }

    [JsonPropertyName("planType")]
    public string PlanType { get; set; } = string.Empty;

    [JsonPropertyName("status")]
    public string? Status { get; set; }

    [JsonPropertyName("fiscalYear")]
    public int FiscalYear { get; set; }

    [JsonPropertyName("startDate")]
    public string? StartDate { get; set; }

    [JsonPropertyName("endDate")]
    public string? EndDate { get; set; }

    [JsonPropertyName("pnlCenterId")]
    public Guid? PnlCenterId { get; set; }

    [JsonPropertyName("targetRevenue")]
    public decimal TargetRevenue { get; set; }

    [JsonPropertyName("targetExpenses")]
    public decimal TargetExpenses { get; set; }

    [JsonPropertyName("currency")]
    public string? Currency { get; set; }
}

public class UpdateBusinessPlanRequest
{
    [JsonPropertyName("name")]
    public string? Name { get; set; }

    [JsonPropertyName("description")]
    public string? Description { get; set; }

    [JsonPropertyName("planType")]
    public string? PlanType { get; set; }

    [JsonPropertyName("status")]
    public string? Status { get; set; }

    [JsonPropertyName("fiscalYear")]
    public int? FiscalYear { get; set; }

    [JsonPropertyName("startDate")]
    public string? StartDate { get; set; }

    [JsonPropertyName("endDate")]
    public string? EndDate { get; set; }

    [JsonPropertyName("pnlCenterId")]
    public Guid? PnlCenterId { get; set; }

    [JsonPropertyName("targetRevenue")]
    public decimal? TargetRevenue { get; set; }

    [JsonPropertyName("targetExpenses")]
    public decimal? TargetExpenses { get; set; }

    [JsonPropertyName("currency")]
    public string? Currency { get; set; }
}

public class CreateGoalRequest
{
    [JsonPropertyName("title")]
    public string Title { get; set; } = string.Empty;

    [JsonPropertyName("description")]
    public string? Description { get; set; }

    [JsonPropertyName("category")]
    public string? Category { get; set; }

    [JsonPropertyName("targetValue")]
    public decimal TargetValue { get; set; }

    [JsonPropertyName("currentValue")]
    public decimal? CurrentValue { get; set; }

    [JsonPropertyName("unit")]
    public string? Unit { get; set; }

    [JsonPropertyName("priority")]
    public string? Priority { get; set; }

    [JsonPropertyName("dueDate")]
    public string? DueDate { get; set; }
}

public class UpdateGoalRequest
{
    [JsonPropertyName("title")]
    public string? Title { get; set; }

    [JsonPropertyName("description")]
    public string? Description { get; set; }

    [JsonPropertyName("category")]
    public string? Category { get; set; }

    [JsonPropertyName("targetValue")]
    public decimal? TargetValue { get; set; }

    [JsonPropertyName("currentValue")]
    public decimal? CurrentValue { get; set; }

    [JsonPropertyName("unit")]
    public string? Unit { get; set; }

    [JsonPropertyName("status")]
    public string? Status { get; set; }

    [JsonPropertyName("priority")]
    public string? Priority { get; set; }

    [JsonPropertyName("dueDate")]
    public string? DueDate { get; set; }

    [JsonPropertyName("sortOrder")]
    public int? SortOrder { get; set; }
}

public class ProjectionInput
{
    [JsonPropertyName("periodStart")]
    public string PeriodStart { get; set; } = string.Empty;

    [JsonPropertyName("periodEnd")]
    public string PeriodEnd { get; set; } = string.Empty;

    [JsonPropertyName("periodLabel")]
    public string PeriodLabel { get; set; } = string.Empty;

    [JsonPropertyName("projectedRevenue")]
    public decimal ProjectedRevenue { get; set; }

    [JsonPropertyName("projectedExpenses")]
    public decimal ProjectedExpenses { get; set; }

    [JsonPropertyName("projectedProfit")]
    public decimal ProjectedProfit { get; set; }

    [JsonPropertyName("notes")]
    public string? Notes { get; set; }
}

public class UpdateProjectionsRequest
{
    [JsonPropertyName("projections")]
    public List<ProjectionInput> Projections { get; set; } = [];
}

public class CreateScenarioRequest
{
    [JsonPropertyName("name")]
    public string Name { get; set; } = string.Empty;

    [JsonPropertyName("description")]
    public string? Description { get; set; }

    [JsonPropertyName("isDefault")]
    public bool? IsDefault { get; set; }

    [JsonPropertyName("assumptions")]
    public object? Assumptions { get; set; }
}

public class UpdateScenarioRequest
{
    [JsonPropertyName("name")]
    public string? Name { get; set; }

    [JsonPropertyName("description")]
    public string? Description { get; set; }

    [JsonPropertyName("assumptions")]
    public object? Assumptions { get; set; }
}

public class CreateDriverRequest
{
    [JsonPropertyName("name")]
    public string Name { get; set; } = string.Empty;

    [JsonPropertyName("description")]
    public string? Description { get; set; }

    [JsonPropertyName("driverType")]
    public string? DriverType { get; set; }

    [JsonPropertyName("value")]
    public decimal Value { get; set; }

    [JsonPropertyName("unit")]
    public string? Unit { get; set; }

    [JsonPropertyName("minValue")]
    public decimal? MinValue { get; set; }

    [JsonPropertyName("maxValue")]
    public decimal? MaxValue { get; set; }

    [JsonPropertyName("step")]
    public decimal? Step { get; set; }
}

public class UpdateDriverRequest
{
    [JsonPropertyName("name")]
    public string? Name { get; set; }

    [JsonPropertyName("description")]
    public string? Description { get; set; }

    [JsonPropertyName("driverType")]
    public string? DriverType { get; set; }

    [JsonPropertyName("value")]
    public decimal? Value { get; set; }

    [JsonPropertyName("unit")]
    public string? Unit { get; set; }

    [JsonPropertyName("minValue")]
    public decimal? MinValue { get; set; }

    [JsonPropertyName("maxValue")]
    public decimal? MaxValue { get; set; }

    [JsonPropertyName("step")]
    public decimal? Step { get; set; }
}

public class DriverValueInput
{
    [JsonPropertyName("driverId")]
    public Guid DriverId { get; set; }

    [JsonPropertyName("value")]
    public decimal Value { get; set; }
}

public class BulkUpdateDriversRequest
{
    [JsonPropertyName("drivers")]
    public List<DriverValueInput> Drivers { get; set; } = [];
}

public class RevenueModelInput
{
    [JsonPropertyName("name")]
    public string Name { get; set; } = string.Empty;

    [JsonPropertyName("modelType")]
    public string ModelType { get; set; } = "manual";

    [JsonPropertyName("description")]
    public string? Description { get; set; }

    [JsonPropertyName("leads")]
    public int? Leads { get; set; }

    [JsonPropertyName("conversionRate")]
    public decimal? ConversionRate { get; set; }

    [JsonPropertyName("averageDealSize")]
    public decimal? AverageDealSize { get; set; }

    [JsonPropertyName("salesReps")]
    public int? SalesReps { get; set; }

    [JsonPropertyName("quotaPerRep")]
    public decimal? QuotaPerRep { get; set; }

    [JsonPropertyName("quotaAttainment")]
    public decimal? QuotaAttainment { get; set; }

    [JsonPropertyName("manualRevenue")]
    public decimal? ManualRevenue { get; set; }

    [JsonPropertyName("scenarioId")]
    public Guid? ScenarioId { get; set; }
}

public class UpsertRevenueModelsRequest
{
    [JsonPropertyName("models")]
    public List<RevenueModelInput> Models { get; set; } = [];
}

public class CreateCostCategoryRequest
{
    [JsonPropertyName("name")]
    public string Name { get; set; } = string.Empty;

    [JsonPropertyName("costType")]
    public string CostType { get; set; } = "fixed";

    [JsonPropertyName("amount")]
    public decimal? Amount { get; set; }

    [JsonPropertyName("formula")]
    public string? Formula { get; set; }

    [JsonPropertyName("description")]
    public string? Description { get; set; }

    [JsonPropertyName("isRecurring")]
    public bool? IsRecurring { get; set; }

    [JsonPropertyName("frequency")]
    public string? Frequency { get; set; }
}

public class UpdateCostCategoryRequest
{
    [JsonPropertyName("name")]
    public string? Name { get; set; }

    [JsonPropertyName("costType")]
    public string? CostType { get; set; }

    [JsonPropertyName("amount")]
    public decimal? Amount { get; set; }

    [JsonPropertyName("formula")]
    public string? Formula { get; set; }

    [JsonPropertyName("description")]
    public string? Description { get; set; }

    [JsonPropertyName("isRecurring")]
    public bool? IsRecurring { get; set; }

    [JsonPropertyName("frequency")]
    public string? Frequency { get; set; }
}

public class CreateStaffingRequest
{
    [JsonPropertyName("roleName")]
    public string RoleName { get; set; } = string.Empty;

    [JsonPropertyName("department")]
    public string? Department { get; set; }

    [JsonPropertyName("headcount")]
    public int Headcount { get; set; }

    [JsonPropertyName("monthlySalary")]
    public decimal MonthlySalary { get; set; }

    [JsonPropertyName("triggerMetric")]
    public string? TriggerMetric { get; set; }

    [JsonPropertyName("triggerThreshold")]
    public decimal? TriggerThreshold { get; set; }

    [JsonPropertyName("startDate")]
    public string? StartDate { get; set; }

    [JsonPropertyName("notes")]
    public string? Notes { get; set; }
}

public class UpdateStaffingRequest
{
    [JsonPropertyName("roleName")]
    public string? RoleName { get; set; }

    [JsonPropertyName("department")]
    public string? Department { get; set; }

    [JsonPropertyName("headcount")]
    public int? Headcount { get; set; }

    [JsonPropertyName("monthlySalary")]
    public decimal? MonthlySalary { get; set; }

    [JsonPropertyName("triggerMetric")]
    public string? TriggerMetric { get; set; }

    [JsonPropertyName("triggerThreshold")]
    public decimal? TriggerThreshold { get; set; }

    [JsonPropertyName("startDate")]
    public string? StartDate { get; set; }

    [JsonPropertyName("notes")]
    public string? Notes { get; set; }
}

// =============================================
// Service DTO types (used by BusinessPlansService)
// =============================================

public class ProjectionDto
{
    [JsonPropertyName("id")]
    public Guid Id { get; set; }

    [JsonPropertyName("planId")]
    public Guid PlanId { get; set; }

    [JsonPropertyName("periodStart")]
    public string PeriodStart { get; set; } = string.Empty;

    [JsonPropertyName("periodEnd")]
    public string PeriodEnd { get; set; } = string.Empty;

    [JsonPropertyName("periodLabel")]
    public string? PeriodLabel { get; set; }

    [JsonPropertyName("projectedRevenue")]
    public decimal ProjectedRevenue { get; set; }

    [JsonPropertyName("projectedExpenses")]
    public decimal ProjectedExpenses { get; set; }

    [JsonPropertyName("projectedProfit")]
    public decimal ProjectedProfit { get; set; }

    [JsonPropertyName("notes")]
    [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
    public string? Notes { get; set; }

    [JsonPropertyName("createdAt")]
    public DateTime CreatedAt { get; set; }

    [JsonPropertyName("updatedAt")]
    public DateTime UpdatedAt { get; set; }
}

public class GoalDto
{
    [JsonPropertyName("id")]
    public Guid Id { get; set; }

    [JsonPropertyName("planId")]
    public Guid PlanId { get; set; }

    [JsonPropertyName("title")]
    public string Title { get; set; } = string.Empty;

    [JsonPropertyName("description")]
    [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
    public string? Description { get; set; }

    [JsonPropertyName("targetValue")]
    public decimal? TargetValue { get; set; }

    [JsonPropertyName("currentValue")]
    public decimal CurrentValue { get; set; }

    [JsonPropertyName("unit")]
    [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
    public string? Unit { get; set; }

    [JsonPropertyName("category")]
    [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
    public string? Category { get; set; }

    [JsonPropertyName("priority")]
    public string Priority { get; set; } = "medium";

    [JsonPropertyName("dueDate")]
    [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
    public string? DueDate { get; set; }

    [JsonPropertyName("status")]
    public string Status { get; set; } = "pending";

    [JsonPropertyName("sortOrder")]
    public int SortOrder { get; set; }

    [JsonPropertyName("createdAt")]
    public DateTime CreatedAt { get; set; }

    [JsonPropertyName("updatedAt")]
    public DateTime UpdatedAt { get; set; }
}

public class ScenarioDto
{
    [JsonPropertyName("id")]
    public Guid Id { get; set; }

    [JsonPropertyName("planId")]
    public Guid PlanId { get; set; }

    [JsonPropertyName("name")]
    public string Name { get; set; } = string.Empty;

    [JsonPropertyName("description")]
    [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
    public string? Description { get; set; }

    [JsonPropertyName("isDefault")]
    public bool IsDefault { get; set; }

    [JsonPropertyName("assumptions")]
    [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
    public object? Assumptions { get; set; }

    [JsonPropertyName("createdAt")]
    public DateTime CreatedAt { get; set; }

    [JsonPropertyName("updatedAt")]
    public DateTime UpdatedAt { get; set; }
}

public class DriverDto
{
    [JsonPropertyName("id")]
    public Guid Id { get; set; }

    [JsonPropertyName("planId")]
    public Guid PlanId { get; set; }

    [JsonPropertyName("name")]
    public string Name { get; set; } = string.Empty;

    [JsonPropertyName("description")]
    [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
    public string? Description { get; set; }

    [JsonPropertyName("driverType")]
    [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
    public string? DriverType { get; set; }

    [JsonPropertyName("value")]
    public decimal Value { get; set; }

    [JsonPropertyName("unit")]
    [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
    public string? Unit { get; set; }

    [JsonPropertyName("minValue")]
    [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
    public decimal? MinValue { get; set; }

    [JsonPropertyName("maxValue")]
    [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
    public decimal? MaxValue { get; set; }

    [JsonPropertyName("step")]
    [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
    public decimal? Step { get; set; }

    [JsonPropertyName("createdAt")]
    public DateTime CreatedAt { get; set; }

    [JsonPropertyName("updatedAt")]
    public DateTime UpdatedAt { get; set; }
}

public class RevenueModelDto
{
    [JsonPropertyName("id")]
    public Guid Id { get; set; }

    [JsonPropertyName("planId")]
    public Guid PlanId { get; set; }

    [JsonPropertyName("name")]
    public string Name { get; set; } = string.Empty;

    [JsonPropertyName("modelType")]
    public string ModelType { get; set; } = "manual";

    [JsonPropertyName("description")]
    [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
    public string? Description { get; set; }

    [JsonPropertyName("leads")]
    [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
    public int? Leads { get; set; }

    [JsonPropertyName("conversionRate")]
    [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
    public decimal? ConversionRate { get; set; }

    [JsonPropertyName("averageDealSize")]
    [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
    public decimal? AverageDealSize { get; set; }

    [JsonPropertyName("salesReps")]
    [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
    public int? SalesReps { get; set; }

    [JsonPropertyName("quotaPerRep")]
    [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
    public decimal? QuotaPerRep { get; set; }

    [JsonPropertyName("quotaAttainment")]
    [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
    public decimal? QuotaAttainment { get; set; }

    [JsonPropertyName("manualRevenue")]
    [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
    public decimal? ManualRevenue { get; set; }

    [JsonPropertyName("scenarioId")]
    [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
    public Guid? ScenarioId { get; set; }

    [JsonPropertyName("createdAt")]
    public DateTime CreatedAt { get; set; }

    [JsonPropertyName("updatedAt")]
    public DateTime UpdatedAt { get; set; }
}

public class CostCategoryDto
{
    [JsonPropertyName("id")]
    public Guid Id { get; set; }

    [JsonPropertyName("planId")]
    public Guid PlanId { get; set; }

    [JsonPropertyName("name")]
    public string Name { get; set; } = string.Empty;

    [JsonPropertyName("costType")]
    public string CostType { get; set; } = "fixed";

    [JsonPropertyName("amount")]
    [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
    public decimal? Amount { get; set; }

    [JsonPropertyName("formula")]
    [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
    public string? Formula { get; set; }

    [JsonPropertyName("description")]
    [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
    public string? Description { get; set; }

    [JsonPropertyName("isRecurring")]
    public bool IsRecurring { get; set; }

    [JsonPropertyName("frequency")]
    [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
    public string? Frequency { get; set; }

    [JsonPropertyName("createdAt")]
    public DateTime CreatedAt { get; set; }

    [JsonPropertyName("updatedAt")]
    public DateTime UpdatedAt { get; set; }
}

public class StaffingDto
{
    [JsonPropertyName("id")]
    public Guid Id { get; set; }

    [JsonPropertyName("planId")]
    public Guid PlanId { get; set; }

    [JsonPropertyName("roleName")]
    public string RoleName { get; set; } = string.Empty;

    [JsonPropertyName("department")]
    [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
    public string? Department { get; set; }

    [JsonPropertyName("headcount")]
    public int Headcount { get; set; }

    [JsonPropertyName("monthlySalary")]
    public decimal MonthlySalary { get; set; }

    [JsonPropertyName("triggerMetric")]
    [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
    public string? TriggerMetric { get; set; }

    [JsonPropertyName("triggerThreshold")]
    [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
    public decimal? TriggerThreshold { get; set; }

    [JsonPropertyName("startDate")]
    [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
    public string? StartDate { get; set; }

    [JsonPropertyName("notes")]
    [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
    public string? Notes { get; set; }

    [JsonPropertyName("createdAt")]
    public DateTime CreatedAt { get; set; }

    [JsonPropertyName("updatedAt")]
    public DateTime UpdatedAt { get; set; }
}

public class CalculatedResultDto
{
    [JsonPropertyName("id")]
    public Guid Id { get; set; }

    [JsonPropertyName("planId")]
    public Guid PlanId { get; set; }

    [JsonPropertyName("scenarioId")]
    public Guid ScenarioId { get; set; }

    [JsonPropertyName("scenarioName")]
    [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
    public string? ScenarioName { get; set; }

    [JsonPropertyName("periodStart")]
    public string PeriodStart { get; set; } = string.Empty;

    [JsonPropertyName("periodEnd")]
    public string PeriodEnd { get; set; } = string.Empty;

    [JsonPropertyName("periodLabel")]
    [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
    public string? PeriodLabel { get; set; }

    [JsonPropertyName("revenue")]
    public decimal Revenue { get; set; }

    [JsonPropertyName("fixedCosts")]
    public decimal FixedCosts { get; set; }

    [JsonPropertyName("variableCosts")]
    public decimal VariableCosts { get; set; }

    [JsonPropertyName("cogs")]
    public decimal Cogs { get; set; }

    [JsonPropertyName("staffingCosts")]
    public decimal StaffingCosts { get; set; }

    [JsonPropertyName("totalExpenses")]
    public decimal TotalExpenses { get; set; }

    [JsonPropertyName("netProfit")]
    public decimal NetProfit { get; set; }

    [JsonPropertyName("headcount")]
    public int Headcount { get; set; }

    [JsonPropertyName("calculatedAt")]
    public DateTime CalculatedAt { get; set; }
}

public class ActualsComparisonDto
{
    [JsonPropertyName("planId")]
    public Guid PlanId { get; set; }

    [JsonPropertyName("planName")]
    public string PlanName { get; set; } = string.Empty;

    [JsonPropertyName("periods")]
    public List<PeriodComparisonDto> Periods { get; set; } = [];

    [JsonPropertyName("totalProjectedRevenue")]
    public decimal TotalProjectedRevenue { get; set; }

    [JsonPropertyName("totalProjectedExpenses")]
    public decimal TotalProjectedExpenses { get; set; }

    [JsonPropertyName("totalActualRevenue")]
    public decimal TotalActualRevenue { get; set; }

    [JsonPropertyName("totalActualExpenses")]
    public decimal TotalActualExpenses { get; set; }
}

public class PeriodComparisonDto
{
    [JsonPropertyName("periodLabel")]
    public string PeriodLabel { get; set; } = string.Empty;

    [JsonPropertyName("periodStart")]
    public string PeriodStart { get; set; } = string.Empty;

    [JsonPropertyName("periodEnd")]
    public string PeriodEnd { get; set; } = string.Empty;

    [JsonPropertyName("projectedRevenue")]
    public decimal ProjectedRevenue { get; set; }

    [JsonPropertyName("projectedExpenses")]
    public decimal ProjectedExpenses { get; set; }

    [JsonPropertyName("projectedProfit")]
    public decimal ProjectedProfit { get; set; }

    [JsonPropertyName("actualRevenue")]
    public decimal ActualRevenue { get; set; }

    [JsonPropertyName("actualExpenses")]
    public decimal ActualExpenses { get; set; }

    [JsonPropertyName("actualProfit")]
    public decimal ActualProfit { get; set; }

    [JsonPropertyName("revenueVariance")]
    public decimal RevenueVariance { get; set; }

    [JsonPropertyName("expensesVariance")]
    public decimal ExpensesVariance { get; set; }

    [JsonPropertyName("profitVariance")]
    public decimal ProfitVariance { get; set; }
}

public class ScenarioComparisonDto
{
    [JsonPropertyName("planId")]
    public Guid PlanId { get; set; }

    [JsonPropertyName("scenarios")]
    public List<ScenarioResultsDto> Scenarios { get; set; } = [];
}

public class ScenarioResultsDto
{
    [JsonPropertyName("scenarioId")]
    public Guid ScenarioId { get; set; }

    [JsonPropertyName("scenarioName")]
    public string ScenarioName { get; set; } = string.Empty;

    [JsonPropertyName("totalRevenue")]
    public decimal TotalRevenue { get; set; }

    [JsonPropertyName("totalExpenses")]
    public decimal TotalExpenses { get; set; }

    [JsonPropertyName("totalProfit")]
    public decimal TotalProfit { get; set; }

    [JsonPropertyName("totalHeadcount")]
    public int TotalHeadcount { get; set; }

    [JsonPropertyName("periods")]
    public List<CalculatedResultDto> Periods { get; set; } = [];
}

// =============================================
// Database row types (snake_case mapping for Dapper)
// =============================================

public class BusinessPlanRow
{
    public Guid Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string? Description { get; set; }
    public int FiscalYear { get; set; }
    public string PeriodType { get; set; } = "monthly";
    public string Status { get; set; } = "draft";
    public Guid? PnlCenterId { get; set; }
    public decimal? TargetRevenue { get; set; }
    public decimal? TargetExpenses { get; set; }
    public decimal? TargetProfit { get; set; }
    public DateTime? StartDate { get; set; }
    public DateTime? EndDate { get; set; }
    public Guid? CreatedBy { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
}

public class PlanProjectionRow
{
    public Guid Id { get; set; }
    public Guid PlanId { get; set; }
    public string PeriodLabel { get; set; } = string.Empty;
    public DateTime PeriodStart { get; set; }
    public DateTime PeriodEnd { get; set; }
    public decimal ProjectedRevenue { get; set; }
    public decimal ProjectedExpenses { get; set; }
    public decimal ProjectedProfit { get; set; }
    public string? Notes { get; set; }
    public int SortOrder { get; set; }
}

public class PlanGoalRow
{
    public Guid Id { get; set; }
    public Guid PlanId { get; set; }
    public string Title { get; set; } = string.Empty;
    public string? Description { get; set; }
    public string Category { get; set; } = "custom";
    public decimal TargetValue { get; set; }
    public decimal CurrentValue { get; set; }
    public string? Unit { get; set; }
    public string Status { get; set; } = "not_started";
    public string Priority { get; set; } = "medium";
    public DateTime? DueDate { get; set; }
    public int SortOrder { get; set; }
}

public class PlanScenarioRow
{
    public Guid Id { get; set; }
    public Guid PlanId { get; set; }
    public string Name { get; set; } = string.Empty;
    public string? Description { get; set; }
    public decimal AdjustmentFactor { get; set; }
    public bool IsDefault { get; set; }
    public DateTime CreatedAt { get; set; }
}

public class PlanDriverRow
{
    public Guid Id { get; set; }
    public Guid PlanId { get; set; }
    public Guid? ScenarioId { get; set; }
    public string Code { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public string? Description { get; set; }
    public decimal Value { get; set; }
    public string DataType { get; set; } = "number";
    public string Category { get; set; } = "input";
    public bool IsEditable { get; set; } = true;
    public int SortOrder { get; set; }
}

public class PlanRevenueModelRow
{
    public Guid Id { get; set; }
    public Guid PlanId { get; set; }
    public string PeriodLabel { get; set; } = string.Empty;
    public string ModelType { get; set; } = "manual";
    public string? Inputs { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
}

public class PlanCostCategoryRow
{
    public Guid Id { get; set; }
    public Guid PlanId { get; set; }
    public string Name { get; set; } = string.Empty;
    public string CostType { get; set; } = "fixed";
    public decimal MonthlyAmount { get; set; }
    public string? Formula { get; set; }
    public string? DriverCode { get; set; }
    public string? Notes { get; set; }
    public int SortOrder { get; set; }
}

public class PlanStaffingRow
{
    public Guid Id { get; set; }
    public Guid PlanId { get; set; }
    public string RoleName { get; set; } = string.Empty;
    public string? Department { get; set; }
    public string? TriggerDriverCode { get; set; }
    public decimal? Threshold { get; set; }
    public decimal AnnualSalary { get; set; }
    public decimal BenefitsPercentage { get; set; }
    public int CurrentHeadcount { get; set; }
    public string? Notes { get; set; }
    public int SortOrder { get; set; }
}

public class PlanCalculatedResultRow
{
    public Guid Id { get; set; }
    public Guid PlanId { get; set; }
    public Guid? ScenarioId { get; set; }
    public string PeriodLabel { get; set; } = string.Empty;
    public decimal Revenue { get; set; }
    public decimal FixedCosts { get; set; }
    public decimal VariableCosts { get; set; }
    public decimal Cogs { get; set; }
    public decimal TotalCosts { get; set; }
    public decimal GrossProfit { get; set; }
    public decimal NetProfit { get; set; }
    public int Headcount { get; set; }
    public int NewHires { get; set; }
    public decimal StaffingCost { get; set; }
    public string? CalculationDetails { get; set; }
    public DateTime CalculatedAt { get; set; }
}
