import { useEffect, useState } from 'react';
import type { ComponentType } from 'react';
import { X, Loader2 } from 'lucide-react';
import { api } from '../../../services/api';
import { formatCurrency } from '../../../utils/formatters';

export type MilestoneListAccent = 'danger' | 'warning' | 'success' | 'primary';

interface MilestoneListItem {
  milestoneId: string;
  contractId: string;
  contractTitle: string;
  clientName: string | null;
  description: string;
  amountDue: number;
  currency: string;
  dueDate: string;
}

interface MilestoneListModalProps {
  title: string;
  icon: ComponentType<{ className?: string }>;
  accent: MilestoneListAccent;
  fetchUrl: string;
  emptyMessage: string;
  onClose: () => void;
  onOpenContract: (contractId: string) => void;
}

const ACCENT_TEXT: Record<MilestoneListAccent, string> = {
  danger: 'text-danger-600 dark:text-danger-400',
  warning: 'text-warning-600 dark:text-warning-400',
  success: 'text-success-600 dark:text-success-400',
  primary: 'text-primary-600 dark:text-primary-400',
};

const ACCENT_AMOUNT: Record<MilestoneListAccent, string> = {
  danger: 'text-danger-600 dark:text-danger-400',
  warning: 'text-warning-600 dark:text-warning-400',
  success: 'text-success-600 dark:text-success-400',
  primary: 'text-gray-900 dark:text-white',
};

export default function MilestoneListModal({
  title,
  icon: Icon,
  accent,
  fetchUrl,
  emptyMessage,
  onClose,
  onOpenContract,
}: MilestoneListModalProps) {
  const [items, setItems] = useState<MilestoneListItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    api.get(fetchUrl)
      .then(r => { if (!cancelled) setItems(r.data.data ?? []); })
      .catch(() => { if (!cancelled) setItems([]); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [fetchUrl]);

  const totalByCurrency = items.reduce((acc, m) => {
    acc[m.currency] = (acc[m.currency] ?? 0) + m.amountDue;
    return acc;
  }, {} as Record<string, number>);

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-full items-center justify-center p-4">
        <div className="fixed inset-0 bg-black/50" onClick={onClose} />
        <div className="relative bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-lg">
          <div className="flex items-center justify-between p-4 border-b dark:border-gray-700">
            <div>
              <h2 className="text-base font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                <Icon className={`w-4 h-4 ${ACCENT_TEXT[accent]}`} />
                {title}
              </h2>
              {Object.entries(totalByCurrency).map(([c, a]) => (
                <span key={c} className={`text-sm font-medium mr-3 ${ACCENT_TEXT[accent]}`}>
                  {formatCurrency(a, c)}
                </span>
              ))}
            </div>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
              <X className="w-5 h-5" />
            </button>
          </div>
          <div className="max-h-[60vh] overflow-y-auto divide-y divide-gray-100 dark:divide-gray-700">
            {loading ? (
              <div className="flex justify-center py-10"><Loader2 className="w-6 h-6 animate-spin text-gray-400" /></div>
            ) : items.length === 0 ? (
              <p className="text-center text-gray-500 dark:text-gray-400 py-10 text-sm">{emptyMessage}</p>
            ) : items.map((m, i) => (
              <button
                key={`${m.milestoneId}-${i}`}
                onClick={() => onOpenContract(m.contractId)}
                className="w-full text-left px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-700/40 transition-colors"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{m.contractTitle}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{m.description}</p>
                    {m.clientName && <p className="text-xs text-gray-400 dark:text-gray-500">{m.clientName}</p>}
                  </div>
                  <div className="text-right shrink-0">
                    <p className={`text-sm font-semibold ${ACCENT_AMOUNT[accent]}`}>{formatCurrency(m.amountDue, m.currency)}</p>
                    <p className="text-xs text-gray-400">{m.dueDate}</p>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
