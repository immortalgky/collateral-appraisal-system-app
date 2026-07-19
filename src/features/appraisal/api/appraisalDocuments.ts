import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import axios from '@shared/api/axiosInstance';
import {
  AddAppraisalDocumentResponseSchema,
  GetAppraisalDocumentsResponseSchema,
  RemoveAppraisalDocumentResponseSchema,
  UpdateAppraisalDocumentNotesResponseSchema,
  type AddAppraisalDocumentRequest,
  type AddAppraisalDocumentResponse,
  type GetAppraisalDocumentsResponse,
  type RemoveAppraisalDocumentResponse,
  type UpdateAppraisalDocumentNotesRequest,
  type UpdateAppraisalDocumentNotesResponse,
} from '../types/appraisalDocuments';

// ==================== Query Keys ====================

export const appraisalDocumentKeys = {
  list: (appraisalId: string) => ['appraisal', appraisalId, 'documents'] as const,
};

// ==================== Queries ====================

/**
 * Fetch the valuation document checklist (one entry per VAL_DOC document type,
 * with its attached files) for an appraisal.
 * GET /appraisals/{appraisalId}/documents
 */
export const useGetAppraisalDocuments = (appraisalId: string | undefined) => {
  return useQuery({
    queryKey: appraisalDocumentKeys.list(appraisalId!),
    queryFn: async (): Promise<GetAppraisalDocumentsResponse> => {
      const { data } = await axios.get(`/appraisals/${appraisalId}/documents`);
      return GetAppraisalDocumentsResponseSchema.parse(data);
    },
    enabled: !!appraisalId,
  });
};

// ==================== Mutations ====================

/**
 * Link an already-uploaded document (via POST /documents) to a VAL_DOC document
 * type checklist entry.
 * POST /appraisals/{appraisalId}/documents
 */
export const useAttachAppraisalDocument = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      appraisalId,
      body,
    }: {
      appraisalId: string;
      body: AddAppraisalDocumentRequest;
    }): Promise<AddAppraisalDocumentResponse> => {
      const { data } = await axios.post(`/appraisals/${appraisalId}/documents`, body);
      return AddAppraisalDocumentResponseSchema.parse(data);
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: appraisalDocumentKeys.list(variables.appraisalId),
      });
    },
  });
};

/**
 * Remove a document attachment from the checklist.
 * DELETE /appraisals/{appraisalId}/documents/{id}
 */
export const useRemoveAppraisalDocument = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      appraisalId,
      id,
    }: {
      appraisalId: string;
      id: string;
    }): Promise<RemoveAppraisalDocumentResponse> => {
      const { data } = await axios.delete(`/appraisals/${appraisalId}/documents/${id}`);
      return RemoveAppraisalDocumentResponseSchema.parse(data);
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: appraisalDocumentKeys.list(variables.appraisalId),
      });
    },
  });
};

/**
 * Update the Notes field of a single checklist attachment.
 * PUT /appraisals/{appraisalId}/documents/{id}
 */
export const useUpdateAppraisalDocumentNotes = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      appraisalId,
      id,
      body,
    }: {
      appraisalId: string;
      id: string;
      body: UpdateAppraisalDocumentNotesRequest;
    }): Promise<UpdateAppraisalDocumentNotesResponse> => {
      const { data } = await axios.put(`/appraisals/${appraisalId}/documents/${id}`, body);
      return UpdateAppraisalDocumentNotesResponseSchema.parse(data);
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: appraisalDocumentKeys.list(variables.appraisalId),
      });
    },
  });
};
