import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { type z } from 'zod';
import axiosInstance from '@shared/api/axiosInstance';
import type { AxiosError } from 'axios';

interface PreferenceResponse {
  value: unknown;
}

/** Shape returned from onMutate so the rollback context is explicit. */
interface MutateContext<T> {
  previous: T | undefined;
}

async function fetchPreference(key: string): Promise<unknown> {
  const { data } = await axiosInstance.get<PreferenceResponse>(
    `/auth/me/preferences/${encodeURIComponent(key)}`,
  );
  return data.value;
}

async function putPreference(key: string, value: unknown): Promise<void> {
  await axiosInstance.put(`/auth/me/preferences/${encodeURIComponent(key)}`, { value });
}

export function usePreferences<T>(
  key: string,
  defaultValue: T,
  schema: z.ZodSchema<T>,
): {
  value: T;
  setValue: (next: T) => void;
  isLoading: boolean;
  isFetching: boolean;
  isError: boolean;
  error: Error | null;
} {
  const queryClient = useQueryClient();
  const queryKey = ['preferences', key] as const;

  const { data, isLoading, isFetching, isError, error } = useQuery<T, Error>({
    queryKey,
    queryFn: async () => {
      try {
        const raw = await fetchPreference(key);
        const result = schema.safeParse(raw);
        if (!result.success) {
          console.warn(
            `[usePreferences] Schema parse failed for key "${key}". Using default.`,
            result.error,
          );
          return defaultValue;
        }
        return result.data;
      } catch (err) {
        const axiosErr = err as AxiosError;
        if (axiosErr.response?.status === 404) {
          return defaultValue;
        }
        throw err;
      }
    },
    // Inherits global staleTime (5 min). On mutation we invalidate anyway.
  });

  const mutation = useMutation<void, Error, T, MutateContext<T>>({
    mutationFn: (next: T) => putPreference(key, next),
    onMutate: async (next: T): Promise<MutateContext<T>> => {
      await queryClient.cancelQueries({ queryKey });
      const previous = queryClient.getQueryData<T>(queryKey);
      queryClient.setQueryData<T>(queryKey, next);
      return { previous };
    },
    onError: (_err, _next, context) => {
      // Rollback to previous value
      queryClient.setQueryData<T>(queryKey, context?.previous);
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey });
    },
  });

  return {
    value: data ?? defaultValue,
    setValue: (next: T) => mutation.mutate(next),
    isLoading,
    isFetching,
    isError,
    error,
  };
}
