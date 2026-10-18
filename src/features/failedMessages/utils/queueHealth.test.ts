import { describe, it, expect } from 'vitest';
import type { NodeHealth, OutboxListItem, QueueHealth } from '../types';
import {
  canDiscard,
  canRetry,
  classifyOutboxFailure,
  committedSearch,
  confirmDoneEffects,
  countBy,
  deriveCollectorState,
  displayQueueName,
  elapsedParts,
  formatClock,
  formatClockCeilMinute,
  formatClockOrDateTime,
  formatDateTime,
  groupRetrySelection,
  isOutboxSelectable,
  isStale,
  isStuck,
  isTopGroupActive,
  outboxKey,
  outboxTableName,
  parseLocalDateTime,
  queueSeverity,
  refHref,
  serverClock,
  serverOffsetMs,
  shortEventType,
  shortMessageType,
  shortTypeName,
  sortQueuesBySeverity,
  sparklineGeometry,
  SPARK_WIDTH,
  tabCountChip,
  toggleAllInMap,
  toggleInMap,
} from './queueHealth';

const mkQueue = (overrides: Partial<QueueHealth> & Pick<QueueHealth, 'name'>): QueueHealth => ({
  samples: [],
  errorCount: 0,
  skippedCount: 0,
  isOrdered: true,
  ...overrides,
});

describe('parseLocalDateTime', () => {
  it('parses a whole-second value with no fractional part', () => {
    const d = parseLocalDateTime('2026-09-27T09:00:00');
    expect(d.getFullYear()).toBe(2026);
    expect(d.getMonth()).toBe(8);
    expect(d.getDate()).toBe(27);
    expect(d.getHours()).toBe(9);
    expect(d.getMinutes()).toBe(0);
    expect(d.getSeconds()).toBe(0);
    expect(d.getMilliseconds()).toBe(0);
  });

  it('truncates 7-digit fractional seconds to milliseconds', () => {
    const d = parseLocalDateTime('2026-09-27T14:32:05.1234567');
    expect(d.getSeconds()).toBe(5);
    expect(d.getMilliseconds()).toBe(123);
  });

  it('returns an invalid Date for unparseable input', () => {
    expect(isNaN(parseLocalDateTime('not-a-date').getTime())).toBe(true);
  });

  it('builds a local Date, not a UTC-shifted one', () => {
    // Regardless of the runner's timezone, the wire hour (09) must equal the local hour read back —
    // Date.parse()/`new Date(string)` on a Z-less string would apply the runner's offset instead.
    const d = parseLocalDateTime('2026-09-27T09:00:00');
    expect(d.getHours()).toBe(9);
  });
});

describe('isStale', () => {
  const base = parseLocalDateTime('2026-09-27T14:30:00');

  it('is false at 119s', () => {
    const now = new Date(base.getTime() + 119_000);
    expect(isStale('2026-09-27T14:30:00', now)).toBe(false);
  });

  it('is true at 121s', () => {
    const now = new Date(base.getTime() + 121_000);
    expect(isStale('2026-09-27T14:30:00', now)).toBe(true);
  });

  it('is false (unknown, not stale) for an invalid collectedAt', () => {
    expect(isStale('garbage', new Date())).toBe(false);
  });

  it('is false for a zone-suffixed collectedAt the strict parser rejects', () => {
    expect(isStale('2026-09-27T14:30:00Z', new Date())).toBe(false);
    expect(isStale('2026-09-27T14:30:00+07:00', new Date())).toBe(false);
  });

  it('gives no marking (false) when the clock is unknown, even for an old collectedAt', () => {
    expect(isStale('2020-01-01T00:00:00', null)).toBe(false);
  });

  it('is false (unknown, not stale) for a missing collectedAt — a node with no snapshot yet', () => {
    expect(isStale(undefined, new Date())).toBe(false);
  });
});

describe('elapsedParts', () => {
  it('splits elapsed time into hours and minutes, floored', () => {
    const base = parseLocalDateTime('2026-09-27T09:00:00');
    const now = new Date(base.getTime() + (2 * 3600 + 15 * 60) * 1000);
    expect(elapsedParts('2026-09-27T09:00:00', now)).toEqual({ hours: 2, minutes: 15 });
  });

  it('is null for an invalid "from" — no elapsed marking rather than 0h 0m', () => {
    expect(elapsedParts('garbage', new Date())).toBeNull();
  });

  it('is null for a zone-suffixed "from" the strict parser rejects', () => {
    expect(elapsedParts('2026-09-27T09:00:00Z', new Date())).toBeNull();
    expect(elapsedParts('2026-09-27T09:00:00+07:00', new Date())).toBeNull();
  });

  it('carries minutes past 60 into hours instead of reporting the remainder alone', () => {
    const base = parseLocalDateTime('2026-09-27T09:00:00');
    const now = new Date(base.getTime() + 65 * 60 * 1000);
    expect(elapsedParts('2026-09-27T09:00:00', now)).toEqual({ hours: 1, minutes: 5 });
  });
});

