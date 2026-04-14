using System.Text.Json.Serialization;

namespace FinanceManagement.Api.Models.Expenses;

// =============================================
// DTOs (API contract - camelCase JSON)
// =============================================

public class ExpenseDto
{
    [JsonPropertyName("id")]
    public string Id { get; set; } = string.Empty;

    [JsonPropertyName("description")]
    public string Description { get; set; } = string.Empty;

    [JsonPropertyName("amount")]
    public decimal Amount { get; set; }

    [JsonPropertyName("currency")]
    public string Currency { get; set; } = "USD";

    [JsonPropertyName("categoryId")]
    [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
    public string? CategoryId { get; set; }

    [JsonPropertyName("category")]
    [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
    public ExpenseCategoryDto? Category { get; set; }

    [JsonPropertyName("expenseDate")]
    public string ExpenseDate { get; set; } = string.Empty;

    [JsonPropertyName("isRecurring")]
    public bool IsRecurring { get; set; }

    [JsonPropertyName("recurringPattern")]
    [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
    public object? RecurringPattern { get; set; }

    [JsonPropertyName("vendorId")]
    [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
    public string? VendorId { get; set; }

    [JsonPropertyName("vendor")]
    [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
    public string? Vendor { get; set; }

    [JsonPropertyName("notes")]
    [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
    public string? Notes { get; set; }

    [JsonPropertyName("attachments")]
    public List<object> Attachments { get; set; } = [];

    [JsonPropertyName("tags")]
    public List<string> Tags { get; set; } = [];

    [JsonPropertyName("allocations")]
    public List<ExpenseAllocationDto> Allocations { get; set; } = [];

    [JsonPropertyName("dueDate")]
    [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
    public string? DueDate { get; set; }

    [JsonPropertyName("paymentStatus")]
    public string PaymentStatus { get; set; } = "paid";

    [JsonPropertyName("paymentDate")]
    [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
    public string? PaymentDate { get; set; }

    [JsonPropertyName("createdBy")]
    [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
    public string? CreatedBy { get; set; }

    [JsonPropertyName("createdAt")]
    public DateTime CreatedAt { get; set; }

    [JsonPropertyName("updatedAt")]
    public DateTime UpdatedAt { get; set; }
}

public class ExpenseCategoryDto
{
    [JsonPropertyName("id")]
    public string Id { get; set; } = string.Empty;

    [JsonPropertyName("name")]
    public string Name { get; set; } = string.Empty;

    [JsonPropertyName("type")]
    public string Type { get; set; } = string.Empty;

    [JsonPropertyName("parentId")]
    [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
    public string? ParentId { get; set; }

    [JsonPropertyName("isActive")]
    public bool IsActive { get; set; } = true;
}

public class ExpenseAllocationDto
{
    [JsonPropertyName("id")]
    public string Id { get; set; } = string.Empty;

    [JsonPropertyName("pnlCenterId")]
    public string PnlCenterId { get; set; } = string.Empty;

    [JsonPropertyName("pnlCenterName")]
    public string PnlCenterName { get; set; } = string.Empty;

    [JsonPropertyName("percentage")]
    public decimal Percentage { get; set; }

    [JsonPropertyName("allocatedAmount")]
    public decimal AllocatedAmount { get; set; }
}

// =============================================
// Request DTOs
// =============================================

public class CreateExpenseRequest
{
    [JsonPropertyName("description")]
    public string Description { get; set; } = string.Empty;

    [JsonPropertyName("amount")]
    public decimal Amount { get; set; }

    [JsonPropertyName("currency")]
    public string? Currency { get; set; }

    [JsonPropertyName("categoryId")]
    public string? CategoryId { get; set; }

    [JsonPropertyName("expenseDate")]
    public string ExpenseDate { get; set; } = string.Empty;

    [JsonPropertyName("isRecurring")]
    public bool IsRecurring { get; set; }

    [JsonPropertyName("recurringPattern")]
    public object? RecurringPattern { get; set; }

    [JsonPropertyName("vendorId")]
    public string? VendorId { get; set; }

    [JsonPropertyName("vendor")]
    public string? Vendor { get; set; }

    [JsonPropertyName("notes")]
    public string? Notes { get; set; }

    [JsonPropertyName("attachments")]
    public List<object>? Attachments { get; set; }

    [JsonPropertyName("tags")]
    public List<string>? Tags { get; set; }

    [JsonPropertyName("dueDate")]
    public string? DueDate { get; set; }

    [JsonPropertyName("paymentStatus")]
    public string? PaymentStatus { get; set; }

    [JsonPropertyName("paymentDate")]
    public string? PaymentDate { get; set; }

    [JsonPropertyName("allocations")]
    public List<AllocationInput> Allocations { get; set; } = [];
}

public class UpdateExpenseRequest
{
    [JsonPropertyName("description")]
    public string? Description { get; set; }

    [JsonPropertyName("amount")]
    public decimal? Amount { get; set; }

    [JsonPropertyName("currency")]
    public string? Currency { get; set; }

    [JsonPropertyName("categoryId")]
    public string? CategoryId { get; set; }

    [JsonPropertyName("expenseDate")]
    public string? ExpenseDate { get; set; }

    [JsonPropertyName("isRecurring")]
    public bool? IsRecurring { get; set; }

    [JsonPropertyName("recurringPattern")]
    public object? RecurringPattern { get; set; }

    [JsonPropertyName("vendorId")]
    public string? VendorId { get; set; }

    [JsonPropertyName("vendor")]
    public string? Vendor { get; set; }

    [JsonPropertyName("notes")]
    public string? Notes { get; set; }

    [JsonPropertyName("attachments")]
    public List<object>? Attachments { get; set; }

    [JsonPropertyName("tags")]
    public List<string>? Tags { get; set; }

    [JsonPropertyName("dueDate")]
    public string? DueDate { get; set; }

    [JsonPropertyName("paymentStatus")]
    public string? PaymentStatus { get; set; }

    [JsonPropertyName("paymentDate")]
    public string? PaymentDate { get; set; }

    [JsonPropertyName("allocations")]
    public List<AllocationInput>? Allocations { get; set; }
}

public class MarkExpensePaidRequest
{
    [JsonPropertyName("paymentDate")]
    public string? PaymentDate { get; set; }
}

public class AllocationInput
{
    [JsonPropertyName("pnlCenterId")]
    public string PnlCenterId { get; set; } = string.Empty;

    [JsonPropertyName("percentage")]
    public decimal Percentage { get; set; }
}

public class CreateCategoryRequest
{
    [JsonPropertyName("name")]
    public string Name { get; set; } = string.Empty;

    [JsonPropertyName("type")]
    public string Type { get; set; } = string.Empty;

    [JsonPropertyName("parentId")]
    public string? ParentId { get; set; }
}

public class UpdateCategoryRequest
{
    [JsonPropertyName("name")]
    public string? Name { get; set; }

    [JsonPropertyName("type")]
    public string? Type { get; set; }

    [JsonPropertyName("parentId")]
    public string? ParentId { get; set; }

    [JsonPropertyName("isActive")]
    public bool? IsActive { get; set; }
}

// =============================================
// Database row types (snake_case mapping for Dapper)
// =============================================

public class ExpenseRow
{
    public Guid Id { get; set; }
    public string Description { get; set; } = string.Empty;
    public decimal Amount { get; set; }
    public string Currency { get; set; } = "USD";
    public Guid? CategoryId { get; set; }
    public DateTime ExpenseDate { get; set; }
    public bool IsRecurring { get; set; }
    public string? RecurringPattern { get; set; }
    public Guid? VendorId { get; set; }
    public string? Vendor { get; set; }
    public string? Notes { get; set; }
    public string? Attachments { get; set; }
    public string[]? Tags { get; set; }
    public DateTime? DueDate { get; set; }
    public string PaymentStatus { get; set; } = "paid";
    public DateTime? PaymentDate { get; set; }
    public Guid? CreatedBy { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }

    // Joined category fields
    public string? CategoryName { get; set; }
    public string? CategoryType { get; set; }
    public Guid? CategoryParentId { get; set; }
    public bool? CategoryIsActive { get; set; }
}

public class AllocationRow
{
    public Guid Id { get; set; }
    public Guid ExpenseId { get; set; }
    public Guid PnlCenterId { get; set; }
    public string PnlCenterName { get; set; } = string.Empty;
    public decimal Percentage { get; set; }
    public decimal AllocatedAmount { get; set; }
}

public class CategoryRow
{
    public Guid Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string Type { get; set; } = string.Empty;
    public Guid? ParentId { get; set; }
    public bool IsActive { get; set; }
}
