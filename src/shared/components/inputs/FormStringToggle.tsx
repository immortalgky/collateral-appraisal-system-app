import Toggle from './Toggle';
import { useController, useFormContext } from 'react-hook-form';

interface FormStringToggleProps {
  name: string;
  label?: string;
  options: [FormStringToggleOption, FormStringToggleOption];
  /** Size variant */
  size?: 'sm' | 'md';
  disabled?: boolean;
  className?: string;
  required?: boolean;
}

export type FormStringToggleOption = {
  name: string;
  label: string;
};

const FormStringToggle = ({ name, label, options, size, disabled, className, required }: FormStringToggleProps) => {
  const { control } = useFormContext();
  const {
    field,
    fieldState: { error },
  } = useController({ name, control });
  return (
    <Toggle
      label={label}
      options={[options[0].label, options[1].label]}
      size={size}
      error={error?.message?.toString()}
      checked={field.value === options[0].name}
      disabled={disabled}
      className={className}
      required={required}
      onChange={checked => field.onChange(checked ? options[0].name : options[1].name)}
    />
  );
};

export default FormStringToggle;
