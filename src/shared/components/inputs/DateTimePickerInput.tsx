import { forwardRef, useEffect, useId, useMemo, useRef, useState } from 'react';
import { DayPicker } from 'react-day-picker';
import { format, formatISO, isValid, parse, setHours, setMinutes } from 'date-fns';
import clsx from 'clsx';
import 'react-day-picker/style.css';
import { useFormReadOnly } from '../form/context';
import { buildDisabledMatcher, validateDateConstraints } from './dateConstraints';
import { ScrollableSelect } from './ScrollableSelect';
import { CalendarNavHeader } from './CalendarNavHeader';
import { MonthYearPanel } from './MonthYearPanel';

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
}

const DATETIME_FORMAT = 'dd/MM/yyyy HH:mm';

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
    },
    ref,
  ) => {
    const uuid = useId();
    const inputId = uuid;
    const isReadOnly = useFormReadOnly();
    const isDisabled = disabled || isReadOnly;
    const popoverRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);
    const [isOpen, setIsOpen] = useState(false);
    const [inputValue, setInputValue] = useState('');
    const [month, setMonth] = useState(new Date());
    const [showMonths, setShowMonths] = useState(false);
    const [timeValue, setTimeValue] = useState('00:00');
    const [position, setPosition] = useState<'bottom' | 'top'>('bottom');
    const [constraintError, setConstraintError] = useState<string | null>(null);

    const disabledMatcher = useMemo(
      () =>
        buildDisabledMatcher({
          disablePastDates,
          disableFutureDates,
          disableToday,
          minDate,
          disableDaysBefore,
          disableDaysAfter,
        }),
      [
        disablePastDates,
        disableFutureDates,
        disableToday,
        minDate,
        disableDaysBefore,
        disableDaysAfter,
      ],
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
      const date = parseValue(value);
      if (date) {
        setInputValue(format(date, DATETIME_FORMAT));
        setMonth(date);
        setTimeValue(format(date, 'HH:mm'));
      } else {
        setInputValue('');
      }
      // eslint-disable-next-line react-hooks/exhaustive-deps
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
          !inputRef.current.contains(event.target as Node)
        ) {
          setIsOpen(false);
        }
      };

      if (isOpen) {
        document.addEventListener('mousedown', handleClickOutside);
      }

      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
      };
    }, [isOpen]);

    // Apply datetime mask: dd/mm/yyyy hh:mm
    const applyDateTimeMask = (value: string): string => {
      // Remove all non-digits
      const digits = value.replace(/\D/g, '');

      // Build masked value: dd/mm/yyyy hh:mm
      let masked = '';
      for (let i = 0; i < digits.length && i < 12; i++) {
        if (i === 2 || i === 4) {
          masked += '/';
        } else if (i === 8) {
          masked += ' ';
        } else if (i === 10) {
          masked += ':';
        }
        masked += digits[i];
      }

      return masked;
    };

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const rawValue = e.target.value;
      const maskedValue = applyDateTimeMask(rawValue);
      setInputValue(maskedValue);

      // Clear stale constraint error while user is editing
      if (maskedValue.length < 16 && maskedValue !== '') {
        setConstraintError(null);
      }

      // Try to parse the input when complete (16 chars: dd/mm/yyyy hh:mm)
      if (maskedValue.length === 16) {
        const parsed = parse(maskedValue, DATETIME_FORMAT, new Date());
        if (isValid(parsed)) {
          const violation = validateDateConstraints(parsed, {
            disablePastDates,
            disableFutureDates,
            disableToday,
          });
          if (violation) {
            setConstraintError(violation);
            return;
          }
          setConstraintError(null);
          setMonth(parsed);
          setTimeValue(format(parsed, 'HH:mm'));
          onChange?.(formatISO(parsed));
        }
      } else if (maskedValue === '') {
        setConstraintError(null);
        onChange?.(null);
      }
    };

    const applyTimeToDate = (date: Date, time: string): Date => {
      const [hours, minutes] = time.split(':').map(s => parseInt(s, 10));
      return setMinutes(setHours(date, hours || 0), minutes || 0);
    };

    const handleDaySelect = (date: Date | undefined) => {
      setConstraintError(null);
      if (date) {
        const dateWithTime = applyTimeToDate(date, timeValue);
        setInputValue(format(dateWithTime, DATETIME_FORMAT));
        onChange?.(formatISO(dateWithTime));
      } else {
        setInputValue('');
        onChange?.(null);
      }
    };

    const handleTimeChange = (newTime: string) => {
      setTimeValue(newTime);

      if (selectedDate) {
        const dateWithTime = applyTimeToDate(selectedDate, newTime);
        setInputValue(format(dateWithTime, DATETIME_FORMAT));
        onChange?.(formatISO(dateWithTime));
      }
    };

    const handleInputClick = () => {
      if (!isDisabled) {
        setShowMonths(false);
        setIsOpen(true);
      }
    };

    const handleInputBlur = () => {
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
          <label data-field-label htmlFor={inputId} className="block text-xs font-medium text-gray-700 mb-1">
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
              'block px-3 py-2 border rounded-lg text-sm transition-colors duration-200',
              'placeholder:text-gray-400',
              error
                ? 'border-danger text-danger-900 placeholder:text-danger-300 focus:outline-none focus:ring-2 focus:ring-danger/20 focus:border-danger'
                : 'border-gray-200 focus:ring-2 focus:ring-gray-200 focus:border-gray-400',
              isDisabled
                ? 'bg-gray-50 text-gray-500 cursor-not-allowed'
                : 'bg-white hover:border-gray-300 cursor-pointer',
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
            value={inputValue}
            onChange={handleInputChange}
            onClick={handleInputClick}
            onBlur={handleInputBlur}
            autoComplete="off"
          />

          {/* Calendar Icon */}
          <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none text-gray-400">
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
          </div>
        </div>

        {/* Calendar Popover with Time */}
        {isOpen && (
          <div
            ref={popoverRef}
            className={clsx(
              'absolute z-[100] bg-base-100 rounded-box shadow-lg border border-gray-200',
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
                  components={{ MonthCaption: HiddenCaption }}
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
                    onToday={() => {
                      setMonth(new Date());
                      setShowMonths(false);
                    }}
                  />
                </div>
              )}
            </div>

            {/* Time + Done footer */}
            <div className="px-2 pb-2 pt-2 border-t border-gray-200">
              <div className="flex items-center gap-2">
                <label htmlFor={`${inputId}-time`} className="text-xs font-medium text-gray-700">
                  Time
                </label>
                <TimeInput24
                  id={`${inputId}-time`}
                  value={timeValue}
                  onChange={handleTimeChange}
                  className="flex-1"
                />
                <button
                  type="button"
                  onClick={handleDone}
                  className="px-3 py-1 bg-primary text-primary-content rounded text-sm font-medium hover:bg-primary/90 transition-colors"
                >
                  Done
                </button>
              </div>
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
