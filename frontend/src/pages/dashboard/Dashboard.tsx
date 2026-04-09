import { useState, useEffect, useMemo } from 'react';
import { api, getErrorMessage } from '../../services/api';
import { useDataStore } from '../../stores/dataStore';
import type { ReactNode } from 'react';
import ContractAlertsWidget from './components/ContractAlertsWidget';
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
  X,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { formatCurrency, formatDate, formatDateShort } from '../../utils/formatters';
import { PeriodSelector, getPeriodLabel } from '../../components/PeriodSelector';
import {
  SUPPORTED_CURRENCIES,
  SupportedCurrency,
  getPreferredCurrency,
  setPreferredCurrency,
  convertTotals,
} from '../../services/currencyService';
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

// PeriodSelector drives startDate/endDate strings; cutoff derived inline

interface RawIncome {
  id: string;
  description?: string;
  clientName?: string;
  amount: number;
  incomeDate: string;
  invoiceStatus?: string;
  category?: { name: string };
  pnlCenter?: { name: string };
  currency?: string;
}

interface RawExpense {
  id: string;
  description?: string;
  vendor?: string;
  amount: number;
  expenseDate: string;
  category?: { name: string };
  pnlCenter?: { name: string };
  currency?: string;
  paymentMethod?: string;
}

