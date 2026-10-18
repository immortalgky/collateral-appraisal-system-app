import type { ReactNode } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { QueryClientProvider } from '@tanstack/react-query';
import { format } from 'date-fns';
import { http, HttpResponse } from 'msw';
import { act, createTestQueryClient, renderHook, waitFor } from '@/test/test-utils';
import { server } from '@/test/mocks/server';
import { useGetQuotationById } from './quotation';

const SECOND = 1_000;
const DAY = 24 * 60 * 60 * SECOND;

/** The server's wire shape for autoAssignedAt: local time, no zone suffix. */
const localStamp = (ms: number) => format(new Date(Date.now() - ms), "yyyy-MM-dd'T'HH:mm:ss");

const assignedRow = (
  appraisalId: string,
  followupStaffName: string | null,
  autoAssignedAt: string | null,
) => ({
  appraisalId,
  titles: [],
  autoAssignResult: 'Assigned',
  followupStaffName,
  autoAssignedAt,
});

const detail = (followupStaffName: string | null, autoAssignedAt: string | null) => ({
  id: 'q1',
  appraisals: [assignedRow('a1', followupStaffName, autoAssignedAt)],
});

const renderDetail = (options?: { pollAutoAssignFollowup?: boolean }) => {
  const client = createTestQueryClient();
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );
  return renderHook(() => useGetQuotationById('q1', options), { wrapper });
};

/** Lets the poll timer fire, then waits for the refetch it started to settle. */
const tick = async (result: { current: { isFetching: boolean } }, ms: number) => {
  await act(() => vi.advanceTimersByTimeAsync(ms));
  await waitFor(() => expect(result.current.isFetching).toBe(false));
};

describe('useGetQuotationById follow-up polling', () => {
  // The clock still advances on its own, so msw and the query client keep settling between ticks.
  beforeEach(() => vi.useFakeTimers({ shouldAdvanceTime: true }));
  afterEach(() => vi.useRealTimers());

  it('polls while the row is recent and missing its staff, and stops once the name arrives', async () => {
    const calls = vi.fn();
    const stamp = localStamp(5 * SECOND);
    server.use(
      http.get('*/quotations/q1', () => {
        calls();
        return HttpResponse.json(detail(calls.mock.calls.length >= 2 ? 'Staff One' : null, stamp));
      }),
    );
    const { result } = renderDetail({ pollAutoAssignFollowup: true });

    await waitFor(() => expect(result.current.data).toBeDefined());
    await tick(result, 2 * SECOND);
    expect(result.current.data?.appraisals?.[0].followupStaffName).toBe('Staff One');
    expect(calls).toHaveBeenCalledTimes(2);

    await tick(result, 10 * SECOND);
    expect(calls).toHaveBeenCalledTimes(2);
  });

  it('measures the window from the newest row, so the early rows of a long run still get polled', async () => {
    const calls = vi.fn();
    const old = localStamp(45 * SECOND);
    const recent = localStamp(5 * SECOND);
    server.use(
      http.get('*/quotations/q1', () => {
        calls();
        return HttpResponse.json({
          id: 'q1',
          appraisals: [
            assignedRow('a1', calls.mock.calls.length >= 2 ? 'Staff One' : null, old),
            assignedRow('a2', null, old),
            assignedRow('a3', 'Staff Three', recent),
          ],
        });
      }),
    );
    const { result } = renderDetail({ pollAutoAssignFollowup: true });

    await waitFor(() => expect(result.current.data).toBeDefined());
    await tick(result, 2 * SECOND);

    // a1 is 45 s old and still missing its name on the first read, yet it was polled for.
    expect(calls).toHaveBeenCalledTimes(2);
    expect(result.current.data?.appraisals?.[0].followupStaffName).toBe('Staff One');
  });

  it('does not poll for a row auto-assigned long ago, even with no staff name', async () => {
    const calls = vi.fn();
    const stamp = localStamp(90 * DAY);
    server.use(
      http.get('*/quotations/q1', () => {
        calls();
        return HttpResponse.json(detail(null, stamp));
      }),
    );
    const { result } = renderDetail({ pollAutoAssignFollowup: true });

    await waitFor(() => expect(result.current.data).toBeDefined());
    await tick(result, 10 * SECOND);

    expect(calls).toHaveBeenCalledTimes(1);
  });

  it('does not poll unless the caller opts in', async () => {
    const calls = vi.fn();
    const stamp = localStamp(5 * SECOND);
    server.use(
      http.get('*/quotations/q1', () => {
        calls();
        return HttpResponse.json(detail(null, stamp));
      }),
    );
    const { result } = renderDetail();

    await waitFor(() => expect(result.current.data).toBeDefined());
    await tick(result, 10 * SECOND);

    expect(calls).toHaveBeenCalledTimes(1);
  });

  it('gives up 30 s after the row was auto-assigned when the staff name never arrives', async () => {
    const calls = vi.fn();
    const stamp = localStamp(0);
    server.use(
      http.get('*/quotations/q1', () => {
        calls();
        return HttpResponse.json(detail(null, stamp));
      }),
    );
    const { result } = renderDetail({ pollAutoAssignFollowup: true });

    await waitFor(() => expect(result.current.data).toBeDefined());
    for (let elapsed = 0; elapsed < 40 * SECOND; elapsed += 2 * SECOND) {
      await tick(result, 2 * SECOND);
    }
    // One read plus a poll every 2 s up to the 30 s mark is about 16. A 12 s window would stop near 7,
    // and an unbounded poll would be over 20 by now.
    const callsAtCap = calls.mock.calls.length;
    expect(callsAtCap).toBeGreaterThanOrEqual(13);
    expect(callsAtCap).toBeLessThanOrEqual(17);

    await tick(result, 10 * SECOND);
    expect(calls).toHaveBeenCalledTimes(callsAtCap);
  }, 30_000);
});
