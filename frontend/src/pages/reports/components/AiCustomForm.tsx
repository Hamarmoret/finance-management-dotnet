import { Sparkles } from 'lucide-react';

const MAX_PROMPT_LENGTH = 1000;

const EXAMPLE_PROMPTS = [
  'Analyze my Q2 expense spike and recommend three ways to cut costs.',
  'Show me cash flow concerns and suggest how to improve collection times.',
  'Which clients are driving the most revenue and which are the biggest risks?',
  'Compare this month vs last month and explain the biggest swings.',
];

interface AiCustomFormProps {
  prompt: string;
  onPromptChange: (prompt: string) => void;
}

export function AiCustomForm({ prompt, onPromptChange }: AiCustomFormProps) {
  const count = prompt.length;
  const tooLong = count > MAX_PROMPT_LENGTH;

  return (
    <div className="space-y-4">
      <div>
        <label htmlFor="ai-prompt" className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 flex items-center gap-1.5">
          <Sparkles className="w-4 h-4 text-primary-600" />
          Describe the report you want
        </label>
        <textarea
          id="ai-prompt"
          value={prompt}
          onChange={(e) => onPromptChange(e.target.value)}
          rows={5}
          placeholder="Example: Analyze my Q2 expense spike and suggest three ways to cut costs."
          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500 resize-y"
        />
        <div className="flex justify-between mt-1">
          <p className="text-xs text-gray-500 dark:text-gray-400">
            AI will analyze your data for the selected period and write the full report around this prompt.
          </p>
          <p className={`text-xs ${tooLong ? 'text-red-600' : 'text-gray-400 dark:text-gray-500'}`}>
            {count} / {MAX_PROMPT_LENGTH}
          </p>
        </div>
      </div>

      <div>
        <div className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">
          Example prompts
        </div>
        <div className="grid grid-cols-1 gap-1.5">
          {EXAMPLE_PROMPTS.map((ex) => (
            <button
              key={ex}
              type="button"
              onClick={() => onPromptChange(ex)}
              className="text-left text-xs px-3 py-2 rounded-md border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:border-primary-300 hover:bg-primary-50 dark:hover:bg-primary-900/20 hover:text-primary-700 dark:hover:text-primary-300 transition-colors"
            >
              {ex}
            </button>
          ))}
        </div>
      </div>

      <div className="text-xs text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-700/30 rounded-lg p-3 leading-relaxed">
        AI custom reports always include an executive summary, key findings, and recommendations focused on
        your prompt, plus supporting data tables from every platform section.
      </div>
    </div>
  );
}

export { MAX_PROMPT_LENGTH };
