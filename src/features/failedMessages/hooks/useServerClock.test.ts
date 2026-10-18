import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import { useServerClock } from './useServerClock';

// Wire datetimes are zone-less Bangkok local — build one from a real Date the same way the app does.
const toLocalWire = (d: Date): string => {
  const pad = (n: number, len = 2) => String(n).padStart(len, '0');
  return (
    `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}` +
    `T${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`
  );
};

describe('useServerClock', () => {
  const systemTime = new Date(2026, 8, 29, 10, 0, 0);

  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(systemTime);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('now equals systemTime + offset right after mount', () => {
    // serverTime === systemTime here → offset is 0.
    const { result } = renderHook(() =>
      useServerClock(toLocalWire(systemTime), systemTime.getTime()),
    );
    expect(result.current?.getTime()).toBe(systemTime.getTime());
  });

  it('advances by 15s after the tick fires', () => {
    const { result } = renderHook(() =>
      useServerClock(toLocalWire(systemTime), systemTime.getTime()),
    );
    const before = result.current!.getTime();
    act(() => {
      vi.advanceTimersByTime(15_000);
    });
    expect(result.current!.getTime()).toBe(before + 15_000);
  });

  it('recomputes immediately on a new dataUpdatedAt/serverTime, without waiting for the tick', () => {
    const { result, rerender } = renderHook(
      ({ serverTime, dataUpdatedAt }) => useServerClock(serverTime, dataUpdatedAt),
      {
        initialProps: { serverTime: toLocalWire(systemTime), dataUpdatedAt: systemTime.getTime() },
      },
    );
    expect(result.current?.getTime()).toBe(systemTime.getTime());

    // A later summary fetch with a 5-minute server/client skew — no timer advance in between.
    const newServerTime = new Date(systemTime.getTime() + 5 * 60_000);
    rerender({ serverTime: toLocalWire(newServerTime), dataUpdatedAt: systemTime.getTime() });

    expect(result.current?.getTime()).toBe(systemTime.getTime() + 5 * 60_000);
  });

  it('is null when serverTime is undefined from the start', () => {
    const { result } = renderHook(() => useServerClock(undefined, systemTime.getTime()));
    expect(result.current).toBeNull();
  });

  it('keeps the last known offset when serverTime later becomes undefined', () => {
    // Explicit generics — otherwise Props gets inferred from `initialProps`' literal (plain `string`),
    // and the later `rerender({ serverTime: undefined, ... })` fails to type-check.
    const { result, rerender } = renderHook<
      Date | null,
      { serverTime: string | undefined; dataUpdatedAt: number }
    >(({ serverTime, dataUpdatedAt }) => useServerClock(serverTime, dataUpdatedAt), {
      initialProps: { serverTime: toLocalWire(systemTime), dataUpdatedAt: systemTime.getTime() },
    });
    expect(result.current?.getTime()).toBe(systemTime.getTime());

    // A later poll fails — no serverTime this round — but the clock must keep ticking on the offset
    // captured earlier (0 in this test), not go blank.
    rerender({ serverTime: undefined, dataUpdatedAt: systemTime.getTime() });
    expect(result.current?.getTime()).toBe(systemTime.getTime());

    act(() => {
      vi.advanceTimersByTime(15_000);
    });
    expect(result.current?.getTime()).toBe(systemTime.getTime() + 15_000);
  });
});
