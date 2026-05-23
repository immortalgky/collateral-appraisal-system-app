import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import axios from '@shared/api/axiosInstance';
import type {
  CreateSupportingDataDetailRequest,
  CreateSupportingDataType,
  GetSupportingDataByIdType,
  GetSupportingDataDetailListParams,
  GetSupportingDataDetailListResponse,
  GetSupportingDataMaintenanceListParams,
  GetSupportingDataMaintenanceListResponse,
  SupportingDataDetailItem,
} from './types';
import { isAxiosError } from 'axios';
import type { GetSupportingDataDetailByIdType } from '../schemas/form';
import {
  supportingDataDetailPreviewList,
  supportingDataRequestDetailList,
  supportingDataRequestList,
  supportingDetails,
} from '../constants/mockData';

export const supportingDataMaintenanceKeys = {
  all: ['supporting-data-maintenance'] as const,

  // Supporting list (paginated)
  lists: () => [...supportingDataMaintenanceKeys.all, 'list'] as const,
  list: (params: Record<string, unknown>) =>
    [...supportingDataMaintenanceKeys.lists(), params] as const,

  // Supporting by id
  details: () => [...supportingDataMaintenanceKeys.all, 'detail'] as const,
  detail: (supportingId: string) =>
    [...supportingDataMaintenanceKeys.details(), supportingId] as const,

  // Detail rows (children of a supporting record)
  dataLists: (supportingId: string) =>
    [...supportingDataMaintenanceKeys.detail(supportingId), 'data-list'] as const,
  dataList: (supportingId: string, params: Record<string, unknown>) =>
    [...supportingDataMaintenanceKeys.dataLists(supportingId), params] as const,

  dataDetails: (supportingId: string) =>
    [...supportingDataMaintenanceKeys.detail(supportingId), 'data'] as const,
  dataDetail: (supportingId: string, id: string) =>
    [...supportingDataMaintenanceKeys.dataDetails(supportingId), id] as const,
};

export const useCreateSupportingDetailData = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: {
      supportingId: string;
      data: CreateSupportingDataDetailRequest;
    }): Promise<{ id: string }> => {
      const { data } = await axios.post(
        `/supporting-data-maintenance/${params.supportingId}/data`,
        params.data,
      );
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: supportingDataMaintenanceKeys.dataLists(variables.supportingId),
      });
      queryClient.invalidateQueries({
        queryKey: supportingDataMaintenanceKeys.detail(variables.supportingId),
      });
    },
  });
};

export const useUpdateSupportingDetailData = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: {
      supportingId: string;
      id: string;
      data: CreateSupportingDataDetailRequest;
    }): Promise<{ id: string }> => {
      const { data } = await axios.patch(
        `/supporting-data-maintenance/${params.supportingId}/data/${params.id}`,
        params.data,
      );
      return data;
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: supportingDataMaintenanceKeys.dataLists(variables.supportingId),
      });
      queryClient.invalidateQueries({
        queryKey: supportingDataMaintenanceKeys.dataDetail(variables.supportingId, variables.id),
      });
      queryClient.invalidateQueries({
        queryKey: supportingDataMaintenanceKeys.detail(variables.supportingId),
      });
    },
  });
};

export const useCreateSupportingData = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: {
      data: CreateSupportingDataType;
    }): Promise<{ supportingId: string }> => {
      const { data } = await axios.post(`/supporting-data-maintenance/`, params.data);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: supportingDataMaintenanceKeys.lists() });
    },
  });
};

export const useCreateDraftSupportingData = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: {
      data?: CreateSupportingDataType;
    }): Promise<{ supportingId: string }> => {
      // const { data } = await axios.post(`/supporting-data-maintenance/draft`, params.data);
      // return data;
      return { supportingId: crypto.randomUUID().toString() };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: supportingDataMaintenanceKeys.lists() });
    },
  });
};

export const useUpdateSupportingData = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: {
      supportingId: string;
      data: CreateSupportingDataType;
    }): Promise<{ supportingId: string }> => {
      const { data } = await axios.patch(
        `/supporting-data-maintenance/${params.supportingId}`,
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

export const useGetSupportingDataById = (supportingId?: string) => {
  return useQuery({
    queryKey: supportingDataMaintenanceKeys.detail(supportingId ?? ''),
    enabled: !!supportingId,
    queryFn: async (): Promise<GetSupportingDataByIdType> => {
      // const { data } = await axios.get(
      //   `/standalone/supporting-data-maintenance/${supportingId}`,
      // );
      // return data;
      return supportingDataRequestDetailList.filter(s => s.id == supportingId)?.[0];
    },
    retry: (failureCount, error) => {
      if (isAxiosError(error) && error.response?.status === 404) return false;
      return failureCount < 3;
    },
  });
};

export const useGetSupportingDataDetailById = (supportingId: string, id: string) => {
  return useQuery({
    queryKey: supportingDataMaintenanceKeys.dataDetail(supportingId ?? '', id ?? ''),
    enabled: !!supportingId && !!id,
    queryFn: async (): Promise<GetSupportingDataDetailByIdType> => {
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

  const queryKey = supportingDataMaintenanceKeys.list({
    pageNumber,
    pageSize,
    ...(status && { status }),
    ...(createdDate && { createdDate }),
    ...(supportingNumber && { supportingNumber }),
  });

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
    queryKey: supportingDataMaintenanceKeys.dataList(supportingId, { pageNumber, pageSize }),
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
