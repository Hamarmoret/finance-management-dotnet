// =============================================
// User Roles & Permissions
// =============================================

export const USER_ROLES = {
  ADMIN: 'admin',
  MANAGER: 'manager',
  VIEWER: 'viewer',
} as const;

export const PERMISSION_LEVELS = {
  VIEW: 'view',
  EDIT: 'edit',
  ADMIN: 'admin',
} as const;

// Role hierarchy for permission checks
export const ROLE_HIERARCHY: Record<string, number> = {
  admin: 3,
  manager: 2,
  viewer: 1,
};

// =============================================
// Expense Categories
// =============================================

export const EXPENSE_CATEGORY_TYPES = {
  FIXED: 'fixed',
  VARIABLE: 'variable',
  SALARY: 'salary',
  ONE_TIME: 'one_time',
} as const;

export const DEFAULT_EXPENSE_CATEGORIES = [
  { name: 'Rent', type: 'fixed' },
  { name: 'Utilities', type: 'variable' },
  { name: 'Insurance', type: 'fixed' },
  { name: 'Software Subscriptions', type: 'fixed' },
  { name: 'Marketing', type: 'variable' },
  { name: 'Office Supplies', type: 'variable' },
  { name: 'Travel', type: 'variable' },
  { name: 'Professional Services', type: 'variable' },
  { name: 'Salaries', type: 'salary' },
  { name: 'Contractor Payments', type: 'salary' },
  { name: 'Equipment', type: 'one_time' },
  { name: 'Other', type: 'one_time' },
] as const;

// =============================================
// Income Categories
// =============================================

export const INCOME_CATEGORY_TYPES = {
  RETAINER: 'retainer',
  PROJECT: 'project',
  OTHER: 'other',
} as const;

export const DEFAULT_INCOME_CATEGORIES = [
  { name: 'Monthly Retainer', type: 'retainer' },
  { name: 'Project Fee', type: 'project' },
  { name: 'Consulting', type: 'project' },
  { name: 'Milestone Payment', type: 'project' },
  { name: 'Other Revenue', type: 'other' },
] as const;

// =============================================
// Invoice Status
// =============================================

export const INVOICE_STATUS = {
  DRAFT: 'draft',
  SENT: 'sent',
  PAID: 'paid',
  OVERDUE: 'overdue',
  CANCELLED: 'cancelled',
} as const;

export const INVOICE_STATUS_LABELS: Record<string, string> = {
  draft: 'Draft',
  sent: 'Sent',
  paid: 'Paid',
  overdue: 'Overdue',
  cancelled: 'Cancelled',
};

// =============================================
// Recurring Frequencies
// =============================================

export const RECURRING_FREQUENCIES = {
  DAILY: 'daily',
  WEEKLY: 'weekly',
  MONTHLY: 'monthly',
  YEARLY: 'yearly',
} as const;

export const RECURRING_FREQUENCY_LABELS: Record<string, string> = {
  daily: 'Daily',
  weekly: 'Weekly',
  monthly: 'Monthly',
  yearly: 'Yearly',
};

// =============================================
// Currency
// =============================================

export const DEFAULT_CURRENCY = 'USD';

export const SUPPORTED_CURRENCIES = [
  { code: 'USD', name: 'US Dollar', symbol: '$' },
  { code: 'EUR', name: 'Euro', symbol: '€' },
  { code: 'GBP', name: 'British Pound', symbol: '£' },
  { code: 'ILS', name: 'Israeli Shekel', symbol: '₪' },
  { code: 'CAD', name: 'Canadian Dollar', symbol: 'C$' },
  { code: 'AUD', name: 'Australian Dollar', symbol: 'A$' },
] as const;

// =============================================
// Pagination
// =============================================

export const DEFAULT_PAGE_SIZE = 20;
export const MAX_PAGE_SIZE = 100;

// =============================================
// Date Formats
// =============================================

export const DATE_FORMAT = 'yyyy-MM-dd';
export const DATETIME_FORMAT = 'yyyy-MM-dd HH:mm:ss';
export const DISPLAY_DATE_FORMAT = 'MMM d, yyyy';
export const DISPLAY_DATETIME_FORMAT = 'MMM d, yyyy h:mm a';

