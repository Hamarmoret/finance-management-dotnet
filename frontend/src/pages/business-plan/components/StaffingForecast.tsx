import { Plus, Users, TrendingUp, AlertTriangle } from 'lucide-react';
import { PlanStaffing, PlanDriver } from '@finance/shared';

interface StaffingForecastProps {
  staffingRules: PlanStaffing[];
  drivers: PlanDriver[];
  onAddRule?: () => void;
  onEditRule?: (rule: PlanStaffing) => void;
  onDeleteRule?: (ruleId: string) => void;
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

interface StaffingNeed {
  rule: PlanStaffing;
  triggerValue: number;
  requiredCount: number;
  newHires: number;
  monthlyStaffingCost: number;
  annualStaffingCost: number;
}

export function StaffingForecast({
  staffingRules,
  drivers,
  onAddRule,
  onEditRule,
  onDeleteRule,
}: StaffingForecastProps) {
  // Calculate staffing needs based on current driver values
  const staffingNeeds: StaffingNeed[] = staffingRules.map((rule) => {
    // Find trigger driver value
    const triggerDriver = drivers.find((d) => d.code === rule.triggerDriverCode);
    const triggerValue = triggerDriver?.value || 0;

    // Calculate required headcount using ceiling division
    const requiredCount = triggerValue > 0 ? Math.ceil(triggerValue / rule.triggerThreshold) : 0;

    // Calculate new hires needed
    const newHires = Math.max(0, requiredCount - rule.currentHeadcount);

    // Calculate costs
    const annualCostPerPerson = rule.salaryAnnual * (1 + rule.benefitsPct);
    const annualStaffingCost = requiredCount * annualCostPerPerson;
    const monthlyStaffingCost = annualStaffingCost / 12;

    return {
      rule,
      triggerValue,
      requiredCount,
      newHires,
      monthlyStaffingCost,
      annualStaffingCost,
    };
  });

  // Calculate totals
  const totalCurrentHeadcount = staffingRules.reduce((sum, r) => sum + r.currentHeadcount, 0);
  const totalRequiredHeadcount = staffingNeeds.reduce((sum, n) => sum + n.requiredCount, 0);
  const totalNewHires = staffingNeeds.reduce((sum, n) => sum + n.newHires, 0);
  const totalMonthlyStaffingCost = staffingNeeds.reduce((sum, n) => sum + n.monthlyStaffingCost, 0);
  const totalAnnualStaffingCost = staffingNeeds.reduce((sum, n) => sum + n.annualStaffingCost, 0);

  if (staffingRules.length === 0) {
    return (
      <div className="card card-body text-center py-12">
        <Users className="w-12 h-12 text-gray-400 mx-auto mb-4" />
        <h2 className="text-lg font-semibold text-gray-900">No Staffing Rules</h2>
        <p className="text-gray-600 mt-2 mb-4">
          Define staffing rules to automatically calculate hiring needs based on business metrics.
        </p>
        {onAddRule && (
          <button onClick={onAddRule} className="btn btn-primary btn-md mx-auto">
            <Plus className="w-4 h-4 mr-2" />
            Add Staffing Rule
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Staffing Forecast</h2>
          <p className="text-sm text-gray-500">
            Hiring needs calculated based on driver thresholds.
          </p>
        </div>
        {onAddRule && (
          <button onClick={onAddRule} className="btn btn-outline btn-sm">
            <Plus className="w-4 h-4 mr-1" />
            Add Rule
          </button>
        )}
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="card card-body">
          <div className="text-sm text-gray-500">Current Headcount</div>
          <div className="text-2xl font-bold text-gray-900">{totalCurrentHeadcount}</div>
        </div>
        <div className="card card-body">
          <div className="text-sm text-gray-500">Required Headcount</div>
          <div className="text-2xl font-bold text-primary-600">{totalRequiredHeadcount}</div>
        </div>
        <div className="card card-body">
          <div className="text-sm text-gray-500">New Hires Needed</div>
          <div className={`text-2xl font-bold ${totalNewHires > 0 ? 'text-amber-600' : 'text-green-600'}`}>
            {totalNewHires > 0 ? `+${totalNewHires}` : totalNewHires}
          </div>
        </div>
        <div className="card card-body">
          <div className="text-sm text-gray-500">Monthly Staffing Cost</div>
          <div className="text-2xl font-bold text-gray-900">{formatCurrency(totalMonthlyStaffingCost)}</div>
          <div className="text-xs text-gray-500 mt-1">{formatCurrency(totalAnnualStaffingCost)}/year</div>
        </div>
      </div>

      {/* Staffing Rules */}
      <div className="space-y-4">
        {staffingNeeds.map((need) => {
          const { rule, triggerValue, requiredCount, newHires, monthlyStaffingCost } = need;
          const utilizationPercent = (triggerValue / (rule.triggerThreshold * Math.max(requiredCount, 1))) * 100;
          const needsHiring = newHires > 0;

          return (
            <div
              key={rule.id}
              className={`card card-body ${needsHiring ? 'border-l-4 border-l-amber-400' : ''}`}
            >
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <h4 className="font-medium text-gray-900">{rule.roleName}</h4>
                    <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded">
                      {rule.department}
                    </span>
                    {needsHiring && (
                      <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded flex items-center gap-1">
                        <AlertTriangle className="w-3 h-3" />
                        Hiring needed
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-gray-500">
                    1 hire per {rule.triggerThreshold} {rule.triggerDriverCode.replace(/_/g, ' ')}
                  </p>
                </div>
                <div className="text-right">
                  <div className="text-2xl font-bold text-gray-900">{requiredCount}</div>
                  <div className="text-sm text-gray-500">
                    Current: {rule.currentHeadcount}
                    {newHires > 0 && (
                      <span className="text-amber-600 ml-2">+{newHires} to hire</span>
                    )}
                  </div>
                </div>
              </div>

              {/* Visual Threshold Indicator */}
              <div className="mt-4">
                <div className="flex justify-between text-xs text-gray-500 mb-1">
                  <span>0</span>
                  <span>{rule.triggerThreshold}</span>
                  <span>{rule.triggerThreshold * 2}</span>
                  <span>{rule.triggerThreshold * 3}</span>
                </div>
                <div className="h-3 bg-gray-100 rounded-full relative">
                  <div
                    className={`absolute h-full rounded-full transition-all ${
                      needsHiring ? 'bg-amber-500' : 'bg-primary-500'
                    }`}
                    style={{ width: `${Math.min(utilizationPercent, 100)}%` }}
                  />
                  {/* Threshold markers */}
                  {[1, 2].map((i) => (
                    <div
                      key={i}
                      className="absolute h-full w-0.5 bg-gray-300"
                      style={{ left: `${(100 / 3) * i}%` }}
                    />
                  ))}
                </div>
                <div className="flex justify-between items-center mt-2 text-sm">
                  <span className="text-gray-500">
                    Trigger: <strong>{Math.round(triggerValue).toLocaleString()}</strong> {rule.triggerDriverCode.replace(/_/g, ' ')}
                  </span>
                  <span className="text-gray-900 font-medium">
                    {formatCurrency(monthlyStaffingCost)}/mo
                  </span>
                </div>
              </div>

              {/* Cost Details */}
              <div className="mt-4 pt-4 border-t flex items-center justify-between text-sm">
                <div>
                  <span className="text-gray-500">Salary: </span>
                  <span className="font-medium">{formatCurrency(rule.salaryAnnual)}/year</span>
                  <span className="text-gray-500 ml-2">+ {(rule.benefitsPct * 100).toFixed(0)}% benefits</span>
                </div>
                <div className="flex gap-2">
                  {onEditRule && (
                    <button
                      onClick={() => onEditRule(rule)}
                      className="text-primary-600 hover:text-primary-700"
                    >
                      Edit
                    </button>
                  )}
                  {onDeleteRule && (
                    <button
                      onClick={() => onDeleteRule(rule.id)}
                      className="text-gray-400 hover:text-danger-600"
                    >
                      Delete
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Hiring Summary */}
      {totalNewHires > 0 && (
        <div className="card card-body bg-amber-50 border-amber-200">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-amber-100 rounded-full flex items-center justify-center">
              <TrendingUp className="w-5 h-5 text-amber-600" />
            </div>
            <div>
              <h3 className="font-medium text-amber-900">Hiring Action Required</h3>
              <p className="text-sm text-amber-700">
                Based on current metrics, you need to hire {totalNewHires} additional team member{totalNewHires > 1 ? 's' : ''}.
                This will increase monthly staffing costs by approximately {formatCurrency(
                  staffingNeeds.reduce((sum, n) => {
                    const costPerPerson = (n.rule.salaryAnnual * (1 + n.rule.benefitsPct)) / 12;
                    return sum + (n.newHires * costPerPerson);
                  }, 0)
                )}.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
