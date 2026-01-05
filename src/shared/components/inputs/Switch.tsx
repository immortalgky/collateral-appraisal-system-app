import { Switch as HeadlessSwitch, Field, Label, Description } from '@headlessui/react';
import clsx from 'clsx';

interface SwitchProps {
  checked?: boolean;
  defaultChecked?: boolean;
  onChange?: (checked: boolean) => void;
  label?: string;
  description?: string;
  error?: string;
  disabled?: boolean;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
  labelPosition?: 'left' | 'right';
  name?: string;
}

const Switch = ({
  checked,
  defaultChecked,
  onChange,
  label,
  description,
  error,
  disabled = false,
  className,
  size = 'md',
  labelPosition = 'right',
  name,
}: SwitchProps) => {
  const trackSizeStyles = {
    sm: 'h-5 w-9',
    md: 'h-6 w-11',
    lg: 'h-7 w-14',
  };

  const thumbSizeStyles = {
    sm: 'h-4 w-4',
    md: 'h-5 w-5',
    lg: 'h-6 w-6',
  };

  const translateStyles = {
    sm: 'data-checked:translate-x-4',
    md: 'data-checked:translate-x-5',
    lg: 'data-checked:translate-x-7',
  };

  const switchElement = (
    <HeadlessSwitch
      checked={checked}
      defaultChecked={defaultChecked}
      onChange={onChange}
      disabled={disabled}
      name={name}
      className={clsx(
        'group relative inline-flex shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out',
        'focus:outline-none focus-visible:ring-2 focus-visible:ring-gray-300 focus-visible:ring-offset-2',
        trackSizeStyles[size],
        disabled ? 'cursor-not-allowed bg-gray-200' : 'bg-gray-300 data-checked:bg-gray-700',
        error && 'ring-2 ring-danger',
      )}
    >
      <span className="sr-only">{label || 'Toggle'}</span>
      <span
        className={clsx(
          'pointer-events-none inline-block transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out',
          thumbSizeStyles[size],
          translateStyles[size],
        )}
      />
    </HeadlessSwitch>
  );

  if (!label && !description) {
    return switchElement;
  }

  return (
    <Field className={clsx('flex flex-col', className)}>
      <div
        className={clsx(
          'flex items-center gap-3',
          labelPosition === 'left' && 'flex-row-reverse justify-end',
        )}
      >
        {switchElement}

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
        </div>
      </div>

      {error && <p className="mt-1 text-sm text-danger">{error}</p>}
    </Field>
  );
};

export default Switch;
