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
  Density,
  FormLayout,
  LoadingStore,
  PropertiesViewMode,
  MarketsViewMode,
  GalleryPrefs,
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
import { DEFAULT_DENSITY, isDensity } from './components/densityConstants';
import { DEFAULT_FORM_LAYOUT, isFormLayout } from './components/formLayoutConstants';
import {
  DEFAULT_PROPERTIES_VIEW_MODE,
  isPropertiesViewMode,
} from './components/propertiesViewModeConstants';
import {
  DEFAULT_MARKETS_VIEW_MODE,
  isMarketsViewMode,
} from './components/marketsViewModeConstants';

/** How the gallery is arranged until someone changes it: grouped by photo type, newest first. */
const DEFAULT_GALLERY_PREFS: GalleryPrefs = { group: 'type', sort: 'newest', view: 'grid' };

/** Each field checked on its own, so one stale value falls back without discarding the rest. */
const readGalleryPrefs = (value: unknown): GalleryPrefs => {
  const v = (value ?? {}) as Partial<Record<keyof GalleryPrefs, unknown>>;
  return {
    group: v.group === 'flat' ? 'flat' : 'type',
    sort: v.sort === 'oldest' || v.sort === 'name' ? v.sort : 'newest',
    view: v.view === 'list' ? 'list' : 'grid',
  };
};
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
      density: DEFAULT_DENSITY,
      setDensity: (density: Density) => set({ density }),
      formLayout: DEFAULT_FORM_LAYOUT,
      setFormLayout: (formLayout: FormLayout) => set({ formLayout }),
      propertiesViewMode: DEFAULT_PROPERTIES_VIEW_MODE,
      setPropertiesViewMode: (propertiesViewMode: PropertiesViewMode) =>
        set({ propertiesViewMode }),
      marketsViewMode: DEFAULT_MARKETS_VIEW_MODE,
      setMarketsViewMode: (marketsViewMode: MarketsViewMode) => set({ marketsViewMode }),
      galleryPrefs: DEFAULT_GALLERY_PREFS,
      setGalleryPrefs: (patch: Partial<GalleryPrefs>) =>
        set(state => ({ galleryPrefs: { ...state.galleryPrefs, ...patch } })),
      photoTopicsPreviewOpen: true,
      setPhotoTopicsPreviewOpen: (photoTopicsPreviewOpen: boolean) =>
        set({ photoTopicsPreviewOpen }),
      appraisalDetailsOpen: true,
      setAppraisalDetailsOpen: (appraisalDetailsOpen: boolean) => set({ appraisalDetailsOpen }),
    }),
    {
      name: 'cas-ui-store',
      partialize: state => ({
        sidebarCollapsed: state.sidebarCollapsed,
        sidebarWidth: state.sidebarWidth,
        theme: state.theme,
        density: state.density,
        formLayout: state.formLayout,
        propertiesViewMode: state.propertiesViewMode,
        marketsViewMode: state.marketsViewMode,
        galleryPrefs: state.galleryPrefs,
        photoTopicsPreviewOpen: state.photoTopicsPreviewOpen,
        appraisalDetailsOpen: state.appraisalDetailsOpen,
      }),
      merge: (persisted, current) => {
        const p = (persisted ?? {}) as Partial<{
          sidebarWidth: unknown;
          sidebarCollapsed: unknown;
          theme: unknown;
          density: unknown;
          formLayout: unknown;
          propertiesViewMode: unknown;
          marketsViewMode: unknown;
          galleryPrefs: unknown;
          photoTopicsPreviewOpen: unknown;
          appraisalDetailsOpen: unknown;
        }>;
        const rawW = p.sidebarWidth;
        const w =
          typeof rawW === 'number' && Number.isFinite(rawW)
            ? Math.max(SIDEBAR_MIN_WIDTH, Math.min(SIDEBAR_MAX_WIDTH, rawW))
            : SIDEBAR_DEFAULT_WIDTH;
        const collapsed = typeof p.sidebarCollapsed === 'boolean' ? p.sidebarCollapsed : false;
        const theme: Theme = p.theme === 'light' || p.theme === 'dark' ? p.theme : 'light';
        const density: Density = isDensity(p.density) ? p.density : DEFAULT_DENSITY;
        const formLayout: FormLayout = isFormLayout(p.formLayout)
          ? p.formLayout
          : DEFAULT_FORM_LAYOUT;
        const propertiesViewMode: PropertiesViewMode = isPropertiesViewMode(p.propertiesViewMode)
          ? p.propertiesViewMode
          : DEFAULT_PROPERTIES_VIEW_MODE;
        const marketsViewMode: MarketsViewMode = isMarketsViewMode(p.marketsViewMode)
          ? p.marketsViewMode
          : DEFAULT_MARKETS_VIEW_MODE;
        return {
          ...current,
          sidebarWidth: w,
          sidebarCollapsed: collapsed,
          theme,
          density,
          formLayout,
          propertiesViewMode,
          marketsViewMode,
          galleryPrefs: readGalleryPrefs(p.galleryPrefs),
          photoTopicsPreviewOpen:
            typeof p.photoTopicsPreviewOpen === 'boolean' ? p.photoTopicsPreviewOpen : true,
          appraisalDetailsOpen:
            typeof p.appraisalDetailsOpen === 'boolean' ? p.appraisalDetailsOpen : true,
        };
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

// `pending` ref-counts callers so that overlapping ones (e.g. two concurrent task
// completions, or a completion while another loading action is active) don't
// prematurely hide the overlay: it stays up until every caller has settled.
//
// It lives in the store rather than in a module variable so that resetting the state
// resets the count with it. As a module variable the two could drift apart — a reset
// left the count standing, and the next hideLoading() decremented to 1 instead of 0
// and left the overlay up for good.
export const useLoadingStore = create<LoadingStore>(set => ({
  isLoading: false,
  message: undefined,
  pending: 0,
  // Counts from 1 again whenever the overlay is down: nobody can be pending while it is
  // hidden, so a count left over from a reset (or from any hideLoading the overlay never
  // saw) cannot survive into the next run and pin the overlay open.
  showLoading: (message?: string) =>
    set(state => ({
      isLoading: true,
      message,
      pending: state.isLoading ? state.pending + 1 : 1,
    })),
  hideLoading: () =>
    set(state => {
      const pending = Math.max(0, state.pending - 1);
      return pending === 0 ? { isLoading: false, message: undefined, pending } : { pending };
    }),
  setMessage: (message: string) => set(state => (state.isLoading ? { message } : {})),
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
