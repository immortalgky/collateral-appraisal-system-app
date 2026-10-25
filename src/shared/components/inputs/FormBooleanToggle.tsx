import Toggle from './Toggle';
import { useController, useFormContext } from 'react-hook-form';
import type { AtLeastOne } from '@/shared/types';
import type { ReactNode } from 'react';
import { useBooleanToggleOptions } from './toggleOptions';

type FormBooleanToggleProps = FormBooleanToggleBaseProps &
  AtLeastOne<{ group: string; options: [string, string] }>;

interface FormBooleanToggleBaseProps {
  name: string;
  label?: string;
  /** Node rendered next to the label, outside it (e.g. a FieldHelp "?" button) */
  labelAddon?: ReactNode;
  /** Size variant */
  size?: 'sm' | 'md';
  disabled?: boolean;
  className?: string;
}

const FormBooleanToggle = ({
  name,
  label,
  labelAddon,
  group,
  options,
  size,
  disabled,
  className,
}: FormBooleanToggleProps) => {
  const { control } = useFormContext();
  const {
    field,
    fieldState: { error },
  } = useController({ name, control });

  const resolvedOptions = useBooleanToggleOptions(name, group, options);

  return (
    <Toggle
      label={label}
      labelAddon={labelAddon}
      options={resolvedOptions}
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
