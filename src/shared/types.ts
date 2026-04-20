import type { Parameter } from './types/api';
import type { ThaiAddress } from './data/thaiAddresses';

export type UIStore = {
  sidebarOpen: boolean;
  setSidebarOpen: (open: boolean) => void;
  sidebarCollapsed: boolean;
  toggleSidebar: () => void;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
};

export type ParameterStore = {
  parameters: StoredParameters;
  isLoaded: boolean;
  setParameters: (parameters: Parameter[]) => void;
};

export type StoredParameters = Record<string, Parameter[]>;

export type LoadingStore = {
  isLoading: boolean;
  message?: string;
  showLoading: (message?: string) => void;
  hideLoading: () => void;
};

export type AtLeastOne<T> = { [K in keyof T]: Pick<T, K> }[keyof T] & Partial<T>;

export type BreadcrumbItem = {
  label: string;
  href: string;
  icon?: string; // Icon name for the breadcrumb item
};

export type BreadcrumbStore = {
  items: BreadcrumbItem[];
  setItems: (items: BreadcrumbItem[]) => void;
  push: (item: BreadcrumbItem) => void;
  pop: () => void;
  reset: () => void;
};

export type AddressSource = 'title' | 'dopa';

export type AddressStore = {
  titleAddresses: ThaiAddress[];
  dopaAddresses: ThaiAddress[];
  setTitleAddresses: (addresses: ThaiAddress[]) => void;
  setDopaAddresses: (addresses: ThaiAddress[]) => void;
  searchBySubDistrict: (query: string, source?: AddressSource) => ThaiAddress[];
};

export type LocaleStore = {
  country: string;
  language: string;
  setLocale: (country: string, language: string) => void;
};

export type CompanyItem = {
  id: string;
  companyName: string;
};

export type CompanyStore = {
  companies: CompanyItem[];
  isLoading: boolean;
  isLoaded: boolean;
  setCompanies: (companies: CompanyItem[]) => void;
  setLoading: (loading: boolean) => void;
};

