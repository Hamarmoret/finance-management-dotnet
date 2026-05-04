import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, X, Clock, AlertTriangle, AlertCircle, Info, ChevronRight } from 'lucide-react';
import type { Alert, AlertType } from '../shared/types';
import { api } from '../services/api';
import { formatCurrency } from '../utils/formatters';

const SNOOZE_OPTIONS = [
  { label: '1 day', days: 1 },
  { label: '3 days', days: 3 },
  { label: '1 week', days: 7 },
  { label: '2 weeks', days: 14 },
];

const SEVERITY_CONFIG: Record<string, { icon: React.ElementType; color: string; bg: string; border: string }> = {
  danger:  { icon: AlertCircle,   color: 'text-danger-600 dark:text-danger-400',   bg: 'bg-danger-50 dark:bg-danger-900/20',   border: 'border-danger-200 dark:border-danger-800' },
  warning: { icon: AlertTriangle, color: 'text-warning-600 dark:text-warning-400', bg: 'bg-warning-50 dark:bg-warning-900/20', border: 'border-warning-200 dark:border-warning-800' },
  info:    { icon: Info,          color: 'text-blue-600 dark:text-blue-400',        bg: 'bg-blue-50 dark:bg-blue-900/20',       border: 'border-blue-200 dark:border-blue-800' },
};

const TYPE_LABELS: Record<AlertType, string> = {
  proforma_due:    'Proforma Due',
  payment_overdue: 'Payment Overdue',
  lead_stale:      'Stale Lead',
};

interface DismissState {
  alertId: string;
  justification: string;
}

