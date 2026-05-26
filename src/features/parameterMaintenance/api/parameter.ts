import { useMutation } from '@tanstack/react-query';
import axios from '@shared/api/axiosInstance';
import { queryClient } from '@/app/queryClient';
import { PARAMETERS_QUERY_KEY } from '@/shared/api/parameters';

export const useUpdateParameter = () => {
  return useMutation({
    mutationFn: async (params: {
      parId: number;
      code?: string;
      description?: string;
      country?: string;
      language?: string;
      seqNo?: number;
      isActive?: boolean;
    }): Promise<any> => {
      const { parId, ...body } = params;
      const { data } = await axios.put(`/parameter/${parId}`, body);
      return data;
    },
    onSuccess: async () => {
      await queryClient.resetQueries({ queryKey: PARAMETERS_QUERY_KEY });
    },
  });
};

export const useCreateParameter = () => {
  return useMutation({
    mutationFn: async (params: {
      group: string;
      code?: string;
      description?: string;
      country?: string;
      language?: string;
      seqNo?: number;
      isActive?: boolean;
    }): Promise<any> => {
      const { data } = await axios.post(`/parameter`, params);
      return data;
    },
    onSuccess: async () => {
      queryClient.invalidateQueries({ queryKey: PARAMETERS_QUERY_KEY });
    },
  });
};

export const useDeleteParameter = () => {
  return useMutation({
    mutationFn: async (parId: number) => {
      const { data } = await axios.delete(`/parameter/${parId}`);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: PARAMETERS_QUERY_KEY });
    },
  });
};
