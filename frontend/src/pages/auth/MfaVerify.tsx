import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../stores/authStore';
import { getErrorMessage } from '../../services/api';
import { Loader2, ShieldCheck } from 'lucide-react';

export default function MfaVerify() {
  const [code, setCode] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { verifyMfa, mfaToken } = useAuthStore();
  const navigate = useNavigate();

  // Redirect if no MFA token
  if (!mfaToken) {
    navigate('/login');
    return null;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (code.length !== 6) {
      setError('Please enter a 6-digit code');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      await verifyMfa(code);
      navigate('/');
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setIsLoading(false);
    }
  };

  const handleCodeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/\D/g, '').slice(0, 6);
    setCode(value);
  };

  return (
    <div>
      <div className="flex justify-center mb-4">
        <div className="w-16 h-16 bg-primary-100 rounded-full flex items-center justify-center">
          <ShieldCheck className="w-8 h-8 text-primary-600" />
        </div>
      </div>

      <h2 className="text-xl font-semibold text-gray-900 text-center mb-2">
        Two-Factor Authentication
      </h2>
      <p className="text-gray-600 text-center mb-6">
        Enter the 6-digit code from your authenticator app or use a backup code.
      </p>

      {error && (
        <div className="mb-4 p-3 bg-danger-50 border border-danger-200 rounded-lg text-sm text-danger-700">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <label htmlFor="code" className="label">
            Verification code
          </label>
          <input
            type="text"
            id="code"
            value={code}
            onChange={handleCodeChange}
            placeholder="000000"
            className="input mt-1 text-center text-2xl tracking-widest font-mono"
            autoComplete="one-time-code"
            autoFocus
          />
          <p className="mt-1 text-xs text-gray-500 text-center">
            Enter your 6-digit code or a backup code
          </p>
        </div>

        <button
          type="submit"
          disabled={isLoading || code.length < 6}
          className="btn btn-primary btn-md w-full"
        >
          {isLoading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin mr-2" />
              Verifying...
            </>
          ) : (
            'Verify'
          )}
        </button>
      </form>

      <button
        onClick={() => navigate('/login')}
        className="mt-4 w-full text-sm text-gray-600 hover:text-gray-900"
      >
        Back to login
      </button>
    </div>
  );
}
