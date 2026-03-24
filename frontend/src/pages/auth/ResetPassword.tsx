import { useState, useEffect } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { api, getErrorMessage } from '../../services/api';
import { Loader2, Eye, EyeOff, CheckCircle, XCircle, ArrowLeft } from 'lucide-react';

const resetPasswordSchema = z
  .object({
    newPassword: z
      .string()
      .min(12, 'Password must be at least 12 characters')
      .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
      .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
      .regex(/[0-9]/, 'Password must contain at least one number')
      .regex(
        /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/,
        'Password must contain at least one special character'
      ),
    confirmPassword: z.string().min(1, 'Confirm password is required'),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });

type ResetPasswordFormData = z.infer<typeof resetPasswordSchema>;

export default function ResetPassword() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get('token');

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isValidating, setIsValidating] = useState(true);
  const [isTokenValid, setIsTokenValid] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<ResetPasswordFormData>({
    resolver: zodResolver(resetPasswordSchema),
  });

  const password = watch('newPassword', '');

  // Password strength indicators
  const passwordChecks = {
    length: password.length >= 12,
    uppercase: /[A-Z]/.test(password),
    lowercase: /[a-z]/.test(password),
    number: /[0-9]/.test(password),
    special: /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password),
  };

  // Validate token on mount
  useEffect(() => {
    async function validateToken() {
      if (!token) {
        setIsValidating(false);
        setIsTokenValid(false);
        return;
      }

      try {
        const response = await api.get(`/auth/reset-password/${token}`);
        setIsTokenValid(response.data.data.valid);
      } catch {
        setIsTokenValid(false);
      } finally {
        setIsValidating(false);
      }
    }

    validateToken();
  }, [token]);

  const onSubmit = async (data: ResetPasswordFormData) => {
    if (!token) return;

    setIsLoading(true);
    setError(null);

    try {
      await api.post('/auth/reset-password', {
        token,
        newPassword: data.newPassword,
        confirmPassword: data.confirmPassword,
      });
      setIsSuccess(true);

      // Redirect to login after 3 seconds
      setTimeout(() => {
        navigate('/login');
      }, 3000);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setIsLoading(false);
    }
  };

  // Loading state
  if (isValidating) {
    return (
      <div className="text-center">
        <Loader2 className="w-8 h-8 animate-spin mx-auto text-primary-600 mb-4" />
        <p className="text-gray-600">Validating reset link...</p>
      </div>
    );
  }

  // Invalid or missing token
  if (!token || !isTokenValid) {
    return (
      <div className="text-center">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-danger-100 mb-4">
          <XCircle className="h-6 w-6 text-danger-600" />
        </div>
        <h2 className="text-xl font-semibold text-gray-900 mb-2">Invalid or expired link</h2>
        <p className="text-sm text-gray-600 mb-6">
          This password reset link is invalid or has expired. Please request a new one.
        </p>
        <Link to="/forgot-password" className="btn btn-primary btn-md">
          Request new reset link
        </Link>
        <p className="mt-4">
          <Link
            to="/login"
            className="inline-flex items-center text-sm font-medium text-primary-600 hover:text-primary-500"
          >
            <ArrowLeft className="w-4 h-4 mr-1" />
            Back to sign in
          </Link>
        </p>
      </div>
    );
  }

  // Success state
  if (isSuccess) {
    return (
      <div className="text-center">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-success-100 mb-4">
          <CheckCircle className="h-6 w-6 text-success-600" />
        </div>
        <h2 className="text-xl font-semibold text-gray-900 mb-2">Password reset successful!</h2>
        <p className="text-sm text-gray-600 mb-6">
          Your password has been reset. Redirecting you to sign in...
        </p>
        <Link
          to="/login"
          className="inline-flex items-center text-sm font-medium text-primary-600 hover:text-primary-500"
        >
          <ArrowLeft className="w-4 h-4 mr-1" />
          Go to sign in
        </Link>
      </div>
    );
  }

  return (
    <div>
      <h2 className="text-xl font-semibold text-gray-900 mb-2">Reset your password</h2>
      <p className="text-sm text-gray-600 mb-6">
        Enter your new password below.
      </p>

      {error && (
        <div className="mb-4 p-3 bg-danger-50 border border-danger-200 rounded-lg text-sm text-danger-700">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
        <div>
          <label htmlFor="newPassword" className="label">
            New Password
          </label>
          <div className="relative mt-1">
            <input
              {...register('newPassword')}
              type={showPassword ? 'text' : 'password'}
              id="newPassword"
              autoComplete="new-password"
              className={`input pr-10 ${errors.newPassword ? 'border-danger-500' : ''}`}
              placeholder="Enter new password"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              {showPassword ? (
                <EyeOff className="w-4 h-4" />
              ) : (
                <Eye className="w-4 h-4" />
              )}
            </button>
          </div>
          {errors.newPassword && (
            <p className="mt-1 text-sm text-danger-600">{errors.newPassword.message}</p>
          )}

          {/* Password strength checklist */}
          {password.length > 0 && (
            <div className="mt-3 space-y-1">
              <PasswordCheck passed={passwordChecks.length} text="At least 12 characters" />
              <PasswordCheck passed={passwordChecks.uppercase} text="One uppercase letter" />
              <PasswordCheck passed={passwordChecks.lowercase} text="One lowercase letter" />
              <PasswordCheck passed={passwordChecks.number} text="One number" />
              <PasswordCheck passed={passwordChecks.special} text="One special character" />
            </div>
          )}
        </div>

        <div>
          <label htmlFor="confirmPassword" className="label">
            Confirm New Password
          </label>
          <div className="relative mt-1">
            <input
              {...register('confirmPassword')}
              type={showConfirmPassword ? 'text' : 'password'}
              id="confirmPassword"
              autoComplete="new-password"
              className={`input pr-10 ${errors.confirmPassword ? 'border-danger-500' : ''}`}
              placeholder="Confirm new password"
            />
            <button
              type="button"
              onClick={() => setShowConfirmPassword(!showConfirmPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              {showConfirmPassword ? (
                <EyeOff className="w-4 h-4" />
              ) : (
                <Eye className="w-4 h-4" />
              )}
            </button>
          </div>
          {errors.confirmPassword && (
            <p className="mt-1 text-sm text-danger-600">{errors.confirmPassword.message}</p>
          )}
        </div>

        <button
          type="submit"
          disabled={isLoading}
          className="btn btn-primary btn-md w-full"
        >
          {isLoading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin mr-2" />
              Resetting password...
            </>
          ) : (
            'Reset password'
          )}
        </button>
      </form>

      <p className="mt-6 text-center">
        <Link
          to="/login"
          className="inline-flex items-center text-sm font-medium text-primary-600 hover:text-primary-500"
        >
          <ArrowLeft className="w-4 h-4 mr-1" />
          Back to sign in
        </Link>
      </p>
    </div>
  );
}

// Helper component for password strength checklist
function PasswordCheck({ passed, text }: { passed: boolean; text: string }) {
  return (
    <div className="flex items-center text-xs">
      {passed ? (
        <CheckCircle className="w-3.5 h-3.5 text-success-500 mr-1.5" />
      ) : (
        <XCircle className="w-3.5 h-3.5 text-gray-300 mr-1.5" />
      )}
      <span className={passed ? 'text-success-600' : 'text-gray-500'}>{text}</span>
    </div>
  );
}
