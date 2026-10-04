import { isSameDay, parseISO } from 'date-fns';
import { formatDate, formatLocaleDateTime } from '@shared/utils/dateUtils';
import type {
  FailedMessageKind,
  FailedMessageListItem,
  FailedMessageStatusFilter,
  NodeHealth,
  OutboxListItem,
  OutboxModule,
  QueueHealth,
  RefType,
  TopGroup,
} from '../types';

// Wire datetimes have no zone and are already Bangkok local (see api-contract.md), and may carry up
// to 7 fractional digits. date-fns' `parseISO` parses a zone-less ISO string as local time and
// truncates fractional seconds to ms on its own, so it's a correct parser for exactly that shape —
// but it also happily accepts a 'Z'/offset suffix or a date-only string, which the wire contract
// guarantees never appear. The guard below keeps anything outside the contracted zone-less
// second-precision shape as `Invalid Date` (treated as unknown everywhere below) rather than letting
// `parseISO` silently reinterpret it under an implicit zone.
const LOCAL_DATETIME_RE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{1,7})?$/;

export function parseLocalDateTime(value: string): Date {
  if (!LOCAL_DATETIME_RE.test(value)) return new Date(NaN);
  return parseISO(value);
}

/** Buddhist-calendar-aware, like the rest of the app — see formatLocaleDateTime in dateUtils. */
export function formatDateTime(value: string | undefined, language: string | undefined): string {
  if (!value) return '—';
  return formatLocaleDateTime(parseLocalDateTime(value), language);
}

export function formatClock(value?: string, format: 'HH:mm' | 'HH:mm:ss' = 'HH:mm:ss'): string {
  if (!value) return '—';
  const d = parseLocalDateTime(value);
  if (isNaN(d.getTime())) return '—';
  return formatDate(d, format);
}

/**
 * Clock time for a value from today, the full date + time for anything older — a bare "14:03" for a
 * fault from three days ago reads as today. "Today" is the server's day (`now`, local fields), never
 * UTC; while the clock is unknown the date is always shown rather than guessing.
 */
export function formatClockOrDateTime(
  value: string | undefined,
  language: string | undefined,
  now: Date | null,
  format: 'HH:mm' | 'HH:mm:ss' = 'HH:mm:ss',
): string {
  if (!value) return '—';
  const d = parseLocalDateTime(value);
  if (isNaN(d.getTime())) return '—';
  return now && isSameDay(d, now) ? formatDate(d, format) : formatDateTime(value, language);
}

/**
 * HH:mm of a "not before" time, rounded UP to the next whole minute when it has any seconds — the
 * server accepts the action from the exact instant, so a truncated clock could show a minute that is
 * still too early. Local time, like every other wire datetime here.
 */
export function formatClockCeilMinute(value?: string): string {
  if (!value) return '—';
  const d = parseLocalDateTime(value);
  if (isNaN(d.getTime())) return '—';
  if (d.getSeconds() > 0 || d.getMilliseconds() > 0) d.setSeconds(60, 0);
  return formatDate(d, 'HH:mm');
}

export const STALE_AFTER_MS = 120_000;

/**
 * A missing or unparseable `collectedAt` is treated as unknown, not stale — same as an unknown
 * clock. Missing happens for a node with a Pending FailedMessage but no BrokerSnapshot row yet.
 */
export function isStale(
  collectedAt: string | undefined,
  now: Date | null,
  thresholdMs = STALE_AFTER_MS,
): boolean {
  // An unknown clock (no server offset yet) means no marking at all, not "assume stale".
  if (!now || !collectedAt) return false;
  const d = parseLocalDateTime(collectedAt);
  if (isNaN(d.getTime())) return false;
  return now.getTime() - d.getTime() > thresholdMs;
}

/** `null` for an unparseable `from` — callers show no elapsed marking rather than "0h 0m". */
export function elapsedParts(from: string, now: Date): { hours: number; minutes: number } | null {
  const d = parseLocalDateTime(from);
  if (isNaN(d.getTime())) return null;
  const diffMs = Math.max(0, now.getTime() - d.getTime());
  const totalMinutes = Math.floor(diffMs / 60_000);
  return { hours: Math.floor(totalMinutes / 60), minutes: totalMinutes % 60 };
}

/**
 * The server's clock minus the client's, captured once per summary fetch — never the browser's own
 * clock compared directly against a parsed server timestamp, which would be wrong by the browser's
 * timezone offset and any clock skew. `null` when the summary hasn't loaded yet (no `serverTime`) or
 * it fails to parse.
 */
