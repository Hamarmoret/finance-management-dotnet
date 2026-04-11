import { useState, useEffect } from 'react';
import { Calendar } from 'lucide-react';

type Preset = '1W' | '1M' | '3M' | '6M' | '1Y' | 'All';

interface PeriodSelectorProps {
  startDate: string;
  endDate: string;
  onChange: (startDate: string, endDate: string) => void;
  className?: string;
}

function getPresetDates(preset: Preset): { start: string; end: string } {
  if (preset === 'All') return { start: '', end: '' };
  const now = new Date();
  if (preset === '1W') {
    const start = new Date(now);
    start.setDate(now.getDate() - 6);
    return {
      start: start.toISOString().split('T')[0],
      end: now.toISOString().split('T')[0],
    };
  }
  const months = preset === '1M' ? 1 : preset === '3M' ? 3 : preset === '6M' ? 6 : 12;
  const start = new Date(now.getFullYear(), now.getMonth() - months + 1, 1);
  return {
    start: start.toISOString().split('T')[0],
    end: now.toISOString().split('T')[0],
  };
}

function matchPreset(startDate: string, endDate: string): Preset | null {
  for (const p of ['1W', '1M', '3M', '6M', '1Y', 'All'] as Preset[]) {
    const { start, end } = getPresetDates(p);
    if (start === startDate && end === endDate) return p;
  }
  return null;
}

export function getPeriodLabel(startDate: string, endDate: string): string {
  const preset = matchPreset(startDate, endDate);
  if (preset === 'All') return 'All time';
  if (preset === '1W') return 'Last 7 days';
  if (preset === '1M') return 'Last month';
  if (preset === '3M') return 'Last 3 months';
  if (preset === '6M') return 'Last 6 months';
  if (preset === '1Y') return 'Last 12 months';
  if (startDate && endDate) return `${startDate} – ${endDate}`;
  if (startDate) return `From ${startDate}`;
  if (endDate) return `Until ${endDate}`;
  return 'All time';
}

export function PeriodSelector({ startDate, endDate, onChange, className = '' }: PeriodSelectorProps) {
  const [customMode, setCustomMode] = useState(false);

  // If external state changes to a known preset, exit custom mode
  useEffect(() => {
    if (matchPreset(startDate, endDate) !== null) {
      setCustomMode(false);
    }
  }, [startDate, endDate]);

  const activePreset = !customMode ? matchPreset(startDate, endDate) : null;

  const handlePreset = (preset: Preset) => {
    setCustomMode(false);
    const { start, end } = getPresetDates(preset);
    onChange(start, end);
  };

  const handleCustom = () => {
    if (customMode) return;
    setCustomMode(true);
    // Seed inputs with the current dates so they appear pre-filled
    // If dates match a preset exactly, keep them — user can adjust
  };

  return (
    <div className={`flex items-center gap-2 flex-wrap ${className}`}>
      {/* Preset buttons */}
      <div className="flex rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden text-xs font-medium">
        {(['1W', '1M', '3M', '6M', '1Y', 'All'] as Preset[]).map(tf => (
          <button
            key={tf}
            type="button"
            onClick={() => handlePreset(tf)}
            className={`px-3 py-1.5 transition-colors ${
              activePreset === tf
                ? 'bg-primary-600 text-white'
                : 'text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
            }`}
          >
            {tf}
          </button>
        ))}
        <button
          type="button"
          onClick={handleCustom}
          className={`px-3 py-1.5 transition-colors flex items-center gap-1 ${
            customMode
              ? 'bg-primary-600 text-white'
              : 'text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
          }`}
        >
          <Calendar className="w-3 h-3" />
          Custom
        </button>
      </div>

      {/* Custom date inputs — shown only in custom mode */}
      {customMode && (
        <div className="flex items-center gap-1.5">
          <input
            type="date"
            value={startDate}
            onChange={e => onChange(e.target.value, endDate)}
            className="px-2 py-1.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-xs focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
          />
          <span className="text-xs text-gray-400 dark:text-gray-500">–</span>
          <input
            type="date"
            value={endDate}
            min={startDate || undefined}
            onChange={e => onChange(startDate, e.target.value)}
            className="px-2 py-1.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-xs focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
          />
        </div>
      )}
    </div>
  );
}
