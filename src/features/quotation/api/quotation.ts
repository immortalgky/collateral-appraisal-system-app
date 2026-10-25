import {
  keepPreviousData,
  type QueryClient,
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';
import axios from '@shared/api/axiosInstance';
import type {
  EditDraftQuotationBody,
  QuotationActivityLogRow,
  QuotationDraftSummaryDto,
  QuotationRequestDetailDto,
  SaveDraftQuotationInput,
  SharedDocumentSelectionDto,
  SubmitDraftToCheckerInput,
} from '../schemas/quotation';
import { QuotationActivityLogRowSchema } from '../schemas/quotation';
import { z } from 'zod';
import { isAxiosError } from 'axios';
import { parseLocalDateTime } from '@/features/failedMessages/utils/queueHealth';
import { notifyFinalizeError, notifyFinalizeSuccess } from './finalizeToasts';
import { invalidateTaskLists } from '@/features/appraisal/api/administration';
import { invalidateFeePreviews } from '@/features/appraisal/api/feePreview';
import type {
  Quotation,
  StartQuotationFromTaskRequest,
} from '@/features/appraisal/types/administration'; // ─── Query Key Factory ────────────────────────────────────────────────────────
import type {
  GenerateQuotationDocumentRequest,
  LinkQuotationDocumentRequest,
  QuotationDocumentDto,
} from './types';

// ─── Query Key Factory ────────────────────────────────────────────────────────

export const quotationDocumentKeys = {
  all: ['quotationDocuments'] as const,
  byQuotation: (quotationId: string) => ['quotationDocuments', quotationId] as const,
};

export const quotationKeys = {
  all: ['quotations'] as const,
  lists: () => [...quotationKeys.all, 'list'] as const,
  list: (params: Record<string, unknown>) => [...quotationKeys.lists(), params] as const,
  details: () => [...quotationKeys.all, 'detail'] as const,
  detail: (id: string) => [...quotationKeys.details(), id] as const,
  myInvitations: (params: Record<string, unknown>) => ['my-invitations', params] as const,
  drafts: () => [...quotationKeys.all, 'drafts'] as const,
  activityLog: (id: string) => [...quotationKeys.detail(id), 'activity-log'] as const,
  // Deliberately NOT under detail(id): finalize invalidates the detail prefix on settle, and a
  // re-fetch of the preview there could fail and silently switch auto-assign off.
  autoAssignPreview: (id: string) => [...quotationKeys.all, 'auto-assign-preview', id] as const,
};

/**
 * Marks the fee-previews of the appraisals a quotation covers stale: the ones named (when the
 * mutation knows them) plus those in the quotation's cached detail. If neither is known, every
 * appraisal's preview is marked.
 */
const invalidateQuotationFees = (
  queryClient: QueryClient,
  quotationId: string,
  appraisalIds: string[] = [],
) =>
  invalidateFeePreviews(queryClient, [
    ...appraisalIds,
    ...(queryClient
      .getQueryData<QuotationRequestDetailDto>(quotationKeys.detail(quotationId))
      ?.appraisals?.map(a => a.appraisalId) ?? []),
  ]);

// ─── GET /quotations/{id} ─────────────────────────────────────────────────────

const FOLLOWUP_POLL_MS = 2_000;
const FOLLOWUP_POLL_MAX_MS = 30_000;

/**
 * Some Assigned row still has no follow-up staff, and the auto-assign run is recent. The run stamps
 * each row in turn, and the consumer's writes trail the last one, so the 30 s is measured from the
 * newest stamp across all rows: an early row of a long run is already older than that.
 */
const isAwaitingFollowup = (quotation: QuotationRequestDetailDto | undefined) => {
  const rows = quotation?.appraisals ?? [];
  if (!rows.some(a => a.autoAssignResult === 'Assigned' && !a.followupStaffName)) return false;
  // Server local time with no zone; an unparseable stamp is NaN and left out. No stamp, no polling.
  const stamps = rows
    .map(a => (a.autoAssignedAt ? parseLocalDateTime(a.autoAssignedAt).getTime() : NaN))
    .filter(ms => !Number.isNaN(ms));
  return stamps.length > 0 && Date.now() - Math.max(...stamps) < FOLLOWUP_POLL_MAX_MS;
};

/**
 * Fetch a single quotation request with all company submissions and negotiations.
 * Role-scoped: ExtCompany sees own bid only; RM sees shortlisted bids only.
 */
export const useGetQuotationById = (
  id: string | null | undefined,
  { pollAutoAssignFollowup = false }: { pollAutoAssignFollowup?: boolean } = {},
) => {
  return useQuery({
    queryKey: quotationKeys.detail(id ?? ''),
    queryFn: async (): Promise<QuotationRequestDetailDto> => {
      const { data } = await axios.get(`/quotations/${id}`);
      return data;
    },
    enabled: !!id,
    staleTime: 10_000,
    // Opt-in, for the page that shows the assignment result: the async CompanyAssigned consumer writes
    // the follow-up staff a moment after finalize returns, so the refetch on settle can read it still
    // empty. Stateless: the window is measured from the stored autoAssignedAt, so an old row that never
    // gets a name (returned to assignment, user deleted) does not poll on later visits.
    refetchInterval: pollAutoAssignFollowup
      ? query => (isAwaitingFollowup(query.state.data) ? FOLLOWUP_POLL_MS : false)
      : false,
  });
};

// ─── GET /quotations?AppraisalId=... ─────────────────────────────────────────

/**
 * Fetch quotations linked to an appraisal (admin task context).
 * Re-exported here for cohesion; same endpoint as administration.ts.
 */
export const useGetAppraisalQuotations = (appraisalId: string | null | undefined) => {
  return useQuery({
    queryKey: quotationKeys.list({ appraisalId }),
    queryFn: async (): Promise<Quotation[]> => {
      const { data } = await axios.get('/quotations', {
        params: { AppraisalId: appraisalId, PageNumber: 0, PageSize: 100 },
      });
      const result = data.quotations ?? data;
      return result.items ?? [];
    },
    enabled: !!appraisalId,
  });
};

// ─── GET /quotations (paginated list with filters) ───────────────────────────

export interface GetQuotationsParams {
  pageNumber?: number;
  pageSize?: number;
  statuses?: string[];
  quotationNo?: string;
  appraisalNo?: string;
  customerName?: string;
  cutOffTimeFrom?: string;
  cutOffTimeTo?: string;
  companyId?: string;
  sortBy?: string;
  sortDir?: 'asc' | 'desc';
}

export interface QuotationListItem {
  id: string;
  quotationNumber: string;
  requestDate: string;
  cutOffTime: string;
  status: string;
  requestedBy: string;
  totalAppraisals: number;
  totalCompaniesInvited: number;
  totalQuotationsReceived: number;
  customerName?: string | null;
  customerCount: number;
  customerNames?: string | null;
  /** When the winner was finalized; null until then. */
  selectedAt?: string | null;
}

export interface PaginatedQuotations {
  items: QuotationListItem[];
  count: number;
  pageNumber: number;
  pageSize: number;
}

/**
 * Fetch a paginated, filtered list of quotations.
 * Role-scoped by the backend: Admin/IntAdmin → all, RM → own RmUserId, ExtAdmin → invited companies.
 */
export const useGetQuotations = (params: GetQuotationsParams = {}) => {
  const queryKey = quotationKeys.list({
    pageNumber: params.pageNumber ?? 0,
    pageSize: params.pageSize ?? 10,
    ...(params.statuses?.length && { statuses: params.statuses }),
    ...(params.quotationNo && { quotationNo: params.quotationNo }),
    ...(params.appraisalNo && { appraisalNo: params.appraisalNo }),
    ...(params.customerName && { customerName: params.customerName }),
    ...(params.cutOffTimeFrom && { cutOffTimeFrom: params.cutOffTimeFrom }),
    ...(params.cutOffTimeTo && { cutOffTimeTo: params.cutOffTimeTo }),
    ...(params.companyId && { companyId: params.companyId }),
    ...(params.sortBy && { sortBy: params.sortBy }),
    ...(params.sortDir && { sortDir: params.sortDir }),
  });

  return useQuery({
    queryKey,
    queryFn: async (): Promise<PaginatedQuotations> => {
      const { data } = await axios.get('/quotations', {
        // indexes:null → repeated params (?Statuses=A&Statuses=B) which Carter binds to string[]?
        paramsSerializer: { indexes: null },
        params: {
          PageNumber: params.pageNumber ?? 0,
          PageSize: params.pageSize ?? 10,
          ...(params.statuses?.length && { Statuses: params.statuses }),
          ...(params.quotationNo && { QuotationNo: params.quotationNo }),
          ...(params.appraisalNo && { AppraisalNo: params.appraisalNo }),
          ...(params.customerName && { CustomerName: params.customerName }),
          ...(params.cutOffTimeFrom && { CutOffTimeFrom: params.cutOffTimeFrom }),
          ...(params.cutOffTimeTo && { CutOffTimeTo: params.cutOffTimeTo }),
          ...(params.companyId && { CompanyId: params.companyId }),
          ...(params.sortBy && { SortBy: params.sortBy }),
          ...(params.sortDir && { SortDir: params.sortDir }),
        },
      });
      const result = data.quotations ?? data;
      return {
        items: result.items ?? [],
        count: result.count ?? result.totalCount ?? 0,
        pageNumber: result.pageNumber ?? params.pageNumber ?? 0,
        pageSize: result.pageSize ?? params.pageSize ?? 10,
      };
    },
    placeholderData: keepPreviousData,
    staleTime: 30_000,
  });
};

// ─── GET /quotations/my-invitations (ExtCompany) ─────────────────────────────

export interface MyInvitationDto {
  id: string;
  quotationNumber: string;
  requestDate: string;
  cutOffTime: string;
  requestedBy: string;
  totalAppraisals: number;
  companyId: string;
  receivedAt: string;
  totalFeeAmount: number | null;
  quotedAt: string | null;
  quotedBy: string | null;
  companyStatus: string;
  hasSubmitted: boolean;
  customerName?: string | null;
  customerCount: number;
  customerNames?: string | null;
}

export interface PaginatedMyInvitations {
  items: MyInvitationDto[];
  count: number;
  pageNumber: number;
  pageSize: number;
}

export interface GetMyInvitationsParams {
  pageNumber?: number;
  pageSize?: number;
  statuses?: string[];
  quotationNo?: string;
  appraisalNo?: string;
  customerName?: string;
  cutOffTimeFrom?: string;
  cutOffTimeTo?: string;
  sortBy?: string;
  sortDir?: 'asc' | 'desc';
}

/**
 * Fetch the current ExtAdmin's company invitations from the dedicated endpoint.
 * Backend scopes results to the caller's company_id claim — no companyId param needed.
 * Returns vendor-side companyStatus rather than the parent RFQ status.
 */
export const useGetMyInvitations = (params: GetMyInvitationsParams = {}) => {
  const queryKey = quotationKeys.myInvitations({
    pageNumber: params.pageNumber ?? 0,
    pageSize: params.pageSize ?? 10,
    ...(params.statuses?.length && { statuses: params.statuses }),
    ...(params.quotationNo && { quotationNo: params.quotationNo }),
    ...(params.appraisalNo && { appraisalNo: params.appraisalNo }),
    ...(params.customerName && { customerName: params.customerName }),
    ...(params.cutOffTimeFrom && { cutOffTimeFrom: params.cutOffTimeFrom }),
    ...(params.cutOffTimeTo && { cutOffTimeTo: params.cutOffTimeTo }),
    ...(params.sortBy && { sortBy: params.sortBy }),
    ...(params.sortDir && { sortDir: params.sortDir }),
  });

  return useQuery({
    queryKey,
    queryFn: async (): Promise<PaginatedMyInvitations> => {
      const { data } = await axios.get('/quotations/my-invitations', {
        // indexes:null → repeated params (?Statuses=A&Statuses=B) which Carter binds to string[]?
        paramsSerializer: { indexes: null },
        params: {
          PageNumber: params.pageNumber ?? 0,
          PageSize: params.pageSize ?? 10,
          ...(params.statuses?.length && { Statuses: params.statuses }),
          ...(params.quotationNo && { QuotationNo: params.quotationNo }),
          ...(params.appraisalNo && { AppraisalNo: params.appraisalNo }),
          ...(params.customerName && { CustomerName: params.customerName }),
          ...(params.cutOffTimeFrom && { CutOffTimeFrom: params.cutOffTimeFrom }),
          ...(params.cutOffTimeTo && { CutOffTimeTo: params.cutOffTimeTo }),
          ...(params.sortBy && { SortBy: params.sortBy }),
          ...(params.sortDir && { SortDir: params.sortDir }),
        },
      });
      const result = data.invitations ?? data;
      return {
        items: result.items ?? [],
        count: result.count ?? result.totalCount ?? 0,
        pageNumber: result.pageNumber ?? params.pageNumber ?? 0,
        pageSize: result.pageSize ?? params.pageSize ?? 10,
      };
    },
    placeholderData: keepPreviousData,
    staleTime: 30_000,
  });
};

// ─── POST /quotations/start-from-task ────────────────────────────────────────

/**
 * Start a new quotation linked to the current admin workflow task.
 * Does NOT complete the task — admin keeps monitoring from the task page.
 */
export const useStartQuotationFromTask = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (
      request: StartQuotationFromTaskRequest,
    ): Promise<{ quotationRequestId: string }> => {
      const { data } = await axios.post('/quotations/start-from-task', request);
      return data;
    },
    onSuccess: (_data, request) => {
      queryClient.invalidateQueries({ queryKey: quotationKeys.all });
      // A quotation now exists for the appraisal: its fee preview (the quotation source) is stale.
      invalidateFeePreviews(queryClient, [request.appraisalId]);
    },
  });
};

