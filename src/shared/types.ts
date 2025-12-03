import type { Parameter } from './types/api';

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
