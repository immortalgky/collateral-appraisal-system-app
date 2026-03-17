import { startOfDay, isBefore, isAfter, isEqual } from 'date-fns';

export interface DateConstraintPresets {
  disablePastDates?: boolean;
  disableFutureDates?: boolean;
  disableToday?: boolean;
}

/**
 * Returns a matcher function for react-day-picker's `disabled` prop,
 * or undefined when no flags are set.
 */
export function buildDisabledMatcher(
  presets: DateConstraintPresets,
): ((date: Date) => boolean) | undefined {
  const { disablePastDates, disableFutureDates, disableToday } = presets;

  if (!disablePastDates && !disableFutureDates && !disableToday) {
    return undefined;
  }

  return (date: Date) => {
    const day = startOfDay(date);
    const today = startOfDay(new Date());

    if (disablePastDates && isBefore(day, today)) return true;
    if (disableFutureDates && isAfter(day, today)) return true;
    if (disableToday && isEqual(day, today)) return true;

    return false;
  };
}

/**
 * Returns an error message if the date violates constraints, or null if valid.
 */
export function validateDateConstraints(
  date: Date,
  presets: DateConstraintPresets,
): string | null {
  const day = startOfDay(date);
  const today = startOfDay(new Date());

  if (presets.disablePastDates && isBefore(day, today)) {
    return 'Cannot select a past date';
  }
  if (presets.disableFutureDates && isAfter(day, today)) {
    return 'Cannot select a future date';
  }
  if (presets.disableToday && isEqual(day, today)) {
    return "Cannot select today's date";
  }

  return null;
}
