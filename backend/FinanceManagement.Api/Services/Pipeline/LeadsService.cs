using System.Text.Json.Serialization;
using Dapper;
using FinanceManagement.Api.Database;
using FinanceManagement.Api.Middleware;

namespace FinanceManagement.Api.Services.Pipeline;

#region DTOs

public class LeadDto
{
    [JsonPropertyName("id")] public string Id { get; set; } = string.Empty;
    [JsonPropertyName("clientId")] public string? ClientId { get; set; }
    [JsonPropertyName("title")] public string Title { get; set; } = string.Empty;
    [JsonPropertyName("description")] public string? Description { get; set; }
    [JsonPropertyName("contactName")] public string? ContactName { get; set; }
    [JsonPropertyName("contactEmail")] public string? ContactEmail { get; set; }
    [JsonPropertyName("contactPhone")] public string? ContactPhone { get; set; }
    [JsonPropertyName("companyName")] public string? CompanyName { get; set; }
    [JsonPropertyName("source")] public string? Source { get; set; }
    [JsonPropertyName("estimatedValue")] public decimal? EstimatedValue { get; set; }
    [JsonPropertyName("currency")] public string Currency { get; set; } = "USD";
    [JsonPropertyName("probability")] public int Probability { get; set; } = 50;
    [JsonPropertyName("status")] public string Status { get; set; } = "new";
    [JsonPropertyName("statusChangedAt")] public DateTime? StatusChangedAt { get; set; }
    [JsonPropertyName("lostReason")] public string? LostReason { get; set; }
    [JsonPropertyName("expectedCloseDate")] public string? ExpectedCloseDate { get; set; }
    [JsonPropertyName("actualCloseDate")] public string? ActualCloseDate { get; set; }
    [JsonPropertyName("assignedTo")] public string? AssignedTo { get; set; }
    [JsonPropertyName("assignedToName")] public string? AssignedToName { get; set; }
    [JsonPropertyName("pnlCenterId")] public string? PnlCenterId { get; set; }
    [JsonPropertyName("pnlCenterName")] public string? PnlCenterName { get; set; }
    [JsonPropertyName("notes")] public string? Notes { get; set; }
    [JsonPropertyName("clientName")] public string? ClientName { get; set; }
    [JsonPropertyName("createdBy")] public string? CreatedBy { get; set; }
    [JsonPropertyName("createdAt")] public DateTime CreatedAt { get; set; }
    [JsonPropertyName("updatedAt")] public DateTime UpdatedAt { get; set; }
}

public class LeadActivityDto
{
    [JsonPropertyName("id")] public string Id { get; set; } = string.Empty;
    [JsonPropertyName("leadId")] public string LeadId { get; set; } = string.Empty;
    [JsonPropertyName("activityType")] public string ActivityType { get; set; } = string.Empty;
    [JsonPropertyName("title")] public string? Title { get; set; }
    [JsonPropertyName("description")] public string? Description { get; set; }
    [JsonPropertyName("dueDate")] public DateTime? DueDate { get; set; }
    [JsonPropertyName("completed")] public bool Completed { get; set; }
    [JsonPropertyName("completedAt")] public DateTime? CompletedAt { get; set; }
    [JsonPropertyName("createdBy")] public string? CreatedBy { get; set; }
    [JsonPropertyName("createdByName")] public string? CreatedByName { get; set; }
    [JsonPropertyName("createdAt")] public DateTime CreatedAt { get; set; }
}

public class CreateLeadRequest
{
    [JsonPropertyName("clientId")] public string? ClientId { get; set; }
    [JsonPropertyName("title")] public string Title { get; set; } = string.Empty;
    [JsonPropertyName("description")] public string? Description { get; set; }
    [JsonPropertyName("contactName")] public string? ContactName { get; set; }
    [JsonPropertyName("contactEmail")] public string? ContactEmail { get; set; }
    [JsonPropertyName("contactPhone")] public string? ContactPhone { get; set; }
    [JsonPropertyName("companyName")] public string? CompanyName { get; set; }
    [JsonPropertyName("source")] public string? Source { get; set; }
    [JsonPropertyName("estimatedValue")] public decimal? EstimatedValue { get; set; }
    [JsonPropertyName("currency")] public string? Currency { get; set; }
    [JsonPropertyName("probability")] public int? Probability { get; set; }
    [JsonPropertyName("status")] public string? Status { get; set; }
    [JsonPropertyName("expectedCloseDate")] public string? ExpectedCloseDate { get; set; }
    [JsonPropertyName("assignedTo")] public string? AssignedTo { get; set; }
    [JsonPropertyName("pnlCenterId")] public string? PnlCenterId { get; set; }
    [JsonPropertyName("notes")] public string? Notes { get; set; }
}

