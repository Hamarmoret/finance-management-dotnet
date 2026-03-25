using System.Globalization;
using System.Text;
using Dapper;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using FinanceManagement.Api.Database;
using FinanceManagement.Api.Middleware;

namespace FinanceManagement.Api.Controllers;

[ApiController]
[Route("api/csv-import")]
[Authorize]
public class CsvImportController : ControllerBase
{
    private readonly DbContext _db;

    private static readonly string[] DateFormats =
    [
        "yyyy-MM-dd",
        "MM/dd/yyyy",
        "dd/MM/yyyy",
        "yyyy/MM/dd",
        "M/d/yyyy",
        "d/M/yyyy",
        "MM-dd-yyyy",
        "dd-MM-yyyy",
    ];

    public CsvImportController(DbContext db)
    {
        _db = db;
    }

    // =========================================================================
    // POST /api/csv-import/expenses
    // =========================================================================
    [HttpPost("expenses")]
    public async Task<IActionResult> ImportExpenses(IFormFile file)
    {
        var userId = HttpContext.GetUserId()
            ?? throw new AppException("Unauthorized", 401, "UNAUTHORIZED");

        ValidateFile(file);

        var rows = await ParseCsvFile(file);
        var headers = NormalizeHeaders(rows[0]);

        var imported = 0;
        var failed = 0;
        var errors = new List<object>();

        await using var conn = _db.CreateConnection();
        await conn.OpenAsync();

        for (var i = 1; i < rows.Count; i++)
        {
            try
            {
                var fields = rows[i];
                var record = MapRow(headers, fields);

                var description = GetRequired(record, "description", i);
                var amount = ParseDecimal(GetRequired(record, "amount", i), i, "amount");
                var currency = GetOptional(record, "currency") ?? "USD";
                var expenseDate = ParseDate(GetRequired(record, "expense_date", i), i, "expense_date");
                var vendor = GetOptional(record, "vendor");
                var paymentMethod = GetOptional(record, "payment_method");
                var notes = GetOptional(record, "notes");
                var category = GetOptional(record, "category");

                Guid? categoryId = null;
                if (!string.IsNullOrWhiteSpace(category))
                {
                    categoryId = await conn.QueryFirstOrDefaultAsync<Guid?>(
                        "SELECT id FROM expense_categories WHERE LOWER(name) = @Name AND is_active = TRUE LIMIT 1",
                        new { Name = category.ToLowerInvariant() });
                }

                await conn.ExecuteAsync("""
                    INSERT INTO expenses (description, amount, currency, category_id, expense_date, vendor, notes, created_by)
                    VALUES (@Description, @Amount, @Currency, @CategoryId, @ExpenseDate, @Vendor, @Notes, @CreatedBy::uuid)
                    """,
                    new
                    {
                        Description = description,
                        Amount = amount,
                        Currency = currency,
                        CategoryId = categoryId,
                        ExpenseDate = expenseDate,
                        Vendor = vendor,
                        Notes = notes,
                        CreatedBy = userId,
                    });

                imported++;
            }
            catch (CsvRowException ex)
            {
                failed++;
                errors.Add(new { row = ex.Row, message = ex.Message });
            }
            catch (Exception ex)
            {
                failed++;
                errors.Add(new { row = i + 1, message = ex.Message });
            }
        }

        return Ok(new
        {
            success = true,
            data = new { imported, failed, errors },
        });
    }

