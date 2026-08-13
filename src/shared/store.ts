import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type {
  AddressSource,
  AddressStore,
  BreadcrumbItem,
  BreadcrumbExtrasStore,
  BreadcrumbStore,
  CompanyItem,
  CompanyStore,
  DealerStore,
  LoadingStore,
  LocaleStore,
  ParameterStore,
  StoredParameters,
  Theme,
  UIStore,
} from './types';
import {
  SIDEBAR_MIN_WIDTH,
  SIDEBAR_MAX_WIDTH,
  SIDEBAR_DEFAULT_WIDTH,
} from './components/sidebarConstants';
import type { Dealer, Parameter } from './types/api';
import type { ThaiAddress } from './data/thaiAddresses';

export const useUIStore = create<UIStore>()(
  persist(
    set => ({
      sidebarOpen: false,
      setSidebarOpen: (open: boolean) => set({ sidebarOpen: open }),
      sidebarCollapsed: false,
      toggleSidebar: () => set(state => ({ sidebarCollapsed: !state.sidebarCollapsed })),
      sidebarWidth: SIDEBAR_DEFAULT_WIDTH,
      setSidebarWidth: (width: number) =>
        set({ sidebarWidth: Math.max(SIDEBAR_MIN_WIDTH, Math.min(SIDEBAR_MAX_WIDTH, width)) }),
      resetSidebarWidth: () => set({ sidebarWidth: SIDEBAR_DEFAULT_WIDTH }),
      searchQuery: '',
      setSearchQuery: (query: string) => set({ searchQuery: query }),
      theme: 'light',
      setTheme: (theme: Theme) => set({ theme }),
      toggleTheme: () => set(state => ({ theme: state.theme === 'light' ? 'dark' : 'light' })),
    }),
    {
      name: 'cas-ui-store',
      partialize: state => ({
        sidebarCollapsed: state.sidebarCollapsed,
        sidebarWidth: state.sidebarWidth,
        theme: state.theme,
      }),
      merge: (persisted, current) => {
        const p = (persisted ?? {}) as Partial<{
          sidebarWidth: unknown;
          sidebarCollapsed: unknown;
          theme: unknown;
        }>;
        const rawW = p.sidebarWidth;
        const w =
          typeof rawW === 'number' && Number.isFinite(rawW)
            ? Math.max(SIDEBAR_MIN_WIDTH, Math.min(SIDEBAR_MAX_WIDTH, rawW))
            : SIDEBAR_DEFAULT_WIDTH;
        const collapsed = typeof p.sidebarCollapsed === 'boolean' ? p.sidebarCollapsed : false;
        const theme: Theme = p.theme === 'light' || p.theme === 'dark' ? p.theme : 'light';
        return { ...current, sidebarWidth: w, sidebarCollapsed: collapsed, theme };
      },
    },
  ),
);

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

export const useDealerStore = create<DealerStore>(set => ({
  dealers: [],
  isLoaded: false,
  setDealers: (dealers: Dealer[]) => set({ dealers, isLoaded: true }),
}));

// Ref-count so that overlapping callers (e.g. two concurrent task completions,
// or a completion while another loading action is active) don't prematurely
// hide the overlay. The overlay stays visible until every caller has settled.
let _loadingRefCount = 0;

export const useLoadingStore = create<LoadingStore>(set => ({
  isLoading: false,
  message: undefined,
  showLoading: (message?: string) => {
    _loadingRefCount += 1;
    set({ isLoading: true, message });
  },
  hideLoading: () => {
    _loadingRefCount = Math.max(0, _loadingRefCount - 1);
    if (_loadingRefCount === 0) {
      set({ isLoading: false, message: undefined });
    }
  },
  setMessage: (message: string) =>
    set(state => (state.isLoading ? { message } : {})),
}));

// Export utility functions for manual loading control
export const showLoading = (message?: string) => useLoadingStore.getState().showLoading(message);
export const hideLoading = () => useLoadingStore.getState().hideLoading();
export const setLoadingMessage = (message: string) =>
  useLoadingStore.getState().setMessage(message);

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

/**
 * Build the lowercased text a query is matched against: sub-district, district and province names
 * plus the postcode, so a common sub-district name can be narrowed by typing its district or
 * province ("หนองบัว ขอนแก่น").
 *
 * A handful of names genuinely contain a space ("บ้านใหม่ บางพัง", "บางกอกใหญ่ ธนบุรี"), so a second
 * space-stripped copy is appended — that way the name is found whether or not the user types the
 * space. The two copies are separated by \n, which can never appear inside a token because the
 * query is split on whitespace.
 */
const buildAddressSearchKey = (addr: ThaiAddress): string => {
  const text =
    `${addr.subDistrictName} ${addr.districtName} ${addr.provinceName} ${addr.postcode}`.toLowerCase();
  return `${text}\n${text.replace(/\s+/g, '')}`;
};

const buildAddressSearchIndex = (addresses: ThaiAddress[]): string[] =>
  addresses.map(buildAddressSearchKey);

export const useAddressStore = create<AddressStore>((set, get) => ({
  titleAddresses: [],
  dopaAddresses: [],
  titleSearchIndex: [],
  dopaSearchIndex: [],
  setTitleAddresses: (addresses: ThaiAddress[]) =>
    set({ titleAddresses: addresses, titleSearchIndex: buildAddressSearchIndex(addresses) }),
  setDopaAddresses: (addresses: ThaiAddress[]) =>
    set({ dopaAddresses: addresses, dopaSearchIndex: buildAddressSearchIndex(addresses) }),
  searchBySubDistrict: (query: string, source?: AddressSource): ThaiAddress[] => {
    const normalizedQuery = query.toLowerCase().trim();
    if (!normalizedQuery) return [];
    const tokens = normalizedQuery.split(/\s+/);
    const [firstToken] = tokens;

    const { titleAddresses, dopaAddresses, titleSearchIndex, dopaSearchIndex } = get();
    const pools: [ThaiAddress[], string[]][] =
      source === 'title'
        ? [[titleAddresses, titleSearchIndex]]
        : source === 'dopa'
          ? [[dopaAddresses, dopaSearchIndex]]
          : [
              [titleAddresses, titleSearchIndex],
              [dopaAddresses, dopaSearchIndex],
            ];

    const seen = new Set<string>();
    const matches: { address: ThaiAddress; tier: number }[] = [];

    for (const [addresses, searchIndex] of pools) {
      for (let i = 0; i < addresses.length; i++) {
        const address = addresses[i];
        // With no source both datasets are searched; keep title's row and drop dopa's duplicate,
        // matching findAddressBySubDistrictCode's title-first precedence.
        if (seen.has(address.subDistrictCode)) continue;

        const key = searchIndex[i] ?? buildAddressSearchKey(address);
        if (!tokens.every(token => key.includes(token))) continue;

        seen.add(address.subDistrictCode);
        const name = address.subDistrictName.toLowerCase();
        matches.push({
          address,
          tier:
            name === normalizedQuery
              ? 0
              : name.startsWith(firstToken)
                ? 1
                : name.includes(firstToken)
                  ? 2
                  : 3, // matched only via district / province / postcode
        });
      }
    }

    // Rank by relevance, then by code so ordering within a tier stays stable and familiar.
    return matches
      .sort(
        (a, b) =>
          a.tier - b.tier || a.address.subDistrictCode.localeCompare(b.address.subDistrictCode),
      )
      .map(match => match.address);
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

