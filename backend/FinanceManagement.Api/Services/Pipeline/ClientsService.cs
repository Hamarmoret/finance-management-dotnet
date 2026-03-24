using System.Text.Json.Serialization;
using Dapper;
using FinanceManagement.Api.Database;
using FinanceManagement.Api.Middleware;

namespace FinanceManagement.Api.Services.Pipeline;

#region DTOs

public class ClientDto
{
    [JsonPropertyName("id")] public string Id { get; set; } = string.Empty;
    [JsonPropertyName("name")] public string Name { get; set; } = string.Empty;
    [JsonPropertyName("companyName")] public string? CompanyName { get; set; }
    [JsonPropertyName("email")] public string? Email { get; set; }
    [JsonPropertyName("phone")] public string? Phone { get; set; }
    [JsonPropertyName("address")] public string? Address { get; set; }
    [JsonPropertyName("city")] public string? City { get; set; }
    [JsonPropertyName("state")] public string? State { get; set; }
    [JsonPropertyName("postalCode")] public string? PostalCode { get; set; }
    [JsonPropertyName("country")] public string? Country { get; set; }
    [JsonPropertyName("website")] public string? Website { get; set; }
    [JsonPropertyName("notes")] public string? Notes { get; set; }
    [JsonPropertyName("tags")] public string[]? Tags { get; set; }
    [JsonPropertyName("defaultCurrency")] public string DefaultCurrency { get; set; } = "USD";
    [JsonPropertyName("taxId")] public string? TaxId { get; set; }
    [JsonPropertyName("paymentTerms")] public int PaymentTerms { get; set; } = 30;
    [JsonPropertyName("status")] public string Status { get; set; } = "active";
    [JsonPropertyName("createdBy")] public string? CreatedBy { get; set; }
    [JsonPropertyName("createdAt")] public DateTime CreatedAt { get; set; }
    [JsonPropertyName("updatedAt")] public DateTime UpdatedAt { get; set; }
}

public class CreateClientRequest
{
    [JsonPropertyName("name")] public string Name { get; set; } = string.Empty;
    [JsonPropertyName("companyName")] public string? CompanyName { get; set; }
    [JsonPropertyName("email")] public string? Email { get; set; }
    [JsonPropertyName("phone")] public string? Phone { get; set; }
    [JsonPropertyName("address")] public string? Address { get; set; }
    [JsonPropertyName("city")] public string? City { get; set; }
    [JsonPropertyName("state")] public string? State { get; set; }
    [JsonPropertyName("postalCode")] public string? PostalCode { get; set; }
    [JsonPropertyName("country")] public string? Country { get; set; }
    [JsonPropertyName("website")] public string? Website { get; set; }
    [JsonPropertyName("notes")] public string? Notes { get; set; }
    [JsonPropertyName("tags")] public string[]? Tags { get; set; }
    [JsonPropertyName("defaultCurrency")] public string? DefaultCurrency { get; set; }
    [JsonPropertyName("taxId")] public string? TaxId { get; set; }
    [JsonPropertyName("paymentTerms")] public int? PaymentTerms { get; set; }
}

public class UpdateClientRequest
{
    [JsonPropertyName("name")] public string? Name { get; set; }
    [JsonPropertyName("companyName")] public string? CompanyName { get; set; }
    [JsonPropertyName("email")] public string? Email { get; set; }
    [JsonPropertyName("phone")] public string? Phone { get; set; }
    [JsonPropertyName("address")] public string? Address { get; set; }
    [JsonPropertyName("city")] public string? City { get; set; }
    [JsonPropertyName("state")] public string? State { get; set; }
    [JsonPropertyName("postalCode")] public string? PostalCode { get; set; }
    [JsonPropertyName("country")] public string? Country { get; set; }
    [JsonPropertyName("website")] public string? Website { get; set; }
    [JsonPropertyName("notes")] public string? Notes { get; set; }
    [JsonPropertyName("tags")] public string[]? Tags { get; set; }
    [JsonPropertyName("defaultCurrency")] public string? DefaultCurrency { get; set; }
    [JsonPropertyName("taxId")] public string? TaxId { get; set; }
    [JsonPropertyName("paymentTerms")] public int? PaymentTerms { get; set; }
    [JsonPropertyName("status")] public string? Status { get; set; }
}

