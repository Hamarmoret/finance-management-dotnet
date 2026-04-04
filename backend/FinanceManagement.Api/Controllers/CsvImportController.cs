using System.Globalization;
using System.Text;
using Dapper;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using FinanceManagement.Api.Database;
using FinanceManagement.Api.Middleware;
using FinanceManagement.Api.Services.CsvImport;

namespace FinanceManagement.Api.Controllers;

[ApiController]
[Route("api/csv-import")]
[Authorize]
public class CsvImportController : ControllerBase
{
    private readonly DbContext _db;
    private readonly CsvImportService _csvImportService;

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

    public CsvImportController(DbContext db, CsvImportService csvImportService)
    {
        _db = db;
        _csvImportService = csvImportService;
    }

    // =========================================================================
    // GET /api/csv-import/templates/income
    // =========================================================================
    [HttpGet("templates/income")]
    public IActionResult DownloadIncomeTemplate()
    {
        var csv = _csvImportService.GenerateIncomeTemplate();
        var bytes = Encoding.UTF8.GetBytes(csv);
        return File(bytes, "text/csv", "income_template.csv");
    }

    // =========================================================================
    // GET /api/csv-import/templates/expenses
    // =========================================================================
    [HttpGet("templates/expenses")]
    public IActionResult DownloadExpensesTemplate()
    {
        var csv = _csvImportService.GenerateExpensesTemplate();
        var bytes = Encoding.UTF8.GetBytes(csv);
        return File(bytes, "text/csv", "expenses_template.csv");
    }

    // =========================================================================
    // POST /api/csv-import/income
    // =========================================================================
    [HttpPost("income")]
    public async Task<IActionResult> ImportIncome(IFormFile file)
    {
        var userId = HttpContext.GetUserId()
            ?? throw new AppException("Unauthorized", 401, "UNAUTHORIZED");

        using var stream = file.OpenReadStream();
        var result = await _csvImportService.ImportIncomeAsync(
            stream, file.FileName, file.Length, userId);

        return Ok(new
        {
            success = true,
            data = new
            {
                imported = result.Imported,
                failed = result.Failed,
                errors = result.Errors.Select(e => new { row = e.Row, message = e.Message }),
            },
        });
    }

