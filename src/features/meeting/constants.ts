import type { ItemDecision, MeetingStatus } from './api/types';

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

/**
 * Statuses in which the meeting can be manually ended.
 * Mirrors the backend Meeting.EndNow guard — only an in-progress meeting
 * (InvitationSent + StartAt passed, surfaced as InProgress) can be ended.
 */
export const END_ELIGIBLE: ReadonlySet<MeetingStatus> = new Set(['InProgress']);

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

/**
 * Statuses in which an item can be removed from the meeting (returns the queue
 * item to the queue). Mirrors the backend's EnsureMutableStatus guard on
 * Meeting.RemoveItem — only allowed before the meeting actually starts.
 */
export const ITEM_REMOVE_ELIGIBLE: ReadonlySet<MeetingStatus> = new Set(['New', 'InvitationSent']);

/**
 * Statuses in which a Released decision item can be recalled back to Pending.
 * Includes `Ended` — releasing the last item is the most likely accident, and
 * `Meeting.UndoRelease` reopens an Ended meeting as part of the recall.
 * Deliberately broader than `ITEM_ACTION_ELIGIBLE` (no `Ended` there): do not
 * "align" the two sets, they gate different actions with different rules.
 */
export const ITEM_RECALL_ELIGIBLE: ReadonlySet<MeetingStatus> = new Set([
  'InProgress',
  'RoutedBack',
  'Ended',
]);

// ── Detail page presentation ─────────────────────────────────────────────────
// Everything below is display-only. It must never be used to gate an action —
// the *_ELIGIBLE sets above are the single source of truth for that, because they
// mirror the backend's own guards.

/**
 * Which shape the detail page takes for a given status.
 * - `prep`    — before the meeting runs: readiness, roster, agenda, item curation
 * - `session` — live: progress, current-item focus, fast decisions, polling
 * - `minutes` — finished: outcome summary, totals, decision record, vote results
 * - `archived`— cancelled: muted read-only record
 */
export type MeetingMode = 'prep' | 'session' | 'minutes' | 'archived';

export const MEETING_MODE_BY_STATUS: Record<MeetingStatus, MeetingMode> = {
  New: 'prep',
  InvitationSent: 'prep',
  InProgress: 'session',
  RoutedBack: 'session',
  Ended: 'minutes',
  Cancelled: 'archived',
};

export const getMeetingMode = (status: MeetingStatus): MeetingMode =>
  MEETING_MODE_BY_STATUS[status] ?? 'prep';

/** Poll interval for live session mode, in ms. */
export const SESSION_POLL_INTERVAL_MS = 15_000;

/** Hex colours for the decision donut/bars — recharts needs real colours, not Tailwind classes. */
export const DECISION_CHART_COLORS: Record<ItemDecision, string> = {
  Pending: '#9ca3af',
  Released: '#10b981',
  RoutedBack: '#ef4444',
};

/** Per-decision row accent + badge classes, so item state is scannable at a glance. */
/**
 * Per-decision row accent. Pending is transparent on purpose — it's the default state, and a
 * grey bar on every undecided row is noise rather than signal in a borderless table. Only
 * resolved states earn an accent.
 */
export const DECISION_ROW_ACCENT: Record<ItemDecision, string> = {
  Pending: 'border-l-transparent',
  Released: 'border-l-emerald-500',
  RoutedBack: 'border-l-red-500',
};

/** Colour per appraisal-type group for the value distribution bar. */
export const DECISION_GROUP_COLORS: Record<string, string> = {
  New: '#3b82f6',
  ReAppraisal: '#8b5cf6',
  Progressive: '#f59e0b',
  PreAppraisal: '#14b8a6',
};

/**
 * Accent per acknowledgement group — urgent reads warm, standard stays neutral.
 * Keyed by the raw grouping value on the wire ('2' = urgent, '1' = standard).
 */
export const ACK_GROUP_COLORS: Record<string, string> = {
  '2': '#f97316',
  '1': '#64748b',
};

