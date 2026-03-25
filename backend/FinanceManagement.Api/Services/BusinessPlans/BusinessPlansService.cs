using System.Text;
using System.Text.RegularExpressions;
using Dapper;
using FinanceManagement.Api.Config;
using FinanceManagement.Api.Database;
using FinanceManagement.Api.Middleware;
using FinanceManagement.Api.Models.BusinessPlans;

namespace FinanceManagement.Api.Services.BusinessPlans;

public class BusinessPlansService
{
    private readonly DbContext _db;
    private readonly AppSettings _settings;
    private readonly ILogger<BusinessPlansService> _logger;

    public BusinessPlansService(DbContext db, AppSettings settings, ILogger<BusinessPlansService> logger)
    {
        _db = db;
        _settings = settings;
        _logger = logger;
    }

    // =============================================
    // Core CRUD
    // =============================================

    public async Task<(List<BusinessPlanDto> Items, int Total)> GetAllAsync(
        int page, int limit, int? fiscalYear, string? status, string? planType, Guid? pnlCenterId)
    {
        await using var conn = _db.CreateConnection();
        await conn.OpenAsync();

        var conditions = new List<string> { "bp.status != 'archived'" };
        var parameters = new DynamicParameters();

        if (fiscalYear.HasValue)
        {
            conditions.Add("bp.fiscal_year = @FiscalYear");
            parameters.Add("FiscalYear", fiscalYear.Value);
        }
        if (!string.IsNullOrEmpty(status))
        {
            // Allow querying archived explicitly
            conditions.Clear();
            conditions.Add("bp.status = @Status");
            parameters.Add("Status", status);
            if (fiscalYear.HasValue)
            {
                conditions.Add("bp.fiscal_year = @FiscalYear");
                parameters.Add("FiscalYear", fiscalYear.Value);
            }
        }
        if (!string.IsNullOrEmpty(planType))
        {
            conditions.Add("bp.plan_type = @PlanType");
            parameters.Add("PlanType", planType);
        }
        if (pnlCenterId.HasValue)
        {
            conditions.Add("bp.pnl_center_id = @PnlCenterId");
            parameters.Add("PnlCenterId", pnlCenterId.Value);
        }

        var whereClause = conditions.Count > 0 ? "WHERE " + string.Join(" AND ", conditions) : "";

        var countSql = $"SELECT COUNT(*) FROM business_plans bp {whereClause}";
        var total = await conn.ExecuteScalarAsync<int>(countSql, parameters);

        var offset = (page - 1) * limit;
        parameters.Add("Limit", limit);
        parameters.Add("Offset", offset);

        var sql = $"""
            SELECT
                bp.*,
                pc.name as pnl_center_name
            FROM business_plans bp
            LEFT JOIN pnl_centers pc ON pc.id = bp.pnl_center_id
            {whereClause}
            ORDER BY bp.created_at DESC
            LIMIT @Limit OFFSET @Offset
            """;

        var rows = (await conn.QueryAsync<DbBusinessPlanRow>(sql, parameters)).ToList();
        var items = rows.Select(MapPlan).ToList();
        return (items, total);
    }

    public async Task<BusinessPlanWithDetailsDto> GetByIdAsync(Guid id)
    {
        await using var conn = _db.CreateConnection();
        await conn.OpenAsync();

        var sql = """
            SELECT
                bp.*,
                pc.name as pnl_center_name
            FROM business_plans bp
            LEFT JOIN pnl_centers pc ON pc.id = bp.pnl_center_id
            WHERE bp.id = @Id
            """;

        var row = await conn.QuerySingleOrDefaultAsync<DbBusinessPlanRow>(sql, new { Id = id });
        if (row == null)
            throw new AppException("Business plan not found", 404, "NOT_FOUND");

        var projections = (await conn.QueryAsync<DbProjectionRow>(
            "SELECT * FROM plan_projections WHERE business_plan_id = @PlanId ORDER BY period_start ASC",
            new { PlanId = id })).ToList();

        var goals = (await conn.QueryAsync<DbGoalRow>(
            "SELECT * FROM plan_goals WHERE business_plan_id = @PlanId ORDER BY sort_order ASC",
            new { PlanId = id })).ToList();

        return new BusinessPlanWithDetailsDto
        {
            Id = row.id,
            Name = row.name,
            Description = row.description,
            PlanType = row.plan_type,
            Status = row.status,
            FiscalYear = row.fiscal_year,
            StartDate = row.start_date.ToString("yyyy-MM-dd"),
            EndDate = row.end_date.ToString("yyyy-MM-dd"),
            PnlCenterId = row.pnl_center_id,
            PnlCenterName = row.pnl_center_name,
            TargetRevenue = row.target_revenue,
            TargetExpenses = row.target_expenses,
            TargetProfit = row.target_profit,
            Currency = row.currency,
            CreatedBy = row.created_by,
            CreatedAt = row.created_at,
            UpdatedAt = row.updated_at,
            Projections = projections.Select(MapProjection).ToList(),
            Goals = goals.Select(MapGoal).ToList(),
        };
    }

    public async Task<BusinessPlanDto> CreateAsync(CreateBusinessPlanRequest request, Guid userId)
    {
        await using var conn = _db.CreateConnection();
        await conn.OpenAsync();

        var targetProfit = request.TargetRevenue - request.TargetExpenses;

        var sql = """
            INSERT INTO business_plans (
                name, description, plan_type, status, fiscal_year,
                start_date, end_date, pnl_center_id,
                target_revenue, target_expenses, target_profit,
                currency, created_by
            )
            VALUES (
                @Name, @Description, @PlanType, @Status, @FiscalYear,
                @StartDate::date, @EndDate::date, @PnlCenterId,
                @TargetRevenue, @TargetExpenses, @TargetProfit,
                @Currency, @CreatedBy
            )
            RETURNING *
            """;

        var row = await conn.QuerySingleAsync<DbBusinessPlanRow>(sql, new
        {
            request.Name,
            request.Description,
            request.PlanType,
            Status = request.Status ?? "draft",
            request.FiscalYear,
            request.StartDate,
            request.EndDate,
            request.PnlCenterId,
            request.TargetRevenue,
            request.TargetExpenses,
            TargetProfit = targetProfit,
            Currency = request.Currency ?? "USD",
            CreatedBy = userId,
        });

        // Audit log
        await LogAuditAsync(conn, null, userId, "create", "business_plan", row.id);

        _logger.LogInformation("Business plan {PlanId} created by user {UserId}", row.id, userId);
        return MapPlan(row);
    }

    public async Task<BusinessPlanDto> UpdateAsync(Guid id, UpdateBusinessPlanRequest request)
    {
        await using var conn = _db.CreateConnection();
        await conn.OpenAsync();

        var fields = new List<string>();
        var parameters = new DynamicParameters();
        parameters.Add("Id", id);

        if (request.Name != null)
        {
            fields.Add("name = @Name");
            parameters.Add("Name", request.Name);
        }
        if (request.Description != null)
        {
            fields.Add("description = @Description");
            parameters.Add("Description", request.Description);
        }
        if (request.PlanType != null)
        {
            fields.Add("plan_type = @PlanType");
            parameters.Add("PlanType", request.PlanType);
        }
        if (request.Status != null)
        {
            fields.Add("status = @Status");
            parameters.Add("Status", request.Status);
        }
        if (request.FiscalYear.HasValue)
        {
            fields.Add("fiscal_year = @FiscalYear");
            parameters.Add("FiscalYear", request.FiscalYear.Value);
        }
        if (request.StartDate != null)
        {
            fields.Add("start_date = @StartDate::date");
            parameters.Add("StartDate", request.StartDate);
        }
        if (request.EndDate != null)
        {
            fields.Add("end_date = @EndDate::date");
            parameters.Add("EndDate", request.EndDate);
        }
        if (request.PnlCenterId.HasValue)
        {
            fields.Add("pnl_center_id = @PnlCenterId");
            parameters.Add("PnlCenterId", request.PnlCenterId.Value);
        }
        if (request.TargetRevenue.HasValue)
        {
            fields.Add("target_revenue = @TargetRevenue");
            parameters.Add("TargetRevenue", request.TargetRevenue.Value);
        }
        if (request.TargetExpenses.HasValue)
        {
            fields.Add("target_expenses = @TargetExpenses");
            parameters.Add("TargetExpenses", request.TargetExpenses.Value);
        }
        if (request.Currency != null)
        {
            fields.Add("currency = @Currency");
            parameters.Add("Currency", request.Currency);
        }

        // Recalculate target_profit if revenue or expenses changed
        if (request.TargetRevenue.HasValue || request.TargetExpenses.HasValue)
        {
            fields.Add("target_profit = COALESCE(@NewTargetRevenue, target_revenue) - COALESCE(@NewTargetExpenses, target_expenses)");
            parameters.Add("NewTargetRevenue", request.TargetRevenue);
            parameters.Add("NewTargetExpenses", request.TargetExpenses);
        }

        if (fields.Count == 0)
        {
            var existing = await conn.QuerySingleOrDefaultAsync<DbBusinessPlanRow>(
                "SELECT bp.*, pc.name as pnl_center_name FROM business_plans bp LEFT JOIN pnl_centers pc ON pc.id = bp.pnl_center_id WHERE bp.id = @Id",
                new { Id = id });
            if (existing == null)
                throw new AppException("Business plan not found", 404, "NOT_FOUND");
            return MapPlan(existing);
        }

        fields.Add("updated_at = NOW()");
        var sql = $"""
            UPDATE business_plans SET {string.Join(", ", fields)}
            WHERE id = @Id
            RETURNING *
            """;

        var row = await conn.QuerySingleOrDefaultAsync<DbBusinessPlanRow>(sql, parameters);
        if (row == null)
            throw new AppException("Business plan not found", 404, "NOT_FOUND");

        _logger.LogInformation("Business plan {PlanId} updated", id);
        return MapPlan(row);
    }