export function serverOffsetMs(
  serverTime: string | undefined,
  dataUpdatedAt: number,
): number | null {
  if (!serverTime) return null;
  const server = parseLocalDateTime(serverTime);
  if (isNaN(server.getTime())) return null;
  return server.getTime() - dataUpdatedAt;
}

/**
 * Applies a previously-captured server offset to the client's own advancing clock (a ticking
 * `clientNowMs`), so "now" keeps moving even while later summary polls fail. `null` when the offset
 * itself is unknown — callers must show no staleness/elapsed marking at all rather than fall back to
 * the raw (possibly skewed) browser clock.
 */
export function serverClock(offsetMs: number | null, clientNowMs: number): Date | null {
  return offsetMs == null ? null : new Date(clientNowMs + offsetMs);
}

export type QueueSeverity = 'crit' | 'warn' | 'ok';

/** Inflow outpacing outflow with a meaningful backlog already — the queue is trending worse. */
export function isGrowing(q: QueueHealth): boolean {
  return (q.ready ?? 0) > 50 && (q.publishRate ?? 0) > (q.deliverRate ?? 0);
}

export function queueSeverity(q: QueueHealth): QueueSeverity {
  // `q.consumers === 0` (not `!q.consumers`) so an absent (undefined) broker read never reads as crit.
  if (q.consumers === 0 && (q.ready ?? 0) > 0) return 'crit';
  if (q.errorCount > 0 || q.skippedCount > 0 || isGrowing(q)) return 'warn';
  return 'ok';
}

/**
 * A top-group chip sets queue + exceptionType (and switches to the Pending tab) only, so it can only
 * ever be "active" on the Pending tab, with no other filter (node, search) it doesn't control also
 * applied — otherwise clicking an unpressed chip would silently clear those other filters/tabs
 * instead of applying the chip's own, or look pressed on a tab it never actually filters.
 */
export function isTopGroupActive(
  group: Pick<TopGroup, 'queue' | 'exceptionType'>,
  filters: {
    queue: string;
    exceptionType: string;
    node: string;
    search: string;
    status: FailedMessageStatusFilter;
  },
): boolean {
  return (
    filters.status === 'Pending' &&
    filters.queue === group.queue &&
    filters.exceptionType === group.exceptionType &&
    !filters.node &&
    !filters.search
  );
}

/**
 * A confirm dialog opened from a single row's drawer must not wipe a separate bulk-bar selection
 * sitting underneath it — only a confirm opened FROM the bulk bar clears the selection it acted on.
 */
export function confirmDoneEffects(origin: 'bulk' | 'drawer'): { clearSelection: boolean } {
  return { clearSelection: origin === 'bulk' };
}

export const STUCK_AFTER_MS = 120_000;

/** A `Processing` outbox row is only "stuck" once it's sat there past the 2-minute threshold. */
export function isStuck(
  item: Pick<OutboxListItem, 'status' | 'processingStartedAt' | 'occurredAt'>,
  now: Date | null,
): boolean {
  if (item.status !== 'Processing' || !now) return false;
  const started = parseLocalDateTime(item.processingStartedAt ?? item.occurredAt);
  if (isNaN(started.getTime())) return false;
  return now.getTime() - started.getTime() > STUCK_AFTER_MS;
}

/**
 * The search term actually in effect for querying. `debouncedKey` carries a generation prefix
 * (`` `${gen}\u0000${trimmed}` ``, see FailedMessagesPage) so a still-debouncing key from before a
 * clear can never resurrect the old term once it lands — only a key whose generation matches the
 * current one commits. A trimmed-to-empty input (a clear) always commits immediately as `''`.
 */
export function committedSearch(trimmed: string, debouncedKey: string, gen: number): string {
  if (trimmed === '') return '';
  const sep = debouncedKey.indexOf('\u0000');
  const keyGen = Number(debouncedKey.slice(0, sep));
  return keyGen === gen ? debouncedKey.slice(sep + 1) : '';
}

const SEVERITY_ORDER: Record<QueueSeverity, number> = { crit: 0, warn: 1, ok: 2 };

export function sortQueuesBySeverity(queues: QueueHealth[]): QueueHealth[] {
  return [...queues].sort((a, b) => {
    const sevDiff = SEVERITY_ORDER[queueSeverity(a)] - SEVERITY_ORDER[queueSeverity(b)];
    if (sevDiff !== 0) return sevDiff;
    const readyDiff = (b.ready ?? 0) - (a.ready ?? 0);
    if (readyDiff !== 0) return readyDiff;
    return a.name.localeCompare(b.name);
  });
}

