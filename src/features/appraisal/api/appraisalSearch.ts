import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import axios from '@shared/api/axiosInstance';

// ── Types ──────────────────────────────────────────────────

export interface AppraisalSearchParams {
  /**
   * Scoped search: the free-text box writes ONE of these instead of `search` when the user pins a
   * column. Declared so a typo in the scope list is a type error rather than a query parameter the
   * API quietly ignores — which would return an unfiltered list.
   */
  appraisalNumber?: string;
  customerName?: string;
  requestNumber?: string;
  search?: string;
  status?: string;
  priority?: string;
  appraisalType?: string;
  slaStatus?: string;
  assignmentType?: string;
  assigneeUserId?: string;
  assigneeCompanyId?: string;
  channel?: string;
  bankingSegment?: string;
  purpose?: string;
  /** Matches appraisals having at least one property of this type */
  propertyType?: string;
  isPma?: boolean;
  province?: string;
  district?: string;
  createdFrom?: string;
  createdTo?: string;
  slaDueDateFrom?: string;
  slaDueDateTo?: string;
  assignedDateFrom?: string;
  assignedDateTo?: string;
  appointmentDateFrom?: string;
  appointmentDateTo?: string;
  sortBy?: string;
  sortDir?: string;
  pageNumber: number;
  pageSize: number;
}

export interface AppraisalDto {
  id: string;
  appraisalNumber: string | null;
  requestId: string;
  requestNumber: string | null;
  status: string;
  appraisalType: string;
  priority: string;
  isPma: boolean;
  purpose: string | null;
  channel: string | null;
  bankingSegment: string | null;
  facilityLimit: number | null;
  requestedBy: string | null;
  requestedAt: string | null;
  slaDays: number | null;
  slaDueDate: string | null;
  slaStatus: string | null;
  propertyCount: number;
  /** Distinct property type codes on this appraisal, comma-joined (e.g. "B, L, LB") */
  propertyTypes: string | null;
  createdAt: string | null;
  appraisalValue: number | null;
  assigneeUserId: string | null; // username like "P5229", not GUID
  assigneeCompanyId: string | null;
  assignmentType: string | null;
  assignmentStatus: string | null;
  assignedDate: string | null;
  companyName: string | null;
  companyNameLocal?: string | null;
  customerName: string | null;
  /**
   * How many customers the request carries. `customerName` is only one of them — the view takes a
   * TOP 1 — while the customer search matches ANY of them, so a row can legitimately answer a
   * search for a name it does not display. The list shows "+N" so that reads as extra customers
   * rather than as a wrong result.
   */
  customerCount: number;
  province: string | null;
  district: string | null;
  subDistrict: string | null;
  appointmentDateTime: string | null;
  /** Groups appraisals raised together; null for a standalone one. */
  groupTag: string | null;
  /** SLA hours expressed in 8-hour working days, computed by the view. */
  slaBusinessDays: number | null;
  /** First-submission timestamp — the SLA end-point. */
  submittedAt: string | null;
  /**
   * Present in the API response but NOT surfaced as columns: nothing writes either of them.
   * Checked against the database — 0 of 105,491 assignments carry an internal appraiser name, and
   * 0 of the 153 External assignments carry an external appraiser id or name. A column for either
   * would be permanently empty.
   */
  internalAppraiserId: string | null;
  internalAppraiserName: string | null;
  externalAppraiserId: string | null;
  externalAppraiserName: string | null;
  elapsedHours: number | null;
  remainingHours: number | null;
}

export interface FacetItem {
  value: string;
  count: number;
}

export interface AppraisalFacets {
  status: FacetItem[];
  slaStatus: FacetItem[];
  priority: FacetItem[];
  appraisalType: FacetItem[];
  assignmentType: FacetItem[];
}

export interface AppraisalSearchResponse {
  result: {
    items: AppraisalDto[];
    count: number;
    pageNumber: number;
    pageSize: number;
  };
  facets: AppraisalFacets | null;
}

export interface SmartViewDto {
  key: string;
  name: string;
  description: string;
  filters: Record<string, string>;
}

