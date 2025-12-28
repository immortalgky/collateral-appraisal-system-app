import type { Parameter } from './types/api';
import type { ThaiAddress } from './data/thaiAddresses';
import type { WorkflowActivity } from './config/navigation';

export type UIStore = {
  sidebarOpen: boolean;
  setSidebarOpen: (open: boolean) => void;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
};

export type ParameterStore = {
  parameters: StoredParameters;
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

export type AddressStore = {
  addresses: ThaiAddress[];
  setAddresses: (addresses: ThaiAddress[]) => void;
  searchBySubDistrict: (query: string) => ThaiAddress[];
};

export type LocaleStore = {
  country: string;
  language: string;
  setLocale: (country: string, language: string) => void;
};

/**
 * Current user information
 */
export type CurrentUser = {
  id: string;
  username: string;
  displayName: string;
  email: string | null;
  avatar: string | null;
  role: WorkflowActivity;
};

/**
 * User store for managing current user state
 */
export type UserStore = {
  user: CurrentUser | null;
  isAuthenticated: boolean;
  setUser: (user: CurrentUser | null) => void;
  setRole: (role: WorkflowActivity) => void;
  logout: () => void;
};
