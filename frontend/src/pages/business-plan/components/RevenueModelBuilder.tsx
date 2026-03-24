import { useState, useMemo } from 'react';
import { TrendingUp, Users, DollarSign } from 'lucide-react';
import { PlanRevenueModel, RevenueModelType } from '@finance/shared';

interface RevenueModelBuilderProps {
  models: PlanRevenueModel[];
  scenarioId: string | null;
  onModelsUpdate: (models: Partial<PlanRevenueModel>[]) => Promise<void>;
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

function calculateLeadsBasedRevenue(
  leadsGenerated: number | null,
  conversionRate: number | null,
  averageDealSize: number | null
): number {
  return (leadsGenerated || 0) * (conversionRate || 0) * (averageDealSize || 0);
}

function calculateHeadcountBasedRevenue(
  salesReps: number | null,
  quotaPerRep: number | null,
  quotaAttainment: number | null
): number {
  return (salesReps || 0) * (quotaPerRep || 0) * (quotaAttainment || 0);
}

export function RevenueModelBuilder({ models, scenarioId, onModelsUpdate }: RevenueModelBuilderProps) {
  // Find model for current scenario or first model
  const currentModel = models.find((m) => m.scenarioId === scenarioId) || models[0];
  const [modelType, setModelType] = useState<RevenueModelType>(currentModel?.modelType || 'leads_based');
  const [isUpdating, setIsUpdating] = useState(false);

  // Local state for inputs
  const [leadsGenerated, setLeadsGenerated] = useState(currentModel?.leadsGenerated || 0);
  const [conversionRate, setConversionRate] = useState((currentModel?.conversionRate || 0.15) * 100);
  const [averageDealSize, setAverageDealSize] = useState(currentModel?.averageDealSize || 5000);
  const [salesReps, setSalesReps] = useState(currentModel?.salesReps || 5);
  const [quotaPerRep, setQuotaPerRep] = useState(currentModel?.quotaPerRep || 100000);
  const [quotaAttainment, setQuotaAttainment] = useState((currentModel?.quotaAttainment || 0.85) * 100);
  const [manualRevenue, setManualRevenue] = useState(currentModel?.manualRevenue || 0);

  // Calculate revenue based on model type
  const calculatedRevenue = useMemo(() => {
    if (manualRevenue && manualRevenue > 0) {
      return manualRevenue;
    }
    switch (modelType) {
      case 'leads_based':
        return calculateLeadsBasedRevenue(leadsGenerated, conversionRate / 100, averageDealSize);
      case 'headcount_based':
        return calculateHeadcountBasedRevenue(salesReps, quotaPerRep, quotaAttainment / 100);
      default:
        return 0;
    }
  }, [modelType, leadsGenerated, conversionRate, averageDealSize, salesReps, quotaPerRep, quotaAttainment, manualRevenue]);

  const handleSave = async () => {
    setIsUpdating(true);
    try {
      // Create a basic model structure
      const modelData: Partial<PlanRevenueModel> = {
        modelType,
        scenarioId,
        periodStart: currentModel?.periodStart || new Date().toISOString().slice(0, 10),
        periodEnd: currentModel?.periodEnd || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
      };

      if (modelType === 'leads_based') {
        modelData.leadsGenerated = leadsGenerated;
        modelData.conversionRate = conversionRate / 100;
        modelData.averageDealSize = averageDealSize;
      } else if (modelType === 'headcount_based') {
        modelData.salesReps = salesReps;
        modelData.quotaPerRep = quotaPerRep;
        modelData.quotaAttainment = quotaAttainment / 100;
      }

      if (manualRevenue > 0) {
        modelData.manualRevenue = manualRevenue;
      }

      await onModelsUpdate([modelData]);
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Revenue Modeling</h2>
          <p className="text-sm text-gray-500">
            Build your revenue projection using bottom-up calculations.
          </p>
        </div>
      </div>

      {/* Model Type Selector */}
      <div className="flex gap-4 p-4 bg-gray-50 rounded-lg">
        <button
          className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-lg border-2 transition-all ${
            modelType === 'leads_based'
              ? 'border-primary-500 bg-primary-50 text-primary-700'
              : 'border-gray-200 bg-white hover:border-gray-300'
          }`}
          onClick={() => setModelType('leads_based')}
        >
          <TrendingUp className="w-5 h-5" />
          <span className="font-medium">Leads-Based</span>
        </button>
        <button
          className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-lg border-2 transition-all ${
            modelType === 'headcount_based'
              ? 'border-primary-500 bg-primary-50 text-primary-700'
              : 'border-gray-200 bg-white hover:border-gray-300'
          }`}
          onClick={() => setModelType('headcount_based')}
        >
          <Users className="w-5 h-5" />
          <span className="font-medium">Headcount-Based</span>
        </button>
      </div>

      {/* Input Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {modelType === 'leads_based' ? (
          <>
            <div className="card card-body">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                📥 Leads Generated
              </label>
              <input
                type="number"
                value={leadsGenerated}
                onChange={(e) => setLeadsGenerated(parseInt(e.target.value) || 0)}
                className="input input-bordered w-full"
                placeholder="Monthly leads"
              />
              <p className="text-xs text-gray-500 mt-1">Number of new leads per month</p>
            </div>
            <div className="card card-body">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                🎯 Conversion Rate
              </label>
              <div className="relative">
                <input
                  type="number"
                  value={conversionRate}
                  onChange={(e) => setConversionRate(parseFloat(e.target.value) || 0)}
                  className="input input-bordered w-full pr-8"
                  placeholder="15"
                  step="0.1"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500">%</span>
              </div>
              <p className="text-xs text-gray-500 mt-1">Lead-to-customer conversion rate</p>
            </div>
            <div className="card card-body">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                💰 Avg Deal Size
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">$</span>
                <input
                  type="number"
                  value={averageDealSize}
                  onChange={(e) => setAverageDealSize(parseFloat(e.target.value) || 0)}
                  className="input input-bordered w-full pl-8"
                  placeholder="5000"
                />
              </div>
              <p className="text-xs text-gray-500 mt-1">Average revenue per deal</p>
            </div>
          </>
        ) : (
          <>
            <div className="card card-body">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                👥 Sales Reps
              </label>
              <input
                type="number"
                value={salesReps}
                onChange={(e) => setSalesReps(parseInt(e.target.value) || 0)}
                className="input input-bordered w-full"
                placeholder="Number of reps"
              />
              <p className="text-xs text-gray-500 mt-1">Number of sales representatives</p>
            </div>
            <div className="card card-body">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                🎯 Quota per Rep
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">$</span>
                <input
                  type="number"
                  value={quotaPerRep}
                  onChange={(e) => setQuotaPerRep(parseFloat(e.target.value) || 0)}
                  className="input input-bordered w-full pl-8"
                  placeholder="100000"
                />
              </div>
              <p className="text-xs text-gray-500 mt-1">Annual quota per salesperson</p>
            </div>
            <div className="card card-body">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                📊 Quota Attainment
              </label>
              <div className="relative">
                <input
                  type="number"
                  value={quotaAttainment}
                  onChange={(e) => setQuotaAttainment(parseFloat(e.target.value) || 0)}
                  className="input input-bordered w-full pr-8"
                  placeholder="85"
                  step="1"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500">%</span>
              </div>
              <p className="text-xs text-gray-500 mt-1">Expected attainment rate</p>
            </div>
          </>
        )}
      </div>

      {/* Calculated Revenue Display */}
      <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl p-6">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-sm text-gray-600 mb-1">Calculated Monthly Revenue</div>
            <div className="text-4xl font-bold text-green-700">{formatCurrency(calculatedRevenue)}</div>
            <div className="text-sm text-gray-500 mt-2">
              {modelType === 'leads_based' ? (
                <>
                  = {leadsGenerated.toLocaleString()} leads × {conversionRate}% × {formatCurrency(averageDealSize)}
                </>
              ) : (
                <>
                  = {salesReps} reps × {formatCurrency(quotaPerRep)} × {quotaAttainment}%
                </>
              )}
            </div>
          </div>
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
            <DollarSign className="w-8 h-8 text-green-600" />
          </div>
        </div>

        {/* Annual Projection */}
        <div className="mt-4 pt-4 border-t border-green-200">
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-600">Annualized Revenue</span>
            <span className="text-xl font-bold text-green-700">{formatCurrency(calculatedRevenue * 12)}</span>
          </div>
        </div>
      </div>

      {/* Manual Override */}
      <div className="card card-body bg-gray-50">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-medium text-gray-900">Manual Override</h3>
            <p className="text-sm text-gray-500">Set a specific revenue value to override the calculation</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">$</span>
              <input
                type="number"
                value={manualRevenue || ''}
                onChange={(e) => setManualRevenue(parseFloat(e.target.value) || 0)}
                className="input input-bordered w-40 pl-8"
                placeholder="0"
              />
            </div>
            {manualRevenue > 0 && (
              <button
                onClick={() => setManualRevenue(0)}
                className="text-sm text-gray-500 hover:text-gray-700"
              >
                Clear
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Save Button */}
      <div className="flex justify-end">
        <button
          onClick={handleSave}
          disabled={isUpdating}
          className="btn btn-primary btn-md"
        >
          {isUpdating ? (
            <>
              <span className="animate-spin inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full mr-2" />
              Saving...
            </>
          ) : (
            'Save Revenue Model'
          )}
        </button>
      </div>
    </div>
  );
}
