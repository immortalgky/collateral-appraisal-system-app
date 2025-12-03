import {
  RadioGroup as HeadlessRadioGroup,
  Radio as HeadlessRadio,
  Field,
  Label,
  Description,
} from '@headlessui/react';
import clsx from 'clsx';
import type { ReactNode } from 'react';

export interface RadioOption {
  value: string;
  label: string;
  description?: string;
  disabled?: boolean;
}

interface RadioGroupProps {
  value?: string;
  defaultValue?: string;
  onChange?: (value: string) => void;
  options: RadioOption[];
  label?: string;
  error?: string;
  disabled?: boolean;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
  orientation?: 'horizontal' | 'vertical';
  name?: string;
}

const RadioGroup = ({
  value,
  defaultValue,
  onChange,
  options,
  label,
  error,
  disabled = false,
  className,
  size = 'md',
  orientation = 'vertical',
  name,
}: RadioGroupProps) => {
  const sizeStyles = {
    sm: 'h-4 w-4',
    md: 'h-5 w-5',
    lg: 'h-6 w-6',
  };

  const dotSizeStyles = {
    sm: 'h-2 w-2',
    md: 'h-2.5 w-2.5',
    lg: 'h-3 w-3',
  };

  return (
    <Field className={clsx('flex flex-col', className)}>
      {label && <Label className="block text-sm font-medium text-gray-700 mb-2">{label}</Label>}

      <HeadlessRadioGroup
        value={value}
        defaultValue={defaultValue}
        onChange={onChange}
        disabled={disabled}
        name={name}
        className={clsx(
          'flex gap-3',
          orientation === 'vertical' ? 'flex-col' : 'flex-row flex-wrap',
        )}
      >
        {options.map(option => (
          <HeadlessRadio
            key={option.value}
            value={option.value}
            disabled={option.disabled || disabled}
            className="group flex items-start gap-3 cursor-pointer data-disabled:cursor-not-allowed"
          >
            <span
              className={clsx(
                'flex items-center justify-center rounded-full border-2 transition-all duration-200 mt-0.5',
                sizeStyles[size],
                'border-misc-2 group-hover:border-primary group-data-disabled:bg-neutral-3 group-data-disabled:border-misc-1',
                'group-data-checked:border-primary',
                error && 'border-danger',
              )}
            >
              <span
                className={clsx(
                  'rounded-full bg-primary opacity-0 transition-opacity duration-200',
                  'group-data-checked:opacity-100',
                  dotSizeStyles[size],
                )}
              />
            </span>

            <div className="flex flex-col">
              <Label
                className={clsx(
                  'text-sm font-medium cursor-pointer select-none',
                  'group-data-disabled:text-neutral-4',
                  !option.disabled && !disabled && 'text-neutral-6',
                )}
              >
                {option.label}
              </Label>
              {option.description && (
                <Description className="text-sm text-neutral-4">{option.description}</Description>
              )}
            </div>
          </HeadlessRadio>
        ))}
      </HeadlessRadioGroup>

      {error && <p className="mt-1 text-sm text-danger">{error}</p>}
    </Field>
  );
};

// Single Radio component for custom layouts
interface RadioProps {
  value: string;
  label?: string;
  description?: string;
  disabled?: boolean;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
  children?: ReactNode;
}

export const Radio = ({
  value,
  label,
  description,
  disabled = false,
  className,
  size = 'md',
  children,
}: RadioProps) => {
  const sizeStyles = {
    sm: 'h-4 w-4',
    md: 'h-5 w-5',
    lg: 'h-6 w-6',
  };

  const dotSizeStyles = {
    sm: 'h-2 w-2',
    md: 'h-2.5 w-2.5',
    lg: 'h-3 w-3',
  };

  return (
    <HeadlessRadio
      value={value}
      disabled={disabled}
      className={clsx(
        'group flex items-start gap-3 cursor-pointer data-disabled:cursor-not-allowed',
        className,
      )}
    >
      <span
        className={clsx(
          'flex items-center justify-center rounded-full border-2 transition-all duration-200 mt-0.5',
          sizeStyles[size],
          'border-misc-2 group-hover:border-primary group-data-disabled:bg-neutral-3 group-data-disabled:border-misc-1',
          'group-data-checked:border-primary',
        )}
      >
        <span
          className={clsx(
            'rounded-full bg-primary opacity-0 transition-opacity duration-200',
            'group-data-checked:opacity-100',
            dotSizeStyles[size],
          )}
        />
      </span>

      {(label || description || children) && (
        <div className="flex flex-col">
          {label && (
            <Label
              className={clsx(
                'text-sm font-medium cursor-pointer select-none',
                'group-data-disabled:text-neutral-4',
                !disabled && 'text-neutral-6',
              )}
            >
              {label}
            </Label>
          )}
          {description && (
            <Description className="text-sm text-neutral-4">{description}</Description>
          )}
          {children}
        </div>
      )}
    </HeadlessRadio>
  );
};

export default RadioGroup;
