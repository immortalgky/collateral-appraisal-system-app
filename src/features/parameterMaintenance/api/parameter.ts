import { useMutation } from '@tanstack/react-query';
import axios from '@shared/api/axiosInstance';
import { queryClient } from '@/app/queryClient';
import { PARAMETERS_QUERY_KEY } from '@/shared/api/parameters';

export const useUpdateParameter = () => {
  return useMutation({
    mutationFn: async (params: {
      parIdTh: number;
      parIdEn: number;
      code?: string;
      descriptionTh?: string;
      descriptionEn?: string;
      country?: string;
      seqNo?: number;
      isActive?: boolean;
    }): Promise<any> => {
      const { parIdTh, parIdEn, descriptionTh, descriptionEn, ...body } = params;

      await Promise.all([
        axios.put(`/parameter/${parIdTh}`, {
          ...body,
          language: 'TH',
          description: descriptionTh,
        }),
        axios.put(`/parameter/${parIdEn}`, {
          ...body,
          language: 'EN',
          description: descriptionEn,
        }),
      ]);
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
      code: string;
      descriptionTh: string;
      descriptionEn: string;
      country: string;
      seqNo: number;
      isActive: boolean;
    }): Promise<any> => {
      const { descriptionTh, descriptionEn, ...body } = params;

      await Promise.all([
        axios.post(`/parameter`, { ...body, language: 'TH', description: descriptionTh }),
        axios.post(`/parameter`, { ...body, language: 'EN', description: descriptionEn }),
      ]);
    },
    onSuccess: async () => {
      queryClient.invalidateQueries({ queryKey: PARAMETERS_QUERY_KEY });
    },
  });
};

export const useDeleteParameter = () => {
  return useMutation({
    mutationFn: async (params: { parIdTh: number; parIdEn: number }) => {
      await Promise.all([
        axios.delete(`/parameter/${params.parIdTh}`),
        axios.delete(`/parameter/${params.parIdEn}`),
      ]);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: PARAMETERS_QUERY_KEY });
    },
  });
};
