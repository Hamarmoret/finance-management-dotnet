import { useState, useEffect } from 'react';
import { X, ChevronDown, ChevronUp, UserPlus, Trash2, Star } from 'lucide-react';
import { api, getErrorMessage } from '../../../services/api';
import type { Client, ContactPerson } from '@finance/shared';

interface ClientModalProps {
  client: Client | null;
  onClose: () => void;
  onSaved: () => void;
}

type ClientTab = 'details' | 'contacts' | 'attribution';

export function ClientModal({ client, onClose, onSaved }: ClientModalProps) {
  const isEditing = client !== null;

  // Core fields
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

  // Industry & Attribution
  const [industry, setIndustry] = useState(client?.industry ?? '');
  const [businessType, setBusinessType] = useState(client?.businessType ?? '');
  const [utmSource, setUtmSource] = useState(client?.utmSource ?? '');
  const [utmMedium, setUtmMedium] = useState(client?.utmMedium ?? '');
  const [utmCampaign, setUtmCampaign] = useState(client?.utmCampaign ?? '');

  const [showAddress, setShowAddress] = useState(false);
  const [activeTab, setActiveTab] = useState<ClientTab>('details');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Contacts (edit mode only)
  const [contacts, setContacts] = useState<ContactPerson[]>([]);
  const [contactsLoading, setContactsLoading] = useState(false);
  const [showContactForm, setShowContactForm] = useState(false);
  const [contactForm, setContactForm] = useState({
    name: '', email: '', phone: '', role: '', linkedinUrl: '', country: '', isPrimary: false, notes: '',
  });
  const [contactFormLoading, setContactFormLoading] = useState(false);

  useEffect(() => {
    if (client?.address || client?.city || client?.country) setShowAddress(true);
  }, [client]);

  useEffect(() => {
    if (isEditing && activeTab === 'contacts' && client) {
      setContactsLoading(true);
      api.get(`/clients/${client.id}/contacts`)
        .then((res) => setContacts(res.data.data ?? []))
        .catch(() => {})
        .finally(() => setContactsLoading(false));
    }
  }, [isEditing, activeTab, client]);

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
        industry: industry.trim() || null,
        businessType: businessType.trim() || null,
        utmSource: utmSource.trim() || null,
        utmMedium: utmMedium.trim() || null,
        utmCampaign: utmCampaign.trim() || null,
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

  const handleAddContact = async () => {
    if (!contactForm.name.trim() || !client) return;
    setContactFormLoading(true);
    try {
      const res = await api.post(`/clients/${client.id}/contacts`, {
        name: contactForm.name.trim(),
        email: contactForm.email.trim() || null,
        phone: contactForm.phone.trim() || null,
        role: contactForm.role.trim() || null,
        linkedinUrl: contactForm.linkedinUrl.trim() || null,
        country: contactForm.country.trim() || null,
        isPrimary: contactForm.isPrimary,
        notes: contactForm.notes.trim() || null,
      });
      setContacts([...contacts, res.data.data]);
      setShowContactForm(false);
      setContactForm({ name: '', email: '', phone: '', role: '', linkedinUrl: '', country: '', isPrimary: false, notes: '' });
    } catch {
      // ignore
    } finally {
      setContactFormLoading(false);
    }
  };

  const handleDeleteContact = async (id: string) => {
    await api.delete(`/contacts/${id}`);
    setContacts(contacts.filter((c) => c.id !== id));
  };

  const tabs: { key: ClientTab; label: string }[] = [
    { key: 'details', label: 'Details' },
    ...(isEditing ? [{ key: 'contacts' as ClientTab, label: 'Contacts' }] : []),
    { key: 'attribution', label: 'Industry & Attribution' },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div className="modal-box w-full max-w-2xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="modal-header sticky top-0 shrink-0">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            {isEditing ? 'Edit Client' : 'New Client'}
          </h2>
          <button onClick={onClose} className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab bar */}
        <div className="flex gap-1 px-6 pt-4 border-b border-gray-200 dark:border-gray-700 shrink-0">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              type="button"
              onClick={() => setActiveTab(tab.key)}
              className={`px-3 py-1.5 text-sm font-medium rounded-t-md transition-colors ${
                activeTab === tab.key
                  ? 'bg-white dark:bg-gray-800 text-primary-600 dark:text-primary-400 border border-b-0 border-gray-200 dark:border-gray-700'
                  : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab content */}
        <div className="flex-1 overflow-y-auto">
          {error && (
            <div className="mx-6 mt-4 bg-danger-50 dark:bg-danger-900/20 text-danger-700 dark:text-danger-400 text-sm px-3 py-2 rounded-md">
              {error}
            </div>
          )}

          {activeTab === 'details' && (
            <form onSubmit={handleSubmit} className="p-6 space-y-5">
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
          )}

          {activeTab === 'contacts' && isEditing && (
            <div className="p-6 space-y-4">
              <div className="flex items-center justify-between">
                <p className="text-sm text-gray-500 dark:text-gray-400">{contacts.length} contact{contacts.length !== 1 ? 's' : ''}</p>
                <button
                  type="button"
                  onClick={() => setShowContactForm(!showContactForm)}
                  className="btn btn-secondary btn-sm gap-1"
                >
                  <UserPlus className="w-3.5 h-3.5" /> Add Contact
                </button>
              </div>

              {showContactForm && (
                <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 space-y-3 bg-gray-50 dark:bg-gray-800/50">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="col-span-2 sm:col-span-1">
                      <label className="label">Name *</label>
                      <input className="input mt-1" value={contactForm.name} onChange={(e) => setContactForm({ ...contactForm, name: e.target.value })} placeholder="Full name" />
                    </div>
                    <div className="col-span-2 sm:col-span-1">
                      <label className="label">Role</label>
                      <input className="input mt-1" value={contactForm.role} onChange={(e) => setContactForm({ ...contactForm, role: e.target.value })} placeholder="CEO, CTO…" />
                    </div>
                    <div>
                      <label className="label">Email</label>
                      <input className="input mt-1" type="email" value={contactForm.email} onChange={(e) => setContactForm({ ...contactForm, email: e.target.value })} placeholder="email@company.com" />
                    </div>
                    <div>
                      <label className="label">Phone</label>
                      <input className="input mt-1" value={contactForm.phone} onChange={(e) => setContactForm({ ...contactForm, phone: e.target.value })} placeholder="+1 555 0100" />
                    </div>
                    <div>
                      <label className="label">LinkedIn</label>
                      <input className="input mt-1" value={contactForm.linkedinUrl} onChange={(e) => setContactForm({ ...contactForm, linkedinUrl: e.target.value })} placeholder="https://linkedin.com/in/…" />
                    </div>
                    <div>
                      <label className="label">Country</label>
                      <input className="input mt-1" value={contactForm.country} onChange={(e) => setContactForm({ ...contactForm, country: e.target.value })} placeholder="Country" />
                    </div>
                    <div className="col-span-2 flex items-center gap-2">
                      <input
                        type="checkbox"
                        id="isPrimary"
                        checked={contactForm.isPrimary}
                        onChange={(e) => setContactForm({ ...contactForm, isPrimary: e.target.checked })}
                        className="w-4 h-4 accent-primary-600"
                      />
                      <label htmlFor="isPrimary" className="text-sm text-gray-700 dark:text-gray-300">Primary contact</label>
                    </div>
                  </div>
                  <div className="flex justify-end gap-2">
                    <button type="button" onClick={() => setShowContactForm(false)} className="btn btn-secondary btn-sm">Cancel</button>
                    <button type="button" onClick={handleAddContact} disabled={contactFormLoading} className="btn btn-primary btn-sm">
                      {contactFormLoading ? 'Saving…' : 'Add'}
                    </button>
                  </div>
                </div>
              )}

              {contactsLoading ? (
                <div className="text-sm text-gray-400 py-4 text-center">Loading contacts…</div>
              ) : contacts.length === 0 ? (
                <div className="text-sm text-gray-400 py-8 text-center">No contacts yet</div>
              ) : (
                <div className="space-y-2">
                  {contacts.map((c) => (
                    <div key={c.id} className="flex items-start gap-3 p-3 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="text-sm font-medium text-gray-900 dark:text-white">{c.name}</span>
                          {c.isPrimary && <Star className="w-3 h-3 text-amber-400 fill-amber-400" />}
                        </div>
                        {c.role && <div className="text-xs text-gray-500 dark:text-gray-400">{c.role}</div>}
                        <div className="flex gap-3 mt-1 text-xs text-gray-400 dark:text-gray-500">
                          {c.email && <span>{c.email}</span>}
                          {c.phone && <span>{c.phone}</span>}
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleDeleteContact(c.id)}
                        className="p-1 text-gray-400 hover:text-danger-600 shrink-0"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === 'attribution' && (
            <div className="p-6 space-y-5">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label">Industry</label>
                  <input className="input mt-1" value={industry} onChange={(e) => setIndustry(e.target.value)} placeholder="e.g. Technology, Finance…" />
                </div>
                <div>
                  <label className="label">Business Type</label>
                  <select className="input mt-1" value={businessType} onChange={(e) => setBusinessType(e.target.value)}>
                    <option value="">— Select —</option>
                    <option value="b2b">B2B</option>
                    <option value="b2c">B2C</option>
                    <option value="b2g">B2G</option>
                    <option value="other">Other</option>
                  </select>
                </div>
                <div className="col-span-2 border-t border-gray-100 dark:border-gray-700 pt-4">
                  <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-3 uppercase tracking-wide">UTM Attribution</p>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="label">UTM Source</label>
                      <input className="input mt-1" value={utmSource} onChange={(e) => setUtmSource(e.target.value)} placeholder="e.g. linkedin" />
                    </div>
                    <div>
                      <label className="label">UTM Medium</label>
                      <input className="input mt-1" value={utmMedium} onChange={(e) => setUtmMedium(e.target.value)} placeholder="e.g. cpc" />
                    </div>
                    <div className="col-span-2">
                      <label className="label">UTM Campaign</label>
                      <input className="input mt-1" value={utmCampaign} onChange={(e) => setUtmCampaign(e.target.value)} placeholder="e.g. q1-outreach-2025" />
                    </div>
                  </div>
                </div>
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={onClose} className="btn btn-secondary btn-md">Cancel</button>
                <button type="button" onClick={handleSubmit} disabled={loading} className="btn btn-primary btn-md">
                  {loading ? 'Saving…' : isEditing ? 'Save Changes' : 'Create Client'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
