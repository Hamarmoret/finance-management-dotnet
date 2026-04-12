using System.Globalization;
using FinanceManagement.Api.Models.Reports;
using MigraDoc.DocumentObjectModel;
using MigraDoc.DocumentObjectModel.Shapes;
using MigraDoc.DocumentObjectModel.Tables;
using MigraDoc.Rendering;
using PdfSharp.Fonts;

namespace FinanceManagement.Api.Services.Reports;

/// <summary>
/// Renders a ReportData payload to a PDF byte array using MigraDoc's
/// document-object-model API. Everything is structured: paragraphs,
/// tables, sections — no manual coordinate drawing. Keeps PDF code
/// isolated from the rest of the codebase.
/// </summary>
public static class ReportPdfBuilder
{
    private static bool _fontResolverRegistered;
    private static readonly object _lock = new();
    // ── Color palette (kept in sync with Tailwind tokens used in the UI) ──
    private static readonly Color Primary  = new(37, 99, 235);    // blue-600
    private static readonly Color Success  = new(22, 163, 74);    // green-600
    private static readonly Color Danger   = new(220, 38, 38);    // red-600
    private static readonly Color Muted    = new(107, 114, 128);  // gray-500
    private static readonly Color Heading  = new(17, 24, 39);     // gray-900
    private static readonly Color Zebra    = new(249, 250, 251);  // gray-50
    private static readonly Color HeaderBg = new(243, 244, 246);  // gray-100
    private static readonly Color Divider  = new(229, 231, 235);  // gray-200
    private static readonly Color SummaryBg = new(239, 246, 255); // blue-50

    public static byte[] Render(ReportData data)
    {
        // PdfSharp 6.x on Linux needs a custom font resolver — there's no
        // GDI+/fontconfig integration. Register once on first call.
        EnsureFontResolver();

        var doc = BuildDocument(data);

        var renderer = new PdfDocumentRenderer { Document = doc };
        renderer.RenderDocument();

        using var ms = new MemoryStream();
        renderer.PdfDocument.Save(ms, false);
        return ms.ToArray();
    }

    /// <summary>
    /// Registers the Linux font resolver exactly once. On Windows (dev) this is
    /// harmless — PdfSharp will still find system fonts via the resolver's fallback.
    /// On Linux (Cloud Run), this is required or PdfSharp throws NullReferenceException.
    /// </summary>
    private static void EnsureFontResolver()
    {
        if (_fontResolverRegistered) return;
        lock (_lock)
        {
            if (_fontResolverRegistered) return;
            if (GlobalFontSettings.FontResolver is null)
            {
                GlobalFontSettings.FontResolver = new LinuxFontResolver();
            }
            _fontResolverRegistered = true;
        }
    }

