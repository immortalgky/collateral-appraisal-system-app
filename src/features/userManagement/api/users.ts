import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { AxiosError } from 'axios';
import axios from '@shared/api/axiosInstance';
import { extractApiError } from '@shared/utils/errorUtils';
import { useAuthStore } from '@features/auth/store';
import { STALE_STATE_CODES } from './twoFactorErrors';
import type {
  UserProfile,
  AdminUserListResult,
  AdminUserDetail,
  GetUsersParams,
  UpdateProfileRequest,
  ChangePasswordRequest,
  AdminUpdateUserRequest,
  UpdateUserRolesRequest,
  UpdateUserGroupsRequest,
  UpdateUserTeamsRequest,
  SetUserActivationRequest,
  SetAccessWindowRequest,
  SetAccessWindowResponse,
  CreateUserRequest,
  CreateUserResponse,
  LdapLookupResponse,
  PasswordPolicy,
  TwoFactorSetupResponse,
  TwoFactorCodeRequest,
  RecoveryCodesResponse,
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
      // The navbar reads the auth store, which is fed by the separate
      // ['currentUser'] query — without this the header keeps the old name.
      queryClient.invalidateQueries({ queryKey: ['currentUser'] });
    },
  });
};

/** Change own password */
export const useChangePassword = (userId: string) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (request: ChangePasswordRequest) => {
      const { data } = await axios.post(`/auth/users/${userId}/change-password`, request);
      return data;
    },
    onSuccess: () => {
      // A successful change moves passwordChangedAt and clears mustChangePassword.
      // /auth/me is cached under two unrelated keys (['me'] here, ['currentUser'] in
      // features/auth/api.ts), so both have to be refreshed or the profile page keeps
      // showing the old "Password last changed" right behind the success toast.
      queryClient.invalidateQueries({ queryKey: ME_KEY });
      queryClient.invalidateQueries({ queryKey: ['currentUser'] });
    },
  });
};

// The 2FA responses carry secrets (the authenticator key, the recovery codes). gcTime 0 drops the
// mutation, and with it the result, as soon as nothing observes it; callers copy what they need
// into component state and reset().
const TWO_FACTOR_BASE = '/auth/me/two-factor';

/**
 * When the API refuses an own-2FA call because the state moved on (already on, not on, required by
 * policy), re-read /auth/me, cached under two unrelated keys (see useChangePassword), so the card
 * shows the real state. A wrong code or a failed save changes nothing, so those do not refetch.
 */
const useRefreshMeOnRefusal = () => {
  const queryClient = useQueryClient();
  return (err: unknown) => {
    const { errorCode } = extractApiError(err as AxiosError);
    if (!errorCode || !STALE_STATE_CODES.includes(errorCode)) return;
    queryClient.invalidateQueries({ queryKey: ME_KEY });
    queryClient.invalidateQueries({ queryKey: ['currentUser'] });
  };
};

/** Own 2FA step 1: a fresh authenticator key and its QR code. Changes nothing until enable. */
export const useSetupTwoFactor = () => {
  const refreshMeOnRefusal = useRefreshMeOnRefusal();
  return useMutation({
    gcTime: 0,
    mutationFn: async (): Promise<TwoFactorSetupResponse> => {
      const { data } = await axios.post<TwoFactorSetupResponse>(`${TWO_FACTOR_BASE}/setup`);
      return data;
    },
    onError: refreshMeOnRefusal,
  });
};

/**
 * Own 2FA mutations that move twoFactorEnabled / recoveryCodesLeft. Both /auth/me keys are
 * refreshed on success, unless `endsSession`: then the server also ends this session, so a refetch
 * would 401 and the caller signs out instead.
 */
const useTwoFactorCodeMutation = <T>(path: string, { endsSession = false } = {}) => {
  const queryClient = useQueryClient();
  const refreshMeOnRefusal = useRefreshMeOnRefusal();
  return useMutation({
    gcTime: 0,
    mutationFn: async (request: TwoFactorCodeRequest): Promise<T> => {
      const { data } = await axios.post<T>(`${TWO_FACTOR_BASE}/${path}`, request);
      return data;
    },
    onSuccess: () => {
      if (endsSession) return;
      queryClient.invalidateQueries({ queryKey: ME_KEY });
      queryClient.invalidateQueries({ queryKey: ['currentUser'] });
    },
    onError: refreshMeOnRefusal,
  });
};

/** Own 2FA step 2: confirm a code from the app; returns the recovery codes (shown once). */
export const useEnableTwoFactor = () => useTwoFactorCodeMutation<RecoveryCodesResponse>('enable');

/** Turn 2FA off; needs a current code. */
export const useDisableTwoFactor = () => useTwoFactorCodeMutation<void>('disable');

/** Replace all recovery codes; needs a current code. Returns the new ones (shown once). */
export const useRegenerateRecoveryCodes = () =>
  useTwoFactorCodeMutation<RecoveryCodesResponse>('recovery-codes');