    public async Task DeleteAsync(Guid id)
    {
        await using var conn = _db.CreateConnection();
        await conn.OpenAsync();

        var affected = await conn.ExecuteAsync(
            "UPDATE business_plans SET status = 'archived', updated_at = NOW() WHERE id = @Id AND status != 'archived'",
            new { Id = id });

        if (affected == 0)
            throw new AppException("Business plan not found or already archived", 404, "NOT_FOUND");

        _logger.LogInformation("Business plan {PlanId} archived", id);
    }

    // =============================================
    // Projections
    // =============================================

    public async Task<List<ProjectionDto>> UpdateProjectionsAsync(Guid planId, List<ProjectionInput> projections)
    {
        await using var conn = _db.CreateConnection();
        await conn.OpenAsync();

        await EnsurePlanExistsAsync(conn, planId);

        await using var tx = await conn.BeginTransactionAsync();
        try
        {
            foreach (var p in projections)
            {
                var sql = """
                    INSERT INTO plan_projections (
                        business_plan_id, period_start, period_end, period_label,
                        projected_revenue, projected_expenses, projected_profit, notes
                    )
                    VALUES (
                        @PlanId, @PeriodStart::date, @PeriodEnd::date, @PeriodLabel,
                        @ProjectedRevenue, @ProjectedExpenses, @ProjectedProfit, @Notes
                    )
                    ON CONFLICT (business_plan_id, period_start) DO UPDATE SET
                        period_end = EXCLUDED.period_end,
                        period_label = EXCLUDED.period_label,
                        projected_revenue = EXCLUDED.projected_revenue,
                        projected_expenses = EXCLUDED.projected_expenses,
                        projected_profit = EXCLUDED.projected_profit,
                        notes = EXCLUDED.notes,
                        updated_at = NOW()
                    """;

                await conn.ExecuteAsync(sql, new
                {
                    PlanId = planId,
                    p.PeriodStart,
                    p.PeriodEnd,
                    p.PeriodLabel,
                    p.ProjectedRevenue,
                    p.ProjectedExpenses,
                    ProjectedProfit = p.ProjectedRevenue - p.ProjectedExpenses,
                    p.Notes,
                }, tx);
            }

            await tx.CommitAsync();
        }
        catch
        {
            await tx.RollbackAsync();
            throw;
        }

        var rows = await conn.QueryAsync<DbProjectionRow>(
            "SELECT * FROM plan_projections WHERE business_plan_id = @PlanId ORDER BY period_start ASC",
            new { PlanId = planId });

        _logger.LogInformation("Projections updated for plan {PlanId}", planId);
        return rows.Select(MapProjection).ToList();
    }

    // =============================================
    // Goals
    // =============================================

    public async Task<GoalDto> CreateGoalAsync(Guid planId, CreateGoalRequest request)
    {
        await using var conn = _db.CreateConnection();
        await conn.OpenAsync();

        await EnsurePlanExistsAsync(conn, planId);

        var maxOrder = await conn.ExecuteScalarAsync<int?>(
            "SELECT MAX(sort_order) FROM plan_goals WHERE business_plan_id = @PlanId",
            new { PlanId = planId });

        var sql = """
            INSERT INTO plan_goals (
                business_plan_id, title, description, target_value, current_value,
                unit, category, priority, due_date, sort_order
            )
            VALUES (
                @PlanId, @Title, @Description, @TargetValue, @CurrentValue,
                @Unit, @Category, @Priority, @DueDate::date, @SortOrder
            )
            RETURNING *
            """;

        var row = await conn.QuerySingleAsync<DbGoalRow>(sql, new
        {
            PlanId = planId,
            request.Title,
            request.Description,
            request.TargetValue,
            CurrentValue = request.CurrentValue ?? 0m,
            request.Unit,
            request.Category,
            Priority = request.Priority ?? "medium",
            request.DueDate,
            SortOrder = (maxOrder ?? -1) + 1,
        });

        _logger.LogInformation("Goal {GoalId} created for plan {PlanId}", row.id, planId);
        return MapGoal(row);
    }

    public async Task<GoalDto> UpdateGoalAsync(Guid planId, Guid goalId, UpdateGoalRequest request)
    {
        await using var conn = _db.CreateConnection();
        await conn.OpenAsync();

        var fields = new List<string>();
        var parameters = new DynamicParameters();
        parameters.Add("Id", goalId);
        parameters.Add("PlanId", planId);

        if (request.Title != null)
        {
            fields.Add("title = @Title");
            parameters.Add("Title", request.Title);
        }
        if (request.Description != null)
        {
            fields.Add("description = @Description");
            parameters.Add("Description", request.Description);
        }
        if (request.TargetValue.HasValue)
        {
            fields.Add("target_value = @TargetValue");
            parameters.Add("TargetValue", request.TargetValue.Value);
        }
        if (request.CurrentValue.HasValue)
        {
            fields.Add("current_value = @CurrentValue");
            parameters.Add("CurrentValue", request.CurrentValue.Value);
        }
        if (request.Unit != null)
        {
            fields.Add("unit = @Unit");
            parameters.Add("Unit", request.Unit);
        }
        if (request.Category != null)
        {
            fields.Add("category = @Category");
            parameters.Add("Category", request.Category);
        }
        if (request.Priority != null)
        {
            fields.Add("priority = @Priority");
            parameters.Add("Priority", request.Priority);
        }
        if (request.DueDate != null)
        {
            fields.Add("due_date = @DueDate::date");
            parameters.Add("DueDate", request.DueDate);
        }
        if (request.Status != null)
        {
            fields.Add("status = @Status");
            parameters.Add("Status", request.Status);
        }
        if (request.SortOrder.HasValue)
        {
            fields.Add("sort_order = @SortOrder");
            parameters.Add("SortOrder", request.SortOrder.Value);
        }

        if (fields.Count == 0)
            throw new AppException("No fields to update", 400, "BAD_REQUEST");

        fields.Add("updated_at = NOW()");
        var sql = $"UPDATE plan_goals SET {string.Join(", ", fields)} WHERE id = @Id AND business_plan_id = @PlanId RETURNING *";

        var row = await conn.QuerySingleOrDefaultAsync<DbGoalRow>(sql, parameters);
        if (row == null)
            throw new AppException("Goal not found", 404, "NOT_FOUND");

        _logger.LogInformation("Goal {GoalId} updated for plan {PlanId}", goalId, planId);
        return MapGoal(row);
    }

    public async Task DeleteGoalAsync(Guid planId, Guid goalId)
    {
        await using var conn = _db.CreateConnection();
        await conn.OpenAsync();

        var affected = await conn.ExecuteAsync(
            "DELETE FROM plan_goals WHERE id = @Id AND business_plan_id = @PlanId",
            new { Id = goalId, PlanId = planId });

        if (affected == 0)
            throw new AppException("Goal not found", 404, "NOT_FOUND");

        _logger.LogInformation("Goal {GoalId} deleted from plan {PlanId}", goalId, planId);
    }

    // =============================================
    // Actuals Comparison
    // =============================================