    private static Document BuildDocument(ReportData data)
    {
        var doc = new Document();
        doc.Info.Title = $"Financial Report — {data.Period.Label}";
        doc.Info.Author = "Finance Management";

        var normal = doc.Styles["Normal"];
        if (normal is not null)
        {
            normal.Font.Name = "Arial";
            normal.Font.Size = 10;
        }

        var section = doc.AddSection();
        section.PageSetup.PageFormat = PageFormat.A4;
        section.PageSetup.TopMargin = Unit.FromCentimeter(2);
        section.PageSetup.BottomMargin = Unit.FromCentimeter(2);
        section.PageSetup.LeftMargin = Unit.FromCentimeter(2);
        section.PageSetup.RightMargin = Unit.FromCentimeter(2);

        AddFooter(section);
        AddCoverPage(section, data);

        if (data.AiSummary is { } ai)
            AddAiSummaryBlock(section, ai);

        var sections = data.Sections;

        if (sections.Contains(ReportSections.Kpis) && data.Kpis is not null)
            AddKpiSection(section, data.Kpis);

        if (sections.Contains(ReportSections.MonthlyBreakdown) && data.Monthly is { Count: > 0 })
            AddMonthlySection(section, data.Monthly);

        if (sections.Contains(ReportSections.ExpenseCategories) && data.ExpenseCategories is { Count: > 0 })
            AddExpenseCategoriesSection(section, data.ExpenseCategories);

        if (sections.Contains(ReportSections.PnlCenters) && data.PnlCenters is { Count: > 0 })
            AddPnlCentersSection(section, data.PnlCenters);

        if (sections.Contains(ReportSections.ContractStats) && data.ContractStats is not null)
            AddContractStatsSection(section, data.ContractStats);

        if (sections.Contains(ReportSections.TopClients) && data.TopClients is { Count: > 0 })
            AddTopClientsSection(section, data.TopClients);

        if (sections.Contains(ReportSections.OverdueMilestones) && data.OverdueMilestones is { Count: > 0 })
            AddOverdueMilestonesSection(section, data.OverdueMilestones);

        if (sections.Contains(ReportSections.Projections) && data.Projections is { Count: > 0 })
            AddProjectionsSection(section, data.Projections);

        if (sections.Contains(ReportSections.IncomeRows) && data.IncomeRows is { Count: > 0 })
            AddIncomeRowsSection(section, data.IncomeRows);

        if (sections.Contains(ReportSections.ExpenseRows) && data.ExpenseRows is { Count: > 0 })
            AddExpenseRowsSection(section, data.ExpenseRows);

        if (sections.Contains(ReportSections.SalesPipeline) &&
            ((data.Leads?.Count ?? 0) > 0 || (data.Proposals?.Count ?? 0) > 0))
            AddSalesPipelineSection(section, data);

        if (data.AiSummary is { Recommendations.Count: > 0 } rec)
            AddRecommendationsPage(section, rec.Recommendations);

        return doc;
    }

    // ─────────────────────────────────────────────────────────────────────
    // Cover & chrome
    // ─────────────────────────────────────────────────────────────────────

    private static void AddCoverPage(Section section, ReportData data)
    {
        section.AddParagraph().Format.SpaceBefore = Unit.FromCentimeter(6);

        var title = section.AddParagraph("Financial Report");
        title.Format.Font.Size = 28;
        title.Format.Font.Bold = true;
        title.Format.Font.Color = Heading;
        title.Format.Alignment = ParagraphAlignment.Center;

        var subtitle = section.AddParagraph(TemplateLabel(data.Template));
        subtitle.Format.Font.Size = 14;
        subtitle.Format.Font.Color = Primary;
        subtitle.Format.Alignment = ParagraphAlignment.Center;
        subtitle.Format.SpaceBefore = Unit.FromCentimeter(0.5);

        var period = section.AddParagraph($"Period: {data.Period.Label}");
        period.Format.Font.Size = 11;
        period.Format.Font.Color = Muted;
        period.Format.Alignment = ParagraphAlignment.Center;
        period.Format.SpaceBefore = Unit.FromCentimeter(2);

        var generated = section.AddParagraph(
            $"Generated {data.Period.GeneratedAt.ToUniversalTime():yyyy-MM-dd HH:mm} UTC");
        generated.Format.Font.Size = 10;
        generated.Format.Font.Color = Muted;
        generated.Format.Alignment = ParagraphAlignment.Center;

        section.AddPageBreak();
    }

    private static void AddFooter(Section section)
    {
        var footer = section.Footers.Primary.AddParagraph();
        footer.Format.Font.Size = 8;
        footer.Format.Font.Color = Muted;
        footer.Format.Alignment = ParagraphAlignment.Center;
        footer.AddText("Finance Management   •   Page ");
        footer.AddPageField();
        footer.AddText(" of ");
        footer.AddNumPagesField();
    }

    // ─────────────────────────────────────────────────────────────────────
    // AI summary + recommendations
    // ─────────────────────────────────────────────────────────────────────

