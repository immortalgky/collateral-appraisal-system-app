import Toggle from './Toggle';
import { useController, useFormContext } from 'react-hook-form';
import { useParametersByGroup } from '../../utils/parameterUtils';
import type { AtLeastOne } from '@/shared/types';
import { useMemo } from 'react';

type FormBooleanToggleProps = FormBooleanToggleBaseProps &
  AtLeastOne<{ group: string; options: [string, string] }>;

interface FormBooleanToggleBaseProps {
  name: string;
  label?: string;
  /** Size variant */
  size?: 'sm' | 'md';
  disabled?: boolean;
  className?: string;
}

const FormBooleanToggle = ({ name, label, group, options, size, disabled, className }: FormBooleanToggleProps) => {
  const { control } = useFormContext();
  const {
    field,
    fieldState: { error },
  } = useController({ name, control });

  const params = useParametersByGroup(group ?? '');
  const resolvedOptions = useMemo<[string, string]>(() => {
    if (options) return options;
    const first = params[0]?.description ?? '';
    const second = params[1]?.description ?? '';
    return [first, second];
  }, [options, params]);

  return (
    <Toggle
      label={label}
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
