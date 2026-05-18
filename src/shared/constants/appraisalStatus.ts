/**
 * Canonical appraisal status codes — mirrors the backend value object at
 * Modules/Appraisal/Appraisal/Domain/Appraisals/AppraisalStatus.cs.
 * Keep in sync when statuses are added or removed on the backend.
 */
export const APPRAISAL_STATUS_CODES = [
  'Submitted',
  'Pending',
  'Assigned',
  'InProgress',
  'UnderReview',
  'Completed',
  'Cancelled',
] as const;

export type AppraisalStatusCode = (typeof APPRAISAL_STATUS_CODES)[number];

/** Display label for each status code. CamelCase → spaced for the UI. */
export const APPRAISAL_STATUS_LABELS: Record<AppraisalStatusCode, string> = {
  Submitted: 'Submitted',
  Pending: 'Pending',
  Assigned: 'Assigned',
  InProgress: 'In Progress',
  UnderReview: 'Under Review',
  Completed: 'Completed',
  Cancelled: 'Cancelled',
};

/**
 * Default dropdown options covering every filterable appraisal status.
 * Screens that need a subset should `.filter()` this list rather than maintain
 * their own copy.
 */
export const APPRAISAL_STATUS_OPTIONS: { value: AppraisalStatusCode; label: string }[] =
  APPRAISAL_STATUS_CODES.map(code => ({ value: code, label: APPRAISAL_STATUS_LABELS[code] }));
