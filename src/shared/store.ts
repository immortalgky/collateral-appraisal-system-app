import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type {
  AddressStore,
  BreadcrumbItem,
  BreadcrumbStore,
  CurrentUser,
  LoadingStore,
  LocaleStore,
  ParameterStore,
  StoredParameters,
  UIStore,
  UserStore,
} from './types';
import type { Parameter } from './types/api';
import { mockThaiAddresses, type ThaiAddress } from './data/thaiAddresses';
import type { WorkflowActivity } from './config/navigation';

export const useUIStore = create<UIStore>(set => ({
  sidebarOpen: false,
  setSidebarOpen: (open: boolean) => set({ sidebarOpen: open }),
  searchQuery: '',
  setSearchQuery: (query: string) => set({ searchQuery: query }),
}));

export const useParameterStore = create<ParameterStore>(set => ({
  parameters: {},
  isLoaded: false,
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

export const useAddressStore = create<AddressStore>((set, get) => ({
  // Initialize with mock data, will be replaced by API data later
  addresses: mockThaiAddresses,
  setAddresses: (addresses: ThaiAddress[]) => set({ addresses }),
  searchBySubDistrict: (query: string): ThaiAddress[] => {
    if (!query.trim()) return [];
    const normalizedQuery = query.toLowerCase().trim();
    return get().addresses.filter(addr =>
      addr.subDistrictName.toLowerCase().includes(normalizedQuery),
    );
  },
}));

export const useLocaleStore = create<LocaleStore>(set => ({
  country: 'TH',
  language: 'EN',
  setLocale: (country: string, language: string) => set({ country, language }),
}));

/**
 * Default user for development (admin role to see all menus)
 * In production, this would be set after authentication
 */
const defaultDevUser: CurrentUser = {
  id: 'dev-user-001',
  username: 'dev.admin',
  displayName: 'Development Admin',
  email: 'dev@example.com',
  avatar: null,
  role: 'admin',
};

/**
 * User store for managing current user and role
 * Persisted to localStorage to maintain state across page refreshes
 */
export const useUserStore = create<UserStore>()(
  persist(
    set => ({
      user: defaultDevUser, // Default to dev user for development
      isAuthenticated: true,
      setUser: (user: CurrentUser | null) =>
        set({
          user,
          isAuthenticated: user !== null,
        }),
      setRole: (role: WorkflowActivity) =>
        set(state => ({
          user: state.user ? { ...state.user, role } : null,
        })),
      logout: () =>
        set({
          user: null,
          isAuthenticated: false,
        }),
    }),
    {
      name: 'user-storage',
      partialize: state => ({ user: state.user, isAuthenticated: state.isAuthenticated }),
    },
  ),
);

/**
 * Get current user's role (returns 'viewer' if not authenticated)
 */
export const getCurrentRole = (): WorkflowActivity => {
  const user = useUserStore.getState().user;
  return user?.role ?? 'viewer';
};
