import { useState } from 'react';
import clsx from 'clsx';

interface MonthYearPanelProps {
  /** Year shown in the panel header */
  year: number;
  /** Highlighted month (0-11) or null */
  selectedMonth: number | null;
  /** Pick a month (0-11) */
  onSelectMonth: (month: number) => void;
  /** Step the year by delta (-1 / +1) via the header chevrons */
  onStepYear: (delta: number) => void;
  /** Pick an absolute year from the year grid (falls back to onStepYear if omitted) */
  onSelectYear?: (year: number) => void;
  /** Jump back to today */
  onToday: () => void;
  /** 12 short month labels (Jan..Dec), localizable */
  monthLabels: string[];
  todayLabel?: string;
  prevYearAriaLabel?: string;
  nextYearAriaLabel?: string;
  /** Optionally grey-out months fully outside the allowed range */
  isMonthDisabled?: (month: number) => boolean;
  className?: string;
}

// The mock's right-hand panel. Two levels:
//  - month grid (default): year header + up/down steppers, a 4-col Jan-Dec grid.
//  - year grid: clicking the year flips to a 12-year grid (header shows the range,
//    chevrons page by 12), mirroring the calendar page. Picking a year returns to
//    the month grid. Selection uses the same primary color as the day-grid selection.
export function MonthYearPanel({
  year,
  selectedMonth,
  onSelectMonth,
  onStepYear,
  onSelectYear,
  onToday,
  monthLabels,
  todayLabel = 'Today',
  prevYearAriaLabel = 'Previous year',
  nextYearAriaLabel = 'Next year',
  isMonthDisabled,
  className,
}: MonthYearPanelProps) {
  const [yearGridOpen, setYearGridOpen] = useState(false);
  const [yearBase, setYearBase] = useState(year - 6);

  const toggleYearGrid = () => {
    setYearBase(year - 6);
    setYearGridOpen(open => !open);
  };

  const selectYear = (y: number) => {
    if (onSelectYear) onSelectYear(y);
    else onStepYear(y - year);
    setYearGridOpen(false);
  };

  return (
    <div className={clsx('flex flex-col', className)}>
      <div className="flex items-center justify-between mb-2">
        <button
          type="button"
          onClick={toggleYearGrid}
          className="text-sm font-semibold text-gray-800 hover:text-primary rounded px-1 -mx-1"
        >
          {yearGridOpen ? `${yearBase}–${yearBase + 11}` : year}
        </button>
        <div className="flex items-center gap-0.5">
          <button
            type="button"
            onClick={() => (yearGridOpen ? setYearBase(b => b - 12) : onStepYear(-1))}
            aria-label={prevYearAriaLabel}
            className="w-6 h-6 flex items-center justify-center rounded text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors"
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
              strokeLinecap="round"
            >
              <path d="M18 15l-6-6-6 6" />
            </svg>
          </button>
          <button
            type="button"
            onClick={() => (yearGridOpen ? setYearBase(b => b + 12) : onStepYear(1))}
            aria-label={nextYearAriaLabel}
            className="w-6 h-6 flex items-center justify-center rounded text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors"
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
              strokeLinecap="round"
            >
              <path d="M6 9l6 6 6-6" />
            </svg>
          </button>
        </div>
      </div>

      {yearGridOpen ? (
        <div className="grid grid-cols-4 gap-1 flex-1 content-center">
          {Array.from({ length: 12 }, (_, k) => yearBase + k).map(y => (
            <button
              key={y}
              type="button"
              onClick={() => selectYear(y)}
              className={clsx(
                'py-1.5 rounded text-xs font-medium transition-colors',
                y === year ? 'bg-primary text-primary-content' : 'text-gray-700 hover:bg-gray-100',
              )}
            >
              {y}
            </button>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-4 gap-1 flex-1 content-center">
          {monthLabels.map((label, i) => {
            const isSelected = selectedMonth === i;
            const disabled = isMonthDisabled?.(i) ?? false;
            return (
              <button
                key={i}
                type="button"
                disabled={disabled}
                onClick={() => onSelectMonth(i)}
                className={clsx(
                  'py-1.5 rounded text-xs font-medium transition-colors',
                  disabled
                    ? 'text-gray-300 cursor-not-allowed'
                    : isSelected
                      ? 'bg-primary text-primary-content'
                      : 'text-gray-700 hover:bg-gray-100',
                )}
              >
                {label}
              </button>
            );
          })}
        </div>
      )}

      <div className="flex justify-end mt-2">
        <button
          type="button"
          onClick={() => {
            setYearGridOpen(false);
            onToday();
          }}
          className="text-xs font-semibold text-primary hover:underline px-1 py-0.5"
        >
          {todayLabel}
        </button>
      </div>
    </div>
  );
}

export default MonthYearPanel;