    public async Task<ActualsComparisonDto> GetActualsComparisonAsync(Guid planId)
    {
        await using var conn = _db.CreateConnection();
        await conn.OpenAsync();

        var plan = await conn.QuerySingleOrDefaultAsync<DbBusinessPlanRow>(
            "SELECT * FROM business_plans WHERE id = @Id", new { Id = planId });
        if (plan == null)
            throw new AppException("Business plan not found", 404, "NOT_FOUND");

        // Get projections
        var projections = (await conn.QueryAsync<DbProjectionRow>(
            "SELECT * FROM plan_projections WHERE business_plan_id = @PlanId ORDER BY period_start ASC",
            new { PlanId = planId })).ToList();

        // Get actual income grouped by month within plan date range
        var actualIncomeSql = """
            SELECT
                DATE_TRUNC('month', income_date) as period,
                SUM(amount) as total
            FROM income
            WHERE income_date >= @StartDate AND income_date <= @EndDate
            GROUP BY DATE_TRUNC('month', income_date)
            ORDER BY period ASC
            """;

        var actualIncome = (await conn.QueryAsync<DbActualRow>(actualIncomeSql, new
        {
            StartDate = plan.start_date,
            EndDate = plan.end_date,
        })).ToList();

        // Get actual expenses grouped by month within plan date range
        var actualExpensesSql = """
            SELECT
                DATE_TRUNC('month', expense_date) as period,
                SUM(amount) as total
            FROM expenses
            WHERE expense_date >= @StartDate AND expense_date <= @EndDate
            GROUP BY DATE_TRUNC('month', expense_date)
            ORDER BY period ASC
            """;

        var actualExpenses = (await conn.QueryAsync<DbActualRow>(actualExpensesSql, new
        {
            StartDate = plan.start_date,
            EndDate = plan.end_date,
        })).ToList();

        var incomeMap = actualIncome.ToDictionary(a => a.period.ToString("yyyy-MM"), a => a.total);
        var expenseMap = actualExpenses.ToDictionary(a => a.period.ToString("yyyy-MM"), a => a.total);

        var periods = new List<PeriodComparisonDto>();
        foreach (var proj in projections)
        {
            var periodKey = proj.period_start.ToString("yyyy-MM");
            var actualRev = incomeMap.GetValueOrDefault(periodKey, 0m);
            var actualExp = expenseMap.GetValueOrDefault(periodKey, 0m);

            periods.Add(new PeriodComparisonDto
            {
                PeriodLabel = proj.period_label ?? periodKey,
                PeriodStart = proj.period_start.ToString("yyyy-MM-dd"),
                PeriodEnd = proj.period_end.ToString("yyyy-MM-dd"),
                ProjectedRevenue = proj.projected_revenue,
                ProjectedExpenses = proj.projected_expenses,
                ProjectedProfit = proj.projected_profit,
                ActualRevenue = actualRev,
                ActualExpenses = actualExp,
                ActualProfit = actualRev - actualExp,
                RevenueVariance = actualRev - proj.projected_revenue,
                ExpensesVariance = actualExp - proj.projected_expenses,
                ProfitVariance = (actualRev - actualExp) - proj.projected_profit,
            });
        }

        return new ActualsComparisonDto
        {
            PlanId = planId,
            PlanName = plan.name,
            Periods = periods,
            TotalProjectedRevenue = projections.Sum(p => p.projected_revenue),
            TotalProjectedExpenses = projections.Sum(p => p.projected_expenses),
            TotalActualRevenue = incomeMap.Values.Sum(),
            TotalActualExpenses = expenseMap.Values.Sum(),
        };
    }

    // =============================================
    // Engine (full driver-based planning data)
    // =============================================

    public async Task<BusinessPlanWithEngineDto> GetEngineAsync(Guid planId)
    {
        await using var conn = _db.CreateConnection();
        await conn.OpenAsync();

        var planRow = await conn.QuerySingleOrDefaultAsync<DbBusinessPlanRow>(
            "SELECT bp.*, pc.name as pnl_center_name FROM business_plans bp LEFT JOIN pnl_centers pc ON pc.id = bp.pnl_center_id WHERE bp.id = @Id",
            new { Id = planId });
        if (planRow == null)
            throw new AppException("Business plan not found", 404, "NOT_FOUND");

        var scenarios = (await conn.QueryAsync<DbScenarioRow>(
            "SELECT * FROM plan_scenarios WHERE business_plan_id = @PlanId ORDER BY is_default DESC, created_at ASC",
            new { PlanId = planId })).ToList();

        var drivers = (await conn.QueryAsync<DbDriverRow>(
            "SELECT * FROM plan_drivers WHERE business_plan_id = @PlanId ORDER BY name ASC",
            new { PlanId = planId })).ToList();

        var revenueModels = (await conn.QueryAsync<DbRevenueModelRow>(
            "SELECT * FROM plan_revenue_models WHERE business_plan_id = @PlanId ORDER BY created_at ASC",
            new { PlanId = planId })).ToList();

        var costCategories = (await conn.QueryAsync<DbCostCategoryRow>(
            "SELECT * FROM plan_cost_categories WHERE business_plan_id = @PlanId ORDER BY name ASC",
            new { PlanId = planId })).ToList();

        var staffing = (await conn.QueryAsync<DbStaffingRow>(
            "SELECT * FROM plan_staffing WHERE business_plan_id = @PlanId ORDER BY role_name ASC",
            new { PlanId = planId })).ToList();

        var results = (await conn.QueryAsync<DbCalculatedResultRow>(
            "SELECT cr.*, s.name as scenario_name FROM plan_calculated_results cr JOIN plan_scenarios s ON s.id = cr.scenario_id WHERE cr.business_plan_id = @PlanId ORDER BY cr.period_start ASC",
            new { PlanId = planId })).ToList();

        return new BusinessPlanWithEngineDto
        {
            Plan = MapPlan(planRow),
            Scenarios = scenarios.Select(MapScenario).ToList(),
            Drivers = drivers.Select(MapDriver).ToList(),
            RevenueModels = revenueModels.Select(MapRevenueModel).ToList(),
            CostCategories = costCategories.Select(MapCostCategory).ToList(),
            Staffing = staffing.Select(MapStaffing).ToList(),
            CalculatedResults = results.Select(MapCalculatedResult).ToList(),
        };
    }

    // =============================================
    // Scenarios
    // =============================================

    public async Task<List<ScenarioDto>> GetScenariosAsync(Guid planId)
    {
        await using var conn = _db.CreateConnection();
        await conn.OpenAsync();

        await EnsurePlanExistsAsync(conn, planId);

        var rows = await conn.QueryAsync<DbScenarioRow>(
            "SELECT * FROM plan_scenarios WHERE business_plan_id = @PlanId ORDER BY is_default DESC, created_at ASC",
            new { PlanId = planId });

        return rows.Select(MapScenario).ToList();
    }

    public async Task<ScenarioDto> CreateScenarioAsync(Guid planId, CreateScenarioRequest request)
    {
        await using var conn = _db.CreateConnection();
        await conn.OpenAsync();

        await EnsurePlanExistsAsync(conn, planId);

        var sql = """
            INSERT INTO plan_scenarios (
                business_plan_id, name, description, is_default, assumptions
            )
            VALUES (
                @PlanId, @Name, @Description, @IsDefault, @Assumptions::jsonb
            )
            RETURNING *
            """;

        var row = await conn.QuerySingleAsync<DbScenarioRow>(sql, new
        {
            PlanId = planId,
            request.Name,
            request.Description,
            IsDefault = request.IsDefault ?? false,
            Assumptions = request.Assumptions != null
                ? System.Text.Json.JsonSerializer.Serialize(request.Assumptions)
                : null,
        });

        _logger.LogInformation("Scenario {ScenarioId} created for plan {PlanId}", row.id, planId);
        return MapScenario(row);
    }

    public async Task<ScenarioDto> UpdateScenarioAsync(Guid planId, Guid scenarioId, UpdateScenarioRequest request)
    {
        await using var conn = _db.CreateConnection();
        await conn.OpenAsync();

        var fields = new List<string>();
        var parameters = new DynamicParameters();
        parameters.Add("Id", scenarioId);
        parameters.Add("PlanId", planId);

        if (request.Name != null)
        {
            fields.Add("name = @Name");
            parameters.Add("Name", request.Name);
        }
        if (request.Description != null)
        {
            fields.Add("description = @Description");
            parameters.Add("Description", request.Description);
        }
        if (request.Assumptions != null)
        {
            fields.Add("assumptions = @Assumptions::jsonb");
            parameters.Add("Assumptions", System.Text.Json.JsonSerializer.Serialize(request.Assumptions));
        }

        if (fields.Count == 0)
            throw new AppException("No fields to update", 400, "BAD_REQUEST");

        fields.Add("updated_at = NOW()");
        var sql = $"UPDATE plan_scenarios SET {string.Join(", ", fields)} WHERE id = @Id AND business_plan_id = @PlanId RETURNING *";

        var row = await conn.QuerySingleOrDefaultAsync<DbScenarioRow>(sql, parameters);
        if (row == null)
            throw new AppException("Scenario not found", 404, "NOT_FOUND");

        _logger.LogInformation("Scenario {ScenarioId} updated for plan {PlanId}", scenarioId, planId);
        return MapScenario(row);
    }

