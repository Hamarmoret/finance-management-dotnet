import { useState, useEffect } from 'react';
import { Tag, Plus, Pencil, Trash2, X, Check, Loader2 } from 'lucide-react';
import { api, getErrorMessage } from '../../../services/api';
import type { ExpenseCategory, IncomeCategory } from '@finance/shared';

type CategoryTab = 'income' | 'expense';

interface EditingCategory {
  id: string | null;
  name: string;
  type: string;
}

const INCOME_TYPES = [
  { value: 'retainer', label: 'Retainer' },
  { value: 'project', label: 'Project' },
  { value: 'other', label: 'Other' },
];

const EXPENSE_TYPES = [
  { value: 'fixed', label: 'Fixed' },
  { value: 'variable', label: 'Variable' },
  { value: 'salary', label: 'Salary' },
  { value: 'one_time', label: 'One-time' },
];

export default function CategoriesSettings() {
  const [activeTab, setActiveTab] = useState<CategoryTab>('income');
  const [incomeCategories, setIncomeCategories] = useState<IncomeCategory[]>([]);
  const [expenseCategories, setExpenseCategories] = useState<ExpenseCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editingCategory, setEditingCategory] = useState<EditingCategory>({
    id: null,
    name: '',
    type: 'other',
  });
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  useEffect(() => {
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    setLoading(true);
    setError(null);
    try {
      const [incomeRes, expenseRes] = await Promise.all([
        api.get('/income/categories'),
        api.get('/expenses/categories'),
      ]);
      setIncomeCategories(incomeRes.data.data || []);
      setExpenseCategories(expenseRes.data.data || []);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  const handleCreateCategory = () => {
    setEditingCategory({
      id: null,
      name: '',
      type: activeTab === 'income' ? 'retainer' : 'fixed',
    });
    setShowForm(true);
    setError(null);
    setSuccess(null);
  };

  const handleEditCategory = (category: IncomeCategory | ExpenseCategory) => {
    setEditingCategory({
      id: category.id,
      name: category.name,
      type: category.type,
    });
    setShowForm(true);
    setError(null);
    setSuccess(null);
  };

  const handleCancelEdit = () => {
    setShowForm(false);
    setEditingCategory({ id: null, name: '', type: 'other' });
  };

  const handleSaveCategory = async () => {
    if (!editingCategory.name.trim()) {
      setError('Category name is required');
      return;
    }

    setSaving(true);
    setError(null);
    setSuccess(null);

    try {
      const endpoint = activeTab === 'income' ? '/income/categories' : '/expenses/categories';
      const data = {
        name: editingCategory.name.trim(),
        type: editingCategory.type,
      };

      if (editingCategory.id) {
        await api.patch(`${endpoint}/${editingCategory.id}`, data);
        setSuccess('Category updated successfully');
      } else {
        await api.post(endpoint, data);
        setSuccess('Category created successfully');
      }

      await fetchCategories();
      setShowForm(false);
      setEditingCategory({ id: null, name: '', type: 'other' });
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteCategory = async (id: string) => {
    setError(null);
    setSuccess(null);

    try {
      const endpoint = activeTab === 'income' ? '/income/categories' : '/expenses/categories';
      await api.delete(`${endpoint}/${id}`);
      setSuccess('Category deleted successfully');
      await fetchCategories();
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setDeleteConfirmId(null);
    }
  };

  const categories = activeTab === 'income' ? incomeCategories : expenseCategories;
  const types = activeTab === 'income' ? INCOME_TYPES : EXPENSE_TYPES;

  const getTypeColor = (type: string) => {
    const colors: Record<string, string> = {
      // Income types
      retainer: 'bg-purple-100 text-purple-700',
      project: 'bg-blue-100 text-blue-700',
      // Expense types
      fixed: 'bg-blue-100 text-blue-700',
      variable: 'bg-purple-100 text-purple-700',
      salary: 'bg-green-100 text-green-700',
      one_time: 'bg-orange-100 text-orange-700',
      // Default
      other: 'bg-gray-100 text-gray-700',
    };
    return colors[type] || colors.other;
  };

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
            <Tag className="w-5 h-5" />
            Categories
          </h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Manage income and expense categories used for classification.
          </p>
        </div>

        {/* Tabs */}
        <div className="border-b border-gray-200 dark:border-gray-700 px-4">
          <nav className="-mb-px flex space-x-8">
            <button
              onClick={() => {
                setActiveTab('income');
                setShowForm(false);
              }}
              className={`py-3 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'income'
                  ? 'border-primary-500 text-primary-600'
                  : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:border-gray-300 dark:hover:border-gray-500'
              }`}
            >
              Income Categories ({incomeCategories.length})
            </button>
            <button
              onClick={() => {
                setActiveTab('expense');
                setShowForm(false);
              }}
              className={`py-3 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'expense'
                  ? 'border-primary-500 text-primary-600'
                  : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:border-gray-300 dark:hover:border-gray-500'
              }`}
            >
              Expense Categories ({expenseCategories.length})
            </button>
          </nav>
        </div>

        <div className="card-body">
          {(error || success) && (
            <div
              className={`mb-4 p-3 rounded-lg text-sm ${
                error
                  ? 'bg-danger-50 border border-danger-200 text-danger-700'
                  : 'bg-success-50 border border-success-200 text-success-700'
              }`}
            >
              {error || success}
            </div>
          )}

          {/* Add/Edit Form */}
          {showForm && (
            <div className="mb-6 bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4 space-y-4">
              <h3 className="font-medium text-gray-900 dark:text-white">
                {editingCategory.id ? 'Edit Category' : 'New Category'}
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={editingCategory.name}
                    onChange={(e) =>
                      setEditingCategory({ ...editingCategory, name: e.target.value })
                    }
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                    placeholder="Category name"
                    maxLength={100}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Type
                  </label>
                  <select
                    value={editingCategory.type}
                    onChange={(e) =>
                      setEditingCategory({ ...editingCategory, type: e.target.value })
                    }
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  >
                    {types.map((type) => (
                      <option key={type.value} value={type.value}>
                        {type.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="flex justify-end gap-2">
                <button
                  onClick={handleCancelEdit}
                  className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg transition-colors"
                  disabled={saving}
                >
                  <X className="w-4 h-4 inline mr-1" />
                  Cancel
                </button>
                <button
                  onClick={handleSaveCategory}
                  className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors disabled:opacity-50"
                  disabled={saving}
                >
                  {saving ? (
                    <>
                      <Loader2 className="w-4 h-4 inline mr-1 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Check className="w-4 h-4 inline mr-1" />
                      {editingCategory.id ? 'Update' : 'Create'}
                    </>
                  )}
                </button>
              </div>
            </div>
          )}

          {/* Categories List */}
          <div className="space-y-2">
            {categories.length === 0 ? (
              <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                <Tag className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                <p>No {activeTab} categories yet.</p>
                <button
                  onClick={handleCreateCategory}
                  className="mt-4 text-primary-600 hover:text-primary-700"
                >
                  Create your first category
                </button>
              </div>
            ) : (
              <>
                {categories.map((category) => (
                  <div
                    key={category.id}
                    className="flex items-center justify-between p-3 bg-white dark:bg-gray-800 border dark:border-gray-700 rounded-lg hover:shadow-sm transition-shadow"
                  >
                    <div className="flex items-center gap-3">
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getTypeColor(
                          category.type
                        )}`}
                      >
                        {category.type}
                      </span>
                      <div>
                        <p className="font-medium text-gray-900 dark:text-white">{category.name}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => handleEditCategory(category)}
                        className="p-2 text-gray-400 hover:text-primary-600 hover:bg-primary-50 rounded-lg transition-colors"
                        title="Edit category"
                      >
                        <Pencil className="w-4 h-4" />
                      </button>
                      {deleteConfirmId === category.id ? (
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => handleDeleteCategory(category.id)}
                            className="px-2 py-1 text-xs bg-danger-600 text-white rounded hover:bg-danger-700"
                          >
                            Confirm
                          </button>
                          <button
                            onClick={() => setDeleteConfirmId(null)}
                            className="px-2 py-1 text-xs bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-300 rounded hover:bg-gray-300 dark:hover:bg-gray-500"
                          >
                            Cancel
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => setDeleteConfirmId(category.id)}
                          className="p-2 text-gray-400 hover:text-danger-600 hover:bg-danger-50 rounded-lg transition-colors"
                          title="Delete category"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </>
            )}
          </div>

          {/* Add Button */}
          {!showForm && categories.length > 0 && (
            <button
              onClick={handleCreateCategory}
              className="mt-4 flex items-center gap-2 text-primary-600 hover:text-primary-700 font-medium"
            >
              <Plus className="w-4 h-4" />
              Add {activeTab} category
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
