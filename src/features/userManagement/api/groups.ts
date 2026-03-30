import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import axios from '@shared/api/axiosInstance';
import type {
  Group,
  GroupListResult,
  GetGroupsParams,
  CreateGroupRequest,
  UpdateGroupRequest,
  UpdateGroupUsersRequest,
  UpdateGroupMonitoringRequest,
} from '../types';

const QUERY_KEY = 'groups';

export const useGetGroups = (params: GetGroupsParams = {}) => {
  return useQuery({
    queryKey: [QUERY_KEY, params],
    queryFn: async (): Promise<GroupListResult> => {
      const { data } = await axios.get<GroupListResult>('/auth/groups', {
        params: {
          search: params.search || undefined,
          scope: params.scope || undefined,
          pageNumber: params.pageNumber ?? 1,
          pageSize: params.pageSize ?? 20,
        },
      });
      return data;
    },
  });
};

export const useGetGroupById = (id: string | null) => {
  return useQuery({
    queryKey: [QUERY_KEY, id],
    queryFn: async (): Promise<Group> => {
      const { data } = await axios.get<Group>(`/auth/groups/${id}`);
      return data;
    },
    enabled: !!id,
  });
};

export const useCreateGroup = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (request: CreateGroupRequest) => {
      const { data } = await axios.post('/auth/groups', request);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
    },
  });
};

export const useUpdateGroup = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...body }: UpdateGroupRequest & { id: string }) => {
      const { data } = await axios.put(`/auth/groups/${id}`, body);
      return data;
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY, variables.id] });
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
    },
  });
};

export const useUpdateGroupUsers = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...body }: UpdateGroupUsersRequest & { id: string }) => {
      const { data } = await axios.put(`/auth/groups/${id}/users`, body);
      return data;
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY, variables.id] });
    },
  });
};

export const useUpdateGroupMonitoring = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...body }: UpdateGroupMonitoringRequest & { id: string }) => {
      const { data } = await axios.put(`/auth/groups/${id}/monitoring`, body);
      return data;
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY, variables.id] });
    },
  });
};

export const useDeleteGroup = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { data } = await axios.delete(`/auth/groups/${id}`);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
    },
  });
};
