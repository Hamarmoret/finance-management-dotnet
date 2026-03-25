import { z } from 'zod';

// =============================================
// Common Validators
// =============================================

export const uuidSchema = z.string().uuid('Invalid UUID format');

export const emailSchema = z
  .string()
  .email('Invalid email address')
  .max(255, 'Email must be 255 characters or less')
  .transform((v) => v.toLowerCase().trim());

export const passwordSchema = z
  .string()
  .min(12, 'Password must be at least 12 characters')
  .max(128, 'Password must be 128 characters or less')
  .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
  .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
  .regex(/[0-9]/, 'Password must contain at least one number')
  .regex(
    /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/,
    'Password must contain at least one special character'
  );

export const dateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format (YYYY-MM-DD)');

export const currencyCodeSchema = z.string().length(3, 'Currency code must be 3 characters');

export const percentageSchema = z
  .number()
  .min(0.01, 'Percentage must be greater than 0')
  .max(100, 'Percentage cannot exceed 100');

export const amountSchema = z
  .number()
  .positive('Amount must be positive')
  .max(999999999999.99, 'Amount too large');

// =============================================
// Auth Schemas
// =============================================

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, 'Password is required'),
  mfaCode: z.string().length(6, 'MFA code must be 6 digits').optional(),
});

export const registerSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
  firstName: z
    .string()
    .min(1, 'First name is required')
    .max(100, 'First name must be 100 characters or less')
    .trim(),
  lastName: z
    .string()
    .min(1, 'Last name is required')
    .max(100, 'Last name must be 100 characters or less')
    .trim(),
});

export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, 'Current password is required'),
    newPassword: passwordSchema,
    confirmPassword: z.string().min(1, 'Confirm password is required'),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });

export const mfaVerifySchema = z.object({
  code: z.string().length(6, 'MFA code must be 6 digits'),
  mfaToken: z.string().optional(),
});

export const refreshTokenSchema = z.object({
  refreshToken: z.string().min(1, 'Refresh token is required'),
});

export const forgotPasswordSchema = z.object({
  email: emailSchema,
});

export const resetPasswordSchema = z
  .object({
    token: z.string().min(1, 'Reset token is required'),
    newPassword: passwordSchema,
    confirmPassword: z.string().min(1, 'Confirm password is required'),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });

// =============================================
// User Schemas
// =============================================

export const updateUserSchema = z.object({
  firstName: z
    .string()
    .min(1)
    .max(100)
    .trim()
    .optional(),
  lastName: z
    .string()
    .min(1)
    .max(100)
    .trim()
    .optional(),
});

export const updateUserRoleSchema = z.object({
  role: z.enum(['admin', 'manager', 'viewer']),
});

// =============================================
// P&L Center Schemas
// =============================================

export const createPnlCenterSchema = z.object({
  name: z
    .string()
    .min(1, 'Name is required')
    .max(255, 'Name must be 255 characters or less')
    .trim(),
  description: z
    .string()
    .max(1000, 'Description must be 1000 characters or less')
    .trim()
    .optional()
    .nullable(),
});

export const updatePnlCenterSchema = z.object({
  name: z.string().min(1).max(255).trim().optional(),
  description: z.string().max(1000).trim().optional().nullable(),
  isActive: z.boolean().optional(),
});

export const pnlPermissionSchema = z.object({
  userId: uuidSchema,
  pnlCenterId: uuidSchema,
  permissionLevel: z.enum(['view', 'edit', 'admin']),
});

// =============================================
// Allocation Schemas
// =============================================

export const allocationSchema = z.object({
  pnlCenterId: uuidSchema,
  percentage: percentageSchema,
});

export const allocationsArraySchema = z
  .array(allocationSchema)
  .min(1, 'At least one allocation is required')
  .refine(
    (allocations) => {
      const total = allocations.reduce((sum, a) => sum + a.percentage, 0);
      return Math.abs(total - 100) < 0.01;
    },
    { message: 'Allocations must sum to 100%' }
  );

