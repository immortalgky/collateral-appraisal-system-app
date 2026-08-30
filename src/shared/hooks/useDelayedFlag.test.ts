import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useDelayedFlag } from './useDelayedFlag';

describe('useDelayedFlag', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('stays false while the flag is inactive', () => {
    const { result } = renderHook(() => useDelayedFlag(false, 250));
    expect(result.current).toBe(false);
  });

  it('does not fire for work that finishes inside the delay', () => {
    // The point of the hook: a fast response must not flash an indicator.
    const { result, rerender } = renderHook(({ active }) => useDelayedFlag(active, 250), {
      initialProps: { active: true },
    });

    act(() => {
      vi.advanceTimersByTime(200);
    });
    expect(result.current).toBe(false);

    rerender({ active: false });
    act(() => {
      vi.advanceTimersByTime(1000);
    });
    expect(result.current).toBe(false);
  });

  it('fires once the flag has stayed active past the delay', () => {
    const { result } = renderHook(() => useDelayedFlag(true, 250));

    act(() => {
      vi.advanceTimersByTime(249);
    });
    expect(result.current).toBe(false);

    act(() => {
      vi.advanceTimersByTime(1);
    });
    expect(result.current).toBe(true);
  });

  it('clears immediately when the work finishes', () => {
    const { result, rerender } = renderHook(({ active }) => useDelayedFlag(active, 250), {
      initialProps: { active: true },
    });

    act(() => {
      vi.advanceTimersByTime(300);
    });
    expect(result.current).toBe(true);

    rerender({ active: false });
    expect(result.current).toBe(false);
  });

  it('restarts the delay when the flag goes inactive and active again', () => {
    // Two searches in a row must each earn the indicator on their own; the first one's
    // elapsed time must not carry over and make the second flash instantly.
    const { result, rerender } = renderHook(({ active }) => useDelayedFlag(active, 250), {
      initialProps: { active: true },
    });

    act(() => {
      vi.advanceTimersByTime(200);
    });
    rerender({ active: false });
    rerender({ active: true });

    act(() => {
      vi.advanceTimersByTime(200);
    });
    expect(result.current).toBe(false);

    act(() => {
      vi.advanceTimersByTime(50);
    });
    expect(result.current).toBe(true);
  });
});
