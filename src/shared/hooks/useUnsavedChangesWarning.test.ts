import { describe, expect, it } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useUnsavedChangesWarning } from './useUnsavedChangesWarning';

/**
 * skipWarning() is for the navigation that immediately follows it (save → navigate). The pages are
 * reused across that navigation (create → `/:id` keeps the component mounted), so the skip must
 * lift once the form is edited again, or the guard stays off for the rest of the visit.
 */
describe('useUnsavedChangesWarning', () => {
  it('lets the navigation after skipWarning() through', () => {
    const { result } = renderHook(({ dirty }) => useUnsavedChangesWarning(dirty), {
      initialProps: { dirty: true },
    });

    act(() => result.current.skipWarning());

    expect(result.current.blocker.skipRef.current).toBe(true);
  });

  it('guards again once the form is edited after the skipped navigation', () => {
    const { result, rerender } = renderHook(({ dirty }) => useUnsavedChangesWarning(dirty), {
      initialProps: { dirty: true },
    });

    act(() => result.current.skipWarning());
    rerender({ dirty: false }); // saved, navigated, record reloaded
    rerender({ dirty: true }); // the user edits the same page instance

    expect(result.current.blocker.when).toBe(true);
    expect(result.current.blocker.skipRef.current).toBe(false);
  });
});
