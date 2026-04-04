import { useState, useEffect } from 'react';
import { RefreshCw, Calendar } from 'lucide-react';
import type { RecurringPattern } from '@finance/shared';

interface RecurringToggleProps {
  isRecurring: boolean;
  pattern: RecurringPattern | null;
  onChange: (isRecurring: boolean, pattern: RecurringPattern | null) => void;
}

const DAYS_OF_WEEK = [
  { value: 0, label: 'Sunday' },
  { value: 1, label: 'Monday' },
  { value: 2, label: 'Tuesday' },
  { value: 3, label: 'Wednesday' },
  { value: 4, label: 'Thursday' },
  { value: 5, label: 'Friday' },
  { value: 6, label: 'Saturday' },
];

export function RecurringToggle({
  isRecurring,
  pattern,
  onChange,
}: RecurringToggleProps) {
  const [frequency, setFrequency] = useState<RecurringPattern['frequency']>(
    pattern?.frequency || 'monthly'
  );
  const [interval, setInterval] = useState<number>(pattern?.interval || 1);
  const [dayOfWeek, setDayOfWeek] = useState<number | undefined>(pattern?.dayOfWeek);
  const [dayOfMonth, setDayOfMonth] = useState<number | undefined>(pattern?.dayOfMonth || 1);
  const [endDate, setEndDate] = useState<string>(pattern?.endDate || '');

  // Update pattern when any field changes
  useEffect(() => {
    if (!isRecurring) {
      return;
    }

    const newPattern: RecurringPattern = {
      frequency,
      interval,
      ...(frequency === 'weekly' && dayOfWeek !== undefined && { dayOfWeek }),
      ...(frequency === 'monthly' && dayOfMonth !== undefined && { dayOfMonth }),
      ...(endDate && { endDate }),
    };

    onChange(true, newPattern);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [frequency, interval, dayOfWeek, dayOfMonth, endDate, isRecurring]);

  const handleToggle = (value: boolean) => {
    if (value) {
      const newPattern: RecurringPattern = {
        frequency,
        interval,
        ...(frequency === 'weekly' && dayOfWeek !== undefined && { dayOfWeek }),
        ...(frequency === 'monthly' && dayOfMonth !== undefined && { dayOfMonth }),
        ...(endDate && { endDate }),
      };
      onChange(true, newPattern);
    } else {
      onChange(false, null);
    }
  };

  return (
    <div className="space-y-4">
      {/* Toggle */}
      <div className="flex items-center gap-4">
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="radio"
            name="recurring"
            checked={!isRecurring}
            onChange={() => handleToggle(false)}
            className="w-4 h-4 text-primary-600 border-gray-300 focus:ring-primary-500"
          />
          <span className="text-sm text-gray-700 dark:text-gray-300">One-time</span>
        </label>
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="radio"
            name="recurring"
            checked={isRecurring}
            onChange={() => handleToggle(true)}
            className="w-4 h-4 text-primary-600 border-gray-300 focus:ring-primary-500"
          />
          <span className="text-sm text-gray-700 dark:text-gray-300 flex items-center gap-1">
            <RefreshCw className="w-3.5 h-3.5" />
            Recurring
          </span>
        </label>
      </div>

      {/* Pattern Editor */}
      {isRecurring && (
        <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            {/* Frequency */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Frequency
              </label>
              <select
                value={frequency}
                onChange={(e) => setFrequency(e.target.value as RecurringPattern['frequency'])}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              >
                <option value="daily">Daily</option>
                <option value="weekly">Weekly</option>
                <option value="monthly">Monthly</option>
                <option value="yearly">Yearly</option>
              </select>
            </div>

            {/* Interval */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Every
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min={1}
                  max={365}
                  value={interval}
                  onChange={(e) => setInterval(Math.max(1, parseInt(e.target.value) || 1))}
                  className="w-20 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                />
                <span className="text-sm text-gray-600 dark:text-gray-400">
                  {frequency === 'daily' && (interval === 1 ? 'day' : 'days')}
                  {frequency === 'weekly' && (interval === 1 ? 'week' : 'weeks')}
                  {frequency === 'monthly' && (interval === 1 ? 'month' : 'months')}
                  {frequency === 'yearly' && (interval === 1 ? 'year' : 'years')}
                </span>
              </div>
            </div>
          </div>

          {/* Day of Week (for weekly) */}
          {frequency === 'weekly' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Day of Week
              </label>
              <select
                value={dayOfWeek ?? 1}
                onChange={(e) => setDayOfWeek(parseInt(e.target.value))}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              >
                {DAYS_OF_WEEK.map((day) => (
                  <option key={day.value} value={day.value}>
                    {day.label}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Day of Month (for monthly) */}
          {frequency === 'monthly' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Day of Month
              </label>
              <select
                value={dayOfMonth ?? 1}
                onChange={(e) => setDayOfMonth(parseInt(e.target.value))}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              >
                {Array.from({ length: 31 }, (_, i) => i + 1).map((day) => (
                  <option key={day} value={day}>
                    {day}
                    {day === 1 ? 'st' : day === 2 ? 'nd' : day === 3 ? 'rd' : 'th'}
                  </option>
                ))}
                <option value={-1}>Last day of month</option>
              </select>
            </div>
          )}

          {/* End Date (optional) */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              End Date <span className="text-gray-400 dark:text-gray-500 font-normal">(optional)</span>
            </label>
            <div className="relative">
              <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full pl-10 pr-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              />
            </div>
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              Leave empty for no end date
            </p>
          </div>

          {/* Summary */}
          <div className="bg-white dark:bg-gray-700 rounded-lg p-3 border border-gray-200 dark:border-gray-600">
            <p className="text-sm text-gray-600 dark:text-gray-300">
              <span className="font-medium text-gray-900 dark:text-white">Repeats: </span>
              {interval === 1 ? '' : `Every ${interval} `}
              {frequency === 'daily' && (interval === 1 ? 'Every day' : 'days')}
              {frequency === 'weekly' &&
                (interval === 1 ? `Every ${DAYS_OF_WEEK.find((d) => d.value === (dayOfWeek ?? 1))?.label}` : `weeks on ${DAYS_OF_WEEK.find((d) => d.value === (dayOfWeek ?? 1))?.label}`)}
              {frequency === 'monthly' &&
                (interval === 1
                  ? `Every month on the ${dayOfMonth === -1 ? 'last day' : `${dayOfMonth}${dayOfMonth === 1 ? 'st' : dayOfMonth === 2 ? 'nd' : dayOfMonth === 3 ? 'rd' : 'th'}`}`
                  : `months on the ${dayOfMonth === -1 ? 'last day' : `${dayOfMonth}${dayOfMonth === 1 ? 'st' : dayOfMonth === 2 ? 'nd' : dayOfMonth === 3 ? 'rd' : 'th'}`}`)}
              {frequency === 'yearly' && (interval === 1 ? 'Every year' : 'years')}
              {endDate && ` until ${new Date(endDate).toLocaleDateString('en-GB')}`}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
