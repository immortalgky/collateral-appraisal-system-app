import type { ReactNode } from 'react';
import { afterEach, describe, expect, it } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { http, HttpResponse } from 'msw';
import { renderHook, waitFor } from '@testing-library/react';
import { server } from '@/test/mocks/server';
import { useGetAppraisalQuotations, useGetAssignment } from './administration';

type Options = { staleTime: number } | undefined;

// A client like the app's: data stays fresh for 5 minutes, and the cache is already filled.
const client = new QueryClient({
  defaultOptions: { queries: { staleTime: 5 * 60_000, retry: false } },
});
const wrapper = ({ children }: { children: ReactNode }) => (
  <QueryClientProvider client={client}>{children}</QueryClientProvider>
);

const renderWithCachedData = (
  use: (id: string, options: Options) => { isFetching: boolean },
  options: Options,
) => {
  for (const id of ['a1', 'a2']) {
    client.setQueryData(['appraisal', id, 'assignments'], []);
    client.setQueryData(['quotations', 'list', { appraisalId: id }], []);
  }
  server.use(
    http.get('*/appraisals/:id/assignments', () => HttpResponse.json({ assignments: [] })),
    http.get('*/quotations', () => HttpResponse.json({ items: [] })),
  );
  return renderHook(({ id }) => use(id, options), { wrapper, initialProps: { id: 'a1' } });
};

// No fetch may outlive its test.
afterEach(async () => {
  await waitFor(() => expect(client.isFetching()).toBe(0));
  client.clear();
});

describe('entry refetch option', () => {
  it.each([
    { name: 'assignment', use: (id: string, o: Options) => useGetAssignment(id, o) },
    { name: 'quotations', use: (id: string, o: Options) => useGetAppraisalQuotations(id, true, o) },
  ])(
    '$name: { staleTime: 0 } refetches cached data on entry and on a key change',
    async ({ use }) => {
      const entered = renderWithCachedData(use, { staleTime: 0 });
      expect(entered.result.current.isFetching).toBe(true);
      await waitFor(() => expect(entered.result.current.isFetching).toBe(false));

      entered.rerender({ id: 'a2' });
      expect(entered.result.current.isFetching).toBe(true);
      await waitFor(() => expect(entered.result.current.isFetching).toBe(false));
    },
  );

  it.each([
    { name: 'assignment', use: (id: string, o: Options) => useGetAssignment(id, o) },
    { name: 'quotations', use: (id: string, o: Options) => useGetAppraisalQuotations(id, true, o) },
  ])('$name: without the option fresh cached data is not refetched', ({ use }) => {
    const entered = renderWithCachedData(use, undefined);
    expect(entered.result.current.isFetching).toBe(false);

    entered.rerender({ id: 'a2' });
    expect(entered.result.current.isFetching).toBe(false);
  });
});
