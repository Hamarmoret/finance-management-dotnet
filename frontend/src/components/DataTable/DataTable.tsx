import { useState, useMemo, useCallback } from 'react';
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  flexRender,
  ColumnDef,
  SortingState,
  VisibilityState,
  ColumnOrderState,
} from '@tanstack/react-table';
import { ChevronUp, ChevronDown, Settings2, GripVertical } from 'lucide-react';

interface DataTableProps<TData> {
  data: TData[];
  columns: ColumnDef<TData, unknown>[];
  tableId: string; // Used for localStorage key
  defaultSorting?: SortingState;
  defaultColumnVisibility?: VisibilityState;
  onRowClick?: (row: TData) => void;
  loading?: boolean;
  emptyMessage?: string;
}

function useTablePreferences(tableId: string) {
  const storageKey = `table-preferences-${tableId}`;

  const getStoredPreferences = useCallback(() => {
    try {
      const stored = localStorage.getItem(storageKey);
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  }, [storageKey]);

  const setStoredPreferences = useCallback(
    (preferences: {
      columnVisibility?: VisibilityState;
      columnOrder?: ColumnOrderState;
      sorting?: SortingState;
    }) => {
      try {
        const current = getStoredPreferences() || {};
        localStorage.setItem(
          storageKey,
          JSON.stringify({ ...current, ...preferences })
        );
      } catch {
        // Silently fail if localStorage is not available
      }
    },
    [storageKey, getStoredPreferences]
  );

  return { getStoredPreferences, setStoredPreferences };
}

export function DataTable<TData>({
  data,
  columns,
  tableId,
  defaultSorting = [],
  defaultColumnVisibility = {},
  onRowClick,
  loading = false,
  emptyMessage = 'No data available',
}: DataTableProps<TData>) {
  const { getStoredPreferences, setStoredPreferences } = useTablePreferences(tableId);
  const storedPrefs = useMemo(() => getStoredPreferences(), [getStoredPreferences]);

  const [sorting, setSorting] = useState<SortingState>(
    storedPrefs?.sorting || defaultSorting
  );
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>(
    storedPrefs?.columnVisibility || defaultColumnVisibility
  );
  const [columnOrder, setColumnOrder] = useState<ColumnOrderState>(
    storedPrefs?.columnOrder || []
  );
  const [showColumnMenu, setShowColumnMenu] = useState(false);

  // Update localStorage when preferences change
  const handleSortingChange = useCallback(
    (updater: SortingState | ((prev: SortingState) => SortingState)) => {
      setSorting((prev) => {
        const newSorting = typeof updater === 'function' ? updater(prev) : updater;
        setStoredPreferences({ sorting: newSorting });
        return newSorting;
      });
    },
    [setStoredPreferences]
  );

  const handleColumnVisibilityChange = useCallback(
    (updater: VisibilityState | ((prev: VisibilityState) => VisibilityState)) => {
      setColumnVisibility((prev) => {
        const newVisibility = typeof updater === 'function' ? updater(prev) : updater;
        setStoredPreferences({ columnVisibility: newVisibility });
        return newVisibility;
      });
    },
    [setStoredPreferences]
  );

  const handleColumnOrderChange = useCallback(
    (updater: ColumnOrderState | ((prev: ColumnOrderState) => ColumnOrderState)) => {
      setColumnOrder((prev) => {
        const newOrder = typeof updater === 'function' ? updater(prev) : updater;
        setStoredPreferences({ columnOrder: newOrder });
        return newOrder;
      });
    },
    [setStoredPreferences]
  );

  const table = useReactTable({
    data,
    columns,
    state: {
      sorting,
      columnVisibility,
      columnOrder,
    },
    onSortingChange: handleSortingChange,
    onColumnVisibilityChange: handleColumnVisibilityChange,
    onColumnOrderChange: handleColumnOrderChange,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
  });

  const allColumns = table.getAllLeafColumns();
  const visibleColumns = table.getVisibleLeafColumns();

  return (
    <div className="bg-white rounded-xl border overflow-hidden">
      {/* Column Visibility Menu */}
      <div className="flex justify-end p-2 border-b">
        <div className="relative">
          <button
            onClick={() => setShowColumnMenu(!showColumnMenu)}
            className="flex items-center gap-2 px-3 py-1.5 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <Settings2 className="w-4 h-4" />
            Columns ({visibleColumns.length}/{allColumns.length})
          </button>

          {showColumnMenu && (
            <>
              <div
                className="fixed inset-0 z-40"
                onClick={() => setShowColumnMenu(false)}
              />
              <div className="absolute right-0 mt-1 w-64 bg-white rounded-lg shadow-lg border z-50 py-2 max-h-96 overflow-y-auto">
                <div className="px-3 py-2 text-xs font-medium text-gray-500 uppercase tracking-wider border-b mb-1">
                  Show/Hide Columns
                </div>
                {allColumns
                  .filter((col) => col.id !== 'actions') // Don't allow hiding actions column
                  .map((column) => (
                    <label
                      key={column.id}
                      className="flex items-center gap-3 px-3 py-2 hover:bg-gray-50 cursor-pointer"
                    >
                      <GripVertical className="w-4 h-4 text-gray-400" />
                      <input
                        type="checkbox"
                        checked={column.getIsVisible()}
                        onChange={column.getToggleVisibilityHandler()}
                        className="h-4 w-4 text-primary-600 rounded border-gray-300 focus:ring-primary-500"
                      />
                      <span className="text-sm text-gray-700 capitalize">
                        {typeof column.columnDef.header === 'string'
                          ? column.columnDef.header
                          : column.id.replace(/([A-Z])/g, ' $1').trim()}
                      </span>
                    </label>
                  ))}
                <div className="border-t mt-2 pt-2 px-3">
                  <button
                    onClick={() => {
                      table.resetColumnVisibility();
                      setStoredPreferences({ columnVisibility: {} });
                    }}
                    className="text-sm text-primary-600 hover:text-primary-700"
                  >
                    Reset to default
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50 border-b">
            {table.getHeaderGroups().map((headerGroup) => (
              <tr key={headerGroup.id}>
                {headerGroup.headers.map((header) => {
                  const canSort = header.column.getCanSort();
                  const sortDirection = header.column.getIsSorted();

                  return (
                    <th
                      key={header.id}
                      className={`px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider ${
                        canSort ? 'cursor-pointer select-none hover:bg-gray-100' : ''
                      }`}
                      onClick={canSort ? header.column.getToggleSortingHandler() : undefined}
                      style={{ width: header.getSize() }}
                    >
                      <div className="flex items-center gap-1">
                        {header.isPlaceholder
                          ? null
                          : flexRender(header.column.columnDef.header, header.getContext())}
                        {canSort && (
                          <span className="flex flex-col">
                            <ChevronUp
                              className={`w-3 h-3 -mb-1 ${
                                sortDirection === 'asc' ? 'text-primary-600' : 'text-gray-400'
                              }`}
                            />
                            <ChevronDown
                              className={`w-3 h-3 ${
                                sortDirection === 'desc' ? 'text-primary-600' : 'text-gray-400'
                              }`}
                            />
                          </span>
                        )}
                      </div>
                    </th>
                  );
                })}
              </tr>
            ))}
          </thead>
          <tbody className="divide-y divide-gray-200">
            {loading ? (
              <tr>
                <td
                  colSpan={visibleColumns.length}
                  className="px-4 py-12 text-center"
                >
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 mx-auto"></div>
                </td>
              </tr>
            ) : table.getRowModel().rows.length === 0 ? (
              <tr>
                <td
                  colSpan={visibleColumns.length}
                  className="px-4 py-12 text-center text-gray-500"
                >
                  {emptyMessage}
                </td>
              </tr>
            ) : (
              table.getRowModel().rows.map((row) => (
                <tr
                  key={row.id}
                  className={`hover:bg-gray-50 ${
                    onRowClick ? 'cursor-pointer' : ''
                  }`}
                  onClick={() => onRowClick?.(row.original)}
                >
                  {row.getVisibleCells().map((cell) => (
                    <td key={cell.id} className="px-4 py-3">
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export type { ColumnDef, SortingState, VisibilityState };
