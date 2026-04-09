using System.Text.Json;
using Dapper;
using FinanceManagement.Api.Database;
using FinanceManagement.Api.Middleware;
using FinanceManagement.Api.Models.Expenses;
using FinanceManagement.Api.Services.Vendors;

namespace FinanceManagement.Api.Services.Expenses;

public class ExpensesService
{
    private readonly DbContext _db;
    private readonly ILogger<ExpensesService> _logger;

    public ExpensesService(DbContext db, ILogger<ExpensesService> logger)
    {
        _db = db;
        _logger = logger;
    }

    // =============================================
    // Mappers
    // =============================================

    private static ExpenseCategoryDto MapCategory(CategoryRow row) => new()
    {
        Id = row.Id.ToString(),
        Name = row.Name,
        Type = row.Type,
        ParentId = row.ParentId?.ToString(),
        IsActive = row.IsActive,
    };

    private static ExpenseAllocationDto MapAllocation(AllocationRow row) => new()
    {
        Id = row.Id.ToString(),
        PnlCenterId = row.PnlCenterId.ToString(),
        PnlCenterName = row.PnlCenterName,
        Percentage = row.Percentage,
        AllocatedAmount = row.AllocatedAmount,
    };

    private static ExpenseDto MapExpense(ExpenseRow row, List<ExpenseAllocationDto> allocations) => new()
    {
        Id = row.Id.ToString(),
        Description = row.Description,
        Amount = row.Amount,
        Currency = row.Currency,
        CategoryId = row.CategoryId?.ToString(),
        Category = row.CategoryName != null
            ? new ExpenseCategoryDto
            {
                Id = row.CategoryId!.Value.ToString(),
                Name = row.CategoryName,
                Type = row.CategoryType ?? string.Empty,
                ParentId = row.CategoryParentId?.ToString(),
                IsActive = row.CategoryIsActive ?? true,
            }
            : null,
        ExpenseDate = row.ExpenseDate.ToString("yyyy-MM-dd"),
        IsRecurring = row.IsRecurring,
        RecurringPattern = row.RecurringPattern != null
            ? JsonSerializer.Deserialize<object>(row.RecurringPattern)
            : null,
        VendorId = row.VendorId?.ToString(),
        Vendor = row.Vendor,
        Notes = row.Notes,
        Attachments = row.Attachments != null
            ? JsonSerializer.Deserialize<List<object>>(row.Attachments) ?? []
            : [],
        Tags = row.Tags?.ToList() ?? [],
        Allocations = allocations,
        CreatedBy = row.CreatedBy?.ToString(),
        CreatedAt = row.CreatedAt,
        UpdatedAt = row.UpdatedAt,
    };

    // =============================================
    // Expenses CRUD
    // =============================================

