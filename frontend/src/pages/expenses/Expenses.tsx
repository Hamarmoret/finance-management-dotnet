import { useState, useEffect, useCallback } from 'react';
import { Receipt, Plus, Filter, Search, X, Download, Upload, FileSpreadsheet, ChevronDown } from 'lucide-react';
import { api, getErrorMessage } from '../../services/api';
import type { Expense, ExpenseCategory, PnlCenterWithStats } from '@finance/shared';
import { ExpenseModal } from './components/ExpenseModal';
import { ExpenseTable } from './components/ExpenseTable';
import { PeriodSelector, getPeriodLabel } from '../../components/PeriodSelector';
import { CurrencyTotals } from '../../components/CurrencyTotals';

export default function Expenses() {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [categories, setCategories] = useState<ExpenseCategory[]>([]);
  const [pnlCenters, setPnlCenters] = useState<PnlCenterWithStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [pnlCentersError, setPnlCentersError] = useState<string | null>(null);
  const [showCsvMenu, setShowCsvMenu] = useState(false);
  const [csvUploading, setCsvUploading] = useState(false);
  const [csvResult, setCsvResult] = useState<{ imported: number; failed: number; errors: { row: number; message: string }[] } | null>(null);

  // Pagination
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const limit = 20;

  // Filters
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [pnlCenterFilter, setPnlCenterFilter] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const fetchExpenses = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
      });

      if (search) params.append('search', search);
      if (categoryFilter) params.append('categoryId', categoryFilter);
      if (pnlCenterFilter) params.append('pnlCenterId', pnlCenterFilter);
      if (startDate) params.append('startDate', startDate);
      if (endDate) params.append('endDate', endDate);

      const response = await api.get<{
        success: boolean;
        data: Expense[];
        pagination: { total: number; totalPages: number };
      }>(`/expenses?${params}`);

      setExpenses(response.data.data);
      setTotal(response.data.pagination.total);
      setTotalPages(response.data.pagination.totalPages);
      setError(null);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [page, search, categoryFilter, pnlCenterFilter, startDate, endDate]);

  useEffect(() => {
    fetchExpenses();
  }, [fetchExpenses]);

  useEffect(() => {
    async function fetchMetadata() {
      try {
        const [categoriesRes, pnlRes] = await Promise.all([
          api.get<{ success: boolean; data: ExpenseCategory[] }>('/expenses/categories'),
          api.get<{ success: boolean; data: PnlCenterWithStats[] }>('/pnl-centers'),
        ]);
        setCategories(categoriesRes.data.data);
        setPnlCenters(pnlRes.data.data);

        // Check if there are no P&L centers
        if (pnlRes.data.data.length === 0) {
          setPnlCentersError('No P&L centers found. Please create one in the P&L Centers page before adding expenses.');
        } else {
          setPnlCentersError(null);
        }
      } catch (err) {
        console.error('Failed to fetch metadata:', err);
        setPnlCentersError('Failed to load P&L centers. Please refresh the page.');
      }
    }
    fetchMetadata();
  }, []);

  async function handleDelete(id: string) {
    try {
      await api.delete(`/expenses/${id}`);
      fetchExpenses();
    } catch (err) {
      setError(getErrorMessage(err));
    }
  }

  function handleEdit(expense: Expense) {
    setEditingExpense(expense);
    setShowModal(true);
  }

  function handleDuplicate(expense: Expense) {
    setEditingExpense({
      ...expense,
      id: '',
      description: `Copy of ${expense.description}`,
      expenseDate: new Date().toISOString().split('T')[0],
    });
    setShowModal(true);
  }

  function handleModalClose() {
    setShowModal(false);
    setEditingExpense(null);
  }

  function handleSaved() {
    handleModalClose();
    fetchExpenses();
  }

  function clearFilters() {
    setSearch('');
    setCategoryFilter('');
    setPnlCenterFilter('');
    setStartDate('');
    setEndDate('');
    setPage(1);
  }

  const hasFilters = search || categoryFilter || pnlCenterFilter || startDate || endDate;
  const totalsByCurrency = expenses.reduce((acc, e) => {
    acc[e.currency] = (acc[e.currency] ?? 0) + e.amount;
    return acc;
  }, {} as Record<string, number>);

  async function downloadCsvTemplate() {
    try {
      const response = await api.get('/csv-import/templates/expenses', { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const a = document.createElement('a');
      a.href = url;
      a.download = 'expenses_template.csv';
      a.click();
      window.URL.revokeObjectURL(url);
    } catch {
      setError('Failed to download template');
    }
    setShowCsvMenu(false);
  }

  async function handleCsvUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = '';
    setShowCsvMenu(false);
    setCsvUploading(true);
    setCsvResult(null);
    setError(null);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const response = await api.post('/csv-import/expenses', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setCsvResult(response.data.data);
      fetchExpenses();
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setCsvUploading(false);
    }
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <Receipt className="w-6 h-6 text-primary-600" />
            Expenses
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">{getPeriodLabel(startDate, endDate)}</p>
          <PeriodSelector
            startDate={startDate}
            endDate={endDate}
            onChange={(s, e) => { setStartDate(s); setEndDate(e); setPage(1); }}
            className="mt-2"
          />
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <button
              onClick={() => setShowCsvMenu(!showCsvMenu)}
              className="flex items-center gap-2 px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
            >
              <FileSpreadsheet className="w-4 h-4" />
              CSV
              <ChevronDown className="w-3 h-3" />
            </button>
            {showCsvMenu && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setShowCsvMenu(false)} />
                <div className="absolute right-0 mt-1 w-52 dropdown-menu z-20">
                  <button
                    onClick={downloadCsvTemplate}
                    className="w-full px-4 py-2.5 text-left text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center gap-2 rounded-t-lg"
                  >
                    <Download className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                    Download Template
                  </button>
                  <label className="w-full px-4 py-2.5 text-left text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center gap-2 cursor-pointer rounded-b-lg">
                    <Upload className="w-4 h-4 text-gray-500" />
                    Import from CSV
                    <input
                      type="file"
                      accept=".csv"
                      onChange={handleCsvUpload}
                      className="hidden"
                    />
                  </label>
                </div>
              </>
            )}
          </div>
          <button
            onClick={() => setShowModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
          >
            <Plus className="w-4 h-4" />
            Add Expense
          </button>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
          {error}
        </div>
      )}

      {/* CSV Upload Status */}
      {csvUploading && (
        <div className="bg-blue-50 border border-blue-200 text-blue-700 px-4 py-3 rounded-lg flex items-center gap-2">
          <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
          Importing CSV...
        </div>
      )}
      {csvResult && (
        <div className={`border px-4 py-3 rounded-lg ${csvResult.failed > 0 ? 'bg-yellow-50 border-yellow-200 text-yellow-800' : 'bg-green-50 border-green-200 text-green-700'}`}>
          <div className="flex items-center justify-between">
            <span>
              Imported <strong>{csvResult.imported}</strong> record{csvResult.imported !== 1 ? 's' : ''}
              {csvResult.failed > 0 && <>, <strong>{csvResult.failed}</strong> failed</>}
            </span>
            <button onClick={() => setCsvResult(null)} className="text-gray-400 hover:text-gray-600">
              <X className="w-4 h-4" />
            </button>
          </div>
          {csvResult.errors.length > 0 && (
            <ul className="mt-2 text-sm space-y-1">
              {csvResult.errors.slice(0, 5).map((err, i) => (
                <li key={i}>Row {err.row}: {err.message}</li>
              ))}
              {csvResult.errors.length > 5 && <li>...and {csvResult.errors.length - 5} more errors</li>}
            </ul>
          )}
        </div>
      )}

      {/* P&L Centers Warning */}
      {pnlCentersError && (
        <div className="bg-warning-50 border border-warning-200 text-warning-700 px-4 py-3 rounded-lg flex items-center justify-between">
          <span>{pnlCentersError}</span>
          <a
            href="/pnl-centers"
            className="ml-4 text-sm font-medium text-warning-800 hover:text-warning-900 underline"
          >
            Go to P&L Centers
          </a>
        </div>
      )}

      {/* Stats Bar */}
      <div className="panel p-4 flex flex-wrap gap-6 items-start">
        <div>
          <p className="text-sm text-gray-500 dark:text-gray-400">Total Expenses</p>
          <p className="text-xl font-bold text-gray-900 dark:text-white">{total}</p>
        </div>
        <CurrencyTotals
          totals={totalsByCurrency}
          label="Page Total"
          amountClassName="text-xl font-bold text-red-600"
        />
      </div>

      {/* Search and Filters */}
      <div className="panel p-4">
        <div className="flex flex-col sm:flex-row gap-4">
          {/* Search */}
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search expenses..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
            />
          </div>

          {/* Filter Toggle */}
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`flex items-center gap-2 px-4 py-2 border rounded-lg transition-colors ${
              hasFilters
                ? 'bg-primary-50 border-primary-200 text-primary-700'
                : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
            }`}
          >
            <Filter className="w-4 h-4" />
            Filters
            {hasFilters && (
              <span className="bg-primary-600 text-white text-xs px-2 py-0.5 rounded-full">
                Active
              </span>
            )}
          </button>

          {hasFilters && (
            <button
              onClick={clearFilters}
              className="flex items-center gap-1 px-3 py-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100"
            >
              <X className="w-4 h-4" />
              Clear
            </button>
          )}
        </div>

        {/* Expanded Filters */}
        {showFilters && (
          <div className="mt-4 pt-4 border-t dark:border-gray-700 grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Category</label>
              <select
                value={categoryFilter}
                onChange={(e) => {
                  setCategoryFilter(e.target.value);
                  setPage(1);
                }}
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500"
              >
                <option value="">All Categories</option>
                {categories.map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">P&L Center</label>
              <select
                value={pnlCenterFilter}
                onChange={(e) => {
                  setPnlCenterFilter(e.target.value);
                  setPage(1);
                }}
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500"
              >
                <option value="">All P&L Centers</option>
                {pnlCenters.map((center) => (
                  <option key={center.id} value={center.id}>
                    {center.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
        )}
      </div>

      {/* Expenses Table */}
      {loading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
        </div>
      ) : expenses.length === 0 ? (
        <div className="panel p-12 text-center">
          <Receipt className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">No Expenses Found</h3>
          <p className="text-gray-500 dark:text-gray-400 mb-4">
            {hasFilters
              ? 'Try adjusting your filters'
              : 'Get started by adding your first expense'}
          </p>
          {!hasFilters && (
            <button
              onClick={() => setShowModal(true)}
              className="inline-flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
            >
              <Plus className="w-4 h-4" />
              Add Expense
            </button>
          )}
        </div>
      ) : (
        <>
          <ExpenseTable
            expenses={expenses}
            onEdit={handleEdit}
            onDelete={handleDelete}
            onDuplicate={handleDuplicate}
          />

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between">
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Showing {(page - 1) * limit + 1} to {Math.min(page * limit, total)} of {total}
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="px-3 py-1 border dark:border-gray-600 rounded text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Previous
                </button>
                <button
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className="px-3 py-1 border dark:border-gray-600 rounded text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </>
      )}

      {/* Create/Edit Modal */}
      {showModal && (
        <ExpenseModal
          expense={editingExpense}
          categories={categories}
          pnlCenters={pnlCenters}
          onClose={handleModalClose}
          onSaved={handleSaved}
        />
      )}
    </div>
  );
}
