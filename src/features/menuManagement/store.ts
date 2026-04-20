import { create } from 'zustand';
import type { MenuTreeNode } from './types';

type MenuStore = {
  main: MenuTreeNode[];
  appraisal: MenuTreeNode[];
  isLoaded: boolean;
  error: string | null;
  /**
   * The activityId currently reflected in `appraisal`, or null when the tree
   * is role-only (no activity context). Used by ActivityMenuSync to avoid
   * redundant refetches when the same activity reopens.
   */
  activeActivityId: string | null;
  setMenu: (main: MenuTreeNode[], appraisal: MenuTreeNode[]) => void;
  /**
   * Replace only the appraisal tree — used when entering a task activity so
   * the main nav keeps its cached state while the appraisal sidebar picks up
   * activity-scoped overrides from the backend.
   */
  setAppraisalTree: (appraisal: MenuTreeNode[], activityId: string | null) => void;
  setError: (error: string | null) => void;
  reset: () => void;
};

export const useMenuStore = create<MenuStore>(set => ({
  main: [],
  appraisal: [],
  isLoaded: false,
  error: null,
  activeActivityId: null,

  setMenu: (main, appraisal) =>
    set({ main, appraisal, isLoaded: true, error: null, activeActivityId: null }),
  setAppraisalTree: (appraisal, activityId) => set({ appraisal, activeActivityId: activityId }),
  setError: error => set({ error, isLoaded: true }),
  reset: () =>
    set({ main: [], appraisal: [], isLoaded: false, error: null, activeActivityId: null }),
}));
