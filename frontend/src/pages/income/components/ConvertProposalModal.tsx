import { useState } from 'react';
import { X, Loader2, FileText, ArrowRight } from 'lucide-react';
import type { Proposal, IncomeContract } from '@finance/shared';
import { api, getErrorMessage } from '../../../services/api';
import { formatCurrency } from '../../../utils/formatters';

interface ConvertProposalModalProps {
  proposal: Proposal;
  onClose: () => void;
  onConverted: (contract: IncomeContract) => void;
}

export default function ConvertProposalModal({ proposal, onClose, onConverted }: ConvertProposalModalProps) {
  const [contractType, setContractType] = useState<'project' | 'retainer'>('project');
  const [paymentTermsDays, setPaymentTermsDays] = useState('30');
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState('');
  const [vatApplicable, setVatApplicable] = useState(true);
  const [vatPercentage, setVatPercentage] = useState('18');
  const [retainerMonthlyAmount, setRetainerMonthlyAmount] = useState('');
  const [retainerBillingDay, setRetainerBillingDay] = useState('1');
  const [notes, setNotes] = useState('');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    try {
      const res = await api.post('/income-contracts/convert-proposal', {
        proposalId: proposal.id,
        contractType,
        paymentTermsDays: parseInt(paymentTermsDays) || 30,
        startDate: startDate || null,
        endDate: endDate || null,
        vatApplicable,
        vatPercentage: vatApplicable && vatPercentage ? parseFloat(vatPercentage) : null,
        retainerMonthlyAmount: contractType === 'retainer' && retainerMonthlyAmount
          ? parseFloat(retainerMonthlyAmount) : null,
        retainerBillingDay: contractType === 'retainer' && retainerBillingDay
          ? parseInt(retainerBillingDay) : null,
        notes: notes || null,
      });
      onConverted(res.data.data);
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
        <div className="relative bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-lg w-full">
          <div className="flex items-center justify-between p-4 border-b dark:border-gray-700">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
              <FileText className="w-5 h-5 text-primary-600" />
              Convert Proposal to Contract
            </h2>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
              <X className="w-5 h-5" />
            </button>
          </div>

          <form onSubmit={handleSubmit}>
            <div className="p-4 space-y-4 max-h-[70vh] overflow-y-auto">
              {error && (
                <div className="p-3 bg-danger-50 dark:bg-danger-900/20 border border-danger-200 dark:border-danger-800 rounded-lg text-sm text-danger-700 dark:text-danger-400">
                  {error}
                </div>
              )}

              {/* Proposal summary */}
              <div className="p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 mb-1">
                  <span className="font-mono text-xs">{proposal.proposalNumber}</span>
                  <ArrowRight className="w-3 h-3" />
                  <span>New Contract</span>
                </div>
                <p className="font-semibold text-gray-900 dark:text-white">{proposal.title}</p>
                {proposal.clientName && (
                  <p className="text-sm text-gray-500 dark:text-gray-400">{proposal.clientName}</p>
                )}
                <p className="text-sm font-medium text-primary-600 dark:text-primary-400 mt-1">
                  {formatCurrency(proposal.total, proposal.currency)}
                </p>
              </div>

              {/* Contract type */}
              <div>
                <label className="label dark:text-gray-300">Contract Type *</label>
                <div className="mt-1 grid grid-cols-2 gap-3">
                  {(['project', 'retainer'] as const).map(t => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setContractType(t)}
                      className={`py-3 px-4 rounded-lg border-2 text-sm font-medium transition-colors text-left ${
                        contractType === t
                          ? 'border-primary-500 bg-primary-50 text-primary-700 dark:bg-primary-900/20 dark:text-primary-400 dark:border-primary-600'
                          : 'border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-300 hover:border-gray-300 dark:hover:border-gray-500'
                      }`}
                    >
                      <div className="font-semibold capitalize">{t}</div>
                      <div className="text-xs mt-0.5 opacity-70">
                        {t === 'project' ? 'One-time project with milestones' : 'Recurring monthly payments'}
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label dark:text-gray-300">Start Date</label>
                  <input
                    type="date"
                    value={startDate}
                    onChange={e => setStartDate(e.target.value)}
                    className="input mt-1 w-full dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                  />
                </div>
                <div>
                  <label className="label dark:text-gray-300">End Date</label>
                  <input
                    type="date"
                    value={endDate}
                    onChange={e => setEndDate(e.target.value)}
                    className="input mt-1 w-full dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                  />
                </div>
              </div>

              <div>
                <label className="label dark:text-gray-300">Payment Terms (days)</label>
                <input
                  type="number"
                  min="0"
                  max="365"
                  value={paymentTermsDays}
                  onChange={e => setPaymentTermsDays(e.target.value)}
                  className="input mt-1 w-full dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                />
              </div>

              {contractType === 'retainer' && (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="label dark:text-gray-300">Monthly Amount</label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={retainerMonthlyAmount}
                      onChange={e => setRetainerMonthlyAmount(e.target.value)}
                      className="input mt-1 w-full dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                      placeholder={formatCurrency(proposal.total, proposal.currency)}
                    />
                  </div>
                  <div>
                    <label className="label dark:text-gray-300">Billing Day (1–28)</label>
                    <input
                      type="number"
                      min="1"
                      max="28"
                      value={retainerBillingDay}
                      onChange={e => setRetainerBillingDay(e.target.value)}
                      className="input mt-1 w-full dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                    />
                  </div>
                </div>
              )}

              <div>
                <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={vatApplicable}
                    onChange={e => setVatApplicable(e.target.checked)}
                    className="rounded border-gray-300 text-primary-600"
                  />
                  VAT applicable
                </label>
                {vatApplicable && (
                  <div className="mt-2">
                    <label className="label dark:text-gray-300">VAT %</label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      max="100"
                      value={vatPercentage}
                      onChange={e => setVatPercentage(e.target.value)}
                      className="input mt-1 w-32 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                    />
                  </div>
                )}
              </div>

              <div>
                <label className="label dark:text-gray-300">Notes</label>
                <textarea
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                  rows={2}
                  className="input mt-1 w-full dark:bg-gray-700 dark:border-gray-600 dark:text-white resize-none"
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 p-4 border-t dark:border-gray-700">
              <button type="button" onClick={onClose} className="btn btn-ghost btn-md">Cancel</button>
              <button type="submit" disabled={isSubmitting} className="btn btn-primary btn-md">
                {isSubmitting ? (
                  <><Loader2 className="w-4 h-4 animate-spin mr-2" />Converting...</>
                ) : (
                  'Convert to Contract'
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
