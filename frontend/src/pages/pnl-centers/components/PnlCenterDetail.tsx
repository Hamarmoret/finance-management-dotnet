import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { X, TrendingUp, TrendingDown, DollarSign, ArrowRight, Loader2 } from 'lucide-react';
import { api } from '../../../services/api';
import type { PnlCenterWithStats } from '@finance/shared';
import { formatCurrency } from '../../../utils/formatters';

interface Transaction {
  id: string;
  description: string;
  amount: number;
  currency: string;
  date: string;
  type: 'income' | 'expense';
  category?: string;
  clientName?: string;
  vendor?: string;
}

interface PnlCenterDetailProps {
  center: PnlCenterWithStats;
  onClose: () => void;
}

type Tab = 'summary' | 'income' | 'expenses';

export function PnlCenterDetail({ center, onClose }: PnlCenterDetailProps) {
  const [tab, setTab] = useState<Tab>('summary');
  const [income, setIncome] = useState<Transaction[]>([]);
  const [expenses, setExpenses] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchAll() {
      try {
        setLoading(true);
        const [incomeRes, expenseRes] = await Promise.all([
          api.get('/income', { params: { pnlCenterId: center.id, limit: 100 } }),
          api.get('/expenses', { params: { pnlCenterId: center.id, limit: 100 } }),
        ]);

        setIncome((incomeRes.data.data || []).map((item: {
          id: string; description: string; amount: number; currency?: string;
          incomeDate: string; category?: { name: string }; clientName?: string;
        }) => ({
          id: item.id,
          description: item.description,
          amount: item.amount,
          currency: item.currency ?? 'ILS',
          date: item.incomeDate,
          type: 'income' as const,
          category: item.category?.name,
          clientName: item.clientName,
        })));

        setExpenses((expenseRes.data.data || []).map((item: {
          id: string; description: string; amount: number; currency?: string;
          expenseDate: string; category?: { name: string }; vendor?: string;
        }) => ({
          id: item.id,
          description: item.description,
          amount: item.amount,
          currency: item.currency ?? 'ILS',
          date: item.expenseDate,
          type: 'expense' as const,
          category: item.category?.name,
          vendor: item.vendor,
        })));
      } catch {
        // silently fail
      } finally {
        setLoading(false);
      }
    }
    fetchAll();
  }, [center.id]);

  const profitMargin = center.totalIncome > 0
    ? ((center.netProfit / center.totalIncome) * 100).toFixed(1)
    : '0.0';

  const TABS: { id: Tab; label: string; count?: number }[] = [
    { id: 'summary', label: 'Summary' },
    { id: 'income', label: 'Income', count: income.length },
    { id: 'expenses', label: 'Expenses', count: expenses.length },
  ];

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="modal-box w-full max-w-2xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="modal-header sticky top-0 z-10 bg-white dark:bg-gray-800">
          <div>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">{center.name}</h2>
            {center.description && (
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">{center.description}</p>
            )}
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-200 dark:border-gray-700 px-4 bg-white dark:bg-gray-800">
          {TABS.map(t => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors flex items-center gap-1.5 ${
                tab === t.id
                  ? 'border-primary-600 text-primary-600 dark:text-primary-400'
                  : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
              }`}
            >
              {t.label}
              {t.count !== undefined && t.count > 0 && (
                <span className="text-xs bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 rounded-full px-1.5 py-0.5">
                  {t.count}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          {tab === 'summary' && (
            <div className="p-4 space-y-4">
              {/* Financial Summary Cards */}
              <div className="grid grid-cols-3 gap-4">
                <div className="bg-green-50 dark:bg-green-900/20 rounded-xl p-4">
                  <div className="flex items-center gap-2 mb-1">
                    <TrendingUp className="w-4 h-4 text-green-600" />
                    <span className="text-xs font-medium text-green-700 dark:text-green-400">Total Income</span>
                  </div>
                  <p className="text-xl font-bold text-green-700 dark:text-green-400">{formatCurrency(center.totalIncome, 'ILS')}</p>
                </div>
                <div className="bg-red-50 dark:bg-red-900/20 rounded-xl p-4">
                  <div className="flex items-center gap-2 mb-1">
                    <TrendingDown className="w-4 h-4 text-red-600" />
                    <span className="text-xs font-medium text-red-700 dark:text-red-400">Total Expenses</span>
                  </div>
                  <p className="text-xl font-bold text-red-700 dark:text-red-400">{formatCurrency(center.totalExpenses, 'ILS')}</p>
                </div>
                <div className={`rounded-xl p-4 ${center.netProfit >= 0 ? 'bg-blue-50 dark:bg-blue-900/20' : 'bg-orange-50 dark:bg-orange-900/20'}`}>
                  <div className="flex items-center gap-2 mb-1">
                    <DollarSign className={`w-4 h-4 ${center.netProfit >= 0 ? 'text-blue-600' : 'text-orange-600'}`} />
                    <span className={`text-xs font-medium ${center.netProfit >= 0 ? 'text-blue-700 dark:text-blue-400' : 'text-orange-700 dark:text-orange-400'}`}>
                      Net Profit
                    </span>
                  </div>
                  <p className={`text-xl font-bold ${center.netProfit >= 0 ? 'text-blue-700 dark:text-blue-400' : 'text-orange-700 dark:text-orange-400'}`}>
                    {formatCurrency(center.netProfit, 'ILS')}
                  </p>
                </div>
              </div>

              {/* Profit Margin bar */}
              <div className="bg-gray-50 dark:bg-gray-700/50 rounded-xl p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Profit Margin</span>
                  <span className={`text-sm font-bold ${Number(profitMargin) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {profitMargin}%
                  </span>
                </div>
                <div className="h-3 bg-gray-200 dark:bg-gray-600 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${Number(profitMargin) >= 0 ? 'bg-green-500' : 'bg-red-500'}`}
                    style={{ width: `${Math.min(100, Math.abs(Number(profitMargin)))}%` }}
                  />
                </div>
              </div>

              {/* Recent activity (last 5 of each) */}
              {!loading && (income.length > 0 || expenses.length > 0) && (
                <div>
                  <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-2">Recent Activity</h3>
                  <div className="space-y-1">
                    {[...income.slice(0, 3), ...expenses.slice(0, 3)]
                      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                      .slice(0, 6)
                      .map(tx => (
                        <div key={tx.id} className="flex items-center justify-between py-1.5 px-3 bg-gray-50 dark:bg-gray-700/40 rounded-lg">
                          <div className="flex items-center gap-2 min-w-0">
                            <div className={`w-2 h-2 rounded-full shrink-0 ${tx.type === 'income' ? 'bg-green-500' : 'bg-red-500'}`} />
                            <div className="min-w-0">
                              <p className="text-xs font-medium text-gray-900 dark:text-white truncate">{tx.description}</p>
                              <p className="text-xs text-gray-400">{new Date(tx.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}{tx.category ? ` · ${tx.category}` : ''}</p>
                            </div>
                          </div>
                          <span className={`text-xs font-medium shrink-0 ml-3 ${tx.type === 'income' ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                            {tx.type === 'income' ? '+' : '-'}{formatCurrency(tx.amount, tx.currency)}
                          </span>
                        </div>
                      ))}
                  </div>
                  <div className="flex gap-2 mt-3">
                    <button onClick={() => setTab('income')} className="text-xs text-primary-600 dark:text-primary-400 hover:underline">
                      View all income ({income.length}) →
                    </button>
                    <span className="text-gray-300 dark:text-gray-600">|</span>
                    <button onClick={() => setTab('expenses')} className="text-xs text-primary-600 dark:text-primary-400 hover:underline">
                      View all expenses ({expenses.length}) →
                    </button>
                  </div>
                </div>
              )}

              {/* Quick Navigation */}
              <div className="flex gap-3 border-t dark:border-gray-700 pt-4">
                <Link
                  to={`/income?pnlCenterId=${center.id}`}
                  onClick={onClose}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 rounded-lg hover:bg-green-100 dark:hover:bg-green-900/30 transition-colors text-sm font-medium"
                >
                  View Income <ArrowRight className="w-4 h-4" />
                </Link>
                <Link
                  to={`/expenses?pnlCenterId=${center.id}`}
                  onClick={onClose}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 rounded-lg hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors text-sm font-medium"
                >
                  View Expenses <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
            </div>
          )}

          {(tab === 'income' || tab === 'expenses') && (
            <TransactionList
              items={tab === 'income' ? income : expenses}
              type={tab === 'income' ? 'income' : 'expense'}
              loading={loading}
            />
          )}
        </div>
      </div>
    </div>
  );
}

function TransactionList({ items, type, loading }: { items: Transaction[]; type: 'income' | 'expense'; loading: boolean }) {
  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <p className="text-center text-sm text-gray-500 dark:text-gray-400 py-12">
        No {type} records for this P&L center
      </p>
    );
  }

  const isIncome = type === 'income';
  const amountColor = isIncome ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400';

  return (
    <div className="divide-y divide-gray-100 dark:divide-gray-700">
      {/* Total header */}
      <div className="flex items-center justify-between px-4 py-3 bg-gray-50 dark:bg-gray-700/40">
        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{items.length} record{items.length !== 1 ? 's' : ''}</span>
        <div className="text-right">
          {Object.entries(items.reduce((acc, m) => {
            acc[m.currency] = (acc[m.currency] ?? 0) + m.amount;
            return acc;
          }, {} as Record<string, number>)).map(([c, a]) => (
            <span key={c} className={`text-sm font-bold mr-2 ${amountColor}`}>{formatCurrency(a, c)}</span>
          ))}
        </div>
      </div>
      {items.map(tx => (
        <div key={tx.id} className="flex items-start justify-between px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-700/30">
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{tx.description}</p>
            <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 mt-0.5">
              <span className="text-xs text-gray-400">
                {new Date(tx.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
              </span>
              {tx.category && <span className="text-xs text-gray-400">· {tx.category}</span>}
              {isIncome && tx.clientName && <span className="text-xs text-primary-500 dark:text-primary-400">· {tx.clientName}</span>}
              {!isIncome && tx.vendor && <span className="text-xs text-gray-400">· {tx.vendor}</span>}
            </div>
          </div>
          <span className={`text-sm font-semibold shrink-0 ml-4 ${amountColor}`}>
            {isIncome ? '+' : '-'}{formatCurrency(tx.amount, tx.currency)}
          </span>
        </div>
      ))}
    </div>
  );
}