public class UpdateLeadRequest
{
    [JsonPropertyName("clientId")] public string? ClientId { get; set; }
    [JsonPropertyName("title")] public string? Title { get; set; }
    [JsonPropertyName("description")] public string? Description { get; set; }
    [JsonPropertyName("contactName")] public string? ContactName { get; set; }
    [JsonPropertyName("contactEmail")] public string? ContactEmail { get; set; }
    [JsonPropertyName("contactPhone")] public string? ContactPhone { get; set; }
    [JsonPropertyName("companyName")] public string? CompanyName { get; set; }
    [JsonPropertyName("source")] public string? Source { get; set; }
    [JsonPropertyName("estimatedValue")] public decimal? EstimatedValue { get; set; }
    [JsonPropertyName("currency")] public string? Currency { get; set; }
    [JsonPropertyName("probability")] public int? Probability { get; set; }
    [JsonPropertyName("status")] public string? Status { get; set; }
    [JsonPropertyName("lostReason")] public string? LostReason { get; set; }
    [JsonPropertyName("expectedCloseDate")] public string? ExpectedCloseDate { get; set; }
    [JsonPropertyName("actualCloseDate")] public string? ActualCloseDate { get; set; }
    [JsonPropertyName("assignedTo")] public string? AssignedTo { get; set; }
    [JsonPropertyName("pnlCenterId")] public string? PnlCenterId { get; set; }
    [JsonPropertyName("notes")] public string? Notes { get; set; }
}

public class CreateLeadActivityRequest
{
    [JsonPropertyName("activityType")] public string ActivityType { get; set; } = string.Empty;
    [JsonPropertyName("title")] public string? Title { get; set; }
    [JsonPropertyName("description")] public string? Description { get; set; }
    [JsonPropertyName("dueDate")] public DateTime? DueDate { get; set; }
    [JsonPropertyName("completed")] public bool? Completed { get; set; }
}

#endregion

public class LeadsService
{
    private readonly DbContext _db;
    private readonly ILogger<LeadsService> _logger;

    public LeadsService(DbContext db, ILogger<LeadsService> logger)
    {
        _db = db;
        _logger = logger;
    }

    public async Task<(List<LeadDto> Leads, int Total)> GetAllAsync(
        int page = 1, int limit = 20, string? search = null, string? status = null,
        string? assignedTo = null, string? startDate = null, string? endDate = null)
    {
        await using var conn = _db.CreateConnection();
        await conn.OpenAsync();

        var conditions = new List<string>();
        var parameters = new DynamicParameters();

        if (!string.IsNullOrEmpty(search))
        {
            conditions.Add("(l.title ILIKE @Search OR l.contact_name ILIKE @Search OR l.company_name ILIKE @Search)");
            parameters.Add("Search", $"%{search}%");
        }

        if (!string.IsNullOrEmpty(status))
        {
            conditions.Add("l.status = @Status");
            parameters.Add("Status", status);
        }

        if (!string.IsNullOrEmpty(assignedTo))
        {
            conditions.Add("l.assigned_to = @AssignedTo::uuid");
            parameters.Add("AssignedTo", assignedTo);
        }

        if (!string.IsNullOrEmpty(startDate))
        {
            conditions.Add("l.created_at >= @StartDate::timestamptz");
            parameters.Add("StartDate", startDate);
        }

        if (!string.IsNullOrEmpty(endDate))
        {
            conditions.Add("l.created_at <= @EndDate::timestamptz");
            parameters.Add("EndDate", endDate);
        }

        var whereClause = conditions.Count > 0 ? $"WHERE {string.Join(" AND ", conditions)}" : "";
        var offset = (page - 1) * limit;

        var total = await conn.ExecuteScalarAsync<int>(
            $"SELECT COUNT(*) FROM leads l {whereClause}", parameters);

        parameters.Add("Limit", limit);
        parameters.Add("Offset", offset);

        var rows = await conn.QueryAsync<LeadEntity>(
            $"""
            SELECT l.*,
                   c.name AS client_name,
                   u.first_name || ' ' || u.last_name AS assigned_to_name,
                   pc.name AS pnl_center_name
            FROM leads l
            LEFT JOIN clients c ON c.id = l.client_id
            LEFT JOIN users u ON u.id = l.assigned_to
            LEFT JOIN pnl_centers pc ON pc.id = l.pnl_center_id
            {whereClause}
            ORDER BY l.created_at DESC
            LIMIT @Limit OFFSET @Offset
            """, parameters);

        var leads = rows.Select(MapToDto).ToList();
        return (leads, total);
    }