    private static void AddAiSummaryBlock(Section section, AiSummary ai)
    {
        AddSectionHeading(section, "Executive Summary");

        if (ai.IsFallback)
        {
            var note = section.AddParagraph(ai.ExecutiveSummary);
            note.Format.Font.Italic = true;
            note.Format.Font.Color = Muted;
            note.Format.SpaceAfter = Unit.FromCentimeter(0.4);
            return;
        }

        var summary = section.AddParagraph(ai.ExecutiveSummary);
        summary.Format.Font.Size = 11;
        summary.Format.SpaceAfter = Unit.FromCentimeter(0.4);
        summary.Format.Shading.Color = SummaryBg;
        summary.Format.LeftIndent = Unit.FromCentimeter(0.2);
        summary.Format.RightIndent = Unit.FromCentimeter(0.2);
        summary.Format.Borders.Left.Color = Primary;
        summary.Format.Borders.Left.Width = Unit.FromPoint(3);
        summary.Format.Borders.DistanceFromLeft = Unit.FromCentimeter(0.2);

        if (ai.KeyFindings.Count > 0)
        {
            var findingsHeader = section.AddParagraph("Key Findings");
            findingsHeader.Format.Font.Bold = true;
            findingsHeader.Format.Font.Size = 11;
            findingsHeader.Format.Font.Color = Heading;
            findingsHeader.Format.SpaceBefore = Unit.FromCentimeter(0.3);
            findingsHeader.Format.SpaceAfter = Unit.FromCentimeter(0.15);

            foreach (var finding in ai.KeyFindings)
            {
                var p = section.AddParagraph($"•  {finding}");
                p.Format.LeftIndent = Unit.FromCentimeter(0.4);
                p.Format.Font.Size = 10;
                p.Format.SpaceAfter = Unit.FromCentimeter(0.05);
            }
        }
    }

    private static void AddRecommendationsPage(Section section, List<string> recommendations)
    {
        section.AddPageBreak();
        AddSectionHeading(section, "Recommendations");

        var i = 1;
        foreach (var rec in recommendations)
        {
            var p = section.AddParagraph($"{i}.  {rec}");
            p.Format.LeftIndent = Unit.FromCentimeter(0.4);
            p.Format.Font.Size = 11;
            p.Format.SpaceAfter = Unit.FromCentimeter(0.25);
            i++;
        }
    }

    // ─────────────────────────────────────────────────────────────────────
    // KPIs
    // ─────────────────────────────────────────────────────────────────────

    private static void AddKpiSection(Section section, Services.Analytics.DashboardSummaryDto kpis)
    {
        AddSectionHeading(section, "Key Performance Indicators");

        var table = section.AddTable();
        table.Borders.Width = 0;
        table.LeftPadding = Unit.FromCentimeter(0.2);
        table.RightPadding = Unit.FromCentimeter(0.2);
        table.TopPadding = Unit.FromCentimeter(0.2);
        table.BottomPadding = Unit.FromCentimeter(0.2);

        for (var i = 0; i < 4; i++)
            table.AddColumn(Unit.FromCentimeter(4.15));

        var row = table.AddRow();
        PopulateKpiCell(row.Cells[0], "Total Income (MTD)", Fmt(kpis.TotalIncome), Success, kpis.IncomeChange);
        PopulateKpiCell(row.Cells[1], "Total Expenses (MTD)", Fmt(kpis.TotalExpenses), Danger, kpis.ExpenseChange);
        PopulateKpiCell(row.Cells[2], "Net Profit (MTD)", Fmt(kpis.NetProfit), kpis.NetProfit >= 0 ? Success : Danger, kpis.ProfitChange);
        PopulateKpiCell(row.Cells[3], "Pending Invoices", kpis.PendingInvoices.ToString(CultureInfo.InvariantCulture), Primary, null);

        var spacer = section.AddParagraph();
        spacer.Format.SpaceAfter = Unit.FromCentimeter(0.4);
    }

