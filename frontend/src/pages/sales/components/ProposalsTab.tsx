import { useState, useEffect, useCallback } from 'react';
import { Plus, Search, Pencil, Trash2, AlertCircle, ChevronLeft, ChevronRight, GitBranch } from 'lucide-react';
import { api, getErrorMessage } from '../../../services/api';
import type { Proposal, ProposalStatus, IncomeContract } from '@finance/shared';
import { formatCurrency } from '../../../utils/formatters';
import { ProposalModal } from './ProposalModal';
import ConvertProposalModal from '../../income/components/ConvertProposalModal';

const ALL_STATUSES: ProposalStatus[] = ['draft', 'sent', 'viewed', 'accepted', 'rejected', 'expired', 'converted'];

const STATUS_COLORS: Record<ProposalStatus, string> = {
  draft: 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300',
  sent: 'bg-primary-50 text-primary-700 dark:bg-primary-900/20 dark:text-primary-400',
  viewed: 'bg-primary-50 text-primary-700 dark:bg-primary-900/20 dark:text-primary-400',
  accepted: 'bg-success-50 text-success-700 dark:bg-success-900/20 dark:text-success-400',
  rejected: 'bg-danger-50 text-danger-700 dark:bg-danger-900/20 dark:text-danger-400',
  expired: 'bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400',
  converted: 'bg-success-50 text-success-600 dark:bg-success-900/20 dark:text-success-400',
};

interface ProposalsTabProps {
  startDate?: string;
  endDate?: string;
}

