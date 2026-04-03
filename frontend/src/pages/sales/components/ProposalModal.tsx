import { useState, useEffect } from 'react';
import { X, Plus, Trash2, ExternalLink } from 'lucide-react';
import { api, getErrorMessage } from '../../../services/api';
import type { Proposal, Client, Lead } from '@finance/shared';
import { formatCurrency } from '../../../utils/formatters';

interface LineItem {
  description: string;
  quantity: string;
  unitPrice: string;
  discountPercent: string;
}

const defaultItem = (): LineItem => ({ description: '', quantity: '1', unitPrice: '', discountPercent: '0' });

function lineTotal(item: LineItem): number {
  const qty = parseFloat(item.quantity) || 0;
  const price = parseFloat(item.unitPrice) || 0;
  const disc = parseFloat(item.discountPercent) || 0;
  return qty * price * (1 - disc / 100);
}

const STATUSES = ['draft', 'sent', 'viewed', 'accepted', 'rejected', 'expired', 'converted'] as const;

interface ProposalModalProps {
  proposal: Proposal | null;
  onClose: () => void;
  onSaved: () => void;
}

export function ProposalModal({ proposal, onClose, onSaved }: ProposalModalProps) {
  const isEditing = proposal !== null;

  const [title, setTitle] = useState(proposal?.title ?? '');
  const [clientId, setClientId] = useState(proposal?.clientId ?? '');
  const [leadId, setLeadId] = useState(proposal?.leadId ?? '');
  const [issueDate, setIssueDate] = useState(proposal?.issueDate ?? new Date().toISOString().split('T')[0]);
  const [validUntil, setValidUntil] = useState(proposal?.validUntil ?? '');
  const [currency, setCurrency] = useState(proposal?.currency ?? 'USD');
  const [taxRate, setTaxRate] = useState(proposal?.taxRate?.toString() ?? '0');
  const [discountAmount, setDiscountAmount] = useState(proposal?.discountAmount?.toString() ?? '0');
  const [status, setStatus] = useState(proposal?.status ?? 'draft');
  const [rejectionReason, setRejectionReason] = useState(proposal?.rejectionReason ?? '');
  const [documentUrl, setDocumentUrl] = useState(proposal?.documentUrl ?? '');
  const [notes, setNotes] = useState(proposal?.notes ?? '');
  const [terms, setTerms] = useState(proposal?.terms ?? '');

  const [items, setItems] = useState<LineItem[]>(
    proposal?.items?.length
      ? proposal.items.map((i) => ({
          description: i.description,
          quantity: i.quantity.toString(),
          unitPrice: i.unitPrice.toString(),
          discountPercent: i.discountPercent.toString(),
        }))
      : [defaultItem()]
  );

  const [clients, setClients] = useState<Client[]>([]);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([
      api.get('/clients?limit=200&status=active'),
      api.get('/leads?limit=200'),
    ]).then(([cRes, lRes]) => {
      setClients(cRes.data.data ?? []);
      setLeads(lRes.data.data ?? []);
    }).catch(() => {});
  }, []);

  // When client changes, filter leads to that client
  const filteredLeads = clientId ? leads.filter((l) => l.clientId === clientId) : leads;

  // Auto-fill client from lead
  const handleLeadChange = (id: string) => {
    setLeadId(id);
    if (id) {
      const found = leads.find((l) => l.id === id);
      if (found?.clientId && !clientId) setClientId(found.clientId);
    }
  };

  const subtotal = items.reduce((s, i) => s + lineTotal(i), 0);
  const disc = parseFloat(discountAmount) || 0;
  const taxAmt = (subtotal - disc) * ((parseFloat(taxRate) || 0) / 100);
  const grandTotal = subtotal - disc + taxAmt;

  const addItem = () => setItems([...items, defaultItem()]);
  const removeItem = (idx: number) => setItems(items.filter((_, i) => i !== idx));
  const updateItem = (idx: number, field: keyof LineItem, value: string) => {
    setItems(items.map((item, i) => (i === idx ? { ...item, [field]: value } : item)));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const body = {
        title: title.trim(),
        clientId: clientId || null,
        leadId: leadId || null,
        issueDate,
        validUntil: validUntil || null,
        currency,
        taxRate: parseFloat(taxRate) || 0,
        discountAmount: parseFloat(discountAmount) || 0,
        notes: notes.trim() || null,
        terms: terms.trim() || null,
        items: items
          .filter((i) => i.description.trim())
          .map((i, idx) => ({
            description: i.description.trim(),
            quantity: parseFloat(i.quantity) || 1,
            unitPrice: parseFloat(i.unitPrice) || 0,
            discountPercent: parseFloat(i.discountPercent) || 0,
            sortOrder: idx,
          })),
        ...(isEditing
          ? {
              status,
              rejectionReason: status === 'rejected' ? rejectionReason.trim() || null : null,
              documentUrl: documentUrl.trim() || null,
            }
          : {}),
      };

      if (isEditing) {
        await api.put(`/proposals/${proposal.id}`, body);
      } else {
        await api.post('/proposals', body);
      }
      onSaved();
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div className="modal-box w-full max-w-3xl flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="modal-header shrink-0">
          <div>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              {isEditing ? `${proposal.proposalNumber} — Edit` : 'New Proposal'}
            </h2>
          </div>
          <button onClick={onClose} className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-6">
          {error && (
            <div className="bg-danger-50 dark:bg-danger-900/20 text-danger-700 dark:text-danger-400 text-sm px-3 py-2 rounded-md">
              {error}
            </div>
          )}

          {/* Header fields */}
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="label">Title *</label>
              <input className="input mt-1 w-full" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Proposal title" required />
            </div>
            <div>
              <label className="label">Client</label>
              <select className="input mt-1" value={clientId} onChange={(e) => { setClientId(e.target.value); setLeadId(''); }}>
                <option value="">— Select client —</option>
                {clients.map((c) => <option key={c.id} value={c.id}>{c.companyName || c.name}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Lead</label>
              <select className="input mt-1" value={leadId} onChange={(e) => handleLeadChange(e.target.value)}>
                <option value="">— Select lead —</option>
                {filteredLeads.map((l) => <option key={l.id} value={l.id}>{l.title}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Issue Date</label>
              <input className="input mt-1" type="date" value={issueDate} onChange={(e) => setIssueDate(e.target.value)} />
            </div>
            <div>
              <label className="label">Valid Until</label>
              <input className="input mt-1" type="date" value={validUntil} onChange={(e) => setValidUntil(e.target.value)} />
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
            {isEditing && (
              <div>
                <label className="label">Status</label>
                <select className="input mt-1" value={status} onChange={(e) => setStatus(e.target.value as typeof status)}>
                  {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
            )}
            {isEditing && status === 'rejected' && (
              <div className="col-span-2">
                <label className="label">Rejection Reason</label>
                <input className="input mt-1 w-full" value={rejectionReason} onChange={(e) => setRejectionReason(e.target.value)} placeholder="Why was it rejected?" />
              </div>
            )}
            {isEditing && (
              <div className="col-span-2">
                <label className="label">Document URL (PandaDoc / Google Drive)</label>
                <div className="flex gap-2 mt-1">
                  <input className="input flex-1" value={documentUrl} onChange={(e) => setDocumentUrl(e.target.value)} placeholder="https://…" />
                  {documentUrl && (
                    <a href={documentUrl} target="_blank" rel="noopener noreferrer" className="btn btn-secondary btn-md px-3">
                      <ExternalLink className="w-4 h-4" />
                    </a>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Line items */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300">Line Items</h3>
              <button type="button" onClick={addItem} className="btn btn-secondary btn-sm gap-1">
                <Plus className="w-3.5 h-3.5" /> Add Item
              </button>
            </div>

            <div className="space-y-2">
              {/* Column headers */}
              <div className="grid grid-cols-12 gap-2 text-xs font-medium text-gray-500 dark:text-gray-400 px-1">
                <div className="col-span-5">Description</div>
                <div className="col-span-2">Qty</div>
                <div className="col-span-2">Unit Price</div>
                <div className="col-span-2">Disc %</div>
                <div className="col-span-1 text-right">Total</div>
              </div>

              {items.map((item, idx) => (
                <div key={idx} className="grid grid-cols-12 gap-2 items-center">
                  <div className="col-span-5">
                    <input className="input text-sm" value={item.description} onChange={(e) => updateItem(idx, 'description', e.target.value)} placeholder="Description" />
                  </div>
                  <div className="col-span-2">
                    <input className="input text-sm" type="number" min="0" step="0.01" value={item.quantity} onChange={(e) => updateItem(idx, 'quantity', e.target.value)} />
                  </div>
                  <div className="col-span-2">
                    <input className="input text-sm" type="number" min="0" step="0.01" value={item.unitPrice} onChange={(e) => updateItem(idx, 'unitPrice', e.target.value)} placeholder="0.00" />
                  </div>
                  <div className="col-span-2">
                    <input className="input text-sm" type="number" min="0" max="100" step="0.1" value={item.discountPercent} onChange={(e) => updateItem(idx, 'discountPercent', e.target.value)} />
                  </div>
                  <div className="col-span-1 flex items-center justify-end gap-1">
                    <span className="text-sm font-medium text-gray-900 dark:text-white whitespace-nowrap">
                      {formatCurrency(lineTotal(item))}
                    </span>
                    {items.length > 1 && (
                      <button type="button" onClick={() => removeItem(idx)} className="p-0.5 text-gray-400 hover:text-danger-600 ml-1">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Totals */}
            <div className="mt-4 border-t border-gray-200 dark:border-gray-700 pt-3 space-y-1.5 text-sm">
              <div className="flex justify-between text-gray-600 dark:text-gray-400">
                <span>Subtotal</span>
                <span>{formatCurrency(subtotal)}</span>
              </div>
              <div className="flex items-center justify-between text-gray-600 dark:text-gray-400">
                <span>Discount</span>
                <div className="flex items-center gap-2">
                  <input className="input h-7 w-24 text-sm text-right" type="number" min="0" step="0.01" value={discountAmount} onChange={(e) => setDiscountAmount(e.target.value)} />
                </div>
              </div>
              <div className="flex items-center justify-between text-gray-600 dark:text-gray-400">
                <span>Tax (%)</span>
                <div className="flex items-center gap-2">
                  <input className="input h-7 w-24 text-sm text-right" type="number" min="0" max="100" step="0.1" value={taxRate} onChange={(e) => setTaxRate(e.target.value)} />
                </div>
              </div>
              <div className="flex justify-between font-semibold text-gray-900 dark:text-white pt-1 border-t border-gray-200 dark:border-gray-700">
                <span>Total</span>
                <span>{formatCurrency(grandTotal)}</span>
              </div>
            </div>
          </div>

          {/* Notes & Terms */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Notes</label>
              <textarea className="input mt-1 h-20 resize-none w-full" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Internal notes…" />
            </div>
            <div>
              <label className="label">Terms</label>
              <textarea className="input mt-1 h-20 resize-none w-full" value={terms} onChange={(e) => setTerms(e.target.value)} placeholder="Payment terms, conditions…" />
            </div>
          </div>
        </form>

        {/* Footer */}
        <div className="flex justify-end gap-3 p-4 border-t border-gray-200 dark:border-gray-700 shrink-0">
          <button type="button" onClick={onClose} className="btn btn-secondary btn-md">Cancel</button>
          <button type="button" onClick={handleSubmit} disabled={loading} className="btn btn-primary btn-md">
            {loading ? 'Saving…' : isEditing ? 'Save Changes' : 'Create Proposal'}
          </button>
        </div>
      </div>
    </div>
  );
}
