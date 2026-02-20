import { useQuery } from '@tanstack/react-query';
import axios from '@shared/api/axiosInstance';
import { useParameterStore } from '@/shared/store';

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
