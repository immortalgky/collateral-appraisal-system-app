import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import axios from '@shared/api/axiosInstance';
import type {
  Role,
  RoleListResult,
  RoleUser,
  GetRolesParams,
  CreateRoleRequest,
  UpdateRoleRequest,
  UpdateRolePermissionsRequest,
  UpdateRoleUsersRequest,
} from '../types';

const QUERY_KEY = 'roles';

export const useGetRoles = (params: GetRolesParams = {}) => {
  return useQuery({
    queryKey: [QUERY_KEY, params],
    queryFn: async (): Promise<RoleListResult> => {
      const { data } = await axios.get<RoleListResult>('/auth/roles', {
        params: {
          Search: params.search || undefined,
          Scope: params.scope || undefined,
          PageNumber: params.pageNumber ?? 1,
          PageSize: params.pageSize ?? 20,
        },
      });
      return data;
    },
  });
};

export const useGetRoleById = (id: string | null) => {
  return useQuery({
    queryKey: [QUERY_KEY, id],
    queryFn: async (): Promise<Role> => {
      const { data } = await axios.get<Role>(`/auth/roles/${id}`);
      return data;
    },
    enabled: !!id,
  });
};

export const useGetRoleUsers = (id: string | null) => {
  return useQuery({
    queryKey: [QUERY_KEY, id, 'users'],
    queryFn: async (): Promise<RoleUser[]> => {
      const { data } = await axios.get<{ users: RoleUser[] }>(`/auth/roles/${id}/users`);
      return data?.users ?? [];
    },
    enabled: !!id,
  });
};

export const useCreateRole = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (request: CreateRoleRequest) => {
      const { data } = await axios.post('/auth/roles', request);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
    },
  });
};

export const useUpdateRole = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...body }: UpdateRoleRequest & { id: string }) => {
      const { data } = await axios.put(`/auth/roles/${id}`, body);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
    },
  });
};

export const useUpdateRolePermissions = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...body }: UpdateRolePermissionsRequest & { id: string }) => {
      const { data } = await axios.put(`/auth/roles/${id}/permissions`, body);
      return data;
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY, variables.id] });
    },
  });
};

export const useUpdateRoleUsers = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...body }: UpdateRoleUsersRequest & { id: string }) => {
      const { data } = await axios.put(`/auth/roles/${id}/users`, body);
      return data;
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY, variables.id, 'users'] });
    },
  });
};

export const useDeleteRole = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { data } = await axios.delete(`/auth/roles/${id}`);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
    },
  });
};
