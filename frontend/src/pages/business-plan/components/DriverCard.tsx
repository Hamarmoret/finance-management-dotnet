import { useState, useEffect } from 'react';
import { PlanDriver, DriverDataType } from '@finance/shared';

interface DriverCardProps {
  driver: PlanDriver;
  onChange: (value: number) => void;
  isLoading?: boolean;
}

function formatDriverValue(value: number, dataType: DriverDataType, unit: string | null): string {
  switch (dataType) {
    case 'currency':
      return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
      }).format(value);
    case 'percentage':
      return `${(value * 100).toFixed(1)}%`;
    case 'integer':
      return Math.round(value).toLocaleString() + (unit ? ` ${unit}` : '');
    default:
      return value.toLocaleString(undefined, { maximumFractionDigits: 2 }) + (unit ? ` ${unit}` : '');
  }
}

function getSliderConfig(dataType: DriverDataType, currentValue: number): { min: number; max: number; step: number } {
  switch (dataType) {
    case 'currency':
      // Dynamic range based on current value
      const magnitude = Math.pow(10, Math.floor(Math.log10(Math.max(currentValue, 100))));
      return {
        min: 0,
        max: Math.max(currentValue * 3, magnitude * 10),
        step: magnitude / 10,
      };
    case 'percentage':
      return { min: 0, max: 1, step: 0.01 };
    case 'integer':
      return {
        min: 0,
        max: Math.max(currentValue * 3, 100),
        step: 1,
      };
    default:
      return {
        min: 0,
        max: Math.max(currentValue * 3, 100),
        step: 0.1,
      };
  }
}

function getCategoryColor(category: string): string {
  switch (category) {
    case 'sales':
      return 'bg-blue-100 text-blue-700';
    case 'operations':
      return 'bg-purple-100 text-purple-700';
    case 'marketing':
      return 'bg-pink-100 text-pink-700';
    case 'hr':
      return 'bg-green-100 text-green-700';
    case 'finance':
      return 'bg-amber-100 text-amber-700';
    case 'product':
      return 'bg-cyan-100 text-cyan-700';
    default:
      return 'bg-gray-100 text-gray-700';
  }
}

export function DriverCard({ driver, onChange, isLoading }: DriverCardProps) {
  const [localValue, setLocalValue] = useState(driver.value);
  const [isDirty, setIsDirty] = useState(false);
  const sliderConfig = getSliderConfig(driver.dataType, driver.value);

  // Sync local value when driver value changes from parent
  useEffect(() => {
    if (!isDirty) {
      setLocalValue(driver.value);
    }
  }, [driver.value, isDirty]);

  const handleSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = parseFloat(e.target.value);
    setLocalValue(newValue);
    setIsDirty(true);
  };

  const handleSliderRelease = () => {
    if (localValue !== driver.value) {
      onChange(localValue);
    }
    setIsDirty(false);
  };

  return (
    <div className={`bg-white rounded-lg border p-4 transition-shadow ${isDirty ? 'ring-2 ring-primary-200' : ''}`}>
      <div className="flex justify-between items-start mb-2">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <h4 className="font-medium text-gray-900">{driver.name}</h4>
            <span className={`text-xs px-1.5 py-0.5 rounded ${getCategoryColor(driver.category)}`}>
              {driver.category}
            </span>
          </div>
          {driver.description && (
            <p className="text-xs text-gray-500">{driver.description}</p>
          )}
        </div>
        <div className="text-right">
          <span className={`text-lg font-bold ${isDirty ? 'text-primary-600' : 'text-gray-900'}`}>
            {formatDriverValue(localValue, driver.dataType, driver.unit)}
          </span>
          {isLoading && (
            <span className="ml-2 animate-spin inline-block w-4 h-4 border-2 border-primary-600 border-t-transparent rounded-full" />
          )}
        </div>
      </div>

      {driver.isEditable && (
        <div className="mt-3">
          <input
            type="range"
            min={sliderConfig.min}
            max={sliderConfig.max}
            step={sliderConfig.step}
            value={localValue}
            onChange={handleSliderChange}
            onMouseUp={handleSliderRelease}
            onTouchEnd={handleSliderRelease}
            className="w-full h-2 bg-gray-200 rounded-lg cursor-pointer accent-primary-600"
          />
          <div className="flex justify-between text-xs text-gray-400 mt-1">
            <span>{formatDriverValue(sliderConfig.min, driver.dataType, driver.unit)}</span>
            <span>{formatDriverValue(sliderConfig.max, driver.dataType, driver.unit)}</span>
          </div>
        </div>
      )}

      <div className="flex items-center gap-2 mt-2">
        <code className="text-xs bg-gray-50 px-1.5 py-0.5 rounded text-gray-600">{driver.code}</code>
      </div>
    </div>
  );
}
