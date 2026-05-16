import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import axios from '@shared/api/axiosInstance';
import type {
  BulkMarkPaidPayload,
  CreateInvoicePayload,
  EligibleAssignment,
  InvoiceDetail,
  MarkPaidPayload,
  PaginatedInvoices,
  SubmitInvoicePayload,
  UpdateInvoiceDraftPayload,
  UpdateInvoiceNumberPayload,
} from '../types/invoice';

// ─── Query Key Factory ────────────────────────────────────────────────────────

export const invoiceKeys = {
  all: ['invoices'] as const,
  lists: () => [...invoiceKeys.all, 'list'] as const,
  list: (params: Record<string, unknown>) => [...invoiceKeys.lists(), params] as const,
  details: () => [...invoiceKeys.all, 'detail'] as const,
  detail: (id: string) => [...invoiceKeys.details(), id] as const,
  /** Prefix key — invalidate this to match every parameterized `eligible(params)` cache entry. */
  eligibleBase: () => [...invoiceKeys.all, 'eligible'] as const,
  eligible: (params?: Record<string, unknown>) =>
    [...invoiceKeys.eligibleBase(), params ?? {}] as const,
};

// ─── Query Params Interface ───────────────────────────────────────────────────

export interface GetInvoicesParams {
  pageNumber?: number;
  pageSize?: number;
  /** Single status value (Pending | Sent | Paid). Omit when listing all statuses. */
  status?: string;
  companySearch?: string;
  /** Filter by a specific company id. Internal admins only — ext users are auto-scoped. */
  companyId?: string;
  sentDateFrom?: string;
  sentDateTo?: string;
  paidDateFrom?: string;
  paidDateTo?: string;
  /** Single search bar — matches invoice number OR any line-item customer name */
  search?: string;
  /** Group-by criterion. Supported: "company". Null/omit = newest-first. */
  groupBy?: string;
}

export interface GetEligibleAssignmentsParams {
  searchAppraisalNo?: string;
  submittedDateFrom?: string;
  submittedDateTo?: string;
  currentInvoiceId?: string;
}

// ─── GET /invoices ────────────────────────────────────────────────────────────

/**
 * Fetch a paginated, filtered list of invoices.
 * Role-scoped by the backend: IntAdmin/Admin → all companies, ExtAdmin → own company only.
 */
export const useGetInvoices = (params: GetInvoicesParams = {}) => {
  const queryParams = {
    pageNumber: params.pageNumber ?? 0,
    pageSize: params.pageSize ?? 10,
    ...(params.status && { status: params.status }),
    ...(params.companySearch && { companySearch: params.companySearch }),
    ...(params.companyId && { companyId: params.companyId }),
    ...(params.groupBy && { groupBy: params.groupBy }),
    ...(params.sentDateFrom && { sentDateFrom: params.sentDateFrom }),
    ...(params.sentDateTo && { sentDateTo: params.sentDateTo }),
    ...(params.paidDateFrom && { paidDateFrom: params.paidDateFrom }),
    ...(params.paidDateTo && { paidDateTo: params.paidDateTo }),
    ...(params.search && { search: params.search }),
  };

  return useQuery({
    queryKey: invoiceKeys.list(queryParams),
    queryFn: async (): Promise<PaginatedInvoices> => {
      const { data } = await axios.get<PaginatedInvoices>('/invoices', {
        params: queryParams,
      });
      return data;
    },
    placeholderData: keepPreviousData,
    staleTime: 30_000,
  });
};

// ─── GET /invoices/{id} ───────────────────────────────────────────────────────

/**
 * Fetch a single invoice with all line items.
 */
export const useGetInvoiceById = (id: string | null | undefined) => {
  return useQuery({
    queryKey: invoiceKeys.detail(id ?? ''),
    queryFn: async (): Promise<InvoiceDetail> => {
      const { data } = await axios.get(`/invoices/${id}`);
      return data;
    },
    enabled: !!id,
    staleTime: 10_000,
  });
};

// ─── GET /invoices/eligible-assignments ──────────────────────────────────────

/**
 * Fetch assignments eligible to be invoiced.
 * Backend scopes to the caller's company_id claim.
 */
