import { Checkbox as HeadlessCheckbox, Field, Label, Description } from '@headlessui/react';
import clsx from 'clsx';
import type { ReactNode } from 'react';
import Icon from '../Icon';
import { useFormReadOnly } from '../form/context';

interface CheckboxProps {
  checked?: boolean;
  defaultChecked?: boolean;
  onChange?: (checked: boolean) => void;
  label?: string;
  description?: string;
  error?: string;
  disabled?: boolean;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
  children?: ReactNode;
  name?: string;
  value?: string;
  /** Visual variant for the checkbox */
  variant?: 'default' | 'card';
}

const Checkbox = ({
  checked,
  defaultChecked,
  onChange,
  label,
  description,
  error,
  disabled = false,
  className,
  size = 'md',
  children,
  name,
  value,
  variant = 'default',
}: CheckboxProps) => {
  const isReadOnly = useFormReadOnly();
  const isDisabled = disabled || isReadOnly;

  const sizeStyles = {
    sm: 'h-4 w-4',
    md: 'h-[18px] w-[18px]',
    lg: 'h-6 w-6',
  };

  const iconSizeStyles = {
    sm: 'h-2.5 w-2.5',
    md: 'h-3 w-3',
    lg: 'h-3.5 w-3.5',
  };

  // Card variant renders the entire checkbox as a selectable card
  if (variant === 'card') {
    return (
      <Field className={clsx('flex flex-col', className)}>
        <HeadlessCheckbox
          checked={checked}
          defaultChecked={defaultChecked}
          onChange={onChange}
          disabled={isDisabled}
          name={name}
          value={value}
          className={clsx(
            'group relative flex items-center gap-3 px-4 py-3 rounded-lg border-2 transition-all duration-200',
            isDisabled
              ? 'cursor-not-allowed bg-gray-50 border-gray-200'
              : 'cursor-pointer border-gray-200 hover:border-gray-400 hover:bg-gray-50/50',
            'data-checked:border-gray-700 data-checked:bg-gray-50',
            error && 'border-danger',
          )}
        >
          {/* Checkbox indicator */}
          <span
            className={clsx(
              'flex items-center justify-center rounded border-2 transition-all duration-200 shrink-0',
              sizeStyles[size],
              isDisabled
                ? 'bg-gray-100 border-gray-300'
                : 'border-gray-300 group-hover:border-gray-500',
              'group-data-checked:bg-gray-700 group-data-checked:border-gray-700',
            )}
          >
            <Icon
              style="solid"
              name="check"
              className={clsx(
                'text-white opacity-0 transition-all duration-200 group-data-checked:opacity-100',
                iconSizeStyles[size],
              )}
            />
          </span>

          {/* Label content */}
          {(label || description || children) && (
            <div className="flex flex-col min-w-0">
              {label && (
                <Label
                  className={clsx(
                    'text-sm font-medium select-none',
                    isDisabled ? 'text-gray-400' : 'text-gray-700',
                  )}
                >
                  {label}
                </Label>
              )}
              {description && (
                <Description className="text-xs text-gray-500 mt-0.5">{description}</Description>
              )}
              {children}
            </div>
          )}
        </HeadlessCheckbox>

        {error && <p className="mt-1.5 text-sm text-danger">{error}</p>}
      </Field>
    );
  }

  // Default variant - clean and simple
  return (
    <Field className={clsx('flex flex-col', className)}>
      <HeadlessCheckbox
        checked={checked}
        defaultChecked={defaultChecked}
        onChange={onChange}
        disabled={isDisabled}
        name={name}
        value={value}
        className={clsx(
          'group flex items-start gap-2.5',
          !isDisabled && 'cursor-pointer',
        )}
      >
        <span
          className={clsx(
            'flex items-center justify-center rounded border-2 transition-all duration-150 mt-0.5 shrink-0',
            sizeStyles[size],
            isDisabled
              ? 'bg-gray-100 border-gray-300'
              : 'border-gray-300 group-hover:border-gray-500',
            'group-data-checked:bg-gray-700 group-data-checked:border-gray-700',
            'group-focus:ring-2 group-focus:ring-gray-200 group-focus:ring-offset-1',
            error && 'border-danger',
          )}
        >
          <Icon
            style="solid"
            name="check"
            className={clsx(
              'text-white opacity-0 scale-50 transition-all duration-150',
              'group-data-checked:opacity-100 group-data-checked:scale-100',
              iconSizeStyles[size],
            )}
          />
        </span>

        {(label || description || children) && (
          <div className="flex flex-col">
            {label && (
              <span
                className={clsx(
                  'text-sm font-medium select-none leading-tight',
                  isDisabled ? 'text-gray-400' : 'text-gray-700 group-hover:text-gray-900',
                )}
              >
                {label}
              </span>
            )}
            {description && (
              <Description className="text-xs text-gray-500 mt-0.5">{description}</Description>
            )}
            {children}
          </div>
        )}
      </HeadlessCheckbox>

      {error && <p className="mt-1.5 text-sm text-danger">{error}</p>}
    </Field>
  );
};

export default Checkbox;
