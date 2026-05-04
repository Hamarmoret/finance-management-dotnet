namespace FinanceManagement.Api.Models.Alerts;

public class AlertDto
{
    public string Id { get; set; } = "";
    public string AlertType { get; set; } = "";
    public Guid EntityId { get; set; }
    public string EntityType { get; set; } = "";
    public string Title { get; set; } = "";
    public string Description { get; set; } = "";
    public string Severity { get; set; } = "";
    public string? DueDate { get; set; }
    public int? DaysUntilDue { get; set; }
    public Guid? ContractId { get; set; }
    public string? ClientName { get; set; }
    public string? ContractTitle { get; set; }
    public decimal? Amount { get; set; }
    public string? Currency { get; set; }
}

public class DismissAlertRequest
{
    public string AlertType { get; set; } = "";
    public Guid EntityId { get; set; }
    public string? Justification { get; set; }
}

public class SnoozeAlertRequest
{
    public string AlertType { get; set; } = "";
    public Guid EntityId { get; set; }
    public DateTime SnoozeUntil { get; set; }
}
