import { useState } from 'react';
import { Settings as SettingsIcon, User, Users, Shield, Tag, PieChart, Activity } from 'lucide-react';
import { useAuthStore } from '../../stores/authStore';
import ProfileSettings from './components/ProfileSettings';
import UserManagement from './components/UserManagement';
import PnlPermissionsMatrix from './components/PnlPermissionsMatrix';
import CategoriesSettings from './components/CategoriesSettings';
import PnlDefaultsSettings from './components/PnlDefaultsSettings';
import ActivityLog from './components/ActivityLog';

type TabType = 'profile' | 'categories' | 'pnl-defaults' | 'users' | 'permissions' | 'activity';

export default function Settings() {
  const { user } = useAuthStore();
  const [activeTab, setActiveTab] = useState<TabType>('profile');
  const isAdmin = user?.role === 'admin' || user?.role === 'owner';

  const tabs: { id: TabType; label: string; icon: typeof User; adminOnly?: boolean }[] = [
    { id: 'profile', label: 'Profile', icon: User },
    { id: 'categories', label: 'Categories', icon: Tag },
    { id: 'pnl-defaults', label: 'P&L Defaults', icon: PieChart },
    { id: 'users', label: 'Users', icon: Users, adminOnly: true },
    { id: 'permissions', label: 'Permissions', icon: Shield, adminOnly: true },
    { id: 'activity', label: 'Activity', icon: Activity, adminOnly: true },
  ];

  const visibleTabs = tabs.filter((tab) => !tab.adminOnly || isAdmin);

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
          <SettingsIcon className="w-6 h-6 text-primary-600" />
          Settings
        </h1>
        <p className="text-gray-600 dark:text-gray-400">Manage your profile and application settings.</p>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200 dark:border-gray-700">
        <nav className="-mb-px flex space-x-8">
          {visibleTabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 py-4 px-1 border-b-2 font-medium text-sm ${
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
      {activeTab === 'profile' && <ProfileSettings />}
      {activeTab === 'categories' && <CategoriesSettings />}
      {activeTab === 'pnl-defaults' && <PnlDefaultsSettings />}
      {activeTab === 'users' && isAdmin && <UserManagement />}
      {activeTab === 'permissions' && isAdmin && <PnlPermissionsMatrix />}
      {activeTab === 'activity' && isAdmin && <ActivityLog />}
    </div>
  );
}
