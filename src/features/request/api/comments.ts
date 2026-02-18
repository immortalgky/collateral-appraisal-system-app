import { schemas } from '@shared/schemas/v1';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import axios from '@shared/api/axiosInstance';
import type { z } from 'zod';

// Extract schemas for convenience
const {
  AddRequestCommentRequest,
  AddRequestCommentResponse,
  UpdateRequestCommentRequest,
  UpdateRequestCommentResponse,
  RemoveRequestCommentResponse,
  GetRequestCommentsByRequestIdResponse,
} = schemas;

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
  const queryClient = useQueryClient();

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
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['comments', variables.requestId] });
    },
  });
};

/**
 * Hook for updating an existing comment
 * PUT /requests/{requestId}/comments/{commentId}
 */
export const useUpdateComment = () => {
  const queryClient = useQueryClient();

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
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['comments', variables.requestId] });
    },
  });
};

/**
 * Hook for deleting a comment
 * DELETE /requests/{requestId}/comments/{commentId}
 */
export const useDeleteComment = () => {
  const queryClient = useQueryClient();

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
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['comments', variables.requestId] });
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
