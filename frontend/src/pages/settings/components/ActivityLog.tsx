import { useState, useEffect } from 'react';
import {
  Activity,
  Loader2,
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  Filter,
  LogIn,
  LogOut,
  UserPlus,
  Pencil,
  Trash2,
  Shield,
  Key,
  RefreshCw,
  ShieldAlert,
} from 'lucide-react';
import { api, getErrorMessage } from '../../../services/api';

interface AuditLog {
  id: string;
  userId: string | null;
  action: string;
  entityType: string;
  entityId: string | null;
  oldValues: Record<string, unknown> | null;
  newValues: Record<string, unknown> | null;
  ipAddress: string | null;
  createdAt: string;
  userFirstName: string | null;
  userLastName: string | null;
  userEmail: string | null;
  targetFirstName: string | null;
  targetLastName: string | null;
  targetEmail: string | null;
}

interface UserOption {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
}

const ACTION_CONFIG: Record<string, { label: string; icon: typeof LogIn; color: string }> = {
  login: { label: 'Logged in', icon: LogIn, color: 'text-success-600 bg-success-50' },
  login_failed: { label: 'Login failed', icon: ShieldAlert, color: 'text-danger-600 bg-danger-50' },
  logout: { label: 'Logged out', icon: LogOut, color: 'text-gray-600 bg-gray-50' },
  create: { label: 'Created', icon: UserPlus, color: 'text-primary-600 bg-primary-50' },
  update: { label: 'Updated', icon: Pencil, color: 'text-warning-600 bg-warning-50' },
  delete: { label: 'Deleted', icon: Trash2, color: 'text-danger-600 bg-danger-50' },
  role_change: { label: 'Role changed', icon: Shield, color: 'text-purple-600 bg-purple-50' },
  permission_change: { label: 'Permission changed', icon: Shield, color: 'text-indigo-600 bg-indigo-50' },
  password_change: { label: 'Password changed', icon: Key, color: 'text-warning-600 bg-warning-50' },
  mfa_setup: { label: 'MFA updated', icon: Key, color: 'text-primary-600 bg-primary-50' },
  mfa_verify: { label: 'MFA verified', icon: Key, color: 'text-success-600 bg-success-50' },
};

const ENTITY_LABELS: Record<string, string> = {
  user: 'User',
  session: 'Session',
  expense: 'Expense',
  income: 'Income',
  pnl_center: 'P&L Center',
  expense_category: 'Expense Category',
  income_category: 'Income Category',
  business_plan: 'Business Plan',
};