describe('serverOffsetMs', () => {
  it('is the gap between the server clock and the client clock at fetch time', () => {
    const dataUpdatedAt = 1_700_000_000_000;
    const offset = serverOffsetMs('2026-09-27T14:30:30', dataUpdatedAt);
    expect(offset).toBe(parseLocalDateTime('2026-09-27T14:30:30').getTime() - dataUpdatedAt);
  });

  it('is null when serverTime is missing', () => {
    expect(serverOffsetMs(undefined, 0)).toBeNull();
  });

  it('is null when serverTime does not parse', () => {
    expect(serverOffsetMs('garbage', 0)).toBeNull();
  });

  it('is null for a zone-suffixed serverTime the strict parser rejects', () => {
    expect(serverOffsetMs('2026-09-27T14:30:00Z', 0)).toBeNull();
    expect(serverOffsetMs('2026-09-27T14:30:00+07:00', 0)).toBeNull();
  });
});

describe('serverClock', () => {
  it('is null when the offset is unknown', () => {
    expect(serverClock(null, Date.now())).toBeNull();
  });

  it('applies the offset to the client clock', () => {
    const now = serverClock(5_000, 1_700_000_000_000);
    expect(now).not.toBeNull();
    expect(now!.getTime()).toBe(1_700_000_005_000);
  });

  it('never reads as stale because of a client clock hours behind (or in another zone than) the server', () => {
    // The client clock at fetch time is wildly off from the server's — once folded into an offset
    // and applied to a later client tick, staleness must track server-relative time only.
    const serverTimeAtFetch = '2026-09-27T14:30:00';
    const dataUpdatedAt = Date.UTC(2020, 0, 1);
    const offset = serverOffsetMs(serverTimeAtFetch, dataUpdatedAt)!;
    const now = serverClock(offset, dataUpdatedAt + 30_000); // 30s later, client-side
    expect(isStale('2026-09-27T14:30:00', now)).toBe(false);
  });

  it('still reports stale once enough server-relative time has actually passed', () => {
    const offset = serverOffsetMs('2026-09-27T14:33:00', 1_700_000_000_000)!;
    const now = serverClock(offset, 1_700_000_000_000);
    expect(isStale('2026-09-27T14:30:00', now)).toBe(true);
  });
});

describe('tabCountChip', () => {
  const summaryCounts = { Pending: 12 };

  it('with filters, only the active tab shows the list count', () => {
    const base = { hasFilters: true, listCount: 3, summaryCounts };
    expect(tabCountChip({ tab: 'Pending', activeTab: 'Pending', ...base })).toBe(3);
    expect(tabCountChip({ tab: 'Retried', activeTab: 'Pending', ...base })).toBeUndefined();
  });

  it('with filters, a summary count is ignored even on its own tab', () => {
    expect(
      tabCountChip({
        tab: 'Pending',
        activeTab: 'Retried',
        hasFilters: true,
        listCount: 3,
        summaryCounts,
      }),
    ).toBeUndefined();
  });

  it('without filters, an inactive tab with a summary count shows it', () => {
    const base = { hasFilters: false, listCount: 3, summaryCounts };
    expect(tabCountChip({ tab: 'Pending', activeTab: 'Retried', ...base })).toBe(12);
  });

  it('without filters, the active tab prefers the list count (what the pager shows) over the summary', () => {
    const base = { hasFilters: false, listCount: 3, summaryCounts };
    expect(tabCountChip({ tab: 'Pending', activeTab: 'Pending', ...base })).toBe(3);
  });

  it('without filters, the active tab falls back to the summary count while the list is loading', () => {
    const base = { hasFilters: false, listCount: undefined, summaryCounts };
    expect(tabCountChip({ tab: 'Pending', activeTab: 'Pending', ...base })).toBe(12);
  });

  it('without filters, the active tab with no summary count shows the list count', () => {
    expect(
      tabCountChip({
        tab: 'Retried',
        activeTab: 'Retried',
        hasFilters: false,
        listCount: 7,
        summaryCounts,
      }),
    ).toBe(7);
  });

  it('without filters, an inactive tab with no summary count shows nothing', () => {
    expect(
      tabCountChip({
        tab: 'Retried',
        activeTab: 'Pending',
        hasFilters: false,
        listCount: 7,
        summaryCounts,
      }),
    ).toBeUndefined();
  });
});

