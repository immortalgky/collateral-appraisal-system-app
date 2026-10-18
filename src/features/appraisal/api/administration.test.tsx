import type { ReactNode } from 'react';
import { describe, expect, it } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { http, HttpResponse } from 'msw';
import { renderHook } from '@testing-library/react';
import { server } from '@/test/mocks/server';
import { useGetAppraisalQuotations, useGetAssignment } from './administration';

// A client like the app's: data stays fresh for 5 minutes, and the cache is already filled.
const renderWithCachedData = <T,>(useHook: () => T) => {
  const client = new QueryClient({
    defaultOptions: { queries: { staleTime: 5 * 60_000, retry: false } },
  });
  client.setQueryData(['appraisal', 'a1', 'assignments'], []);
  client.setQueryData(['quotations', 'list', { appraisalId: 'a1' }], []);
  server.use(
    http.get('*/appraisals/a1/assignments', () => HttpResponse.json({ assignments: [] })),
    http.get('*/quotations', () => HttpResponse.json({ items: [] })),
  );
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );
  return renderHook(useHook, { wrapper });
};

describe('entry refetch option', () => {
  it.each([
    { name: 'assignment', use: (o?: { staleTime: number }) => useGetAssignment('a1', o) },
    {
      name: 'quotations',
      use: (o?: { staleTime: number }) => useGetAppraisalQuotations('a1', true, o),
    },
  ])(
    '$name: { staleTime: 0 } refetches cached data on the first render, no option does not',
    ({ use }) => {
      expect(renderWithCachedData(() => use({ staleTime: 0 })).result.current.isFetching).toBe(
        true,
      );
      expect(renderWithCachedData(() => use()).result.current.isFetching).toBe(false);
    },
  );
});
