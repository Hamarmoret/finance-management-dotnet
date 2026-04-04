import { format, parseISO } from 'date-fns';

// Date format constants - using d/m/y (UK) format
const DATE_FORMAT = 'dd/MM/yyyy';
const DATE_FORMAT_SHORT = 'd MMM';
const DATE_FORMAT_MONTH_YEAR = 'MMM yyyy';
const DATETIME_FORMAT = 'dd/MM/yyyy HH:mm';

/**
 * Format a date string or Date object to d/m/y format (e.g., 15/01/2025)
 * @param dateInput - ISO date string (YYYY-MM-DD), Date object, or null/undefined
 * @returns Formatted date string or dash if no date
 */
export function formatDate(dateInput: string | Date | null | undefined): string {
  if (!dateInput) return '—';
  try {
    const date = typeof dateInput === 'string' ? parseISO(dateInput) : dateInput;
    return format(date, DATE_FORMAT);
  } catch {
    return '—';
  }
}

/**
 * Format a date string or Date object to short format (e.g., 15 Jan)
 * @param dateInput - ISO date string (YYYY-MM-DD) or Date object
 * @returns Formatted short date string
 */
export function formatDateShort(dateInput: string | Date | null | undefined): string {
  if (!dateInput) return '—';
  try {
    const date = typeof dateInput === 'string' ? parseISO(dateInput) : dateInput;
    return format(date, DATE_FORMAT_SHORT);
  } catch {
    return '—';
  }
}

/**
 * Format a date string or Date object to month/year format (e.g., Jan 2025)
 * @param dateInput - ISO date string (YYYY-MM-DD) or Date object
 * @returns Formatted month/year string
 */
export function formatMonthYear(dateInput: string | Date | null | undefined): string {
  if (!dateInput) return '—';
  try {
    const date = typeof dateInput === 'string' ? parseISO(dateInput) : dateInput;
    return format(date, DATE_FORMAT_MONTH_YEAR);
  } catch {
    return '—';
  }
}

/**
 * Format a date string to datetime format (e.g., 15/01/2025 14:30)
 * @param dateStr - ISO datetime string
 * @returns Formatted datetime string
 */
export function formatDateTime(dateStr: string | Date | null | undefined): string {
  if (!dateStr) return '—';
  try {
    const date = typeof dateStr === 'string' ? parseISO(dateStr) : dateStr;
    return format(date, DATETIME_FORMAT);
  } catch {
    return '—';
  }
}

/**
 * Format a number as currency
 * @param amount - The amount to format
 * @param currency - The currency code (default: USD)
 * @returns Formatted currency string
 */
export function formatCurrency(amount: number, currency = 'USD'): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    currencyDisplay: 'narrowSymbol',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

/**
 * Format a number as currency with decimals
 * @param amount - The amount to format
 * @param currency - The currency code (default: USD)
 * @returns Formatted currency string with 2 decimal places
 */
export function formatCurrencyPrecise(amount: number, currency = 'USD'): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    currencyDisplay: 'narrowSymbol',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

/**
 * Format a number as a percentage
 * @param value - The value to format (0-100 or 0-1)
 * @param decimals - Number of decimal places (default: 1)
 * @returns Formatted percentage string
 */
export function formatPercentage(value: number, decimals = 1): string {
  // If value is between 0 and 1, multiply by 100
  const pct = value <= 1 && value >= -1 && value !== 0 ? value * 100 : value;
  return `${pct.toFixed(decimals)}%`;
}

/**
 * Format a number with thousand separators
 * @param value - The number to format
 * @returns Formatted number string
 */
export function formatNumber(value: number): string {
  return new Intl.NumberFormat('en-GB').format(value);
}