describe('queueSeverity', () => {
  it('is crit when there are no consumers and messages are waiting', () => {
    const q = mkQueue({ name: 'q', consumers: 0, ready: 5 });
    expect(queueSeverity(q)).toBe('crit');
  });

  it('is warn when errorCount is positive', () => {
    const q = mkQueue({ name: 'q', consumers: 2, ready: 5, errorCount: 1 });
    expect(queueSeverity(q)).toBe('warn');
  });

  it('is warn when the queue is growing', () => {
    const q = mkQueue({ name: 'q', consumers: 2, ready: 100, publishRate: 5, deliverRate: 1 });
    expect(queueSeverity(q)).toBe('warn');
  });

  it('is ok otherwise', () => {
    const q = mkQueue({ name: 'q', consumers: 2, ready: 5 });
    expect(queueSeverity(q)).toBe('ok');
  });

  it('never reports crit when broker fields are missing', () => {
    const q = mkQueue({ name: 'q' });
    expect(queueSeverity(q)).not.toBe('crit');
  });
});

describe('sortQueuesBySeverity', () => {
  it('orders crit, then warn, then ok', () => {
    const ok = mkQueue({ name: 'c-ok', consumers: 2, ready: 1 });
    const warn = mkQueue({ name: 'b-warn', consumers: 2, ready: 1, errorCount: 1 });
    const crit = mkQueue({ name: 'a-crit', consumers: 0, ready: 1 });
    expect(sortQueuesBySeverity([ok, warn, crit]).map(q => q.name)).toEqual([
      'a-crit',
      'b-warn',
      'c-ok',
    ]);
  });

  it('falls back to ready desc, then name asc within the same severity', () => {
    const a = mkQueue({ name: 'z', consumers: 2, ready: 1 });
    const b = mkQueue({ name: 'a', consumers: 2, ready: 5 });
    const c = mkQueue({ name: 'y', consumers: 2, ready: 1 });
    expect(sortQueuesBySeverity([a, b, c]).map(q => q.name)).toEqual(['a', 'y', 'z']);
  });
});

describe('sparklineGeometry', () => {
  it('is null for zero samples', () => {
    expect(sparklineGeometry([])).toBeNull();
  });

  it('draws a flat full-width line for a single sample', () => {
    const geo = sparklineGeometry([5]);
    expect(geo).not.toBeNull();
    expect(geo!.last).toEqual({ x: SPARK_WIDTH, y: 4 });
    expect(geo!.line).toBe(`M0.0,4.0 L${SPARK_WIDTH}.0,4.0`);
  });

  it('spans x=0 to x=width, puts the max at y=4 and zero at the baseline', () => {
    const samples = [10, ...Array(28).fill(1), 0];
    const geo = sparklineGeometry(samples, SPARK_WIDTH, 30);
    expect(geo).not.toBeNull();
    expect(geo!.line.startsWith('M0.0,4.0')).toBe(true); // first sample (10) is the max → top
    expect(geo!.last).toEqual({ x: SPARK_WIDTH, y: 28 }); // last sample (0) → baseline
  });

  it('clamps negative samples to zero', () => {
    const geo = sparklineGeometry([-5, 4]);
    expect(geo!.line.startsWith('M0.0,28.0')).toBe(true);
  });
});

describe('displayQueueName', () => {
  it('appends the lowercased kind', () => {
    expect(displayQueueName('appraisal-sync', 'Error')).toBe('appraisal-sync_error');
    expect(displayQueueName('appraisal-sync', 'Skipped')).toBe('appraisal-sync_skipped');
  });
});

