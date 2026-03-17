import { create } from 'zustand';
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
    localStorage.setItem('auth_token', token);
  },
  setLoading: isLoading => set({ isLoading }),
  setError: error => set({ error }),

  login: (user, token) => {
    localStorage.setItem('auth_token', token);
    set({ user, isAuthenticated: true, error: null });
  },

  logout: () => {
    localStorage.removeItem('auth_token');
    set({ user: null, isAuthenticated: false });
  },
}));
