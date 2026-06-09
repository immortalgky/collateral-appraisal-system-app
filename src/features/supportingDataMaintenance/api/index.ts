import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import axios from '@shared/api/axiosInstance';
import type {
  CreateDecisionDataType,
  CreateSupportingDataDetailRequest,
  CreateSupportingDataType,
  GetSupportingDataByIdType,
  GetSupportingDataDetailListParams,
  GetSupportingDataDetailListResponse,
  GetSupportingDataMaintenanceListParams,
  GetSupportingDataMaintenanceListResponse,
  SupportingDataDateType,
} from './types';
import { isAxiosError } from 'axios';
import type { GetSupportingDataDetailByIdType } from '../schemas/form';

/** Maps a (dateType, dateFrom, dateTo) tuple onto the backend's Pascal-cased query params. */
function toDateQueryParams(
  dateType: SupportingDataDateType | undefined,
  from?: string,
  to?: string,
) {
  if (!from && !to) return {};
  const pairs: Record<SupportingDataDateType, [string, string]> = {
    createdDate: ['DateFrom', 'DateTo'],
    lastModifiedDate: ['LastModifiedDateFrom', 'LastModifiedDateTo'],
  };
  const [fromKey, toKey] = pairs[dateType ?? 'createdDate'];
  return {
    ...(from && { [fromKey]: from }),
    ...(to && { [toKey]: to }),
  };
}

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
      const { data } = await axios.post(`/supporting-data/${params.supportingId}/details`, {
        detail: params.data,
      });
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
        `/supporting-data/${params.supportingId}/details/${params.id}`,
        { detail: params.data },
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

export const useDeleteSupportingDetailData = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: {
      supportingId: string;
      id: string;
    }): Promise<{ isSuccessful: boolean }> => {
      const { data } = await axios.delete(
        `/supporting-data/${params.supportingId}/details/${params.id}`,
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

export const useDeleteSupportingDetailsByBatchData = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: {
      supportingId: string;
      supportingDetailIds: string[];
    }): Promise<void> => {
      await axios.delete(`/supporting-data/${params.supportingId}/details/batch`, {
        data: { SupportingDetailIds: params.supportingDetailIds },
      });
    },
    onSuccess: (_data, variables) => {
      // Refresh the detail list and parent record — no single dataDetail to invalidate
      queryClient.invalidateQueries({
        queryKey: supportingDataMaintenanceKeys.dataLists(variables.supportingId),
      });
      queryClient.invalidateQueries({
        queryKey: supportingDataMaintenanceKeys.detail(variables.supportingId),
      });
    },
  });
};

export const useDeleteSupportingData = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: { supportingId: string }): Promise<{ isSuccessful: boolean }> => {
      const { data } = await axios.delete(`/supporting-data/${params.supportingId}`);
      return data;
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: supportingDataMaintenanceKeys.dataLists(variables.supportingId),
      });
      queryClient.invalidateQueries({ queryKey: supportingDataMaintenanceKeys.lists() });
    },
  });
};

export const useSubmitSupportingData = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: {
      supportingId: string | undefined;
      data: CreateSupportingDataType | CreateDecisionDataType;
    }): Promise<{ supportingId: string }> => {
      const { data } = await axios.post(`/supporting-data/submit/`, {
        supportingId: params.supportingId ?? null,
        header: { ...params.data },
      });
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
      data: CreateSupportingDataType;
    }): Promise<{ supportingId: string }> => {
      const { data } = await axios.post(`/supporting-data/draft`, { header: params.data });
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: supportingDataMaintenanceKeys.lists() });
    },
  });
};