describe('canRetry', () => {
  const now = parseLocalDateTime('2026-09-27T14:30:00');

  it('is true for Pending with no retryAvailableAt', () => {
    expect(canRetry({ status: 'Pending' }, now)).toBe(true);
  });

  it('is false for Pending with a future retryAvailableAt', () => {
    expect(canRetry({ status: 'Pending', retryAvailableAt: '2026-09-27T14:35:00' }, now)).toBe(
      false,
    );
  });

  it('is true for Pending with a past retryAvailableAt', () => {
    expect(canRetry({ status: 'Pending', retryAvailableAt: '2026-09-27T14:25:00' }, now)).toBe(
      true,
    );
  });

  it('is false for a present retryAvailableAt when now is null', () => {
    expect(canRetry({ status: 'Pending', retryAvailableAt: '2026-09-27T14:25:00' }, null)).toBe(
      false,
    );
  });

  it('is false for RetryRequested, Retried and Discarded', () => {
    expect(canRetry({ status: 'RetryRequested' }, now)).toBe(false);
    expect(canRetry({ status: 'Retried' }, now)).toBe(false);
    expect(canRetry({ status: 'Discarded' }, now)).toBe(false);
  });

  it('is false for a zone-suffixed retryAvailableAt the strict parser rejects, even with a known clock', () => {
    expect(canRetry({ status: 'Pending', retryAvailableAt: '2026-09-27T14:35:00Z' }, now)).toBe(
      false,
    );
    expect(
      canRetry({ status: 'Pending', retryAvailableAt: '2026-09-27T14:35:00+07:00' }, now),
    ).toBe(false);
  });
});

describe('canDiscard', () => {
  it('is true for Pending and RetryRequested', () => {
    expect(canDiscard({ status: 'Pending' })).toBe(true);
    expect(canDiscard({ status: 'RetryRequested' })).toBe(true);
  });

  it('is false for Retried and Discarded', () => {
    expect(canDiscard({ status: 'Retried' })).toBe(false);
    expect(canDiscard({ status: 'Discarded' })).toBe(false);
  });
});

describe('groupRetrySelection', () => {
  const now = parseLocalDateTime('2026-09-27T14:30:00');

  it('buckets a mixed selection into sendable, waitingToSend and tooSoon', () => {
    const sendableItem = { status: 'Pending' as const };
    const waitingItem = { status: 'RetryRequested' as const };
    const tooSoonItem = { status: 'Pending' as const, retryAvailableAt: '2026-09-27T14:35:00' };
    const discardedItem = { status: 'Discarded' as const };
    const result = groupRetrySelection(
      [sendableItem, waitingItem, tooSoonItem, discardedItem],
      now,
    );
    expect(result.sendable).toEqual([sendableItem]);
    expect(result.waitingToSend).toEqual([waitingItem]);
    expect(result.tooSoon).toEqual([tooSoonItem]);
  });

  it('is all tooSoon when every Pending row is still inside its wait window', () => {
    const items = [
      { status: 'Pending' as const, retryAvailableAt: '2026-09-27T14:31:00' },
      { status: 'Pending' as const, retryAvailableAt: '2026-09-27T14:40:00' },
    ];
    const result = groupRetrySelection(items, now);
    expect(result.sendable).toEqual([]);
    expect(result.tooSoon).toEqual(items);
  });

  it('treats a present retryAvailableAt as tooSoon when now is null (unknown clock)', () => {
    const item = { status: 'Pending' as const, retryAvailableAt: '2026-09-27T14:35:00' };
    const result = groupRetrySelection([item], null);
    expect(result.sendable).toEqual([]);
    expect(result.tooSoon).toEqual([item]);
  });

  it('treats a zone-suffixed (unparseable) retryAvailableAt as tooSoon, even with a known clock', () => {
    const item = { status: 'Pending' as const, retryAvailableAt: '2026-09-27T14:35:00Z' };
    const result = groupRetrySelection([item], now);
    expect(result.sendable).toEqual([]);
    expect(result.tooSoon).toEqual([item]);
  });
});

describe('outboxKey', () => {
  it('joins module and id', () => {
    expect(outboxKey({ module: 'appraisal', id: 'abc-123' })).toBe('appraisal:abc-123');
  });
});

describe('outboxTableName', () => {
  it('appends the fixed table name', () => {
    expect(outboxTableName('appraisal')).toBe('appraisal.IntegrationEventOutbox');
  });
});

