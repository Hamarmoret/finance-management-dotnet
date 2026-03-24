import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';

const API_URL = import.meta.env.VITE_API_URL || '/api';

export const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true,
});

// Separate axios instance for refresh calls - bypasses interceptors entirely
const refreshClient = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// ── Helper: read/write auth from localStorage ──────────────────────────
function getAuthState(): { accessToken: string | null; refreshToken: string | null } {
  try {
    const raw = localStorage.getItem('auth-storage');
    if (!raw) return { accessToken: null, refreshToken: null };
    const { state } = JSON.parse(raw);
    return {
      accessToken: state?.accessToken ?? null,
      refreshToken: state?.refreshToken ?? null,
    };
  } catch {
    return { accessToken: null, refreshToken: null };
  }
}

function setAuthTokens(accessToken: string, refreshToken?: string) {
  try {
    const raw = localStorage.getItem('auth-storage');
    if (!raw) return;
    const parsed = JSON.parse(raw);
    parsed.state.accessToken = accessToken;
    if (refreshToken) {
      parsed.state.refreshToken = refreshToken;
    }
    localStorage.setItem('auth-storage', JSON.stringify(parsed));
  } catch {
    // Ignore
  }
}

function clearAuth() {
  localStorage.removeItem('auth-storage');
}

// ── Request interceptor ────────────────────────────────────────────────
api.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const { accessToken } = getAuthState();
    if (accessToken) {
      config.headers.Authorization = `Bearer ${accessToken}`;
    }

    // Remove Content-Type for FormData - let axios set it with the correct boundary
    if (config.data instanceof FormData) {
      delete config.headers['Content-Type'];
    }

    return config;
  },
  (error) => Promise.reject(error)
);

// ── Response interceptor with token refresh ────────────────────────────
let isRefreshing = false;
let failedQueue: Array<{
  resolve: (value?: unknown) => void;
  reject: (reason?: unknown) => void;
}> = [];

const processQueue = (error: Error | null) => {
  failedQueue.forEach((promise) => {
    if (error) {
      promise.reject(error);
    } else {
      promise.resolve();
    }
  });
  failedQueue = [];
};

api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & {
      _retry?: boolean;
    };

    // Only handle 401 errors, and only retry once
    if (error.response?.status !== 401 || originalRequest._retry) {
      return Promise.reject(error);
    }

    // Don't try to refresh for auth endpoints (login, register, etc.)
    const url = originalRequest.url || '';
    if (url.includes('/auth/login') || url.includes('/auth/register') || url.includes('/auth/refresh')) {
      return Promise.reject(error);
    }

    if (isRefreshing) {
      // Queue this request until refresh completes
      return new Promise((resolve, reject) => {
        failedQueue.push({ resolve, reject });
      })
        .then(() => {
          // After refresh, update the auth header and retry
          const { accessToken } = getAuthState();
          if (accessToken) {
            originalRequest.headers.Authorization = `Bearer ${accessToken}`;
          }
          return api(originalRequest);
        })
        .catch((err) => Promise.reject(err));
    }

    originalRequest._retry = true;
    isRefreshing = true;

    try {
      const { refreshToken: rt } = getAuthState();
      if (!rt) {
        throw new Error('No refresh token available');
      }

      // Use refreshClient (no interceptors) to avoid infinite loop
      const response = await refreshClient.post('/auth/refresh', { refreshToken: rt });
      const { accessToken, refreshToken: newRefreshToken } = response.data.data;

      // Update stored tokens
      setAuthTokens(accessToken, newRefreshToken);

      processQueue(null);

      // Retry the original request with new token
      originalRequest.headers.Authorization = `Bearer ${accessToken}`;
      return api(originalRequest);
    } catch (refreshError) {
      processQueue(refreshError as Error);

      // Refresh failed - clear auth and redirect to login
      clearAuth();
      window.location.href = '/login';

      return Promise.reject(refreshError);
    } finally {
      isRefreshing = false;
    }
  }
);

// ── Proactive token refresh ────────────────────────────────────────────
// Refresh the access token before it expires to avoid 401 errors
let refreshTimer: ReturnType<typeof setTimeout> | null = null;

function getTokenExpiry(token: string): number | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const payload = JSON.parse(atob(parts[1]));
    return payload.exp ? payload.exp * 1000 : null; // convert to ms
  } catch {
    return null;
  }
}

export function scheduleTokenRefresh() {
  if (refreshTimer) {
    clearTimeout(refreshTimer);
    refreshTimer = null;
  }

  const { accessToken, refreshToken: rt } = getAuthState();
  if (!accessToken || !rt) return;

  const expiry = getTokenExpiry(accessToken);
  if (!expiry) return;

  // Refresh 2 minutes before expiry (or immediately if less than 2 min left)
  const now = Date.now();
  const timeUntilExpiry = expiry - now;
  const refreshIn = Math.max(0, timeUntilExpiry - 2 * 60 * 1000);

  refreshTimer = setTimeout(async () => {
    try {
      const { refreshToken: currentRt } = getAuthState();
      if (!currentRt) return;

      const response = await refreshClient.post('/auth/refresh', { refreshToken: currentRt });
      const { accessToken: newAt, refreshToken: newRt } = response.data.data;

      setAuthTokens(newAt, newRt);

      // Schedule next refresh
      scheduleTokenRefresh();
    } catch {
      // Proactive refresh failed - will fall back to interceptor on next 401
    }
  }, refreshIn);
}

// Helper function to extract error message
export function getErrorMessage(error: unknown): string {
  if (axios.isAxiosError(error)) {
    const axiosError = error as AxiosError<{ error: { message: string } }>;
    return axiosError.response?.data?.error?.message || axiosError.message;
  }

  if (error instanceof Error) {
    return error.message;
  }

  return 'An unexpected error occurred';
}

export default api;
