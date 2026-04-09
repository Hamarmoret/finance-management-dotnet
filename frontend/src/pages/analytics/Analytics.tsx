import { useState, useEffect } from 'react';
import {
  BarChart3,
  TrendingUp,
  TrendingDown,
  DollarSign,
  Calendar,
  RefreshCw,
  PieChart,
  Table,
  LineChart,
  Plus,
  Settings2,
  Eye,
  EyeOff,
  X,
} from 'lucide-react';
import { api, getErrorMessage } from '../../services/api';
import { formatCurrency } from '../../utils/formatters';
import { RevenueTrendChart } from './components/RevenueTrendChart';
import { ExpenseBreakdownChart } from './components/ExpenseBreakdownChart';
import { IncomeVsExpensesChart } from './components/IncomeVsExpensesChart';
import { PnlComparisonChart } from './components/PnlComparisonChart';
import { DateRangeFilter, DateRange } from './components/DateRangeFilter';
import { DrillDownModal, DrillDownItem } from './components/DrillDownModal';

type ViewType = 'chart' | 'table' | 'pie';

interface ViewToggleProps {
  view: ViewType;
  onChange: (view: ViewType) => void;
  showPie?: boolean;
}

function ViewToggle({ view, onChange, showPie = true }: ViewToggleProps) {
  return (
    <div className="flex rounded-lg border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 p-0.5">
      <button
        onClick={() => onChange('chart')}
        className={`p-1.5 rounded ${view === 'chart' ? 'bg-white dark:bg-gray-600 shadow-sm' : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'}`}
        title="Bar/Line Chart"
      >
        <LineChart className="w-4 h-4" />
      </button>
      {showPie && (
        <button
          onClick={() => onChange('pie')}
          className={`p-1.5 rounded ${view === 'pie' ? 'bg-white dark:bg-gray-600 shadow-sm' : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'}`}
          title="Pie Chart"
        >
          <PieChart className="w-4 h-4" />
        </button>
      )}
      <button
        onClick={() => onChange('table')}
        className={`p-1.5 rounded ${view === 'table' ? 'bg-white dark:bg-gray-600 shadow-sm' : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'}`}
        title="Table View"
      >
        <Table className="w-4 h-4" />
      </button>
    </div>
  );
}

type WidgetId = 'revenue-trend' | 'income-vs-expenses' | 'expense-breakdown' | 'pnl-comparison' | 'income-by-category';

const WIDGET_LABELS: Record<WidgetId, string> = {
  'revenue-trend': 'Revenue Trend',
  'income-vs-expenses': 'Income vs Expenses',
  'expense-breakdown': 'Expense Breakdown',
  'pnl-comparison': 'P&L Center Comparison',
  'income-by-category': 'Income by Category',
};

interface DashboardSummary {
  totalIncome: number;
  totalExpenses: number;
  netProfit: number;
  incomeChange: number;
  expenseChange: number;
  profitChange: number;
}

interface MonthlyData {
  month: string;
  year: number;
  income: number;
  expenses: number;
  profit: number;
}

interface CategoryBreakdown {
  categoryId: string;
  categoryName: string;
  amount: number;
  percentage: number;
}

