/**
 * Single source of truth for supporting-data status & decision codes on the FE.
 * The values MUST match the BE Appraisal.Domain.SupportingDataMaintenance.SupportingStatus
 * value object. Any change here without a corresponding BE change (or vice versa)
 * is a wire-contract drift.
 */

/** Lifecycle status of a supporting-data record. */
export const SUPPORTING_STATUS = {
  Draft: 'Draft',
  Pending: 'Pending',
  Approved: 'Approved',
  Rejected: 'Rejected',
  Cancelled: 'Cancelled',
  RoutedBack: 'RoutedBack',
} as const;
export type SupportingStatus = (typeof SUPPORTING_STATUS)[keyof typeof SUPPORTING_STATUS];

/** Decisions a checker can issue. A subset of statuses — Draft/Pending are never decisions. */
export const SUPPORTING_DECISION = {
  Approved: 'Approved',
  Rejected: 'Rejected',
  Cancelled: 'Cancelled',
  RoutedBack: 'RoutedBack',
} as const;
export type SupportingDecision = (typeof SUPPORTING_DECISION)[keyof typeof SUPPORTING_DECISION];

/** Statuses shown on the "Archived" tab of the list page. */
export const ARCHIVED_STATUSES: ReadonlySet<SupportingStatus> = new Set<SupportingStatus>([
  SUPPORTING_STATUS.Approved,
  SUPPORTING_STATUS.Cancelled,
  SUPPORTING_STATUS.Rejected,
]);

/** Statuses that allow a remove action (per spec: Draft, Approved, Rejected, Cancelled). */
export const REMOVABLE_STATUSES: ReadonlySet<SupportingStatus> = new Set<SupportingStatus>([
  SUPPORTING_STATUS.Draft,
  SUPPORTING_STATUS.Approved,
  SUPPORTING_STATUS.Rejected,
  SUPPORTING_STATUS.Cancelled,
]);

/** Decisions that make the Remark field required on the decision form. */
export const REMARK_REQUIRED_DECISIONS: readonly SupportingDecision[] = [
  SUPPORTING_DECISION.Cancelled,
  SUPPORTING_DECISION.Rejected,
  SUPPORTING_DECISION.RoutedBack,
];
