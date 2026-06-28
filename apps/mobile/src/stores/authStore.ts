import { create } from 'zustand';
import { api, TOKEN_KEYS, deleteStoredValue, getStoredValue, setStoredValue } from '../lib/api';
import { registerPushToken } from '../lib/registerPush';
import type { User } from '../types';

const LEGACY_TOKEN_KEY = 'vybeon_token';

interface AuthState {
  // New full user object (nullable until loaded)
  user: User | null;
  // Bare token (kept for legacy screens that read it directly)
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  /** @deprecated use isLoading === false */
  hydrated: boolean;
  hasCompletedOnboarding: boolean;

  setUser: (user: User) => void;
  setLoading: (loading: boolean) => void;
  login: (accessToken: string, refreshToken: string, user: User) => Promise<void>;
  logout: () => Promise<void>;
  updateUser: (updates: Partial<User>) => void;
  setOnboardingComplete: () => void;

  /** Initialise from SecureStore — called by root layout */
  initialize: () => Promise<void>;
  /** @deprecated use initialize() */
  hydrate: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  token: null,
  isAuthenticated: false,
  isLoading: true,
  hydrated: false,
  hasCompletedOnboarding: false,

  setUser: (user) => set({ user }),
  setLoading: (isLoading) => set({ isLoading }),

  login: async (accessToken, refreshToken, user) => {
    await api.saveTokens(accessToken, refreshToken);
    await setStoredValue(TOKEN_KEYS.USER_ID, user.id);
    // Keep legacy key in sync
    await setStoredValue(LEGACY_TOKEN_KEY, accessToken);
    set({ user, token: accessToken, isAuthenticated: true, isLoading: false, hydrated: true });
    void registerPushToken();
  },

  logout: async () => {
    try {
      const refreshToken = await getStoredValue(TOKEN_KEYS.REFRESH);
      if (refreshToken) await api.post('/auth/logout', { refreshToken });
    } catch {
      // best-effort
    }
    await api.clearTokens();
    await deleteStoredValue(LEGACY_TOKEN_KEY).catch(() => undefined);
    set({ user: null, token: null, isAuthenticated: false, hydrated: true });
  },

  updateUser: (updates) => {
    const currentUser = get().user;
    if (currentUser) set({ user: { ...currentUser, ...updates } });
  },

  setOnboardingComplete: () => set({ hasCompletedOnboarding: true }),

  initialize: async () => {
    try {
      // Try new token key first, fall back to legacy
      let accessToken = await getStoredValue(TOKEN_KEYS.ACCESS);
      if (!accessToken) {
        accessToken = await getStoredValue(LEGACY_TOKEN_KEY);
      }

      if (!accessToken) {
        set({ isLoading: false, hydrated: true });
        return;
      }

      const { data } = await api.get<{ user: User }>('/me');
      set({
        user: data.user,
        token: accessToken,
        isAuthenticated: true,
        isLoading: false,
        hydrated: true,
      });
      void registerPushToken();
    } catch {
      await api.clearTokens();
      await deleteStoredValue(LEGACY_TOKEN_KEY).catch(() => undefined);
      set({ user: null, token: null, isAuthenticated: false, isLoading: false, hydrated: true });
    }
  },

  /** @deprecated */
  hydrate: async () => {
    await get().initialize();
  },
}));