interface PnlCenterStats {
  id: string;
  name: string;
  totalIncome: number;
  totalExpenses: number;
  netProfit: number;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type RawItem = any;

function formatPercentage(value: number): string {
  const sign = value >= 0 ? '+' : '';
  return `${sign}${value.toFixed(1)}%`;
}

function toExpenseItem(e: RawItem): DrillDownItem {
  return {
    id: e.id,
    date: e.expenseDate?.split('T')[0] ?? '',
    description: e.description,
    amount: e.amount,
    currency: e.currency ?? 'USD',
    category: e.category?.name ?? null,
    vendorOrClient: e.vendor ?? null,
    type: 'expense',
    notes: e.notes ?? null,
    pnlCenters: e.allocations?.map((a: RawItem) => a.pnlCenterName).filter(Boolean) ?? [],
  };
}

function toIncomeItem(i: RawItem): DrillDownItem {
  return {
    id: i.id,
    date: i.incomeDate?.split('T')[0] ?? '',
    description: i.description,
    amount: i.amount,
    currency: i.currency ?? 'USD',
    category: i.category?.name ?? null,
    vendorOrClient: i.clientName ?? null,
    type: 'income',
    notes: i.notes ?? null,
    invoiceStatus: i.invoiceStatus ?? null,
    pnlCenters: i.allocations?.map((a: RawItem) => a.pnlCenterName).filter(Boolean) ?? [],
  };
}

/** Returns "Jan" short name from a YYYY-MM-DD string without timezone issues */
function getMonthShort(dateStr: string): string {
  const [year, month] = dateStr.split('T')[0].split('-').map(Number);
  return new Date(year, month - 1, 1).toLocaleDateString('en-US', { month: 'short' });
}
function getYear(dateStr: string): number {
  return Number(dateStr.split('T')[0].split('-')[0]);
}

export default function Analytics() {
  const [dateRange, setDateRange] = useState<DateRange>({
    startDate: new Date(new Date().getFullYear(), 0, 1).toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0],
  });
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [monthlyData, setMonthlyData] = useState<MonthlyData[]>([]);
  const [expensesByCategory, setExpensesByCategory] = useState<CategoryBreakdown[]>([]);
  const [incomeByCategory, setIncomeByCategory] = useState<CategoryBreakdown[]>([]);
  const [pnlCenters, setPnlCenters] = useState<PnlCenterStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Raw data for drill-down
  const [rawExpenses, setRawExpenses] = useState<RawItem[]>([]);
  const [rawIncome, setRawIncome] = useState<RawItem[]>([]);

  // Drill-down modal
  const [drillDown, setDrillDown] = useState<{ title: string; subtitle?: string; items: DrillDownItem[] } | null>(null);

  // View preferences
  const [revenueView, setRevenueView] = useState<ViewType>('chart');
  const [incomeExpenseView, setIncomeExpenseView] = useState<ViewType>('chart');
  const [expenseBreakdownView, setExpenseBreakdownView] = useState<ViewType>('pie');
  const [pnlView, setPnlView] = useState<ViewType>('chart');

  // Widget visibility
  const [visibleWidgets, setVisibleWidgets] = useState<Set<WidgetId>>(() => {
    try {
      const saved = localStorage.getItem('analytics-widgets');
      if (saved) return new Set(JSON.parse(saved) as WidgetId[]);
    } catch { /* use default */ }
    return new Set<WidgetId>(['revenue-trend', 'income-vs-expenses', 'expense-breakdown', 'pnl-comparison', 'income-by-category']);
  });
  const [showWidgetManager, setShowWidgetManager] = useState(false);

