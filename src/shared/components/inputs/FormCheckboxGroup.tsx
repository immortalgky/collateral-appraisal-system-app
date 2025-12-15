import { useController, useFormContext } from 'react-hook-form';
import CheckboxGroup, { type CheckboxOption } from './CheckboxGroup';

interface FormCheckboxGroupProps {
  name: string;
  label?: string;
  options: CheckboxOption[];
  disabled?: boolean;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
  orientation?: 'horizontal' | 'vertical';
}

const FormCheckboxGroup = ({
  name,
  label,
  options,
  disabled,
  className,
  size,
  orientation,
}: FormCheckboxGroupProps) => {
  const { control } = useFormContext();
  const {
    field,
    fieldState: { error },
  } = useController({ name, control });

  return (
    <CheckboxGroup
      value={field.value}
      onChange={field.onChange}
      label={label}
      options={options}
      error={error?.message}
      disabled={disabled}
      className={className}
      size={size}
      orientation={orientation}
      name={name}
    />
  );
};

export default FormCheckboxGroup;
