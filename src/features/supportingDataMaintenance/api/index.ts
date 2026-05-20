import { useMutation, useQueryClient } from '@tanstack/react-query';
import axios from '@shared/api/axiosInstance';
import type { CreateSupportingDataBody } from './types';

export const supportingDataMaintenanceKeys = {
  all: ['supporting-data-maintenance'] as const,
  lists: () => [...supportingDataMaintenanceKeys.all, 'list'] as const,
  list: (params: Record<string, unknown>) =>
    [...supportingDataMaintenanceKeys.lists(), params] as const,
  details: () => [...supportingDataMaintenanceKeys.all, 'detail'] as const,
  detail: (supporingId: string) =>
    [...supportingDataMaintenanceKeys.details(), supporingId] as const,
};

export const useCreateSupportingData = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (body: CreateSupportingDataBody): Promise<{ id: string }> => {
      const { data } = await axios.post('/supporting-data-maintenance', body);
      return data;
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: supportingDataMaintenanceKeys.lists() });
    },
  });
};

export const useUpdateSupportingData = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (
      body: CreateSupportingDataBody,
      supportingId: string,
    ): Promise<{ id: string }> => {
      const { data } = await axios.post(`/supporting-data-maintenance/${supportingId}`, body);
      return data;
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: supportingDataMaintenanceKeys.lists() });
      queryClient.invalidateQueries({
        queryKey: supportingDataMaintenanceKeys.detail(variables.supportingId),
      });
    },
  });
};
