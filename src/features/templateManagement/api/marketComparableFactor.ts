import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import axios from '@shared/api/axiosInstance';
import type {
  MarketComparableFactorDtoType,
  CreateMarketComparableFactorRequestType,
  UpdateMarketComparableFactorRequestType,
} from '@/shared/schemas/v1';
import { templateMgmtKeys } from './queryKeys';

export const useGetFactors = (activeOnly: boolean = true) => {
  return useQuery({
    queryKey: [...templateMgmtKeys.factors, activeOnly],
    queryFn: async (): Promise<MarketComparableFactorDtoType[]> => {
      const { data } = await axios.get('/market-comparable-factors', {
        params: { activeOnly },
      });
      return data.factors ?? [];
    },
  });
};

export const useCreateFactor = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (request: CreateMarketComparableFactorRequestType) => {
      const { data } = await axios.post('/market-comparable-factors', request);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: templateMgmtKeys.factors });
    },
  });
};

export const useUpdateFactor = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      ...body
    }: UpdateMarketComparableFactorRequestType & { id: string }) => {
      const { data } = await axios.put(`/market-comparable-factors/${id}`, body);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: templateMgmtKeys.factors });
    },
  });
};

export const useDeleteFactor = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      await axios.delete(`/market-comparable-factors/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: templateMgmtKeys.factors });
    },
  });
};

export const useToggleFactorStatus = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, isActive }: { id: string; isActive: boolean }) => {
      await axios.post(`/market-comparable-factors/${id}/${isActive ? 'activate' : 'deactivate'}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: templateMgmtKeys.factors });
    },
  });
};
