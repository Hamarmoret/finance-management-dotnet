import { useState, useEffect, useCallback } from 'react';
import { Plus, Search, Pencil, Trash2, AlertCircle, ChevronLeft, ChevronRight } from 'lucide-react';
import { api, getErrorMessage } from '../../../services/api';
import type { Lead, LeadStatus } from '@finance/shared';
import { formatCurrency } from '../../../utils/formatters';
import { LeadModal } from './LeadModal';

const ALL_STATUSES: LeadStatus[] = ['new', 'contacted', 'qualified', 'proposal_sent', 'negotiation', 'won', 'lost', 'on_hold'];

const STATUS_COLORS: Record<LeadStatus, string> = {
  new: 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300',
  contacted: 'bg-primary-50 text-primary-700 dark:bg-primary-900/20 dark:text-primary-400',
  qualified: 'bg-primary-50 text-primary-700 dark:bg-primary-900/20 dark:text-primary-400',
  proposal_sent: 'bg-warning-50 text-warning-700 dark:bg-warning-900/20 dark:text-warning-400',
  negotiation: 'bg-warning-50 text-warning-700 dark:bg-warning-900/20 dark:text-warning-400',
  won: 'bg-success-50 text-success-700 dark:bg-success-900/20 dark:text-success-400',
  lost: 'bg-danger-50 text-danger-700 dark:bg-danger-900/20 dark:text-danger-400',
  on_hold: 'bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400',
};

const ACTIVE_STATUSES: LeadStatus[] = ['new', 'contacted', 'qualified', 'proposal_sent', 'negotiation', 'on_hold'];

interface LeadsTabProps {
  startDate?: string;
  endDate?: string;
}

