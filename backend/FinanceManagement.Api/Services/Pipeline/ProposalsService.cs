using System.Text.Json.Serialization;
using Dapper;
using FinanceManagement.Api.Database;
using FinanceManagement.Api.Middleware;

namespace FinanceManagement.Api.Services.Pipeline;

#region DTOs

public class ProposalItemDto
{
    [JsonPropertyName("id")] public string Id { get; set; } = string.Empty;
    [JsonPropertyName("proposalId")] public string ProposalId { get; set; } = string.Empty;
    [JsonPropertyName("description")] public string Description { get; set; } = string.Empty;
    [JsonPropertyName("quantity")] public decimal Quantity { get; set; } = 1;
    [JsonPropertyName("unitPrice")] public decimal UnitPrice { get; set; }
    [JsonPropertyName("discountPercent")] public decimal DiscountPercent { get; set; }
    [JsonPropertyName("total")] public decimal Total { get; set; }
    [JsonPropertyName("sortOrder")] public int SortOrder { get; set; }
}

public class ProposalDto
{
    [JsonPropertyName("id")] public string Id { get; set; } = string.Empty;
    [JsonPropertyName("leadId")] public string? LeadId { get; set; }
    [JsonPropertyName("clientId")] public string? ClientId { get; set; }
    [JsonPropertyName("proposalNumber")] public string ProposalNumber { get; set; } = string.Empty;
    [JsonPropertyName("title")] public string Title { get; set; } = string.Empty;
    [JsonPropertyName("description")] public string? Description { get; set; }
    [JsonPropertyName("issueDate")] public string IssueDate { get; set; } = string.Empty;
    [JsonPropertyName("validUntil")] public string? ValidUntil { get; set; }
    [JsonPropertyName("subtotal")] public decimal Subtotal { get; set; }
    [JsonPropertyName("taxRate")] public decimal TaxRate { get; set; }
    [JsonPropertyName("taxAmount")] public decimal TaxAmount { get; set; }
    [JsonPropertyName("discountAmount")] public decimal DiscountAmount { get; set; }
    [JsonPropertyName("total")] public decimal Total { get; set; }
    [JsonPropertyName("currency")] public string Currency { get; set; } = "USD";
    [JsonPropertyName("status")] public string Status { get; set; } = "draft";
    [JsonPropertyName("statusChangedAt")] public DateTime? StatusChangedAt { get; set; }
    [JsonPropertyName("rejectionReason")] public string? RejectionReason { get; set; }
    [JsonPropertyName("convertedToIncomeId")] public string? ConvertedToIncomeId { get; set; }
    [JsonPropertyName("convertedAt")] public DateTime? ConvertedAt { get; set; }
    [JsonPropertyName("terms")] public string? Terms { get; set; }
    [JsonPropertyName("notes")] public string? Notes { get; set; }
    [JsonPropertyName("documentUrl")] public string? DocumentUrl { get; set; }
    [JsonPropertyName("clientName")] public string? ClientName { get; set; }
    [JsonPropertyName("leadTitle")] public string? LeadTitle { get; set; }
    [JsonPropertyName("items")] public List<ProposalItemDto> Items { get; set; } = [];
    [JsonPropertyName("createdBy")] public string? CreatedBy { get; set; }
    [JsonPropertyName("createdAt")] public DateTime CreatedAt { get; set; }
    [JsonPropertyName("updatedAt")] public DateTime UpdatedAt { get; set; }
}

public class ProposalItemInput
{
    [JsonPropertyName("description")] public string Description { get; set; } = string.Empty;
    [JsonPropertyName("quantity")] public decimal? Quantity { get; set; }
    [JsonPropertyName("unitPrice")] public decimal UnitPrice { get; set; }
    [JsonPropertyName("discountPercent")] public decimal? DiscountPercent { get; set; }
    [JsonPropertyName("sortOrder")] public int? SortOrder { get; set; }
}

public class CreateProposalRequest
{
    [JsonPropertyName("leadId")] public string? LeadId { get; set; }
    [JsonPropertyName("clientId")] public string? ClientId { get; set; }
    [JsonPropertyName("title")] public string Title { get; set; } = string.Empty;
    [JsonPropertyName("description")] public string? Description { get; set; }
    [JsonPropertyName("issueDate")] public string? IssueDate { get; set; }
    [JsonPropertyName("validUntil")] public string? ValidUntil { get; set; }
    [JsonPropertyName("taxRate")] public decimal? TaxRate { get; set; }
    [JsonPropertyName("discountAmount")] public decimal? DiscountAmount { get; set; }
    [JsonPropertyName("currency")] public string? Currency { get; set; }
    [JsonPropertyName("terms")] public string? Terms { get; set; }
    [JsonPropertyName("notes")] public string? Notes { get; set; }
    [JsonPropertyName("items")] public List<ProposalItemInput> Items { get; set; } = [];
}

