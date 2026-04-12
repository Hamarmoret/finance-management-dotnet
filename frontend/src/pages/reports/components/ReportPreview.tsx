import { Check, FileText, Sparkles } from 'lucide-react';
import { ALL_SECTIONS } from './TemplatePicker';
import { getPeriodLabel } from '../../../components/PeriodSelector';

interface ReportPreviewProps {
  mode: 'templated' | 'ai-custom';
  startDate: string;
  endDate: string;
  sections: string[];
  aiPrompt: string;
  includeAi: boolean;
}

export function ReportPreview({ mode, startDate, endDate, sections, aiPrompt, includeAi }: ReportPreviewProps) {
  const activeSections = ALL_SECTIONS.filter((s) => sections.includes(s.key));

  return (
    <div className="panel p-6 space-y-5">
      <div>
        <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wide mb-1">
          Report Preview
        </h3>
        <p className="text-xs text-gray-500 dark:text-gray-400">
          What will be included when you click Generate
        </p>
      </div>

      <div className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-700/40 rounded-lg">
        <FileText className="w-5 h-5 text-primary-600 shrink-0" />
        <div className="min-w-0">
          <div className="text-sm font-medium text-gray-900 dark:text-white truncate">
            {mode === 'ai-custom' ? 'AI Custom Report' : 'Templated Report'}
          </div>
          <div className="text-xs text-gray-500 dark:text-gray-400">{getPeriodLabel(startDate, endDate)}</div>
        </div>
      </div>

      {includeAi && (
        <div className="flex items-start gap-2.5 p-3 bg-primary-50 dark:bg-primary-900/10 rounded-lg border border-primary-100 dark:border-primary-900/30">
          <Sparkles className="w-4 h-4 text-primary-600 mt-0.5 shrink-0" />
          <div className="text-xs text-gray-700 dark:text-gray-300">
            <div className="font-medium text-primary-900 dark:text-primary-100 mb-0.5">AI Executive Summary</div>
            AI will generate a summary, key findings, and recommendations based on the data in this report.
          </div>
        </div>
      )}

      {mode === 'ai-custom' && aiPrompt.trim() && (
        <div className="p-3 bg-gray-50 dark:bg-gray-700/40 rounded-lg">
          <div className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">
            Your Prompt
          </div>
          <p className="text-sm text-gray-800 dark:text-gray-200 whitespace-pre-wrap line-clamp-4">{aiPrompt.trim()}</p>
        </div>
      )}

      {mode === 'templated' && (
        <div>
          <div className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">
            Sections ({activeSections.length})
          </div>
          {activeSections.length === 0 ? (
            <p className="text-xs text-gray-400 dark:text-gray-500 italic">
              No sections selected — pick at least one to generate a report
            </p>
          ) : (
            <ul className="space-y-1">
              {activeSections.map((s) => (
                <li key={s.key} className="flex items-start gap-2 text-sm text-gray-700 dark:text-gray-300">
                  <Check className="w-4 h-4 text-green-600 mt-0.5 shrink-0" />
                  <span>{s.label}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
