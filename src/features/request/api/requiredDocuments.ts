import { useQuery } from '@tanstack/react-query';
import axios from '@shared/api/axiosInstance';
import type {
  DocumentChecklistResponse,
  GetRequiredDocumentsParams,
  GetRequiredDocumentsResponse,
  ParameterDocumentChecklistResponse,
} from '../types/document';

/**
 * Hook for fetching required documents based on purpose or collateral type.
 * Calls GET /document-checklist from the Parameter module.
 */
export const useGetRequiredDocuments = (params: GetRequiredDocumentsParams) => {
  return useQuery({
    queryKey: ['requiredDocuments', params],
    queryFn: async (): Promise<GetRequiredDocumentsResponse> => {
      const queryParams = new URLSearchParams();

      if (params.purpose) {
        queryParams.set('purposeCode', params.purpose);
      }
      if (params.collateralType) {
        queryParams.set('propertyTypeCodes', params.collateralType);
      }

      const { data } = await axios.get<ParameterDocumentChecklistResponse>(
        `/document-checklist?${queryParams.toString()}`,
      );

      // Map response to RequiredDocumentConfig[] based on what was requested
      if (params.collateralType && data.propertyTypeGroups.length > 0) {
        return {
          documents: data.propertyTypeGroups[0].documents.map(d => ({
            documentType: d.code,
            displayName: d.name,
            isRequired: d.isRequired,
          })),
        };
      }

      if (params.purpose) {
        return {
          documents: data.applicationDocuments.map(d => ({
            documentType: d.code,
            displayName: d.name,
            isRequired: d.isRequired,
          })),
        };
      }

      return { documents: [] };
    },
    enabled: !!(params.purpose || params.collateralType),
  });
};

/**
 * Hook for fetching the document checklist for a specific request.
 * Returns which required documents are uploaded and whether the checklist is complete.
 */
export const useGetDocumentChecklist = (requestId: string | undefined) => {
  return useQuery<DocumentChecklistResponse>({
    queryKey: ['document-checklist', requestId],
    queryFn: async () => {
      const { data } = await axios.get<DocumentChecklistResponse>(
        `/requests/${requestId}/document-checklist`,
      );
      return data;
    },
    enabled: !!requestId,
  });
};
