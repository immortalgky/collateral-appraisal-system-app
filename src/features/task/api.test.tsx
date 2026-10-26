import type { ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { act, renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const get = vi.fn();
vi.mock('@shared/api/axiosInstance', () => ({ default: { get: (...a: unknown[]) => get(...a) } }));

import { useGetPoolTasks, useGetTasks, useTaskGroupCounts } from './api';
import { useTaskListPaging } from './hooks/useTaskListPaging';

const wrapper = ({ children }: { children: ReactNode }) => (
  <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
    {children}
  </QueryClientProvider>
);
const lastParams = () => get.mock.calls.at(-1)![1].params;

describe('task list queries', () => {
  it('sends each multi-value facet as ONE comma-joined value, never a repeated key', async () => {
    get.mockResolvedValue({ data: { result: { items: [], count: 0 } } });
    renderHook(
      () => useGetTasks({ status: 'Pending,InProgress', channel: 'LOS,Manual', activityId: 'a,b' }),
      { wrapper },
    );
    await waitFor(() => expect(get).toHaveBeenCalled());
    expect(lastParams()).toMatchObject({
      Status: 'Pending,InProgress',
      Channel: 'LOS,Manual',
      ActivityId: 'a,b',
    });
  });

  it('sends the SLA statuses as they are, plain OnTime included (the API widens it to OnTrack)', async () => {
    get.mockResolvedValue({ data: { result: { items: [], count: 0 } } });
    renderHook(() => useGetTasks({ slaStatus: 'Breached,OnTime,NoSla' }), { wrapper });
    await waitFor(() => expect(get).toHaveBeenCalled());
    expect(lastParams().SlaStatus).toBe('Breached,OnTime,NoSla');

    get.mockClear();
    renderHook(() => useGetPoolTasks({ slaStatus: 'OnTime' }), { wrapper });
    await waitFor(() => expect(get).toHaveBeenCalled());
    expect(lastParams().SlaStatus).toBe('OnTime');

    get.mockClear();
    renderHook(() => useTaskGroupCounts('status', { slaStatus: 'OnTime', channel: 'LOS' }), {
      wrapper,
    });
    await waitFor(() => expect(get).toHaveBeenCalled());
    expect(lastParams()).toMatchObject({ SlaStatus: 'OnTime', Channel: 'LOS' });
  });

  it('sends the Pool every filter the page shows a chip for: the number, the customer and the task status', async () => {
    get.mockResolvedValue({ data: { result: { items: [], count: 0 } } });
    renderHook(
      () =>
        useGetPoolTasks({
          appraisalNumber: '69000001',
          customerName: 'Somchai',
          pendingTaskStatus: 'InProgress',
        }),
      { wrapper },
    );
    await waitFor(() => expect(get).toHaveBeenCalled());
    expect(lastParams()).toMatchObject({
      AppraisalNumber: '69000001',
      CustomerName: 'Somchai',
      // the backend's name for the PendingTaskStatus column, as on the My list
      TaskStatus: 'InProgress',
    });
  });

  it('maps the three date ranges onto the API params, and never the old single range', async () => {
    get.mockResolvedValue({ data: { result: { items: [], count: 0 } } });
    renderHook(
      () =>
        useGetTasks({
          assignedFrom: '2026-10-01',
          appointmentTo: '2026-10-31',
          requestedFrom: '2026-09-01',
        }),
      { wrapper },
    );
    await waitFor(() => expect(get).toHaveBeenCalled());
    expect(lastParams()).toMatchObject({
      DateFrom: '2026-10-01',
      AppointmentDateTo: '2026-10-31',
      RequestedAtFrom: '2026-09-01',
    });
  });

  it('does not run a query that is switched off', async () => {
    get.mockClear();
    renderHook(() => useGetTasks({}, { enabled: false }), { wrapper });
    renderHook(() => useGetPoolTasks({}, { enabled: false }), { wrapper });
    await new Promise(r => setTimeout(r, 30));
    expect(get).not.toHaveBeenCalled();
  });

  it('goes out once, for page 0, when the search changes on a later page', async () => {
    get.mockReset();
    get.mockResolvedValue({ data: { result: { items: [], count: 500 } } });
    const noFilters = {};
    const { result, rerender } = renderHook(
      ({ s }: { s: string }) => {
        const paging = useTaskListPaging(s, noFilters);
        useGetTasks({ search: s || undefined, ...paging.queryParams });
        return paging;
      },
      { initialProps: { s: '' }, wrapper },
    );
    await waitFor(() => expect(get).toHaveBeenCalledTimes(1));
    act(() => result.current.paginationProps(500).onPageChange(3));
    await waitFor(() => expect(get).toHaveBeenCalledTimes(2));
    expect(lastParams().PageNumber).toBe(3);

    rerender({ s: 'abc' });
    await waitFor(() => expect(get).toHaveBeenCalledTimes(3));
    await new Promise(r => setTimeout(r, 50));
    const forAbc = get.mock.calls.map(c => c[1].params).filter(p => p.Search === 'abc');
    expect(forAbc).toHaveLength(1);
    expect(forAbc[0].PageNumber).toBe(0);
  });

  it('keeps the last result while the next page loads: the count and the pager stay, only the first load is empty', async () => {
    get.mockReset();
    let release!: (v: unknown) => void;
    get.mockImplementation((_url: string, cfg: { params: { PageNumber: number } }) =>
      cfg.params.PageNumber === 0
        ? Promise.resolve({ data: { result: { items: [{ id: 'a' }], count: 500 } } })
        : new Promise(resolve => {
            release = resolve;
          }),
    );
    const noFilters = {};
    const { result } = renderHook(
      () => {
        const paging = useTaskListPaging('', noFilters);
        const query = useGetTasks({ ...paging.queryParams });
        return { paging, query, pager: paging.paginationProps(query.data?.count) };
      },
      { wrapper },
    );
    // the first load has nothing to show
    expect(result.current.query.isLoading).toBe(true);
    expect(result.current.query.data).toBeUndefined();
    await waitFor(() => expect(result.current.query.data?.count).toBe(500));

    act(() => result.current.pager.onPageChange(3));
    await waitFor(() => expect(result.current.query.isPlaceholderData).toBe(true));
    // page 3 is in flight: the rows, the total and the pager are those of the last result
    expect(result.current.query.isLoading).toBe(false);
    expect(result.current.query.data?.count).toBe(500);
    expect(result.current.pager).toMatchObject({ totalCount: 500, totalPages: 20, currentPage: 3 });

    release({ data: { result: { items: [{ id: 'b' }], count: 500 } } });
    await waitFor(() => expect(result.current.query.isPlaceholderData).toBe(false));
  });

  it('still shows the error when the next page fails, and then has no data to count', async () => {
    get.mockReset();
    get.mockImplementation((_url: string, cfg: { params: { PageNumber: number } }) =>
      cfg.params.PageNumber === 0
        ? Promise.resolve({ data: { result: { items: [], count: 500 } } })
        : Promise.reject(new Error('boom')),
    );
    const noFilters = {};
    const { result } = renderHook(
      () => {
        const paging = useTaskListPaging('', noFilters);
        const query = useGetTasks({ ...paging.queryParams });
        return { query, pager: paging.paginationProps(query.data?.count) };
      },
      { wrapper },
    );
    await waitFor(() => expect(result.current.query.data?.count).toBe(500));
    act(() => result.current.pager.onPageChange(2));
    await waitFor(() => expect(result.current.query.isError).toBe(true));
    expect(result.current.query.data).toBeUndefined();
  });

  describe('keeping the last result', () => {
    type P = Parameters<typeof useGetTasks>[0];
    const setup = () => {
      get.mockReset();
      get.mockImplementation((_url: string, cfg: { params: Record<string, unknown> }) =>
        cfg.params.PageNumber === 0 &&
        !cfg.params.Search &&
        !cfg.params.Status &&
        !cfg.params.AssigneeUserId &&
        !cfg.params.SlaStatus
          ? Promise.resolve({ data: { result: { items: [{ id: 'a' }], count: 500 } } })
          : new Promise(() => {}),
      );
      return renderHook(({ p }: { p: P }) => useGetTasks(p), {
        wrapper,
        initialProps: { p: {} as P },
      });
    };

    it('keeps it for another page or another sort of the same list', async () => {
      const { result, rerender } = setup();
      await waitFor(() => expect(result.current.data?.count).toBe(500));
      rerender({ p: { pageNumber: 3 } });
      expect(result.current.isPlaceholderData).toBe(true);
      expect(result.current.data?.count).toBe(500);
      rerender({ p: { pageNumber: 3, pageSize: 50, sortBy: 'status', sortDir: 'desc' } });
      expect(result.current.isPlaceholderData).toBe(true);
    });

    it('keeps an empty list (total 0) across a sort, but not an emptied page', async () => {
      get.mockReset();
      let count = 0;
      get.mockImplementation((_url: string, cfg: { params: Record<string, unknown> }) =>
        cfg.params.SortBy
          ? new Promise(() => {})
          : Promise.resolve({ data: { result: { items: [], count } } }),
      );
      const { result, rerender } = renderHook(({ p }: { p: P }) => useGetTasks(p), {
        wrapper,
        initialProps: { p: {} as P },
      });
      await waitFor(() => expect(result.current.data?.count).toBe(0));
      rerender({ p: { sortBy: 'status' } });
      // really empty: the placeholder holds, no empty -> skeleton -> empty flicker
      expect(result.current.isPlaceholderData).toBe(true);

      // an emptied page: items gone but the total says there are some
      count = 9;
      rerender({ p: { search: 'x' } });
      rerender({ p: { pageSize: 50 } });
      await waitFor(() => expect(result.current.data?.count).toBe(9));
      rerender({ p: { pageSize: 50, sortBy: 'status' } });
      expect(result.current.isPlaceholderData).toBe(false);
      expect(result.current.isLoading).toBe(true);
    });

    it('drops it for another filter, search or assignee: that is another list', async () => {
      const { result, rerender } = setup();
      await waitFor(() => expect(result.current.data?.count).toBe(500));
      for (const p of [
        { status: 'Pending' },
        { search: 'abc' },
        { assigneeUserId: 'someone-else' },
        { slaStatus: 'Breached' },
      ]) {
        rerender({ p });
        expect(result.current.data).toBeUndefined();
        expect(result.current.isLoading).toBe(true);
        rerender({ p: {} });
        await waitFor(() => expect(result.current.data?.count).toBe(500));
      }
    });
  });
});
