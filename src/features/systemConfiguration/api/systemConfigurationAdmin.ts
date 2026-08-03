import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import axios from '@shared/api/axiosInstance';
import type { SystemConfigurationDto } from '@shared/api/systemConfiguration';

export type { SystemConfigurationDto };

/**
 * Admin maintenance for `common.SystemConfigurations`.
 *
 * The API is deliberately update-only: there is no POST or DELETE. New keys are
 * introduced by `SystemConfigurationDataSeed` on the backend, so this screen can
 * change a value / description / active flag but cannot add or remove entries.
 */
export interface UpdateSystemConfigurationBody {
  value: string;
  description?: string | null;
  isActive?: boolean | null;
}

export const systemConfigurationKeys = {
  all: ['system-configurations'] as const,
  list: () => [...systemConfigurationKeys.all, 'list'] as const,
};

export const useListSystemConfigurations = () =>
  useQuery({
    queryKey: systemConfigurationKeys.list(),
    queryFn: async (): Promise<SystemConfigurationDto[]> => {
      const { data } = await axios.get<SystemConfigurationDto[]>('/system-configurations');
      return data ?? [];
    },
    staleTime: 30_000,
  });

export const useUpdateSystemConfiguration = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      key,
      body,
    }: {
      key: string;
      body: UpdateSystemConfigurationBody;
    }): Promise<void> => {
      await axios.put(`/system-configurations/${key}`, body);
    },
    onSuccess: (_data, { key }) => {
      qc.invalidateQueries({ queryKey: systemConfigurationKeys.all });
      // Feature-flag readers cache per key under a different root — refresh those too.
      qc.invalidateQueries({ queryKey: ['system-configuration', key] });
    },
  });
};
