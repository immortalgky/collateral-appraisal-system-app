import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import axios from '@shared/api/axiosInstance';
import { useAuthStore } from '@features/auth/store';
import type {
  UserProfile,
  AdminUserListResult,
  AdminUserDetail,
  GetUsersParams,
  UpdateProfileRequest,
  ChangePasswordRequest,
  AdminUpdateUserRequest,
  UpdateUserRolesRequest,
  CreateUserRequest,
  CreateUserResponse,
} from '../types';

const ME_KEY = ['me'];
const USERS_KEY = 'users';

/** Current user's own profile */
export const useGetMe = () => {
  const isAuthenticated = useAuthStore(state => state.isAuthenticated);

  return useQuery({
    queryKey: ME_KEY,
    queryFn: async (): Promise<UserProfile> => {
      const { data } = await axios.get<UserProfile>('/auth/me');
      return data;
    },
    enabled: isAuthenticated,
  });
};

/** Update own profile */
export const useUpdateProfile = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (request: UpdateProfileRequest) => {
      const { data } = await axios.patch('/auth/profile', request);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ME_KEY });
    },
  });
};

/** Change own password */
export const useChangePassword = (userId: string) => {
  return useMutation({
    mutationFn: async (request: ChangePasswordRequest) => {
      const { data } = await axios.post(`/auth/users/${userId}/change-password`, request);
      return data;
    },
  });
};

/** Admin: list all users */
export const useGetUsers = (params: GetUsersParams = {}) => {
  return useQuery({
    queryKey: [USERS_KEY, params],
    queryFn: async (): Promise<AdminUserListResult> => {
      const { data } = await axios.get<AdminUserListResult>('/auth/users', {
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

/** Admin: get user by id */
export const useGetUserById = (id: string | null) => {
  return useQuery({
    queryKey: [USERS_KEY, id],
    queryFn: async (): Promise<AdminUserDetail> => {
      const { data } = await axios.get<AdminUserDetail>(`/auth/users/${id}`);
      return data;
    },
    enabled: !!id,
  });
};

/** Admin: update user */
export const useAdminUpdateUser = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...body }: AdminUpdateUserRequest & { id: string }) => {
      const { data } = await axios.put(`/auth/users/${id}`, body);
      return data;
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: [USERS_KEY, variables.id] });
      queryClient.invalidateQueries({ queryKey: [USERS_KEY] });
    },
  });
};

/** Admin: reset user password (requires ALLOW_RESET_PASSWORD permission) */
export const useResetPassword = () => {
  return useMutation({
    mutationFn: async ({ id, newPassword, confirmPassword }: { id: string; newPassword: string; confirmPassword: string }) => {
      const { data } = await axios.post(`/auth/users/${id}/reset-password`, { newPassword, confirmPassword });
      return data;
    },
  });
};

/** Admin: create user */
export const useCreateUser = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (request: CreateUserRequest): Promise<CreateUserResponse> => {
      const { data } = await axios.post<CreateUserResponse>('/auth/users', request);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [USERS_KEY] });
    },
  });
};

/** Admin: update user roles */
export const useUpdateUserRoles = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...body }: UpdateUserRolesRequest & { id: string }) => {
      const { data } = await axios.put(`/auth/users/${id}/roles`, body);
      return data;
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: [USERS_KEY, variables.id] });
    },
  });
};