interface Transaction {
  id: string;
  description: string;
  amount: number;
  type: 'income' | 'expense';
  date: string;
  category: string;
  pnlCenter?: string;
  currency?: string;
  clientName?: string;
  invoiceStatus?: string;
  vendor?: string;
  paymentMethod?: string;
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

function parseCutoff(dateStr: string): Date | null {
  return dateStr ? new Date(dateStr) : null;
}

const INVOICE_STATUS_LABELS: Record<string, string> = {
  draft: 'Draft',
  sent: 'Sent',
  viewed: 'Viewed',
  paid: 'Paid',
  overdue: 'Overdue',
  cancelled: 'Cancelled',
};

const INVOICE_STATUS_COLORS: Record<string, string> = {
  draft: 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300',
  sent: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300',
  viewed: 'bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300',
  paid: 'bg-success-50 text-success-700 dark:bg-success-900/30 dark:text-success-400',
  overdue: 'bg-danger-50 text-danger-700 dark:bg-danger-900/30 dark:text-danger-400',
  cancelled: 'bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400',
};

export default function Dashboard() {
  const isDark = document.documentElement.classList.contains('dark');
  const version = useDataStore((s) => s.version);
  const [rawIncome, setRawIncome] = useState<RawIncome[]>([]);
  const [rawExpenses, setRawExpenses] = useState<RawExpense[]>([]);
  const [startDate, setStartDate] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth() - 5, 1).toISOString().split('T')[0];
  });
  const [endDate, setEndDate] = useState('');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null);
  const [displayCurrency, setDisplayCurrency] = useState<SupportedCurrency>(getPreferredCurrency);
  const [txTypeFilter, setTxTypeFilter] = useState<'all' | 'income' | 'expense'>('all');
  const [convertedSummary, setConvertedSummary] = useState<{
    income: number; expenses: number; net: number; pending: number;
  } | null>(null);

  useEffect(() => {
    const fetchDashboardData = async () => {
      setLoading(true);
      setError(null);
      try {
        const [incomeRes, expensesRes] = await Promise.all([
          api.get('/income', { params: { limit: 500, sortOrder: 'desc' } }),
          api.get('/expenses', { params: { limit: 500, sortOrder: 'desc' } }),
        ]);
        setRawIncome(incomeRes.data.data || []);
        setRawExpenses(expensesRes.data.data || []);
      } catch (err) {
        setError(getErrorMessage(err));
      } finally {
        setLoading(false);
      }
    };
    fetchDashboardData();
  // version: refetch whenever any mutation fires bump() — keeps dashboard in sync
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [version]);

  const summaryData = useMemo((): SummaryData | null => {
    if (rawIncome.length === 0 && rawExpenses.length === 0) return null;
    const cutoff = parseCutoff(startDate);
    const cutoffEnd = parseCutoff(endDate);
    const filteredIncome = rawIncome.filter(i => {
      const d = new Date(i.incomeDate);
      return (!cutoff || d >= cutoff) && (!cutoffEnd || d <= cutoffEnd);
    });
    const filteredExpenses = rawExpenses.filter(e => {
      const d = new Date(e.expenseDate);
      return (!cutoff || d >= cutoff) && (!cutoffEnd || d <= cutoffEnd);
    });
    const totalIncome = filteredIncome.reduce((s, i) => s + i.amount, 0);
    const totalExpenses = filteredExpenses.reduce((s, e) => s + e.amount, 0);
    const now = new Date();
    const curKey = monthKey(now.toISOString());
    const prevKey = monthKey(new Date(now.getFullYear(), now.getMonth() - 1).toISOString());
    const curIncome = rawIncome.filter(i => monthKey(i.incomeDate) === curKey).reduce((s, i) => s + i.amount, 0);
    const prevIncome = rawIncome.filter(i => monthKey(i.incomeDate) === prevKey).reduce((s, i) => s + i.amount, 0);
    const curExpenses = rawExpenses.filter(e => monthKey(e.expenseDate) === curKey).reduce((s, e) => s + e.amount, 0);
    const prevExpenses = rawExpenses.filter(e => monthKey(e.expenseDate) === prevKey).reduce((s, e) => s + e.amount, 0);
    const pendingItems = rawIncome.filter(i => i.invoiceStatus === 'sent' || i.invoiceStatus === 'draft');
    return {
      totalIncome,
      totalExpenses,
      netProfit: totalIncome - totalExpenses,
      pendingValue: pendingItems.reduce((s, i) => s + i.amount, 0),
      pendingCount: pendingItems.length,
      overdueCount: rawIncome.filter(i => i.invoiceStatus === 'overdue').length,
      incomeChange: pctChange(curIncome, prevIncome),
      expensesChange: pctChange(curExpenses, prevExpenses),
      profitChange: pctChange(curIncome - curExpenses, prevIncome - prevExpenses),
    };
  }, [rawIncome, rawExpenses, startDate, endDate]);

  // Convert summary totals to the selected display currency using live exchange rates
  useEffect(() => {
    if (!summaryData) { setConvertedSummary(null); return; }
    const cutoff = parseCutoff(startDate);
    const cutoffEnd = parseCutoff(endDate);

    const incomeByCurrency = rawIncome
      .filter(i => { const d = new Date(i.incomeDate); return (!cutoff || d >= cutoff) && (!cutoffEnd || d <= cutoffEnd); })
      .reduce((acc, i) => { acc[i.currency ?? 'ILS'] = (acc[i.currency ?? 'ILS'] ?? 0) + i.amount; return acc; }, {} as Record<string, number>);

    const expensesByCurrency = rawExpenses
      .filter(e => { const d = new Date(e.expenseDate); return (!cutoff || d >= cutoff) && (!cutoffEnd || d <= cutoffEnd); })
      .reduce((acc, e) => { acc[e.currency ?? 'ILS'] = (acc[e.currency ?? 'ILS'] ?? 0) + e.amount; return acc; }, {} as Record<string, number>);

    const pendingByCurrency = rawIncome
      .filter(i => i.invoiceStatus === 'sent' || i.invoiceStatus === 'draft')
      .reduce((acc, i) => { acc[i.currency ?? 'ILS'] = (acc[i.currency ?? 'ILS'] ?? 0) + i.amount; return acc; }, {} as Record<string, number>);

    Promise.all([
      convertTotals(incomeByCurrency, displayCurrency),
      convertTotals(expensesByCurrency, displayCurrency),
      convertTotals(pendingByCurrency, displayCurrency),
    ]).then(([income, expenses, pending]) => {
      setConvertedSummary({ income, expenses, net: income - expenses, pending });
    });
  }, [summaryData, displayCurrency, rawIncome, rawExpenses, startDate, endDate]);

  const chartData = useMemo(() => {
    const cutoff = parseCutoff(startDate);
    const cutoffEnd = parseCutoff(endDate);
    const map = new Map<string, { income: number; expenses: number }>();
    for (const item of rawIncome) {
      const d = new Date(item.incomeDate);
      if (cutoff && d < cutoff) continue;
      if (cutoffEnd && d > cutoffEnd) continue;
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      const entry = map.get(key) ?? { income: 0, expenses: 0 };
      entry.income += item.amount;
      map.set(key, entry);
    }
    for (const item of rawExpenses) {
      const d = new Date(item.expenseDate);
      if (cutoff && d < cutoff) continue;
      if (cutoffEnd && d > cutoffEnd) continue;
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
          month: new Date(+year, +month - 1).toLocaleString('default', { month: 'short', year: '2-digit' }),
          income: Math.round(vals.income),
          expenses: Math.round(vals.expenses),
        };
      });
  }, [rawIncome, rawExpenses, startDate, endDate]);

  const transactions = useMemo(() => {
    const cutoff = parseCutoff(startDate);
    const cutoffEnd = parseCutoff(endDate);
    const combined: Transaction[] = [
      ...rawIncome
        .filter(i => {
          const d = new Date(i.incomeDate);
          return (!cutoff || d >= cutoff) && (!cutoffEnd || d <= cutoffEnd);
        })
        .map(i => ({
          id: i.id,
          description: i.description || i.clientName || 'Income',
          amount: i.amount,
          type: 'income' as const,
          date: i.incomeDate,
          category: i.category?.name || 'Uncategorized',
          pnlCenter: i.pnlCenter?.name,
          currency: i.currency,
          clientName: i.clientName,
          invoiceStatus: i.invoiceStatus,
        })),
      ...rawExpenses
        .filter(e => {
          const d = new Date(e.expenseDate);
          return (!cutoff || d >= cutoff) && (!cutoffEnd || d <= cutoffEnd);
        })
        .map(e => ({
          id: e.id,
          description: e.description || e.vendor || 'Expense',
          amount: e.amount,
          type: 'expense' as const,
          date: e.expenseDate,
          category: e.category?.name || 'Uncategorized',
          pnlCenter: e.pnlCenter?.name,
          currency: e.currency,
          vendor: e.vendor,
          paymentMethod: e.paymentMethod,
        })),
    ]
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, 20);
    return combined;
  }, [rawIncome, rawExpenses, startDate, endDate]);

  const filteredTransactions = useMemo(() => {
    let result = transactions;
    if (txTypeFilter !== 'all') result = result.filter(t => t.type === txTypeFilter);
    if (!search.trim()) return result;
    const q = search.toLowerCase();
    return result.filter(t =>
      t.description.toLowerCase().includes(q) ||
      t.category.toLowerCase().includes(q)
    );
  }, [transactions, search, txTypeFilter]);

  if (loading) {
    return (
      <div className="flex h-[calc(100vh-4rem)] items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary-600" />
      </div>
    );
  }

  return (
    <div className="p-8 space-y-6 bg-gray-50 dark:bg-gray-900 min-h-full">
      {error && (
        <div className="bg-danger-50 text-danger-700 px-4 py-3 rounded-lg flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          {error}
        </div>
      )}

      {/* Header + Period Selector + Currency */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Dashboard</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">{getPeriodLabel(startDate, endDate)}</p>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
            Display in
            <select
              value={displayCurrency}
              onChange={e => {
                const c = e.target.value as SupportedCurrency;
                setPreferredCurrency(c);
                setDisplayCurrency(c);
              }}
              className="border border-gray-300 dark:border-gray-600 rounded px-2 py-1 bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200 text-sm"
            >
              {SUPPORTED_CURRENCIES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <PeriodSelector
            startDate={startDate}
            endDate={endDate}
            onChange={(s, e) => { setStartDate(s); setEndDate(e); }}
          />
        </div>
      </div>

      {/* Summary Cards */}
      {summaryData && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <SummaryCard
            title={`Total Income (${displayCurrency})`}
            value={convertedSummary ? formatCurrency(convertedSummary.income, displayCurrency) : '…'}
            change={summaryData.incomeChange}
            positiveIsGood
            icon={<TrendingUp className="w-5 h-5" />}
          />
          <SummaryCard
            title={`Total Expenses (${displayCurrency})`}
            value={convertedSummary ? formatCurrency(convertedSummary.expenses, displayCurrency) : '…'}
            change={summaryData.expensesChange}
            positiveIsGood={false}
            icon={<TrendingDown className="w-5 h-5" />}
          />
          <SummaryCard
            title={`Net Profit (${displayCurrency})`}
            value={convertedSummary ? formatCurrency(convertedSummary.net, displayCurrency) : '…'}
            change={summaryData.profitChange}
            positiveIsGood
            icon={<DollarSign className="w-5 h-5" />}
          />
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden">
            <div className="bg-primary-600 h-10 flex items-center px-5">
              <span className="text-white font-medium text-sm">Pending Invoices</span>
            </div>
            <div className="p-5">
              <p className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
                {convertedSummary ? formatCurrency(convertedSummary.pending, displayCurrency) : '…'}
              </p>
              <p className="text-sm text-gray-500 dark:text-gray-400 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-gray-400 dark:bg-gray-500" />
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

      {/* Contract Alerts */}
      <ContractAlertsWidget />

      {/* Bottom Section */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Recent Transactions */}
        <div className="lg:col-span-5 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-200 dark:border-gray-700 flex flex-wrap items-center justify-between gap-3">
            <h3 className="text-base font-semibold text-gray-800 dark:text-white shrink-0">Recent Transactions</h3>
            <div className="flex items-center gap-2">
              {/* Type filter */}
              <div className="flex rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700 text-xs font-medium">
                {(['all', 'income', 'expense'] as const).map(type => (
                  <button
                    key={type}
                    onClick={() => setTxTypeFilter(type)}
                    className={`px-2.5 py-1.5 capitalize transition-colors ${
                      txTypeFilter === type
                        ? type === 'income'
                          ? 'bg-success-600 text-white'
                          : type === 'expense'
                          ? 'bg-danger-600 text-white'
                          : 'bg-primary-600 text-white'
                        : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700'
                    }`}
                  >
                    {type}
                  </button>
                ))}
              </div>
              {/* Search */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                <input
                  className="input pl-9 h-9 text-sm w-36"
                  placeholder="Search..."
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                />
              </div>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="bg-gray-50 dark:bg-gray-700/50 border-b border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400">
                  <th className="px-5 py-3 font-medium whitespace-nowrap">Date</th>
                  <th className="px-5 py-3 font-medium">Description</th>
                  <th className="px-5 py-3 font-medium">Category</th>
                  <th className="px-5 py-3 font-medium text-right">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-700/50">
                {filteredTransactions.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-5 py-10 text-center text-gray-500 dark:text-gray-400">
                      {search ? 'No matching transactions.' : 'No transactions yet.'}
                    </td>
                  </tr>
                ) : (
                  filteredTransactions.map(t => (
                    <tr
                      key={`${t.type}-${t.id}`}
                      className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors cursor-pointer"
                      onClick={() => setSelectedTransaction(t)}
                    >
                      <td className="px-5 py-3.5 text-gray-500 dark:text-gray-400 whitespace-nowrap">
                        {formatDateShort(t.date)}
                      </td>
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-2.5">
                          <div className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 ${
                            t.type === 'income' ? 'bg-success-50 text-success-600' : 'bg-danger-50 text-danger-600'
                          }`}>
                            {t.type === 'income'
                              ? <TrendingUp className="w-3.5 h-3.5" />
                              : <TrendingDown className="w-3.5 h-3.5" />}
                          </div>
                          <span className="font-medium text-gray-800 dark:text-gray-100 truncate max-w-[160px]">
                            {t.description}
                          </span>
                        </div>
                      </td>
                      <td className="px-5 py-3.5 text-gray-500 dark:text-gray-400">{t.category}</td>
                      <td className={`px-5 py-3.5 text-right font-semibold whitespace-nowrap ${
                        t.type === 'income' ? 'text-success-600' : 'text-danger-600'
                      }`}>
                        {t.type === 'income' ? '+' : '-'}{formatCurrency(t.amount, t.currency ?? displayCurrency)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Cash Flow Chart */}
        <div className="lg:col-span-4 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm p-5 flex flex-col">
          <h3 className="text-base font-semibold text-gray-800 dark:text-white mb-4">Cash Flow</h3>
          {chartData.length === 0 ? (
            <div className="flex-1 flex items-center justify-center text-gray-400 text-sm">
              No data for this period.
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={chartData} margin={{ top: 4, right: 4, left: -16, bottom: 0 }}>
                <CartesianGrid strokeDasharray="4 4" stroke={isDark ? '#374151' : '#e2e8f0'} />
                <XAxis
                  dataKey="month"
                  tick={{ fontSize: 11, fill: isDark ? '#9ca3af' : '#64748b' }}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis
                  tickFormatter={v => formatCurrency(v >= 1000 ? Math.round(v / 1000) * 1000 : v, displayCurrency)}
                  tick={{ fontSize: 11, fill: isDark ? '#9ca3af' : '#64748b' }}
                  tickLine={false}
                  axisLine={false}
                />
                <Tooltip
                  formatter={(value: number) => [formatCurrency(value, displayCurrency)]}
                  contentStyle={{
                    borderRadius: '8px',
                    border: `1px solid ${isDark ? '#374151' : '#e2e8f0'}`,
                    backgroundColor: isDark ? '#1f2937' : '#ffffff',
                    color: isDark ? '#f3f4f6' : '#111827',
                    fontSize: '12px',
                  }}
                />
                <Legend iconType="plainline" iconSize={16} wrapperStyle={{ fontSize: '12px', paddingTop: '12px' }} />
                <Line type="monotone" dataKey="income" name="Income" stroke="#0284c7" strokeWidth={2} dot={false} activeDot={{ r: 4 }} />
                <Line type="monotone" dataKey="expenses" name="Expenses" stroke="#93c5fd" strokeWidth={2} dot={false} activeDot={{ r: 4 }} />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Quick Actions */}
        <div className="lg:col-span-3 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden">
          <div className="bg-primary-600 h-12 flex items-center px-5">
            <h3 className="text-white font-medium text-sm">Quick Actions</h3>
          </div>
          <div className="p-5 flex flex-col gap-3">
            <Link to="/expenses" className="btn btn-primary btn-md justify-start gap-2.5 w-full">
              <Plus className="w-4 h-4 shrink-0" />
              Add new expense
            </Link>
            <Link to="/income" className="btn btn-primary btn-md justify-start gap-2.5 w-full">
              <Receipt className="w-4 h-4 shrink-0" />
              Record income
            </Link>
            <Link to="/income" className="btn btn-primary btn-md justify-start gap-2.5 w-full">
              <DollarSign className="w-4 h-4 shrink-0" />
              Create invoice
            </Link>
          </div>
        </div>
      </div>

      {/* Transaction Detail Modal */}
      {selectedTransaction && (
        <TransactionDetailModal
          transaction={selectedTransaction}
          onClose={() => setSelectedTransaction(null)}
        />
      )}
    </div>
  );
}

// ─── Summary Card ─────────────────────────────────────────────────────────────

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
    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden">
      <div className="bg-primary-600 h-10 flex items-center px-5">
        <span className="text-white font-medium text-sm">{title}</span>
      </div>
      <div className="p-5">
        <p className="text-3xl font-bold text-gray-900 dark:text-white mb-2">{value}</p>
        <p className="text-sm text-gray-500 dark:text-gray-400 flex items-center gap-1">
          <span className={`flex items-center gap-0.5 font-medium ${
            isGood ? 'text-success-600 dark:text-success-500' : 'text-danger-600 dark:text-danger-500'
          }`}>
            {change >= 0 ? <ArrowUpRight className="w-3.5 h-3.5" /> : <ArrowDownRight className="w-3.5 h-3.5" />}
            {changeAbs}%
          </span>
          vs last month
        </p>
      </div>
    </div>
  );
}

// ─── Transaction Detail Modal ─────────────────────────────────────────────────

interface TransactionDetailModalProps {
  transaction: Transaction;
  onClose: () => void;
}

function TransactionDetailModal({ transaction: t, onClose }: TransactionDetailModalProps) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50"
      onClick={onClose}
    >
      <div
        className="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-md border border-gray-200 dark:border-gray-700"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className={`h-12 flex items-center justify-between px-5 rounded-t-xl ${
          t.type === 'income' ? 'bg-success-600' : 'bg-danger-600'
        }`}>
          <div className="flex items-center gap-2 text-white font-medium">
            {t.type === 'income' ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
            {t.type === 'income' ? 'Income' : 'Expense'}
          </div>
          <button onClick={onClose} className="text-white/80 hover:text-white transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 space-y-4">
          <div className="text-center py-2">
            <p className={`text-4xl font-bold ${
              t.type === 'income' ? 'text-success-600' : 'text-danger-600'
            }`}>
              {t.type === 'income' ? '+' : '-'}{formatCurrency(t.amount, t.currency || 'USD')}
            </p>
          </div>
          <div className="grid grid-cols-2 gap-3 text-sm">
            <DetailRow label="Date" value={formatDate(t.date)} />
            <DetailRow label="Category" value={t.category} />
            <DetailRow label="Description" value={t.description} fullWidth />
            {t.pnlCenter && <DetailRow label="P&L Center" value={t.pnlCenter} fullWidth />}
            {t.type === 'income' && t.clientName && (
              <DetailRow label="Client" value={t.clientName} fullWidth />
            )}
            {t.type === 'income' && t.invoiceStatus && (
              <div className="col-span-2 flex items-center justify-between">
                <span className="text-gray-500 dark:text-gray-400 font-medium">Invoice Status</span>
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                  INVOICE_STATUS_COLORS[t.invoiceStatus] || 'bg-gray-100 text-gray-600'
                }`}>
                  {INVOICE_STATUS_LABELS[t.invoiceStatus] || t.invoiceStatus}
                </span>
              </div>
            )}
            {t.type === 'expense' && t.vendor && (
              <DetailRow label="Vendor" value={t.vendor} fullWidth />
            )}
            {t.type === 'expense' && t.paymentMethod && (
              <DetailRow label="Payment Method" value={t.paymentMethod} />
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 pb-5 flex justify-end gap-2">
          <Link
            to={t.type === 'income' ? '/income' : '/expenses'}
            className="btn btn-secondary btn-sm"
            onClick={onClose}
          >
            View all {t.type === 'income' ? 'income' : 'expenses'}
          </Link>
          <button onClick={onClose} className="btn btn-primary btn-sm">Close</button>
        </div>
      </div>
    </div>
  );
}

interface DetailRowProps {
  label: string;
  value: string;
  fullWidth?: boolean;
}

function DetailRow({ label, value, fullWidth }: DetailRowProps) {
  return (
    <div className={fullWidth ? 'col-span-2' : ''}>
      <p className="text-gray-500 dark:text-gray-400 font-medium mb-0.5">{label}</p>
      <p className="text-gray-900 dark:text-white">{value}</p>
    </div>
  );
}
