import type { TFunction } from 'i18next';
import type {
  FailedMessageKind,
  FailedMessageStatus,
  OutboxListItem,
  OutboxModule,
  RefType,
} from '../types';
import { formatClockCeilMinute, isStuck, parseLocalDateTime, shortTypeName } from './queueHealth';

// Lives here (not in a component file) so it can be imported by both utils and components without
// creating a components → utils → components cycle, and so component files stay component-only
// (react-refresh/only-export-components).
export type Tone = 'red' | 'amber' | 'sky' | 'emerald' | 'gray';

/** `t('refType.appraisal')` etc.; '' when there's no reference type to label. */
export function refTypeLabel(t: TFunction<'failedMessages'>, refType?: RefType): string {
  return refType ? t(`refType.${refType}`) : '';
}

/** `t('modules.appraisal')` etc. */
export function moduleLabel(t: TFunction<'failedMessages'>, module: OutboxModule): string {
  return t(`modules.${module}`);
}

// What the collector stores as ExceptionType for every row from a `_skipped` queue (FaultMessageParser
// .SkippedExceptionType) — there is no exception, only "no consumer matched".
export const SKIPPED_EXCEPTION_TYPE = 'Skipped';

/**
 * Exception column / chip text: "No consumer" for a skipped row, else the type's short name. A row
 * has `kind` to go by; a top-group chip only has `exceptionType`, so the stored sentinel counts too.
 */
export function exceptionTypeLabel(
  t: TFunction<'failedMessages'>,
  exceptionType: string,
  kind?: FailedMessageKind,
): string {
  return kind === 'Skipped' || exceptionType === SKIPPED_EXCEPTION_TYPE
    ? t('table.noConsumer')
    : shortTypeName(exceptionType);
}

export function consumerStatusTone(status: FailedMessageStatus): Tone {
  return status === 'Pending'
    ? 'red'
    : status === 'RetryRequested'
      ? 'sky'
      : status === 'Retried'
        ? 'emerald'
        : 'gray';
}

type OutboxItemForStatus = Pick<OutboxListItem, 'status' | 'processingStartedAt' | 'occurredAt'>;

const OUTBOX_STATUS_LABEL_KEYS = {
  Failed: 'outboxStatus.Failed',
  Processing: 'outboxStatus.Processing',
  Pending: 'outboxStatus.Pending',
  Processed: 'outboxStatus.Processed',
} as const;

/**
 * A `Processing` row only reads as "Stuck" past the 2-minute threshold (see `isStuck` in
 * queueHealth.ts) — otherwise it's the same neutral "Processing" every other in-flight row gets.
 * Returns a literal key (never built from `status` via a template) so `t()` stays type-checkable.
 */
export function outboxStatusLabelKey(
  item: OutboxItemForStatus,
  now: Date | null,
  // The server already filtered this row as stuck (the Stuck tab) — trust that over the client clock,
  // which is null until the summary loads.
  assumeStuck = false,
): (typeof OUTBOX_STATUS_LABEL_KEYS)[keyof typeof OUTBOX_STATUS_LABEL_KEYS] | 'outboxStatus.Stuck' {
  if (item.status === 'Processing' && (assumeStuck || isStuck(item, now)))
    return 'outboxStatus.Stuck';
  return OUTBOX_STATUS_LABEL_KEYS[item.status];
}

export function outboxStatusTone(
  item: OutboxItemForStatus,
  now: Date | null,
  assumeStuck = false,
): Tone {
  if (item.status === 'Failed') return 'red';
  if (item.status === 'Processing') return assumeStuck || isStuck(item, now) ? 'amber' : 'sky';
  if (item.status === 'Pending') return 'sky';
  return 'emerald';
}

/**
 * "Available to send back from {time}", or "Retry time not yet known" when `value` is missing or
 * unparseable — shared by the consumer table row and the drawer's disabled-retry-button tooltip so
 * the two don't each reinvent the same fallback check.
 */
export function retryAvailableAtLabel(t: TFunction<'failedMessages'>, value?: string): string {
  if (!value || isNaN(parseLocalDateTime(value).getTime())) return t('list.retryTimeUnknown');
  return t('list.retryAvailableAt', { time: formatClockCeilMinute(value) });
}

/**
 * "{ref type label} {refNumber}", falling back to a short id, then to a generic "this item" —
 * shared by both drawers and the confirm dialog so the three don't each reinvent the fallback chain.
 */
export function refText(
  t: TFunction<'failedMessages'>,
  item: { refType?: RefType; refNumber?: string; refId?: string },
): string {
  const label = refTypeLabel(t, item.refType);
  if (item.refNumber) return `${label} ${item.refNumber}`.trim();
  if (item.refId) return `${label} ${item.refId.slice(0, 8)}`.trim();
  return t('drawer.thisItem');
}

/**
 * The warning-line version of refText for a group of items: the DISTINCT real references, then a
 * count of the items that have none ("2 items without a reference") — rather than repeating the
 * "this item" fallback once per row. With no real reference at all it is just that count.
 */
export function refListText(
  t: TFunction<'failedMessages'>,
  items: { refType?: RefType; refNumber?: string; refId?: string }[],
): string {
  const withRef = items.filter(i => i.refNumber || i.refId);
  const parts = [...new Set(withRef.map(i => refText(t, i)))];
  const missing = items.length - withRef.length;
  if (missing > 0) parts.push(t('confirm.itemsWithoutReference', { count: missing }));
  return parts.join(', ');
}
