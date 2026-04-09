import { useState, useEffect } from 'react';
import { AlertTriangle, Clock, FileText, Loader2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { api } from '../../../services/api';
import { formatCurrency } from '../../../utils/formatters';

interface AlertMilestone {
  milestoneId: string;
  contractId: string;
  contractTitle: string;
  contractNumber: string | null;
  clientName: string | null;
  description: string;
  amountDue: number;
  currency: string;
  dueDate: string;
  status: string;
}

export default function ContractAlertsWidget() {
  const [overdue, setOverdue] = useState<AlertMilestone[]>([]);
  const [upcoming, setUpcoming] = useState<AlertMilestone[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchAlerts() {
      try {
        const [overdueRes, upcomingRes] = await Promise.all([
          api.get('/income-contracts/alerts/overdue'),
          api.get('/income-contracts/alerts/upcoming'),
        ]);
        setOverdue(overdueRes.data.data ?? []);
        setUpcoming(upcomingRes.data.data ?? []);
      } catch {
        // Silently fail — widget is supplementary
      } finally {
        setLoading(false);
      }
    }
    fetchAlerts();
  }, []);

  if (loading) {
    return (
      <div className="card p-4 flex items-center justify-center h-24">
        <Loader2 className="w-5 h-5 animate-spin text-gray-400" />
      </div>
    );
  }

  if (overdue.length === 0 && upcoming.length === 0) return null;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      {overdue.length > 0 && (
        <AlertPanel
          icon={<AlertTriangle className="w-4 h-4 text-danger-600 dark:text-danger-400" />}
          title="Overdue Payments"
          count={overdue.length}
          color="danger"
          items={overdue}
        />
      )}
      {upcoming.length > 0 && (
        <AlertPanel
          icon={<Clock className="w-4 h-4 text-warning-600 dark:text-warning-400" />}
          title="Due This Week"
          count={upcoming.length}
          color="warning"
          items={upcoming}
        />
      )}
    </div>
  );
}

function AlertPanel({
  icon,
  title,
  count,
  color,
  items,
}: {
  icon: React.ReactNode;
  title: string;
  count: number;
  color: 'danger' | 'warning';
  items: AlertMilestone[];
}) {
  const colorMap = {
    danger: {
      border: 'border-red-200 dark:border-red-700',
      bg: 'bg-red-50 dark:bg-red-900/25',
      badge: 'bg-red-100 text-red-700 dark:bg-red-800/60 dark:text-red-200',
      row: 'hover:bg-red-50 dark:hover:bg-red-900/20',
    },
    warning: {
      border: 'border-amber-200 dark:border-amber-700',
      bg: 'bg-amber-50 dark:bg-amber-900/25',
      badge: 'bg-amber-100 text-amber-700 dark:bg-amber-800/60 dark:text-amber-200',
      row: 'hover:bg-amber-50 dark:hover:bg-amber-900/20',
    },
  }[color];

  const SHOW = 3;

  return (
    <div className={`card border ${colorMap.border} overflow-hidden`}>
      <div className={`flex items-center justify-between px-4 py-3 ${colorMap.bg} border-b ${colorMap.border}`}>
        <div className="flex items-center gap-2">
          {icon}
          <span className="text-sm font-semibold text-gray-900 dark:text-white">{title}</span>
        </div>
        <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${colorMap.badge}`}>{count}</span>
      </div>
      <div className="divide-y divide-gray-100 dark:divide-gray-800">
        {items.slice(0, SHOW).map(item => (
          <Link
            key={item.milestoneId}
            to="/income"
            className={`flex items-start justify-between px-4 py-2.5 transition-colors ${colorMap.row}`}
          >
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <FileText className="w-3 h-3 text-gray-400 shrink-0" />
                <p className="text-xs font-medium text-gray-900 dark:text-white truncate">{item.contractTitle}</p>
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400 truncate mt-0.5">{item.description}</p>
              <p className="text-xs text-gray-400 dark:text-gray-500">{item.dueDate}</p>
            </div>
            <p className="text-xs font-semibold text-gray-900 dark:text-white ml-3 shrink-0">
              {formatCurrency(item.amountDue, item.currency)}
            </p>
          </Link>
        ))}
        {count > SHOW && (
          <Link
            to="/income"
            className="block px-4 py-2 text-xs text-center text-primary-600 dark:text-primary-400 hover:underline"
          >
            +{count - SHOW} more
          </Link>
        )}
      </div>
    </div>
  );
}
