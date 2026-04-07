using System.Text.Json.Serialization;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Dapper;
using FinanceManagement.Api.Database;
using FinanceManagement.Api.Models;

namespace FinanceManagement.Api.Controllers;

public class UnifiedContactDto
{
    [JsonPropertyName("id")] public string Id { get; set; } = string.Empty;
    [JsonPropertyName("source")] public string Source { get; set; } = string.Empty;
    [JsonPropertyName("name")] public string Name { get; set; } = string.Empty;
    [JsonPropertyName("email")] public string? Email { get; set; }
    [JsonPropertyName("phone")] public string? Phone { get; set; }
    [JsonPropertyName("role")] public string? Role { get; set; }
    [JsonPropertyName("companyName")] public string? CompanyName { get; set; }
    [JsonPropertyName("linkedEntityId")] public string? LinkedEntityId { get; set; }
    [JsonPropertyName("linkedEntityName")] public string? LinkedEntityName { get; set; }
    [JsonPropertyName("isPrimary")] public bool IsPrimary { get; set; }
}

[ApiController]
[Route("api/contacts")]
[Authorize]
public class ContactsController : ControllerBase
{
    private readonly DbContext _db;

    public ContactsController(DbContext db) => _db = db;

    [HttpGet]
    public async Task<IActionResult> GetAll(
        [FromQuery] int page = 1,
        [FromQuery] int limit = 50,
        [FromQuery] string? search = null)
    {
        await using var conn = _db.CreateConnection();
        await conn.OpenAsync();

        var searchParam = string.IsNullOrWhiteSpace(search) ? null : $"%{search}%";

        var countSql = """
            SELECT COUNT(*) FROM (
                SELECT cp.id
                FROM contact_persons cp
                WHERE (@Search IS NULL OR cp.name ILIKE @Search OR cp.email ILIKE @Search)
                UNION ALL
                SELECT l.id
                FROM leads l
                WHERE l.contact_name IS NOT NULL AND TRIM(l.contact_name) <> ''
                  AND (@Search IS NULL OR l.contact_name ILIKE @Search OR l.contact_email ILIKE @Search)
            ) sub
            """;

        var total = await conn.ExecuteScalarAsync<int>(countSql, new { Search = searchParam });

        var dataSql = """
            SELECT id, source, name, email, phone, role, company_name, linked_entity_id, linked_entity_name, is_primary
            FROM (
                SELECT cp.id::text, 'client' AS source, cp.name,
                       cp.email, cp.phone, cp.role,
                       COALESCE(c.company_name, c.name) AS company_name,
                       c.id::text AS linked_entity_id,
                       c.name AS linked_entity_name,
                       cp.is_primary
                FROM contact_persons cp
                LEFT JOIN clients c ON c.id = cp.client_id
                WHERE (@Search IS NULL OR cp.name ILIKE @Search OR cp.email ILIKE @Search)

                UNION ALL

                SELECT l.id::text, 'lead' AS source, l.contact_name AS name,
                       l.contact_email AS email, l.contact_phone AS phone, NULL AS role,
                       l.company_name,
                       l.id::text AS linked_entity_id,
                       l.title AS linked_entity_name,
                       false AS is_primary
                FROM leads l
                WHERE l.contact_name IS NOT NULL AND TRIM(l.contact_name) <> ''
                  AND (@Search IS NULL OR l.contact_name ILIKE @Search OR l.contact_email ILIKE @Search)
            ) sub
            ORDER BY name
            OFFSET @Offset LIMIT @Limit
            """;

        var rows = await conn.QueryAsync<ContactRow>(dataSql, new
        {
            Search = searchParam,
            Offset = (page - 1) * limit,
            Limit = limit,
        });

        var contacts = rows.Select(r => new UnifiedContactDto
        {
            Id = r.Id,
            Source = r.Source,
            Name = r.Name,
            Email = r.Email,
            Phone = r.Phone,
            Role = r.Role,
            CompanyName = r.Company_Name,
            LinkedEntityId = r.Linked_Entity_Id,
            LinkedEntityName = r.Linked_Entity_Name,
            IsPrimary = r.Is_Primary,
        }).ToList();

        return Ok(new PaginatedResponse<UnifiedContactDto>
        {
            Data = contacts,
            Pagination = new PaginationInfo
            {
                Page = page, Limit = limit, Total = total,
                TotalPages = (int)Math.Ceiling(total / (double)limit),
            },
        });
    }

    private class ContactRow
    {
        public string Id { get; set; } = string.Empty;
        public string Source { get; set; } = string.Empty;
        public string Name { get; set; } = string.Empty;
        public string? Email { get; set; }
        public string? Phone { get; set; }
        public string? Role { get; set; }
        public string? Company_Name { get; set; }
        public string? Linked_Entity_Id { get; set; }
        public string? Linked_Entity_Name { get; set; }
        public bool Is_Primary { get; set; }
    }
}
