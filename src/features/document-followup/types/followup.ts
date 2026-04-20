// TS interfaces matching backend DocumentFollowup DTOs

export type LineItemStatus = 'Pending' | 'Uploaded' | 'Declined' | 'Cancelled';

export type FollowupStatus = 'Open' | 'Resolved' | 'Cancelled';

export interface FollowupLineItem {
  id: string;
  documentType: string;
  notes: string | null;
  status: LineItemStatus;
  reason: string | null;
  documentId: string | null;
  resolvedAt: string | null;
}

export interface FollowupRaisedBy {
  userId: string;
  /** May be null until the backend user-lookup service resolves the display name. */
  displayName: string | null;
}

/** Full followup detail (GET /workflows/document-followups/{id}) */
export interface FollowupDetail {
  id: string;
  parentAppraisalId: string;
  requestId: string | null;
  raisingWorkflowInstanceId: string;
  raisingTaskId: string;
  raisingActivityId: string;
  raisedBy: FollowupRaisedBy;
  /** Nullable in the backend DTO — always populated today, but guard against null. */
  followupWorkflowInstanceId: string | null;
  status: FollowupStatus;
  cancellationReason: string | null;
  raisedAt: string;
  resolvedAt: string | null;
  lineItems: FollowupLineItem[];
}

/**
 * Summary item returned from the list endpoint:
 * GET /workflows/document-followups?raisingTaskId=...
 * Does NOT include lineItems or cancellationReason — use detail endpoint for those.
 */
export interface FollowupSummary {
  id: string;
  parentAppraisalId: string;
  requestId: string | null;
  raisingWorkflowInstanceId: string;
  raisingTaskId: string;
  raisingActivityId: string;
  raisedBy: FollowupRaisedBy;
  followupWorkflowInstanceId: string | null;
  status: FollowupStatus;
  lineItemCount: number;
  pendingCount: number;
  raisedAt: string;
  resolvedAt: string | null;
}

// ---- Request shapes ----

export interface RaiseFollowupLineItemInput {
  documentType: string;
  notes: string;
}

export interface RaiseFollowupRequest {
  raisingWorkflowInstanceId: string;
  raisingTaskId: string;
  lineItems: RaiseFollowupLineItemInput[];
}

export interface RaiseFollowupResponse {
  followupId: string;
  followupWorkflowInstanceId: string;
}

export interface CancelFollowupRequest {
  reason: string;
}

export interface CancelLineItemRequest {
  reason: string;
}

export interface DeclineLineItemRequest {
  reason: string;
}

export interface SubmitFollowupAttachmentInput {
  lineItemId: string;
  documentId: string;
  documentType: string;
  fileName: string;
  attachToRequest: boolean;
  titleId?: string | null;
}

export interface SubmitDocumentFollowupRequest {
  attachments: SubmitFollowupAttachmentInput[];
}
