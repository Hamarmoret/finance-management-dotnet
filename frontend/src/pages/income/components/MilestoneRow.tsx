import { useState } from 'react';
import { CheckCircle, Trash2, Loader2, ExternalLink } from 'lucide-react';
import type { IncomeMilestone, MilestoneStatus } from '@finance/shared';
import { api, getErrorMessage } from '../../../services/api';
import { formatCurrency } from '../../../utils/formatters';
import { MilestoneStatusBadge } from './MilestoneStatusBadge';
import MarkPaidModal from './MarkPaidModal';

interface MilestoneRowProps {
  milestone: IncomeMilestone;
  contractId: string;
  contractCurrency: string;
  onUpdated: (m: IncomeMilestone) => void;
  onDeleted: (id: string) => void;
}

const ROW_TINT: Partial<Record<MilestoneStatus, string>> = {
  paid: 'border-l-4 border-l-success-400',
  overdue: 'border-l-4 border-l-danger-500 bg-danger-50/30 dark:bg-danger-900/10',
};

export default function MilestoneRow({
  milestone,
  contractId,
  contractCurrency,
  onUpdated,
  onDeleted,
}: MilestoneRowProps) {
  const [saving, setSaving] = useState<string | null>(null);
  const [showMarkPaid, setShowMarkPaid] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Inline field save on blur
  const saveField = async (field: string, value: string | number | null) => {
    setSaving(field);
    setError(null);
    try {
      const res = await api.put(`/income-contracts/milestones/${milestone.id}`, { [field]: value });
      onUpdated(res.data.data);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setSaving(null);
    }
  };

  const handleDelete = async () => {
    if (!confirm('Delete this milestone? This cannot be undone.')) return;
    setDeleting(true);
    try {
      await api.delete(`/income-contracts/milestones/${milestone.id}`);
      onDeleted(milestone.id);
    } catch (err) {
      setError(getErrorMessage(err));
      setDeleting(false);
    }
  };

  const isUpcoming =
    milestone.status !== 'paid' &&
    milestone.status !== 'overdue' &&
    new Date(milestone.dueDate) <= new Date(Date.now() + 7 * 86400000);

  const tint = ROW_TINT[milestone.status] ?? (isUpcoming ? 'border-l-4 border-l-warning-400' : '');

  return (
    <>
      <div className={`p-4 rounded-lg bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 ${tint}`}>
        {error && (
          <p className="mb-2 text-xs text-danger-600 dark:text-danger-400">{error}</p>
        )}

        <div className="flex flex-col sm:flex-row sm:items-start gap-3">
          {/* Description + status */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <MilestoneStatusBadge status={milestone.status} />
              <InlineText
                value={milestone.description}
                disabled={milestone.status === 'paid'}
                saving={saving === 'description'}
                onSave={v => saveField('description', v)}
                className="font-medium text-gray-900 dark:text-white text-sm"
              />
            </div>

            {/* Invoice fields row */}
            <div className="mt-2 grid grid-cols-2 sm:grid-cols-4 gap-x-4 gap-y-1 text-xs text-gray-500 dark:text-gray-400">
              <InlineField
                label="Proforma #"
                value={milestone.proformaInvoiceNumber ?? ''}
                disabled={milestone.status === 'paid'}
                saving={saving === 'proformaInvoiceNumber'}
                onSave={v => saveField('proformaInvoiceNumber', v || null)}
              />
              <InlineField
                label="Proforma Date"
                type="date"
                value={milestone.proformaInvoiceDate ?? ''}
                disabled={milestone.status === 'paid'}
                saving={saving === 'proformaInvoiceDate'}
                onSave={v => saveField('proformaInvoiceDate', v || null)}
              />
              <InlineField
                label="Tax Invoice #"
                value={milestone.taxInvoiceNumber ?? ''}
                disabled={milestone.status === 'paid'}
                saving={saving === 'taxInvoiceNumber'}
                onSave={v => saveField('taxInvoiceNumber', v || null)}
              />
              <InlineField
                label="Tax Invoice Date"
                type="date"
                value={milestone.taxInvoiceDate ?? ''}
                disabled={milestone.status === 'paid'}
                saving={saving === 'taxInvoiceDate'}
                onSave={v => saveField('taxInvoiceDate', v || null)}
              />
            </div>

            {milestone.status === 'paid' && milestone.incomeId && (
              <p className="mt-1 text-xs text-success-600 dark:text-success-400 flex items-center gap-1">
                <CheckCircle className="w-3 h-3" />
                Paid {milestone.paymentReceivedDate} · {milestone.paymentMethod ?? ''} ·{' '}
                {formatCurrency(milestone.actualAmountPaid ?? milestone.amountDue, milestone.currency)}
                <ExternalLink className="w-3 h-3 ml-1 opacity-60" />
              </p>
            )}
          </div>

          {/* Amount + due date + actions */}
          <div className="flex items-center gap-3 shrink-0">
            <div className="text-right">
              <InlineAmount
                value={milestone.amountDue}
                disabled={milestone.status === 'paid'}
                saving={saving === 'amountDue'}
                onSave={v => saveField('amountDue', v)}
                currency={contractCurrency}
              />
              <InlineField
                label="Due"
                type="date"
                value={milestone.dueDate}
                disabled={milestone.status === 'paid'}
                saving={saving === 'dueDate'}
                onSave={v => saveField('dueDate', v)}
                className="text-xs text-gray-400 dark:text-gray-500"
              />
            </div>

            <div className="flex gap-1">
              {milestone.status !== 'paid' && (
                <button
                  onClick={() => setShowMarkPaid(true)}
                  className="btn btn-ghost btn-sm text-success-600 dark:text-success-400 hover:bg-success-50 dark:hover:bg-success-900/20"
                  title="Mark as paid"
                >
                  <CheckCircle className="w-4 h-4" />
                </button>
              )}
              {milestone.status !== 'paid' && (
                <button
                  onClick={handleDelete}
                  disabled={deleting}
                  className="btn btn-ghost btn-sm text-danger-600 hover:bg-danger-50 dark:hover:bg-danger-900/20"
                  title="Delete milestone"
                >
                  {deleting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {showMarkPaid && (
        <MarkPaidModal
          milestone={milestone}
          contractId={contractId}
          onClose={() => setShowMarkPaid(false)}
          onPaid={updated => {
            setShowMarkPaid(false);
            onUpdated(updated);
          }}
        />
      )}
    </>
  );
}

// ── Inline editable helpers ────────────────────────────────────────────────

function InlineText({
  value,
  disabled,
  saving,
  onSave,
  className = '',
}: {
  value: string;
  disabled: boolean;
  saving: boolean;
  onSave: (v: string) => void;
  className?: string;
}) {
  const [draft, setDraft] = useState(value);

  return (
    <span className="relative flex items-center gap-1">
      <input
        type="text"
        value={draft}
        disabled={disabled}
        onChange={e => setDraft(e.target.value)}
        onBlur={() => { if (draft !== value) onSave(draft); }}
        className={`bg-transparent border-0 border-b border-transparent hover:border-gray-300 dark:hover:border-gray-500 focus:border-primary-500 outline-none p-0 ${className} ${disabled ? 'cursor-default' : ''}`}
      />
      {saving && <Loader2 className="w-3 h-3 animate-spin text-gray-400" />}
    </span>
  );
}

function InlineField({
  label,
  value,
  type = 'text',
  disabled,
  saving,
  onSave,
  className = '',
}: {
  label: string;
  value: string;
  type?: string;
  disabled: boolean;
  saving: boolean;
  onSave: (v: string) => void;
  className?: string;
}) {
  const [draft, setDraft] = useState(value);

  return (
    <div className={className}>
      <span className="block text-gray-400 dark:text-gray-500">{label}</span>
      <span className="flex items-center gap-1">
        <input
          type={type}
          value={draft}
          disabled={disabled}
          onChange={e => setDraft(e.target.value)}
          onBlur={() => { if (draft !== value) onSave(draft); }}
          className={`bg-transparent border-0 border-b border-transparent hover:border-gray-300 dark:hover:border-gray-500 focus:border-primary-500 outline-none p-0 text-xs w-full ${disabled ? 'cursor-default' : ''}`}
        />
        {saving && <Loader2 className="w-3 h-3 animate-spin text-gray-400" />}
      </span>
    </div>
  );
}

function InlineAmount({
  value,
  disabled,
  saving,
  onSave,
  currency,
}: {
  value: number;
  disabled: boolean;
  saving: boolean;
  onSave: (v: number) => void;
  currency: string;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value.toString());

  if (!editing || disabled) {
    return (
      <button
        onClick={() => !disabled && setEditing(true)}
        className={`font-semibold text-gray-900 dark:text-white text-sm ${disabled ? 'cursor-default' : 'hover:text-primary-600'}`}
      >
        {formatCurrency(value, currency)}
        {saving && <Loader2 className="w-3 h-3 animate-spin inline ml-1 text-gray-400" />}
      </button>
    );
  }

  return (
    <input
      type="number"
      step="0.01"
      autoFocus
      value={draft}
      onChange={e => setDraft(e.target.value)}
      onBlur={() => {
        setEditing(false);
        const n = parseFloat(draft);
        if (!isNaN(n) && n !== value) onSave(n);
      }}
      className="w-28 text-right text-sm font-semibold border border-primary-400 rounded px-1 py-0.5 dark:bg-gray-700 dark:text-white"
    />
  );
}
