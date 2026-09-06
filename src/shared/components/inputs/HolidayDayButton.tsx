import { useEffect, useRef } from 'react';
import type { DayButtonProps } from 'react-day-picker';
import clsx from 'clsx';
import { toDateKey } from './dateConstraints';

/**
 * Builds a react-day-picker day button that shows public holidays: the date is coloured and the
 * holiday is named on hover, so a user picking a date can see why it matters without leaving the
 * field. Marking is all this does — whether a holiday can be chosen is the `disableHolidays`
 * constraint's job.
 *
 * A factory rather than a component with props because RDP takes a component type, and the
 * holiday lookup has to travel with it. Memoise the result per field: a new component identity on
 * every render would remount the whole grid and drop keyboard focus.
 *
 * The focus effect mirrors RDP's own DayButton — arrow-key navigation moves focus through this
 * ref, and dropping it would break keyboard use of the calendar.
 */
export function createHolidayDayButton(holidayMap: Map<string, string>) {
  return function HolidayDayButton({ day, modifiers, ...buttonProps }: DayButtonProps) {
    const ref = useRef<HTMLButtonElement>(null);
    useEffect(() => {
      if (modifiers.focused) ref.current?.focus();
    }, [modifiers.focused]);

    const holidayName = holidayMap.get(toDateKey(day.date));

    return (
      <button
        ref={ref}
        {...buttonProps}
        title={holidayName ?? buttonProps.title}
        className={clsx(
          buttonProps.className,
          // Selected wins: the accent fill already carries the meaning, and red on it is unreadable.
          holidayName && !modifiers.selected && 'text-rose-600 font-semibold',
        )}
      />
    );
  };
}
