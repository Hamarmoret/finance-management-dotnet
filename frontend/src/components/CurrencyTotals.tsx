import { useState, useEffect } from 'react';
import { formatCurrency } from '../utils/formatters';
import {
  SUPPORTED_CURRENCIES,
  SupportedCurrency,
  getPreferredCurrency,
  setPreferredCurrency,
  convertTotals,
} from '../services/currencyService';

interface CurrencyTotalsProps {
  /** Map of currency code → raw total, e.g. { ILS: 5000, USD: 200 } */
  totals: Record<string, number>;
  /** Label shown before each per-currency amount, e.g. "Page Total" */
  label?: string;
  /** CSS classes for the amount text */
  amountClassName?: string;
}

/**
 * Renders:
 * 1. One "Page Total (ILS): ₪X" per currency in `totals`
 * 2. A "Combined in [selector]:" row that converts everything via live rates
 */
export function CurrencyTotals({
  totals,
  label = 'Page Total',
  amountClassName = 'text-xl font-bold text-gray-900 dark:text-white',
}: CurrencyTotalsProps) {
  const [preferred, setPreferred] = useState<SupportedCurrency>(getPreferredCurrency);
  const [converted, setConverted] = useState<number | null>(null);
  const [converting, setConverting] = useState(false);

  useEffect(() => {
    const currencies = Object.keys(totals);
    if (currencies.length === 0) { setConverted(0); return; }
    // If all amounts are already in the preferred currency, no need to call API
    if (currencies.length === 1 && currencies[0] === preferred) {
      setConverted(Object.values(totals)[0]!);
      return;
    }
    setConverting(true);
    convertTotals(totals, preferred)
      .then(v => setConverted(v))
      .finally(() => setConverting(false));
  }, [totals, preferred]);

  const handleCurrencyChange = (c: SupportedCurrency) => {
    setPreferredCurrency(c);
    setPreferred(c);
  };

  const entries = Object.entries(totals);

  return (
    <>
      {/* Per-currency breakdowns */}
      {entries.map(([cur, amt]) => (
        <div key={cur}>
          <p className="text-sm text-gray-500 dark:text-gray-400">{label} ({cur})</p>
          <p className={amountClassName}>{formatCurrency(amt, cur)}</p>
        </div>
      ))}

      {/* Combined total with currency picker */}
      {entries.length > 0 && (
        <div className="border-l border-gray-200 dark:border-gray-700 pl-6">
          <div className="flex items-center gap-2 mb-1">
            <p className="text-sm text-gray-500 dark:text-gray-400">Combined in</p>
            <select
              value={preferred}
              onChange={e => handleCurrencyChange(e.target.value as SupportedCurrency)}
              className="text-xs border border-gray-300 dark:border-gray-600 rounded px-1.5 py-0.5 bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200"
            >
              {SUPPORTED_CURRENCIES.map(c => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>
          <p className={amountClassName}>
            {converting || converted === null
              ? <span className="text-base text-gray-400">…</span>
              : formatCurrency(converted, preferred)}
          </p>
          <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">≈ at current rates</p>
        </div>
      )}
    </>
  );
}
