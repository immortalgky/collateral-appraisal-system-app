import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import axios from '@shared/api/axiosInstance';
import type {
  AddCommitteeMemberRequest,
  CommitteeDetailDto,
  CommitteeListItemDto,
  GetCommitteesResponse,
  UpdateCommitteeMemberRequest,
  UpdateCommitteeRequest,
} from './types';

// Committee endpoints are mapped under /api/workflows/committees (see
// Modules/Workflow/.../Features/Committees/*Endpoint.cs). Note this differs from the
// module's other feature routes — document-followups and fee-appointment-approvals are
// mapped at /workflows/... with no /api segment — so do not "normalise" this prefix.
const BASE = '/api/workflows/committees';

export const committeeKeys = {
  all: ['committees'] as const,
  list: () => ['committees', 'list'] as const,
  detail: (id: string) => ['committees', id] as const,
};

export const useGetCommittees = () => {
  return useQuery({
    queryKey: committeeKeys.list(),
    queryFn: async (): Promise<CommitteeListItemDto[]> => {
      const { data } = await axios.get<GetCommitteesResponse>(BASE);
      return data.committees;
    },
  });
};

export const useGetCommitteeDetail = (id: string | undefined) => {
  return useQuery({
    queryKey: committeeKeys.detail(id ?? ''),
    queryFn: async (): Promise<CommitteeDetailDto> => {
      const { data } = await axios.get(`${BASE}/${id}`);
      return data;
    },
    enabled: !!id,
  });
};

export const useUpdateCommittee = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, body }: { id: string; body: UpdateCommitteeRequest }) => {
      await axios.put(`${BASE}/${id}`, body);
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: committeeKeys.detail(variables.id) });
      // Name / status / quorum also show in the left-hand list, so refresh it too.
      queryClient.invalidateQueries({ queryKey: committeeKeys.list() });
    },
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
      await axios.post(`${BASE}/${committeeId}/members`, body);
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
      await axios.patch(`${BASE}/${committeeId}/members/${memberId}`, body);
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
      await axios.delete(`${BASE}/${committeeId}/members/${memberId}`);
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: committeeKeys.detail(variables.committeeId) });
    },
  });
};
