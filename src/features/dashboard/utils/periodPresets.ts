import {
  startOfMonth,
  endOfMonth,
  startOfQuarter,
  startOfYear,
  subMonths,
  subYears,
  differenceInCalendarDays,
  addDays,
  format,
} from 'date-fns';

export type PeriodPresetKey = 'MTD' | 'QTD' | 'YTD' | 'LAST_12M' | 'CUSTOM';

export type CustomRange = { from: Date; to: Date };

export type PeriodRange = {
  from: Date;
  to: Date;
  prevFrom: Date;
  prevTo: Date;
  granularity: 'day' | 'week' | 'month';
};

export const toIsoDate = (d: Date): string => format(d, 'yyyy-MM-dd');

/**
 * Parse an ISO `yyyy-MM-dd` string as LOCAL midnight.
 * Avoids the `new Date('2026-04-17')` pitfall which parses as UTC and shifts
 * the calendar date by one day for users west of UTC.
 */
export const fromIsoDate = (s: string): Date => new Date(`${s}T00:00:00`);

export const PERIOD_LABELS: Record<PeriodPresetKey, string> = {
  MTD: 'Month to date',
  QTD: 'Quarter to date',
  YTD: 'Year to date',
  LAST_12M: 'Last 12 months',
  CUSTOM: 'Custom range',
};

export const getPresetRange = (
  key: PeriodPresetKey,
  today: Date,
  custom?: CustomRange,
): PeriodRange => {
  let from: Date;
  let to: Date;
  let granularity: PeriodRange['granularity'];

  switch (key) {
    case 'MTD':
      from = startOfMonth(today);
      to = today;
      granularity = 'day';
      break;
    case 'QTD':
      from = startOfQuarter(today);
      to = today;
      granularity = 'week';
      break;
    case 'YTD':
      from = startOfYear(today);
      to = today;
      granularity = 'month';
      break;
    case 'LAST_12M':
      from = startOfMonth(subMonths(today, 11));
      to = endOfMonth(today);
      granularity = 'month';
      break;
    case 'CUSTOM': {
      if (!custom) {
        from = startOfYear(today);
        to = today;
      } else {
        from = custom.from;
        to = custom.to;
      }
      const spanDays = differenceInCalendarDays(to, from);
      granularity = spanDays <= 31 ? 'day' : spanDays <= 120 ? 'week' : 'month';
      break;
    }
  }

  // Prior period = same length immediately preceding, except YTD/MTD/QTD which compare YoY.
  let prevFrom: Date;
  let prevTo: Date;
  if (key === 'YTD' || key === 'MTD' || key === 'QTD') {
    prevFrom = subYears(from, 1);
    prevTo = subYears(to, 1);
  } else {
    const lengthDays = differenceInCalendarDays(to, from);
    prevTo = addDays(from, -1);
    prevFrom = addDays(prevTo, -lengthDays);
  }

  return { from, to, prevFrom, prevTo, granularity };
};

export const formatRangeLabel = (from: Date, to: Date): string => {
  const sameYear = from.getFullYear() === to.getFullYear();
  const sameMonth = sameYear && from.getMonth() === to.getMonth();
  if (sameMonth) {
    return `${format(from, 'd')} – ${format(to, 'd MMM yyyy')}`;
  }
  if (sameYear) {
    return `${format(from, 'd MMM')} – ${format(to, 'd MMM yyyy')}`;
  }
  return `${format(from, 'd MMM yyyy')} – ${format(to, 'd MMM yyyy')}`;
};
