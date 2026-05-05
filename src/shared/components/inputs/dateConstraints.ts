import { startOfDay, isBefore, isAfter, isEqual, addDays } from 'date-fns';

export interface DateConstraintPresets {
  disablePastDates?: boolean;
  disableFutureDates?: boolean;
  disableToday?: boolean;
  minDate?: Date | string | null;
  disableDaysBefore?: number;
  disableDaysAfter?: number;
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
  } = presets;

  const hasAny =
    disablePastDates ||
    disableFutureDates ||
    disableToday ||
    minDate ||
    (disableDaysBefore != null && disableDaysBefore > 0) ||
    (disableDaysAfter != null && disableDaysAfter > 0);

  if (!hasAny) return undefined;

  const minAnchor = parseDate(minDate);

  if (
    !disablePastDates &&
    !disableFutureDates &&
    !disableToday &&
    !minAnchor &&
    !disableDaysBefore &&
    !disableDaysAfter
  ) {
    return undefined;
  }

  return (date: Date) => {
    const day = startOfDay(date);
    const today = startOfDay(new Date());

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
