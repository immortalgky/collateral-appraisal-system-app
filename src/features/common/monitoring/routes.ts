/**
 * Monitoring route path constants.
 * The entire monitoring feature lives at a single /monitoring route.
 * Individual tabs are selected via the `?tab=` query param.
 */
export const MONITORING_PATHS = {
  root: '/monitoring',
  // Convenience helpers for direct deep-links (e.g. from notifications or email)
  pendingQuotation: '/monitoring?tab=pending-quotation',
  pendingInternal: '/monitoring?tab=pending-internal',
  pendingExternal: '/monitoring?tab=pending-external',
  pendingFollowup: '/monitoring?tab=pending-followup',
  pendingEvaluation: '/monitoring?tab=pending-evaluation',
  meetingFollowup: '/monitoring?tab=meeting-followup',
} as const;

/**
 * Permission prefixes for each monitoring tab.
 * Authorization is handled server-side; the frontend uses these to drive
 * tab visibility from user.permissions (no hardcoded role checks).
 */
export const MONITORING_PERMISSIONS = {
  pendingQuotation: 'MONITORING:PENDING_QUOTATION',
  pendingInternal: 'MONITORING:PENDING_INTERNAL',
  pendingExternal: 'MONITORING:PENDING_EXTERNAL',
  pendingFollowup: 'MONITORING:PENDING_FOLLOWUP',
  pendingEvaluation: 'MONITORING:PENDING_EVALUATION',
  meetingFollowup: 'MONITORING:MEETING_FOLLOWUP',
} as const;
