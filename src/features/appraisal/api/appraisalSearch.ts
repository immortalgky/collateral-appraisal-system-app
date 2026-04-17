import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import axios from '@shared/api/axiosInstance';

// ── Types ──────────────────────────────────────────────────

export interface AppraisalSearchParams {
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
  createdAt: string | null;
  assigneeUserId: string | null; // username like "P5229", not GUID
  assigneeCompanyId: string | null;
  assignmentType: string | null;
  assignmentStatus: string | null;
  assignedDate: string | null;
  companyName: string | null;
  customerName: string | null;
  province: string | null;
  district: string | null;
  appointmentDateTime: string | null;
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

export function useAppraisalSearch(params: AppraisalSearchParams) {
  return useQuery({
    queryKey: appraisalSearchKeys.list(params),
    queryFn: async () => {
      const cleanParams = Object.fromEntries(
        Object.entries(params).filter(([, v]) => v !== undefined && v !== '' && v !== null),
      );
      const { data } = await axios.get<AppraisalSearchResponse>('/appraisals', {
        params: cleanParams,
      });
      return data;
    },
    placeholderData: keepPreviousData,
    staleTime: 30_000,
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
  });
  const url = URL.createObjectURL(data);
  const link = document.createElement('a');
  link.href = url;
  link.download = `appraisals-${new Date().toISOString().slice(0, 10)}.${format}`;
  link.click();
  URL.revokeObjectURL(url);
}