// ─── POST /quotations/{id}/close ─────────────────────────────────────────────

export const useCloseQuotation = (quotationId: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      const { data } = await axios.post(`/quotations/${quotationId}/close`);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: quotationKeys.detail(quotationId) });
      queryClient.invalidateQueries({ queryKey: quotationKeys.lists() });
    },
  });
};

// ─── POST /quotations/{id}/quotations/{companyQuotationId}/shortlist ──────────

export const useShortlistQuotation = (quotationId: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (companyQuotationId: string) => {
      const { data } = await axios.post(
        `/quotations/${quotationId}/quotations/${companyQuotationId}/shortlist`,
      );
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: quotationKeys.detail(quotationId) });
    },
  });
};

// ─── DELETE /quotations/{id}/quotations/{companyQuotationId}/shortlist ────────

export const useUnshortlistQuotation = (quotationId: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (companyQuotationId: string) => {
      const { data } = await axios.delete(
        `/quotations/${quotationId}/quotations/${companyQuotationId}/shortlist`,
      );
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: quotationKeys.detail(quotationId) });
    },
  });
};

// ─── POST /quotations/{id}/send-to-rm ────────────────────────────────────────

export const useSendShortlistToRm = (quotationId: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      const { data } = await axios.post(`/quotations/${quotationId}/send-to-rm`);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: quotationKeys.detail(quotationId) });
      queryClient.invalidateQueries({ queryKey: quotationKeys.lists() });
    },
  });
};

