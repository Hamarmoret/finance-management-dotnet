import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { User, Mail, Loader2, Check, Key, Crown } from 'lucide-react';
import { useAuthStore } from '../../../stores/authStore';
import { api, getErrorMessage } from '../../../services/api';
import { formatDate } from '../../../utils/formatters';

const profileSchema = z.object({
  firstName: z.string().min(1, 'First name is required').max(100),
  lastName: z.string().min(1, 'Last name is required').max(100),
});

const passwordSchema = z
  .object({
    currentPassword: z.string().min(1, 'Current password is required'),
    newPassword: z
      .string()
      .min(12, 'Password must be at least 12 characters')
      .regex(/[A-Z]/, 'Must contain uppercase')
      .regex(/[a-z]/, 'Must contain lowercase')
      .regex(/[0-9]/, 'Must contain number')
      .regex(/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/, 'Must contain special character'),
    confirmPassword: z.string().min(1, 'Confirm password is required'),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });

type ProfileFormData = z.infer<typeof profileSchema>;
type PasswordFormData = z.infer<typeof passwordSchema>;

export default function ProfileSettings() {
  const { user, fetchUser } = useAuthStore();
  const [isUpdating, setIsUpdating] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [showPasswordForm, setShowPasswordForm] = useState(false);

  const profileForm = useForm<ProfileFormData>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      firstName: user?.firstName || '',
      lastName: user?.lastName || '',
    },
  });

  const passwordForm = useForm<PasswordFormData>({
    resolver: zodResolver(passwordSchema),
    defaultValues: {
      currentPassword: '',
      newPassword: '',
      confirmPassword: '',
    },
  });

  const onUpdateProfile = async (data: ProfileFormData) => {
    setIsUpdating(true);
    setError(null);
    setSuccess(null);

    try {
      await api.patch('/users/me', data);
      await fetchUser();
      setSuccess('Profile updated successfully');
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setIsUpdating(false);
    }
  };

  const onChangePassword = async (data: PasswordFormData) => {
    setIsChangingPassword(true);
    setError(null);
    setSuccess(null);

    try {
      await api.post('/auth/change-password', {
        currentPassword: data.currentPassword,
        newPassword: data.newPassword,
      });
      setSuccess('Password changed successfully. Please log in again.');
      passwordForm.reset();
      setShowPasswordForm(false);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setIsChangingPassword(false);
    }
  };

  return (
    <div className="max-w-2xl space-y-6">
      {/* Profile Information */}
      <div className="card">
        <div className="card-header">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
            <User className="w-5 h-5" />
            Profile Information
          </h2>
        </div>
        <div className="card-body">
          {(error || success) && (
            <div
              className={`mb-4 p-3 rounded-lg text-sm ${
                error
                  ? 'bg-danger-50 border border-danger-200 text-danger-700'
                  : 'bg-success-50 border border-success-200 text-success-700'
              }`}
            >
              {error || success}
            </div>
          )}

          <form onSubmit={profileForm.handleSubmit(onUpdateProfile)} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label htmlFor="firstName" className="label">
                  First Name
                </label>
                <input
                  {...profileForm.register('firstName')}
                  type="text"
                  id="firstName"
                  className={`input mt-1 ${
                    profileForm.formState.errors.firstName ? 'border-danger-500' : ''
                  }`}
                />
                {profileForm.formState.errors.firstName && (
                  <p className="mt-1 text-sm text-danger-600">
                    {profileForm.formState.errors.firstName.message}
                  </p>
                )}
              </div>
              <div>
                <label htmlFor="lastName" className="label">
                  Last Name
                </label>
                <input
                  {...profileForm.register('lastName')}
                  type="text"
                  id="lastName"
                  className={`input mt-1 ${
                    profileForm.formState.errors.lastName ? 'border-danger-500' : ''
                  }`}
                />
                {profileForm.formState.errors.lastName && (
                  <p className="mt-1 text-sm text-danger-600">
                    {profileForm.formState.errors.lastName.message}
                  </p>
                )}
              </div>
            </div>

            <div>
              <label className="label">Email</label>
              <div className="mt-1 flex items-center gap-2 text-gray-600 dark:text-gray-400">
                <Mail className="w-4 h-4" />
                {user?.email}
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Email cannot be changed</p>
            </div>

            <div>
              <label className="label">Role</label>
              <div className="mt-1">
                {user?.role === 'owner' ? (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-semibold bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-300">
                    <Crown className="w-4 h-4" />
                    Account Owner
                  </span>
                ) : (
                  <span
                    className={`px-2 py-1 rounded-full text-xs font-medium capitalize ${
                      user?.role === 'admin'
                        ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300'
                        : user?.role === 'manager'
                        ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300'
                        : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
                    }`}
                  >
                    {user?.role}
                  </span>
                )}
              </div>
            </div>

            <div className="pt-4">
              <button
                type="submit"
                disabled={isUpdating}
                className="btn btn-primary btn-md"
              >
                {isUpdating ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Check className="w-4 h-4 mr-2" />
                    Save Changes
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* Change Password */}
      <div className="card">
        <div className="card-header flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
            <Key className="w-5 h-5" />
            Password
          </h2>
          {!showPasswordForm && (
            <button
              onClick={() => setShowPasswordForm(true)}
              className="btn btn-outline btn-sm"
            >
              Change Password
            </button>
          )}
        </div>
        {showPasswordForm && (
          <div className="card-body">
            <form onSubmit={passwordForm.handleSubmit(onChangePassword)} className="space-y-4">
              <div>
                <label htmlFor="currentPassword" className="label">
                  Current Password
                </label>
                <input
                  {...passwordForm.register('currentPassword')}
                  type="password"
                  id="currentPassword"
                  className={`input mt-1 ${
                    passwordForm.formState.errors.currentPassword ? 'border-danger-500' : ''
                  }`}
                />
                {passwordForm.formState.errors.currentPassword && (
                  <p className="mt-1 text-sm text-danger-600">
                    {passwordForm.formState.errors.currentPassword.message}
                  </p>
                )}
              </div>

              <div>
                <label htmlFor="newPassword" className="label">
                  New Password
                </label>
                <input
                  {...passwordForm.register('newPassword')}
                  type="password"
                  id="newPassword"
                  className={`input mt-1 ${
                    passwordForm.formState.errors.newPassword ? 'border-danger-500' : ''
                  }`}
                />
                {passwordForm.formState.errors.newPassword && (
                  <p className="mt-1 text-sm text-danger-600">
                    {passwordForm.formState.errors.newPassword.message}
                  </p>
                )}
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  Min 12 characters with uppercase, lowercase, number, and special character
                </p>
              </div>

              <div>
                <label htmlFor="confirmPassword" className="label">
                  Confirm New Password
                </label>
                <input
                  {...passwordForm.register('confirmPassword')}
                  type="password"
                  id="confirmPassword"
                  className={`input mt-1 ${
                    passwordForm.formState.errors.confirmPassword ? 'border-danger-500' : ''
                  }`}
                />
                {passwordForm.formState.errors.confirmPassword && (
                  <p className="mt-1 text-sm text-danger-600">
                    {passwordForm.formState.errors.confirmPassword.message}
                  </p>
                )}
              </div>

              <div className="flex items-center gap-3 pt-2">
                <button
                  type="submit"
                  disabled={isChangingPassword}
                  className="btn btn-primary btn-md"
                >
                  {isChangingPassword ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin mr-2" />
                      Changing...
                    </>
                  ) : (
                    'Change Password'
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowPasswordForm(false);
                    passwordForm.reset();
                  }}
                  className="btn btn-ghost btn-md"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        )}
      </div>

      {/* Account Info */}
      <div className="card">
        <div className="card-header">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Account Information</h2>
        </div>
        <div className="card-body">
          <dl className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <dt className="text-gray-500 dark:text-gray-400">Account Status</dt>
              <dd className="mt-1">
                <span
                  className={`px-2 py-1 rounded-full text-xs font-medium ${
                    user?.isActive
                      ? 'bg-success-100 text-success-700'
                      : 'bg-danger-100 text-danger-700'
                  }`}
                >
                  {user?.isActive ? 'Active' : 'Inactive'}
                </span>
              </dd>
            </div>
            <div>
              <dt className="text-gray-500 dark:text-gray-400">MFA Status</dt>
              <dd className="mt-1">
                <span
                  className={`px-2 py-1 rounded-full text-xs font-medium ${
                    user?.mfaEnabled
                      ? 'bg-success-100 text-success-700'
                      : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
                  }`}
                >
                  {user?.mfaEnabled ? 'Enabled' : 'Disabled'}
                </span>
              </dd>
            </div>
            <div>
              <dt className="text-gray-500 dark:text-gray-400">Member Since</dt>
              <dd className="mt-1 font-medium">
                {user?.createdAt
                  ? formatDate(user.createdAt)
                  : 'N/A'}
              </dd>
            </div>
            <div>
              <dt className="text-gray-500 dark:text-gray-400">Password Last Changed</dt>
              <dd className="mt-1 font-medium">
                {user?.passwordChangedAt
                  ? formatDate(user.passwordChangedAt)
                  : 'Never'}
              </dd>
            </div>
          </dl>
        </div>
      </div>
    </div>
  );
}
