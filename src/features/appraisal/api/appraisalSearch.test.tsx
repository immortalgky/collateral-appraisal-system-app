import { beforeEach, describe, expect, it, vi } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import axios from '@shared/api/axiosInstance';
import { useAppraisalGroups, type AppraisalGroupBy } from './appraisalSearch';

vi.mock('@shared/api/axiosInstance', () => ({ default: { get: vi.fn() } }));

const get = vi.mocked(axios.get);
const reply = (groupBy: string, count: number) =>
  Promise.resolve({
    data: { groups: [{ key: groupBy, count, breached: 0, atRisk: 0 }], total: count },
  });

const wrapper = ({ children }: { children: ReactNode }) => (
  <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
    {children}
  </QueryClientProvider>
);

type Props = { groupBy: AppraisalGroupBy | null; params: Record<string, string> };

describe('useAppraisalGroups', () => {
  beforeEach(() => get.mockReset());

  it('keeps the old counts while a filter change reloads them, but drops them when the field changes', async () => {
    let finishNext: (v: unknown) => void = () => {};
    get.mockImplementationOnce((_u, cfg) => reply(String(cfg?.params.groupBy), 10));
    const { result, rerender } = renderHook(
      ({ groupBy, params }: Props) => useAppraisalGroups(groupBy, params),
      { wrapper, initialProps: { groupBy: 'status', params: {} } as Props },
    );
    await waitFor(() => expect(result.current.data?.total).toBe(10));

    // a filter changes: the request is still pending, and the old counts stay on screen
    get.mockImplementationOnce(() => new Promise(res => (finishNext = res)));
    rerender({ groupBy: 'status', params: { priority: 'High' } });
    await waitFor(() => expect(get).toHaveBeenCalledTimes(2));
    expect(result.current.data?.total).toBe(10);
    expect(result.current.isPlaceholderData).toBe(true);
    finishNext(await reply('status', 3));
    await waitFor(() => expect(result.current.data?.total).toBe(3));

    // the field changes: no status counts under a province title
    get.mockImplementationOnce(() => new Promise(res => (finishNext = res)));
    rerender({ groupBy: 'province', params: { priority: 'High' } });
    await waitFor(() => expect(get).toHaveBeenCalledTimes(3));
    expect(result.current.data).toBeUndefined();
    finishNext(await reply('province', 7));
    await waitFor(() => expect(result.current.data?.total).toBe(7));
  });

  it('asks for the field and the filters, without paging or sorting, and not at all with no field', async () => {
    get.mockImplementation((_u, cfg) => reply(String(cfg?.params.groupBy), 1));
    const { rerender } = renderHook(
      ({ groupBy, params }: Props) => useAppraisalGroups(groupBy, params),
      { wrapper, initialProps: { groupBy: null, params: { status: 'Pending' } } as Props },
    );
    expect(get).not.toHaveBeenCalled();
    rerender({ groupBy: 'priority', params: { status: 'Pending' } });
    await waitFor(() => expect(get).toHaveBeenCalledTimes(1));
    expect(get.mock.calls[0][0]).toBe('/appraisals/groups');
    expect(get.mock.calls[0][1]?.params).toEqual({ groupBy: 'priority', status: 'Pending' });
  });
});
