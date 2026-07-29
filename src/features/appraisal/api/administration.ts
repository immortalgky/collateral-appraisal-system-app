import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import axios from '@shared/api/axiosInstance';
import type { AssignAppraisalRequestType, AssignAppraisalResponseType } from '@shared/schemas/v1';
import type {
  CurrentAssignment,
  ExternalCompany,
  InternalStaff,
  Quotation,
  StartQuotationFromTaskRequest,
} from '../types/administration';

/**
 * Get a user by ID
 * GET /auth/users/{userId}
 */
export const useGetUserById = (userId: string | null) => {
  return useQuery({
    queryKey: ['users', userId],
    queryFn: async (): Promise<InternalStaff> => {
      const { data } = await axios.get(`/auth/users/${userId}`);
      return {
        id: data.id,
        employeeId: data.username,
        name: `${data.firstName} ${data.lastName}`,
        email: data.email ?? '',
        department: data.department ?? '',
        avatar: data.avatarUrl ?? null,
        currentWorkload: 0,
      };
    },
    enabled: !!userId,
  });
};

/**
 * Get a company by ID
 * GET /companies/{companyId}
 */
export const useGetCompanyById = (companyId: string | null) => {
  return useQuery({
    queryKey: ['companies', 'by-id', companyId],
    queryFn: async (): Promise<ExternalCompany> => {
      const { data } = await axios.get(`/companies/${companyId}`);
      const company = data.company ?? data;
      return {
        id: company.id,
        companyName: company.name,
        registrationNo: company.taxId ?? '',
        contactPerson: company.contactPerson ?? '',
        contactPhone: company.phone ?? '',
        contactEmail: company.email ?? '',
        rating: company.averageRating ?? 0,
        activeAssignments: company.activeAssignments ?? 0,
      };
    },
    enabled: !!companyId,
    staleTime: 30_000,
  });
};

/**
 * Get current assignment for an appraisal
 * GET /appraisals/{appraisalId}/assignments
 */
export const useGetAssignment = (appraisalId: string) => {
  return useQuery({
    queryKey: ['appraisal', appraisalId, 'assignments'],
    queryFn: async (): Promise<CurrentAssignment[]> => {
      const { data } = await axios.get(`/appraisals/${appraisalId}/assignments`);
      return data.assignments ?? [];
    },
    enabled: !!appraisalId,
  });
};

/**
 * Create new assignment
 * POST /appraisals/{appraisalId}/assignments
 */
export const useCreateAssignment = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (
      // `remark` is persisted alongside the assign action. The generated AssignAppraisalRequestType
      // is `.passthrough()`, so it forwards at runtime; widened here for local type-safety until the
      // client schema is regenerated to include it.
      request: AssignAppraisalRequestType & { appraisalId: string; remark?: string | null },
    ): Promise<AssignAppraisalResponseType> => {
      const { appraisalId, ...body } = request;
      const { data } = await axios.post(`/appraisals/${appraisalId}/assignments`, body);
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ['appraisal', variables.appraisalId, 'assignments'],
      });
      // Assigning completes the current pending task, so refresh the task lists and
      // counts; otherwise the just-submitted task lingers in the (cached) list.
      queryClient.invalidateQueries({ queryKey: ['my-tasks'] });
      queryClient.invalidateQueries({ queryKey: ['all-tasks'] });
      queryClient.invalidateQueries({ queryKey: ['kanban-column'] });
      queryClient.invalidateQueries({ queryKey: ['task-group-counts'] });
      queryClient.invalidateQueries({ queryKey: ['pool-tasks'] });
      queryClient.invalidateQueries({ queryKey: ['task-counts'] });
    },
  });
};

/**
 * Request body for saving an assignment draft.
 * Mirrors the backend SaveAssignmentDraftRequest (PUT /appraisals/{id}/assignments/draft).
 */
export interface SaveAssignmentDraftBody {
  assignmentType: string;
  assigneeUserId?: string | null;
  assigneeCompanyId?: string | null;
  assignmentMethod?: string | null;
  internalAppraiserId?: string | null;
  internalFollowupAssignmentMethod?: string | null;
  remark?: string | null;
}

/**
 * Save the in-progress assignment decision (selections + remark) as a draft, without assigning.
 * PUT /appraisals/{appraisalId}/assignments/draft
 * Persists onto the existing Pending AppraisalAssignment row; the workflow task stays Pending.
 */
export const useSaveAssignmentDraft = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (
      request: SaveAssignmentDraftBody & { appraisalId: string },
    ): Promise<void> => {
      const { appraisalId, ...body } = request;
      await axios.put(`/appraisals/${appraisalId}/assignments/draft`, body);
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ['appraisal', variables.appraisalId, 'assignments'],
      });
    },
  });
};

/**
 * Get eligible assignees for a workflow activity (same pool as round-robin)
 * GET /api/workflows/instances/{workflowInstanceId}/activities/{targetActivityId}/eligible-assignees
 */
export const useGetEligibleStaff = (
  workflowInstanceId: string | undefined,
  targetActivityId: string,
  enabled = true,
) => {
  return useQuery({
    queryKey: ['eligible-assignees', workflowInstanceId, targetActivityId],
    queryFn: async (): Promise<InternalStaff[]> => {
      const { data } = await axios.get(
        `/api/workflows/instances/${workflowInstanceId}/activities/${targetActivityId}/eligible-assignees`,
      );
      return (data.eligibleAssignees ?? []).map((a: { userId: string; displayName: string }) => ({
        id: a.userId,
        employeeId: a.userId,
        name: a.displayName,
        email: '',
        department: '',
        avatar: null,
        currentWorkload: 0,
      }));
    },
    enabled: enabled && !!workflowInstanceId,
  });
};

