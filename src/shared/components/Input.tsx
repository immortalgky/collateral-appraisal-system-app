import { forwardRef, useId } from 'react';
import type { InputHTMLAttributes } from 'react';
import clsx from 'clsx';
import { useFormReadOnly } from './form/context';
import { useFormLayout } from './form/formLayoutContext';
import { ValidationText } from './form/ValidationText';
import {
  controlGeometry,
  controlSkin,
  ERROR_TEXT,
  HELPER_TEXT,
  REQUIRED_MARK,
  counterClass,
} from './inputs/controlStyles';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  /** Node rendered next to the label, outside it (e.g. a FieldHelp "?" button) */
  labelAddon?: React.ReactNode;
  helperText?: string;
  error?: string;
  fullWidth?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  /** Show character count when maxLength is set */
  showCharCount?: boolean;
  /**
   * A table cell input (DESIGN.md 17.7): 28px in a Compact form, the plain Standard control in a
   * Standard one. Use it in the form table kit instead of `dense`.
   */
  cell?: boolean;
  /**
   * The pricing-analysis grids' 21px input (their own mock), outside the form system. Not for
   * forms: a form table cell uses `cell`.
   */
  dense?: boolean;
}

const Input = forwardRef<HTMLInputElement, InputProps>((allProps, ref) => {
  const {
    className,
    label,
    labelAddon,
    helperText,
    error,
    fullWidth = true,
    leftIcon,
    rightIcon,
    required,
    disabled,
    id,
    showCharCount,
    maxLength,
    value,
    dense = false,
    cell = false,
    ...props
  } = allProps;
  // Generate a unique ID if not provided
  const uuid = useId();
  const inputId = id || uuid;
  const isReadOnly = useFormReadOnly();
  const isDisabled = disabled || isReadOnly;
  const layout = useFormLayout();

  // Calculate current character count for display
  const currentLength = typeof value === 'string' ? value.length : 0;
  const shouldShowCount = showCharCount && maxLength !== undefined;

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
          <label htmlFor={inputId} className="block text-xs font-medium text-(--palette-ink) mb-1">
            {label}
            {required && <span className={REQUIRED_MARK}>*</span>}
          </label>
        )
      )}

      <div className={clsx('relative', fullWidth && 'w-full')}>
        {leftIcon && (
          <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-(--palette-gray-400)">
            {leftIcon}
          </div>
        )}

        <input
          ref={ref}
          id={inputId}
          className={clsx(
            'block',
            // Dense follows the mock's `.in` exactly (pricing-analysis-compact-mock.html:192-198):
            // 21px tall, 4px radius, 12px text, right-aligned, quiet #f6f9f9 fill with a
            // transparent border at rest — border only on hover/focus, no focus ring.
            dense
              ? clsx(
                  'h-[21px] px-[5px] py-0 border rounded-[4px] text-[12px] text-right transition-colors duration-200 placeholder:text-(--palette-ink-2)',
                  error
                    ? 'border-danger text-danger-900 dark:text-(--palette-danger) focus:outline-none focus:ring-2 focus:ring-danger/20 focus:border-danger'
                    : 'border-transparent text-(--palette-ink) focus:outline-none focus:border-primary-600',
                  isDisabled
                    ? 'bg-(--palette-surface-2) text-(--palette-ink-2)! cursor-not-allowed'
                    : 'bg-(--palette-surface-2) hover:border-(--palette-line-strong) focus:bg-(--form-input-bg)',
                )
              : // The form-system box (17.3). No `leading-*`: index.css gives every text input
                // a 1.8 line height for Thai marks, and the fixed height keeps the text centred.
                clsx(
                  controlGeometry(layout, cell),
                  controlSkin({ error: !!error, disabled: isDisabled }),
                ),
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
          maxLength={maxLength}
          // `null` is a legitimate form value — "not applicable", or a field the API must leave
          // alone — but React reads it as "uncontrolled" and stops managing the box, leaving
          // whatever text was last in the DOM on screen. An empty string is the controlled way
          // to say the same thing. Only coerce when the caller passed `value` at all:
          // `{...register('x')}` passes none and keeps its text in the DOM, so forcing '' on it
          // would freeze the box.
          value={'value' in allProps ? (value ?? '') : undefined}
          {...props}
        />

        {rightIcon && (
          <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none text-(--palette-gray-400)">
            {rightIcon}
          </div>
        )}
      </div>

      {(helperText || error || shouldShowCount) && (
        <div className="flex justify-between gap-2 mt-1">
          {(error || helperText) && (
            <p
              className={error ? ERROR_TEXT : HELPER_TEXT}
              id={error ? `${inputId}-error` : `${inputId}-helper`}
            >
              {error ? <ValidationText message={error} label={label} /> : helperText}
            </p>
          )}
          {shouldShowCount && (
            <span className={clsx('ml-auto', counterClass(currentLength > maxLength!))}>
              {currentLength.toLocaleString('en-US')}/{maxLength!.toLocaleString('en-US')}
            </span>
          )}
        </div>
      )}
    </div>
  );
});

Input.displayName = 'Input';

export default Input;
