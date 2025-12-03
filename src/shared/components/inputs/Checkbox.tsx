import { Checkbox as HeadlessCheckbox, Field, Label, Description } from '@headlessui/react';
import clsx from 'clsx';
import type { ReactNode } from 'react';
import Icon from '../Icon';

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
}: CheckboxProps) => {
  const sizeStyles = {
    sm: 'h-4 w-4',
    md: 'h-5 w-5',
    lg: 'h-6 w-6',
  };

  const iconSizeStyles = {
    sm: 'h-3 w-3',
    md: 'h-3.5 w-3.5',
    lg: 'h-4 w-4',
  };

  return (
    <Field className={clsx('flex flex-col', className)}>
      <div className="flex items-start gap-3">
        <HeadlessCheckbox
          checked={checked}
          defaultChecked={defaultChecked}
          onChange={onChange}
          disabled={disabled}
          name={name}
          value={value}
          className={clsx(
            'group flex items-center justify-center rounded border-2 transition-all duration-200',
            sizeStyles[size],
            disabled
              ? 'cursor-not-allowed bg-neutral-3 border-misc-1'
              : 'cursor-pointer border-misc-2 hover:border-primary',
            'data-checked:bg-primary data-checked:border-primary',
            error && 'border-danger',
          )}
        >
          <Icon
            style="solid"
            name="check"
            className={clsx(
              'text-white opacity-0 transition-opacity duration-200 group-data-checked:opacity-100',
              iconSizeStyles[size],
            )}
          />
        </HeadlessCheckbox>

        {(label || description || children) && (
          <div className="flex flex-col">
            {label && (
              <Label
                className={clsx(
                  'text-sm font-medium cursor-pointer select-none',
                  disabled ? 'text-neutral-4' : 'text-neutral-6',
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
      </div>

      {error && <p className="mt-1 text-sm text-danger">{error}</p>}
    </Field>
  );
};

export default Checkbox;