    public async Task<(List<ExpenseDto> Expenses, int Total)> GetAllAsync(
        int page = 1,
        int limit = 20,
        string? dateFrom = null,
        string? dateTo = null,
        string? categoryId = null,
        string? vendor = null,
        bool? isRecurring = null,
        decimal? minAmount = null,
        decimal? maxAmount = null,
        string? search = null,
        string? sortBy = null,
        string? sortOrder = null)
    {
        await using var conn = _db.CreateConnection();
        await conn.OpenAsync();

        var conditions = new List<string>();
        var parameters = new DynamicParameters();

        if (!string.IsNullOrEmpty(dateFrom))
        {
            if (!DateTime.TryParse(dateFrom, out var dtFrom))
                throw new AppException("Invalid dateFrom format", 400, "VALIDATION_ERROR");
            conditions.Add("e.expense_date >= @DateFrom");
            parameters.Add("DateFrom", dtFrom);
        }
        if (!string.IsNullOrEmpty(dateTo))
        {
            if (!DateTime.TryParse(dateTo, out var dtTo))
                throw new AppException("Invalid dateTo format", 400, "VALIDATION_ERROR");
            conditions.Add("e.expense_date <= @DateTo");
            parameters.Add("DateTo", dtTo);
        }
        if (!string.IsNullOrEmpty(categoryId))
        {
            if (!Guid.TryParse(categoryId, out var catGuid))
                throw new AppException("Invalid categoryId format", 400, "VALIDATION_ERROR");
            conditions.Add("e.category_id = @CategoryId");
            parameters.Add("CategoryId", catGuid);
        }
        if (!string.IsNullOrEmpty(vendor))
        {
            conditions.Add("e.vendor ILIKE @Vendor");
            parameters.Add("Vendor", $"%{vendor}%");
        }
        if (isRecurring.HasValue)
        {
            conditions.Add("e.is_recurring = @IsRecurring");
            parameters.Add("IsRecurring", isRecurring.Value);
        }
        if (minAmount.HasValue)
        {
            conditions.Add("e.amount >= @MinAmount");
            parameters.Add("MinAmount", minAmount.Value);
        }
        if (maxAmount.HasValue)
        {
            conditions.Add("e.amount <= @MaxAmount");
            parameters.Add("MaxAmount", maxAmount.Value);
        }
        if (!string.IsNullOrEmpty(search))
        {
            conditions.Add("(e.description ILIKE @Search OR e.vendor ILIKE @Search)");
            parameters.Add("Search", $"%{search}%");
        }

        var whereClause = conditions.Count > 0 ? $"WHERE {string.Join(" AND ", conditions)}" : "";
        var offset = (page - 1) * limit;

        // Get total count
        var countSql = $"SELECT COUNT(*) FROM expenses e {whereClause}";
        var total = await conn.ExecuteScalarAsync<int>(countSql, parameters);

        // Determine sort column (whitelist to prevent SQL injection)
        var sortColumn = sortBy?.ToLower() switch
        {
            "amount" => "e.amount",
            "description" => "e.description",
            "vendor" => "e.vendor",
            "created_at" or "createdat" => "e.created_at",
            _ => "e.expense_date",
        };
        var sortDir = sortOrder?.ToUpper() == "ASC" ? "ASC" : "DESC";
        var orderClause = $"ORDER BY {sortColumn} {sortDir}, e.created_at DESC";

        // Get expenses with categories
        parameters.Add("Limit", limit);
        parameters.Add("Offset", offset);

        var expenseSql = $"""
            SELECT
                e.id, e.description, e.amount, e.currency, e.category_id,
                e.expense_date, e.is_recurring, e.recurring_pattern,
                e.vendor_id, COALESCE(v.name, e.vendor) AS vendor,
                e.notes, e.attachments::text, e.tags,
                e.created_by, e.created_at, e.updated_at,
                ec.name as category_name,
                ec.type as category_type,
                ec.parent_id as category_parent_id,
                ec.is_active as category_is_active
            FROM expenses e
            LEFT JOIN expense_categories ec ON ec.id = e.category_id
            LEFT JOIN vendors v ON v.id = e.vendor_id
            {whereClause}
            {orderClause}
            LIMIT @Limit OFFSET @Offset
            """;

        var expenseRows = (await conn.QueryAsync<ExpenseRow>(expenseSql, parameters)).ToList();

        // Get allocations for all expenses
        var allocationsMap = new Dictionary<string, List<ExpenseAllocationDto>>();

        if (expenseRows.Count > 0)
        {
            var expenseIds = expenseRows.Select(e => e.Id).ToArray();
            var allocationsSql = """
                SELECT
                    ea.id,
                    ea.expense_id,
                    ea.pnl_center_id,
                    pc.name as pnl_center_name,
                    ea.percentage,
                    ea.allocated_amount
                FROM expense_allocations ea
                JOIN pnl_centers pc ON pc.id = ea.pnl_center_id
                WHERE ea.expense_id = ANY(@ExpenseIds)
                """;

            var allocationRows = await conn.QueryAsync<AllocationRow>(allocationsSql, new { ExpenseIds = expenseIds });

            foreach (var row in allocationRows)
            {
                var key = row.ExpenseId.ToString();
                if (!allocationsMap.ContainsKey(key))
                    allocationsMap[key] = [];
                allocationsMap[key].Add(MapAllocation(row));
            }
        }

        var expenses = expenseRows.Select(row =>
            MapExpense(row, allocationsMap.GetValueOrDefault(row.Id.ToString(), []))
        ).ToList();

        return (expenses, total);
    }