describe('classifyOutboxFailure', () => {
  it('is none for a non-Failed status, regardless of failureClass', () => {
    expect(
      classifyOutboxFailure({
        status: 'Processing',
        failureClass: 'Unresolvable',
        typeResolvable: false,
      }),
    ).toBe('none');
  });

  it('is blocked for failureClass Disallowed even when typeResolvable is true', () => {
    expect(
      classifyOutboxFailure({ status: 'Failed', failureClass: 'Disallowed', typeResolvable: true }),
    ).toBe('blocked');
  });

  it('is typeNowResolves for failureClass Unresolvable once typeResolvable is true', () => {
    expect(
      classifyOutboxFailure({
        status: 'Failed',
        failureClass: 'Unresolvable',
        typeResolvable: true,
      }),
    ).toBe('typeNowResolves');
  });

  it('is blocked for failureClass Unresolvable while typeResolvable is still false', () => {
    expect(
      classifyOutboxFailure({
        status: 'Failed',
        failureClass: 'Unresolvable',
        typeResolvable: false,
      }),
    ).toBe('blocked');
  });

  it('is payloadWarning for failureClass Deserialization', () => {
    expect(
      classifyOutboxFailure({
        status: 'Failed',
        failureClass: 'Deserialization',
        typeResolvable: true,
      }),
    ).toBe('payloadWarning');
  });

  it('is blocked when failureClass Deserialization arrives with typeResolvable false', () => {
    expect(
      classifyOutboxFailure({
        status: 'Failed',
        failureClass: 'Deserialization',
        typeResolvable: false,
      }),
    ).toBe('blocked');
  });

  it('is none for a null failureClass (transient error)', () => {
    expect(
      classifyOutboxFailure({ status: 'Failed', failureClass: null, typeResolvable: true }),
    ).toBe('none');
  });

  it('is blocked for a null failureClass while typeResolvable is false', () => {
    expect(
      classifyOutboxFailure({ status: 'Failed', failureClass: null, typeResolvable: false }),
    ).toBe('blocked');
  });
});

describe('isOutboxSelectable', () => {
  it('is true for Failed with a resolvable type and null failureClass (class none)', () => {
    expect(isOutboxSelectable({ status: 'Failed', failureClass: null, typeResolvable: true })).toBe(
      true,
    );
  });

  it('is false for Failed with an unresolvable type (class blocked)', () => {
    expect(
      isOutboxSelectable({ status: 'Failed', failureClass: null, typeResolvable: false }),
    ).toBe(false);
  });

  it('is false for failureClass Disallowed even with typeResolvable true (class blocked)', () => {
    expect(
      isOutboxSelectable({
        status: 'Failed',
        failureClass: 'Disallowed',
        typeResolvable: true,
      }),
    ).toBe(false);
  });

  it('is true for failureClass Unresolvable once typeResolvable is true (class typeNowResolves)', () => {
    expect(
      isOutboxSelectable({
        status: 'Failed',
        failureClass: 'Unresolvable',
        typeResolvable: true,
      }),
    ).toBe(true);
  });

  it('is true for failureClass Deserialization (class payloadWarning)', () => {
    expect(
      isOutboxSelectable({
        status: 'Failed',
        failureClass: 'Deserialization',
        typeResolvable: true,
      }),
    ).toBe(true);
  });

  it('is false for Processing, Pending and Processed', () => {
    const base = { failureClass: null, typeResolvable: true };
    expect(isOutboxSelectable({ status: 'Processing', ...base })).toBe(false);
    expect(isOutboxSelectable({ status: 'Pending', ...base })).toBe(false);
    expect(isOutboxSelectable({ status: 'Processed', ...base })).toBe(false);
  });
});

describe('countBy', () => {
  it('preserves first-seen order', () => {
    const items = [{ k: 'a' }, { k: 'b' }, { k: 'a' }, { k: 'c' }, { k: 'b' }, { k: 'a' }];
    expect(countBy(items, i => i.k)).toEqual([
      ['a', 3],
      ['b', 2],
      ['c', 1],
    ]);
  });
});

describe('shortTypeName', () => {
  it('takes the segment after the last dot', () => {
    expect(shortTypeName('Microsoft.EntityFrameworkCore.DbUpdateConcurrencyException')).toBe(
      'DbUpdateConcurrencyException',
    );
  });

  it('returns the value unchanged when there is no separator', () => {
    expect(shortTypeName('PlainException')).toBe('PlainException');
  });

  it('returns an empty string for missing input', () => {
    expect(shortTypeName(undefined)).toBe('');
    expect(shortTypeName('')).toBe('');
  });
});

describe('shortMessageType', () => {
  it('takes the segment after the last colon in a message URN', () => {
    expect(
      shortMessageType('urn:message:Shared.Messaging.Events:AppraisalCompletedIntegrationEvent'),
    ).toBe('AppraisalCompletedIntegrationEvent');
  });

  it('takes the segment after the last dot in a plain type name', () => {
    expect(shortMessageType('Appraisal.WorkflowTransitionedIntegrationEvent')).toBe(
      'WorkflowTransitionedIntegrationEvent',
    );
  });

  it('returns the value unchanged when there is no separator', () => {
    expect(shortMessageType('PlainEvent')).toBe('PlainEvent');
  });

  it('returns an empty string for missing input', () => {
    expect(shortMessageType(undefined)).toBe('');
    expect(shortMessageType('')).toBe('');
  });
});

