import { describe, it, expect } from 'vitest';
import { AxiosError } from 'axios';
import {
  detailRefetchInterval,
  isConsumerDetailLive,
  isGoneOrForbidden,
  isOutboxDetailLive,
  pollRefetchInterval,
  GONE_POLL_INTERVAL_MS,
  POLL_INTERVAL_MS,
} from './detailPolling';

const goneError = (status: 404 | 403) =>
  new AxiosError('x', 'ERR', undefined, undefined, { status } as never);

const serverError = () =>
  new AxiosError('x', 'ERR', undefined, undefined, { status: 502 } as never);

const networkError = () => new AxiosError('Network Error', 'ERR_NETWORK');

describe('isGoneOrForbidden', () => {
  it('is true for a 404', () => {
    expect(isGoneOrForbidden(goneError(404))).toBe(true);
  });

  it('is true for a 403', () => {
    expect(isGoneOrForbidden(goneError(403))).toBe(true);
  });

  it('is false for a 502', () => {
    expect(isGoneOrForbidden(serverError())).toBe(false);
  });

  it('is false for a network error with no response', () => {
    expect(isGoneOrForbidden(networkError())).toBe(false);
  });

  it('is false for a non-axios error', () => {
    expect(isGoneOrForbidden(new Error('boom'))).toBe(false);
  });
});

describe('pollRefetchInterval (summary + list queries)', () => {
  it('polls with no error', () => {
    expect(pollRefetchInterval(null)).toBe(POLL_INTERVAL_MS);
  });

  it('backs off to 60s on a 404 instead of stopping', () => {
    expect(GONE_POLL_INTERVAL_MS).toBe(60_000);
    expect(pollRefetchInterval(goneError(404))).toBe(GONE_POLL_INTERVAL_MS);
  });

  it('backs off to 60s on a 403 instead of stopping', () => {
    expect(pollRefetchInterval(goneError(403))).toBe(GONE_POLL_INTERVAL_MS);
  });

  it('keeps polling at 15s through a 502', () => {
    expect(pollRefetchInterval(serverError())).toBe(POLL_INTERVAL_MS);
  });

  it('keeps polling through a network error with no response', () => {
    expect(pollRefetchInterval(networkError())).toBe(POLL_INTERVAL_MS);
  });
});

type Item = { status: 'live' | 'dead' };
const isLive = (item: Item) => item.status === 'live';

describe('detailRefetchInterval', () => {
  it('is false while closed, even with live data', () => {
    expect(
      detailRefetchInterval(
        { status: 'success', error: null, data: { status: 'live' } },
        false,
        isLive,
      ),
    ).toBe(false);
  });

  it('is false before the first fetch has data (still loading, no error)', () => {
    expect(detailRefetchInterval({ status: 'pending', error: null }, true, isLive)).toBe(false);
  });

  it('polls when the first fetch failed with a 503 and there is no data yet', () => {
    const error = new AxiosError('x', 'ERR', undefined, undefined, { status: 503 } as never);
    expect(detailRefetchInterval({ status: 'error', error }, true, isLive)).toBe(POLL_INTERVAL_MS);
  });

  it('polls when the first fetch failed with a network error and there is no data yet', () => {
    expect(detailRefetchInterval({ status: 'error', error: networkError() }, true, isLive)).toBe(
      POLL_INTERVAL_MS,
    );
  });

  it('stops on a first-fetch 404 with no data', () => {
    expect(detailRefetchInterval({ status: 'error', error: goneError(404) }, true, isLive)).toBe(
      false,
    );
  });

  it('is false while closed, even when the first fetch failed', () => {
    expect(detailRefetchInterval({ status: 'error', error: networkError() }, false, isLive)).toBe(
      false,
    );
  });

  it('stops on a 404', () => {
    expect(
      detailRefetchInterval(
        { status: 'error', error: goneError(404), data: { status: 'live' } },
        true,
        isLive,
      ),
    ).toBe(false);
  });

  it('stops on a 403', () => {
    expect(
      detailRefetchInterval(
        { status: 'error', error: goneError(403), data: { status: 'live' } },
        true,
        isLive,
      ),
    ).toBe(false);
  });

  it('keeps polling live data through a 502', () => {
    expect(
      detailRefetchInterval(
        { status: 'error', error: serverError(), data: { status: 'live' } },
        true,
        isLive,
      ),
    ).toBe(POLL_INTERVAL_MS);
  });

  it('keeps polling live data through a network error with no response', () => {
    expect(
      detailRefetchInterval(
        { status: 'error', error: networkError(), data: { status: 'live' } },
        true,
        isLive,
      ),
    ).toBe(POLL_INTERVAL_MS);
  });

  it('is false when the last-known data is no longer live', () => {
    expect(
      detailRefetchInterval(
        { status: 'success', error: null, data: { status: 'dead' } },
        true,
        isLive,
      ),
    ).toBe(false);
  });

  it('polls live data on a plain success', () => {
    expect(
      detailRefetchInterval(
        { status: 'success', error: null, data: { status: 'live' } },
        true,
        isLive,
      ),
    ).toBe(POLL_INTERVAL_MS);
  });
});

