import {
  type CreateRequestRequestType,
  type CreateRequestResponseType,
  schemas,
} from '@shared/schemas/v1';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import axios from '@shared/api/axiosInstance';
import type { z } from 'zod';

// Extract schemas for convenience
const {
  GetRequestResult,
  GetRequestByIdResult,
  UpdateRequestRequest,
  UpdateRequestResponse,
  DeleteRequestResponse,
  AddRequestCommentRequest,
  AddRequestCommentResponse,
  UpdateRequestCommentRequest,
  UpdateRequestCommentResponse,
  RemoveRequestCommentResponse,
  GetRequestCommentsByRequestIdResponse,
} = schemas;

// Types for API responses
export type GetRequestResultType = z.infer<typeof GetRequestResult>;
export type GetRequestByIdResultType = z.infer<typeof GetRequestByIdResult>;
export type UpdateRequestRequestType = z.infer<typeof UpdateRequestRequest>;
export type UpdateRequestResponseType = z.infer<typeof UpdateRequestResponse>;
export type DeleteRequestResponseType = z.infer<typeof DeleteRequestResponse>;

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
import type {
  CreateUploadSessionResponse,
  UploadDocumentResult,
  UploadDocumentParams,
} from './types/document';

export const useCreateRequest = () => {
  return useMutation({
    mutationFn: async (request: CreateRequestRequestType): Promise<CreateRequestResponseType> => {
      console.log(request);
      const { data } = await axios.post('/requests', request);
      return data;
    },
    // TODO: Change to actual logic
    onSuccess: data => {
      console.log(data);
    },
    onError: (error: any) => {
      console.log(error);
    },
  });
};

/**
 * Hook for fetching paginated list of requests
 * GET /requests
 */