describe('shortEventType', () => {
  it('drops the assembly suffix before shortening', () => {
    expect(
      shortEventType(
        'Shared.Messaging.Events.AppraisalCancelledIntegrationEvent, Shared.Messaging',
      ),
    ).toBe('AppraisalCancelledIntegrationEvent');
  });

  it('returns the value unchanged when there is no separator', () => {
    expect(shortEventType('PlainEvent')).toBe('PlainEvent');
  });

  it('cuts at the first comma outside brackets and drops generic arity and arguments', () => {
    expect(shortEventType('Ns.Wrapper`1[[Ns.Inner, Asm]], Asm')).toBe('Wrapper');
    expect(shortEventType('Ns.Pair`2[[Ns.A, Asm],[Ns.B, Asm]], Asm, Version=1.0.0.0')).toBe('Pair');
    expect(shortEventType('Ns.Wrapper`1[[Ns.Inner, Asm]]')).toBe('Wrapper');
  });

  it('returns an empty string for missing input', () => {
    expect(shortEventType(undefined)).toBe('');
    expect(shortEventType('')).toBe('');
  });
});

describe('isTopGroupActive', () => {
  const group = { queue: 'appraisal-sync', exceptionType: 'DbUpdateConcurrencyException' };
  const baseFilters = {
    queue: group.queue,
    exceptionType: group.exceptionType,
    node: '',
    search: '',
    status: 'Pending' as const,
  };

  it('is active with no node or search set, on the Pending tab', () => {
    expect(isTopGroupActive(group, baseFilters)).toBe(true);
  });

  it('is not active when a node filter is set', () => {
    expect(isTopGroupActive(group, { ...baseFilters, node: 'APP01' })).toBe(false);
  });

  it('is not active when a search filter is set', () => {
    expect(isTopGroupActive(group, { ...baseFilters, search: 'abc' })).toBe(false);
  });

  it('is not active for a different exceptionType', () => {
    expect(isTopGroupActive(group, { ...baseFilters, exceptionType: 'Other' })).toBe(false);
  });

  it('is not active on the Retried tab', () => {
    expect(isTopGroupActive(group, { ...baseFilters, status: 'Retried' })).toBe(false);
  });
});

describe('confirmDoneEffects', () => {
  it('clears the selection for a bulk-origin confirm', () => {
    expect(confirmDoneEffects('bulk')).toEqual({ clearSelection: true });
  });

  it('leaves the selection alone for a drawer-origin confirm', () => {
    expect(confirmDoneEffects('drawer')).toEqual({ clearSelection: false });
  });
});

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

describe('isStuck', () => {
  const started = '2026-09-27T14:30:00';
  const base = parseLocalDateTime(started);
  const processing = mkOutboxItem({ status: 'Processing', processingStartedAt: started });

  it('is false at 119s', () => {
    const now = new Date(base.getTime() + 119_000);
    expect(isStuck(processing, now)).toBe(false);
  });

  it('is true at 121s', () => {
    const now = new Date(base.getTime() + 121_000);
    expect(isStuck(processing, now)).toBe(true);
  });

  it('is false when now is null', () => {
    expect(isStuck(processing, null)).toBe(false);
  });

  it('is false for a non-Processing status', () => {
    const now = new Date(base.getTime() + 121_000);
    const failed = mkOutboxItem({ status: 'Failed', processingStartedAt: started });
    expect(isStuck(failed, now)).toBe(false);
  });

  it('falls back to occurredAt when processingStartedAt is missing', () => {
    const now = new Date(base.getTime() + 121_000);
    const noStartedAt = mkOutboxItem({ status: 'Processing', occurredAt: started });
    expect(isStuck(noStartedAt, now)).toBe(true);
  });

  it('is false for a zone-suffixed processingStartedAt the strict parser rejects', () => {
    const now = new Date(base.getTime() + 121_000);
    expect(
      isStuck(mkOutboxItem({ status: 'Processing', processingStartedAt: `${started}Z` }), now),
    ).toBe(false);
    expect(
      isStuck(mkOutboxItem({ status: 'Processing', processingStartedAt: `${started}+07:00` }), now),
    ).toBe(false);
  });
});

describe('committedSearch', () => {
  it('is empty for a clear, regardless of what the debounce still carries', () => {
    expect(committedSearch('', '0\u0000old', 1)).toBe('');
  });

  it('is empty when the debounced key is from a generation before the current one (stale, pre-clear)', () => {
    expect(committedSearch('new', '0\u0000old', 1)).toBe('');
  });

  it('is the debounced value once its generation matches the current one', () => {
    expect(committedSearch('new', '1\u0000new', 1)).toBe('new');
  });

  it('commits the same term again once retyped after a clear, under the new generation', () => {
    expect(committedSearch('abc', '2\u0000abc', 2)).toBe('abc');
  });
});

