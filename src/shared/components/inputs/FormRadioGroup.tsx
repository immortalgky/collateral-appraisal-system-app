import { useController, useFormContext } from 'react-hook-form';
import RadioGroup, { type RadioOption } from './RadioGroup';

interface FormRadioGroupProps {
  name: string;
  options: RadioOption[];
  label?: string;
  disabled?: boolean;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
  orientation?: 'horizontal' | 'vertical';
}

const FormRadioGroup = ({
  name,
  options,
  label,
  disabled,
  className,
  size,
  orientation,
}: FormRadioGroupProps) => {
  const { control } = useFormContext();
  const {
    field,
    fieldState: { error },
  } = useController({ name, control });

  return (
    <RadioGroup
      value={field.value}
      onChange={field.onChange}
      options={options}
      label={label}
      error={error?.message}
      disabled={disabled}
      className={className}
      size={size}
      orientation={orientation}
      name={name}
    />
  );
};

export default FormRadioGroup;
