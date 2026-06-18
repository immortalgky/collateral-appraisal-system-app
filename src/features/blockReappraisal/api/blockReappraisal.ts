import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import axios from '@shared/api/axiosInstance';
import type {
  BlockReappraisalCreateResult,
  BlockReappraisalDetailResult,
  BlockReappraisalDueListItem,
  BlockReappraisalListParams,
  PaginatedResult,
} from '../types';

// ─── Query key factory ────────────────────────────────────────────────────────

export const blockReappraisalKeys = {
  all: ['block-reappraisal'] as const,
  lists: () => [...blockReappraisalKeys.all, 'list'] as const,
  list: (params: BlockReappraisalListParams) =>
    [...blockReappraisalKeys.lists(), params] as const,
  details: () => [...blockReappraisalKeys.all, 'detail'] as const,
  detail: (collateralMasterId: string) =>
    [...blockReappraisalKeys.details(), collateralMasterId] as const,
};

// ─── List hook ────────────────────────────────────────────────────────────────

export function useBlockReappraisalDueList(params: BlockReappraisalListParams = {}) {
  return useQuery({
    queryKey: blockReappraisalKeys.list(params),
    queryFn: async (): Promise<PaginatedResult<BlockReappraisalDueListItem>> => {
      const {
        pageNumber = 0,
        pageSize = 20,
        projectName,
        oldAppraisalNumber,
      } = params;

      const { data } = await axios.get('/block-reappraisal', {
        params: {
          pageNumber,
          pageSize,
          ...(projectName && { projectName }),
          ...(oldAppraisalNumber && { oldAppraisalNumber }),
        },
      });

      return data.result ?? data;
    },
    placeholderData: prev => prev,
    staleTime: 30 * 1000,
  });
}

// ─── Detail hook ──────────────────────────────────────────────────────────────

export function useBlockReappraisalDetail(collateralMasterId: string) {
  return useQuery({
    queryKey: blockReappraisalKeys.detail(collateralMasterId),
    queryFn: async (): Promise<BlockReappraisalDetailResult> => {
      const { data } = await axios.get(`/block-reappraisal/${collateralMasterId}`);
      return data.result ?? data;
    },
    enabled: !!collateralMasterId,
    staleTime: 30 * 1000,
  });
}

// ─── Create mutation ──────────────────────────────────────────────────────────

export function useCreateBlockReappraisal() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (collateralMasterId: string): Promise<BlockReappraisalCreateResult> => {
      const { data } = await axios.post(`/block-reappraisal/${collateralMasterId}/create`);
      return data.result ?? data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: blockReappraisalKeys.lists() });
    },
  });
}

// ─── Opt-out mutation ─────────────────────────────────────────────────────────

export function useMarkBlockReappraisalNotRequired() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (collateralMasterId: string): Promise<void> => {
      await axios.post(`/block-reappraisal/${collateralMasterId}/opt-out`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: blockReappraisalKeys.lists() });
    },
  });
}
