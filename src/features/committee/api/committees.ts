import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import axios from '@shared/api/axiosInstance';
import type {
  AddCommitteeMemberRequest,
  CommitteeDetailDto,
  CommitteeListItemDto,
  GetCommitteesResponse,
  UpdateCommitteeMemberRequest,
} from './types';

export const committeeKeys = {
  all: ['committees'] as const,
  list: () => ['committees', 'list'] as const,
  detail: (id: string) => ['committees', id] as const,
};

export const useGetCommittees = () => {
  return useQuery({
    queryKey: committeeKeys.list(),
    queryFn: async (): Promise<CommitteeListItemDto[]> => {
      const { data } = await axios.get<GetCommitteesResponse>('/workflows/committees');
      return data.committees;
    },
  });
};

export const useGetCommitteeDetail = (id: string | undefined) => {
  return useQuery({
    queryKey: committeeKeys.detail(id ?? ''),
    queryFn: async (): Promise<CommitteeDetailDto> => {
      const { data } = await axios.get(`/workflows/committees/${id}`);
      return data;
    },
    enabled: !!id,
  });
};

export const useAddCommitteeMember = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      committeeId,
      body,
    }: {
      committeeId: string;
      body: AddCommitteeMemberRequest;
    }) => {
      await axios.post(`/workflows/committees/${committeeId}/members`, body);
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: committeeKeys.detail(variables.committeeId) });
    },
  });
};

export const useUpdateCommitteeMember = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      committeeId,
      memberId,
      body,
    }: {
      committeeId: string;
      memberId: string;
      body: UpdateCommitteeMemberRequest;
    }) => {
      await axios.patch(`/workflows/committees/${committeeId}/members/${memberId}`, body);
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: committeeKeys.detail(variables.committeeId) });
    },
  });
};

export const useRemoveCommitteeMember = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      committeeId,
      memberId,
    }: {
      committeeId: string;
      memberId: string;
    }) => {
      await axios.delete(`/workflows/committees/${committeeId}/members/${memberId}`);
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: committeeKeys.detail(variables.committeeId) });
    },
  });
};