    public async Task DeleteScenarioAsync(Guid planId, Guid scenarioId)
    {
        await using var conn = _db.CreateConnection();
        await conn.OpenAsync();

        // Prevent deleting default scenarios
        var isDefault = await conn.ExecuteScalarAsync<bool>(
            "SELECT COALESCE(is_default, false) FROM plan_scenarios WHERE id = @Id AND business_plan_id = @PlanId",
            new { Id = scenarioId, PlanId = planId });

        if (isDefault)
            throw new AppException("Cannot delete a default scenario", 400, "CANNOT_DELETE_DEFAULT");

        var affected = await conn.ExecuteAsync(
            "DELETE FROM plan_scenarios WHERE id = @Id AND business_plan_id = @PlanId",
            new { Id = scenarioId, PlanId = planId });

        if (affected == 0)
            throw new AppException("Scenario not found", 404, "NOT_FOUND");

        _logger.LogInformation("Scenario {ScenarioId} deleted from plan {PlanId}", scenarioId, planId);
    }

    // =============================================
    // Drivers
    // =============================================

    public async Task<List<DriverDto>> GetDriversAsync(Guid planId)
    {
        await using var conn = _db.CreateConnection();
        await conn.OpenAsync();

        await EnsurePlanExistsAsync(conn, planId);

        var rows = await conn.QueryAsync<DbDriverRow>(
            "SELECT * FROM plan_drivers WHERE business_plan_id = @PlanId ORDER BY name ASC",
            new { PlanId = planId });

        return rows.Select(MapDriver).ToList();
    }

    public async Task<DriverDto> CreateDriverAsync(Guid planId, CreateDriverRequest request)
    {
        await using var conn = _db.CreateConnection();
        await conn.OpenAsync();

        await EnsurePlanExistsAsync(conn, planId);

        var sql = """
            INSERT INTO plan_drivers (
                business_plan_id, name, description, driver_type, value,
                unit, min_value, max_value, step
            )
            VALUES (
                @PlanId, @Name, @Description, @DriverType, @Value,
                @Unit, @MinValue, @MaxValue, @Step
            )
            RETURNING *
            """;

        var row = await conn.QuerySingleAsync<DbDriverRow>(sql, new
        {
            PlanId = planId,
            request.Name,
            request.Description,
            request.DriverType,
            request.Value,
            request.Unit,
            request.MinValue,
            request.MaxValue,
            request.Step,
        });

        _logger.LogInformation("Driver {DriverId} created for plan {PlanId}", row.id, planId);
        return MapDriver(row);
    }

    public async Task<DriverDto> UpdateDriverAsync(Guid planId, Guid driverId, UpdateDriverRequest request)
    {
        await using var conn = _db.CreateConnection();
        await conn.OpenAsync();

        var fields = new List<string>();
        var parameters = new DynamicParameters();
        parameters.Add("Id", driverId);
        parameters.Add("PlanId", planId);

        if (request.Name != null)
        {
            fields.Add("name = @Name");
            parameters.Add("Name", request.Name);
        }
        if (request.Description != null)
        {
            fields.Add("description = @Description");
            parameters.Add("Description", request.Description);
        }
        if (request.DriverType != null)
        {
            fields.Add("driver_type = @DriverType");
            parameters.Add("DriverType", request.DriverType);
        }
        if (request.Value.HasValue)
        {
            fields.Add("value = @Value");
            parameters.Add("Value", request.Value.Value);
        }
        if (request.Unit != null)
        {
            fields.Add("unit = @Unit");
            parameters.Add("Unit", request.Unit);
        }
        if (request.MinValue.HasValue)
        {
            fields.Add("min_value = @MinValue");
            parameters.Add("MinValue", request.MinValue.Value);
        }
        if (request.MaxValue.HasValue)
        {
            fields.Add("max_value = @MaxValue");
            parameters.Add("MaxValue", request.MaxValue.Value);
        }
        if (request.Step.HasValue)
        {
            fields.Add("step = @Step");
            parameters.Add("Step", request.Step.Value);
        }

        if (fields.Count == 0)
            throw new AppException("No fields to update", 400, "BAD_REQUEST");

        fields.Add("updated_at = NOW()");
        var sql = $"UPDATE plan_drivers SET {string.Join(", ", fields)} WHERE id = @Id AND business_plan_id = @PlanId RETURNING *";

        var row = await conn.QuerySingleOrDefaultAsync<DbDriverRow>(sql, parameters);
        if (row == null)
            throw new AppException("Driver not found", 404, "NOT_FOUND");

        _logger.LogInformation("Driver {DriverId} updated for plan {PlanId}", driverId, planId);
        return MapDriver(row);
    }

    public async Task<List<DriverDto>> BulkUpdateDriversAsync(Guid planId, List<DriverValueInput> drivers)
    {
        await using var conn = _db.CreateConnection();
        await conn.OpenAsync();

        await EnsurePlanExistsAsync(conn, planId);

        await using var tx = await conn.BeginTransactionAsync();
        try
        {
            foreach (var d in drivers)
            {
                var affected = await conn.ExecuteAsync(
                    "UPDATE plan_drivers SET value = @Value, updated_at = NOW() WHERE id = @Id AND business_plan_id = @PlanId",
                    new { Id = d.DriverId, PlanId = planId, d.Value }, tx);

                if (affected == 0)
                    throw new AppException($"Driver {d.DriverId} not found", 404, "NOT_FOUND");
            }

            await tx.CommitAsync();
        }
        catch
        {
            await tx.RollbackAsync();
            throw;
        }

        var rows = await conn.QueryAsync<DbDriverRow>(
            "SELECT * FROM plan_drivers WHERE business_plan_id = @PlanId ORDER BY name ASC",
            new { PlanId = planId });

        _logger.LogInformation("Bulk updated {Count} drivers for plan {PlanId}", drivers.Count, planId);
        return rows.Select(MapDriver).ToList();
    }

    public async Task DeleteDriverAsync(Guid planId, Guid driverId)
    {
        await using var conn = _db.CreateConnection();
        await conn.OpenAsync();

        var affected = await conn.ExecuteAsync(
            "DELETE FROM plan_drivers WHERE id = @Id AND business_plan_id = @PlanId",
            new { Id = driverId, PlanId = planId });

        if (affected == 0)
            throw new AppException("Driver not found", 404, "NOT_FOUND");

        _logger.LogInformation("Driver {DriverId} deleted from plan {PlanId}", driverId, planId);
    }

    // =============================================
    // Revenue Models
    // =============================================

    public async Task<List<RevenueModelDto>> GetRevenueModelsAsync(Guid planId)
    {
        await using var conn = _db.CreateConnection();
        await conn.OpenAsync();

        await EnsurePlanExistsAsync(conn, planId);

        var rows = await conn.QueryAsync<DbRevenueModelRow>(
            "SELECT * FROM plan_revenue_models WHERE business_plan_id = @PlanId ORDER BY created_at ASC",
            new { PlanId = planId });

        return rows.Select(MapRevenueModel).ToList();
    }

    public async Task<List<RevenueModelDto>> UpsertRevenueModelsAsync(Guid planId, List<RevenueModelInput> models)
    {
        await using var conn = _db.CreateConnection();
        await conn.OpenAsync();

        await EnsurePlanExistsAsync(conn, planId);

        await using var tx = await conn.BeginTransactionAsync();
        try
        {
            foreach (var m in models)
            {
                var sql = """
                    INSERT INTO plan_revenue_models (
                        business_plan_id, name, model_type, description,
                        leads, conversion_rate, average_deal_size,
                        sales_reps, quota_per_rep, quota_attainment,
                        manual_revenue, scenario_id
                    )
                    VALUES (
                        @PlanId, @Name, @ModelType, @Description,
                        @Leads, @ConversionRate, @AverageDealSize,
                        @SalesReps, @QuotaPerRep, @QuotaAttainment,
                        @ManualRevenue, @ScenarioId
                    )
                    ON CONFLICT (business_plan_id, name, COALESCE(scenario_id, '00000000-0000-0000-0000-000000000000')) DO UPDATE SET
                        model_type = EXCLUDED.model_type,
                        description = EXCLUDED.description,
                        leads = EXCLUDED.leads,
                        conversion_rate = EXCLUDED.conversion_rate,
                        average_deal_size = EXCLUDED.average_deal_size,
                        sales_reps = EXCLUDED.sales_reps,
                        quota_per_rep = EXCLUDED.quota_per_rep,
                        quota_attainment = EXCLUDED.quota_attainment,
                        manual_revenue = EXCLUDED.manual_revenue,
                        updated_at = NOW()
                    """;

                await conn.ExecuteAsync(sql, new
                {
                    PlanId = planId,
                    m.Name,
                    m.ModelType,
                    m.Description,
                    m.Leads,
                    m.ConversionRate,
                    m.AverageDealSize,
                    m.SalesReps,
                    m.QuotaPerRep,
                    m.QuotaAttainment,
                    m.ManualRevenue,
                    m.ScenarioId,
                }, tx);
            }

            await tx.CommitAsync();
        }
        catch
        {
            await tx.RollbackAsync();
            throw;
        }

        var rows = await conn.QueryAsync<DbRevenueModelRow>(
            "SELECT * FROM plan_revenue_models WHERE business_plan_id = @PlanId ORDER BY created_at ASC",
            new { PlanId = planId });

        _logger.LogInformation("Revenue models upserted for plan {PlanId}", planId);
        return rows.Select(MapRevenueModel).ToList();
    }

