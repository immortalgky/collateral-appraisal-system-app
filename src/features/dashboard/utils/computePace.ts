import { differenceInCalendarDays } from 'date-fns';

export type PaceInput = {
  currentTotal: number;
  rangeStart: Date;
  rangeEnd: Date;
  today: Date;
};

export type PaceResult = {
  projectedTotal: number;
  isFutureRange: boolean;
  elapsedDays: number;
  totalDays: number;
};

/**
 * Linear projection of end-of-range total based on current pace.
 * Only meaningful when the range is still open (today < rangeEnd).
 */
export const computePace = ({
  currentTotal,
  rangeStart,
  rangeEnd,
  today,
}: PaceInput): PaceResult => {
  const totalDays = Math.max(1, differenceInCalendarDays(rangeEnd, rangeStart) + 1);
  const elapsedDays = Math.max(
    1,
    Math.min(totalDays, differenceInCalendarDays(today, rangeStart) + 1),
  );
  const isFutureRange = today < rangeEnd;
  const projectedTotal = isFutureRange
    ? Math.round((currentTotal / elapsedDays) * totalDays)
    : currentTotal;
  return { projectedTotal, isFutureRange, elapsedDays, totalDays };
};