export const useGetRequests = (params: GetRequestsParams = {}) => {
  // Build a clean query key without undefined values for proper cache invalidation
  const queryKey = [
    'requests',
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
      const { data } = await axios.get('/requests', {
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
  });
};

/**
 * Hook for updating an existing request
 * PUT /requests/{requestId}
 */
export const useUpdateRequest = () => {
  return useMutation({
    mutationFn: async ({
      id,
      request,
    }: {
      id: string;
      request: UpdateRequestRequestType;
    }): Promise<UpdateRequestResponseType> => {
      const { data } = await axios.put(`/requests/${id}`, request);
      return data;
    },
    onSuccess: data => {
      console.log('Request updated successfully:', data);
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
      queryClient.invalidateQueries({ queryKey: ['requests'] });
    },
  });
};

/**
 * Create an upload session for document uploads
 * This session ID is used for all subsequent document uploads until page refresh
 */
export const createUploadSession = async (): Promise<CreateUploadSessionResponse> => {
  const { data } = await axios.post<CreateUploadSessionResponse>('/documents/session');
  return data;
};

export interface UploadDocumentResponse {
  documentId: string;
  fileName: string;
  filePath: string;
  uploadDate: string;
}

/**
 * Hook for uploading a single document to the server
 * Uses the upload session ID for all uploads within a session
 *
 * @param uploadSessionId - Session ID from createUploadSession()
 * @param file - Single file to upload
 * @param documentType - Type of document (e.g., TITLE_DEED, ID_CARD)
 * @param documentCategory - Category derived from type (legal, supporting_document, request_document)
 */
export const useUploadDocument = () => {
  return useMutation({
    mutationFn: async (params: UploadDocumentParams): Promise<UploadDocumentResult> => {
      const { uploadSessionId, file, documentType, documentCategory } = params;

      const formData = new FormData();
      formData.append('uploadSessionId', uploadSessionId);
      formData.append('files', file);
      formData.append('documentType', documentType);
      formData.append('documentCategory', documentCategory);

      const { data } = await axios.post<UploadDocumentResult>('/documents', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      return data;
    },
  });
};

/**
 * Legacy hook for uploading documents (kept for backward compatibility during migration)
 * @deprecated Use useUploadDocument with UploadDocumentParams instead
 */
export const useUploadDocumentLegacy = () => {
  return useMutation({
    mutationFn: async (files: FileList): Promise<UploadDocumentResponse[]> => {
      // MOCK IMPLEMENTATION - to be removed
      await new Promise(resolve => setTimeout(resolve, 1000));

      return Array.from(files).map((file, index) => ({
        documentId: `doc-${Date.now()}-${index}`,
        fileName: file.name,
        filePath: `/uploads/${file.name}`,
        uploadDate: new Date().toISOString(),
      }));
    },
  });
};

/**
 * Hook for downloading/viewing documents from the server
 *
 * ⚠️ CURRENTLY USING MOCK API ⚠️
 * To integrate with real backend:
 * 1. See /docs/API_INTEGRATION.md for detailed instructions
 * 2. Uncomment the real API call below
 * 3. Remove the mock implementation
 * 4. Ensure your API endpoint matches: GET /api/documents/{documentId}/download
 */
export const useDownloadDocument = () => {
  return useMutation({
    mutationFn: async (_documentId: string): Promise<Blob> => {
      // ===== REAL API IMPLEMENTATION (COMMENTED OUT) =====
      // Uncomment this when your backend is ready:
      // const { data } = await axios.get(`/documents/${_documentId}/download`, {
      //   responseType: 'blob',
      // });
      // return data;

      // ===== MOCK IMPLEMENTATION (REMOVE IN PRODUCTION) =====
      await new Promise(resolve => setTimeout(resolve, 500));

      // Return empty blob as placeholder
      return new Blob(['Mock document content'], { type: 'application/pdf' });
    },
  });
};

// ==================== COMMENT API HOOKS ====================

// Types for comment API
export type AddRequestCommentRequestType = z.infer<typeof AddRequestCommentRequest>;
export type AddRequestCommentResponseType = z.infer<typeof AddRequestCommentResponse>;
export type UpdateRequestCommentRequestType = z.infer<typeof UpdateRequestCommentRequest>;
export type UpdateRequestCommentResponseType = z.infer<typeof UpdateRequestCommentResponse>;
export type RemoveRequestCommentResponseType = z.infer<typeof RemoveRequestCommentResponse>;
export type GetRequestCommentsByRequestIdResponseType = z.infer<
  typeof GetRequestCommentsByRequestIdResponse
>;

/**
 * Hook for adding a comment to a request
 * POST /requests/{requestId}/comments
 */
export const useAddComment = () => {
  return useMutation({
    mutationFn: async ({
      requestId,
      data,
    }: {
      requestId: string;
      data: AddRequestCommentRequestType;
    }): Promise<AddRequestCommentResponseType> => {
      const { data: response } = await axios.post(`/requests/${requestId}/comments`, data);
      return response;
    },
  });
};

/**
 * Hook for updating an existing comment
 * PUT /requests/{requestId}/comments/{commentId}
 */
export const useUpdateComment = () => {
  return useMutation({
    mutationFn: async ({
      requestId,
      commentId,
      comment,
    }: {
      requestId: string;
      commentId: string;
      comment: string;
    }): Promise<UpdateRequestCommentResponseType> => {
      const { data } = await axios.put(`/requests/${requestId}/comments/${commentId}`, { comment });
      return data;
    },
  });
};

/**
 * Hook for deleting a comment
 * DELETE /requests/{requestId}/comments/{commentId}
 */
export const useDeleteComment = () => {
  return useMutation({
    mutationFn: async ({
      requestId,
      commentId,
    }: {
      requestId: string;
      commentId: string;
    }): Promise<RemoveRequestCommentResponseType> => {
      const { data } = await axios.delete(`/requests/${requestId}/comments/${commentId}`);
      return data;
    },
  });
};

/**
 * Hook for fetching all comments for a request
 * GET /requests/{requestId}/comments
 */
export const useGetComments = (requestId: string | undefined) => {
  return useQuery({
    queryKey: ['comments', requestId],
    queryFn: async (): Promise<GetRequestCommentsByRequestIdResponseType> => {
      const { data } = await axios.get(`/requests/${requestId}/comments`);
      return data;
    },
    enabled: !!requestId,
  });
};