    // =============================================
    // Cost Categories
    // =============================================

    public async Task<List<CostCategoryDto>> GetCostCategoriesAsync(Guid planId)
    {
        await using var conn = _db.CreateConnection();
        await conn.OpenAsync();

        await EnsurePlanExistsAsync(conn, planId);

        var rows = await conn.QueryAsync<DbCostCategoryRow>(
            "SELECT * FROM plan_cost_categories WHERE business_plan_id = @PlanId ORDER BY name ASC",
            new { PlanId = planId });

        return rows.Select(MapCostCategory).ToList();
    }

    public async Task<CostCategoryDto> CreateCostCategoryAsync(Guid planId, CreateCostCategoryRequest request)
    {
        await using var conn = _db.CreateConnection();
        await conn.OpenAsync();

        await EnsurePlanExistsAsync(conn, planId);

        var sql = """
            INSERT INTO plan_cost_categories (
                business_plan_id, name, cost_type, amount, formula,
                description, is_recurring, frequency
            )
            VALUES (
                @PlanId, @Name, @CostType, @Amount, @Formula,
                @Description, @IsRecurring, @Frequency
            )
            RETURNING *
            """;

        var row = await conn.QuerySingleAsync<DbCostCategoryRow>(sql, new
        {
            PlanId = planId,
            request.Name,
            request.CostType,
            request.Amount,
            request.Formula,
            request.Description,
            IsRecurring = request.IsRecurring ?? false,
            request.Frequency,
        });

        _logger.LogInformation("Cost category {CategoryId} created for plan {PlanId}", row.id, planId);
        return MapCostCategory(row);
    }

    public async Task<CostCategoryDto> UpdateCostCategoryAsync(Guid planId, Guid categoryId, UpdateCostCategoryRequest request)
    {
        await using var conn = _db.CreateConnection();
        await conn.OpenAsync();

        var fields = new List<string>();
        var parameters = new DynamicParameters();
        parameters.Add("Id", categoryId);
        parameters.Add("PlanId", planId);

        if (request.Name != null)
        {
            fields.Add("name = @Name");
            parameters.Add("Name", request.Name);
        }
        if (request.CostType != null)
        {
            fields.Add("cost_type = @CostType");
            parameters.Add("CostType", request.CostType);
        }
        if (request.Amount.HasValue)
        {
            fields.Add("amount = @Amount");
            parameters.Add("Amount", request.Amount.Value);
        }
        if (request.Formula != null)
        {
            fields.Add("formula = @Formula");
            parameters.Add("Formula", request.Formula);
        }
        if (request.Description != null)
        {
            fields.Add("description = @Description");
            parameters.Add("Description", request.Description);
        }
        if (request.IsRecurring.HasValue)
        {
            fields.Add("is_recurring = @IsRecurring");
            parameters.Add("IsRecurring", request.IsRecurring.Value);
        }
        if (request.Frequency != null)
        {
            fields.Add("frequency = @Frequency");
            parameters.Add("Frequency", request.Frequency);
        }

        if (fields.Count == 0)
            throw new AppException("No fields to update", 400, "BAD_REQUEST");

        fields.Add("updated_at = NOW()");
        var sql = $"UPDATE plan_cost_categories SET {string.Join(", ", fields)} WHERE id = @Id AND business_plan_id = @PlanId RETURNING *";

        var row = await conn.QuerySingleOrDefaultAsync<DbCostCategoryRow>(sql, parameters);
        if (row == null)
            throw new AppException("Cost category not found", 404, "NOT_FOUND");

        _logger.LogInformation("Cost category {CategoryId} updated for plan {PlanId}", categoryId, planId);
        return MapCostCategory(row);
    }

    public async Task DeleteCostCategoryAsync(Guid planId, Guid categoryId)
    {
        await using var conn = _db.CreateConnection();
        await conn.OpenAsync();

        var affected = await conn.ExecuteAsync(
            "DELETE FROM plan_cost_categories WHERE id = @Id AND business_plan_id = @PlanId",
            new { Id = categoryId, PlanId = planId });

        if (affected == 0)
            throw new AppException("Cost category not found", 404, "NOT_FOUND");

        _logger.LogInformation("Cost category {CategoryId} deleted from plan {PlanId}", categoryId, planId);
    }

    // =============================================
    // Staffing
    // =============================================

    public async Task<List<StaffingDto>> GetStaffingAsync(Guid planId)
    {
        await using var conn = _db.CreateConnection();
        await conn.OpenAsync();

        await EnsurePlanExistsAsync(conn, planId);

        var rows = await conn.QueryAsync<DbStaffingRow>(
            "SELECT * FROM plan_staffing WHERE business_plan_id = @PlanId ORDER BY role_name ASC",
            new { PlanId = planId });

        return rows.Select(MapStaffing).ToList();
    }

    public async Task<StaffingDto> CreateStaffingAsync(Guid planId, CreateStaffingRequest request)
    {
        await using var conn = _db.CreateConnection();
        await conn.OpenAsync();

        await EnsurePlanExistsAsync(conn, planId);

        var sql = """
            INSERT INTO plan_staffing (
                business_plan_id, role_name, department, headcount,
                monthly_salary, trigger_metric, trigger_threshold,
                start_date, notes
            )
            VALUES (
                @PlanId, @RoleName, @Department, @Headcount,
                @MonthlySalary, @TriggerMetric, @TriggerThreshold,
                @StartDate::date, @Notes
            )
            RETURNING *
            """;

        var row = await conn.QuerySingleAsync<DbStaffingRow>(sql, new
        {
            PlanId = planId,
            request.RoleName,
            request.Department,
            request.Headcount,
            request.MonthlySalary,
            request.TriggerMetric,
            request.TriggerThreshold,
            request.StartDate,
            request.Notes,
        });

        _logger.LogInformation("Staffing rule {RuleId} created for plan {PlanId}", row.id, planId);
        return MapStaffing(row);
    }

    public async Task<StaffingDto> UpdateStaffingAsync(Guid planId, Guid ruleId, UpdateStaffingRequest request)
    {
        await using var conn = _db.CreateConnection();
        await conn.OpenAsync();

        var fields = new List<string>();
        var parameters = new DynamicParameters();
        parameters.Add("Id", ruleId);
        parameters.Add("PlanId", planId);

        if (request.RoleName != null)
        {
            fields.Add("role_name = @RoleName");
            parameters.Add("RoleName", request.RoleName);
        }
        if (request.Department != null)
        {
            fields.Add("department = @Department");
            parameters.Add("Department", request.Department);
        }
        if (request.Headcount.HasValue)
        {
            fields.Add("headcount = @Headcount");
            parameters.Add("Headcount", request.Headcount.Value);
        }
        if (request.MonthlySalary.HasValue)
        {
            fields.Add("monthly_salary = @MonthlySalary");
            parameters.Add("MonthlySalary", request.MonthlySalary.Value);
        }
        if (request.TriggerMetric != null)
        {
            fields.Add("trigger_metric = @TriggerMetric");
            parameters.Add("TriggerMetric", request.TriggerMetric);
        }
        if (request.TriggerThreshold.HasValue)
        {
            fields.Add("trigger_threshold = @TriggerThreshold");
            parameters.Add("TriggerThreshold", request.TriggerThreshold.Value);
        }
        if (request.StartDate != null)
        {
            fields.Add("start_date = @StartDate::date");
            parameters.Add("StartDate", request.StartDate);
        }
        if (request.Notes != null)
        {
            fields.Add("notes = @Notes");
            parameters.Add("Notes", request.Notes);
        }

        if (fields.Count == 0)
            throw new AppException("No fields to update", 400, "BAD_REQUEST");

        fields.Add("updated_at = NOW()");
        var sql = $"UPDATE plan_staffing SET {string.Join(", ", fields)} WHERE id = @Id AND business_plan_id = @PlanId RETURNING *";

        var row = await conn.QuerySingleOrDefaultAsync<DbStaffingRow>(sql, parameters);
        if (row == null)
            throw new AppException("Staffing rule not found", 404, "NOT_FOUND");

        _logger.LogInformation("Staffing rule {RuleId} updated for plan {PlanId}", ruleId, planId);
        return MapStaffing(row);
    }

