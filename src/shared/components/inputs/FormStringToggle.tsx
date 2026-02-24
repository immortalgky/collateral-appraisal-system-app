import Toggle from './Toggle';
import { useController, useFormContext } from 'react-hook-form';
import { useParametersByGroup } from '../../utils/parameterUtils';
import type { AtLeastOne } from '@/shared/types';
import { useMemo } from 'react';

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

const FormStringToggle = ({ name, label, group, options, size, disabled, className, required }: FormStringToggleProps) => {
  const { control } = useFormContext();
  const {
    field,
    fieldState: { error },
  } = useController({ name, control });

  const params = useParametersByGroup(group ?? '');
  const resolvedOptions = useMemo<[FormStringToggleOption, FormStringToggleOption]>(() => {
    if (options) return options;
    const first: FormStringToggleOption = { name: params[0]?.code ?? '', label: params[0]?.description ?? '' };
    const second: FormStringToggleOption = { name: params[1]?.code ?? '', label: params[1]?.description ?? '' };
    return [first, second];
  }, [options, params]);

  return (
    <Toggle
      label={label}
      options={[resolvedOptions[0].label, resolvedOptions[1].label]}
      size={size}
      error={error?.message?.toString()}
      checked={field.value === resolvedOptions[0].name}
      disabled={disabled}
      className={className}
      required={required}
      onChange={checked => field.onChange(checked ? resolvedOptions[0].name : resolvedOptions[1].name)}
    />
  );
};

export default FormStringToggle;
