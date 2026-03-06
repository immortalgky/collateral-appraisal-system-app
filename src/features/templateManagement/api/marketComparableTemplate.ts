import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import axios from '@shared/api/axiosInstance';
import type {
  MarketComparableTemplateDtoType,
  MarketComparableTemplateDetailDtoType,
  CreateMarketComparableTemplateRequestType,
  UpdateMarketComparableTemplateRequestType,
  AddFactorToTemplateRequestType,
} from '@/shared/schemas/v1';
import { templateMgmtKeys } from './queryKeys';

export const useGetMCTemplates = (propertyType?: string) => {
  return useQuery({
    queryKey: [...templateMgmtKeys.mcTemplates, propertyType],
    queryFn: async (): Promise<MarketComparableTemplateDtoType[]> => {
      const { data } = await axios.get('/market-comparable-templates', {
        params: {
          ...(propertyType ? { PropertyType: propertyType } : {}),
        },
      });
      return data.templates ?? [];
    },
  });
};

export const useGetMCTemplateById = (id?: string) => {
  return useQuery({
    queryKey: templateMgmtKeys.mcTemplateDetail(id!),
    enabled: !!id,
    queryFn: async (): Promise<MarketComparableTemplateDetailDtoType> => {
      const { data } = await axios.get(`/market-comparable-templates/${id}`);
      return data.template ?? data;
    },
  });
};

export const useCreateMCTemplate = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (request: CreateMarketComparableTemplateRequestType) => {
      const { data } = await axios.post('/market-comparable-templates', request);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: templateMgmtKeys.mcTemplates });
    },
  });
};

export const useUpdateMCTemplate = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...body }: UpdateMarketComparableTemplateRequestType & { id: string }) => {
      const { data } = await axios.put(`/market-comparable-templates/${id}`, body);
      return data;
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: templateMgmtKeys.mcTemplates });
      queryClient.invalidateQueries({ queryKey: templateMgmtKeys.mcTemplateDetail(variables.id) });
    },
  });
};

export const useDeleteMCTemplate = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      await axios.delete(`/market-comparable-templates/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: templateMgmtKeys.mcTemplates });
    },
  });
};

export const useAddFactorToMCTemplate = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ templateId, ...body }: AddFactorToTemplateRequestType & { templateId: string }) => {
      const { data } = await axios.post(`/market-comparable-templates/${templateId}/factors`, body);
      return data;
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: templateMgmtKeys.mcTemplateDetail(variables.templateId) });
    },
  });
};

export const useRemoveFactorFromMCTemplate = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ templateId, factorId }: { templateId: string; factorId: string }) => {
      await axios.delete(`/market-comparable-templates/${templateId}/factors/${factorId}`);
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: templateMgmtKeys.mcTemplateDetail(variables.templateId) });
    },
  });
};