export const SPARK_WIDTH = 124;
export const SPARK_HEIGHT = 30;

export function sparklineGeometry(
  samples: number[],
  width = SPARK_WIDTH,
  height = SPARK_HEIGHT,
): { line: string; area: string; last: { x: number; y: number } } | null {
  if (samples.length === 0) return null;

  const clamped = samples.map(v => Math.max(0, v));
  const max = Math.max(4, ...clamped);
  const y0 = height - 2;
  const n = clamped.length;
  const fmt = (v: number) => v.toFixed(1);

  const points = clamped.map((v, i) => {
    // Single-sample queues still draw a flat line spanning the full width.
    const x = n === 1 ? width : (i / (n - 1)) * width;
    const y = y0 - (v / max) * (height - 6);
    return { x, y };
  });

  const lastPoint = points[points.length - 1];
  // Keep `last` as plain rounded numbers (per the return type); format separately for the path strings
  // so `toFixed` doesn't get collapsed back to an integer by the `Number()` round-trip.
  const last = { x: Math.round(lastPoint.x * 10) / 10, y: Math.round(lastPoint.y * 10) / 10 };
  const line =
    n === 1
      ? `M0.0,${fmt(lastPoint.y)} L${fmt(lastPoint.x)},${fmt(lastPoint.y)}`
      : points.map((p, i) => `${i === 0 ? 'M' : 'L'}${fmt(p.x)},${fmt(p.y)}`).join(' ');
  const area = `${line}L${fmt(width)},${fmt(y0)}L0.0,${fmt(y0)}Z`;

  return { line, area, last };
}

export function displayQueueName(sourceQueue: string, kind: FailedMessageKind): string {
  return `${sourceQueue}_${kind.toLowerCase()}`;
}

/**
 * A `retryAvailableAt` on the item means the server is still inside the 5-minute post-fault window
 * a same-MessageId retry would otherwise be skipped for. A present value with an unknown clock
 * (`now === null`) counts as waiting too — the server omits the field once the window has passed,
 * so a present-but-unparseable "now" can never prove the window is actually over.
 */
function isWaitingForRetryWindow(retryAvailableAt: string | undefined, now: Date | null): boolean {
  if (!retryAvailableAt) return false;
  const at = parseLocalDateTime(retryAvailableAt);
  // An unparseable value can't prove the window is over either — same "unknown blocks retry" rule.
  if (isNaN(at.getTime())) return true;
  if (!now) return true;
  return at > now;
}

/**
 * Only a `Pending` consumer failure outside its post-fault wait window can be sent back to its queue.
 * Takes just `status`/`retryAvailableAt` so both the list item and the (differently shaped) detail
 * object — which omits `siblingCount` — satisfy it without a cast.
 */
export function canRetry(
  item: Pick<FailedMessageListItem, 'status' | 'retryAvailableAt'>,
  now: Date | null,
): boolean {
  return item.status === 'Pending' && !isWaitingForRetryWindow(item.retryAvailableAt, now);
}

/**
 * Splits a mixed retry-dialog selection into the three buckets the dialog needs: rows it can
 * actually send now (`sendable`), rows already `RetryRequested` (`waitingToSend`, not sent again),
 * and `Pending` rows still inside their post-fault wait window (`tooSoon`). Anything else
 * (Retried/Discarded, picked up incidentally by a "select all" click) is dropped silently — there's
 * nothing useful to say about it in a retry confirmation.
 */
export function groupRetrySelection<
  T extends Pick<FailedMessageListItem, 'status' | 'retryAvailableAt'>,
>(items: T[], now: Date | null): { sendable: T[]; waitingToSend: T[]; tooSoon: T[] } {
  const sendable: T[] = [];
  const waitingToSend: T[] = [];
  const tooSoon: T[] = [];
  for (const item of items) {
    if (item.status === 'RetryRequested') waitingToSend.push(item);
    else if (canRetry(item, now)) sendable.push(item);
    else if (item.status === 'Pending') tooSoon.push(item);
  }
  return { sendable, waitingToSend, tooSoon };
}

/**
 * A `Pending` OR `RetryRequested` consumer failure can be discarded — a row stuck waiting to be
 * sent back is still eligible to drop, even though it can't be retried again while in that state.
 */
export function canDiscard(item: Pick<FailedMessageListItem, 'status'>): boolean {
  return item.status === 'Pending' || item.status === 'RetryRequested';
}

