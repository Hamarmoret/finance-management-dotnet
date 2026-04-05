// =============================================
// User & Authentication Types
// =============================================

export type UserRole = 'owner' | 'admin' | 'manager' | 'viewer';
export type PermissionLevel = 'view' | 'edit' | 'admin';

export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: UserRole;
  mfaEnabled: boolean;
  isActive: boolean;
  passwordChangedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface UserWithPermissions extends User {
  pnlPermissions: PnlPermission[];
}

export interface PnlPermission {
  pnlCenterId: string;
  pnlCenterName: string;
  permissionLevel: PermissionLevel;
}

export interface Session {
  id: string;
  userId: string;
  deviceInfo: DeviceInfo | null;
  ipAddress: string | null;
  expiresAt: Date;
  createdAt: Date;
}

export interface DeviceInfo {
  userAgent: string;
  browser?: string;
  os?: string;
  device?: string;
}

// =============================================
// P&L Center Types
// =============================================

export interface PnlCenter {
  id: string;
  name: string;
  description: string | null;
  isActive: boolean;
  createdBy: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface PnlCenterWithStats extends PnlCenter {
  totalIncome: number;
  totalExpenses: number;
  netProfit: number;
}

export interface PnlDistributionDefault {
  pnlCenterId: string;
  pnlCenterName?: string;
  percentage: number;
}

// =============================================
// Expense Types
// =============================================

export type ExpenseCategoryType = 'fixed' | 'variable' | 'salary' | 'one_time';

export interface ExpenseCategory {
  id: string;
  name: string;
  type: ExpenseCategoryType;
  parentId: string | null;
  isActive: boolean;
}

export interface ExpenseAllocation {
  id: string;
  pnlCenterId: string;
  pnlCenterName?: string;
  percentage: number;
  allocatedAmount: number;
}

export interface RecurringPattern {
  frequency: 'daily' | 'weekly' | 'monthly' | 'yearly';
  interval: number;
  dayOfMonth?: number;
  dayOfWeek?: number;
  endDate?: string | null;
}

export interface Attachment {
  name: string;
  url: string;
  type: string;
  size?: number;
}

export interface Expense {
  id: string;
  description: string;
  amount: number;
  currency: string;
  categoryId: string | null;
  category?: ExpenseCategory;
  expenseDate: string;
  isRecurring: boolean;
  recurringPattern: RecurringPattern | null;
  vendor: string | null;
  notes: string | null;
  attachments: Attachment[];
  tags: string[];
  allocations: ExpenseAllocation[];
  createdBy: string | null;
  createdAt: Date;
  updatedAt: Date;
}

// =============================================
// Income Types
// =============================================

export type IncomeCategoryType = 'retainer' | 'project' | 'other';
export type InvoiceStatus = 'draft' | 'sent' | 'paid' | 'overdue' | 'cancelled';
export type InvoiceType = 'standard' | 'proforma' | 'tax' | 'credit_note' | 'receipt';

export interface IncomeCategory {
  id: string;
  name: string;
  type: IncomeCategoryType;
  isActive: boolean;
}

export interface IncomeAllocation {
  id: string;
  pnlCenterId: string;
  pnlCenterName?: string;
  percentage: number;
  allocatedAmount: number;
}

export interface Income {
  id: string;
  description: string;
  amount: number;
  currency: string;
  categoryId: string | null;
  category?: IncomeCategory;
  incomeDate: string;
  isRecurring: boolean;
  recurringPattern: RecurringPattern | null;
  clientName: string | null;
  clientId: string | null;
  invoiceNumber: string | null;
  invoiceType: InvoiceType | null;
  invoiceStatus: InvoiceStatus | null;
  paymentDueDate: string | null;
  paymentReceivedDate: string | null;
  proformaInvoiceDate: string | null;
  taxInvoiceDate: string | null;
  notes: string | null;
  tags: string[];
  billableHoursRegular: number | null;
  billableHours150: number | null;
  billableHours200: number | null;
  hourlyRateRegular: number | null;
  hourlyRate150: number | null;
  hourlyRate200: number | null;
  vatApplicable: boolean;
  vatPercentage: number | null;
  paymentMethod: string | null;
  allocations: IncomeAllocation[];
  createdBy: string | null;
  createdAt: Date;
  updatedAt: Date;
}

// =============================================
// Recurring Templates
// =============================================

export type RecurringType = 'expense' | 'income';
export type RecurringFrequency = 'daily' | 'weekly' | 'monthly' | 'yearly';

export interface RecurringTemplate {
  id: string;
  type: RecurringType;
  referenceId: string;
  frequency: RecurringFrequency;
  intervalValue: number;
  dayOfMonth: number | null;
  dayOfWeek: number | null;
  nextOccurrence: string;
  endDate: string | null;
  isActive: boolean;
  lastGeneratedAt: Date | null;
  createdAt: Date;
}

// =============================================
// Analytics Types
// =============================================

export interface DashboardSummary {
  totalIncome: number;
  totalExpenses: number;
  netProfit: number;
  incomeChange: number;
  expenseChange: number;
  profitChange: number;
  pendingInvoices: number;
  overdueInvoices: number;
  upcomingExpenses: number;
}

export interface MonthlyBreakdown {
  month: string;
  year: number;
  income: number;
  expenses: number;
  profit: number;
  byCategory: CategoryBreakdown[];
}

export interface CategoryBreakdown {
  categoryId: string;
  categoryName: string;
  amount: number;
  percentage: number;
}

export interface PeriodComparison {
  currentPeriod: {
    start: string;
    end: string;
    income: number;
    expenses: number;
    profit: number;
  };
  previousPeriod: {
    start: string;
    end: string;
    income: number;
    expenses: number;
    profit: number;
  };
  changes: {
    income: number;
    expenses: number;
    profit: number;
  };
}

export interface ForecastData {
  date: string;
  projectedIncome: number;
  projectedExpenses: number;
  projectedBalance: number;
  scheduledIncome: number;
  scheduledExpenses: number;
  confidence: number;
}

export interface TrendAnalysis {
  period: string;
  data: TrendDataPoint[];
  averageGrowthRate: number;
  burnRate: number;
  runway: number | null;
}

export interface TrendDataPoint {
  date: string;
  income: number;
  expenses: number;
  profit: number;
  cumulativeProfit: number;
}

// =============================================
// Audit Log Types
// =============================================

export type AuditAction =
  | 'create'
  | 'update'
  | 'delete'
  | 'login'
  | 'login_failed'
  | 'logout'
  | 'mfa_setup'
  | 'mfa_verify'
  | 'password_change'
  | 'role_change'
  | 'permission_change';

export type EntityType =
  | 'user'
  | 'session'
  | 'pnl_center'
  | 'expense'
  | 'income'
  | 'expense_category'
  | 'income_category'
  | 'recurring_template'
  | 'integration';

export interface AuditLog {
  id: string;
  userId: string | null;
  action: AuditAction;
  entityType: EntityType;
  entityId: string | null;
  oldValues: Record<string, unknown> | null;
  newValues: Record<string, unknown> | null;
  ipAddress: string | null;
  userAgent: string | null;
  createdAt: Date;
}

// =============================================
// Integration Types
// =============================================

export type IntegrationType = 'monday' | 'quickbooks' | 'freshbooks' | 'zoho';

export interface Integration {
  id: string;
  name: string;
  type: IntegrationType;
  settings: Record<string, unknown>;
  isActive: boolean;
  lastSyncAt: Date | null;
  createdBy: string | null;
  createdAt: Date;
}

// =============================================
// API Response Types
// =============================================

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
}

