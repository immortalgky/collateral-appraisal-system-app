import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
// import axios from '@shared/api/axiosInstance'; // TODO: Uncomment when API is ready
import type {
  GetRequestDocumentsParams,
  GetRequestDocumentsResponse,
  GetAppendixDocumentsParams,
  GetAppendixDocumentsResponse,
  CreateAppendixUploadSessionResponse,
  UploadAppendixDocumentRequest,
  UploadAppendixDocumentResponse,
  UpdateAppendixDocumentRequest,
  UpdateAppendixDocumentResponse,
  DeleteAppendixDocumentResponse,
  UpdateAppendixLayoutRequest,
  UpdateAppendixLayoutResponse,
  AppendixSection,
  AppendixDocumentType,
  EntityType,
  RequestDocument,
} from '../types/documentChecklist';
import {
  APPENDIX_DOCUMENT_TYPES,
  APPENDIX_DOCUMENT_TYPE_LABELS,
} from '../types/documentChecklist';

// ==================== Request Documents APIs (Read-only) ====================

/**
 * Hook for fetching request documents (from request creation)
 * GET /requests/{requestId}/documents
 */
export const useGetRequestDocuments = (params: GetRequestDocumentsParams) => {
  return useQuery({
    queryKey: ['request-documents', params.requestId],
    queryFn: async (): Promise<GetRequestDocumentsResponse> => {
      // TODO: Replace with actual API call
      // const { data } = await axios.get(`/requests/${params.requestId}/documents`);
      // return data;

      // Mock data for development
      await new Promise(resolve => setTimeout(resolve, 300));

      const mockDocuments: RequestDocument[] = [
        {
          id: 'doc-1',
          requestId: params.requestId,
          entityType: 'title_chonot' as EntityType,
          entityKey: 'xxxx',
          documentType: 'Title Deed',
          fileName: 'Title deed document.pdf',
          filePath: '/uploads/title-deed.pdf',
          fileSize: 1572864,
          mimeType: 'application/pdf',
          prefix: 'Title',
          set: 1,
          comment: 'Bacon ipsum dolor amet...',
          uploadedAt: '2024-01-06T10:00:00Z',
          uploadedBy: 'user-001',
          uploadedByName: 'John Doe',
        },
        {
          id: 'doc-2',
          requestId: params.requestId,
          entityType: 'title_regis' as EntityType,
          entityKey: 'xxxx',
          documentType: 'Registration document',
          fileName: null,
          filePath: null,
          fileSize: null,
          mimeType: null,
          prefix: null,
          set: 1,
          comment: null,
          uploadedAt: null,
          uploadedBy: null,
          uploadedByName: null,
        },
        {
          id: 'doc-3',
          requestId: params.requestId,
          entityType: 'title_regis' as EntityType,
          entityKey: 'xxxx',
          documentType: 'Invoice',
          fileName: null,
          filePath: null,
          fileSize: null,
          mimeType: null,
          prefix: null,
          set: 1,
          comment: null,
          uploadedAt: null,
          uploadedBy: null,
          uploadedByName: null,
        },
        {
          id: 'doc-4',
          requestId: params.requestId,
          entityType: 'request' as EntityType,
          entityKey: 'xxxxxxx',
          documentType: 'Building plan',
          fileName: 'Building plan.png',
          filePath: '/uploads/building-plan.png',
          fileSize: 4194304,
          mimeType: 'image/png',
          prefix: null,
          set: 1,
          comment: 'Bacon ipsum dolor amet...',
          uploadedAt: '2024-01-06T10:00:00Z',
          uploadedBy: 'user-001',
          uploadedByName: 'John Doe',
        },
      ];

      // Group documents by entity
      const titleChonotDocs = mockDocuments.filter(d => d.entityType === 'title_chonot');
      const titleRegisDocs = mockDocuments.filter(d => d.entityType === 'title_regis');
      const requestDocs = mockDocuments.filter(d => d.entityType === 'request');

      const groups = [
        titleChonotDocs.length > 0 && {
          entityType: 'title_chonot' as EntityType,
          entityKey: 'xxxx',
          displayKey: 'ฉ.xxxx',
          documents: titleChonotDocs,
        },
        titleRegisDocs.length > 0 && {
          entityType: 'title_regis' as EntityType,
          entityKey: 'xxxx',
          displayKey: 'Regis no xxxx',
          documents: titleRegisDocs,
        },
        requestDocs.length > 0 && {
          entityType: 'request' as EntityType,
          entityKey: 'xxxxxxx',
          displayKey: '67xxxxxxx',
          documents: requestDocs,
        },
      ].filter(Boolean) as GetRequestDocumentsResponse['groups'];

      return {
        documents: mockDocuments,
        groups,
      };
    },
    enabled: !!params.requestId,
  });
};