    private static void PopulateKpiCell(Cell cell, string label, string value, Color accent, decimal? change)
    {
        cell.Shading.Color = Zebra;
        cell.Borders.Color = Divider;
        cell.Borders.Width = Unit.FromPoint(0.5);

        var labelPara = cell.AddParagraph(label);
        labelPara.Format.Font.Size = 9;
        labelPara.Format.Font.Color = Muted;

        var valuePara = cell.AddParagraph(value);
        valuePara.Format.Font.Size = 15;
        valuePara.Format.Font.Bold = true;
        valuePara.Format.Font.Color = accent;
        valuePara.Format.SpaceBefore = Unit.FromCentimeter(0.1);

        if (change.HasValue)
        {
            var sign = change.Value >= 0 ? "+" : "";
            var changePara = cell.AddParagraph($"{sign}{change.Value:0.##}% MoM");
            changePara.Format.Font.Size = 8;
            changePara.Format.Font.Color = change.Value >= 0 ? Success : Danger;
        }
    }

    // ─────────────────────────────────────────────────────────────────────
    // Monthly breakdown
    // ─────────────────────────────────────────────────────────────────────

    private static void AddMonthlySection(Section section, List<Services.Analytics.MonthlyBreakdownDto> monthly)
    {
        AddSectionHeading(section, "Monthly Breakdown");

        var table = CreateDataTable(section, ["Month", "Income", "Expenses", "Profit"],
            [Unit.FromCentimeter(4), Unit.FromCentimeter(4), Unit.FromCentimeter(4), Unit.FromCentimeter(4)]);

        var zebra = false;
        foreach (var m in monthly)
        {
            var row = table.AddRow();
            if (zebra) row.Shading.Color = Zebra;
            row.Cells[0].AddParagraph($"{m.Month} {m.Year}");
            AddCurrencyCell(row.Cells[1], m.Income, Success);
            AddCurrencyCell(row.Cells[2], m.Expenses, Danger);
            AddCurrencyCell(row.Cells[3], m.Profit, m.Profit >= 0 ? Success : Danger);
            zebra = !zebra;
        }

        section.AddParagraph().Format.SpaceAfter = Unit.FromCentimeter(0.4);
    }

    // ─────────────────────────────────────────────────────────────────────
    // Expense categories
    // ─────────────────────────────────────────────────────────────────────

    private static void AddExpenseCategoriesSection(Section section, List<Services.Analytics.CategoryBreakdownDto> cats)
    {
        AddSectionHeading(section, "Expense Categories");

        var table = CreateDataTable(section, ["Category", "Amount", "%"],
            [Unit.FromCentimeter(8), Unit.FromCentimeter(4), Unit.FromCentimeter(4)]);

        var zebra = false;
        foreach (var c in cats)
        {
            var row = table.AddRow();
            if (zebra) row.Shading.Color = Zebra;
            row.Cells[0].AddParagraph(c.CategoryName ?? "Uncategorized");
            AddCurrencyCell(row.Cells[1], c.Amount, Heading);
            var pct = row.Cells[2].AddParagraph($"{c.Percentage:0.##}%");
            pct.Format.Alignment = ParagraphAlignment.Right;
            zebra = !zebra;
        }

        section.AddParagraph().Format.SpaceAfter = Unit.FromCentimeter(0.4);
    }

    // ─────────────────────────────────────────────────────────────────────
    // P&L Centers
    // ─────────────────────────────────────────────────────────────────────

    private static void AddPnlCentersSection(Section section, List<Services.PnlCenters.PnlCenterWithStatsDto> centers)
    {
        AddSectionHeading(section, "P&L Centers");

        var table = CreateDataTable(section, ["Center", "Income", "Expenses", "Net Profit"],
            [Unit.FromCentimeter(5), Unit.FromCentimeter(3.7), Unit.FromCentimeter(3.7), Unit.FromCentimeter(3.6)]);

        var zebra = false;
        foreach (var c in centers)
        {
            var row = table.AddRow();
            if (zebra) row.Shading.Color = Zebra;
            row.Cells[0].AddParagraph(c.Name);
            AddCurrencyCell(row.Cells[1], c.TotalIncome, Success);
            AddCurrencyCell(row.Cells[2], c.TotalExpenses, Danger);
            AddCurrencyCell(row.Cells[3], c.NetProfit, c.NetProfit >= 0 ? Success : Danger);
            zebra = !zebra;
        }

        section.AddParagraph().Format.SpaceAfter = Unit.FromCentimeter(0.4);
    }

