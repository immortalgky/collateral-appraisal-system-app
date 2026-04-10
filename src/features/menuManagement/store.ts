import { create } from 'zustand';
import type { MenuTreeNode } from './types';

type MenuStore = {
  main: MenuTreeNode[];
  appraisal: MenuTreeNode[];
  isLoaded: boolean;
  error: string | null;
  setMenu: (main: MenuTreeNode[], appraisal: MenuTreeNode[]) => void;
  setError: (error: string | null) => void;
  reset: () => void;
};

export const useMenuStore = create<MenuStore>(set => ({
  main: [],
  appraisal: [],
  isLoaded: false,
  error: null,

  setMenu: (main, appraisal) => set({ main, appraisal, isLoaded: true, error: null }),
  setError: error => set({ error, isLoaded: true }),
  reset: () => set({ main: [], appraisal: [], isLoaded: false, error: null }),
}));