    public async Task<LeadDto?> GetByIdAsync(Guid id)
    {
        await using var conn = _db.CreateConnection();
        await conn.OpenAsync();

        var row = await conn.QuerySingleOrDefaultAsync<LeadEntity>(
            """
            SELECT l.*,
                   c.name AS client_name,
                   u.first_name || ' ' || u.last_name AS assigned_to_name,
                   pc.name AS pnl_center_name
            FROM leads l
            LEFT JOIN clients c ON c.id = l.client_id
            LEFT JOIN users u ON u.id = l.assigned_to
            LEFT JOIN pnl_centers pc ON pc.id = l.pnl_center_id
            WHERE l.id = @Id
            """, new { Id = id });

        return row == null ? null : MapToDto(row);
    }

    public async Task<LeadDto> CreateAsync(CreateLeadRequest request, Guid userId)
    {
        await using var conn = _db.CreateConnection();
        await conn.OpenAsync();

        var row = await conn.QuerySingleAsync<LeadEntity>(
            """
            INSERT INTO leads (client_id, title, description, contact_name, contact_email, contact_phone,
                company_name, source, estimated_value, currency, probability, status,
                expected_close_date, assigned_to, pnl_center_id, notes, created_by)
            VALUES (@ClientId::uuid, @Title, @Description, @ContactName, @ContactEmail, @ContactPhone,
                @CompanyName, @Source, @EstimatedValue, @Currency, @Probability, @Status,
                @ExpectedCloseDate::date, @AssignedTo::uuid, @PnlCenterId::uuid, @Notes, @CreatedBy)
            RETURNING *
            """,
            new
            {
                ClientId = request.ClientId,
                request.Title,
                request.Description,
                request.ContactName,
                request.ContactEmail,
                request.ContactPhone,
                request.CompanyName,
                request.Source,
                request.EstimatedValue,
                Currency = request.Currency ?? "USD",
                Probability = request.Probability ?? 50,
                Status = request.Status ?? "new",
                ExpectedCloseDate = request.ExpectedCloseDate,
                AssignedTo = request.AssignedTo,
                PnlCenterId = request.PnlCenterId,
                request.Notes,
                CreatedBy = userId,
            });

        return (await GetByIdAsync(row.Id))!;
    }

