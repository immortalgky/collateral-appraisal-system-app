import { useMutation } from '@tanstack/react-query';
import axios from '@shared/api/axiosInstance';
import type {
  CreateUploadSessionResponse,
  UploadDocumentParams,
  UploadDocumentResult,
} from '../types/document';

export interface UploadDocumentResponse {
  documentId: string;
  fileName: string;
  filePath: string;
  uploadDate: string;
}

/**
 * Create an upload session for document uploads
 * This session ID is used for all subsequent document uploads until page refresh
 */
export const createUploadSession = async (): Promise<CreateUploadSessionResponse> => {
  const { data } = await axios.post<CreateUploadSessionResponse>('/documents/session');
  return data;
};

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
    mutationFn: async (documentId: string): Promise<Blob> => {
      const { data } = await axios.get(`/documents/${documentId}/download`, {
        responseType: 'blob',
        params: { download: false },
      });
      return data;
    },
  });
};