// ==================== Appendix Documents APIs (Editable) ====================

/**
 * Hook for fetching appendix documents
 * GET /appraisals/{appraisalId}/appendix-documents
 */
export const useGetAppendixDocuments = (params: GetAppendixDocumentsParams) => {
  return useQuery({
    queryKey: ['appendix-documents', params.appraisalId, params.documentType],
    queryFn: async (): Promise<GetAppendixDocumentsResponse> => {
      // TODO: Replace with actual API call
      // const { data } = await axios.get(`/appraisals/${params.appraisalId}/appendix-documents`, { params });
      // return data;

      // Mock data for development
      await new Promise(resolve => setTimeout(resolve, 300));

      const mockDocuments = [
        {
          id: 'appendix-1',
          appraisalId: params.appraisalId,
          documentType: 'BRIEF_MAP' as AppendixDocumentType,
          fileName: '00001 - Brief Map.png',
          originalFileName: 'Brief Map.png',
          filePath: '/uploads/brief-map.png',
          fileSize: 4194304,
          mimeType: 'image/png',
          prefix: '00001',
          set: 1,
          comment: 'Description Photo',
          layout: 1 as const,
          uploadedAt: '2024-01-06T10:00:00Z',
          uploadedBy: 'user-001',
          uploadedByName: 'John Doe',
        },
        {
          id: 'appendix-2',
          appraisalId: params.appraisalId,
          documentType: 'DETAILED_MAP' as AppendixDocumentType,
          fileName: '00002 - Detailed Map.png',
          originalFileName: 'Detailed Map.png',
          filePath: '/uploads/detailed-map.png',
          fileSize: 4194304,
          mimeType: 'image/png',
          prefix: '00002',
          set: 1,
          comment: 'Description Photo',
          layout: 1 as const,
          uploadedAt: '2024-01-06T10:00:00Z',
          uploadedBy: 'user-001',
          uploadedByName: 'John Doe',
        },
        {
          id: 'appendix-3',
          appraisalId: params.appraisalId,
          documentType: 'DETAILED_MAP' as AppendixDocumentType,
          fileName: null as unknown as string,
          originalFileName: '',
          filePath: '',
          fileSize: 0,
          mimeType: '',
          prefix: '00002',
          set: 2,
          comment: null,
          layout: 1 as const,
          uploadedAt: '2024-01-06T10:00:00Z',
          uploadedBy: 'user-001',
          uploadedByName: 'John Doe',
        },
        {
          id: 'appendix-4',
          appraisalId: params.appraisalId,
          documentType: 'LAND_MAP' as AppendixDocumentType,
          fileName: '00004 - Land Map.png',
          originalFileName: 'Land Map.png',
          filePath: '/uploads/land-map.png',
          fileSize: 4194304,
          mimeType: 'image/png',
          prefix: '00004',
          set: 1,
          comment: 'Description Photo',
          layout: 1 as const,
          uploadedAt: '2024-01-06T10:00:00Z',
          uploadedBy: 'user-001',
          uploadedByName: 'John Doe',
        },
        {
          id: 'appendix-5',
          appraisalId: params.appraisalId,
          documentType: 'CITY_PLAN' as AppendixDocumentType,
          fileName: '00005 - City Plan.png',
          originalFileName: 'City Plan.png',
          filePath: '/uploads/city-plan.png',
          fileSize: 4194304,
          mimeType: 'image/png',
          prefix: '00005',
          set: 1,
          comment: 'Description Photo',
          layout: 1 as const,
          uploadedAt: '2024-01-06T10:00:00Z',
          uploadedBy: 'user-001',
          uploadedByName: 'John Doe',
        },
        {
          id: 'appendix-6',
          appraisalId: params.appraisalId,
          documentType: 'SUPPORTING_DOCUMENT' as AppendixDocumentType,
          fileName: 'Map.png',
          originalFileName: 'Map.png',
          filePath: '/uploads/map.png',
          fileSize: 4194304,
          mimeType: 'image/png',
          prefix: null,
          set: 1,
          comment: 'Description Photo',
          layout: 1 as const,
          uploadedAt: '2024-01-06T10:00:00Z',
          uploadedBy: 'user-001',
          uploadedByName: 'John Doe',
        },
      ];

      // Build sections from all document types
      const sections: AppendixSection[] = APPENDIX_DOCUMENT_TYPES.map(type => ({
        documentType: type,
        label: APPENDIX_DOCUMENT_TYPE_LABELS[type],
        layout: 1 as const,
        documents: mockDocuments.filter(d => d.documentType === type),
        isExpanded: mockDocuments.some(d => d.documentType === type),
      }));

      return {
        documents: mockDocuments,
        sections,
      };
    },
    enabled: !!params.appraisalId,
  });
};

