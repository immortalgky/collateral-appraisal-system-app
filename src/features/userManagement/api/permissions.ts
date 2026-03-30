import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import axios from '@shared/api/axiosInstance';
import type {
  PermissionListResult,
  CreatePermissionRequest,
  UpdatePermissionRequest,
  GetPermissionsParams,
} from '../types';

const QUERY_KEY = 'permissions';

export const useGetPermissions = (params: GetPermissionsParams = {}) => {
  return useQuery({
    queryKey: [QUERY_KEY, params],
    queryFn: async (): Promise<PermissionListResult> => {
      const { data } = await axios.get<PermissionListResult>('/auth/permissions', {
        params: {
          Search: params.search || undefined,
          PageNumber: params.pageNumber ?? 1,
          PageSize: params.pageSize ?? 20,
        },
      });
      return data;
    },
  });
};

export const useCreatePermission = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (request: CreatePermissionRequest) => {
      const { data } = await axios.post('/auth/permissions', request);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
    },
  });
};

export const useUpdatePermission = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...body }: UpdatePermissionRequest & { id: string }) => {
      const { data } = await axios.put(`/auth/permissions/${id}`, body);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
    },
  });
};

export const useDeletePermission = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { data } = await axios.delete(`/auth/permissions/${id}`);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
    },
  });
};
