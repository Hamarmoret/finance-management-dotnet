using System.Text;
using System.Text.Json;
using System.Text.Json.Serialization;
using FinanceManagement.Api.Config;
using FinanceManagement.Api.Models.Reports;

namespace FinanceManagement.Api.Services.Reports;

/// <summary>
/// Calls Claude's Messages API to generate an executive summary, key findings,
/// and recommendations for a report. Always returns an AiSummary — on any
/// failure (missing key, network error, parse error, rate limit), returns a
/// fallback summary so the PDF still renders.
/// </summary>
public class AiSummaryService
{
    private const int MaxInputBytes = 30_000;
    private const int MaxOutputTokens = 1500;

    private readonly IHttpClientFactory _httpFactory;
    private readonly AppSettings _settings;
    private readonly ILogger<AiSummaryService> _logger;

    public AiSummaryService(
        IHttpClientFactory httpFactory,
        AppSettings settings,
        ILogger<AiSummaryService> logger)
    {
        _httpFactory = httpFactory;
        _settings = settings;
        _logger = logger;
    }

    public async Task<AiSummary> SummarizeAsync(ReportData data, string? userPrompt, CancellationToken ct = default)
    {
        if (!_settings.Anthropic.IsConfigured)
        {
            _logger.LogInformation("ANTHROPIC_API_KEY not configured — using fallback summary");
            return Fallback("AI summary unavailable — Claude API key not configured.");
        }

        try
        {
            var compactData = CompactReportData(data);
            var systemPrompt = BuildSystemPrompt(userPrompt);
            var userMessage = BuildUserMessage(compactData, userPrompt);

            var payload = new AnthropicRequest
            {
                Model = _settings.Anthropic.Model,
                MaxTokens = MaxOutputTokens,
                System = systemPrompt,
                Messages =
                [
                    new AnthropicMessage { Role = "user", Content = userMessage },
                ],
            };

            var json = JsonSerializer.Serialize(payload, SerializerOptions);
            using var httpClient = _httpFactory.CreateClient("anthropic");
            using var req = new HttpRequestMessage(HttpMethod.Post, "v1/messages")
            {
                Content = new StringContent(json, Encoding.UTF8, "application/json"),
            };

            using var response = await httpClient.SendAsync(req, ct);
            var body = await response.Content.ReadAsStringAsync(ct);

            if (!response.IsSuccessStatusCode)
            {
                _logger.LogWarning(
                    "Claude API returned {Status}: {Body}",
                    (int)response.StatusCode, Truncate(body, 500));
                return Fallback($"AI summary unavailable (Claude API returned {(int)response.StatusCode}).");
            }

            var parsed = JsonSerializer.Deserialize<AnthropicResponse>(body, SerializerOptions);
            var textBlock = parsed?.Content?.FirstOrDefault(c => c.Type == "text")?.Text;
            if (string.IsNullOrWhiteSpace(textBlock))
            {
                _logger.LogWarning("Claude API response contained no text block: {Body}", Truncate(body, 500));
                return Fallback("AI summary unavailable (empty response).");
            }

            var summary = ParseSummary(textBlock);
            if (summary is null)
            {
                _logger.LogWarning("Failed to parse JSON summary from Claude response: {Text}", Truncate(textBlock, 500));
                return Fallback("AI summary unavailable (could not parse response).");
            }

            return summary;
        }
        catch (TaskCanceledException)
        {
            _logger.LogWarning("Claude API call timed out");
            return Fallback("AI summary unavailable (request timed out).");
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Unexpected error calling Claude API for report summary");
            return Fallback("AI summary unavailable (unexpected error).");
        }
    }

    // ─────────────────────────────────────────────────────────────────────
    // Prompt construction
    // ─────────────────────────────────────────────────────────────────────

