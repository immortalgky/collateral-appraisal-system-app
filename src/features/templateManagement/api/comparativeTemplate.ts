import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import axios from '@shared/api/axiosInstance';
import type {
  TemplateDtoType,
  GetTemplateByIdResponseType,
  CreateTemplateRequestType,
  UpdateTemplateRequestType,
  AddFactorToTemplateRequest2Type,
} from '@/shared/schemas/v1';
import { templateMgmtKeys } from './queryKeys';

export const useGetCompTemplates = () => {
  return useQuery({
    queryKey: templateMgmtKeys.compTemplates,
    queryFn: async (): Promise<TemplateDtoType[]> => {
      const { data } = await axios.get('/comparative-analysis-templates');
      return data.templates ?? [];
    },
  });
};

export const useGetCompTemplateById = (id?: string) => {
  return useQuery({
    queryKey: templateMgmtKeys.compTemplateDetail(id!),
    enabled: !!id,
    queryFn: async (): Promise<GetTemplateByIdResponseType> => {
      const { data } = await axios.get(`/comparative-analysis-templates/${id}`);
      return data;
    },
  });
};

export const useCreateCompTemplate = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (request: CreateTemplateRequestType) => {
      const { data } = await axios.post('/comparative-analysis-templates', request);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: templateMgmtKeys.compTemplates });
    },
  });
};

export const useUpdateCompTemplate = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...body }: UpdateTemplateRequestType & { id: string }) => {
      const { data } = await axios.put(`/comparative-analysis-templates/${id}`, body);
      return data;
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: templateMgmtKeys.compTemplates });
      queryClient.invalidateQueries({ queryKey: templateMgmtKeys.compTemplateDetail(variables.id) });
    },
  });
};

export const useDeleteCompTemplate = () => {
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

export const useAddFactorToCompTemplate = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ templateId, ...body }: AddFactorToTemplateRequest2Type & { templateId: string }) => {
      const { data } = await axios.post(`/comparative-analysis-templates/${templateId}/factors`, body);
      return data;
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: templateMgmtKeys.compTemplateDetail(variables.templateId) });
    },
  });
};

export const useRemoveFactorFromCompTemplate = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ templateId, factorId }: { templateId: string; factorId: string }) => {
      await axios.delete(`/comparative-analysis-templates/${templateId}/factors/${factorId}`);
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: templateMgmtKeys.compTemplateDetail(variables.templateId) });
    },
  });
};
