import { isAxiosError } from 'axios';
import type { FailedMessageDetail, OutboxDetail } from '../types';

// Summary + list poll the broker snapshot on a fixed schedule; a detail view only ever polls this
// fast while it's actually live (see detailRefetchInterval below).
export const POLL_INTERVAL_MS = 15_000;

// Collection queries (summary + lists) back off to this after a 404/403 instead of stopping: a
// transient 404 during a deploy or an F5 swap must not freeze the monitor until someone clicks Refresh.
export const GONE_POLL_INTERVAL_MS = 60_000;

/** A row that's gone (purged) or the viewer lost permission to it — polling it further is pointless. */
export function isGoneOrForbidden(error: unknown): boolean {
  return isAxiosError(error) && (error.response?.status === 404 || error.response?.status === 403);
}

/**
 * Refetch-interval rule for the summary and list queries: fixed-schedule polling that never stops.
 * After a 404/403 it backs off to GONE_POLL_INTERVAL_MS (retrying every 15s is pointless, but the
 * condition may be a transient deploy/F5-swap blip, so it must recover on its own); a 5xx or network
 * blip keeps the normal POLL_INTERVAL_MS.
 */
export function pollRefetchInterval(error: unknown): number {
  return isGoneOrForbidden(error) ? GONE_POLL_INTERVAL_MS : POLL_INTERVAL_MS;
}

/**
 * Shared refetch-interval rule for a single-item detail query: poll only while the drawer is open and
 * the row hasn't 404/403'd — a transient error (5xx, network blip) must NOT stop polling, since the
 * last good `data` may still be live. With no data yet: a failed first fetch (non-gone error) keeps
 * polling so the drawer recovers on its own; still loading (no error) does not poll.
 */
export function detailRefetchInterval<T>(
  state: { status: 'pending' | 'error' | 'success'; error: unknown; data?: T },
  open: boolean,
  isLive: (data: T) => boolean,
): number | false {
  if (!open) return false;
  if (isGoneOrForbidden(state.error)) return false;
  if (!state.data) return state.error != null ? POLL_INTERVAL_MS : false;
  return isLive(state.data) ? POLL_INTERVAL_MS : false;
}

/** An outbox row is still being worked by the collector — see useGetOutboxMessage. */
export function isOutboxDetailLive(data: Pick<OutboxDetail, 'status'>): boolean {
  return data.status === 'Pending' || data.status === 'Processing';
}

/**
 * A consumer failure is still actionable (Pending — another operator may retry/discard it), is being
 * republished, or is still inside its post-fault wait window (`retryAvailableAt`, omitted once it
 * passes) — see useGetFailedMessage.
 */
export function isConsumerDetailLive(
  data: Pick<FailedMessageDetail, 'status' | 'retryAvailableAt'>,
): boolean {
  return data.status === 'Pending' || data.status === 'RetryRequested' || !!data.retryAvailableAt;
}