    // =========================================================================
    // POST /api/csv-import/expenses
    // =========================================================================
    [HttpPost("expenses")]
    public async Task<IActionResult> ImportExpenses(IFormFile file)
    {
        var userId = HttpContext.GetUserId()
            ?? throw new AppException("Unauthorized", 401, "UNAUTHORIZED");

        using var stream = file.OpenReadStream();
        var result = await _csvImportService.ImportExpensesAsync(
            stream, file.FileName, file.Length, userId);

        return Ok(new
        {
            success = true,
            data = new
            {
                imported = result.Imported,
                failed = result.Failed,
                errors = result.Errors.Select(e => new { row = e.Row, message = e.Message }),
            },
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
                var industry = GetOptional(record, "industry");
                var businessType = GetOptional(record, "business_type");
                var utmSource = GetOptional(record, "utm_source");
                var utmMedium = GetOptional(record, "utm_medium");
                var utmCampaign = GetOptional(record, "utm_campaign");
                var tagsStr = GetOptional(record, "tags");

                string[]? tags = null;
                if (!string.IsNullOrWhiteSpace(tagsStr))
                {
                    tags = tagsStr.Split(';', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries);
                }

                await conn.ExecuteAsync("""
                    INSERT INTO clients (name, company_name, email, phone, address, city, country, website,
                        industry, business_type, utm_source, utm_medium, utm_campaign, notes, tags, created_by)
                    VALUES (@Name, @CompanyName, @Email, @Phone, @Address, @City, @Country, @Website,
                        @Industry, @BusinessType, @UtmSource, @UtmMedium, @UtmCampaign, @Notes, @Tags, @CreatedBy::uuid)
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
                        Industry = industry,
                        BusinessType = businessType,
                        UtmSource = utmSource,
                        UtmMedium = utmMedium,
                        UtmCampaign = utmCampaign,
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

                // Deal terms
                var dealType = GetOptional(record, "deal_type");
                var orderNumber = GetOptional(record, "order_number");
                var clientOrderNumber = GetOptional(record, "client_order_number");
                var ndaUrl = GetOptional(record, "nda_url");

                int? scopeMonths = null;
                var scopeMonthsStr = GetOptional(record, "scope_months");
                if (!string.IsNullOrWhiteSpace(scopeMonthsStr) && int.TryParse(scopeMonthsStr, out var sm)) scopeMonths = sm;

                int? minCommitmentMonths = null;
                var minCommitStr = GetOptional(record, "min_commitment_months");
                if (!string.IsNullOrWhiteSpace(minCommitStr) && int.TryParse(minCommitStr, out var mc)) minCommitmentMonths = mc;

                decimal? complimentaryHours = null;
                var complHoursStr = GetOptional(record, "complimentary_hours");
                if (!string.IsNullOrWhiteSpace(complHoursStr)) complimentaryHours = ParseDecimal(complHoursStr, i, "complimentary_hours");

                DateTime? retainerRenewalDate = null;
                var rrdStr = GetOptional(record, "retainer_renewal_date");
                if (!string.IsNullOrWhiteSpace(rrdStr)) retainerRenewalDate = ParseDate(rrdStr, i, "retainer_renewal_date");

                DateTime? followUpDate = null;
                var fudStr = GetOptional(record, "follow_up_date");
                if (!string.IsNullOrWhiteSpace(fudStr)) followUpDate = ParseDate(fudStr, i, "follow_up_date");

                await conn.ExecuteAsync("""
                    INSERT INTO leads (title, description, contact_name, contact_email, company_name,
                        source, estimated_value, currency, probability, status, expected_close_date,
                        deal_type, order_number, client_order_number, nda_url,
                        scope_months, min_commitment_months, complimentary_hours,
                        retainer_renewal_date, follow_up_date,
                        notes, assigned_to, created_by)
                    VALUES (@Title, @Description, @ContactName, @ContactEmail, @CompanyName,
                        @Source, @EstimatedValue, @Currency, @Probability, @Status, @ExpectedCloseDate,
                        @DealType, @OrderNumber, @ClientOrderNumber, @NdaUrl,
                        @ScopeMonths, @MinCommitmentMonths, @ComplimentaryHours,
                        @RetainerRenewalDate, @FollowUpDate,
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
                        DealType = dealType,
                        OrderNumber = orderNumber,
                        ClientOrderNumber = clientOrderNumber,
                        NdaUrl = ndaUrl,
                        ScopeMonths = scopeMonths,
                        MinCommitmentMonths = minCommitmentMonths,
                        ComplimentaryHours = complimentaryHours,
                        RetainerRenewalDate = retainerRenewalDate,
                        FollowUpDate = followUpDate,
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
    // GET /api/csv-import/templates/{type} (legacy - clients, leads)
    // =========================================================================
    [HttpGet("templates/{type}")]
    public IActionResult DownloadTemplate(string type)
    {
        var headers = type.ToLowerInvariant() switch
        {
            "clients" => "name,company_name,email,phone,address,city,country,website,industry,business_type,utm_source,utm_medium,utm_campaign,notes,tags",
            "leads" => "title,description,contact_name,contact_email,company_name,source,estimated_value,currency,probability,status,expected_close_date,deal_type,order_number,client_order_number,scope_months,min_commitment_months,complimentary_hours,retainer_renewal_date,follow_up_date,nda_url,notes",
            _ => throw new AppException($"Unknown template type '{type}'. Valid types: expenses, income, clients, leads", 400, "VALIDATION_ERROR"),
        };

        var bytes = Encoding.UTF8.GetBytes(headers + "\n");
        return File(bytes, "text/csv", $"{type}_template.csv");
    }

    // =========================================================================
    // CSV Parsing Helpers (retained for clients/leads imports)
    // =========================================================================

    private static void ValidateFile(IFormFile? file)
    {
        if (file == null || file.Length == 0)
            throw new AppException("No file uploaded or file is empty", 400, "VALIDATION_ERROR");

        if (file.Length > 10 * 1024 * 1024)
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
                    if (idx + 1 < line.Length && line[idx + 1] == '"')
                    {
                        current.Append('"');
                        idx++;
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

    private static string[] NormalizeHeaders(string[] headers)
    {
        return headers.Select(h =>
        {
            h = h.TrimStart('\uFEFF');
            h = h.Trim().ToLowerInvariant();
            h = h.Replace(' ', '_').Replace('-', '_');

            var sb = new StringBuilder();
            for (var i = 0; i < h.Length; i++)
            {
                if (i > 0 && char.IsUpper(h[i]) && !char.IsUpper(h[i - 1]))
                    sb.Append('_');
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
        var cleaned = value.Trim().TrimStart('$', '\u20ac', '\u00a3', '\u00a5').Trim();

        if (decimal.TryParse(cleaned, NumberStyles.Number | NumberStyles.AllowDecimalPoint,
                CultureInfo.InvariantCulture, out var result))
            return result;

        throw new CsvRowException(rowIndex + 1,
            $"Invalid number for '{fieldName}': '{value}'");
    }

    private class CsvRowException : Exception
    {
        public int Row { get; }

        public CsvRowException(int row, string message) : base(message)
        {
            Row = row;
        }
    }
}
