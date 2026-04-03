import { useState } from 'react';
import { Briefcase, Building2, TrendingUp, FileText } from 'lucide-react';
import ClientsTab from './components/ClientsTab';
import LeadsTab from './components/LeadsTab';
import ProposalsTab from './components/ProposalsTab';

type SalesTab = 'clients' | 'leads' | 'proposals';

const tabs: { id: SalesTab; label: string; icon: typeof Building2 }[] = [
  { id: 'clients', label: 'Clients', icon: Building2 },
  { id: 'leads', label: 'Leads', icon: TrendingUp },
  { id: 'proposals', label: 'Proposals', icon: FileText },
];

export default function Sales() {
  const [activeTab, setActiveTab] = useState<SalesTab>('clients');

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
          <Briefcase className="w-6 h-6 text-primary-600" />
          Sales
        </h1>
        <p className="text-gray-600 dark:text-gray-400 mt-1">
          Manage clients, leads, and proposals.
        </p>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200 dark:border-gray-700">
        <nav className="-mb-px flex space-x-8">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                activeTab === tab.id
                  ? 'border-primary-500 text-primary-600'
                  : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:border-gray-300 dark:hover:border-gray-500'
              }`}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      {activeTab === 'clients' && <ClientsTab />}
      {activeTab === 'leads' && <LeadsTab />}
      {activeTab === 'proposals' && <ProposalsTab />}
    </div>
  );
}
