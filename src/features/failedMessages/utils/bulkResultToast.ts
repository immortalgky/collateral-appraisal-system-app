import type { TFunction } from 'i18next';
import toast from 'react-hot-toast';
import type { BulkActionSkipped, OutboxResendResult } from '../types';
import { countBy } from './queueHealth';

type OutboxSkipped = OutboxResendResult['skipped'][number];

// Explicit unions (not `string`) so every `t()` call below keeps a literal key — a plain-`string`
// or template-literal key nested inside another `t()` call blew tsc up from ~1 min to 50+ min.
type SuccessKey = 'toast.retrySuccess' | 'toast.discardSuccess' | 'toast.resendSuccess';
type PartialKey = 'toast.retryPartial' | 'toast.discardPartial' | 'toast.resendPartial';
type ReasonKey =
  | 'skipReason.NotFound'
  | 'skipReason.NotPending'
  | 'skipReason.TooSoon'
  | 'skipReason.Publishing'
  | 'skipReason.NotFailed'
  | 'skipReason.UnknownModule';

// A future server-only reason (not in the union above) falls back to this rather than passing
// `t()` an undefined key.
const OTHER_REASON_KEY = 'skipReason.other' as const;

export const CONSUMER_SKIP_REASON_KEY = {
  NotFound: 'skipReason.NotFound',
  NotPending: 'skipReason.NotPending',
  TooSoon: 'skipReason.TooSoon',
  Publishing: 'skipReason.Publishing',
} as const satisfies Record<BulkActionSkipped['reason'], ReasonKey>;

export const OUTBOX_SKIP_REASON_KEY = {
  NotFound: 'skipReason.NotFound',
  NotFailed: 'skipReason.NotFailed',
  UnknownModule: 'skipReason.UnknownModule',
} as const satisfies Record<OutboxSkipped['reason'], ReasonKey>;

/**
 * Fires the shared success / partial / none-accepted toast for a bulk retry, discard or resend
 * result. `R` stays a literal-union (inferred from `reasonKeys`, not widened to `string`) so the
 * `t(reasonKeys[reason])` lookup below keeps a literal key.
 */
export function toastBulkResult<R extends string>(
  t: TFunction<'failedMessages'>,
  result: { acceptedCount: number; skipped: { reason: R }[] },
  keys: { success: SuccessKey; partial: PartialKey },
  reasonKeys: Record<R, ReasonKey>,
): void {
  const { acceptedCount, skipped } = result;

  if (skipped.length === 0) {
    toast.success(t(keys.success, { count: acceptedCount }));
    return;
  }

  // Indexed as a plain lookup (not `Record<R, ReasonKey>`) so a reason value the server sends that
  // isn't in `reasonKeys` at runtime — a future reason this build doesn't know about yet — falls
  // back to `OTHER_REASON_KEY` instead of handing `t()` an undefined key.
  const lookup = reasonKeys as Record<string, ReasonKey | undefined>;
  const reasons = countBy(skipped, s => s.reason)
    .map(([reason, count]) =>
      t('skipReason.item', { reason: t(lookup[reason] ?? OTHER_REASON_KEY), count }),
    )
    .join(', ');

  if (acceptedCount > 0) {
    toast.success(t(keys.partial, { accepted: acceptedCount, skipped: skipped.length, reasons }));
  } else {
    toast.error(t('toast.noneAccepted', { skipped: skipped.length, reasons }));
  }
}
