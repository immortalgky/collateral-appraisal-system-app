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
  ...props
}: TextareaProps) => {
  return (
    <Field className={clsx(fullWidth && 'w-full', 'flex', 'flex-col')}>
      {label && (
        <Label className="block text-sm font-medium text-gray-700 mb-1">
          {label}
          {required && <span className="text-red-500"> *</span>}
        </Label>
      )}
      <HeadlessTextarea
        className={clsx(
          'block px-4 py-2 border rounded-md focus:ring-blue-500 focus:border-blue-500 sm:text-sm',
          error
            ? 'border-red-300 text-red-900 placeholder-red-300 focus:outline-none focus:ring-red-500 focus:border-red-500'
            : 'border-gray-300 focus:ring-blue-500 focus:border-blue-500',
          disabled ? 'bg-neutral-100' : 'bg-white',
        )}
        required={required}
        disabled={disabled}
        {...props}
      />
      {(helperText || error) && (
        <p className={clsx('mt-1 text-sm', error ? 'text-danger' : 'text-gray-500')}>
          {error || helperText}
        </p>
      )}
    </Field>
  );
};

export default Textarea;
