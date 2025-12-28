import clsx from 'clsx';
import { useController, useFormContext } from 'react-hook-form';

export interface CheckboxOption {
  value: string;
  label: string;
}

interface CheckboxGroupProps {
  name: string;
  label?: string;
  options: CheckboxOption[];
  required?: boolean;
  className?: string;
  wrap?: boolean;
}

const CheckboxGroup = ({
  name,
  label,
  options,
  required,
  className,
  wrap = true,
}: CheckboxGroupProps) => {
  const { control } = useFormContext();
  const {
    field,
    fieldState: { error },
  } = useController({ name, control });

  const selectedValues: string[] = field.value || [];

  const handleToggle = (value: string) => {
    const newValues = selectedValues.includes(value)
      ? selectedValues.filter(v => v !== value)
      : [...selectedValues, value];
    field.onChange(newValues);
  };

  return (
    <div className={clsx('form-control', className)}>
      {label && (
        <label className="label">
          <span className="label-text text-base">
            {label}
            {required && <span className="text-error ml-1">*</span>}
          </span>
        </label>
      )}
      <div className={clsx('flex gap-3', wrap && 'flex-wrap')}>
        {options.map(option => {
          const isSelected = selectedValues.includes(option.value);
          return (
            <label
              key={option.value}
              className={clsx(
                'btn btn-sm gap-2 normal-case font-normal',
                isSelected ? 'btn-primary' : 'btn-outline'
              )}
            >
              <input
                type="checkbox"
                className="checkbox checkbox-sm checkbox-primary hidden"
                checked={isSelected}
                onChange={() => handleToggle(option.value)}
              />
              <span>{option.label}</span>
            </label>
          );
        })}
      </div>
      {error && (
        <label className="label">
          <span className="label-text-alt text-error">{error.message}</span>
        </label>
      )}
    </div>
  );
};

export default CheckboxGroup;