    private static string BuildSystemPrompt(string? userPrompt)
    {
        var baseSystem =
            "You are a senior financial analyst preparing an executive report. " +
            "Analyze the attached business data and return a JSON object with these exact keys: " +
            "\"executiveSummary\" (string, 2-4 sentences summarizing the period), " +
            "\"keyFindings\" (array of 3-5 short specific strings citing actual numbers from the data), " +
            "\"recommendations\" (array of 3-5 actionable strings). " +
            "Be specific — always cite real figures from the data, never invent numbers. " +
            "Keep the total under 500 words. " +
            "Return ONLY valid JSON, no markdown, no code fences, no preamble.";

        if (!string.IsNullOrWhiteSpace(userPrompt))
        {
            baseSystem +=
                " The user has asked a specific question about this data — focus your analysis on " +
                "answering it, and shape the executive summary, findings, and recommendations around it.";
        }

        return baseSystem;
    }

    private static string BuildUserMessage(string compactData, string? userPrompt)
    {
        var sb = new StringBuilder();
        if (!string.IsNullOrWhiteSpace(userPrompt))
        {
            sb.Append("User question: ");
            sb.AppendLine(userPrompt.Trim());
            sb.AppendLine();
        }
        sb.AppendLine("Report data (JSON):");
        sb.Append(compactData);
        return sb.ToString();
    }

    /// <summary>
    /// Serializes ReportData to JSON, trimming long row lists to keep the
    /// payload under Claude's practical context budget.
    /// </summary>
    private static string CompactReportData(ReportData data)
    {
        var compact = new
        {
            period = new
            {
                startDate = data.Period.StartDate.ToString("yyyy-MM-dd"),
                endDate = data.Period.EndDate.ToString("yyyy-MM-dd"),
            },
            template = data.Template,
            sections = data.Sections,
            kpis = data.Kpis,
            monthly = data.Monthly,
            expenseCategories = data.ExpenseCategories,
            pnlCenters = data.PnlCenters?.Select(c => new
            {
                name = c.Name,
                totalIncome = c.TotalIncome,
                totalExpenses = c.TotalExpenses,
                netProfit = c.NetProfit,
            }),
            contractStats = data.ContractStats,
            topClients = data.TopClients?.Take(10).Select(c => new
            {
                clientName = c.ClientName,
                contractCount = c.ContractCount,
                totalValue = c.TotalValue,
                totalCollected = c.TotalCollected,
                totalOutstanding = c.TotalOutstanding,
                overdueAmount = c.OverdueAmount,
            }),
            overdueMilestones = data.OverdueMilestones?.Take(15).Select(m => new
            {
                clientName = m.ClientName,
                description = m.Description,
                dueDate = m.DueDate,
                amountDue = m.AmountDue,
                currency = m.Currency,
            }),
            overdueMilestonesCount = data.OverdueMilestones?.Count ?? 0,
            projections = data.Projections,
            incomeSummary = data.IncomeRows is null ? null : new
            {
                count = data.IncomeRows.Count,
                totalAmount = data.IncomeRows.Sum(r => r.Amount),
                topRecords = data.IncomeRows.Take(10).Select(r => new
                {
                    date = r.IncomeDate,
                    description = r.Description,
                    client = r.ClientName,
                    amount = r.Amount,
                    currency = r.Currency,
                }),
            },
            expenseSummary = data.ExpenseRows is null ? null : new
            {
                count = data.ExpenseRows.Count,
                totalAmount = data.ExpenseRows.Sum(r => r.Amount),
                topRecords = data.ExpenseRows.Take(10).Select(r => new
                {
                    date = r.ExpenseDate,
                    description = r.Description,
                    vendor = r.Vendor,
                    amount = r.Amount,
                    currency = r.Currency,
                }),
            },
            salesPipeline = data.Leads is null && data.Proposals is null ? null : new
            {
                leadsCount = data.Leads?.Count ?? 0,
                proposalsCount = data.Proposals?.Count ?? 0,
                leadsValue = data.Leads?.Sum(l => l.EstimatedValue ?? 0),
                proposalsValue = data.Proposals?.Sum(p => p.Total),
            },
        };

        var json = JsonSerializer.Serialize(compact, SerializerOptions);

        if (Encoding.UTF8.GetByteCount(json) > MaxInputBytes)
        {
            // Shouldn't hit this often given the trimming above, but log it.
            return json[..Math.Min(json.Length, MaxInputBytes)] + "…[truncated]";
        }

        return json;
    }

