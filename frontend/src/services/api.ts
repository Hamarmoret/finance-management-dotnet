import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';

const API_URL = import.meta.env.VITE_API_URL || '/api';

export const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true,
});

// Separate axios instance for refresh calls - bypasses interceptors entirely.
// withCredentials is required so the browser sends the HttpOnly refresh_token cookie.
const refreshClient = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true,
});

// ── Helper: read/write access token from localStorage ─────────────────
// The refresh token is delivered via HttpOnly cookie and is never stored in JS.
function getAccessToken(): string | null {
  try {
    const raw = localStorage.getItem('auth-storage');
    if (!raw) return null;
    const { state } = JSON.parse(raw);
    return state?.accessToken ?? null;
  } catch {
    return null;
  }
}

function setAccessToken(accessToken: string) {
  try {
    const raw = localStorage.getItem('auth-storage');
    if (!raw) return;
    const parsed = JSON.parse(raw);
    parsed.state.accessToken = accessToken;
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
    const accessToken = getAccessToken();
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
          const accessToken = getAccessToken();
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
      // The HttpOnly refresh_token cookie is sent automatically by the browser.
      // No body needed — the backend reads the cookie.
      const response = await refreshClient.post('/auth/refresh');
      const { accessToken } = response.data.data;

      // Store the new access token
      setAccessToken(accessToken);

      processQueue(null);

      // Retry the original request with the new token
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

  const accessToken = getAccessToken();
  if (!accessToken) return;

  const expiry = getTokenExpiry(accessToken);
  if (!expiry) return;

  const now = Date.now();
  const timeUntilExpiry = expiry - now;

  // If token is already expired (or expires within 2 min), skip the proactive refresh.
  // The 401 interceptor handles this — scheduling a timer with delay=0 would race
  // with the interceptor and cause both to call /auth/refresh simultaneously with the
  // same refresh token, invalidating one of them and triggering a spurious logout.
  if (timeUntilExpiry <= 2 * 60 * 1000) return;

  // Refresh 2 minutes before expiry
  const refreshIn = timeUntilExpiry - 2 * 60 * 1000;

  refreshTimer = setTimeout(async () => {
    try {
      // Cookie is sent automatically; no body required
      const response = await refreshClient.post('/auth/refresh');
      const { accessToken: newAt } = response.data.data;

      setAccessToken(newAt);

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
