using System.Globalization;
using System.Text;
using Dapper;
using FinanceManagement.Api.Database;
using FinanceManagement.Api.Middleware;

namespace FinanceManagement.Api.Services.CsvImport;

// =============================================
// Result DTOs
// =============================================

public class CsvImportResult
{
    public int Imported { get; set; }
    public int Failed { get; set; }
    public List<CsvRowError> Errors { get; set; } = [];
}

public class CsvRowError
{
    public int Row { get; set; }
    public string Message { get; set; } = string.Empty;
}

// =============================================
// Service
// =============================================

public class CsvImportService
{
    private readonly DbContext _db;
    private readonly ILogger<CsvImportService> _logger;

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

    private static readonly string[] ValidInvoiceTypes =
        ["standard", "proforma", "tax", "credit_note", "receipt"];

    private static readonly string[] ValidInvoiceStatuses =
        ["draft", "sent", "paid", "overdue", "cancelled"];

    private static readonly string[] ValidPaymentMethods =
        ["cash", "check", "credit_card", "bank_transfer", "other"];

    public CsvImportService(DbContext db, ILogger<CsvImportService> logger)
    {
        _db = db;
        _logger = logger;
    }

    // =========================================================================
    // Template Generation
    // =========================================================================

    public string GenerateIncomeTemplate()
    {
        var sb = new StringBuilder();

        // Row 1: Headers
        sb.AppendLine("description,amount,currency,income_date,category,client_name,invoice_number,invoice_type,invoice_status,payment_due_date,payment_received_date,payment_method,vat_applicable,vat_percentage,billable_hours_regular,billable_hours_150,billable_hours_200,hourly_rate_regular,hourly_rate_150,hourly_rate_200,notes,tags");

        // Row 2: Example data
        sb.AppendLine("\"Web Development Project\",5000.00,USD,2025-01-15,Freelance,Acme Corp,INV-001,standard,paid,2025-02-15,2025-02-10,bank_transfer,true,17,8,,,,,,\"Payment for website redesign\",\"web,design,client-a\"");

        // Row 3: Column descriptions
        sb.AppendLine("\"Required: text description\",\"Required: numeric amount\",\"Optional: 3-letter code (default USD)\",\"Required: date YYYY-MM-DD\",\"Optional: category name\",\"Optional: client name\",\"Optional: invoice reference\",\"Optional: standard/proforma/tax/credit_note/receipt\",\"Optional: draft/sent/paid/overdue/cancelled\",\"Optional: date YYYY-MM-DD\",\"Optional: date YYYY-MM-DD\",\"Optional: cash/check/credit_card/bank_transfer/other\",\"Optional: true/false\",\"Optional: VAT %\",\"Optional: regular hours\",\"Optional: hours x1.5\",\"Optional: hours x2\",\"Optional: regular rate\",\"Optional: rate x1.5\",\"Optional: rate x2\",\"Optional: free text notes\",\"Optional: comma-separated tags\"");

        return sb.ToString();
    }

    public string GenerateExpensesTemplate()
    {
        var sb = new StringBuilder();

        // Row 1: Headers
        sb.AppendLine("description,amount,currency,expense_date,category,vendor,payment_method,receipt_number,is_recurring,notes,tags");

        // Row 2: Example data
        sb.AppendLine("\"Office Supplies\",150.00,USD,2025-01-20,Office,Staples,credit_card,REC-001,false,\"Pens and notebooks\",\"office,supplies\"");

        // Row 3: Column descriptions
        sb.AppendLine("\"Required: text description\",\"Required: numeric amount\",\"Optional: 3-letter code (default USD)\",\"Required: date YYYY-MM-DD\",\"Optional: category name\",\"Optional: vendor name\",\"Optional: cash/check/credit_card/bank_transfer/other\",\"Optional: receipt reference\",\"Optional: true/false (default false)\",\"Optional: free text notes\",\"Optional: comma-separated tags\"");

        return sb.ToString();
    }

    // =========================================================================
    // Income Import
    // =========================================================================

