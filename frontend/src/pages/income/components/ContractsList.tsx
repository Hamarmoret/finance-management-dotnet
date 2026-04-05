import { useState, useEffect, useCallback } from 'react';
import { Plus, Search, Filter, X, FileText, Loader2, TrendingUp, AlertTriangle, Clock } from 'lucide-react';
import type { IncomeContractSummary, IncomeContract } from '@finance/shared';
import { api, getErrorMessage } from '../../../services/api';
import { formatCurrency } from '../../../utils/formatters';
import ContractCard from './ContractCard';
import ContractModal from './ContractModal';
import ContractDetailView from './ContractDetailView';

export default function ContractsList() {
  const [contracts, setContracts] = useState<IncomeContractSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const limit = 20;

  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('active');
  const [showFilters, setShowFilters] = useState(false);

  const [showModal, setShowModal] = useState(false);
  const [editingContract, setEditingContract] = useState<IncomeContract | null>(null);
  const [selectedContractId, setSelectedContractId] = useState<string | null>(null);
  const [detailContract, setDetailContract] = useState<IncomeContract | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);

  // Summary stats
  const [stats, setStats] = useState<{
    totalContracts: number;
    totalValue: number;
    totalPaid: number;
    overdueCount: number;
    upcomingCount: number;
  } | null>(null);

  const fetchContracts = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({ page: page.toString(), limit: limit.toString() });
      if (search) params.append('search', search);
      if (typeFilter) params.append('contractType', typeFilter);
      if (statusFilter) params.append('status', statusFilter);
      const res = await api.get(`/income-contracts?${params}`);
      setContracts(res.data.data ?? []);
      setTotal(res.data.pagination?.total ?? 0);
      setTotalPages(res.data.pagination?.totalPages ?? 1);
      if (res.data.stats) setStats(res.data.stats);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [page, search, typeFilter, statusFilter]);

  useEffect(() => { fetchContracts(); }, [fetchContracts]);
  useEffect(() => { setPage(1); }, [search, typeFilter, statusFilter]);

  const openDetail = async (id: string) => {
    setSelectedContractId(id);
    setLoadingDetail(true);
    try {
      const res = await api.get(`/income-contracts/${id}`);
      setDetailContract(res.data.data);
    } catch (err) {
      setError(getErrorMessage(err));
      setSelectedContractId(null);
    } finally {
      setLoadingDetail(false);
    }
  };

  const handleContractUpdated = (updated: IncomeContract) => {
    setDetailContract(updated);
    setContracts(prev => prev.map(c => c.id === updated.id ? {
      ...c,
      title: updated.title,
      status: updated.status,
      totalValue: updated.totalValue,
      currency: updated.currency,
    } : c));
  };

  const handleSaved = (saved: IncomeContract) => {
    setShowModal(false);
    setEditingContract(null);
    fetchContracts();
    // If it was a create, open the detail view
    if (!editingContract) {
      openDetail(saved.id);
    }
  };

  const hasFilters = search || typeFilter || statusFilter !== 'active';
  const clearFilters = () => { setSearch(''); setTypeFilter(''); setStatusFilter('active'); setPage(1); };

  // If viewing detail
  if (selectedContractId && detailContract) {
    return (
      <ContractDetailView
        contract={detailContract}
        onBack={() => { setSelectedContractId(null); setDetailContract(null); fetchContracts(); }}
        onContractUpdated={handleContractUpdated}
      />
    );
  }

  if (loadingDetail) {
    return (
      <div className="flex justify-center items-center py-24">
        <Loader2 className="w-8 h-8 animate-spin text-primary-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <FileText className="w-5 h-5 text-primary-600" />
            Contracts
          </h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">{total} contract{total !== 1 ? 's' : ''}</p>
        </div>
        <button
          onClick={() => { setEditingContract(null); setShowModal(true); }}
          className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
        >
          <Plus className="w-4 h-4" />
          New Contract
        </button>
      </div>

      {/* Stats bar */}
      {stats && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="card p-4">
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Total Value</p>
            <p className="text-lg font-bold text-gray-900 dark:text-white">
              {formatCurrency(stats.totalValue, 'ILS')}
            </p>
          </div>
          <div className="card p-4">
            <div className="flex items-center gap-1 mb-1">
              <TrendingUp className="w-3.5 h-3.5 text-success-600" />
              <p className="text-xs text-gray-500 dark:text-gray-400">Collected</p>
            </div>
            <p className="text-lg font-bold text-success-600 dark:text-success-400">
              {formatCurrency(stats.totalPaid, 'ILS')}
            </p>
          </div>
          <div className="card p-4">
            <div className="flex items-center gap-1 mb-1">
              <AlertTriangle className="w-3.5 h-3.5 text-danger-600" />
              <p className="text-xs text-gray-500 dark:text-gray-400">Overdue</p>
            </div>
            <p className={`text-lg font-bold ${stats.overdueCount > 0 ? 'text-danger-600 dark:text-danger-400' : 'text-gray-400'}`}>
              {stats.overdueCount} payment{stats.overdueCount !== 1 ? 's' : ''}
            </p>
          </div>
          <div className="card p-4">
            <div className="flex items-center gap-1 mb-1">
              <Clock className="w-3.5 h-3.5 text-warning-600" />
              <p className="text-xs text-gray-500 dark:text-gray-400">Due This Week</p>
            </div>
            <p className={`text-lg font-bold ${stats.upcomingCount > 0 ? 'text-warning-600 dark:text-warning-400' : 'text-gray-400'}`}>
              {stats.upcomingCount} payment{stats.upcomingCount !== 1 ? 's' : ''}
            </p>
          </div>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="p-3 bg-danger-50 dark:bg-danger-900/20 border border-danger-200 dark:border-danger-800 rounded-lg text-sm text-danger-700 dark:text-danger-400">
          {error}
        </div>
      )}

      {/* Search + Filters */}
      <div className="card p-4 space-y-4">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search contracts..."
              value={search}
              onChange={e => { setSearch(e.target.value); setPage(1); }}
              className="input w-full pl-10 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
            />
          </div>
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`flex items-center gap-2 px-4 py-2 border rounded-lg transition-colors ${
              hasFilters ? 'bg-primary-50 border-primary-200 text-primary-700 dark:bg-primary-900/20 dark:border-primary-700 dark:text-primary-400'
                : 'border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
            }`}
          >
            <Filter className="w-4 h-4" />
            Filters
          </button>
          {hasFilters && (
            <button onClick={clearFilters} className="flex items-center gap-1 px-3 py-2 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300">
              <X className="w-4 h-4" />
              Clear
            </button>
          )}
        </div>

        {showFilters && (
          <div className="pt-3 border-t dark:border-gray-700 grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="label dark:text-gray-300">Type</label>
              <select
                value={typeFilter}
                onChange={e => { setTypeFilter(e.target.value); setPage(1); }}
                className="input mt-1 w-full dark:bg-gray-700 dark:border-gray-600 dark:text-white"
              >
                <option value="">All Types</option>
                <option value="project">Project</option>
                <option value="retainer">Retainer</option>
              </select>
            </div>
            <div>
              <label className="label dark:text-gray-300">Status</label>
              <select
                value={statusFilter}
                onChange={e => { setStatusFilter(e.target.value); setPage(1); }}
                className="input mt-1 w-full dark:bg-gray-700 dark:border-gray-600 dark:text-white"
              >
                <option value="">All Statuses</option>
                <option value="active">Active</option>
                <option value="completed">Completed</option>
                <option value="on_hold">On Hold</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>
          </div>
        )}
      </div>

      {/* Contract Grid */}
      {loading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="w-8 h-8 animate-spin text-primary-600" />
        </div>
      ) : contracts.length === 0 ? (
        <div className="card p-12 text-center">
          <FileText className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-1">No contracts found</h3>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
            {hasFilters ? 'Try adjusting your filters' : 'Create your first contract to start tracking payments'}
          </p>
          {!hasFilters && (
            <button
              onClick={() => setShowModal(true)}
              className="inline-flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
            >
              <Plus className="w-4 h-4" />
              New Contract
            </button>
          )}
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {contracts.map(c => (
              <ContractCard
                key={c.id}
                contract={c}
                onClick={() => openDetail(c.id)}
              />
            ))}
          </div>

          {totalPages > 1 && (
            <div className="flex items-center justify-between">
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Page {page} of {totalPages} · {total} total
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="px-3 py-1 border dark:border-gray-600 rounded text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Previous
                </button>
                <button
                  onClick={() => setPage(p => Math.min(totalPages, p + 1))}
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

      {showModal && (
        <ContractModal
          contract={editingContract}
          onClose={() => { setShowModal(false); setEditingContract(null); }}
          onSaved={handleSaved}
        />
      )}
    </div>
  );
}
