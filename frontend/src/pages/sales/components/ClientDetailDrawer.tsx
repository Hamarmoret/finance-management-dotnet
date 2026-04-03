import { useState, useEffect } from 'react';
import { X, Building2, Mail, Phone, Globe, MapPin, Tag, DollarSign, FileText, TrendingUp, ExternalLink } from 'lucide-react';
import { api, getErrorMessage } from '../../../services/api';
import type { Client, Income, Proposal, Lead } from '@finance/shared';
import { formatCurrency } from '../../../utils/formatters';

interface ClientDetailDrawerProps {
  client: Client;
  onClose: () => void;
  onEdit: () => void;
}

type DrawerTab = 'overview' | 'income' | 'proposals' | 'leads';

const STATUS_COLORS: Record<string, string> = {
  // invoice statuses
  paid: 'bg-success-50 text-success-700 dark:bg-success-900/20 dark:text-success-400',
  sent: 'bg-primary-50 text-primary-700 dark:bg-primary-900/20 dark:text-primary-400',
  draft: 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300',
  overdue: 'bg-danger-50 text-danger-700 dark:bg-danger-900/20 dark:text-danger-400',
  cancelled: 'bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400',
  // proposal statuses
  accepted: 'bg-success-50 text-success-700 dark:bg-success-900/20 dark:text-success-400',
  rejected: 'bg-danger-50 text-danger-700 dark:bg-danger-900/20 dark:text-danger-400',
  viewed: 'bg-primary-50 text-primary-700 dark:bg-primary-900/20 dark:text-primary-400',
  expired: 'bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400',
  converted: 'bg-success-50 text-success-600 dark:bg-success-900/20 dark:text-success-400',
  // lead statuses
  new: 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300',
  contacted: 'bg-primary-50 text-primary-700 dark:bg-primary-900/20 dark:text-primary-400',
  qualified: 'bg-primary-50 text-primary-700 dark:bg-primary-900/20 dark:text-primary-400',
  proposal_sent: 'bg-warning-50 text-warning-700 dark:bg-warning-900/20 dark:text-warning-400',
  negotiation: 'bg-warning-50 text-warning-700 dark:bg-warning-900/20 dark:text-warning-400',
  won: 'bg-success-50 text-success-700 dark:bg-success-900/20 dark:text-success-400',
  lost: 'bg-danger-50 text-danger-700 dark:bg-danger-900/20 dark:text-danger-400',
  on_hold: 'bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400',
};

