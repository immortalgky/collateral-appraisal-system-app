import type { SearchCategory } from '@shared/types/search';

export interface FilterField {
  key: string;
  label: string;
  type: 'text' | 'select' | 'date';
  options?: { value: string; label: string }[];
  placeholder?: string;
}

export interface ColumnDef {
  key: string;
  label: string;
  /** If set, reads from item.metadata[metadataKey] instead of item[key] */
  metadataKey?: string;
}

export interface TabConfig {
  key: SearchCategory;
  label: string;
  filters: FilterField[];
  columns: ColumnDef[];
}

const requestsTab: TabConfig = {
  key: 'requests',
  label: 'Requests',
  filters: [
    {
      key: 'status',
      label: 'Status',
      type: 'select',
      placeholder: 'All statuses',
      options: [
        { value: 'draft', label: 'Draft' },
        { value: 'pending', label: 'Pending' },
        { value: 'in_progress', label: 'In Progress' },
        { value: 'completed', label: 'Completed' },
        { value: 'cancelled', label: 'Cancelled' },
      ],
    },
    { key: 'dateFrom', label: 'From', type: 'date' },
    { key: 'dateTo', label: 'To', type: 'date' },
    { key: 'assignedTo', label: 'Assigned To', type: 'text', placeholder: 'Search assignee...' },
  ],
  columns: [
    { key: 'title', label: 'Request' },
    { key: 'subtitle', label: 'Customer' },
    { key: 'status', label: 'Status' },
    { key: 'purpose', label: 'Purpose', metadataKey: 'purpose' },
    { key: 'createdAt', label: 'Created', metadataKey: 'createdAt' },
  ],
};

const customersTab: TabConfig = {
  key: 'customers',
  label: 'Customers',
  filters: [
    {
      key: 'status',
      label: 'Status',
      type: 'select',
      placeholder: 'All statuses',
      options: [
        { value: 'active', label: 'Active' },
        { value: 'inactive', label: 'Inactive' },
      ],
    },
    { key: 'dateFrom', label: 'From', type: 'date' },
    { key: 'dateTo', label: 'To', type: 'date' },
    {
      key: 'region',
      label: 'Region',
      type: 'select',
      placeholder: 'All regions',
      options: [
        { value: 'central', label: 'Central' },
        { value: 'north', label: 'North' },
        { value: 'south', label: 'South' },
        { value: 'east', label: 'East' },
        { value: 'west', label: 'West' },
        { value: 'northeast', label: 'Northeast' },
      ],
    },
  ],
  columns: [
    { key: 'title', label: 'Customer Name' },
    { key: 'subtitle', label: 'Details' },
    { key: 'status', label: 'Status' },
    { key: 'region', label: 'Region', metadataKey: 'region' },
    { key: 'contactNumber', label: 'Contact', metadataKey: 'contactNumber' },
  ],
};

const propertiesTab: TabConfig = {
  key: 'properties',
  label: 'Properties',
  filters: [
    {
      key: 'propertyType',
      label: 'Property Type',
      type: 'select',
      placeholder: 'All types',
      options: [
        { value: 'land', label: 'Land' },
        { value: 'building', label: 'Building' },
        { value: 'condo', label: 'Condo' },
        { value: 'land_building', label: 'Land & Building' },
        { value: 'machinery', label: 'Machinery' },
      ],
    },
    {
      key: 'status',
      label: 'Status',
      type: 'select',
      placeholder: 'All statuses',
      options: [
        { value: 'active', label: 'Active' },
        { value: 'inactive', label: 'Inactive' },
      ],
    },
    { key: 'dateFrom', label: 'From', type: 'date' },
    { key: 'dateTo', label: 'To', type: 'date' },
    {
      key: 'region',
      label: 'Region',
      type: 'select',
      placeholder: 'All regions',
      options: [
        { value: 'central', label: 'Central' },
        { value: 'north', label: 'North' },
        { value: 'south', label: 'South' },
        { value: 'east', label: 'East' },
        { value: 'west', label: 'West' },
        { value: 'northeast', label: 'Northeast' },
      ],
    },
  ],
  columns: [
    { key: 'title', label: 'Property' },
    { key: 'subtitle', label: 'Address' },
    { key: 'status', label: 'Status' },
    { key: 'propertyType', label: 'Type', metadataKey: 'propertyType' },
    { key: 'region', label: 'Region', metadataKey: 'region' },
  ],
};

export const tabConfigs: TabConfig[] = [requestsTab, customersTab, propertiesTab];