public class UpdateProposalRequest
{
    [JsonPropertyName("leadId")] public string? LeadId { get; set; }
    [JsonPropertyName("clientId")] public string? ClientId { get; set; }
    [JsonPropertyName("title")] public string? Title { get; set; }
    [JsonPropertyName("description")] public string? Description { get; set; }
    [JsonPropertyName("validUntil")] public string? ValidUntil { get; set; }
    [JsonPropertyName("taxRate")] public decimal? TaxRate { get; set; }
    [JsonPropertyName("discountAmount")] public decimal? DiscountAmount { get; set; }
    [JsonPropertyName("currency")] public string? Currency { get; set; }
    [JsonPropertyName("status")] public string? Status { get; set; }
    [JsonPropertyName("rejectionReason")] public string? RejectionReason { get; set; }
    [JsonPropertyName("terms")] public string? Terms { get; set; }
    [JsonPropertyName("notes")] public string? Notes { get; set; }
    [JsonPropertyName("documentUrl")] public string? DocumentUrl { get; set; }
    [JsonPropertyName("items")] public List<ProposalItemInput>? Items { get; set; }
}

#endregion

public class ProposalsService
{
    private readonly DbContext _db;
    private readonly ILogger<ProposalsService> _logger;

    public ProposalsService(DbContext db, ILogger<ProposalsService> logger)
    {
        _db = db;
        _logger = logger;
    }

    public async Task<(List<ProposalDto> Proposals, int Total)> GetAllAsync(
        int page = 1, int limit = 20, string? search = null, string? status = null, string? clientId = null,
        string? startDate = null, string? endDate = null)
    {
        await using var conn = _db.CreateConnection();
        await conn.OpenAsync();

        var conditions = new List<string>();
        var parameters = new DynamicParameters();

        if (!string.IsNullOrEmpty(search))
        {
            conditions.Add("(p.title ILIKE @Search OR p.proposal_number ILIKE @Search)");
            parameters.Add("Search", $"%{search}%");
        }

        if (!string.IsNullOrEmpty(status))
        {
            conditions.Add("p.status = @Status");
            parameters.Add("Status", status);
        }

        if (!string.IsNullOrEmpty(clientId))
        {
            conditions.Add("p.client_id = @ClientId::uuid");
            parameters.Add("ClientId", clientId);
        }

        if (!string.IsNullOrEmpty(startDate))
        {
            conditions.Add("p.issue_date >= @StartDate::date");
            parameters.Add("StartDate", startDate);
        }

        if (!string.IsNullOrEmpty(endDate))
        {
            conditions.Add("p.issue_date <= @EndDate::date");
            parameters.Add("EndDate", endDate);
        }

        var whereClause = conditions.Count > 0 ? $"WHERE {string.Join(" AND ", conditions)}" : "";
        var offset = (page - 1) * limit;

        var total = await conn.ExecuteScalarAsync<int>(
            $"SELECT COUNT(*) FROM proposals p {whereClause}", parameters);

        parameters.Add("Limit", limit);
        parameters.Add("Offset", offset);

        var rows = await conn.QueryAsync<ProposalEntity>(
            $"""
            SELECT p.*,
                   c.name AS client_name,
                   l.title AS lead_title
            FROM proposals p
            LEFT JOIN clients c ON c.id = p.client_id
            LEFT JOIN leads l ON l.id = p.lead_id
            {whereClause}
            ORDER BY p.created_at DESC
            LIMIT @Limit OFFSET @Offset
            """, parameters);

        var proposalList = rows.ToList();
        var proposals = new List<ProposalDto>();

        if (proposalList.Count > 0)
        {
            var proposalIds = proposalList.Select(p => p.Id).ToArray();
            var items = await conn.QueryAsync<ProposalItemEntity>(
                "SELECT * FROM proposal_items WHERE proposal_id = ANY(@Ids) ORDER BY sort_order, created_at",
                new { Ids = proposalIds });

            var itemsMap = items.GroupBy(i => i.ProposalId)
                .ToDictionary(g => g.Key, g => g.Select(MapItemToDto).ToList());

            foreach (var p in proposalList)
            {
                var dto = MapToDto(p);
                dto.Items = itemsMap.GetValueOrDefault(p.Id, []);
                proposals.Add(dto);
            }
        }

        return (proposals, total);
    }