export interface ApiError {
  success: false;
  error: {
    code: string;
    message: string;
    details?: Record<string, string[]>;
  };
}

export interface PaginatedResponse<T> {
  success: boolean;
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

// =============================================
// Business Plan Types
// =============================================

export type BusinessPlanStatus = 'draft' | 'active' | 'archived';
export type GoalCategory = 'revenue' | 'growth' | 'operations' | 'product' | 'team' | 'customer' | 'other';
export type GoalStatus = 'not_started' | 'in_progress' | 'at_risk' | 'completed' | 'cancelled';
export type GoalPriority = 'low' | 'medium' | 'high' | 'critical';
export type PlanPeriodType = 'monthly' | 'quarterly';

export interface BusinessPlan {
  id: string;
  name: string;
  description: string | null;
  fiscalYear: number;
  planType: 'company' | 'pnl_center';
  pnlCenterId: string | null;
  pnlCenterName?: string;
  status: BusinessPlanStatus;
  mission: string | null;
  vision: string | null;
  targetRevenue: number;
  targetExpenses: number;
  targetProfit: number;
  createdBy: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface PlanProjection {
  id: string;
  businessPlanId: string;
  periodType: PlanPeriodType;
  periodStart: string;
  periodEnd: string;
  projectedRevenue: number;
  projectedExpenses: number;
  projectedProfit: number;
  projectedHeadcount: number | null;
  notes: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface PlanGoal {
  id: string;
  businessPlanId: string;
  title: string;
  description: string | null;
  category: GoalCategory;
  targetValue: number | null;
  currentValue: number;
  unit: string | null;
  targetDate: string | null;
  status: GoalStatus;
  priority: GoalPriority;
  progress: number;
  sortOrder: number;
  createdBy: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface BusinessPlanWithDetails extends BusinessPlan {
  projections: PlanProjection[];
  goals: PlanGoal[];
}

export interface PlanActualsComparison {
  periodStart: string;
  periodEnd: string;
  projected: {
    revenue: number;
    expenses: number;
    profit: number;
  };
  actual: {
    revenue: number;
    expenses: number;
    profit: number;
  };
  variance: {
    revenue: number;
    expenses: number;
    profit: number;
    revenuePercent: number;
    expensesPercent: number;
    profitPercent: number;
  };
}

// =============================================
// Auth Types
// =============================================

export interface LoginRequest {
  email: string;
  password: string;
  mfaCode?: string;
}

export interface LoginResponse {
  user: User;
  accessToken: string;
  refreshToken?: string;
  requiresMfa: boolean;
  mfaToken?: string;
}

export interface RegisterRequest {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
}

export interface MfaSetupResponse {
  secret: string;
  qrCodeUrl: string;
  backupCodes: string[];
}

export interface TokenPayload {
  userId: string;
  email: string;
  role: UserRole;
  type: 'access' | 'refresh';
  iat: number;
  exp: number;
}

// =============================================
// Driver-Based Planning Engine Types
// =============================================

// Scenario Types
export type ScenarioName = 'base' | 'best_case' | 'worst_case' | string;

export interface PlanScenario {
  id: string;
  businessPlanId: string;
  name: ScenarioName;
  description: string | null;
  adjustmentFactor: number;
  isActive: boolean;
  sortOrder: number;
  createdAt: Date;
  updatedAt: Date;
}

// Driver Types
export type DriverDataType = 'number' | 'currency' | 'percentage' | 'integer';
export type DriverCategory = 'sales' | 'operations' | 'marketing' | 'hr' | 'finance' | 'product';

export interface PlanDriver {
  id: string;
  businessPlanId: string;
  scenarioId: string | null;
  name: string;
  code: string;
  description: string | null;
  dataType: DriverDataType;
  value: number;
  unit: string | null;
  category: DriverCategory;
  isEditable: boolean;
  sortOrder: number;
  createdAt: Date;
  updatedAt: Date;
}

// Revenue Model Types
export type RevenueModelType = 'leads_based' | 'headcount_based' | 'manual';

export interface PlanRevenueModel {
  id: string;
  businessPlanId: string;
  scenarioId: string | null;
  periodStart: string;
  periodEnd: string;
  modelType: RevenueModelType;
  leadsGenerated: number | null;
  conversionRate: number | null;
  averageDealSize: number | null;
  salesReps: number | null;
  quotaPerRep: number | null;
  quotaAttainment: number | null;
  calculatedRevenue: number;
  manualRevenue: number | null;
  notes: string | null;
  createdAt: Date;
  updatedAt: Date;
}

// Cost Category Types
export type CostType = 'fixed' | 'variable' | 'step' | 'cogs';

export interface StepCostConfig {
  triggerDriver: string;
  threshold: number;
  costPerStep: number;
  role: string;
}

export interface PlanCostCategory {
  id: string;
  businessPlanId: string;
  name: string;
  code: string;
  costType: CostType;
  description: string | null;
  formula: string | null;
  stepConfig: StepCostConfig | null;
  fixedAmount: number | null;
  sortOrder: number;
  createdAt: Date;
  updatedAt: Date;
}

// Staffing Plan Types
export interface PlanStaffing {
  id: string;
  businessPlanId: string;
  scenarioId: string | null;
  roleName: string;
  department: string;
  triggerDriverCode: string;
  triggerThreshold: number;
  salaryAnnual: number;
  benefitsPct: number;
  currentHeadcount: number;
  sortOrder: number;
  createdAt: Date;
  updatedAt: Date;
}

// Calculated Results Types
export interface CalculationDetail {
  driverValues: Record<string, number>;
  revenueBreakdown: {
    model: RevenueModelType;
    inputs: Record<string, number>;
    calculated: number;
  };
  costBreakdown: {
    fixed: Array<{ name: string; amount: number }>;
    variable: Array<{ name: string; formula: string; amount: number }>;
    cogs: Array<{ name: string; formula: string; amount: number }>;
    staffing: Array<{ role: string; count: number; cost: number }>;
  };
  staffingNeeds: Array<{
    role: string;
    currentCount: number;
    requiredCount: number;
    newHires: number;
    trigger: string;
    threshold: number;
  }>;
}

export interface PlanCalculatedResult {
  id: string;
  businessPlanId: string;
  scenarioId: string;
  periodStart: string;
  periodEnd: string;
  projectedRevenue: number;
  fixedCosts: number;
  variableCosts: number;
  cogs: number;
  staffingCosts: number;
  totalCosts: number;
  grossProfit: number;
  operatingProfit: number;
  totalHeadcount: number;
  newHiresNeeded: number;
  customerCount: number | null;
  activeUsers: number | null;
  calculatedAt: Date;
  calculationDetails: CalculationDetail | null;
}

// Combined Types for API Responses
export interface BusinessPlanWithEngine extends BusinessPlan {
  scenarios: PlanScenario[];
  drivers: PlanDriver[];
  revenueModels: PlanRevenueModel[];
  costCategories: PlanCostCategory[];
  staffingPlan: PlanStaffing[];
  calculatedResults: PlanCalculatedResult[];
  projections: PlanProjection[];
  goals: PlanGoal[];
}

export interface ScenarioComparison {
  periods: string[];
  scenarios: {
    id: string;
    name: string;
    data: {
      revenue: number[];
      costs: number[];
      profit: number[];
      headcount: number[];
    };
  }[];
}

// =============================================
// Pipeline / CRM Types
// =============================================

export type ClientStatus = 'active' | 'inactive' | 'archived';

export interface Client {
  id: string;
  name: string;
  companyName: string | null;
  email: string | null;
  phone: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  postalCode: string | null;
  country: string | null;
  website: string | null;
  notes: string | null;
  tags: string[];
  defaultCurrency: string;
  taxId: string | null;
  paymentTerms: number;
  status: ClientStatus;
  industry: string | null;
  businessType: string | null;
  utmSource: string | null;
  utmMedium: string | null;
  utmCampaign: string | null;
  createdBy: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface ContactPerson {
  id: string;
  clientId: string | null;
  name: string;
  email: string | null;
  phone: string | null;
  role: string | null;
  linkedinUrl: string | null;
  country: string | null;
  isPrimary: boolean;
  notes: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export type LeadStatus =
  | 'new'
  | 'contacted'
  | 'qualified'
  | 'proposal_sent'
  | 'negotiation'
  | 'won'
  | 'lost'
  | 'on_hold';

export type LeadActivityType = 'note' | 'call' | 'email' | 'meeting' | 'task' | 'status_change' | 'proposal_sent';

export interface LeadActivity {
  id: string;
  leadId: string;
  activityType: LeadActivityType;
  title: string | null;
  description: string | null;
  dueDate: string | null;
  completed: boolean;
  completedAt: string | null;
  createdBy: string | null;
  createdByName: string | null;
  createdAt: Date;
}

export interface Lead {
  id: string;
  clientId: string | null;
  clientName: string | null;
  title: string;
  description: string | null;
  contactName: string | null;
  contactEmail: string | null;
  contactPhone: string | null;
  companyName: string | null;
  source: string | null;
  estimatedValue: number | null;
  currency: string;
  probability: number;
  status: LeadStatus;
  statusChangedAt: Date | null;
  lostReason: string | null;
  expectedCloseDate: string | null;
  actualCloseDate: string | null;
  assignedTo: string | null;
  assignedToName: string | null;
  pnlCenterId: string | null;
  pnlCenterName: string | null;
  notes: string | null;
  dealType: string | null;
  retainerRenewalDate: string | null;
  followUpDate: string | null;
  scopeMonths: number | null;
  minCommitmentMonths: number | null;
  complimentaryHours: number | null;
  orderNumber: string | null;
  clientOrderNumber: string | null;
  ndaUrl: string | null;
  createdBy: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export type ProposalStatus =
  | 'draft'
  | 'sent'
  | 'viewed'
  | 'accepted'
  | 'rejected'
  | 'expired'
  | 'converted';

export interface ProposalItem {
  id: string;
  proposalId: string;
  description: string;
  quantity: number;
  unitPrice: number;
  discountPercent: number;
  total: number;
  sortOrder: number;
}

export interface Proposal {
  id: string;
  leadId: string | null;
  clientId: string | null;
  proposalNumber: string;
  title: string;
  description: string | null;
  issueDate: string;
  validUntil: string | null;
  subtotal: number;
  taxRate: number;
  taxAmount: number;
  discountAmount: number;
  total: number;
  currency: string;
  status: ProposalStatus;
  statusChangedAt: Date | null;
  rejectionReason: string | null;
  convertedToIncomeId: string | null;
  convertedToContractId: string | null;
  convertedAt: Date | null;
  terms: string | null;
  notes: string | null;
  documentUrl: string | null;
  clientName: string | null;
  leadTitle: string | null;
  items: ProposalItem[];
  createdBy: string | null;
  createdAt: Date;
  updatedAt: Date;
}

// =============================================
// Income Contracts & Milestones
// =============================================

export type ContractType = 'project' | 'retainer';
export type ContractStatus = 'active' | 'completed' | 'cancelled' | 'on_hold';
export type MilestoneStatus = 'pending' | 'proforma_issued' | 'invoice_sent' | 'paid' | 'overdue';

export interface IncomeMilestone {
  id: string;
  contractId: string;
  contractTitle: string | null;
  clientName: string | null;
  sortOrder: number;
  description: string;
  amountDue: number;
  currency: string;
  dueDate: string;
  status: MilestoneStatus;
  proformaInvoiceNumber: string | null;
  proformaInvoiceDate: string | null;
  proformaAmount: number | null;
  taxInvoiceNumber: string | null;
  taxInvoiceDate: string | null;
  paymentReceivedDate: string | null;
  paymentMethod: string | null;
  actualAmountPaid: number | null;
  incomeId: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface IncomeContractSummary {
  id: string;
  title: string;
  contractNumber: string | null;
  contractType: ContractType;
  status: ContractStatus;
  clientId: string | null;
  clientName: string | null;
  currency: string;
  totalValue: number;
  totalPaid: number;
  totalOutstanding: number;
  overdueCount: number;
  upcomingCount: number;
  milestoneCount: number;
  paidCount: number;
  startDate: string | null;
  endDate: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface IncomeContract extends IncomeContractSummary {
  proposalId: string | null;
  categoryId: string | null;
  pnlCenterId: string | null;
  vatApplicable: boolean;
  vatPercentage: number | null;
  paymentTermsDays: number;
  retainerMonthlyAmount: number | null;
  retainerBillingDay: number | null;
  notes: string | null;
  tags: string[];
  createdBy: string | null;
  milestones: IncomeMilestone[];
}

export interface MilestoneProjection {
  month: string; // 'YYYY-MM'
  projectedAmount: number;
  milestoneCount: number;
  overdueAmount: number;
}
