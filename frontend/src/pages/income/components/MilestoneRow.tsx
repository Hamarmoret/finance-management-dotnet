import { useState } from 'react';
import { CheckCircle, Trash2, Loader2, ExternalLink, Paperclip, Pencil, Check, RotateCcw } from 'lucide-react';
import type { IncomeMilestone, MilestoneStatus, ContractAttachment } from '@finance/shared';
import DocumentsPanel from './DocumentsPanel';
import { api, getErrorMessage } from '../../../services/api';
import { formatCurrency } from '../../../utils/formatters';
import { MilestoneStatusBadge } from './MilestoneStatusBadge';
import MarkPaidModal from './MarkPaidModal';

interface MilestoneRowProps {
  milestone: IncomeMilestone;
  contractId: string;
  contractCurrency: string;
  contractTotalValue: number;
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
  contractTotalValue,
  onUpdated,
  onDeleted,
}: MilestoneRowProps) {
  const [saving, setSaving] = useState<string | null>(null);
  const [editMode, setEditMode] = useState(false);
  const [showMarkPaid, setShowMarkPaid] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [unmarking, setUnmarking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showDocs, setShowDocs] = useState(false);
  const [attachments, setAttachments] = useState<ContractAttachment[]>(milestone.attachments ?? []);

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

  const handleUnmarkPaid = async () => {
    if (!confirm('Revert this milestone to unpaid? The linked income record will be deleted.')) return;
    setUnmarking(true);
    setError(null);
    try {
      const res = await api.post(`/income-contracts/milestones/${milestone.id}/unmark-paid`);
      onUpdated(res.data.data);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setUnmarking(false);
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
                editMode={editMode}
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
                editMode={editMode}
                saving={saving === 'proformaInvoiceNumber'}
                onSave={v => saveField('proformaInvoiceNumber', v || null)}
              />
              <InlineField
                label="Proforma Date"
                type="date"
                value={milestone.proformaInvoiceDate ?? ''}
                disabled={milestone.status === 'paid'}
                editMode={editMode}
                saving={saving === 'proformaInvoiceDate'}
                onSave={v => saveField('proformaInvoiceDate', v || null)}
              />
              <InlineField
                label="Tax Invoice #"
                value={milestone.taxInvoiceNumber ?? ''}
                disabled={milestone.status === 'paid'}
                editMode={editMode}
                saving={saving === 'taxInvoiceNumber'}
                onSave={v => saveField('taxInvoiceNumber', v || null)}
              />
              <InlineField
                label="Tax Invoice Date"
                type="date"
                value={milestone.taxInvoiceDate ?? ''}
                disabled={milestone.status === 'paid'}
                editMode={editMode}
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

          {/* Amount + percentage + due date + actions */}
          <div className="flex items-center gap-3 shrink-0">
            <div className="text-right">
              <div className="flex items-center gap-1.5 justify-end">
                <InlineAmount
                  value={milestone.amountDue}
                  disabled={milestone.status === 'paid'}
                  editMode={editMode}
                  saving={saving === 'amountDue'}
                  onSave={v => saveField('amountDue', v)}
                  currency={contractCurrency}
                />
                {contractTotalValue > 0 && (
                  <span className="text-xs text-gray-400 dark:text-gray-500 font-normal">
                    ({((milestone.amountDue / contractTotalValue) * 100).toFixed(1)}%)
                  </span>
                )}
              </div>
              <InlineField
                label="Due"
                type="date"
                value={milestone.dueDate}
                disabled={milestone.status === 'paid'}
                editMode={editMode}
                saving={saving === 'dueDate'}
                onSave={v => saveField('dueDate', v)}
                className="text-xs text-gray-400 dark:text-gray-500"
              />
            </div>

            <div className="flex gap-1">
              <button
                onClick={() => setShowDocs(v => !v)}
                className={`btn btn-ghost btn-sm relative ${showDocs ? 'text-primary-600 dark:text-primary-400' : 'text-gray-400 hover:text-gray-600'}`}
                title="Documents"
              >
                <Paperclip className="w-4 h-4" />
                {attachments.length > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 w-3.5 h-3.5 bg-primary-500 text-white text-[9px] rounded-full flex items-center justify-center leading-none">
                    {attachments.length}
                  </span>
                )}
              </button>
              {milestone.status !== 'paid' && (
                <button
                  onClick={() => setEditMode(v => !v)}
                  className={`btn btn-ghost btn-sm ${editMode ? 'text-primary-600 dark:text-primary-400 bg-primary-50 dark:bg-primary-900/20' : 'text-gray-400 hover:text-gray-600'}`}
                  title={editMode ? 'Done editing' : 'Edit milestone'}
                >
                  {editMode ? <Check className="w-4 h-4" /> : <Pencil className="w-4 h-4" />}
                </button>
              )}
              {milestone.status !== 'paid' && (
                <button
                  onClick={() => setShowMarkPaid(true)}
                  className="btn btn-ghost btn-sm text-success-600 dark:text-success-400 hover:bg-success-50 dark:hover:bg-success-900/20"
                  title="Mark as paid"
                >
                  <CheckCircle className="w-4 h-4" />
                </button>
              )}
              {milestone.status === 'paid' && (
                <button
                  onClick={handleUnmarkPaid}
                  disabled={unmarking}
                  className="btn btn-ghost btn-sm text-warning-600 dark:text-warning-500 hover:bg-warning-50"
                  title="Revert payment"
                >
                  {unmarking ? <Loader2 className="w-4 h-4 animate-spin" /> : <RotateCcw className="w-4 h-4" />}
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

        {/* Documents panel */}
        {showDocs && (
          <div className="mt-3 pt-3 border-t border-gray-100 dark:border-gray-700">
            <DocumentsPanel
              attachments={attachments}
              entityType="milestone"
              entityId={milestone.id}
              onAttachmentsChanged={setAttachments}
              allowedTypes={['proforma_invoice', 'tax_invoice', 'payment_receipt', 'other']}
            />
          </div>
        )}
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
  editMode,
  saving,
  onSave,
  className = '',
}: {
  value: string;
  disabled: boolean;
  editMode: boolean;
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
        className={`bg-transparent border-0 border-b outline-none p-0 ${className} ${
          disabled
            ? 'cursor-default border-transparent'
            : editMode
              ? 'border-primary-400 dark:border-primary-500 bg-primary-50/30 dark:bg-primary-900/10 px-1 rounded'
              : 'border-transparent hover:border-gray-300 dark:hover:border-gray-500 focus:border-primary-500'
        }`}
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
  editMode,
  saving,
  onSave,
  className = '',
}: {
  label: string;
  value: string;
  type?: string;
  disabled: boolean;
  editMode: boolean;
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
          className={`bg-transparent border-0 border-b outline-none p-0 text-xs w-full ${
            disabled
              ? 'cursor-default border-transparent'
              : editMode
                ? 'border-primary-400 dark:border-primary-500'
                : 'border-transparent hover:border-gray-300 dark:hover:border-gray-500 focus:border-primary-500'
          }`}
        />
        {saving && <Loader2 className="w-3 h-3 animate-spin text-gray-400" />}
      </span>
    </div>
  );
}

function InlineAmount({
  value,
  disabled,
  editMode,
  saving,
  onSave,
  currency,
}: {
  value: number;
  disabled: boolean;
  editMode: boolean;
  saving: boolean;
  onSave: (v: number) => void;
  currency: string;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value.toString());

  // In editMode, always show the input
  if (editMode && !disabled) {
    return (
      <input
        type="number"
        step="0.01"
        value={draft}
        onChange={e => setDraft(e.target.value)}
        onBlur={() => {
          const n = parseFloat(draft);
          if (!isNaN(n) && n !== value) onSave(n);
        }}
        className="w-28 text-right text-sm font-semibold border border-primary-400 dark:border-primary-500 rounded px-1 py-0.5 dark:bg-gray-700 dark:text-white"
      />
    );
  }

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
