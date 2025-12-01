import { useController, useFormContext } from 'react-hook-form';
import Checkbox from './Checkbox';

interface FormCheckboxProps {
  name: string;
  label?: string;
  description?: string;
  disabled?: boolean;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

const FormCheckbox = ({
  name,
  label,
  description,
  disabled,
  className,
  size,
}: FormCheckboxProps) => {
  const { control } = useFormContext();
  const {
    field,
    fieldState: { error },
  } = useController({ name, control });

  return (
    <Checkbox
      checked={field.value ?? false}
      onChange={field.onChange}
      label={label}
      description={description}
      error={error?.message}
      disabled={disabled}
      className={className}
      size={size}
      name={name}
    />
  );
};

export default FormCheckbox;
