import { Checkbox as HeadlessCheckbox, Field, Label, Description } from '@headlessui/react';
import clsx from 'clsx';
import Icon from '../Icon';

export interface CheckboxOption {
  value: string;
  label: string;
  description?: string;
  disabled?: boolean;
}

interface CheckboxGroupProps {
  value?: string;
  defaultValue?: string;
  onChange?: (value: string) => void;
  options: CheckboxOption[];
  label?: string;
  error?: string;
  disabled?: boolean;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
  orientation?: 'horizontal' | 'vertical';
  name?: string;
}

const CheckboxGroup = ({
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
}: CheckboxGroupProps) => {
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

  const parse = (v?: string): string[] => {
    if (typeof v !== 'string') {
      if (v !== undefined) {
        console.warn('[CheckboxGroup] Expected string value, got:', v);
      }
      return [];
    }

    return v
      .split('|')
      .map(s => s.trim())
      .filter(Boolean);
  };

  const checkedValues = value !== undefined && value !== null ? parse(value) : parse(defaultValue);

  const handleChange = (optionValue: string, checked: boolean) => {
    if (!onChange) return;

    let newValues: string[];
    if (checked) {
      newValues = [...checkedValues, optionValue];
    } else {
      newValues = checkedValues.filter(v => v !== optionValue);
    }
    onChange(newValues.join(' | '));
  };

  return (
    <Field className={clsx('flex flex-col', className)}>
      {label && <Label className="block text-sm font-medium text-gray-700 mb-2">{label}</Label>}

      <div
        className={clsx(
          'flex gap-3',
          orientation === 'vertical' ? 'flex-col' : 'flex-row flex-wrap',
        )}
      >
        {options.map(option => {
          const isChecked = checkedValues.includes(option.value);
          const isDisabled = option.disabled || disabled;

          return (
            <div
              key={option.value}
              className="group flex items-start gap-3 cursor-pointer data-disabled:cursor-not-allowed"
            >
              <HeadlessCheckbox
                checked={isChecked}
                onChange={checked => handleChange(option.value, checked)}
                disabled={isDisabled}
                name={`${name}[${option.value}]`}
                value={option.value}
                className={clsx(
                  'group flex items-center justify-center rounded border-2 transition-all duration-200 mt-0.5',
                  sizeStyles[size],
                  isDisabled
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

              <div className="flex flex-col">
                <Label
                  className={clsx(
                    'text-sm font-medium cursor-pointer select-none',
                    'group-data-disabled:text-neutral-4',
                    !isDisabled && 'text-neutral-6',
                  )}
                >
                  {option.label}
                </Label>
                {option.description && (
                  <Description className="text-sm text-neutral-4">{option.description}</Description>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {error && <p className="mt-1 text-sm text-danger">{error}</p>}
    </Field>
  );
};

export default CheckboxGroup;