// =============================================
// Expense Schemas
// =============================================

export const recurringPatternSchema = z.object({
  frequency: z.enum(['daily', 'weekly', 'monthly', 'yearly']),
  interval: z.number().int().min(1).max(365).default(1),
  dayOfMonth: z.number().int().min(1).max(31).optional(),
  dayOfWeek: z.number().int().min(0).max(6).optional(),
  endDate: dateSchema.optional().nullable(),
});

export const attachmentSchema = z.object({
  name: z.string().min(1).max(255),
  url: z.string().url(),
  type: z.string().min(1).max(100),
  size: z.number().int().positive().optional(),
});

export const createExpenseSchema = z.object({
  description: z
    .string()
    .min(1, 'Description is required')
    .max(500, 'Description must be 500 characters or less')
    .trim(),
  amount: amountSchema,
  currency: currencyCodeSchema.default('USD'),
  categoryId: uuidSchema.optional().nullable(),
  expenseDate: dateSchema,
  isRecurring: z.boolean().default(false),
  recurringPattern: recurringPatternSchema.optional().nullable(),
  vendor: z.string().max(255).trim().optional().nullable(),
  notes: z.string().max(2000).trim().optional().nullable(),
  attachments: z.array(attachmentSchema).default([]),
  tags: z.array(z.string().max(100)).max(20).default([]),
  allocations: allocationsArraySchema,
});

export const updateExpenseSchema = createExpenseSchema.partial().omit({ allocations: true }).extend({
  allocations: allocationsArraySchema.optional(),
});

// =============================================
// Expense Category Schemas
// =============================================

export const createExpenseCategorySchema = z.object({
  name: z
    .string()
    .min(1, 'Name is required')
    .max(100, 'Name must be 100 characters or less')
    .trim(),
  type: z.enum(['fixed', 'variable', 'salary', 'one_time']),
  parentId: uuidSchema.optional().nullable(),
});

export const updateExpenseCategorySchema = z.object({
  name: z.string().min(1).max(100).trim().optional(),
  type: z.enum(['fixed', 'variable', 'salary', 'one_time']).optional(),
  parentId: uuidSchema.optional().nullable(),
  isActive: z.boolean().optional(),
});

// =============================================
// Income Schemas
// =============================================

export const createIncomeSchema = z.object({
  description: z
    .string()
    .min(1, 'Description is required')
    .max(500, 'Description must be 500 characters or less')
    .trim(),
  amount: amountSchema,
  currency: currencyCodeSchema.default('USD'),
  categoryId: uuidSchema.optional().nullable(),
  incomeDate: dateSchema,
  isRecurring: z.boolean().default(false),
  recurringPattern: recurringPatternSchema.optional().nullable(),
  clientName: z.string().max(255).trim().optional().nullable(),
  invoiceNumber: z.string().max(100).trim().optional().nullable(),
  invoiceType: z.enum(['standard', 'proforma', 'tax', 'credit_note', 'receipt']).optional().nullable(),
  invoiceStatus: z.enum(['draft', 'sent', 'paid', 'overdue', 'cancelled']).optional().nullable(),
  paymentDueDate: dateSchema.optional().nullable(),
  paymentReceivedDate: dateSchema.optional().nullable(),
  notes: z.string().max(2000).trim().optional().nullable(),
  tags: z.array(z.string().max(100)).max(20).default([]),
  allocations: allocationsArraySchema,
});

export const updateIncomeSchema = createIncomeSchema.partial().omit({ allocations: true }).extend({
  allocations: allocationsArraySchema.optional(),
});

export const updateInvoiceStatusSchema = z.object({
  status: z.enum(['draft', 'sent', 'paid', 'overdue', 'cancelled']),
  paymentReceivedDate: dateSchema.optional().nullable(),
});

// =============================================
// Income Category Schemas
// =============================================

