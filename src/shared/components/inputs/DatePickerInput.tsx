import {
  forwardRef,
  type ReactNode,
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
} from 'react';
import { createPortal } from 'react-dom';
import { DayPicker, type DateRange } from 'react-day-picker';
import { format, formatISO, isSameDay, isValid } from 'date-fns';
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

interface DatePickerInputProps {
  label?: string;
  /** Node rendered next to the label, outside it (e.g. a FieldHelp "?" button) */
  labelAddon?: ReactNode;
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

  // ── Range mode ────────────────────────────────────────────────────────────
  // Kept on separate props rather than widening `value`/`onChange`: those are typed for a single
  // date and wired into react-hook-form across 29 files. Overloading them would put every one of
  // those callers on a union type for a feature they never use.
  /** 'single' (default) is the original behaviour, untouched. */
  mode?: 'single' | 'range';
  /** mode='range' only. ISO strings; empty string means unset. */
  rangeValue?: { from: string; to: string };
  /** mode='range' only. Fires once, when the user confirms. */
  onRangeChange?: (from: string, to: string) => void;
  /**
   * mode='range' only. Labels for the confirm/clear footer.
   *
   * Passed in rather than translated here: every other string this component shows comes from its
   * caller too, and reaching for a namespace inside a generic input would tie it to one feature's
   * translation file.
   */
  rangeLabels?: { apply: string; clear: string };
}

const DATE_FORMAT = 'dd/MM/yyyy';