  function toggleWidget(id: WidgetId) {
    setVisibleWidgets(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      localStorage.setItem('analytics-widgets', JSON.stringify([...next]));
      return next;
    });
  }

  const hiddenWidgets = (Object.keys(WIDGET_LABELS) as WidgetId[]).filter(id => !visibleWidgets.has(id));

  useEffect(() => { fetchAnalyticsData(); }, [dateRange]); // eslint-disable-line react-hooks/exhaustive-deps

  const fetchAnalyticsData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [expensesRes, incomeRes, pnlRes] = await Promise.all([
        api.get('/expenses', { params: { startDate: dateRange.startDate, endDate: dateRange.endDate, limit: 1000 } }),
        api.get('/income', { params: { startDate: dateRange.startDate, endDate: dateRange.endDate, limit: 1000 } }),
        api.get('/pnl-centers'),
      ]);

      const expenses: RawItem[] = expensesRes.data.data || [];
      const income: RawItem[] = incomeRes.data.data || [];
      setRawExpenses(expenses);
      setRawIncome(income);

      const totalIncome = income.reduce((s: number, i: RawItem) => s + i.amount, 0);
      const totalExpenses = expenses.reduce((s: number, e: RawItem) => s + e.amount, 0);
      setSummary({ totalIncome, totalExpenses, netProfit: totalIncome - totalExpenses, incomeChange: 0, expenseChange: 0, profitChange: 0 });

      // Monthly breakdown
      const monthlyMap = new Map<string, { month: string; year: number; income: number; expenses: number }>();
      income.forEach((item: RawItem) => {
        const dateStr: string = item.incomeDate ?? '';
        const [yr, mo] = dateStr.split('T')[0].split('-').map(Number);
        const key = `${yr}-${String(mo).padStart(2, '0')}`;
        const label = new Date(yr, mo - 1, 1).toLocaleDateString('en-US', { month: 'short' });
        const cur = monthlyMap.get(key) || { month: label, year: yr, income: 0, expenses: 0 };
        cur.income += item.amount;
        monthlyMap.set(key, cur);
      });
      expenses.forEach((item: RawItem) => {
        const dateStr: string = item.expenseDate ?? '';
        const [yr, mo] = dateStr.split('T')[0].split('-').map(Number);
        const key = `${yr}-${String(mo).padStart(2, '0')}`;
        const label = new Date(yr, mo - 1, 1).toLocaleDateString('en-US', { month: 'short' });
        const cur = monthlyMap.get(key) || { month: label, year: yr, income: 0, expenses: 0 };
        cur.expenses += item.amount;
        monthlyMap.set(key, cur);
      });
      const monthlyArray: MonthlyData[] = Array.from(monthlyMap.entries())
        .map(([, d]) => ({ ...d, profit: d.income - d.expenses }))
        .sort((a, b) => a.year !== b.year ? a.year - b.year : new Date(Date.parse(`${a.month} 1, ${a.year}`)).getMonth() - new Date(Date.parse(`${b.month} 1, ${b.year}`)).getMonth());
      setMonthlyData(monthlyArray);

      // Expense categories
      const expCatMap = new Map<string, { name: string; amount: number }>();
      expenses.forEach((item: RawItem) => {
        const name = item.category?.name || 'Uncategorized';
        const cur = expCatMap.get(name) || { name, amount: 0 };
        cur.amount += item.amount;
        expCatMap.set(name, cur);
      });
      const expBreakdown: CategoryBreakdown[] = Array.from(expCatMap.entries())
        .map(([id, d]) => ({ categoryId: id, categoryName: d.name, amount: d.amount, percentage: totalExpenses > 0 ? (d.amount / totalExpenses) * 100 : 0 }))
        .sort((a, b) => b.amount - a.amount);
      setExpensesByCategory(expBreakdown);

      // Income categories
      const incCatMap = new Map<string, { name: string; amount: number }>();
      income.forEach((item: RawItem) => {
        const name = item.category?.name || 'Uncategorized';
        const cur = incCatMap.get(name) || { name, amount: 0 };
        cur.amount += item.amount;
        incCatMap.set(name, cur);
      });
      const incBreakdown: CategoryBreakdown[] = Array.from(incCatMap.entries())
        .map(([id, d]) => ({ categoryId: id, categoryName: d.name, amount: d.amount, percentage: totalIncome > 0 ? (d.amount / totalIncome) * 100 : 0 }))
        .sort((a, b) => b.amount - a.amount);
      setIncomeByCategory(incBreakdown);

      setPnlCenters(pnlRes.data.data || []);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  // ── Drill-down helpers ─────────────────────────────────────────────────────

  function openKpiDrillDown(type: 'income' | 'expense' | 'all') {
    const items: DrillDownItem[] = [
      ...(type !== 'expense' ? rawIncome.map(toIncomeItem) : []),
      ...(type !== 'income' ? rawExpenses.map(toExpenseItem) : []),
    ];
    const label = type === 'income' ? 'Total Income' : type === 'expense' ? 'Total Expenses' : 'Net Profit';
    setDrillDown({ title: label, subtitle: `${dateRange.startDate} – ${dateRange.endDate}`, items });
  }

  function openMonthDrillDown(month: string, year: number, series?: 'income' | 'expenses') {
    const matchMonth = (dateStr: string) => getMonthShort(dateStr) === month && getYear(dateStr) === year;
    const items: DrillDownItem[] = [
      ...(series !== 'expenses' ? rawIncome.filter(i => matchMonth(i.incomeDate ?? '')).map(toIncomeItem) : []),
      ...(series !== 'income' ? rawExpenses.filter(e => matchMonth(e.expenseDate ?? '')).map(toExpenseItem) : []),
    ];
    const seriesLabel = series === 'income' ? ' – Income' : series === 'expenses' ? ' – Expenses' : '';
    setDrillDown({ title: `${month} ${year}${seriesLabel}`, items });
  }

  function openExpenseCategoryDrillDown(categoryName: string) {
    const items = rawExpenses
      .filter(e => (e.category?.name || 'Uncategorized') === categoryName)
      .map(toExpenseItem);
    setDrillDown({ title: `Expenses – ${categoryName}`, subtitle: `${items.length} transaction${items.length !== 1 ? 's' : ''}`, items });
  }

  function openIncomeCategoryDrillDown(categoryName: string) {
    const items = rawIncome
      .filter(i => (i.category?.name || 'Uncategorized') === categoryName)
      .map(toIncomeItem);
    setDrillDown({ title: `Income – ${categoryName}`, subtitle: `${items.length} transaction${items.length !== 1 ? 's' : ''}`, items });
  }

  function openPnlDrillDown(pnlId: string, pnlName: string) {
    const items: DrillDownItem[] = [
      ...rawIncome.filter(i => i.allocations?.some((a: RawItem) => a.pnlCenterId === pnlId)).map(toIncomeItem),
      ...rawExpenses.filter(e => e.allocations?.some((a: RawItem) => a.pnlCenterId === pnlId)).map(toExpenseItem),
    ];
    setDrillDown({ title: `P&L: ${pnlName}`, subtitle: `Income & expenses allocated to this center`, items });
  }

  // ──────────────────────────────────────────────────────────────────────────

  if (loading && !summary) {
    return (
      <div className="flex h-[calc(100vh-4rem)] items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <BarChart3 className="w-6 h-6 text-primary-600" />
            Analytics
          </h1>
          <p className="text-gray-600 dark:text-gray-400">Insights into your financial performance.</p>
        </div>
        <div className="flex items-center gap-3">
          <DateRangeFilter value={dateRange} onChange={setDateRange} />
          <div className="relative">
            <button
              onClick={() => setShowWidgetManager(!showWidgetManager)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 transition-colors"
            >
              <Settings2 className="w-4 h-4" />
              <span className="hidden sm:inline">Widgets</span>
            </button>
            {showWidgetManager && (
              <div className="absolute right-0 top-full mt-2 w-72 dropdown-menu z-20 p-3">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Manage Widgets</h3>
                  <button onClick={() => setShowWidgetManager(false)} className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 rounded">
                    <X className="w-4 h-4" />
                  </button>
                </div>
                <div className="space-y-1">
                  {(Object.keys(WIDGET_LABELS) as WidgetId[]).map(id => (
                    <button key={id} onClick={() => toggleWidget(id)}
                      className="w-full flex items-center justify-between px-3 py-2 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors text-sm">
                      <span className={visibleWidgets.has(id) ? 'text-gray-900 dark:text-white' : 'text-gray-400 dark:text-gray-500'}>
                        {WIDGET_LABELS[id]}
                      </span>
                      {visibleWidgets.has(id) ? <Eye className="w-4 h-4 text-primary-600" /> : <EyeOff className="w-4 h-4 text-gray-300" />}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
          <button onClick={fetchAnalyticsData} disabled={loading}
            className="flex items-center justify-center p-1.5 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 transition-colors disabled:opacity-50">
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {error && <div className="bg-danger-50 text-danger-700 px-4 py-3 rounded-lg">{error}</div>}

      {/* KPI Cards — clickable */}
      {summary && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <button
            onClick={() => openKpiDrillDown('income')}
            className="card card-body text-left hover:ring-2 hover:ring-success-300 dark:hover:ring-success-700 transition-all cursor-pointer"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Total Income</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{formatCurrency(summary.totalIncome)}</p>
              </div>
              <div className="w-12 h-12 bg-success-50 rounded-full flex items-center justify-center">
                <DollarSign className="w-6 h-6 text-success-600" />
              </div>
            </div>
            {summary.incomeChange !== 0 && (
              <div className="mt-2 flex items-center text-sm">
                {summary.incomeChange >= 0 ? <TrendingUp className="w-4 h-4 text-success-500 mr-1" /> : <TrendingDown className="w-4 h-4 text-danger-500 mr-1" />}
                <span className={summary.incomeChange >= 0 ? 'text-success-600' : 'text-danger-600'}>{formatPercentage(summary.incomeChange)}</span>
                <span className="text-gray-500 dark:text-gray-400 ml-1">vs previous period</span>
              </div>
            )}
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-2">Click to see transactions →</p>
          </button>

          <button
            onClick={() => openKpiDrillDown('expense')}
            className="card card-body text-left hover:ring-2 hover:ring-danger-300 dark:hover:ring-danger-700 transition-all cursor-pointer"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Total Expenses</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{formatCurrency(summary.totalExpenses)}</p>
              </div>
              <div className="w-12 h-12 bg-danger-50 rounded-full flex items-center justify-center">
                <TrendingDown className="w-6 h-6 text-danger-600" />
              </div>
            </div>
            {summary.expenseChange !== 0 && (
              <div className="mt-2 flex items-center text-sm">
                {summary.expenseChange <= 0 ? <TrendingDown className="w-4 h-4 text-success-500 mr-1" /> : <TrendingUp className="w-4 h-4 text-danger-500 mr-1" />}
                <span className={summary.expenseChange <= 0 ? 'text-success-600' : 'text-danger-600'}>{formatPercentage(summary.expenseChange)}</span>
                <span className="text-gray-500 dark:text-gray-400 ml-1">vs previous period</span>
              </div>
            )}
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-2">Click to see transactions →</p>
          </button>

          <button
            onClick={() => openKpiDrillDown('all')}
            className="card card-body text-left hover:ring-2 hover:ring-primary-300 dark:hover:ring-primary-700 transition-all cursor-pointer"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Net Profit</p>
                <p className={`text-2xl font-bold ${summary.netProfit >= 0 ? 'text-success-600' : 'text-danger-600'}`}>
                  {formatCurrency(summary.netProfit)}
                </p>
              </div>
              <div className={`w-12 h-12 rounded-full flex items-center justify-center ${summary.netProfit >= 0 ? 'bg-success-50' : 'bg-danger-50'}`}>
                <Calendar className={`w-6 h-6 ${summary.netProfit >= 0 ? 'text-success-600' : 'text-danger-600'}`} />
              </div>
            </div>
            {summary.profitChange !== 0 && (
              <div className="mt-2 flex items-center text-sm">
                {summary.profitChange >= 0 ? <TrendingUp className="w-4 h-4 text-success-500 mr-1" /> : <TrendingDown className="w-4 h-4 text-danger-500 mr-1" />}
                <span className={summary.profitChange >= 0 ? 'text-success-600' : 'text-danger-600'}>{formatPercentage(summary.profitChange)}</span>
                <span className="text-gray-500 dark:text-gray-400 ml-1">vs previous period</span>
              </div>
            )}
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-2">Click to see all transactions →</p>
          </button>
        </div>
      )}

      {/* Charts Row 1 */}
      {(visibleWidgets.has('revenue-trend') || visibleWidgets.has('income-vs-expenses')) && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {visibleWidgets.has('revenue-trend') && (
            <div className="card">
              <div className="card-header flex items-center justify-between">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Revenue Trend</h2>
                <ViewToggle view={revenueView} onChange={setRevenueView} showPie={false} />
              </div>
              <div className="card-body">
                {revenueView === 'chart' ? (
                  <RevenueTrendChart data={monthlyData} onPointClick={(m, y) => openMonthDrillDown(m, y)} />
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-gray-50 dark:bg-gray-700/50">
                        <tr>
                          <th className="px-4 py-2 text-left font-medium text-gray-500 dark:text-gray-400">Month</th>
                          <th className="px-4 py-2 text-right font-medium text-gray-500 dark:text-gray-400">Income</th>
                          <th className="px-4 py-2 text-right font-medium text-gray-500 dark:text-gray-400">Expenses</th>
                          <th className="px-4 py-2 text-right font-medium text-gray-500 dark:text-gray-400">Profit</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y dark:divide-gray-700">
                        {monthlyData.map((row) => (
                          <tr key={`${row.month}-${row.year}`}
                            onClick={() => openMonthDrillDown(row.month, row.year)}
                            className="hover:bg-gray-50 dark:hover:bg-gray-700/50 cursor-pointer">
                            <td className="px-4 py-2">{row.month} {row.year}</td>
                            <td className="px-4 py-2 text-right text-success-600">{formatCurrency(row.income)}</td>
                            <td className="px-4 py-2 text-right text-danger-600">{formatCurrency(row.expenses)}</td>
                            <td className={`px-4 py-2 text-right font-medium ${row.profit >= 0 ? 'text-success-600' : 'text-danger-600'}`}>
                              {formatCurrency(row.profit)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}

          {visibleWidgets.has('income-vs-expenses') && (
            <div className="card">
              <div className="card-header flex items-center justify-between">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Income vs Expenses</h2>
                <ViewToggle view={incomeExpenseView} onChange={setIncomeExpenseView} showPie={false} />
              </div>
              <div className="card-body">
                {incomeExpenseView === 'chart' ? (
                  <IncomeVsExpensesChart data={monthlyData} onBarClick={(m, y, s) => openMonthDrillDown(m, y, s)} />
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-gray-50 dark:bg-gray-700/50">
                        <tr>
                          <th className="px-4 py-2 text-left font-medium text-gray-500 dark:text-gray-400">Month</th>
                          <th className="px-4 py-2 text-right font-medium text-gray-500 dark:text-gray-400">Income</th>
                          <th className="px-4 py-2 text-right font-medium text-gray-500 dark:text-gray-400">Expenses</th>
                          <th className="px-4 py-2 text-right font-medium text-gray-500 dark:text-gray-400">Net</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y dark:divide-gray-700">
                        {monthlyData.map((row) => (
                          <tr key={`${row.month}-${row.year}`}
                            onClick={() => openMonthDrillDown(row.month, row.year)}
                            className="hover:bg-gray-50 dark:hover:bg-gray-700/50 cursor-pointer">
                            <td className="px-4 py-2">{row.month} {row.year}</td>
                            <td className="px-4 py-2 text-right text-success-600 cursor-pointer"
                              onClick={e => { e.stopPropagation(); openMonthDrillDown(row.month, row.year, 'income'); }}>
                              {formatCurrency(row.income)}
                            </td>
                            <td className="px-4 py-2 text-right text-danger-600 cursor-pointer"
                              onClick={e => { e.stopPropagation(); openMonthDrillDown(row.month, row.year, 'expenses'); }}>
                              {formatCurrency(row.expenses)}
                            </td>
                            <td className={`px-4 py-2 text-right font-medium ${row.profit >= 0 ? 'text-success-600' : 'text-danger-600'}`}>
                              {formatCurrency(row.profit)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Charts Row 2 */}
      {(visibleWidgets.has('expense-breakdown') || visibleWidgets.has('pnl-comparison')) && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {visibleWidgets.has('expense-breakdown') && (
            <div className="card">
              <div className="card-header flex items-center justify-between">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Expense Breakdown</h2>
                <ViewToggle view={expenseBreakdownView} onChange={setExpenseBreakdownView} />
              </div>
              <div className="card-body">
                {expenseBreakdownView === 'table' ? (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-gray-50 dark:bg-gray-700/50">
                        <tr>
                          <th className="px-4 py-2 text-left font-medium text-gray-500 dark:text-gray-400">Category</th>
                          <th className="px-4 py-2 text-right font-medium text-gray-500 dark:text-gray-400">Amount</th>
                          <th className="px-4 py-2 text-right font-medium text-gray-500 dark:text-gray-400">% of Total</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y dark:divide-gray-700">
                        {expensesByCategory.map((cat) => (
                          <tr key={cat.categoryId}
                            onClick={() => openExpenseCategoryDrillDown(cat.categoryName)}
                            className="hover:bg-gray-50 dark:hover:bg-gray-700/50 cursor-pointer">
                            <td className="px-4 py-2 font-medium">{cat.categoryName}</td>
                            <td className="px-4 py-2 text-right">{formatCurrency(cat.amount)}</td>
                            <td className="px-4 py-2 text-right">{cat.percentage.toFixed(1)}%</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <ExpenseBreakdownChart
                    data={expensesByCategory}
                    viewType={expenseBreakdownView}
                    onCategoryClick={openExpenseCategoryDrillDown}
                  />
                )}
              </div>
            </div>
          )}

          {visibleWidgets.has('pnl-comparison') && (
            <div className="card">
              <div className="card-header flex items-center justify-between">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">P&L Center Comparison</h2>
                <ViewToggle view={pnlView} onChange={setPnlView} />
              </div>
              <div className="card-body">
                {pnlView === 'table' ? (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-gray-50 dark:bg-gray-700/50">
                        <tr>
                          <th className="px-4 py-2 text-left font-medium text-gray-500 dark:text-gray-400">P&L Center</th>
                          <th className="px-4 py-2 text-right font-medium text-gray-500 dark:text-gray-400">Income</th>
                          <th className="px-4 py-2 text-right font-medium text-gray-500 dark:text-gray-400">Expenses</th>
                          <th className="px-4 py-2 text-right font-medium text-gray-500 dark:text-gray-400">Net Profit</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y dark:divide-gray-700">
                        {pnlCenters.map((pnl) => (
                          <tr key={pnl.id}
                            onClick={() => openPnlDrillDown(pnl.id, pnl.name)}
                            className="hover:bg-gray-50 dark:hover:bg-gray-700/50 cursor-pointer">
                            <td className="px-4 py-2 font-medium">{pnl.name}</td>
                            <td className="px-4 py-2 text-right text-success-600">{formatCurrency(pnl.totalIncome)}</td>
                            <td className="px-4 py-2 text-right text-danger-600">{formatCurrency(pnl.totalExpenses)}</td>
                            <td className={`px-4 py-2 text-right font-medium ${pnl.netProfit >= 0 ? 'text-success-600' : 'text-danger-600'}`}>
                              {formatCurrency(pnl.netProfit)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <PnlComparisonChart
                    data={pnlCenters}
                    viewType={pnlView}
                    onPnlClick={openPnlDrillDown}
                  />
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Income by Category */}
      {visibleWidgets.has('income-by-category') && incomeByCategory.length > 0 && (
        <div className="card">
          <div className="card-header">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Income by Category</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-gray-700/50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Category</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Amount</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">% of Total</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Distribution</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {incomeByCategory.map((cat) => (
                  <tr key={cat.categoryId}
                    onClick={() => openIncomeCategoryDrillDown(cat.categoryName)}
                    className="hover:bg-gray-50 dark:hover:bg-gray-700/50 cursor-pointer">
                    <td className="px-6 py-4 whitespace-nowrap font-medium text-gray-900 dark:text-white">{cat.categoryName}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-right">{formatCurrency(cat.amount)}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-right">{cat.percentage.toFixed(1)}%</td>
                    <td className="px-6 py-4">
                      <div className="w-full bg-gray-200 dark:bg-gray-600 rounded-full h-2 max-w-[200px]">
                        <div className="h-2 rounded-full bg-success-500" style={{ width: `${cat.percentage}%` }} />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {hiddenWidgets.length > 0 && (
        <div className="text-center py-4">
          <button onClick={() => setShowWidgetManager(true)}
            className="inline-flex items-center gap-2 px-4 py-2 text-sm text-gray-500 hover:text-primary-600 border border-dashed border-gray-300 hover:border-primary-300 rounded-lg transition-colors">
            <Plus className="w-4 h-4" />
            Add widget ({hiddenWidgets.length} hidden)
          </button>
        </div>
      )}

      {/* Drill-down modal */}
      {drillDown && (
        <DrillDownModal
          title={drillDown.title}
          subtitle={drillDown.subtitle}
          items={drillDown.items}
          onClose={() => setDrillDown(null)}
        />
      )}
    </div>
  );
}