    public async Task<CsvImportResult> ImportIncomeAsync(Stream fileStream, string fileName, long fileSize, string userId)
    {
        ValidateFile(fileName, fileSize);

        var rows = await ParseCsvStream(fileStream);
        var headers = NormalizeHeaders(rows[0]);

        var result = new CsvImportResult();

        await using var conn = _db.CreateConnection();
        await conn.OpenAsync();

        for (var i = 1; i < rows.Count; i++)
        {
            // Skip row 2 (index 1) if it looks like the description/notes row from the template
            if (i == 1 && rows[i].Length > 0 && rows[i][0].StartsWith("Required:", StringComparison.OrdinalIgnoreCase))
                continue;

            try
            {
                var record = MapRow(headers, rows[i]);

                var description = GetRequired(record, "description", i);
                var amount = ParseDecimal(GetRequired(record, "amount", i), i, "amount");
                var currency = GetOptional(record, "currency") ?? "USD";
                var incomeDate = ParseDate(GetRequired(record, "income_date", i), i, "income_date");
                var clientName = GetOptional(record, "client_name");
                var invoiceNumber = GetOptional(record, "invoice_number");
                var invoiceType = ValidateEnum(GetOptional(record, "invoice_type"), ValidInvoiceTypes, "invoice_type", i);
                var invoiceStatus = ValidateEnum(GetOptional(record, "invoice_status"), ValidInvoiceStatuses, "invoice_status", i);
                var notes = GetOptional(record, "notes");
                var paymentMethod = ValidateEnum(GetOptional(record, "payment_method"), ValidPaymentMethods, "payment_method", i);

                DateTime? paymentDueDate = null;
                var paymentDueDateStr = GetOptional(record, "payment_due_date");
                if (!string.IsNullOrWhiteSpace(paymentDueDateStr))
                    paymentDueDate = ParseDate(paymentDueDateStr, i, "payment_due_date");

                DateTime? paymentReceivedDate = null;
                var paymentReceivedDateStr = GetOptional(record, "payment_received_date");
                if (!string.IsNullOrWhiteSpace(paymentReceivedDateStr))
                    paymentReceivedDate = ParseDate(paymentReceivedDateStr, i, "payment_received_date");

                // VAT
                bool vatApplicable = false;
                var vatApplicableStr = GetOptional(record, "vat_applicable");
                if (!string.IsNullOrWhiteSpace(vatApplicableStr))
                    bool.TryParse(vatApplicableStr, out vatApplicable);

                decimal? vatPercentage = null;
                var vatPercentageStr = GetOptional(record, "vat_percentage");
                if (!string.IsNullOrWhiteSpace(vatPercentageStr))
                    vatPercentage = ParseDecimal(vatPercentageStr, i, "vat_percentage");

                // Billable hours
                decimal? billableHoursRegular = null;
                var bhrStr = GetOptional(record, "billable_hours_regular");
                if (!string.IsNullOrWhiteSpace(bhrStr)) billableHoursRegular = ParseDecimal(bhrStr, i, "billable_hours_regular");

                decimal? billableHours150 = null;
                var bh150Str = GetOptional(record, "billable_hours_150");
                if (!string.IsNullOrWhiteSpace(bh150Str)) billableHours150 = ParseDecimal(bh150Str, i, "billable_hours_150");

                decimal? billableHours200 = null;
                var bh200Str = GetOptional(record, "billable_hours_200");
                if (!string.IsNullOrWhiteSpace(bh200Str)) billableHours200 = ParseDecimal(bh200Str, i, "billable_hours_200");

                decimal? hourlyRateRegular = null;
                var hrrStr = GetOptional(record, "hourly_rate_regular");
                if (!string.IsNullOrWhiteSpace(hrrStr)) hourlyRateRegular = ParseDecimal(hrrStr, i, "hourly_rate_regular");

                decimal? hourlyRate150 = null;
                var hr150Str = GetOptional(record, "hourly_rate_150");
                if (!string.IsNullOrWhiteSpace(hr150Str)) hourlyRate150 = ParseDecimal(hr150Str, i, "hourly_rate_150");

                decimal? hourlyRate200 = null;
                var hr200Str = GetOptional(record, "hourly_rate_200");
                if (!string.IsNullOrWhiteSpace(hr200Str)) hourlyRate200 = ParseDecimal(hr200Str, i, "hourly_rate_200");

                // Parse tags (comma-separated within the field)
                string[]? tags = null;
                var tagsStr = GetOptional(record, "tags");
                if (!string.IsNullOrWhiteSpace(tagsStr))
                    tags = tagsStr.Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries);

                await conn.ExecuteAsync("""
                    INSERT INTO income (
                        description, amount, currency, income_date, client_name,
                        invoice_number, invoice_type, invoice_status,
                        payment_due_date, payment_received_date,
                        payment_method, vat_applicable, vat_percentage,
                        billable_hours_regular, billable_hours_150, billable_hours_200,
                        hourly_rate_regular, hourly_rate_150, hourly_rate_200,
                        notes, tags, created_by
                    )
                    VALUES (
                        @Description, @Amount, @Currency, @IncomeDate, @ClientName,
                        @InvoiceNumber, @InvoiceType, @InvoiceStatus,
                        @PaymentDueDate, @PaymentReceivedDate,
                        @PaymentMethod, @VatApplicable, @VatPercentage,
                        @BillableHoursRegular, @BillableHours150, @BillableHours200,
                        @HourlyRateRegular, @HourlyRate150, @HourlyRate200,
                        @Notes, @Tags, @CreatedBy::uuid
                    )
                    """,
                    new
                    {
                        Description = description,
                        Amount = amount,
                        Currency = currency,
                        IncomeDate = incomeDate,
                        ClientName = clientName,
                        InvoiceNumber = invoiceNumber,
                        InvoiceType = invoiceType,
                        InvoiceStatus = invoiceStatus,
                        PaymentDueDate = paymentDueDate,
                        PaymentReceivedDate = paymentReceivedDate,
                        PaymentMethod = paymentMethod,
                        VatApplicable = vatApplicable,
                        VatPercentage = vatPercentage,
                        BillableHoursRegular = billableHoursRegular,
                        BillableHours150 = billableHours150,
                        BillableHours200 = billableHours200,
                        HourlyRateRegular = hourlyRateRegular,
                        HourlyRate150 = hourlyRate150,
                        HourlyRate200 = hourlyRate200,
                        Notes = notes,
                        Tags = tags ?? Array.Empty<string>(),
                        CreatedBy = userId,
                    });

                result.Imported++;
            }
            catch (CsvRowException ex)
            {
                result.Failed++;
                result.Errors.Add(new CsvRowError { Row = ex.Row, Message = ex.Message });
            }
            catch (Exception ex)
            {
                result.Failed++;
                result.Errors.Add(new CsvRowError { Row = i + 1, Message = ex.Message });
            }
        }

