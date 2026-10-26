import Toggle from './Toggle';
import { useController, useFormContext } from 'react-hook-form';
import type { AtLeastOne } from '@/shared/types';
import { useStringToggleOptions } from './toggleOptions';

type FormStringToggleProps = FormStringToggleBaseProps &
  AtLeastOne<{ group: string; options: [FormStringToggleOption, FormStringToggleOption] }>;

interface FormStringToggleBaseProps {
  name: string;
  label?: string;
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

const FormStringToggle = ({
  name,
  label,
  group,
  options,
  size,
  disabled,
  className,
  required,
}: FormStringToggleProps) => {
  const { control } = useFormContext();
  const {
    field,
    fieldState: { error },
  } = useController({ name, control });

  const resolvedOptions = useStringToggleOptions(group, options);

  return (
    <Toggle
      label={label}
      options={[resolvedOptions[0].label, resolvedOptions[1].label]}
      size={size}
      error={error?.message?.toString()}
      checked={field.value === resolvedOptions[1].name}
      disabled={disabled}
      className={className}
      required={required}
      onChange={checked =>
        field.onChange(checked ? resolvedOptions[1].name : resolvedOptions[0].name)
      }
    />
  );
};

export default FormStringToggle;
