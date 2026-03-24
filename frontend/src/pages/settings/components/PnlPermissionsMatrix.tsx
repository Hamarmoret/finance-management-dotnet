import { useState, useEffect } from 'react';
import { Shield, Loader2, AlertCircle } from 'lucide-react';
import { User, PnlCenter } from '@finance/shared';
import { api, getErrorMessage } from '../../../services/api';

interface UserWithPermissions extends User {
  pnlPermissions?: { pnlCenterId: string; pnlCenterName: string; permissionLevel: string }[];
}

type PermissionLevel = 'none' | 'view' | 'edit' | 'admin';

export default function PnlPermissionsMatrix() {
  const [users, setUsers] = useState<UserWithPermissions[]>([]);
  const [pnlCenters, setPnlCenters] = useState<PnlCenter[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [usersRes, pnlRes] = await Promise.all([
        api.get('/users', { params: { page: 1, limit: 100 } }),
        api.get('/pnl-centers'),
      ]);
      setUsers(usersRes.data.data);
      setPnlCenters(pnlRes.data.data);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  const getUserPermission = (user: UserWithPermissions, pnlCenterId: string): PermissionLevel => {
    const permission = user.pnlPermissions?.find((p) => p.pnlCenterId === pnlCenterId);
    return (permission?.permissionLevel as PermissionLevel) || 'none';
  };

  const handlePermissionChange = async (
    userId: string,
    pnlCenterId: string,
    newLevel: PermissionLevel
  ) => {
    setSaving(`${userId}-${pnlCenterId}`);
    setError(null);

    try {
      if (newLevel === 'none') {
        await api.delete(`/users/${userId}/pnl-permissions/${pnlCenterId}`);
      } else {
        await api.post(`/users/${userId}/pnl-permissions`, {
          pnlCenterId,
          permissionLevel: newLevel,
        });
      }

      // Update local state
      setUsers((prev) =>
        prev.map((user) => {
          if (user.id !== userId) return user;

          let updatedPermissions = user.pnlPermissions || [];
          if (newLevel === 'none') {
            updatedPermissions = updatedPermissions.filter((p) => p.pnlCenterId !== pnlCenterId);
          } else {
            const existingIndex = updatedPermissions.findIndex(
              (p) => p.pnlCenterId === pnlCenterId
            );
            if (existingIndex >= 0) {
              updatedPermissions[existingIndex] = {
                ...updatedPermissions[existingIndex]!,
                permissionLevel: newLevel,
              };
            } else {
              const pnl = pnlCenters.find((p) => p.id === pnlCenterId);
              updatedPermissions.push({
                pnlCenterId,
                pnlCenterName: pnl?.name || '',
                permissionLevel: newLevel,
              });
            }
          }

          return { ...user, pnlPermissions: updatedPermissions };
        })
      );
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setSaving(null);
    }
  };

  const getPermissionColor = (level: PermissionLevel) => {
    switch (level) {
      case 'admin':
        return 'bg-purple-100 text-purple-700 border-purple-200';
      case 'edit':
        return 'bg-blue-100 text-blue-700 border-blue-200';
      case 'view':
        return 'bg-green-100 text-green-700 border-green-200';
      default:
        return 'bg-gray-50 text-gray-400 border-gray-200';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-primary-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
          <Shield className="w-5 h-5" />
          P&L Center Permissions
        </h2>
        <p className="text-sm text-gray-500">
          Configure which P&L centers each user can access and their permission level.
        </p>
      </div>

      {error && (
        <div className="p-3 bg-danger-50 border border-danger-200 rounded-lg text-sm text-danger-700 flex items-center gap-2">
          <AlertCircle className="w-4 h-4" />
          {error}
        </div>
      )}

      {/* Legend */}
      <div className="flex items-center gap-4 text-sm">
        <span className="text-gray-500">Legend:</span>
        <span className="px-2 py-1 rounded bg-gray-50 text-gray-400 border border-gray-200">
          None
        </span>
        <span className="px-2 py-1 rounded bg-green-100 text-green-700 border border-green-200">
          View
        </span>
        <span className="px-2 py-1 rounded bg-blue-100 text-blue-700 border border-blue-200">
          Edit
        </span>
        <span className="px-2 py-1 rounded bg-purple-100 text-purple-700 border border-purple-200">
          Admin
        </span>
      </div>

      {/* Matrix Table */}
      <div className="card overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider sticky left-0 bg-gray-50 z-10">
                User
              </th>
              {pnlCenters.map((pnl) => (
                <th
                  key={pnl.id}
                  className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider"
                >
                  {pnl.name}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {users
              .filter((u) => u.isActive)
              .map((user) => (
                <tr key={user.id}>
                  <td className="px-4 py-3 whitespace-nowrap sticky left-0 bg-white z-10">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-full bg-primary-100 flex items-center justify-center">
                        <span className="text-primary-700 text-xs font-medium">
                          {user.firstName[0]}
                          {user.lastName[0]}
                        </span>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-900">
                          {user.firstName} {user.lastName}
                        </p>
                        <p className="text-xs text-gray-500">{user.role}</p>
                      </div>
                    </div>
                  </td>
                  {pnlCenters.map((pnl) => {
                    const currentLevel = getUserPermission(user, pnl.id);
                    const isSaving = saving === `${user.id}-${pnl.id}`;

                    return (
                      <td key={pnl.id} className="px-4 py-3 text-center">
                        {user.role === 'admin' ? (
                          <span className="px-2 py-1 rounded bg-purple-100 text-purple-700 border border-purple-200 text-xs">
                            Admin
                          </span>
                        ) : (
                          <select
                            value={currentLevel}
                            onChange={(e) =>
                              handlePermissionChange(
                                user.id,
                                pnl.id,
                                e.target.value as PermissionLevel
                              )
                            }
                            disabled={isSaving}
                            className={`text-xs rounded border px-2 py-1 ${getPermissionColor(
                              currentLevel
                            )} focus:ring-primary-500 focus:border-primary-500`}
                          >
                            <option value="none">None</option>
                            <option value="view">View</option>
                            <option value="edit">Edit</option>
                            <option value="admin">Admin</option>
                          </select>
                        )}
                        {isSaving && (
                          <Loader2 className="w-3 h-3 animate-spin inline ml-1" />
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
          </tbody>
        </table>

        {users.length === 0 && (
          <div className="text-center py-12">
            <p className="text-gray-500">No users found</p>
          </div>
        )}

        {pnlCenters.length === 0 && (
          <div className="text-center py-12">
            <p className="text-gray-500">No P&L centers found. Create one first.</p>
          </div>
        )}
      </div>
    </div>
  );
}