    // ─────────────────────────────────────────────────────────────────────
    // Contract stats + top clients + overdue + projections
    // ─────────────────────────────────────────────────────────────────────

    private static void AddContractStatsSection(Section section, Services.Income.ContractStatsDto stats)
    {
        AddSectionHeading(section, "Contracts Overview");

        var table = section.AddTable();
        table.Borders.Color = Divider;
        table.Borders.Width = Unit.FromPoint(0.5);
        table.LeftPadding = Unit.FromCentimeter(0.2);
        table.RightPadding = Unit.FromCentimeter(0.2);
        table.TopPadding = Unit.FromCentimeter(0.15);
        table.BottomPadding = Unit.FromCentimeter(0.15);
        table.AddColumn(Unit.FromCentimeter(8));
        table.AddColumn(Unit.FromCentimeter(8));

        AddKeyValueRow(table, "Total Contracts", stats.TotalContracts.ToString(CultureInfo.InvariantCulture));
        AddKeyValueRow(table, "Active Contracts", stats.ActiveContracts.ToString(CultureInfo.InvariantCulture));
        AddKeyValueRow(table, "Completed Contracts", stats.CompletedContracts.ToString(CultureInfo.InvariantCulture));
        AddKeyValueRow(table, "Total Value", Fmt(stats.TotalValue));
        AddKeyValueRow(table, "Collected", Fmt(stats.TotalCollected), Success);
        AddKeyValueRow(table, "Outstanding", Fmt(stats.TotalOutstanding), Primary);
        AddKeyValueRow(table, "Overdue Payments", stats.OverduePayments.ToString(CultureInfo.InvariantCulture));
        AddKeyValueRow(table, "Overdue Amount", Fmt(stats.OverdueAmount), Danger);

        section.AddParagraph().Format.SpaceAfter = Unit.FromCentimeter(0.4);
    }

    private static void AddTopClientsSection(Section section, List<Services.Income.ClientContractStatsDto> clients)
    {
        AddSectionHeading(section, "Top Clients by Contract Value");

        var table = CreateDataTable(section, ["Client", "Contracts", "Value", "Collected", "Outstanding"],
            [Unit.FromCentimeter(5), Unit.FromCentimeter(2), Unit.FromCentimeter(3.2), Unit.FromCentimeter(3.2), Unit.FromCentimeter(3.2)]);

        var zebra = false;
        foreach (var c in clients)
        {
            var row = table.AddRow();
            if (zebra) row.Shading.Color = Zebra;
            row.Cells[0].AddParagraph(c.ClientName);
            var count = row.Cells[1].AddParagraph(c.ContractCount.ToString(CultureInfo.InvariantCulture));
            count.Format.Alignment = ParagraphAlignment.Right;
            AddCurrencyCell(row.Cells[2], c.TotalValue, Heading);
            AddCurrencyCell(row.Cells[3], c.TotalCollected, Success);
            AddCurrencyCell(row.Cells[4], c.TotalOutstanding, Primary);
            zebra = !zebra;
        }

        section.AddParagraph().Format.SpaceAfter = Unit.FromCentimeter(0.4);
    }

    private static void AddOverdueMilestonesSection(Section section, List<Services.Income.IncomeMilestoneDto> milestones)
    {
        AddSectionHeading(section, "Overdue Milestones");

        var table = CreateDataTable(section, ["Due", "Client", "Description", "Amount"],
            [Unit.FromCentimeter(2.5), Unit.FromCentimeter(4.5), Unit.FromCentimeter(5), Unit.FromCentimeter(4.6)]);

        var zebra = false;
        foreach (var m in milestones.Take(20))
        {
            var row = table.AddRow();
            if (zebra) row.Shading.Color = Zebra;
            row.Cells[0].AddParagraph(m.DueDate.Length >= 10 ? m.DueDate[..10] : m.DueDate);
            row.Cells[1].AddParagraph(m.ClientName ?? "—");
            row.Cells[2].AddParagraph(Truncate(m.Description, 60));
            AddCurrencyCell(row.Cells[3], m.AmountDue, Danger);
            zebra = !zebra;
        }

        if (milestones.Count > 20)
        {
            var more = section.AddParagraph($"… and {milestones.Count - 20} more overdue milestones");
            more.Format.Font.Size = 9;
            more.Format.Font.Italic = true;
            more.Format.Font.Color = Muted;
        }

        section.AddParagraph().Format.SpaceAfter = Unit.FromCentimeter(0.4);
    }

