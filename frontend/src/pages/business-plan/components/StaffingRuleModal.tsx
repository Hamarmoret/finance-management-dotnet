import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { X, Loader2, Users, HelpCircle } from 'lucide-react';
import { PlanStaffing, PlanDriver, PlanScenario } from '@finance/shared';
import { api, getErrorMessage } from '../../../services/api';

const staffingRuleSchema = z.object({
  roleName: z.string().min(1, 'Role name is required').max(100),
  department: z.string().min(1, 'Department is required').max(50),
  triggerDriverCode: z.string().min(1, 'Trigger driver is required'),
  triggerThreshold: z.coerce.number().positive('Threshold must be positive'),
  salaryAnnual: z.coerce.number().positive('Salary is required'),
  benefitsPct: z.coerce.number().min(0).max(1),
  currentHeadcount: z.coerce.number().int().min(0),
  scenarioId: z.string().uuid().optional().nullable(),
});

type StaffingRuleFormData = z.infer<typeof staffingRuleSchema>;

interface StaffingRuleModalProps {
  planId: string;
  rule?: PlanStaffing | null;
  drivers: PlanDriver[];
  scenarios: PlanScenario[];
  onClose: () => void;
  onSaved: () => void;
}

const DEPARTMENT_SUGGESTIONS = [
  'Sales',
  'Marketing',
  'Engineering',
  'Product',
  'Customer Success',
  'Customer Support',
  'Operations',
  'Finance',
  'HR',
  'Legal',
];

