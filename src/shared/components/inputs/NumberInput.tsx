import type { InputHTMLAttributes, ReactNode } from 'react';
import { forwardRef, useEffect, useId, useRef, useState } from 'react';
import clsx from 'clsx';
import { useFormReadOnly } from '../form/context';
import { useFormLayout } from '../form/formLayoutContext';
import { ValidationText } from '../form/ValidationText';
import {
  controlFrame,
  controlGeometry,
  controlPad,
  controlSkin,
  ERROR_TEXT,
  HELPER_TEXT,
  REQUIRED_MARK,
} from './controlStyles';

interface NumberInputProps extends Omit<
  InputHTMLAttributes<HTMLInputElement>,
  'type' | 'onChange' | 'value'
> {
  label?: string;
  /** Node rendered next to the label, outside it (e.g. a FieldHelp "?" button) */
  labelAddon?: ReactNode;
  /** Text under the control; a node when it needs a link (e.g. a reset back to a derived value). */
  helperText?: ReactNode;
  error?: string;
  fullWidth?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  /** Non-interactive unit suffix shown on the right (e.g. "m", "years", "%"). Visual-only — does not affect the value. */
  suffix?: string;
  /** Number of decimal places (default: 2) */
  decimalPlaces?: number;
  /** Allow negative numbers (default: false) */
  allowNegative?: boolean;
  /** Max digits before the decimal point, excluding commas (e.g., 15 for DECIMAL(17,2)) */
  maxIntegerDigits?: number;
  /** Show thousand separators (default: true) */
  thousandSeparator?: boolean;
  /** Value from react-hook-form or controlled component */
  value?: number | string | null;
  /**
   * A table cell input (DESIGN.md 17.7): 28px in a Compact form, the plain Standard control in a
   * Standard one. Use it in the form table kit instead of `dense`.
   */
  cell?: boolean;
  /** The error look (red edge and ring, `aria-invalid`) without a message, for a table cell whose reason is stated elsewhere. */
  invalid?: boolean;
  /**
   * The pricing-analysis grids' 21px input (their own mock), outside the form system. Not for
   * forms: a form table cell uses `cell`.
   */
  dense?: boolean;
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
      labelAddon,
      helperText,
      error,
      fullWidth = true,
      leftIcon,
      rightIcon,
      suffix,
      required,
      disabled,
      id,
      name,
      decimalPlaces = 2,
      allowNegative = false,
      maxIntegerDigits = 18,
      thousandSeparator = true,
      max,
      value,
      onChange,
      onBlur,
      onKeyDown,
      placeholder,
      min,
      dense = false,
      cell = false,
      invalid = false,
      ...props
    },
    ref,
  ) => {
    const uuid = useId();
    const inputId = id || uuid;
    const isReadOnly = useFormReadOnly();
    const isDisabled = disabled || isReadOnly;
    const layout = useFormLayout();
    const hasError = !!error || invalid;
    // The unit sits inside the box, after the figure: the border and ring move to a wrapper and the
    // input inside is borderless (17.3). The pricing grids' dense input keeps its overlaid suffix.
    const suffixInBox = !!suffix && !rightIcon && !dense;
    const [displayValue, setDisplayValue] = useState('');
    const inputRef = useRef<HTMLInputElement>(null);
    const cursorPosRef = useRef<number | null>(null);

    const maxValue =
      typeof max === 'number' ? max : max != null ? parseFloat(String(max)) : undefined;
    const minValue =
      typeof min === 'number' ? min : min != null ? parseFloat(String(min)) : undefined;

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
      const cleanStr = isNegative ? str.slice(1) : str;

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
      if (!thousandSeparator) return num.toFixed(decimalPlaces);
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
        let newValue = currentValue * multiplier;

        // Clamp to maxIntegerDigits limit
        if (maxIntegerDigits != null) {
          const maxAllowed = Math.pow(10, maxIntegerDigits) - 1;
          if (newValue > maxAllowed) {
            newValue = maxAllowed;
          }
        }

        // Clamp to max limit
        if (maxValue != null && newValue > maxValue) {
          newValue = maxValue;
        }

        // Clamp to min limit
        if (minValue != null && newValue < minValue) {
          newValue = minValue;
        }

        const formatted = formatNumber(newValue);
        setDisplayValue(formatted);

        onChange?.({
          target: {
            name,
            value: newValue,
          },
        });
      }

      onKeyDown?.(e);
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const inputValue = e.target.value;
      const cursorPos = e.target.selectionStart || 0;

      // Allow empty, minus sign (if allowed), numbers, decimal point, and commas
      const regex = allowNegative ? /^-?[\d,]*\.?\d*$/ : /^[\d,]*\.?\d*$/;

      if (inputValue === '' || regex.test(inputValue)) {
        // Enforce digit limits (exclude commas)
        const cleaned = inputValue.replace(/,/g, '');
        const numStr = cleaned.startsWith('-') ? cleaned.slice(1) : cleaned;
        const parts = numStr.split('.');
        const intPart = parts[0].replace(/^0+(?=\d)/, ''); // strip leading zeros
        if (maxIntegerDigits != null && intPart.length > maxIntegerDigits) return;
        if (decimalPlaces === 0 && parts.length > 1) return;
        if (
          decimalPlaces != null &&
          decimalPlaces > 0 &&
          parts[1] != null &&
          parts[1].length > decimalPlaces
        )
          return;

        // Enforce max value
        if (maxValue != null) {
          const candidateNum = parseFloat(cleaned);
          if (!isNaN(candidateNum) && candidateNum > maxValue) return;
        }

        // Enforce min value
        if (minValue != null) {
          const candidateNum = parseFloat(cleaned);
          if (!isNaN(candidateNum) && candidateNum < minValue) return;
        }

        // Count commas before cursor in old value
        const oldCommasBefore = (displayValue.slice(0, cursorPos).match(/,/g) || []).length;

        // Format with commas (or without if thousandSeparator is false)
        const formatted = thousandSeparator
          ? formatWithCommas(inputValue)
          : inputValue.replace(/,/g, '');

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
        {labelAddon ? (
          <div className="flex items-center gap-1.5 mb-1">
            {label && (
              <label htmlFor={inputId} className="block text-xs font-medium text-(--palette-ink)">
                {label}
                {required && <span className={REQUIRED_MARK}>*</span>}
              </label>
            )}
            {labelAddon}
          </div>
        ) : (
          label && (
            <label
              htmlFor={inputId}
              className="block text-xs font-medium text-(--palette-ink) mb-1"
            >
              {label}
              {required && <span className={REQUIRED_MARK}>*</span>}
            </label>
          )
        )}

        <div
          className={clsx(
            'relative',
            fullWidth && 'w-full',
            // The box itself when the unit sits inside it: border, fill and focus ring live here.
            suffixInBox && [
              'flex items-center',
              controlFrame(layout, cell),
              controlSkin({ error: hasError, disabled: isDisabled, within: true }),
              className,
            ],
          )}
        >
          {leftIcon && (
            <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-(--palette-gray-400)">
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
              'block text-right tabular-nums',
              suffixInBox
                ? // Borderless: colour, size and focus come from the wrapper. The right edge is the
                  // suffix's, so the input takes only the left padding.
                  clsx(
                    'min-w-0 flex-1 h-full bg-transparent border-0 pr-0 placeholder:text-(--palette-ink-2) focus:outline-none disabled:cursor-not-allowed',
                    controlPad(layout, cell, 'l'),
                  )
                : dense
                  ? // Dense follows the mock's `.in` exactly (pricing-analysis-compact-mock.html:
                    // 192-198): 21px tall, 4px radius, 12px text, quiet #f6f9f9 fill with a
                    // transparent border at rest — border only appears on hover/focus, no focus
                    // ring (mock: outline:none).
                    clsx(
                      'h-[21px] px-[5px] py-0 border rounded-[4px] text-[12px] transition-colors duration-200 placeholder:text-(--palette-ink-2)',
                      error
                        ? 'border-danger text-danger-900 dark:text-(--palette-danger) focus:outline-none focus:ring-2 focus:ring-danger/20 focus:border-danger'
                        : 'border-transparent text-(--palette-ink) focus:outline-none focus:border-(--focus-edge)',
                      isDisabled
                        ? 'bg-(--palette-surface-2) text-(--palette-ink-2)! cursor-not-allowed'
                        : 'bg-(--palette-surface-2) hover:border-(--palette-line-strong) focus:bg-(--form-input-bg)',
                    )
                  : // The form-system box (17.3). No `leading-*`: index.css gives every text input
                    // a 1.8 line height for Thai marks, and the fixed height keeps it centred.
                    clsx(
                      controlGeometry(layout, cell),
                      controlSkin({ error: hasError, disabled: isDisabled }),
                    ),
              // `!`: the icon sits over the box, and a table cell's skin padding would put the
              // (right-aligned) figure under it.
              leftIcon && 'pl-9!',
              rightIcon && 'pr-12!',
              dense && suffix && !rightIcon && 'pr-10!',
              fullWidth && 'w-full',
              !suffixInBox && className,
            )}
            aria-invalid={hasError ? 'true' : 'false'}
            aria-describedby={
              error ? `${inputId}-error` : helperText ? `${inputId}-helper` : undefined
            }
            disabled={isDisabled}
            value={displayValue}
            onChange={handleChange}
            onKeyDown={handleKeyDown}
            onFocus={handleFocus}
            onBlur={handleBlur}
            placeholder={placeholder || (0).toFixed(decimalPlaces)}
            {...props}
          />

          {rightIcon && (
            <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none text-(--palette-gray-400)">
              {rightIcon}
            </div>
          )}

          {suffix && !rightIcon && (
            <span
              aria-hidden="true"
              className={
                suffixInBox
                  ? clsx(
                      'shrink-0 pl-2 text-xs text-(--palette-ink-2) select-none',
                      controlPad(layout, cell, 'r'),
                    )
                  : 'absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none text-xs font-medium text-(--palette-gray-400) select-none'
              }
            >
              {suffix}
            </span>
          )}
        </div>

        {(helperText || error) && (
          <p
            className={clsx('mt-1', error ? ERROR_TEXT : HELPER_TEXT)}
            id={error ? `${inputId}-error` : `${inputId}-helper`}
          >
            {error ? <ValidationText message={error} label={label} /> : helperText}
          </p>
        )}
      </div>
    );
  },
);

NumberInput.displayName = 'NumberInput';

export default NumberInput;