    public async Task DeleteStaffingAsync(Guid planId, Guid ruleId)
    {
        await using var conn = _db.CreateConnection();
        await conn.OpenAsync();

        var affected = await conn.ExecuteAsync(
            "DELETE FROM plan_staffing WHERE id = @Id AND business_plan_id = @PlanId",
            new { Id = ruleId, PlanId = planId });

        if (affected == 0)
            throw new AppException("Staffing rule not found", 404, "NOT_FOUND");

        _logger.LogInformation("Staffing rule {RuleId} deleted from plan {PlanId}", ruleId, planId);
    }

    // =============================================
    // Calculation Engine
    // =============================================

    public async Task CalculateAsync(Guid planId)
    {
        await using var conn = _db.CreateConnection();
        await conn.OpenAsync();

        var plan = await conn.QuerySingleOrDefaultAsync<DbBusinessPlanRow>(
            "SELECT * FROM business_plans WHERE id = @Id", new { Id = planId });
        if (plan == null)
            throw new AppException("Business plan not found", 404, "NOT_FOUND");

        // Load all plan data
        var scenarios = (await conn.QueryAsync<DbScenarioRow>(
            "SELECT * FROM plan_scenarios WHERE business_plan_id = @PlanId",
            new { PlanId = planId })).ToList();

        // If no scenarios, create a default one for calculation
        if (scenarios.Count == 0)
        {
            var defaultScenario = await conn.QuerySingleAsync<DbScenarioRow>(
                """
                INSERT INTO plan_scenarios (business_plan_id, name, description, is_default)
                VALUES (@PlanId, 'Base', 'Default base scenario', true)
                RETURNING *
                """,
                new { PlanId = planId });
            scenarios.Add(defaultScenario);
        }

        var revenueModels = (await conn.QueryAsync<DbRevenueModelRow>(
            "SELECT * FROM plan_revenue_models WHERE business_plan_id = @PlanId",
            new { PlanId = planId })).ToList();

        var costCategories = (await conn.QueryAsync<DbCostCategoryRow>(
            "SELECT * FROM plan_cost_categories WHERE business_plan_id = @PlanId",
            new { PlanId = planId })).ToList();

        var staffingRules = (await conn.QueryAsync<DbStaffingRow>(
            "SELECT * FROM plan_staffing WHERE business_plan_id = @PlanId",
            new { PlanId = planId })).ToList();

        var drivers = (await conn.QueryAsync<DbDriverRow>(
            "SELECT * FROM plan_drivers WHERE business_plan_id = @PlanId",
            new { PlanId = planId })).ToList();

        var driverValues = drivers.ToDictionary(d => d.name, d => d.value);

        var projections = (await conn.QueryAsync<DbProjectionRow>(
            "SELECT * FROM plan_projections WHERE business_plan_id = @PlanId ORDER BY period_start ASC",
            new { PlanId = planId })).ToList();

        await using var tx = await conn.BeginTransactionAsync();
        try
        {
            foreach (var scenario in scenarios)
            {
                var scenarioRevenueModels = revenueModels
                    .Where(rm => rm.scenario_id == null || rm.scenario_id == scenario.id)
                    .ToList();

                foreach (var proj in projections)
                {
                    // --- Revenue Calculation ---
                    decimal totalRevenue = 0m;
                    foreach (var rm in scenarioRevenueModels)
                    {
                        totalRevenue += rm.model_type switch
                        {
                            "leads_based" => (rm.leads ?? 0) * (rm.conversion_rate ?? 0m) * (rm.average_deal_size ?? 0m),
                            "headcount_based" => (rm.sales_reps ?? 0) * (rm.quota_per_rep ?? 0m) * (rm.quota_attainment ?? 0m),
                            "manual" => rm.manual_revenue ?? 0m,
                            _ => 0m,
                        };
                    }

                    // If no revenue models, fall back to projection value
                    if (scenarioRevenueModels.Count == 0)
                        totalRevenue = proj.projected_revenue;

                    // --- Fixed Costs ---
                    decimal fixedCosts = costCategories
                        .Where(c => c.cost_type == "fixed")
                        .Sum(c => c.amount ?? 0m);

                    // --- Variable Costs (formula-based) ---
                    decimal variableCosts = 0m;
                    foreach (var cc in costCategories.Where(c => c.cost_type == "variable"))
                    {
                        if (!string.IsNullOrEmpty(cc.formula))
                        {
                            variableCosts += EvaluateFormula(cc.formula, driverValues);
                        }
                        else
                        {
                            variableCosts += cc.amount ?? 0m;
                        }
                    }

                    // --- COGS (formula-based) ---
                    decimal cogs = 0m;
                    foreach (var cc in costCategories.Where(c => c.cost_type == "cogs"))
                    {
                        if (!string.IsNullOrEmpty(cc.formula))
                        {
                            cogs += EvaluateFormula(cc.formula, driverValues);
                        }
                        else
                        {
                            cogs += cc.amount ?? 0m;
                        }
                    }

                    // --- Staffing Costs ---
                    decimal staffingCosts = 0m;
                    int totalHeadcount = 0;
                    foreach (var rule in staffingRules)
                    {
                        int headcount;
                        if (rule.trigger_threshold.HasValue && rule.trigger_threshold.Value > 0
                            && !string.IsNullOrEmpty(rule.trigger_metric))
                        {
                            // Dynamic headcount based on trigger
                            var triggerValue = driverValues.GetValueOrDefault(rule.trigger_metric, 0m);
                            headcount = (int)Math.Ceiling(triggerValue / rule.trigger_threshold.Value);
                        }
                        else
                        {
                            headcount = rule.headcount;
                        }

                        totalHeadcount += headcount;
                        staffingCosts += headcount * rule.monthly_salary;
                    }

                    decimal totalExpenses = fixedCosts + variableCosts + cogs + staffingCosts;
                    decimal netProfit = totalRevenue - totalExpenses;

                    // Store result
                    var upsertSql = """
                        INSERT INTO plan_calculated_results (
                            business_plan_id, scenario_id, period_start, period_end, period_label,
                            revenue, fixed_costs, variable_costs, cogs, staffing_costs,
                            total_expenses, net_profit, headcount
                        )
                        VALUES (
                            @PlanId, @ScenarioId, @PeriodStart, @PeriodEnd, @PeriodLabel,
                            @Revenue, @FixedCosts, @VariableCosts, @Cogs, @StaffingCosts,
                            @TotalExpenses, @NetProfit, @Headcount
                        )
                        ON CONFLICT (business_plan_id, scenario_id, period_start) DO UPDATE SET
                            period_end = EXCLUDED.period_end,
                            period_label = EXCLUDED.period_label,
                            revenue = EXCLUDED.revenue,
                            fixed_costs = EXCLUDED.fixed_costs,
                            variable_costs = EXCLUDED.variable_costs,
                            cogs = EXCLUDED.cogs,
                            staffing_costs = EXCLUDED.staffing_costs,
                            total_expenses = EXCLUDED.total_expenses,
                            net_profit = EXCLUDED.net_profit,
                            headcount = EXCLUDED.headcount,
                            calculated_at = NOW()
                        """;

                    await conn.ExecuteAsync(upsertSql, new
                    {
                        PlanId = planId,
                        ScenarioId = scenario.id,
                        PeriodStart = proj.period_start,
                        PeriodEnd = proj.period_end,
                        PeriodLabel = proj.period_label,
                        Revenue = totalRevenue,
                        FixedCosts = fixedCosts,
                        VariableCosts = variableCosts,
                        Cogs = cogs,
                        StaffingCosts = staffingCosts,
                        TotalExpenses = totalExpenses,
                        NetProfit = netProfit,
                        Headcount = totalHeadcount,
                    }, tx);
                }
            }

            await tx.CommitAsync();
        }
        catch
        {
            await tx.RollbackAsync();
            throw;
        }

        _logger.LogInformation("Calculation completed for plan {PlanId} across {ScenarioCount} scenarios",
            planId, scenarios.Count);
    }