const DatePickerInput = forwardRef<HTMLInputElement, DatePickerInputProps>(
  (
    {
      label,
      labelAddon,
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
      holidays,
      disableHolidays,
      todayLabel = 'Today',
      mode = 'single',
      rangeValue,
      onRangeChange,
      rangeLabels = { apply: 'Apply', clear: 'Clear' },
    },
    ref,
  ) => {
    const isRange = mode === 'range';
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
    const [inputValue, setInputValue] = useState('');
    const [month, setMonth] = useState(new Date());
    const [showMonths, setShowMonths] = useState(false);
    const [position, setPosition] = useState<'bottom' | 'top'>('bottom');
    const [align, setAlign] = useState<'left' | 'right'>('left');
    // Viewport coordinates of the input, for the portalled calendar to anchor itself to.
    const [anchorRect, setAnchorRect] = useState<DOMRect | null>(null);
    /**
     * Range mode: the range being edited in the open calendar, published only when the user
     * confirms. Held locally so picking the start does not immediately apply a one-day filter and
     * refetch the list, and so both ends can be adjusted before anything happens.
     */
    const [draftRange, setDraftRange] = useState<DateRange | undefined>(undefined);

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

    /**
     * '∞' rather than '…': an end that has not been chosen yet and an end that is deliberately
     * open look identical otherwise, and the open end is the normal case here.
     */
    const formatRange = (from?: Date, to?: Date): string =>
      from || to
        ? `${from ? format(from, DATE_FORMAT) : '∞'} → ${to ? format(to, DATE_FORMAT) : '∞'}`
        : '';

    const selectedRange = useMemo<DateRange | undefined>(() => {
      if (!isRange) return undefined;
      const from = parseValue(rangeValue?.from);
      const to = parseValue(rangeValue?.to);
      return from || to ? { from, to } : undefined;
      // parseValue is a stable local helper over its argument only.
    }, [isRange, rangeValue?.from, rangeValue?.to]);

    /**
     * Closes on the SECOND click, so the first one leaves the calendar open to pick the other end.
     *
     * Counting clicks rather than reading `range.to`: react-day-picker returns a range whose `to`
     * is already filled on the very first click, so "close when both ends are set" closed the
     * calendar immediately and the user could never choose an end date.
     */
    /**
     * Confirms the drafted range.
     *
     * An explicit step rather than closing on the second click: react-day-picker fills `to` on the
     * very first click, so there is no reliable "the range is finished now" signal to close on —
     * and inferring it from a click count meant the calendar shut before the user had chosen an
     * end date.
     */
    /**
     * A single click gives react-day-picker `{ from: d, to: d }`. Read that as "from this date
     * onwards" rather than a one-day window: on a filter bar the open-ended reading is what people
     * mean by picking one date, and a same-day window is a result set of one day that almost
     * nobody is after. Clearing `to` is what makes the field publish only `createdFrom`.
     */
    const normalizeRange = (range: DateRange | undefined): DateRange | undefined => {
      if (range?.from && range.to && isSameDay(range.from, range.to)) {
        return { from: range.from, to: undefined };
      }
      return range;
    };

    const applyRange = () => {
      onRangeChange?.(
        draftRange?.from ? formatISO(draftRange.from) : '',
        draftRange?.to ? formatISO(draftRange.to) : '',
      );
      setIsOpen(false);
      onBlur?.();
    };

    // Sync input value with selected date
    // Use value (not selectedDate) in deps to avoid infinite loop from new Date object references
    useEffect(() => {
      if (isRange) {
        const from = parseValue(rangeValue?.from);
        const to = parseValue(rangeValue?.to);
        setInputValue(formatRange(from, to));
        if (from) setMonth(from);
        return;
      }
      // Single mode keeps its text in useDateSegmentInput; only the visible month is ours.
      const date = parseValue(value);
      if (date) setMonth(date);
    }, [value, isRange, rangeValue?.from, rangeValue?.to]);

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
    const updatePlacement = useCallback(() => {
      if (!inputRef.current) return;
      const rect = inputRef.current.getBoundingClientRect();
      setAnchorRect(rect);

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

      // Hang the calendar off the input's RIGHT edge, under the icon that opened it: on a wide
      // field a left-aligned popover appears a long way from where the user just clicked. Flip to
      // the left edge only when there is no room to expand leftwards but there is to the right —
      // a narrow field hard against the left of a scrollable panel.
      const calendarWidth = 460; // calendar + month/year panel when expanded
      const spaceLeft = rect.right - bounds.left;
      if (spaceLeft < calendarWidth && bounds.right - rect.left > calendarWidth) {
        setAlign('left');
      } else {
        setAlign('right');
      }
    }, []);

    // The calendar is portalled to <body> and positioned in viewport coordinates, so it has to
    // follow the input when anything moves it — a page scroll, a scrollable panel, a resize.
    useEffect(() => {
      if (!isOpen) return;
      updatePlacement();
      window.addEventListener('resize', updatePlacement);
      window.addEventListener('scroll', updatePlacement, true);
      return () => {
        window.removeEventListener('resize', updatePlacement);
        window.removeEventListener('scroll', updatePlacement, true);
      };
    }, [isOpen, updatePlacement]);

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
     * Single-date typing. The field is edited one segment at a time — click or arrow onto the
     * month, type over it, step it with the arrow keys — instead of retyping the whole value,
     * and the separators are never editable so the format stays locked. Nothing reaches the form
     * until the value is a complete, real, allowed date.
     */
    const segmentInput = useDateSegmentInput({
      value: isRange ? null : (selectedDate ?? null),
      withTime: false,
      inputRef,
      disabled: isDisabled,
      onCommit: useCallback(
        (date: Date | null) => onChange?.(date ? formatISO(date) : null),
        [onChange],
      ),
      validate: useCallback(
        (date: Date) => validateDateConstraints(date, constraints),
        [constraints],
      ),
      onNavigate: setMonth,
    });

    const handleDaySelect = (date: Date | undefined) => {
      onChange?.(date ? formatISO(date) : null);
      // Also tell the field, rather than waiting for the value to come back: picking the date the
      // form already holds is not a change, so nothing would arrive — and a rejected value the
      // user typed would stay on screen with its error, which is exactly what they opened the
      // calendar to get rid of.
      segmentInput.showValue(date ?? null);
      setIsOpen(false);
      onBlur?.();
    };

    const openCalendar = () => {
      if (!isDisabled) {
        setShowMonths(false);
        // Seed the draft from what is currently applied, so OPENING the calendar shows the range
        // in force and Apply without touching anything is a no-op.
        //
        // Only on the way open. The field is readOnly, so clicking it again while the calendar is
        // up is a normal thing to do (and unavoidable if the popover overlaps the field) — reseeding
        // there would throw away a start date the user had just picked and silently restart them.
        if (isRange && !isOpen) setDraftRange(selectedRange);
        setIsOpen(true);
      }
    };

    const toggleCalendar = () => {
      if (isOpen) setIsOpen(false);
      else openCalendar();
    };

    const handleInputBlur = () => {
      // Small delay to allow calendar click to register
      setTimeout(() => {
        if (!popoverRef.current?.contains(document.activeElement)) {
          onBlur?.();
        }
      }, 100);
    };

    // Single mode also rolls a half-typed value back to whatever the form holds.
    const handleSingleBlur = () => {
      segmentInput.inputProps.onBlur();
      handleInputBlur();
    };

    /** The typed-value message, e.g. "Cannot select a future date". */
    const constraintError = isRange ? null : segmentInput.error;

    return (
      <div className={clsx('relative', fullWidth && 'w-full')}>
        {/* Only wrap when there is an addon: the grid form layout hoists [data-field-label] out
            of this component with `display: contents`, so an extra element in between would take
            the label column and stretch. */}
        {labelAddon ? (
          <div className="flex items-center gap-1.5 mb-1">
            {label && (
              <label
                data-field-label
                htmlFor={inputId}
                className="block text-xs font-medium text-gray-700"
              >
                {label}
                {required && <span className="text-danger ml-0.5">*</span>}
              </label>
            )}
            {labelAddon}
          </div>
        ) : (
          label && (
            <label
              data-field-label
              htmlFor={inputId}
              className="block text-xs font-medium text-gray-700 mb-1"
            >
              {label}
              {required && <span className="text-danger ml-0.5">*</span>}
            </label>
          )
        )}

        <div className={clsx('relative', fullWidth && 'w-full')}>
          <input
            ref={setRefs}
            id={inputId}
            name={name}
            type="text"
            className={clsx(
              'block px-3 py-2 border rounded-lg text-sm transition-colors duration-200',
              // The trailing calendar glyph is absolutely positioned over the field. A single date
              // is short enough to clear it; a range ("11/08/2026 → 15/08/2026") is not, and ran
              // straight under the icon.
              isRange && 'pr-9',
              'placeholder:text-gray-400',
              error
                ? 'border-danger text-danger-900 placeholder:text-danger-300 focus:outline-none focus:ring-2 focus:ring-danger/20 focus:border-danger'
                : 'border-gray-200 focus:ring-2 focus:ring-gray-200 focus:border-gray-400',
              isDisabled
                ? 'bg-gray-50 text-gray-500 cursor-not-allowed'
                : clsx(
                    'bg-white hover:border-gray-300',
                    isRange ? 'cursor-pointer' : 'cursor-text',
                  ),
              // A value still being typed reads as a draft rather than as a date.
              !isRange &&
                !error &&
                !constraintError &&
                segmentInput.isIncomplete &&
                'text-gray-400',
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
            {...(isRange
              ? {
                  readOnly: true as const,
                  // The range field is read-only, so a click on it has nothing else to mean.
                  onClick: openCalendar,
                  onBlur: handleInputBlur,
                }
              : { ...segmentInput.inputProps, onBlur: handleSingleBlur })}
            // While the calendar is open the field mirrors the DRAFT, so the first click shows
            // "11/08/2026 → ∞" straight away instead of the value still in force.
            value={
              isRange
                ? isOpen
                  ? formatRange(draftRange?.from, draftRange?.to)
                  : inputValue
                : segmentInput.text
            }
          />

          {/* Calendar icon — the only way to open the calendar on a typeable field, so clicking
              into the text just puts the caret where the user aimed. */}
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

          {/* Calendar Popover — portalled to <body>, not rendered inside the field.
              react-day-picker builds the month as a <table>, and every rule in the grid form
              layout is gated on `[data-field]:not(:has(table))` so that LandTitleTable keeps its
              own layout. An in-place calendar therefore put a table inside the field the moment it
              opened, switched the whole two-column row off, and dropped the input onto its own
              full-width line until the calendar closed again. Out of the field, the guard never
              sees it. Positioned in viewport coordinates from the input's rect, so it also stops
              being clipped by scrollable ancestors. */}
          {isOpen &&
            createPortal(
              <div
                ref={popoverRef}
                style={{
                  position: 'fixed',
                  ...(position === 'bottom'
                    ? { top: (anchorRect?.bottom ?? 0) + 4 }
                    : { bottom: window.innerHeight - (anchorRect?.top ?? 0) + 4 }),
                  ...(align === 'left'
                    ? { left: anchorRect?.left ?? 0 }
                    : { right: window.innerWidth - (anchorRect?.right ?? 0) }),
                  visibility: anchorRect ? 'visible' : 'hidden',
                }}
                className="z-[100] bg-base-100 rounded-box shadow-lg border border-gray-200"
              >
                <div className="flex">
                  <div className="p-2">
                    <CalendarNavHeader
                      label={format(month, 'MMMM yyyy')}
                      onPrev={() =>
                        setMonth(new Date(month.getFullYear(), month.getMonth() - 1, 1))
                      }
                      onNext={() =>
                        setMonth(new Date(month.getFullYear(), month.getMonth() + 1, 1))
                      }
                      onToggle={() => setShowMonths(s => !s)}
                      expanded={showMonths}
                      className="mb-1 px-1"
                    />
                    {/* Two literal blocks rather than a `mode={mode}` variable: react-day-picker's
                      props are a discriminated union on `mode`, so `selected`/`onSelect` only
                      typecheck against a literal. */}
                    {isRange ? (
                      <DayPicker
                        className="react-day-picker text-xs"
                        style={CALENDAR_RDP_STYLE}
                        weekStartsOn={1}
                        formatters={{ formatWeekdayName: formatNarrowWeekday }}
                        mode="range"
                        hideNavigation
                        selected={draftRange}
                        onSelect={range => setDraftRange(normalizeRange(range))}
                        month={month}
                        onMonthChange={setMonth}
                        showOutsideDays
                        disabled={disabledMatcher}
                        modifiers={{ holiday: holidayMatcher }}
                        components={{ MonthCaption: HiddenCaption, DayButton: holidayDayButton }}
                      />
                    ) : (
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
                    )}
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
                {/* Today sits on the first screen. It only navigates — jumping the calendar to
                    this month without picking a date, so a field that forbids today (or is simply
                    being browsed) behaves the same as any other month change. */}
                <div className="flex items-center justify-between gap-2 border-t border-gray-200 px-2 py-1.5">
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
                  {isRange && (
                    <div className="flex items-center gap-3">
                      <button
                        type="button"
                        onClick={() => setDraftRange(undefined)}
                        className="text-xs text-gray-500 hover:text-gray-700 disabled:opacity-40"
                        disabled={!draftRange?.from}
                      >
                        {rangeLabels.clear}
                      </button>
                      <button
                        type="button"
                        onClick={applyRange}
                        className="rounded-md bg-primary px-3 py-1 text-xs font-medium text-white hover:bg-primary/90"
                      >
                        {rangeLabels.apply}
                      </button>
                    </div>
                  )}
                </div>
              </div>,
              document.body,
            )}
        </div>

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
