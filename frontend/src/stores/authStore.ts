import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import axios from 'axios';
import { User } from '@finance/shared';
import { api, scheduleTokenRefresh } from '../services/api';

interface AuthState {
  user: User | null;
  accessToken: string | null;
  // refreshToken is intentionally absent — it lives in an HttpOnly cookie,
  // never in JS-accessible storage, to protect against XSS token theft.
  isAuthenticated: boolean;
  isLoading: boolean;
  isInitialized: boolean;
  mfaToken: string | null;

  // Actions
  setUser: (user: User | null) => void;
  setAccessToken: (token: string | null) => void;
  setMfaToken: (token: string | null) => void;
  login: (email: string, password: string) => Promise<{ requiresMfa: boolean }>;
  verifyMfa: (code: string) => Promise<void>;
  register: (email: string, password: string, firstName: string, lastName: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshAccessToken: () => Promise<void>;
  fetchUser: () => Promise<void>;
  initialize: () => Promise<void>;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      accessToken: null,
      isAuthenticated: false,
      isLoading: true,
      isInitialized: false,
      mfaToken: null,

      setUser: (user) => set({ user, isAuthenticated: !!user }),
      setAccessToken: (token) => set({ accessToken: token }),
      setMfaToken: (token) => set({ mfaToken: token }),

      login: async (email, password) => {
        try {
          const response = await api.post('/auth/login', { email, password });
          const data = response.data.data;

          if (data.requiresMfa) {
            set({ mfaToken: data.mfaToken });
            return { requiresMfa: true };
          }

          set({
            user: data.user,
            accessToken: data.accessToken,
            isAuthenticated: true,
            mfaToken: null,
          });

          // Schedule proactive token refresh
          scheduleTokenRefresh();

          return { requiresMfa: false };
        } catch (error) {
          throw error;
        }
      },

      verifyMfa: async (code) => {
        const { mfaToken } = get();
        if (!mfaToken) {
          throw new Error('MFA token not found');
        }

        const response = await api.post('/auth/mfa/verify-login', {
          code,
          mfaToken,
        });

        const data = response.data.data;

        set({
          user: data.user,
          accessToken: data.accessToken,
          isAuthenticated: true,
          mfaToken: null,
        });

        // Schedule proactive token refresh
        scheduleTokenRefresh();
      },

      register: async (email, password, firstName, lastName) => {
        await api.post('/auth/register', {
          email,
          password,
          firstName,
          lastName,
        });
      },

      logout: async () => {
        // POST /auth/logout — the HttpOnly cookie is sent automatically,
        // and the backend will clear it via Set-Cookie on the response.
        try {
          await api.post('/auth/logout');
        } catch {
          // Ignore errors during logout - we'll clear local state anyway
        }

        // Clear in-memory state and local storage
        set({
          user: null,
          accessToken: null,
          isAuthenticated: false,
          mfaToken: null,
        });
        localStorage.removeItem('auth-storage');
      },

      refreshAccessToken: async () => {
        try {
          // Cookie is sent automatically; no body needed
          const response = await api.post('/auth/refresh');
          const { accessToken } = response.data.data;
          set({ accessToken });
        } catch {
          // If refresh fails, logout
          set({
            user: null,
            accessToken: null,
            isAuthenticated: false,
          });
          localStorage.removeItem('auth-storage');
        }
      },

      fetchUser: async () => {
        try {
          const response = await api.get('/auth/me');
          set({ user: response.data.data, isAuthenticated: true });
        } catch (err) {
          // Only clear auth on confirmed 401 (real auth failure).
          // Network errors / 5xx should not log the user out.
          if (axios.isAxiosError(err) && err.response?.status === 401) {
            set({ user: null, isAuthenticated: false });
          }
          throw err;
        }
      },

      initialize: async () => {
        const { isInitialized, accessToken, user } = get();

        // Prevent double initialization
        if (isInitialized) {
          return;
        }

        set({ isLoading: true });

        // If we already have user data from persistence, use it immediately
        if (user && accessToken) {
          set({ isAuthenticated: true, isLoading: false, isInitialized: true });
          // Schedule proactive token refresh
          scheduleTokenRefresh();
          // Still fetch fresh user data in background
          get().fetchUser().catch(() => {
            // Silent refresh in background
          });
          return;
        }

        // Set up initialization timeout (10 seconds max)
        const timeoutId = setTimeout(() => {
          console.warn('Auth initialization timed out, clearing state');
          set({
            user: null,
            accessToken: null,
            isAuthenticated: false,
            isLoading: false,
            isInitialized: true,
          });
          localStorage.removeItem('auth-storage');
        }, 10000);

        if (accessToken) {
          try {
            await get().fetchUser();
          } catch {
            // Token might be expired, try to refresh via cookie
            try {
              await get().refreshAccessToken();
              await get().fetchUser();
            } catch {
              // Refresh failed, clear auth state
              set({ user: null, accessToken: null, isAuthenticated: false });
              localStorage.removeItem('auth-storage');
            }
          }
        }

        clearTimeout(timeoutId);
        set({ isLoading: false, isInitialized: true });
      },
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({
        accessToken: state.accessToken,
        user: state.user,
        // refreshToken deliberately excluded — stored in HttpOnly cookie only
      }),
    }
  )
);

// Initialize on load
useAuthStore.getState().initialize();
