import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { X, Loader2, UserPlus, Mail } from 'lucide-react';
import { api, getErrorMessage } from '../../../services/api';

const inviteSchema = z.object({
  email: z.string().email('Invalid email address'),
  firstName: z.string().min(1, 'First name is required'),
  lastName: z.string().min(1, 'Last name is required'),
  role: z.enum(['admin', 'manager', 'viewer']),
  password: z
    .string()
    .min(12, 'Password must be at least 12 characters')
    .max(128, 'Password must be 128 characters or less')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number')
    .regex(/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/, 'Password must contain at least one special character'),
});

type InviteFormData = z.infer<typeof inviteSchema>;

interface InviteUserModalProps {
  onClose: () => void;
  onSaved: () => void;
}

export default function InviteUserModal({ onClose, onSaved }: InviteUserModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<InviteFormData>({
    resolver: zodResolver(inviteSchema),
    defaultValues: {
      role: 'viewer',
    },
  });

  const onSubmit = async (data: InviteFormData) => {
    setIsSubmitting(true);
    setError(null);

    try {
      // Register the new user
      await api.post('/auth/register', {
        email: data.email,
        firstName: data.firstName,
        lastName: data.lastName,
        password: data.password,
      });

      // Note: After registration, we'd need to update the role via admin API
      // For now, users register as viewers by default
      // An admin can change the role after the user is created

      setSuccess(true);
      setTimeout(() => {
        onSaved();
      }, 1500);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-full items-center justify-center p-4">
        <div className="fixed inset-0 bg-black/50" onClick={onClose} />

        <div className="relative bg-white rounded-lg shadow-xl max-w-md w-full">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b">
            <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
              <UserPlus className="w-5 h-5" />
              Add New User
            </h2>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Body */}
          {success ? (
            <div className="p-6 text-center">
              <div className="w-12 h-12 bg-success-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Mail className="w-6 h-6 text-success-600" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">User Created!</h3>
              <p className="text-sm text-gray-500">
                The user account has been created. They can now log in with the provided credentials.
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit(onSubmit)}>
              <div className="p-4 space-y-4">
                {error && (
                  <div className="p-3 bg-danger-50 border border-danger-200 rounded-lg text-sm text-danger-700">
                    {error}
                  </div>
                )}

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="firstName" className="label">
                      First Name
                    </label>
                    <input
                      {...register('firstName')}
                      type="text"
                      id="firstName"
                      className={`input mt-1 ${errors.firstName ? 'border-danger-500' : ''}`}
                    />
                    {errors.firstName && (
                      <p className="mt-1 text-sm text-danger-600">{errors.firstName.message}</p>
                    )}
                  </div>

                  <div>
                    <label htmlFor="lastName" className="label">
                      Last Name
                    </label>
                    <input
                      {...register('lastName')}
                      type="text"
                      id="lastName"
                      className={`input mt-1 ${errors.lastName ? 'border-danger-500' : ''}`}
                    />
                    {errors.lastName && (
                      <p className="mt-1 text-sm text-danger-600">{errors.lastName.message}</p>
                    )}
                  </div>
                </div>

                <div>
                  <label htmlFor="email" className="label">
                    Email Address
                  </label>
                  <input
                    {...register('email')}
                    type="email"
                    id="email"
                    className={`input mt-1 ${errors.email ? 'border-danger-500' : ''}`}
                  />
                  {errors.email && (
                    <p className="mt-1 text-sm text-danger-600">{errors.email.message}</p>
                  )}
                </div>

                <div>
                  <label htmlFor="password" className="label">
                    Temporary Password
                  </label>
                  <input
                    {...register('password')}
                    type="text"
                    id="password"
                    placeholder="At least 12 characters"
                    className={`input mt-1 ${errors.password ? 'border-danger-500' : ''}`}
                  />
                  {errors.password && (
                    <p className="mt-1 text-sm text-danger-600">{errors.password.message}</p>
                  )}
                  <p className="mt-1 text-xs text-gray-500">
                    Min 12 chars, with uppercase, lowercase, number, and special character.
                    Share this password with the user. They should change it after first login.
                  </p>
                </div>

                <div>
                  <label htmlFor="role" className="label">
                    Role
                  </label>
                  <select
                    {...register('role')}
                    id="role"
                    className="input mt-1"
                  >
                    <option value="viewer">Viewer - Can view data only</option>
                    <option value="manager">Manager - Can edit data</option>
                    <option value="admin">Admin - Full access</option>
                  </select>
                  <p className="mt-1 text-xs text-gray-500">
                    You can change the user's role after they're created.
                  </p>
                </div>
              </div>

              {/* Footer */}
              <div className="flex justify-end gap-3 p-4 border-t">
                <button type="button" onClick={onClose} className="btn btn-ghost btn-md">
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="btn btn-primary btn-md"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin mr-2" />
                      Creating...
                    </>
                  ) : (
                    'Create User'
                  )}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