describe('formatDateTime', () => {
  it('is "—" when missing', () => {
    expect(formatDateTime(undefined, 'en')).toBe('—');
  });

  it('is "—" for an unparseable value', () => {
    expect(formatDateTime('garbage', 'en')).toBe('—');
  });

  it('is "—" for a zone-suffixed value the strict parser rejects', () => {
    expect(formatDateTime('2026-09-27T14:32:00Z', 'en')).toBe('—');
    expect(formatDateTime('2026-09-27T14:32:00+07:00', 'en')).toBe('—');
  });

  it('formats the date and time parts for a non-Thai language', () => {
    const result = formatDateTime('2026-09-27T14:32:00', 'en');
    expect(result).toContain('27/09/2026');
    expect(result).toContain('14:32');
  });

  it('renders a Buddhist year for Thai', () => {
    const result = formatDateTime('2026-09-27T14:32:00', 'th');
    expect(result).toContain('2569');
  });
});

describe('formatClock', () => {
  it('is "—" when missing', () => {
    expect(formatClock(undefined)).toBe('—');
  });

  it('is "—" for an unparseable value', () => {
    expect(formatClock('garbage')).toBe('—');
  });

  it('is "—" for a zone-suffixed value the strict parser rejects', () => {
    expect(formatClock('2026-09-27T14:32:05Z')).toBe('—');
    expect(formatClock('2026-09-27T14:32:05+07:00')).toBe('—');
  });

  it('defaults to HH:mm:ss', () => {
    expect(formatClock('2026-09-27T14:32:05')).toBe('14:32:05');
  });

  it('renders HH:mm when asked', () => {
    expect(formatClock('2026-09-27T14:32:05', 'HH:mm')).toBe('14:32');
  });
});

describe('formatClockOrDateTime', () => {
  const value = '2026-09-27T14:32:05';

  it('is the clock time when the value is on the same (local) day as now', () => {
    expect(formatClockOrDateTime(value, 'en', new Date('2026-09-27T23:59:00'))).toBe('14:32:05');
    expect(formatClockOrDateTime(value, 'en', new Date('2026-09-27T00:00:00'), 'HH:mm')).toBe(
      '14:32',
    );
  });

  it('is the full date + time for an earlier day, even one second before midnight', () => {
    const result = formatClockOrDateTime(value, 'en', new Date('2026-09-28T00:00:00'));
    expect(result).toContain('27/09/2026');
    expect(result).toContain('14:32');
  });

  it('is the full date + time while the clock is unknown', () => {
    expect(formatClockOrDateTime(value, 'en', null)).toContain('27/09/2026');
  });

  it('is "—" when missing or unparseable', () => {
    expect(formatClockOrDateTime(undefined, 'en', new Date())).toBe('—');
    expect(formatClockOrDateTime('2026-09-27T14:32:05Z', 'en', new Date())).toBe('—');
  });
});

describe('formatClockCeilMinute', () => {
  it('is "—" when missing or unparseable', () => {
    expect(formatClockCeilMinute(undefined)).toBe('—');
    expect(formatClockCeilMinute('2026-09-27T14:32:05Z')).toBe('—');
  });

  it('keeps an exact minute as is', () => {
    expect(formatClockCeilMinute('2026-09-27T09:05:00')).toBe('09:05');
  });

  it('rounds any seconds up to the next minute', () => {
    expect(formatClockCeilMinute('2026-09-27T09:05:50')).toBe('09:06');
    expect(formatClockCeilMinute('2026-09-27T09:05:01')).toBe('09:06');
  });

  it('rounds a fractional-second-only value up too', () => {
    expect(formatClockCeilMinute('2026-09-27T09:05:00.5000000')).toBe('09:06');
  });

  it('carries across the hour and midnight, in local time', () => {
    expect(formatClockCeilMinute('2026-09-27T09:59:30')).toBe('10:00');
    expect(formatClockCeilMinute('2026-09-27T23:59:59')).toBe('00:00');
  });
});

