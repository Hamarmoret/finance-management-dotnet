import { useState } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { X, Loader2, DollarSign, HelpCircle } from 'lucide-react';
import { PlanCostCategory, CostType, PlanDriver } from '@finance/shared';
import { api, getErrorMessage } from '../../../services/api';

const stepConfigSchema = z.object({
  triggerDriver: z.string().min(1, 'Trigger driver is required'),
  threshold: z.coerce.number().positive('Threshold must be positive'),
  costPerStep: z.coerce.number().positive('Cost per step is required'),
  role: z.string().min(1, 'Role name is required'),
});

const costCategorySchema = z.object({
  name: z.string().min(1, 'Name is required').max(100),
  code: z
    .string()
    .min(1, 'Code is required')
    .max(50)
    .regex(/^[a-z][a-z0-9_]*$/, 'Code must be lowercase with underscores (e.g., office_rent)'),
  description: z.string().max(500).optional().nullable(),
  costType: z.enum(['fixed', 'variable', 'step', 'cogs']),
  fixedAmount: z.coerce.number().optional().nullable(),
  formula: z.string().max(200).optional().nullable(),
  stepConfig: stepConfigSchema.optional().nullable(),
});

type CostCategoryFormData = z.infer<typeof costCategorySchema>;

interface CostCategoryModalProps {
  planId: string;
  category?: PlanCostCategory | null;
  drivers: PlanDriver[];
  onClose: () => void;
  onSaved: () => void;
}

const COST_TYPE_OPTIONS: { value: CostType; label: string; description: string }[] = [
  { value: 'fixed', label: 'Fixed', description: 'Constant monthly cost (e.g., rent, insurance)' },
  { value: 'variable', label: 'Variable', description: 'Scales with a formula based on drivers' },
  { value: 'cogs', label: 'COGS', description: 'Cost of Goods Sold - varies with revenue' },
  { value: 'step', label: 'Step', description: 'Increases in steps (e.g., hire per X customers)' },
];

