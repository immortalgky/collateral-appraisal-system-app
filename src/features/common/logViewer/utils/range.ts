import { format } from 'date-fns';

/** Log retention on the server — anything older has already been deleted. */
export const RETENTION_DAYS = 30;

/** The BE's own max span for a single search — matches its query-cost cap. */
export const MAX_SPAN_DAYS = 31;

export const RANGE_PRESET_HOURS = [0.25, 1, 24, 168, 720] as const;
export type RangePresetHours = (typeof RANGE_PRESET_HOURS)[number];

/** The window Live mode seeds itself with and forces the range preset to — one place, so
 * useLiveTail's own seed search and the page's "turn Live on" button can never drift apart. */
export const LIVE_WINDOW_HOURS: RangePresetHours = 0.25;

export const isPresetHours = (v: number): v is RangePresetHours =>
  (RANGE_PRESET_HOURS as readonly number[]).includes(v);

export interface LogRange {
  from: Date;
  to: Date;
}

/** ± choices for the "time of incident" custom-range mode, in minutes. */
export const AROUND_MINUTES = [2, 5, 15, 60] as const;

export const presetRange = (hours: number, now: Date = new Date()): LogRange => ({
  from: new Date(now.getTime() - hours * 3600_000),
  to: now,
});

export const aroundRange = (at: Date, plusMinusMinutes: number): LogRange => ({
  from: new Date(at.getTime() - plusMinusMinutes * 60_000),
  to: new Date(at.getTime() + plusMinusMinutes * 60_000),
});

/**
 * Clamps a range's `to` to `now` rather than ever handing a future `to` downstream. Several
 * "jump to this window" paths compute their own window from a timestamp that can itself be very
 * recent — around-this-log, a health event's "view logs", "view all" from the trace tab — and
 * without this, the resulting range (and the chip that shows it) would extend into the future.
 */
export function clampToNow(range: LogRange, now: Date = new Date()): LogRange {
  return { from: range.from, to: range.to.getTime() > now.getTime() ? now : range.to };
}

/**
 * Same as `aroundRange`, clamping `to` to `now` instead of ever producing a future `to` —
 * "time of incident" is very often close to right now, so `at + plusMinus` legitimately lands in
 * the future for a routine click, and that should just mean "up to now", not a validation error.
 */
export const resolveAroundRange = (
  at: Date,
  plusMinusMinutes: number,
  now: Date = new Date(),
): LogRange => clampToNow(aroundRange(at, plusMinusMinutes), now);

/**
 * Runs a range through `validateRange`; if it's invalid for any reason, falls back to a small
 * window ending at `now` instead of ever sending it downstream. `clampToNow` alone isn't enough
 * for this — it only clamps `to`, so a timestamp that's itself after `now` (clock skew between
 * the browser and the server) can still leave `from` after `now` too, producing an inverted
 * from > to range that clamping `to` never catches.
 */
export function validOrAroundNow(
  range: LogRange,
  plusMinusMinutes: number,
  now: Date = new Date(),
): LogRange {
  return validateRange(range.from, range.to, now) == null
    ? range
    : aroundRange(now, plusMinusMinutes);
}

/**
 * The API takes local Bangkok wall-clock timestamps with no trailing `Z` — never convert
 * through UTC (see memory `feedback_never_use_utc_always_locale`).
 */
export const toApiDateTime = (date: Date): string => format(date, "yyyy-MM-dd'T'HH:mm:ss.SSS");

export type RangeErrorKey =
  | 'errors.invalidRange'
  | 'errors.fromAfterTo'
  | 'errors.futureNotAllowed'
  | 'errors.beyondRetention'
  | 'errors.spanTooWide';

/** Returns an i18n key (under the `logAdmin` namespace) or null when the range is fine. */
export function validateRange(
  from: Date | undefined,
  to: Date | undefined,
  now: Date = new Date(),
): RangeErrorKey | null {
  if (!from || !to || Number.isNaN(from.getTime()) || Number.isNaN(to.getTime())) {
    return 'errors.invalidRange';
  }
  if (from.getTime() >= to.getTime()) return 'errors.fromAfterTo';
  // Small tolerance for clock skew between the browser and the server.
  if (to.getTime() > now.getTime() + 60_000) return 'errors.futureNotAllowed';
  const minTs = now.getTime() - RETENTION_DAYS * 24 * 3600_000;
  if (to.getTime() < minTs) return 'errors.beyondRetention';
  if (to.getTime() - from.getTime() > MAX_SPAN_DAYS * 24 * 3600_000) return 'errors.spanTooWide';
  return null;
}

/** True when the range spans more than 7 days — pairing that with a text query can be slow. */
export const isWideRange = (range: LogRange): boolean =>
  range.to.getTime() - range.from.getTime() > 7 * 24 * 3600_000;

/** `nonce` lets re-picking the same preset (e.g. clicking "24h" again) resolve a fresh "now"
 * rather than being a no-op because the state object would otherwise look unchanged. */
export type RangeState =
  | { kind: 'preset'; hours: RangePresetHours; nonce: number }
  | { kind: 'custom'; from: Date; to: Date };

export const DEFAULT_RANGE_HOURS: RangePresetHours = 24;

export const resolveRange = (range: RangeState, now: Date = new Date()): LogRange =>
  range.kind === 'preset' ? presetRange(range.hours, now) : { from: range.from, to: range.to };

/**
 * Zoom history — a stack of `RangeState`s to return to on "zoom out". Stored as `RangeState`
 * (never resolved `LogRange`), so popping back to a preset re-resolves it against a fresh `now`
 * rather than reapplying whatever timestamps it happened to resolve to at push time.
 */
export const pushZoomEntry = (stack: RangeState[], entry: RangeState): RangeState[] => [
  ...stack,
  entry,
];

export const popZoomEntry = (
  stack: RangeState[],
): { entry: RangeState | null; rest: RangeState[] } =>
  stack.length === 0
    ? { entry: null, rest: stack }
    : { entry: stack[stack.length - 1], rest: stack.slice(0, -1) };
