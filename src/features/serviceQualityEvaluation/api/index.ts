import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import axios from '@shared/api/axiosInstance';
import type {
  AppraisalEvaluationDetail,
  AppraisalEvaluationHeader,
  CreateEvaluationBody,
  EvaluationListParams,
  PaginatedEvaluationList,
  UpdateEvaluationBody,
  DetectDeliveryTimeResponse,
} from './types';

// ─── Query Key Factory ────────────────────────────────────────────────────────

export const evaluationKeys = {
  all: ['appraisal-evaluations'] as const,
  lists: () => [...evaluationKeys.all, 'list'] as const,
  list: (params: Record<string, unknown>) => [...evaluationKeys.lists(), params] as const,
  details: () => [...evaluationKeys.all, 'detail'] as const,
  detail: (appraisalId: string) => [...evaluationKeys.details(), appraisalId] as const,
  detectDelivery: (appraisalId: string) =>
    [...evaluationKeys.all, 'detect-delivery', appraisalId] as const,
};

// ─── GET /appraisal-evaluations (paginated list) ──────────────────────────────

export const useGetEvaluationList = (params: EvaluationListParams) => {
  return useQuery({
    queryKey: evaluationKeys.list({
      pageNumber: params.pageNumber,
      pageSize: params.pageSize,
      ...(params.search && { search: params.search }),
      ...(params.appraisalStatus && { appraisalStatus: params.appraisalStatus }),
      ...(params.appraiserCompanyId && { appraiserCompanyId: params.appraiserCompanyId }),
      ...(params.evaluationStatus && { evaluationStatus: params.evaluationStatus }),
      ...(params.sortBy && { sortBy: params.sortBy, sortDir: params.sortDir }),
    }),
    queryFn: async (): Promise<PaginatedEvaluationList> => {
      const { data } = await axios.get('/appraisal-evaluations', {
        params: {
          PageNumber: params.pageNumber,
          PageSize: params.pageSize,
          ...(params.search && { Search: params.search }),
          ...(params.appraisalStatus && { AppraisalStatus: params.appraisalStatus }),
          ...(params.appraiserCompanyId && { AppraiserCompanyId: params.appraiserCompanyId }),
          ...(params.evaluationStatus && { EvaluationStatus: params.evaluationStatus }),
          ...(params.sortBy && { SortBy: params.sortBy, SortDir: params.sortDir ?? 'asc' }),
        },
      });
      const result = data.evaluations ?? data;
      return {
        items: result.items ?? [],
        count: result.count ?? result.totalCount ?? 0,
        pageNumber: result.pageNumber ?? params.pageNumber,
        pageSize: result.pageSize ?? params.pageSize,
      };
    },
    placeholderData: keepPreviousData,
    staleTime: 30_000,
  });
};

// ─── GET /appraisal-evaluations/header/{appraisalId} ─────────────────────────

export const useGetEvaluationHeader = (appraisalId: string) => {
  return useQuery({
    queryKey: [...evaluationKeys.all, 'header', appraisalId] as const,
    queryFn: async (): Promise<AppraisalEvaluationHeader | null> => {
      try {
        const { data } = await axios.get(`/appraisal-evaluations/header/${appraisalId}`);
        return data;
      } catch (err: unknown) {
        const axiosErr = err as { response?: { status?: number } };
        if (axiosErr.response?.status === 404) return null;
        throw err;
      }
    },
    enabled: !!appraisalId,
    staleTime: 30_000,
  });
};

// ─── GET /appraisal-evaluations/by-appraisal/{appraisalId} ───────────────────

export const useGetEvaluationByAppraisal = (appraisalId: string) => {
  return useQuery({
    queryKey: evaluationKeys.detail(appraisalId),
    queryFn: async (): Promise<AppraisalEvaluationDetail | null> => {
      const { data } = await axios.get<AppraisalEvaluationDetail | null>(
        `/appraisal-evaluations/by-appraisal/${appraisalId}`,
      );
      return data ?? null;
    },
    enabled: !!appraisalId,
    staleTime: 10_000,
  });
};

// ─── GET /appraisal-evaluations/detect-delivery-time/{appraisalId} ───────────

export const useDetectDeliveryTime = (appraisalId: string, enabled: boolean) => {
  return useQuery({
    queryKey: evaluationKeys.detectDelivery(appraisalId),
    queryFn: async (): Promise<DetectDeliveryTimeResponse | null> => {
      try {
        const { data } = await axios.get(
          `/appraisal-evaluations/detect-delivery-time/${appraisalId}`,
        );
        return data;
      } catch (err: unknown) {
        const status = (err as { response?: { status?: number } }).response?.status;
        if (status === 404) return null;
        throw err;
      }
    },
    enabled: enabled && !!appraisalId,
    staleTime: 5 * 60_000,
    refetchOnWindowFocus: false,
    retry: (count, err) =>
      (err as { response?: { status?: number } }).response?.status !== 404 && count < 2,
  });
};

// ─── POST /appraisal-evaluations ─────────────────────────────────────────────

export const useCreateEvaluation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (body: CreateEvaluationBody): Promise<{ id: string }> => {
      const { data } = await axios.post('/appraisal-evaluations', body);
      return data;
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: evaluationKeys.lists() });
      queryClient.invalidateQueries({ queryKey: evaluationKeys.detail(variables.appraisalId) });
      queryClient.invalidateQueries({ queryKey: evaluationKeys.detectDelivery(variables.appraisalId) });
    },
  });
};

// ─── PUT /appraisal-evaluations/{evaluationId} ───────────────────────────────

export const useUpdateEvaluation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      evaluationId,
      body,
    }: {
      evaluationId: string;
      appraisalId: string;
      body: UpdateEvaluationBody;
    }): Promise<void> => {
      await axios.put(`/appraisal-evaluations/${evaluationId}`, body);
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: evaluationKeys.lists() });
      queryClient.invalidateQueries({ queryKey: evaluationKeys.detail(variables.appraisalId) });
      queryClient.invalidateQueries({ queryKey: evaluationKeys.detectDelivery(variables.appraisalId) });
    },
  });
};
