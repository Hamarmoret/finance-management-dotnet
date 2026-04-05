import { useState } from 'react';
import { X, Loader2, Calendar } from 'lucide-react';
import type { IncomeContract, IncomeMilestone } from '@finance/shared';
import { api, getErrorMessage } from '../../../services/api';
import { formatCurrency } from '../../../utils/formatters';

interface GenerateRetainerModalProps {
  contract: IncomeContract;
  onClose: () => void;
  onGenerated: (milestones: IncomeMilestone[]) => void;
}

export default function GenerateRetainerModal({ contract, onClose, onGenerated }: GenerateRetainerModalProps) {
  const today = new Date().toISOString().split('T')[0];
  const [startDate, setStartDate] = useState(contract.startDate ?? today);
  const [monthCount, setMonthCount] = useState(3);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const monthlyAmount = contract.retainerMonthlyAmount ?? contract.totalValue;
  const previewTotal = monthlyAmount * monthCount;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    try {
      const res = await api.post(`/income-contracts/${contract.id}/milestones/generate`, {
        startDate,
        monthCount,
      });
      onGenerated(res.data.data);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-full items-center justify-center p-4">
        <div className="fixed inset-0 bg-black/50" onClick={onClose} />
        <div className="relative bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full">
          <div className="flex items-center justify-between p-4 border-b dark:border-gray-700">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
              <Calendar className="w-5 h-5 text-primary-600" />
              Generate Retainer Months
            </h2>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
              <X className="w-5 h-5" />
            </button>
          </div>

          <form onSubmit={handleSubmit}>
            <div className="p-4 space-y-4">
              {error && (
                <div className="p-3 bg-danger-50 dark:bg-danger-900/20 border border-danger-200 dark:border-danger-800 rounded-lg text-sm text-danger-700 dark:text-danger-400">
                  {error}
                </div>
              )}

              <div className="p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg space-y-1">
                <p className="text-sm font-medium text-gray-900 dark:text-white">{contract.title}</p>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Monthly: {formatCurrency(monthlyAmount, contract.currency)} ·{' '}
                  Billing day: {contract.retainerBillingDay ?? 'same as start date'}
                </p>
              </div>

              <div>
                <label className="label dark:text-gray-300">First Billing Date *</label>
                <input
                  type="date"
                  required
                  value={startDate}
                  onChange={e => setStartDate(e.target.value)}
                  className="input mt-1 w-full dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                />
              </div>

              <div>
                <label className="label dark:text-gray-300">Number of Months *</label>
                <input
                  type="number"
                  required
                  min={1}
                  max={36}
                  value={monthCount}
                  onChange={e => setMonthCount(parseInt(e.target.value) || 1)}
                  className="input mt-1 w-full dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                />
              </div>

              <div className="p-3 bg-primary-50 dark:bg-primary-900/20 rounded-lg">
                <p className="text-sm text-primary-700 dark:text-primary-300">
                  Will generate <strong>{monthCount}</strong> milestones totaling{' '}
                  <strong>{formatCurrency(previewTotal, contract.currency)}</strong>
                </p>
                {contract.milestoneCount > 0 && (
                  <p className="text-xs text-primary-600 dark:text-primary-400 mt-1">
                    These will be added alongside the {contract.milestoneCount} existing milestone(s).
                  </p>
                )}
              </div>
            </div>

            <div className="flex justify-end gap-3 p-4 border-t dark:border-gray-700">
              <button type="button" onClick={onClose} className="btn btn-ghost btn-md">Cancel</button>
              <button type="submit" disabled={isSubmitting} className="btn btn-primary btn-md">
                {isSubmitting ? (
                  <><Loader2 className="w-4 h-4 animate-spin mr-2" />Generating...</>
                ) : (
                  'Generate Milestones'
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
