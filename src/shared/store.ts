import { create } from 'zustand';
import type { ParameterStore, StoredParameters, UIStore } from './types';
import type { Parameter } from './types/api';

export const useUIStore = create<UIStore>(set => ({
  sidebarOpen: false,
  setSidebarOpen: (open: boolean) => set({ sidebarOpen: open }),
  searchQuery: '',
  setSearchQuery: (query: string) => set({ searchQuery: query }),
}));

export const useParameterStore = create<ParameterStore>(set => ({
  parameters: {},
  setParameters: (params: Parameter[]) => {
    const mapped: StoredParameters = {};
    for (const param of params) {
      const name = `${param.group}.${param.country}.${param.language}`;
      if (Array.isArray(mapped[name])) {
        mapped[name].push(param);
      } else {
        mapped[name] = [param];
      }
    }
    set({
      parameters: mapped,
    });
  },
}));
