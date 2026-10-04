import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import { useCommittedSearch } from './useCommittedSearch';

describe('useCommittedSearch', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('commits after 400ms of typing', () => {
    const { result } = renderHook(() => useCommittedSearch());

    act(() => result.current.setInput('abc'));
    expect(result.current.committed).toBe('');

    act(() => {
      vi.advanceTimersByTime(400);
    });
    expect(result.current.committed).toBe('abc');
  });

  it('commits an empty string immediately on clear', () => {
    const { result } = renderHook(() => useCommittedSearch());

    act(() => result.current.setInput('abc'));
    act(() => {
      vi.advanceTimersByTime(400);
    });
    expect(result.current.committed).toBe('abc');

    act(() => result.current.clear());
    expect(result.current.committed).toBe('');
  });

  it('does not resurrect the old term after clear + setPage + retype', () => {
    const { result } = renderHook(() => useCommittedSearch());

    act(() => result.current.setInput('abc'));
    act(() => {
      vi.advanceTimersByTime(400);
    });
    expect(result.current.committed).toBe('abc');

    act(() => result.current.setPage(3));
    expect(result.current.page).toBe(3);

    act(() => result.current.clear());
    expect(result.current.committed).toBe('');
    expect(result.current.page).toBe(1);

    act(() => result.current.setInput('abc'));
    act(() => {
      vi.advanceTimersByTime(400);
    });
    expect(result.current.committed).toBe('abc');
    expect(result.current.page).toBe(1);
  });

  it('does not resurrect an earlier page when a commit returns to a term visited before (no clear in between)', () => {
    const { result } = renderHook(() => useCommittedSearch());

    act(() => result.current.setInput('abc'));
    act(() => {
      vi.advanceTimersByTime(400);
    });
    expect(result.current.committed).toBe('abc');

    act(() => result.current.setPage(3));
    expect(result.current.page).toBe(3);

    act(() => result.current.setInput('ab'));
    act(() => {
      vi.advanceTimersByTime(400);
    });
    expect(result.current.committed).toBe('ab');
    expect(result.current.page).toBe(1);

    act(() => result.current.setInput('abc'));
    act(() => {
      vi.advanceTimersByTime(400);
    });
    expect(result.current.committed).toBe('abc');
    expect(result.current.page).toBe(1);
  });

  it('never shows the old term while typing within 400ms after a clear', () => {
    const { result } = renderHook(() => useCommittedSearch());

    act(() => result.current.setInput('abc'));
    act(() => {
      vi.advanceTimersByTime(400);
    });
    expect(result.current.committed).toBe('abc');

    act(() => result.current.clear());
    act(() => result.current.setInput('a'));
    // The pre-clear debounced key (generation 0) is still in flight and would otherwise land here.
    act(() => {
      vi.advanceTimersByTime(200);
    });
    expect(result.current.committed).toBe('');

    act(() => {
      vi.advanceTimersByTime(200);
    });
    expect(result.current.committed).toBe('a');
  });
});
