import { useState, useEffect, useCallback } from 'react';
import { Search, Users, Loader2, AlertTriangle, TrendingUp, ArrowRight } from 'lucide-react';
import type { ClientContractStats } from '@finance/shared';
import { api, getErrorMessage } from '../../../services/api';
import { formatCurrency } from '../../../utils/formatters';
import { PeriodSelector, getPeriodLabel } from '../../../components/PeriodSelector';
import ContractsList from './ContractsList';

export default function ClientsIncomeView() {
  const [clients, setClients] = useState<ClientContractStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [selectedClient, setSelectedClient] = useState<ClientContractStats | null>(null);

  const fetchClients = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (search) params.append('search', search);
      if (startDate) params.append('startDate', startDate);
      if (endDate) params.append('endDate', endDate);
      const res = await api.get(`/income-contracts/by-client?${params}`);
      setClients(res.data.data ?? []);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [search, startDate, endDate]);

  useEffect(() => { fetchClients(); }, [fetchClients]);

  if (selectedClient) {
    return (
      <div>
        <button
          onClick={() => setSelectedClient(null)}
          className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 mb-4"
        >
          ← Back to all clients
        </button>
        <div className="mb-4 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
          <p className="text-xs text-gray-500 dark:text-gray-400">Contracts for</p>
          <p className="font-semibold text-gray-900 dark:text-white">{selectedClient.clientName}</p>
        </div>
        <ContractsList presetClientId={selectedClient.clientId ?? undefined} />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Search + Period */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
        <div className="relative max-w-sm flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search clients..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="input w-full pl-10 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
          />
        </div>
        <PeriodSelector
          startDate={startDate}
          endDate={endDate}
          onChange={(s, e) => { setStartDate(s); setEndDate(e); }}
        />
      </div>
      {(startDate || endDate) && (
        <p className="text-sm text-gray-500 dark:text-gray-400">{getPeriodLabel(startDate, endDate)}</p>
      )}

      {error && (
        <div className="p-3 bg-danger-50 dark:bg-danger-900/20 border border-danger-200 dark:border-danger-800 rounded-lg text-sm text-danger-700 dark:text-danger-400">
          {error}
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="w-7 h-7 animate-spin text-primary-600" />
        </div>
      ) : clients.length === 0 ? (
        <div className="card p-12 text-center">
          <Users className="w-10 h-10 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
          <p className="text-gray-500 dark:text-gray-400 text-sm">
            {search ? 'No clients match your search' : 'No contracts yet'}
          </p>
        </div>
      ) : (
        <div className="card overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 dark:bg-gray-700/50 border-b border-gray-200 dark:border-gray-700">
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400">Client</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400">Contracts</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400">Total Value</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400">Collected</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400">Outstanding</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400">Overdue</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
              {clients.map((c, i) => {
                const collectionRate = c.totalValue > 0 ? (c.totalCollected / c.totalValue) * 100 : 0;
                return (
                  <tr
                    key={c.clientId ?? i}
                    onClick={() => setSelectedClient(c)}
                    className="hover:bg-gray-50 dark:hover:bg-gray-700/30 cursor-pointer transition-colors"
                  >
                    <td className="px-4 py-3">
                      <div className="font-medium text-gray-900 dark:text-white">{c.clientName}</div>
                      {/* Mini progress bar */}
                      <div className="mt-1 h-1 w-24 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-success-500 rounded-full"
                          style={{ width: `${Math.min(collectionRate, 100)}%` }}
                        />
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right text-gray-600 dark:text-gray-300">{c.contractCount}</td>
                    <td className="px-4 py-3 text-right font-medium text-gray-900 dark:text-white">
                      {formatCurrency(c.totalValue, 'ILS')}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <span className="text-success-600 dark:text-success-400 font-medium">
                        {formatCurrency(c.totalCollected, 'ILS')}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right text-gray-600 dark:text-gray-300">
                      {formatCurrency(c.totalOutstanding, 'ILS')}
                    </td>
                    <td className="px-4 py-3 text-right">
                      {c.overdueCount > 0 ? (
                        <span className="flex items-center justify-end gap-1 text-danger-600 dark:text-danger-400">
                          <AlertTriangle className="w-3.5 h-3.5" />
                          {formatCurrency(c.overdueAmount, 'ILS')}
                        </span>
                      ) : (
                        <span className="text-gray-400">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <ArrowRight className="w-4 h-4 text-gray-400 inline" />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Summary row */}
      {clients.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: 'Clients', value: clients.length.toString(), icon: <Users className="w-4 h-4 text-primary-600" /> },
            { label: 'Total Value', value: formatCurrency(clients.reduce((s, c) => s + c.totalValue, 0), 'ILS'), icon: <TrendingUp className="w-4 h-4 text-primary-600" /> },
            { label: 'Collected', value: formatCurrency(clients.reduce((s, c) => s + c.totalCollected, 0), 'ILS'), icon: <TrendingUp className="w-4 h-4 text-success-600" /> },
            { label: 'Overdue', value: formatCurrency(clients.reduce((s, c) => s + c.overdueAmount, 0), 'ILS'), icon: <AlertTriangle className="w-4 h-4 text-danger-600" /> },
          ].map(({ label, value, icon }) => (
            <div key={label} className="card p-3">
              <div className="flex items-center gap-1.5 mb-1">{icon}<span className="text-xs text-gray-500 dark:text-gray-400">{label}</span></div>
              <p className="text-base font-bold text-gray-900 dark:text-white">{value}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