    private static void AddProjectionsSection(Section section, List<Services.Income.MilestoneProjectionDto> projections)
    {
        AddSectionHeading(section, "Payment Projections (Next 12 Months)");

        var table = CreateDataTable(section, ["Month", "Projected", "Overdue", "Milestones"],
            [Unit.FromCentimeter(4), Unit.FromCentimeter(4), Unit.FromCentimeter(4), Unit.FromCentimeter(4)]);

        var zebra = false;
        foreach (var p in projections)
        {
            var row = table.AddRow();
            if (zebra) row.Shading.Color = Zebra;
            row.Cells[0].AddParagraph(p.Month);
            AddCurrencyCell(row.Cells[1], p.ProjectedAmount, Primary);
            AddCurrencyCell(row.Cells[2], p.OverdueAmount, Danger);
            var count = row.Cells[3].AddParagraph(p.MilestoneCount.ToString(CultureInfo.InvariantCulture));
            count.Format.Alignment = ParagraphAlignment.Right;
            zebra = !zebra;
        }

        section.AddParagraph().Format.SpaceAfter = Unit.FromCentimeter(0.4);
    }

    // ─────────────────────────────────────────────────────────────────────
    // Raw income / expense rows
    // ─────────────────────────────────────────────────────────────────────

    private static void AddIncomeRowsSection(Section section, List<Services.Income.IncomeDto> rows)
    {
        AddSectionHeading(section, "Top Income Records");

        var table = CreateDataTable(section, ["Date", "Description", "Client", "Amount"],
            [Unit.FromCentimeter(2.5), Unit.FromCentimeter(6), Unit.FromCentimeter(4), Unit.FromCentimeter(4.1)]);

        var zebra = false;
        foreach (var r in rows.Take(25))
        {
            var row = table.AddRow();
            if (zebra) row.Shading.Color = Zebra;
            row.Cells[0].AddParagraph(r.IncomeDate.Length >= 10 ? r.IncomeDate[..10] : r.IncomeDate);
            row.Cells[1].AddParagraph(Truncate(r.Description, 45));
            row.Cells[2].AddParagraph(Truncate(r.ClientName ?? "—", 28));
            AddCurrencyCell(row.Cells[3], r.Amount, Success, r.Currency);
            zebra = !zebra;
        }

        if (rows.Count > 25)
        {
            var more = section.AddParagraph($"… and {rows.Count - 25} more income records");
            more.Format.Font.Size = 9;
            more.Format.Font.Italic = true;
            more.Format.Font.Color = Muted;
        }

        section.AddParagraph().Format.SpaceAfter = Unit.FromCentimeter(0.4);
    }

    private static void AddExpenseRowsSection(Section section, List<Models.Expenses.ExpenseDto> rows)
    {
        AddSectionHeading(section, "Top Expense Records");

        var table = CreateDataTable(section, ["Date", "Description", "Vendor", "Amount"],
            [Unit.FromCentimeter(2.5), Unit.FromCentimeter(6), Unit.FromCentimeter(4), Unit.FromCentimeter(4.1)]);

        var zebra = false;
        foreach (var r in rows.Take(25))
        {
            var row = table.AddRow();
            if (zebra) row.Shading.Color = Zebra;
            row.Cells[0].AddParagraph(r.ExpenseDate.Length >= 10 ? r.ExpenseDate[..10] : r.ExpenseDate);
            row.Cells[1].AddParagraph(Truncate(r.Description, 45));
            row.Cells[2].AddParagraph(Truncate(r.Vendor ?? "—", 28));
            AddCurrencyCell(row.Cells[3], r.Amount, Danger, r.Currency);
            zebra = !zebra;
        }

        if (rows.Count > 25)
        {
            var more = section.AddParagraph($"… and {rows.Count - 25} more expense records");
            more.Format.Font.Size = 9;
            more.Format.Font.Italic = true;
            more.Format.Font.Color = Muted;
        }

        section.AddParagraph().Format.SpaceAfter = Unit.FromCentimeter(0.4);
    }