// =============================================
// API Endpoints
// =============================================

export const API_ENDPOINTS = {
  // Auth
  AUTH_LOGIN: '/auth/login',
  AUTH_REGISTER: '/auth/register',
  AUTH_REFRESH: '/auth/refresh',
  AUTH_LOGOUT: '/auth/logout',
  AUTH_MFA_SETUP: '/auth/mfa/setup',
  AUTH_MFA_VERIFY: '/auth/mfa/verify',
  AUTH_MFA_DISABLE: '/auth/mfa/disable',

  // Users
  USERS: '/users',
  USERS_ME: '/users/me',

  // P&L Centers
  PNL_CENTERS: '/pnl-centers',

  // Expenses
  EXPENSES: '/expenses',
  EXPENSE_CATEGORIES: '/expense-categories',

  // Income
  INCOME: '/income',
  INCOME_CATEGORIES: '/income-categories',

  // Recurring
  RECURRING: '/recurring',

  // Analytics
  ANALYTICS_SUMMARY: '/analytics/summary',
  ANALYTICS_MONTHLY: '/analytics/monthly-report',
  ANALYTICS_COMPARISON: '/analytics/comparison',
  ANALYTICS_FORECAST: '/analytics/forecast',
  ANALYTICS_TRENDS: '/analytics/trends',

  // Integrations
  INTEGRATIONS: '/integrations',
} as const;

// =============================================
// Error Codes
// =============================================

export const ERROR_CODES = {
  // Auth errors
  INVALID_CREDENTIALS: 'INVALID_CREDENTIALS',
  USER_NOT_FOUND: 'USER_NOT_FOUND',
  USER_INACTIVE: 'USER_INACTIVE',
  EMAIL_EXISTS: 'EMAIL_EXISTS',
  INVALID_TOKEN: 'INVALID_TOKEN',
  TOKEN_EXPIRED: 'TOKEN_EXPIRED',
  MFA_REQUIRED: 'MFA_REQUIRED',
  MFA_INVALID: 'MFA_INVALID',
  MFA_ALREADY_ENABLED: 'MFA_ALREADY_ENABLED',
  PASSWORD_TOO_WEAK: 'PASSWORD_TOO_WEAK',
  PASSWORD_RECENTLY_USED: 'PASSWORD_RECENTLY_USED',

  // Authorization errors
  UNAUTHORIZED: 'UNAUTHORIZED',
  FORBIDDEN: 'FORBIDDEN',
  INSUFFICIENT_PERMISSIONS: 'INSUFFICIENT_PERMISSIONS',

  // Validation errors
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  INVALID_INPUT: 'INVALID_INPUT',

  // Resource errors
  NOT_FOUND: 'NOT_FOUND',
  CONFLICT: 'CONFLICT',
  ALREADY_EXISTS: 'ALREADY_EXISTS',

  // Rate limiting
  RATE_LIMIT_EXCEEDED: 'RATE_LIMIT_EXCEEDED',

  // Server errors
  INTERNAL_ERROR: 'INTERNAL_ERROR',
  DATABASE_ERROR: 'DATABASE_ERROR',
  SERVICE_UNAVAILABLE: 'SERVICE_UNAVAILABLE',
} as const;

// =============================================
// Audit Actions
// =============================================

export const AUDIT_ACTIONS = {
  CREATE: 'create',
  UPDATE: 'update',
  DELETE: 'delete',
  LOGIN: 'login',
  LOGOUT: 'logout',
  MFA_SETUP: 'mfa_setup',
  MFA_VERIFY: 'mfa_verify',
  PASSWORD_CHANGE: 'password_change',
  ROLE_CHANGE: 'role_change',
  PERMISSION_CHANGE: 'permission_change',
} as const;

// =============================================
// Integration Types
// =============================================

export const INTEGRATION_TYPES = {
  MONDAY: 'monday',
  QUICKBOOKS: 'quickbooks',
  FRESHBOOKS: 'freshbooks',
  ZOHO: 'zoho',
} as const;

export const INTEGRATION_LABELS: Record<string, string> = {
  monday: 'Monday.com',
  quickbooks: 'QuickBooks',
  freshbooks: 'FreshBooks',
  zoho: 'Zoho Invoice',
};