    // =========================================================================
    // POST /api/csv-import/income
    // =========================================================================
    [HttpPost("income")]
    public async Task<IActionResult> ImportIncome(IFormFile file)
    {
        var userId = HttpContext.GetUserId()
            ?? throw new AppException("Unauthorized", 401, "UNAUTHORIZED");

        ValidateFile(file);

        var rows = await ParseCsvFile(file);
        var headers = NormalizeHeaders(rows[0]);

        var imported = 0;
        var failed = 0;
        var errors = new List<object>();

        await using var conn = _db.CreateConnection();
        await conn.OpenAsync();

        for (var i = 1; i < rows.Count; i++)
        {
            try
            {
                var fields = rows[i];
                var record = MapRow(headers, fields);

                var description = GetRequired(record, "description", i);
                var amount = ParseDecimal(GetRequired(record, "amount", i), i, "amount");
                var currency = GetOptional(record, "currency") ?? "USD";
                var clientName = GetOptional(record, "client_name");
                var incomeDate = ParseDate(GetRequired(record, "income_date", i), i, "income_date");
                var invoiceNumber = GetOptional(record, "invoice_number");
                var invoiceType = GetOptional(record, "invoice_type");
                var invoiceStatus = GetOptional(record, "invoice_status");
                var notes = GetOptional(record, "notes");

                DateTime? paymentDueDate = null;
                var paymentDueDateStr = GetOptional(record, "payment_due_date");
                if (!string.IsNullOrWhiteSpace(paymentDueDateStr))
                    paymentDueDate = ParseDate(paymentDueDateStr, i, "payment_due_date");

                DateTime? proformaInvoiceDate = null;
                var proformaStr = GetOptional(record, "proforma_invoice_date");
                if (!string.IsNullOrWhiteSpace(proformaStr))
                    proformaInvoiceDate = ParseDate(proformaStr, i, "proforma_invoice_date");

                DateTime? taxInvoiceDate = null;
                var taxStr = GetOptional(record, "tax_invoice_date");
                if (!string.IsNullOrWhiteSpace(taxStr))
                    taxInvoiceDate = ParseDate(taxStr, i, "tax_invoice_date");

                // Validate invoice_type if provided
                if (!string.IsNullOrWhiteSpace(invoiceType))
                {
                    var validTypes = new[] { "standard", "proforma", "tax", "credit_note", "receipt" };
                    if (!validTypes.Contains(invoiceType.ToLowerInvariant()))
                        throw new CsvRowException(i + 1,
                            $"Invalid invoice_type '{invoiceType}'. Must be one of: {string.Join(", ", validTypes)}");
                    invoiceType = invoiceType.ToLowerInvariant();
                }

                // Validate invoice_status if provided
                if (!string.IsNullOrWhiteSpace(invoiceStatus))
                {
                    var validStatuses = new[] { "draft", "sent", "paid", "overdue", "cancelled" };
                    if (!validStatuses.Contains(invoiceStatus.ToLowerInvariant()))
                        throw new CsvRowException(i + 1,
                            $"Invalid invoice_status '{invoiceStatus}'. Must be one of: {string.Join(", ", validStatuses)}");
                    invoiceStatus = invoiceStatus.ToLowerInvariant();
                }

                await conn.ExecuteAsync("""
                    INSERT INTO income (description, amount, currency, client_name, income_date, invoice_number,
                        invoice_type, invoice_status, payment_due_date, proforma_invoice_date, tax_invoice_date,
                        notes, created_by)
                    VALUES (@Description, @Amount, @Currency, @ClientName, @IncomeDate, @InvoiceNumber,
                        @InvoiceType, @InvoiceStatus, @PaymentDueDate, @ProformaInvoiceDate, @TaxInvoiceDate,
                        @Notes, @CreatedBy::uuid)
                    """,
                    new
                    {
                        Description = description,
                        Amount = amount,
                        Currency = currency,
                        ClientName = clientName,
                        IncomeDate = incomeDate,
                        InvoiceNumber = invoiceNumber,
                        InvoiceType = invoiceType,
                        InvoiceStatus = invoiceStatus,
                        PaymentDueDate = paymentDueDate,
                        ProformaInvoiceDate = proformaInvoiceDate,
                        TaxInvoiceDate = taxInvoiceDate,
                        Notes = notes,
                        CreatedBy = userId,
                    });

                imported++;
            }
            catch (CsvRowException ex)
            {
                failed++;
                errors.Add(new { row = ex.Row, message = ex.Message });
            }
            catch (Exception ex)
            {
                failed++;
                errors.Add(new { row = i + 1, message = ex.Message });
            }
        }

        return Ok(new
        {
            success = true,
            data = new { imported, failed, errors },
        });
    }

