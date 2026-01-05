import Toggle from './Toggle';
import { useController, useFormContext } from 'react-hook-form';

interface FormBooleanToggleProps {
  name: string;
  label?: string;
  options: [string, string];
  /** Size variant */
  size?: 'sm' | 'md';
  disabled?: boolean;
  className?: string;
}

const FormBooleanToggle = ({ name, label, options, size, disabled, className }: FormBooleanToggleProps) => {
  const { control } = useFormContext();
  const {
    field,
    fieldState: { error },
  } = useController({ name, control });
  return (
    <Toggle
      label={label}
      options={options}
      size={size}
      disabled={disabled}
      className={className}
      error={error?.message?.toString()}
      checked={field.value}
      onChange={field.onChange}
    />
  );
};

export default FormBooleanToggle;