#endregion

public class ClientsService
{
    private readonly DbContext _db;
    private readonly ILogger<ClientsService> _logger;

    public ClientsService(DbContext db, ILogger<ClientsService> logger)
    {
        _db = db;
        _logger = logger;
    }

    public async Task<(List<ClientDto> Clients, int Total)> GetAllAsync(
        int page = 1, int limit = 20, string? search = null, string? status = null)
    {
        await using var conn = _db.CreateConnection();
        await conn.OpenAsync();

        var conditions = new List<string>();
        var parameters = new DynamicParameters();

        if (!string.IsNullOrEmpty(search))
        {
            conditions.Add("(c.name ILIKE @Search OR c.company_name ILIKE @Search OR c.email ILIKE @Search)");
            parameters.Add("Search", $"%{search}%");
        }

        if (!string.IsNullOrEmpty(status))
        {
            conditions.Add("c.status = @Status");
            parameters.Add("Status", status);
        }

        var whereClause = conditions.Count > 0 ? $"WHERE {string.Join(" AND ", conditions)}" : "";
        var offset = (page - 1) * limit;

        var total = await conn.ExecuteScalarAsync<int>(
            $"SELECT COUNT(*) FROM clients c {whereClause}", parameters);

        parameters.Add("Limit", limit);
        parameters.Add("Offset", offset);

        var rows = await conn.QueryAsync<ClientEntity>(
            $"""
            SELECT * FROM clients c
            {whereClause}
            ORDER BY c.created_at DESC
            LIMIT @Limit OFFSET @Offset
            """, parameters);

        var clients = rows.Select(MapToDto).ToList();
        return (clients, total);
    }

    public async Task<ClientDto?> GetByIdAsync(Guid id)
    {
        await using var conn = _db.CreateConnection();
        await conn.OpenAsync();

        var row = await conn.QuerySingleOrDefaultAsync<ClientEntity>(
            "SELECT * FROM clients WHERE id = @Id", new { Id = id });

        return row == null ? null : MapToDto(row);
    }

    public async Task<ClientDto> CreateAsync(CreateClientRequest request, Guid userId)
    {
        await using var conn = _db.CreateConnection();
        await conn.OpenAsync();

        var row = await conn.QuerySingleAsync<ClientEntity>(
            """
            INSERT INTO clients (name, company_name, email, phone, address, city, state, postal_code,
                country, website, notes, tags, default_currency, tax_id, payment_terms, created_by)
            VALUES (@Name, @CompanyName, @Email, @Phone, @Address, @City, @State, @PostalCode,
                @Country, @Website, @Notes, @Tags, @DefaultCurrency, @TaxId, @PaymentTerms, @CreatedBy)
            RETURNING *
            """,
            new
            {
                request.Name,
                request.CompanyName,
                request.Email,
                request.Phone,
                request.Address,
                request.City,
                request.State,
                request.PostalCode,
                request.Country,
                request.Website,
                request.Notes,
                Tags = request.Tags ?? Array.Empty<string>(),
                DefaultCurrency = request.DefaultCurrency ?? "USD",
                request.TaxId,
                PaymentTerms = request.PaymentTerms ?? 30,
                CreatedBy = userId,
            });

        return MapToDto(row);
    }