    // =========================================================================
    // POST /api/csv-import/clients
    // =========================================================================
    [HttpPost("clients")]
    public async Task<IActionResult> ImportClients(IFormFile file)
    {
        var userId = HttpContext.GetUserId()
            ?? throw new AppException("Unauthorized", 401, "UNAUTHORIZED");

        ValidateFile(file);

        var rows = await ParseCsvFile(file);
        var headers = NormalizeHeaders(rows[0]);

        var imported = 0;
        var failed = 0;
        var errors = new List<object>();

        await using var conn = _db.CreateConnection();
        await conn.OpenAsync();

        for (var i = 1; i < rows.Count; i++)
        {
            try
            {
                var fields = rows[i];
                var record = MapRow(headers, fields);

                var name = GetRequired(record, "name", i);
                var companyName = GetOptional(record, "company_name");
                var email = GetOptional(record, "email");
                var phone = GetOptional(record, "phone");
                var address = GetOptional(record, "address");
                var city = GetOptional(record, "city");
                var country = GetOptional(record, "country");
                var website = GetOptional(record, "website");
                var notes = GetOptional(record, "notes");
                var tagsStr = GetOptional(record, "tags");

                string[]? tags = null;
                if (!string.IsNullOrWhiteSpace(tagsStr))
                {
                    tags = tagsStr.Split(';', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries);
                }

                await conn.ExecuteAsync("""
                    INSERT INTO clients (name, company_name, email, phone, address, city, country, website, notes, tags, created_by)
                    VALUES (@Name, @CompanyName, @Email, @Phone, @Address, @City, @Country, @Website, @Notes, @Tags, @CreatedBy::uuid)
                    """,
                    new
                    {
                        Name = name,
                        CompanyName = companyName,
                        Email = email,
                        Phone = phone,
                        Address = address,
                        City = city,
                        Country = country,
                        Website = website,
                        Notes = notes,
                        Tags = tags,
                        CreatedBy = userId,
                    });

                imported++;
            }
            catch (CsvRowException ex)
            {
                failed++;
                errors.Add(new { row = ex.Row, message = ex.Message });
            }
            catch (Exception ex)
            {
                failed++;
                errors.Add(new { row = i + 1, message = ex.Message });
            }
        }

        return Ok(new
        {
            success = true,
            data = new { imported, failed, errors },
        });
    }

    // =========================================================================
    // POST /api/csv-import/leads
    // =========================================================================
    [HttpPost("leads")]
    public async Task<IActionResult> ImportLeads(IFormFile file)
    {
        var userId = HttpContext.GetUserId()
            ?? throw new AppException("Unauthorized", 401, "UNAUTHORIZED");

        ValidateFile(file);

        var rows = await ParseCsvFile(file);
        var headers = NormalizeHeaders(rows[0]);

        var imported = 0;
        var failed = 0;
        var errors = new List<object>();

        await using var conn = _db.CreateConnection();
        await conn.OpenAsync();

        for (var i = 1; i < rows.Count; i++)
        {
            try
            {
                var fields = rows[i];
                var record = MapRow(headers, fields);

                var title = GetRequired(record, "title", i);
                var description = GetOptional(record, "description");
                var contactName = GetOptional(record, "contact_name");
                var contactEmail = GetOptional(record, "contact_email");
                var companyName = GetOptional(record, "company_name");
                var source = GetOptional(record, "source");
                var currency = GetOptional(record, "currency") ?? "USD";
                var status = GetOptional(record, "status") ?? "new";
                var notes = GetOptional(record, "notes");

                decimal? estimatedValue = null;
                var estimatedValueStr = GetOptional(record, "estimated_value");
                if (!string.IsNullOrWhiteSpace(estimatedValueStr))
                    estimatedValue = ParseDecimal(estimatedValueStr, i, "estimated_value");

                int? probability = null;
                var probabilityStr = GetOptional(record, "probability");
                if (!string.IsNullOrWhiteSpace(probabilityStr))
                {
                    if (!int.TryParse(probabilityStr, out var prob) || prob < 0 || prob > 100)
                        throw new CsvRowException(i + 1, "probability must be an integer between 0 and 100");
                    probability = prob;
                }

                DateTime? expectedCloseDate = null;
                var expectedCloseDateStr = GetOptional(record, "expected_close_date");
                if (!string.IsNullOrWhiteSpace(expectedCloseDateStr))
                    expectedCloseDate = ParseDate(expectedCloseDateStr, i, "expected_close_date");

                // Validate status
                var validStatuses = new[]
                {
                    "new", "contacted", "qualified", "proposal_sent",
                    "negotiation", "won", "lost", "on_hold",
                };
                if (!validStatuses.Contains(status.ToLowerInvariant()))
                    throw new CsvRowException(i + 1,
                        $"Invalid status '{status}'. Must be one of: {string.Join(", ", validStatuses)}");
                status = status.ToLowerInvariant();

                await conn.ExecuteAsync("""
                    INSERT INTO leads (title, description, contact_name, contact_email, company_name,
                        source, estimated_value, currency, probability, status, expected_close_date,
                        notes, assigned_to, created_by)
                    VALUES (@Title, @Description, @ContactName, @ContactEmail, @CompanyName,
                        @Source, @EstimatedValue, @Currency, @Probability, @Status, @ExpectedCloseDate,
                        @Notes, @AssignedTo::uuid, @CreatedBy::uuid)
                    """,
                    new
                    {
                        Title = title,
                        Description = description,
                        ContactName = contactName,
                        ContactEmail = contactEmail,
                        CompanyName = companyName,
                        Source = source,
                        EstimatedValue = estimatedValue,
                        Currency = currency,
                        Probability = probability,
                        Status = status,
                        ExpectedCloseDate = expectedCloseDate,
                        Notes = notes,
                        AssignedTo = userId,
                        CreatedBy = userId,
                    });

                imported++;
            }
            catch (CsvRowException ex)
            {
                failed++;
                errors.Add(new { row = ex.Row, message = ex.Message });
            }
            catch (Exception ex)
            {
                failed++;
                errors.Add(new { row = i + 1, message = ex.Message });
            }
        }

        return Ok(new
        {
            success = true,
            data = new { imported, failed, errors },
        });
    }

