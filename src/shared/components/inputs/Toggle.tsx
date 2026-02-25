import clsx from 'clsx';
import { useFormReadOnly } from '../form/context';

interface ToggleProps {
  label?: string;
  options: [string, string];
  error?: string;
  required?: boolean;
  /** Size variant */
  size?: 'sm' | 'md';
  checked?: boolean;
  onChange?: (checked: boolean) => void;
  disabled?: boolean;
  className?: string;
}

const Toggle = ({
  label,
  options,
  error,
  required,
  className,
  disabled,
  size = 'md',
  checked,
  onChange,
}: ToggleProps) => {
  const isReadOnly = useFormReadOnly();
  const isDisabled = disabled || isReadOnly;

  // Treat undefined/null as false (first option active)
  const isFirstActive = !checked;
  const activeIndex = isFirstActive ? 0 : 1;

  const sizeStyles = {
    sm: {
      container: 'p-[3px] text-xs',
      option: 'py-0.5 px-2',
    },
    md: {
      container: 'p-[3px] text-sm',
      option: 'py-1 px-3',
    },
  };

  const handleClick = (index: number) => {
    if (isDisabled) return;
    onChange?.(index !== 0);
  };

  return (
    <div className={clsx('text-sm', className)}>
      <fieldset>
        {label && (
          <legend className="font-medium text-gray-700 mb-1.5">
            {label}
            {required && <span className="text-danger ml-0.5">*</span>}
          </legend>
        )}
        <div
          className={clsx(
            'relative inline-grid grid-cols-2 rounded-lg border transition-colors duration-200',
            sizeStyles[size].container,
            error ? 'border-danger bg-danger-50' : 'border-gray-200 bg-gray-100',
          )}
          role="radiogroup"
          aria-label={label || `Toggle between ${options.join(' and ')}`}
        >
          {/* Sliding background - uses CSS transform for positioning */}
          <span
            className={clsx(
              'absolute inset-y-[3px] w-[calc(50%-1.5px)] bg-primary rounded-md shadow-sm',
              'transition-transform duration-200 ease-out',
              activeIndex === 0 ? 'translate-x-0' : 'translate-x-[calc(100%+3px)]',
            )}
            aria-hidden="true"
          />

          {options.map((option, index) => {
            const isActive = index === activeIndex;
            return (
              <button
                key={index}
                type="button"
                role="radio"
                aria-checked={isActive}
                disabled={isDisabled}
                onClick={() => handleClick(index)}
                className={clsx(
                  'relative z-10 flex items-center justify-center rounded-md transition-colors duration-200 select-none font-medium whitespace-nowrap',
                  sizeStyles[size].option,
                  isDisabled ? 'cursor-not-allowed' : 'cursor-pointer',
                  isActive
                    ? 'text-white'
                    : isDisabled
                      ? 'text-gray-400'
                      : 'text-gray-500 hover:text-gray-700',
                )}
              >
                {option}
              </button>
            );
          })}
        </div>
        {error && <p className="mt-1.5 text-sm text-danger">{error}</p>}
      </fieldset>
    </div>
  );
};

export default Toggle;