export interface SavedSearchDto {
  id: string;
  name: string;
  entityType: string;
  filtersJson: string;
  sortBy: string | null;
  sortDir: string | null;
  createdAt: string;
  updatedAt: string;
}

// ── Query Keys ─────────────────────────────────────────────

export const appraisalSearchKeys = {
  all: ['appraisal-search'] as const,
  list: (params: AppraisalSearchParams) => ['appraisal-search', 'list', params] as const,
  views: ['appraisal-search', 'views'] as const,
  savedSearches: (entityType?: string) => ['saved-searches', entityType] as const,
};

// ── Hooks ──────────────────────────────────────────────────

export function useAppraisalSearch(params: AppraisalSearchParams, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: appraisalSearchKeys.list(params),
    // `signal` comes from React Query and is forwarded to axios so a superseded request is
    // actually aborted. The filter dropdowns are not debounced — only the search box is — so
    // setting three filters in a row used to leave three requests running to completion with
    // two of the results discarded on arrival.
    queryFn: async ({ signal }) => {
      const cleanParams = Object.fromEntries(
        Object.entries(params).filter(([, v]) => v !== undefined && v !== '' && v !== null),
      );
      const { data } = await axios.get<AppraisalSearchResponse>('/appraisals', {
        params: cleanParams,
        signal,
      });
      return data;
    },
    placeholderData: keepPreviousData,
    staleTime: 30_000,
    enabled: options?.enabled,
  });
}

export function useSmartViews() {
  return useQuery({
    queryKey: appraisalSearchKeys.views,
    queryFn: async () => {
      const { data } = await axios.get<{ views: SmartViewDto[] }>('/appraisals/views');
      return data.views;
    },
    staleTime: 5 * 60_000,
  });
}

export function useSavedSearches(entityType?: string) {
  return useQuery({
    queryKey: appraisalSearchKeys.savedSearches(entityType),
    queryFn: async () => {
      const { data } = await axios.get<{ items: SavedSearchDto[] }>('/saved-searches', {
        params: entityType ? { entityType } : undefined,
      });
      return data.items;
    },
  });
}

export function useCreateSavedSearch() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: {
      name: string;
      entityType: string;
      filtersJson: string;
      sortBy?: string;
      sortDir?: string;
    }) => {
      const { data } = await axios.post('/saved-searches', payload);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['saved-searches'] });
    },
  });
}

export function useDeleteSavedSearch() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await axios.delete(`/saved-searches/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['saved-searches'] });
    },
  });
}

/**
 * Server-side row cap on /appraisals/export (MaxExportRows in ExportAppraisalsQueryHandler).
 * A larger result set is silently truncated to the first N rows in the current sort order, so the
 * caller has to warn before downloading a file that only looks complete.
 */
export const MAX_EXPORT_ROWS = 10_000;

/** Generous enough for a full-size export; the global axios default of 10s is not. */
const EXPORT_TIMEOUT_MS = 120_000;

export async function exportAppraisals(
  params: Omit<AppraisalSearchParams, 'pageNumber' | 'pageSize'>,
  format: 'xlsx' | 'csv' = 'xlsx',
) {
  const cleanParams = Object.fromEntries(
    Object.entries({ ...params, format })
      .filter(([, v]) => v !== undefined && v !== '' && v !== null)
      .map(([k, v]) => [k, String(v)]),
  );
  const { data } = await axios.get('/appraisals/export', {
    params: cleanParams,
    responseType: 'blob',
    // The global axios timeout is 10s, which a full export blows through routinely — the server
    // builds up to MAX_EXPORT_ROWS rows off the view. Aborting at 10s looks identical to a failed
    // download, so the user retries and aborts again.
    timeout: EXPORT_TIMEOUT_MS,
  });
  const url = URL.createObjectURL(data);
  const link = document.createElement('a');
  link.href = url;
  link.download = `appraisals-${new Date().toISOString().slice(0, 10)}.${format}`;
  link.click();
  URL.revokeObjectURL(url);
}