export const createIncomeCategorySchema = z.object({
  name: z
    .string()
    .min(1, 'Name is required')
    .max(100, 'Name must be 100 characters or less')
    .trim(),
  type: z.enum(['retainer', 'project', 'other']),
});

export const updateIncomeCategorySchema = z.object({
  name: z.string().min(1).max(100).trim().optional(),
  type: z.enum(['retainer', 'project', 'other']).optional(),
  isActive: z.boolean().optional(),
});

// =============================================
// Recurring Template Schemas
// =============================================

export const createRecurringTemplateSchema = z.object({
  type: z.enum(['expense', 'income']),
  referenceId: uuidSchema,
  frequency: z.enum(['daily', 'weekly', 'monthly', 'yearly']),
  intervalValue: z.number().int().min(1).max(365).default(1),
  dayOfMonth: z.number().int().min(1).max(31).optional().nullable(),
  dayOfWeek: z.number().int().min(0).max(6).optional().nullable(),
  nextOccurrence: dateSchema,
  endDate: dateSchema.optional().nullable(),
});

export const updateRecurringTemplateSchema = z.object({
  frequency: z.enum(['daily', 'weekly', 'monthly', 'yearly']).optional(),
  intervalValue: z.number().int().min(1).max(365).optional(),
  dayOfMonth: z.number().int().min(1).max(31).optional().nullable(),
  dayOfWeek: z.number().int().min(0).max(6).optional().nullable(),
  nextOccurrence: dateSchema.optional(),
  endDate: dateSchema.optional().nullable(),
  isActive: z.boolean().optional(),
});

// =============================================
// Analytics Query Schemas
// =============================================

export const dateRangeSchema = z.object({
  startDate: dateSchema,
  endDate: dateSchema,
}).refine(
  (data) => new Date(data.startDate) <= new Date(data.endDate),
  { message: 'Start date must be before or equal to end date' }
);

export const analyticsQuerySchema = z.object({
  startDate: dateSchema.optional(),
  endDate: dateSchema.optional(),
  pnlCenterId: uuidSchema.optional(),
});

export const forecastQuerySchema = z.object({
  targetDate: dateSchema,
  pnlCenterId: uuidSchema.optional(),
});

export const comparisonQuerySchema = z.object({
  currentStart: dateSchema,
  currentEnd: dateSchema,
  previousStart: dateSchema,
  previousEnd: dateSchema,
  pnlCenterId: uuidSchema.optional(),
});

// =============================================
// Pagination Schema
// =============================================

export const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  sortBy: z.string().optional(),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});

// =============================================
// Filter Schemas
// =============================================

export const expenseFilterSchema = paginationSchema.extend({
  categoryId: uuidSchema.optional(),
  pnlCenterId: uuidSchema.optional(),
  startDate: dateSchema.optional(),
  endDate: dateSchema.optional(),
  minAmount: z.coerce.number().optional(),
  maxAmount: z.coerce.number().optional(),
  vendor: z.string().optional(),
  tags: z.string().optional(), // comma-separated
  isRecurring: z.coerce.boolean().optional(),
  search: z.string().max(100).optional(),
});

export const incomeFilterSchema = paginationSchema.extend({
  categoryId: uuidSchema.optional(),
  pnlCenterId: uuidSchema.optional(),
  startDate: dateSchema.optional(),
  endDate: dateSchema.optional(),
  minAmount: z.coerce.number().optional(),
  maxAmount: z.coerce.number().optional(),
  clientName: z.string().optional(),
  invoiceStatus: z.enum(['draft', 'sent', 'paid', 'overdue', 'cancelled']).optional(),
  tags: z.string().optional(),
  isRecurring: z.coerce.boolean().optional(),
  search: z.string().max(100).optional(),
});

// =============================================
// Business Plan Schemas
// =============================================

