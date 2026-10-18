import { afterEach, describe, expect, it, vi } from 'vitest';
import { leaveWithoutPrompt, REDIRECT_SETTLE_MS } from './forcedNavigation';

// Registered after the guard, like every page's "unsaved changes" handler.
const dirtyHandler = (e: BeforeUnloadEvent) => {
  e.preventDefault();
  e.returnValue = '';
};
const attempt = () => {
  const event = new Event('beforeunload', { cancelable: true });
  window.dispatchEvent(event);
  return event.defaultPrevented;
};

describe('leaveWithoutPrompt', () => {
  afterEach(() => {
    window.removeEventListener('beforeunload', dirtyHandler);
    vi.useRealTimers();
  });

  // happy-dom fires in registration order (guard first here), so this is not the ordering proof; the
  // real-browser probe is.

  it('suppresses the unsaved-changes prompt only while the app forces the navigation', () => {
    vi.useFakeTimers();
    window.addEventListener('beforeunload', dirtyHandler);

    expect(attempt()).toBe(true);

    let duringGo: boolean | undefined;
    leaveWithoutPrompt(() => (duringGo = attempt()));
    expect(duringGo).toBe(false);
    expect(attempt()).toBe(false); // the navigation itself may fire beforeunload after go() returns

    vi.advanceTimersByTime(REDIRECT_SETTLE_MS);
    expect(attempt()).toBe(true); // the navigation did not happen: later leaves prompt again
  });

  it('re-enables prompts when go() throws', () => {
    vi.useFakeTimers();
    window.addEventListener('beforeunload', dirtyHandler);

    expect(() =>
      leaveWithoutPrompt(() => {
        throw new Error('boom');
      }),
    ).toThrow('boom');
    expect(attempt()).toBe(false);

    vi.advanceTimersByTime(REDIRECT_SETTLE_MS);
    expect(attempt()).toBe(true);
  });

  it('keeps the guard until the newest call settles, not the first', () => {
    vi.useFakeTimers();
    window.addEventListener('beforeunload', dirtyHandler);

    leaveWithoutPrompt(() => {});
    vi.advanceTimersByTime(REDIRECT_SETTLE_MS - 1000);
    leaveWithoutPrompt(() => {});

    vi.advanceTimersByTime(1000); // the first call's timer would have fired here
    expect(attempt()).toBe(false);

    vi.advanceTimersByTime(REDIRECT_SETTLE_MS - 1000);
    expect(attempt()).toBe(true);
  });
});
