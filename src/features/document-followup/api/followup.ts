import axios from '@shared/api/axiosInstance';
import type {
  CancelFollowupRequest,
  CancelLineItemRequest,
  DeclineLineItemRequest,
  FollowupDetail,
  FollowupSummary,
  RaiseFollowupRequest,
  RaiseFollowupResponse,
  SubmitDocumentFollowupRequest,
} from '../types/followup';

// ----- Query key factory -----

export const followupKeys = {
  all: ['document-followups'] as const,
  byTask: (raisingTaskId: string) =>
    ['document-followups', 'by-task', raisingTaskId] as const,
  detail: (followupId: string) =>
    ['document-followups', 'detail', followupId] as const,
  byWorkflowInstance: (followupWorkflowInstanceId: string) =>
    ['document-followups', 'by-workflow', followupWorkflowInstanceId] as const,
};

// ----- Raw API functions -----

/** POST /workflows/document-followups */
export async function raiseFollowup(
  body: RaiseFollowupRequest,
): Promise<RaiseFollowupResponse> {
  const { data } = await axios.post<RaiseFollowupResponse>(
    '/workflows/document-followups',
    body,
  );
  return data;
}

/** POST /workflows/document-followups/{id}/cancel */
export async function cancelFollowup(
  followupId: string,
  body: CancelFollowupRequest,
): Promise<void> {
  await axios.post(`/workflows/document-followups/${followupId}/cancel`, body);
}

/** POST /workflows/document-followups/{id}/line-items/{lineItemId}/cancel */
export async function cancelLineItem(
  followupId: string,
  lineItemId: string,
  body: CancelLineItemRequest,
): Promise<void> {
  await axios.post(
    `/workflows/document-followups/${followupId}/line-items/${lineItemId}/cancel`,
    body,
  );
}

/** POST /workflows/document-followups/{id}/submit */
export async function submitDocumentFollowup(
  followupId: string,
  body: SubmitDocumentFollowupRequest,
): Promise<void> {
  await axios.post(
    `/workflows/document-followups/${followupId}/submit`,
    body,
  );
}

/** POST /workflows/document-followups/{id}/line-items/{lineItemId}/decline */
export async function declineLineItem(
  followupId: string,
  lineItemId: string,
  body: DeclineLineItemRequest,
): Promise<void> {
  await axios.post(
    `/workflows/document-followups/${followupId}/line-items/${lineItemId}/decline`,
    body,
  );
}

/** GET /workflows/document-followups?raisingTaskId={id}&status=open */
export async function getOpenFollowupsForTask(
  raisingTaskId: string,
): Promise<FollowupSummary[]> {
  const { data } = await axios.get<FollowupSummary[]>(
    '/workflows/document-followups',
    {
      params: { raisingTaskId, status: 'open' },
    },
  );
  return data;
}

/** GET /workflows/document-followups/{id} */
export async function getFollowupById(
  followupId: string,
): Promise<FollowupDetail> {
  const { data } = await axios.get<FollowupDetail>(
    `/workflows/document-followups/${followupId}`,
  );
  return data;
}

/**
 * GET /workflows/document-followups?followupWorkflowInstanceId={id}
 * The list endpoint returns FollowupSummary objects. We find the matching summary
 * by followupWorkflowInstanceId and then fetch the full detail by ID so the caller
 * gets line items (which only exist on the detail endpoint).
 */
export async function getFollowupByWorkflowInstanceId(
  followupWorkflowInstanceId: string,
): Promise<FollowupDetail | null> {
  const { data } = await axios.get<FollowupSummary[]>(
    '/workflows/document-followups',
    { params: { followupWorkflowInstanceId } },
  );
  const items = Array.isArray(data) ? data : [];
  const summary = items[0] ?? null;
  if (!summary) return null;
  return getFollowupById(summary.id);
}