export const useGetEligibleAssignments = (params: GetEligibleAssignmentsParams = {}) => {
  return useQuery({
    queryKey: invoiceKeys.eligible(params as Record<string, unknown>),
    queryFn: async (): Promise<EligibleAssignment[]> => {
      const { data } = await axios.get('/invoices/eligible-assignments', {
        params: {
          ...(params.searchAppraisalNo && { searchAppraisalNo: params.searchAppraisalNo }),
          ...(params.submittedDateFrom && { submittedDateFrom: params.submittedDateFrom }),
          ...(params.submittedDateTo && { submittedDateTo: params.submittedDateTo }),
          ...(params.currentInvoiceId && { currentInvoiceId: params.currentInvoiceId }),
        },
      });
      return data.assignments ?? data ?? [];
    },
    staleTime: 30_000,
  });
};

// ─── POST /invoices ───────────────────────────────────────────────────────────

/**
 * Create a new Pending invoice with the selected assignments.
 */
export const useCreateInvoice = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: CreateInvoicePayload): Promise<{ invoiceId: string }> => {
      const { data } = await axios.post('/invoices', payload);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: invoiceKeys.lists() });
      queryClient.invalidateQueries({ queryKey: invoiceKeys.eligibleBase() });
    },
  });
};

// ─── PUT /invoices/{id} ───────────────────────────────────────────────────────

/**
 * Update a Pending invoice (replace assignment list + notes).
 */
export const useUpdateInvoiceDraft = (id: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: UpdateInvoiceDraftPayload): Promise<void> => {
      await axios.put(`/invoices/${id}`, payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: invoiceKeys.lists() });
      queryClient.invalidateQueries({ queryKey: invoiceKeys.detail(id) });
      queryClient.invalidateQueries({ queryKey: invoiceKeys.eligibleBase() });
    },
  });
};

// ─── PATCH /invoices/{id}/number ─────────────────────────────────────────────

/**
 * Update the invoice number on a Pending draft (Save Draft scenario).
 */
export const useUpdateInvoiceNumber = (id: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: UpdateInvoiceNumberPayload): Promise<void> => {
      await axios.patch(`/invoices/${id}/number`, payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: invoiceKeys.lists() });
      queryClient.invalidateQueries({ queryKey: invoiceKeys.detail(id) });
    },
  });
};

// ─── DELETE /invoices/{id} ───────────────────────────────────────────────────

/**
 * Delete a Pending invoice draft.
 */
export const useDeleteInvoice = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string): Promise<void> => {
      await axios.delete(`/invoices/${id}`);
    },
    onSuccess: (_data, id) => {
      queryClient.invalidateQueries({ queryKey: invoiceKeys.lists() });
      queryClient.removeQueries({ queryKey: invoiceKeys.detail(id) });
      queryClient.invalidateQueries({ queryKey: invoiceKeys.eligibleBase() });
    },
  });
};

// ─── POST /invoices/{id}/submit ───────────────────────────────────────────────

/**
 * Submit a Pending invoice (Pending → Sent). Requires an invoiceNumber in body.
 */
export const useSubmitInvoice = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      invoiceNumber,
    }: {
      id: string;
      invoiceNumber: string;
    } & SubmitInvoicePayload): Promise<void> => {
      await axios.post(`/invoices/${id}/submit`, { invoiceNumber });
    },
    onSuccess: (_data, { id }) => {
      queryClient.invalidateQueries({ queryKey: invoiceKeys.lists() });
      queryClient.invalidateQueries({ queryKey: invoiceKeys.detail(id) });
    },
  });
};

// ─── POST /invoices/{id}/mark-paid ───────────────────────────────────────────

/**
 * Mark a Sent invoice as Paid with payment details (IntAdmin only).
 */
export const useMarkInvoicePaid = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      payload,
    }: {
      id: string;
      payload: MarkPaidPayload;
    }): Promise<void> => {
      await axios.post(`/invoices/${id}/mark-paid`, payload);
    },
    onSuccess: (_data, { id }) => {
      queryClient.invalidateQueries({ queryKey: invoiceKeys.lists() });
      queryClient.invalidateQueries({ queryKey: invoiceKeys.detail(id) });
    },
  });
};

// ─── POST /invoices/bulk-mark-paid ───────────────────────────────────────────

/**
 * Bulk mark multiple Sent invoices as Paid (IntAdmin only).
 * All invoices must belong to the same company.
 */
export const useBulkMarkInvoicesPaid = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: BulkMarkPaidPayload): Promise<void> => {
      await axios.post('/invoices/bulk-mark-paid', payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: invoiceKeys.lists() });
      queryClient.invalidateQueries({ queryKey: invoiceKeys.details() });
    },
  });
};
