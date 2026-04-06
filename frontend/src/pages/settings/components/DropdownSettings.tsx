import { useState, useEffect } from 'react';
import { List, Plus, Pencil, Trash2, X, Check, Loader2, GripVertical } from 'lucide-react';
import { api, getErrorMessage } from '../../../services/api';
import type { DropdownOption } from '@finance/shared';
import { DROPDOWN_CATEGORIES } from '@finance/shared';

type CategoryKey = string;

interface EditingOption {
  id: string | null;
  value: string;
  label: string;
  sortOrder: number;
}

export default function DropdownSettings() {
  const [activeCategory, setActiveCategory] = useState<CategoryKey>('service_type');
  const [allOptions, setAllOptions] = useState<Record<string, DropdownOption[]>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editingOption, setEditingOption] = useState<EditingOption>({
    id: null,
    value: '',
    label: '',
    sortOrder: 0,
  });
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  useEffect(() => {
    fetchOptions();
  }, []);

  const fetchOptions = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.get('/dropdown-options');
      setAllOptions(res.data.data || {});
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  const options = allOptions[activeCategory] ?? [];

  const handleCreate = () => {
    setEditingOption({
      id: null,
      value: '',
      label: '',
      sortOrder: options.length + 1,
    });
    setShowForm(true);
    setError(null);
    setSuccess(null);
  };

  const handleEdit = (opt: DropdownOption) => {
    setEditingOption({
      id: opt.id,
      value: opt.value,
      label: opt.label,
      sortOrder: opt.sortOrder,
    });
    setShowForm(true);
    setError(null);
    setSuccess(null);
  };

  const handleCancel = () => {
    setShowForm(false);
    setEditingOption({ id: null, value: '', label: '', sortOrder: 0 });
  };

  const handleSave = async () => {
    if (!editingOption.label.trim()) {
      setError('Label is required');
      return;
    }

    setSaving(true);
    setError(null);
    setSuccess(null);

    try {
      if (editingOption.id) {
        await api.put(`/dropdown-options/${editingOption.id}`, {
          label: editingOption.label.trim(),
          value: editingOption.value.trim() || undefined,
          sortOrder: editingOption.sortOrder,
        });
        setSuccess('Option updated successfully');
      } else {
        await api.post('/dropdown-options', {
          category: activeCategory,
          value: editingOption.value.trim() || editingOption.label.trim().toLowerCase().replace(/\s+/g, '_'),
          label: editingOption.label.trim(),
          sortOrder: editingOption.sortOrder,
        });
        setSuccess('Option created successfully');
      }

      await fetchOptions();
      setShowForm(false);
      setEditingOption({ id: null, value: '', label: '', sortOrder: 0 });
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    setError(null);
    setSuccess(null);
    try {
      await api.delete(`/dropdown-options/${id}`);
      setSuccess('Option deleted successfully');
      await fetchOptions();
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setDeleteConfirmId(null);
    }
  };

  const handleToggleActive = async (opt: DropdownOption) => {
    try {
      await api.put(`/dropdown-options/${opt.id}`, { isActive: !opt.isActive });
      await fetchOptions();
    } catch (err) {
      setError(getErrorMessage(err));
    }
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
            <List className="w-5 h-5" />
            Dropdown Options
          </h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Manage the values available in dropdown menus throughout the application.
          </p>
        </div>

        {/* Category Tabs */}
        <div className="border-b border-gray-200 dark:border-gray-700 px-4 overflow-x-auto">
          <nav className="-mb-px flex space-x-6">
            {Object.entries(DROPDOWN_CATEGORIES).map(([key, label]) => (
              <button
                key={key}
                onClick={() => {
                  setActiveCategory(key);
                  setShowForm(false);
                }}
                className={`py-3 px-1 border-b-2 font-medium text-sm whitespace-nowrap ${
                  activeCategory === key
                    ? 'border-primary-500 text-primary-600'
                    : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:border-gray-300 dark:hover:border-gray-500'
                }`}
              >
                {label} ({(allOptions[key] ?? []).length})
              </button>
            ))}
          </nav>
        </div>

        <div className="card-body">
          {(error || success) && (
            <div
              className={`mb-4 p-3 rounded-lg text-sm ${
                error
                  ? 'bg-danger-50 dark:bg-danger-900/20 border border-danger-200 dark:border-danger-800 text-danger-700 dark:text-danger-400'
                  : 'bg-success-50 dark:bg-success-900/20 border border-success-200 dark:border-success-800 text-success-700 dark:text-success-400'
              }`}
            >
              {error || success}
            </div>
          )}

          {/* Add/Edit Form */}
          {showForm && (
            <div className="mb-6 bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4 space-y-4">
              <h3 className="font-medium text-gray-900 dark:text-white">
                {editingOption.id ? 'Edit Option' : 'New Option'}
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Label <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={editingOption.label}
                    onChange={(e) =>
                      setEditingOption({ ...editingOption, label: e.target.value })
                    }
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                    placeholder="Display label"
                    maxLength={200}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Value (key)
                  </label>
                  <input
                    type="text"
                    value={editingOption.value}
                    onChange={(e) =>
                      setEditingOption({ ...editingOption, value: e.target.value })
                    }
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                    placeholder="Auto-generated if empty"
                    maxLength={200}
                  />
                  <p className="text-xs text-gray-400 mt-1">Leave empty to auto-generate from label</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Sort Order
                  </label>
                  <input
                    type="number"
                    value={editingOption.sortOrder}
                    onChange={(e) =>
                      setEditingOption({ ...editingOption, sortOrder: parseInt(e.target.value) || 0 })
                    }
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                    min={0}
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2">
                <button
                  onClick={handleCancel}
                  className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg transition-colors"
                  disabled={saving}
                >
                  <X className="w-4 h-4 inline mr-1" />
                  Cancel
                </button>
                <button
                  onClick={handleSave}
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
                      {editingOption.id ? 'Update' : 'Create'}
                    </>
                  )}
                </button>
              </div>
            </div>
          )}

          {/* Options List */}
          <div className="space-y-2">
            {options.length === 0 ? (
              <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                <List className="w-12 h-12 mx-auto mb-4 text-gray-300 dark:text-gray-600" />
                <p>No options for {DROPDOWN_CATEGORIES[activeCategory]}.</p>
                <button
                  onClick={handleCreate}
                  className="mt-4 text-primary-600 hover:text-primary-700"
                >
                  Add your first option
                </button>
              </div>
            ) : (
              <>
                {options.map((opt) => (
                  <div
                    key={opt.id}
                    className={`flex items-center justify-between p-3 bg-white dark:bg-gray-800 border dark:border-gray-700 rounded-lg hover:shadow-sm transition-shadow ${
                      !opt.isActive ? 'opacity-50' : ''
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <GripVertical className="w-4 h-4 text-gray-300 dark:text-gray-600" />
                      <div>
                        <p className="font-medium text-gray-900 dark:text-white">{opt.label}</p>
                        <p className="text-xs text-gray-400 dark:text-gray-500">
                          {opt.value}
                          {!opt.isActive && (
                            <span className="ml-2 text-warning-600 dark:text-warning-400">
                              (disabled)
                            </span>
                          )}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => handleToggleActive(opt)}
                        className={`p-2 rounded-lg transition-colors ${
                          opt.isActive
                            ? 'text-success-600 hover:bg-success-50 dark:hover:bg-success-900/20'
                            : 'text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
                        }`}
                        title={opt.isActive ? 'Disable' : 'Enable'}
                      >
                        <Check className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleEdit(opt)}
                        className="p-2 text-gray-400 hover:text-primary-600 hover:bg-primary-50 dark:hover:bg-primary-900/20 rounded-lg transition-colors"
                        title="Edit option"
                      >
                        <Pencil className="w-4 h-4" />
                      </button>
                      {deleteConfirmId === opt.id ? (
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => handleDelete(opt.id)}
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
                          onClick={() => setDeleteConfirmId(opt.id)}
                          className="p-2 text-gray-400 hover:text-danger-600 hover:bg-danger-50 dark:hover:bg-danger-900/20 rounded-lg transition-colors"
                          title="Delete option"
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
          {!showForm && options.length > 0 && (
            <button
              onClick={handleCreate}
              className="mt-4 flex items-center gap-2 text-primary-600 hover:text-primary-700 font-medium"
            >
              <Plus className="w-4 h-4" />
              Add option
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
