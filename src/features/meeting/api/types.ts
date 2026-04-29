/**
 * Meeting feature — local TypeScript types for the Workflow `/meetings` API.
 *
 * These mirror the backend contract delivered for the 3-tier approval / meeting
 * gate feature. They are kept local to the feature folder rather than being
 * regenerated into `@shared/schemas/v1` so the meeting module can evolve
 * independently of the shared OpenAPI bundle.
 */

export type MeetingStatus =
  | 'New'
  | 'InvitationSent'
  | 'InProgress'
  | 'RoutedBack'
  | 'Ended'
  | 'Cancelled';

export type CommitteeMemberAttendance = 'Always' | 'Odd' | 'Even';

export type MeetingQueueItemStatus = 'Queued' | 'Assigned' | 'Released';

export type MeetingItemKind = 'Decision' | 'Acknowledgement';

export type ItemDecision = 'Pending' | 'Released' | 'RoutedBack';

export type AcknowledgementGroup = 'Group1' | 'UrgentGroup2';

export type AppraisalType = 'New' | 'ReAppraisal' | 'Progressive' | 'PreAppraisal';

export type CommitteeMemberPosition =
  | 'Chairman'
  | 'Director'
  | 'Secretary'
  | 'UW'
  | 'Risk'
  | 'Appraisal'
  | 'Credit'
  | 'Member';

/** Item in the queue of tier-3 appraisals awaiting a meeting. */
export interface MeetingQueueItemDto {
  id: string;
  appraisalId: string;
  appraisalNo: string | null;
  facilityLimit: number;
  workflowInstanceId: string;
  activityId: string;
  meetingId: string | null;
  status: MeetingQueueItemStatus;
  enqueuedAt: string;
}

/** A snapshot member belonging to a specific meeting. */
export interface MeetingMemberDto {
  id: string;
  userId: string;
  memberName: string;
  position: CommitteeMemberPosition;
  sourceCommitteeMemberId: string | null;
  addedAt: string;
}

/** Row in the paginated meeting list. */
export interface MeetingListItemDto {
  id: string;
  title: string;
  status: MeetingStatus;
  meetingNo: string;
  startAt: string | null;
  endAt: string | null;
  invitationSentAt: string | null;
  cutOffAt: string | null;
  location: string | null;
  itemCount: number;
}

/** A single appraisal that has been added to a meeting. */
export interface MeetingItemDto {
  id: string;
  appraisalId: string;
  appraisalNumber: string | null;
  facilityLimit: number;
  workflowInstanceId: string | null;
  activityId: string | null;
  kind: MeetingItemKind;
  appraisalType: AppraisalType | null;
  acknowledgementGroup: AcknowledgementGroup | null;
  itemDecision: ItemDecision;
  decisionAt: string | null;
  decisionBy: string | null;
  decisionReason: string | null;
  addedAt: string;
  customerName: string;
  appraisalStaff: string;
  appraisedValue: number | null;
}

/** Groups items by AppraisalType (Decision) or AcknowledgementGroup (Acknowledgement). */
export interface MeetingItemGroupDto {
  /** AppraisalType value for Decision groups; AcknowledgementGroup value for Ack groups. */
  group: string;
  items: MeetingItemDto[];
}

/** Full meeting detail returned from `GET /meetings/{id}`. */
export interface MeetingDetailDto {
  id: string;
  title: string;
  status: MeetingStatus;
  meetingNo: string;
  startAt: string | null;
  endAt: string | null;
  fromText: string | null;
  toText: string | null;
  agendaCertifyMinutes: string | null;
  agendaChairmanInformed: string | null;
  agendaOthers: string | null;
  /** Most recently Ended meeting before this one (by EndedAt). Null if none. */
  previousEndedMeetingNo: string | null;
  cutOffAt: string | null;
  invitationSentAt: string | null;
  location: string | null;
  notes: string | null;
  cancelReason: string | null;
  endedAt: string | null;
  cancelledAt: string | null;
  members: MeetingMemberDto[];
  /** Matches backend `MeetingItemsGroupedDto` — nested under `items`. */
  items: {
    decisionItems: MeetingItemGroupDto[];
    acknowledgementItems: MeetingItemGroupDto[];
  };
}

/** Project-wide pagination envelope (matches backend `PaginatedResult<T>`). */
export interface PaginatedResult<T> {
  items: T[];
  count: number;
  pageNumber: number;
  pageSize: number;
}

// ==================== Request bodies ====================

export interface CreateMeetingRequest {
  committeeId?: string;
  startAt?: string;
  endAt?: string;
}

export interface CreateMeetingResponse {
  id: string;
  title: string;
  meetingNo: string;
  status: MeetingStatus;
}

export interface UpdateMeetingRequest {
  title: string;
  location: string | null;
  fromText: string | null;
  toText: string | null;
  startAt?: string;
  endAt?: string;
}

export interface BulkCreateMeetingsRequest {
  /** ISO datetime strings — one Draft meeting is created per date. */
  dates: string[];
  defaultTitle?: string;
}

export interface BulkCreateMeetingsResponse {
  meetingIds: string[];
}

/** No body — meeting id supplied via route param. */
export interface CutOffMeetingRequest {}

export interface SendInvitationResponse {
  meetingId: string;
  meetingNo: string;
  invitationSentAt: string;
}

/** No body — appraisal id supplied via route param. */
export interface ReleaseItemRequest {}

export interface RouteBackItemRequest {
  reason: string;
}

export interface AddMeetingMemberRequest {
  userId: string;
  memberName: string;
  position: CommitteeMemberPosition;
}

export interface UpdateMeetingMemberPositionRequest {
  position: CommitteeMemberPosition;
}

export interface UpdateMeetingAgendaRequest {
  agendaCertifyMinutes?: string | null;
  agendaChairmanInformed?: string | null;
  agendaOthers?: string | null;
}

export interface AddMeetingItemsRequest {
  /** MeetingQueueItem ids (NOT appraisal ids). */
  queueItemIds: string[];
}

export interface CreateAcknowledgementQueueItemRequest {
  appraisalId: string;
  appraisalNo?: string | null;
  appraisalDecisionId: string;
  committeeId: string;
  committeeCode: string;
}

export interface CancelMeetingRequest {
  reason: string;
}

// ==================== Query params ====================

export interface GetMeetingsParams {
  status?: MeetingStatus;
  isHistory?: boolean;
  search?: string;
  meetingNo?: string;
  customerName?: string;
  fromDate?: string;
  toDate?: string;
  pageNumber?: number;
  pageSize?: number;
}

export interface GetMeetingQueueParams {
  status?: MeetingQueueItemStatus;
  pageNumber?: number;
  pageSize?: number;
}