// The two hooks (useGetOutboxMessage / useGetFailedMessage) wire detailRefetchInterval to one of
// these two real "is live" predicates — round 1's per-status cases (previously in
// api/outboxMessages.test.ts) live here now, against the actual predicates rather than a stand-in.
describe('detailRefetchInterval with isOutboxDetailLive (useGetOutboxMessage)', () => {
  it('polls Pending', () => {
    expect(
      detailRefetchInterval(
        { status: 'success', error: null, data: { status: 'Pending' } },
        true,
        isOutboxDetailLive,
      ),
    ).toBe(POLL_INTERVAL_MS);
  });

  it('polls Processing', () => {
    expect(
      detailRefetchInterval(
        { status: 'success', error: null, data: { status: 'Processing' } },
        true,
        isOutboxDetailLive,
      ),
    ).toBe(POLL_INTERVAL_MS);
  });

  it('is false for Failed (terminal until a resend)', () => {
    expect(
      detailRefetchInterval(
        { status: 'success', error: null, data: { status: 'Failed' } },
        true,
        isOutboxDetailLive,
      ),
    ).toBe(false);
  });

  it('is false for Processed (terminal)', () => {
    expect(
      detailRefetchInterval(
        { status: 'success', error: null, data: { status: 'Processed' } },
        true,
        isOutboxDetailLive,
      ),
    ).toBe(false);
  });

  it('stops on a 404', () => {
    expect(
      detailRefetchInterval(
        { status: 'error', error: goneError(404), data: { status: 'Pending' } },
        true,
        isOutboxDetailLive,
      ),
    ).toBe(false);
  });

  it('stops on a 403', () => {
    expect(
      detailRefetchInterval(
        { status: 'error', error: goneError(403), data: { status: 'Pending' } },
        true,
        isOutboxDetailLive,
      ),
    ).toBe(false);
  });

  it('keeps polling Processing data through a 502', () => {
    expect(
      detailRefetchInterval(
        { status: 'error', error: serverError(), data: { status: 'Processing' } },
        true,
        isOutboxDetailLive,
      ),
    ).toBe(POLL_INTERVAL_MS);
  });

  it('keeps polling Pending data through a network error with no response', () => {
    expect(
      detailRefetchInterval(
        { status: 'error', error: networkError(), data: { status: 'Pending' } },
        true,
        isOutboxDetailLive,
      ),
    ).toBe(POLL_INTERVAL_MS);
  });

  it('is false while closed, even with live data', () => {
    expect(
      detailRefetchInterval(
        { status: 'success', error: null, data: { status: 'Pending' } },
        false,
        isOutboxDetailLive,
      ),
    ).toBe(false);
  });

  it('is false before the first fetch has data', () => {
    expect(
      detailRefetchInterval({ status: 'pending', error: null }, true, isOutboxDetailLive),
    ).toBe(false);
  });
});

describe('detailRefetchInterval with isConsumerDetailLive (useGetFailedMessage)', () => {
  it('polls RetryRequested', () => {
    expect(
      detailRefetchInterval(
        { status: 'success', error: null, data: { status: 'RetryRequested' } },
        true,
        isConsumerDetailLive,
      ),
    ).toBe(POLL_INTERVAL_MS);
  });

  it('polls Pending with a retryAvailableAt (still inside the post-fault wait window)', () => {
    expect(
      detailRefetchInterval(
        {
          status: 'success',
          error: null,
          data: { status: 'Pending', retryAvailableAt: '2026-09-27T14:35:00' },
        },
        true,
        isConsumerDetailLive,
      ),
    ).toBe(POLL_INTERVAL_MS);
  });

  it('polls a plain Pending row (another operator may retry/discard it under the open drawer)', () => {
    expect(
      detailRefetchInterval(
        { status: 'success', error: null, data: { status: 'Pending' } },
        true,
        isConsumerDetailLive,
      ),
    ).toBe(POLL_INTERVAL_MS);
  });

  it('is false for Retried', () => {
    expect(
      detailRefetchInterval(
        { status: 'success', error: null, data: { status: 'Retried' } },
        true,
        isConsumerDetailLive,
      ),
    ).toBe(false);
  });

  it('is false for Discarded', () => {
    expect(
      detailRefetchInterval(
        { status: 'success', error: null, data: { status: 'Discarded' } },
        true,
        isConsumerDetailLive,
      ),
    ).toBe(false);
  });

  it('stops on a 404', () => {
    expect(
      detailRefetchInterval(
        { status: 'error', error: goneError(404), data: { status: 'RetryRequested' } },
        true,
        isConsumerDetailLive,
      ),
    ).toBe(false);
  });

  it('stops on a 403', () => {
    expect(
      detailRefetchInterval(
        { status: 'error', error: goneError(403), data: { status: 'RetryRequested' } },
        true,
        isConsumerDetailLive,
      ),
    ).toBe(false);
  });

  it('keeps polling RetryRequested data through a 502', () => {
    expect(
      detailRefetchInterval(
        { status: 'error', error: serverError(), data: { status: 'RetryRequested' } },
        true,
        isConsumerDetailLive,
      ),
    ).toBe(POLL_INTERVAL_MS);
  });

  it('is false while closed, even with live data', () => {
    expect(
      detailRefetchInterval(
        { status: 'success', error: null, data: { status: 'RetryRequested' } },
        false,
        isConsumerDetailLive,
      ),
    ).toBe(false);
  });

  it('is false before the first fetch has data', () => {
    expect(
      detailRefetchInterval({ status: 'pending', error: null }, true, isConsumerDetailLive),
    ).toBe(false);
  });
});