/**
 * Get eligible external companies for assignment by loan type / banking segment.
 * GET /companies/eligible?loanType={bankingSegment}
 *
 * @param bankingSegment Scope filter. Pass undefined WITH `requireSegment: false` to fetch every
 *   eligible company — used by the off-system engagement card, where the bank already engaged a
 *   company outside the system and the keyer must be able to record whichever one it actually was.
 * @param requireSegment Defaults true, so a caller that is still waiting for the segment to load
 *   does not fire an unfiltered request and briefly show companies from other segments.
 */
export const useGetEligibleCompanies = (
  bankingSegment: string | undefined,
  enabled = true,
  requireSegment = true,
) => {
  return useQuery({
    queryKey: ['eligible-companies', bankingSegment],
    queryFn: async (): Promise<ExternalCompany[]> => {
      const { data } = await axios.get('/companies/eligible', {
        params: { loanType: bankingSegment },
      });
      return (data.companies ?? []).map(
        (c: {
          id: string;
          name: string;
          taxId?: string;
          contactPerson?: string;
          phone?: string;
          email?: string;
          averageRating?: number;
          activeAssignments?: number;
          isAssignable?: boolean;
        }) => ({
          id: c.id,
          companyName: c.name,
          registrationNo: c.taxId ?? '',
          contactPerson: c.contactPerson ?? '',
          contactPhone: c.phone ?? '',
          contactEmail: c.email ?? '',
          rating: c.averageRating ?? 0,
          activeAssignments: c.activeAssignments ?? 0,
          isAssignable: c.isAssignable ?? true,
        }),
      );
    },
    enabled: enabled && (!requireSegment || !!bankingSegment),
  });
};

/**
 * Get quotations that include this appraisal
 * GET /quotations?AppraisalId={appraisalId}
 *
 * Key: ['quotations', 'list', { appraisalId }] — placed under the shared
 * `quotationKeys.lists()` prefix so Finalize/Cancel/Send/etc. mutations that
 * invalidate `['quotations', 'list']` also refresh this query (otherwise
 * AdministrationPage stays locked after status transitions).
 */
export const useGetAppraisalQuotations = (appraisalId: string | null, enabled = true) => {
  return useQuery({
    queryKey: ['quotations', 'list', { appraisalId }],
    queryFn: async (): Promise<Quotation[]> => {
      const { data } = await axios.get('/quotations', {
        params: { AppraisalId: appraisalId, PageNumber: 0, PageSize: 100 },
      });
      const result = data.quotations ?? data;
      return result.items ?? [];
    },
    enabled: enabled && !!appraisalId,
  });
};

/**
 * Start a new IBG quotation linked to the current admin workflow task.
 * POST /quotations/start-from-task
 * Replaces the old POST /quotations stub; does NOT complete the admin task.
 */
export const useCreateQuotation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (
      request: StartQuotationFromTaskRequest,
    ): Promise<{ quotationRequestId: string }> => {
      const { data } = await axios.post('/quotations/start-from-task', request);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['quotations'] });
    },
  });
};

/**
 * Request body for recording an off-system external engagement.
 * Mirrors the backend SetOfflineExternalEngagementRequest
 * (PUT /appraisals/{id}/assignments/offline-external-engagement).
 */
export interface SetOfflineExternalEngagementBody {
  companyId: string;
  /** Appraisal date printed on the external company's book, as a date-only `yyyy-MM-dd` string. */
  bookDate: string;
  /**
   * The individual appraiser who signed the book, NOT the firm — it lands in
   * AppraisalAssignment.ExternalAppraiserName, which the report prints in the appraiser block.
   * The company is identified by companyId; sending the company name here would print a firm
   * where a person's name belongs.
   */
  externalAppraiserName?: string | null;
  assignedBy?: string | null;
}

/**
 * Record the external company that appraised the collateral outside the system, plus the
 * appraisal date from its book. The backend also promotes the assignment to
 * External / AssignmentMethod=Offline and materialises the assignment fee — this is the
 * offline equivalent of what CompanySelectionActivity does for the in-system external path.
 *
 * Used from the int-offline-book-keyin task.
 */
export const useSetOfflineExternalEngagement = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (
      request: SetOfflineExternalEngagementBody & { appraisalId: string },
    ): Promise<{ assignmentId: string }> => {
      const { appraisalId, ...body } = request;
      const { data } = await axios.put(
        `/appraisals/${appraisalId}/assignments/offline-external-engagement`,
        body,
      );
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ['appraisal', variables.appraisalId, 'assignments'],
      });
      // The fee is materialised and ValuationDate written by the same call, so both are stale.
      // Keys must match the ones the queries register: useGetFees uses
      // ['appraisal', id, 'fees'] (api/fee.ts) and decisionSummaryKeys.detail returns
      // ['appraisal', id, 'decision-summary'] (api/decisionSummary.ts) — a non-matching key
      // invalidates nothing and the tabs keep showing stale data until a hard reload.
      queryClient.invalidateQueries({ queryKey: ['appraisal', variables.appraisalId, 'fees'] });
      queryClient.invalidateQueries({
        queryKey: ['appraisal', variables.appraisalId, 'decision-summary'],
      });
    },
  });
};
