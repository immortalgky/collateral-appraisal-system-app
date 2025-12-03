import { create } from 'zustand';
import type { BreadcrumbItem, BreadcrumbStore, ParameterStore, StoredParameters, UIStore } from './types';
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

export const useBreadcrumbStore = create<BreadcrumbStore>(set => ({
  items: [],
  setItems: (items: BreadcrumbItem[]) => set({ items }),
  push: (item: BreadcrumbItem) =>
    set(state => {
      // Check if item already exists in the breadcrumb
      const existingIndex = state.items.findIndex(i => i.href === item.href);
      if (existingIndex !== -1) {
        // If exists, truncate to that point (navigate back in history)
        return { items: state.items.slice(0, existingIndex + 1) };
      }
      // Otherwise add new item
      return { items: [...state.items, item] };
    }),
  pop: () => set(state => ({ items: state.items.slice(0, -1) })),
  reset: () => set({ items: [] }),
}));
