import { useMutation, useQuery } from '@tanstack/react-query';
import { z } from 'zod';
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
export interface DownloadDocumentResult {
  blob: Blob;
  fileName: string | null;
}

export const useDownloadDocument = () => {
  return useMutation({
    mutationFn: async (documentId: string): Promise<DownloadDocumentResult> => {
      const response = await axios.get(`/documents/${documentId}/download`, {
        responseType: 'blob',
        params: { download: false },
      });

      // Extract filename from Content-Disposition header if available
      const disposition = response.headers?.['content-disposition'] as string | undefined;
      let fileName: string | null = null;
      if (disposition) {
        const match = disposition.match(/filename\*?=(?:UTF-8''|"?)([^";]+)/i);
        if (match) {
          fileName = decodeURIComponent(match[1].replace(/"/g, ''));
        }
      }

      return { blob: response.data, fileName };
    },
  });
};

// ─── v7: GET /requests/{requestId}/documents ─────────────────────────────────

const RequestDocumentItemSchema = z.object({
  id: z.string(),
  documentId: z.string().nullable().optional(),
  documentType: z.string().nullable().optional(),
  documentTypeName: z.string().nullable().optional(),
  fileName: z.string().nullable().optional(),
  filePath: z.string().nullable().optional(),
  notes: z.string().nullable().optional(),
  isRequired: z.boolean().optional(),
  uploadedBy: z.string().nullable().optional(),
  uploadedByName: z.string().nullable().optional(),
  uploadedAt: z.string().nullable().optional(),
});

export const RequestDocumentSectionSchema = z.object({
  titleId: z.string().nullable().optional(),
  titleIdentifier: z.string().nullable().optional(),
  collateralType: z.string().nullable().optional(),
  collateralTypeName: z.string().nullable().optional(),
  sectionLabel: z.string(),
  totalDocuments: z.number().int(),
  uploadedDocuments: z.number().int(),
  documents: z.array(RequestDocumentItemSchema),
});

export const RequestDocumentsResponseSchema = z.object({
  totalDocuments: z.number().int(),
  totalUploaded: z.number().int(),
  sections: z.array(RequestDocumentSectionSchema),
});

export type RequestDocumentItem = z.infer<typeof RequestDocumentItemSchema>;
export type RequestDocumentSection = z.infer<typeof RequestDocumentSectionSchema>;
export type RequestDocumentsResponse = z.infer<typeof RequestDocumentsResponseSchema>;

export const requestDocumentKeys = {
  all: ['request-documents'] as const,
  byRequest: (requestId: string) => [...requestDocumentKeys.all, requestId] as const,
};

/**
 * Fetch all document sections for a given request.
 * First section (titleId === null) = "Application Documents" (request-level).
 * Subsequent sections = per-title collateral documents.
 *
 * Used by the Share Documents step in the Send Quotation flow (v7).
 */
export const useGetRequestDocuments = (requestId: string | undefined) => {
  return useQuery({
    queryKey: requestDocumentKeys.byRequest(requestId ?? ''),
    queryFn: async (): Promise<RequestDocumentsResponse> => {
      const { data } = await axios.get(`/requests/${requestId}/documents`);
      return RequestDocumentsResponseSchema.parse(data);
    },
    enabled: !!requestId,
    staleTime: 30_000,
  });
};
