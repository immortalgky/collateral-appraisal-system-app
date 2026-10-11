import { create } from 'zustand';
import type { User } from './types';

type AuthStore = {
  user: User | null;
  isAuthenticated: boolean;
  setUser: (user: User | null) => void;
};

export const useAuthStore = create<AuthStore>(set => ({
  user: null,
  isAuthenticated: false,

  // Whether the signed-in user must change their password first lives on the user object (sourced
  // from /auth/me) — read via useAuthStore(s => s.user?.mustChangePassword).
  setUser: user => set({ user, isAuthenticated: !!user }),
}));
