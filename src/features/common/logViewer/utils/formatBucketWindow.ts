import { format } from 'date-fns';

const SECONDS_10_MIN = 600;

/**
 * The clicked/hovered bucket's actual time span — `[start, start + bucketSeconds)`, clamped to
 * `rangeTo` for the last bucket, which can be shorter than a full `bucketSeconds` when the range
 * doesn't divide evenly. Shared by `formatBucketWindow` (the tooltip label) and the zoom handlers
 * (clicking a bar/point), so a zoom always lands on exactly what the tooltip showed.
 */
export function bucketWindow(
  start: string,
  bucketSeconds: number,
  rangeTo?: Date | string,
): { from: Date; to: Date } {
  const from = new Date(start);
  let to = new Date(from.getTime() + bucketSeconds * 1000);
  if (rangeTo != null) {
    const clamp = typeof rangeTo === 'string' ? new Date(rangeTo) : rangeTo;
    if (to.getTime() > clamp.getTime()) to = clamp;
  }
  return { from, to };
}

/**
 * Formats two points in time as "start – end", 24-hour, with the date shown once in front when
 * both ends fall on the same day (and again before the end time when they don't, e.g. crossing
 * midnight) — the app is 24-hour throughout, never `Date#toLocaleString`'s locale-dependent
 * 12-hour format. Shared by `formatBucketWindow` (bucket tooltips) and the active-range chip,
 * which shows the exact same style so the two are easy to compare at a glance.
 */
export function formatTimeRange(from: Date, to: Date, includeSeconds: boolean): string {
  const timeFormat = includeSeconds ? 'HH:mm:ss' : 'HH:mm';
  const datePart = format(from, 'd/M');

  if (to.getTime() <= from.getTime()) {
    return `${datePart} ${format(from, timeFormat)}`;
  }

  const sameDay = format(from, 'yyyy-MM-dd') === format(to, 'yyyy-MM-dd');
  const endLabel = sameDay
    ? format(to, timeFormat)
    : `${format(to, 'd/M')} ${format(to, timeFormat)}`;
  return `${datePart} ${format(from, timeFormat)} – ${endLabel}`;
}

/**
 * Formats a bucket's full time window ("start – end"), not just its start — a single timestamp
 * reads like "this happened in exactly this one minute", when the underlying row could have
 * landed anywhere across the whole bucket.
 *
 * Seconds are shown when `bucketSeconds` is under 10 minutes, else just HH:mm — a histogram
 * bucket that wide doesn't need second-level precision. (The active-range chip always shows
 * seconds regardless of span — see `formatTimeRange` directly.)
 */
export function formatBucketWindow(
  start: string,
  bucketSeconds: number,
  rangeTo?: Date | string,
): string {
  const { from, to } = bucketWindow(start, bucketSeconds, rangeTo);
  return formatTimeRange(from, to, bucketSeconds < SECONDS_10_MIN);
}
