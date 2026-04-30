import { create } from 'zustand';
import type {
  AddressSource,
  AddressStore,
  BreadcrumbItem,
  BreadcrumbExtrasStore,
  BreadcrumbStore,
  CompanyItem,
  CompanyStore,
  LoadingStore,
  LocaleStore,
  ParameterStore,
  StoredParameters,
  UIStore,
} from './types';
import type { Parameter } from './types/api';
import type { ThaiAddress } from './data/thaiAddresses';

export const useUIStore = create<UIStore>(set => ({
  sidebarOpen: false,
  setSidebarOpen: (open: boolean) => set({ sidebarOpen: open }),
  sidebarCollapsed: false,
  toggleSidebar: () => set(state => ({ sidebarCollapsed: !state.sidebarCollapsed })),
  searchQuery: '',
  setSearchQuery: (query: string) => set({ searchQuery: query }),
}));

export const useParameterStore = create<ParameterStore>(set => ({
  parameters: {},
  isLoaded: false,
  setParameters: (params: Parameter[]) => {
    const mapped: StoredParameters = {};
    for (const param of params) {
      const name = `${param.group}.${param.country}.${param.language}`.toLowerCase();
      if (Array.isArray(mapped[name])) {
        mapped[name].push(param);
      } else {
        mapped[name] = [param];
      }
    }
    set({
      parameters: mapped,
      isLoaded: true,
    });
  },
}));

export const useLoadingStore = create<LoadingStore>(set => ({
  isLoading: false,
  message: undefined,
  showLoading: (message?: string) => set({ isLoading: true, message }),
  hideLoading: () => set({ isLoading: false, message: undefined }),
}));

// Export utility functions for manual loading control
export const showLoading = (message?: string) => useLoadingStore.getState().showLoading(message);
export const hideLoading = () => useLoadingStore.getState().hideLoading();

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

export const useBreadcrumbExtrasStore = create<BreadcrumbExtrasStore>(set => ({
  extras: [],
  setExtras: (extras: BreadcrumbItem[]) => set({ extras }),
}));

export const useAddressStore = create<AddressStore>((set, get) => ({
  titleAddresses: [],
  dopaAddresses: [],
  setTitleAddresses: (addresses: ThaiAddress[]) => set({ titleAddresses: addresses }),
  setDopaAddresses: (addresses: ThaiAddress[]) => set({ dopaAddresses: addresses }),
  searchBySubDistrict: (query: string, source?: AddressSource): ThaiAddress[] => {
    if (!query.trim()) return [];
    const normalizedQuery = query.toLowerCase().trim();
    const { titleAddresses, dopaAddresses } = get();
    const pool =
      source === 'title'
        ? titleAddresses
        : source === 'dopa'
          ? dopaAddresses
          : [...titleAddresses, ...dopaAddresses];
    return pool.filter(addr => addr.subDistrictName.toLowerCase().includes(normalizedQuery));
  },
}));

export const useLocaleStore = create<LocaleStore>(set => ({
  country: 'th',
  language: 'en',
  setLocale: (country: string, language: string) =>
    set({ country: country.toLowerCase(), language: language.toLowerCase() }),
}));

export const useCompanyStore = create<CompanyStore>(set => ({
  companies: [],
  isLoading: false,
  isLoaded: false,
  setCompanies: (companies: CompanyItem[]) => set({ companies, isLoaded: true, isLoading: false }),
  setLoading: (loading: boolean) => set({ isLoading: loading }),
}));

