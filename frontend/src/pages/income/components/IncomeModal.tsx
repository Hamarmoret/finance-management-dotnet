import { useState, useEffect } from 'react';
import { X, Plus, Trash2, Sparkles } from 'lucide-react';
import { api, getErrorMessage } from '../../../services/api';
import type { Income, IncomeCategory, PnlCenterWithStats, InvoiceStatus, InvoiceType, RecurringPattern, Attachment, PnlDistributionDefault } from '@finance/shared';
import { RecurringToggle } from '../../../components/RecurringToggle';
import { FileUpload } from '../../../components/FileUpload';

interface IncomeModalProps {
  income: Income | null;
  categories: IncomeCategory[];
  pnlCenters: PnlCenterWithStats[];
  onClose: () => void;
  onSaved: () => void;
}

interface AllocationInput {
  pnlCenterId: string;
  percentage: number;
}

export function IncomeModal({
  income,
  categories,
  pnlCenters,
  onClose,
  onSaved,
}: IncomeModalProps) {
  const [description, setDescription] = useState(income?.description || '');
  const [amount, setAmount] = useState(income?.amount.toString() || '');
  const [incomeDate, setIncomeDate] = useState(
    income?.incomeDate || new Date().toISOString().split('T')[0]
  );
  const [categoryId, setCategoryId] = useState(income?.categoryId || '');
  const [currency, setCurrency] = useState(income?.currency || 'ILS');
  const [clientName, setClientName] = useState(income?.clientName || '');
  const [invoiceNumber, setInvoiceNumber] = useState(income?.invoiceNumber || '');
  const [invoiceType, setInvoiceType] = useState<InvoiceType | ''>(
    income?.invoiceType || ''
  );
  const [invoiceStatus, setInvoiceStatus] = useState<InvoiceStatus | ''>(
    income?.invoiceStatus || ''
  );
  const [paymentDueDate, setPaymentDueDate] = useState(income?.paymentDueDate || '');
  const [paymentReceivedDate, setPaymentReceivedDate] = useState(income?.paymentReceivedDate || '');
  const [proformaInvoiceDate, setProformaInvoiceDate] = useState(income?.proformaInvoiceDate || '');
  const [taxInvoiceDate, setTaxInvoiceDate] = useState(income?.taxInvoiceDate || '');
  const [notes, setNotes] = useState(income?.notes || '');
  const [isRecurring, setIsRecurring] = useState(income?.isRecurring || false);
  const [recurringPattern, setRecurringPattern] = useState<RecurringPattern | null>(
    income?.recurringPattern || null
  );
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [allocations, setAllocations] = useState<AllocationInput[]>(
    income?.allocations.map((a) => ({
      pnlCenterId: a.pnlCenterId,
      percentage: a.percentage,
    })) || [{ pnlCenterId: '', percentage: 100 }]
  );

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [distributionDefaults, setDistributionDefaults] = useState<PnlDistributionDefault[]>([]);

  const isEditing = !!income;

  // Fetch distribution defaults on mount
  useEffect(() => {
    async function fetchDefaults() {
      try {
        const res = await api.get('/pnl-centers/distribution-defaults');
        setDistributionDefaults(res.data.data || []);
      } catch {
        // Silently fail - defaults are optional
      }
    }
    fetchDefaults();
  }, []);

  function applyDefaultDistribution() {
    if (distributionDefaults.length === 0) return;

    // Apply defaults to allocations
    const newAllocations = distributionDefaults.map((d) => ({
      pnlCenterId: d.pnlCenterId,
      percentage: d.percentage,
    }));
    setAllocations(newAllocations);
  }

  function addAllocation() {
    setAllocations([...allocations, { pnlCenterId: '', percentage: 0 }]);
  }

  function removeAllocation(index: number) {
    setAllocations(allocations.filter((_, i) => i !== index));
  }

  function updateAllocation(index: number, field: keyof AllocationInput, value: string | number) {
    const updated = [...allocations];
    if (field === 'percentage') {
      updated[index] = { ...updated[index]!, percentage: Number(value) };
    } else {
      updated[index] = { ...updated[index]!, pnlCenterId: value as string };
    }
    setAllocations(updated);
  }

  const totalPercentage = allocations.reduce((sum, a) => sum + a.percentage, 0);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!description.trim()) {
      setError('Description is required');
      return;
    }

    if (!amount || parseFloat(amount) <= 0) {
      setError('Amount must be greater than 0');
      return;
    }

    const validAllocations = allocations.filter((a) => a.pnlCenterId && a.percentage > 0);
    if (validAllocations.length === 0) {
      setError('At least one P&L center allocation is required');
      return;
    }

    const allocTotal = validAllocations.reduce((sum, a) => sum + a.percentage, 0);
    if (Math.abs(allocTotal - 100) > 0.01) {
      setError('Allocations must sum to 100%');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const data = {
        description: description.trim(),
        amount: parseFloat(amount),
        currency,
        incomeDate,
        categoryId: categoryId || null,
        clientName: clientName.trim() || null,
        invoiceNumber: invoiceNumber.trim() || null,
        invoiceType: invoiceType || null,
        invoiceStatus: invoiceStatus || null,
        paymentDueDate: paymentDueDate || null,
        paymentReceivedDate: paymentReceivedDate || null,
        proformaInvoiceDate: proformaInvoiceDate || null,
        taxInvoiceDate: taxInvoiceDate || null,
        notes: notes.trim() || null,
        isRecurring,
        recurringPattern: isRecurring ? recurringPattern : null,
        allocations: validAllocations,
      };

      if (isEditing) {
        await api.patch(`/income/${income.id}`, data);
      } else {
        await api.post('/income', data);
      }

      onSaved();
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-xl">
        <div className="sticky top-0 bg-white flex items-center justify-between p-4 border-b z-10">
          <h2 className="text-lg font-semibold text-gray-900">
            {isEditing ? 'Edit Income' : 'New Income'}
          </h2>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
              {error}
            </div>
          )}

          {/* Basic Info */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Description <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                placeholder="What is this income for?"
                maxLength={500}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Amount <span className="text-red-500">*</span>
              </label>
              <div className="flex gap-2">
                <select
                  value={currency}
                  onChange={(e) => setCurrency(e.target.value)}
                  className="w-24 px-2 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 bg-gray-50 text-sm"
                >
                  <option value="ILS">₪ ILS</option>
                  <option value="USD">$ USD</option>
                  <option value="EUR">€ EUR</option>
                  <option value="GBP">£ GBP</option>
                </select>
                <input
                  type="number"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="flex-1 px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  placeholder="0.00"
                  min="0"
                  step="0.01"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Date <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                value={incomeDate}
                onChange={(e) => setIncomeDate(e.target.value)}
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
              <select
                value={categoryId}
                onChange={(e) => setCategoryId(e.target.value)}
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              >
                <option value="">Select category</option>
                {categories.map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Client Name</label>
              <input
                type="text"
                value={clientName}
                onChange={(e) => setClientName(e.target.value)}
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                placeholder="Client name"
                maxLength={255}
              />
            </div>
          </div>

          {/* Invoice Details */}
          <div className="border-t pt-4">
            <h3 className="text-sm font-medium text-gray-900 mb-3">Invoice Details</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Invoice Number
                </label>
                <input
                  type="text"
                  value={invoiceNumber}
                  onChange={(e) => setInvoiceNumber(e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  placeholder="INV-001"
                  maxLength={100}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Invoice Type</label>
                <select
                  value={invoiceType}
                  onChange={(e) => setInvoiceType(e.target.value as InvoiceType | '')}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                >
                  <option value="">Select type</option>
                  <option value="standard">Standard Invoice</option>
                  <option value="proforma">Proforma Invoice</option>
                  <option value="tax">Tax Invoice</option>
                  <option value="credit_note">Credit Note</option>
                  <option value="receipt">Receipt</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                <select
                  value={invoiceStatus}
                  onChange={(e) => setInvoiceStatus(e.target.value as InvoiceStatus | '')}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                >
                  <option value="">No status</option>
                  <option value="draft">Draft</option>
                  <option value="sent">Sent</option>
                  <option value="paid">Paid</option>
                  <option value="overdue">Overdue</option>
                  <option value="cancelled">Cancelled</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Payment Due Date
                </label>
                <input
                  type="date"
                  value={paymentDueDate}
                  onChange={(e) => setPaymentDueDate(e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Payment Received Date
                </label>
                <input
                  type="date"
                  value={paymentReceivedDate}
                  onChange={(e) => setPaymentReceivedDate(e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Proforma Invoice Date
                </label>
                <input
                  type="date"
                  value={proformaInvoiceDate}
                  onChange={(e) => setProformaInvoiceDate(e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Tax Invoice Date
                </label>
                <input
                  type="date"
                  value={taxInvoiceDate}
                  onChange={(e) => setTaxInvoiceDate(e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                />
              </div>
            </div>
          </div>

          {/* P&L Allocations */}
          <div className="border-t pt-4">
            <div className="flex items-center justify-between mb-2">
              <label className="block text-sm font-medium text-gray-700">
                P&L Center Allocations <span className="text-red-500">*</span>
              </label>
              <span
                className={`text-sm ${
                  Math.abs(totalPercentage - 100) < 0.01 ? 'text-green-600' : 'text-red-600'
                }`}
              >
                Total: {totalPercentage}%
              </span>
            </div>

            <div className="space-y-2">
              {allocations.map((alloc, index) => (
                <div key={index} className="flex gap-2">
                  <select
                    value={alloc.pnlCenterId}
                    onChange={(e) => updateAllocation(index, 'pnlCenterId', e.target.value)}
                    className="flex-1 px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  >
                    <option value="">Select P&L Center</option>
                    {pnlCenters.map((center) => (
                      <option key={center.id} value={center.id}>
                        {center.name}
                      </option>
                    ))}
                  </select>
                  <div className="relative w-24">
                    <input
                      type="number"
                      value={alloc.percentage}
                      onChange={(e) => updateAllocation(index, 'percentage', e.target.value)}
                      className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                      min="0"
                      max="100"
                      step="0.01"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500">%</span>
                  </div>
                  {allocations.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeAllocation(index)}
                      className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              ))}
            </div>

            <div className="mt-2 flex items-center gap-4">
              <button
                type="button"
                onClick={addAllocation}
                className="flex items-center gap-1 text-sm text-primary-600 hover:text-primary-700"
              >
                <Plus className="w-4 h-4" />
                Add allocation
              </button>
              {distributionDefaults.length > 0 && (
                <button
                  type="button"
                  onClick={applyDefaultDistribution}
                  className="flex items-center gap-1 text-sm text-purple-600 hover:text-purple-700"
                  title="Apply your saved default P&L distribution"
                >
                  <Sparkles className="w-4 h-4" />
                  Apply default distribution
                </button>
              )}
            </div>
          </div>

          {/* Recurring */}
          <div className="border-t pt-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">Payment Type</label>
            <RecurringToggle
              isRecurring={isRecurring}
              pattern={recurringPattern}
              onChange={(recurring, pattern) => {
                setIsRecurring(recurring);
                setRecurringPattern(pattern);
              }}
            />
          </div>

          {/* Attachments */}
          <div>
            <FileUpload
              files={attachments.map((a) => ({
                id: a.url,
                name: a.name,
                url: a.url,
                mimeType: 'application/octet-stream',
                size: 0,
              }))}
              onChange={(files) =>
                setAttachments(files.map((f) => ({ name: f.name, url: f.url, type: f.mimeType, size: f.size })))
              }
              label="Attachments (invoices, proposals)"
              maxFiles={5}
            />
          </div>

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              placeholder="Additional notes..."
              maxLength={2000}
            />
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-4 border-t">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
              disabled={loading}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors disabled:opacity-50"
              disabled={loading}
            >
              {loading ? 'Saving...' : isEditing ? 'Save Changes' : 'Create Income'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
