import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import axios from '@shared/api/axiosInstance';
import type {
  InitiateReappraisalRequest,
  InitiateReappraisalResult,
  PaginatedResult,
  ReappraisalCandidateDetail,
  ReappraisalCandidateListItem,
  ReappraisalCandidateListParams,
} from '../types';

// ─── Query key factory ────────────────────────────────────────────────────────

export const reappraisalKeys = {
  all: ['reappraisal'] as const,
  lists: () => [...reappraisalKeys.all, 'list'] as const,
  list: (params: ReappraisalCandidateListParams) =>
    [...reappraisalKeys.lists(), params] as const,
  details: () => [...reappraisalKeys.all, 'detail'] as const,
  detail: (id: string, radiusKm?: number) =>
    [...reappraisalKeys.details(), id, radiusKm] as const,
};

// ─── List hook ────────────────────────────────────────────────────────────────

export function useReappraisalCandidates(params: ReappraisalCandidateListParams = {}) {
  return useQuery({
    queryKey: reappraisalKeys.list(params),
    queryFn: async (): Promise<PaginatedResult<ReappraisalCandidateListItem>> => {
      const {
        pageNumber = 0,
        pageSize = 20,
        customerName,
        oldAppraisalReportNumber,
        cifNumber,
        collateralId,
        reviewType,
        reviewDateFrom,
        reviewDateTo,
        remainingDayFrom,
        remainingDayTo,
      } = params;

      const { data } = await axios.get('/reappraisal/candidates', {
        params: {
          pageNumber,
          pageSize,
          ...(customerName && { customerName }),
          ...(oldAppraisalReportNumber && { oldAppraisalReportNumber }),
          ...(cifNumber && { cifNumber }),
          ...(collateralId && { collateralId }),
          ...(reviewType && { reviewType }),
          ...(reviewDateFrom && { reviewDateFrom }),
          ...(reviewDateTo && { reviewDateTo }),
          ...(remainingDayFrom != null && { remainingDayFrom }),
          ...(remainingDayTo != null && { remainingDayTo }),
        },
      });

      return data.result ?? data;
    },
    placeholderData: prev => prev,
    staleTime: 30 * 1000,
  });
}

// ─── Detail hook ──────────────────────────────────────────────────────────────

export function useReappraisalCandidateDetail(id: string, radiusKm = 1) {
  return useQuery({
    queryKey: reappraisalKeys.detail(id, radiusKm),
    queryFn: async (): Promise<ReappraisalCandidateDetail> => {
      const { data } = await axios.get(`/reappraisal/candidates/${id}`, {
        params: { radiusKm },
      });
      return data.result ?? data;
    },
    enabled: !!id,
    staleTime: 30 * 1000,
  });
}

// ─── Initiate mutation ────────────────────────────────────────────────────────

export function useInitiateReappraisal() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (body: InitiateReappraisalRequest): Promise<InitiateReappraisalResult> => {
      const { data } = await axios.post('/reappraisal/initiate', body);
      return data.result ?? data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: reappraisalKeys.lists() });
    },
  });
}

// ─── Generate test file mutation ─────────────────────────────────────────────

export interface GenerateReappraisalTestFileParams {
  count?: number;
  date?: string; // yyyyMMdd
}

export interface GenerateReappraisalTestFileResult {
  filePath: string;
  rowCount: number;
  surveyNumbers: string[];
}

export function useGenerateReappraisalTestFile() {
  return useMutation({
    mutationFn: async (params: GenerateReappraisalTestFileParams): Promise<GenerateReappraisalTestFileResult> => {
      const { data } = await axios.post('/reappraisal/generate-test-file', null, {
        params: {
          ...(params.count != null && { count: params.count }),
          ...(params.date && { date: params.date }),
        },
      });
      return data;
    },
  });
}

// ─── Delete mutation ──────────────────────────────────────────────────────────

export function useDeleteReappraisalCandidate() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => axios.delete(`/reappraisal/candidates/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: reappraisalKeys.lists() });
      queryClient.invalidateQueries({ queryKey: reappraisalKeys.details() });
    },
  });
}