function formatRelativeTime(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHr = Math.floor(diffMin / 60);
  const diffDays = Math.floor(diffHr / 24);

  if (diffSec < 60) return 'Just now';
  if (diffMin < 60) return `${diffMin}m ago`;
  if (diffHr < 24) return `${diffHr}h ago`;
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays}d ago`;

  return date.toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

const FAILED_REASONS: Record<string, string> = {
  unknown_email: 'Unknown email',
  invalid_password: 'Wrong password',
  account_locked: 'Account locked',
  account_deactivated: 'Account deactivated',
};

function getTargetLabel(log: AuditLog): string {
  if (log.targetFirstName && log.targetLastName) {
    return `${log.targetFirstName} ${log.targetLastName}`;
  }
  if (log.targetEmail) return log.targetEmail;
  return '';
}

function getActionDetails(log: AuditLog): string {
  const parts: string[] = [];
  const target = getTargetLabel(log);

  if (log.action === 'login_failed' && log.newValues) {
    const reason = log.newValues.reason as string;
    parts.push(FAILED_REASONS[reason] || reason || 'Unknown reason');
    const email = log.newValues.email as string;
    if (email) parts.push(email);
    return parts.join(' - ');
  }

  if (log.action === 'role_change') {
    if (target) parts.push(target);
    if (log.newValues) {
      const newRole = log.newValues.role as string;
      const oldRole = log.oldValues?.role as string;
      if (oldRole && newRole) {
        parts.push(`${oldRole} \u2192 ${newRole}`);
      }
    }
    return parts.join(' - ');
  }

  if (log.action === 'update' && log.entityType === 'user' && log.newValues) {
    if ('isActive' in log.newValues) {
      const action = log.newValues.isActive ? 'Reactivated' : 'Deactivated';
      return target ? `${action} ${target}` : action;
    }
  }

  if (log.action === 'create' && log.entityType === 'user') {
    if (target) return target;
    const email = log.newValues?.email as string;
    if (email) return email;
  }

  if (log.action === 'delete' && log.entityType === 'user') {
    const email = log.oldValues?.email as string;
    if (target) return target;
    if (email) return email;
  }

  // For other actions on user entities, show target
  if (log.entityType === 'user' && target && log.userId !== log.entityId) {
    parts.push(target);
  }

  if (log.entityType === 'expense' || log.entityType === 'income') {
    const label = ENTITY_LABELS[log.entityType] || log.entityType;
    const values = log.newValues;
    if (values) {
      const desc = values.description as string | undefined;
      const amount = values.amount as number | undefined;
      const currency = values.currency as string | undefined;
      const counterpart = (values.vendor ?? values.client) as string | undefined;
      const detail = [
        desc,
        amount != null && currency ? `${currency} ${amount}` : undefined,
        counterpart,
      ].filter(Boolean).join(' · ');
      parts.push(detail ? `${label}: ${detail}` : label);
    } else {
      parts.push(label);
    }
    return parts.join(' - ');
  }

  if (log.entityType && log.entityType !== 'session' && log.entityType !== 'user') {
    parts.push(ENTITY_LABELS[log.entityType] || log.entityType);
  }

  return parts.join(' - ');
}

export default function ActivityLog() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [filterUserId, setFilterUserId] = useState<string>('');
  const [users, setUsers] = useState<UserOption[]>([]);
  const limit = 25;

  useEffect(() => {
    fetchUsers();
  }, []);

  useEffect(() => {
    fetchLogs();
  }, [page, filterUserId]);

  const fetchUsers = async () => {
    try {
      const response = await api.get('/users', { params: { page: 1, limit: 100, includeInactive: true } });
      setUsers(response.data.data);
    } catch {
      // Non-critical, filter just won't work
    }
  };

  const fetchLogs = async () => {
    try {
      setLoading(true);
      setError(null);
      const params: Record<string, unknown> = { page, limit };
      if (filterUserId) params.userId = filterUserId;

      const response = await api.get('/audit', { params });
      setLogs(response.data.data);
      setTotalPages(response.data.pagination.totalPages);
      setTotal(response.data.pagination.total);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
            <Activity className="w-5 h-5" />
            User Activity
          </h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Recent activity log across all users. {total > 0 && `${total} total entries.`}
          </p>
        </div>
        <button
          onClick={() => { setPage(1); fetchLogs(); }}
          className="btn btn-ghost btn-sm"
          title="Refresh"
        >
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      {error && (
        <div className="p-3 bg-danger-50 border border-danger-200 rounded-lg text-sm text-danger-700 flex items-center gap-2">
          <AlertCircle className="w-4 h-4" />
          {error}
        </div>
      )}

      {/* Filter */}
      <div className="flex items-center gap-3">
        <Filter className="w-4 h-4 text-gray-400" />
        <select
          value={filterUserId}
          onChange={(e) => { setFilterUserId(e.target.value); setPage(1); }}
          className="text-sm border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-200 rounded-md focus:ring-primary-500 focus:border-primary-500"
        >
          <option value="">All users</option>
          {users.map((u) => (
            <option key={u.id} value={u.id}>
              {u.firstName} {u.lastName} ({u.email})
            </option>
          ))}
        </select>
      </div>

      {/* Activity Table */}
      {loading ? (
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-8 h-8 animate-spin text-primary-600" />
        </div>
      ) : (
        <div className="card overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50 dark:bg-gray-700/50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Time
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  User
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Action
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Details
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  IP Address
                </th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
              {logs.map((log) => {
                const config = ACTION_CONFIG[log.action] || {
                  label: log.action,
                  icon: Activity,
                  color: 'text-gray-600 bg-gray-50',
                };
                const IconComponent = config.icon;
                const details = getActionDetails(log);

                return (
                  <tr key={log.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400" title={new Date(log.createdAt).toLocaleString()}>
                      {formatRelativeTime(log.createdAt)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {log.userFirstName ? (
                        <div>
                          <div className="text-sm font-medium text-gray-900 dark:text-white">
                            {log.userFirstName} {log.userLastName}
                          </div>
                          <div className="text-xs text-gray-500 dark:text-gray-400">{log.userEmail}</div>
                        </div>
                      ) : (
                        <span className="text-sm text-gray-400 italic">System</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${config.color}`}>
                        <IconComponent className="w-3 h-3" />
                        {config.label}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-400 max-w-xs truncate">
                      {details || (
                        <span className="text-gray-400">
                          {ENTITY_LABELS[log.entityType] || log.entityType}
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-xs text-gray-400 font-mono">
                      {log.ipAddress || '—'}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          {logs.length === 0 && (
            <div className="text-center py-12">
              <Activity className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500 dark:text-gray-400">No activity logs found</p>
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between px-6 py-3 border-t dark:border-gray-700 bg-gray-50 dark:bg-gray-700/50">
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Page {page} of {totalPages} ({total} entries)
              </p>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="btn btn-ghost btn-sm disabled:opacity-50"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className="btn btn-ghost btn-sm disabled:opacity-50"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
