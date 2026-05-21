import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import axios from '@shared/api/axiosInstance';
import type {
  CreateSupportingDataBody,
  GetSupportingDataDetailListParams,
  GetSupportingDataDetailListResponse,
  GetSupportingDataMaintenanceListParams,
  GetSupportingDataMaintenanceListResponse,
  SupportingDataDetailItem,
} from './types';
import { isAxiosError } from 'axios';
import type { GetSupportingDataByIdType } from '../schemas/form';
import {
  supportingDataDetailPreviewList,
  supportingDataRequestList,
  supportingDetails,
} from '../constants/mockData';

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

export const useGetSupportingDataMaintenanceList = (
  params: GetSupportingDataMaintenanceListParams,
) => {
  const { pageNumber = 0, pageSize = 10, status, createdDate, supportingNumber } = params;

  const queryKey = [
    {
      pageNumber,
      pageSize,
      ...(status && { status }),
      ...(createdDate && { createdDate }),
      ...(supportingNumber && { supportingNumber }),
    },
  ];

  return useQuery({
    queryKey,
    queryFn: async (): Promise<GetSupportingDataMaintenanceListResponse> => {
      // const { data } = await axios.get('/standalone/supporting-data-maintenance', {
      //   params: {
      //     PageNumber: pageNumber,
      //     PageSize: pageSize,
      //     ...(status && { Status: status }),
      //     ...(createdDate && { CreatedDate: createdDate }),
      //     ...(supportingNumber && { SupportingNumber: supportingNumber }),
      //   },
      // });

      // API returns { result: { items, count, pageNumber, pageSize } }
      // return data.result ?? data;

      return {
        items: supportingDataRequestList,
        count: supportingDataRequestList.length,
        pageNumber,
        pageSize,
      };
    },
    staleTime: 30 * 1000,
  });
};

export const useGetSupportingDataDetailList = (params: GetSupportingDataDetailListParams) => {
  const { supportingId, pageNumber = 0, pageSize = 25 } = params;

  return useQuery({
    queryKey: [
      ...supportingDataMaintenanceKeys.detail(supportingId),
      'data-list',
      { pageNumber, pageSize },
    ],
    enabled: !!supportingId,
    queryFn: async (): Promise<GetSupportingDataDetailListResponse> => {
      // const { data } = await axios.get(
      //   `/standalone/supporting-data-maintenance/${supportingId}/data`,
      //   { params: { PageNumber: pageNumber, PageSize: pageSize } },
      // );
      // return data.result ?? data;

      // Mock: paginate the preview list locally.
      const all = supportingDataDetailPreviewList as SupportingDataDetailItem[];
      const start = pageNumber * pageSize;
      const items = all.slice(start, start + pageSize);
      return {
        items,
        count: all.length,
        pageNumber,
        pageSize,
      };
    },
    staleTime: 30 * 1000,
  });
};
