/**
 * Canonical fee (payment) status codes — mirrors the backend values set in
 * Modules/Appraisal/Appraisal/Domain/Appraisals/AppraisalFee.cs and projected by
 * Database/Scripts/Views/Reporting/vw_RCAS009_FeeSummary.sql.
 * Keep in sync when statuses are added or removed on the backend.
 */
export const FEE_STATUS_CODES = ['NotPaid', 'Partial', 'PendingInvoice', 'Paid'] as const;

export type FeeStatusCode = (typeof FEE_STATUS_CODES)[number];

/** Display label for each fee status code. CamelCase → spaced for the UI. */
export const FEE_STATUS_LABELS: Record<FeeStatusCode, string> = {
  NotPaid: 'Not Paid',
  Partial: 'Partial',
  PendingInvoice: 'Pending Invoice',
  Paid: 'Paid',
};

/** Dropdown options for filtering by fee status. Shared so lists never drift apart. */
export const FEE_STATUS_FILTER_OPTIONS: { value: FeeStatusCode; label: string }[] =
  FEE_STATUS_CODES.map(code => ({ value: code, label: FEE_STATUS_LABELS[code] }));
