import type { ListBoxItem } from '@/shared/components';
import { SUPPORTING_DECISION, SUPPORTING_STATUS } from './enums';

// Re-export so callers can keep using `from '../constants/parameters'` for these.
export {
  SUPPORTING_STATUS,
  SUPPORTING_DECISION,
  ARCHIVED_STATUSES,
  REMOVABLE_STATUSES,
  REMARK_REQUIRED_DECISIONS,
} from './enums';
export type { SupportingStatus, SupportingDecision } from './enums';

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

export const STATUS_PARAMS = [
  { value: SUPPORTING_STATUS.Draft, label: 'Draft' },
  { value: SUPPORTING_STATUS.Pending, label: 'Pending' },
  { value: SUPPORTING_STATUS.Approved, label: 'Approved' },
  { value: SUPPORTING_STATUS.Cancelled, label: 'Cancelled' },
  { value: SUPPORTING_STATUS.Rejected, label: 'Rejected' },
  { value: SUPPORTING_STATUS.RoutedBack, label: 'Routed Back' },
] as const;

export const DECISION_PARAMS = [
  { value: SUPPORTING_DECISION.Approved, label: 'Approve' },
  { value: SUPPORTING_DECISION.Cancelled, label: 'Cancel' },
  { value: SUPPORTING_DECISION.Rejected, label: 'Reject' },
  { value: SUPPORTING_DECISION.RoutedBack, label: 'Route Back' },
] as const;

export const DATE_TYPE_OPTIONS: { value: string; label: string }[] = [
  { value: 'createdDate', label: 'Created Date' },
  { value: 'lastModifiedDate', label: 'Last Modified Date' },
];
