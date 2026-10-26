import type { ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { http, HttpResponse } from 'msw';
import { renderHook, waitFor } from '@testing-library/react';
import { server } from '@/test/mocks/server';
import { useCompleteActivity } from './workflow';

// SignalR progress wiring is irrelevant here.
vi.mock('../hooks/useActivityCompletionProgress', () => ({
  useActivityCompletionProgress: vi.fn(),
}));

describe('useCompleteActivity', () => {
  it('invalidates the Pool table query on success so a submitted pool task leaves the list', async () => {
    server.use(
      http.post('*/workflows/instances/:instanceId/activities/:activityId/complete', () =>
        HttpResponse.json({}),
      ),
    );
    const client = new QueryClient({ defaultOptions: { mutations: { retry: false } } });
    const invalidate = vi.spyOn(client, 'invalidateQueries');
    const wrapper = ({ children }: { children: ReactNode }) => (
      <QueryClientProvider client={client}>{children}</QueryClientProvider>
    );

    const { result } = renderHook(() => useCompleteActivity(), { wrapper });
    result.current.mutate({ workflowInstanceId: 'w1', activityId: 'a1', input: {} });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(invalidate).toHaveBeenCalledWith({ queryKey: ['pool-tasks'] });
    expect(invalidate).toHaveBeenCalledWith({ queryKey: ['my-tasks'] });
  });
});