    public async Task<ProposalDto?> GetByIdAsync(Guid id)
    {
        await using var conn = _db.CreateConnection();
        await conn.OpenAsync();

        var row = await conn.QuerySingleOrDefaultAsync<ProposalEntity>(
            """
            SELECT p.*,
                   c.name AS client_name,
                   l.title AS lead_title
            FROM proposals p
            LEFT JOIN clients c ON c.id = p.client_id
            LEFT JOIN leads l ON l.id = p.lead_id
            WHERE p.id = @Id
            """, new { Id = id });

        if (row == null) return null;

        var items = await conn.QueryAsync<ProposalItemEntity>(
            "SELECT * FROM proposal_items WHERE proposal_id = @Id ORDER BY sort_order, created_at",
            new { Id = id });

        var dto = MapToDto(row);
        dto.Items = items.Select(MapItemToDto).ToList();
        return dto;
    }

    public async Task<ProposalDto> CreateAsync(CreateProposalRequest request, Guid userId)
    {
        await using var conn = _db.CreateConnection();
        await conn.OpenAsync();
        await using var tx = await conn.BeginTransactionAsync();

        try
        {
            // Generate proposal number
            var proposalNumber = await conn.ExecuteScalarAsync<string>(
                "SELECT generate_proposal_number()", transaction: tx);

            // Calculate item totals
            var subtotal = 0m;
            foreach (var item in request.Items)
            {
                var qty = item.Quantity ?? 1;
                var discount = item.DiscountPercent ?? 0;
                var itemTotal = qty * item.UnitPrice * (1 - discount / 100);
                subtotal += itemTotal;
            }

            var taxRate = request.TaxRate ?? 0;
            var discountAmount = request.DiscountAmount ?? 0;
            var taxAmount = subtotal * taxRate / 100;
            var total = subtotal + taxAmount - discountAmount;

            var row = await conn.QuerySingleAsync<ProposalEntity>(
                """
                INSERT INTO proposals (lead_id, client_id, proposal_number, title, description,
                    issue_date, valid_until, subtotal, tax_rate, tax_amount, discount_amount, total,
                    currency, terms, notes, created_by)
                VALUES (@LeadId::uuid, @ClientId::uuid, @ProposalNumber, @Title, @Description,
                    COALESCE(@IssueDate::date, CURRENT_DATE), @ValidUntil::date,
                    @Subtotal, @TaxRate, @TaxAmount, @DiscountAmount, @Total,
                    @Currency, @Terms, @Notes, @CreatedBy)
                RETURNING *
                """,
                new
                {
                    LeadId = request.LeadId,
                    ClientId = request.ClientId,
                    ProposalNumber = proposalNumber,
                    request.Title,
                    request.Description,
                    IssueDate = request.IssueDate,
                    ValidUntil = request.ValidUntil,
                    Subtotal = subtotal,
                    TaxRate = taxRate,
                    TaxAmount = taxAmount,
                    DiscountAmount = discountAmount,
                    Total = total,
                    Currency = request.Currency ?? "USD",
                    request.Terms,
                    request.Notes,
                    CreatedBy = userId,
                }, transaction: tx);

            // Insert items
            var sortOrder = 0;
            foreach (var item in request.Items)
            {
                var qty = item.Quantity ?? 1;
                var discount = item.DiscountPercent ?? 0;
                var itemTotal = qty * item.UnitPrice * (1 - discount / 100);

                await conn.ExecuteAsync(
                    """
                    INSERT INTO proposal_items (proposal_id, description, quantity, unit_price, discount_percent, total, sort_order)
                    VALUES (@ProposalId, @Description, @Quantity, @UnitPrice, @DiscountPercent, @Total, @SortOrder)
                    """,
                    new
                    {
                        ProposalId = row.Id,
                        item.Description,
                        Quantity = qty,
                        item.UnitPrice,
                        DiscountPercent = discount,
                        Total = itemTotal,
                        SortOrder = item.SortOrder ?? sortOrder++,
                    }, transaction: tx);
            }

            await tx.CommitAsync();

            return (await GetByIdAsync(row.Id))!;
        }
        catch
        {
            await tx.RollbackAsync();
            throw;
        }
    }