/**
 * Hook for creating an appendix upload session
 * POST /appraisals/{appraisalId}/appendix-upload-session
 */
export const useCreateAppendixUploadSession = () => {
  return useMutation({
    mutationFn: async (_appraisalId: string): Promise<CreateAppendixUploadSessionResponse> => {
      // TODO: Replace with actual API call
      // const { data } = await axios.post(`/appraisals/${appraisalId}/appendix-upload-session`);
      // return data;

      await new Promise(resolve => setTimeout(resolve, 100));
      return {
        sessionId: `session-${Date.now()}`,
        expiresAt: new Date(Date.now() + 3600000).toISOString(),
      };
    },
  });
};

/**
 * Hook for uploading an appendix document
 * POST /appendix-upload
 */
export const useUploadAppendixDocument = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (request: UploadAppendixDocumentRequest): Promise<UploadAppendixDocumentResponse> => {
      // TODO: Replace with actual API call
      // const formData = new FormData();
      // formData.append('file', request.file);
      // formData.append('sessionId', request.sessionId);
      // formData.append('documentType', request.documentType);
      // if (request.prefix) formData.append('prefix', request.prefix);
      // if (request.set) formData.append('set', String(request.set));
      // if (request.comment) formData.append('comment', request.comment);
      // if (request.layout) formData.append('layout', String(request.layout));
      // const { data } = await axios.post('/appendix-upload', formData, {
      //   headers: { 'Content-Type': 'multipart/form-data' },
      // });
      // return data;

      await new Promise(resolve => setTimeout(resolve, 500));
      const reader = new FileReader();
      const dataUrl = await new Promise<string>((resolve, reject) => {
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(request.file);
      });

      return {
        isSuccess: true,
        document: {
          id: `appendix-${Date.now()}`,
          appraisalId: '',
          documentType: request.documentType,
          fileName: `${request.prefix || Date.now()} - ${request.file.name}`,
          originalFileName: request.file.name,
          filePath: dataUrl,
          fileSize: request.file.size,
          mimeType: request.file.type,
          prefix: request.prefix || null,
          set: request.set || 1,
          comment: request.comment || null,
          layout: request.layout || 1,
          uploadedAt: new Date().toISOString(),
          uploadedBy: 'current-user',
          uploadedByName: 'Current User',
        },
      };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['appendix-documents'] });
    },
  });
};

/**
 * Hook for updating an appendix document
 * PUT /appendix-documents/{documentId}
 */
export const useUpdateAppendixDocument = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (request: UpdateAppendixDocumentRequest): Promise<UpdateAppendixDocumentResponse> => {
      // TODO: Replace with actual API call
      // const { data } = await axios.put(`/appendix-documents/${request.documentId}`, request);
      // return data;

      await new Promise(resolve => setTimeout(resolve, 200));
      return {
        isSuccess: true,
        document: {
          id: request.documentId,
          appraisalId: '',
          documentType: 'SUPPORTING_DOCUMENT',
          fileName: '',
          originalFileName: '',
          filePath: '',
          fileSize: 0,
          mimeType: '',
          prefix: request.prefix || null,
          set: request.set || 1,
          comment: request.comment || null,
          layout: request.layout || 1,
          uploadedAt: new Date().toISOString(),
          uploadedBy: 'current-user',
          uploadedByName: 'Current User',
        },
      };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['appendix-documents'] });
    },
  });
};

/**
 * Hook for deleting an appendix document
 * DELETE /appendix-documents/{documentId}
 */
export const useDeleteAppendixDocument = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (_documentId: string): Promise<DeleteAppendixDocumentResponse> => {
      // TODO: Replace with actual API call
      // const { data } = await axios.delete(`/appendix-documents/${documentId}`);
      // return data;

      await new Promise(resolve => setTimeout(resolve, 200));
      return { isSuccess: true };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['appendix-documents'] });
    },
  });
};

/**
 * Hook for updating layout for a document type
 * PUT /appraisals/{appraisalId}/appendix-layout
 */
export const useUpdateAppendixLayout = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (_request: UpdateAppendixLayoutRequest): Promise<UpdateAppendixLayoutResponse> => {
      // TODO: Replace with actual API call
      // const { data } = await axios.put(`/appraisals/${request.appraisalId}/appendix-layout`, request);
      // return data;

      await new Promise(resolve => setTimeout(resolve, 200));
      return { isSuccess: true };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['appendix-documents'] });
    },
  });
};
