using Dapper;
using FinanceManagement.Api.Database;
using FinanceManagement.Api.Models.Alerts;

namespace FinanceManagement.Api.Services.Alerts;

public class AlertsService(DbContext db)
{
    private readonly DbContext _db = db;

    public async Task<List<AlertDto>> GetAlertsAsync(Guid userId)
    {
        using var conn = await _db.OpenAsync();
        var alerts = new List<AlertDto>();

        // ── Proforma invoice not sent (due within 7 days or up to 3 days overdue) ──
        var proformaDue = await conn.QueryAsync<AlertDto>(@"
            SELECT
                'proforma_due:' || m.id            AS Id,
                'proforma_due'                     AS AlertType,
                m.id                               AS EntityId,
                'milestone'                        AS EntityType,
                c.title || ' — ' || m.description  AS Title,
                'Proforma invoice not sent. Due ' || TO_CHAR(m.due_date, 'DD Mon YYYY') AS Description,
                'warning'                          AS Severity,
                m.due_date::text                   AS DueDate,
                (m.due_date - CURRENT_DATE)::int   AS DaysUntilDue,
                c.id                               AS ContractId,
                COALESCE(cl.company_name, cl.name, c.client_name) AS ClientName,
                c.title                            AS ContractTitle,
                m.amount_due                       AS Amount,
                c.currency                         AS Currency
            FROM income_milestones m
            JOIN income_contracts c ON c.id = m.contract_id
            LEFT JOIN clients cl ON cl.id = c.client_id
            WHERE m.status NOT IN ('paid', 'cancelled')
              AND (m.proforma_invoice_number IS NULL OR m.proforma_invoice_number = '')
              AND m.due_date BETWEEN CURRENT_DATE - 3 AND CURRENT_DATE + 7
              AND NOT EXISTS (
                  SELECT 1 FROM alert_dismissals d
                  WHERE d.user_id = @UserId
                    AND d.alert_type = 'proforma_due'
                    AND d.entity_id = m.id
                    AND (d.action = 'dismiss' OR (d.action = 'snooze' AND d.snooze_until > NOW()))
              )
            ORDER BY m.due_date ASC",
            new { UserId = userId });

        alerts.AddRange(proformaDue);

        // ── Payment overdue ──
        var paymentOverdue = await conn.QueryAsync<AlertDto>(@"
            SELECT
                'payment_overdue:' || m.id                  AS Id,
                'payment_overdue'                            AS AlertType,
                m.id                                         AS EntityId,
                'milestone'                                  AS EntityType,
                c.title || ' — ' || m.description            AS Title,
                'Overdue by ' || (CURRENT_DATE - m.due_date)::text || ' days' AS Description,
                'danger'                                     AS Severity,
                m.due_date::text                             AS DueDate,
                -(CURRENT_DATE - m.due_date)::int            AS DaysUntilDue,
                c.id                                         AS ContractId,
                COALESCE(cl.company_name, cl.name, c.client_name) AS ClientName,
                c.title                                      AS ContractTitle,
                m.amount_due                                 AS Amount,
                c.currency                                   AS Currency
            FROM income_milestones m
            JOIN income_contracts c ON c.id = m.contract_id
            LEFT JOIN clients cl ON cl.id = c.client_id
            WHERE m.status NOT IN ('paid', 'cancelled')
              AND m.due_date < CURRENT_DATE
              AND NOT EXISTS (
                  SELECT 1 FROM alert_dismissals d
                  WHERE d.user_id = @UserId
                    AND d.alert_type = 'payment_overdue'
                    AND d.entity_id = m.id
                    AND (d.action = 'dismiss' OR (d.action = 'snooze' AND d.snooze_until > NOW()))
              )
            ORDER BY m.due_date ASC",
            new { UserId = userId });

        alerts.AddRange(paymentOverdue);

        // ── Stale leads (no update in 14+ days) ──
        var leadStale = await conn.QueryAsync<AlertDto>(@"
            SELECT
                'lead_stale:' || l.id                        AS Id,
                'lead_stale'                                  AS AlertType,
                l.id                                          AS EntityId,
                'lead'                                        AS EntityType,
                COALESCE(l.title, l.company_name, 'Lead')    AS Title,
                'No update in ' || EXTRACT(DAY FROM NOW() - l.updated_at)::int::text || ' days' AS Description,
                'info'                                        AS Severity,
                NULL                                          AS DueDate,
                NULL                                          AS DaysUntilDue,
                NULL                                          AS ContractId,
                l.company_name                                AS ClientName,
                NULL                                          AS ContractTitle,
                l.deal_value                                  AS Amount,
                NULL                                          AS Currency
            FROM leads l
            WHERE l.status NOT IN ('closed_won', 'closed_lost', 'cancelled')
              AND l.updated_at < NOW() - INTERVAL '14 days'
              AND NOT EXISTS (
                  SELECT 1 FROM alert_dismissals d
                  WHERE d.user_id = @UserId
                    AND d.alert_type = 'lead_stale'
                    AND d.entity_id = l.id
                    AND (d.action = 'dismiss' OR (d.action = 'snooze' AND d.snooze_until > NOW()))
              )
            ORDER BY l.updated_at ASC",
            new { UserId = userId });

        alerts.AddRange(leadStale);

        return alerts;
    }

    public async Task DismissAsync(Guid userId, string alertType, Guid entityId, string? justification)
    {
        using var conn = await _db.OpenAsync();
        await conn.ExecuteAsync(@"
            INSERT INTO alert_dismissals (user_id, alert_type, entity_id, action, justification)
            VALUES (@UserId, @AlertType, @EntityId, 'dismiss', @Justification)",
            new { UserId = userId, AlertType = alertType, EntityId = entityId, Justification = justification });
    }

    public async Task SnoozeAsync(Guid userId, string alertType, Guid entityId, DateTime snoozeUntil)
    {
        using var conn = await _db.OpenAsync();
        await conn.ExecuteAsync(@"
            INSERT INTO alert_dismissals (user_id, alert_type, entity_id, action, snooze_until)
            VALUES (@UserId, @AlertType, @EntityId, 'snooze', @SnoozeUntil)",
            new { UserId = userId, AlertType = alertType, EntityId = entityId, SnoozeUntil = snoozeUntil });
    }
}