export const createBusinessPlanSchema = z.object({
  name: z
    .string()
    .min(1, 'Name is required')
    .max(255, 'Name must be 255 characters or less')
    .trim(),
  description: z.string().max(2000).trim().optional().nullable(),
  fiscalYear: z
    .number()
    .int()
    .min(2020, 'Fiscal year must be 2020 or later')
    .max(2100, 'Fiscal year must be 2100 or earlier'),
  planType: z.enum(['company', 'pnl_center']),
  pnlCenterId: uuidSchema.optional().nullable(),
  mission: z.string().max(2000).trim().optional().nullable(),
  vision: z.string().max(2000).trim().optional().nullable(),
  targetRevenue: z.number().min(0).default(0),
  targetExpenses: z.number().min(0).default(0),
});

export const updateBusinessPlanSchema = z.object({
  name: z.string().min(1).max(255).trim().optional(),
  description: z.string().max(2000).trim().optional().nullable(),
  status: z.enum(['draft', 'active', 'archived']).optional(),
  mission: z.string().max(2000).trim().optional().nullable(),
  vision: z.string().max(2000).trim().optional().nullable(),
  targetRevenue: z.number().min(0).optional(),
  targetExpenses: z.number().min(0).optional(),
});

export const planProjectionSchema = z.object({
  periodType: z.enum(['monthly', 'quarterly']),
  periodStart: dateSchema,
  periodEnd: dateSchema,
  projectedRevenue: z.number().min(0).default(0),
  projectedExpenses: z.number().min(0).default(0),
  projectedHeadcount: z.number().int().min(0).optional().nullable(),
  notes: z.string().max(1000).trim().optional().nullable(),
});

export const updateProjectionsSchema = z.object({
  projections: z.array(planProjectionSchema).min(1).max(12),
});

export const createPlanGoalSchema = z.object({
  title: z
    .string()
    .min(1, 'Title is required')
    .max(255, 'Title must be 255 characters or less')
    .trim(),
  description: z.string().max(2000).trim().optional().nullable(),
  category: z.enum(['revenue', 'growth', 'operations', 'product', 'team', 'customer', 'other']),
  targetValue: z.number().optional().nullable(),
  unit: z.string().max(20).trim().optional().nullable(),
  targetDate: dateSchema.optional().nullable(),
  priority: z.enum(['low', 'medium', 'high', 'critical']).default('medium'),
});

export const updatePlanGoalSchema = z.object({
  title: z.string().min(1).max(255).trim().optional(),
  description: z.string().max(2000).trim().optional().nullable(),
  category: z.enum(['revenue', 'growth', 'operations', 'product', 'team', 'customer', 'other']).optional(),
  targetValue: z.number().optional().nullable(),
  currentValue: z.number().min(0).optional(),
  unit: z.string().max(20).trim().optional().nullable(),
  targetDate: dateSchema.optional().nullable(),
  status: z.enum(['not_started', 'in_progress', 'at_risk', 'completed', 'cancelled']).optional(),
  priority: z.enum(['low', 'medium', 'high', 'critical']).optional(),
  progress: z.number().int().min(0).max(100).optional(),
  sortOrder: z.number().int().min(0).optional(),
});

export const businessPlanFilterSchema = paginationSchema.extend({
  fiscalYear: z.coerce.number().int().optional(),
  status: z.enum(['draft', 'active', 'archived']).optional(),
  planType: z.enum(['company', 'pnl_center']).optional(),
  pnlCenterId: uuidSchema.optional(),
});

// =============================================
// Type Exports
// =============================================

