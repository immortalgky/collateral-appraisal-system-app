import type { SwitchProps } from '@headlessui/react';
import Toggle from './Toggle';
import { useController, useFormContext } from 'react-hook-form';

interface FormBooleanToggleProps extends SwitchProps {
  name: string;
  label?: string;
  options: [string, string];
}

const FormBooleanToggle = ({ name, label, options, ...props }: FormBooleanToggleProps) => {
  const { control } = useFormContext();
  const {
    field,
    fieldState: { error },
  } = useController({ name, control });
  return (
    <Toggle
      label={label}
      options={options}
      error={error?.message?.toString()}
      checked={field.value}
      onChange={field.onChange}
      {...props}
    />
  );
};

export default FormBooleanToggle;
