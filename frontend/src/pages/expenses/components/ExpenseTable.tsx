import { useMemo } from 'react';
import { Pencil, Trash2, RefreshCw, Copy } from 'lucide-react';
import type { Expense } from '@finance/shared';
import { formatDate, formatCurrencyPrecise } from '../../../utils/formatters';
import { DataTable, ColumnDef, VisibilityState } from '../../../components/DataTable';

interface ExpenseTableProps {
  expenses: Expense[];
  onEdit: (expense: Expense) => void;
  onDelete: (id: string) => void;
  onDuplicate: (expense: Expense) => void;
  loading?: boolean;
}

const categoryTypeColors: Record<string, string> = {
  fixed: 'bg-blue-100 text-blue-700',
  variable: 'bg-purple-100 text-purple-700',
  salary: 'bg-green-100 text-green-700',
  one_time: 'bg-orange-100 text-orange-700',
};

// Default columns that are visible
const defaultColumnVisibility: VisibilityState = {
  expenseDate: true,
  description: true,
  category: true,
  vendor: true,
  pnlCenters: true,
  amount: true,
  actions: true,
  // Hidden by default
  isRecurring: false,
  tags: false,
  notes: false,
};

export function ExpenseTable({
  expenses,
  onEdit,
  onDelete,
  onDuplicate,
  loading = false,
}: ExpenseTableProps) {
  const columns = useMemo<ColumnDef<Expense, unknown>[]>(
    () => [
      {
        id: 'expenseDate',
        accessorKey: 'expenseDate',
        header: 'Date',
        cell: ({ row }) => (
          <span className="whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
            {formatDate(row.original.expenseDate)}
          </span>
        ),
      },
      {
        id: 'description',
        accessorKey: 'description',
        header: 'Description',
        cell: ({ row }) => (
          <div className="min-w-[150px]">
            <div className="text-sm font-medium text-gray-900 dark:text-gray-100 line-clamp-1">
              {row.original.description}
            </div>
            {row.original.tags && row.original.tags.length > 0 && (
              <div className="flex gap-1 mt-1">
                {row.original.tags.slice(0, 3).map((tag) => (
                  <span
                    key={tag}
                    className="inline-flex items-center px-2 py-0.5 rounded text-xs bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300"
                  >
                    {tag}
                  </span>
                ))}
                {row.original.tags.length > 3 && (
                  <span className="text-xs text-gray-400">
                    +{row.original.tags.length - 3}
                  </span>
                )}
              </div>
            )}
          </div>
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
        id: 'vendor',
        accessorKey: 'vendor',
        header: 'Payee / Vendor',
        cell: ({ row }) => (
          <span className="whitespace-nowrap text-sm text-gray-600 dark:text-gray-400">
            {row.original.vendor || <span className="text-gray-400">—</span>}
          </span>
        ),
      },
      {
        id: 'pnlCenters',
        accessorFn: (row) => row.allocations?.map((a) => a.pnlCenterName).join(', '),
        header: 'P&L Centers',
        cell: ({ row }) => (
          <div className="flex flex-wrap gap-1 max-w-[150px]">
            {row.original.allocations.slice(0, 2).map((alloc) => (
              <span
                key={alloc.id}
                className="inline-flex items-center px-2 py-0.5 rounded text-xs bg-primary-50 text-primary-700"
                title={`${alloc.percentage}%`}
              >
                {alloc.pnlCenterName}
              </span>
            ))}
            {row.original.allocations.length > 2 && (
              <span className="text-xs text-gray-400">
                +{row.original.allocations.length - 2}
              </span>
            )}
          </div>
        ),
        enableSorting: false,
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
        id: 'tags',
        accessorFn: (row) => row.tags?.join(', '),
        header: 'Tags',
        cell: ({ row }) => (
          <div className="flex flex-wrap gap-1 max-w-[150px]">
            {row.original.tags?.slice(0, 3).map((tag) => (
              <span
                key={tag}
                className="inline-flex items-center px-2 py-0.5 rounded text-xs bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300"
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
        id: 'notes',
        accessorKey: 'notes',
        header: 'Notes',
        cell: ({ row }) => (
          <span className="text-sm text-gray-600 dark:text-gray-400 line-clamp-1 max-w-[150px]">
            {row.original.notes || <span className="text-gray-400">—</span>}
          </span>
        ),
      },
      {
        id: 'amount',
        accessorKey: 'amount',
        header: 'Amount',
        cell: ({ row }) => (
          <span className="whitespace-nowrap text-sm font-medium text-right text-red-600">
            {formatCurrencyPrecise(row.original.amount, row.original.currency)}
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
              onClick={(e) => { e.stopPropagation(); onEdit(row.original); }}
              className="p-2 text-gray-400 hover:text-primary-600 hover:bg-primary-50 rounded-lg transition-colors"
              title="Edit"
            >
              <Pencil className="w-4 h-4" />
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); onDuplicate(row.original); }}
              className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
              title="Duplicate"
            >
              <Copy className="w-4 h-4" />
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                if (confirm('Are you sure you want to delete this expense?')) {
                  onDelete(row.original.id);
                }
              }}
              className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
              title="Delete"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        ),
        enableSorting: false,
        meta: { align: 'right' },
      },
    ],
    [onEdit, onDelete, onDuplicate]
  );

  return (
    <DataTable
      data={expenses}
      columns={columns}
      tableId="expense-table"
      defaultSorting={[{ id: 'expenseDate', desc: true }]}
      defaultColumnVisibility={defaultColumnVisibility}
      loading={loading}
      emptyMessage="No expense records found"
      onRowClick={(expense) => onEdit(expense)}
    />
  );
}