    public async Task<ProposalDto?> UpdateAsync(Guid id, UpdateProposalRequest request)
    {
        await using var conn = _db.CreateConnection();
        await conn.OpenAsync();
        await using var tx = await conn.BeginTransactionAsync();

        try
        {
            var fields = new List<string>();
            var parameters = new DynamicParameters();
            parameters.Add("Id", id);

            if (request.LeadId != null) { fields.Add("lead_id = @LeadId::uuid"); parameters.Add("LeadId", request.LeadId); }
            if (request.ClientId != null) { fields.Add("client_id = @ClientId::uuid"); parameters.Add("ClientId", request.ClientId); }
            if (request.Title != null) { fields.Add("title = @Title"); parameters.Add("Title", request.Title); }
            if (request.Description != null) { fields.Add("description = @Description"); parameters.Add("Description", request.Description); }
            if (request.ValidUntil != null) { fields.Add("valid_until = @ValidUntil::date"); parameters.Add("ValidUntil", request.ValidUntil); }
            if (request.Currency != null) { fields.Add("currency = @Currency"); parameters.Add("Currency", request.Currency); }
            if (request.Status != null) { fields.Add("status = @Status"); parameters.Add("Status", request.Status); }
            if (request.RejectionReason != null) { fields.Add("rejection_reason = @RejectionReason"); parameters.Add("RejectionReason", request.RejectionReason); }
            if (request.Terms != null) { fields.Add("terms = @Terms"); parameters.Add("Terms", request.Terms); }
            if (request.Notes != null) { fields.Add("notes = @Notes"); parameters.Add("Notes", request.Notes); }
            if (request.DocumentUrl != null) { fields.Add("document_url = @DocumentUrl"); parameters.Add("DocumentUrl", request.DocumentUrl); }

            // If items are provided, recalculate totals
            if (request.Items != null)
            {
                var subtotal = 0m;
                foreach (var item in request.Items)
                {
                    var qty = item.Quantity ?? 1;
                    var discount = item.DiscountPercent ?? 0;
                    subtotal += qty * item.UnitPrice * (1 - discount / 100);
                }

                // Get current tax_rate and discount_amount if not being updated
                var current = await conn.QuerySingleOrDefaultAsync<ProposalEntity>(
                    "SELECT * FROM proposals WHERE id = @Id", new { Id = id }, transaction: tx);

                if (current == null) { await tx.RollbackAsync(); return null; }

                var taxRate = request.TaxRate ?? current.TaxRate;
                var discountAmount = request.DiscountAmount ?? current.DiscountAmount;
                var taxAmount = subtotal * taxRate / 100;
                var total = subtotal + taxAmount - discountAmount;

                fields.Add("subtotal = @Subtotal");
                fields.Add("tax_rate = @TaxRate");
                fields.Add("tax_amount = @TaxAmount");
                fields.Add("discount_amount = @DiscountAmount");
                fields.Add("total = @Total");
                parameters.Add("Subtotal", subtotal);
                parameters.Add("TaxRate", taxRate);
                parameters.Add("TaxAmount", taxAmount);
                parameters.Add("DiscountAmount", discountAmount);
                parameters.Add("Total", total);

                // Replace items
                await conn.ExecuteAsync(
                    "DELETE FROM proposal_items WHERE proposal_id = @Id",
                    new { Id = id }, transaction: tx);

                var sortOrder = 0;
                foreach (var item in request.Items)
                {
                    var qty = item.Quantity ?? 1;
                    var discount = item.DiscountPercent ?? 0;
                    var itemTotal = qty * item.UnitPrice * (1 - discount / 100);

                    await conn.ExecuteAsync(
                        """
                        INSERT INTO proposal_items (proposal_id, description, quantity, unit_price, discount_percent, total, sort_order)
                        VALUES (@ProposalId, @Description, @Quantity, @UnitPrice, @DiscountPercent, @Total, @SortOrder)
                        """,
                        new
                        {
                            ProposalId = id,
                            item.Description,
                            Quantity = qty,
                            item.UnitPrice,
                            DiscountPercent = discount,
                            Total = itemTotal,
                            SortOrder = item.SortOrder ?? sortOrder++,
                        }, transaction: tx);
                }
            }
            else if (request.TaxRate.HasValue || request.DiscountAmount.HasValue)
            {
                // Recalculate totals with existing items
                var current = await conn.QuerySingleOrDefaultAsync<ProposalEntity>(
                    "SELECT * FROM proposals WHERE id = @Id", new { Id = id }, transaction: tx);

                if (current == null) { await tx.RollbackAsync(); return null; }

                var taxRate = request.TaxRate ?? current.TaxRate;
                var discountAmount = request.DiscountAmount ?? current.DiscountAmount;
                var taxAmount = current.Subtotal * taxRate / 100;
                var total = current.Subtotal + taxAmount - discountAmount;

                fields.Add("tax_rate = @TaxRate");
                fields.Add("tax_amount = @TaxAmount");
                fields.Add("discount_amount = @DiscountAmount");
                fields.Add("total = @Total");
                parameters.Add("TaxRate", taxRate);
                parameters.Add("TaxAmount", taxAmount);
                parameters.Add("DiscountAmount", discountAmount);
                parameters.Add("Total", total);
            }

            if (fields.Count > 0)
            {
                var affected = await conn.ExecuteAsync(
                    $"UPDATE proposals SET {string.Join(", ", fields)} WHERE id = @Id",
                    parameters, transaction: tx);

                if (affected == 0) { await tx.RollbackAsync(); return null; }
            }

            await tx.CommitAsync();
            return await GetByIdAsync(id);
        }
        catch
        {
            await tx.RollbackAsync();
            throw;
        }
    }