describe('deriveCollectorState', () => {
  const mkNode = (overrides: Partial<NodeHealth> & Pick<NodeHealth, 'node'>): NodeHealth => ({
    collectedAt: '2026-09-27T14:30:00',
    managementStatus: 'Ok',
    queues: [],
    ...overrides,
  });
  const now = parseLocalDateTime('2026-09-27T14:30:00');

  it('is unknown when now is null', () => {
    expect(deriveCollectorState([mkNode({ node: 'APP01' })], null)).toEqual({ kind: 'unknown' });
  });

  it('is unknown when there are no nodes at all', () => {
    expect(deriveCollectorState(undefined, now)).toEqual({ kind: 'unknown' });
  });

  it('is unknown for an empty node list (collector disabled / never deployed / no snapshot yet), never ok', () => {
    expect(deriveCollectorState([], now)).toEqual({ kind: 'unknown' });
  });

  it('is ok when every node is fresh and Management API is up', () => {
    expect(deriveCollectorState([mkNode({ node: 'APP01' })], now)).toEqual({ kind: 'ok' });
  });

  it('is stale (over mgmtDown) when a node has not reported in, naming the oldest time', () => {
    const nodes = [
      mkNode({
        node: 'APP01',
        collectedAt: '2026-09-27T14:20:00',
        managementStatus: 'Unreachable',
      }),
      mkNode({ node: 'APP02', collectedAt: '2026-09-27T14:25:00' }),
    ];
    expect(deriveCollectorState(nodes, now)).toEqual({
      kind: 'stale',
      nodes: ['APP01', 'APP02'],
      since: '2026-09-27T14:20:00',
    });
  });

  it('keeps the date of a since-value from the previous day', () => {
    const nodes = [mkNode({ node: 'APP01', collectedAt: '2026-09-26T23:50:00' })];
    expect(deriveCollectorState(nodes, now)).toEqual({
      kind: 'stale',
      nodes: ['APP01'],
      since: '2026-09-26T23:50:00',
    });
  });

  it('is mgmtDown when nothing is stale but a node reports a bad Management API', () => {
    const nodes = [mkNode({ node: 'APP01', managementStatus: 'Unauthorized' })];
    expect(deriveCollectorState(nodes, now)).toEqual({ kind: 'mgmtDown', nodes: ['APP01'] });
  });

  const noSnapshotNode = (node: string) =>
    mkNode({ node, collectedAt: undefined, managementStatus: undefined });

  it('is unknown for one normal fresh node plus one no-snapshot node', () => {
    const nodes = [mkNode({ node: 'APP01' }), noSnapshotNode('APP02')];
    expect(deriveCollectorState(nodes, now)).toEqual({ kind: 'unknown' });
  });

  it('is unknown for a no-snapshot node alone — never mgmtDown from its missing managementStatus', () => {
    expect(deriveCollectorState([noSnapshotNode('APP01')], now)).toEqual({ kind: 'unknown' });
  });

  it('is stale (over unknown) when a stale node and a no-snapshot node are both present', () => {
    const nodes = [
      mkNode({ node: 'APP01', collectedAt: '2026-09-27T14:20:00' }),
      noSnapshotNode('APP02'),
    ];
    expect(deriveCollectorState(nodes, now)).toEqual({
      kind: 'stale',
      nodes: ['APP01'],
      since: '2026-09-27T14:20:00',
    });
  });
});

describe('toggleInMap', () => {
  const key = (i: { id: string }) => i.id;

  it('adds an item that is not yet in the map', () => {
    const item = { id: 'a' };
    const next = toggleInMap(new Map(), key, item);
    expect([...next.entries()]).toEqual([['a', item]]);
  });

  it('removes an item that is already in the map', () => {
    const item = { id: 'a' };
    const withItem = new Map([['a', item]]);
    expect(toggleInMap(withItem, key, item).size).toBe(0);
  });
});

describe('toggleAllInMap', () => {
  const key = (i: { id: string }) => i.id;
  const items = [{ id: 'a' }, { id: 'b' }];

  it('selects every selectable item when not all are already selected', () => {
    const next = toggleAllInMap(new Map(), key, items);
    expect([...next.keys()].sort()).toEqual(['a', 'b']);
  });

  it('deselects every selectable item once all of them are already selected', () => {
    const allSelected = new Map(items.map(i => [i.id, i] as const));
    expect(toggleAllInMap(allSelected, key, items).size).toBe(0);
  });
});

describe('refHref', () => {
  it('builds a link for a resolvable refType', () => {
    expect(refHref('appraisal', '123')).toBe('/appraisals/123');
    expect(refHref('request', '123')).toBe('/requests/123');
  });

  it('is null for document (no detail route)', () => {
    expect(refHref('document', '123')).toBeNull();
  });

  it('is null when refType or refId is missing', () => {
    expect(refHref(undefined, '123')).toBeNull();
    expect(refHref('appraisal', undefined)).toBeNull();
  });
});
