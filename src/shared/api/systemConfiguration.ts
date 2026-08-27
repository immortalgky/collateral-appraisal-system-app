import { useQuery } from '@tanstack/react-query';
import axios from '@shared/api/axiosInstance';

export interface SystemConfigurationDto {
  key: string;
  value: string;
  valueType: string;
  description?: string | null;
  category?: string | null;
  isActive: boolean;
}

/**
 * Reads a single admin-managed system configuration entry.
 * GET /system-configurations/{key} — 404 when the key has never been seeded.
 */
export const useSystemConfiguration = (key: string, enabled = true) =>
  useQuery({
    queryKey: ['system-configuration', key],
    queryFn: async (): Promise<SystemConfigurationDto | null> => {
      try {
        const { data } = await axios.get(`/system-configurations/${key}`);
        return data;
      } catch (error: any) {
        // A missing key is not an error — callers fall back to their own default.
        if (error?.response?.status === 404) return null;
        throw error;
      }
    },
    enabled: enabled && !!key,
    staleTime: 60_000,
  });

/**
 * Reads a boolean system configuration entry, falling back to `defaultValue` while the request is
 * in flight or when the key does not exist — mirroring ISystemConfigurationReader.GetBoolAsync.
 */
export const useSystemConfigurationBool = (key: string, defaultValue: boolean, enabled = true) => {
  const { data, isLoading } = useSystemConfiguration(key, enabled);
  if (isLoading || !data || data.isActive === false) return defaultValue;
  return data.value?.trim().toLowerCase() === 'true';
};
