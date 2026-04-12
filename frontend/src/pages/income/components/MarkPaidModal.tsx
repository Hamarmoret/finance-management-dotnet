import { useState } from 'react';
import { X, Loader2, CheckCircle, ChevronDown, ChevronUp } from 'lucide-react';
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
  const isAdditionalPayment = milestone.status === 'partially_paid';
  const previouslyPaid = milestone.actualAmountPaid ?? 0;
  const remaining = milestone.amountDue - previouslyPaid;

  const [paymentReceivedDate, setPaymentReceivedDate] = useState(today);
  const [paymentMethod, setPaymentMethod] = useState('');
  const [actualAmountPaid, setActualAmountPaid] = useState(
    isAdditionalPayment ? remaining.toString() : milestone.amountDue.toString()
  );

  // Invoice fields — pre-fill from milestone if already set
  const [proformaInvoiceNumber, setProformaInvoiceNumber] = useState(milestone.proformaInvoiceNumber ?? '');
  const [proformaInvoiceDate, setProformaInvoiceDate] = useState(milestone.proformaInvoiceDate ?? '');
  const [taxInvoiceNumber, setTaxInvoiceNumber] = useState(milestone.taxInvoiceNumber ?? '');
  const [taxInvoiceDate, setTaxInvoiceDate] = useState(milestone.taxInvoiceDate ?? '');
  const [showInvoice, setShowInvoice] = useState(
    !!(milestone.proformaInvoiceNumber || milestone.taxInvoiceNumber)
  );

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
        proformaInvoiceNumber: proformaInvoiceNumber || null,
        proformaInvoiceDate: proformaInvoiceDate || null,
        taxInvoiceNumber: taxInvoiceNumber || null,
        taxInvoiceDate: taxInvoiceDate || null,
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
              {isAdditionalPayment ? 'Record Additional Payment' : 'Mark as Paid'}
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
                {isAdditionalPayment && (
                  <div className="mt-2 pt-2 border-t border-gray-200 dark:border-gray-600 space-y-0.5">
                    <p className="text-xs text-amber-600 dark:text-amber-400 font-medium">
                      Previously paid: {formatCurrency(previouslyPaid, milestone.currency)}
                    </p>
                    <p className="text-xs text-gray-600 dark:text-gray-300 font-medium">
                      Remaining: {formatCurrency(remaining, milestone.currency)}
                    </p>
                  </div>
                )}
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
                {parseFloat(actualAmountPaid) !== (isAdditionalPayment ? remaining : milestone.amountDue) && (
                  <p className="mt-1 text-xs text-warning-600 dark:text-warning-400">
                    Differs from {isAdditionalPayment ? 'remaining' : 'due'} amount ({formatCurrency(isAdditionalPayment ? remaining : milestone.amountDue, milestone.currency)})
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

              {/* Invoice details — collapsible */}
              <div className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
                <button
                  type="button"
                  onClick={() => setShowInvoice(v => !v)}
                  className="w-full flex items-center justify-between px-4 py-3 bg-gray-50 dark:bg-gray-700/50 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                >
                  <span>Invoice Details</span>
                  {showInvoice ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                </button>

                {showInvoice && (
                  <div className="p-4 space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="label dark:text-gray-300">Proforma Invoice #</label>
                        <input
                          type="text"
                          value={proformaInvoiceNumber}
                          onChange={e => setProformaInvoiceNumber(e.target.value)}
                          className="input mt-1 w-full dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                          placeholder="e.g. PRO-001"
                        />
                      </div>
                      <div>
                        <label className="label dark:text-gray-300">Proforma Date</label>
                        <input
                          type="date"
                          value={proformaInvoiceDate}
                          onChange={e => setProformaInvoiceDate(e.target.value)}
                          className="input mt-1 w-full dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="label dark:text-gray-300">Tax Invoice #</label>
                        <input
                          type="text"
                          value={taxInvoiceNumber}
                          onChange={e => setTaxInvoiceNumber(e.target.value)}
                          className="input mt-1 w-full dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                          placeholder="e.g. INV-001"
                        />
                      </div>
                      <div>
                        <label className="label dark:text-gray-300">Tax Invoice Date</label>
                        <input
                          type="date"
                          value={taxInvoiceDate}
                          onChange={e => setTaxInvoiceDate(e.target.value)}
                          className="input mt-1 w-full dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                        />
                      </div>
                    </div>
                  </div>
                )}
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
