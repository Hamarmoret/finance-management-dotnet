import { useState, Fragment } from 'react';
import { X, TrendingUp, TrendingDown, ChevronDown, ChevronRight } from 'lucide-react';
import { formatCurrency, formatCurrencyPrecise } from '../../../utils/formatters';

export interface DrillDownItem {
  id: string;
  date: string;           // "YYYY-MM-DD"
  description: string;
  amount: number;
  currency: string;
  category: string | null;
  vendorOrClient: string | null;
  type: 'income' | 'expense';
  notes?: string | null;
  invoiceStatus?: string | null;
  pnlCenters?: string[];
}

interface DrillDownModalProps {
  title: string;
  subtitle?: string;
  items: DrillDownItem[];
  onClose: () => void;
}

export function DrillDownModal({ title, subtitle, items, onClose }: DrillDownModalProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const incomeItems = items.filter(i => i.type === 'income');
  const expenseItems = items.filter(i => i.type === 'expense');
  const totalIncome = incomeItems.reduce((s, i) => s + i.amount, 0);
  const totalExpenses = expenseItems.reduce((s, i) => s + i.amount, 0);
  const hasMixed = incomeItems.length > 0 && expenseItems.length > 0;

  const sortedItems = [...items].sort((a, b) => b.date.localeCompare(a.date));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-2xl max-h-[85vh] flex flex-col">

        {/* Header */}
        <div className="flex items-start justify-between px-5 py-4 border-b dark:border-gray-700 shrink-0">
          <div>
            <h2 className="text-base font-semibold text-gray-900 dark:text-white">{title}</h2>
            {subtitle && <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">{subtitle}</p>}
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 shrink-0 ml-4"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Summary bar */}
        {items.length > 0 && (
          <div className="flex items-center gap-5 px-5 py-2.5 border-b dark:border-gray-700 bg-gray-50 dark:bg-gray-700/30 shrink-0 text-sm flex-wrap">
            {(hasMixed || totalIncome > 0) && (
              <span className="flex items-center gap-1.5">
                <TrendingUp className="w-3.5 h-3.5 text-success-500" />
                <span className="text-gray-500 dark:text-gray-400">Income:</span>
                <span className="font-medium text-success-600 dark:text-success-400">{formatCurrency(totalIncome)}</span>
              </span>
            )}
            {(hasMixed || totalExpenses > 0) && (
              <span className="flex items-center gap-1.5">
                <TrendingDown className="w-3.5 h-3.5 text-danger-500" />
                <span className="text-gray-500 dark:text-gray-400">Expenses:</span>
                <span className="font-medium text-danger-600 dark:text-danger-400">{formatCurrency(totalExpenses)}</span>
              </span>
            )}
            {hasMixed && (
              <span className="flex items-center gap-1.5">
                <span className="text-gray-500 dark:text-gray-400">Net:</span>
                <span className={`font-medium ${totalIncome - totalExpenses >= 0 ? 'text-success-600 dark:text-success-400' : 'text-danger-600 dark:text-danger-400'}`}>
                  {formatCurrency(totalIncome - totalExpenses)}
                </span>
              </span>
            )}
            <span className="text-gray-400 dark:text-gray-500 ml-auto text-xs">
              {items.length} item{items.length !== 1 ? 's' : ''}
            </span>
          </div>
        )}

        {/* Items table */}
        <div className="flex-1 overflow-y-auto">
          {items.length === 0 ? (
            <div className="p-10 text-center text-sm text-gray-400 dark:text-gray-500">No records in this selection</div>
          ) : (
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-gray-50 dark:bg-gray-700/90 z-10">
                <tr>
                  <th className="px-4 py-2.5 text-left text-xs font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wide">Date</th>
                  <th className="px-4 py-2.5 text-left text-xs font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wide">Description</th>
                  <th className="px-4 py-2.5 text-left text-xs font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wide hidden sm:table-cell">Category</th>
                  <th className="px-4 py-2.5 text-right text-xs font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wide">Amount</th>
                  <th className="w-8 px-2" />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                {sortedItems.map(item => (
                  <Fragment key={item.id}>
                    <tr
                      onClick={() => setExpandedId(expandedId === item.id ? null : item.id)}
                      className="hover:bg-gray-50 dark:hover:bg-gray-700/40 cursor-pointer transition-colors"
                    >
                      <td className="px-4 py-2.5 text-gray-500 dark:text-gray-400 whitespace-nowrap text-xs">
                        {item.date}
                      </td>
                      <td className="px-4 py-2.5 text-gray-900 dark:text-white font-medium max-w-[160px] truncate">
                        {item.description}
                      </td>
                      <td className="px-4 py-2.5 text-gray-500 dark:text-gray-400 hidden sm:table-cell">
                        {item.category || '—'}
                      </td>
                      <td className={`px-4 py-2.5 text-right font-semibold whitespace-nowrap ${
                        item.type === 'income' ? 'text-success-600 dark:text-success-400' : 'text-danger-600 dark:text-danger-400'
                      }`}>
                        {item.type === 'expense' ? '−' : '+'}{formatCurrencyPrecise(item.amount, item.currency)}
                      </td>
                      <td className="px-2 py-2.5">
                        {expandedId === item.id
                          ? <ChevronDown className="w-3.5 h-3.5 text-gray-400" />
                          : <ChevronRight className="w-3.5 h-3.5 text-gray-300 dark:text-gray-600" />}
                      </td>
                    </tr>

                    {expandedId === item.id && (
                      <tr>
                        <td colSpan={5} className="px-5 py-3 bg-primary-50/40 dark:bg-primary-900/10 border-l-2 border-primary-300 dark:border-primary-700">
                          <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-6 gap-y-1.5 text-xs">
                            {item.vendorOrClient && (
                              <div>
                                <span className="text-gray-400 dark:text-gray-500">{item.type === 'income' ? 'Client' : 'Vendor'}: </span>
                                <span className="text-gray-700 dark:text-gray-300 font-medium">{item.vendorOrClient}</span>
                              </div>
                            )}
                            {item.invoiceStatus && (
                              <div>
                                <span className="text-gray-400 dark:text-gray-500">Invoice: </span>
                                <span className="text-gray-700 dark:text-gray-300 font-medium capitalize">
                                  {item.invoiceStatus.replace(/_/g, ' ')}
                                </span>
                              </div>
                            )}
                            {item.pnlCenters && item.pnlCenters.length > 0 && (
                              <div>
                                <span className="text-gray-400 dark:text-gray-500">P&L: </span>
                                <span className="text-gray-700 dark:text-gray-300 font-medium">{item.pnlCenters.join(', ')}</span>
                              </div>
                            )}
                            {item.notes && (
                              <div className="col-span-2 sm:col-span-3">
                                <span className="text-gray-400 dark:text-gray-500">Notes: </span>
                                <span className="text-gray-700 dark:text-gray-300">{item.notes}</span>
                              </div>
                            )}
                            {!item.vendorOrClient && !item.invoiceStatus && !item.pnlCenters?.length && !item.notes && (
                              <div className="col-span-3 text-gray-400 dark:text-gray-500 italic">No additional details</div>
                            )}
                          </div>
                        </td>
                      </tr>
                    )}
                  </Fragment>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