    public async Task<ExpenseDto> GetByIdAsync(string id)
    {
        await using var conn = _db.CreateConnection();
        await conn.OpenAsync();

        var expenseSql = """
            SELECT
                e.id, e.description, e.amount, e.currency, e.category_id,
                e.expense_date, e.is_recurring, e.recurring_pattern,
                e.vendor_id, COALESCE(v.name, e.vendor) AS vendor,
                e.notes, e.attachments::text, e.tags,
                e.created_by, e.created_at, e.updated_at,
                ec.name as category_name,
                ec.type as category_type,
                ec.parent_id as category_parent_id,
                ec.is_active as category_is_active
            FROM expenses e
            LEFT JOIN expense_categories ec ON ec.id = e.category_id
            LEFT JOIN vendors v ON v.id = e.vendor_id
            WHERE e.id = @Id
            """;

        var row = await conn.QuerySingleOrDefaultAsync<ExpenseRow>(expenseSql, new { Id = Guid.Parse(id) });
        if (row == null)
            throw new AppException("Expense not found", 404, "NOT_FOUND");

        var allocationsSql = """
            SELECT
                ea.id,
                ea.expense_id,
                ea.pnl_center_id,
                pc.name as pnl_center_name,
                ea.percentage,
                ea.allocated_amount
            FROM expense_allocations ea
            JOIN pnl_centers pc ON pc.id = ea.pnl_center_id
            WHERE ea.expense_id = @Id
            """;

        var allocationRows = (await conn.QueryAsync<AllocationRow>(allocationsSql, new { Id = Guid.Parse(id) })).ToList();

        return MapExpense(row, allocationRows.Select(MapAllocation).ToList());
    }

    public async Task<ExpenseDto> CreateAsync(CreateExpenseRequest request, string userId)
    {
        await using var conn = _db.CreateConnection();
        await conn.OpenAsync();
        await using var tx = await conn.BeginTransactionAsync();

        try
        {
            var userGuid = Guid.Parse(userId);
            var resolvedVendorId = await VendorsService.GetOrCreateVendorAsync(
                conn, tx,
                !string.IsNullOrEmpty(request.VendorId) ? Guid.Parse(request.VendorId) : null,
                request.Vendor,
                userGuid);

            // Create expense
            var expenseSql = """
                INSERT INTO expenses (
                    description, amount, currency, category_id, expense_date,
                    is_recurring, recurring_pattern, vendor, vendor_id, notes, attachments, tags, created_by
                )
                VALUES (
                    @Description, @Amount, @Currency, @CategoryId, @ExpenseDate,
                    @IsRecurring, @RecurringPattern::jsonb, @Vendor, @VendorId, @Notes, @Attachments::jsonb, @Tags, @CreatedBy
                )
                RETURNING id, description, amount, currency, category_id, expense_date,
                          is_recurring, recurring_pattern, vendor_id, vendor, notes, attachments::text, tags,
                          created_by, created_at, updated_at
                """;

            var expenseRow = await conn.QuerySingleAsync<ExpenseRow>(expenseSql, new
            {
                request.Description,
                request.Amount,
                Currency = request.Currency ?? "USD",
                CategoryId = !string.IsNullOrEmpty(request.CategoryId) && Guid.TryParse(request.CategoryId, out var catId) ? (Guid?)catId : null,
                ExpenseDate = DateTime.TryParse(request.ExpenseDate, out var expDate) ? expDate : throw new AppException("Invalid expenseDate format", 400, "VALIDATION_ERROR"),
                request.IsRecurring,
                RecurringPattern = request.RecurringPattern != null
                    ? JsonSerializer.Serialize(request.RecurringPattern)
                    : null,
                request.Vendor,
                VendorId = resolvedVendorId,
                request.Notes,
                Attachments = JsonSerializer.Serialize(request.Attachments ?? []),
                Tags = request.Tags?.ToArray() ?? Array.Empty<string>(),
                CreatedBy = userGuid,
            }, tx);

            // Create allocations
            var allocations = new List<ExpenseAllocationDto>();
            foreach (var alloc in request.Allocations)
            {
                var allocatedAmount = request.Amount * alloc.Percentage / 100m;
                var allocSql = """
                    INSERT INTO expense_allocations (expense_id, pnl_center_id, percentage, allocated_amount)
                    VALUES (@ExpenseId, @PnlCenterId, @Percentage, @AllocatedAmount)
                    RETURNING
                        id,
                        expense_id,
                        pnl_center_id,
                        (SELECT name FROM pnl_centers WHERE id = @PnlCenterId) as pnl_center_name,
                        percentage,
                        allocated_amount
                    """;

                var allocRow = await conn.QuerySingleAsync<AllocationRow>(allocSql, new
                {
                    ExpenseId = expenseRow.Id,
                    PnlCenterId = Guid.Parse(alloc.PnlCenterId),
                    alloc.Percentage,
                    AllocatedAmount = allocatedAmount,
                }, tx);

                allocations.Add(MapAllocation(allocRow));
            }

            // Audit log
            await LogAuditAsync(conn, tx, Guid.Parse(userId), "create", "expense", expenseRow.Id,
                new { description = expenseRow.Description, amount = expenseRow.Amount, currency = expenseRow.Currency, vendor = expenseRow.Vendor });

            await tx.CommitAsync();

            _logger.LogInformation("Expense {ExpenseId} created by user {UserId}", expenseRow.Id, userId);

            return MapExpense(expenseRow, allocations);
        }
        catch (AppException)
        {
            await tx.RollbackAsync();
            throw;
        }
        catch (Exception ex)
        {
            await tx.RollbackAsync();
            _logger.LogError(ex, "Failed to create expense");
            throw;
        }
    }