export function CostCategoryModal({
  planId,
  category,
  drivers,
  onClose,
  onSaved,
}: CostCategoryModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const isEditing = !!category;

  const {
    register,
    handleSubmit,
    control,
    setValue,
    formState: { errors },
  } = useForm<CostCategoryFormData>({
    resolver: zodResolver(costCategorySchema),
    defaultValues: {
      name: category?.name || '',
      code: category?.code || '',
      description: category?.description || '',
      costType: category?.costType || 'fixed',
      fixedAmount: category?.fixedAmount || 0,
      formula: category?.formula || '',
      stepConfig: category?.stepConfig || {
        triggerDriver: '',
        threshold: 50,
        costPerStep: 60000,
        role: '',
      },
    },
  });

  const costType = useWatch({ control, name: 'costType' });

  const onSubmit = async (data: CostCategoryFormData) => {
    setIsSubmitting(true);
    setError(null);

    try {
      // Build the payload based on cost type
      const payload: Record<string, unknown> = {
        name: data.name,
        description: data.description || null,
        costType: data.costType,
      };

      if (!isEditing) {
        payload.code = data.code;
      }

      // Add type-specific fields
      switch (data.costType) {
        case 'fixed':
          payload.fixedAmount = data.fixedAmount || 0;
          payload.formula = null;
          payload.stepConfig = null;
          break;
        case 'variable':
        case 'cogs':
          payload.formula = data.formula || null;
          payload.fixedAmount = null;
          payload.stepConfig = null;
          break;
        case 'step':
          payload.stepConfig = data.stepConfig;
          payload.fixedAmount = null;
          payload.formula = null;
          break;
      }

      if (isEditing && category) {
        await api.patch(`/business-plans/${planId}/cost-categories/${category.id}`, payload);
      } else {
        await api.post(`/business-plans/${planId}/cost-categories`, payload);
      }
      onSaved();
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setIsSubmitting(false);
    }
  };

  // Get available driver codes for formulas
  const driverCodes = drivers.map((d) => d.code);

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-full items-center justify-center p-4">
        <div className="fixed inset-0 bg-black/50" onClick={onClose} />

        <div className="relative bg-white rounded-lg shadow-xl max-w-lg w-full">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b">
            <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
              <DollarSign className="w-5 h-5" />
              {isEditing ? 'Edit Cost Category' : 'Add Cost Category'}
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
                {/* Name */}
                <div className="col-span-2">
                  <label htmlFor="name" className="label">
                    Name
                  </label>
                  <input
                    {...register('name')}
                    type="text"
                    id="name"
                    placeholder="e.g., Office Rent"
                    className={`input mt-1 ${errors.name ? 'border-danger-500' : ''}`}
                  />
                  {errors.name && (
                    <p className="mt-1 text-sm text-danger-600">{errors.name.message}</p>
                  )}
                </div>

                {/* Code */}
                <div>
                  <label htmlFor="code" className="label">
                    Code
                  </label>
                  <input
                    {...register('code')}
                    type="text"
                    id="code"
                    placeholder="e.g., office_rent"
                    disabled={isEditing}
                    className={`input mt-1 ${errors.code ? 'border-danger-500' : ''} ${
                      isEditing ? 'bg-gray-100' : ''
                    }`}
                  />
                  {errors.code && (
                    <p className="mt-1 text-sm text-danger-600">{errors.code.message}</p>
                  )}
                </div>

                {/* Cost Type */}
                <div>
                  <label htmlFor="costType" className="label">
                    Cost Type
                  </label>
                  <select
                    {...register('costType')}
                    id="costType"
                    disabled={isEditing}
                    className={`input mt-1 ${isEditing ? 'bg-gray-100' : ''}`}
                  >
                    {COST_TYPE_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                  <p className="mt-1 text-xs text-gray-500">
                    {COST_TYPE_OPTIONS.find((o) => o.value === costType)?.description}
                  </p>
                </div>

                {/* Fixed Amount - only for fixed type */}
                {costType === 'fixed' && (
                  <div className="col-span-2">
                    <label htmlFor="fixedAmount" className="label">
                      Monthly Amount
                    </label>
                    <div className="relative mt-1">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">
                        $
                      </span>
                      <input
                        {...register('fixedAmount')}
                        type="number"
                        id="fixedAmount"
                        step="0.01"
                        placeholder="0.00"
                        className={`input pl-7 ${errors.fixedAmount ? 'border-danger-500' : ''}`}
                      />
                    </div>
                    {errors.fixedAmount && (
                      <p className="mt-1 text-sm text-danger-600">{errors.fixedAmount.message}</p>
                    )}
                  </div>
                )}

                {/* Formula - for variable and cogs types */}
                {(costType === 'variable' || costType === 'cogs') && (
                  <div className="col-span-2">
                    <label htmlFor="formula" className="label flex items-center gap-1">
                      Formula
                      <span className="group relative">
                        <HelpCircle className="w-3.5 h-3.5 text-gray-400" />
                        <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-48 p-2 bg-gray-800 text-white text-xs rounded hidden group-hover:block z-10">
                          Use driver codes and math operators (+, -, *, /)
                        </span>
                      </span>
                    </label>
                    <input
                      {...register('formula')}
                      type="text"
                      id="formula"
                      placeholder="e.g., total_revenue * 0.15"
                      className={`input mt-1 font-mono text-sm ${
                        errors.formula ? 'border-danger-500' : ''
                      }`}
                    />
                    {errors.formula && (
                      <p className="mt-1 text-sm text-danger-600">{errors.formula.message}</p>
                    )}
                    {driverCodes.length > 0 && (
                      <div className="mt-2">
                        <p className="text-xs text-gray-500 mb-1">Available drivers:</p>
                        <div className="flex flex-wrap gap-1">
                          {driverCodes.map((code) => (
                            <code
                              key={code}
                              className="text-xs bg-gray-100 px-1.5 py-0.5 rounded cursor-pointer hover:bg-gray-200"
                              onClick={() => {
                                const currentFormula = control._formValues.formula || '';
                                setValue('formula', currentFormula + code);
                              }}
                            >
                              {code}
                            </code>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Step Config - for step type */}
                {costType === 'step' && (
                  <>
                    <div className="col-span-2 bg-amber-50 p-3 rounded-lg">
                      <p className="text-sm text-amber-800">
                        <strong>Step costs</strong> increase when a trigger driver exceeds a
                        threshold. For example: "Hire 1 Support Agent per 100 customers."
                      </p>
                    </div>

                    <div>
                      <label htmlFor="stepConfig.role" className="label">
                        Role / Item
                      </label>
                      <input
                        {...register('stepConfig.role')}
                        type="text"
                        id="stepConfig.role"
                        placeholder="e.g., Support Agent"
                        className="input mt-1"
                      />
                      {errors.stepConfig?.role && (
                        <p className="mt-1 text-sm text-danger-600">
                          {errors.stepConfig.role.message}
                        </p>
                      )}
                    </div>

                    <div>
                      <label htmlFor="stepConfig.costPerStep" className="label">
                        Annual Cost Per Unit
                      </label>
                      <div className="relative mt-1">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">
                          $
                        </span>
                        <input
                          {...register('stepConfig.costPerStep')}
                          type="number"
                          id="stepConfig.costPerStep"
                          step="1"
                          placeholder="60000"
                          className="input pl-7"
                        />
                      </div>
                      {errors.stepConfig?.costPerStep && (
                        <p className="mt-1 text-sm text-danger-600">
                          {errors.stepConfig.costPerStep.message}
                        </p>
                      )}
                    </div>

                    <div>
                      <label htmlFor="stepConfig.triggerDriver" className="label">
                        Trigger Driver
                      </label>
                      <select
                        {...register('stepConfig.triggerDriver')}
                        id="stepConfig.triggerDriver"
                        className="input mt-1"
                      >
                        <option value="">Select a driver...</option>
                        {drivers.map((driver) => (
                          <option key={driver.id} value={driver.code}>
                            {driver.name} ({driver.code})
                          </option>
                        ))}
                      </select>
                      {errors.stepConfig?.triggerDriver && (
                        <p className="mt-1 text-sm text-danger-600">
                          {errors.stepConfig.triggerDriver.message}
                        </p>
                      )}
                    </div>

                    <div>
                      <label htmlFor="stepConfig.threshold" className="label">
                        Threshold (per unit)
                      </label>
                      <input
                        {...register('stepConfig.threshold')}
                        type="number"
                        id="stepConfig.threshold"
                        step="1"
                        placeholder="100"
                        className="input mt-1"
                      />
                      {errors.stepConfig?.threshold && (
                        <p className="mt-1 text-sm text-danger-600">
                          {errors.stepConfig.threshold.message}
                        </p>
                      )}
                      <p className="mt-1 text-xs text-gray-500">
                        1 unit per this many of the trigger driver
                      </p>
                    </div>
                  </>
                )}

                {/* Description */}
                <div className="col-span-2">
                  <label htmlFor="description" className="label">
                    Description (optional)
                  </label>
                  <textarea
                    {...register('description')}
                    id="description"
                    rows={2}
                    placeholder="What does this cost represent?"
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
                  'Create Cost Category'
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
