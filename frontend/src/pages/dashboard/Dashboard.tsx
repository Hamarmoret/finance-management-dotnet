import { useState, useEffect, useMemo } from 'react';
import { api, getErrorMessage } from '../../services/api';
import type { ReactNode } from 'react';
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  Receipt,
  AlertCircle,
  Loader2,
  Plus,
  Search,
  ArrowUpRight,
  ArrowDownRight,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { formatCurrency, formatDateShort } from '../../utils/formatters';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';

type Timeframe = '3M' | '6M' | '1Y' | 'All';

interface RawIncome {
  id: string;
  description?: string;
  clientName?: string;
  amount: number;
  incomeDate: string;
  invoiceStatus?: string;
  category?: { name: string };
}

interface RawExpense {
  id: string;
  description?: string;
  vendor?: string;
  amount: number;
  expenseDate: string;
  category?: { name: string };
}

interface Transaction {
  id: string;
  description: string;
  amount: number;
  type: 'income' | 'expense';
  date: string;
  category: string;
}

interface SummaryData {
  totalIncome: number;
  totalExpenses: number;
  netProfit: number;
  pendingValue: number;
  pendingCount: number;
  overdueCount: number;
  incomeChange: number;
  expensesChange: number;
  profitChange: number;
}

function pctChange(current: number, previous: number): number {
  if (previous === 0) return current > 0 ? 100 : 0;
  return Math.round(((current - previous) / previous) * 1000) / 10;
}