// The backend names the failure (`failureClass`); the grace-period rules below are the FE's call.
// `Disallowed` has no grace period — a resolved type in a disallowed namespace can never become
// allowed by waiting, so it's always `blocked`. `Unresolvable` and `Deserialization` get a grace
// period before the backend fails them, so by the time a row is actually `Failed`, `typeResolvable`
// may already be true again (a redeploy landed since) or the payload may or may not still be broken.
// `!typeResolvable` (the type still doesn't resolve right now) is the only case still `blocked`;
// otherwise these surface as warnings, since a resend MIGHT succeed.

export type OutboxFailureClass = 'none' | 'blocked' | 'typeNowResolves' | 'payloadWarning';

/**
 * Classifies a `Failed` outbox row's error into what a resend would actually do:
 * - `blocked` — resending fails again the same way every time; never worth trying.
 * - `typeNowResolves` — it failed because the type didn't resolve at fault time, but does now
 *   (a deploy landed since); a resend is likely to succeed.
 * - `payloadWarning` — the payload/schema looked bad at fault time; may or may not still be broken.
 * - `none` — a transient failure, or not `Failed` at all; resend as normal.
 */
export function classifyOutboxFailure(
  item: Pick<OutboxListItem, 'status' | 'failureClass' | 'typeResolvable'>,
): OutboxFailureClass {
  if (item.status !== 'Failed') return 'none';
  if (item.failureClass === 'Disallowed') return 'blocked';
  if (!item.typeResolvable) return 'blocked';
  if (item.failureClass === 'Unresolvable') return 'typeNowResolves';
  if (item.failureClass === 'Deserialization') return 'payloadWarning';
  return 'none';
}

/**
 * Only a `Failed` outbox row whose failure isn't `blocked` (see `classifyOutboxFailure`) can be
 * resent.
 */
export function isOutboxSelectable(
  item: Pick<OutboxListItem, 'status' | 'failureClass' | 'typeResolvable'>,
): boolean {
  return item.status === 'Failed' && classifyOutboxFailure(item) !== 'blocked';
}

/** `Microsoft.EntityFrameworkCore.DbUpdateConcurrencyException` → `DbUpdateConcurrencyException`. */
export function shortTypeName(value?: string): string {
  if (!value) return '';
  const idx = value.lastIndexOf('.');
  return idx === -1 ? value : value.slice(idx + 1);
}

/**
 * MassTransit message type URNs use `:`, plain CLR type names use `.` — take whichever separator
 * appears last. `urn:message:Shared.Messaging.Events:AppraisalCompletedIntegrationEvent` →
 * `AppraisalCompletedIntegrationEvent`; `Appraisal.WorkflowTransitionedIntegrationEvent` →
 * `WorkflowTransitionedIntegrationEvent`.
 */
export function shortMessageType(value?: string): string {
  if (!value) return '';
  const idx = Math.max(value.lastIndexOf(':'), value.lastIndexOf('.'));
  return idx === -1 ? value : value.slice(idx + 1);
}

/**
 * Outbox `EventType` is an assembly-qualified name: `Type.Name, Assembly.Name`. Cut at the first
 * comma OUTSIDE square brackets (a generic's own arguments are assembly-qualified too), then drop
 * the generic arity and arguments (`Ns.Wrapper`1[[Ns.Inner, Asm]]` → `Ns.Wrapper`) before shortening
 * to the simple type name.
 */
