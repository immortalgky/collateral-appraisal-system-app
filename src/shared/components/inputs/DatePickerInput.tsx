import { forwardRef, useId, useRef, useState, useEffect } from 'react';
import { DayPicker } from 'react-day-picker';
import { format, formatISO, isValid, parse } from 'date-fns';
import clsx from 'clsx';
import 'react-day-picker/style.css';
import { useFormReadOnly } from '../form/context';

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
    const [position, setPosition] = useState<'bottom' | 'top'>('bottom');

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

    // Calculate position when opening (flip to top if not enough space below)
    useEffect(() => {
      if (isOpen && inputRef.current) {
        const rect = inputRef.current.getBoundingClientRect();
        const spaceBelow = window.innerHeight - rect.bottom;
        const calendarHeight = 320; // approximate height of calendar

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

      // Try to parse the input when complete (10 chars: dd/mm/yyyy)
      if (maskedValue.length === 10) {
        const parsed = parse(maskedValue, DATE_FORMAT, new Date());
        if (isValid(parsed)) {
          setMonth(parsed);
          onChange?.(formatISO(parsed));
        }
      } else if (maskedValue === '') {
        onChange?.(null);
      }
    };

    const handleDaySelect = (date: Date | undefined) => {
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
            aria-invalid={error ? 'true' : 'false'}
            aria-describedby={error ? `${inputId}-error` : helperText ? `${inputId}-helper` : undefined}
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
            )}
          >
            <DayPicker
              className="react-day-picker p-3"
              mode="single"
              selected={selectedDate}
              onSelect={handleDaySelect}
              month={month}
              onMonthChange={setMonth}
              showOutsideDays
              fixedWeeks
            />
          </div>
        )}

        {(helperText || error) && (
          <p
            className={clsx('mt-1 text-xs', error ? 'text-danger' : 'text-gray-500')}
            id={error ? `${inputId}-error` : helperText ? `${inputId}-helper` : undefined}
          >
            {error || helperText}
          </p>
        )}
      </div>
    );
  },
);

DatePickerInput.displayName = 'DatePickerInput';

export default DatePickerInput;
