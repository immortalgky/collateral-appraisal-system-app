import { Field, Label, Textarea as HeadlessTextarea } from '@headlessui/react';
import clsx from 'clsx';
import type { TextareaHTMLAttributes } from 'react';

interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  helperText?: string;
  error?: string;
  fullWidth?: boolean;
}

const Textarea = ({
  label,
  helperText,
  error,
  fullWidth = true,
  required,
  disabled,
  className,
  ...props
}: TextareaProps) => {
  return (
    <Field className={clsx(fullWidth && 'w-full', 'flex', 'flex-col')}>
      {label && (
        <Label className="block text-sm font-medium text-gray-700 mb-1.5">
          {label}
          {required && <span className="text-danger ml-0.5">*</span>}
        </Label>
      )}
      <HeadlessTextarea
        className={clsx(
          'block px-4 py-2.5 border rounded-lg text-sm transition-colors duration-200',
          'placeholder:text-gray-400 resize-none',
          error
            ? 'border-danger text-danger-900 placeholder:text-danger-300 focus:outline-none focus:ring-2 focus:ring-danger/20 focus:border-danger'
            : 'border-gray-300 focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500',
          disabled ? 'bg-gray-50 text-gray-500 cursor-not-allowed' : 'bg-white hover:border-gray-400',
          fullWidth && 'w-full',
          className,
        )}
        required={required}
        disabled={disabled}
        {...props}
      />
      {(helperText || error) && (
        <p className={clsx('mt-1.5 text-sm', error ? 'text-danger' : 'text-gray-500')}>
          {error || helperText}
        </p>
      )}
    </Field>
  );
};

export default Textarea;
