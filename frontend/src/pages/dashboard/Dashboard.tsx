import { useState, useEffect } from 'react';
import { useAuthStore } from '../../stores/authStore';
import { api, getErrorMessage } from '../../services/api';
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  Receipt,
  AlertCircle,
  Loader2,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { formatCurrency, formatDateShort } from '../../utils/formatters';

interface SummaryData {
  totalIncome: number;
  totalExpenses: number;
  netProfit: number;
  pendingInvoices: number;
  overdueInvoices: number;
}

interface Transaction {
  id: string;
  description: string;
  amount: number;
  type: 'income' | 'expense';
  date: string;
  category: string;
}

export default function Dashboard() {
  const { user } = useAuthStore();
  const [summaryData, setSummaryData] = useState<SummaryData | null>(null);
  const [recentTransactions, setRecentTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchDashboardData = async () => {
      setLoading(true);
      setError(null);

      try {
        // Fetch income and expenses in parallel
        const [incomeRes, expensesRes] = await Promise.all([
          api.get('/income', { params: { limit: 20, sortOrder: 'desc' } }),
          api.get('/expenses', { params: { limit: 20, sortOrder: 'desc' } }),
        ]);

        const incomeData = incomeRes.data.data || [];
        const expensesData = expensesRes.data.data || [];

        // Calculate totals from real data
        const totalIncome = incomeData.reduce((sum: number, i: { amount: number }) => sum + i.amount, 0);
        const totalExpenses = expensesData.reduce((sum: number, e: { amount: number }) => sum + e.amount, 0);

        // Count pending and overdue invoices
        const pendingInvoices = incomeData.filter(
          (i: { invoiceStatus?: string }) => i.invoiceStatus === 'sent' || i.invoiceStatus === 'draft'
        ).length;
        const overdueInvoices = incomeData.filter(
          (i: { invoiceStatus?: string }) => i.invoiceStatus === 'overdue'
        ).length;

        setSummaryData({
          totalIncome,
          totalExpenses,
          netProfit: totalIncome - totalExpenses,
          pendingInvoices,
          overdueInvoices,
        });

        // Merge and format transactions
        const incomeTransactions: Transaction[] = incomeData.map((i: {
          id: string;
          description?: string;
          clientName?: string;
          amount: number;
          incomeDate: string;
          category?: { name: string };
        }) => ({
          id: i.id,
          description: i.description || i.clientName || 'Income',
          amount: i.amount,
          type: 'income' as const,
          date: i.incomeDate,
          category: i.category?.name || 'Uncategorized',
        }));

        const expenseTransactions: Transaction[] = expensesData.map((e: {
          id: string;
          description?: string;
          vendor?: string;
          amount: number;
          expenseDate: string;
          category?: { name: string };
        }) => ({
          id: e.id,
          description: e.description || e.vendor || 'Expense',
          amount: e.amount,
          type: 'expense' as const,
          date: e.expenseDate,
          category: e.category?.name || 'Uncategorized',
        }));

        // Combine and sort by date (most recent first)
        const combined = [...incomeTransactions, ...expenseTransactions]
          .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
          .slice(0, 10);

        setRecentTransactions(combined);
      } catch (err) {
        setError(getErrorMessage(err));
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, []);

  if (loading) {
    return (
      <div className="flex h-[calc(100vh-4rem)] items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary-600" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">
          Welcome back, {user?.firstName}!
        </h1>
        <p className="text-gray-600">Here's an overview of your financial status.</p>
      </div>

      {error && (
        <div className="bg-danger-50 text-danger-700 px-4 py-3 rounded-lg">
          {error}
        </div>
      )}

      {/* Summary Cards */}
      {summaryData && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="card card-body">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Total Income</p>
                <p className="text-2xl font-bold text-gray-900">
                  {formatCurrency(summaryData.totalIncome)}
                </p>
              </div>
              <div className="w-12 h-12 bg-success-50 rounded-full flex items-center justify-center">
                <TrendingUp className="w-6 h-6 text-success-600" />
              </div>
            </div>
          </div>

          <div className="card card-body">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Total Expenses</p>
                <p className="text-2xl font-bold text-gray-900">
                  {formatCurrency(summaryData.totalExpenses)}
                </p>
              </div>
              <div className="w-12 h-12 bg-danger-50 rounded-full flex items-center justify-center">
                <TrendingDown className="w-6 h-6 text-danger-600" />
              </div>
            </div>
          </div>

          <div className="card card-body">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Net Profit</p>
                <p className={`text-2xl font-bold ${summaryData.netProfit >= 0 ? 'text-success-600' : 'text-danger-600'}`}>
                  {formatCurrency(summaryData.netProfit)}
                </p>
              </div>
              <div className="w-12 h-12 bg-primary-50 rounded-full flex items-center justify-center">
                <DollarSign className="w-6 h-6 text-primary-600" />
              </div>
            </div>
          </div>

          <div className="card card-body">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Pending Invoices</p>
                <p className="text-2xl font-bold text-gray-900">
                  {summaryData.pendingInvoices}
                </p>
              </div>
              <div className="w-12 h-12 bg-warning-50 rounded-full flex items-center justify-center">
                <Receipt className="w-6 h-6 text-warning-600" />
              </div>
            </div>
            {summaryData.overdueInvoices > 0 && (
              <div className="mt-2 flex items-center text-sm text-danger-600">
                <AlertCircle className="w-4 h-4 mr-1" />
                {summaryData.overdueInvoices} overdue
              </div>
            )}
          </div>
        </div>
      )}

      {/* Recent Transactions */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card">
          <div className="card-header">
            <h2 className="text-lg font-semibold text-gray-900">Recent Transactions</h2>
          </div>
          <div className="divide-y">
            {recentTransactions.length === 0 ? (
              <div className="px-6 py-8 text-center text-gray-500">
                No transactions yet. Add your first income or expense!
              </div>
            ) : (
              recentTransactions.map((transaction) => (
                <div
                  key={`${transaction.type}-${transaction.id}`}
                  className="px-6 py-4 flex items-center justify-between"
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-10 h-10 rounded-full flex items-center justify-center ${
                        transaction.type === 'income'
                          ? 'bg-success-50 text-success-600'
                          : 'bg-danger-50 text-danger-600'
                      }`}
                    >
                      {transaction.type === 'income' ? (
                        <TrendingUp className="w-5 h-5" />
                      ) : (
                        <TrendingDown className="w-5 h-5" />
                      )}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-900">
                        {transaction.description}
                      </p>
                      <p className="text-xs text-gray-500">
                        {transaction.category} • {formatDateShort(transaction.date)}
                      </p>
                    </div>
                  </div>
                  <p
                    className={`text-sm font-semibold ${
                      transaction.type === 'income'
                        ? 'text-success-600'
                        : 'text-danger-600'
                    }`}
                  >
                    {transaction.type === 'income' ? '+' : '-'}
                    {formatCurrency(transaction.amount)}
                  </p>
                </div>
              ))
            )}
          </div>
          <div className="card-footer">
            <Link to="/expenses" className="text-sm text-primary-600 hover:text-primary-700 font-medium">
              View all transactions
            </Link>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="card">
          <div className="card-header">
            <h2 className="text-lg font-semibold text-gray-900">Quick Actions</h2>
          </div>
          <div className="card-body space-y-3">
            <Link to="/expenses" className="w-full btn btn-primary btn-md justify-start gap-2">
              <Receipt className="w-4 h-4" />
              Add new expense
            </Link>
            <Link to="/income" className="w-full btn btn-secondary btn-md justify-start gap-2">
              <TrendingUp className="w-4 h-4" />
              Record income
            </Link>
            <Link to="/income" className="w-full btn btn-secondary btn-md justify-start gap-2">
              <DollarSign className="w-4 h-4" />
              Create invoice
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
