import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import axios from '@shared/api/axiosInstance';
import type {
  BlockUnitMaintenanceDetail,
  PaginatedBlockUnitMaintenance,
  UpdateUnitSaleStatusPayload,
  ProjectType,
} from '../types';

// ─── Query Key Factory ────────────────────────────────────────────────────────

export const blockUnitMaintenanceKeys = {
  all: ['block-unit-maintenance'] as const,
  lists: () => [...blockUnitMaintenanceKeys.all, 'list'] as const,
  list: (params: Record<string, unknown>) =>
    [...blockUnitMaintenanceKeys.lists(), params] as const,
  units: (projectId: string) =>
    [...blockUnitMaintenanceKeys.all, 'units', projectId] as const,
};

// ─── Query Param Interface ────────────────────────────────────────────────────

export interface GetBlockUnitMaintenanceListParams {
  pageNumber?: number;
  pageSize?: number;
  search?: string;
  projectType?: ProjectType;
  developer?: string;
  sortBy?: string;
  sortDir?: 'asc' | 'desc';
}

// ─── GET /block-unit-maintenance ──────────────────────────────────────────────

export const useGetBlockUnitMaintenanceList = (
  params: GetBlockUnitMaintenanceListParams = {},
) => {
  const queryParams = {
    pageNumber: params.pageNumber ?? 0,
    pageSize: params.pageSize ?? 20,
    ...(params.search && { search: params.search }),
    ...(params.projectType && { projectType: params.projectType }),
    ...(params.developer && { developer: params.developer }),
    ...(params.sortBy && { sortBy: params.sortBy }),
    ...(params.sortDir && { sortDir: params.sortDir }),
  };

  return useQuery({
    queryKey: blockUnitMaintenanceKeys.list(queryParams),
    queryFn: async (): Promise<PaginatedBlockUnitMaintenance> => {
      const { data } = await axios.get<PaginatedBlockUnitMaintenance>(
        '/block-unit-maintenance',
        { params: queryParams },
      );
      return data;
    },
    placeholderData: keepPreviousData,
    staleTime: 30_000,
  });
};

// ─── GET /block-unit-maintenance/{projectId}/units ────────────────────────────

export const useGetProjectUnits = (projectId: string | null) => {
  return useQuery({
    queryKey: blockUnitMaintenanceKeys.units(projectId ?? ''),
    queryFn: async (): Promise<BlockUnitMaintenanceDetail> => {
      const { data } = await axios.get<BlockUnitMaintenanceDetail>(
        `/block-unit-maintenance/${projectId}/units`,
      );
      return data;
    },
    enabled: !!projectId,
    staleTime: 30_000,
  });
};

// ─── PUT /block-unit-maintenance/{projectId}/units ────────────────────────────

export const useUpdateUnitSaleStatus = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      projectId,
      payload,
    }: {
      projectId: string;
      payload: UpdateUnitSaleStatusPayload;
    }): Promise<void> => {
      await axios.put(`/block-unit-maintenance/${projectId}/units`, payload);
    },
    onSuccess: (_data, { projectId }) => {
      // Refresh the unit list for this project
      queryClient.invalidateQueries({
        queryKey: blockUnitMaintenanceKeys.units(projectId),
      });
      // Refresh listing rows so sold/unsold counts update
      queryClient.invalidateQueries({
        queryKey: blockUnitMaintenanceKeys.lists(),
      });
    },
  });
};
