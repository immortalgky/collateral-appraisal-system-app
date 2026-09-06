import { forwardRef, useCallback, useEffect, useId, useMemo, useRef, useState } from 'react';
import { DayPicker } from 'react-day-picker';
import { format, formatISO, isValid, setHours, setMinutes } from 'date-fns';
import clsx from 'clsx';
import 'react-day-picker/style.css';
import { useFormReadOnly } from '../form/context';
import {
  buildDisabledMatcher,
  buildHolidayMap,
  toDateKey,
  validateDateConstraints,
  type HolidayInfo,
} from './dateConstraints';
import { ScrollableSelect } from './ScrollableSelect';
import { CalendarNavHeader } from './CalendarNavHeader';
import { MonthYearPanel } from './MonthYearPanel';
import { createHolidayDayButton } from './HolidayDayButton';
import { useDateSegmentInput } from './useDateSegmentInput';

const MONTH_LABELS_SHORT = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
];

// Hide RDP's built-in month caption — we render our own CalendarNavHeader above the grid.
const HiddenCaption = () => <></>;

// Compact react-day-picker sizing. These vars MUST live on the DayPicker root: v9's
// stylesheet declares `.rdp-root { --rdp-day-width: 44px }`, so the same vars set on an
// ancestor never win. An inline style on the root beats that class rule.
const CALENDAR_RDP_STYLE = {
  '--rdp-day-width': '1.75rem',
  '--rdp-day-height': '1.75rem',
  '--rdp-day_button-width': '1.75rem',
  '--rdp-day_button-height': '1.75rem',
  '--rdp-day_button-border-radius': '0.25rem',
  '--rdp-weekday-padding': '0',
  '--rdp-weekday-opacity': '0.6',
  '--rdp-font-family': 'inherit',
  '--rdp-accent-color': 'var(--color-primary)',
} as React.CSSProperties;

// Single-letter weekday headers (M T W T F S S) to match the design.
const formatNarrowWeekday = (date: Date) => date.toLocaleDateString('en-US', { weekday: 'narrow' });

interface DateTimePickerInputProps {
  label?: string;
  helperText?: string;
  error?: string;
  fullWidth?: boolean;
  required?: boolean;
  disabled?: boolean;
  placeholder?: string;
  className?: string;
  /** Value from react-hook-form (ISO string or Date) */
  value?: string | Date | null;
  /** onChange handler - receives ISO string value */
  onChange?: (value: string | null) => void;
  /** onBlur handler */
  onBlur?: () => void;
  name?: string;
  /** Disable dates before today */
  disablePastDates?: boolean;
  /** Disable dates after today */
  disableFutureDates?: boolean;
  /** Disable today specifically */
  disableToday?: boolean;
  minDate?: Date | string | null;
  disableDaysBefore?: number;
  disableDaysAfter?: number;
  /**
   * Public holidays to mark on the calendar (`date` as `yyyy-MM-dd`). Marking never blocks a
   * date — a holiday stays selectable unless the field also passes `disableHolidays`.
   */
  holidays?: HolidayInfo[];
  /** Refuse the dates in `holidays`, for fields that genuinely cannot fall on one. */
  disableHolidays?: boolean;
  /** Label for the calendar's Today button. */
  todayLabel?: string;
}

const HOUR_OPTIONS = Array.from({ length: 24 }, (_, i) => {
  const v = i.toString().padStart(2, '0');
  return { value: v, label: v };
});
const MINUTE_OPTIONS = Array.from({ length: 60 }, (_, i) => {
  const v = i.toString().padStart(2, '0');
  return { value: v, label: v };
});

interface TimeInput24Props {
  value: string;
  onChange: (next: string) => void;
  id?: string;
  className?: string;
}

// Custom 24-hour time input — renders identically on every OS/browser locale.
// Native <input type="time"> follows OS locale (AM/PM on en-US, 24hr on en-GB).
// Opens upward because the time footer sits at the bottom of the calendar popover.
function TimeInput24({ value, onChange, id, className }: TimeInput24Props) {
  const [rawHours, rawMinutes] = (value || '00:00').split(':');
  const hours = (rawHours ?? '00').padStart(2, '0');
  const minutes = (rawMinutes ?? '00').padStart(2, '0');

  return (
    <div className={clsx('flex items-center gap-1', className)}>
      <ScrollableSelect
        id={id}
        ariaLabel="Hours"
        value={hours}
        options={HOUR_OPTIONS}
        onChange={next => onChange(`${next}:${minutes}`)}
        placement="top"
        maxHeightClass="max-h-40"
      />
      <span className="text-gray-500">:</span>
      <ScrollableSelect
        ariaLabel="Minutes"
        value={minutes}
        options={MINUTE_OPTIONS}
        onChange={next => onChange(`${hours}:${next}`)}
        placement="top"
        maxHeightClass="max-h-40"
      />
    </div>
  );
}

