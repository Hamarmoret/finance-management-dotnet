import { useState, useEffect } from 'react';
import { X, Loader2, Shield, Plus, Trash2 } from 'lucide-react';
import { User, PnlCenter } from '@finance/shared';
import { api, getErrorMessage } from '../../../services/api';

interface UserWithPermissions extends User {
  pnlPermissions?: { pnlCenterId: string; pnlCenterName: string; permissionLevel: string }[];
}

interface UserEditModalProps {
  user: UserWithPermissions;
  onClose: () => void;
  onSaved: () => void;
}

type PermissionLevel = 'view' | 'edit' | 'admin';

export default function UserEditModal({ user, onClose, onSaved }: UserEditModalProps) {
  const [loading, setLoading] = useState(false);
  const [loadingPnl, setLoadingPnl] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pnlCenters, setPnlCenters] = useState<PnlCenter[]>([]);
  const [permissions, setPermissions] = useState<
    { pnlCenterId: string; permissionLevel: PermissionLevel }[]
  >([]);
  const [newPnlCenterId, setNewPnlCenterId] = useState('');
  const [newPermissionLevel, setNewPermissionLevel] = useState<PermissionLevel>('view');

  useEffect(() => {
    fetchPnlCenters();
    // Initialize permissions from user data
    if (user.pnlPermissions) {
      setPermissions(
        user.pnlPermissions.map((p) => ({
          pnlCenterId: p.pnlCenterId,
          permissionLevel: p.permissionLevel as PermissionLevel,
        }))
      );
    }
  }, [user]);

  const fetchPnlCenters = async () => {
    try {
      const response = await api.get('/pnl-centers');
      setPnlCenters(response.data.data);
    } catch (err) {
      console.error('Failed to fetch P&L centers:', err);
    } finally {
      setLoadingPnl(false);
    }
  };

  const handleAddPermission = async () => {
    if (!newPnlCenterId) return;

    setLoading(true);
    setError(null);

    try {
      await api.post(`/users/${user.id}/pnl-permissions`, {
        pnlCenterId: newPnlCenterId,
        permissionLevel: newPermissionLevel,
      });

      setPermissions((prev) => [
        ...prev,
        { pnlCenterId: newPnlCenterId, permissionLevel: newPermissionLevel },
      ]);
      setNewPnlCenterId('');
      setNewPermissionLevel('view');
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  const handleRemovePermission = async (pnlCenterId: string) => {
    setLoading(true);
    setError(null);

    try {
      await api.delete(`/users/${user.id}/pnl-permissions/${pnlCenterId}`);
      setPermissions((prev) => prev.filter((p) => p.pnlCenterId !== pnlCenterId));
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  const handleUpdatePermission = async (pnlCenterId: string, newLevel: PermissionLevel) => {
    setLoading(true);
    setError(null);

    try {
      await api.post(`/users/${user.id}/pnl-permissions`, {
        pnlCenterId,
        permissionLevel: newLevel,
      });
      setPermissions((prev) =>
        prev.map((p) =>
          p.pnlCenterId === pnlCenterId ? { ...p, permissionLevel: newLevel } : p
        )
      );
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  const availablePnlCenters = pnlCenters.filter(
    (pnl) => !permissions.some((p) => p.pnlCenterId === pnl.id)
  );

  const getPnlCenterName = (pnlCenterId: string) => {
    const pnl = pnlCenters.find((p) => p.id === pnlCenterId);
    return pnl?.name || 'Unknown';
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-full items-center justify-center p-4">
        <div className="fixed inset-0 bg-black/50" onClick={onClose} />

        <div className="relative bg-white rounded-lg shadow-xl max-w-lg w-full">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b">
            <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
              <Shield className="w-5 h-5" />
              Edit User Permissions
            </h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Body */}
          <div className="p-4 space-y-4">
            {/* User Info */}
            <div className="bg-gray-50 rounded-lg p-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-primary-100 flex items-center justify-center">
                  <span className="text-primary-700 font-medium">
                    {user.firstName[0]}
                    {user.lastName[0]}
                  </span>
                </div>
                <div>
                  <p className="font-medium text-gray-900">
                    {user.firstName} {user.lastName}
                  </p>
                  <p className="text-sm text-gray-500">{user.email}</p>
                </div>
              </div>
            </div>

            {error && (
              <div className="p-3 bg-danger-50 border border-danger-200 rounded-lg text-sm text-danger-700">
                {error}
              </div>
            )}

            {/* Current Permissions */}
            <div>
              <h3 className="text-sm font-medium text-gray-700 mb-2">
                P&L Center Permissions
              </h3>

              {permissions.length === 0 ? (
                <p className="text-sm text-gray-500 italic">No permissions assigned</p>
              ) : (
                <div className="space-y-2">
                  {permissions.map((perm) => (
                    <div
                      key={perm.pnlCenterId}
                      className="flex items-center justify-between p-2 bg-gray-50 rounded-lg"
                    >
                      <span className="text-sm font-medium">
                        {getPnlCenterName(perm.pnlCenterId)}
                      </span>
                      <div className="flex items-center gap-2">
                        <select
                          value={perm.permissionLevel}
                          onChange={(e) =>
                            handleUpdatePermission(
                              perm.pnlCenterId,
                              e.target.value as PermissionLevel
                            )
                          }
                          disabled={loading}
                          className="text-sm border-gray-300 rounded-md"
                        >
                          <option value="view">View</option>
                          <option value="edit">Edit</option>
                          <option value="admin">Admin</option>
                        </select>
                        <button
                          onClick={() => handleRemovePermission(perm.pnlCenterId)}
                          disabled={loading}
                          className="text-danger-600 hover:text-danger-800"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Add Permission */}
            {availablePnlCenters.length > 0 && (
              <div className="pt-2 border-t">
                <h3 className="text-sm font-medium text-gray-700 mb-2">
                  Add Permission
                </h3>
                <div className="flex items-center gap-2">
                  <select
                    value={newPnlCenterId}
                    onChange={(e) => setNewPnlCenterId(e.target.value)}
                    disabled={loading || loadingPnl}
                    className="flex-1 text-sm border-gray-300 rounded-md"
                  >
                    <option value="">Select P&L Center...</option>
                    {availablePnlCenters.map((pnl) => (
                      <option key={pnl.id} value={pnl.id}>
                        {pnl.name}
                      </option>
                    ))}
                  </select>
                  <select
                    value={newPermissionLevel}
                    onChange={(e) => setNewPermissionLevel(e.target.value as PermissionLevel)}
                    disabled={loading}
                    className="text-sm border-gray-300 rounded-md"
                  >
                    <option value="view">View</option>
                    <option value="edit">Edit</option>
                    <option value="admin">Admin</option>
                  </select>
                  <button
                    onClick={handleAddPermission}
                    disabled={loading || !newPnlCenterId}
                    className="btn btn-primary btn-sm"
                  >
                    {loading ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Plus className="w-4 h-4" />
                    )}
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="flex justify-end p-4 border-t">
            <button onClick={onSaved} className="btn btn-primary btn-md">
              Done
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
