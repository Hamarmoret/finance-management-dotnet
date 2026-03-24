using System.Text.Json.Serialization;

namespace FinanceManagement.Api.Models.Income;

// =============================================
// DTOs (API contract - camelCase JSON)
// =============================================

public class IncomeDto
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
    public IncomeCategoryDto? Category { get; set; }

    [JsonPropertyName("incomeDate")]
    public string IncomeDate { get; set; } = string.Empty;

    [JsonPropertyName("isRecurring")]
    public bool IsRecurring { get; set; }

    [JsonPropertyName("recurringPattern")]
    [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
    public object? RecurringPattern { get; set; }

    [JsonPropertyName("clientName")]
    [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
    public string? ClientName { get; set; }

    [JsonPropertyName("invoiceNumber")]
    [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
    public string? InvoiceNumber { get; set; }

    [JsonPropertyName("invoiceType")]
    [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
    public string? InvoiceType { get; set; }

    [JsonPropertyName("invoiceStatus")]
    [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
    public string? InvoiceStatus { get; set; }

    [JsonPropertyName("paymentDueDate")]
    [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
    public string? PaymentDueDate { get; set; }

    [JsonPropertyName("paymentReceivedDate")]
    [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
    public string? PaymentReceivedDate { get; set; }

    [JsonPropertyName("notes")]
    [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
    public string? Notes { get; set; }

    [JsonPropertyName("tags")]
    public List<string> Tags { get; set; } = [];

    [JsonPropertyName("allocations")]
    public List<IncomeAllocationDto> Allocations { get; set; } = [];

    [JsonPropertyName("createdBy")]
    [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
    public string? CreatedBy { get; set; }

    [JsonPropertyName("createdAt")]
    public DateTime CreatedAt { get; set; }

    [JsonPropertyName("updatedAt")]
    public DateTime UpdatedAt { get; set; }
}

public class IncomeCategoryDto
{
    [JsonPropertyName("id")]
    public string Id { get; set; } = string.Empty;

    [JsonPropertyName("name")]
    public string Name { get; set; } = string.Empty;

    [JsonPropertyName("type")]
    public string Type { get; set; } = string.Empty;

    [JsonPropertyName("isActive")]
    public bool IsActive { get; set; } = true;
}

public class IncomeAllocationDto
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

public class CreateIncomeRequest
{
    [JsonPropertyName("description")]
    public string Description { get; set; } = string.Empty;

    [JsonPropertyName("amount")]
    public decimal Amount { get; set; }

    [JsonPropertyName("currency")]
    public string? Currency { get; set; }

    [JsonPropertyName("categoryId")]
    public string? CategoryId { get; set; }

    [JsonPropertyName("incomeDate")]
    public string IncomeDate { get; set; } = string.Empty;

    [JsonPropertyName("isRecurring")]
    public bool IsRecurring { get; set; }

    [JsonPropertyName("recurringPattern")]
    public object? RecurringPattern { get; set; }

    [JsonPropertyName("clientName")]
    public string? ClientName { get; set; }

    [JsonPropertyName("invoiceNumber")]
    public string? InvoiceNumber { get; set; }

    [JsonPropertyName("invoiceType")]
    public string? InvoiceType { get; set; }

    [JsonPropertyName("invoiceStatus")]
    public string? InvoiceStatus { get; set; }

    [JsonPropertyName("paymentDueDate")]
    public string? PaymentDueDate { get; set; }

    [JsonPropertyName("notes")]
    public string? Notes { get; set; }

    [JsonPropertyName("tags")]
    public List<string>? Tags { get; set; }

    [JsonPropertyName("allocations")]
    public List<IncomeAllocationInput> Allocations { get; set; } = [];
}

public class UpdateIncomeRequest
{
    [JsonPropertyName("description")]
    public string? Description { get; set; }

    [JsonPropertyName("amount")]
    public decimal? Amount { get; set; }

    [JsonPropertyName("currency")]
    public string? Currency { get; set; }

    [JsonPropertyName("categoryId")]
    public string? CategoryId { get; set; }

    [JsonPropertyName("incomeDate")]
    public string? IncomeDate { get; set; }

    [JsonPropertyName("isRecurring")]
    public bool? IsRecurring { get; set; }

    [JsonPropertyName("recurringPattern")]
    public object? RecurringPattern { get; set; }

    [JsonPropertyName("clientName")]
    public string? ClientName { get; set; }

    [JsonPropertyName("invoiceNumber")]
    public string? InvoiceNumber { get; set; }

    [JsonPropertyName("invoiceType")]
    public string? InvoiceType { get; set; }

    [JsonPropertyName("invoiceStatus")]
    public string? InvoiceStatus { get; set; }

    [JsonPropertyName("paymentDueDate")]
    public string? PaymentDueDate { get; set; }

    [JsonPropertyName("notes")]
    public string? Notes { get; set; }

    [JsonPropertyName("tags")]
    public List<string>? Tags { get; set; }

    [JsonPropertyName("allocations")]
    public List<IncomeAllocationInput>? Allocations { get; set; }
}

public class IncomeAllocationInput
{
    [JsonPropertyName("pnlCenterId")]
    public string PnlCenterId { get; set; } = string.Empty;

    [JsonPropertyName("percentage")]
    public decimal Percentage { get; set; }
}

public class CreateIncomeCategoryRequest
{
    [JsonPropertyName("name")]
    public string Name { get; set; } = string.Empty;

    [JsonPropertyName("type")]
    public string Type { get; set; } = string.Empty;
}

public class UpdateIncomeCategoryRequest
{
    [JsonPropertyName("name")]
    public string? Name { get; set; }

    [JsonPropertyName("type")]
    public string? Type { get; set; }

    [JsonPropertyName("isActive")]
    public bool? IsActive { get; set; }
}

// =============================================
// Database row types (snake_case mapping for Dapper)
// =============================================

public class IncomeRow
{
    public Guid Id { get; set; }
    public string Description { get; set; } = string.Empty;
    public decimal Amount { get; set; }
    public string Currency { get; set; } = "USD";
    public Guid? Category_Id { get; set; }
    public DateTime Income_Date { get; set; }
    public bool Is_Recurring { get; set; }
    public string? Recurring_Pattern { get; set; }
    public string? Client_Name { get; set; }
    public string? Invoice_Number { get; set; }
    public string? Invoice_Type { get; set; }
    public string? Invoice_Status { get; set; }
    public DateTime? Payment_Due_Date { get; set; }
    public DateTime? Payment_Received_Date { get; set; }
    public string? Notes { get; set; }
    public string[]? Tags { get; set; }
    public Guid? Created_By { get; set; }
    public DateTime Created_At { get; set; }
    public DateTime Updated_At { get; set; }

    // Joined category fields
    public string? Category_Name { get; set; }
    public string? Category_Type { get; set; }
    public bool? Category_Is_Active { get; set; }
}

public class IncomeAllocationRow
{
    public Guid Id { get; set; }
    public Guid Income_Id { get; set; }
    public Guid Pnl_Center_Id { get; set; }
    public string Pnl_Center_Name { get; set; } = string.Empty;
    public decimal Percentage { get; set; }
    public decimal Allocated_Amount { get; set; }
}

public class IncomeCategoryRow
{
    public Guid Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string Type { get; set; } = string.Empty;
    public bool Is_Active { get; set; }
}