// ─── POST /quotations/{id}/recall-shortlist ───────────────────────────────────

export const useRecallShortlist = (quotationId: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      const { data } = await axios.post(`/quotations/${quotationId}/recall-shortlist`);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: quotationKeys.detail(quotationId) });
      queryClient.invalidateQueries({ queryKey: quotationKeys.lists() });
    },
  });
};

// ─── POST /quotations/{id}/pick-tentative-winner ─────────────────────────────

export const usePickTentativeWinner = (quotationId: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: {
      companyQuotationId: string;
      reason?: string;
      requestNegotiation?: boolean;
      negotiationNote?: string | null;
    }) => {
      const { data } = await axios.post(
        `/quotations/${quotationId}/pick-tentative-winner`,
        payload,
      );
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: quotationKeys.detail(quotationId) });
      queryClient.invalidateQueries({ queryKey: quotationKeys.lists() });
      invalidateQuotationFees(queryClient, quotationId);
    },
  });
};

// ─── POST /quotations/{id}/negotiations/open ─────────────────────────────────

export const useOpenNegotiation = (quotationId: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: { companyQuotationId: string; message: string }) => {
      const { data } = await axios.post(`/quotations/${quotationId}/negotiations/open`, payload);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: quotationKeys.detail(quotationId) });
      invalidateQuotationFees(queryClient, quotationId);
    },
  });
};

