import { create } from 'zustand';
import type { MigrationAction } from '../types';

interface MigrationStoreState {
  actions: Record<string, MigrationAction>;
  setAction: (instanceId: string, action: MigrationAction) => void;
  bulkSet: (ids: string[], action: MigrationAction) => void;
  reset: () => void;
}

export const useMigrationStore = create<MigrationStoreState>((set) => ({
  actions: {},

  setAction: (instanceId, action) =>
    set((state) => ({
      actions: { ...state.actions, [instanceId]: action },
    })),

  bulkSet: (ids, action) =>
    set((state) => {
      const next = { ...state.actions };
      for (const id of ids) {
        next[id] = action;
      }
      return { actions: next };
    }),

  reset: () => set({ actions: {} }),
}));
