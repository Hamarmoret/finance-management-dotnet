import { useState, useEffect, useCallback } from 'react';
import { Search, AlertCircle, ChevronLeft, ChevronRight, Star } from 'lucide-react';
import { api, getErrorMessage } from '../../../services/api';
import type { UnifiedContact } from '@finance/shared';

const SOURCE_BADGE: Record<string, string> = {
  client: 'bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400',
  lead: 'bg-amber-50 text-amber-700 dark:bg-amber-900/20 dark:text-amber-400',
};

export default function ContactsTab() {
  const [contacts, setContacts] = useState<UnifiedContact[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState('');

  const fetchContacts = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({ page: String(page), limit: '50' });
      if (search) params.set('search', search);

      const res = await api.get(`/contacts?${params}`);
      setContacts(res.data.data ?? []);
      setTotal(res.data.pagination?.total ?? 0);
      setTotalPages(res.data.pagination?.totalPages ?? 1);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [page, search]);

  useEffect(() => { fetchContacts(); }, [fetchContacts]);
  useEffect(() => { setPage(1); }, [search]);

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            className="input pl-9 w-full"
            placeholder="Search contacts by name or email..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
      </div>

      <p className="text-sm text-gray-500 dark:text-gray-400">
        Unified view of all contact persons from clients and leads. Manage contacts from the Clients or Leads tabs.
      </p>

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
                <th className="text-left px-4 py-3">Role</th>
                <th className="text-left px-4 py-3">Email</th>
                <th className="text-left px-4 py-3">Phone</th>
                <th className="text-left px-4 py-3">Company / Client</th>
                <th className="text-left px-4 py-3">Source</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
              {loading ? (
                <tr><td colSpan={6} className="text-center py-8 text-gray-500 dark:text-gray-400">Loading...</td></tr>
              ) : contacts.length === 0 ? (
                <tr><td colSpan={6} className="text-center py-8 text-gray-500 dark:text-gray-400">No contacts found</td></tr>
              ) : contacts.map(c => (
                <tr key={`${c.source}-${c.id}`} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1.5">
                      {c.isPrimary && <Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400 flex-shrink-0" title="Primary contact" />}
                      <span className="font-medium text-gray-900 dark:text-white">{c.name}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-gray-600 dark:text-gray-400">{c.role ?? '—'}</td>
                  <td className="px-4 py-3 text-gray-600 dark:text-gray-400">{c.email ?? '—'}</td>
                  <td className="px-4 py-3 text-gray-600 dark:text-gray-400">{c.phone ?? '—'}</td>
                  <td className="px-4 py-3">
                    <div className="text-gray-900 dark:text-white">{c.companyName ?? '—'}</div>
                    {c.linkedEntityName && c.linkedEntityName !== c.companyName && (
                      <div className="text-xs text-gray-500 dark:text-gray-400">{c.linkedEntityName}</div>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium capitalize ${SOURCE_BADGE[c.source] ?? ''}`}>
                      {c.source}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-gray-200 dark:border-gray-700">
            <span className="text-sm text-gray-500 dark:text-gray-400">{total} contacts total</span>
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
    </div>
  );
}