export default function AlertsBell() {
  const navigate = useNavigate();
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [open, setOpen] = useState(false);
  const [snoozeOpen, setSnoozeOpen] = useState<string | null>(null);
  const [dismissing, setDismissing] = useState<DismissState | null>(null);
  const [loading, setLoading] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  const fetchAlerts = useCallback(async () => {
    try {
      const res = await api.get('/alerts');
      setAlerts(res.data.data ?? []);
    } catch {
      // silent fail — alerts are non-critical
    }
  }, []);

  useEffect(() => {
    fetchAlerts();
    const interval = setInterval(fetchAlerts, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [fetchAlerts]);

  // Close panel when clicking outside
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  const snooze = async (alert: Alert, days: number) => {
    const snoozeUntil = new Date();
    snoozeUntil.setDate(snoozeUntil.getDate() + days);
    setLoading(true);
    try {
      await api.post('/alerts/snooze', {
        alertType: alert.alertType,
        entityId: alert.entityId,
        snoozeUntil: snoozeUntil.toISOString(),
      });
      setAlerts(prev => prev.filter(a => a.id !== alert.id));
      setSnoozeOpen(null);
    } finally {
      setLoading(false);
    }
  };

  const dismiss = async () => {
    if (!dismissing) return;
    const alert = alerts.find(a => a.id === dismissing.alertId);
    if (!alert) return;
    setLoading(true);
    try {
      await api.post('/alerts/dismiss', {
        alertType: alert.alertType,
        entityId: alert.entityId,
        justification: dismissing.justification || null,
      });
      setAlerts(prev => prev.filter(a => a.id !== alert.id));
      setDismissing(null);
    } finally {
      setLoading(false);
    }
  };

  const navigateToEntity = (alert: Alert) => {
    setOpen(false);
    if (alert.entityType === 'lead') {
      navigate('/sales?tab=leads');
    } else if (alert.contractId) {
      navigate(`/income?contract=${alert.contractId}`);
    } else {
      navigate('/income');
    }
  };

  const count = alerts.length;

  return (
    <div className="relative" ref={panelRef}>
      <button
        onClick={() => setOpen(v => !v)}
        className="relative p-2 rounded-lg text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
        title="Alerts"
      >
        <Bell className="w-5 h-5" />
        {count > 0 && (
          <span className="absolute top-1 right-1 min-w-[16px] h-4 px-0.5 bg-danger-600 text-white text-[10px] font-bold rounded-full flex items-center justify-center leading-none">
            {count > 99 ? '99+' : count}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-96 max-h-[80vh] flex flex-col bg-white dark:bg-gray-800 rounded-xl shadow-xl border border-gray-200 dark:border-gray-700 z-50">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b dark:border-gray-700">
            <h3 className="font-semibold text-gray-900 dark:text-white flex items-center gap-2">
              <Bell className="w-4 h-4" />
              Alerts
              {count > 0 && (
                <span className="text-xs bg-danger-100 dark:bg-danger-900/40 text-danger-700 dark:text-danger-300 px-1.5 py-0.5 rounded-full">
                  {count}
                </span>
              )}
            </h3>
            <button onClick={() => setOpen(false)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Alert list */}
          <div className="overflow-y-auto flex-1">
            {alerts.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-gray-400 dark:text-gray-500">
                <Bell className="w-8 h-8 mb-2 opacity-40" />
                <p className="text-sm">No active alerts</p>
              </div>
            ) : (
              <ul className="divide-y divide-gray-100 dark:divide-gray-700">
                {alerts.map(alert => {
                  const cfg = SEVERITY_CONFIG[alert.severity] ?? SEVERITY_CONFIG.info;
                  const Icon = cfg.icon;
                  const isDismissing = dismissing?.alertId === alert.id;
                  const isSnoozingThis = snoozeOpen === alert.id;

                  return (
                    <li key={alert.id} className={`p-4 ${cfg.bg}`}>
                      <div className="flex gap-3">
                        <Icon className={`w-4 h-4 mt-0.5 shrink-0 ${cfg.color}`} />
                        <div className="flex-1 min-w-0">
                          {/* Type tag + title */}
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0">
                              <span className={`text-[10px] font-semibold uppercase tracking-wide ${cfg.color}`}>
                                {TYPE_LABELS[alert.alertType]}
                              </span>
                              <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                                {alert.title}
                              </p>
                            </div>
                            <button
                              onClick={() => navigateToEntity(alert)}
                              className="shrink-0 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                              title="View"
                            >
                              <ChevronRight className="w-4 h-4" />
                            </button>
                          </div>

                          <p className="mt-0.5 text-xs text-gray-600 dark:text-gray-400">{alert.description}</p>

                          {alert.amount != null && alert.currency && (
                            <p className="mt-0.5 text-xs font-medium text-gray-700 dark:text-gray-300">
                              {formatCurrency(alert.amount, alert.currency)}
                            </p>
                          )}

                          {alert.clientName && (
                            <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">{alert.clientName}</p>
                          )}

                          {/* Dismiss form */}
                          {isDismissing ? (
                            <div className="mt-2 space-y-2">
                              <textarea
                                autoFocus
                                rows={2}
                                placeholder="Reason for dismissing (optional)"
                                value={dismissing.justification}
                                onChange={e => setDismissing({ alertId: alert.id, justification: e.target.value })}
                                className="w-full text-xs rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white px-2 py-1 resize-none focus:outline-none focus:ring-1 focus:ring-primary-500"
                              />
                              <div className="flex gap-2">
                                <button
                                  onClick={dismiss}
                                  disabled={loading}
                                  className="text-xs px-2 py-1 bg-danger-600 text-white rounded hover:bg-danger-700 disabled:opacity-50"
                                >
                                  Confirm Dismiss
                                </button>
                                <button
                                  onClick={() => setDismissing(null)}
                                  className="text-xs px-2 py-1 text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200"
                                >
                                  Cancel
                                </button>
                              </div>
                            </div>
                          ) : isSnoozingThis ? (
                            <div className="mt-2">
                              <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Snooze for:</p>
                              <div className="flex flex-wrap gap-1">
                                {SNOOZE_OPTIONS.map(opt => (
                                  <button
                                    key={opt.days}
                                    onClick={() => snooze(alert, opt.days)}
                                    disabled={loading}
                                    className="text-xs px-2 py-0.5 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded hover:bg-gray-300 dark:hover:bg-gray-600 disabled:opacity-50"
                                  >
                                    {opt.label}
                                  </button>
                                ))}
                                <button
                                  onClick={() => setSnoozeOpen(null)}
                                  className="text-xs px-2 py-0.5 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                                >
                                  Cancel
                                </button>
                              </div>
                            </div>
                          ) : (
                            <div className="mt-2 flex gap-2">
                              <button
                                onClick={() => { setSnoozeOpen(alert.id); setDismissing(null); }}
                                className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
                              >
                                <Clock className="w-3 h-3" /> Snooze
                              </button>
                              <button
                                onClick={() => { setDismissing({ alertId: alert.id, justification: '' }); setSnoozeOpen(null); }}
                                className="text-xs text-gray-500 dark:text-gray-400 hover:text-danger-600 dark:hover:text-danger-400"
                              >
                                Dismiss
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
