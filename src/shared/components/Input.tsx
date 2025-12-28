import { forwardRef, useId } from 'react';
import type { InputHTMLAttributes } from 'react';
import clsx from 'clsx';
import { useFormReadOnly } from './form/context';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  helperText?: string;
  error?: string;
  fullWidth?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  /** Show character count when maxLength is set */
  showCharCount?: boolean;
}

const Input = forwardRef<HTMLInputElement, InputProps>(
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
      showCharCount,
      maxLength,
      value,
      ...props
    },
    ref,
  ) => {
    // Generate a unique ID if not provided
    const uuid = useId();
    const inputId = id || uuid;
    const isReadOnly = useFormReadOnly();
    const isDisabled = disabled || isReadOnly;

    // Calculate current character count for display
    const currentLength = typeof value === 'string' ? value.length : 0;
    const shouldShowCount = showCharCount && maxLength !== undefined;

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
            ref={ref}
            id={inputId}
            className={clsx(
              'block px-3 py-2 border rounded-lg text-sm transition-colors duration-200',
              'placeholder:text-gray-400',
              error
                ? 'border-danger text-danger-900 placeholder:text-danger-300 focus:outline-none focus:ring-2 focus:ring-danger/20 focus:border-danger'
                : 'border-gray-200 focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500',
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
            maxLength={maxLength}
            value={value}
            {...props}
          />

          {rightIcon && (
            <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none text-gray-400">
              {rightIcon}
            </div>
          )}
        </div>

        {(helperText || error || shouldShowCount) && (
          <div className="flex justify-between mt-1">
            <p
              className={clsx('text-xs', error ? 'text-danger' : 'text-gray-500')}
              id={error ? `${inputId}-error` : helperText ? `${inputId}-helper` : undefined}
            >
              {error || helperText}
            </p>
            {shouldShowCount && (
              <span
                className={clsx(
                  'text-xs',
                  currentLength > maxLength! ? 'text-danger' : 'text-gray-400'
                )}
              >
                {currentLength}/{maxLength}
              </span>
            )}
          </div>
        )}
      </div>
    );
  },
);

Input.displayName = 'Input';

export default Input;
