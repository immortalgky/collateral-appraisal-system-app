import { useController, useFormContext } from 'react-hook-form';
import Switch from './Switch';

interface FormSwitchProps {
  name: string;
  label?: string;
  description?: string;
  disabled?: boolean;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
  labelPosition?: 'left' | 'right';
}

const FormSwitch = ({
  name,
  label,
  description,
  disabled,
  className,
  size,
  labelPosition,
}: FormSwitchProps) => {
  const { control } = useFormContext();
  const {
    field,
    fieldState: { error },
  } = useController({ name, control });

  return (
    <Switch
      checked={field.value ?? false}
      onChange={field.onChange}
      label={label}
      description={description}
      error={error?.message}
      disabled={disabled}
      className={className}
      size={size}
      labelPosition={labelPosition}
      name={name}
    />
  );
};

export default FormSwitch;
