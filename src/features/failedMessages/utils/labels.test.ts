import { describe, it, expect } from 'vitest';
import type { TFunction } from 'i18next';
import type { OutboxListItem } from '../types';
import {
  consumerStatusTone,
  exceptionTypeLabel,
  moduleLabel,
  outboxStatusLabelKey,
  outboxStatusTone,
  refListText,
  refText,
  refTypeLabel,
  retryAvailableAtLabel,
} from './labels';
import { parseLocalDateTime } from './queueHealth';

const mkOutboxItem = (
  overrides: Partial<OutboxListItem> & Pick<OutboxListItem, 'status'>,
): OutboxListItem => ({
  module: 'request',
  id: 'id-1',
  eventType: 'SomeEvent',
  occurredAt: '2026-09-27T14:30:00',
  retryCount: 0,
  newerSentCount: 0,
  typeResolvable: true,
  failureClass: null,
  ...overrides,
});

// Echoes the key back (optionally with interpolated values appended) instead of a real translation,
// so assertions can check which key + params a call site reached for without needing real locale data.
const fakeT = ((key: string) => key) as unknown as TFunction<'failedMessages'>;
// Same, but appends the interpolated count, for the count-bearing keys refListText reaches for.
const countT = ((key: string, opts?: { count?: number }) =>
  opts?.count === undefined
    ? key
    : `${key}:${opts.count}`) as unknown as TFunction<'failedMessages'>;

describe('refTypeLabel', () => {
  it('translates a known refType', () => {
    expect(refTypeLabel(fakeT, 'appraisal')).toBe('refType.appraisal');
  });

  it('is empty when refType is missing', () => {
    expect(refTypeLabel(fakeT, undefined)).toBe('');
  });
});

describe('moduleLabel', () => {
  it('translates a module', () => {
    expect(moduleLabel(fakeT, 'appraisal')).toBe('modules.appraisal');
  });
});

describe('exceptionTypeLabel', () => {
  it('is the "no consumer" key for the stored Skipped sentinel, with or without a kind', () => {
    expect(exceptionTypeLabel(fakeT, 'Skipped', 'Skipped')).toBe('table.noConsumer');
    expect(exceptionTypeLabel(fakeT, 'Skipped')).toBe('table.noConsumer');
  });

  it('is the "no consumer" key for a Skipped-kind row, whatever type it stored', () => {
    expect(exceptionTypeLabel(fakeT, 'System.TimeoutException', 'Skipped')).toBe(
      'table.noConsumer',
    );
  });

  it('is the short type name for an Error row', () => {
    expect(exceptionTypeLabel(fakeT, 'System.TimeoutException', 'Error')).toBe('TimeoutException');
  });
});

describe('consumerStatusTone', () => {
  it('maps every status to its tone', () => {
    expect(consumerStatusTone('Pending')).toBe('red');
    expect(consumerStatusTone('RetryRequested')).toBe('sky');
    expect(consumerStatusTone('Retried')).toBe('emerald');
    expect(consumerStatusTone('Discarded')).toBe('gray');
  });
});

describe('outboxStatusTone', () => {
  it('is red for Failed, sky for Pending, emerald for Processed', () => {
    expect(outboxStatusTone(mkOutboxItem({ status: 'Failed' }), null)).toBe('red');
    expect(outboxStatusTone(mkOutboxItem({ status: 'Pending' }), null)).toBe('sky');
    expect(outboxStatusTone(mkOutboxItem({ status: 'Processed' }), null)).toBe('emerald');
  });

  it('is sky for Processing under the stuck threshold, amber once stuck', () => {
    const started = '2026-09-27T14:30:00';
    const base = parseLocalDateTime(started);
    const item = mkOutboxItem({ status: 'Processing', processingStartedAt: started });
    expect(outboxStatusTone(item, new Date(base.getTime() + 60_000))).toBe('sky');
    expect(outboxStatusTone(item, new Date(base.getTime() + 180_000))).toBe('amber');
  });
});

