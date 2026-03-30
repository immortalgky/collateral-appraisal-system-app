import { useQuery } from '@tanstack/react-query';
import axios from '@shared/api/axiosInstance';
import type { DocumentTypeDtoType } from '@shared/schemas/v1';

interface GetDocumentTypesResponse {
  documentTypes: DocumentTypeDtoType[];
}

export const documentTypeKeys = {
  all: ['documentTypes'] as const,
};

/**
 * Fetches document types from GET /document-types.
 * Returns active types sorted by sortOrder.
 */
export const useGetDocumentTypes = () => {
  return useQuery({
    queryKey: documentTypeKeys.all,
    queryFn: async (): Promise<DocumentTypeDtoType[]> => {
      const { data } = await axios.get<GetDocumentTypesResponse>('/document-types');
      return (data.documentTypes ?? [])
        .filter(dt => dt.isActive !== false)
        .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));
    },
    staleTime: Infinity,
    gcTime: Infinity,
  });
};

/**
 * Lookup a document type name by code from a list of document types.
 */
export const getDocumentTypeName = (
  documentTypes: DocumentTypeDtoType[],
  code: string,
): string => {
  const found = documentTypes.find(dt => dt.code === code);
  return found?.name ?? code;
};
