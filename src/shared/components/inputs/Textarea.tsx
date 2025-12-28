import { Field, Label, Textarea as HeadlessTextarea } from '@headlessui/react';
import clsx from 'clsx';
import type { TextareaHTMLAttributes } from 'react';
import { useFormReadOnly } from '../form/context';

interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  helperText?: string;
  error?: string;
  fullWidth?: boolean;
  /** Show character count when maxLength is set */
  showCharCount?: boolean;
}

const Textarea = ({
  label,
  helperText,
  error,
  fullWidth = true,
  required,
  disabled,
  className,
  showCharCount,
  maxLength,
  value,
  ...props
}: TextareaProps) => {
  const isReadOnly = useFormReadOnly();
  const isDisabled = disabled || isReadOnly;
  // Calculate current character count for display
  const currentLength = typeof value === 'string' ? value.length : 0;
  const shouldShowCount = showCharCount && maxLength !== undefined;

  return (
    <Field className={clsx(fullWidth && 'w-full', 'flex', 'flex-col')}>
      {label && (
        <Label className="block text-xs font-medium text-gray-700 mb-1">
          {label}
          {required && <span className="text-danger ml-0.5">*</span>}
        </Label>
      )}
      <HeadlessTextarea
        className={clsx(
          'block px-3 py-2 border rounded-lg text-sm transition-colors duration-200 min-h-[120px]',
          'placeholder:text-gray-400 resize-y',
          error
            ? 'border-danger text-danger-900 placeholder:text-danger-300 focus:outline-none focus:ring-2 focus:ring-danger/20 focus:border-danger'
            : 'border-gray-200 focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500',
          isDisabled ? 'bg-gray-50 text-gray-500 cursor-not-allowed' : 'bg-white hover:border-gray-300',
          fullWidth && 'w-full',
          className,
        )}
        disabled={isDisabled}
        maxLength={maxLength}
        value={value}
        {...props}
      />
      {(helperText || error || shouldShowCount) && (
        <div className="flex justify-between mt-1">
          <p className={clsx('text-xs', error ? 'text-danger' : 'text-gray-500')}>
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
    </Field>
  );
};

export default Textarea;
