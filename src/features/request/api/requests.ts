import {
  type CreateRequestRequestType,
  type CreateRequestResponseType,
  schemas,
} from '@shared/schemas/v1';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import axios from '@shared/api/axiosInstance';
import { isAxiosError } from 'axios';
import type { z } from 'zod';

// Extract schemas for convenience
const {
  GetRequestResult,
  GetRequestByIdResult,
  UpdateRequestRequest,
  UpdateRequestResponse,
  DeleteRequestResponse,
  SubmitRequestResponse,
  CreateDraftRequestRequest,
  CreateDraftRequestResponse,
  UpdateDraftRequestRequest,
  UpdateDraftRequestResponse,
} = schemas;

// Types for API responses
export type GetRequestResultType = z.infer<typeof GetRequestResult>;
export type GetRequestByIdResultType = z.infer<typeof GetRequestByIdResult>;
export type UpdateRequestRequestType = z.infer<typeof UpdateRequestRequest>;
export type UpdateRequestResponseType = z.infer<typeof UpdateRequestResponse>;
export type DeleteRequestResponseType = z.infer<typeof DeleteRequestResponse>;
export type SubmitRequestResponseType = z.infer<typeof SubmitRequestResponse>;
export type CreateDraftRequestRequestType = z.infer<typeof CreateDraftRequestRequest>;
export type CreateDraftRequestResponseType = z.infer<typeof CreateDraftRequestResponse>;
export type UpdateDraftRequestRequestType = z.infer<typeof UpdateDraftRequestRequest>;
export type UpdateDraftRequestResponseType = z.infer<typeof UpdateDraftRequestResponse>;

/**
 * Strips empty document placeholders (no file attached) from request payloads.
 * The backend generates the required document checklist dynamically,
 * so empty placeholders don't need to be persisted.
 */
const stripEmptyDocuments = <T extends Record<string, any>>(request: T): T => {
  const result = { ...request };

  if (Array.isArray(result.documents)) {
    result.documents = result.documents.filter(
      (doc: any) => doc.fileName || doc.documentId,
    );
  }

  if (Array.isArray(result.titles)) {
    result.titles = result.titles.map((title: any) => {
      if (!Array.isArray(title?.documents)) return title;
      return {
        ...title,
        documents: title.documents.filter(
          (doc: any) => doc.fileName || doc.documentId,
        ),
      };
    });
  }

  return result;
};

// Query params for request listing
export interface GetRequestsParams {
  pageNumber?: number;
  pageSize?: number;
  search?: string;
  status?: string;
  purpose?: string;
  sortBy?: string;
  sortDirection?: 'asc' | 'desc';
}

export const useCreateRequest = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (request: CreateRequestRequestType): Promise<CreateRequestResponseType> => {
      const { data } = await axios.post('/requests', stripEmptyDocuments(request));
      return data;
    },
    onSuccess: data => {
      console.log(data);
      queryClient.invalidateQueries({ queryKey: ['my-requests'] });
    },
    onError: (error: any) => {
      console.log(error);
    },
  });
};

/**
 * Hook for fetching paginated list of requests for the current user
 * GET /requests/me
 */
export const useGetRequests = (params: GetRequestsParams = {}) => {
  // Build a clean query key without undefined values for proper cache invalidation
  const queryKey = [
    'my-requests',
    {
      pageNumber: params.pageNumber ?? 0,
      pageSize: params.pageSize ?? 10,
      ...(params.search && { search: params.search }),
      ...(params.status && { status: params.status }),
      ...(params.purpose && { purpose: params.purpose }),
      ...(params.sortBy && { sortBy: params.sortBy }),
      ...(params.sortDirection && { sortDirection: params.sortDirection }),
    },
  ];

  return useQuery({
    queryKey,
    queryFn: async (): Promise<GetRequestResultType> => {
      const { data } = await axios.get('/requests/me', {
        params: {
          PageNumber: params.pageNumber ?? 0,
          PageSize: params.pageSize ?? 10,
          // Filter params
          ...(params.search && { Search: params.search }),
          ...(params.status && { Status: params.status }),
          ...(params.purpose && { Purpose: params.purpose }),
          // Sorting params
          ...(params.sortBy && { SortBy: params.sortBy }),
          ...(params.sortDirection && { SortDirection: params.sortDirection }),
        },
      });
      return data;
    },
    // Cache data for 30 seconds - switching sorts won't refetch if within this window
    staleTime: 30 * 1000,
  });
};

/**
 * Hook for fetching a single request by ID
 * GET /requests/{requestId}
 */
export const useGetRequestById = (id: string | undefined) => {
  return useQuery({
    queryKey: ['request', id],
    queryFn: async (): Promise<GetRequestByIdResultType> => {
      const { data } = await axios.get(`/requests/${id}`);
      return data;
    },
    enabled: !!id,
    retry: (failureCount, error) => {
      // Don't retry 404 errors - they're not recoverable
      if (isAxiosError(error) && error.response?.status === 404) {
        return false;
      }
      // Default: retry up to 3 times for other errors
      return failureCount < 3;
    },
  });
};

/**
 * Hook for updating an existing request
 * PUT /requests/{requestId}
 */
export const useUpdateRequest = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      request,
    }: {
      id: string;
      request: UpdateRequestRequestType;
    }): Promise<UpdateRequestResponseType> => {
      const { data } = await axios.put(`/requests/${id}`, stripEmptyDocuments(request));
      return data;
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['requests'] });
      queryClient.invalidateQueries({ queryKey: ['my-requests'] });
      queryClient.invalidateQueries({ queryKey: ['request', variables.id] });
    },
    onError: (error: any) => {
      console.error('Failed to update request:', error);
    },
  });
};

/**
 * Hook for deleting a request
 * DELETE /requests/{requestId}
 */
export const useDeleteRequest = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (requestId: string): Promise<DeleteRequestResponseType> => {
      const { data } = await axios.delete(`/requests/${requestId}`);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-requests'] });
    },
  });
};

/**
 * Hook for creating a new draft request
 * POST /requests/draft
 */
export const useCreateDraftRequest = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (request: CreateDraftRequestRequestType): Promise<CreateDraftRequestResponseType> => {
      const { data } = await axios.post('/requests/draft', stripEmptyDocuments(request));
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-requests'] });
    },
  });
};

/**
 * Hook for updating an existing draft request
 * PUT /requests/{id}/draft
 */
export const useUpdateDraftRequest = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      request,
    }: {
      id: string;
      request: UpdateDraftRequestRequestType;
    }): Promise<UpdateDraftRequestResponseType> => {
      const { data } = await axios.put(`/requests/${id}/draft`, stripEmptyDocuments(request));
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['my-requests'] });
      queryClient.invalidateQueries({ queryKey: ['request', variables.id] });
    },
  });
};

/**
 * Hook for submitting a request for processing
 * POST /requests/{id}/submit
 */
export const useSubmitRequest = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string): Promise<SubmitRequestResponseType> => {
      const { data } = await axios.post(`/requests/${id}/submit`);
      return data;
    },
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: ['my-requests'] });
      queryClient.invalidateQueries({ queryKey: ['request', id] });
    },
  });
};
