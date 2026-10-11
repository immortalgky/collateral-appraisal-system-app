import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

const load = async () => {
  vi.resetModules();
  return import('./userActivity');
};

describe('isUserDriven', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('counts the page load as user activity', async () => {
    const { isUserDriven } = await load();
    expect(isUserDriven()).toBe(true);
  });

  it('turns background once 10 s pass without input', async () => {
    const { isUserDriven } = await load();
    vi.advanceTimersByTime(10_000);
    expect(isUserDriven()).toBe(true);
    vi.advanceTimersByTime(1);
    expect(isUserDriven()).toBe(false);
  });

  it.each(['pointerdown', 'keydown', 'wheel', 'touchstart'])(
    'goes back to user-driven on %s and expires again 10 s later',
    async type => {
      const { isUserDriven } = await load();
      vi.advanceTimersByTime(60_000);
      expect(isUserDriven()).toBe(false);

      window.dispatchEvent(new Event(type));
      expect(isUserDriven()).toBe(true);
      vi.advanceTimersByTime(10_001);
      expect(isUserDriven()).toBe(false);
    },
  );

  it('sees input even when a handler stops its propagation (capture phase)', async () => {
    const { isUserDriven } = await load();
    const button = document.createElement('button');
    button.addEventListener('pointerdown', e => e.stopPropagation());
    document.body.append(button);
    vi.advanceTimersByTime(60_000);

    button.dispatchEvent(new Event('pointerdown', { bubbles: true }));
    expect(isUserDriven()).toBe(true);
    button.remove();
  });

  it('ignores events that are not user input', async () => {
    const { isUserDriven } = await load();
    vi.advanceTimersByTime(60_000);
    window.dispatchEvent(new Event('scroll'));
    window.dispatchEvent(new Event('focus'));
    expect(isUserDriven()).toBe(false);
  });

  describe('keep-alive', () => {
    const MIN = 60_000;
    const type = (n = 1) => {
      for (let i = 0; i < n; i++) window.dispatchEvent(new Event('keydown'));
    };

    it('pings on input once the API has not heard from the user for 5 minutes', async () => {
      const { startKeepAlive } = await load();
      const ping = vi.fn();
      const stop = startKeepAlive(ping);

      type(); // just loaded: the API heard from us a moment ago
      expect(ping).not.toHaveBeenCalled();

      vi.advanceTimersByTime(5 * MIN);
      type(3); // a burst of typing is one ping, not three
      expect(ping).toHaveBeenCalledTimes(1);

      vi.advanceTimersByTime(4 * MIN);
      type();
      expect(ping).toHaveBeenCalledTimes(1);
      vi.advanceTimersByTime(MIN);
      type();
      expect(ping).toHaveBeenCalledTimes(2);
      stop();
    });

    it('sends nothing without input, however long the tab sits', async () => {
      const { startKeepAlive } = await load();
      const ping = vi.fn();
      startKeepAlive(ping);
      vi.advanceTimersByTime(60 * MIN);
      expect(ping).not.toHaveBeenCalled();
    });

    it('does not ping when a user-driven request went out recently', async () => {
      const { startKeepAlive, recordUserRequest } = await load();
      const ping = vi.fn();
      startKeepAlive(ping);
      vi.advanceTimersByTime(4 * MIN);
      recordUserRequest();
      vi.advanceTimersByTime(2 * MIN);
      type();
      expect(ping).not.toHaveBeenCalled();
    });

    it('pings once however many components start it, and keeps going until the last stops', async () => {
      const { startKeepAlive } = await load();
      const ping = vi.fn();
      const stopA = startKeepAlive(ping);
      const stopB = startKeepAlive(ping); // e.g. nested routes
      vi.advanceTimersByTime(5 * MIN);
      type(2);
      expect(ping).toHaveBeenCalledTimes(1);

      stopA(); // one of them unmounting must not switch it off
      vi.advanceTimersByTime(5 * MIN);
      type();
      expect(ping).toHaveBeenCalledTimes(2);

      stopB();
      vi.advanceTimersByTime(5 * MIN);
      type();
      expect(ping).toHaveBeenCalledTimes(2);
    });

    it('stops listening once stopped', async () => {
      const { startKeepAlive } = await load();
      const ping = vi.fn();
      startKeepAlive(ping)();
      vi.advanceTimersByTime(10 * MIN);
      type();
      expect(ping).not.toHaveBeenCalled();
    });

    it('sends the ping as a user-driven request (input just happened)', async () => {
      const { startKeepAlive, isUserDriven } = await load();
      let driven: boolean | undefined;
      startKeepAlive(() => {
        driven = isUserDriven();
      });
      vi.advanceTimersByTime(10 * MIN);
      type();
      expect(driven).toBe(true);
    });
  });
});
