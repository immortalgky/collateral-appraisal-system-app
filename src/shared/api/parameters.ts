import { useQuery } from '@tanstack/react-query';
import type { ParameterParams, ParametersResponse } from '../types/api';
import axios from './axiosInstance';
import { useParameterStore } from '../store';

export const useParameters = (params: ParameterParams | undefined) => {
  const { parameters } = useParameterStore();
  const storedParameters = parameters[`${params?.group}.${params?.country}.${params?.language}`];
  return useQuery({
    queryKey: ['parameters', params],
    queryFn: async (): Promise<ParametersResponse> => {
      const { data } = await axios.get('https://localhost:7111/parameter', {
        params,
      });
      return data;
    },
    enabled: !!params && storedParameters === undefined,
    initialData: storedParameters,
  });
};

export const useAllParameters = () => {
  return useQuery({
    queryKey: ['parameters'],
    queryFn: async (): Promise<ParametersResponse> => {
      const { data } = await axios.get('https://localhost:7111/parameter');
      return data;
    },
  });
};