    public async Task<bool> DeleteAsync(Guid id)
    {
        await using var conn = _db.CreateConnection();
        await conn.OpenAsync();

        var affected = await conn.ExecuteAsync("DELETE FROM proposals WHERE id = @Id", new { Id = id });
        return affected > 0;
    }

    #region Mappers

    private static ProposalDto MapToDto(ProposalEntity e) => new()
    {
        Id = e.Id.ToString(),
        LeadId = e.LeadId?.ToString(),
        ClientId = e.ClientId?.ToString(),
        ProposalNumber = e.ProposalNumber,
        Title = e.Title,
        Description = e.Description,
        IssueDate = e.IssueDate.ToString("yyyy-MM-dd"),
        ValidUntil = e.ValidUntil?.ToString("yyyy-MM-dd"),
        Subtotal = e.Subtotal,
        TaxRate = e.TaxRate,
        TaxAmount = e.TaxAmount,
        DiscountAmount = e.DiscountAmount,
        Total = e.Total,
        Currency = e.Currency,
        Status = e.Status,
        StatusChangedAt = e.StatusChangedAt,
        RejectionReason = e.RejectionReason,
        ConvertedToIncomeId = e.ConvertedToIncomeId?.ToString(),
        ConvertedAt = e.ConvertedAt,
        Terms = e.Terms,
        Notes = e.Notes,
        DocumentUrl = e.DocumentUrl,
        ClientName = e.ClientName,
        LeadTitle = e.LeadTitle,
        CreatedBy = e.CreatedBy?.ToString(),
        CreatedAt = e.CreatedAt,
        UpdatedAt = e.UpdatedAt,
    };

    private static ProposalItemDto MapItemToDto(ProposalItemEntity e) => new()
    {
        Id = e.Id.ToString(),
        ProposalId = e.ProposalId.ToString(),
        Description = e.Description,
        Quantity = e.Quantity,
        UnitPrice = e.UnitPrice,
        DiscountPercent = e.DiscountPercent,
        Total = e.Total,
        SortOrder = e.SortOrder,
    };

    #endregion

    #region Entities

    private class ProposalEntity
    {
        public Guid Id { get; set; }
        public Guid? LeadId { get; set; }
        public Guid? ClientId { get; set; }
        public string ProposalNumber { get; set; } = string.Empty;
        public string Title { get; set; } = string.Empty;
        public string? Description { get; set; }
        public DateTime IssueDate { get; set; }
        public DateTime? ValidUntil { get; set; }
        public decimal Subtotal { get; set; }
        public decimal TaxRate { get; set; }
        public decimal TaxAmount { get; set; }
        public decimal DiscountAmount { get; set; }
        public decimal Total { get; set; }
        public string Currency { get; set; } = "USD";
        public string Status { get; set; } = "draft";
        public DateTime? StatusChangedAt { get; set; }
        public string? RejectionReason { get; set; }
        public Guid? ConvertedToIncomeId { get; set; }
        public DateTime? ConvertedAt { get; set; }
        public string? Terms { get; set; }
        public string? Notes { get; set; }
        public string? DocumentUrl { get; set; }
        public string? ClientName { get; set; }
        public string? LeadTitle { get; set; }
        public Guid? CreatedBy { get; set; }
        public DateTime CreatedAt { get; set; }
        public DateTime UpdatedAt { get; set; }
    }

    private class ProposalItemEntity
    {
        public Guid Id { get; set; }
        public Guid ProposalId { get; set; }
        public string Description { get; set; } = string.Empty;
        public decimal Quantity { get; set; } = 1;
        public decimal UnitPrice { get; set; }
        public decimal DiscountPercent { get; set; }
        public decimal Total { get; set; }
        public int SortOrder { get; set; }
        public DateTime CreatedAt { get; set; }
        public DateTime UpdatedAt { get; set; }
    }

    #endregion
}
