import { useState } from 'react';
import {
  ArrowLeft,
  Plus,
  RefreshCw,
  AlertTriangle,
  CheckCircle,
  Clock,
  DollarSign,
  Loader2,
  Paperclip,
} from 'lucide-react';
import type { IncomeContract, IncomeMilestone, ContractAttachment } from '@finance/shared';
import { api, getErrorMessage } from '../../../services/api';
import { formatCurrency } from '../../../utils/formatters';
import MilestoneRow from './MilestoneRow';
import GenerateRetainerModal from './GenerateRetainerModal';
import DocumentsPanel from './DocumentsPanel';

interface ContractDetailViewProps {
  contract: IncomeContract;
  onBack: () => void;
  onContractUpdated: (c: IncomeContract) => void;
}

export default function ContractDetailView({ contract, onBack, onContractUpdated: _onContractUpdated }: ContractDetailViewProps) {
  const [milestones, setMilestones] = useState<IncomeMilestone[]>(contract.milestones);
  const [attachments, setAttachments] = useState<ContractAttachment[]>(contract.attachments ?? []);
  const [showDocuments, setShowDocuments] = useState(false);
  const [showGenerateModal, setShowGenerateModal] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Inline new-milestone form
  const [showAddForm, setShowAddForm] = useState(false);
  const [newDesc, setNewDesc] = useState('');
  const [newAmount, setNewAmount] = useState('');
  const [newDueDate, setNewDueDate] = useState(new Date().toISOString().split('T')[0]);
  const [savingNew, setSavingNew] = useState(false);

  const handleMilestoneUpdated = (updated: IncomeMilestone) => {
    setMilestones(prev => prev.map(m => m.id === updated.id ? updated : m));
  };

  const handleMilestoneDeleted = (id: string) => {
    setMilestones(prev => prev.filter(m => m.id !== id));
  };

  const handleSaveNewMilestone = async () => {
    if (!newDesc.trim() || !newAmount || !newDueDate) return;
    const amount = parseFloat(newAmount);
    if (isNaN(amount) || amount <= 0) { setError('Amount must be greater than 0'); return; }
    setSavingNew(true);
    setError(null);
    try {
      const res = await api.post(`/income-contracts/${contract.id}/milestones`, {
        description: newDesc.trim(),
        amountDue: amount,
        dueDate: newDueDate,
        sortOrder: milestones.length,
      });
      setMilestones(prev => [...prev, res.data.data]);
      setNewDesc('');
      setNewAmount('');
      setNewDueDate(new Date().toISOString().split('T')[0]);
      setShowAddForm(false);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setSavingNew(false);
    }
  };

  const handleGenerated = (newMilestones: IncomeMilestone[]) => {
    setMilestones(prev => [...prev, ...newMilestones]);
    setShowGenerateModal(false);
  };

  // Derived stats from local milestone state
  const totalPaid = milestones
    .filter(m => m.status === 'paid')
    .reduce((s, m) => s + (m.actualAmountPaid ?? m.amountDue), 0);
  const totalOutstanding = milestones
    .filter(m => m.status !== 'paid')
    .reduce((s, m) => s + m.amountDue, 0);
  const overdueCount = milestones.filter(m => m.status === 'overdue').length;
  const paidCount = milestones.filter(m => m.status === 'paid').length;
  const progressPct = contract.totalValue > 0 ? (totalPaid / contract.totalValue) * 100 : 0;

  const STATUS_LABEL: Record<string, string> = {
    active: 'Active',
    completed: 'Completed',
    cancelled: 'Cancelled',
    on_hold: 'On Hold',
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start gap-4">
        <button onClick={onBack} className="btn btn-ghost btn-sm mt-1">
          <ArrowLeft className="w-4 h-4" />
        </button>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white truncate">{contract.title}</h2>
            <span className="text-xs text-gray-400 dark:text-gray-500">{contract.contractNumber}</span>
            <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
              contract.contractType === 'retainer'
                ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300'
                : 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300'
            }`}>
              {contract.contractType}
            </span>
            <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
              contract.status === 'active'
                ? 'bg-success-100 text-success-700 dark:bg-success-900/20 dark:text-success-400'
                : 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300'
            }`}>
              {STATUS_LABEL[contract.status] ?? contract.status}
            </span>
          </div>
          {contract.clientName && (
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">{contract.clientName}</p>
          )}
        </div>
      </div>

      {/* Stats bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <StatCard
          icon={<DollarSign className="w-4 h-4 text-primary-600" />}
          label="Contract Value"
          value={formatCurrency(contract.totalValue, contract.currency)}
        />
        <StatCard
          icon={<CheckCircle className="w-4 h-4 text-success-600" />}
          label="Collected"
          value={formatCurrency(totalPaid, contract.currency)}
          sub={`${paidCount} / ${milestones.length} milestones`}
        />
        <StatCard
          icon={<Clock className="w-4 h-4 text-warning-600" />}
          label="Outstanding"
          value={formatCurrency(totalOutstanding, contract.currency)}
        />
        {overdueCount > 0 ? (
          <StatCard
            icon={<AlertTriangle className="w-4 h-4 text-danger-600" />}
            label="Overdue"
            value={`${overdueCount} payment${overdueCount > 1 ? 's' : ''}`}
            valueClassName="text-danger-600 dark:text-danger-400"
          />
        ) : (
          <StatCard
            icon={<CheckCircle className="w-4 h-4 text-success-600" />}
            label="Overdue"
            value="None"
            valueClassName="text-success-600 dark:text-success-400"
          />
        )}
      </div>

      {/* Progress bar */}
      <div>
        <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400 mb-1">
          <span>Collection progress</span>
          <span>{progressPct.toFixed(0)}%</span>
        </div>
        <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
          <div
            className="h-full bg-success-500 rounded-full transition-all"
            style={{ width: `${Math.min(progressPct, 100)}%` }}
          />
        </div>
      </div>

      {/* Milestones section */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
            Milestones ({milestones.length})
          </h3>
          <div className="flex gap-2">
            {contract.contractType === 'retainer' && (
              <button
                onClick={() => setShowGenerateModal(true)}
                className="btn btn-outline btn-sm"
              >
                <RefreshCw className="w-3.5 h-3.5 mr-1" />
                Generate Months
              </button>
            )}
            <button
              onClick={() => setShowAddForm(v => !v)}
              className="btn btn-primary btn-sm"
            >
              <Plus className="w-3.5 h-3.5 mr-1" />
              Add Milestone
            </button>
          </div>
        </div>

        {error && (
          <div className="mb-3 p-3 bg-danger-50 dark:bg-danger-900/20 border border-danger-200 dark:border-danger-800 rounded-lg text-sm text-danger-700 dark:text-danger-400">
            {error}
          </div>
        )}

        {/* Inline add form */}
        {showAddForm && (
          <div className="mb-3 p-3 bg-gray-50 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-600 rounded-lg">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-3">
              <div className="sm:col-span-1">
                <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Description *</label>
                <input
                  type="text"
                  value={newDesc}
                  onChange={e => setNewDesc(e.target.value)}
                  placeholder="e.g. 50% deposit"
                  className="input w-full text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                  autoFocus
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Amount ({contract.currency}) *</label>
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  value={newAmount}
                  onChange={e => setNewAmount(e.target.value)}
                  placeholder="0.00"
                  className="input w-full text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Due Date *</label>
                <input
                  type="date"
                  value={newDueDate}
                  onChange={e => setNewDueDate(e.target.value)}
                  className="input w-full text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                />
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <button onClick={() => setShowAddForm(false)} className="btn btn-ghost btn-sm">Cancel</button>
              <button
                onClick={handleSaveNewMilestone}
                disabled={savingNew || !newDesc.trim() || !newAmount || !newDueDate}
                className="btn btn-primary btn-sm"
              >
                {savingNew ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" /> : null}
                Save Milestone
              </button>
            </div>
          </div>
        )}

        {milestones.length === 0 ? (
          <div className="text-center py-12 text-gray-400 dark:text-gray-500 text-sm">
            No milestones yet. Add one above{contract.contractType === 'retainer' ? ' or generate monthly payments' : ''}.
          </div>
        ) : (
          <div className="space-y-2">
            {[...milestones]
              .sort((a, b) => a.sortOrder - b.sortOrder || a.dueDate.localeCompare(b.dueDate))
              .map(m => (
                <MilestoneRow
                  key={m.id}
                  milestone={m}
                  contractId={contract.id}
                  contractCurrency={contract.currency}
                  onUpdated={handleMilestoneUpdated}
                  onDeleted={handleMilestoneDeleted}
                />
              ))
            }
          </div>
        )}
      </div>

      {/* Contract Documents */}
      <div>
        <button
          onClick={() => setShowDocuments(v => !v)}
          className="flex items-center gap-2 text-sm font-semibold text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white"
        >
          <Paperclip className="w-4 h-4" />
          Documents ({attachments.length})
          <span className="text-xs font-normal text-gray-400 ml-1">{showDocuments ? '▲' : '▼'}</span>
        </button>
        {showDocuments && (
          <div className="mt-3 p-4 card">
            <DocumentsPanel
              attachments={attachments}
              entityType="contract"
              entityId={contract.id}
              onAttachmentsChanged={setAttachments}
              allowedTypes={['contract', 'proposal', 'other']}
            />
          </div>
        )}
      </div>

      {showGenerateModal && (
        <GenerateRetainerModal
          contract={contract}
          onClose={() => setShowGenerateModal(false)}
          onGenerated={handleGenerated}
        />
      )}
    </div>
  );
}

function StatCard({
  icon,
  label,
  value,
  sub,
  valueClassName = 'text-gray-900 dark:text-white',
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  sub?: string;
  valueClassName?: string;
}) {
  return (
    <div className="card p-4">
      <div className="flex items-center gap-2 mb-1">
        {icon}
        <span className="text-xs text-gray-500 dark:text-gray-400">{label}</span>
      </div>
      <p className={`text-lg font-bold ${valueClassName}`}>{value}</p>
      {sub && <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">{sub}</p>}
    </div>
  );
}
