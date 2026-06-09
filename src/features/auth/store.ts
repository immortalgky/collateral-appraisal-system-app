import { create } from 'zustand';
import { broadcastLogout, setAccessToken } from '@shared/api/axiosInstance';
import * as appHub from '@shared/realtime/appHub';
import type { User } from './types';

type AuthStore = {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  setUser: (user: User | null) => void;
  setToken: (token: string) => void;
  setLoading: (isLoading: boolean) => void;
  setError: (error: string | null) => void;
  login: (user: User, token: string) => void;
  logout: () => void;
};

export const useAuthStore = create<AuthStore>(set => ({
  user: null,
  isAuthenticated: false,
  isLoading: false,
  error: null,

  setUser: user => set({ user, isAuthenticated: !!user }),
  setToken: token => {
    setAccessToken(token);
    set({ isAuthenticated: true });
  },
  setLoading: isLoading => set({ isLoading }),
  setError: error => set({ error }),

  login: (user, token) => {
    setAccessToken(token);
    set({ user, isAuthenticated: true, error: null });
  },

  logout: () => {
    // Tear down the realtime connection so it stops reconnecting with a stale
    // token (otherwise the orphaned connection lingers for the session).
    appHub.stop().catch(() => {});
    // Broadcast an explicit logout so other tabs clear auth + redirect.
    broadcastLogout();
    set({ user: null, isAuthenticated: false });
  },
}));
