/**
 * Segment model for the date / date-time text inputs.
 *
 * The field is a fixed-width template — `dd/mm/yyyy`, or `dd/mm/yyyy hh:mm` when it carries a
 * time — and every segment owns a constant slice of it. That is what lets the user edit one part
 * (just the month, say) without retyping the rest, and it is why the format cannot drift: the
 * separators are never typed, only the digits inside a slice ever change.
 *
 * Everything here is pure so both DatePickerInput and DateTimePickerInput can share it, and so the
 * fiddly parts (auto-advance, arrow stepping, day clamping) can be reasoned about on their own.
 */

export type SegmentKey = 'day' | 'month' | 'year' | 'hour' | 'minute';

export interface DateSegment {
  key: SegmentKey;
  /** Index of the segment's first character in the template. */
  start: number;
  /** Number of characters the segment occupies. */
  length: number;
  min: number;
  max: number;
  /** Shown while the segment has no value, e.g. `dd`. */
  blank: string;
}

export type SegmentParts = Record<SegmentKey, number | null>;

export const EMPTY_PARTS: SegmentParts = {
  day: null,
  month: null,
  year: null,
  hour: null,
  minute: null,
};

export const DATE_SEGMENTS: DateSegment[] = [
  { key: 'day', start: 0, length: 2, min: 1, max: 31, blank: 'dd' },
  { key: 'month', start: 3, length: 2, min: 1, max: 12, blank: 'mm' },
  { key: 'year', start: 6, length: 4, min: 1, max: 9999, blank: 'yyyy' },
];

export const DATE_TIME_SEGMENTS: DateSegment[] = [
  ...DATE_SEGMENTS,
  { key: 'hour', start: 11, length: 2, min: 0, max: 23, blank: 'hh' },
  { key: 'minute', start: 14, length: 2, min: 0, max: 59, blank: 'mm' },
];

export const segmentsFor = (withTime: boolean): DateSegment[] =>
  withTime ? DATE_TIME_SEGMENTS : DATE_SEGMENTS;

const pad = (value: number, length: number) => String(value).padStart(length, '0');

const daysInMonth = (year: number, month: number) => new Date(year, month, 0).getDate();

/** Renders the parts as the locked template string. Always the same length. */
export function buildSegmentText(parts: SegmentParts, segments: DateSegment[]): string {
  const piece = (segment: DateSegment) =>
    parts[segment.key] == null ? segment.blank : pad(parts[segment.key] as number, segment.length);

  const date = `${piece(segments[0])}/${piece(segments[1])}/${piece(segments[2])}`;
  return segments.length > 3 ? `${date} ${piece(segments[3])}:${piece(segments[4])}` : date;
}

export function isPartsEmpty(parts: SegmentParts, segments: DateSegment[]): boolean {
  return segments.every(segment => parts[segment.key] == null);
}

export function isPartsComplete(parts: SegmentParts, segments: DateSegment[]): boolean {
  return segments.every(segment => parts[segment.key] != null);
}

export function partsFromDate(
  date: Date | null | undefined,
  segments: DateSegment[],
): SegmentParts {
  if (!date || Number.isNaN(date.getTime())) return { ...EMPTY_PARTS };
  const withTime = segments.length > 3;
  return {
    day: date.getDate(),
    month: date.getMonth() + 1,
    year: date.getFullYear(),
    hour: withTime ? date.getHours() : null,
    minute: withTime ? date.getMinutes() : null,
  };
}

/**
 * Builds a Date from the parts, or null when the value is incomplete or impossible (31/02/2026).
 * A four-digit year is required — 3/9/26 is far more likely to be a half-typed 2026 than the year
 * 26, and silently accepting it would commit a date nobody meant.
 */
export function dateFromParts(parts: SegmentParts, segments: DateSegment[]): Date | null {
  if (!isPartsComplete(parts, segments)) return null;

  const year = parts.year as number;
  const month = parts.month as number;
  const day = parts.day as number;

  if (year < 1000) return null;
  if (month < 1 || month > 12) return null;
  if (day < 1 || day > daysInMonth(year, month)) return null;

  // The time is checked as strictly as the date. Nothing stops 29 being typed into the hour —
  // "2" leaves room for a second digit, and "9" fills the segment — and `new Date(y, m, d, 29)`
  // does not complain, it rolls over to 05:00 the next day. Committing that would move the
  // appointment a day while the field still read 29:00.
  const hour = parts.hour ?? 0;
  const minute = parts.minute ?? 0;
  if (hour < 0 || hour > 23) return null;
  if (minute < 0 || minute > 59) return null;

  return new Date(year, month - 1, day, hour, minute, 0, 0);
}

/** Keeps the day inside the selected month, so 31 → Feb becomes 28/29 instead of an error. */
export function clampDayToMonth(parts: SegmentParts): SegmentParts {
  if (parts.day == null || parts.month == null || parts.year == null) return parts;
  const max = daysInMonth(parts.year, parts.month);
  return parts.day > max ? { ...parts, day: max } : parts;
}