    public async Task<ExpenseDto> UpdateAsync(string id, UpdateExpenseRequest request, string userId)
    {
        await using var conn = _db.CreateConnection();
        await conn.OpenAsync();
        await using var tx = await conn.BeginTransactionAsync();

        try
        {
            var expenseId = Guid.Parse(id);

            // Verify expense exists
            var exists = await conn.ExecuteScalarAsync<bool>(
                "SELECT EXISTS(SELECT 1 FROM expenses WHERE id = @Id)",
                new { Id = expenseId }, tx);
            if (!exists)
                throw new AppException("Expense not found", 404, "NOT_FOUND");

            // Build dynamic update
            var fields = new List<string>();
            var parameters = new DynamicParameters();
            parameters.Add("Id", expenseId);

            if (request.Description != null)
            {
                fields.Add("description = @Description");
                parameters.Add("Description", request.Description);
            }
            if (request.Amount.HasValue)
            {
                fields.Add("amount = @Amount");
                parameters.Add("Amount", request.Amount.Value);
            }
            if (request.Currency != null)
            {
                fields.Add("currency = @Currency");
                parameters.Add("Currency", request.Currency);
            }
            if (request.CategoryId != null)
            {
                if (!Guid.TryParse(request.CategoryId, out var updCatId))
                    throw new AppException("Invalid categoryId format", 400, "VALIDATION_ERROR");
                fields.Add("category_id = @CategoryId");
                parameters.Add("CategoryId", updCatId);
            }
            if (request.ExpenseDate != null)
            {
                if (!DateTime.TryParse(request.ExpenseDate, out var updDate))
                    throw new AppException("Invalid expenseDate format", 400, "VALIDATION_ERROR");
                fields.Add("expense_date = @ExpenseDate");
                parameters.Add("ExpenseDate", updDate);
            }
            if (request.IsRecurring.HasValue)
            {
                fields.Add("is_recurring = @IsRecurring");
                parameters.Add("IsRecurring", request.IsRecurring.Value);
            }
            if (request.RecurringPattern != null)
            {
                fields.Add("recurring_pattern = @RecurringPattern::jsonb");
                parameters.Add("RecurringPattern", JsonSerializer.Serialize(request.RecurringPattern));
            }
            if (request.Vendor != null || request.VendorId != null)
            {
                var resolvedVendorId = await VendorsService.GetOrCreateVendorAsync(
                    conn, tx,
                    !string.IsNullOrEmpty(request.VendorId) ? Guid.Parse(request.VendorId) : null,
                    request.Vendor,
                    Guid.Parse(userId));
                fields.Add("vendor = @Vendor");
                fields.Add("vendor_id = @VendorId");
                parameters.Add("Vendor", request.Vendor);
                parameters.Add("VendorId", resolvedVendorId);
            }
            if (request.Notes != null)
            {
                fields.Add("notes = @Notes");
                parameters.Add("Notes", request.Notes);
            }
            if (request.Attachments != null)
            {
                fields.Add("attachments = @Attachments::jsonb");
                parameters.Add("Attachments", JsonSerializer.Serialize(request.Attachments));
            }
            if (request.Tags != null)
            {
                fields.Add("tags = @Tags");
                parameters.Add("Tags", request.Tags.ToArray());
            }

            if (fields.Count > 0)
            {
                fields.Add("updated_at = NOW()");
                var updateSql = $"UPDATE expenses SET {string.Join(", ", fields)} WHERE id = @Id";
                await conn.ExecuteAsync(updateSql, parameters, tx);
            }

            // Update allocations if provided
            if (request.Allocations != null)
            {
                // Get current amount for recalculating allocations
                var amount = await conn.ExecuteScalarAsync<decimal>(
                    "SELECT amount FROM expenses WHERE id = @Id",
                    new { Id = expenseId }, tx);

                // Delete old allocations
                await conn.ExecuteAsync(
                    "DELETE FROM expense_allocations WHERE expense_id = @Id",
                    new { Id = expenseId }, tx);

                // Create new allocations
                foreach (var alloc in request.Allocations)
                {
                    var allocatedAmount = amount * alloc.Percentage / 100m;
                    await conn.ExecuteAsync(
                        """
                        INSERT INTO expense_allocations (expense_id, pnl_center_id, percentage, allocated_amount)
                        VALUES (@ExpenseId, @PnlCenterId, @Percentage, @AllocatedAmount)
                        """,
                        new
                        {
                            ExpenseId = expenseId,
                            PnlCenterId = Guid.Parse(alloc.PnlCenterId),
                            alloc.Percentage,
                            AllocatedAmount = allocatedAmount,
                        }, tx);
                }
            }

            // Audit log
            await LogAuditAsync(conn, tx, Guid.Parse(userId), "update", "expense", expenseId,
                new { description = request.Description, amount = request.Amount, currency = request.Currency, vendor = request.Vendor });

            await tx.CommitAsync();

            _logger.LogInformation("Expense {ExpenseId} updated by user {UserId}", id, userId);

            // Return full expense with category and allocations
            return await GetByIdAsync(id);
        }
        catch (AppException)
        {
            await tx.RollbackAsync();
            throw;
        }
        catch (Exception ex)
        {
            await tx.RollbackAsync();
            _logger.LogError(ex, "Failed to update expense {ExpenseId}", id);
            throw;
        }
    }