describe('outboxStatusLabelKey', () => {
  const started = '2026-09-27T14:30:00';
  const base = parseLocalDateTime(started);
  const processing = mkOutboxItem({ status: 'Processing', processingStartedAt: started });

  it('is the Processing key at 1 minute', () => {
    expect(outboxStatusLabelKey(processing, new Date(base.getTime() + 60_000))).toBe(
      'outboxStatus.Processing',
    );
  });

  it('is the Stuck key at 3 minutes', () => {
    expect(outboxStatusLabelKey(processing, new Date(base.getTime() + 180_000))).toBe(
      'outboxStatus.Stuck',
    );
  });

  it('is the Processing key when now is null', () => {
    expect(outboxStatusLabelKey(processing, null)).toBe('outboxStatus.Processing');
  });

  it('is the Failed key for a Failed row', () => {
    expect(outboxStatusLabelKey(mkOutboxItem({ status: 'Failed' }), null)).toBe(
      'outboxStatus.Failed',
    );
  });
});

describe('retryAvailableAtLabel', () => {
  it('renders the available-from time for a parseable value', () => {
    expect(retryAvailableAtLabel(fakeT, '2026-09-27T14:35:00')).toBe('list.retryAvailableAt');
  });

  it('passes the time rounded UP to the next whole minute when there are seconds', () => {
    const timeFor = (v: string) => {
      let time: unknown;
      const t = ((_key: string, opts?: { time: string }) => {
        time = opts?.time;
        return _key;
      }) as unknown as TFunction<'failedMessages'>;
      retryAvailableAtLabel(t, v);
      return time;
    };
    expect(timeFor('2026-09-27T09:05:50')).toBe('09:06');
    expect(timeFor('2026-09-27T09:05:00')).toBe('09:05');
  });

  it('falls back to the unknown-time key when value is missing', () => {
    expect(retryAvailableAtLabel(fakeT, undefined)).toBe('list.retryTimeUnknown');
  });

  it('falls back to the unknown-time key for a zone-suffixed (unparseable) value', () => {
    expect(retryAvailableAtLabel(fakeT, '2026-09-27T14:35:00Z')).toBe('list.retryTimeUnknown');
  });
});

describe('refText', () => {
  it('uses the label + refNumber when a number resolved', () => {
    expect(refText(fakeT, { refType: 'appraisal', refNumber: 'AP-2026-00042' })).toBe(
      'refType.appraisal AP-2026-00042',
    );
  });

  it('falls back to the label + a short id when only refId resolved', () => {
    expect(
      refText(fakeT, { refType: 'request', refId: '8f2c1234-2d1b-7a90-8e22-3c4d5e6f7a80' }),
    ).toBe('refType.request 8f2c1234');
  });

  it('falls back to "this item" when neither resolved', () => {
    expect(refText(fakeT, {})).toBe('drawer.thisItem');
  });
});

describe('refListText', () => {
  it('lists the distinct real references, de-duplicated', () => {
    expect(
      refListText(countT, [
        { refType: 'appraisal', refNumber: 'AP-1' },
        { refType: 'appraisal', refNumber: 'AP-1' },
        { refType: 'request', refNumber: 'RQ-2' },
      ]),
    ).toBe('refType.appraisal AP-1, refType.request RQ-2');
  });

  it('summarises reference-less items as a count after the real references', () => {
    expect(refListText(countT, [{ refType: 'appraisal', refNumber: 'AP-1' }, {}, {}])).toBe(
      'refType.appraisal AP-1, confirm.itemsWithoutReference:2',
    );
  });

  it('is just the count when no item has a reference — never "this item" repeated', () => {
    const text = refListText(countT, [{}, {}, {}]);

    expect(text).toBe('confirm.itemsWithoutReference:3');
    expect(text).not.toContain('drawer.thisItem');
  });
});

describe('assumeStuck (the Stuck tab, clock unknown)', () => {
  const processing = mkOutboxItem({
    status: 'Processing',
    processingStartedAt: '2026-09-27T14:30:00',
  });

  it('reads as Stuck with a null clock when the server already said so', () => {
    expect(outboxStatusLabelKey(processing, null, true)).toBe('outboxStatus.Stuck');
    expect(outboxStatusTone(processing, null, true)).toBe('amber');
  });

  it('does not turn a non-Processing row into Stuck', () => {
    expect(outboxStatusLabelKey(mkOutboxItem({ status: 'Failed' }), null, true)).toBe(
      'outboxStatus.Failed',
    );
  });
});
