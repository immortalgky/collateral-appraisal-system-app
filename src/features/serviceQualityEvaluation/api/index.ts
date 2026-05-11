import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import axios from '@shared/api/axiosInstance';
import type {
  AppraisalEvaluationDetail,
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
};

// ─── GET /appraisal-evaluations (paginated list) ──────────────────────────────

export const useGetEvaluationList = (params: EvaluationListParams) => {
  return useQuery({
    queryKey: evaluationKeys.list({
      pageNumber: params.pageNumber,
      pageSize: params.pageSize,
      ...(params.appraisalNumber && { appraisalNumber: params.appraisalNumber }),
      ...(params.customerName && { customerName: params.customerName }),
      ...(params.appraisalStatus && { appraisalStatus: params.appraisalStatus }),
      ...(params.appraiserName && { appraiserName: params.appraiserName }),
      ...(params.evaluationStatus && { evaluationStatus: params.evaluationStatus }),
    }),
    queryFn: async (): Promise<PaginatedEvaluationList> => {
      const { data } = await axios.get('/appraisal-evaluations', {
        params: {
          PageNumber: params.pageNumber,
          PageSize: params.pageSize,
          ...(params.appraisalNumber && { AppraisalNumber: params.appraisalNumber }),
          ...(params.customerName && { CustomerName: params.customerName }),
          ...(params.appraisalStatus && { AppraisalStatus: params.appraisalStatus }),
          ...(params.appraiserName && { AppraiserName: params.appraiserName }),
          ...(params.evaluationStatus && { EvaluationStatus: params.evaluationStatus }),
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

// ─── GET /appraisal-evaluations/by-appraisal/{appraisalId} ───────────────────

export const useGetEvaluationByAppraisal = (appraisalId: string) => {
  return useQuery({
    queryKey: evaluationKeys.detail(appraisalId),
    queryFn: async (): Promise<AppraisalEvaluationDetail | null> => {
      try {
        const { data } = await axios.get(`/appraisal-evaluations/by-appraisal/${appraisalId}`);
        return data;
      } catch (err: unknown) {
        const axiosErr = err as { response?: { status?: number } };
        if (axiosErr.response?.status === 404) return null;
        throw err;
      }
    },
    enabled: !!appraisalId,
    staleTime: 10_000,
  });
};

// ─── GET /appraisal-evaluations/detect-delivery-time/{appraisalId} ───────────

export const useDetectDeliveryTime = () => {
  return useMutation({
    mutationFn: async (appraisalId: string): Promise<DetectDeliveryTimeResponse> => {
      const { data } = await axios.get(
        `/appraisal-evaluations/detect-delivery-time/${appraisalId}`,
      );
      return data;
    },
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
    },
  });
};