/** Which segment the caret sits in. */
export function segmentIndexAt(caret: number, segments: DateSegment[]): number {
  for (let i = 0; i < segments.length; i++) {
    if (caret <= segments[i].start + segments[i].length) return i;
  }
  return segments.length - 1;
}

export interface TypeDigitResult {
  parts: SegmentParts;
  /** Digits typed into this segment so far — carry it into the next keystroke. */
  buffer: string;
  /** True once the segment cannot take another digit, so the caret should move on. */
  advance: boolean;
}

/**
 * Types one digit into the active segment.
 *
 * The caret moves on either when the segment is full, or as soon as a second digit could not keep
 * the value legal — typing `4` into the day can only ever mean the 4th, so waiting for a second
 * digit would just make the user press `→`.
 */
export function typeDigitIntoSegment(
  parts: SegmentParts,
  segments: DateSegment[],
  index: number,
  digit: string,
  buffer: string,
): TypeDigitResult {
  const segment = segments[index];
  const next = (buffer + digit).slice(-segment.length);
  let value = parseInt(next, 10);

  const isFull = next.length >= segment.length;
  const cannotGrow = value * 10 > segment.max;
  const advance = isFull || cannotGrow;

  // Day and month have no zero. This catches it on auto-advance; leaving the segment by arrow,
  // Tab, click or blur goes through clampSegmentToMin instead — "0" alone never advances, since
  // a second digit could still make it legal.
  if (advance && value < segment.min) value = segment.min;

  const updated = { ...parts, [segment.key]: value };
  return {
    parts: advance ? clampDayToMonth(updated) : updated,
    buffer: advance ? '' : next,
    advance,
  };
}

/**
 * Raises a segment that is sitting below its minimum to that minimum — the lone `0` a user can
 * leave in the day or month by typing it and then moving on. `00` renders in the field and makes
 * the whole date unparseable, so it must not survive the caret leaving the segment.
 *
 * Returns the same object when there is nothing to fix, so callers can skip a state update.
 */
export function clampSegmentToMin(
  parts: SegmentParts,
  segments: DateSegment[],
  index: number,
): SegmentParts {
  const segment = segments[index];
  if (!segment) return parts;
  const value = parts[segment.key];
  if (value == null || value >= segment.min) return parts;
  return clampDayToMonth({ ...parts, [segment.key]: segment.min });
}

/**
 * Arrow-key stepping. An untouched segment starts from today rather than from its minimum —
 * pressing ↑ on an empty year should offer this year, not the year 1.
 */
export function stepSegment(
  parts: SegmentParts,
  segments: DateSegment[],
  index: number,
  delta: number,
  now: Date = new Date(),
): SegmentParts {
  const segment = segments[index];
  const current = parts[segment.key];

  if (current == null) {
    const seed: Record<SegmentKey, number> = {
      day: now.getDate(),
      month: now.getMonth() + 1,
      year: now.getFullYear(),
      hour: 0,
      minute: 0,
    };
    return clampDayToMonth({ ...parts, [segment.key]: seed[segment.key] });
  }

  const span = segment.max - segment.min + 1;
  const stepped = ((((current - segment.min + delta) % span) + span) % span) + segment.min;
  return clampDayToMonth({ ...parts, [segment.key]: stepped });
}

export function clearSegment(
  parts: SegmentParts,
  segments: DateSegment[],
  index: number,
): SegmentParts {
  return { ...parts, [segments[index].key]: null };
}

/**
 * Accepts a pasted `dd/mm/yyyy` or `dd/mm/yyyy hh:mm` (also `-` separated, also an ISO date), so
 * copying a date out of another screen still works. Returns null when nothing usable was pasted.
 */
export function parsePastedText(text: string, segments: DateSegment[]): SegmentParts | null {
  const trimmed = text.trim();
  const withTime = segments.length > 3;

  const iso = trimmed.match(/^(\d{4})-(\d{2})-(\d{2})(?:[ T](\d{1,2}):(\d{2}))?/);
  const local = trimmed.match(/^(\d{1,2})[/.-](\d{1,2})[/.-](\d{4})(?:[ T](\d{1,2}):(\d{2}))?/);

  let day: number;
  let month: number;
  let year: number;
  let hour: string | undefined;
  let minute: string | undefined;

  if (iso) {
    year = Number(iso[1]);
    month = Number(iso[2]);
    day = Number(iso[3]);
    hour = iso[4];
    minute = iso[5];
  } else if (local) {
    day = Number(local[1]);
    month = Number(local[2]);
    year = Number(local[3]);
    hour = local[4];
    minute = local[5];
  } else {
    return null;
  }

  const parts: SegmentParts = {
    ...EMPTY_PARTS,
    day,
    month,
    year,
    hour: withTime ? Number(hour ?? 0) : null,
    minute: withTime ? Number(minute ?? 0) : null,
  };

  return clampDayToMonth(parts);
}
