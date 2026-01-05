import {
  RadioGroup as HeadlessRadioGroup,
  Radio as HeadlessRadio,
  Field,
  Label,
  Description,
} from '@headlessui/react';
import clsx from 'clsx';
import type { ReactNode } from 'react';
import Icon from '../Icon';

export interface RadioOption {
  value: string;
  label: string;
  description?: string;
  disabled?: boolean;
  icon?: string;
}

export interface RadioGroupProps {
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
  required?: boolean;
  /** Visual variant for radio buttons */
  variant?: 'default' | 'card' | 'button';
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
  variant = 'default',
}: RadioGroupProps) => {
  const sizeStyles = {
    sm: 'h-4 w-4',
    md: 'h-[18px] w-[18px]',
    lg: 'h-6 w-6',
  };

  const dotSizeStyles = {
    sm: 'h-1.5 w-1.5',
    md: 'h-2 w-2',
    lg: 'h-2.5 w-2.5',
  };

  // Button variant - renders as segmented button group
  if (variant === 'button') {
    return (
      <Field className={clsx('flex flex-col', className)}>
        {label && <Label className="block text-sm font-medium text-gray-700 mb-2">{label}</Label>}

        <HeadlessRadioGroup
          value={value}
          defaultValue={defaultValue}
          onChange={onChange}
          disabled={disabled}
          name={name}
          className="inline-flex rounded-lg bg-primary/10 p-1"
        >
          {options.map(option => (
            <HeadlessRadio
              key={option.value}
              value={option.value}
              disabled={option.disabled || disabled}
              className={clsx(
                'group relative px-4 py-2 text-sm font-medium rounded-md transition-all duration-200',
                'cursor-pointer data-disabled:cursor-not-allowed',
                'data-checked:bg-white data-checked:text-primary data-checked:shadow-sm',
                'data-[checked=false]:text-primary/50 data-[checked=false]:hover:text-primary/70',
                'focus:outline-none focus:ring-2 focus:ring-primary/20',
              )}
            >
              <span className="flex items-center gap-2">
                {option.icon && <Icon style="solid" name={option.icon} className="size-4" />}
                {option.label}
              </span>
            </HeadlessRadio>
          ))}
        </HeadlessRadioGroup>

        {error && <p className="mt-1.5 text-sm text-danger">{error}</p>}
      </Field>
    );
  }

  // Card variant - renders as selectable cards
  if (variant === 'card') {
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
              className={clsx(
                'group relative flex items-center gap-3 px-4 py-3 rounded-lg border-2 transition-all duration-200',
                'cursor-pointer data-disabled:cursor-not-allowed',
                'border-gray-200 hover:border-primary/40 hover:bg-primary/5',
                'data-checked:border-primary data-checked:bg-primary/10',
                'data-disabled:bg-gray-50 data-disabled:border-gray-200',
                'focus:outline-none focus:ring-2 focus:ring-primary/20 focus:ring-offset-1',
                error && 'border-danger',
              )}
            >
              {/* Radio indicator */}
              <span
                className={clsx(
                  'flex items-center justify-center rounded-full border-2 transition-all duration-200 shrink-0',
                  sizeStyles[size],
                  'border-gray-300 group-hover:border-primary/60',
                  'group-data-checked:border-primary',
                  'group-data-disabled:bg-gray-100 group-data-disabled:border-gray-300',
                )}
              >
                <span
                  className={clsx(
                    'rounded-full bg-primary opacity-0 transition-all duration-200',
                    'group-data-checked:opacity-100',
                    dotSizeStyles[size],
                  )}
                />
              </span>

              {/* Label content */}
              <div className="flex flex-col min-w-0">
                <Label
                  className={clsx(
                    'text-sm font-medium select-none',
                    'group-data-disabled:text-gray-400',
                    !(option.disabled || disabled) && 'text-gray-700',
                  )}
                >
                  {option.label}
                </Label>
                {option.description && (
                  <Description className="text-xs text-gray-500 mt-0.5">{option.description}</Description>
                )}
              </div>
            </HeadlessRadio>
          ))}
        </HeadlessRadioGroup>

        {error && <p className="mt-1.5 text-sm text-danger">{error}</p>}
      </Field>
    );
  }

  // Default variant
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
          'flex gap-4',
          orientation === 'vertical' ? 'flex-col' : 'flex-row flex-wrap',
        )}
      >
        {options.map(option => (
          <HeadlessRadio
            key={option.value}
            value={option.value}
            disabled={option.disabled || disabled}
            className="group flex items-center gap-2.5 cursor-pointer data-disabled:cursor-not-allowed focus:outline-none"
          >
            <span
              className={clsx(
                'flex items-center justify-center rounded-full border-2 transition-all duration-200',
                sizeStyles[size],
                'border-gray-300 group-hover:border-primary/60',
                'group-data-checked:border-primary',
                'group-data-disabled:bg-gray-100 group-data-disabled:border-gray-300',
                'group-focus:ring-2 group-focus:ring-primary/20 group-focus:ring-offset-1',
                error && 'border-danger',
              )}
            >
              <span
                className={clsx(
                  'rounded-full bg-primary opacity-0 transition-all duration-200 scale-0',
                  'group-data-checked:opacity-100 group-data-checked:scale-100',
                  dotSizeStyles[size],
                )}
              />
            </span>

            <div className="flex flex-col">
              <Label
                className={clsx(
                  'text-sm font-medium cursor-pointer select-none leading-tight',
                  'group-data-disabled:text-gray-400',
                  !(option.disabled || disabled) && 'text-gray-700 group-hover:text-gray-900',
                )}
              >
                {option.label}
              </Label>
              {option.description && (
                <Description className="text-xs text-gray-500 mt-0.5">{option.description}</Description>
              )}
            </div>
          </HeadlessRadio>
        ))}
      </HeadlessRadioGroup>

      {error && <p className="mt-1.5 text-sm text-danger">{error}</p>}
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
          'border-gray-300 group-hover:border-primary/60 group-data-disabled:bg-gray-100 group-data-disabled:border-gray-300',
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
                'group-data-disabled:text-gray-400',
                !disabled && 'text-gray-700',
              )}
            >
              {label}
            </Label>
          )}
          {description && (
            <Description className="text-sm text-gray-500">{description}</Description>
          )}
          {children}
        </div>
      )}
    </HeadlessRadio>
  );
};

export default RadioGroup;
