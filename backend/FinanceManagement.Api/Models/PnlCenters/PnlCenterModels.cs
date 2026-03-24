using System.Text.Json.Serialization;

namespace FinanceManagement.Api.Models.PnlCenters;

// =============================================
// DTOs (API contract - camelCase JSON)
// =============================================

public class PnlCenterDto
{
    [JsonPropertyName("id")]
    public string Id { get; set; } = string.Empty;

    [JsonPropertyName("name")]
    public string Name { get; set; } = string.Empty;

    [JsonPropertyName("description")]
    [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
    public string? Description { get; set; }

    [JsonPropertyName("isActive")]
    public bool IsActive { get; set; } = true;

    [JsonPropertyName("createdBy")]
    [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
    public string? CreatedBy { get; set; }

    [JsonPropertyName("createdAt")]
    public DateTime CreatedAt { get; set; }

    [JsonPropertyName("updatedAt")]
    public DateTime UpdatedAt { get; set; }
}

public class PnlCenterWithStatsDto : PnlCenterDto
{
    [JsonPropertyName("totalIncome")]
    public decimal TotalIncome { get; set; }

    [JsonPropertyName("totalExpenses")]
    public decimal TotalExpenses { get; set; }

    [JsonPropertyName("netProfit")]
    public decimal NetProfit { get; set; }
}

public class PnlDistributionDefaultDto
{
    [JsonPropertyName("pnlCenterId")]
    public string PnlCenterId { get; set; } = string.Empty;

    [JsonPropertyName("pnlCenterName")]
    public string PnlCenterName { get; set; } = string.Empty;

    [JsonPropertyName("percentage")]
    public decimal Percentage { get; set; }
}

// =============================================
// Request DTOs
// =============================================

public class CreatePnlCenterRequest
{
    [JsonPropertyName("name")]
    public string Name { get; set; } = string.Empty;

    [JsonPropertyName("description")]
    public string? Description { get; set; }
}

public class UpdatePnlCenterRequest
{
    [JsonPropertyName("name")]
    public string? Name { get; set; }

    [JsonPropertyName("description")]
    public string? Description { get; set; }

    [JsonPropertyName("isActive")]
    public bool? IsActive { get; set; }
}

public class SetDistributionDefaultsRequest
{
    [JsonPropertyName("defaults")]
    public List<DistributionDefaultInput> Defaults { get; set; } = [];
}

public class DistributionDefaultInput
{
    [JsonPropertyName("pnlCenterId")]
    public string PnlCenterId { get; set; } = string.Empty;

    [JsonPropertyName("percentage")]
    public decimal Percentage { get; set; }
}

// =============================================
// Database row types (snake_case mapping for Dapper)
// =============================================

public class PnlCenterRow
{
    public Guid Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string? Description { get; set; }
    public bool Is_Active { get; set; }
    public Guid? Created_By { get; set; }
    public DateTime Created_At { get; set; }
    public DateTime Updated_At { get; set; }
}

public class PnlCenterWithStatsRow : PnlCenterRow
{
    public decimal Total_Income { get; set; }
    public decimal Total_Expenses { get; set; }
    public decimal Net_Profit { get; set; }
}

public class DistributionDefaultRow
{
    public Guid Id { get; set; }
    public Guid Pnl_Center_Id { get; set; }
    public string Pnl_Center_Name { get; set; } = string.Empty;
    public decimal Percentage { get; set; }
    public Guid Created_By { get; set; }
}
