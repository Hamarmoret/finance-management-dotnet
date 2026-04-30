import { useState, useEffect, useMemo } from 'react';
import { Loader2, ChevronDown, ChevronRight } from 'lucide-react';
import { api } from '../../services/api';
import { formatCurrency } from '../../utils/formatters';
import { PeriodSelector, getPeriodLabel } from '../../components/PeriodSelector';

interface IncomeItem {
  id: string;
  amount: number;
  incomeDate: string;
  invoiceStatus?: string;
  paymentReceivedDate?: string | null;
  currency?: string;
  category?: { name: string };
}

interface ExpenseItem {
  id: string;
  amount: number;
  expenseDate: string;
  currency?: string;
  category?: { name: string };
}

interface PnlRow {
  periodKey: string;
  label: string;
  revenue: number;
  collected: number;
  outstanding: number;
  expenses: number;
  netPnl: number;
  netCash: number;
}

function getMonthKey(dateStr: string): string {
  const d = new Date(dateStr);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

function getMonthLabel(key: string): string {
  const [year, month] = key.split('-');
  return new Date(+year, +month - 1).toLocaleString('default', { month: 'short', year: '2-digit' });
}

function getQuarterKey(dateStr: string): string {
  const d = new Date(dateStr);
  const q = Math.floor(d.getMonth() / 3) + 1;
  return `${d.getFullYear()}-Q${q}`;
}

function getQuarterLabel(key: string): string {
  const [year, q] = key.split('-');
  return `${q} '${year.slice(-2)}`;
}

const isCollected = (i: IncomeItem) =>
  i.invoiceStatus === 'paid' || (!!i.paymentReceivedDate);

export default function ProfitLoss() {
  const [startDate, setStartDate] = useState(() => `${new Date().getFullYear()}-01-01`);
  const [endDate, setEndDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [groupBy, setGroupBy] = useState<'month' | 'quarter'>('month');
  const [income, setIncome] = useState<IncomeItem[]>([]);
  const [expenses, setExpenses] = useState<ExpenseItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showRevCategories, setShowRevCategories] = useState(true);
  const [showExpCategories, setShowExpCategories] = useState(true);

  useEffect(() => {
    let cancelled = false;
    async function fetchData() {
      setLoading(true);
      try {
        const params: Record<string, string> = { limit: '1000' };
        if (startDate) params.startDate = startDate;
        if (endDate) params.endDate = endDate;
        const [incomeRes, expenseRes] = await Promise.all([
          api.get('/income', { params }),
          api.get('/expenses', { params }),
        ]);
        if (!cancelled) {
          setIncome(incomeRes.data.data || []);
          setExpenses(expenseRes.data.data || []);
        }
      } catch {
        // silently fail
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    fetchData();
    return () => { cancelled = true; };
  }, [startDate, endDate]);

  const { rows, totals } = useMemo(() => {
    const keyFn = groupBy === 'month' ? getMonthKey : getQuarterKey;
    const labelFn = groupBy === 'month' ? getMonthLabel : getQuarterLabel;

    const accrualIncome = income.filter(
      i => i.invoiceStatus !== 'draft' && i.invoiceStatus !== 'cancelled'
    );

    const map = new Map<string, Omit<PnlRow, 'outstanding' | 'netPnl' | 'netCash'>>();

    for (const i of accrualIncome) {
      const key = keyFn(i.incomeDate);
      const row = map.get(key) ?? { periodKey: key, label: labelFn(key), revenue: 0, collected: 0, expenses: 0 };
      row.revenue += i.amount;
      if (isCollected(i)) row.collected += i.amount;
      map.set(key, row);
    }

    for (const e of expenses) {
      const key = keyFn(e.expenseDate);
      const row = map.get(key) ?? { periodKey: key, label: labelFn(key), revenue: 0, collected: 0, expenses: 0 };
      row.expenses += e.amount;
      map.set(key, row);
    }

    const rows: PnlRow[] = Array.from(map.values())
      .sort((a, b) => a.periodKey.localeCompare(b.periodKey))
      .map(r => ({
        ...r,
        outstanding: r.revenue - r.collected,
        netPnl: r.revenue - r.expenses,
        netCash: r.collected - r.expenses,
      }));

    const totals: PnlRow = {
      periodKey: 'total',
      label: 'Total',
      revenue: rows.reduce((s, r) => s + r.revenue, 0),
      collected: rows.reduce((s, r) => s + r.collected, 0),
      outstanding: rows.reduce((s, r) => s + r.outstanding, 0),
      expenses: rows.reduce((s, r) => s + r.expenses, 0),
      netPnl: rows.reduce((s, r) => s + r.netPnl, 0),
      netCash: rows.reduce((s, r) => s + r.netCash, 0),
    };

    return { rows, totals };
  }, [income, expenses, groupBy]);

  const revenueByCategory = useMemo(() => {
    const accrualIncome = income.filter(
      i => i.invoiceStatus !== 'draft' && i.invoiceStatus !== 'cancelled'
    );
    const map = new Map<string, { revenue: number; collected: number }>();
    for (const i of accrualIncome) {
      const cat = i.category?.name ?? 'Uncategorized';
      const entry = map.get(cat) ?? { revenue: 0, collected: 0 };
      entry.revenue += i.amount;
      if (isCollected(i)) entry.collected += i.amount;
      map.set(cat, entry);
    }
    return Array.from(map.entries())
      .map(([cat, v]) => ({ cat, ...v, outstanding: v.revenue - v.collected }))
      .sort((a, b) => b.revenue - a.revenue);
  }, [income]);

  const expensesByCategory = useMemo(() => {
    const totalExp = expenses.reduce((s, e) => s + e.amount, 0);
    const map = new Map<string, number>();
    for (const e of expenses) {
      const cat = e.category?.name ?? 'Uncategorized';
      map.set(cat, (map.get(cat) ?? 0) + e.amount);
    }
    return Array.from(map.entries())
      .map(([cat, amount]) => ({
        cat,
        amount,
        pct: totalExp > 0 ? ((amount / totalExp) * 100).toFixed(1) : '0.0',
      }))
      .sort((a, b) => b.amount - a.amount);
  }, [expenses]);

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">P&L Report</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
            Accrual-based · {getPeriodLabel(startDate, endDate)}
          </p>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex rounded-lg border border-gray-200 dark:border-gray-600 overflow-hidden text-sm">
            {(['month', 'quarter'] as const).map(g => (
              <button
                key={g}
                onClick={() => setGroupBy(g)}
                className={`px-3 py-1.5 font-medium transition-colors ${
                  groupBy === g
                    ? 'bg-primary-600 text-white'
                    : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700'
                }`}
              >
                {g === 'month' ? 'Monthly' : 'Quarterly'}
              </button>
            ))}
          </div>
          <PeriodSelector
            startDate={startDate}
            endDate={endDate}
            onChange={(s, e) => { setStartDate(s); setEndDate(e); }}
          />
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-primary-600" />
        </div>
      ) : (
        <>
          {/* Summary Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
            <PnlSummaryCard label="Revenue" value={totals.revenue} color="green" subtitle="Accrual" />
            <PnlSummaryCard label="Collected" value={totals.collected} color="blue" />
            <PnlSummaryCard
              label="Outstanding"
              value={totals.outstanding}
              color={totals.outstanding > 0 ? 'amber' : 'gray'}
            />
            <PnlSummaryCard label="Expenses" value={totals.expenses} color="red" />
            <PnlSummaryCard
              label="Net P&L"
              value={totals.netPnl}
              color={totals.netPnl >= 0 ? 'green' : 'red'}
            />
            <PnlSummaryCard
              label="Net Cash"
              value={totals.netCash}
              color={totals.netCash >= 0 ? 'green' : 'red'}
            />
          </div>

          {/* P&L Table */}
          <div className="card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 dark:bg-gray-700/50 border-b border-gray-200 dark:border-gray-700">
                    <th className="px-4 py-3 text-left font-medium text-gray-700 dark:text-gray-300">Period</th>
                    <th className="px-4 py-3 text-right font-medium text-green-700 dark:text-green-400">Revenue</th>
                    <th className="px-4 py-3 text-right font-medium text-blue-700 dark:text-blue-400">Collected</th>
                    <th className="px-4 py-3 text-right font-medium text-amber-600 dark:text-amber-400">Outstanding</th>
                    <th className="px-4 py-3 text-right font-medium text-red-700 dark:text-red-400">Expenses</th>
                    <th className="px-4 py-3 text-right font-medium text-gray-700 dark:text-gray-300">Net P&L</th>
                    <th className="px-4 py-3 text-right font-medium text-gray-700 dark:text-gray-300">Net Cash</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-700/50">
                  {rows.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-4 py-12 text-center text-gray-500 dark:text-gray-400">
                        No data for this period
                      </td>
                    </tr>
                  ) : rows.map(r => (
                    <tr key={r.periodKey} className="hover:bg-gray-50 dark:hover:bg-gray-700/30">
                      <td className="px-4 py-3 font-medium text-gray-900 dark:text-white">{r.label}</td>
                      <td className="px-4 py-3 text-right text-green-600 dark:text-green-400">
                        {r.revenue > 0 ? formatCurrency(r.revenue, 'ILS') : '—'}
                      </td>
                      <td className="px-4 py-3 text-right text-blue-600 dark:text-blue-400">
                        {r.collected > 0 ? formatCurrency(r.collected, 'ILS') : '—'}
                      </td>
                      <td className="px-4 py-3 text-right text-amber-600 dark:text-amber-400">
                        {r.outstanding > 0 ? formatCurrency(r.outstanding, 'ILS') : '—'}
                      </td>
                      <td className="px-4 py-3 text-right text-red-600 dark:text-red-400">
                        {r.expenses > 0 ? formatCurrency(r.expenses, 'ILS') : '—'}
                      </td>
                      <td className={`px-4 py-3 text-right font-medium ${r.netPnl >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                        {formatCurrency(r.netPnl, 'ILS')}
                      </td>
                      <td className={`px-4 py-3 text-right font-medium ${r.netCash >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                        {formatCurrency(r.netCash, 'ILS')}
                      </td>
                    </tr>
                  ))}
                </tbody>
                {rows.length > 0 && (
                  <tfoot>
                    <tr className="bg-gray-50 dark:bg-gray-700/50 border-t-2 border-gray-300 dark:border-gray-600 font-bold">
                      <td className="px-4 py-3 text-gray-900 dark:text-white">Total</td>
                      <td className="px-4 py-3 text-right text-green-600 dark:text-green-400">
                        {formatCurrency(totals.revenue, 'ILS')}
                      </td>
                      <td className="px-4 py-3 text-right text-blue-600 dark:text-blue-400">
                        {formatCurrency(totals.collected, 'ILS')}
                      </td>
                      <td className="px-4 py-3 text-right text-amber-600 dark:text-amber-400">
                        {totals.outstanding > 0 ? formatCurrency(totals.outstanding, 'ILS') : '—'}
                      </td>
                      <td className="px-4 py-3 text-right text-red-600 dark:text-red-400">
                        {formatCurrency(totals.expenses, 'ILS')}
                      </td>
                      <td className={`px-4 py-3 text-right ${totals.netPnl >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                        {formatCurrency(totals.netPnl, 'ILS')}
                      </td>
                      <td className={`px-4 py-3 text-right ${totals.netCash >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                        {formatCurrency(totals.netCash, 'ILS')}
                      </td>
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>
          </div>

          {/* Category Breakdowns */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Revenue by Category */}
            <div className="card overflow-hidden">
              <button
                onClick={() => setShowRevCategories(!showRevCategories)}
                className="w-full flex items-center justify-between px-4 py-3 border-b dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors"
              >
                <span className="font-medium text-gray-900 dark:text-white text-sm">Revenue by Category</span>
                {showRevCategories
                  ? <ChevronDown className="w-4 h-4 text-gray-400" />
                  : <ChevronRight className="w-4 h-4 text-gray-400" />}
              </button>
              {showRevCategories && (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-gray-50 dark:bg-gray-700/40 text-xs text-gray-500 dark:text-gray-400">
                        <th className="px-4 py-2 text-left font-medium">Category</th>
                        <th className="px-4 py-2 text-right font-medium text-green-700 dark:text-green-400">Revenue</th>
                        <th className="px-4 py-2 text-right font-medium text-blue-700 dark:text-blue-400">Collected</th>
                        <th className="px-4 py-2 text-right font-medium text-amber-600 dark:text-amber-400">Outstanding</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 dark:divide-gray-700/50">
                      {revenueByCategory.length === 0 ? (
                        <tr>
                          <td colSpan={4} className="px-4 py-8 text-center text-xs text-gray-400">
                            No accrual revenue in this period
                          </td>
                        </tr>
                      ) : revenueByCategory.map(r => (
                        <tr key={r.cat} className="hover:bg-gray-50 dark:hover:bg-gray-700/30">
                          <td className="px-4 py-2.5 text-gray-700 dark:text-gray-300">{r.cat}</td>
                          <td className="px-4 py-2.5 text-right text-green-600 dark:text-green-400">
                            {formatCurrency(r.revenue, 'ILS')}
                          </td>
                          <td className="px-4 py-2.5 text-right text-blue-600 dark:text-blue-400">
                            {formatCurrency(r.collected, 'ILS')}
                          </td>
                          <td className="px-4 py-2.5 text-right text-amber-600 dark:text-amber-400">
                            {r.outstanding > 0 ? formatCurrency(r.outstanding, 'ILS') : '—'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Expenses by Category */}
            <div className="card overflow-hidden">
              <button
                onClick={() => setShowExpCategories(!showExpCategories)}
                className="w-full flex items-center justify-between px-4 py-3 border-b dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors"
              >
                <span className="font-medium text-gray-900 dark:text-white text-sm">Expenses by Category</span>
                {showExpCategories
                  ? <ChevronDown className="w-4 h-4 text-gray-400" />
                  : <ChevronRight className="w-4 h-4 text-gray-400" />}
              </button>
              {showExpCategories && (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-gray-50 dark:bg-gray-700/40 text-xs text-gray-500 dark:text-gray-400">
                        <th className="px-4 py-2 text-left font-medium">Category</th>
                        <th className="px-4 py-2 text-right font-medium text-red-700 dark:text-red-400">Amount</th>
                        <th className="px-4 py-2 text-right font-medium">% of Total</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 dark:divide-gray-700/50">
                      {expensesByCategory.length === 0 ? (
                        <tr>
                          <td colSpan={3} className="px-4 py-8 text-center text-xs text-gray-400">
                            No expenses in this period
                          </td>
                        </tr>
                      ) : expensesByCategory.map(r => (
                        <tr key={r.cat} className="hover:bg-gray-50 dark:hover:bg-gray-700/30">
                          <td className="px-4 py-2.5 text-gray-700 dark:text-gray-300">{r.cat}</td>
                          <td className="px-4 py-2.5 text-right text-red-600 dark:text-red-400">
                            {formatCurrency(r.amount, 'ILS')}
                          </td>
                          <td className="px-4 py-2.5 text-right text-gray-500 dark:text-gray-400">{r.pct}%</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

// ── Local Summary Card ────────────────────────────────────────────────────────

type CardColor = 'green' | 'blue' | 'red' | 'amber' | 'gray';

function PnlSummaryCard({
  label,
  value,
  color,
  subtitle,
}: {
  label: string;
  value: number;
  color: CardColor;
  subtitle?: string;
}) {
  const cls: Record<CardColor, string> = {
    green: 'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400',
    blue: 'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400',
    red: 'bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400',
    amber: 'bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400',
    gray: 'bg-gray-100 dark:bg-gray-700/40 text-gray-600 dark:text-gray-400',
  };
  return (
    <div className={`rounded-xl p-4 ${cls[color]}`}>
      <p className="text-xs font-medium opacity-75 mb-1">
        {label}{subtitle && <span className="ml-1 opacity-60">({subtitle})</span>}
      </p>
      <p className="text-lg font-bold leading-tight">{formatCurrency(value, 'ILS')}</p>
    </div>
  );
}
