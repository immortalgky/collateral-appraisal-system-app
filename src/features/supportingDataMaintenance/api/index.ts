import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import axios from '@shared/api/axiosInstance';
import type { CreateSupportingDataBody } from './types';
import { isAxiosError } from 'axios';
import type { GetSupportingDataByIdType } from '../schemas/form';
import { supportingDetails } from '../constants/mockData';

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
    mutationFn: async (params: {
      supportingId: string;
      data: CreateSupportingDataBody;
    }): Promise<{ id: string }> => {
      const { data } = await axios.post(
        `/supporting-data-maintenance/${params.supportingId}`,
        params.data,
      );
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: supportingDataMaintenanceKeys.lists() });
    },
  });
};

export const useUpdateSupportingData = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: {
      supportingId: string;
      id: string;
      data: CreateSupportingDataBody;
    }): Promise<{ id: string }> => {
      const { data } = await axios.post(
        `/supporting-data-maintenance/${params.supportingId}/data/${params.id}`,
        params.data,
      );
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

export const useGetSupportingDataById = (supportingId: string, id: string) => {
  return useQuery({
    queryKey: ['supporting-data-maintenance', supportingId, 'supporting-data', id],
    enabled: !!supportingId && !!id,
    queryFn: async (): Promise<GetSupportingDataByIdType> => {
      // const { data } = await axios.get(
      //   `/standalone/supporting-data-maintenance/${supportingId}/data/${id}`,
      // );
      // return data;
      return supportingDetails.filter(s => s.id == id)?.[0];
    },
    retry: (failureCount, error) => {
      if (isAxiosError(error) && error.response?.status === 404) return false;
      return failureCount < 3;
    },
  });
};
