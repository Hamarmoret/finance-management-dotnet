import { useState, useEffect, useRef } from 'react';
import { FileText, Loader2, Download, Sparkles } from 'lucide-react';
import { api, getErrorMessage } from '../../services/api';
import { PeriodSelector, getPeriodLabel } from '../../components/PeriodSelector';
import { TemplatePicker, TEMPLATE_DEFAULTS, ALL_SECTIONS, type TemplateKey } from './components/TemplatePicker';
import { ReportPreview } from './components/ReportPreview';
import { AiCustomForm, MAX_PROMPT_LENGTH } from './components/AiCustomForm';

type Mode = 'templated' | 'ai-custom';

function getDefaultDates(): { start: string; end: string } {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), 1);
  return {
    start: start.toISOString().split('T')[0],
    end: now.toISOString().split('T')[0],
  };
}

export default function Reports() {
  const defaults = getDefaultDates();
  const [mode, setMode] = useState<Mode>('templated');
  const [startDate, setStartDate] = useState(defaults.start);
  const [endDate, setEndDate] = useState(defaults.end);
  const [template, setTemplate] = useState<TemplateKey>('full');
  const [sections, setSections] = useState<string[]>(TEMPLATE_DEFAULTS.full);
  const [aiPrompt, setAiPrompt] = useState('');
  const [includeAi, setIncludeAi] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  const statusIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  function handleTemplateChange(next: TemplateKey) {
    setTemplate(next);
    setSections(TEMPLATE_DEFAULTS[next]);
  }

  useEffect(() => {
    return () => {
      if (statusIntervalRef.current) clearInterval(statusIntervalRef.current);
    };
  }, []);

  function startStatusTimer() {
    const startedAt = Date.now();
    setStatusMessage('Collecting data…');
    statusIntervalRef.current = setInterval(() => {
      const elapsed = (Date.now() - startedAt) / 1000;
      if (elapsed < 2) setStatusMessage('Collecting data…');
      else if (elapsed < 6) setStatusMessage('Generating AI summary…');
      else if (elapsed < 15) setStatusMessage('Rendering PDF…');
      else setStatusMessage('Still working… large reports can take up to 30 seconds');
    }, 800);
  }

  function stopStatusTimer() {
    if (statusIntervalRef.current) {
      clearInterval(statusIntervalRef.current);
      statusIntervalRef.current = null;
    }
    setStatusMessage(null);
  }

  const canGenerate = (() => {
    if (!startDate || !endDate) return false;
    if (mode === 'templated') return sections.length > 0;
    return aiPrompt.trim().length > 0 && aiPrompt.length <= MAX_PROMPT_LENGTH;
  })();

  async function handleGenerate() {
    if (!canGenerate) {
      if (mode === 'templated' && sections.length === 0) {
        setError('Select at least one section to include in the report');
      } else if (mode === 'ai-custom' && aiPrompt.trim().length === 0) {
        setError('Enter a prompt describing the report you want');
      }
      return;
    }

    setGenerating(true);
    setError(null);
    startStatusTimer();

    try {
      const body =
        mode === 'templated'
          ? {
              startDate,
              endDate,
              template,
              sections,
              includeAiSummary: includeAi,
            }
          : {
              startDate,
              endDate,
              template: 'ai-custom',
              // Send the full section catalog so Claude has the complete picture.
              sections: ALL_SECTIONS.map((s) => s.key),
              prompt: aiPrompt.trim(),
              // AI custom reports always use the AI summary — that's the whole point.
              includeAiSummary: true,
            };

      const response = await api.post('/reports/generate', body, {
        responseType: 'blob',
        timeout: 60000,
      });

      const blob = new Blob([response.data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `report-${mode === 'ai-custom' ? 'ai-custom' : template}-${startDate}-${endDate}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (err) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const maybeBlob = (err as any)?.response?.data;
      if (maybeBlob instanceof Blob) {
        try {
          const text = await maybeBlob.text();
          const parsed = JSON.parse(text);
          setError(parsed?.error?.message || 'Failed to generate report');
        } catch {
          setError('Failed to generate report');
        }
      } else {
        setError(getErrorMessage(err));
      }
    } finally {
      setGenerating(false);
      stopStatusTimer();
    }
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
          <FileText className="w-6 h-6 text-primary-600" />
          Reports
        </h1>
        <p className="text-gray-600 dark:text-gray-400 mt-1">
          Generate a PDF report with your business data and an AI-powered executive summary
        </p>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-200 dark:border-gray-700">
        <button
          type="button"
          onClick={() => setMode('templated')}
          className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
            mode === 'templated'
              ? 'border-primary-600 text-primary-600'
              : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
          }`}
        >
          <span className="flex items-center gap-1.5">
            <FileText className="w-4 h-4" />
            Templated Report
          </span>
        </button>
        <button
          type="button"
          onClick={() => setMode('ai-custom')}
          className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
            mode === 'ai-custom'
              ? 'border-primary-600 text-primary-600'
              : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
          }`}
        >
          <span className="flex items-center gap-1.5">
            <Sparkles className="w-4 h-4" />
            AI Custom Report
          </span>
        </button>
      </div>

      {/* Error banner */}
      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-900/40 text-red-700 dark:text-red-300 px-4 py-3 rounded-lg text-sm">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Config panel */}
        <div className="lg:col-span-2 panel p-6 space-y-6">
          {/* Period */}
          <div>
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 block">Period</label>
            <PeriodSelector
              startDate={startDate}
              endDate={endDate}
              onChange={(s, e) => {
                setStartDate(s);
                setEndDate(e);
              }}
            />
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">{getPeriodLabel(startDate, endDate)}</p>
          </div>

          <div className="border-t border-gray-200 dark:border-gray-700" />

          {/* Mode-specific body */}
          {mode === 'templated' ? (
            <>
              <TemplatePicker
                template={template}
                sections={sections}
                onTemplateChange={handleTemplateChange}
                onSectionsChange={setSections}
              />

              <div className="border-t border-gray-200 dark:border-gray-700" />

              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={includeAi}
                  onChange={(e) => setIncludeAi(e.target.checked)}
                  className="mt-0.5 h-4 w-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                />
                <div className="flex-1">
                  <div className="flex items-center gap-1.5">
                    <Sparkles className="w-4 h-4 text-primary-600" />
                    <span className="text-sm font-medium text-gray-900 dark:text-white">Include AI executive summary</span>
                  </div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                    Claude analyzes the data and adds an executive summary, key findings, and recommendations
                  </p>
                </div>
              </label>
            </>
          ) : (
            <AiCustomForm prompt={aiPrompt} onPromptChange={setAiPrompt} />
          )}

          {/* Generate button */}
          <div className="pt-2">
            <button
              type="button"
              onClick={handleGenerate}
              disabled={generating || !canGenerate}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:bg-gray-300 dark:disabled:bg-gray-600 disabled:cursor-not-allowed transition-colors font-medium"
            >
              {generating ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Generating…
                </>
              ) : (
                <>
                  <Download className="w-4 h-4" />
                  Generate PDF
                </>
              )}
            </button>
            {statusMessage && (
              <p className="text-xs text-center text-gray-500 dark:text-gray-400 mt-2 italic">{statusMessage}</p>
            )}
          </div>
        </div>

        {/* Preview panel */}
        <div className="lg:col-span-1">
          <ReportPreview
            mode={mode}
            startDate={startDate}
            endDate={endDate}
            sections={mode === 'templated' ? sections : ALL_SECTIONS.map((s) => s.key)}
            aiPrompt={aiPrompt}
            includeAi={mode === 'ai-custom' ? true : includeAi}
          />
        </div>
      </div>
    </div>
  );
}
