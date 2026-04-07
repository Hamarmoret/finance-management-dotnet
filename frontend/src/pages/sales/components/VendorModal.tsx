import { useState } from 'react';
import { X } from 'lucide-react';
import { api, getErrorMessage } from '../../../services/api';
import type { Vendor, PayeeType, VendorStatus } from '@finance/shared';

interface VendorModalProps {
  vendor: Vendor | null;
  initialName?: string;
  onClose: () => void;
  onSaved: (vendor: Vendor) => void;
}

export function VendorModal({ vendor, initialName, onClose, onSaved }: VendorModalProps) {
  const isEditing = vendor !== null;

  const [name, setName] = useState(vendor?.name ?? initialName ?? '');
  const [payeeType, setPayeeType] = useState(vendor?.payeeType ?? 'vendor');
  const [email, setEmail] = useState(vendor?.email ?? '');
  const [phone, setPhone] = useState(vendor?.phone ?? '');
  const [address, setAddress] = useState(vendor?.address ?? '');
  const [city, setCity] = useState(vendor?.city ?? '');
  const [country, setCountry] = useState(vendor?.country ?? '');
  const [taxId, setTaxId] = useState(vendor?.taxId ?? '');
  const [notes, setNotes] = useState(vendor?.notes ?? '');
  const [status, setStatus] = useState(vendor?.status ?? 'active');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [nameError, setNameError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setNameError('');
    if (!name.trim()) { setNameError('Name is required'); return; }

    setLoading(true);
    setError(null);
    try {
      const payload = {
        name: name.trim(),
        payeeType,
        email: email.trim() || null,
        phone: phone.trim() || null,
        address: address.trim() || null,
        city: city.trim() || null,
        country: country.trim() || null,
        taxId: taxId.trim() || null,
        notes: notes.trim() || null,
        ...(isEditing ? { status } : {}),
      };

      const res = isEditing
        ? await api.put(`/vendors/${vendor.id}`, payload)
        : await api.post('/vendors', payload);

      onSaved(res.data.data as Vendor);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white dark:bg-gray-900 rounded-xl shadow-2xl w-full max-w-lg mx-4 max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            {isEditing ? 'Edit Payee' : 'New Payee'}
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
          {error && (
            <div className="p-3 rounded-lg bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 text-sm">
              {error}
            </div>
          )}

          {/* Name + Type row */}
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2 sm:col-span-1">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Name <span className="text-red-500">*</span>
              </label>
              <input
                className={`input w-full ${nameError ? 'border-red-500' : ''}`}
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="e.g. AWS, John Smith"
                autoFocus={!isEditing}
              />
              {nameError && <p className="mt-1 text-xs text-red-500">{nameError}</p>}
            </div>

            <div className="col-span-2 sm:col-span-1">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Type</label>
              <select
                className="input w-full"
                value={payeeType}
                onChange={e => setPayeeType(e.target.value as PayeeType)}
              >
                <option value="vendor">Vendor</option>
                <option value="employee">Employee</option>
                <option value="other">Other</option>
              </select>
            </div>
          </div>

          {/* Contact */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Email</label>
              <input className="input w-full" type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="email@example.com" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Phone</label>
              <input
                className="input w-full"
                type="tel"
                value={phone}
                onChange={e => setPhone(e.target.value.replace(/[^\d+\s\-().]/g, ''))}
                placeholder="+1 555 000 0000"
              />
            </div>
          </div>

          {/* Location */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">City</label>
              <input className="input w-full" value={city} onChange={e => setCity(e.target.value)} placeholder="City" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Country</label>
              <input className="input w-full" value={country} onChange={e => setCountry(e.target.value)} placeholder="Country" />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Address</label>
            <input className="input w-full" value={address} onChange={e => setAddress(e.target.value)} placeholder="Street address" />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Tax ID</label>
            <input className="input w-full" value={taxId} onChange={e => setTaxId(e.target.value)} placeholder="VAT / Tax registration number" />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Notes</label>
            <textarea className="input w-full" rows={3} value={notes} onChange={e => setNotes(e.target.value)} placeholder="Internal notes..." />
          </div>

          {isEditing && (
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Status</label>
              <select className="input w-full" value={status} onChange={e => setStatus(e.target.value as VendorStatus)}>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </div>
          )}
        </form>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700 flex justify-end gap-3">
          <button type="button" onClick={onClose} className="btn btn-secondary">Cancel</button>
          <button onClick={handleSubmit} disabled={loading} className="btn btn-primary">
            {loading ? 'Saving...' : isEditing ? 'Save Changes' : 'Create Payee'}
          </button>
        </div>
      </div>
    </div>
  );
}