    // =========================================================================
    // GET /api/csv-import/templates/{type}
    // =========================================================================
    [HttpGet("templates/{type}")]
    public IActionResult DownloadTemplate(string type)
    {
        var headers = type.ToLowerInvariant() switch
        {
            "expenses" => "description,amount,currency,category,expense_date,vendor,payment_method,notes",
            "income" => "description,amount,currency,client_name,income_date,invoice_number,invoice_type,invoice_status,payment_due_date,proforma_invoice_date,tax_invoice_date,notes",
            "clients" => "name,company_name,email,phone,address,city,country,website,notes,tags",
            "leads" => "title,description,contact_name,contact_email,company_name,source,estimated_value,currency,probability,status,expected_close_date,notes",
            _ => throw new AppException($"Unknown template type '{type}'. Valid types: expenses, income, clients, leads", 400, "VALIDATION_ERROR"),
        };

        var bytes = Encoding.UTF8.GetBytes(headers + "\n");
        return File(bytes, "text/csv", $"{type}_template.csv");
    }

    // =========================================================================
    // CSV Parsing Helpers
    // =========================================================================

    private static void ValidateFile(IFormFile? file)
    {
        if (file == null || file.Length == 0)
            throw new AppException("No file uploaded or file is empty", 400, "VALIDATION_ERROR");

        if (file.Length > 10 * 1024 * 1024) // 10 MB limit
            throw new AppException("File size exceeds 10 MB limit", 400, "VALIDATION_ERROR");

        var extension = Path.GetExtension(file.FileName)?.ToLowerInvariant();
        if (extension != ".csv")
            throw new AppException("Only CSV files are accepted", 400, "VALIDATION_ERROR");
    }

    private static async Task<List<string[]>> ParseCsvFile(IFormFile file)
    {
        var rows = new List<string[]>();

        using var reader = new StreamReader(file.OpenReadStream(), Encoding.UTF8);
        while (await reader.ReadLineAsync() is { } line)
        {
            if (string.IsNullOrWhiteSpace(line))
                continue;

            rows.Add(ParseCsvLine(line));
        }

        if (rows.Count < 2)
            throw new AppException("CSV file must contain a header row and at least one data row", 400, "VALIDATION_ERROR");

        return rows;
    }

