import { useState } from 'react';
import { Plus, Trash2, Edit2 } from 'lucide-react';
import { PlanCostCategory, CostType } from '@finance/shared';

interface CostPlanningViewProps {
  categories: PlanCostCategory[];
  onAddCategory?: () => void;
  onEditCategory?: (category: PlanCostCategory) => void;
  onDeleteCategory?: (categoryId: string) => void;
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

function getCostTypeBadge(type: CostType): { label: string; className: string } {
  switch (type) {
    case 'fixed':
      return { label: 'Fixed', className: 'bg-blue-100 text-blue-700' };
    case 'variable':
      return { label: 'Variable', className: 'bg-purple-100 text-purple-700' };
    case 'step':
      return { label: 'Step', className: 'bg-amber-100 text-amber-700' };
    case 'cogs':
      return { label: 'COGS', className: 'bg-red-100 text-red-700' };
    default:
      return { label: type, className: 'bg-gray-100 text-gray-700' };
  }
}

function getCostDescription(category: PlanCostCategory): string {
  switch (category.costType) {
    case 'fixed':
      return category.fixedAmount ? formatCurrency(category.fixedAmount) + '/month' : 'Fixed amount';
    case 'variable':
    case 'cogs':
      return category.formula || 'Formula-based';
    case 'step':
      if (category.stepConfig) {
        return `1 ${category.stepConfig.role} per ${category.stepConfig.threshold} ${category.stepConfig.triggerDriver}`;
      }
      return 'Step function';
    default:
      return '';
  }
}

export function CostPlanningView({
  categories,
  onAddCategory,
  onEditCategory,
  onDeleteCategory,
}: CostPlanningViewProps) {
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  // Group by cost type and calculate totals
  const fixedCategories = categories.filter((c) => c.costType === 'fixed');
  const variableCategories = categories.filter((c) => c.costType === 'variable');
  const cogsCategories = categories.filter((c) => c.costType === 'cogs');
  const stepCategories = categories.filter((c) => c.costType === 'step');

  const totalFixed = fixedCategories.reduce((sum, c) => sum + (c.fixedAmount || 0), 0);

  const handleDelete = (categoryId: string) => {
    if (confirmDelete === categoryId) {
      onDeleteCategory?.(categoryId);
      setConfirmDelete(null);
    } else {
      setConfirmDelete(categoryId);
    }
  };

  if (categories.length === 0) {
    return (
      <div className="card card-body text-center py-12">
        <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
          💰
        </div>
        <h2 className="text-lg font-semibold text-gray-900">No Cost Categories</h2>
        <p className="text-gray-600 mt-2 mb-4">
          Define your cost structure including fixed, variable, and step costs.
        </p>
        {onAddCategory && (
          <button onClick={onAddCategory} className="btn btn-primary btn-md mx-auto">
            <Plus className="w-4 h-4 mr-2" />
            Add Cost Category
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Cost Structure</h2>
          <p className="text-sm text-gray-500">
            Define fixed, variable, and step-function costs.
          </p>
        </div>
        {onAddCategory && (
          <button onClick={onAddCategory} className="btn btn-outline btn-sm">
            <Plus className="w-4 h-4 mr-1" />
            Add Category
          </button>
        )}
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="card card-body">
          <div className="text-sm text-gray-500">Fixed Costs</div>
          <div className="text-2xl font-bold text-blue-600">{formatCurrency(totalFixed)}</div>
          <div className="text-xs text-gray-500 mt-1">{fixedCategories.length} categories</div>
        </div>
        <div className="card card-body">
          <div className="text-sm text-gray-500">Variable Costs</div>
          <div className="text-2xl font-bold text-purple-600">Formula</div>
          <div className="text-xs text-gray-500 mt-1">{variableCategories.length} categories</div>
        </div>
        <div className="card card-body">
          <div className="text-sm text-gray-500">COGS</div>
          <div className="text-2xl font-bold text-red-600">Formula</div>
          <div className="text-xs text-gray-500 mt-1">{cogsCategories.length} categories</div>
        </div>
        <div className="card card-body">
          <div className="text-sm text-gray-500">Staffing (Step)</div>
          <div className="text-2xl font-bold text-amber-600">Dynamic</div>
          <div className="text-xs text-gray-500 mt-1">{stepCategories.length} rules</div>
        </div>
      </div>

      {/* Cost Categories Table */}
      <div className="card overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Category
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Type
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Configuration
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {categories.map((category) => {
              const typeBadge = getCostTypeBadge(category.costType);
              const isConfirmingDelete = confirmDelete === category.id;

              return (
                <tr key={category.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div>
                      <div className="font-medium text-gray-900">{category.name}</div>
                      <code className="text-xs text-gray-500">{category.code}</code>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`text-xs px-2 py-1 rounded-full ${typeBadge.className}`}>
                      {typeBadge.label}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm text-gray-600">
                      {category.costType === 'variable' || category.costType === 'cogs' ? (
                        <code className="bg-gray-100 px-2 py-1 rounded text-xs">
                          {category.formula || 'No formula'}
                        </code>
                      ) : (
                        getCostDescription(category)
                      )}
                    </div>
                    {category.description && (
                      <div className="text-xs text-gray-500 mt-1">{category.description}</div>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right">
                    <div className="flex items-center justify-end gap-2">
                      {onEditCategory && (
                        <button
                          onClick={() => onEditCategory(category)}
                          className="p-1 text-gray-400 hover:text-gray-600 rounded"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                      )}
                      {onDeleteCategory && (
                        <button
                          onClick={() => handleDelete(category.id)}
                          className={`p-1 rounded ${
                            isConfirmingDelete
                              ? 'text-danger-600 bg-danger-50'
                              : 'text-gray-400 hover:text-danger-600'
                          }`}
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                    {isConfirmingDelete && (
                      <div className="text-xs text-danger-600 mt-1">Click again to confirm</div>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Formula Reference */}
      <div className="card card-body bg-gray-50">
        <h3 className="font-medium text-gray-900 mb-2">Available Variables for Formulas</h3>
        <p className="text-sm text-gray-600 mb-3">
          Use these driver codes in your formulas (e.g., <code className="bg-gray-200 px-1 rounded">total_revenue * 0.15</code>):
        </p>
        <div className="flex flex-wrap gap-2">
          {['total_revenue', 'monthly_revenue', 'customer_count', 'active_users'].map((code) => (
            <code key={code} className="text-xs bg-white px-2 py-1 rounded border">
              {code}
            </code>
          ))}
        </div>
      </div>
    </div>
  );
}
