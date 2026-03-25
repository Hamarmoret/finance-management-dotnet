import { useMemo, useState } from 'react';
import { Pencil, Trash2, ChevronDown, RefreshCw } from 'lucide-react';
import type { Income, InvoiceStatus } from '@finance/shared';
import { formatDate, formatCurrencyPrecise } from '../../../utils/formatters';
import { DataTable, ColumnDef, VisibilityState } from '../../../components/DataTable';

interface IncomeTableProps {
  income: Income[];
  onEdit: (income: Income) => void;
  onDelete: (id: string) => void;
  onStatusChange: (id: string, status: string) => void;
  loading?: boolean;
}

const statusColors: Record<InvoiceStatus, string> = {
  draft: 'bg-gray-100 text-gray-700',
  sent: 'bg-blue-100 text-blue-700',
  paid: 'bg-green-100 text-green-700',
  overdue: 'bg-red-100 text-red-700',
  cancelled: 'bg-gray-100 text-gray-500 line-through',
};

const categoryTypeColors: Record<string, string> = {
  retainer: 'bg-purple-100 text-purple-700',
  project: 'bg-blue-100 text-blue-700',
  other: 'bg-gray-100 text-gray-700',
};

function StatusDropdown({
  currentStatus,
  onStatusChange,
}: {
  currentStatus: InvoiceStatus | null;
  onStatusChange: (status: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const statuses: InvoiceStatus[] = ['draft', 'sent', 'paid', 'overdue', 'cancelled'];

  return (
    <div className="relative">
      <button
        onClick={(e) => {
          e.stopPropagation();
          setOpen(!open);
        }}
        className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium ${
          currentStatus ? statusColors[currentStatus] : 'bg-gray-100 text-gray-700'
        }`}
      >
        {currentStatus || 'No status'}
        <ChevronDown className="w-3 h-3" />
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute right-0 mt-1 w-32 bg-white rounded-lg shadow-lg border z-20">
            {statuses.map((status) => (
              <button
                key={status}
                onClick={(e) => {
                  e.stopPropagation();
                  onStatusChange(status);
                  setOpen(false);
                }}
                className={`w-full px-3 py-2 text-left text-sm hover:bg-gray-50 first:rounded-t-lg last:rounded-b-lg ${
                  status === currentStatus ? 'bg-primary-50 text-primary-700' : ''
                }`}
              >
                <span
                  className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${statusColors[status]}`}
                >
                  {status.charAt(0).toUpperCase() + status.slice(1)}
                </span>
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

// Default columns that are visible
const defaultColumnVisibility: VisibilityState = {
  incomeDate: true,
  description: true,
  clientName: true,
  category: true,
  invoiceNumber: true,
  invoiceStatus: true,
  amount: true,
  actions: true,
  // Hidden by default
  paymentDueDate: false,
  paymentReceivedDate: false,
  proformaInvoiceDate: false,
  taxInvoiceDate: false,
  isRecurring: false,
  pnlCenters: false,
  tags: false,
};

export function IncomeTable({
  income,
  onEdit,
  onDelete,
  onStatusChange,
  loading = false,
}: IncomeTableProps) {
  const columns = useMemo<ColumnDef<Income, unknown>[]>(
    () => [
      {
        id: 'incomeDate',
        accessorKey: 'incomeDate',
        header: 'Date',
        cell: ({ row }) => (
          <span className="whitespace-nowrap text-sm text-gray-900">
            {formatDate(row.original.incomeDate)}
          </span>
        ),
      },
      {
        id: 'description',
        accessorKey: 'description',
        header: 'Description',
        cell: ({ row }) => (
          <div className="min-w-[150px]">
            <div className="text-sm font-medium text-gray-900 line-clamp-1">
              {row.original.description}
            </div>
          </div>
        ),
      },
      {
        id: 'clientName',
        accessorKey: 'clientName',
        header: 'Client',
        cell: ({ row }) => (
          <span className="whitespace-nowrap text-sm text-gray-600">
            {row.original.clientName || <span className="text-gray-400">—</span>}
          </span>
        ),
      },
      {
        id: 'category',
        accessorFn: (row) => row.category?.name,
        header: 'Category',
        cell: ({ row }) =>
          row.original.category ? (
            <span
              className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium whitespace-nowrap ${
                categoryTypeColors[row.original.category.type] || 'bg-gray-100 text-gray-700'
              }`}
            >
              {row.original.category.name}
            </span>
          ) : (
            <span className="text-gray-400 text-sm">—</span>
          ),
      },
      {
        id: 'invoiceNumber',
        accessorKey: 'invoiceNumber',
        header: 'Invoice',
        cell: ({ row }) => (
          <span className="whitespace-nowrap text-sm text-gray-600">
            {row.original.invoiceNumber || <span className="text-gray-400">—</span>}
          </span>
        ),
      },
      {
        id: 'invoiceStatus',
        accessorKey: 'invoiceStatus',
        header: 'Status',
        cell: ({ row }) => (
          <StatusDropdown
            currentStatus={row.original.invoiceStatus}
            onStatusChange={(status) => onStatusChange(row.original.id, status)}
          />
        ),
        enableSorting: true,
      },
      {
        id: 'paymentDueDate',
        accessorKey: 'paymentDueDate',
        header: 'Due Date',
        cell: ({ row }) => (
          <span className="whitespace-nowrap text-sm text-gray-600">
            {row.original.paymentDueDate ? formatDate(row.original.paymentDueDate) : '—'}
          </span>
        ),
      },
      {
        id: 'paymentReceivedDate',
        accessorKey: 'paymentReceivedDate',
        header: 'Received',
        cell: ({ row }) => (
          <span className="whitespace-nowrap text-sm text-gray-600">
            {row.original.paymentReceivedDate ? formatDate(row.original.paymentReceivedDate) : '—'}
          </span>
        ),
      },
      {
        id: 'proformaInvoiceDate',
        accessorKey: 'proformaInvoiceDate',
        header: 'Proforma Date',
        cell: ({ row }) => (
          <span className="whitespace-nowrap text-sm text-gray-600">
            {row.original.proformaInvoiceDate ? formatDate(row.original.proformaInvoiceDate) : '—'}
          </span>
        ),
      },
      {
        id: 'taxInvoiceDate',
        accessorKey: 'taxInvoiceDate',
        header: 'Tax Invoice Date',
        cell: ({ row }) => (
          <span className="whitespace-nowrap text-sm text-gray-600">
            {row.original.taxInvoiceDate ? formatDate(row.original.taxInvoiceDate) : '—'}
          </span>
        ),
      },
      {
        id: 'isRecurring',
        accessorKey: 'isRecurring',
        header: 'Recurring',
        cell: ({ row }) => (
          <span
            className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
              row.original.isRecurring
                ? 'bg-purple-100 text-purple-700'
                : 'bg-gray-100 text-gray-600'
            }`}
          >
            {row.original.isRecurring ? (
              <>
                <RefreshCw className="w-3 h-3 mr-1" />
                Yes
              </>
            ) : (
              'One-time'
            )}
          </span>
        ),
      },
      {
        id: 'pnlCenters',
        accessorFn: (row) => row.allocations?.map((a) => a.pnlCenterName).join(', '),
        header: 'P&L Centers',
        cell: ({ row }) => (
          <div className="flex flex-wrap gap-1 max-w-[150px]">
            {row.original.allocations?.slice(0, 2).map((alloc) => (
              <span
                key={alloc.id}
                className="inline-flex items-center px-2 py-0.5 rounded text-xs bg-primary-50 text-primary-700"
                title={`${alloc.percentage}%`}
              >
                {alloc.pnlCenterName}
              </span>
            ))}
            {(row.original.allocations?.length || 0) > 2 && (
              <span className="text-xs text-gray-400">
                +{(row.original.allocations?.length || 0) - 2}
              </span>
            )}
          </div>
        ),
        enableSorting: false,
      },
      {
        id: 'tags',
        accessorFn: (row) => row.tags?.join(', '),
        header: 'Tags',
        cell: ({ row }) => (
          <div className="flex flex-wrap gap-1 max-w-[150px]">
            {row.original.tags?.slice(0, 3).map((tag) => (
              <span
                key={tag}
                className="inline-flex items-center px-2 py-0.5 rounded text-xs bg-gray-100 text-gray-600"
              >
                {tag}
              </span>
            ))}
            {(row.original.tags?.length || 0) > 3 && (
              <span className="text-xs text-gray-400">
                +{(row.original.tags?.length || 0) - 3}
              </span>
            )}
          </div>
        ),
        enableSorting: false,
      },
      {
        id: 'amount',
        accessorKey: 'amount',
        header: 'Amount',
        cell: ({ row }) => (
          <span className="whitespace-nowrap text-sm font-medium text-right text-green-600">
            {formatCurrencyPrecise(row.original.amount)}
          </span>
        ),
        meta: { align: 'right' },
      },
      {
        id: 'actions',
        header: 'Actions',
        cell: ({ row }) => (
          <div className="flex justify-end gap-1">
            <button
              onClick={(e) => {
                e.stopPropagation();
                onEdit(row.original);
              }}
              className="p-2 text-gray-400 hover:text-primary-600 hover:bg-primary-50 rounded-lg transition-colors"
            >
              <Pencil className="w-4 h-4" />
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                if (confirm('Are you sure you want to delete this income record?')) {
                  onDelete(row.original.id);
                }
              }}
              className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        ),
        enableSorting: false,
        meta: { align: 'right' },
      },
    ],
    [onEdit, onDelete, onStatusChange]
  );

  return (
    <DataTable
      data={income}
      columns={columns}
      tableId="income-table"
      defaultSorting={[{ id: 'incomeDate', desc: true }]}
      defaultColumnVisibility={defaultColumnVisibility}
      loading={loading}
      emptyMessage="No income records found"
      onRowClick={(record) => onEdit(record)}
    />
  );
}