// ─── POST /quotations/{id}/negotiations/{negId}/respond ──────────────────────

export const useRespondNegotiation = (quotationId: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: {
      negotiationId: string;
      companyQuotationId: string;
      verb: 'Accept' | 'Counter' | 'Reject';
      counterPrice?: number | null;
      message?: string | null;
      items?: {
        appraisalId: string;
        negotiatedDiscount: number | null;
        itemNegotiationReason: string | null;
      }[];
    }) => {
      const { negotiationId, ...body } = payload;
      const { data } = await axios.post(
        `/quotations/${quotationId}/negotiations/${negotiationId}/respond`,
        body,
      );
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: quotationKeys.detail(quotationId) });
      invalidateQuotationFees(queryClient, quotationId);
    },
  });
};

// ─── POST /quotations/{id}/reject-tentative-winner ───────────────────────────

export const useRejectTentativeWinner = (quotationId: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: { reason: string }) => {
      const { data } = await axios.post(
        `/quotations/${quotationId}/reject-tentative-winner`,
        payload,
      );
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: quotationKeys.detail(quotationId) });
      queryClient.invalidateQueries({ queryKey: quotationKeys.lists() });
      invalidateQuotationFees(queryClient, quotationId);
    },
  });
};

// ─── GET /quotations/{id}/auto-assign-preview ────────────────────────────────

export interface AutoAssignPreviewAppraisal {
  appraisalId: string;
  appraisalNumber: string | null;
  workflowInstanceId: string | null;
  currentActivityId: string | null;
  isPma: boolean;
  /**
   * What the finalize loop will do with this appraisal, from the same classifier the loop uses.
   * The FE shows it and never re-derives it.
   */
  predictedOutcome: 'Ready' | 'Skipped' | 'Failed' | 'Parked';
  /**
   * null when Ready. Skipped: deleted | workflowEnded | noAssignment | notPending.
   * Failed: constructionInspection | taskHeld | winnerUnavailable | unpriced | feeBaseMissing |
   * assignmentNotReset | documentFollowupOpen.
   * Parked: notAtAssignment.
   */
  reason: string | null;
  /** Who holds the appraisal-assignment task (reason = taskHeld). */
  taskHeldBy: string | null;
}

export interface AutoAssignPreview {
  externalAssignmentEnabled: boolean;
  /** False for a quotation started from an appraisal task: auto-assign is for standalone ones only. */
  standalone: boolean;
  appraisals: AutoAssignPreviewAppraisal[];
}

/** Per-appraisal readiness for "assign every appraisal right after finalize". */
export const useGetAutoAssignPreview = (quotationId: string, enabled: boolean) => {
  return useQuery({
    queryKey: quotationKeys.autoAssignPreview(quotationId),
    queryFn: async (): Promise<AutoAssignPreview> => {
      const { data } = await axios.get(`/quotations/${quotationId}/auto-assign-preview`);
      return data;
    },
    enabled: enabled && !!quotationId,
    // Not redundant: the app-wide default is 5 min (app/queryClient.ts). Readiness moves while the
    // modal is closed (an appraisal can be routed back), so always re-read on open.
    staleTime: 0,
  });
};

