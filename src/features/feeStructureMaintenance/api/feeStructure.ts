import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import axios from '@shared/api/axiosInstance';
import type {
  FeeStructureCreateRequest,
  FeeStructureDto,
  FeeStructureUpdateRequest,
} from '../types';

// ----- Query key factory -----

export const feeStructureKeys = {
  all: ['fee-structures'] as const,
};

// ----- Queries -----

export function useGetFeeStructures() {
  return useQuery({
    queryKey: feeStructureKeys.all,
    queryFn: async (): Promise<FeeStructureDto[]> => {
      const { data } = await axios.get<FeeStructureDto[]>('/api/fee-structures');
      return data;
    },
    staleTime: 60 * 1000,
  });
}

// ----- Mutations -----

export function useCreateFeeStructure() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: FeeStructureCreateRequest) =>
      axios.post('/api/fee-structures', body).then(r => r.data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: feeStructureKeys.all }),
  });
}

export function useUpdateFeeStructure() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...body }: FeeStructureUpdateRequest & { id: string }) =>
      axios.put(`/api/fee-structures/${id}`, body).then(r => r.data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: feeStructureKeys.all }),
  });
}

export function useDeleteFeeStructure() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => axios.delete(`/api/fee-structures/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: feeStructureKeys.all }),
  });
}
