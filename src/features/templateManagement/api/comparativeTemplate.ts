import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import axios from '@shared/api/axiosInstance';
import type {
  AddFactorToTemplateRequest2Type,
  CreateComparativeAnalysisTemplateRequestType,
  CreateComparativeAnalysisTemplateResponseType,
  GetComparativeAnalysisTemplateByIdResponseType,
  TemplateDtoType,
  UpdateComparativeAnalysisTemplateRequestType,
} from '@/shared/schemas/v1';
import { templateMgmtKeys } from './queryKeys';

export const useGetComparativeAnalysisTemplates = () => {
  return useQuery({
    queryKey: templateMgmtKeys.compTemplates,
    queryFn: async (): Promise<TemplateDtoType[]> => {
      const { data } = await axios.get('/comparative-analysis-templates');
      return data.templates ?? [];
    },
  });
};

export const useGetComparativeAnalysisTemplateById = (id?: string) => {
  return useQuery({
    queryKey: templateMgmtKeys.compTemplateDetail(id!),
    enabled: !!id,
    queryFn: async (): Promise<GetComparativeAnalysisTemplateByIdResponseType> => {
      const { data } = await axios.get(`/comparative-analysis-templates/${id}`);
      return data;
    },
  });
};

export const useCreateComparativeAnalysisTemplate = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (
      request: CreateComparativeAnalysisTemplateRequestType,
    ): Promise<CreateComparativeAnalysisTemplateResponseType> => {
      const { data } = await axios.post('/comparative-analysis-templates', request);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: templateMgmtKeys.compTemplates });
    },
  });
};

export const useUpdateComparativeAnalysisTemplate = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      ...body
    }: UpdateComparativeAnalysisTemplateRequestType & { id: string }) => {
      const { data } = await axios.put(`/comparative-analysis-templates/${id}`, body);
      return data;
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: templateMgmtKeys.compTemplates });
      queryClient.invalidateQueries({
        queryKey: templateMgmtKeys.compTemplateDetail(variables.id),
      });
    },
  });
};

export const useDeleteComparativeAnalysisTemplate = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      await axios.delete(`/comparative-analysis-templates/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: templateMgmtKeys.compTemplates });
    },
  });
};

export const useAddFactorToComparativeAnalysisTemplate = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      templateId,
      ...body
    }: AddFactorToTemplateRequest2Type & { templateId: string }) => {
      const { data } = await axios.post(
        `/comparative-analysis-templates/${templateId}/factors`,
        body,
      );
      return data;
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: templateMgmtKeys.compTemplateDetail(variables.templateId),
      });
    },
  });
};

export const useRemoveFactorFromComparativeAnalysisTemplate = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ templateId, factorId }: { templateId: string; factorId: string }) => {
      await axios.delete(`/comparative-analysis-templates/${templateId}/factors/${factorId}`);
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: templateMgmtKeys.compTemplateDetail(variables.templateId),
      });
    },
  });
};