    public async Task<List<CalculatedResultDto>> GetResultsAsync(Guid planId, Guid? scenarioId)
    {
        await using var conn = _db.CreateConnection();
        await conn.OpenAsync();

        await EnsurePlanExistsAsync(conn, planId);

        string sql;
        object sqlParams;

        if (scenarioId.HasValue)
        {
            sql = """
                SELECT cr.*, s.name as scenario_name
                FROM plan_calculated_results cr
                JOIN plan_scenarios s ON s.id = cr.scenario_id
                WHERE cr.business_plan_id = @PlanId AND cr.scenario_id = @ScenarioId
                ORDER BY cr.period_start ASC
                """;
            sqlParams = new { PlanId = planId, ScenarioId = scenarioId.Value };
        }
        else
        {
            // Return results for the default scenario
            sql = """
                SELECT cr.*, s.name as scenario_name
                FROM plan_calculated_results cr
                JOIN plan_scenarios s ON s.id = cr.scenario_id
                WHERE cr.business_plan_id = @PlanId AND s.is_default = true
                ORDER BY cr.period_start ASC
                """;
            sqlParams = new { PlanId = planId };
        }

        var rows = await conn.QueryAsync<DbCalculatedResultRow>(sql, sqlParams);
        return rows.Select(MapCalculatedResult).ToList();
    }

    public async Task<ScenarioComparisonDto> CompareResultsAsync(Guid planId)
    {
        await using var conn = _db.CreateConnection();
        await conn.OpenAsync();

        await EnsurePlanExistsAsync(conn, planId);

        var sql = """
            SELECT cr.*, s.name as scenario_name
            FROM plan_calculated_results cr
            JOIN plan_scenarios s ON s.id = cr.scenario_id
            WHERE cr.business_plan_id = @PlanId
            ORDER BY s.is_default DESC, s.name ASC, cr.period_start ASC
            """;

        var allResults = (await conn.QueryAsync<DbCalculatedResultRow>(sql, new { PlanId = planId })).ToList();

        var grouped = allResults
            .GroupBy(r => new { r.scenario_id, r.scenario_name })
            .Select(g => new ScenarioResultsDto
            {
                ScenarioId = g.Key.scenario_id,
                ScenarioName = g.Key.scenario_name ?? "Unknown",
                TotalRevenue = g.Sum(r => r.revenue),
                TotalExpenses = g.Sum(r => r.total_expenses),
                TotalProfit = g.Sum(r => r.net_profit),
                TotalHeadcount = g.Max(r => r.headcount),
                Periods = g.Select(MapCalculatedResult).ToList(),
            })
            .ToList();

        return new ScenarioComparisonDto
        {
            PlanId = planId,
            Scenarios = grouped,
        };
    }

    // =============================================
    // Formula Evaluation Engine
    // =============================================

    /// <summary>
    /// Evaluates a simple arithmetic formula with variable substitution.
    /// Supports +, -, *, / operators and variable names from driver values.
    /// Examples: "leads * conversion_rate * 100", "base_cost + markup * units"
    /// </summary>
    private static decimal EvaluateFormula(string formula, Dictionary<string, decimal> variables)
    {
        if (string.IsNullOrWhiteSpace(formula))
            return 0m;

        // Substitute variables with their values
        var expression = formula;
        foreach (var kvp in variables.OrderByDescending(v => v.Key.Length))
        {
            expression = expression.Replace(kvp.Key, kvp.Value.ToString(System.Globalization.CultureInfo.InvariantCulture));
        }

        // Tokenize and evaluate using basic recursive descent parser
        try
        {
            var tokens = Tokenize(expression);
            var pos = 0;
            var result = ParseExpression(tokens, ref pos);
            return result;
        }
        catch
        {
            // If formula can't be parsed, return 0
            return 0m;
        }
    }

    private static List<string> Tokenize(string expression)
    {
        var tokens = new List<string>();
        var i = 0;
        while (i < expression.Length)
        {
            if (char.IsWhiteSpace(expression[i]))
            {
                i++;
                continue;
            }

            if (expression[i] == '+' || expression[i] == '-' || expression[i] == '*' || expression[i] == '/'
                || expression[i] == '(' || expression[i] == ')')
            {
                tokens.Add(expression[i].ToString());
                i++;
                continue;
            }

            if (char.IsDigit(expression[i]) || expression[i] == '.')
            {
                var start = i;
                while (i < expression.Length && (char.IsDigit(expression[i]) || expression[i] == '.'))
                    i++;
                tokens.Add(expression[start..i]);
                continue;
            }

            // Skip unknown characters
            i++;
        }
        return tokens;
    }

    private static decimal ParseExpression(List<string> tokens, ref int pos)
    {
        var left = ParseTerm(tokens, ref pos);

        while (pos < tokens.Count && (tokens[pos] == "+" || tokens[pos] == "-"))
        {
            var op = tokens[pos];
            pos++;
            var right = ParseTerm(tokens, ref pos);
            left = op == "+" ? left + right : left - right;
        }

        return left;
    }

    private static decimal ParseTerm(List<string> tokens, ref int pos)
    {
        var left = ParseFactor(tokens, ref pos);

        while (pos < tokens.Count && (tokens[pos] == "*" || tokens[pos] == "/"))
        {
            var op = tokens[pos];
            pos++;
            var right = ParseFactor(tokens, ref pos);
            left = op == "*" ? left * right : (right != 0 ? left / right : 0m);
        }

        return left;
    }

    private static decimal ParseFactor(List<string> tokens, ref int pos)
    {
        if (pos >= tokens.Count)
            return 0m;

        // Handle unary minus
        if (tokens[pos] == "-")
        {
            pos++;
            return -ParseFactor(tokens, ref pos);
        }

        // Handle parentheses
        if (tokens[pos] == "(")
        {
            pos++; // skip '('
            var result = ParseExpression(tokens, ref pos);
            if (pos < tokens.Count && tokens[pos] == ")")
                pos++; // skip ')'
            return result;
        }

        // Number
        if (decimal.TryParse(tokens[pos], System.Globalization.NumberStyles.Any,
            System.Globalization.CultureInfo.InvariantCulture, out var value))
        {
            pos++;
            return value;
        }

        pos++;
        return 0m;
    }

    // =============================================
    // Helpers
    // =============================================

    private static async Task EnsurePlanExistsAsync(Npgsql.NpgsqlConnection conn, Guid planId)
    {
        var exists = await conn.ExecuteScalarAsync<bool>(
            "SELECT EXISTS(SELECT 1 FROM business_plans WHERE id = @Id)",
            new { Id = planId });

        if (!exists)
            throw new AppException("Business plan not found", 404, "NOT_FOUND");
    }

    private static async Task LogAuditAsync(
        Npgsql.NpgsqlConnection conn,
        Npgsql.NpgsqlTransaction? tx,
        Guid userId,
        string action,
        string entityType,
        Guid entityId)
    {
        await conn.ExecuteAsync(
            """
            INSERT INTO audit_logs (user_id, action, entity_type, entity_id)
            VALUES (@UserId, @Action, @EntityType, @EntityId)
            """,
            new { UserId = userId, Action = action, EntityType = entityType, EntityId = entityId },
            tx);
    }

    // =============================================
    // Database Row Types
    // =============================================

    internal class DbBusinessPlanRow
    {
        public Guid id { get; set; }
        public string name { get; set; } = string.Empty;
        public string? description { get; set; }
        public string plan_type { get; set; } = string.Empty;
        public string status { get; set; } = "draft";
        public int fiscal_year { get; set; }
        public DateTime start_date { get; set; }
        public DateTime end_date { get; set; }
        public Guid? pnl_center_id { get; set; }
        public string? pnl_center_name { get; set; }
        public decimal target_revenue { get; set; }
        public decimal target_expenses { get; set; }
        public decimal target_profit { get; set; }
        public string currency { get; set; } = "USD";
        public Guid? created_by { get; set; }
        public DateTime created_at { get; set; }
        public DateTime updated_at { get; set; }
    }

    internal class DbProjectionRow
    {
        public Guid id { get; set; }
        public Guid business_plan_id { get; set; }
        public DateTime period_start { get; set; }
        public DateTime period_end { get; set; }
        public string? period_label { get; set; }
        public decimal projected_revenue { get; set; }
        public decimal projected_expenses { get; set; }
        public decimal projected_profit { get; set; }
        public string? notes { get; set; }
        public DateTime created_at { get; set; }
        public DateTime updated_at { get; set; }
    }

    internal class DbGoalRow
    {
        public Guid id { get; set; }
        public Guid business_plan_id { get; set; }
        public string title { get; set; } = string.Empty;
        public string? description { get; set; }
        public decimal? target_value { get; set; }
        public decimal current_value { get; set; }
        public string? unit { get; set; }
        public string? category { get; set; }
        public string priority { get; set; } = "medium";
        public string? due_date { get; set; }
        public string status { get; set; } = "pending";
        public int sort_order { get; set; }
        public DateTime created_at { get; set; }
        public DateTime updated_at { get; set; }
    }