function StatusBadge({ status }: { status: string }) {
  const cls = STATUS_COLORS[status] ?? 'bg-gray-100 text-gray-600';
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${cls}`}>
      {status.replace(/_/g, ' ')}
    </span>
  );
}

export function ClientDetailDrawer({ client, onClose, onEdit }: ClientDetailDrawerProps) {
  const [activeTab, setActiveTab] = useState<DrawerTab>('overview');
  const [income, setIncome] = useState<Income[]>([]);
  const [proposals, setProposals] = useState<Proposal[]>([]);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loadingData, setLoadingData] = useState(false);
  const [dataError, setDataError] = useState<string | null>(null);

  const displayName = client.companyName || client.name;

  useEffect(() => {
    const fetchRelated = async () => {
      setLoadingData(true);
      setDataError(null);
      try {
        const [incomeRes, proposalsRes, leadsRes] = await Promise.all([
          api.get(`/income?clientName=${encodeURIComponent(displayName)}&limit=100`),
          api.get(`/proposals?clientId=${client.id}&limit=100`),
          api.get(`/leads?clientId=${client.id}&limit=100`),
        ]);
        setIncome(incomeRes.data.data ?? []);
        setProposals(proposalsRes.data.data ?? []);
        setLeads(leadsRes.data.data ?? []);
      } catch (err) {
        setDataError(getErrorMessage(err));
      } finally {
        setLoadingData(false);
      }
    };
    fetchRelated();
  }, [client.id, displayName]);

  const totalIncome = income.reduce((s, i) => s + i.amount, 0);
  const openProposals = proposals.filter((p) => p.status === 'sent' || p.status === 'viewed').length;
  const activeLeads = leads.filter((l) => !['won', 'lost'].includes(l.status)).length;

  const tabs: { id: DrawerTab; label: string }[] = [
    { id: 'overview', label: 'Overview' },
    { id: 'income', label: `Income (${income.length})` },
    { id: 'proposals', label: `Proposals (${proposals.length})` },
    { id: 'leads', label: `Leads (${leads.length})` },
  ];

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 z-40 bg-black/30" onClick={onClose} />

      {/* Drawer */}
      <div className="fixed inset-y-0 right-0 z-50 w-full max-w-2xl bg-white dark:bg-gray-900 shadow-2xl flex flex-col">
        {/* Header */}
        <div className="flex items-start justify-between p-5 border-b border-gray-200 dark:border-gray-700 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-primary-100 dark:bg-primary-900/30 rounded-lg flex items-center justify-center shrink-0">
              <Building2 className="w-5 h-5 text-primary-600 dark:text-primary-400" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">{displayName}</h2>
              {client.companyName && client.name !== client.companyName && (
                <p className="text-sm text-gray-500 dark:text-gray-400">{client.name}</p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={onEdit} className="btn btn-secondary btn-sm">Edit</button>
            <button onClick={onClose} className="p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 rounded">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Summary stats */}
        {!loadingData && (
          <div className="grid grid-cols-3 gap-0 border-b border-gray-200 dark:border-gray-700 shrink-0">
            {[
              { label: 'Total Income', value: formatCurrency(totalIncome), icon: DollarSign },
              { label: 'Open Proposals', value: openProposals.toString(), icon: FileText },
              { label: 'Active Leads', value: activeLeads.toString(), icon: TrendingUp },
            ].map(({ label, value, icon: Icon }) => (
              <div key={label} className="px-5 py-3 border-r last:border-r-0 border-gray-200 dark:border-gray-700">
                <div className="flex items-center gap-1.5 text-gray-500 dark:text-gray-400 text-xs mb-0.5">
                  <Icon className="w-3.5 h-3.5" />
                  {label}
                </div>
                <p className="text-base font-semibold text-gray-900 dark:text-white">{value}</p>
              </div>
            ))}
          </div>
        )}

        {/* Tabs */}
        <div className="border-b border-gray-200 dark:border-gray-700 shrink-0">
          <nav className="flex px-5 -mb-px">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`py-3 px-3 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === tab.id
                    ? 'border-primary-500 text-primary-600'
                    : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </nav>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-5">
          {dataError && (
            <p className="text-sm text-danger-600 dark:text-danger-400 mb-4">{dataError}</p>
          )}

          {/* Overview */}
          {activeTab === 'overview' && (
            <div className="space-y-5">
              <div className="grid grid-cols-2 gap-4">
                {client.email && (
                  <a href={`mailto:${client.email}`} className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300 hover:text-primary-600 dark:hover:text-primary-400">
                    <Mail className="w-4 h-4 text-gray-400 shrink-0" />
                    {client.email}
                  </a>
                )}
                {client.phone && (
                  <a href={`tel:${client.phone}`} className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300 hover:text-primary-600">
                    <Phone className="w-4 h-4 text-gray-400 shrink-0" />
                    {client.phone}
                  </a>
                )}
                {client.website && (
                  <a href={client.website} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-sm text-primary-600 dark:text-primary-400 hover:underline col-span-2">
                    <Globe className="w-4 h-4 shrink-0" />
                    {client.website}
                    <ExternalLink className="w-3 h-3" />
                  </a>
                )}
                {(client.city || client.country) && (
                  <div className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300 col-span-2">
                    <MapPin className="w-4 h-4 text-gray-400 shrink-0" />
                    {[client.address, client.city, client.state, client.postalCode, client.country].filter(Boolean).join(', ')}
                  </div>
                )}
              </div>

              <div className="grid grid-cols-3 gap-4 pt-2">
                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mb-0.5">Currency</p>
                  <p className="text-sm font-medium text-gray-900 dark:text-white">{client.defaultCurrency}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mb-0.5">Payment Terms</p>
                  <p className="text-sm font-medium text-gray-900 dark:text-white">{client.paymentTerms} days</p>
                </div>
                {client.taxId && (
                  <div>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mb-0.5">Tax ID</p>
                    <p className="text-sm font-medium text-gray-900 dark:text-white">{client.taxId}</p>
                  </div>
                )}
              </div>

              {client.tags && client.tags.length > 0 && (
                <div>
                  <div className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400 mb-2">
                    <Tag className="w-3.5 h-3.5" /> Tags
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {client.tags.map((tag) => (
                      <span key={tag} className="px-2 py-0.5 bg-primary-50 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300 text-xs rounded-full">
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {client.notes && (
                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Notes</p>
                  <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap">{client.notes}</p>
                </div>
              )}
            </div>
          )}

          {/* Income */}
          {activeTab === 'income' && (
            <div>
              {loadingData ? (
                <p className="text-sm text-gray-500 dark:text-gray-400">Loading…</p>
              ) : income.length === 0 ? (
                <p className="text-sm text-gray-500 dark:text-gray-400">No income records for this client.</p>
              ) : (
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400 text-left">
                      <th className="pb-2 font-medium">Date</th>
                      <th className="pb-2 font-medium">Description</th>
                      <th className="pb-2 font-medium">Status</th>
                      <th className="pb-2 font-medium text-right">Amount</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                    {income.map((i) => (
                      <tr key={i.id}>
                        <td className="py-2.5 text-gray-500 dark:text-gray-400 whitespace-nowrap pr-4">{i.incomeDate}</td>
                        <td className="py-2.5 text-gray-800 dark:text-gray-200 pr-4 max-w-[200px] truncate">{i.description}</td>
                        <td className="py-2.5 pr-4">
                          {i.invoiceStatus ? <StatusBadge status={i.invoiceStatus} /> : <span className="text-gray-400">—</span>}
                        </td>
                        <td className="py-2.5 text-right font-medium text-gray-900 dark:text-white whitespace-nowrap">
                          {formatCurrency(i.amount)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="border-t border-gray-200 dark:border-gray-700">
                      <td colSpan={3} className="pt-2 text-sm font-medium text-gray-500 dark:text-gray-400">Total</td>
                      <td className="pt-2 text-right font-semibold text-gray-900 dark:text-white">{formatCurrency(totalIncome)}</td>
                    </tr>
                  </tfoot>
                </table>
              )}
            </div>
          )}

          {/* Proposals */}
          {activeTab === 'proposals' && (
            <div>
              {loadingData ? (
                <p className="text-sm text-gray-500 dark:text-gray-400">Loading…</p>
              ) : proposals.length === 0 ? (
                <p className="text-sm text-gray-500 dark:text-gray-400">No proposals for this client.</p>
              ) : (
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400 text-left">
                      <th className="pb-2 font-medium">Number</th>
                      <th className="pb-2 font-medium">Title</th>
                      <th className="pb-2 font-medium">Status</th>
                      <th className="pb-2 font-medium text-right">Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                    {proposals.map((p) => (
                      <tr key={p.id}>
                        <td className="py-2.5 text-gray-500 dark:text-gray-400 pr-3 whitespace-nowrap font-mono text-xs">{p.proposalNumber}</td>
                        <td className="py-2.5 text-gray-800 dark:text-gray-200 pr-3 max-w-[180px] truncate">{p.title}</td>
                        <td className="py-2.5 pr-3"><StatusBadge status={p.status} /></td>
                        <td className="py-2.5 text-right font-medium text-gray-900 dark:text-white whitespace-nowrap">
                          {formatCurrency(p.total)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          )}

          {/* Leads */}
          {activeTab === 'leads' && (
            <div>
              {loadingData ? (
                <p className="text-sm text-gray-500 dark:text-gray-400">Loading…</p>
              ) : leads.length === 0 ? (
                <p className="text-sm text-gray-500 dark:text-gray-400">No leads for this client.</p>
              ) : (
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400 text-left">
                      <th className="pb-2 font-medium">Title</th>
                      <th className="pb-2 font-medium">Status</th>
                      <th className="pb-2 font-medium">Close Date</th>
                      <th className="pb-2 font-medium text-right">Value</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                    {leads.map((l) => (
                      <tr key={l.id}>
                        <td className="py-2.5 text-gray-800 dark:text-gray-200 pr-3 max-w-[180px] truncate">{l.title}</td>
                        <td className="py-2.5 pr-3"><StatusBadge status={l.status} /></td>
                        <td className="py-2.5 text-gray-500 dark:text-gray-400 pr-3 whitespace-nowrap">{l.expectedCloseDate ?? '—'}</td>
                        <td className="py-2.5 text-right font-medium text-gray-900 dark:text-white whitespace-nowrap">
                          {l.estimatedValue != null ? formatCurrency(l.estimatedValue) : '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
