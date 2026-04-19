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

// ── Enhanced Appraisal Search Config (for AppraisalListPage) ──

export interface AppraisalColumnDef {
  key: string;
  label: string;
  sortable?: boolean;
}

export const appraisalFilters: FilterField[] = [
  {
    key: 'status',
    label: 'Status',
    type: 'select',
    placeholder: 'All statuses',
    options: [
      { value: 'Pending', label: 'Pending' },
      { value: 'Assigned', label: 'Assigned' },
      { value: 'InProgress', label: 'In Progress' },
      { value: 'UnderReview', label: 'Under Review' },
      { value: 'Completed', label: 'Completed' },
      { value: 'Cancelled', label: 'Cancelled' },
    ],
  },
  {
    key: 'priority',
    label: 'Priority',
    type: 'select',
    placeholder: 'All priorities',
    options: [
      { value: 'Normal', label: 'Normal' },
      { value: 'High', label: 'High' },
    ],
  },
  {
    key: 'slaStatus',
    label: 'SLA Status',
    type: 'select',
    placeholder: 'All SLA',
    options: [
      { value: 'OnTrack', label: 'On Track' },
      { value: 'AtRisk', label: 'At Risk' },
      { value: 'Breached', label: 'Breached' },
    ],
  },
  {
    key: 'appraisalType',
    label: 'Type',
    type: 'select',
    placeholder: 'All types',
    options: [
      { value: 'New', label: 'New' },
      { value: 'Revaluation', label: 'Revaluation' },
    ],
  },
  {
    key: 'assignmentType',
    label: 'Assignment',
    type: 'select',
    placeholder: 'All assignments',
    options: [
      { value: 'Internal', label: 'Internal' },
      { value: 'External', label: 'External' },
    ],
  },
  { key: 'province', label: 'Province', type: 'text', placeholder: 'Province...' },
  { key: 'assigneeCompanyId', label: 'Company', type: 'text', placeholder: 'Company id...' },
  { key: 'createdFrom', label: 'Created From', type: 'date' },
  { key: 'createdTo', label: 'Created To', type: 'date' },
  { key: 'slaDueDateFrom', label: 'SLA Due From', type: 'date' },
  { key: 'slaDueDateTo', label: 'SLA Due To', type: 'date' },
];

export const appraisalColumns: AppraisalColumnDef[] = [
  { key: 'appraisalNumber', label: 'Appraisal No.', sortable: true },
  { key: 'customerName', label: 'Customer', sortable: true },
  { key: 'status', label: 'Status', sortable: true },
  { key: 'priority', label: 'Priority', sortable: true },
  { key: 'slaStatus', label: 'SLA', sortable: true },
  { key: 'province', label: 'Province', sortable: true },
  { key: 'assignmentType', label: 'Assignment', sortable: true },
  { key: 'createdAt', label: 'Created', sortable: true },
];
