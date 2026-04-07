import { create } from 'zustand';
import { setAccessToken } from '@shared/api/axiosInstance';
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
    setAccessToken(null);
    set({ user: null, isAuthenticated: false });
  },
}));