// ─── POST /quotations/{id}/finalize ──────────────────────────────────────────

export interface FinalizeQuotationPayload {
  companyQuotationId: string;
  reason?: string | null;
  /** Omit for a plain finalize. An appraisal missing from `staff` is assigned round robin. */
  autoAssign?: { staff: { appraisalId: string; staffId: string }[] } | null;
}

export type AutoAssignResultCode = 'Assigned' | 'Failed' | 'Parked' | 'Skipped';

export interface FinalizeQuotationResponse {
  /** Every appraisal on the quotation: each should have an entry in `autoAssignResults`. */
  appraisalIds: string[];
  autoAssignResults?:
    | { appraisalId: string; result: AutoAssignResultCode; message: string | null }[]
    | null;
}

/** Statuses that say nothing about whether the server acted: a timeout or a gateway giving up. */
const NO_ANSWER_STATUSES = [408, 499, 502, 503, 504];

const finalizeErrorStatus = (error: unknown) =>
  isAxiosError(error) ? error.response?.status : undefined;

/** The finalize request failed without an answer from the API, so it may have gone through. */
export const isFinalizeOutcomeUnknown = (error: unknown) => {
  const status = finalizeErrorStatus(error);
  return status === undefined || NO_ANSWER_STATUSES.includes(status);
};

/** The API refused the request (a real 4xx), so nothing changed. */
const isFinalizeRefused = (error: unknown) => {
  const status = finalizeErrorStatus(error);
  return status != null && status >= 400 && status < 500 && !NO_ANSWER_STATUSES.includes(status);
};

export const useFinalizeQuotation = (quotationId: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: FinalizeQuotationPayload): Promise<FinalizeQuotationResponse> => {
      // Auto-assign runs one synchronous loop over every appraisal; the shared 10 s timeout is too short for it.
      const { data } = await axios.post(
        `/quotations/${quotationId}/finalize`,
        payload,
        payload.autoAssign ? { timeout: 120_000 } : undefined,
      );
      return data;
    },
    // The result toasts live here, not in the dialog's per-call callbacks: the dialog can unmount
    // mid-request (finalize commits before the auto-assign loop, so a refetch can flip the status),
    // and TanStack drops per-call callbacks of an unmounted component.
    onSuccess: (data, payload) => notifyFinalizeSuccess(data, !!payload.autoAssign),
    onError: (error, payload) =>
      notifyFinalizeError(error, !!payload.autoAssign && isFinalizeOutcomeUnknown(error)),
    // Settled, not just success: the finalize can commit before the auto-assign step fails.
    onSettled: (data, error, payload) => {
      queryClient.invalidateQueries({ queryKey: quotationKeys.detail(quotationId) });
      queryClient.invalidateQueries({ queryKey: quotationKeys.lists() });
      invalidateQuotationFees(queryClient, quotationId, data?.appraisalIds);
      if (!payload.autoAssign) return;
      // A 4xx means the request was refused on facts the preview may have shown wrongly (e.g. the
      // go-live flag was switched off after it loaded): re-read it, or every retry fails the same way.
      const refused = isFinalizeRefused(error);
      // A refusal changed nothing, so there is nothing else to refresh.
      if (refused) {
        queryClient.invalidateQueries({ queryKey: quotationKeys.autoAssignPreview(quotationId) });
        return;
      }
      // Auto-assign completes each appraisal's pending task: refresh task lists and counts.
      // (The per-appraisal quotation list sits under lists() above.)
      invalidateTaskLists(queryClient);
      // Refresh just the two queries the async consumer writes (the keys the Administration and fee
      // pages register), as the manual assign path does; the rest of ['appraisal', id] (photos,
      // comparables, ...) is untouched. They are invalidated, not removed: removing a query that a
      // mounted page observes refetches it at once anyway and only adds a loading flash. On failure
      // there is no response: take the ids from what the modal had cached.
      const cachedIds =
        queryClient
          .getQueryData<AutoAssignPreview>(quotationKeys.autoAssignPreview(quotationId))
          ?.appraisals.map(a => a.appraisalId) ??
        queryClient
          .getQueryData<QuotationRequestDetailDto>(quotationKeys.detail(quotationId))
          ?.appraisals?.map(a => a.appraisalId) ??
        [];
      for (const id of data?.appraisalIds ?? cachedIds) {
        queryClient.invalidateQueries({ queryKey: ['appraisal', id, 'assignments'] });
        queryClient.invalidateQueries({ queryKey: ['appraisal', id, 'fees'] });
      }
    },
  });
};

// ─── POST /quotations/{id}/cancel ────────────────────────────────────────────

