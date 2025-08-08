import type { SwitchProps } from '@headlessui/react';
import Toggle from './Toggle';
import { useController, useFormContext } from 'react-hook-form';

interface FormStringToggleProps extends SwitchProps {
  name: string;
  label?: string;
  options: [FormStringToggleOption, FormStringToggleOption];
}

export type FormStringToggleOption = {
  name: string;
  label: string;
};

const FormStringToggle = ({ name, label, options, ...props }: FormStringToggleProps) => {
  const { control } = useFormContext();
  const {
    field,
    fieldState: { error },
  } = useController({ name, control });
  return (
    <Toggle
      label={label}
      options={[options[0].label, options[1].label]}
      error={error?.message?.toString()}
      checked={field.value === options[0].name}
      // If the current form value is the first option, then check the toggle.
      // If the current value is the second option, then don't check the toggle.
      onChange={
        checked => field.onChange(checked ? options[0].name : options[1].name)
        // If toggle is checked, return the first option to the form field.
        // If not, return the second option.
      }
      {...props}
    />
  );
};

export default FormStringToggle;