    public async Task<LeadDto?> UpdateAsync(Guid id, UpdateLeadRequest request)
    {
        await using var conn = _db.CreateConnection();
        await conn.OpenAsync();

        var fields = new List<string>();
        var parameters = new DynamicParameters();
        parameters.Add("Id", id);

        if (request.ClientId != null) { fields.Add("client_id = @ClientId::uuid"); parameters.Add("ClientId", request.ClientId); }
        if (request.Title != null) { fields.Add("title = @Title"); parameters.Add("Title", request.Title); }
        if (request.Description != null) { fields.Add("description = @Description"); parameters.Add("Description", request.Description); }
        if (request.ContactName != null) { fields.Add("contact_name = @ContactName"); parameters.Add("ContactName", request.ContactName); }
        if (request.ContactEmail != null) { fields.Add("contact_email = @ContactEmail"); parameters.Add("ContactEmail", request.ContactEmail); }
        if (request.ContactPhone != null) { fields.Add("contact_phone = @ContactPhone"); parameters.Add("ContactPhone", request.ContactPhone); }
        if (request.CompanyName != null) { fields.Add("company_name = @CompanyName"); parameters.Add("CompanyName", request.CompanyName); }
        if (request.Source != null) { fields.Add("source = @Source"); parameters.Add("Source", request.Source); }
        if (request.EstimatedValue.HasValue) { fields.Add("estimated_value = @EstimatedValue"); parameters.Add("EstimatedValue", request.EstimatedValue.Value); }
        if (request.Currency != null) { fields.Add("currency = @Currency"); parameters.Add("Currency", request.Currency); }
        if (request.Probability.HasValue) { fields.Add("probability = @Probability"); parameters.Add("Probability", request.Probability.Value); }
        if (request.Status != null) { fields.Add("status = @Status"); parameters.Add("Status", request.Status); }
        if (request.LostReason != null) { fields.Add("lost_reason = @LostReason"); parameters.Add("LostReason", request.LostReason); }
        if (request.ExpectedCloseDate != null) { fields.Add("expected_close_date = @ExpectedCloseDate::date"); parameters.Add("ExpectedCloseDate", request.ExpectedCloseDate); }
        if (request.ActualCloseDate != null) { fields.Add("actual_close_date = @ActualCloseDate::date"); parameters.Add("ActualCloseDate", request.ActualCloseDate); }
        if (request.AssignedTo != null) { fields.Add("assigned_to = @AssignedTo::uuid"); parameters.Add("AssignedTo", request.AssignedTo); }
        if (request.PnlCenterId != null) { fields.Add("pnl_center_id = @PnlCenterId::uuid"); parameters.Add("PnlCenterId", request.PnlCenterId); }
        if (request.Notes != null) { fields.Add("notes = @Notes"); parameters.Add("Notes", request.Notes); }

        if (fields.Count == 0)
            return await GetByIdAsync(id);

        var affected = await conn.ExecuteAsync(
            $"UPDATE leads SET {string.Join(", ", fields)} WHERE id = @Id", parameters);

        if (affected == 0) return null;

        return await GetByIdAsync(id);
    }

    public async Task<bool> DeleteAsync(Guid id)
    {
        await using var conn = _db.CreateConnection();
        await conn.OpenAsync();

        var affected = await conn.ExecuteAsync("DELETE FROM leads WHERE id = @Id", new { Id = id });
        return affected > 0;
    }

    #region Lead Activities

    public async Task<List<LeadActivityDto>> GetActivitiesAsync(Guid leadId)
    {
        await using var conn = _db.CreateConnection();
        await conn.OpenAsync();

        var rows = await conn.QueryAsync<LeadActivityEntity>(
            """
            SELECT la.*,
                   u.first_name || ' ' || u.last_name AS created_by_name
            FROM lead_activities la
            LEFT JOIN users u ON u.id = la.created_by
            WHERE la.lead_id = @LeadId
            ORDER BY la.created_at DESC
            """, new { LeadId = leadId });

        return rows.Select(MapActivityToDto).ToList();
    }

    public async Task<LeadActivityDto> CreateActivityAsync(Guid leadId, CreateLeadActivityRequest request, Guid userId)
    {
        await using var conn = _db.CreateConnection();
        await conn.OpenAsync();

        // Verify lead exists
        var exists = await conn.ExecuteScalarAsync<bool>(
            "SELECT EXISTS(SELECT 1 FROM leads WHERE id = @Id)", new { Id = leadId });

        if (!exists)
            throw new AppException("Lead not found", 404, "NOT_FOUND");

        var row = await conn.QuerySingleAsync<LeadActivityEntity>(
            """
            INSERT INTO lead_activities (lead_id, activity_type, title, description, due_date, completed, created_by)
            VALUES (@LeadId, @ActivityType, @Title, @Description, @DueDate, @Completed, @CreatedBy)
            RETURNING *
            """,
            new
            {
                LeadId = leadId,
                request.ActivityType,
                request.Title,
                request.Description,
                request.DueDate,
                Completed = request.Completed ?? false,
                CreatedBy = userId,
            });

        // Re-fetch with join to get created_by_name
        var result = await conn.QuerySingleAsync<LeadActivityEntity>(
            """
            SELECT la.*, u.first_name || ' ' || u.last_name AS created_by_name
            FROM lead_activities la
            LEFT JOIN users u ON u.id = la.created_by
            WHERE la.id = @Id
            """, new { row.Id });

        return MapActivityToDto(result);
    }