export type LoginInput = z.infer<typeof loginSchema>;
export type RegisterInput = z.infer<typeof registerSchema>;
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;
export type MfaVerifyInput = z.infer<typeof mfaVerifySchema>;
export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;
export type UpdateUserInput = z.infer<typeof updateUserSchema>;
export type CreatePnlCenterInput = z.infer<typeof createPnlCenterSchema>;
export type UpdatePnlCenterInput = z.infer<typeof updatePnlCenterSchema>;
export type CreateExpenseInput = z.infer<typeof createExpenseSchema>;
export type UpdateExpenseInput = z.infer<typeof updateExpenseSchema>;
export type CreateIncomeInput = z.infer<typeof createIncomeSchema>;
export type UpdateIncomeInput = z.infer<typeof updateIncomeSchema>;
export type ExpenseFilterInput = z.infer<typeof expenseFilterSchema>;
export type IncomeFilterInput = z.infer<typeof incomeFilterSchema>;
export type PaginationInput = z.infer<typeof paginationSchema>;
export type AnalyticsQueryInput = z.infer<typeof analyticsQuerySchema>;
export type ForecastQueryInput = z.infer<typeof forecastQuerySchema>;
export type CreateBusinessPlanInput = z.infer<typeof createBusinessPlanSchema>;
export type UpdateBusinessPlanInput = z.infer<typeof updateBusinessPlanSchema>;
export type PlanProjectionInput = z.infer<typeof planProjectionSchema>;
export type CreatePlanGoalInput = z.infer<typeof createPlanGoalSchema>;
export type UpdatePlanGoalInput = z.infer<typeof updatePlanGoalSchema>;
export type BusinessPlanFilterInput = z.infer<typeof businessPlanFilterSchema>;

// =============================================
// Driver-Based Planning Engine Schemas
// =============================================

// Scenario Schemas
export const createScenarioSchema = z.object({
  name: z.string().min(1).max(100).trim(),
  description: z.string().max(500).optional().nullable(),
  adjustmentFactor: z.number().min(0.1).max(5.0).default(1.0),
});

export const updateScenarioSchema = createScenarioSchema.partial();

// Driver Schemas
export const driverDataTypeSchema = z.enum(['number', 'currency', 'percentage', 'integer']);
export const driverCategorySchema = z.enum(['sales', 'operations', 'marketing', 'hr', 'finance', 'product']);

export const createDriverSchema = z.object({
  name: z.string().min(1).max(100).trim(),
  code: z.string().min(1).max(50).regex(/^[a-z][a-z0-9_]*$/, 'Code must be lowercase with underscores'),
  description: z.string().max(500).optional().nullable(),
  dataType: driverDataTypeSchema,
  value: z.number(),
  unit: z.string().max(20).optional().nullable(),
  category: driverCategorySchema,
  scenarioId: uuidSchema.optional().nullable(),
});

export const updateDriverSchema = z.object({
  name: z.string().min(1).max(100).trim().optional(),
  description: z.string().max(500).optional().nullable(),
  value: z.number().optional(),
  unit: z.string().max(20).optional().nullable(),
});

export const bulkUpdateDriversSchema = z.object({
  drivers: z.array(z.object({
    id: uuidSchema,
    value: z.number(),
  })).min(1),
});

// Revenue Model Schemas
export const revenueModelTypeSchema = z.enum(['leads_based', 'headcount_based', 'manual']);

export const upsertRevenueModelSchema = z.object({
  periodStart: dateSchema,
  periodEnd: dateSchema,
  modelType: revenueModelTypeSchema,
  scenarioId: uuidSchema.optional().nullable(),

  // Leads-based
  leadsGenerated: z.number().int().min(0).optional().nullable(),
  conversionRate: z.number().min(0).max(1).optional().nullable(),
  averageDealSize: z.number().min(0).optional().nullable(),

  // Headcount-based
  salesReps: z.number().int().min(0).optional().nullable(),
  quotaPerRep: z.number().min(0).optional().nullable(),
  quotaAttainment: z.number().min(0).max(2).optional().nullable(),

  // Manual override
  manualRevenue: z.number().min(0).optional().nullable(),

  notes: z.string().max(1000).optional().nullable(),
});

export const bulkUpsertRevenueModelsSchema = z.object({
  models: z.array(upsertRevenueModelSchema).min(1),
});

