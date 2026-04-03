import { useState, useEffect, useCallback } from 'react';
import { X, Plus, Check, Clock } from 'lucide-react';
import { api, getErrorMessage } from '../../../services/api';
import type { Lead, LeadActivity, Client, PnlCenterWithStats } from '@finance/shared';

interface LeadModalProps {
  lead: Lead | null;
  onClose: () => void;
  onSaved: () => void;
}

type ModalTab = 'details' | 'activities';

const STATUSES = ['new', 'contacted', 'qualified', 'proposal_sent', 'negotiation', 'won', 'lost', 'on_hold'] as const;
const ACTIVITY_TYPES = ['note', 'call', 'email', 'meeting', 'task'] as const;

export function LeadModal({ lead, onClose, onSaved }: LeadModalProps) {
  const isEditing = lead !== null;
  const [activeTab, setActiveTab] = useState<ModalTab>('details');

  // Details fields
  const [title, setTitle] = useState(lead?.title ?? '');
  const [clientId, setClientId] = useState(lead?.clientId ?? '');
  const [companyName, setCompanyName] = useState(lead?.companyName ?? '');
  const [contactName, setContactName] = useState(lead?.contactName ?? '');
  const [contactEmail, setContactEmail] = useState(lead?.contactEmail ?? '');
  const [contactPhone, setContactPhone] = useState(lead?.contactPhone ?? '');
  const [source, setSource] = useState(lead?.source ?? '');
  const [status, setStatus] = useState(lead?.status ?? 'new');
  const [lostReason, setLostReason] = useState(lead?.lostReason ?? '');
  const [estimatedValue, setEstimatedValue] = useState(lead?.estimatedValue?.toString() ?? '');
  const [currency, setCurrency] = useState(lead?.currency ?? 'USD');
  const [probability, setProbability] = useState(lead?.probability ?? 50);
  const [expectedCloseDate, setExpectedCloseDate] = useState(lead?.expectedCloseDate ?? '');
  const [notes, setNotes] = useState(lead?.notes ?? '');
  const [pnlCenterId, setPnlCenterId] = useState(lead?.pnlCenterId ?? '');

  // Activity fields
  const [activities, setActivities] = useState<LeadActivity[]>([]);
  const [activityLoading, setActivityLoading] = useState(false);
  const [showAddActivity, setShowAddActivity] = useState(false);
  const [activityType, setActivityType] = useState<typeof ACTIVITY_TYPES[number]>('note');
  const [activityTitle, setActivityTitle] = useState('');
  const [activityDesc, setActivityDesc] = useState('');
  const [activityDue, setActivityDue] = useState('');
  const [activityCompleted, setActivityCompleted] = useState(false);
  const [activitySaving, setActivitySaving] = useState(false);

  // Supporting data
  const [clients, setClients] = useState<Client[]>([]);
  const [pnlCenters, setPnlCenters] = useState<PnlCenterWithStats[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([
      api.get('/clients?limit=200&status=active'),
      api.get('/pnl-centers'),
    ]).then(([clientsRes, pnlRes]) => {
      setClients(clientsRes.data.data ?? []);
      setPnlCenters(pnlRes.data.data ?? []);
    }).catch(() => {});
  }, []);

  const fetchActivities = useCallback(async () => {
    if (!isEditing) return;
    setActivityLoading(true);
    try {
      const res = await api.get(`/leads/${lead.id}/activities`);
      setActivities(res.data.data ?? []);
    } catch {
      // silently ignore
    } finally {
      setActivityLoading(false);
    }
  }, [isEditing, lead?.id]);

  useEffect(() => {
    if (activeTab === 'activities') fetchActivities();
  }, [activeTab, fetchActivities]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const body = {
        title: title.trim(),
        clientId: clientId || null,
        companyName: companyName.trim() || null,
        contactName: contactName.trim() || null,
        contactEmail: contactEmail.trim() || null,
        contactPhone: contactPhone.trim() || null,
        source: source.trim() || null,
        status,
        lostReason: status === 'lost' ? lostReason.trim() || null : null,
        estimatedValue: estimatedValue ? parseFloat(estimatedValue) : null,
        currency,
        probability,
        expectedCloseDate: expectedCloseDate || null,
        notes: notes.trim() || null,
        pnlCenterId: pnlCenterId || null,
      };
      if (isEditing) {
        await api.put(`/leads/${lead.id}`, body);
      } else {
        await api.post('/leads', body);
      }
      onSaved();
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  const handleAddActivity = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isEditing) return;
    setActivitySaving(true);
    try {
      await api.post(`/leads/${lead.id}/activities`, {
        activityType,
        title: activityTitle.trim() || null,
        description: activityDesc.trim() || null,
        dueDate: activityDue || null,
        completed: activityCompleted,
      });
      setActivityTitle('');
      setActivityDesc('');
      setActivityDue('');
      setActivityCompleted(false);
      setShowAddActivity(false);
      fetchActivities();
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setActivitySaving(false);
    }
  };

  // When a client is selected, auto-fill company name
  const handleClientChange = (id: string) => {
    setClientId(id);
    if (id) {
      const found = clients.find((c) => c.id === id);
      if (found && !companyName) setCompanyName(found.companyName || found.name);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div className="modal-box w-full max-w-2xl flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="modal-header shrink-0">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            {isEditing ? 'Edit Lead' : 'New Lead'}
          </h2>
          <button onClick={onClose} className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tabs */}
        <div className="border-b border-gray-200 dark:border-gray-700 shrink-0 px-4">
          <nav className="-mb-px flex space-x-6">
            {(['details', 'activities'] as ModalTab[]).map((tab) => (
              <button
                key={tab}
                type="button"
                onClick={() => setActiveTab(tab)}
                disabled={tab === 'activities' && !isEditing}
                className={`py-3 text-sm font-medium border-b-2 transition-colors capitalize ${
                  activeTab === tab
                    ? 'border-primary-500 text-primary-600'
                    : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 disabled:opacity-40 disabled:cursor-not-allowed'
                }`}
              >
                {tab}
              </button>
            ))}
          </nav>
        </div>

        {/* Tab content */}
        <div className="flex-1 overflow-y-auto">
          {error && (
            <div className="mx-6 mt-4 bg-danger-50 dark:bg-danger-900/20 text-danger-700 dark:text-danger-400 text-sm px-3 py-2 rounded-md">
              {error}
            </div>
          )}

          {/* Details tab */}
          {activeTab === 'details' && (
            <form id="lead-form" onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="label">Title *</label>
                <input className="input mt-1 w-full" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Website redesign project" required />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label">Client</label>
                  <select className="input mt-1" value={clientId} onChange={(e) => handleClientChange(e.target.value)}>
                    <option value="">— Select client —</option>
                    {clients.map((c) => (
                      <option key={c.id} value={c.id}>{c.companyName || c.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="label">Company Name</label>
                  <input className="input mt-1" value={companyName} onChange={(e) => setCompanyName(e.target.value)} placeholder="Company" />
                </div>
                <div>
                  <label className="label">Contact Name</label>
                  <input className="input mt-1" value={contactName} onChange={(e) => setContactName(e.target.value)} placeholder="John Doe" />
                </div>
                <div>
                  <label className="label">Contact Email</label>
                  <input className="input mt-1" type="email" value={contactEmail} onChange={(e) => setContactEmail(e.target.value)} placeholder="john@company.com" />
                </div>
                <div>
                  <label className="label">Contact Phone</label>
                  <input className="input mt-1" value={contactPhone} onChange={(e) => setContactPhone(e.target.value)} placeholder="+1 555 0100" />
                </div>
                <div>
                  <label className="label">Source</label>
                  <input className="input mt-1" value={source} onChange={(e) => setSource(e.target.value)} placeholder="Website, Referral…" list="lead-sources" />
                  <datalist id="lead-sources">
                    {['Website', 'Referral', 'LinkedIn', 'Cold Call', 'Trade Show', 'Email Campaign', 'Social Media', 'Partner', 'Other'].map((s) => (
                      <option key={s} value={s} />
                    ))}
                  </datalist>
                </div>
                <div>
                  <label className="label">Status</label>
                  <select className="input mt-1" value={status} onChange={(e) => setStatus(e.target.value as typeof status)}>
                    {STATUSES.map((s) => (
                      <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>
                    ))}
                  </select>
                </div>
                {status === 'lost' && (
                  <div>
                    <label className="label">Lost Reason</label>
                    <input className="input mt-1" value={lostReason} onChange={(e) => setLostReason(e.target.value)} placeholder="Why was this lost?" />
                  </div>
                )}
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="col-span-2">
                  <label className="label">Estimated Value</label>
                  <input className="input mt-1" type="number" min="0" step="0.01" value={estimatedValue} onChange={(e) => setEstimatedValue(e.target.value)} placeholder="0.00" />
                </div>
                <div>
                  <label className="label">Currency</label>
                  <select className="input mt-1" value={currency} onChange={(e) => setCurrency(e.target.value)}>
                    <option value="USD">USD</option>
                    <option value="EUR">EUR</option>
                    <option value="ILS">ILS</option>
                    <option value="GBP">GBP</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="label">Probability: {probability}%</label>
                <input type="range" min="0" max="100" value={probability} onChange={(e) => setProbability(Number(e.target.value))}
                  className="w-full mt-2 h-2 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none accent-primary-600" />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label">Expected Close Date</label>
                  <input className="input mt-1" type="date" value={expectedCloseDate} onChange={(e) => setExpectedCloseDate(e.target.value)} />
                </div>
                <div>
                  <label className="label">P&L Center</label>
                  <select className="input mt-1" value={pnlCenterId} onChange={(e) => setPnlCenterId(e.target.value)}>
                    <option value="">— None —</option>
                    {pnlCenters.map((c) => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="label">Notes</label>
                <textarea className="input mt-1 h-20 resize-none w-full" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Additional notes…" />
              </div>
            </form>
          )}

          {/* Activities tab */}
          {activeTab === 'activities' && (
            <div className="p-6 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300">Activity Log</h3>
                <button type="button" onClick={() => setShowAddActivity(!showAddActivity)} className="btn btn-secondary btn-sm gap-1">
                  <Plus className="w-3.5 h-3.5" /> Log Activity
                </button>
              </div>

              {showAddActivity && (
                <form onSubmit={handleAddActivity} className="panel p-4 space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="label text-xs">Type</label>
                      <select className="input mt-1 text-sm" value={activityType} onChange={(e) => setActivityType(e.target.value as typeof ACTIVITY_TYPES[number])}>
                        {ACTIVITY_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="label text-xs">Due Date</label>
                      <input className="input mt-1 text-sm" type="date" value={activityDue} onChange={(e) => setActivityDue(e.target.value)} />
                    </div>
                  </div>
                  <div>
                    <label className="label text-xs">Title</label>
                    <input className="input mt-1 text-sm w-full" value={activityTitle} onChange={(e) => setActivityTitle(e.target.value)} placeholder="Brief title" />
                  </div>
                  <div>
                    <label className="label text-xs">Description</label>
                    <textarea className="input mt-1 text-sm h-16 resize-none w-full" value={activityDesc} onChange={(e) => setActivityDesc(e.target.value)} placeholder="Details…" />
                  </div>
                  {activityType === 'task' && (
                    <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300 cursor-pointer">
                      <input type="checkbox" checked={activityCompleted} onChange={(e) => setActivityCompleted(e.target.checked)} className="rounded" />
                      Mark as completed
                    </label>
                  )}
                  <div className="flex gap-2 justify-end">
                    <button type="button" onClick={() => setShowAddActivity(false)} className="btn btn-secondary btn-sm">Cancel</button>
                    <button type="submit" disabled={activitySaving} className="btn btn-primary btn-sm">Save</button>
                  </div>
                </form>
              )}

              {activityLoading ? (
                <p className="text-sm text-gray-500 dark:text-gray-400">Loading…</p>
              ) : activities.length === 0 ? (
                <p className="text-sm text-gray-500 dark:text-gray-400">No activities yet. Log the first one above.</p>
              ) : (
                <div className="space-y-2">
                  {activities.map((a) => (
                    <div key={a.id} className="flex items-start gap-3 p-3 rounded-lg bg-gray-50 dark:bg-gray-800/50">
                      <div className="w-6 h-6 mt-0.5 rounded-full bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center shrink-0">
                        {a.completed
                          ? <Check className="w-3.5 h-3.5 text-success-600" />
                          : <Clock className="w-3.5 h-3.5 text-primary-600 dark:text-primary-400" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-xs font-medium text-gray-500 dark:text-gray-400 capitalize">{a.activityType}</span>
                          <span className="text-xs text-gray-400">{new Date(a.createdAt).toLocaleDateString()}</span>
                        </div>
                        {a.title && <p className="text-sm font-medium text-gray-900 dark:text-white mt-0.5">{a.title}</p>}
                        {a.description && <p className="text-sm text-gray-600 dark:text-gray-400 mt-0.5">{a.description}</p>}
                        {a.dueDate && <p className="text-xs text-gray-400 mt-1">Due: {String(a.dueDate).split('T')[0]}</p>}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer — only for details tab */}
        {activeTab === 'details' && (
          <div className="flex justify-end gap-3 p-4 border-t border-gray-200 dark:border-gray-700 shrink-0">
            <button type="button" onClick={onClose} className="btn btn-secondary btn-md">Cancel</button>
            <button type="submit" form="lead-form" disabled={loading} className="btn btn-primary btn-md">
              {loading ? 'Saving…' : isEditing ? 'Save Changes' : 'Create Lead'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
