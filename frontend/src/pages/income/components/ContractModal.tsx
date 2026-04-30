import { useState, useEffect, useMemo } from 'react';
import { X, Loader2, FileText, Info, CheckCircle, Paperclip } from 'lucide-react';
import type { IncomeContract, ServiceType, DropdownOption, Client, PnlCenter, ContractAttachment } from '@finance/shared';
import { SERVICE_TYPE_LABELS } from '@finance/shared';
import { api, getErrorMessage } from '../../../services/api';
import { ClientAutocomplete } from '../../../components/ClientAutocomplete';
import { ClientModal } from '../../sales/components/ClientModal';
import DocumentsPanel from './DocumentsPanel';

interface ContractModalProps {
  contract?: IncomeContract | null;
  onClose: () => void;
  onSaved: (c: IncomeContract) => void;
}

export default function ContractModal({ contract, onClose, onSaved }: ContractModalProps) {
  const isEdit = !!contract;

  const [title, setTitle] = useState(contract?.title ?? '');
  const [contractType, setContractType] = useState<'project' | 'retainer'>(contract?.contractType ?? 'project');
  const [serviceType, setServiceType] = useState<ServiceType | ''>(contract?.serviceType ?? '');
  const [status, setStatus] = useState<'active' | 'completed' | 'on_hold' | 'cancelled'>(contract?.status ?? 'active');
  const [clientId, setClientId] = useState(contract?.clientId ?? '');
  const [clientName, setClientName] = useState(contract?.clientName ?? '');
  const [currency, setCurrency] = useState(contract?.currency ?? 'ILS');
  const [totalValue, setTotalValue] = useState(contract?.totalValue?.toString() ?? '');
  const [paymentTermsDays, setPaymentTermsDays] = useState(contract?.paymentTermsDays?.toString() ?? '30');
  const [startDate, setStartDate] = useState(contract?.startDate ?? '');
  const [endDate, setEndDate] = useState(contract?.endDate ?? '');
  const [retainerMonthlyAmount, setRetainerMonthlyAmount] = useState(
    contract?.retainerMonthlyAmount?.toString() ?? ''
  );
  const [retainerBillingDay, setRetainerBillingDay] = useState(
    contract?.retainerBillingDay?.toString() ?? ''
  );
  const [retainerDurationMonths, setRetainerDurationMonths] = useState(() => {
    if (contract?.contractType !== 'retainer' || !contract?.startDate || !contract?.endDate) return '';
    const start = new Date(contract.startDate + 'T00:00:00');
    const end = new Date(contract.endDate + 'T00:00:00');
    const months = (end.getFullYear() - start.getFullYear()) * 12 + (end.getMonth() - start.getMonth()) + 1;
    return months > 0 ? months.toString() : '';
  });
  const [vatApplicable, setVatApplicable] = useState(contract?.vatApplicable ?? true);
  const [vatPercentage, setVatPercentage] = useState(contract?.vatPercentage?.toString() ?? '18');
  const [pnlCenterId, setPnlCenterId] = useState(contract?.pnlCenterId ?? '');
  const [notes, setNotes] = useState(contract?.notes ?? '');

  // Retainer: compute end date and total value from start + duration + monthly amount
  const computedEndDate = useMemo(() => {
    if (contractType !== 'retainer' || !startDate || !retainerDurationMonths) return '';
    const months = parseInt(retainerDurationMonths);
    if (isNaN(months) || months <= 0) return '';
    const d = new Date(startDate + 'T00:00:00');
    d.setDate(1);
    d.setMonth(d.getMonth() + months);
    d.setDate(0); // last day of previous month = end of period
    return d.toISOString().split('T')[0];
  }, [contractType, startDate, retainerDurationMonths]);

  const computedTotalValue = useMemo(() => {
    if (contractType !== 'retainer' || !retainerMonthlyAmount || !retainerDurationMonths) return '';
    const monthly = parseFloat(retainerMonthlyAmount);
    const months = parseInt(retainerDurationMonths);
    if (isNaN(monthly) || isNaN(months) || months <= 0) return '';
    return (monthly * months).toFixed(2);
  }, [contractType, retainerMonthlyAmount, retainerDurationMonths]);

  const [clientError, setClientError] = useState('');
  const [pnlCenters, setPnlCenters] = useState<PnlCenter[]>([]);
  const [showCreateClient, setShowCreateClient] = useState(false);
  const [quickCreateClientName, setQuickCreateClientName] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Post-create file upload step (create mode only)
  const [createdContract, setCreatedContract] = useState<IncomeContract | null>(null);
  const [attachments, setAttachments] = useState<ContractAttachment[]>([]);

  // Load service types from API (with hardcoded fallback)
  const [serviceTypes, setServiceTypes] = useState<{ value: string; label: string }[]>(
    Object.entries(SERVICE_TYPE_LABELS).map(([val, label]) => ({ value: val, label }))
  );
  useEffect(() => {
    api.get('/dropdown-options/service_type')
      .then(res => {
        const opts: DropdownOption[] = res.data.data ?? [];
        if (opts.length > 0) {
          setServiceTypes(opts.filter(o => o.isActive).map(o => ({ value: o.value, label: o.label })));
        }
      })
      .catch(() => {});
    api.get('/pnl-centers')
      .then(res => setPnlCenters(res.data.data ?? []))
      .catch(() => {});
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!clientId) {
      setClientError('Client is required');
      return;
    }
    if (contractType === 'retainer' && (!retainerMonthlyAmount || !retainerDurationMonths)) {
      setError('Monthly amount and duration are required for retainer contracts.');
      return;
    }
    setIsSubmitting(true);
    setError(null);

    const payload = {
      title,
      contractType,
      serviceType: serviceType || null,
      status,
      clientId: clientId || null,
      clientName: clientName || null,
      currency,
      totalValue: contractType === 'retainer'
        ? parseFloat(computedTotalValue || '0')
        : parseFloat(totalValue),
      paymentTermsDays: parseInt(paymentTermsDays) || 30,
      startDate: startDate || null,
      endDate: contractType === 'retainer'
        ? (computedEndDate || endDate || null)
        : (endDate || null),
      retainerMonthlyAmount: contractType === 'retainer' && retainerMonthlyAmount ? parseFloat(retainerMonthlyAmount) : null,
      retainerBillingDay: contractType === 'retainer' && retainerBillingDay ? parseInt(retainerBillingDay) : null,
      vatApplicable,
      vatPercentage: vatApplicable && vatPercentage ? parseFloat(vatPercentage) : null,
      pnlCenterId: pnlCenterId || null,
      notes: notes || null,
    };

    try {
      const res = isEdit
        ? await api.put(`/income-contracts/${contract!.id}`, payload)
        : await api.post('/income-contracts', payload);
      const saved: IncomeContract = res.data.data;
      if (!isEdit) {
        // Enter post-create file upload step
        setCreatedContract(saved);
      } else {
        onSaved(saved);
      }
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setIsSubmitting(false);
    }
  };

  // Post-create: show file upload step before closing
  if (createdContract) {
    return (
      <div className="fixed inset-0 z-50 overflow-y-auto">
        <div className="flex min-h-full items-center justify-center p-4">
          <div className="fixed inset-0 bg-black/50" onClick={() => { onSaved(createdContract); }} />
          <div className="relative bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-lg w-full">
            <div className="flex items-center justify-between p-4 border-b dark:border-gray-700">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                <Paperclip className="w-5 h-5" />
                Attach Files to Contract
              </h2>
              <button onClick={() => { onSaved(createdContract); }} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-4 space-y-3">
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Contract <span className="font-medium text-gray-700 dark:text-gray-200">{createdContract.title}</span> created.
                Attach the approved proposal or any other documents now (optional).
              </p>
              <DocumentsPanel
                attachments={attachments}
                entityType="contract"
                entityId={createdContract.id}
                onAttachmentsChanged={setAttachments}
                allowedTypes={['contract', 'proposal', 'other']}
              />
            </div>
            <div className="p-4 border-t dark:border-gray-700 flex justify-end">
              <button
                onClick={() => { onSaved(createdContract); }}
                className="btn btn-primary btn-md flex items-center gap-2"
              >
                <CheckCircle className="w-4 h-4" />
                Done
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-full items-center justify-center p-4">
        <div className="fixed inset-0 bg-black/50" onClick={onClose} />
        <div className="relative bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-lg w-full">
          <div className="flex items-center justify-between p-4 border-b dark:border-gray-700">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
              <FileText className="w-5 h-5" />
              {isEdit ? 'Edit Contract' : 'New Contract'}
            </h2>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
              <X className="w-5 h-5" />
            </button>
          </div>

          <form onSubmit={handleSubmit}>
            <div className="p-4 space-y-4 max-h-[70vh] overflow-y-auto">
              {error && (
                <div className="p-3 bg-danger-50 dark:bg-danger-900/20 border border-danger-200 dark:border-danger-800 rounded-lg text-sm text-danger-700 dark:text-danger-400">
                  {error}
                </div>
              )}

              <div>
                <label className="label dark:text-gray-300">Title *</label>
                <input
                  required
                  value={title}
                  onChange={e => setTitle(e.target.value)}
                  className="input mt-1 w-full dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                  placeholder="e.g. Acme Corp – Security Retainer 2026"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label dark:text-gray-300">Type *</label>
                  <select
                    value={contractType}
                    onChange={e => setContractType(e.target.value as 'project' | 'retainer')}
                    className="input mt-1 w-full dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                  >
                    <option value="project">Project</option>
                    <option value="retainer">Retainer</option>
                  </select>
                </div>
                {isEdit && (
                  <div>
                    <label className="label dark:text-gray-300">Status</label>
                    <select
                      value={status}
                      onChange={e => setStatus(e.target.value as 'active' | 'completed' | 'on_hold' | 'cancelled')}
                      className="input mt-1 w-full dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                    >
                      <option value="active">Active</option>
                      <option value="completed">Completed</option>
                      <option value="on_hold">On Hold</option>
                      <option value="cancelled">Cancelled</option>
                    </select>
                  </div>
                )}
              </div>

              <div>
                <label className="label dark:text-gray-300">Service Type</label>
                <select
                  value={serviceType}
                  onChange={e => setServiceType(e.target.value as ServiceType | '')}
                  className="input mt-1 w-full dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                >
                  <option value="">— Select service type —</option>
                  {serviceTypes.map(({ value: val, label }) => (
                    <option key={val} value={val}>{label}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="label dark:text-gray-300">Client <span className="text-red-500">*</span></label>
                <ClientAutocomplete
                  clientId={clientId}
                  clientName={clientName}
                  onSelect={(id, name) => { setClientId(id); setClientName(name); setClientError(''); }}
                  onCreateNew={(name) => { setQuickCreateClientName(name); setShowCreateClient(true); }}
                  placeholder="Search or type client name"
                  className="mt-1"
                  required
                  error={clientError}
                />
              </div>

              {pnlCenters.length > 0 && (
                <div>
                  <label className="label dark:text-gray-300">P&L Center</label>
                  <select
                    value={pnlCenterId}
                    onChange={e => setPnlCenterId(e.target.value)}
                    className="input mt-1 w-full dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                  >
                    <option value="">— No P&L Center —</option>
                    {pnlCenters.map(p => (
                      <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                  </select>
                </div>
              )}

              {contractType === 'retainer' ? (
                /* ── Retainer: start date + duration + monthly → computed end + total ── */
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="label dark:text-gray-300">Start Date</label>
                      <input
                        type="date"
                        value={startDate}
                        onChange={e => setStartDate(e.target.value)}
                        className="input mt-1 w-full dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                      />
                    </div>
                    <div>
                      <label className="label dark:text-gray-300">Duration (months) *</label>
                      <input
                        type="number"
                        min="1"
                        max="120"
                        value={retainerDurationMonths}
                        onChange={e => setRetainerDurationMonths(e.target.value)}
                        className="input mt-1 w-full dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                        placeholder="e.g. 12"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="label dark:text-gray-300">Monthly Amount *</label>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={retainerMonthlyAmount}
                        onChange={e => setRetainerMonthlyAmount(e.target.value)}
                        className="input mt-1 w-full dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                        placeholder="e.g. 5000"
                      />
                    </div>
                    <div>
                      <label className="label dark:text-gray-300">Currency</label>
                      <select
                        value={currency}
                        onChange={e => setCurrency(e.target.value)}
                        className="input mt-1 w-full dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                      >
                        <option value="ILS">ILS ₪</option>
                        <option value="USD">USD $</option>
                        <option value="EUR">EUR €</option>
                        <option value="GBP">GBP £</option>
                      </select>
                    </div>
                  </div>

                  {computedEndDate && computedTotalValue && (
                    <div className="grid grid-cols-2 gap-4 p-3 bg-primary-50 dark:bg-primary-900/20 rounded-lg border border-primary-100 dark:border-primary-800">
                      <div>
                        <p className="text-xs text-primary-600 dark:text-primary-400 font-medium uppercase tracking-wide">End Date</p>
                        <p className="mt-0.5 font-semibold text-gray-900 dark:text-white">{computedEndDate}</p>
                      </div>
                      <div>
                        <p className="text-xs text-primary-600 dark:text-primary-400 font-medium uppercase tracking-wide">Total Value</p>
                        <p className="mt-0.5 font-semibold text-gray-900 dark:text-white">
                          {parseFloat(computedTotalValue).toLocaleString()} {currency}
                        </p>
                      </div>
                    </div>
                  )}

                  <div>
                    <label className="label dark:text-gray-300">Billing Day (1–28)</label>
                    <input
                      type="number"
                      min="1"
                      max="28"
                      value={retainerBillingDay}
                      onChange={e => setRetainerBillingDay(e.target.value)}
                      className="input mt-1 w-full dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                      placeholder="e.g. 1 (day of month invoice is due)"
                    />
                  </div>
                </div>
              ) : (
                /* ── Project: total value + start/end dates ── */
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="label dark:text-gray-300">Total Value *</label>
                      <input
                        required
                        type="number"
                        step="0.01"
                        min="0"
                        value={totalValue}
                        onChange={e => setTotalValue(e.target.value)}
                        className="input mt-1 w-full dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                      />
                    </div>
                    <div>
                      <label className="label dark:text-gray-300">Currency</label>
                      <select
                        value={currency}
                        onChange={e => setCurrency(e.target.value)}
                        className="input mt-1 w-full dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                      >
                        <option value="ILS">ILS ₪</option>
                        <option value="USD">USD $</option>
                        <option value="EUR">EUR €</option>
                        <option value="GBP">GBP £</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="label dark:text-gray-300">Start Date</label>
                      <input
                        type="date"
                        value={startDate}
                        onChange={e => setStartDate(e.target.value)}
                        className="input mt-1 w-full dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                      />
                    </div>
                    <div>
                      <label className="label dark:text-gray-300">End Date</label>
                      <input
                        type="date"
                        value={endDate}
                        onChange={e => setEndDate(e.target.value)}
                        className="input mt-1 w-full dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                      />
                    </div>
                  </div>
                </div>
              )}

              <div>
                <label className="label dark:text-gray-300">Payment Terms (days)</label>
                <input
                  type="number"
                  min="0"
                  max="365"
                  value={paymentTermsDays}
                  onChange={e => setPaymentTermsDays(e.target.value)}
                  className="input mt-1 w-full dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                />
              </div>

              {/* VAT */}
              <div>
                <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={vatApplicable}
                    onChange={e => setVatApplicable(e.target.checked)}
                    className="rounded border-gray-300 text-primary-600"
                  />
                  VAT applicable
                </label>
                {vatApplicable && (
                  <div className="mt-2">
                    <label className="label dark:text-gray-300">VAT %</label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      max="100"
                      value={vatPercentage}
                      onChange={e => setVatPercentage(e.target.value)}
                      className="input mt-1 w-32 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                    />
                  </div>
                )}
              </div>

              <div>
                <label className="label dark:text-gray-300">Notes</label>
                <textarea
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                  rows={2}
                  className="input mt-1 w-full dark:bg-gray-700 dark:border-gray-600 dark:text-white resize-none"
                />
              </div>
            </div>

            <div className="p-4 border-t dark:border-gray-700">
              {!isEdit && (
                <p className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1.5 mb-3">
                  <Info className="w-3.5 h-3.5 shrink-0" />
                  {contractType === 'retainer' && computedEndDate && retainerDurationMonths
                    ? `${retainerDurationMonths} monthly milestones will be auto-generated (${startDate} → ${computedEndDate}).`
                    : contractType === 'retainer'
                    ? 'Fill in start date, duration, and monthly amount to preview the schedule.'
                    : 'Milestones and payment schedules are added after creating the contract.'}
                </p>
              )}
              <div className="flex justify-end gap-3">
                <button type="button" onClick={onClose} className="btn btn-ghost btn-md">Cancel</button>
                <button type="submit" disabled={isSubmitting} className="btn btn-primary btn-md">
                  {isSubmitting ? (
                    <><Loader2 className="w-4 h-4 animate-spin mr-2" />Saving...</>
                  ) : (
                    isEdit ? 'Save Changes' : 'Create Contract'
                  )}
                </button>
              </div>
            </div>
          </form>
        </div>
      </div>
    </div>
    {showCreateClient && (
      <ClientModal
        client={null}
        initialName={quickCreateClientName}
        onClose={() => setShowCreateClient(false)}
        onSaved={(c?: Client) => {
          if (c) {
            setClientId(c.id);
            setClientName(c.companyName || c.name);
            setClientError('');
          }
          setShowCreateClient(false);
        }}
      />
    )}
    </>
  );
}