    internal class DbScenarioRow
    {
        public Guid id { get; set; }
        public Guid business_plan_id { get; set; }
        public string name { get; set; } = string.Empty;
        public string? description { get; set; }
        public bool is_default { get; set; }
        public string? assumptions { get; set; }
        public DateTime created_at { get; set; }
        public DateTime updated_at { get; set; }
    }

    internal class DbDriverRow
    {
        public Guid id { get; set; }
        public Guid business_plan_id { get; set; }
        public string name { get; set; } = string.Empty;
        public string? description { get; set; }
        public string? driver_type { get; set; }
        public decimal value { get; set; }
        public string? unit { get; set; }
        public decimal? min_value { get; set; }
        public decimal? max_value { get; set; }
        public decimal? step { get; set; }
        public DateTime created_at { get; set; }
        public DateTime updated_at { get; set; }
    }

    internal class DbRevenueModelRow
    {
        public Guid id { get; set; }
        public Guid business_plan_id { get; set; }
        public string name { get; set; } = string.Empty;
        public string model_type { get; set; } = string.Empty;
        public string? description { get; set; }
        public int? leads { get; set; }
        public decimal? conversion_rate { get; set; }
        public decimal? average_deal_size { get; set; }
        public int? sales_reps { get; set; }
        public decimal? quota_per_rep { get; set; }
        public decimal? quota_attainment { get; set; }
        public decimal? manual_revenue { get; set; }
        public Guid? scenario_id { get; set; }
        public DateTime created_at { get; set; }
        public DateTime updated_at { get; set; }
    }

    internal class DbCostCategoryRow
    {
        public Guid id { get; set; }
        public Guid business_plan_id { get; set; }
        public string name { get; set; } = string.Empty;
        public string cost_type { get; set; } = string.Empty;
        public decimal? amount { get; set; }
        public string? formula { get; set; }
        public string? description { get; set; }
        public bool is_recurring { get; set; }
        public string? frequency { get; set; }
        public DateTime created_at { get; set; }
        public DateTime updated_at { get; set; }
    }

    internal class DbStaffingRow
    {
        public Guid id { get; set; }
        public Guid business_plan_id { get; set; }
        public string role_name { get; set; } = string.Empty;
        public string? department { get; set; }
        public int headcount { get; set; }
        public decimal monthly_salary { get; set; }
        public string? trigger_metric { get; set; }
        public decimal? trigger_threshold { get; set; }
        public string? start_date { get; set; }
        public string? notes { get; set; }
        public DateTime created_at { get; set; }
        public DateTime updated_at { get; set; }
    }

    internal class DbCalculatedResultRow
    {
        public Guid id { get; set; }
        public Guid business_plan_id { get; set; }
        public Guid scenario_id { get; set; }
        public string? scenario_name { get; set; }
        public DateTime period_start { get; set; }
        public DateTime period_end { get; set; }
        public string? period_label { get; set; }
        public decimal revenue { get; set; }
        public decimal fixed_costs { get; set; }
        public decimal variable_costs { get; set; }
        public decimal cogs { get; set; }
        public decimal staffing_costs { get; set; }
        public decimal total_expenses { get; set; }
        public decimal net_profit { get; set; }
        public int headcount { get; set; }
        public DateTime calculated_at { get; set; }
    }

    internal class DbActualRow
    {
        public DateTime period { get; set; }
        public decimal total { get; set; }
    }

    // =============================================
    // Mappers
    // =============================================

    private static BusinessPlanDto MapPlan(DbBusinessPlanRow row) => new()
    {
        Id = row.id,
        Name = row.name,
        Description = row.description,
        PlanType = row.plan_type,
        Status = row.status,
        FiscalYear = row.fiscal_year,
        StartDate = row.start_date.ToString("yyyy-MM-dd"),
        EndDate = row.end_date.ToString("yyyy-MM-dd"),
        PnlCenterId = row.pnl_center_id,
        PnlCenterName = row.pnl_center_name,
        TargetRevenue = row.target_revenue,
        TargetExpenses = row.target_expenses,
        TargetProfit = row.target_profit,
        Currency = row.currency,
        CreatedBy = row.created_by,
        CreatedAt = row.created_at,
        UpdatedAt = row.updated_at,
    };

    private static ProjectionDto MapProjection(DbProjectionRow row) => new()
    {
        Id = row.id,
        PlanId = row.business_plan_id,
        PeriodStart = row.period_start.ToString("yyyy-MM-dd"),
        PeriodEnd = row.period_end.ToString("yyyy-MM-dd"),
        PeriodLabel = row.period_label,
        ProjectedRevenue = row.projected_revenue,
        ProjectedExpenses = row.projected_expenses,
        ProjectedProfit = row.projected_profit,
        Notes = row.notes,
        CreatedAt = row.created_at,
        UpdatedAt = row.updated_at,
    };

    private static GoalDto MapGoal(DbGoalRow row) => new()
    {
        Id = row.id,
        PlanId = row.business_plan_id,
        Title = row.title,
        Description = row.description,
        TargetValue = row.target_value,
        CurrentValue = row.current_value,
        Unit = row.unit,
        Category = row.category,
        Priority = row.priority,
        DueDate = row.due_date,
        Status = row.status,
        SortOrder = row.sort_order,
        CreatedAt = row.created_at,
        UpdatedAt = row.updated_at,
    };

    private static ScenarioDto MapScenario(DbScenarioRow row) => new()
    {
        Id = row.id,
        PlanId = row.business_plan_id,
        Name = row.name,
        Description = row.description,
        IsDefault = row.is_default,
        Assumptions = row.assumptions != null
            ? System.Text.Json.JsonSerializer.Deserialize<object>(row.assumptions)
            : null,
        CreatedAt = row.created_at,
        UpdatedAt = row.updated_at,
    };

    private static DriverDto MapDriver(DbDriverRow row) => new()
    {
        Id = row.id,
        PlanId = row.business_plan_id,
        Name = row.name,
        Description = row.description,
        DriverType = row.driver_type,
        Value = row.value,
        Unit = row.unit,
        MinValue = row.min_value,
        MaxValue = row.max_value,
        Step = row.step,
        CreatedAt = row.created_at,
        UpdatedAt = row.updated_at,
    };

    private static RevenueModelDto MapRevenueModel(DbRevenueModelRow row) => new()
    {
        Id = row.id,
        PlanId = row.business_plan_id,
        Name = row.name,
        ModelType = row.model_type,
        Description = row.description,
        Leads = row.leads,
        ConversionRate = row.conversion_rate,
        AverageDealSize = row.average_deal_size,
        SalesReps = row.sales_reps,
        QuotaPerRep = row.quota_per_rep,
        QuotaAttainment = row.quota_attainment,
        ManualRevenue = row.manual_revenue,
        ScenarioId = row.scenario_id,
        CreatedAt = row.created_at,
        UpdatedAt = row.updated_at,
    };

    private static CostCategoryDto MapCostCategory(DbCostCategoryRow row) => new()
    {
        Id = row.id,
        PlanId = row.business_plan_id,
        Name = row.name,
        CostType = row.cost_type,
        Amount = row.amount,
        Formula = row.formula,
        Description = row.description,
        IsRecurring = row.is_recurring,
        Frequency = row.frequency,
        CreatedAt = row.created_at,
        UpdatedAt = row.updated_at,
    };

    private static StaffingDto MapStaffing(DbStaffingRow row) => new()
    {
        Id = row.id,
        PlanId = row.business_plan_id,
        RoleName = row.role_name,
        Department = row.department,
        Headcount = row.headcount,
        MonthlySalary = row.monthly_salary,
        TriggerMetric = row.trigger_metric,
        TriggerThreshold = row.trigger_threshold,
        StartDate = row.start_date,
        Notes = row.notes,
        CreatedAt = row.created_at,
        UpdatedAt = row.updated_at,
    };

    private static CalculatedResultDto MapCalculatedResult(DbCalculatedResultRow row) => new()
    {
        Id = row.id,
        PlanId = row.business_plan_id,
        ScenarioId = row.scenario_id,
        ScenarioName = row.scenario_name,
        PeriodStart = row.period_start.ToString("yyyy-MM-dd"),
        PeriodEnd = row.period_end.ToString("yyyy-MM-dd"),
        PeriodLabel = row.period_label,
        Revenue = row.revenue,
        FixedCosts = row.fixed_costs,
        VariableCosts = row.variable_costs,
        Cogs = row.cogs,
        StaffingCosts = row.staffing_costs,
        TotalExpenses = row.total_expenses,
        NetProfit = row.net_profit,
        Headcount = row.headcount,
        CalculatedAt = row.calculated_at,
    };
}
