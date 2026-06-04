import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import axios from '@shared/api/axiosInstance';
import type {
  TeamDetail,
  TeamListResult,
  GetTeamsParams,
  CreateTeamRequest,
  UpdateTeamRequest,
  UpdateTeamMembersRequest,
} from '../types';

const QUERY_KEY = 'teams';

export const useGetTeams = (params: GetTeamsParams = {}) => {
  return useQuery({
    queryKey: [QUERY_KEY, params],
    queryFn: async (): Promise<TeamListResult> => {
      const { data } = await axios.get<TeamListResult>('/auth/teams', {
        params: {
          search: params.search || undefined,
          pageNumber: params.pageNumber ?? 1,
          pageSize: params.pageSize ?? 20,
        },
      });
      return data;
    },
  });
};

export const useGetTeamById = (id: string | null) => {
  return useQuery({
    queryKey: [QUERY_KEY, id],
    queryFn: async (): Promise<TeamDetail> => {
      const { data } = await axios.get<TeamDetail>(`/auth/teams/${id}`);
      return data;
    },
    enabled: !!id,
  });
};

export const useCreateTeam = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (request: CreateTeamRequest) => {
      const { data } = await axios.post('/auth/teams', request);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
    },
  });
};

export const useUpdateTeam = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...body }: UpdateTeamRequest & { id: string }) => {
      const { data } = await axios.put(`/auth/teams/${id}`, body);
      return data;
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY, variables.id] });
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
    },
  });
};

export const useUpdateTeamMembers = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...body }: UpdateTeamMembersRequest & { id: string }) => {
      const { data } = await axios.put(`/auth/teams/${id}/members`, body);
      return data;
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY, variables.id] });
    },
  });
};

export const useDeleteTeam = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { data } = await axios.delete(`/auth/teams/${id}`);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
    },
  });
};
