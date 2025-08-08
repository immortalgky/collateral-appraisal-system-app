import { forwardRef, useId } from 'react';
import type { InputHTMLAttributes } from 'react';
import clsx from 'clsx';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  helperText?: string;
  error?: string;
  fullWidth?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
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
      ...props
    },
    ref,
  ) => {
    // Generate a unique ID if not provided
    const uuid = useId();
    const inputId = id || uuid;

    return (
      <div className={clsx(fullWidth && 'w-full')}>
        {label && (
          <label htmlFor={inputId} className="block text-sm font-medium text-gray-700 mb-1">
            {label}
            {required && <span className="text-danger"> *</span>}
          </label>
        )}

        <div className={clsx('relative', fullWidth && 'w-full')}>
          {leftIcon && (
            <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-gray-500">
              {leftIcon}
            </div>
          )}

          <input
            ref={ref}
            id={inputId}
            className={clsx(
              'block px-4 py-2 border rounded-md focus:ring-blue-500 focus:border-blue-500 sm:text-sm',
              error
                ? 'border-red-300 text-red-900 placeholder-red-300 focus:outline-none focus:ring-red-500 focus:border-red-500'
                : 'border-gray-300 focus:ring-blue-500 focus:border-blue-500',
              disabled ? 'bg-neutral-2' : 'bg-white',
              leftIcon && 'pl-10',
              rightIcon && 'pr-10',
              fullWidth && 'w-full',
              className,
            )}
            aria-invalid={error ? 'true' : 'false'}
            aria-describedby={
              error ? `${inputId}-error` : helperText ? `${inputId}-helper` : undefined
            }
            required={required}
            disabled={disabled}
            {...props}
          />

          {rightIcon && (
            <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none text-gray-500">
              {rightIcon}
            </div>
          )}
        </div>

        {(helperText || error) && (
          <p
            className={clsx('mt-1 text-sm', error ? 'text-red-600' : 'text-gray-500')}
            id={error ? `${inputId}-error` : helperText ? `${inputId}-helper` : undefined}
          >
            {error || helperText}
          </p>
        )}
      </div>
    );
  },
);

Input.displayName = 'Input';

export default Input;
