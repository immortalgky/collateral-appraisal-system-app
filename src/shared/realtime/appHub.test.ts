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
      onclose: vi.fn(),
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
});
