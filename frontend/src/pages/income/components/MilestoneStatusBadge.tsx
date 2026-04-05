import type { MilestoneStatus } from '@finance/shared';

const STATUS_CONFIG: Record<MilestoneStatus, { label: string; className: string }> = {
  pending: {
    label: 'Pending',
    className: 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300',
  },
  proforma_issued: {
    label: 'Proforma Issued',
    className: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
  },
  invoice_sent: {
    label: 'Invoice Sent',
    className: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300',
  },
  paid: {
    label: 'Paid',
    className: 'bg-success-100 text-success-700 dark:bg-success-900/20 dark:text-success-400',
  },
  overdue: {
    label: 'Overdue',
    className: 'bg-danger-100 text-danger-700 dark:bg-danger-900/20 dark:text-danger-400',
  },
};

export function MilestoneStatusBadge({ status }: { status: MilestoneStatus }) {
  const config = STATUS_CONFIG[status] ?? STATUS_CONFIG.pending;
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${config.className}`}>
      {config.label}
    </span>
  );
}
