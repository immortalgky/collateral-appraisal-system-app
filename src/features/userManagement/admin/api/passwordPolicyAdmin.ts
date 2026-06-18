import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import axios from '@shared/api/axiosInstance';
import { passwordPolicyQueryKey } from '../../api/users';
import type { PasswordPolicyConfig } from '../../types';

const passwordPolicyKeys = {
  config: ['password-policy-config'] as const,
};

export const useGetPasswordPolicyConfig = () =>
  useQuery({
    queryKey: passwordPolicyKeys.config,
    queryFn: async (): Promise<PasswordPolicyConfig> => {
      const { data } = await axios.get<PasswordPolicyConfig>('/auth/admin/password-policy');
      return data;
    },
  });

export const useUpdatePasswordPolicyConfig = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (body: PasswordPolicyConfig): Promise<void> => {
      await axios.put('/auth/admin/password-policy', body);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: passwordPolicyKeys.config });
      // The checklist endpoint (/auth/password-policy) is cached under this key — refresh it too.
      queryClient.invalidateQueries({ queryKey: passwordPolicyQueryKey });
    },
  });
};