const DateTimePickerInput = forwardRef<HTMLInputElement, DateTimePickerInputProps>(
  (
    {
      label,
      helperText,
      error,
      fullWidth = true,
      required,
      disabled,
      placeholder = 'dd/mm/yyyy hh:mm',
      className,
      value,
      onChange,
      onBlur,
      name,
      disablePastDates,
      disableFutureDates,
      disableToday,
      minDate,
      disableDaysBefore,
      disableDaysAfter,
      holidays,
      disableHolidays,
      todayLabel = 'Today',
    },
    ref,
  ) => {
    const uuid = useId();
    const inputId = uuid;
    const isReadOnly = useFormReadOnly();
    const isDisabled = disabled || isReadOnly;
    const popoverRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);
    // The toggle button is neither the input nor the popover, so the outside-click handler has to
    // know about it — otherwise mousedown closes the calendar and the click reopens it, and the
    // icon can never shut what it opened.
    const calendarButtonRef = useRef<HTMLButtonElement>(null);
    const [isOpen, setIsOpen] = useState(false);
    const [month, setMonth] = useState(new Date());
    const [showMonths, setShowMonths] = useState(false);
    const [timeValue, setTimeValue] = useState('00:00');
    const [position, setPosition] = useState<'bottom' | 'top'>('bottom');

    const constraints = useMemo(
      () => ({
        disablePastDates,
        disableFutureDates,
        disableToday,
        minDate,
        disableDaysBefore,
        disableDaysAfter,
        holidays,
        disableHolidays,
      }),
      [
        disablePastDates,
        disableFutureDates,
        disableToday,
        minDate,
        disableDaysBefore,
        disableDaysAfter,
        holidays,
        disableHolidays,
      ],
    );

    const disabledMatcher = useMemo(() => buildDisabledMatcher(constraints), [constraints]);

    const holidayMap = useMemo(() => buildHolidayMap(holidays), [holidays]);
    // Memoised: a fresh component identity on every render remounts the grid and drops focus.
    const holidayDayButton = useMemo(() => createHolidayDayButton(holidayMap), [holidayMap]);
    const holidayMatcher = useMemo(
      () => (date: Date) => holidayMap.has(toDateKey(date)),
      [holidayMap],
    );

    // Combine refs
    const setRefs = (element: HTMLInputElement | null) => {
      inputRef.current = element;
      if (typeof ref === 'function') {
        ref(element);
      } else if (ref) {
        ref.current = element;
      }
    };

    // Parse value to Date
    const parseValue = (val: string | Date | null | undefined): Date | undefined => {
      if (!val) return undefined;
      if (val instanceof Date) return isValid(val) ? val : undefined;
      const parsed = new Date(val);
      return isValid(parsed) ? parsed : undefined;
    };

    const selectedDate = parseValue(value);

    // Sync input value and time with selected date
    // Use value (not selectedDate) in deps to avoid infinite loop from new Date object references
    useEffect(() => {
      // The text lives in useDateSegmentInput now; the visible month and the time footer are ours.
      const date = parseValue(value);
      if (date) {
        setMonth(date);
        setTimeValue(format(date, 'HH:mm'));
      }
    }, [value]);

    // Calculate position when opening (flip to top if not enough space below)
    useEffect(() => {
      if (isOpen && inputRef.current) {
        const rect = inputRef.current.getBoundingClientRect();
        const spaceBelow = window.innerHeight - rect.bottom;
        const calendarHeight = 380; // approximate height of calendar + time picker

        if (spaceBelow < calendarHeight && rect.top > calendarHeight) {
          setPosition('top');
        } else {
          setPosition('bottom');
        }
      }
    }, [isOpen]);

    // Handle click outside to close
    useEffect(() => {
      const handleClickOutside = (event: MouseEvent) => {
        if (
          popoverRef.current &&
          !popoverRef.current.contains(event.target as Node) &&
          inputRef.current &&
          !inputRef.current.contains(event.target as Node) &&
          !calendarButtonRef.current?.contains(event.target as Node)
        ) {
          setIsOpen(false);
        }
      };

      const handleEscape = (event: KeyboardEvent) => {
        if (event.key === 'Escape') setIsOpen(false);
      };

      if (isOpen) {
        document.addEventListener('mousedown', handleClickOutside);
        document.addEventListener('keydown', handleEscape);
      }

      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
        document.removeEventListener('keydown', handleEscape);
      };
    }, [isOpen]);

    /**
     * Date and time are typed one segment at a time — day, month, year, hour, minute — so a
     * single wrong part can be corrected on its own, and the separators are never editable.
     * Nothing reaches the form until every segment is filled with a real, allowed value.
     */
    const segmentInput = useDateSegmentInput({
      value: selectedDate ?? null,
      withTime: true,
      inputRef,
      disabled: isDisabled,
      onCommit: useCallback(
        (date: Date | null) => {
          if (date) setTimeValue(format(date, 'HH:mm'));
          onChange?.(date ? formatISO(date) : null);
        },
        [onChange],
      ),
      validate: useCallback(
        (date: Date) => validateDateConstraints(date, constraints),
        [constraints],
      ),
      onNavigate: setMonth,
    });

    /** The typed-value message, e.g. "Cannot select a past date". */
    const constraintError = segmentInput.error;

    const applyTimeToDate = (date: Date, time: string): Date => {
      const [hours, minutes] = time.split(':').map(s => parseInt(s, 10));
      return setMinutes(setHours(date, hours || 0), minutes || 0);
    };

    const handleDaySelect = (date: Date | undefined) => {
      const next = date ? applyTimeToDate(date, timeValue) : null;
      onChange?.(next ? formatISO(next) : null);
      // See DatePickerInput: choosing what is already in force emits nothing, so the field has to
      // be told directly or a rejected value stays on screen with its message.
      segmentInput.showValue(next);
    };

    const handleTimeChange = (newTime: string) => {
      setTimeValue(newTime);
      if (!selectedDate) return;
      const next = applyTimeToDate(selectedDate, newTime);
      onChange?.(formatISO(next));
      segmentInput.showValue(next);
    };

    const toggleCalendar = () => {
      if (isDisabled) return;
      setShowMonths(false);
      setIsOpen(open => !open);
    };

    const handleInputBlur = () => {
      // Roll a half-typed value back to whatever the form holds, then report the blur.
      segmentInput.inputProps.onBlur();
      // Small delay to allow calendar click to register
      setTimeout(() => {
        if (!popoverRef.current?.contains(document.activeElement)) {
          onBlur?.();
        }
      }, 100);
    };

    const handleDone = () => {
      setIsOpen(false);
      onBlur?.();
    };

    return (
      <div className={clsx('relative', fullWidth && 'w-full')}>
        {label && (
          <label
            data-field-label
            htmlFor={inputId}
            className="block text-xs font-medium text-gray-700 mb-1"
          >
            {label}
            {required && <span className="text-danger ml-0.5">*</span>}
          </label>
        )}

        <div className={clsx('relative', fullWidth && 'w-full')}>
          <input
            ref={setRefs}
            id={inputId}
            name={name}
            type="text"
            className={clsx(
              // pr-9: the calendar button sits over the right edge, and "dd/mm/yyyy hh:mm" is
              // long enough to run under it in a narrow column.
              'block px-3 py-2 pr-9 border rounded-lg text-sm transition-colors duration-200',
              'placeholder:text-gray-400',
              error
                ? 'border-danger text-danger-900 placeholder:text-danger-300 focus:outline-none focus:ring-2 focus:ring-danger/20 focus:border-danger'
                : 'border-gray-200 focus:ring-2 focus:ring-gray-200 focus:border-gray-400',
              isDisabled
                ? 'bg-gray-50 text-gray-500 cursor-not-allowed'
                : 'bg-white hover:border-gray-300 cursor-text',
              // A value still being typed reads as a draft rather than as a date.
              !error && !constraintError && segmentInput.isIncomplete && 'text-gray-400',
              fullWidth && 'w-full',
              className,
            )}
            aria-invalid={constraintError || error ? 'true' : 'false'}
            aria-describedby={
              constraintError || error
                ? `${inputId}-error`
                : helperText
                  ? `${inputId}-helper`
                  : undefined
            }
            disabled={isDisabled}
            placeholder={placeholder}
            autoComplete="off"
            {...segmentInput.inputProps}
            onBlur={handleInputBlur}
          />

          {/* Calendar icon — the only way to open the calendar, so clicking into the text just
              puts the caret where the user aimed. */}
          <button
            ref={calendarButtonRef}
            type="button"
            aria-label="Open calendar"
            aria-expanded={isOpen}
            disabled={isDisabled}
            onClick={toggleCalendar}
            className={clsx(
              'absolute inset-y-0 right-0 flex items-center pr-3 pl-2 text-gray-400',
              isDisabled ? 'cursor-not-allowed' : 'hover:text-gray-600',
            )}
          >
            <svg
              className="w-4 h-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
              />
            </svg>
          </button>
        </div>

        {/* Calendar Popover with Time */}
        {isOpen && (
          <div
            ref={popoverRef}
            className={clsx(
              // right-0: hangs off the input's right edge, under the icon that opened it, rather
              // than a long way left of it on a wide field.
              'absolute right-0 z-[100] bg-base-100 rounded-box shadow-lg border border-gray-200',
              position === 'bottom' ? 'mt-1' : 'bottom-full mb-1',
            )}
          >
            <div className="flex">
              <div className="p-2">
                <CalendarNavHeader
                  label={format(month, 'MMMM yyyy')}
                  onPrev={() => setMonth(new Date(month.getFullYear(), month.getMonth() - 1, 1))}
                  onNext={() => setMonth(new Date(month.getFullYear(), month.getMonth() + 1, 1))}
                  onToggle={() => setShowMonths(s => !s)}
                  expanded={showMonths}
                  className="mb-1 px-1"
                />
                <DayPicker
                  className="react-day-picker text-xs"
                  style={CALENDAR_RDP_STYLE}
                  weekStartsOn={1}
                  formatters={{ formatWeekdayName: formatNarrowWeekday }}
                  mode="single"
                  hideNavigation
                  selected={selectedDate}
                  onSelect={handleDaySelect}
                  month={month}
                  onMonthChange={setMonth}
                  showOutsideDays
                  disabled={disabledMatcher}
                  modifiers={{ holiday: holidayMatcher }}
                  components={{ MonthCaption: HiddenCaption, DayButton: holidayDayButton }}
                />
              </div>
              {showMonths && (
                <div className="w-44 p-2 pl-3 border-l border-gray-200">
                  <MonthYearPanel
                    year={month.getFullYear()}
                    selectedMonth={month.getMonth()}
                    monthLabels={MONTH_LABELS_SHORT}
                    onSelectMonth={m => {
                      setMonth(new Date(month.getFullYear(), m, 1));
                      setShowMonths(false);
                    }}
                    onStepYear={delta =>
                      setMonth(new Date(month.getFullYear() + delta, month.getMonth(), 1))
                    }
                    onSelectYear={y => setMonth(new Date(y, month.getMonth(), 1))}
                  />
                </div>
              )}
            </div>

            {/* Today gets a band of its own. Sharing one line with the time controls made the
                footer wider than the seven-column grid, and since the popover takes the width of
                its widest child, the whole calendar was stretched to fit it. Today only navigates —
                it jumps the calendar to this month without picking a date. */}
            <div className="flex items-center gap-2 px-2 py-1.5 border-t border-gray-200">
              <button
                type="button"
                onClick={() => {
                  setMonth(new Date());
                  setShowMonths(false);
                }}
                className="rounded px-1 py-0.5 text-xs font-semibold text-primary hover:bg-primary/10"
              >
                {todayLabel}
              </button>
              {selectedDate && (
                <span className="ml-auto text-xs text-gray-400">
                  {format(selectedDate, 'd MMM yyyy')}
                </span>
              )}
            </div>

            {/* The clock icon stands in for a "Time" label: the two boxes either side of a colon
                already read as a time, and the word cost more width than the row had. The selects
                carry their own aria-labels, so nothing is lost to a screen reader. */}
            <div className="flex items-center gap-2 px-2 py-1.5 border-t border-gray-200">
              <svg
                className="w-4 h-4 text-gray-400 flex-shrink-0"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              <TimeInput24 id={`${inputId}-time`} value={timeValue} onChange={handleTimeChange} />
              <button
                type="button"
                onClick={handleDone}
                className="ml-auto px-3 py-1 bg-primary text-primary-content rounded text-sm font-medium hover:bg-primary/90 transition-colors"
              >
                Done
              </button>
            </div>
          </div>
        )}

        {(helperText || error || constraintError) && (
          <p
            className={clsx(
              'mt-1 text-xs',
              constraintError || error ? 'text-danger' : 'text-gray-500',
            )}
            id={
              constraintError || error
                ? `${inputId}-error`
                : helperText
                  ? `${inputId}-helper`
                  : undefined
            }
          >
            {constraintError || error || helperText}
          </p>
        )}
      </div>
    );
  },
);

DateTimePickerInput.displayName = 'DateTimePickerInput';

export default DateTimePickerInput;
