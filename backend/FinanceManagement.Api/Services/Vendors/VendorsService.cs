using System.Text.Json.Serialization;
using Dapper;
using FinanceManagement.Api.Database;
using FinanceManagement.Api.Middleware;

namespace FinanceManagement.Api.Services.Vendors;

#region DTOs

public class VendorDto
{
    [JsonPropertyName("id")] public string Id { get; set; } = string.Empty;
    [JsonPropertyName("name")] public string Name { get; set; } = string.Empty;
    [JsonPropertyName("payeeType")] public string PayeeType { get; set; } = "vendor";
    [JsonPropertyName("email")] public string? Email { get; set; }
    [JsonPropertyName("phone")] public string? Phone { get; set; }
    [JsonPropertyName("address")] public string? Address { get; set; }
    [JsonPropertyName("city")] public string? City { get; set; }
    [JsonPropertyName("country")] public string? Country { get; set; }
    [JsonPropertyName("taxId")] public string? TaxId { get; set; }
    [JsonPropertyName("notes")] public string? Notes { get; set; }
    [JsonPropertyName("status")] public string Status { get; set; } = "active";
    [JsonPropertyName("createdBy")] public string? CreatedBy { get; set; }
    [JsonPropertyName("createdAt")] public DateTime CreatedAt { get; set; }
    [JsonPropertyName("updatedAt")] public DateTime UpdatedAt { get; set; }
}

public class CreateVendorRequest
{
    [JsonPropertyName("name")] public string Name { get; set; } = string.Empty;
    [JsonPropertyName("payeeType")] public string? PayeeType { get; set; }
    [JsonPropertyName("email")] public string? Email { get; set; }
    [JsonPropertyName("phone")] public string? Phone { get; set; }
    [JsonPropertyName("address")] public string? Address { get; set; }
    [JsonPropertyName("city")] public string? City { get; set; }
    [JsonPropertyName("country")] public string? Country { get; set; }
    [JsonPropertyName("taxId")] public string? TaxId { get; set; }
    [JsonPropertyName("notes")] public string? Notes { get; set; }
}

public class UpdateVendorRequest
{
    [JsonPropertyName("name")] public string? Name { get; set; }
    [JsonPropertyName("payeeType")] public string? PayeeType { get; set; }
    [JsonPropertyName("email")] public string? Email { get; set; }
    [JsonPropertyName("phone")] public string? Phone { get; set; }
    [JsonPropertyName("address")] public string? Address { get; set; }
    [JsonPropertyName("city")] public string? City { get; set; }
    [JsonPropertyName("country")] public string? Country { get; set; }
    [JsonPropertyName("taxId")] public string? TaxId { get; set; }
    [JsonPropertyName("notes")] public string? Notes { get; set; }
    [JsonPropertyName("status")] public string? Status { get; set; }
}

#endregion

public class VendorsService
{
    private readonly DbContext _db;

    public VendorsService(DbContext db) => _db = db;

    public async Task<(List<VendorDto> Vendors, int Total)> GetAllAsync(
        int page = 1, int limit = 20, string? search = null,
        string? payeeType = null, string? status = null)
    {
        await using var conn = _db.CreateConnection();
        await conn.OpenAsync();

        var conditions = new List<string>();
        var p = new DynamicParameters();

        if (!string.IsNullOrEmpty(search))
        {
            conditions.Add("(v.name ILIKE @Search OR v.email ILIKE @Search)");
            p.Add("Search", $"%{search}%");
        }
        if (!string.IsNullOrEmpty(payeeType)) { conditions.Add("v.payee_type = @PayeeType"); p.Add("PayeeType", payeeType); }
        if (!string.IsNullOrEmpty(status)) { conditions.Add("v.status = @Status"); p.Add("Status", status); }

        var where = conditions.Count > 0 ? "WHERE " + string.Join(" AND ", conditions) : "";
        var total = await conn.ExecuteScalarAsync<int>($"SELECT COUNT(*) FROM vendors v {where}", p);

        p.Add("Offset", (page - 1) * limit);
        p.Add("Limit", limit);

        var rows = await conn.QueryAsync<VendorEntity>(
            $"SELECT * FROM vendors v {where} ORDER BY v.name OFFSET @Offset LIMIT @Limit", p);

        return (rows.Select(MapToDto).ToList(), total);
    }

    public async Task<VendorDto?> GetByIdAsync(Guid id)
    {
        await using var conn = _db.CreateConnection();
        await conn.OpenAsync();
        var row = await conn.QuerySingleOrDefaultAsync<VendorEntity>(
            "SELECT * FROM vendors WHERE id = @Id", new { Id = id });
        return row == null ? null : MapToDto(row);
    }

    public async Task<VendorDto> CreateAsync(CreateVendorRequest request, Guid userId)
    {
        await using var conn = _db.CreateConnection();
        await conn.OpenAsync();

        var row = await conn.QuerySingleAsync<VendorEntity>(
            """
            INSERT INTO vendors (name, payee_type, email, phone, address, city, country, tax_id, notes, created_by)
            VALUES (@Name, @PayeeType, @Email, @Phone, @Address, @City, @Country, @TaxId, @Notes, @CreatedBy)
            RETURNING *
            """,
            new
            {
                Name = request.Name.Trim(),
                PayeeType = request.PayeeType ?? "vendor",
                request.Email,
                request.Phone,
                request.Address,
                request.City,
                request.Country,
                TaxId = request.TaxId,
                request.Notes,
                CreatedBy = userId,
            });

        await LogAuditAsync(conn, userId, "create", "vendor", row.Id);
        return MapToDto(row);
    }

