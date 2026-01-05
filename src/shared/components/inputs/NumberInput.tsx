import { forwardRef, useId, useState, useEffect, useRef } from 'react';
import type { InputHTMLAttributes } from 'react';
import clsx from 'clsx';
import { useFormReadOnly } from '../form/context';

interface NumberInputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type' | 'onChange' | 'value'> {
  label?: string;
  helperText?: string;
  error?: string;
  fullWidth?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  /** Number of decimal places (default: 2) */
  decimalPlaces?: number;
  /** Allow negative numbers (default: false) */
  allowNegative?: boolean;
  /** Value from react-hook-form or controlled component */
  value?: number | string | null;
  /** onChange handler - receives number value */
  onChange?: (e: { target: { name?: string; value: number | null } }) => void;
  /** onBlur handler - compatible with react-hook-form */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  onBlur?: (...args: any[]) => any;
}

const NumberInput = forwardRef<HTMLInputElement, NumberInputProps>(
  (
    {
      className,
      label,
      helperText,
      error,
      fullWidth = true,
      leftIcon,
      rightIcon,
      required,
      disabled,
      id,
      name,
      decimalPlaces = 2,
      allowNegative = false,
      value,
      onChange,
      onBlur,
      placeholder,
      ...props
    },
    ref,
  ) => {
    const uuid = useId();
    const inputId = id || uuid;
    const isReadOnly = useFormReadOnly();
    const isDisabled = disabled || isReadOnly;
    const [displayValue, setDisplayValue] = useState('');
    const inputRef = useRef<HTMLInputElement>(null);
    const cursorPosRef = useRef<number | null>(null);

    // Combine refs
    const setRefs = (element: HTMLInputElement | null) => {
      inputRef.current = element;
      if (typeof ref === 'function') {
        ref(element);
      } else if (ref) {
        ref.current = element;
      }
    };

    // Format number with thousand separators (for display while typing)
    const formatWithCommas = (str: string): string => {
      if (!str) return '';

      // Handle negative sign
      const isNegative = str.startsWith('-');
      let cleanStr = isNegative ? str.slice(1) : str;

      // Split by decimal point
      const parts = cleanStr.split('.');
      const integerPart = parts[0].replace(/,/g, '');
      const decimalPart = parts[1];

      // Add commas to integer part
      const formattedInteger = integerPart.replace(/\B(?=(\d{3})+(?!\d))/g, ',');

      // Reconstruct
      let result = isNegative ? '-' + formattedInteger : formattedInteger;
      if (decimalPart !== undefined) {
        result += '.' + decimalPart;
      }

      return result;
    };

    // Format number with fixed decimal places (for blur)
    const formatNumber = (num: number | null | undefined): string => {
      if (num === null || num === undefined || isNaN(num)) return '';
      return num.toLocaleString('en-US', {
        minimumFractionDigits: decimalPlaces,
        maximumFractionDigits: decimalPlaces,
      });
    };

    // Parse string to number (removes commas)
    const parseNumber = (str: string): number | null => {
      if (!str || str === '' || str === '-') return null;
      const cleaned = str.replace(/,/g, '');
      const num = parseFloat(cleaned);
      return isNaN(num) ? null : num;
    };

    // Update display value when external value changes
    useEffect(() => {
      const numValue = typeof value === 'string' ? parseNumber(value) : value;
      if (numValue !== null && numValue !== undefined && !isNaN(numValue)) {
        // Only update if different to avoid cursor jumping
        const currentNum = parseNumber(displayValue);
        if (currentNum !== numValue) {
          setDisplayValue(formatNumber(numValue));
        }
      } else if (!displayValue || parseNumber(displayValue) !== null) {
        setDisplayValue('');
      }
    }, [value]);

    // Restore cursor position after formatting
    useEffect(() => {
      if (cursorPosRef.current !== null && inputRef.current) {
        inputRef.current.setSelectionRange(cursorPosRef.current, cursorPosRef.current);
        cursorPosRef.current = null;
      }
    }, [displayValue]);

    const handleFocus = (e: React.FocusEvent<HTMLInputElement>) => {
      // Select all on focus for easy editing
      e.target.select();
    };

    const handleBlur = () => {
      // Format with fixed decimal places on blur
      const numValue = parseNumber(displayValue);
      setDisplayValue(formatNumber(numValue));
      onBlur?.();
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
      const key = e.key.toLowerCase();

      // Handle multiplier shortcuts: k = ×1,000, m = ×1,000,000
      if (key === 'k' || key === 'm') {
        e.preventDefault();

        const currentValue = parseNumber(displayValue);
        if (currentValue === null || currentValue === 0) return;

        const multiplier = key === 'k' ? 1000 : 1000000;
        const newValue = currentValue * multiplier;

        const formatted = formatNumber(newValue);
        setDisplayValue(formatted);

        onChange?.({
          target: {
            name,
            value: newValue,
          },
        });
      }
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const inputValue = e.target.value;
      const cursorPos = e.target.selectionStart || 0;

      // Allow empty, minus sign (if allowed), numbers, decimal point, and commas
      const regex = allowNegative
        ? /^-?[\d,]*\.?\d*$/
        : /^[\d,]*\.?\d*$/;

      if (inputValue === '' || regex.test(inputValue)) {
        // Count commas before cursor in old value
        const oldCommasBefore = (displayValue.slice(0, cursorPos).match(/,/g) || []).length;

        // Format with commas
        const formatted = formatWithCommas(inputValue);

        // Count commas before cursor in new value
        const newCommasBefore = (formatted.slice(0, cursorPos).match(/,/g) || []).length;

        // Adjust cursor position based on comma difference
        const commaDiff = newCommasBefore - oldCommasBefore;
        cursorPosRef.current = cursorPos + commaDiff;

        setDisplayValue(formatted);

        // Parse and emit the numeric value
        const numValue = parseNumber(formatted);
        onChange?.({
          target: {
            name,
            value: numValue,
          },
        });
      }
    };

    return (
      <div className={clsx(fullWidth && 'w-full')}>
        {label && (
          <label htmlFor={inputId} className="block text-xs font-medium text-gray-700 mb-1">
            {label}
            {required && <span className="text-danger ml-0.5">*</span>}
          </label>
        )}

        <div className={clsx('relative', fullWidth && 'w-full')}>
          {leftIcon && (
            <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-gray-400">
              {leftIcon}
            </div>
          )}

          <input
            ref={setRefs}
            id={inputId}
            name={name}
            type="text"
            inputMode="decimal"
            className={clsx(
              'block px-3 py-2 border rounded-lg text-sm transition-colors duration-200',
              'placeholder:text-gray-400 text-right',
              error
                ? 'border-danger text-danger-900 placeholder:text-danger-300 focus:outline-none focus:ring-2 focus:ring-danger/20 focus:border-danger'
                : 'border-gray-200 focus:ring-2 focus:ring-gray-200 focus:border-gray-400',
              isDisabled ? 'bg-gray-50 text-gray-500 cursor-not-allowed' : 'bg-white hover:border-gray-300',
              leftIcon && 'pl-9',
              rightIcon && 'pr-9',
              fullWidth && 'w-full',
              className,
            )}
            aria-invalid={error ? 'true' : 'false'}
            aria-describedby={
              error ? `${inputId}-error` : helperText ? `${inputId}-helper` : undefined
            }
            disabled={isDisabled}
            value={displayValue}
            onChange={handleChange}
            onKeyDown={handleKeyDown}
            onFocus={handleFocus}
            onBlur={handleBlur}
            placeholder={placeholder || '0.00'}
            {...props}
          />

          {rightIcon && (
            <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none text-gray-400">
              {rightIcon}
            </div>
          )}
        </div>

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

NumberInput.displayName = 'NumberInput';

export default NumberInput;