/**
 * Colours for known workflow `voteOptions`. Vote keys are config-driven, so anything not
 * listed here falls back to a neutral colour rather than breaking the chart.
 */
export const VOTE_COLORS: Record<string, string> = {
  approve: '#10b981',
  reject: '#ef4444',
  route_back: '#f59e0b',
};

export const VOTE_FALLBACK_COLOR = '#9ca3af';

/**
 * Soft tinted button/pill recipes.
 *
 * The shared `Button` variants are solid fills, which is right for a page's primary action but
 * far too loud repeated down every row of a table. These are the muted counterparts: tinted
 * background, matching inset ring, 700-weight text for contrast. Declared once here so the
 * decision buttons and the secondary toolbar buttons can't drift apart.
 */
export const SOFT_TONES = {
  emerald:
    'bg-emerald-50 text-emerald-700 ring-1 ring-inset ring-emerald-200 hover:bg-emerald-100 focus-visible:ring-2 focus-visible:ring-emerald-400',
  red: 'bg-red-50 text-red-700 ring-1 ring-inset ring-red-200 hover:bg-red-100 focus-visible:ring-2 focus-visible:ring-red-400',
  amber:
    'bg-amber-50 text-amber-700 ring-1 ring-inset ring-amber-200 hover:bg-amber-100 focus-visible:ring-2 focus-visible:ring-amber-400',
  primary:
    'bg-primary/10 text-primary ring-1 ring-inset ring-primary/20 hover:bg-primary/15 focus-visible:ring-2 focus-visible:ring-primary/40',
  info: 'bg-blue-50 text-blue-700 ring-1 ring-inset ring-blue-200 hover:bg-blue-100 focus-visible:ring-2 focus-visible:ring-blue-400',
  slate:
    'bg-slate-50 text-slate-700 ring-1 ring-inset ring-slate-200 hover:bg-slate-100 focus-visible:ring-2 focus-visible:ring-slate-400',
  /**
   * Quiet white-background action. For toolbar buttons that are always available regardless of
   * status (Documents, Resend Invitation) — a filled tint gives them more weight than they earn
   * beside the status's primary action. Colour is carried by the icon instead of the fill.
   */
  white:
    'bg-white text-gray-700 ring-1 ring-inset ring-gray-200 hover:bg-gray-50 hover:ring-gray-300 focus-visible:ring-2 focus-visible:ring-gray-400',
  /**
   * Destructive toolbar actions: soft at rest so Cancel doesn't shout beside the primary action,
   * filling solid on hover to confirm its weight at the moment of commitment. Distinct from
   * `red`, which stays soft — a table row's Route Back shouldn't flare red on mouse-over.
   */
  danger:
    'bg-red-50 text-red-700 ring-1 ring-inset ring-red-200 hover:bg-red-600 hover:text-white hover:ring-red-600 focus-visible:ring-2 focus-visible:ring-red-400',
} as const;

export type SoftTone = keyof typeof SOFT_TONES;

/**
 * The single action rendered solid for a given status — everything else on the toolbar is a soft
 * tint. One solid button per screen is what gives the toolbar a focal point; a row of competing
 * saturated buttons reads as a rainbow and tells the user nothing about what to do next.
 *
 * `null` for terminal statuses, where nothing is the obvious next step.
 */
export type PrimaryToolbarAction = 'cutOff' | 'sendInvitation' | 'end' | null;

export const getPrimaryToolbarAction = (
  status: MeetingStatus,
  hasItems: boolean,
): PrimaryToolbarAction => {
  switch (status) {
    case 'New':
      // Nothing to invite anyone to until the meeting has items — cut-off comes first.
      return hasItems ? 'sendInvitation' : 'cutOff';
    case 'InvitationSent':
      return 'cutOff';
    case 'InProgress':
    case 'RoutedBack':
      return 'end';
    default:
      return null;
  }
};
