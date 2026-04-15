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