/**
 * Lost phone: turn 2FA off with a current code or a recovery code. The server ends every session of
 * the user, this one included: the caller signs out.
 */
export const useSetUpNewDevice = () =>
  useTwoFactorCodeMutation<void>('new-device', { endsSession: true });

/** Admin: reset a user's 2FA (key, recovery codes, sessions) so they must set it up again. */
export const useResetTwoFactor = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { data } = await axios.post(`/auth/users/${id}/two-factor/reset`);
      return data;
    },
    onSuccess: (_data, id) => {
      queryClient.invalidateQueries({ queryKey: [USERS_KEY, id] });
    },
  });
};

/** Admin: remove every passkey of a user and end their sessions. */
export const useRevokePasskeys = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await axios.delete(`/auth/users/${id}/passkeys`);
    },
    onSuccess: (_data, id) => {
      queryClient.invalidateQueries({ queryKey: [USERS_KEY, id] });
    },
  });
};

/** Admin: list all users */
export const useGetUsers = (
  params: GetUsersParams = {},
  options?: { enabled?: boolean; keepPrevious?: boolean },
) => {
  return useQuery({
    enabled: options?.enabled ?? true,
    placeholderData: options?.keepPrevious ? keepPreviousData : undefined,
    queryKey: [USERS_KEY, params],
    queryFn: async (): Promise<AdminUserListResult> => {
      const { data } = await axios.get<AdminUserListResult>('/auth/users', {
        params: {
          Search: params.search || undefined,
          Scope: params.scope || undefined,
          role: params.role || undefined,
          groupId: params.groupId || undefined,
          teamId: params.teamId || undefined,
          companyId: params.companyId || undefined,
          isActive: params.isActive,
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
    mutationFn: async ({
      id,
      newPassword,
      confirmPassword,
    }: {
      id: string;
      newPassword: string;
      confirmPassword: string;
    }) => {
      const { data } = await axios.post(`/auth/users/${id}/reset-password`, {
        newPassword,
        confirmPassword,
      });
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

/** Admin: look up a username in LDAP/AD to pre-fill the create-user form (no password validation) */
export const useLdapLookup = () => {
  return useMutation({
    mutationFn: async (username: string): Promise<LdapLookupResponse> => {
      const { data } = await axios.get<LdapLookupResponse>('/auth/users/ldap-lookup', {
        params: { username },
      });
      return data;
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

/** Admin: update user groups */
export const useUpdateUserGroups = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...body }: UpdateUserGroupsRequest & { id: string }) => {
      const { data } = await axios.put(`/auth/users/${id}/groups`, body);
      return data;
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: [USERS_KEY, variables.id] });
    },
  });
};

/** Admin: update user teams */
export const useUpdateUserTeams = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...body }: UpdateUserTeamsRequest & { id: string }) => {
      const { data } = await axios.put(`/auth/users/${id}/teams`, body);
      return data;
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: [USERS_KEY, variables.id] });
    },
  });
};

/** Admin: activate or deactivate a user */
export const useSetUserActivation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...body }: SetUserActivationRequest & { id: string }) => {
      const { data } = await axios.put(`/auth/users/${id}/activation`, body);
      return data;
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: [USERS_KEY, variables.id] });
      queryClient.invalidateQueries({ queryKey: [USERS_KEY] });
    },
  });
};

/**
 * Admin: open, extend or close a temporary account's access window.
 *
 * Opening returns a freshly generated password — the only time it is ever readable, so show it to
 * the admin immediately and never persist it. Extending returns none and keeps the current one alive.
 */
export const useSetAccessWindow = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      ...body
    }: SetAccessWindowRequest & { id: string }): Promise<SetAccessWindowResponse> => {
      const { data } = await axios.put<SetAccessWindowResponse>(
        `/auth/users/${id}/access-window`,
        body,
      );
      return data;
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: [USERS_KEY, variables.id] });
      queryClient.invalidateQueries({ queryKey: [USERS_KEY] });
    },
  });
};

/** Admin: unlock a locked user account */
export const useUnlockUser = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { data } = await axios.post(`/auth/users/${id}/unlock`);
      return data;
    },
    onSuccess: (_data, id) => {
      queryClient.invalidateQueries({ queryKey: [USERS_KEY, id] });
      // The user list renders the lock icon, so refresh it too.
      queryClient.invalidateQueries({ queryKey: [USERS_KEY] });
    },
  });
};

/** React Query key for the public password-policy (complexity rules for the checklist). */
export const passwordPolicyQueryKey = ['passwordPolicy'] as const;

/** Get the global password policy */
export const useGetPasswordPolicy = () => {
  return useQuery({
    queryKey: passwordPolicyQueryKey,
    queryFn: async (): Promise<PasswordPolicy> => {
      const { data } = await axios.get<PasswordPolicy>('/auth/password-policy');
      return data;
    },
    staleTime: 5 * 60 * 1000,
  });
};