export const useCancelQuotation = (quotationId: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload?: { reason?: string | null }) => {
      const { data } = await axios.post(`/quotations/${quotationId}/cancel`, payload ?? {});
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: quotationKeys.detail(quotationId) });
      queryClient.invalidateQueries({ queryKey: quotationKeys.lists() });
      invalidateQuotationFees(queryClient, quotationId);
    },
  });
};

// ─── PUT /quotations/{id}/submit ─────────────────────────────────────────────
// companyId segment removed; backend derives company from JWT `company_id` claim.

export const useSubmitQuotation = (quotationId: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: {
      quotationNumber: string;
      items: Array<{
        quotationRequestItemId: string;
        appraisalId: string;
        itemNumber: number;
        estimatedDays: number;
        // Fee-breakdown fields — backend derives the net price (legacy QuotedPrice) from these.
        feeAmount?: number | null;
        discount?: number | null;
        negotiatedDiscount?: number | null;
        vatPercent?: number | null;
        itemNotes?: string | null;
      }>;
      validUntil?: string | null;
      proposedStartDate?: string | null;
      proposedCompletionDate?: string | null;
      remarks?: string | null;
      termsAndConditions?: string | null;
      contactName?: string | null;
      contactEmail?: string | null;
      contactPhone?: string | null;
      /**
       * "Not participate" flag — reuses this same submit pipeline instead of a separate decline
       * endpoint. Authoritative server-side: true finalizes the company as Declined (workflow
       * resumes "Decline"); false finalizes as Submitted (workflow resumes "Submit"). When true,
       * send `items: []` — pricing is ignored.
       */
      notParticipating?: boolean;
      declineReason?: string | null;
    }) => {
      const { data } = await axios.put(`/quotations/${quotationId}/submit`, payload);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: quotationKeys.detail(quotationId) });
      queryClient.invalidateQueries({ queryKey: quotationKeys.lists() });
    },
  });
};

// ─── POST /quotations ────────────────────────────────────────────────────────

export interface CreateQuotationAppraisalInput {
  appraisalId: string;
  maxAppraisalDays: number | null;
}

export interface CreateQuotationBody {
  cutOffTime: string; // ISO datetime string
  requestedBy: string;
  description?: string;
  specialRequirements?: string;
  appraisals?: CreateQuotationAppraisalInput[];
  invitedCompanyIds?: string[];
}

export interface CreateQuotationResult {
  id: string;
}

/**
 * Create a standalone Draft quotation (not tied to a task).
 * Attaches appraisals and invites companies atomically in one call.
 * On success, invalidates the quotations list cache.
 */
export const useCreateQuotation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (body: CreateQuotationBody): Promise<CreateQuotationResult> => {
      const { data } = await axios.post('/quotations', body);
      return data;
    },
    onSuccess: (_data, body) => {
      queryClient.invalidateQueries({ queryKey: quotationKeys.lists() });
      // An empty list would read as "every appraisal" to invalidateFeePreviews: skip it instead.
      const appraisalIds = body.appraisals?.map(a => a.appraisalId) ?? [];
      if (appraisalIds.length > 0) invalidateFeePreviews(queryClient, appraisalIds);
    },
  });
};

// ─── useGetLoanTypeMatchedCompanies ──────────────────────────────────────────

/**
 * Auto-suggest companies matched to the loan type (banking segment).
 * Falls back to GET /companies/eligible?loanType=<segment> — same endpoint
 * already used by the assignment flow. If the backend doesn't filter by
 * loan type yet, all eligible companies are returned.
 *
 * TODO: Backend may need to add explicit LoanType matching to this endpoint.
 */
export const useGetLoanTypeMatchedCompanies = (loanType: string | undefined, enabled = true) => {
  return useQuery({
    queryKey: ['eligible-companies', 'raw', loanType],
    queryFn: async () => {
      const { data } = await axios.get('/companies/eligible', {
        params: loanType ? { loanType } : undefined,
      });
      return (data.companies ?? []) as Array<{
        id: string;
        name: string;
        nameLocal?: string | null;
        taxId?: string;
        contactPerson?: string;
        phone?: string;
        email?: string;
        loanTypes?: string[];
      }>;
    },
    enabled: enabled,
    staleTime: 60_000,
  });
};

// ─── v2: POST /quotations/{id}/appraisals ────────────────────────────────────

/**
 * Add an appraisal to an existing Draft quotation (Admin).
 * Only valid while Status=Draft.
 */
export const useAddAppraisalToDraft = (quotationId: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (appraisalId: string) => {
      const { data } = await axios.post(`/quotations/${quotationId}/appraisals`, { appraisalId });
      return data;
    },
    onSuccess: (_data, appraisalId) => {
      queryClient.invalidateQueries({ queryKey: quotationKeys.detail(quotationId) });
      queryClient.invalidateQueries({ queryKey: quotationKeys.lists() });
      queryClient.invalidateQueries({ queryKey: ['quotations'] });
      invalidateFeePreviews(queryClient, [appraisalId]);
    },
  });
};