    #endregion

    #region Mappers

    private static LeadDto MapToDto(LeadEntity e) => new()
    {
        Id = e.Id.ToString(),
        ClientId = e.ClientId?.ToString(),
        Title = e.Title,
        Description = e.Description,
        ContactName = e.ContactName,
        ContactEmail = e.ContactEmail,
        ContactPhone = e.ContactPhone,
        CompanyName = e.CompanyName,
        Source = e.Source,
        EstimatedValue = e.EstimatedValue,
        Currency = e.Currency,
        Probability = e.Probability,
        Status = e.Status,
        StatusChangedAt = e.StatusChangedAt,
        LostReason = e.LostReason,
        ExpectedCloseDate = e.ExpectedCloseDate?.ToString("yyyy-MM-dd"),
        ActualCloseDate = e.ActualCloseDate?.ToString("yyyy-MM-dd"),
        AssignedTo = e.AssignedTo?.ToString(),
        AssignedToName = e.AssignedToName,
        PnlCenterId = e.PnlCenterId?.ToString(),
        PnlCenterName = e.PnlCenterName,
        Notes = e.Notes,
        ClientName = e.ClientName,
        CreatedBy = e.CreatedBy?.ToString(),
        CreatedAt = e.CreatedAt,
        UpdatedAt = e.UpdatedAt,
    };

    private static LeadActivityDto MapActivityToDto(LeadActivityEntity e) => new()
    {
        Id = e.Id.ToString(),
        LeadId = e.LeadId.ToString(),
        ActivityType = e.ActivityType,
        Title = e.Title,
        Description = e.Description,
        DueDate = e.DueDate,
        Completed = e.Completed,
        CompletedAt = e.CompletedAt,
        CreatedBy = e.CreatedBy?.ToString(),
        CreatedByName = e.CreatedByName,
        CreatedAt = e.CreatedAt,
    };

    #endregion

    #region Entities

    private class LeadEntity
    {
        public Guid Id { get; set; }
        public Guid? ClientId { get; set; }
        public string Title { get; set; } = string.Empty;
        public string? Description { get; set; }
        public string? ContactName { get; set; }
        public string? ContactEmail { get; set; }
        public string? ContactPhone { get; set; }
        public string? CompanyName { get; set; }
        public string? Source { get; set; }
        public decimal? EstimatedValue { get; set; }
        public string Currency { get; set; } = "USD";
        public int Probability { get; set; } = 50;
        public string Status { get; set; } = "new";
        public DateTime? StatusChangedAt { get; set; }
        public string? LostReason { get; set; }
        public DateTime? ExpectedCloseDate { get; set; }
        public DateTime? ActualCloseDate { get; set; }
        public Guid? AssignedTo { get; set; }
        public string? AssignedToName { get; set; }
        public Guid? PnlCenterId { get; set; }
        public string? PnlCenterName { get; set; }
        public string? Notes { get; set; }
        public string? ClientName { get; set; }
        public Guid? CreatedBy { get; set; }
        public DateTime CreatedAt { get; set; }
        public DateTime UpdatedAt { get; set; }
    }

    private class LeadActivityEntity
    {
        public Guid Id { get; set; }
        public Guid LeadId { get; set; }
        public string ActivityType { get; set; } = string.Empty;
        public string? Title { get; set; }
        public string? Description { get; set; }
        public DateTime? DueDate { get; set; }
        public bool Completed { get; set; }
        public DateTime? CompletedAt { get; set; }
        public Guid? CreatedBy { get; set; }
        public string? CreatedByName { get; set; }
        public DateTime CreatedAt { get; set; }
    }

    #endregion
}