    public async Task DeleteAsync(string id, string userId)
    {
        await using var conn = _db.CreateConnection();
        await conn.OpenAsync();

        var expenseId = Guid.Parse(id);

        // Fetch before delete for audit log
        var expenseInfo = await conn.QuerySingleOrDefaultAsync<(string Description, decimal Amount, string Currency, string? Vendor)>(
            "SELECT description, amount, currency, vendor FROM expenses WHERE id = @Id",
            new { Id = expenseId });

        var rowsAffected = await conn.ExecuteAsync(
            "DELETE FROM expenses WHERE id = @Id",
            new { Id = expenseId });

        if (rowsAffected == 0)
            throw new AppException("Expense not found", 404, "NOT_FOUND");

        // Audit log
        await LogAuditAsync(conn, null, Guid.Parse(userId), "delete", "expense", expenseId,
            new { description = expenseInfo.Description, amount = expenseInfo.Amount, currency = expenseInfo.Currency, vendor = expenseInfo.Vendor });

        _logger.LogInformation("Expense {ExpenseId} deleted by user {UserId}", id, userId);
    }

    // =============================================
    // Categories CRUD
    // =============================================

    public async Task<List<ExpenseCategoryDto>> GetCategoriesAsync()
    {
        await using var conn = _db.CreateConnection();
        await conn.OpenAsync();

        var rows = await conn.QueryAsync<CategoryRow>("""
            SELECT id, name, type, parent_id, is_active
            FROM expense_categories
            WHERE is_active = true
            ORDER BY name ASC
            """);

        return rows.Select(MapCategory).ToList();
    }

