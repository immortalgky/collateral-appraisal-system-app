import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import axios from '@shared/api/axiosInstance';
import type {
  AddAppendixDocumentRequest,
  GetAppraisalAppendicesResponse,
  GetRequestDocumentsByRequestIdResponse,
} from '../types/documentChecklist';

// ==================== Query Keys ====================

export const documentChecklistKeys = {
  requestDocuments: (requestId: string) => ['request', requestId, 'documents'] as const,
  appendices: (appraisalId: string) => ['appraisal', appraisalId, 'appendices'] as const,
};

// ==================== Request Documents (Read-only) ====================

/**
 * Fetch request documents grouped by sections
 * GET /requests/{requestId}/documents
 */
export const useGetRequestDocuments = (requestId: string | undefined) => {
  return useQuery({
    queryKey: documentChecklistKeys.requestDocuments(requestId!),
    queryFn: async (): Promise<GetRequestDocumentsByRequestIdResponse> => {
      const { data } = await axios.get(`/requests/${requestId}/documents`);
      return data;
    },
    enabled: !!requestId,
  });
};

// ==================== Appendix Documents ====================

/**
 * Fetch all appendices with their documents
 * GET /appraisals/{appraisalId}/appendices
 */
export const useGetAppendices = (appraisalId: string | undefined) => {
  return useQuery({
    queryKey: documentChecklistKeys.appendices(appraisalId!),
    queryFn: async (): Promise<GetAppraisalAppendicesResponse> => {
      const { data } = await axios.get(`/appraisals/${appraisalId}/appendices`);
      return data;
    },
    enabled: !!appraisalId,
  });
};

/**
 * Add a document to an appendix
 * POST /appraisals/{appraisalId}/appendices/{appendixId}/documents
 */
export const useAddAppendixDocument = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      appraisalId,
      appendixId,
      body,
    }: {
      appraisalId: string;
      appendixId: string;
      body: AddAppendixDocumentRequest;
    }) => {
      const { data } = await axios.post(
        `/appraisals/${appraisalId}/appendices/${appendixId}/documents`,
        body,
      );
      return data;
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: documentChecklistKeys.appendices(variables.appraisalId),
      });
    },
  });
};

/**
 * Remove a document from an appendix
 * DELETE /appraisals/{appraisalId}/appendices/{appendixId}/documents/{documentId}
 */
export const useRemoveAppendixDocument = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      appraisalId,
      appendixId,
      documentId,
    }: {
      appraisalId: string;
      appendixId: string;
      documentId: string;
    }) => {
      const { data } = await axios.delete(
        `/appraisals/${appraisalId}/appendices/${appendixId}/documents/${documentId}`,
      );
      return data;
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: documentChecklistKeys.appendices(variables.appraisalId),
      });
    },
  });
};

/**
 * Update appendix layout columns
 * PUT /appraisals/{appraisalId}/appendices/{appendixId}/layout
 */
export const useUpdateAppendixLayout = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      appraisalId,
      appendixId,
      layoutColumns,
    }: {
      appraisalId: string;
      appendixId: string;
      layoutColumns: number;
    }) => {
      const { data } = await axios.put(
        `/appraisals/${appraisalId}/appendices/${appendixId}/layout`,
        { layoutColumns },
      );
      return data;
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: documentChecklistKeys.appendices(variables.appraisalId),
      });
    },
  });
};
