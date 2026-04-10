import { useState, useEffect } from 'react';
import { Building2, Plus, Pencil, Trash2, TrendingUp, TrendingDown, Loader2 } from 'lucide-react';
import { api, getErrorMessage } from '../../services/api';
import type { PnlCenterWithStats } from '@finance/shared';
import { PnlCenterModal } from './components/PnlCenterModal';
import { PnlCenterDetail } from './components/PnlCenterDetail';
import { PeriodSelector, getPeriodLabel } from '../../components/PeriodSelector';
import { DrillDownModal, type DrillDownItem } from '../analytics/components/DrillDownModal';

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
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

export default function PnlCenters() {
  const [centers, setCenters] = useState<PnlCenterWithStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [editingCenter, setEditingCenter] = useState<PnlCenterWithStats | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [detailCenter, setDetailCenter] = useState<PnlCenterWithStats | null>(null);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [drillDown, setDrillDown] = useState<{ title: string; subtitle?: string; items: DrillDownItem[] } | null>(null);
  const [loadingDrill, setLoadingDrill] = useState(false);

  const inPeriod = (dateStr: string) => {
    const d = new Date(dateStr);
    if (startDate && d < new Date(startDate)) return false;
    if (endDate && d > new Date(endDate)) return false;
    return true;
  };

  async function openDrillDown(kind: 'income' | 'expenses' | 'all') {
    setLoadingDrill(true);
    try {
      const [iRes, eRes] = await Promise.all([
        kind !== 'expenses' ? api.get('/income', { params: { limit: 500 } }) : Promise.resolve(null),
        kind !== 'income' ? api.get('/expenses', { params: { limit: 500 } }) : Promise.resolve(null),
      ]);
      const incomeRows: RawIncome[] = iRes?.data?.data ?? [];
      const expenseRows: RawExpense[] = eRes?.data?.data ?? [];

      const incomeItems: DrillDownItem[] = incomeRows
        .filter(i => inPeriod(i.incomeDate))
        .map(i => ({
          id: i.id,
          date: i.incomeDate.split('T')[0],
          description: i.description || i.clientName || 'Income',
          amount: i.amount,
          currency: i.currency ?? 'ILS',
          category: i.category?.name ?? null,
          vendorOrClient: i.clientName ?? null,
          type: 'income',
          invoiceStatus: i.invoiceStatus ?? null,
          pnlCenters: i.pnlCenter?.name ? [i.pnlCenter.name] : undefined,
        }));
      const expenseItems: DrillDownItem[] = expenseRows
        .filter(e => inPeriod(e.expenseDate))
        .map(e => ({
          id: e.id,
          date: e.expenseDate.split('T')[0],
          description: e.description || e.vendor || 'Expense',
          amount: e.amount,
          currency: e.currency ?? 'ILS',
          category: e.category?.name ?? null,
          vendorOrClient: e.vendor ?? null,
          type: 'expense',
          pnlCenters: e.pnlCenter?.name ? [e.pnlCenter.name] : undefined,
        }));

      const items = kind === 'income' ? incomeItems : kind === 'expenses' ? expenseItems : [...incomeItems, ...expenseItems];
      const title = kind === 'income' ? 'Total Income' : kind === 'expenses' ? 'Total Expenses' : 'Net Profit';
      setDrillDown({ title, subtitle: getPeriodLabel(startDate, endDate), items });
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoadingDrill(false);
    }
  }

  useEffect(() => {
    fetchCenters();
  }, [startDate, endDate]); // eslint-disable-line react-hooks/exhaustive-deps

  async function fetchCenters() {
    try {
      setLoading(true);
      const response = await api.get<{ success: boolean; data: PnlCenterWithStats[] }>(
        '/pnl-centers',
        { params: { ...(startDate && { startDate }), ...(endDate && { endDate }) } }
      );
      setCenters(response.data.data);
      setError(null);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete(id: string) {
    try {
      await api.delete(`/pnl-centers/${id}`);
      setCenters((prev) => prev.filter((c) => c.id !== id));
      setDeleteConfirm(null);
    } catch (err) {
      setError(getErrorMessage(err));
    }
  }

  function handleEdit(center: PnlCenterWithStats) {
    setEditingCenter(center);
    setShowModal(true);
  }

  function handleModalClose() {
    setShowModal(false);
    setEditingCenter(null);
  }

  function handleSaved() {
    handleModalClose();
    fetchCenters();
  }

  // Calculate totals
  const totalIncome = centers.reduce((sum, c) => sum + c.totalIncome, 0);
  const totalExpenses = centers.reduce((sum, c) => sum + c.totalExpenses, 0);
  const totalProfit = totalIncome - totalExpenses;

  if (loading) {
    return (
      <div className="flex h-[calc(100vh-4rem)] items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <Building2 className="w-6 h-6 text-primary-600" />
            P&L Centers
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">{getPeriodLabel(startDate, endDate)}</p>
          <PeriodSelector
            startDate={startDate}
            endDate={endDate}
            onChange={(s, e) => { setStartDate(s); setEndDate(e); }}
            className="mt-2"
          />
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors shrink-0"
        >
          <Plus className="w-4 h-4" />
          Add P&L Center
        </button>
      </div>

      {/* Error Message */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
          {error}
        </div>
      )}

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <button
          type="button"
          onClick={() => openDrillDown('income')}
          disabled={loadingDrill}
          className="panel p-6 text-left w-full hover:shadow-md transition-shadow cursor-pointer disabled:opacity-60"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Total Income</p>
              <p className="text-2xl font-bold text-green-600">{formatCurrency(totalIncome)}</p>
            </div>
            <div className="p-3 bg-green-100 rounded-lg">
              {loadingDrill ? <Loader2 className="w-6 h-6 text-green-600 animate-spin" /> : <TrendingUp className="w-6 h-6 text-green-600" />}
            </div>
          </div>
        </button>
        <button
          type="button"
          onClick={() => openDrillDown('expenses')}
          disabled={loadingDrill}
          className="panel p-6 text-left w-full hover:shadow-md transition-shadow cursor-pointer disabled:opacity-60"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Total Expenses</p>
              <p className="text-2xl font-bold text-red-600">{formatCurrency(totalExpenses)}</p>
            </div>
            <div className="p-3 bg-red-100 rounded-lg">
              {loadingDrill ? <Loader2 className="w-6 h-6 text-red-600 animate-spin" /> : <TrendingDown className="w-6 h-6 text-red-600" />}
            </div>
          </div>
        </button>
        <button
          type="button"
          onClick={() => openDrillDown('all')}
          disabled={loadingDrill}
          className="panel p-6 text-left w-full hover:shadow-md transition-shadow cursor-pointer disabled:opacity-60"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Net Profit</p>
              <p className={`text-2xl font-bold ${totalProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {formatCurrency(totalProfit)}
              </p>
            </div>
            <div className={`p-3 rounded-lg ${totalProfit >= 0 ? 'bg-green-100' : 'bg-red-100'}`}>
              {loadingDrill ? (
                <Loader2 className={`w-6 h-6 animate-spin ${totalProfit >= 0 ? 'text-green-600' : 'text-red-600'}`} />
              ) : totalProfit >= 0 ? (
                <TrendingUp className="w-6 h-6 text-green-600" />
              ) : (
                <TrendingDown className="w-6 h-6 text-red-600" />
              )}
            </div>
          </div>
        </button>
      </div>

      {/* P&L Centers Grid */}
      {centers.length === 0 ? (
        <div className="panel p-12 text-center">
          <Building2 className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">No P&L Centers</h3>
          <p className="text-gray-500 dark:text-gray-400 mb-4">Get started by creating your first P&L center</p>
          <button
            onClick={() => setShowModal(true)}
            className="inline-flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
          >
            <Plus className="w-4 h-4" />
            Add P&L Center
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {centers.map((center) => (
            <div
              key={center.id}
              className="panel hover:shadow-lg transition-shadow cursor-pointer"
              onClick={() => setDetailCenter(center)}
            >
              <div className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{center.name}</h3>
                    {center.description && (
                      <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 line-clamp-2">{center.description}</p>
                    )}
                  </div>
                  <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
                    <button
                      onClick={() => handleEdit(center)}
                      className="p-2 text-gray-400 hover:text-primary-600 hover:bg-primary-50 rounded-lg transition-colors"
                    >
                      <Pencil className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => setDeleteConfirm(center.id)}
                      className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-500 dark:text-gray-400">Income</span>
                    <span className="font-medium text-green-600">
                      {formatCurrency(center.totalIncome)}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-500 dark:text-gray-400">Expenses</span>
                    <span className="font-medium text-red-600">
                      {formatCurrency(center.totalExpenses)}
                    </span>
                  </div>
                  <div className="border-t dark:border-gray-700 pt-3 flex justify-between items-center">
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Net Profit</span>
                    <span
                      className={`font-bold ${
                        center.netProfit >= 0 ? 'text-green-600' : 'text-red-600'
                      }`}
                    >
                      {formatCurrency(center.netProfit)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Profit indicator bar */}
              <div className="px-6 pb-4">
                <div className="h-2 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                  {center.totalIncome > 0 && (
                    <div
                      className={`h-full ${center.netProfit >= 0 ? 'bg-green-500' : 'bg-red-500'}`}
                      style={{
                        width: `${Math.min(
                          100,
                          Math.abs(center.netProfit / center.totalIncome) * 100
                        )}%`,
                      }}
                    />
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="modal-box p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Delete P&L Center?</h3>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              This will deactivate the P&L center. Any associated income and expenses will remain
              but won't be linked to this center.
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setDeleteConfirm(null)}
                className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDelete(deleteConfirm)}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Create/Edit Modal */}
      {showModal && (
        <PnlCenterModal
          center={editingCenter}
          onClose={handleModalClose}
          onSaved={handleSaved}
        />
      )}

      {/* Detail Modal */}
      {detailCenter && (
        <PnlCenterDetail
          center={detailCenter}
          onClose={() => setDetailCenter(null)}
        />
      )}

      {/* Aggregate Drill-Down Modal */}
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