    /// <summary>
    /// Parses a single CSV line with basic quoted field support.
    /// Handles fields wrapped in double quotes containing commas, and escaped quotes ("").
    /// </summary>
    private static string[] ParseCsvLine(string line)
    {
        var fields = new List<string>();
        var current = new StringBuilder();
        var inQuotes = false;

        for (var idx = 0; idx < line.Length; idx++)
        {
            var ch = line[idx];

            if (inQuotes)
            {
                if (ch == '"')
                {
                    // Check for escaped quote ""
                    if (idx + 1 < line.Length && line[idx + 1] == '"')
                    {
                        current.Append('"');
                        idx++; // skip the next quote
                    }
                    else
                    {
                        inQuotes = false;
                    }
                }
                else
                {
                    current.Append(ch);
                }
            }
            else
            {
                if (ch == '"')
                {
                    inQuotes = true;
                }
                else if (ch == ',')
                {
                    fields.Add(current.ToString().Trim());
                    current.Clear();
                }
                else
                {
                    current.Append(ch);
                }
            }
        }

        fields.Add(current.ToString().Trim());
        return fields.ToArray();
    }

    /// <summary>
    /// Normalizes header names to lowercase with underscores for consistent lookup.
    /// e.g. "Expense Date" -> "expense_date", "expenseDate" -> "expense_date"
    /// </summary>
    private static string[] NormalizeHeaders(string[] headers)
    {
        return headers.Select(h =>
        {
            // Remove BOM if present
            h = h.TrimStart('\uFEFF');

            // Trim and lowercase
            h = h.Trim().ToLowerInvariant();

            // Replace spaces and dashes with underscores
            h = h.Replace(' ', '_').Replace('-', '_');

            // Convert camelCase to snake_case
            var sb = new StringBuilder();
            for (var i = 0; i < h.Length; i++)
            {
                if (i > 0 && char.IsUpper(h[i]) && !char.IsUpper(h[i - 1]))
                {
                    sb.Append('_');
                }
                sb.Append(char.ToLowerInvariant(h[i]));
            }

            return sb.ToString();
        }).ToArray();
    }

    private static Dictionary<string, string> MapRow(string[] headers, string[] fields)
    {
        var dict = new Dictionary<string, string>(StringComparer.OrdinalIgnoreCase);
        for (var i = 0; i < headers.Length && i < fields.Length; i++)
        {
            dict[headers[i]] = fields[i];
        }
        return dict;
    }

    private static string GetRequired(Dictionary<string, string> record, string key, int rowIndex)
    {
        if (record.TryGetValue(key, out var value) && !string.IsNullOrWhiteSpace(value))
            return value.Trim();

        throw new CsvRowException(rowIndex + 1, $"Missing required field '{key}'");
    }

    private static string? GetOptional(Dictionary<string, string> record, string key)
    {
        if (record.TryGetValue(key, out var value) && !string.IsNullOrWhiteSpace(value))
            return value.Trim();

        return null;
    }

    private static DateTime ParseDate(string value, int rowIndex, string fieldName)
    {
        if (DateTime.TryParseExact(value.Trim(), DateFormats, CultureInfo.InvariantCulture,
                DateTimeStyles.None, out var date))
            return date;

        throw new CsvRowException(rowIndex + 1,
            $"Invalid date format for '{fieldName}': '{value}'. Expected formats: yyyy-MM-dd, MM/dd/yyyy, dd/MM/yyyy");
    }

    private static decimal ParseDecimal(string value, int rowIndex, string fieldName)
    {
        // Remove currency symbols and whitespace
        var cleaned = value.Trim().TrimStart('$', '€', '£', '¥').Trim();

        if (decimal.TryParse(cleaned, NumberStyles.Number | NumberStyles.AllowDecimalPoint,
                CultureInfo.InvariantCulture, out var result))
            return result;

        throw new CsvRowException(rowIndex + 1,
            $"Invalid number for '{fieldName}': '{value}'");
    }

    // =========================================================================
    // Custom exception for CSV row errors
    // =========================================================================
    private class CsvRowException : Exception
    {
        public int Row { get; }

        public CsvRowException(int row, string message) : base(message)
        {
            Row = row;
        }
    }
}
