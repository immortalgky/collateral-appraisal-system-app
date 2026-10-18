import type { ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { QueryKey } from '@tanstack/react-query';
import { AxiosError } from 'axios';

/** A fresh QueryClient (no retries — a rejected fetch must reach `error` immediately) + its provider. */
export function createQueryWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
  return { queryClient, wrapper };
}

/** An axios rejection carrying an HTTP status, as the shared axios instance would surface it. */
export const httpError = (status: number) =>
  new AxiosError('x', 'ERR', undefined, undefined, { status } as never);

/** An axios failure with no response at all (offline, connection reset). */
export const networkError = () => new AxiosError('Network Error', 'ERR_NETWORK');

/** What a mounted query's `refetchInterval` option currently resolves to, given its own state. */
export function currentRefetchInterval(queryClient: QueryClient, queryKey: QueryKey) {
  const query = queryClient.getQueryCache().find({ queryKey });
  if (!query) throw new Error('query not in cache');
  const { refetchInterval } = query.observers[0].options;
  return typeof refetchInterval === 'function' ? refetchInterval(query) : refetchInterval;
}