export const useUpdateDraftSupportingData = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: {
      supportingId: string;
      data: CreateSupportingDataType;
    }): Promise<{ supportingId: string }> => {
      const { data } = await axios.patch(`/supporting-data/draft/${params.supportingId}`, {
        header: params.data,
      });
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
      const { data } = await axios.get(`/supporting-data/${supportingId}`);
      return data;
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
      const { data } = await axios.get(`/supporting-data/${supportingId}/details/${id}`);
      return data;
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
  const {
    pageNumber = 0,
    pageSize = 10,
    search,
    sortBy,
    sortDir,
    status,
    supportingNumber,
    dateType,
    dateFrom,
    dateTo,
  } = params;

  const queryKey = supportingDataMaintenanceKeys.list({
    pageNumber,
    pageSize,
    ...(search && { search }),
    ...(sortBy && { sortBy }),
    ...(sortDir && { sortDir }),
    ...(status && { status }),
    ...(supportingNumber && { supportingNumber }),
    ...(dateType && { dateType }),
    ...(dateFrom && { dateFrom }),
    ...(dateTo && { dateTo }),
  });

  return useQuery({
    queryKey,
    queryFn: async (): Promise<GetSupportingDataMaintenanceListResponse> => {
      const { data } = await axios.get('/supporting-data', {
        params: {
          PageNumber: pageNumber,
          PageSize: pageSize,
          ...(search && { Search: search }),
          ...(sortBy && { SortBy: sortBy }),
          ...(sortDir && { SortDir: sortDir }),
          ...(status && { Status: status }),
          ...(supportingNumber && { SupportingNumber: supportingNumber }),
          ...toDateQueryParams(dateType, dateFrom, dateTo),
        },
      });

      return {
        items: data.supportingDataList,
        hasAuthorityToRemove: data.hasAuthorityToRemove,
        hasAuthorityToEdit: data.hasAuthorityToEdit,
        count: data.totalCount,
        pageNumber: data.pageNumber,
        pageSize: data.pageSize,
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
      const { data } = await axios.get(`/supporting-data/${supportingId}/details`, {
        params: { PageNumber: pageNumber, PageSize: pageSize },
      });
      return {
        items: data.items,
        count: data.totalCount,
        pageNumber: data.pageNumber,
        pageSize: data.pageSize,
      };
    },
    staleTime: 30 * 1000,
  });
};

// ========================
// Supporting Detail Images
// ========================

/**
 * Add an image to a supporting detail
 * POST /supporting-data/{supportingId}/details/{detailId}/images
 */
export const useAddSupportingDetailImage = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: {
      supportingId: string;
      detailId: string;
      documentId: string;
      storageUrl: string;
      fileName?: string | null;
      title?: string | null;
      description?: string | null;
    }): Promise<{ imageId: string }> => {
      const { supportingId, detailId, ...body } = params;
      const { data } = await axios.post(
        `/supporting-data/${supportingId}/details/${detailId}/images`,
        body,
      );
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: supportingDataMaintenanceKeys.dataDetail(
          variables.supportingId,
          variables.detailId,
        ),
      });
    },
  });
};

/**
 * Remove an image from a supporting detail
 * DELETE /supporting-data/{supportingId}/details/{detailId}/images/{imageId}
 */
export const useRemoveSupportingDetailImage = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: {
      supportingId: string;
      detailId: string;
      imageId: string;
    }): Promise<void> => {
      await axios.delete(
        `/supporting-data/${params.supportingId}/details/${params.detailId}/images/${params.imageId}`,
      );
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: supportingDataMaintenanceKeys.dataDetail(
          variables.supportingId,
          variables.detailId,
        ),
      });
    },
  });
};

export interface BulkUploadSupportingDetailsResponse {
  insertedCount: number;
}

/**
 * Sends an Excel file (.xlsx) to the bulk-upload endpoint.
 * On success, invalidates the detail-list cache so the table refreshes automatically.
 * On a 400 with row errors, the error object will have `response.data.rowErrors` — an array
 * of { rowNumber, column, message } objects ready to display in the UI.
 */
export const useBulkUploadSupportingDetails = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: {
      supportingId: string;
      file: File;
    }): Promise<BulkUploadSupportingDetailsResponse> => {
      const formData = new FormData();
      formData.append('file', params.file);

      const { data } = await axios.post<BulkUploadSupportingDetailsResponse>(
        `/supporting-data/${params.supportingId}/details/bulk-upload`,
        formData,
        { headers: { 'Content-Type': 'multipart/form-data' } },
      );
      return data;
    },
    onSuccess: (_data, variables) => {
      // Refresh the detail list and the supporting-data header (record count changes)
      queryClient.invalidateQueries({
        queryKey: supportingDataMaintenanceKeys.dataLists(variables.supportingId),
      });
      queryClient.invalidateQueries({
        queryKey: supportingDataMaintenanceKeys.detail(variables.supportingId),
      });
    },
  });
};
