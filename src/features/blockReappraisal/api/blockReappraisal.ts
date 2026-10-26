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
  list: (params: BlockReappraisalListParams) => [...blockReappraisalKeys.lists(), params] as const,
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
        status,
        search,
        lastAppraisedDateFrom,
        lastAppraisedDateTo,
        remainingDayMin,
        remainingDayMax,
        sortBy,
        sortDir,
      } = params;

      const { data } = await axios.get('/block-reappraisal', {
        params: {
          pageNumber,
          pageSize,
          ...(status && { status }),
          ...(search && { search }),
          ...(lastAppraisedDateFrom && { lastAppraisedDateFrom }),
          ...(lastAppraisedDateTo && { lastAppraisedDateTo }),
          ...(remainingDayMin != null && { remainingDayMin }),
          ...(remainingDayMax != null && { remainingDayMax }),
          ...(sortBy && { sortBy, sortDir }),
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
    onSuccess: (_, collateralMasterId) => {
      queryClient.invalidateQueries({ queryKey: blockReappraisalKeys.lists() });
      queryClient.invalidateQueries({ queryKey: blockReappraisalKeys.detail(collateralMasterId) });
    },
  });
}

// ─── Restore mutation ─────────────────────────────────────────────────────────

/** Puts a not-required (Deleted) project back on the Pending list. */
export function useRestoreBlockReappraisal() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (collateralMasterId: string): Promise<void> => {
      await axios.post(`/block-reappraisal/${collateralMasterId}/restore`);
    },
    onSuccess: (_, collateralMasterId) => {
      queryClient.invalidateQueries({ queryKey: blockReappraisalKeys.lists() });
      queryClient.invalidateQueries({ queryKey: blockReappraisalKeys.detail(collateralMasterId) });
    },
  });
}

// ─── Opt-out mutation ─────────────────────────────────────────────────────────

export function useMarkBlockReappraisalNotRequired() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      collateralMasterId,
      remark,
    }: {
      collateralMasterId: string;
      remark: string;
    }): Promise<void> => {
      await axios.post(`/block-reappraisal/${collateralMasterId}/opt-out`, { remark });
    },
    // The detail page shows the status too (its banner), so refetch it as well as the lists.
    onSuccess: (_, { collateralMasterId }) => {
      queryClient.invalidateQueries({ queryKey: blockReappraisalKeys.lists() });
      queryClient.invalidateQueries({ queryKey: blockReappraisalKeys.detail(collateralMasterId) });
    },
  });
}