    public async Task<ClientDto?> UpdateAsync(Guid id, UpdateClientRequest request)
    {
        await using var conn = _db.CreateConnection();
        await conn.OpenAsync();

        var fields = new List<string>();
        var parameters = new DynamicParameters();
        parameters.Add("Id", id);

        if (request.Name != null) { fields.Add("name = @Name"); parameters.Add("Name", request.Name); }
        if (request.CompanyName != null) { fields.Add("company_name = @CompanyName"); parameters.Add("CompanyName", request.CompanyName); }
        if (request.Email != null) { fields.Add("email = @Email"); parameters.Add("Email", request.Email); }
        if (request.Phone != null) { fields.Add("phone = @Phone"); parameters.Add("Phone", request.Phone); }
        if (request.Address != null) { fields.Add("address = @Address"); parameters.Add("Address", request.Address); }
        if (request.City != null) { fields.Add("city = @City"); parameters.Add("City", request.City); }
        if (request.State != null) { fields.Add("state = @State"); parameters.Add("State", request.State); }
        if (request.PostalCode != null) { fields.Add("postal_code = @PostalCode"); parameters.Add("PostalCode", request.PostalCode); }
        if (request.Country != null) { fields.Add("country = @Country"); parameters.Add("Country", request.Country); }
        if (request.Website != null) { fields.Add("website = @Website"); parameters.Add("Website", request.Website); }
        if (request.Notes != null) { fields.Add("notes = @Notes"); parameters.Add("Notes", request.Notes); }
        if (request.Tags != null) { fields.Add("tags = @Tags"); parameters.Add("Tags", request.Tags); }
        if (request.DefaultCurrency != null) { fields.Add("default_currency = @DefaultCurrency"); parameters.Add("DefaultCurrency", request.DefaultCurrency); }
        if (request.TaxId != null) { fields.Add("tax_id = @TaxId"); parameters.Add("TaxId", request.TaxId); }
        if (request.PaymentTerms.HasValue) { fields.Add("payment_terms = @PaymentTerms"); parameters.Add("PaymentTerms", request.PaymentTerms.Value); }
        if (request.Status != null) { fields.Add("status = @Status"); parameters.Add("Status", request.Status); }

        if (fields.Count == 0)
            return await GetByIdAsync(id);

        var row = await conn.QuerySingleOrDefaultAsync<ClientEntity>(
            $"UPDATE clients SET {string.Join(", ", fields)} WHERE id = @Id RETURNING *", parameters);

        return row == null ? null : MapToDto(row);
    }

    public async Task<bool> DeleteAsync(Guid id)
    {
        await using var conn = _db.CreateConnection();
        await conn.OpenAsync();

        var affected = await conn.ExecuteAsync("DELETE FROM clients WHERE id = @Id", new { Id = id });
        return affected > 0;
    }

    private static ClientDto MapToDto(ClientEntity e) => new()
    {
        Id = e.Id.ToString(),
        Name = e.Name,
        CompanyName = e.CompanyName,
        Email = e.Email,
        Phone = e.Phone,
        Address = e.Address,
        City = e.City,
        State = e.State,
        PostalCode = e.PostalCode,
        Country = e.Country,
        Website = e.Website,
        Notes = e.Notes,
        Tags = e.Tags,
        DefaultCurrency = e.DefaultCurrency,
        TaxId = e.TaxId,
        PaymentTerms = e.PaymentTerms,
        Status = e.Status,
        CreatedBy = e.CreatedBy?.ToString(),
        CreatedAt = e.CreatedAt,
        UpdatedAt = e.UpdatedAt,
    };

    private class ClientEntity
    {
        public Guid Id { get; set; }
        public string Name { get; set; } = string.Empty;
        public string? CompanyName { get; set; }
        public string? Email { get; set; }
        public string? Phone { get; set; }
        public string? Address { get; set; }
        public string? City { get; set; }
        public string? State { get; set; }
        public string? PostalCode { get; set; }
        public string? Country { get; set; }
        public string? Website { get; set; }
        public string? Notes { get; set; }
        public string[]? Tags { get; set; }
        public string DefaultCurrency { get; set; } = "USD";
        public string? TaxId { get; set; }
        public int PaymentTerms { get; set; } = 30;
        public string Status { get; set; } = "active";
        public Guid? CreatedBy { get; set; }
        public DateTime CreatedAt { get; set; }
        public DateTime UpdatedAt { get; set; }
    }
}
