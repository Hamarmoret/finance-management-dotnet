using System.Text.Json.Serialization;
using Dapper;
using FinanceManagement.Api.Database;

namespace FinanceManagement.Api.Services.Pipeline;

#region DTOs

public class ContactPersonDto
{
    [JsonPropertyName("id")] public string Id { get; set; } = string.Empty;
    [JsonPropertyName("clientId")] public string? ClientId { get; set; }
    [JsonPropertyName("name")] public string Name { get; set; } = string.Empty;
    [JsonPropertyName("email")] public string? Email { get; set; }
    [JsonPropertyName("phone")] public string? Phone { get; set; }
    [JsonPropertyName("role")] public string? Role { get; set; }
    [JsonPropertyName("linkedinUrl")] public string? LinkedinUrl { get; set; }
    [JsonPropertyName("country")] public string? Country { get; set; }
    [JsonPropertyName("isPrimary")] public bool IsPrimary { get; set; }
    [JsonPropertyName("notes")] public string? Notes { get; set; }
    [JsonPropertyName("pnlCenterId")] public string? PnlCenterId { get; set; }
    [JsonPropertyName("createdAt")] public DateTime CreatedAt { get; set; }
    [JsonPropertyName("updatedAt")] public DateTime UpdatedAt { get; set; }
}

public class CreateContactPersonRequest
{
    [JsonPropertyName("name")] public string Name { get; set; } = string.Empty;
    [JsonPropertyName("email")] public string? Email { get; set; }
    [JsonPropertyName("phone")] public string? Phone { get; set; }
    [JsonPropertyName("role")] public string? Role { get; set; }
    [JsonPropertyName("linkedinUrl")] public string? LinkedinUrl { get; set; }
    [JsonPropertyName("country")] public string? Country { get; set; }
    [JsonPropertyName("isPrimary")] public bool? IsPrimary { get; set; }
    [JsonPropertyName("notes")] public string? Notes { get; set; }
    [JsonPropertyName("pnlCenterId")] public string? PnlCenterId { get; set; }
}

public class UpdateContactPersonRequest
{
    [JsonPropertyName("name")] public string? Name { get; set; }
    [JsonPropertyName("email")] public string? Email { get; set; }
    [JsonPropertyName("phone")] public string? Phone { get; set; }
    [JsonPropertyName("role")] public string? Role { get; set; }
    [JsonPropertyName("linkedinUrl")] public string? LinkedinUrl { get; set; }
    [JsonPropertyName("country")] public string? Country { get; set; }
    [JsonPropertyName("isPrimary")] public bool? IsPrimary { get; set; }
    [JsonPropertyName("notes")] public string? Notes { get; set; }
    [JsonPropertyName("pnlCenterId")] public string? PnlCenterId { get; set; }
}

#endregion

public class ContactPersonsService
{
    private readonly DbContext _db;
    private readonly ILogger<ContactPersonsService> _logger;

    public ContactPersonsService(DbContext db, ILogger<ContactPersonsService> logger)
    {
        _db = db;
        _logger = logger;
    }

    public async Task<List<ContactPersonDto>> GetByClientIdAsync(Guid clientId)
    {
        await using var conn = _db.CreateConnection();
        await conn.OpenAsync();

        var rows = await conn.QueryAsync<ContactPersonEntity>(
            "SELECT * FROM contact_persons WHERE client_id = @ClientId ORDER BY is_primary DESC, created_at ASC",
            new { ClientId = clientId });

        return rows.Select(MapToDto).ToList();
    }

    public async Task<ContactPersonDto> CreateAsync(Guid clientId, CreateContactPersonRequest request, Guid userId)
    {
        await using var conn = _db.CreateConnection();
        await conn.OpenAsync();

        var row = await conn.QuerySingleAsync<ContactPersonEntity>(
            """
            INSERT INTO contact_persons (client_id, name, email, phone, role, linkedin_url, country, is_primary, notes, pnl_center_id, created_by)
            VALUES (@ClientId, @Name, @Email, @Phone, @Role, @LinkedinUrl, @Country, @IsPrimary, @Notes, @PnlCenterId, @CreatedBy)
            RETURNING *
            """,
            new
            {
                ClientId = clientId,
                request.Name,
                request.Email,
                request.Phone,
                request.Role,
                LinkedinUrl = request.LinkedinUrl,
                request.Country,
                IsPrimary = request.IsPrimary ?? false,
                request.Notes,
                PnlCenterId = !string.IsNullOrEmpty(request.PnlCenterId) ? Guid.Parse(request.PnlCenterId) : (Guid?)null,
                CreatedBy = userId,
            });

        return MapToDto(row);
    }

