import { startOfDay, isBefore, isAfter, isEqual, addDays } from 'date-fns';

/** One public holiday. `date` is a plain calendar date, `yyyy-MM-dd`, never a timestamp. */
export interface HolidayInfo {
  date: string;
  name: string;
}

export interface DateConstraintPresets {
  disablePastDates?: boolean;
  disableFutureDates?: boolean;
  disableToday?: boolean;
  minDate?: Date | string | null;
  disableDaysBefore?: number;
  disableDaysAfter?: number;
  /** Holidays to mark on the calendar. Marking alone never blocks a date. */
  holidays?: HolidayInfo[];
  /** Opt-in: also refuse the dates in `holidays`. */
  disableHolidays?: boolean;
}

/** Local calendar key, `yyyy-MM-dd`. Deliberately not toISOString(), which shifts to UTC. */
export function toDateKey(date: Date): string {
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${date.getFullYear()}-${month}-${day}`;
}

/** Holiday name by date key, for both the calendar tooltip and the typed-value message. */
export function buildHolidayMap(holidays: HolidayInfo[] | undefined): Map<string, string> {
  const map = new Map<string, string>();
  for (const holiday of holidays ?? []) map.set(holiday.date, holiday.name);
  return map;
}

function parseDate(val: Date | string | null | undefined): Date | null {
  if (!val) return null;
  if (val instanceof Date) return isNaN(val.getTime()) ? null : startOfDay(val);

  const normalised = val.replace(' ', 'T').replace(/(\.\d{3})\d+/, '$1');

  const d = new Date(normalised);
  return isNaN(d.getTime()) ? null : startOfDay(d);
}

/**
 * Returns a matcher function for react-day-picker's `disabled` prop,
 * or undefined when no flags are set.
 */
export function buildDisabledMatcher(
  presets: DateConstraintPresets,
): ((date: Date) => boolean) | undefined {
  const {
    disablePastDates,
    disableFutureDates,
    disableToday,
    minDate,
    disableDaysBefore,
    disableDaysAfter,
    holidays,
    disableHolidays,
  } = presets;

  const blockedHolidays = disableHolidays ? buildHolidayMap(holidays) : null;

  const hasAny =
    disablePastDates ||
    disableFutureDates ||
    disableToday ||
    minDate ||
    (disableDaysBefore != null && disableDaysBefore > 0) ||
    (disableDaysAfter != null && disableDaysAfter > 0) ||
    (blockedHolidays != null && blockedHolidays.size > 0);

  if (!hasAny) return undefined;

  const minAnchor = parseDate(minDate);

  if (
    !disablePastDates &&
    !disableFutureDates &&
    !disableToday &&
    !minAnchor &&
    !disableDaysBefore &&
    !disableDaysAfter &&
    !blockedHolidays?.size
  ) {
    return undefined;
  }

  return (date: Date) => {
    const day = startOfDay(date);
    const today = startOfDay(new Date());

    if (blockedHolidays?.has(toDateKey(day))) return true;
    if (disablePastDates && isBefore(day, today)) return true;
    if (disableFutureDates && isAfter(day, today)) return true;
    if (disableToday && isEqual(day, today)) return true;

    if (minAnchor && isBefore(day, minAnchor)) return true;

    if (disableDaysBefore != null && disableDaysBefore > 0) {
      if (isBefore(day, startOfDay(addDays(today, -disableDaysBefore)))) return true;
    }

    if (disableDaysAfter != null && disableDaysAfter > 0) {
      if (!isAfter(day, startOfDay(addDays(today, disableDaysAfter)))) return true;
    }
    return false;
  };
}

/**
 * Returns an error message if the date violates constraints, or null if valid.
 */
export function validateDateConstraints(date: Date, presets: DateConstraintPresets): string | null {
  const day = startOfDay(date);
  const today = startOfDay(new Date());
  const minAnchor = parseDate(presets.minDate);

  if (presets.disableHolidays) {
    const holidayName = buildHolidayMap(presets.holidays).get(toDateKey(day));
    if (holidayName) return `Cannot select a holiday (${holidayName})`;
  }
  if (presets.disablePastDates && isBefore(day, today)) {
    return 'Cannot select a past date';
  }
  if (presets.disableFutureDates && isAfter(day, today)) {
    return 'Cannot select a future date';
  }
  if (presets.disableToday && isEqual(day, today)) {
    return "Cannot select today's date";
  }
  if (minAnchor && isBefore(day, minAnchor)) {
    return 'Cannot select a date before the minimum allowed date';
  }
  if (presets.disableDaysBefore != null && presets.disableDaysBefore > 0) {
    if (isBefore(day, startOfDay(addDays(today, -presets.disableDaysBefore)))) {
      return `Cannot select a date more than ${presets.disableDaysBefore} day(s) in the past`;
    }
  }

  if (presets.disableDaysAfter != null && presets.disableDaysAfter > 0) {
    if (!isAfter(day, startOfDay(addDays(today, presets.disableDaysAfter)))) {
      return `Must select a date at least ${presets.disableDaysAfter} day(s) in the future`;
    }
  }

  return null;
}