// ─── v2: DELETE /quotations/{id}/appraisals/{appraisalId} ────────────────────

/**
 * Remove an appraisal from a Draft quotation (Admin).
 * If it's the last appraisal, the Draft auto-cancels on the backend.
 */
export const useRemoveAppraisalFromDraft = (quotationId: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (appraisalId: string) => {
      const { data } = await axios.delete(`/quotations/${quotationId}/appraisals/${appraisalId}`);
      return data;
    },
    onSuccess: (_data, appraisalId) => {
      queryClient.invalidateQueries({ queryKey: quotationKeys.detail(quotationId) });
      queryClient.invalidateQueries({ queryKey: quotationKeys.lists() });
      queryClient.invalidateQueries({ queryKey: ['quotations'] });
      invalidateFeePreviews(queryClient, [appraisalId]);
    },
  });
};

// ─── v2: POST /quotations/{id}/companies/{companyId}/decline ─────────────────

/**
 * Decline an invitation (ExtCompany). Available pre- and post-submission.
 */
export const useDeclineInvitation = (quotationId: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: { companyId: string; reason: string }) => {
      const { companyId, reason } = payload;
      const { data } = await axios.post(
        `/quotations/${quotationId}/companies/${companyId}/decline`,
        { reason },
      );
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: quotationKeys.detail(quotationId) });
      queryClient.invalidateQueries({ queryKey: quotationKeys.lists() });
    },
  });
};

// ─── v2: GET /quotations/drafts ───────────────────────────────────────────────

/**
 * Fetch the current admin's Draft quotations for the entry-modal picker.
 * Allows admin to add an appraisal to an existing Draft instead of creating new.
 */
export const useGetMyDraftsForAssembly = (enabled = true) => {
  return useQuery({
    queryKey: quotationKeys.drafts(),
    queryFn: async (): Promise<QuotationDraftSummaryDto[]> => {
      const { data } = await axios.get('/quotations/drafts');
      return data.drafts ?? data ?? [];
    },
    enabled: enabled,
    staleTime: 15_000,
  });
};

// ─── C8: POST /quotations/{id}/send ──────────────────────────────────────────

/**
 * Admin sends a Draft quotation, transitioning it to Sent.
 * Enabled only when the quotation has at least 1 appraisal, 1 invited company,
 * and a due date set. The component enforces this guard before calling.
 */
export const useSendQuotation = (quotationId: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (emailData: {
      from: string;
      to?: string;
      cc?: string;
      bcc?: string;
      subject: string;
      content?: string;
      attachments?: string[];
    }) => {
      const { data } = await axios.post(`/quotations/${quotationId}/send`, emailData);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: quotationKeys.lists() });
      queryClient.invalidateQueries({ queryKey: quotationKeys.all });
      invalidateQuotationFees(queryClient, quotationId);
    },
    // A rejected Send (e.g. SEGMENT_COVERAGE_MISMATCH) means the draft changed since it was loaded,
    // so refetch to show the server's current Segment Set / per-company coverage. (onSuccess already
    // covers the detail through `all`.)
    onError: () => {
      queryClient.invalidateQueries({ queryKey: quotationKeys.detail(quotationId) });
    },
  });
};

// ─── Phase 2a: POST /quotations/{id}/draft ───────────────────────────────────

/**
 * Maker or Checker saves (upserts) a company quotation draft.
 * Idempotent — re-calling with the same quotationRequestId overwrites the draft.
 */
export const useSaveDraftQuotation = (quotationId: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (
      payload: SaveDraftQuotationInput,
    ): Promise<{ companyQuotationId: string; status: string }> => {
      const { data } = await axios.post(`/quotations/${quotationId}/draft`, payload);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: quotationKeys.detail(quotationId) });
      queryClient.invalidateQueries({ queryKey: quotationKeys.drafts() });
    },
  });
};

// ─── Phase 2a: POST /quotations/{id}/submit-to-checker ───────────────────────

/**
 * Maker (ExtAdmin) promotes a saved Draft to PendingCheckerReview.
 * Company identity is derived from the JWT company_id claim on the backend.
 */
export const useSubmitDraftToChecker = (quotationId: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (
      payload: SubmitDraftToCheckerInput,
    ): Promise<{ companyQuotationId: string; status: string }> => {
      const { data } = await axios.post(`/quotations/${quotationId}/submit-to-checker`, payload);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: quotationKeys.detail(quotationId) });
      // The page chains advanceWorkflowStage('SubmitToChecker') after this hook resolves;
      // useTakeWorkflowAction's onSuccess invalidates ['my-tasks']. No delayed retry needed.
    },
  });
};

// ─── Workflow stage action ───────────────────────────────────────────────────