    // ─────────────────────────────────────────────────────────────────────
    // Sales pipeline
    // ─────────────────────────────────────────────────────────────────────

    private static void AddSalesPipelineSection(Section section, ReportData data)
    {
        AddSectionHeading(section, "Sales Pipeline");

        var summary = section.AddParagraph(
            $"Leads in period: {data.Leads?.Count ?? 0}   •   Proposals in period: {data.Proposals?.Count ?? 0}");
        summary.Format.Font.Size = 10;
        summary.Format.Font.Color = Muted;
        summary.Format.SpaceAfter = Unit.FromCentimeter(0.3);

        if (data.Leads is { Count: > 0 })
        {
            var leadsHeading = section.AddParagraph("Leads (top 15)");
            leadsHeading.Format.Font.Size = 11;
            leadsHeading.Format.Font.Bold = true;
            leadsHeading.Format.Font.Color = Heading;
            leadsHeading.Format.SpaceAfter = Unit.FromCentimeter(0.15);

            var table = CreateDataTable(section, ["Status", "Title", "Company", "Value"],
                [Unit.FromCentimeter(2.5), Unit.FromCentimeter(6), Unit.FromCentimeter(4), Unit.FromCentimeter(4.1)]);

            var zebra = false;
            foreach (var l in data.Leads.Take(15))
            {
                var row = table.AddRow();
                if (zebra) row.Shading.Color = Zebra;
                row.Cells[0].AddParagraph(string.IsNullOrEmpty(l.Status) ? "—" : l.Status);
                row.Cells[1].AddParagraph(Truncate(string.IsNullOrEmpty(l.Title) ? "—" : l.Title, 45));
                row.Cells[2].AddParagraph(Truncate(l.CompanyName ?? "—", 28));
                AddCurrencyCell(row.Cells[3], l.EstimatedValue ?? 0, Primary);
                zebra = !zebra;
            }

            section.AddParagraph().Format.SpaceAfter = Unit.FromCentimeter(0.3);
        }

        if (data.Proposals is { Count: > 0 })
        {
            var proposalsHeading = section.AddParagraph("Proposals (top 15)");
            proposalsHeading.Format.Font.Size = 11;
            proposalsHeading.Format.Font.Bold = true;
            proposalsHeading.Format.Font.Color = Heading;
            proposalsHeading.Format.SpaceAfter = Unit.FromCentimeter(0.15);

            var table = CreateDataTable(section, ["Status", "Title", "Number", "Amount"],
                [Unit.FromCentimeter(2.5), Unit.FromCentimeter(6), Unit.FromCentimeter(4), Unit.FromCentimeter(4.1)]);

            var zebra = false;
            foreach (var p in data.Proposals.Take(15))
            {
                var row = table.AddRow();
                if (zebra) row.Shading.Color = Zebra;
                row.Cells[0].AddParagraph(string.IsNullOrEmpty(p.Status) ? "—" : p.Status);
                row.Cells[1].AddParagraph(Truncate(string.IsNullOrEmpty(p.Title) ? "—" : p.Title, 45));
                row.Cells[2].AddParagraph(string.IsNullOrEmpty(p.ProposalNumber) ? "—" : p.ProposalNumber);
                AddCurrencyCell(row.Cells[3], p.Total, Primary, p.Currency);
                zebra = !zebra;
            }

            section.AddParagraph().Format.SpaceAfter = Unit.FromCentimeter(0.4);
        }
    }

