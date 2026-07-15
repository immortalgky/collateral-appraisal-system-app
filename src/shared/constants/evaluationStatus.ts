/**
 * Canonical service-quality evaluation status codes — mirrors the backend values
 * projected by Database/Scripts/Views/Reporting/vw_RCAS008_ServiceQuality.sql
 * (COALESCE(EvaluationStatus, 'Pending')). Keep in sync with the backend.
 */
export const EVALUATION_STATUS_CODES = ['Pending', 'Completed'] as const;

export type EvaluationStatusCode = (typeof EVALUATION_STATUS_CODES)[number];

/** Display label for each evaluation status code. */
export const EVALUATION_STATUS_LABELS: Record<EvaluationStatusCode, string> = {
  Pending: 'Pending',
  Completed: 'Completed',
};

/** Dropdown options for filtering by evaluation status. Shared so lists never drift apart. */
export const EVALUATION_STATUS_FILTER_OPTIONS: { value: EvaluationStatusCode; label: string }[] =
  EVALUATION_STATUS_CODES.map(code => ({ value: code, label: EVALUATION_STATUS_LABELS[code] }));