// Cost Category Schemas
export const costTypeSchema = z.enum(['fixed', 'variable', 'step', 'cogs']);

export const stepCostConfigSchema = z.object({
  triggerDriver: z.string().min(1).max(50),
  threshold: z.number().int().min(1),
  costPerStep: z.number().min(0),
  role: z.string().min(1).max(100),
});

export const createCostCategorySchema = z.object({
  name: z.string().min(1).max(100).trim(),
  code: z.string().min(1).max(50).regex(/^[a-z][a-z0-9_]*$/, 'Code must be lowercase with underscores'),
  costType: costTypeSchema,
  description: z.string().max(500).optional().nullable(),
  formula: z.string().max(500).optional().nullable(),
  stepConfig: stepCostConfigSchema.optional().nullable(),
  fixedAmount: z.number().min(0).optional().nullable(),
}).refine(data => {
  // Validate that appropriate fields are set based on costType
  if (data.costType === 'fixed' && data.fixedAmount === null && data.fixedAmount === undefined) {
    return false;
  }
  if ((data.costType === 'variable' || data.costType === 'cogs') && !data.formula) {
    return false;
  }
  if (data.costType === 'step' && !data.stepConfig) {
    return false;
  }
  return true;
}, { message: 'Cost type requires corresponding configuration' });

export const updateCostCategorySchema = z.object({
  name: z.string().min(1).max(100).trim().optional(),
  code: z.string().min(1).max(50).regex(/^[a-z][a-z0-9_]*$/).optional(),
  costType: costTypeSchema.optional(),
  description: z.string().max(500).optional().nullable(),
  formula: z.string().max(500).optional().nullable(),
  stepConfig: stepCostConfigSchema.optional().nullable(),
  fixedAmount: z.number().min(0).optional().nullable(),
  sortOrder: z.number().int().min(0).optional(),
});

// Staffing Rule Schemas
export const createStaffingRuleSchema = z.object({
  roleName: z.string().min(1).max(100).trim(),
  department: z.string().min(1).max(50),
  triggerDriverCode: z.string().min(1).max(50),
  triggerThreshold: z.number().int().min(1),
  salaryAnnual: z.number().min(0),
  benefitsPct: z.number().min(0).max(1).default(0.25),
  currentHeadcount: z.number().int().min(0).default(0),
  scenarioId: uuidSchema.optional().nullable(),
});

export const updateStaffingRuleSchema = z.object({
  roleName: z.string().min(1).max(100).trim().optional(),
  department: z.string().min(1).max(50).optional(),
  triggerDriverCode: z.string().min(1).max(50).optional(),
  triggerThreshold: z.number().int().min(1).optional(),
  salaryAnnual: z.number().min(0).optional(),
  benefitsPct: z.number().min(0).max(1).optional(),
  currentHeadcount: z.number().int().min(0).optional(),
  sortOrder: z.number().int().min(0).optional(),
});

// =============================================
// Driver-Based Planning Type Exports
// =============================================

export type CreateScenarioInput = z.infer<typeof createScenarioSchema>;
export type UpdateScenarioInput = z.infer<typeof updateScenarioSchema>;
export type CreateDriverInput = z.infer<typeof createDriverSchema>;
export type UpdateDriverInput = z.infer<typeof updateDriverSchema>;
export type BulkUpdateDriversInput = z.infer<typeof bulkUpdateDriversSchema>;
export type UpsertRevenueModelInput = z.infer<typeof upsertRevenueModelSchema>;
export type BulkUpsertRevenueModelsInput = z.infer<typeof bulkUpsertRevenueModelsSchema>;
export type CreateCostCategoryInput = z.infer<typeof createCostCategorySchema>;
export type UpdateCostCategoryInput = z.infer<typeof updateCostCategorySchema>;
export type CreateStaffingRuleInput = z.infer<typeof createStaffingRuleSchema>;
export type UpdateStaffingRuleInput = z.infer<typeof updateStaffingRuleSchema>;