    // ─────────────────────────────────────────────────────────────────────
    // Helpers
    // ─────────────────────────────────────────────────────────────────────

    private static void AddSectionHeading(Section section, string title)
    {
        var heading = section.AddParagraph(title);
        heading.Format.Font.Size = 16;
        heading.Format.Font.Bold = true;
        heading.Format.Font.Color = Heading;
        heading.Format.SpaceBefore = Unit.FromCentimeter(0.3);
        heading.Format.SpaceAfter = Unit.FromCentimeter(0.2);
        heading.Format.Borders.Bottom.Color = Primary;
        heading.Format.Borders.Bottom.Width = Unit.FromPoint(1);
        heading.Format.Borders.DistanceFromBottom = Unit.FromCentimeter(0.1);
    }

    private static Table CreateDataTable(Section section, string[] headers, Unit[] widths)
    {
        var table = section.AddTable();
        table.Borders.Color = Divider;
        table.Borders.Width = Unit.FromPoint(0.5);
        table.LeftPadding = Unit.FromCentimeter(0.15);
        table.RightPadding = Unit.FromCentimeter(0.15);
        table.TopPadding = Unit.FromCentimeter(0.1);
        table.BottomPadding = Unit.FromCentimeter(0.1);

        foreach (var w in widths)
            table.AddColumn(w);

        var headerRow = table.AddRow();
        headerRow.HeadingFormat = true;
        headerRow.Shading.Color = HeaderBg;
        for (var i = 0; i < headers.Length; i++)
        {
            var p = headerRow.Cells[i].AddParagraph(headers[i]);
            p.Format.Font.Bold = true;
            p.Format.Font.Size = 9;
            p.Format.Font.Color = Heading;
            // Right-align numeric columns (Amount, Value, %, etc. — any header that's not the first and not "Description"/"Client"/"Category")
            if (IsNumericHeader(headers[i]))
                p.Format.Alignment = ParagraphAlignment.Right;
        }

        return table;
    }

    private static bool IsNumericHeader(string header) =>
        header is "Amount" or "Value" or "Income" or "Expenses" or "Profit"
        or "Collected" or "Outstanding" or "Projected" or "Overdue"
        or "Milestones" or "Contracts" or "%" or "Net Profit";

    private static void AddCurrencyCell(Cell cell, decimal amount, Color color, string? currency = null)
    {
        var p = cell.AddParagraph(Fmt(amount, currency));
        p.Format.Alignment = ParagraphAlignment.Right;
        p.Format.Font.Color = color;
        p.Format.Font.Bold = true;
    }

    private static void AddKeyValueRow(Table table, string key, string value, Color? valueColor = null)
    {
        var row = table.AddRow();
        var keyPara = row.Cells[0].AddParagraph(key);
        keyPara.Format.Font.Color = Muted;
        keyPara.Format.Font.Size = 10;

        var valuePara = row.Cells[1].AddParagraph(value);
        valuePara.Format.Alignment = ParagraphAlignment.Right;
        valuePara.Format.Font.Bold = true;
        valuePara.Format.Font.Size = 11;
        if (valueColor.HasValue)
            valuePara.Format.Font.Color = valueColor.Value;
    }

    private static string Fmt(decimal amount, string? currency = null)
    {
        var symbol = currency switch
        {
            "USD" => "$",
            "EUR" => "€",
            "GBP" => "£",
            "ILS" => "₪",
            null or "" => "$",
            _ => currency + " ",
        };
        return $"{symbol}{amount:N2}";
    }

    private static string Truncate(string s, int max) =>
        string.IsNullOrEmpty(s) || s.Length <= max ? s : s[..(max - 1)] + "…";

    private static string TemplateLabel(string template) => template switch
    {
        "dashboard" => "Dashboard Overview",
        "pnl"       => "P&L Breakdown",
        "contracts" => "Contracts & Milestones",
        "sales"     => "Sales Pipeline",
        "ai-custom" => "AI Custom Report",
        _           => "Full Business Report",
    };
}
