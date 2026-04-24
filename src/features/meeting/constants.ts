import type { MeetingStatus } from './api/types';

/**
 * Permission strings for the Meeting feature.
 * These must match the policy names registered on the backend
 * (WorkflowModule.cs: MeetingAdmin, MeetingSecretary, CommitteeMember).
 */
export const MEETING_PERMISSIONS = {
  ADMIN: 'MEETING_ADMIN',
  SECRETARY: 'MEETING_SECRETARY',
  COMMITTEE_MEMBER: 'COMMITTEE_MEMBER',
} as const;

/**
 * Ordered list of committee member positions.
 * `as const` preserves the tuple type so `CommitteeMemberPosition` stays derivable.
 */
export const POSITION_OPTIONS = [
  'Chairman',
  'Director',
  'Secretary',
  'UW',
  'Risk',
  'Appraisal',
  'Credit',
  'Member',
] as const;

/** All 6 effective statuses in display order. */
export const MEETING_STATUS_OPTIONS: MeetingStatus[] = [
  'New',
  'InvitationSent',
  'InProgress',
  'RoutedBack',
  'Ended',
  'Cancelled',
];

export const MEETING_STATUS_LABELS: Record<MeetingStatus, string> = {
  New: 'New',
  InvitationSent: 'Invitation Sent',
  InProgress: 'In Progress',
  RoutedBack: 'Routed Back',
  Ended: 'Ended',
  Cancelled: 'Cancelled',
};

export const MEETING_STATUS_BADGE_VARIANT: Record<
  MeetingStatus,
  'info' | 'primary' | 'warning' | 'secondary' | 'success' | 'danger'
> = {
  New: 'info',
  InvitationSent: 'primary',
  InProgress: 'warning',
  RoutedBack: 'secondary',
  Ended: 'success',
  Cancelled: 'danger',
};

/** Statuses in which cut-off is permitted. */
export const CUT_OFF_ELIGIBLE: ReadonlySet<MeetingStatus> = new Set(['New', 'InvitationSent']);

/** Statuses in which the meeting can be edited. */
export const EDIT_ELIGIBLE: ReadonlySet<MeetingStatus> = new Set(['New', 'InvitationSent']);

/** Statuses in which the meeting can be cancelled. */
export const CANCEL_ELIGIBLE: ReadonlySet<MeetingStatus> = new Set(['New', 'InvitationSent']);

/** Statuses in which the invitation can be re-sent (idempotent on the backend). */
export const RESEND_INVITATION_ELIGIBLE: ReadonlySet<MeetingStatus> = new Set([
  'InvitationSent',
  'InProgress',
]);

/**
 * Statuses in which Release / RouteBack item actions are shown.
 * Decisions only happen once the meeting has actually started (InProgress) or an
 * item has been routed back — not in InvitationSent where StartAt is still in the future.
 */
export const ITEM_ACTION_ELIGIBLE: ReadonlySet<MeetingStatus> = new Set([
  'InProgress',
  'RoutedBack',
]);
