import { useMutation, useQuery } from '@tanstack/react-query';
import axios from '@shared/api/axiosInstance';
import { queryClient } from '@/app/queryClient';
import { documentTypeKeys } from '@/features/request/api/documentTypes';
import type {
  CreateDocumentTypePayload,
  DocumentTypeDto,
  UpdateDocumentTypePayload,
} from '../types';

export const documentTypeAdminKeys = {
  all: ['documentTypesAdmin'] as const,
  list: (includeInactive: boolean) =>
    ['documentTypesAdmin', { includeInactive }] as const,
};

interface GetDocumentTypesResponse {
  documentTypes: DocumentTypeDto[];
}

/** Admin list — includes inactive when requested (the request-side hook only returns active). */
export const useDocumentTypesAdmin = (includeInactive = false) =>
  useQuery({
    queryKey: documentTypeAdminKeys.list(includeInactive),
    queryFn: async (): Promise<DocumentTypeDto[]> => {
      const { data } = await axios.get<GetDocumentTypesResponse>('/document-types', {
        params: { includeInactive },
      });
      return (data.documentTypes ?? []).sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));
    },
  });

const invalidateDocumentTypes = () => {
  queryClient.invalidateQueries({ queryKey: documentTypeAdminKeys.all });
  // the request-side dropdown cache (active types) must refresh too
  queryClient.invalidateQueries({ queryKey: documentTypeKeys.all });
};

export const useCreateDocumentType = () =>
  useMutation({
    mutationFn: async (payload: CreateDocumentTypePayload) => {
      await axios.post('/document-types', payload);
    },
    onSuccess: invalidateDocumentTypes,
  });

export const useUpdateDocumentType = () =>
  useMutation({
    mutationFn: async ({ id, ...body }: UpdateDocumentTypePayload) => {
      await axios.put(`/document-types/${id}`, body);
    },
    onSuccess: invalidateDocumentTypes,
  });

export const useDeleteDocumentType = () =>
  useMutation({
    mutationFn: async (id: string) => {
      await axios.delete(`/document-types/${id}`);
    },
    onSuccess: invalidateDocumentTypes,
  });

export const useReorderDocumentTypes = () =>
  useMutation({
    mutationFn: async (items: { id: string; sortOrder: number }[]) => {
      await axios.put('/document-types/reorder', { items });
    },
    onSuccess: invalidateDocumentTypes,
  });
