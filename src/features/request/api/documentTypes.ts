import i18n from 'i18next';
import { useQuery } from '@tanstack/react-query';
import axios from '@shared/api/axiosInstance';
import type { DocumentTypeDtoType } from '@shared/schemas/v1';

/** The Thai name comes with the type (GET /document-types); the generated schema does not list it. */
export type DocumentType = DocumentTypeDtoType & { nameTh?: string | null };

interface GetDocumentTypesResponse {
  documentTypes: DocumentType[];
}

export const documentTypeKeys = {
  all: ['documentTypes'] as const,
  list: (category?: string) => ['documentTypes', category ?? 'all'] as const,
};

/**
 * Fetches document types from GET /document-types.
 * Returns active types sorted by sortOrder.
 * Pass a category (e.g. 'SUBMIT_DOC') to scope the list server-side.
 */
export const useGetDocumentTypes = (category?: string) => {
  return useQuery({
    queryKey: documentTypeKeys.list(category),
    queryFn: async (): Promise<DocumentType[]> => {
      const { data } = await axios.get<GetDocumentTypesResponse>('/document-types', {
        params: category ? { category } : undefined,
      });
      return (data.documentTypes ?? [])
        .filter(dt => dt.isActive !== false)
        .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));
    },
    staleTime: Infinity,
    gcTime: Infinity,
  });
};

/**
 * The name of a document type in the language of the UI: the Thai name when the UI is Thai and the
 * type has one, else the English name, else the code. The one place a request-side document type
 * name is picked, so no screen shows English in Thai or the reverse.
 */
/** What a name needs of a document type: both lists (request and appraisal) have these. */
export type DocumentTypeNames = {
  code?: string | null;
  name?: string | null;
  nameTh?: string | null;
};

export const documentTypeLabel = (
  type: DocumentTypeNames,
  language: string = i18n.language ?? '',
) => (language.startsWith('th') ? type.nameTh || type.name : type.name) || type.code || '';

/**
 * Lookup a document type name by code from a list of document types, in the UI language
 * (the code itself when the type is not in the list).
 */
export const getDocumentTypeName = (
  documentTypes: DocumentType[],
  code: string,
  language?: string,
): string => {
  const found = documentTypes.find(dt => dt.code === code);
  return found ? documentTypeLabel(found, language) : code;
};

/** Both names of a type, for a search that should find it by either. */
export const getDocumentTypeSearchText = (documentTypes: DocumentType[], code: string): string => {
  const found = documentTypes.find(dt => dt.code === code);
  return [found?.name, found?.nameTh].filter(Boolean).join(' ');
};
