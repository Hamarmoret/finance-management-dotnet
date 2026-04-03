import { useState, useEffect } from 'react';
import { X, ChevronDown, ChevronUp } from 'lucide-react';
import { api, getErrorMessage } from '../../../services/api';
import type { Client } from '@finance/shared';

interface ClientModalProps {
  client: Client | null;
  onClose: () => void;
  onSaved: () => void;
}

export function ClientModal({ client, onClose, onSaved }: ClientModalProps) {
  const isEditing = client !== null;

  const [name, setName] = useState(client?.name ?? '');
  const [companyName, setCompanyName] = useState(client?.companyName ?? '');
  const [email, setEmail] = useState(client?.email ?? '');
  const [phone, setPhone] = useState(client?.phone ?? '');
  const [address, setAddress] = useState(client?.address ?? '');
  const [city, setCity] = useState(client?.city ?? '');
  const [state, setState] = useState(client?.state ?? '');
  const [postalCode, setPostalCode] = useState(client?.postalCode ?? '');
  const [country, setCountry] = useState(client?.country ?? '');
  const [website, setWebsite] = useState(client?.website ?? '');
  const [taxId, setTaxId] = useState(client?.taxId ?? '');
  const [paymentTerms, setPaymentTerms] = useState(client?.paymentTerms?.toString() ?? '30');
  const [defaultCurrency, setDefaultCurrency] = useState(client?.defaultCurrency ?? 'USD');
  const [status, setStatus] = useState(client?.status ?? 'active');
  const [notes, setNotes] = useState(client?.notes ?? '');
  const [tagInput, setTagInput] = useState('');
  const [tags, setTags] = useState<string[]>(client?.tags ?? []);
  const [showAddress, setShowAddress] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Open address section if any address field is pre-filled
  useEffect(() => {
    if (client?.address || client?.city || client?.country) setShowAddress(true);
  }, [client]);

  const addTag = () => {
    const t = tagInput.trim().toLowerCase();
    if (t && !tags.includes(t)) setTags([...tags, t]);
    setTagInput('');
  };

  const removeTag = (tag: string) => setTags(tags.filter((t) => t !== tag));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const body = {
        name: name.trim(),
        companyName: companyName.trim() || null,
        email: email.trim() || null,
        phone: phone.trim() || null,
        address: address.trim() || null,
        city: city.trim() || null,
        state: state.trim() || null,
        postalCode: postalCode.trim() || null,
        country: country.trim() || null,
        website: website.trim() || null,
        taxId: taxId.trim() || null,
        paymentTerms: parseInt(paymentTerms) || 30,
        defaultCurrency,
        notes: notes.trim() || null,
        tags,
        ...(isEditing ? { status } : {}),
      };

      if (isEditing) {
        await api.put(`/clients/${client.id}`, body);
      } else {
        await api.post('/clients', body);
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
      <div className="modal-box w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="modal-header sticky top-0">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            {isEditing ? 'Edit Client' : 'New Client'}
          </h2>
          <button onClick={onClose} className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {error && (
            <div className="bg-danger-50 dark:bg-danger-900/20 text-danger-700 dark:text-danger-400 text-sm px-3 py-2 rounded-md">
              {error}
            </div>
          )}

          {/* Core fields */}
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2 sm:col-span-1">
              <label className="label">Name *</label>
              <input className="input mt-1" value={name} onChange={(e) => setName(e.target.value)} placeholder="Contact name" required />
            </div>
            <div className="col-span-2 sm:col-span-1">
              <label className="label">Company Name</label>
              <input className="input mt-1" value={companyName} onChange={(e) => setCompanyName(e.target.value)} placeholder="Company" />
            </div>
            <div className="col-span-2 sm:col-span-1">
              <label className="label">Email</label>
              <input className="input mt-1" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="email@company.com" />
            </div>
            <div className="col-span-2 sm:col-span-1">
              <label className="label">Phone</label>
              <input className="input mt-1" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+1 555 0100" />
            </div>
            <div className="col-span-2 sm:col-span-1">
              <label className="label">Default Currency</label>
              <select className="input mt-1" value={defaultCurrency} onChange={(e) => setDefaultCurrency(e.target.value)}>
                <option value="USD">USD</option>
                <option value="EUR">EUR</option>
                <option value="ILS">ILS</option>
                <option value="GBP">GBP</option>
              </select>
            </div>
            <div className="col-span-2 sm:col-span-1">
              <label className="label">Payment Terms (days)</label>
              <input className="input mt-1" type="number" min="0" value={paymentTerms} onChange={(e) => setPaymentTerms(e.target.value)} placeholder="30" />
            </div>
            <div className="col-span-2 sm:col-span-1">
              <label className="label">Tax ID</label>
              <input className="input mt-1" value={taxId} onChange={(e) => setTaxId(e.target.value)} placeholder="VAT / Company number" />
            </div>
            <div className="col-span-2 sm:col-span-1">
              <label className="label">Website</label>
              <input className="input mt-1" value={website} onChange={(e) => setWebsite(e.target.value)} placeholder="https://company.com" />
            </div>
            {isEditing && (
              <div className="col-span-2 sm:col-span-1">
                <label className="label">Status</label>
                <select className="input mt-1" value={status} onChange={(e) => setStatus(e.target.value as 'active' | 'inactive' | 'archived')}>
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                  <option value="archived">Archived</option>
                </select>
              </div>
            )}
          </div>

          {/* Address — collapsible */}
          <div>
            <button
              type="button"
              onClick={() => setShowAddress(!showAddress)}
              className="flex items-center gap-1 text-sm font-medium text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200"
            >
              {showAddress ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              Address
            </button>
            {showAddress && (
              <div className="mt-3 grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="label">Street Address</label>
                  <input className="input mt-1" value={address} onChange={(e) => setAddress(e.target.value)} placeholder="123 Main St" />
                </div>
                <div>
                  <label className="label">City</label>
                  <input className="input mt-1" value={city} onChange={(e) => setCity(e.target.value)} placeholder="City" />
                </div>
                <div>
                  <label className="label">State / Region</label>
                  <input className="input mt-1" value={state} onChange={(e) => setState(e.target.value)} placeholder="State" />
                </div>
                <div>
                  <label className="label">Postal Code</label>
                  <input className="input mt-1" value={postalCode} onChange={(e) => setPostalCode(e.target.value)} placeholder="ZIP" />
                </div>
                <div>
                  <label className="label">Country</label>
                  <input className="input mt-1" value={country} onChange={(e) => setCountry(e.target.value)} placeholder="Country" />
                </div>
              </div>
            )}
          </div>

          {/* Notes */}
          <div>
            <label className="label">Notes</label>
            <textarea className="input mt-1 h-20 resize-none" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Additional notes..." />
          </div>

          {/* Tags */}
          <div>
            <label className="label">Tags</label>
            <div className="flex gap-2 mt-1">
              <input
                className="input flex-1"
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addTag(); } }}
                placeholder="Type and press Enter"
              />
              <button type="button" onClick={addTag} className="btn btn-secondary btn-md px-3">Add</button>
            </div>
            {tags.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-2">
                {tags.map((tag) => (
                  <span key={tag} className="inline-flex items-center gap-1 px-2 py-0.5 bg-primary-50 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300 text-xs rounded-full">
                    {tag}
                    <button type="button" onClick={() => removeTag(tag)} className="hover:text-primary-900">×</button>
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={onClose} className="btn btn-secondary btn-md">Cancel</button>
            <button type="submit" disabled={loading} className="btn btn-primary btn-md">
              {loading ? 'Saving…' : isEditing ? 'Save Changes' : 'Create Client'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
