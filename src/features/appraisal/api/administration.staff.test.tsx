import type { ReactNode } from 'react';
import { describe, expect, it } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { http, HttpResponse } from 'msw';
import { renderHook, waitFor } from '@testing-library/react';
import { server } from '@/test/mocks/server';
import { useGetEligibleStaff, useGetUserById } from './administration';

const wrapper = ({ children }: { children: ReactNode }) => (
  <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
    {children}
  </QueryClientProvider>
);

describe('staff workload is never a made-up 0', () => {
  it('takes the open-task count from the eligible-assignees list, and leaves it out when absent', async () => {
    server.use(
      http.get('*/workflows/instances/:id/activities/:activity/eligible-assignees', () =>
        HttpResponse.json({
          eligibleAssignees: [
            { userId: 'int.staff1', displayName: 'Staff One', activeTaskCount: 4 },
            { userId: 'int.staff2', displayName: 'Staff Two', activeTaskCount: 0 },
            { userId: 'int.staff3', displayName: 'Older server' },
          ],
        }),
      ),
    );
    const { result } = renderHook(() => useGetEligibleStaff('wf1', 'act'), { wrapper });

    await waitFor(() => expect(result.current.data).toBeDefined());

    expect(result.current.data?.map(s => s.currentWorkload)).toEqual([4, 0, undefined]);
  });

  it('reads position and phone from the user record, with no workload', async () => {
    server.use(
      http.get('*/auth/users/:id', () =>
        HttpResponse.json({
          id: 'g1',
          username: 'int.staff1',
          firstName: 'Somying',
          lastName: 'Rakngan',
          email: 's@bank.example',
          department: 'Valuation',
          position: 'Senior Appraiser',
          phoneNumber: '02-123-4567',
        }),
      ),
    );
    const { result } = renderHook(() => useGetUserById('g1'), { wrapper });

    await waitFor(() => expect(result.current.data).toBeDefined());

    expect(result.current.data).toMatchObject({
      position: 'Senior Appraiser',
      phone: '02-123-4567',
      department: 'Valuation',
      email: 's@bank.example',
    });
    expect(result.current.data?.currentWorkload).toBeUndefined();
  });
});