    public async Task<ExpenseCategoryDto> CreateCategoryAsync(string name, string type, string? parentId)
    {
        await using var conn = _db.CreateConnection();
        await conn.OpenAsync();

        var row = await conn.QuerySingleAsync<CategoryRow>("""
            INSERT INTO expense_categories (name, type, parent_id)
            VALUES (@Name, @Type, @ParentId)
            RETURNING id, name, type, parent_id, is_active
            """,
            new
            {
                Name = name,
                Type = type,
                ParentId = !string.IsNullOrEmpty(parentId) ? (Guid?)Guid.Parse(parentId) : null,
            });

        _logger.LogInformation("Expense category {CategoryId} created: {Name}", row.Id, name);

        return MapCategory(row);
    }

    public async Task<ExpenseCategoryDto> UpdateCategoryAsync(string id, string? name, string? type, string? parentId)
    {
        var categoryId = Guid.Parse(id);

        await using var conn = _db.CreateConnection();
        await conn.OpenAsync();

        var fields = new List<string>();
        var parameters = new DynamicParameters();
        parameters.Add("Id", categoryId);

        if (name != null)
        {
            fields.Add("name = @Name");
            parameters.Add("Name", name);
        }
        if (type != null)
        {
            fields.Add("type = @Type");
            parameters.Add("Type", type);
        }
        if (parentId != null)
        {
            fields.Add("parent_id = @ParentId");
            parameters.Add("ParentId", Guid.Parse(parentId));
        }

        if (fields.Count == 0)
        {
            // No changes, return current
            var current = await conn.QuerySingleOrDefaultAsync<CategoryRow>(
                "SELECT id, name, type, parent_id, is_active FROM expense_categories WHERE id = @Id",
                new { Id = categoryId });

            if (current == null)
                throw new AppException("Category not found", 404, "NOT_FOUND");

            return MapCategory(current);
        }

        var sql = $"""
            UPDATE expense_categories SET {string.Join(", ", fields)}
            WHERE id = @Id
            RETURNING id, name, type, parent_id, is_active
            """;

        var row = await conn.QuerySingleOrDefaultAsync<CategoryRow>(sql, parameters);
        if (row == null)
            throw new AppException("Category not found", 404, "NOT_FOUND");

        _logger.LogInformation("Expense category {CategoryId} updated", id);

        return MapCategory(row);
    }

    public async Task DeleteCategoryAsync(string id)
    {
        await using var conn = _db.CreateConnection();
        await conn.OpenAsync();

        var categoryId = Guid.Parse(id);

        // Soft delete (matching Node.js behavior)
        var rowsAffected = await conn.ExecuteAsync(
            "UPDATE expense_categories SET is_active = false WHERE id = @Id AND is_active = true",
            new { Id = categoryId });

        if (rowsAffected == 0)
            throw new AppException("Category not found", 404, "NOT_FOUND");

        _logger.LogInformation("Expense category {CategoryId} soft-deleted", id);
    }

    // =============================================
    // Audit Helper
    // =============================================

    private static async Task LogAuditAsync(
        Npgsql.NpgsqlConnection conn,
        Npgsql.NpgsqlTransaction? tx,
        Guid userId,
        string action,
        string entityType,
        Guid entityId,
        object? details = null)
    {
        await conn.ExecuteAsync(
            """
            INSERT INTO audit_logs (user_id, action, entity_type, entity_id, new_values)
            VALUES (@UserId, @Action, @EntityType, @EntityId, @NewValues::jsonb)
            """,
            new
            {
                UserId = userId,
                Action = action,
                EntityType = entityType,
                EntityId = entityId,
                NewValues = details != null ? System.Text.Json.JsonSerializer.Serialize(details) : null,
            },
            tx);
    }
}
