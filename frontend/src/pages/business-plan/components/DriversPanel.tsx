import { useState } from 'react';
import { Plus, Settings } from 'lucide-react';
import { PlanDriver, DriverCategory } from '@finance/shared';
import { DriverCard } from './DriverCard';

interface DriversPanelProps {
  drivers: PlanDriver[];
  onDriverChange: (driverId: string, value: number) => Promise<void>;
  onAddDriver?: () => void;
}

const CATEGORY_ORDER: DriverCategory[] = ['sales', 'marketing', 'operations', 'hr', 'finance', 'product'];

const CATEGORY_LABELS: Record<DriverCategory, string> = {
  sales: 'Sales Drivers',
  marketing: 'Marketing Drivers',
  operations: 'Operations Drivers',
  hr: 'HR Drivers',
  finance: 'Finance Drivers',
  product: 'Product Drivers',
};

const CATEGORY_ICONS: Record<DriverCategory, string> = {
  sales: '📈',
  marketing: '📢',
  operations: '⚙️',
  hr: '👥',
  finance: '💰',
  product: '🛠️',
};

export function DriversPanel({ drivers, onDriverChange, onAddDriver }: DriversPanelProps) {
  const [loadingDrivers, setLoadingDrivers] = useState<Set<string>>(new Set());

  // Group drivers by category
  const driversByCategory = drivers.reduce<Record<string, PlanDriver[]>>((acc, driver) => {
    const category = driver.category;
    if (!acc[category]) {
      acc[category] = [];
    }
    acc[category]!.push(driver);
    return acc;
  }, {});

  const handleDriverChange = async (driverId: string, value: number) => {
    setLoadingDrivers((prev) => new Set([...prev, driverId]));
    try {
      await onDriverChange(driverId, value);
    } finally {
      setLoadingDrivers((prev) => {
        const next = new Set(prev);
        next.delete(driverId);
        return next;
      });
    }
  };

  if (drivers.length === 0) {
    return (
      <div className="card card-body text-center py-12">
        <Settings className="w-12 h-12 text-gray-400 mx-auto mb-4" />
        <h2 className="text-lg font-semibold text-gray-900">No Drivers Configured</h2>
        <p className="text-gray-600 mt-2 mb-4">
          Add drivers to define key variables for your business plan calculations.
        </p>
        {onAddDriver && (
          <button onClick={onAddDriver} className="btn btn-primary btn-md mx-auto">
            <Plus className="w-4 h-4 mr-2" />
            Add Driver
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Key Drivers</h2>
          <p className="text-sm text-gray-500">
            Adjust these variables to see how they impact your projections.
          </p>
        </div>
        {onAddDriver && (
          <button onClick={onAddDriver} className="btn btn-outline btn-sm">
            <Plus className="w-4 h-4 mr-1" />
            Add Driver
          </button>
        )}
      </div>

      {CATEGORY_ORDER.map((category) => {
        const categoryDrivers = driversByCategory[category];
        if (!categoryDrivers || categoryDrivers.length === 0) {
          return null;
        }

        return (
          <div key={category} className="space-y-3">
            <h3 className="text-sm font-medium text-gray-700 flex items-center gap-2">
              <span>{CATEGORY_ICONS[category]}</span>
              {CATEGORY_LABELS[category]}
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {categoryDrivers
                .sort((a, b) => a.sortOrder - b.sortOrder)
                .map((driver) => (
                  <DriverCard
                    key={driver.id}
                    driver={driver}
                    onChange={(value) => handleDriverChange(driver.id, value)}
                    isLoading={loadingDrivers.has(driver.id)}
                  />
                ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
