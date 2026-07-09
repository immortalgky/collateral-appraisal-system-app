import { forwardRef, useEffect, useId, useMemo, useRef, useState } from 'react';
import { DayPicker } from 'react-day-picker';
import { format, formatISO, isValid, parse } from 'date-fns';
import clsx from 'clsx';
import 'react-day-picker/style.css';
import { useFormReadOnly } from '../form/context';
import { buildDisabledMatcher, validateDateConstraints } from './dateConstraints';
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

interface DatePickerInputProps {
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

const DATE_FORMAT = 'dd/MM/yyyy';

const DatePickerInput = forwardRef<HTMLInputElement, DatePickerInputProps>(
  (
    {
      label,
      helperText,
      error,
      fullWidth = true,
      required,
      disabled,
      placeholder = 'dd/mm/yyyy',
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
    const [position, setPosition] = useState<'bottom' | 'top'>('bottom');
    const [align, setAlign] = useState<'left' | 'right'>('left');
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

    // Sync input value with selected date
    // Use value (not selectedDate) in deps to avoid infinite loop from new Date object references
    useEffect(() => {
      const date = parseValue(value);
      if (date) {
        setInputValue(format(date, DATE_FORMAT));
        setMonth(date);
      } else {
        setInputValue('');
      }
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [value]);

    // Helper bound
    function getScrollParent(node: HTMLElement | null): HTMLElement | null {
      let el = node?.parentElement ?? null;
      while (el) {
        const { overflowX, overflowY } = getComputedStyle(el);
        if (/(auto|scroll|hidden)/.test(overflowX + overflowY)) return el;
        el = el.parentElement;
      }
      return null;
    }

    // Calculate position when opening (flip to top if not enough space below)
    useEffect(() => {
      if (isOpen && inputRef.current) {
        const rect = inputRef.current.getBoundingClientRect();
        const scrollParent = getScrollParent(inputRef.current);
        const bounds = scrollParent
          ? scrollParent.getBoundingClientRect()
          : { top: 0, bottom: window.innerHeight, left: 0, right: window.innerWidth };

        const spaceBelow = bounds.bottom - rect.bottom;
        const calendarHeight = 320; // approximate height of calendar
        if (spaceBelow < calendarHeight && rect.top - bounds.top > calendarHeight) {
          setPosition('top');
        } else {
          setPosition('bottom');
        }

        // Horizontal flip: a left-aligned calendar overflows to the right and can be
        // clipped by a scrollable/narrow container (e.g. a search panel). When there
        // isn't room on the right, anchor to the input's right edge so it expands left.
        const calendarWidth = 460; // calendar + month/year panel when expanded
        const spaceRight = bounds.right - rect.left;
        if (spaceRight < calendarWidth && rect.right - bounds.left > calendarWidth) {
          setAlign('right');
        } else {
          setAlign('left');
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

    // Apply date mask: dd/mm/yyyy
    const applyDateMask = (value: string): string => {
      // Remove all non-digits
      const digits = value.replace(/\D/g, '');

      // Build masked value
      let masked = '';
      for (let i = 0; i < digits.length && i < 8; i++) {
        if (i === 2 || i === 4) {
          masked += '/';
        }
        masked += digits[i];
      }

      return masked;
    };

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const rawValue = e.target.value;
      const maskedValue = applyDateMask(rawValue);
      setInputValue(maskedValue);

      // Clear stale constraint error while user is editing
      if (maskedValue.length < 10 && maskedValue !== '') {
        setConstraintError(null);
      }

      // Try to parse the input when complete (10 chars: dd/mm/yyyy)
      if (maskedValue.length === 10) {
        const parsed = parse(maskedValue, DATE_FORMAT, new Date());
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
          onChange?.(formatISO(parsed));
        }
      } else if (maskedValue === '') {
        setConstraintError(null);
        onChange?.(null);
      }
    };

    const handleDaySelect = (date: Date | undefined) => {
      setConstraintError(null);
      if (date) {
        setInputValue(format(date, DATE_FORMAT));
        onChange?.(formatISO(date));
      } else {
        setInputValue('');
        onChange?.(null);
      }
      setIsOpen(false);
      onBlur?.();
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

    return (
      <div className={clsx('relative', fullWidth && 'w-full')}>
        {label && (
          <label htmlFor={inputId} className="block text-xs font-medium text-gray-700 mb-1">
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

        {/* Calendar Popover */}
        {isOpen && (
          <div
            ref={popoverRef}
            className={clsx(
              'absolute z-[100] bg-base-100 rounded-box shadow-lg border border-gray-200',
              position === 'bottom' ? 'mt-1' : 'bottom-full mb-1',
              align === 'right' ? 'right-0' : 'left-0',
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

DatePickerInput.displayName = 'DatePickerInput';

export default DatePickerInput;
