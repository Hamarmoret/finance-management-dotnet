import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { X, Loader2, Settings } from 'lucide-react';
import { PlanDriver, DriverCategory, PlanScenario } from '@finance/shared';
import { api, getErrorMessage } from '../../../services/api';

const driverSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100),
  code: z
    .string()
    .min(1, 'Code is required')
    .max(50)
    .regex(/^[a-z][a-z0-9_]*$/, 'Code must be lowercase with underscores (e.g., sales_leads)'),
  description: z.string().max(500).optional().nullable(),
  dataType: z.enum(['number', 'currency', 'percentage', 'integer']),
  value: z.coerce.number(),
  unit: z.string().max(20).optional().nullable(),
  category: z.enum(['sales', 'marketing', 'operations', 'hr', 'finance', 'product']),
  scenarioId: z.string().uuid().optional().nullable(),
});

type DriverFormData = z.infer<typeof driverSchema>;

interface DriverModalProps {
  planId: string;
  driver?: PlanDriver | null;
  scenarios: PlanScenario[];
  onClose: () => void;
  onSaved: () => void;
}

const CATEGORY_OPTIONS: { value: DriverCategory; label: string }[] = [
  { value: 'sales', label: 'Sales' },
  { value: 'marketing', label: 'Marketing' },
  { value: 'operations', label: 'Operations' },
  { value: 'hr', label: 'HR' },
  { value: 'finance', label: 'Finance' },
  { value: 'product', label: 'Product' },
];

const DATA_TYPE_OPTIONS = [
  { value: 'number', label: 'Number' },
  { value: 'currency', label: 'Currency ($)' },
  { value: 'percentage', label: 'Percentage (%)' },
  { value: 'integer', label: 'Integer (whole number)' },
];

export function DriverModal({ planId, driver, scenarios, onClose, onSaved }: DriverModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const isEditing = !!driver;

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<DriverFormData>({
    resolver: zodResolver(driverSchema),
    defaultValues: {
      name: driver?.name || '',
      code: driver?.code || '',
      description: driver?.description || '',
      dataType: driver?.dataType || 'number',
      value: driver?.value || 0,
      unit: driver?.unit || '',
      category: driver?.category || 'sales',
      scenarioId: driver?.scenarioId || null,
    },
  });

  const dataType = watch('dataType');

  const onSubmit = async (data: DriverFormData) => {
    setIsSubmitting(true);
    setError(null);

    try {
      if (isEditing && driver) {
        await api.patch(`/business-plans/${planId}/drivers/${driver.id}`, {
          name: data.name,
          description: data.description,
          value: data.value,
          unit: data.unit,
        });
      } else {
        await api.post(`/business-plans/${planId}/drivers`, data);
      }
      onSaved();
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-full items-center justify-center p-4">
        <div className="fixed inset-0 bg-black/50" onClick={onClose} />

        <div className="relative bg-white rounded-lg shadow-xl max-w-lg w-full">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b">
            <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
              <Settings className="w-5 h-5" />
              {isEditing ? 'Edit Driver' : 'Add Driver'}
            </h2>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Body */}
          <form onSubmit={handleSubmit(onSubmit)}>
            <div className="p-4 space-y-4 max-h-[60vh] overflow-y-auto">
              {error && (
                <div className="p-3 bg-danger-50 border border-danger-200 rounded-lg text-sm text-danger-700">
                  {error}
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label htmlFor="name" className="label">
                    Name
                  </label>
                  <input
                    {...register('name')}
                    type="text"
                    id="name"
                    placeholder="e.g., Monthly Sales Leads"
                    className={`input mt-1 ${errors.name ? 'border-danger-500' : ''}`}
                  />
                  {errors.name && (
                    <p className="mt-1 text-sm text-danger-600">{errors.name.message}</p>
                  )}
                </div>

                <div>
                  <label htmlFor="code" className="label">
                    Code
                  </label>
                  <input
                    {...register('code')}
                    type="text"
                    id="code"
                    placeholder="e.g., sales_leads"
                    disabled={isEditing}
                    className={`input mt-1 ${errors.code ? 'border-danger-500' : ''} ${
                      isEditing ? 'bg-gray-100' : ''
                    }`}
                  />
                  {errors.code && (
                    <p className="mt-1 text-sm text-danger-600">{errors.code.message}</p>
                  )}
                  <p className="mt-1 text-xs text-gray-500">
                    Used in formulas (e.g., revenue = sales_leads * conversion_rate * deal_size)
                  </p>
                </div>

                <div>
                  <label htmlFor="category" className="label">
                    Category
                  </label>
                  <select
                    {...register('category')}
                    id="category"
                    disabled={isEditing}
                    className={`input mt-1 ${isEditing ? 'bg-gray-100' : ''}`}
                  >
                    {CATEGORY_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label htmlFor="dataType" className="label">
                    Data Type
                  </label>
                  <select
                    {...register('dataType')}
                    id="dataType"
                    disabled={isEditing}
                    className={`input mt-1 ${isEditing ? 'bg-gray-100' : ''}`}
                  >
                    {DATA_TYPE_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label htmlFor="value" className="label">
                    Value
                  </label>
                  <div className="relative mt-1">
                    {dataType === 'currency' && (
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">
                        $
                      </span>
                    )}
                    <input
                      {...register('value')}
                      type="number"
                      id="value"
                      step={dataType === 'integer' ? '1' : '0.01'}
                      className={`input ${dataType === 'currency' ? 'pl-7' : ''} ${
                        dataType === 'percentage' ? 'pr-8' : ''
                      } ${errors.value ? 'border-danger-500' : ''}`}
                    />
                    {dataType === 'percentage' && (
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500">
                        %
                      </span>
                    )}
                  </div>
                  {errors.value && (
                    <p className="mt-1 text-sm text-danger-600">{errors.value.message}</p>
                  )}
                </div>

                <div>
                  <label htmlFor="unit" className="label">
                    Unit (optional)
                  </label>
                  <input
                    {...register('unit')}
                    type="text"
                    id="unit"
                    placeholder="e.g., leads, users, hours"
                    className="input mt-1"
                  />
                </div>

                {scenarios.length > 1 && !isEditing && (
                  <div className="col-span-2">
                    <label htmlFor="scenarioId" className="label">
                      Apply to Scenario (optional)
                    </label>
                    <select {...register('scenarioId')} id="scenarioId" className="input mt-1">
                      <option value="">All scenarios</option>
                      {scenarios.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.name}
                        </option>
                      ))}
                    </select>
                    <p className="mt-1 text-xs text-gray-500">
                      Leave empty to apply this driver to all scenarios
                    </p>
                  </div>
                )}

                <div className="col-span-2">
                  <label htmlFor="description" className="label">
                    Description (optional)
                  </label>
                  <textarea
                    {...register('description')}
                    id="description"
                    rows={2}
                    placeholder="What does this driver represent?"
                    className="input mt-1"
                  />
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="flex justify-end gap-3 p-4 border-t">
              <button type="button" onClick={onClose} className="btn btn-ghost btn-md">
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="btn btn-primary btn-md"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                    {isEditing ? 'Saving...' : 'Creating...'}
                  </>
                ) : isEditing ? (
                  'Save Changes'
                ) : (
                  'Create Driver'
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
