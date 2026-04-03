import { useState, useEffect } from 'react';
import { PieChart, Plus, Trash2, Save, Loader2, AlertCircle } from 'lucide-react';
import { api, getErrorMessage } from '../../../services/api';
import type { PnlCenterWithStats, PnlDistributionDefault } from '@finance/shared';

interface AllocationInput {
  pnlCenterId: string;
  percentage: number;
}

export default function PnlDefaultsSettings() {
  const [pnlCenters, setPnlCenters] = useState<PnlCenterWithStats[]>([]);
  const [allocations, setAllocations] = useState<AllocationInput[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [centersRes, defaultsRes] = await Promise.all([
        api.get('/pnl-centers'),
        api.get('/pnl-centers/distribution-defaults'),
      ]);

      const centers = centersRes.data.data || [];
      const defaults: PnlDistributionDefault[] = defaultsRes.data.data || [];

      setPnlCenters(centers);

      if (defaults.length > 0) {
        setAllocations(
          defaults.map((d) => ({
            pnlCenterId: d.pnlCenterId,
            percentage: d.percentage,
          }))
        );
      } else if (centers.length > 0) {
        // If no defaults, initialize with empty allocation
        setAllocations([{ pnlCenterId: '', percentage: 100 }]);
      }
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

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
  const isValidTotal = Math.abs(totalPercentage - 100) < 0.01;

  async function handleSave() {
    setError(null);
    setSuccess(null);

    const validAllocations = allocations.filter((a) => a.pnlCenterId && a.percentage > 0);

    if (validAllocations.length === 0) {
      setError('At least one P&L center allocation is required');
      return;
    }

    if (!isValidTotal) {
      setError('Allocations must sum to 100%');
      return;
    }

    setSaving(true);
    try {
      await api.post('/pnl-centers/distribution-defaults', {
        allocations: validAllocations,
      });
      setSuccess('Default distribution saved successfully');
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  async function handleClear() {
    setSaving(true);
    setError(null);
    setSuccess(null);
    try {
      await api.post('/pnl-centers/distribution-defaults', {
        allocations: [],
      });
      setAllocations([{ pnlCenterId: '', percentage: 100 }]);
      setSuccess('Default distribution cleared');
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl space-y-6">
      <div className="card">
        <div className="card-header">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
            <PieChart className="w-5 h-5" />
            Default P&L Distribution
          </h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Set default percentages for distributing expenses across P&L centers. When creating
            expenses, you can quickly apply this distribution with one click.
          </p>
        </div>

        <div className="card-body space-y-4">
          {(error || success) && (
            <div
              className={`p-3 rounded-lg text-sm ${
                error
                  ? 'bg-danger-50 border border-danger-200 text-danger-700'
                  : 'bg-success-50 border border-success-200 text-success-700'
              }`}
            >
              {error || success}
            </div>
          )}

          {pnlCenters.length === 0 ? (
            <div className="text-center py-8 text-gray-500 dark:text-gray-400">
              <AlertCircle className="w-12 h-12 mx-auto mb-4 text-gray-300" />
              <p>No P&L centers found.</p>
              <a
                href="/pnl-centers"
                className="mt-4 inline-block text-primary-600 hover:text-primary-700"
              >
                Create P&L centers first
              </a>
            </div>
          ) : (
            <>
              {/* Allocation rows */}
              <div className="space-y-2">
                {allocations.map((alloc, index) => (
                  <div key={index} className="flex gap-2 items-center">
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
                    <div className="relative w-28">
                      <input
                        type="number"
                        value={alloc.percentage}
                        onChange={(e) => updateAllocation(index, 'percentage', e.target.value)}
                        className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 pr-8"
                        min="0"
                        max="100"
                        step="0.01"
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 dark:text-gray-400">
                        %
                      </span>
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

              {/* Total indicator */}
              <div className="flex items-center justify-between py-2 border-t dark:border-gray-700">
                <button
                  type="button"
                  onClick={addAllocation}
                  className="flex items-center gap-1 text-sm text-primary-600 hover:text-primary-700"
                >
                  <Plus className="w-4 h-4" />
                  Add P&L center
                </button>
                <span
                  className={`text-sm font-medium ${
                    isValidTotal ? 'text-green-600' : 'text-red-600'
                  }`}
                >
                  Total: {totalPercentage.toFixed(2)}%
                  {!isValidTotal && ' (must equal 100%)'}
                </span>
              </div>

              {/* Actions */}
              <div className="flex justify-end gap-3 pt-4 border-t dark:border-gray-700">
                <button
                  type="button"
                  onClick={handleClear}
                  className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                  disabled={saving}
                >
                  Clear defaults
                </button>
                <button
                  type="button"
                  onClick={handleSave}
                  className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors disabled:opacity-50 flex items-center gap-2"
                  disabled={saving || !isValidTotal}
                >
                  {saving ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4" />
                      Save defaults
                    </>
                  )}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
