import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { X, TrendingUp, TrendingDown, DollarSign, ArrowRight } from 'lucide-react';
import { api } from '../../../services/api';
import type { PnlCenterWithStats } from '@finance/shared';

interface RecentTransaction {
  id: string;
  description: string;
  amount: number;
  date: string;
  type: 'income' | 'expense';
  category?: string;
}

interface PnlCenterDetailProps {
  center: PnlCenterWithStats;
  onClose: () => void;
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'ILS',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

export function PnlCenterDetail({ center, onClose }: PnlCenterDetailProps) {
  const [recentTransactions, setRecentTransactions] = useState<RecentTransaction[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchRecent() {
      try {
        setLoading(true);
        // Fetch recent income and expenses for this P&L center
        const [incomeRes, expenseRes] = await Promise.all([
          api.get('/income', { params: { pnlCenterId: center.id, limit: 5 } }),
          api.get('/expenses', { params: { pnlCenterId: center.id, limit: 5 } }),
        ]);

        const incomeItems: RecentTransaction[] = (incomeRes.data.data || []).map(
          (item: { id: string; description: string; amount: number; incomeDate: string; category?: { name: string } }) => ({
            id: item.id,
            description: item.description,
            amount: item.amount,
            date: item.incomeDate,
            type: 'income' as const,
            category: item.category?.name,
          })
        );

        const expenseItems: RecentTransaction[] = (expenseRes.data.data || []).map(
          (item: { id: string; description: string; amount: number; expenseDate: string; category?: { name: string } }) => ({
            id: item.id,
            description: item.description,
            amount: item.amount,
            date: item.expenseDate,
            type: 'expense' as const,
            category: item.category?.name,
          })
        );

        // Combine and sort by date
        const all = [...incomeItems, ...expenseItems].sort(
          (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
        );

        setRecentTransactions(all.slice(0, 10));
      } catch {
        // silently fail
      } finally {
        setLoading(false);
      }
    }
    fetchRecent();
  }, [center.id]);

  const profitMargin = center.totalIncome > 0
    ? ((center.netProfit / center.totalIncome) * 100).toFixed(1)
    : '0.0';

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="modal-box w-full max-w-2xl max-h-[90vh] overflow-y-auto">
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

        <div className="p-4 space-y-6">
          {/* Financial Summary Cards */}
          <div className="grid grid-cols-3 gap-4">
            <div className="bg-green-50 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-1">
                <TrendingUp className="w-4 h-4 text-green-600" />
                <span className="text-xs font-medium text-green-700">Total Income</span>
              </div>
              <p className="text-xl font-bold text-green-700">{formatCurrency(center.totalIncome)}</p>
            </div>
            <div className="bg-red-50 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-1">
                <TrendingDown className="w-4 h-4 text-red-600" />
                <span className="text-xs font-medium text-red-700">Total Expenses</span>
              </div>
              <p className="text-xl font-bold text-red-700">{formatCurrency(center.totalExpenses)}</p>
            </div>
            <div className={`rounded-xl p-4 ${center.netProfit >= 0 ? 'bg-blue-50' : 'bg-orange-50'}`}>
              <div className="flex items-center gap-2 mb-1">
                <DollarSign className={`w-4 h-4 ${center.netProfit >= 0 ? 'text-blue-600' : 'text-orange-600'}`} />
                <span className={`text-xs font-medium ${center.netProfit >= 0 ? 'text-blue-700' : 'text-orange-700'}`}>
                  Net Profit
                </span>
              </div>
              <p className={`text-xl font-bold ${center.netProfit >= 0 ? 'text-blue-700' : 'text-orange-700'}`}>
                {formatCurrency(center.netProfit)}
              </p>
            </div>
          </div>

          {/* Profit Margin */}
          <div className="bg-gray-50 dark:bg-gray-700/50 rounded-xl p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Profit Margin</span>
              <span className={`text-sm font-bold ${Number(profitMargin) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {profitMargin}%
              </span>
            </div>
            <div className="h-3 bg-gray-200 dark:bg-gray-600 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${
                  Number(profitMargin) >= 0 ? 'bg-green-500' : 'bg-red-500'
                }`}
                style={{ width: `${Math.min(100, Math.abs(Number(profitMargin)))}%` }}
              />
            </div>
          </div>

          {/* Recent Transactions */}
          <div>
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">Recent Transactions</h3>
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary-600"></div>
              </div>
            ) : recentTransactions.length === 0 ? (
              <p className="text-center text-gray-500 dark:text-gray-400 py-8 text-sm">
                No transactions found for this P&L center
              </p>
            ) : (
              <div className="space-y-2">
                {recentTransactions.map((tx) => (
                  <div
                    key={tx.id}
                    className="flex items-center justify-between py-2 px-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div
                        className={`w-2 h-2 rounded-full flex-shrink-0 ${
                          tx.type === 'income' ? 'bg-green-500' : 'bg-red-500'
                        }`}
                      />
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{tx.description}</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          {new Date(tx.date).toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric',
                          })}
                          {tx.category && ` · ${tx.category}`}
                        </p>
                      </div>
                    </div>
                    <span
                      className={`text-sm font-medium flex-shrink-0 ml-3 ${
                        tx.type === 'income' ? 'text-green-600' : 'text-red-600'
                      }`}
                    >
                      {tx.type === 'income' ? '+' : '-'}{formatCurrency(tx.amount)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Quick Navigation */}
          <div className="flex gap-3 border-t dark:border-gray-700 pt-4">
            <Link
              to={`/income?pnlCenterId=${center.id}`}
              onClick={onClose}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-green-50 text-green-700 rounded-lg hover:bg-green-100 transition-colors text-sm font-medium"
            >
              View Income <ArrowRight className="w-4 h-4" />
            </Link>
            <Link
              to={`/expenses?pnlCenterId=${center.id}`}
              onClick={onClose}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-red-50 text-red-700 rounded-lg hover:bg-red-100 transition-colors text-sm font-medium"
            >
              View Expenses <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