export function shortEventType(value?: string): string {
  if (!value) return '';
  let depth = 0;
  let end = value.length;
  for (let i = 0; i < value.length; i++) {
    const c = value[i];
    if (c === '[') depth++;
    else if (c === ']') depth--;
    else if (c === ',' && depth === 0) {
      end = i;
      break;
    }
  }
  const name = value.slice(0, end).split(/[`[]/)[0].trim();
  return shortTypeName(name);
}

/**
 * The count chip shown on one tab. `summaryCounts` maps a tab's value to a summary-level count that
 * should show on every inactive tab (Pending/Failed/Stuck). The active tab prefers its own list count
 * (what the pager shows) and falls back to the summary while the list is loading; a tab with neither
 * gets no chip.
 */
export function tabCountChip(args: {
  tab: string;
  activeTab: string;
  hasFilters: boolean;
  listCount: number | undefined;
  summaryCounts: Partial<Record<string, number>>;
}): number | undefined {
  const { tab, activeTab, hasFilters, listCount, summaryCounts } = args;
  if (hasFilters) {
    return tab === activeTab ? listCount : undefined;
  }
  // The pager shows the list count, so the active tab must agree with it; the summary can lag a poll.
  if (tab === activeTab && listCount !== undefined) return listCount;
  return summaryCounts[tab];
}

// `K extends string` (not just `string`) so a literal-union key — e.g. BulkActionSkipped['reason'] —
// comes back out as that same union instead of widening to `string`, which a typed `t()` call needs.
export function countBy<T, K extends string>(items: T[], key: (item: T) => K): [K, number][] {
  const counts = new Map<K, number>();
  for (const item of items) {
    const k = key(item);
    counts.set(k, (counts.get(k) ?? 0) + 1);
  }
  return [...counts.entries()];
}

const REF_LINKS: Partial<Record<RefType, string>> = {
  appraisal: '/appraisals',
  request: '/requests',
  quotation: '/quotations',
  meeting: '/meetings',
  // document intentionally omitted — no detail route to link to.
};

export function refHref(refType?: RefType, refId?: string): string | null {
  if (!refType || !refId) return null;
  const base = REF_LINKS[refType];
  return base ? `${base}/${refId}` : null;
}

/** Selection-map key for an outbox row — a `module` alone isn't unique, an `id` alone isn't either. */
export function outboxKey(item: Pick<OutboxListItem, 'module' | 'id'>): string {
  return `${item.module}:${item.id}`;
}

/** Toggles one item in a selection Map, keyed by `key(item)` — add if absent, remove if present. */
export function toggleInMap<T>(
  prev: Map<string, T>,
  key: (item: T) => string,
  item: T,
): Map<string, T> {
  const next = new Map(prev);
  const k = key(item);
  if (next.has(k)) next.delete(k);
  else next.set(k, item);
  return next;
}

/**
 * Toggles a whole page of `selectable` items in a selection Map: selects every one of them if any
 * are still unselected, otherwise deselects all of them (mirrors a native "select all" checkbox).
 */
export function toggleAllInMap<T>(
  prev: Map<string, T>,
  key: (item: T) => string,
  selectable: T[],
): Map<string, T> {
  const allSelected = selectable.length > 0 && selectable.every(i => prev.has(key(i)));
  const next = new Map(prev);
  selectable.forEach(i => {
    const k = key(i);
    if (allSelected) next.delete(k);
    else next.set(k, i);
  });
  return next;
}

/** The one place that knows every module's outbox table is named `IntegrationEventOutbox`. */
export function outboxTableName(module: OutboxModule): string {
  return `${module}.IntegrationEventOutbox`;
}

export type CollectorState =
  | { kind: 'stale'; nodes: string[]; since: string }
  | { kind: 'mgmtDown'; nodes: string[] }
  | { kind: 'unknown' }
  | { kind: 'ok' };

/**
 * Drives the consumer table's default-tab empty state so it never claims "running normally" while
 * a collector hasn't reported in or its broker numbers can't be trusted. Priority: stale beats a
 * down Management API beats an unknown clock/missing summary/no-snapshot node beats ok.
 */
export function deriveCollectorState(
  nodes: NodeHealth[] | undefined,
  now: Date | null,
): CollectorState {
  // No nodes = collector disabled, never deployed, or no BrokerSnapshot yet: nothing is known, which
  // must never read as a healthy all-clear.
  if (!now || !nodes || nodes.length === 0) return { kind: 'unknown' };
  // `isStale` already reads false for a node with no `collectedAt` at all (no BrokerSnapshot row
  // yet) — that case falls through to the no-snapshot check below, not into this bucket.
  const stale = nodes.filter(n => isStale(n.collectedAt, now));
  if (stale.length > 0) {
    const oldest = stale.reduce((a, b) =>
      parseLocalDateTime(a.collectedAt!) < parseLocalDateTime(b.collectedAt!) ? a : b,
    );
    return {
      kind: 'stale',
      nodes: stale.map(n => n.node),
      // Raw local timestamp — the view formats it WITH the date (an outage from yesterday must not
      // read as today's HH:mm).
      since: oldest.collectedAt!,
    };
  }
  // A no-snapshot node's `managementStatus` is also omitted — exclude it here so it isn't
  // misreported as a down Management API; it falls into the no-snapshot check below instead.
  const mgmtDown = nodes.filter(
    n => n.managementStatus !== undefined && n.managementStatus !== 'Ok',
  );
  if (mgmtDown.length > 0) return { kind: 'mgmtDown', nodes: mgmtDown.map(n => n.node) };
  if (nodes.some(n => n.collectedAt === undefined)) return { kind: 'unknown' };
  return { kind: 'ok' };
}
