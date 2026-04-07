import { useState, useEffect } from 'react';
import { X, Plus, Trash2, Sparkles } from 'lucide-react';
import { api, getErrorMessage } from '../../../services/api';
import type { Expense, ExpenseCategory, PnlCenterWithStats, RecurringPattern, Attachment, PnlDistributionDefault, Vendor } from '@finance/shared';
import { RecurringToggle } from '../../../components/RecurringToggle';
import { FileUpload } from '../../../components/FileUpload';
import { VendorAutocomplete } from '../../../components/VendorAutocomplete';
import { VendorModal } from '../../sales/components/VendorModal';

interface ExpenseModalProps {
  expense: Expense | null;
  categories: ExpenseCategory[];
  pnlCenters: PnlCenterWithStats[];
  onClose: () => void;
  onSaved: () => void;
}

interface AllocationInput {
  pnlCenterId: string;
  percentage: number;
}

export function ExpenseModal({
  expense,
  categories,
  pnlCenters,
  onClose,
  onSaved,
}: ExpenseModalProps) {
  const [description, setDescription] = useState(expense?.description || '');
  const [amount, setAmount] = useState(expense?.amount.toString() || '');
  const [expenseDate, setExpenseDate] = useState(
    expense?.expenseDate || new Date().toISOString().split('T')[0]
  );
  const [categoryId, setCategoryId] = useState(expense?.categoryId || '');
  const [currency, setCurrency] = useState(expense?.currency || 'ILS');
  const [vendorId, setVendorId] = useState(expense?.vendorId || '');
  const [vendorName, setVendorName] = useState(expense?.vendor || '');
  const [showCreateVendor, setShowCreateVendor] = useState(false);
  const [quickCreateVendorName, setQuickCreateVendorName] = useState('');
  const [vendorError, setVendorError] = useState('');
  const [notes, setNotes] = useState(expense?.notes || '');
  const [isRecurring, setIsRecurring] = useState(expense?.isRecurring || false);
  const [recurringPattern, setRecurringPattern] = useState<RecurringPattern | null>(
    expense?.recurringPattern || null
  );
  const [attachments, setAttachments] = useState<Attachment[]>(
    expense?.attachments || []
  );
  const [allocations, setAllocations] = useState<AllocationInput[]>(
    expense?.allocations.map((a) => ({
      pnlCenterId: a.pnlCenterId,
      percentage: a.percentage,
    })) || [{ pnlCenterId: '', percentage: 100 }]
  );

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [distributionDefaults, setDistributionDefaults] = useState<PnlDistributionDefault[]>([]);

  const isEditing = !!expense?.id;

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

    if (!vendorId) {
      setVendorError('Payee / Vendor is required');
      return;
    }
    setVendorError('');

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
        expenseDate,
        categoryId: categoryId || null,
        vendorId: vendorId || null,
        vendor: vendorName.trim() || null,
        notes: notes.trim() || null,
        isRecurring,
        recurringPattern: isRecurring ? recurringPattern : null,
        attachments: attachments.map((a) => ({ name: a.name, url: a.url, type: a.type || 'application/octet-stream', size: a.size || 0 })),
        allocations: validAllocations,
      };

      if (isEditing) {
        await api.patch(`/expenses/${expense.id}`, data);
      } else {
        await api.post('/expenses', data);
      }

      onSaved();
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="modal-box w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="modal-header sticky top-0 z-10 bg-white dark:bg-gray-800">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            {isEditing ? 'Edit Expense' : 'New Expense'}
          </h2>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
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
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Description <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                placeholder="What was this expense for?"
                maxLength={500}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Amount <span className="text-red-500">*</span>
              </label>
              <div className="flex gap-2">
                <select
                  value={currency}
                  onChange={(e) => setCurrency(e.target.value)}
                  className="w-24 px-2 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 bg-gray-50 dark:bg-gray-700 text-sm"
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
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Date <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                value={expenseDate}
                onChange={(e) => setExpenseDate(e.target.value)}
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Category</label>
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
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Payee / Vendor <span className="text-red-500">*</span>
              </label>
              <VendorAutocomplete
                vendorId={vendorId}
                vendorName={vendorName}
                onSelect={(id, name) => { setVendorId(id); setVendorName(name); setVendorError(''); }}
                onCreateNew={(name) => { setQuickCreateVendorName(name); setShowCreateVendor(true); }}
                placeholder="Search or type payee name"
                error={vendorError}
              />
            </div>
          </div>

          {/* P&L Allocations */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                P&L Center Allocations <span className="text-red-500">*</span>
              </label>
              {pnlCenters.length === 0 && (
                <a
                  href="/pnl-centers"
                  className="text-xs text-primary-600 hover:text-primary-700 underline"
                >
                  Create P&L Center first
                </a>
              )}
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
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 dark:text-gray-400">%</span>
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
          <div>
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
              label="Attachments (receipts, invoices)"
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
          <div className="flex justify-end gap-3 pt-4 border-t dark:border-gray-700">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
              disabled={loading}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors disabled:opacity-50"
              disabled={loading}
            >
              {loading ? 'Saving...' : isEditing ? 'Save Changes' : 'Create Expense'}
            </button>
          </div>
        </form>
      </div>
    </div>

    {showCreateVendor && (
      <VendorModal
        vendor={null}
        initialName={quickCreateVendorName}
        onClose={() => setShowCreateVendor(false)}
        onSaved={(v: Vendor) => {
          setVendorId(v.id);
          setVendorName(v.name);
          setVendorError('');
          setShowCreateVendor(false);
        }}
      />
    )}
    </>
  );
}
