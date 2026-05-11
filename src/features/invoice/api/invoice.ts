import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import axios from '@shared/api/axiosInstance';
import type {
  ApproveInvoicePayload,
  CreateInvoicePayload,
  EligibleAssignment,
  InvoiceDetail,
  PaginatedInvoices,
} from '../types/invoice';

// ─── Query Key Factory ────────────────────────────────────────────────────────

export const invoiceKeys = {
  all: ['invoices'] as const,
  lists: () => [...invoiceKeys.all, 'list'] as const,
  list: (params: Record<string, unknown>) => [...invoiceKeys.lists(), params] as const,
  details: () => [...invoiceKeys.all, 'detail'] as const,
  detail: (id: string) => [...invoiceKeys.details(), id] as const,
  eligible: () => [...invoiceKeys.all, 'eligible'] as const,
};

// ─── Query Params Interface ───────────────────────────────────────────────────

export interface GetInvoicesParams {
  pageNumber?: number;
  pageSize?: number;
  status?: string;
  companySearch?: string;
  dateFrom?: string;
  dateTo?: string;
}

// ─── GET /invoices ────────────────────────────────────────────────────────────

/**
 * Fetch a paginated, filtered list of invoices.
 * Role-scoped by the backend: IntAdmin/Admin → all companies, ExtAdmin → own company only.
 */
export const useGetInvoices = (params: GetInvoicesParams = {}) => {
  const queryKey = invoiceKeys.list({
    pageNumber: params.pageNumber ?? 0,
    pageSize: params.pageSize ?? 10,
    ...(params.status && { status: params.status }),
    ...(params.companySearch && { companySearch: params.companySearch }),
    ...(params.dateFrom && { dateFrom: params.dateFrom }),
    ...(params.dateTo && { dateTo: params.dateTo }),
  });

  return useQuery({
    queryKey,
    queryFn: async (): Promise<PaginatedInvoices> => {
      const { data } = await axios.get('/invoices', {
        params: {
          PageNumber: params.pageNumber ?? 0,
          PageSize: params.pageSize ?? 10,
          ...(params.status && { Status: params.status }),
          ...(params.companySearch && { CompanySearch: params.companySearch }),
          ...(params.dateFrom && { DateFrom: params.dateFrom }),
          ...(params.dateTo && { DateTo: params.dateTo }),
        },
      });
      const result = data.invoices ?? data;
      return {
        items: result.items ?? [],
        totalCount: result.totalCount ?? result.count ?? 0,
        pageNumber: result.pageNumber ?? params.pageNumber ?? 0,
        pageSize: result.pageSize ?? params.pageSize ?? 10,
        totalPages: result.totalPages ?? Math.ceil((result.totalCount ?? 0) / (params.pageSize ?? 10)),
      };
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
 * Fetch assignments eligible to be invoiced (bank-absorb fee, not yet invoiced).
 * Backend scopes to the caller's company_id claim.
 */
export const useGetEligibleAssignments = () => {
  return useQuery({
    queryKey: invoiceKeys.eligible(),
    queryFn: async (): Promise<EligibleAssignment[]> => {
      const { data } = await axios.get('/invoices/eligible-assignments');
      return data.assignments ?? data ?? [];
    },
    staleTime: 30_000,
  });
};

// ─── POST /invoices ───────────────────────────────────────────────────────────

/**
 * Create a new Draft invoice with the selected assignments.
 */
export const useCreateInvoice = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: CreateInvoicePayload): Promise<{ id: string }> => {
      const { data } = await axios.post('/invoices', payload);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: invoiceKeys.lists() });
      queryClient.invalidateQueries({ queryKey: invoiceKeys.eligible() });
    },
  });
};

// ─── PUT /invoices/{id} ───────────────────────────────────────────────────────

/**
 * Update a Draft invoice (replace assignment list + notes).
 */
export const useUpdateInvoiceDraft = (id: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: CreateInvoicePayload): Promise<void> => {
      await axios.put(`/invoices/${id}`, payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: invoiceKeys.lists() });
      queryClient.invalidateQueries({ queryKey: invoiceKeys.detail(id) });
    },
  });
};

// ─── POST /invoices/{id}/submit ───────────────────────────────────────────────

/**
 * Submit a Draft invoice to IntAdmin for review.
 */
export const useSubmitInvoice = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string): Promise<void> => {
      await axios.post(`/invoices/${id}/submit`);
    },
    onSuccess: (_data, id) => {
      queryClient.invalidateQueries({ queryKey: invoiceKeys.lists() });
      queryClient.invalidateQueries({ queryKey: invoiceKeys.detail(id) });
    },
  });
};

// ─── POST /invoices/{id}/approve ─────────────────────────────────────────────

/**
 * Approve a Submitted invoice with payment details (IntAdmin only).
 */
export const useApproveInvoice = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      payload,
    }: {
      id: string;
      payload: ApproveInvoicePayload;
    }): Promise<void> => {
      await axios.post(`/invoices/${id}/approve`, payload);
    },
    onSuccess: (_data, { id }) => {
      queryClient.invalidateQueries({ queryKey: invoiceKeys.lists() });
      queryClient.invalidateQueries({ queryKey: invoiceKeys.detail(id) });
    },
  });
};
