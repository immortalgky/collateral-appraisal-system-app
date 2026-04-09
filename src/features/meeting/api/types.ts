/**
 * Meeting feature — local TypeScript types for the Workflow `/meetings` API.
 *
 * These mirror the backend contract delivered for the 3-tier approval / meeting
 * gate feature. They are kept local to the feature folder rather than being
 * regenerated into `@shared/schemas/v1` so the meeting module can evolve
 * independently of the shared OpenAPI bundle.
 */

export type MeetingStatus = 'Draft' | 'Scheduled' | 'Ended' | 'Cancelled';

export type MeetingQueueItemStatus = 'Queued' | 'Assigned' | 'Released';

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

/** Row in the paginated meeting list. */
export interface MeetingListItemDto {
  id: string;
  title: string;
  status: MeetingStatus;
  scheduledAt: string | null;
  location: string | null;
  itemCount: number;
}

/** A single appraisal that has been added to a meeting. */
export interface MeetingItemDto {
  id: string;
  appraisalId: string;
  appraisalNo: string | null;
  facilityLimit: number;
  workflowInstanceId: string;
  activityId: string;
  addedAt: string;
}

/** Full meeting detail returned from `GET /meetings/{id}`. */
export interface MeetingDetailDto {
  id: string;
  title: string;
  status: MeetingStatus;
  scheduledAt: string | null;
  location: string | null;
  notes: string | null;
  cancelReason: string | null;
  endedAt: string | null;
  cancelledAt: string | null;
  items: MeetingItemDto[];
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
  title: string;
  notes: string | null;
}

export interface CreateMeetingResponse {
  id: string;
  title: string;
  status: MeetingStatus;
}

export interface UpdateMeetingRequest {
  title: string;
  location: string | null;
  notes: string | null;
}

export interface ScheduleMeetingRequest {
  /** ISO datetime — must be in the future. */
  scheduledAt: string;
  location: string | null;
}

export interface AddMeetingItemsRequest {
  /** MeetingQueueItem ids (NOT appraisal ids). */
  queueItemIds: string[];
}

export interface CancelMeetingRequest {
  reason: string | null;
}

// ==================== Query params ====================

export interface GetMeetingsParams {
  status?: MeetingStatus;
  pageNumber?: number;
  pageSize?: number;
}

export interface GetMeetingQueueParams {
  status?: MeetingQueueItemStatus;
  pageNumber?: number;
  pageSize?: number;
}
