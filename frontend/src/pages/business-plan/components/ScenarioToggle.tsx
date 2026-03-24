import { PlanScenario } from '@finance/shared';

interface ScenarioToggleProps {
  scenarios: PlanScenario[];
  activeScenarioId: string | null;
  onChange: (scenarioId: string) => void;
}

function getScenarioLabel(name: string): string {
  switch (name) {
    case 'base':
      return 'Base Case';
    case 'best_case':
      return 'Best Case';
    case 'worst_case':
      return 'Worst Case';
    default:
      return name;
  }
}

function getScenarioIcon(name: string): string {
  switch (name) {
    case 'base':
      return '📊';
    case 'best_case':
      return '🚀';
    case 'worst_case':
      return '⚠️';
    default:
      return '📈';
  }
}

function getScenarioInfo(name: string, adjustmentFactor: number): string | null {
  if (name === 'base') return null;
  const percent = ((adjustmentFactor - 1) * 100).toFixed(0);
  const sign = adjustmentFactor >= 1 ? '+' : '';
  return `${sign}${percent}%`;
}

export function ScenarioToggle({ scenarios, activeScenarioId, onChange }: ScenarioToggleProps) {
  if (scenarios.length === 0) {
    return null;
  }

  return (
    <div className="flex bg-gray-100 rounded-lg p-1 w-fit">
      {scenarios.map((scenario) => {
        const isActive = scenario.id === activeScenarioId;
        const info = getScenarioInfo(scenario.name, scenario.adjustmentFactor);

        return (
          <button
            key={scenario.id}
            className={`
              flex items-center gap-2 py-2 px-4 rounded-md text-sm font-medium transition-all
              ${
                isActive
                  ? 'bg-white shadow text-primary-600'
                  : 'text-gray-600 hover:text-gray-900'
              }
            `}
            onClick={() => onChange(scenario.id)}
          >
            <span>{getScenarioIcon(scenario.name)}</span>
            <span>{getScenarioLabel(scenario.name)}</span>
            {info && (
              <span
                className={`text-xs ${
                  scenario.adjustmentFactor > 1
                    ? 'text-success-600'
                    : scenario.adjustmentFactor < 1
                    ? 'text-danger-600'
                    : ''
                }`}
              >
                ({info})
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
