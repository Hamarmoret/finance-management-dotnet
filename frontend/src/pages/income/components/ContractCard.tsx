import { AlertTriangle, Clock, CheckCircle } from 'lucide-react';
import type { IncomeContractSummary } from '@finance/shared';
import { formatCurrency } from '../../../utils/formatters';

interface ContractCardProps {
  contract: IncomeContractSummary;
  onClick: () => void;
}

const TYPE_STYLE: Record<string, string> = {
  project: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300',
  retainer: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
};

const STATUS_STYLE: Record<string, string> = {
  active: 'bg-success-100 text-success-700 dark:bg-success-900/20 dark:text-success-400',
  completed: 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300',
  cancelled: 'bg-danger-100 text-danger-600 dark:bg-danger-900/20 dark:text-danger-400',
  on_hold: 'bg-warning-100 text-warning-700 dark:bg-warning-900/20 dark:text-warning-400',
};

export default function ContractCard({ contract, onClick }: ContractCardProps) {
  const progressPct = contract.totalValue > 0
    ? Math.min((contract.totalPaid / contract.totalValue) * 100, 100)
    : 0;

  return (
    <button
      onClick={onClick}
      className="card p-4 text-left w-full hover:shadow-md transition-shadow cursor-pointer"
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-gray-900 dark:text-white text-sm truncate">{contract.title}</h3>
          {contract.clientName && (
            <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{contract.clientName}</p>
          )}
        </div>
        <div className="flex gap-1 shrink-0">
          <span className={`px-1.5 py-0.5 rounded text-xs font-medium ${TYPE_STYLE[contract.contractType] ?? ''}`}>
            {contract.contractType}
          </span>
          <span className={`px-1.5 py-0.5 rounded text-xs font-medium ${STATUS_STYLE[contract.status] ?? ''}`}>
            {contract.status.replace('_', ' ')}
          </span>
        </div>
      </div>

      {/* Contract number */}
      {contract.contractNumber && (
        <p className="text-xs text-gray-400 dark:text-gray-500 mb-2">{contract.contractNumber}</p>
      )}

      {/* Financial summary */}
      <div className="flex justify-between text-xs mb-1">
        <span className="text-gray-500 dark:text-gray-400">
          {formatCurrency(contract.totalPaid, contract.currency)} collected
        </span>
        <span className="font-medium text-gray-700 dark:text-gray-300">
          {formatCurrency(contract.totalValue, contract.currency)}
        </span>
      </div>

      {/* Progress bar */}
      <div className="h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden mb-2">
        <div
          className={`h-full rounded-full transition-all ${progressPct >= 100 ? 'bg-success-500' : 'bg-primary-500'}`}
          style={{ width: `${progressPct}%` }}
        />
      </div>

      {/* Alerts row */}
      <div className="flex gap-3 text-xs">
        {contract.overdueCount > 0 && (
          <span className="flex items-center gap-1 text-danger-600 dark:text-danger-400">
            <AlertTriangle className="w-3 h-3" />
            {contract.overdueCount} overdue
          </span>
        )}
        {contract.upcomingCount > 0 && (
          <span className="flex items-center gap-1 text-warning-600 dark:text-warning-400">
            <Clock className="w-3 h-3" />
            {contract.upcomingCount} due soon
          </span>
        )}
        {contract.overdueCount === 0 && contract.upcomingCount === 0 && contract.milestoneCount > 0 && (
          <span className="flex items-center gap-1 text-gray-400 dark:text-gray-500">
            <CheckCircle className="w-3 h-3" />
            {contract.paidCount}/{contract.milestoneCount} paid
          </span>
        )}
      </div>
    </button>
  );
}
