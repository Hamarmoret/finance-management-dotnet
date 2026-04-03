import { useState } from 'react';
import { Calendar, ChevronDown } from 'lucide-react';
import { formatDateShort } from '../../../utils/formatters';

export interface DateRange {
  startDate: string;
  endDate: string;
}

interface DateRangeFilterProps {
  value: DateRange;
  onChange: (range: DateRange) => void;
}

const PRESET_RANGES = [
  {
    label: 'This Month',
    getValue: () => {
      const now = new Date();
      const start = new Date(now.getFullYear(), now.getMonth(), 1);
      return {
        startDate: start.toISOString().split('T')[0],
        endDate: now.toISOString().split('T')[0],
      };
    },
  },
  {
    label: 'Last Month',
    getValue: () => {
      const now = new Date();
      const start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const end = new Date(now.getFullYear(), now.getMonth(), 0);
      return {
        startDate: start.toISOString().split('T')[0],
        endDate: end.toISOString().split('T')[0],
      };
    },
  },
  {
    label: 'This Quarter',
    getValue: () => {
      const now = new Date();
      const quarter = Math.floor(now.getMonth() / 3);
      const start = new Date(now.getFullYear(), quarter * 3, 1);
      return {
        startDate: start.toISOString().split('T')[0],
        endDate: now.toISOString().split('T')[0],
      };
    },
  },
  {
    label: 'This Year',
    getValue: () => {
      const now = new Date();
      const start = new Date(now.getFullYear(), 0, 1);
      return {
        startDate: start.toISOString().split('T')[0],
        endDate: now.toISOString().split('T')[0],
      };
    },
  },
  {
    label: 'Last Year',
    getValue: () => {
      const now = new Date();
      const start = new Date(now.getFullYear() - 1, 0, 1);
      const end = new Date(now.getFullYear() - 1, 11, 31);
      return {
        startDate: start.toISOString().split('T')[0],
        endDate: end.toISOString().split('T')[0],
      };
    },
  },
];

export function DateRangeFilter({ value, onChange }: DateRangeFilterProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [showCustom, setShowCustom] = useState(false);
  const [customRange, setCustomRange] = useState(value);

  const handlePresetClick = (preset: typeof PRESET_RANGES[0]) => {
    const range = preset.getValue();
    onChange(range);
    setIsOpen(false);
    setShowCustom(false);
  };

  const handleCustomApply = () => {
    onChange(customRange);
    setIsOpen(false);
    setShowCustom(false);
  };

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-gray-800 border dark:border-gray-700 rounded-lg shadow-sm hover:bg-gray-50 dark:hover:bg-gray-700 dark:text-gray-200"
      >
        <Calendar className="w-4 h-4 text-gray-500 dark:text-gray-400" />
        <span className="text-sm">
          {formatDateShort(value.startDate)} - {formatDateShort(value.endDate)}
        </span>
        <ChevronDown className="w-4 h-4 text-gray-500 dark:text-gray-400" />
      </button>

      {isOpen && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
          <div className="dropdown-menu absolute right-0 mt-2 w-72 z-50">
            {!showCustom ? (
              <div className="p-2">
                {PRESET_RANGES.map((preset) => (
                  <button
                    key={preset.label}
                    onClick={() => handlePresetClick(preset)}
                    className="w-full text-left px-3 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
                  >
                    {preset.label}
                  </button>
                ))}
                <hr className="my-2 dark:border-gray-700" />
                <button
                  onClick={() => setShowCustom(true)}
                  className="w-full text-left px-3 py-2 text-sm text-primary-600 hover:bg-gray-100 rounded"
                >
                  Custom Range...
                </button>
              </div>
            ) : (
              <div className="p-4 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Start Date
                  </label>
                  <input
                    type="date"
                    value={customRange.startDate}
                    onChange={(e) =>
                      setCustomRange({ ...customRange, startDate: e.target.value })
                    }
                    className="input w-full"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    End Date
                  </label>
                  <input
                    type="date"
                    value={customRange.endDate}
                    onChange={(e) =>
                      setCustomRange({ ...customRange, endDate: e.target.value })
                    }
                    className="input w-full"
                  />
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => setShowCustom(false)}
                    className="btn btn-ghost btn-sm flex-1"
                  >
                    Back
                  </button>
                  <button
                    onClick={handleCustomApply}
                    className="btn btn-primary btn-sm flex-1"
                  >
                    Apply
                  </button>
                </div>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
