import clsx from 'clsx';
import { useController, useFormContext } from 'react-hook-form';
import Icon from '../Icon';

export interface CheckboxOption {
  value: string;
  label: string;
  icon?: string;
}

interface CheckboxGroupProps {
  name: string;
  label?: string;
  options: CheckboxOption[];
  required?: boolean;
  className?: string;
  wrap?: boolean;
  /** Visual variant for checkbox group */
  variant?: 'tag' | 'chip' | 'button';
  /** Size of the tags/chips */
  size?: 'sm' | 'md';
  disabled?: boolean;
  /** Show clear all button when items are selected */
  showClearAll?: boolean;
  /** Minimum selections before showing clear all (default: 2) */
  clearAllThreshold?: number;
}

const CheckboxGroup = ({
  name,
  label,
  options,
  required,
  className,
  wrap = true,
  variant = 'tag',
  size = 'md',
  disabled = false,
  showClearAll = true,
  clearAllThreshold = 2,
}: CheckboxGroupProps) => {
  const { control } = useFormContext();
  const {
    field,
    fieldState: { error },
  } = useController({ name, control });

  const selectedValues: string[] = field.value || [];

  const handleToggle = (value: string) => {
    if (disabled) return;
    const newValues = selectedValues.includes(value)
      ? selectedValues.filter(v => v !== value)
      : [...selectedValues, value];
    field.onChange(newValues);
  };

  const handleClearAll = () => {
    if (disabled) return;
    field.onChange([]);
  };

  const sizeStyles = {
    sm: 'px-2.5 py-1 text-xs',
    md: 'px-3 py-1.5 text-sm',
  };

  const showClearButton = showClearAll && selectedValues.length >= clearAllThreshold;

  // Header with label and clear all button
  const Header = () => (
    <div className="flex items-center justify-between gap-2">
      {label && (
        <label className="text-sm font-medium text-gray-700">
          {label}
          {required && <span className="text-danger ml-1">*</span>}
        </label>
      )}
      {showClearButton && (
        <button
          type="button"
          onClick={handleClearAll}
          disabled={disabled}
          className={clsx(
            'inline-flex items-center gap-1 text-xs font-medium text-gray-500 hover:text-gray-700 transition-colors',
            disabled && 'opacity-50 cursor-not-allowed',
          )}
        >
          <Icon name="xmark" className="size-3" />
          Clear all ({selectedValues.length})
        </button>
      )}
    </div>
  );

  // Chip variant - rounded pills with check icon
  if (variant === 'chip') {
    return (
      <div className={clsx('flex flex-col gap-2', className)}>
        <Header />
        <div className={clsx('flex gap-2', wrap && 'flex-wrap')}>
          {options.map(option => {
            const isSelected = selectedValues.includes(option.value);
            return (
              <button
                key={option.value}
                type="button"
                onClick={() => handleToggle(option.value)}
                disabled={disabled}
                className={clsx(
                  'inline-flex items-center gap-1.5 rounded-full font-medium transition-all duration-200',
                  sizeStyles[size],
                  isSelected
                    ? 'bg-primary text-white shadow-sm'
                    : 'bg-primary/10 text-primary hover:bg-primary/20',
                  disabled && 'opacity-50 cursor-not-allowed',
                )}
              >
                {isSelected && <Icon style="solid" name="check" className="size-3" />}
                {option.icon && <Icon style="solid" name={option.icon} className="size-3.5" />}
                <span>{option.label}</span>
              </button>
            );
          })}
        </div>
        {error && <p className="text-sm text-danger">{error.message}</p>}
      </div>
    );
  }

  // Button variant - bordered buttons with highlight
  if (variant === 'button') {
    return (
      <div className={clsx('flex flex-col gap-2', className)}>
        <Header />
        <div className={clsx('flex gap-2', wrap && 'flex-wrap')}>
          {options.map(option => {
            const isSelected = selectedValues.includes(option.value);
            return (
              <button
                key={option.value}
                type="button"
                onClick={() => handleToggle(option.value)}
                disabled={disabled}
                className={clsx(
                  'inline-flex items-center gap-2 rounded-lg border-2 font-medium transition-all duration-200',
                  sizeStyles[size],
                  isSelected
                    ? 'border-primary bg-primary/10 text-primary'
                    : 'border-gray-200 bg-white text-gray-700 hover:border-primary/40 hover:bg-primary/5',
                  disabled && 'opacity-50 cursor-not-allowed',
                )}
              >
                <span
                  className={clsx(
                    'flex items-center justify-center w-4 h-4 rounded border-2 transition-all duration-200',
                    isSelected ? 'bg-primary border-primary' : 'border-gray-300',
                  )}
                >
                  {isSelected && <Icon style="solid" name="check" className="size-2.5 text-white" />}
                </span>
                {option.icon && <Icon style="solid" name={option.icon} className="size-3.5" />}
                <span>{option.label}</span>
              </button>
            );
          })}
        </div>
        {error && <p className="text-sm text-danger">{error.message}</p>}
      </div>
    );
  }

  // Default tag variant - clean tag style with subtle colors
  return (
    <div className={clsx('flex flex-col gap-2', className)}>
      <Header />
      <div className={clsx('flex gap-2', wrap && 'flex-wrap')}>
        {options.map(option => {
          const isSelected = selectedValues.includes(option.value);
          return (
            <button
              key={option.value}
              type="button"
              onClick={() => handleToggle(option.value)}
              disabled={disabled}
              className={clsx(
                'group inline-flex items-center gap-1.5 rounded-md border font-medium transition-all duration-200',
                sizeStyles[size],
                isSelected
                  ? 'border-primary/50 bg-primary/10 text-primary shadow-sm'
                  : 'border-gray-200 bg-white text-gray-600 hover:border-primary/40 hover:bg-primary/5 hover:text-primary',
                disabled && 'opacity-50 cursor-not-allowed',
              )}
            >
              {option.icon && <Icon style="solid" name={option.icon} className="size-3.5" />}
              <span>{option.label}</span>
              {isSelected && (
                <Icon
                  style="solid"
                  name="xmark"
                  className="size-3 text-primary/60 group-hover:text-primary transition-colors"
                />
              )}
            </button>
          );
        })}
      </div>
      {error && <p className="text-sm text-danger">{error.message}</p>}
    </div>
  );
};

export default CheckboxGroup;