export function StaffingRuleModal({
  planId,
  rule,
  drivers,
  scenarios,
  onClose,
  onSaved,
}: StaffingRuleModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const isEditing = !!rule;

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<StaffingRuleFormData>({
    resolver: zodResolver(staffingRuleSchema),
    defaultValues: {
      roleName: rule?.roleName || '',
      department: rule?.department || '',
      triggerDriverCode: rule?.triggerDriverCode || '',
      triggerThreshold: rule?.triggerThreshold || 50,
      salaryAnnual: rule?.salaryAnnual || 60000,
      benefitsPct: rule?.benefitsPct || 0.25,
      currentHeadcount: rule?.currentHeadcount || 0,
      scenarioId: rule?.scenarioId || null,
    },
  });

  const salaryAnnual = watch('salaryAnnual');
  const benefitsPct = watch('benefitsPct');
  const triggerThreshold = watch('triggerThreshold');
  const triggerDriverCode = watch('triggerDriverCode');

  // Calculate cost preview
  const totalCostPerPerson = salaryAnnual * (1 + benefitsPct);
  const monthlyCostPerPerson = totalCostPerPerson / 12;

  // Find trigger driver for preview
  const triggerDriver = drivers.find((d) => d.code === triggerDriverCode);
  const previewHeadcount = triggerDriver && triggerThreshold > 0
    ? Math.ceil(triggerDriver.value / triggerThreshold)
    : 0;

  const onSubmit = async (data: StaffingRuleFormData) => {
    setIsSubmitting(true);
    setError(null);

    try {
      const payload = {
        ...data,
        scenarioId: data.scenarioId || null,
      };

      if (isEditing && rule) {
        await api.patch(`/business-plans/${planId}/staffing/${rule.id}`, payload);
      } else {
        await api.post(`/business-plans/${planId}/staffing`, payload);
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
              <Users className="w-5 h-5" />
              {isEditing ? 'Edit Staffing Rule' : 'Add Staffing Rule'}
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

              {/* Info banner */}
              <div className="bg-blue-50 p-3 rounded-lg">
                <p className="text-sm text-blue-800">
                  <strong>Staffing rules</strong> automatically calculate hiring needs based on
                  business drivers. For example: "1 Support Agent per 100 customers."
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                {/* Role Name */}
                <div className="col-span-2">
                  <label htmlFor="roleName" className="label">
                    Role Name
                  </label>
                  <input
                    {...register('roleName')}
                    type="text"
                    id="roleName"
                    placeholder="e.g., Customer Support Agent"
                    className={`input mt-1 ${errors.roleName ? 'border-danger-500' : ''}`}
                  />
                  {errors.roleName && (
                    <p className="mt-1 text-sm text-danger-600">{errors.roleName.message}</p>
                  )}
                </div>

                {/* Department */}
                <div>
                  <label htmlFor="department" className="label">
                    Department
                  </label>
                  <input
                    {...register('department')}
                    type="text"
                    id="department"
                    list="department-suggestions"
                    placeholder="e.g., Customer Success"
                    className={`input mt-1 ${errors.department ? 'border-danger-500' : ''}`}
                  />
                  <datalist id="department-suggestions">
                    {DEPARTMENT_SUGGESTIONS.map((dept) => (
                      <option key={dept} value={dept} />
                    ))}
                  </datalist>
                  {errors.department && (
                    <p className="mt-1 text-sm text-danger-600">{errors.department.message}</p>
                  )}
                </div>

                {/* Current Headcount */}
                <div>
                  <label htmlFor="currentHeadcount" className="label">
                    Current Headcount
                  </label>
                  <input
                    {...register('currentHeadcount')}
                    type="number"
                    id="currentHeadcount"
                    min="0"
                    step="1"
                    className={`input mt-1 ${errors.currentHeadcount ? 'border-danger-500' : ''}`}
                  />
                  {errors.currentHeadcount && (
                    <p className="mt-1 text-sm text-danger-600">{errors.currentHeadcount.message}</p>
                  )}
                </div>

                {/* Trigger Driver */}
                <div>
                  <label htmlFor="triggerDriverCode" className="label flex items-center gap-1">
                    Trigger Driver
                    <span className="group relative">
                      <HelpCircle className="w-3.5 h-3.5 text-gray-400" />
                      <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-48 p-2 bg-gray-800 text-white text-xs rounded hidden group-hover:block z-10">
                        The metric that determines hiring needs
                      </span>
                    </span>
                  </label>
                  <select
                    {...register('triggerDriverCode')}
                    id="triggerDriverCode"
                    className={`input mt-1 ${errors.triggerDriverCode ? 'border-danger-500' : ''}`}
                  >
                    <option value="">Select a driver...</option>
                    {drivers.map((driver) => (
                      <option key={driver.id} value={driver.code}>
                        {driver.name} ({driver.code})
                      </option>
                    ))}
                  </select>
                  {errors.triggerDriverCode && (
                    <p className="mt-1 text-sm text-danger-600">{errors.triggerDriverCode.message}</p>
                  )}
                  {triggerDriver && (
                    <p className="mt-1 text-xs text-gray-500">
                      Current value: {triggerDriver.value.toLocaleString()} {triggerDriver.unit || ''}
                    </p>
                  )}
                </div>

                {/* Trigger Threshold */}
                <div>
                  <label htmlFor="triggerThreshold" className="label">
                    Threshold (per hire)
                  </label>
                  <input
                    {...register('triggerThreshold')}
                    type="number"
                    id="triggerThreshold"
                    min="1"
                    step="1"
                    className={`input mt-1 ${errors.triggerThreshold ? 'border-danger-500' : ''}`}
                  />
                  {errors.triggerThreshold && (
                    <p className="mt-1 text-sm text-danger-600">{errors.triggerThreshold.message}</p>
                  )}
                  <p className="mt-1 text-xs text-gray-500">
                    1 hire per {triggerThreshold || 'X'} {triggerDriverCode?.replace(/_/g, ' ') || 'units'}
                  </p>
                </div>

                {/* Annual Salary */}
                <div>
                  <label htmlFor="salaryAnnual" className="label">
                    Annual Salary
                  </label>
                  <div className="relative mt-1">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">$</span>
                    <input
                      {...register('salaryAnnual')}
                      type="number"
                      id="salaryAnnual"
                      min="0"
                      step="1000"
                      className={`input pl-7 ${errors.salaryAnnual ? 'border-danger-500' : ''}`}
                    />
                  </div>
                  {errors.salaryAnnual && (
                    <p className="mt-1 text-sm text-danger-600">{errors.salaryAnnual.message}</p>
                  )}
                </div>

                {/* Benefits Percentage */}
                <div>
                  <label htmlFor="benefitsPct" className="label">
                    Benefits (% of salary)
                  </label>
                  <div className="relative mt-1">
                    <input
                      {...register('benefitsPct')}
                      type="number"
                      id="benefitsPct"
                      min="0"
                      max="1"
                      step="0.01"
                      className={`input pr-8 ${errors.benefitsPct ? 'border-danger-500' : ''}`}
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 text-sm">
                      ({Math.round(benefitsPct * 100)}%)
                    </span>
                  </div>
                  {errors.benefitsPct && (
                    <p className="mt-1 text-sm text-danger-600">{errors.benefitsPct.message}</p>
                  )}
                  <p className="mt-1 text-xs text-gray-500">
                    Enter as decimal (0.25 = 25%)
                  </p>
                </div>

                {/* Scenario Selection */}
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
                      Leave empty to apply this rule to all scenarios
                    </p>
                  </div>
                )}
              </div>

              {/* Cost Preview */}
              <div className="bg-gray-50 rounded-lg p-4">
                <h4 className="font-medium text-gray-900 mb-3">Cost Preview</h4>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-gray-500">Total cost per person</p>
                    <p className="font-medium text-gray-900">
                      ${totalCostPerPerson.toLocaleString()}/year
                    </p>
                    <p className="text-xs text-gray-500">
                      ${Math.round(monthlyCostPerPerson).toLocaleString()}/month
                    </p>
                  </div>
                  {triggerDriver && (
                    <div>
                      <p className="text-gray-500">Projected headcount</p>
                      <p className="font-medium text-gray-900">{previewHeadcount} people</p>
                      <p className="text-xs text-gray-500">
                        Based on current {triggerDriverCode?.replace(/_/g, ' ')} value
                      </p>
                    </div>
                  )}
                </div>
                {triggerDriver && previewHeadcount > 0 && (
                  <div className="mt-3 pt-3 border-t">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Total projected annual cost:</span>
                      <span className="font-semibold text-gray-900">
                        ${(previewHeadcount * totalCostPerPerson).toLocaleString()}
                      </span>
                    </div>
                  </div>
                )}
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
                  'Create Staffing Rule'
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
