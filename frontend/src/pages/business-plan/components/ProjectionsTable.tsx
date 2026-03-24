import { useState } from 'react';
import { Save, Plus, Calendar, AlertCircle } from 'lucide-react';
import { api, getErrorMessage } from '../../../services/api';
import { formatCurrency, formatMonthYear } from '../../../utils/formatters';
import type { PlanProjection, PlanActualsComparison } from '@finance/shared';

interface ProjectionsTableProps {
  planId: string;
  projections: PlanProjection[];
  actualsComparison: PlanActualsComparison[];
  onUpdate: () => void;
}

interface EditableProjection {
  periodType: 'monthly' | 'quarterly';
  periodStart: string;
  periodEnd: string;
  projectedRevenue: number;
  projectedExpenses: number;
  projectedHeadcount: number | null;
  notes: string;
}

function formatPercent(value: number): string {
  const sign = value >= 0 ? '+' : '';
  return `${sign}${value.toFixed(1)}%`;
}

export function ProjectionsTable({
  planId,
  projections,
  actualsComparison,
  onUpdate,
}: ProjectionsTableProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editableProjections, setEditableProjections] = useState<EditableProjection[]>([]);

  const handleStartEdit = () => {
    setEditableProjections(
      projections.map((p) => ({
        periodType: p.periodType,
        periodStart: p.periodStart,
        periodEnd: p.periodEnd,
        projectedRevenue: p.projectedRevenue,
        projectedExpenses: p.projectedExpenses,
        projectedHeadcount: p.projectedHeadcount,
        notes: p.notes || '',
      }))
    );
    setIsEditing(true);
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    setEditableProjections([]);
    setError(null);
  };

  const handleSave = async () => {
    if (editableProjections.length === 0) {
      setError('Add at least one projection period');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      await api.put(`/business-plans/${planId}/projections`, {
        projections: editableProjections,
      });
      setIsEditing(false);
      onUpdate();
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateProjection = (
    index: number,
    field: keyof EditableProjection,
    value: string | number | null
  ) => {
    setEditableProjections((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index]!, [field]: value };
      return updated;
    });
  };

  const handleAddMonth = () => {
    const lastProjection = editableProjections[editableProjections.length - 1];
    let nextStart: Date;

    if (lastProjection) {
      nextStart = new Date(lastProjection.periodEnd);
      nextStart.setDate(nextStart.getDate() + 1);
    } else {
      // Start from current month
      nextStart = new Date();
      nextStart.setDate(1);
    }

    const nextEnd = new Date(nextStart);
    nextEnd.setMonth(nextEnd.getMonth() + 1);
    nextEnd.setDate(0); // Last day of month

    setEditableProjections((prev) => [
      ...prev,
      {
        periodType: 'monthly',
        periodStart: nextStart.toISOString().split('T')[0]!,
        periodEnd: nextEnd.toISOString().split('T')[0]!,
        projectedRevenue: 0,
        projectedExpenses: 0,
        projectedHeadcount: null,
        notes: '',
      },
    ]);
  };

  const handleRemoveProjection = (index: number) => {
    setEditableProjections((prev) => prev.filter((_, i) => i !== index));
  };

  // Create a map for quick lookup of actuals
  const actualsMap = new Map(
    actualsComparison.map((a) => [a.periodStart, a])
  );

  const displayData = isEditing
    ? editableProjections.map((p) => {
        const actual = actualsMap.get(p.periodStart);
        return { projection: p, actual };
      })
    : projections.map((p) => {
        const actual = actualsMap.get(p.periodStart);
        return { projection: p, actual };
      });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
          <Calendar className="w-5 h-5 text-primary-600" />
          Financial Projections
        </h2>
        <div className="flex items-center gap-2">
          {isEditing ? (
            <>
              <button
                onClick={handleAddMonth}
                className="btn btn-secondary btn-sm flex items-center gap-1"
              >
                <Plus className="w-4 h-4" />
                Add Month
              </button>
              <button
                onClick={handleCancelEdit}
                className="btn btn-secondary btn-sm"
                disabled={loading}
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                className="btn btn-primary btn-sm flex items-center gap-1"
                disabled={loading}
              >
                <Save className="w-4 h-4" />
                {loading ? 'Saving...' : 'Save'}
              </button>
            </>
          ) : (
            <button onClick={handleStartEdit} className="btn btn-primary btn-sm">
              {projections.length > 0 ? 'Edit Projections' : 'Add Projections'}
            </button>
          )}
        </div>
      </div>

      {error && (
        <div className="bg-danger-50 text-danger-700 px-4 py-3 rounded-lg flex items-center gap-2 text-sm">
          <AlertCircle className="w-4 h-4" />
          {error}
        </div>
      )}

      {displayData.length === 0 ? (
        <div className="card card-body text-center py-12">
          <Calendar className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900">No Projections Yet</h3>
          <p className="text-gray-600 mt-2 mb-4">
            Add monthly or quarterly financial projections to track your targets.
          </p>
          <button
            onClick={() => {
              handleStartEdit();
              handleAddMonth();
            }}
            className="btn btn-primary btn-md mx-auto"
          >
            <Plus className="w-4 h-4 mr-2" />
            Add Projections
          </button>
        </div>
      ) : (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="text-left text-sm font-medium text-gray-500 px-6 py-3">
                    Period
                  </th>
                  <th className="text-right text-sm font-medium text-gray-500 px-6 py-3">
                    Projected Revenue
                  </th>
                  <th className="text-right text-sm font-medium text-gray-500 px-6 py-3">
                    Actual Revenue
                  </th>
                  <th className="text-right text-sm font-medium text-gray-500 px-6 py-3">
                    Variance
                  </th>
                  <th className="text-right text-sm font-medium text-gray-500 px-6 py-3">
                    Projected Expenses
                  </th>
                  <th className="text-right text-sm font-medium text-gray-500 px-6 py-3">
                    Actual Expenses
                  </th>
                  <th className="text-right text-sm font-medium text-gray-500 px-6 py-3">
                    Variance
                  </th>
                  {isEditing && (
                    <th className="text-center text-sm font-medium text-gray-500 px-6 py-3">
                      Actions
                    </th>
                  )}
                </tr>
              </thead>
              <tbody className="divide-y">
                {displayData.map((row, index) => (
                  <tr key={row.projection.periodStart} className="hover:bg-gray-50">
                    <td className="px-6 py-4 text-sm font-medium text-gray-900">
                      {formatMonthYear(row.projection.periodStart)}
                    </td>
                    <td className="px-6 py-4 text-sm text-right">
                      {isEditing ? (
                        <input
                          type="number"
                          value={(row.projection as EditableProjection).projectedRevenue}
                          onChange={(e) =>
                            handleUpdateProjection(
                              index,
                              'projectedRevenue',
                              parseFloat(e.target.value) || 0
                            )
                          }
                          className="w-28 px-2 py-1 text-right border rounded"
                          min={0}
                          step={100}
                        />
                      ) : (
                        <span className="font-medium text-gray-900">
                          {formatCurrency(row.projection.projectedRevenue)}
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-sm text-right text-gray-700">
                      {row.actual ? formatCurrency(row.actual.actual.revenue) : '-'}
                    </td>
                    <td className="px-6 py-4 text-sm text-right">
                      {row.actual ? (
                        <span
                          className={`font-medium ${
                            row.actual.variance.revenuePercent >= 0
                              ? 'text-success-600'
                              : 'text-danger-600'
                          }`}
                        >
                          {formatPercent(row.actual.variance.revenuePercent)}
                        </span>
                      ) : (
                        '-'
                      )}
                    </td>
                    <td className="px-6 py-4 text-sm text-right">
                      {isEditing ? (
                        <input
                          type="number"
                          value={(row.projection as EditableProjection).projectedExpenses}
                          onChange={(e) =>
                            handleUpdateProjection(
                              index,
                              'projectedExpenses',
                              parseFloat(e.target.value) || 0
                            )
                          }
                          className="w-28 px-2 py-1 text-right border rounded"
                          min={0}
                          step={100}
                        />
                      ) : (
                        <span className="font-medium text-gray-900">
                          {formatCurrency(row.projection.projectedExpenses)}
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-sm text-right text-gray-700">
                      {row.actual ? formatCurrency(row.actual.actual.expenses) : '-'}
                    </td>
                    <td className="px-6 py-4 text-sm text-right">
                      {row.actual ? (
                        <span
                          className={`font-medium ${
                            row.actual.variance.expensesPercent <= 0
                              ? 'text-success-600'
                              : 'text-danger-600'
                          }`}
                        >
                          {formatPercent(row.actual.variance.expensesPercent)}
                        </span>
                      ) : (
                        '-'
                      )}
                    </td>
                    {isEditing && (
                      <td className="px-6 py-4 text-center">
                        <button
                          onClick={() => handleRemoveProjection(index)}
                          className="text-danger-600 hover:text-danger-700 text-sm"
                        >
                          Remove
                        </button>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
              {/* Totals row */}
              {!isEditing && displayData.length > 0 && (
                <tfoot className="bg-gray-50 border-t-2">
                  <tr className="font-semibold">
                    <td className="px-6 py-4 text-sm text-gray-900">Total</td>
                    <td className="px-6 py-4 text-sm text-right text-gray-900">
                      {formatCurrency(
                        displayData.reduce(
                          (sum, row) => sum + row.projection.projectedRevenue,
                          0
                        )
                      )}
                    </td>
                    <td className="px-6 py-4 text-sm text-right text-gray-700">
                      {formatCurrency(
                        displayData.reduce(
                          (sum, row) => sum + (row.actual?.actual.revenue || 0),
                          0
                        )
                      )}
                    </td>
                    <td className="px-6 py-4"></td>
                    <td className="px-6 py-4 text-sm text-right text-gray-900">
                      {formatCurrency(
                        displayData.reduce(
                          (sum, row) => sum + row.projection.projectedExpenses,
                          0
                        )
                      )}
                    </td>
                    <td className="px-6 py-4 text-sm text-right text-gray-700">
                      {formatCurrency(
                        displayData.reduce(
                          (sum, row) => sum + (row.actual?.actual.expenses || 0),
                          0
                        )
                      )}
                    </td>
                    <td className="px-6 py-4"></td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
