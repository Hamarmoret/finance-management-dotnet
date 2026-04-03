import { useState, useEffect, useCallback } from 'react';
import { Plus, Search, Pencil, Trash2, AlertCircle, ChevronLeft, ChevronRight } from 'lucide-react';
import { api, getErrorMessage } from '../../../services/api';
import type { Client } from '@finance/shared';
import { ClientModal } from './ClientModal';
import { ClientDetailDrawer } from './ClientDetailDrawer';

const STATUS_BADGE: Record<string, string> = {
  active: 'bg-success-50 text-success-700 dark:bg-success-900/20 dark:text-success-400',
  inactive: 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300',
  archived: 'bg-danger-50 text-danger-600 dark:bg-danger-900/20 dark:text-danger-400',
};

export default function ClientsTab() {
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const limit = 20;

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  const [showModal, setShowModal] = useState(false);
  const [editingClient, setEditingClient] = useState<Client | null>(null);
  const [viewingClient, setViewingClient] = useState<Client | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  const fetchClients = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({ page: page.toString(), limit: limit.toString() });
      if (search) params.append('search', search);
      if (statusFilter) params.append('status', statusFilter);
      const res = await api.get(`/clients?${params}`);
      setClients(res.data.data ?? []);
      setTotal(res.data.pagination?.total ?? 0);
      setTotalPages(res.data.pagination?.totalPages ?? 1);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [page, search, statusFilter]);

  useEffect(() => { fetchClients(); }, [fetchClients]);
  useEffect(() => { setPage(1); }, [search, statusFilter]);

  const handleDelete = async (id: string) => {
    try {
      await api.delete(`/clients/${id}`);
      setDeleteConfirm(null);
      fetchClients();
    } catch (err) {
      setError(getErrorMessage(err));
    }
  };

  const handleSaved = () => {
    setShowModal(false);
    setEditingClient(null);
    fetchClients();
  };

  const openEdit = (client: Client) => {
    setViewingClient(null);
    setEditingClient(client);
    setShowModal(true);
  };

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
          <input
            className="input pl-9"
            placeholder="Search clients…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <select className="input w-auto" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
          <option value="">All Statuses</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
          <option value="archived">Archived</option>
        </select>
        <button
          onClick={() => { setEditingClient(null); setShowModal(true); }}
          className="btn btn-primary btn-md gap-2"
        >
          <Plus className="w-4 h-4" /> Add Client
        </button>
      </div>

      {/* Stats row */}
      <p className="text-sm text-gray-500 dark:text-gray-400">
        {total} client{total !== 1 ? 's' : ''}
      </p>

      {error && (
        <div className="flex items-center gap-2 text-danger-600 dark:text-danger-400 text-sm bg-danger-50 dark:bg-danger-900/20 px-3 py-2 rounded-md">
          <AlertCircle className="w-4 h-4 shrink-0" /> {error}
        </div>
      )}

      {/* Table */}
      <div className="panel overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead>
              <tr className="bg-gray-50 dark:bg-gray-700/50 border-b border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400">
                <th className="px-4 py-3 font-medium">Company / Name</th>
                <th className="px-4 py-3 font-medium">Email</th>
                <th className="px-4 py-3 font-medium">Phone</th>
                <th className="px-4 py-3 font-medium">Country</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-4 py-10 text-center text-gray-400">Loading…</td>
                </tr>
              ) : clients.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-10 text-center text-gray-400">No clients found.</td>
                </tr>
              ) : (
                clients.map((client) => (
                  <tr
                    key={client.id}
                    className="hover:bg-gray-50 dark:hover:bg-gray-700/30 cursor-pointer transition-colors"
                    onClick={() => setViewingClient(client)}
                  >
                    <td className="px-4 py-3">
                      <p className="font-medium text-gray-900 dark:text-white">{client.companyName || client.name}</p>
                      {client.companyName && client.name !== client.companyName && (
                        <p className="text-xs text-gray-500 dark:text-gray-400">{client.name}</p>
                      )}
                    </td>
                    <td className="px-4 py-3 text-gray-600 dark:text-gray-300">{client.email ?? '—'}</td>
                    <td className="px-4 py-3 text-gray-600 dark:text-gray-300">{client.phone ?? '—'}</td>
                    <td className="px-4 py-3 text-gray-600 dark:text-gray-300">{client.country ?? '—'}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_BADGE[client.status] ?? ''}`}>
                        {client.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => openEdit(client)}
                          className="p-1.5 text-gray-400 hover:text-primary-600 dark:hover:text-primary-400 transition-colors"
                          title="Edit"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                        {deleteConfirm === client.id ? (
                          <div className="flex items-center gap-1">
                            <button onClick={() => handleDelete(client.id)} className="text-xs text-danger-600 hover:underline">Confirm</button>
                            <button onClick={() => setDeleteConfirm(null)} className="text-xs text-gray-500 hover:underline">Cancel</button>
                          </div>
                        ) : (
                          <button
                            onClick={() => setDeleteConfirm(client.id)}
                            className="p-1.5 text-gray-400 hover:text-danger-600 dark:hover:text-danger-400 transition-colors"
                            title="Delete"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-gray-200 dark:border-gray-700">
            <span className="text-sm text-gray-500 dark:text-gray-400">Page {page} of {totalPages}</span>
            <div className="flex gap-2">
              <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="btn btn-secondary btn-sm gap-1">
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages} className="btn btn-secondary btn-sm gap-1">
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Modals */}
      {showModal && (
        <ClientModal
          client={editingClient}
          onClose={() => { setShowModal(false); setEditingClient(null); }}
          onSaved={handleSaved}
        />
      )}

      {viewingClient && (
        <ClientDetailDrawer
          client={viewingClient}
          onClose={() => setViewingClient(null)}
          onEdit={() => openEdit(viewingClient)}
        />
      )}
    </div>
  );
}
