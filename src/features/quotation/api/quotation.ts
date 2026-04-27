import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
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
import {
  QuotationActivityLogRowSchema,
} from '../schemas/quotation';
import { z } from 'zod';
import type { Quotation, StartQuotationFromTaskRequest, } from '@/features/appraisal/types/administration'; // ─── Query Key Factory ────────────────────────────────────────────────────────

// ─── Query Key Factory ────────────────────────────────────────────────────────

export const quotationKeys = {
  all: ['quotations'] as const,
  lists: () => [...quotationKeys.all, 'list'] as const,
  list: (params: Record<string, unknown>) => [...quotationKeys.lists(), params] as const,
  details: () => [...quotationKeys.all, 'detail'] as const,
  detail: (id: string) => [...quotationKeys.details(), id] as const,
  myInvitations: (companyId: string) => ['my-invitations', companyId] as const,
  drafts: (bankingSegment?: string) =>
    [...quotationKeys.all, 'drafts', bankingSegment ?? ''] as const,
  activityLog: (id: string) => [...quotationKeys.detail(id), 'activity-log'] as const,
};

// ─── GET /quotations/{id} ─────────────────────────────────────────────────────

/**
 * Fetch a single quotation request with all company submissions and negotiations.
 * Role-scoped: ExtCompany sees own bid only; RM sees shortlisted bids only.
 */
export const useGetQuotationById = (id: string | null | undefined) => {
  return useQuery({
    queryKey: quotationKeys.detail(id ?? ''),
    queryFn: async (): Promise<QuotationRequestDetailDto> => {
      const { data } = await axios.get(`/quotations/${id}`);
      return data;
    },
    enabled: !!id,
    staleTime: 10_000,
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

// ─── GET /quotations (ExtCompany — my invitations) ───────────────────────────

/**
 * Fetch the current ExtAdmin's company invitations.
 * Backend scopes results by the `company_id` claim automatically.
 * Uses its own query key to avoid collision with the admin list cache.
 */
export const useGetMyCompanyInvitations = (companyId?: string) => {
  return useQuery({
    queryKey: quotationKeys.myInvitations(companyId ?? ''),
    queryFn: async (): Promise<Quotation[]> => {
      const { data } = await axios.get('/quotations', {
        params: { PageNumber: 0, PageSize: 100 },
      });
      const result = data.quotations ?? data;
      return result.items ?? [];
    },
  });
};

// ─── POST /quotations/start-from-task ────────────────────────────────────────

/**
 * Start a new IBG quotation linked to the current admin workflow task.
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
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: quotationKeys.all });
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
    },
  });
};

// ─── POST /quotations/{id}/negotiations/open ─────────────────────────────────

export const useOpenNegotiation = (quotationId: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: {
      companyQuotationId: string;
      message: string;
    }) => {
      const { data } = await axios.post(`/quotations/${quotationId}/negotiations/open`, payload);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: quotationKeys.detail(quotationId) });
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
      items?: { appraisalId: string; negotiatedDiscount: number | null }[];
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
    },
  });
};

// ─── POST /quotations/{id}/finalize ──────────────────────────────────────────

export const useFinalizeQuotation = (quotationId: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: {
      companyQuotationId: string;
      reason?: string | null;
    }) => {
      const { data } = await axios.post(`/quotations/${quotationId}/finalize`, payload);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: quotationKeys.detail(quotationId) });
      queryClient.invalidateQueries({ queryKey: quotationKeys.lists() });
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
      estimatedDays: number;
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
    queryKey: ['eligible-companies', loanType],
    queryFn: async () => {
      const { data } = await axios.get('/companies/eligible', {
        params: loanType ? { loanType } : undefined,
      });
      return (data.companies ?? []) as Array<{
        id: string;
        name: string;
        taxId?: string;
        contactPerson?: string;
        phone?: string;
        email?: string;
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
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: quotationKeys.detail(quotationId) });
      queryClient.invalidateQueries({ queryKey: quotationKeys.lists() });
      queryClient.invalidateQueries({ queryKey: ['quotations'] });
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
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: quotationKeys.detail(quotationId) });
      queryClient.invalidateQueries({ queryKey: quotationKeys.lists() });
      queryClient.invalidateQueries({ queryKey: ['quotations'] });
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

// ─── v2: GET /quotations/drafts?bankingSegment={seg} ─────────────────────────

/**
 * Fetch the current admin's Draft quotations for the entry-modal picker.
 * Allows admin to add an appraisal to an existing Draft instead of creating new.
 */
export const useGetMyDraftsForAssembly = (bankingSegment?: string, enabled = true) => {
  return useQuery({
    queryKey: quotationKeys.drafts(bankingSegment),
    queryFn: async (): Promise<QuotationDraftSummaryDto[]> => {
      const { data } = await axios.get('/quotations/drafts', {
        params: bankingSegment ? { bankingSegment } : undefined,
      });
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
    mutationFn: async () => {
      const { data } = await axios.post(`/quotations/${quotationId}/send`);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: quotationKeys.detail(quotationId) });
      queryClient.invalidateQueries({ queryKey: quotationKeys.lists() });
      queryClient.invalidateQueries({ queryKey: quotationKeys.all });
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
    mutationFn: async (payload: SaveDraftQuotationInput): Promise<{ companyQuotationId: string; status: string }> => {
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
    mutationFn: async (payload: SubmitDraftToCheckerInput): Promise<{ companyQuotationId: string; status: string }> => {
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
      queryClient.invalidateQueries({ queryKey: ['my-tasks-kanban'] });
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
