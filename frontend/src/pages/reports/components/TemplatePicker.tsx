import { FileText, LayoutDashboard, PieChart, Briefcase, ClipboardList } from 'lucide-react';

export type TemplateKey = 'full' | 'dashboard' | 'pnl' | 'contracts' | 'sales';

export interface SectionDef {
  key: string;
  label: string;
  description: string;
}

export const ALL_SECTIONS: SectionDef[] = [
  { key: 'kpis', label: 'KPIs', description: 'Income, expenses, profit, pending invoices' },
  { key: 'monthly', label: 'Monthly breakdown', description: 'Income vs expenses by month' },
  { key: 'expenseCategories', label: 'Expense categories', description: 'Top spend by category' },
  { key: 'pnlCenters', label: 'P&L Centers', description: 'Per-center income, expenses, profit' },
  { key: 'contractStats', label: 'Contract stats', description: 'Total/collected/outstanding' },
  { key: 'topClients', label: 'Top clients', description: 'Highest-value contract clients' },
  { key: 'overdueMilestones', label: 'Overdue milestones', description: 'Unpaid past-due payments' },
  { key: 'projections', label: 'Payment projections', description: 'Expected collections next 12 months' },
  { key: 'incomeRows', label: 'Income records', description: 'Top income rows in period' },
  { key: 'expenseRows', label: 'Expense records', description: 'Top expense rows in period' },
  { key: 'salesPipeline', label: 'Sales pipeline', description: 'Leads + proposals' },
];

export const TEMPLATE_DEFAULTS: Record<TemplateKey, string[]> = {
  full: ALL_SECTIONS.map((s) => s.key),
  dashboard: ['kpis', 'monthly', 'expenseCategories'],
  pnl: ['kpis', 'pnlCenters', 'monthly'],
  contracts: ['kpis', 'contractStats', 'topClients', 'overdueMilestones', 'projections'],
  sales: ['salesPipeline', 'topClients'],
};

const TEMPLATES: Array<{ key: TemplateKey; label: string; description: string; Icon: typeof FileText }> = [
  { key: 'full', label: 'Full Business Report', description: 'Every platform section end-to-end', Icon: FileText },
  { key: 'dashboard', label: 'Dashboard Overview', description: 'KPIs + monthly trends + expense mix', Icon: LayoutDashboard },
  { key: 'pnl', label: 'P&L Breakdown', description: 'Per-center profitability', Icon: PieChart },
  { key: 'contracts', label: 'Contracts & Milestones', description: 'Contract pipeline + overdue + projections', Icon: ClipboardList },
  { key: 'sales', label: 'Sales Pipeline', description: 'Leads, proposals, top clients', Icon: Briefcase },
];

interface TemplatePickerProps {
  template: TemplateKey;
  sections: string[];
  onTemplateChange: (template: TemplateKey) => void;
  onSectionsChange: (sections: string[]) => void;
}

export function TemplatePicker({ template, sections, onTemplateChange, onSectionsChange }: TemplatePickerProps) {
  const toggleSection = (key: string) => {
    onSectionsChange(sections.includes(key) ? sections.filter((s) => s !== key) : [...sections, key]);
  };

  return (
    <div className="space-y-5">
      <div>
        <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 block">Template</label>
        <div className="grid grid-cols-1 gap-2">
          {TEMPLATES.map(({ key, label, description, Icon }) => {
            const active = template === key;
            return (
              <button
                key={key}
                type="button"
                onClick={() => onTemplateChange(key)}
                className={`flex items-start gap-3 p-3 rounded-lg border text-left transition-colors ${
                  active
                    ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20'
                    : 'border-gray-200 dark:border-gray-700 hover:border-primary-300 dark:hover:border-primary-600'
                }`}
              >
                <Icon className={`w-5 h-5 mt-0.5 shrink-0 ${active ? 'text-primary-600' : 'text-gray-400'}`} />
                <div className="flex-1">
                  <div className={`text-sm font-medium ${active ? 'text-primary-900 dark:text-primary-100' : 'text-gray-900 dark:text-white'}`}>
                    {label}
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{description}</div>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Sections</label>
          <div className="flex gap-2 text-xs">
            <button
              type="button"
              onClick={() => onSectionsChange(ALL_SECTIONS.map((s) => s.key))}
              className="text-primary-600 hover:underline"
            >
              All
            </button>
            <span className="text-gray-300 dark:text-gray-600">|</span>
            <button
              type="button"
              onClick={() => onSectionsChange([])}
              className="text-primary-600 hover:underline"
            >
              None
            </button>
          </div>
        </div>
        <div className="space-y-1.5 max-h-72 overflow-y-auto pr-1">
          {ALL_SECTIONS.map((s) => (
            <label
              key={s.key}
              className="flex items-start gap-2.5 p-2 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700/40 cursor-pointer"
            >
              <input
                type="checkbox"
                checked={sections.includes(s.key)}
                onChange={() => toggleSection(s.key)}
                className="mt-0.5 h-4 w-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
              />
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium text-gray-900 dark:text-white">{s.label}</div>
                <div className="text-xs text-gray-500 dark:text-gray-400">{s.description}</div>
              </div>
            </label>
          ))}
        </div>
      </div>
    </div>
  );
}