    public async Task<VendorDto?> UpdateAsync(Guid id, UpdateVendorRequest request, Guid userId)
    {
        await using var conn = _db.CreateConnection();
        await conn.OpenAsync();

        var fields = new List<string>();
        var p = new DynamicParameters();
        p.Add("Id", id);

        if (request.Name != null) { fields.Add("name = @Name"); p.Add("Name", request.Name.Trim()); }
        if (request.PayeeType != null) { fields.Add("payee_type = @PayeeType"); p.Add("PayeeType", request.PayeeType); }
        if (request.Email != null) { fields.Add("email = @Email"); p.Add("Email", request.Email); }
        if (request.Phone != null) { fields.Add("phone = @Phone"); p.Add("Phone", request.Phone); }
        if (request.Address != null) { fields.Add("address = @Address"); p.Add("Address", request.Address); }
        if (request.City != null) { fields.Add("city = @City"); p.Add("City", request.City); }
        if (request.Country != null) { fields.Add("country = @Country"); p.Add("Country", request.Country); }
        if (request.TaxId != null) { fields.Add("tax_id = @TaxId"); p.Add("TaxId", request.TaxId); }
        if (request.Notes != null) { fields.Add("notes = @Notes"); p.Add("Notes", request.Notes); }
        if (request.Status != null) { fields.Add("status = @Status"); p.Add("Status", request.Status); }

        if (fields.Count == 0) return await GetByIdAsync(id);

        var row = await conn.QuerySingleOrDefaultAsync<VendorEntity>(
            $"UPDATE vendors SET {string.Join(", ", fields)} WHERE id = @Id RETURNING *", p);

        if (row != null) await LogAuditAsync(conn, userId, "update", "vendor", id);
        return row == null ? null : MapToDto(row);
    }

    public async Task<bool> DeleteAsync(Guid id, Guid userId)
    {
        await using var conn = _db.CreateConnection();
        await conn.OpenAsync();

        var affected = await conn.ExecuteAsync("DELETE FROM vendors WHERE id = @Id", new { Id = id });
        if (affected > 0) await LogAuditAsync(conn, userId, "delete", "vendor", id);
        return affected > 0;
    }

    // Used by ExpensesService to resolve or auto-create a vendor from name.
    // Uses INSERT ... ON CONFLICT ... RETURNING so the entire lookup-or-create is a single
    // atomic statement — eliminates the TOCTOU race between the old SELECT-then-INSERT pattern.
    // Requires migration 022 (idx_vendors_name_lower unique index) to be applied first.
    public static async Task<Guid?> GetOrCreateVendorAsync(
        Npgsql.NpgsqlConnection conn,
        Npgsql.NpgsqlTransaction? tx,
        Guid? vendorId,
        string? vendorName,
        Guid userId)
    {
        if (string.IsNullOrWhiteSpace(vendorName)) return vendorId;

        if (vendorId.HasValue)
        {
            var exists = await conn.ExecuteScalarAsync<int>(
                "SELECT COUNT(1) FROM vendors WHERE id = @Id", new { Id = vendorId.Value }, tx);
            if (exists > 0) return vendorId;
        }

        // Atomic upsert: inserts if not present, otherwise no-op update to enable RETURNING.
        // ON CONFLICT references idx_vendors_name_lower (LOWER(TRIM(name))).
        return await conn.ExecuteScalarAsync<Guid>(
            """
            INSERT INTO vendors (name, payee_type, status, created_by)
            VALUES (@Name, 'vendor', 'active', @CreatedBy)
            ON CONFLICT (LOWER(TRIM(name))) DO UPDATE SET updated_at = vendors.updated_at
            RETURNING id
            """,
            new { Name = vendorName.Trim(), CreatedBy = userId }, tx);
    }

    private static async Task LogAuditAsync(Npgsql.NpgsqlConnection conn, Guid userId, string action, string entityType, Guid entityId)
    {
        await conn.ExecuteAsync(
            "INSERT INTO audit_logs (user_id, action, entity_type, entity_id) VALUES (@UserId, @Action, @EntityType, @EntityId)",
            new { UserId = userId, Action = action, EntityType = entityType, EntityId = entityId });
    }

    private static VendorDto MapToDto(VendorEntity e) => new()
    {
        Id = e.Id.ToString(),
        Name = e.Name,
        PayeeType = e.Payee_Type,
        Email = e.Email,
        Phone = e.Phone,
        Address = e.Address,
        City = e.City,
        Country = e.Country,
        TaxId = e.Tax_Id,
        Notes = e.Notes,
        Status = e.Status,
        CreatedBy = e.Created_By?.ToString(),
        CreatedAt = e.Created_At,
        UpdatedAt = e.Updated_At,
    };

    private class VendorEntity
    {
        public Guid Id { get; set; }
        public string Name { get; set; } = string.Empty;
        public string Payee_Type { get; set; } = "vendor";
        public string? Email { get; set; }
        public string? Phone { get; set; }
        public string? Address { get; set; }
        public string? City { get; set; }
        public string? Country { get; set; }
        public string? Tax_Id { get; set; }
        public string? Notes { get; set; }
        public string Status { get; set; } = "active";
        public Guid? Created_By { get; set; }
        public DateTime Created_At { get; set; }
        public DateTime Updated_At { get; set; }
    }
}