export default function LeadsTab({ startDate, endDate }: LeadsTabProps) {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [statusCounts, setStatusCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const limit = 20;

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('');

  const [showModal, setShowModal] = useState(false);
  const [editingLead, setEditingLead] = useState<Lead | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  const fetchLeads = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({ page: page.toString(), limit: limit.toString() });
      if (search) params.append('search', search);
      if (statusFilter) params.append('status', statusFilter);
      if (startDate) params.append('startDate', startDate);
      if (endDate) params.append('endDate', endDate);
      const res = await api.get(`/leads?${params}`);
      setLeads(res.data.data ?? []);
      setTotal(res.data.pagination?.total ?? 0);
      setTotalPages(res.data.pagination?.totalPages ?? 1);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [page, search, statusFilter, startDate, endDate]);

  // Fetch counts for all statuses (to show in status chips)
  const fetchCounts = useCallback(async () => {
    try {
      const counts: Record<string, number> = {};
      const res = await api.get('/leads?limit=1000');
      const all: Lead[] = res.data.data ?? [];
      for (const s of ALL_STATUSES) {
        counts[s] = all.filter((l) => l.status === s).length;
      }
      setStatusCounts(counts);
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => { fetchLeads(); }, [fetchLeads]);
  useEffect(() => { fetchCounts(); }, [fetchCounts]);
  useEffect(() => { setPage(1); }, [search, statusFilter, startDate, endDate]);

  const pipelineValue = leads
    .filter((l) => ACTIVE_STATUSES.includes(l.status as LeadStatus))
    .reduce((s, l) => s + (l.estimatedValue ?? 0), 0);

  const wonLeads = leads.filter((l) => l.status === 'won').length;

  const handleDelete = async (id: string) => {
    try {
      await api.delete(`/leads/${id}`);
      setDeleteConfirm(null);
      fetchLeads();
      fetchCounts();
    } catch (err) {
      setError(getErrorMessage(err));
    }
  };

  const handleSaved = () => {
    setShowModal(false);
    setEditingLead(null);
    fetchLeads();
    fetchCounts();
  };

  return (
    <div className="space-y-4">
      {/* Stats row */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Total Leads', value: total.toString() },
          { label: 'Pipeline Value', value: formatCurrency(pipelineValue) },
          { label: 'Won', value: wonLeads.toString() },
        ].map(({ label, value }) => (
          <div key={label} className="panel p-4">
            <p className="text-xs text-gray-500 dark:text-gray-400">{label}</p>
            <p className="text-xl font-semibold text-gray-900 dark:text-white mt-0.5">{value}</p>
          </div>
        ))}
      </div>

      {/* Status chips */}
      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => setStatusFilter('')}
          className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
            statusFilter === '' ? 'bg-primary-600 text-white' : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
          }`}
        >
          All ({total})
        </button>
        {ALL_STATUSES.map((s) => (
          <button
            key={s}
            onClick={() => setStatusFilter(s === statusFilter ? '' : s)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
              statusFilter === s
                ? 'bg-primary-600 text-white'
                : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
            }`}
          >
            {s.replace(/_/g, ' ')} {statusCounts[s] ? `(${statusCounts[s]})` : ''}
          </button>
        ))}
      </div>

      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
          <input className="input pl-9" placeholder="Search leads…" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <button onClick={() => { setEditingLead(null); setShowModal(true); }} className="btn btn-primary btn-md gap-2">
          <Plus className="w-4 h-4" /> Add Lead
        </button>
      </div>

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
                <th className="px-4 py-3 font-medium">Title</th>
                <th className="px-4 py-3 font-medium">Company</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Probability</th>
                <th className="px-4 py-3 font-medium">Close Date</th>
                <th className="px-4 py-3 font-medium text-right">Value</th>
                <th className="px-4 py-3 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
              {loading ? (
                <tr><td colSpan={7} className="px-4 py-10 text-center text-gray-400">Loading…</td></tr>
              ) : leads.length === 0 ? (
                <tr><td colSpan={7} className="px-4 py-10 text-center text-gray-400">No leads found.</td></tr>
              ) : (
                leads.map((lead) => (
                  <tr key={lead.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors">
                    <td className="px-4 py-3">
                      <p className="font-medium text-gray-900 dark:text-white">{lead.title}</p>
                      {lead.contactName && <p className="text-xs text-gray-500 dark:text-gray-400">{lead.contactName}</p>}
                    </td>
                    <td className="px-4 py-3 text-gray-600 dark:text-gray-300">{lead.companyName || lead.clientName || '—'}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[lead.status as LeadStatus] ?? ''}`}>
                        {lead.status.replace(/_/g, ' ')}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="w-16 h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                          <div className="h-full bg-primary-500 rounded-full" style={{ width: `${lead.probability}%` }} />
                        </div>
                        <span className="text-xs text-gray-500 dark:text-gray-400">{lead.probability}%</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-gray-500 dark:text-gray-400 whitespace-nowrap">{lead.expectedCloseDate ?? '—'}</td>
                    <td className="px-4 py-3 text-right font-medium text-gray-900 dark:text-white whitespace-nowrap">
                      {lead.estimatedValue != null ? formatCurrency(lead.estimatedValue) : '—'}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button onClick={() => { setEditingLead(lead); setShowModal(true); }} className="p-1.5 text-gray-400 hover:text-primary-600 dark:hover:text-primary-400 transition-colors" title="Edit">
                          <Pencil className="w-4 h-4" />
                        </button>
                        {deleteConfirm === lead.id ? (
                          <div className="flex items-center gap-1">
                            <button onClick={() => handleDelete(lead.id)} className="text-xs text-danger-600 hover:underline">Confirm</button>
                            <button onClick={() => setDeleteConfirm(null)} className="text-xs text-gray-500 hover:underline">Cancel</button>
                          </div>
                        ) : (
                          <button onClick={() => setDeleteConfirm(lead.id)} className="p-1.5 text-gray-400 hover:text-danger-600 dark:hover:text-danger-400 transition-colors" title="Delete">
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
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-gray-200 dark:border-gray-700">
            <span className="text-sm text-gray-500 dark:text-gray-400">Page {page} of {totalPages}</span>
            <div className="flex gap-2">
              <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="btn btn-secondary btn-sm"><ChevronLeft className="w-4 h-4" /></button>
              <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages} className="btn btn-secondary btn-sm"><ChevronRight className="w-4 h-4" /></button>
            </div>
          </div>
        )}
      </div>

      {showModal && (
        <LeadModal
          lead={editingLead}
          onClose={() => { setShowModal(false); setEditingLead(null); }}
          onSaved={handleSaved}
        />
      )}
    </div>
  );
}
