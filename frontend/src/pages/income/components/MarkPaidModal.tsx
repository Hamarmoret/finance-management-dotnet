import { useState } from 'react';
import { X, Loader2, CheckCircle } from 'lucide-react';
import type { IncomeMilestone } from '@finance/shared';
import { api, getErrorMessage } from '../../../services/api';
import { formatCurrency } from '../../../utils/formatters';

interface MarkPaidModalProps {
  milestone: IncomeMilestone;
  contractId: string;
  onClose: () => void;
  onPaid: (updated: IncomeMilestone) => void;
}

export default function MarkPaidModal({ milestone, onClose, onPaid }: MarkPaidModalProps) {
  const today = new Date().toISOString().split('T')[0];
  const [paymentReceivedDate, setPaymentReceivedDate] = useState(today);
  const [paymentMethod, setPaymentMethod] = useState('');
  const [actualAmountPaid, setActualAmountPaid] = useState(milestone.amountDue.toString());
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    try {
      const res = await api.post(`/income-contracts/milestones/${milestone.id}/mark-paid`, {
        paymentReceivedDate,
        paymentMethod: paymentMethod || null,
        actualAmountPaid: parseFloat(actualAmountPaid),
        allocations: [],
      });
      onPaid(res.data.data);
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
              <CheckCircle className="w-5 h-5 text-success-600" />
              Mark as Paid
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

              <div className="p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                <p className="text-sm text-gray-500 dark:text-gray-400">{milestone.description}</p>
                <p className="text-lg font-semibold text-gray-900 dark:text-white">
                  {formatCurrency(milestone.amountDue, milestone.currency)}
                </p>
                <p className="text-xs text-gray-400 dark:text-gray-500">Due: {milestone.dueDate}</p>
              </div>

              <div>
                <label className="label dark:text-gray-300">Payment Received Date *</label>
                <input
                  type="date"
                  required
                  value={paymentReceivedDate}
                  onChange={e => setPaymentReceivedDate(e.target.value)}
                  className="input mt-1 w-full dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                />
              </div>

              <div>
                <label className="label dark:text-gray-300">Amount Received</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={actualAmountPaid}
                  onChange={e => setActualAmountPaid(e.target.value)}
                  className="input mt-1 w-full dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                />
                {parseFloat(actualAmountPaid) !== milestone.amountDue && (
                  <p className="mt-1 text-xs text-warning-600 dark:text-warning-400">
                    Differs from due amount ({formatCurrency(milestone.amountDue, milestone.currency)})
                  </p>
                )}
              </div>

              <div>
                <label className="label dark:text-gray-300">Payment Method</label>
                <select
                  value={paymentMethod}
                  onChange={e => setPaymentMethod(e.target.value)}
                  className="input mt-1 w-full dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                >
                  <option value="">— Select —</option>
                  <option value="bank_transfer">Bank Transfer</option>
                  <option value="credit_card">Credit Card</option>
                  <option value="check">Check</option>
                  <option value="cash">Cash</option>
                  <option value="other">Other</option>
                </select>
              </div>

              <p className="text-xs text-gray-500 dark:text-gray-400">
                This will create an income record in your Transactions and update all P&amp;L reports.
              </p>
            </div>

            <div className="flex justify-end gap-3 p-4 border-t dark:border-gray-700">
              <button type="button" onClick={onClose} className="btn btn-ghost btn-md">Cancel</button>
              <button type="submit" disabled={isSubmitting} className="btn btn-primary btn-md">
                {isSubmitting ? (
                  <><Loader2 className="w-4 h-4 animate-spin mr-2" />Confirming...</>
                ) : (
                  <><CheckCircle className="w-4 h-4 mr-2" />Confirm Payment</>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