    public async Task<ContactPersonDto?> UpdateAsync(Guid id, UpdateContactPersonRequest request)
    {
        await using var conn = _db.CreateConnection();
        await conn.OpenAsync();

        var fields = new List<string>();
        var parameters = new DynamicParameters();
        parameters.Add("Id", id);

        if (request.Name != null) { fields.Add("name = @Name"); parameters.Add("Name", request.Name); }
        if (request.Email != null) { fields.Add("email = @Email"); parameters.Add("Email", request.Email); }
        if (request.Phone != null) { fields.Add("phone = @Phone"); parameters.Add("Phone", request.Phone); }
        if (request.Role != null) { fields.Add("role = @Role"); parameters.Add("Role", request.Role); }
        if (request.LinkedinUrl != null) { fields.Add("linkedin_url = @LinkedinUrl"); parameters.Add("LinkedinUrl", request.LinkedinUrl); }
        if (request.Country != null) { fields.Add("country = @Country"); parameters.Add("Country", request.Country); }
        if (request.IsPrimary.HasValue) { fields.Add("is_primary = @IsPrimary"); parameters.Add("IsPrimary", request.IsPrimary.Value); }
        if (request.Notes != null) { fields.Add("notes = @Notes"); parameters.Add("Notes", request.Notes); }
        if (request.PnlCenterId != null) { fields.Add("pnl_center_id = @PnlCenterId"); parameters.Add("PnlCenterId", !string.IsNullOrEmpty(request.PnlCenterId) ? Guid.Parse(request.PnlCenterId) : (Guid?)null); }

        if (fields.Count == 0)
        {
            var existing = await conn.QuerySingleOrDefaultAsync<ContactPersonEntity>(
                "SELECT * FROM contact_persons WHERE id = @Id", new { Id = id });
            return existing == null ? null : MapToDto(existing);
        }

        var row = await conn.QuerySingleOrDefaultAsync<ContactPersonEntity>(
            $"UPDATE contact_persons SET {string.Join(", ", fields)} WHERE id = @Id RETURNING *", parameters);

        return row == null ? null : MapToDto(row);
    }

    public async Task<bool> DeleteAsync(Guid id)
    {
        await using var conn = _db.CreateConnection();
        await conn.OpenAsync();

        var affected = await conn.ExecuteAsync("DELETE FROM contact_persons WHERE id = @Id", new { Id = id });
        return affected > 0;
    }

    private static ContactPersonDto MapToDto(ContactPersonEntity e) => new()
    {
        Id = e.Id.ToString(),
        ClientId = e.ClientId?.ToString(),
        Name = e.Name,
        Email = e.Email,
        Phone = e.Phone,
        Role = e.Role,
        LinkedinUrl = e.LinkedinUrl,
        Country = e.Country,
        IsPrimary = e.IsPrimary,
        Notes = e.Notes,
        PnlCenterId = e.PnlCenterId?.ToString(),
        CreatedAt = e.CreatedAt,
        UpdatedAt = e.UpdatedAt,
    };

    private class ContactPersonEntity
    {
        public Guid Id { get; set; }
        public Guid? ClientId { get; set; }
        public string Name { get; set; } = string.Empty;
        public string? Email { get; set; }
        public string? Phone { get; set; }
        public string? Role { get; set; }
        public string? LinkedinUrl { get; set; }
        public string? Country { get; set; }
        public bool IsPrimary { get; set; }
        public string? Notes { get; set; }
        public Guid? PnlCenterId { get; set; }
        public Guid? CreatedBy { get; set; }
        public DateTime CreatedAt { get; set; }
        public DateTime UpdatedAt { get; set; }
    }
}