/**
 * Posts a stage action on the per-company fan-out PendingTask without needing to
 * resolve the task id first. The backend looks up the PendingTask via
 * (workflowInstanceId, activityId, companyId) and dispatches the action through
 * AdvanceFanOutStageCommand.
 *
 * Used by the ext-company quotation flow so each user button (Submit to Checker,
 * Submit, Decline, Return to Maker) can chain its data-update call with the
 * workflow stage advancement in one click.
 */
export interface TakeWorkflowActionInput {
  workflowInstanceId: string;
  activityId: string; // e.g. "ext-collect-submissions"
  companyId: string;
  actionValue: string; // matches `actions[].value` in the workflow JSON for the current stage
  additionalInput?: Record<string, unknown>;
}

export const useTakeWorkflowAction = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: TakeWorkflowActionInput) => {
      const { workflowInstanceId, activityId, companyId, actionValue, additionalInput } = input;
      const url = `/workflows/${workflowInstanceId}/activities/${activityId}/companies/${companyId}/actions/${encodeURIComponent(actionValue)}`;
      const { data } = await axios.post(url, { additionalInput: additionalInput ?? null });
      return data as { isSuccess: boolean; stageAdvanced: boolean; nextStage?: string | null };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-tasks'] });
      queryClient.invalidateQueries({ queryKey: ['kanban-column'] });
      queryClient.invalidateQueries({ queryKey: ['task-group-counts'] });
      queryClient.invalidateQueries({ queryKey: ['task-counts'] });
    },
  });
};

// ─── Phase 2a: GET /quotations/{id}/activity-log ─────────────────────────────

/**
 * Fetch the full activity log for a quotation request.
 * Parses response through Zod schema for runtime type safety.
 */
export const useGetQuotationActivityLog = (quotationId: string, enabled = true) => {
  return useQuery({
    queryKey: quotationKeys.activityLog(quotationId),
    queryFn: async (): Promise<QuotationActivityLogRow[]> => {
      const { data } = await axios.get(`/quotations/${quotationId}/activity-log`);
      return z.array(QuotationActivityLogRowSchema).parse(data);
    },
    enabled: enabled && !!quotationId,
    staleTime: 15_000,
  });
};

// ─── PATCH /quotations/{id}/draft (Admin — edit due date + companies) ────────

/**
 * Update an existing Draft quotation's due date and invited companies.
 * Backend rejects if status is not Draft, due date is in the past, or
 * companyIds is empty. Returns { quotationRequestId }.
 */
export const useEditDraftQuotation = (quotationId: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (body: EditDraftQuotationBody): Promise<{ quotationRequestId: string }> => {
      const { data } = await axios.patch(`/quotations/${quotationId}/draft`, body);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: quotationKeys.detail(quotationId) });
      queryClient.invalidateQueries({ queryKey: quotationKeys.lists() });
    },
  });
};

// ─── v7: PUT /quotations/{id}/shared-documents ───────────────────────────────

/**
 * Admin sets which documents are shared with invited companies.
 * Draft-only. Overwrites the full selection.
 */
export const useSetSharedDocuments = (quotationId: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (selections: SharedDocumentSelectionDto[]) => {
      const { data } = await axios.put(`/quotations/${quotationId}/shared-documents`, {
        documents: selections,
      });
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: quotationKeys.detail(quotationId) });
    },
  });
};

// ==================== Quotation Document Hooks ====================

/** GET /quotations/{id}/documents */
export const useGetQuotationDocuments = (quotationId: string | undefined) => {
  return useQuery({
    queryKey: quotationDocumentKeys.byQuotation(quotationId ?? ''),
    queryFn: async (): Promise<QuotationDocumentDto[]> => {
      const { data } = await axios.get(`/quotations/${quotationId}/documents`);
      return data;
    },
    enabled: !!quotationId,
  });
};

/** POST /quotations/{id}/documents/generate */
export const useGenerateQuotationDocument = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      quotationId,
      body,
    }: {
      quotationId: string;
      body: GenerateQuotationDocumentRequest;
    }): Promise<QuotationDocumentDto> => {
      const { data } = await axios.post(`/quotations/${quotationId}/documents/generate`, body);
      return data;
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: quotationDocumentKeys.byQuotation(variables.quotationId),
      });
    },
  });
};

/** POST /quotations/{id}/documents */
export const useLinkQuotationDocument = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      quotationId,
      body,
    }: {
      quotationId: string;
      body: LinkQuotationDocumentRequest;
    }): Promise<QuotationDocumentDto> => {
      const { data } = await axios.post(`/quotations/${quotationId}/documents`, body);
      return data;
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: quotationDocumentKeys.byQuotation(variables.quotationId),
      });
    },
  });
};

/** DELETE /quotations/{id}/documents/{documentId} */
export const useRemoveQuotationDocument = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      quotationId,
      documentId,
    }: {
      quotationId: string;
      documentId: string;
    }) => {
      await axios.delete(`/quotations/${quotationId}/documents/${documentId}`);
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: quotationDocumentKeys.byQuotation(variables.quotationId),
      });
    },
  });
};