function monthKey(dateStr: string): string {
  const d = new Date(dateStr);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

export default function Dashboard() {
  const [rawIncome, setRawIncome] = useState<RawIncome[]>([]);
  const [rawExpenses, setRawExpenses] = useState<RawExpense[]>([]);
  const [summaryData, setSummaryData] = useState<SummaryData | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [chartTimeframe, setChartTimeframe] = useState<Timeframe>('6M');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchDashboardData = async () => {
      setLoading(true);
      setError(null);

      try {
        const [incomeRes, expensesRes] = await Promise.all([
          api.get('/income', { params: { limit: 500, sortOrder: 'desc' } }),
          api.get('/expenses', { params: { limit: 500, sortOrder: 'desc' } }),
        ]);

        const incomeData: RawIncome[] = incomeRes.data.data || [];
        const expensesData: RawExpense[] = expensesRes.data.data || [];

        setRawIncome(incomeData);
        setRawExpenses(expensesData);

        // Month-over-month keys
        const now = new Date();
        const curKey = monthKey(now.toISOString());
        const prevDate = new Date(now.getFullYear(), now.getMonth() - 1);
        const prevKey = monthKey(prevDate.toISOString());

        const totalIncome = incomeData.reduce((s, i) => s + i.amount, 0);
        const totalExpenses = expensesData.reduce((s, i) => s + i.amount, 0);

        const curIncome = incomeData.filter(i => monthKey(i.incomeDate) === curKey).reduce((s, i) => s + i.amount, 0);
        const prevIncome = incomeData.filter(i => monthKey(i.incomeDate) === prevKey).reduce((s, i) => s + i.amount, 0);
        const curExpenses = expensesData.filter(e => monthKey(e.expenseDate) === curKey).reduce((s, e) => s + e.amount, 0);
        const prevExpenses = expensesData.filter(e => monthKey(e.expenseDate) === prevKey).reduce((s, e) => s + e.amount, 0);

        const pendingItems = incomeData.filter(i => i.invoiceStatus === 'sent' || i.invoiceStatus === 'draft');

        setSummaryData({
          totalIncome,
          totalExpenses,
          netProfit: totalIncome - totalExpenses,
          pendingValue: pendingItems.reduce((s, i) => s + i.amount, 0),
          pendingCount: pendingItems.length,
          overdueCount: incomeData.filter(i => i.invoiceStatus === 'overdue').length,
          incomeChange: pctChange(curIncome, prevIncome),
          expensesChange: pctChange(curExpenses, prevExpenses),
          profitChange: pctChange(curIncome - curExpenses, prevIncome - prevExpenses),
        });

        // Merge + sort recent transactions
        const combined: Transaction[] = [
          ...incomeData.map(i => ({
            id: i.id,
            description: i.description || i.clientName || 'Income',
            amount: i.amount,
            type: 'income' as const,
            date: i.incomeDate,
            category: i.category?.name || 'Uncategorized',
          })),
          ...expensesData.map(e => ({
            id: e.id,
            description: e.description || e.vendor || 'Expense',
            amount: e.amount,
            type: 'expense' as const,
            date: e.expenseDate,
            category: e.category?.name || 'Uncategorized',
          })),
        ]
          .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
          .slice(0, 20);

        setTransactions(combined);
      } catch (err) {
        setError(getErrorMessage(err));
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, []);

  // Chart data filtered by timeframe
  const chartData = useMemo(() => {
    const months =
      chartTimeframe === '3M' ? 3
      : chartTimeframe === '6M' ? 6
      : chartTimeframe === '1Y' ? 12
      : null;

    const now = new Date();
    const cutoff = months
      ? new Date(now.getFullYear(), now.getMonth() - months + 1, 1)
      : null;

    const map = new Map<string, { income: number; expenses: number }>();

    for (const item of rawIncome) {
      const d = new Date(item.incomeDate);
      if (cutoff && d < cutoff) continue;
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      const entry = map.get(key) ?? { income: 0, expenses: 0 };
      entry.income += item.amount;
      map.set(key, entry);
    }

    for (const item of rawExpenses) {
      const d = new Date(item.expenseDate);
      if (cutoff && d < cutoff) continue;
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      const entry = map.get(key) ?? { income: 0, expenses: 0 };
      entry.expenses += item.amount;
      map.set(key, entry);
    }

    return Array.from(map.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, vals]) => {
        const [year, month] = key.split('-');
        return {
          month: new Date(+year, +month - 1).toLocaleString('default', {
            month: 'short',
            year: '2-digit',
          }),
          income: Math.round(vals.income),
          expenses: Math.round(vals.expenses),
        };
      });
  }, [rawIncome, rawExpenses, chartTimeframe]);

  // Filtered transactions for search
  const filteredTransactions = useMemo(() => {
    if (!search.trim()) return transactions;
    const q = search.toLowerCase();
    return transactions.filter(
      t =>
        t.description.toLowerCase().includes(q) ||
        t.category.toLowerCase().includes(q)
    );
  }, [transactions, search]);

  if (loading) {
    return (
      <div className="flex h-[calc(100vh-4rem)] items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary-600" />
      </div>
    );
  }

  return (
    <div className="p-8 space-y-6 bg-gray-50 min-h-full">
      {error && (
        <div className="bg-danger-50 text-danger-700 px-4 py-3 rounded-lg flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          {error}
        </div>
      )}

      {/* Summary Cards */}
      {summaryData && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <SummaryCard
            title="Total Income"
            value={formatCurrency(summaryData.totalIncome)}
            change={summaryData.incomeChange}
            positiveIsGood
            icon={<TrendingUp className="w-5 h-5" />}
          />
          <SummaryCard
            title="Total Expenses"
            value={formatCurrency(summaryData.totalExpenses)}
            change={summaryData.expensesChange}
            positiveIsGood={false}
            icon={<TrendingDown className="w-5 h-5" />}
          />
          <SummaryCard
            title="Net Profit"
            value={formatCurrency(summaryData.netProfit)}
            change={summaryData.profitChange}
            positiveIsGood
            icon={<DollarSign className="w-5 h-5" />}
          />
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="bg-primary-600 h-10 flex items-center px-5">
              <span className="text-white font-medium text-sm">Pending Invoices</span>
            </div>
            <div className="p-5">
              <p className="text-3xl font-bold text-gray-900 mb-2">
                {formatCurrency(summaryData.pendingValue)}
              </p>
              <p className="text-sm text-gray-500 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-gray-400" />
                {summaryData.pendingCount} invoice{summaryData.pendingCount !== 1 ? 's' : ''} pending
              </p>
              {summaryData.overdueCount > 0 && (
                <p className="mt-1 text-sm text-danger-600 flex items-center gap-1">
                  <AlertCircle className="w-3.5 h-3.5" />
                  {summaryData.overdueCount} overdue
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Bottom Section */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Recent Transactions */}
        <div className="lg:col-span-5 bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-200 flex items-center justify-between gap-3">
            <h3 className="text-base font-semibold text-gray-800 shrink-0">Recent Transactions</h3>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
              <input
                className="input pl-9 h-9 text-sm w-44"
                placeholder="Search..."
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200 text-gray-500">
                  <th className="px-5 py-3 font-medium whitespace-nowrap">Date</th>
                  <th className="px-5 py-3 font-medium">Description</th>
                  <th className="px-5 py-3 font-medium">Category</th>
                  <th className="px-5 py-3 font-medium text-right">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredTransactions.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-5 py-10 text-center text-gray-500">
                      {search ? 'No matching transactions.' : 'No transactions yet.'}
                    </td>
                  </tr>
                ) : (
                  filteredTransactions.map(t => (
                    <tr
                      key={`${t.type}-${t.id}`}
                      className="hover:bg-gray-50 transition-colors"
                    >
                      <td className="px-5 py-3.5 text-gray-500 whitespace-nowrap">
                        {formatDateShort(t.date)}
                      </td>
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-2.5">
                          <div
                            className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 ${
                              t.type === 'income'
                                ? 'bg-success-50 text-success-600'
                                : 'bg-danger-50 text-danger-600'
                            }`}
                          >
                            {t.type === 'income'
                              ? <TrendingUp className="w-3.5 h-3.5" />
                              : <TrendingDown className="w-3.5 h-3.5" />}
                          </div>
                          <span className="font-medium text-gray-800 truncate max-w-[160px]">
                            {t.description}
                          </span>
                        </div>
                      </td>
                      <td className="px-5 py-3.5 text-gray-500">{t.category}</td>
                      <td
                        className={`px-5 py-3.5 text-right font-semibold whitespace-nowrap ${
                          t.type === 'income' ? 'text-success-600' : 'text-danger-600'
                        }`}
                      >
                        {t.type === 'income' ? '+' : '-'}
                        {formatCurrency(t.amount)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          <div className="px-5 py-3 border-t border-gray-200 bg-gray-50">
            <Link
              to="/expenses"
              className="text-sm text-primary-600 hover:text-primary-700 font-medium"
            >
              View all transactions
            </Link>
          </div>
        </div>

        {/* Cash Flow Chart */}
        <div className="lg:col-span-4 bg-white rounded-xl border border-gray-200 shadow-sm p-5 flex flex-col">
          <div className="flex items-center justify-between mb-4 gap-2">
            <h3 className="text-base font-semibold text-gray-800 shrink-0">Cash Flow</h3>
            <div className="flex rounded-lg border border-gray-200 overflow-hidden text-xs font-medium">
              {(['3M', '6M', '1Y', 'All'] as Timeframe[]).map(tf => (
                <button
                  key={tf}
                  onClick={() => setChartTimeframe(tf)}
                  className={`px-3 py-1.5 transition-colors ${
                    chartTimeframe === tf
                      ? 'bg-primary-600 text-white'
                      : 'text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  {tf}
                </button>
              ))}
            </div>
          </div>

          {chartData.length === 0 ? (
            <div className="flex-1 flex items-center justify-center text-gray-400 text-sm">
              No data for this period.
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={chartData} margin={{ top: 4, right: 4, left: -16, bottom: 0 }}>
                <CartesianGrid strokeDasharray="4 4" stroke="#e2e8f0" />
                <XAxis
                  dataKey="month"
                  tick={{ fontSize: 11, fill: '#64748b' }}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis
                  tickFormatter={v =>
                    v >= 1000 ? `$${(v / 1000).toFixed(0)}k` : `$${v}`
                  }
                  tick={{ fontSize: 11, fill: '#64748b' }}
                  tickLine={false}
                  axisLine={false}
                />
                <Tooltip
                  formatter={(value: number) => [formatCurrency(value)]}
                  contentStyle={{
                    borderRadius: '8px',
                    border: '1px solid #e2e8f0',
                    fontSize: '12px',
                  }}
                />
                <Legend
                  iconType="plainline"
                  iconSize={16}
                  wrapperStyle={{ fontSize: '12px', paddingTop: '12px' }}
                />
                <Line
                  type="monotone"
                  dataKey="income"
                  name="Income"
                  stroke="#0284c7"
                  strokeWidth={2}
                  dot={false}
                  activeDot={{ r: 4 }}
                />
                <Line
                  type="monotone"
                  dataKey="expenses"
                  name="Expenses"
                  stroke="#93c5fd"
                  strokeWidth={2}
                  dot={false}
                  activeDot={{ r: 4 }}
                />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Quick Actions */}
        <div className="lg:col-span-3 bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="bg-primary-600 h-12 flex items-center px-5">
            <h3 className="text-white font-medium text-sm">Quick Actions</h3>
          </div>
          <div className="p-5 flex flex-col gap-3">
            <Link
              to="/expenses"
              className="btn btn-primary btn-md justify-start gap-2.5 w-full"
            >
              <Plus className="w-4 h-4 shrink-0" />
              Add new expense
            </Link>
            <Link
              to="/income"
              className="btn btn-primary btn-md justify-start gap-2.5 w-full"
            >
              <Receipt className="w-4 h-4 shrink-0" />
              Record income
            </Link>
            <Link
              to="/income"
              className="btn btn-primary btn-md justify-start gap-2.5 w-full"
            >
              <DollarSign className="w-4 h-4 shrink-0" />
              Create invoice
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

interface SummaryCardProps {
  title: string;
  value: string;
  change: number;
  positiveIsGood: boolean;
  icon?: ReactNode;
}

function SummaryCard({ title, value, change, positiveIsGood }: SummaryCardProps) {
  const isGood = positiveIsGood ? change >= 0 : change <= 0;
  const changeAbs = Math.abs(change);

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
      <div className="bg-primary-600 h-10 flex items-center px-5">
        <span className="text-white font-medium text-sm">{title}</span>
      </div>
      <div className="p-5">
        <p className="text-3xl font-bold text-gray-900 mb-2">{value}</p>
        <p className="text-sm text-gray-500 flex items-center gap-1">
          <span
            className={`flex items-center gap-0.5 font-medium ${
              isGood ? 'text-success-600' : 'text-danger-600'
            }`}
          >
            {change >= 0
              ? <ArrowUpRight className="w-3.5 h-3.5" />
              : <ArrowDownRight className="w-3.5 h-3.5" />}
            {changeAbs}%
          </span>
          vs last month
        </p>
      </div>
    </div>
  );
}