export default function ProposalsTab({ startDate, endDate }: ProposalsTabProps) {
  const [proposals, setProposals] = useState<Proposal[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const limit = 20;

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('');

  const [showModal, setShowModal] = useState(false);
  const [editingProposal, setEditingProposal] = useState<Proposal | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [convertingProposal, setConvertingProposal] = useState<Proposal | null>(null);
  const [convertSuccess, setConvertSuccess] = useState<string | null>(null);

  const fetchProposals = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({ page: page.toString(), limit: limit.toString() });
      if (search) params.append('search', search);
      if (statusFilter) params.append('status', statusFilter);
      if (startDate) params.append('startDate', startDate);
      if (endDate) params.append('endDate', endDate);
      const res = await api.get(`/proposals?${params}`);
      setProposals(res.data.data ?? []);
      setTotal(res.data.pagination?.total ?? 0);
      setTotalPages(res.data.pagination?.totalPages ?? 1);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [page, search, statusFilter, startDate, endDate]);

  useEffect(() => { fetchProposals(); }, [fetchProposals]);
  useEffect(() => { setPage(1); }, [search, statusFilter, startDate, endDate]);

  const totalValue = proposals.reduce((s, p) => s + p.total, 0);
  const acceptedCount = proposals.filter((p) => p.status === 'accepted').length;
  const conversionRate = total > 0 ? Math.round((acceptedCount / total) * 100) : 0;

  const handleDelete = async (id: string) => {
    try {
      await api.delete(`/proposals/${id}`);
      setDeleteConfirm(null);
      fetchProposals();
    } catch (err) {
      setError(getErrorMessage(err));
    }
  };

  const handleSaved = () => {
    setShowModal(false);
    setEditingProposal(null);
    fetchProposals();
  };

  const handleConverted = (contract: IncomeContract) => {
    setConvertingProposal(null);
    setConvertSuccess(`Converted to contract: ${contract.contractNumber ?? contract.title}`);
    fetchProposals();
    setTimeout(() => setConvertSuccess(null), 5000);
  };

  return (
    <div className="space-y-4">
      {/* Stats */}
      <div className="grid grid-cols-4 gap-4">
        {[
          { label: 'Total', value: total.toString() },
          { label: 'Total Value', value: formatCurrency(totalValue) },
          { label: 'Accepted', value: acceptedCount.toString() },
          { label: 'Conversion Rate', value: `${conversionRate}%` },
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
          All
        </button>
        {ALL_STATUSES.map((s) => (
          <button
            key={s}
            onClick={() => setStatusFilter(s === statusFilter ? '' : s)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
              statusFilter === s ? 'bg-primary-600 text-white' : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
            }`}
          >
            {s}
          </button>
        ))}
      </div>

      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
          <input className="input pl-9" placeholder="Search proposals…" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <button onClick={() => { setEditingProposal(null); setShowModal(true); }} className="btn btn-primary btn-md gap-2">
          <Plus className="w-4 h-4" /> New Proposal
        </button>
      </div>

      {error && (
        <div className="flex items-center gap-2 text-danger-600 dark:text-danger-400 text-sm bg-danger-50 dark:bg-danger-900/20 px-3 py-2 rounded-md">
          <AlertCircle className="w-4 h-4 shrink-0" /> {error}
        </div>
      )}

      {convertSuccess && (
        <div className="flex items-center gap-2 text-success-700 dark:text-success-400 text-sm bg-success-50 dark:bg-success-900/20 px-3 py-2 rounded-md border border-success-200 dark:border-success-800">
          <GitBranch className="w-4 h-4 shrink-0" /> {convertSuccess}
        </div>
      )}

      {/* Table */}
      <div className="panel overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead>
              <tr className="bg-gray-50 dark:bg-gray-700/50 border-b border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400">
                <th className="px-4 py-3 font-medium">Number</th>
                <th className="px-4 py-3 font-medium">Title</th>
                <th className="px-4 py-3 font-medium">Client</th>
                <th className="px-4 py-3 font-medium">Issue Date</th>
                <th className="px-4 py-3 font-medium">Valid Until</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium text-right">Total</th>
                <th className="px-4 py-3 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
              {loading ? (
                <tr><td colSpan={8} className="px-4 py-10 text-center text-gray-400">Loading…</td></tr>
              ) : proposals.length === 0 ? (
                <tr><td colSpan={8} className="px-4 py-10 text-center text-gray-400">No proposals found.</td></tr>
              ) : (
                proposals.map((p) => (
                  <tr key={p.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors">
                    <td className="px-4 py-3 font-mono text-xs text-gray-500 dark:text-gray-400 whitespace-nowrap">{p.proposalNumber}</td>
                    <td className="px-4 py-3 font-medium text-gray-900 dark:text-white max-w-[180px] truncate">{p.title}</td>
                    <td className="px-4 py-3 text-gray-600 dark:text-gray-300">{p.clientName ?? '—'}</td>
                    <td className="px-4 py-3 text-gray-500 dark:text-gray-400 whitespace-nowrap">{p.issueDate}</td>
                    <td className="px-4 py-3 text-gray-500 dark:text-gray-400 whitespace-nowrap">{p.validUntil ?? '—'}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[p.status as ProposalStatus] ?? ''}`}>
                        {p.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right font-medium text-gray-900 dark:text-white whitespace-nowrap">
                      {formatCurrency(p.total)}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-2">
                        {p.status === 'accepted' && !p.convertedToContractId && (
                          <button
                            onClick={() => setConvertingProposal(p)}
                            className="p-1.5 text-gray-400 hover:text-success-600 dark:hover:text-success-400 transition-colors"
                            title="Convert to Contract"
                          >
                            <GitBranch className="w-4 h-4" />
                          </button>
                        )}
                        <button onClick={() => { setEditingProposal(p); setShowModal(true); }} className="p-1.5 text-gray-400 hover:text-primary-600 dark:hover:text-primary-400 transition-colors" title="Edit">
                          <Pencil className="w-4 h-4" />
                        </button>
                        {deleteConfirm === p.id ? (
                          <div className="flex items-center gap-1">
                            <button onClick={() => handleDelete(p.id)} className="text-xs text-danger-600 hover:underline">Confirm</button>
                            <button onClick={() => setDeleteConfirm(null)} className="text-xs text-gray-500 hover:underline">Cancel</button>
                          </div>
                        ) : (
                          <button onClick={() => setDeleteConfirm(p.id)} className="p-1.5 text-gray-400 hover:text-danger-600 dark:hover:text-danger-400 transition-colors" title="Delete">
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
        <ProposalModal
          proposal={editingProposal}
          onClose={() => { setShowModal(false); setEditingProposal(null); }}
          onSaved={handleSaved}
        />
      )}

      {convertingProposal && (
        <ConvertProposalModal
          proposal={convertingProposal}
          onClose={() => setConvertingProposal(null)}
          onConverted={handleConverted}
        />
      )}
    </div>
  );
}
