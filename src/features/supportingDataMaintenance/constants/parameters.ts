import type { ListBoxItem } from '@/shared/components';

export const APPRAISAL_COMPANY_PARAMS: ListBoxItem[] = [
  { value: '01', label: 'Company A', id: '', isActive: true },
  { value: '02', label: 'Company B', id: '', isActive: true },
  { value: '03', label: 'Company C', id: '', isActive: true },
  { value: '04', label: 'Company D', id: '', isActive: true },
];

export const COLLATERAL_TYPE_PARAMS: { value: string; label: string }[] = [
  { value: 'B', label: 'Building' },
  { value: 'LB', label: 'Land and Building' },
  { value: 'U', label: 'Condo' },
  { value: 'L', label: 'Land' },
  { value: 'MAC', label: 'Machinery' },
  { value: 'VEH', label: 'Vehicle' },
  { value: 'VES', label: 'Vessel' },
  { value: 'LS', label: 'Lease Agreement (Land and Building)' },
  { value: 'LSL', label: 'Lease Agreement (Land)' },
  { value: 'LSB', label: 'Lease Agreement (Building)' },
  { value: 'LSU', label: 'Lease Agreement (Condo)' },
];

export const IMPORT_CHANNEL_PARAMS: { value: string; label: string }[] = [
  { value: '01', label: 'External Data' },
  { value: '02', label: 'Survey Data' },
];

export const SOURCE_OF_DATA_PARAMS: { value: string; label: string }[] = [
  { value: '1', label: 'Bank' },
  { value: '2', label: 'Appraisal Company' },
];

export const STATUS_PARAMS: { value: string; label: string }[] = [
  { value: 'Draft', label: 'Draft' },
  { value: 'Pending', label: 'Pending' },
  { value: 'Approved', label: 'Approved' },
  { value: 'Cancelled', label: 'Cancelled' },
  { value: 'Rejected', label: 'Rejected' },
  { value: 'RoutedBack', label: 'Routed Back' },
];

export const ARCHIVED_STATUSES = new Set(['Approved', 'Cancelled', 'Rejected']);

export const REMOVABLE_STATUSES = new Set(['Approved', 'Rejected', 'Cancelled', 'Draft']);

export const DECISION_PARAMS: { value: string; label: string }[] = [
  { value: 'Approved', label: 'Approve' },
  { value: 'Cancelled', label: 'Cancel' },
  { value: 'Rejected', label: 'Reject' },
  { value: 'RoutedBack', label: 'Route Back' },
];

export const DATE_TYPE_OPTIONS: { value: string; label: string }[] = [
  { value: 'createdDate', label: 'Created Date' },
  { value: 'lastModifiedDate', label: 'Last Modified Date' },
];
