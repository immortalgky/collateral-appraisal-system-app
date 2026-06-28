import { useMutation, useQuery } from '@tanstack/react-query';
import axios from '@shared/api/axiosInstance';
import { queryClient } from '@/app/queryClient';
import type {
  CreateDocumentRequirementPayload,
  DocumentRequirementDto,
  UpdateDocumentRequirementPayload,
} from '../types';

export const documentRequirementKeys = {
  all: ['documentRequirements'] as const,
  list: (includeInactive: boolean) =>
    ['documentRequirements', { includeInactive }] as const,
};

interface GetDocumentRequirementsResponse {
  requirements: DocumentRequirementDto[];
}

export const useDocumentRequirements = (includeInactive = false) =>
  useQuery({
    queryKey: documentRequirementKeys.list(includeInactive),
    queryFn: async (): Promise<DocumentRequirementDto[]> => {
      const { data } = await axios.get<GetDocumentRequirementsResponse>(
        '/document-requirements',
        { params: { includeInactive } },
      );
      return data.requirements ?? [];
    },
  });

export const useCreateDocumentRequirement = () =>
  useMutation({
    mutationFn: async (payload: CreateDocumentRequirementPayload) => {
      await axios.post('/document-requirements', payload);
    },
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: documentRequirementKeys.all }),
  });

export const useUpdateDocumentRequirement = () =>
  useMutation({
    mutationFn: async ({ id, ...body }: UpdateDocumentRequirementPayload) => {
      await axios.put(`/document-requirements/${id}`, body);
    },
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: documentRequirementKeys.all }),
  });

export const useDeleteDocumentRequirement = () =>
  useMutation({
    mutationFn: async (id: string) => {
      await axios.delete(`/document-requirements/${id}`);
    },
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: documentRequirementKeys.all }),
  });

export interface SetScopeRequirementsPayload {
  propertyTypeCode: string | null;
  purposeCode: string | null;
  items: { documentTypeId: string; isRequired: boolean }[];
}

/** Reconcile all document requirements for one collateral-type/purpose scope. */
export const useSetScopeRequirements = () =>
  useMutation({
    mutationFn: async (payload: SetScopeRequirementsPayload) => {
      await axios.put('/document-requirements/scope', payload);
    },
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: documentRequirementKeys.all }),
  });
