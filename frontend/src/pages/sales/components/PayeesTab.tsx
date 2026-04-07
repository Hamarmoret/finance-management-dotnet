import { useState, useEffect, useCallback } from 'react';
import { Plus, Search, Pencil, Trash2, AlertCircle, ChevronLeft, ChevronRight } from 'lucide-react';
import { api, getErrorMessage } from '../../../services/api';
import type { Vendor } from '@finance/shared';
import { VendorModal } from './VendorModal';

const STATUS_BADGE: Record<string, string> = {
  active: 'bg-success-50 text-success-700 dark:bg-success-900/20 dark:text-success-400',
  inactive: 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300',
};

const PAYEE_TYPE_BADGE: Record<string, string> = {
  vendor: 'bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400',
  employee: 'bg-purple-50 text-purple-700 dark:bg-purple-900/20 dark:text-purple-400',
  other: 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300',
};

const PAYEE_TYPE_LABEL: Record<string, string> = {
  vendor: 'Vendor',
  employee: 'Employee',
  other: 'Other',
};

export default function PayeesTab() {
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState('');
  const [payeeTypeFilter, setPayeeTypeFilter] = useState('');
  const [modalVendor, setModalVendor] = useState<Vendor | null | undefined>(undefined); // undefined = closed
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const fetchVendors = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({ page: String(page), limit: '20' });
      if (search) params.set('search', search);
      if (payeeTypeFilter) params.set('payeeType', payeeTypeFilter);

      const res = await api.get(`/vendors?${params}`);
      setVendors(res.data.data ?? []);
      setTotal(res.data.pagination?.total ?? 0);
      setTotalPages(res.data.pagination?.totalPages ?? 1);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [page, search, payeeTypeFilter]);

  useEffect(() => { fetchVendors(); }, [fetchVendors]);

  // Reset page when filters change
  useEffect(() => { setPage(1); }, [search, payeeTypeFilter]);

  const handleDelete = async (id: string) => {
    setDeleteError(null);
    try {
      await api.delete(`/vendors/${id}`);
      setDeleteId(null);
      fetchVendors();
    } catch (err) {
      setDeleteError(getErrorMessage(err));
    }
  };

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            className="input pl-9 w-full"
            placeholder="Search payees..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <select
          className="input w-full sm:w-44"
          value={payeeTypeFilter}
          onChange={e => setPayeeTypeFilter(e.target.value)}
        >
          <option value="">All Types</option>
          <option value="vendor">Vendor</option>
          <option value="employee">Employee</option>
          <option value="other">Other</option>
        </select>
        <button onClick={() => setModalVendor(null)} className="btn btn-primary flex items-center gap-2 whitespace-nowrap">
          <Plus className="w-4 h-4" /> Add Payee
        </button>
      </div>

      {/* Error */}
      {error && (
        <div className="flex items-center gap-2 p-3 bg-red-50 dark:bg-red-900/20 rounded-lg text-red-700 dark:text-red-400 text-sm">
          <AlertCircle className="w-4 h-4 flex-shrink-0" /> {error}
        </div>
      )}

      {/* Table */}
      <div className="panel overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 dark:border-gray-700 text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                <th className="text-left px-4 py-3">Name</th>
                <th className="text-left px-4 py-3">Type</th>
                <th className="text-left px-4 py-3">Email</th>
                <th className="text-left px-4 py-3">Phone</th>
                <th className="text-left px-4 py-3">Country</th>
                <th className="text-left px-4 py-3">Status</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
              {loading ? (
                <tr><td colSpan={7} className="text-center py-8 text-gray-500 dark:text-gray-400">Loading...</td></tr>
              ) : vendors.length === 0 ? (
                <tr><td colSpan={7} className="text-center py-8 text-gray-500 dark:text-gray-400">No payees found</td></tr>
              ) : vendors.map(v => (
                <tr key={v.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                  <td className="px-4 py-3 font-medium text-gray-900 dark:text-white">{v.name}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${PAYEE_TYPE_BADGE[v.payeeType] ?? ''}`}>
                      {PAYEE_TYPE_LABEL[v.payeeType] ?? v.payeeType}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-600 dark:text-gray-400">{v.email ?? '—'}</td>
                  <td className="px-4 py-3 text-gray-600 dark:text-gray-400">{v.phone ?? '—'}</td>
                  <td className="px-4 py-3 text-gray-600 dark:text-gray-400">{v.country ?? '—'}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium capitalize ${STATUS_BADGE[v.status] ?? ''}`}>
                      {v.status}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => setModalVendor(v)}
                        className="p-1.5 text-gray-400 hover:text-primary-600 dark:hover:text-primary-400 transition-colors"
                        title="Edit"
                      >
                        <Pencil className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => setDeleteId(v.id)}
                        className="p-1.5 text-gray-400 hover:text-red-600 dark:hover:text-red-400 transition-colors"
                        title="Delete"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-gray-200 dark:border-gray-700">
            <span className="text-sm text-gray-500 dark:text-gray-400">{total} payees total</span>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="p-1.5 rounded text-gray-400 hover:text-gray-600 disabled:opacity-40"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="text-sm text-gray-600 dark:text-gray-400">{page} / {totalPages}</span>
              <button
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="p-1.5 rounded text-gray-400 hover:text-gray-600 disabled:opacity-40"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Create/Edit Modal */}
      {modalVendor !== undefined && (
        <VendorModal
          vendor={modalVendor}
          onClose={() => setModalVendor(undefined)}
          onSaved={() => { setModalVendor(undefined); fetchVendors(); }}
        />
      )}

      {/* Delete Confirmation */}
      {deleteId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white dark:bg-gray-900 rounded-xl shadow-2xl p-6 w-full max-w-sm mx-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Delete Payee</h3>
            <p className="text-gray-600 dark:text-gray-400 text-sm mb-4">
              This will permanently delete the payee. Existing expenses referencing this payee will keep the name but lose the link.
            </p>
            {deleteError && <p className="text-red-500 text-sm mb-3">{deleteError}</p>}
            <div className="flex justify-end gap-3">
              <button onClick={() => { setDeleteId(null); setDeleteError(null); }} className="btn btn-secondary">Cancel</button>
              <button onClick={() => handleDelete(deleteId)} className="btn btn-danger">Delete</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