        _logger.LogInformation(
            "Income CSV import completed: {Imported} imported, {Failed} failed, by user {UserId}",
            result.Imported, result.Failed, userId);

        return result;
    }

    // =========================================================================
    // Expenses Import
    // =========================================================================

    public async Task<CsvImportResult> ImportExpensesAsync(Stream fileStream, string fileName, long fileSize, string userId)
    {
        ValidateFile(fileName, fileSize);

        var rows = await ParseCsvStream(fileStream);
        var headers = NormalizeHeaders(rows[0]);

        var result = new CsvImportResult();

        await using var conn = _db.CreateConnection();
        await conn.OpenAsync();

        for (var i = 1; i < rows.Count; i++)
        {
            // Skip row 2 (index 1) if it looks like the description/notes row from the template
            if (i == 1 && rows[i].Length > 0 && rows[i][0].StartsWith("Required:", StringComparison.OrdinalIgnoreCase))
                continue;

            try
            {
                var record = MapRow(headers, rows[i]);

                var description = GetRequired(record, "description", i);
                var amount = ParseDecimal(GetRequired(record, "amount", i), i, "amount");
                var currency = GetOptional(record, "currency") ?? "USD";
                var expenseDate = ParseDate(GetRequired(record, "expense_date", i), i, "expense_date");
                var vendor = GetOptional(record, "vendor");
                var paymentMethod = ValidateEnum(GetOptional(record, "payment_method"), ValidPaymentMethods, "payment_method", i);
                var receiptNumber = GetOptional(record, "receipt_number");
                var notes = GetOptional(record, "notes");

                bool isRecurring = false;
                var isRecurringStr = GetOptional(record, "is_recurring");
                if (!string.IsNullOrWhiteSpace(isRecurringStr))
                {
                    if (!bool.TryParse(isRecurringStr, out isRecurring))
                        throw new CsvRowException(i + 1, $"Invalid value for 'is_recurring': '{isRecurringStr}'. Must be true or false");
                }

                // Parse tags (comma-separated within the field)
                string[]? tags = null;
                var tagsStr = GetOptional(record, "tags");
                if (!string.IsNullOrWhiteSpace(tagsStr))
                    tags = tagsStr.Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries);

                await conn.ExecuteAsync("""
                    INSERT INTO expenses (
                        description, amount, currency, expense_date, vendor,
                        payment_method, receipt_number, is_recurring,
                        notes, tags, created_by
                    )
                    VALUES (
                        @Description, @Amount, @Currency, @ExpenseDate, @Vendor,
                        @PaymentMethod, @ReceiptNumber, @IsRecurring,
                        @Notes, @Tags, @CreatedBy::uuid
                    )
                    """,
                    new
                    {
                        Description = description,
                        Amount = amount,
                        Currency = currency,
                        ExpenseDate = expenseDate,
                        Vendor = vendor,
                        PaymentMethod = paymentMethod,
                        ReceiptNumber = receiptNumber,
                        IsRecurring = isRecurring,
                        Notes = notes,
                        Tags = tags ?? Array.Empty<string>(),
                        CreatedBy = userId,
                    });

                result.Imported++;
            }
            catch (CsvRowException ex)
            {
                result.Failed++;
                result.Errors.Add(new CsvRowError { Row = ex.Row, Message = ex.Message });
            }
            catch (Exception ex)
            {
                result.Failed++;
                result.Errors.Add(new CsvRowError { Row = i + 1, Message = ex.Message });
            }
        }

        _logger.LogInformation(
            "Expenses CSV import completed: {Imported} imported, {Failed} failed, by user {UserId}",
            result.Imported, result.Failed, userId);

        return result;
    }

    // =========================================================================
    // CSV Parsing Helpers
    // =========================================================================

    private static void ValidateFile(string fileName, long fileSize)
    {
        if (fileSize == 0)
            throw new AppException("No file uploaded or file is empty", 400, "VALIDATION_ERROR");

        if (fileSize > 10 * 1024 * 1024)
            throw new AppException("File size exceeds 10 MB limit", 400, "VALIDATION_ERROR");

        var extension = Path.GetExtension(fileName)?.ToLowerInvariant();
        if (extension != ".csv")
            throw new AppException("Only CSV files are accepted", 400, "VALIDATION_ERROR");
    }

    private static async Task<List<string[]>> ParseCsvStream(Stream stream)
    {
        var rows = new List<string[]>();

        using var reader = new StreamReader(stream, Encoding.UTF8);
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
    /// Parses a single CSV line with quoted field support.
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

    /// <summary>
    /// Normalizes header names to lowercase with underscores for consistent lookup.
    /// </summary>
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

    private static string? ValidateEnum(string? value, string[] validValues, string fieldName, int rowIndex)
    {
        if (string.IsNullOrWhiteSpace(value))
            return null;

        var normalized = value.Trim().ToLowerInvariant();
        if (!validValues.Contains(normalized))
            throw new CsvRowException(rowIndex + 1,
                $"Invalid {fieldName} '{value}'. Must be one of: {string.Join(", ", validValues)}");

        return normalized;
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