    // ─────────────────────────────────────────────────────────────────────
    // Response parsing
    // ─────────────────────────────────────────────────────────────────────

    private static AiSummary? ParseSummary(string rawText)
    {
        // Claude sometimes wraps JSON in a code fence despite instructions. Strip it.
        var cleaned = rawText.Trim();
        if (cleaned.StartsWith("```"))
        {
            var firstNewline = cleaned.IndexOf('\n');
            if (firstNewline > 0) cleaned = cleaned[(firstNewline + 1)..];
            if (cleaned.EndsWith("```")) cleaned = cleaned[..^3];
            cleaned = cleaned.Trim();
        }

        // Find the outermost JSON object if there's any extra text around it.
        var start = cleaned.IndexOf('{');
        var end = cleaned.LastIndexOf('}');
        if (start < 0 || end <= start) return null;
        var jsonOnly = cleaned[start..(end + 1)];

        try
        {
            var parsed = JsonSerializer.Deserialize<AiSummaryPayload>(jsonOnly, SerializerOptions);
            if (parsed is null || string.IsNullOrWhiteSpace(parsed.ExecutiveSummary))
                return null;

            return new AiSummary
            {
                ExecutiveSummary = parsed.ExecutiveSummary,
                KeyFindings = parsed.KeyFindings ?? [],
                Recommendations = parsed.Recommendations ?? [],
                IsFallback = false,
            };
        }
        catch (JsonException)
        {
            return null;
        }
    }

    private static AiSummary Fallback(string message) => new()
    {
        ExecutiveSummary = message,
        KeyFindings = [],
        Recommendations = [],
        IsFallback = true,
    };

    private static string Truncate(string s, int max) =>
        string.IsNullOrEmpty(s) || s.Length <= max ? s : s[..max] + "…";

    // ─────────────────────────────────────────────────────────────────────
    // Wire types
    // ─────────────────────────────────────────────────────────────────────

    private static readonly JsonSerializerOptions SerializerOptions = new()
    {
        PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
        PropertyNameCaseInsensitive = true,
        DefaultIgnoreCondition = JsonIgnoreCondition.WhenWritingNull,
    };

    private class AnthropicRequest
    {
        [JsonPropertyName("model")]
        public string Model { get; set; } = string.Empty;

        [JsonPropertyName("max_tokens")]
        public int MaxTokens { get; set; }

        [JsonPropertyName("system")]
        public string System { get; set; } = string.Empty;

        [JsonPropertyName("messages")]
        public List<AnthropicMessage> Messages { get; set; } = [];
    }

    private class AnthropicMessage
    {
        [JsonPropertyName("role")]
        public string Role { get; set; } = "user";

        [JsonPropertyName("content")]
        public string Content { get; set; } = string.Empty;
    }

    private class AnthropicResponse
    {
        [JsonPropertyName("content")]
        public List<AnthropicContentBlock>? Content { get; set; }
    }

    private class AnthropicContentBlock
    {
        [JsonPropertyName("type")]
        public string? Type { get; set; }

        [JsonPropertyName("text")]
        public string? Text { get; set; }
    }

    private class AiSummaryPayload
    {
        [JsonPropertyName("executiveSummary")]
        public string ExecutiveSummary { get; set; } = string.Empty;

        [JsonPropertyName("keyFindings")]
        public List<string>? KeyFindings { get; set; }

        [JsonPropertyName("recommendations")]
        public List<string>? Recommendations { get; set; }
    }
}
