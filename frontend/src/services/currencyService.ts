// Exchange rates cached in memory for 1 hour.
// Uses Frankfurter (https://www.frankfurter.app) — free, no API key required.

const SUPPORTED = ['ILS', 'USD', 'EUR', 'GBP'] as const;
export type SupportedCurrency = typeof SUPPORTED[number];

interface RateCache {
  rates: Record<string, number>; // amount of currency X per 1 USD
  timestamp: number;
}

let cache: RateCache | null = null;
const CACHE_TTL = 60 * 60 * 1000; // 1 hour

/** Returns rates where each value = how many of that currency per 1 USD. */
async function fetchRates(): Promise<Record<string, number>> {
  if (cache && Date.now() - cache.timestamp < CACHE_TTL) return cache.rates;

  try {
    const res = await fetch(
      `https://api.frankfurter.app/latest?from=USD&to=ILS,EUR,GBP`
    );
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    const rates: Record<string, number> = { USD: 1, ...data.rates };
    cache = { rates, timestamp: Date.now() };
    return rates;
  } catch {
    // Fall back to hardcoded approximations so the UI doesn't break
    const fallback: Record<string, number> = { USD: 1, ILS: 3.7, EUR: 0.92, GBP: 0.79 };
    cache = { rates: fallback, timestamp: Date.now() - CACHE_TTL + 5 * 60 * 1000 }; // retry in 5 min
    return fallback;
  }
}

/**
 * Convert `amount` from `fromCurrency` to `toCurrency` using live rates.
 * Returns the converted amount.
 */
export async function convertAmount(
  amount: number,
  fromCurrency: string,
  toCurrency: string
): Promise<number> {
  if (fromCurrency === toCurrency) return amount;
  const rates = await fetchRates();
  const fromRate = rates[fromCurrency] ?? 1; // price in fromCurrency per 1 USD
  const toRate = rates[toCurrency] ?? 1;     // price in toCurrency per 1 USD
  // amount / fromRate = amount in USD; * toRate = amount in toCurrency
  return (amount / fromRate) * toRate;
}

/**
 * Convert a map of { currency → total } into a single total in `toCurrency`.
 */
export async function convertTotals(
  totals: Record<string, number>,
  toCurrency: string
): Promise<number> {
  const rates = await fetchRates();
  const toRate = rates[toCurrency] ?? 1;
  let sum = 0;
  for (const [cur, amt] of Object.entries(totals)) {
    const fromRate = rates[cur] ?? 1;
    sum += (amt / fromRate) * toRate;
  }
  return sum;
}

export const SUPPORTED_CURRENCIES: SupportedCurrency[] = ['ILS', 'USD', 'EUR', 'GBP'];

const PREF_KEY = 'preferredCurrency';

export function getPreferredCurrency(): SupportedCurrency {
  const stored = localStorage.getItem(PREF_KEY);
  if (stored && SUPPORTED_CURRENCIES.includes(stored as SupportedCurrency)) {
    return stored as SupportedCurrency;
  }
  return 'ILS';
}

export function setPreferredCurrency(currency: SupportedCurrency): void {
  localStorage.setItem(PREF_KEY, currency);
}
