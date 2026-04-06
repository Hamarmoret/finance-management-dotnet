import { useState } from 'react';
import { X, Loader2, Copy } from 'lucide-react';
import type { IncomeContract } from '@finance/shared';
import { api, getErrorMessage } from '../../../services/api';
import { ClientAutocomplete } from '../../../components/ClientAutocomplete';

interface DuplicateContractModalProps {
  contract: IncomeContract;
  onClose: () => void;
  onDuplicated: (c: IncomeContract) => void;
}

export default function DuplicateContractModal({
  contract,
  onClose,
  onDuplicated,
}: DuplicateContractModalProps) {
  const [title, setTitle] = useState(`${contract.title} (Copy)`);
  const [clientId, setClientId] = useState(contract.clientId ?? '');
  const [clientName, setClientName] = useState(contract.clientName ?? '');
  const [totalValue, setTotalValue] = useState(contract.totalValue.toString());
  const [currency, setCurrency] = useState(contract.currency);
  const [startDate, setStartDate] = useState(contract.startDate ?? '');
  const [endDate, setEndDate] = useState(contract.endDate ?? '');
  const [notes, setNotes] = useState(contract.notes ?? '');
  const [copyMilestones, setCopyMilestones] = useState(true);

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) { setError('Title is required'); return; }

    setSubmitting(true);
    setError(null);
    try {
      const res = await api.post(`/income-contracts/${contract.id}/duplicate`, {
        title: title.trim(),
        clientId: clientId || null,
        clientName: clientName || null,
        totalValue: parseFloat(totalValue) || contract.totalValue,
        currency,
        startDate: startDate || null,
        endDate: endDate || null,
        notes: notes || null,
        copyMilestones,
      });
      onDuplicated(res.data.data);
    } catch (err) {
      setError(getErrorMessage(err));
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-full items-center justify-center p-4">
        <div className="fixed inset-0 bg-black/50" onClick={onClose} />
        <div className="relative bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-lg w-full">
          <div className="flex items-center justify-between p-4 border-b dark:border-gray-700">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
              <Copy className="w-5 h-5" />
              Duplicate Contract
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

              <p className="text-sm text-gray-500 dark:text-gray-400">
                Copying <span className="font-medium text-gray-700 dark:text-gray-300">{contract.title}</span>.
                Adjust any details before creating the duplicate.
              </p>

              <div>
                <label className="label dark:text-gray-300">Title *</label>
                <input
                  required
                  value={title}
                  onChange={e => setTitle(e.target.value)}
                  className="input mt-1 w-full dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                />
              </div>

              <div>
                <label className="label dark:text-gray-300">Client</label>
                <ClientAutocomplete
                  clientId={clientId}
                  clientName={clientName}
                  onSelect={(id, name) => { setClientId(id); setClientName(name); }}
                  placeholder="Search or type client name"
                  className="mt-1"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label dark:text-gray-300">Total Value</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={totalValue}
                    onChange={e => setTotalValue(e.target.value)}
                    className="input mt-1 w-full dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                  />
                </div>
                <div>
                  <label className="label dark:text-gray-300">Currency</label>
                  <select
                    value={currency}
                    onChange={e => setCurrency(e.target.value)}
                    className="input mt-1 w-full dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                  >
                    <option value="ILS">ILS ₪</option>
                    <option value="USD">USD $</option>
                    <option value="EUR">EUR €</option>
                    <option value="GBP">GBP £</option>
                  </select>
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
                <label className="label dark:text-gray-300">Notes</label>
                <textarea
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                  rows={2}
                  className="input mt-1 w-full dark:bg-gray-700 dark:border-gray-600 dark:text-white resize-none"
                />
              </div>

              <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={copyMilestones}
                  onChange={e => setCopyMilestones(e.target.checked)}
                  className="rounded border-gray-300 text-primary-600"
                />
                Copy milestones ({contract.milestones.length})
              </label>
            </div>

            <div className="p-4 border-t dark:border-gray-700 flex justify-end gap-3">
              <button type="button" onClick={onClose} className="btn btn-ghost btn-md">Cancel</button>
              <button type="submit" disabled={submitting} className="btn btn-primary btn-md">
                {submitting
                  ? <><Loader2 className="w-4 h-4 animate-spin mr-2" />Creating...</>
                  : <><Copy className="w-4 h-4 mr-2" />Create Duplicate</>
                }
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
