import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

const me = vi.hoisted(() => vi.fn());
vi.mock('@features/auth/api', () => ({
  refreshCurrentUser: () => me(),
}));
vi.mock('@shared/utils/signalrLogger', () => ({ signalrLogger: {} }));

// A connection whose handshake always fails, and which records the handlers appHub registers.
const conn = vi.hoisted(() => ({
  state: 'Disconnected',
  retryPolicy: undefined as
    | { nextRetryDelayInMilliseconds: (ctx: { previousRetryCount: number }) => number | null }
    | undefined,
  urlOptions: [] as Record<string, unknown>[],
  start: (() => Promise.resolve()) as (...args: unknown[]) => Promise<void>,
  invoke: vi.fn<(...args: unknown[]) => Promise<void>>(() => Promise.resolve()),
  onclose: undefined as (() => void) | undefined,
}));
vi.mock('@microsoft/signalr', () => {
  const builder = {
    withUrl: (_url: string, options: Record<string, unknown>) => {
      conn.urlOptions.push(options);
      return builder;
    },
    withAutomaticReconnect: (policy: NonNullable<typeof conn.retryPolicy>) => {
      conn.retryPolicy = policy;
      return builder;
    },
    configureLogging: () => builder,
    build: () => ({
      get state() {
        return conn.state;
      },
      start: () => conn.start(),
      stop: vi.fn(() => Promise.resolve()),
      on: vi.fn(),
      onreconnecting: vi.fn(),
      onreconnected: vi.fn(),
      invoke: (...args: unknown[]) => conn.invoke(...args),
      onclose: (cb: () => void) => {
        conn.onclose = cb;
      },
    }),
  };
  return {
    // A plain class, not vi.fn(): restoreMocks would wipe a mocked constructor's implementation.
    HubConnectionBuilder: class {
      constructor() {
        return builder;
      }
    },
    HubConnectionState: { Disconnected: 'Disconnected', Connected: 'Connected' },
    HttpTransportType: { WebSockets: 1 },
  };
});

describe('appHub session check', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.resetModules();
    conn.urlOptions = [];
    conn.start = vi.fn().mockRejectedValue(new Error('handshake failed'));
    me.mockResolvedValue({});
    vi.spyOn(console, 'warn').mockImplementation(() => {});
  });
  afterEach(() => vi.useRealTimers());

  it('pings /auth/me before each restart', async () => {
    const hub = await import('./appHub');
    await hub.start('ann').catch(() => {});

    // Failed start() schedules a restart; the ping happens when that timer fires.
    expect(me).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(5000);
    expect(me).toHaveBeenCalledTimes(1);
    await hub.stop();
  });

  it('pings /auth/me before reconnect attempts, one at a time and at most once a minute', async () => {
    conn.start = vi.fn().mockResolvedValue(undefined);
    const hub = await import('./appHub');
    await hub.start('ann');
    const delayFor = (previousRetryCount: number) =>
      conn.retryPolicy!.nextRetryDelayInMilliseconds({ previousRetryCount });

    delayFor(0);
    delayFor(1); // the first check is still in flight: no second request
    expect(me).toHaveBeenCalledTimes(1);

    await vi.advanceTimersByTimeAsync(0); // first check settles
    delayFor(2); // ...but not again within the minute
    expect(me).toHaveBeenCalledTimes(1);

    await vi.advanceTimersByTimeAsync(60_000);
    delayFor(3);
    expect(me).toHaveBeenCalledTimes(2);
    await hub.stop();
  });

  it('keeps the capped backoff while checking', async () => {
    const hub = await import('./appHub');
    await hub.start('ann').catch(() => {});
    const policy = conn.retryPolicy!;
    expect(policy.nextRetryDelayInMilliseconds({ previousRetryCount: 0 })).toBe(0);
    expect(policy.nextRetryDelayInMilliseconds({ previousRetryCount: 1 })).toBe(2000);
    expect(policy.nextRetryDelayInMilliseconds({ previousRetryCount: 20 })).toBe(30000);
    await hub.stop();
  });

  it('keeps retrying when the check itself fails (offline, 5xx)', async () => {
    me.mockRejectedValue(new Error('network'));
    const hub = await import('./appHub');
    await hub.start('ann').catch(() => {});
    await vi.advanceTimersByTimeAsync(5000);
    expect(conn.start).toHaveBeenCalledTimes(4); // initial ws-only + fallback, then restart ws-only + fallback
    await hub.stop();
  });

  it('sends credentials with every connection attempt, negotiate included', async () => {
    const hub = await import('./appHub');
    await hub.start('ann').catch(() => {});
    // ws-only attempt, then the negotiating fallback .
    expect(conn.urlOptions).toHaveLength(2);
    for (const options of conn.urlOptions) {
      expect(options).toMatchObject({ withCredentials: true });
    }
    await hub.stop();
  });

  describe('groups asked for before the connection is up', () => {
    const up = () =>
      vi.fn().mockImplementation(async () => {
        conn.state = 'Connected';
      });
    beforeEach(() => {
      conn.state = 'Disconnected';
      conn.invoke.mockClear();
      conn.start = up();
    });

    it('are joined once the first start succeeds', async () => {
      const hub = await import('./appHub');
      await hub.joinGroup('pool-IntAdmin');
      expect(conn.invoke).not.toHaveBeenCalled();

      await hub.start('ann');
      expect(conn.invoke).toHaveBeenCalledWith('JoinGroup', 'pool-IntAdmin');
      await hub.stop();
    });

    it('are joined together, not one after the other', async () => {
      const hub = await import('./appHub');
      await hub.joinGroup('pool-A');
      await hub.joinGroup('pool-B');
      const releases: (() => void)[] = [];
      conn.invoke.mockImplementation(
        () =>
          new Promise<void>(resolve => {
            releases.push(resolve);
          }),
      );
      const started = hub.start('ann');
      await vi.advanceTimersByTimeAsync(0);
      // both are out before either has answered
      expect(conn.invoke).toHaveBeenCalledTimes(2);
      releases.forEach(r => r());
      await started;
      await hub.stop();
      conn.invoke.mockImplementation(() => Promise.resolve());
    });

    it('do not turn a connection that closed meanwhile back into connected', async () => {
      const hub = await import('./appHub');
      await hub.joinGroup('pool-A');
      let release!: () => void;
      conn.invoke.mockImplementation(
        () =>
          new Promise<void>(resolve => {
            release = resolve;
          }),
      );
      const started = hub.start('ann');
      await vi.advanceTimersByTimeAsync(0);
      // the socket drops while the groups are being joined
      conn.state = 'Disconnected';
      conn.onclose!();
      release();
      await started;
      expect(hub.getStatus()).toBe('disconnected');
      await hub.stop();
      conn.invoke.mockImplementation(() => Promise.resolve());
    });

    it('are joined again after a restart, and a group left in between is not', async () => {
      const hub = await import('./appHub');
      await hub.start('ann');
      await hub.joinGroup('pool-IntAdmin');
      await hub.joinGroup('pool-Other');
      await hub.leaveGroup('pool-Other');
      expect(conn.invoke).toHaveBeenCalledWith('JoinGroup', 'pool-IntAdmin');

      // the connection is lost for good: the hub rebuilds it after its restart delay
      conn.invoke.mockClear();
      conn.state = 'Disconnected';
      conn.onclose!();
      await vi.advanceTimersByTimeAsync(5000);
      expect(conn.invoke).toHaveBeenCalledTimes(1);
      expect(conn.invoke).toHaveBeenCalledWith('JoinGroup', 'pool-IntAdmin');
      await hub.stop();
    });
  });
});
