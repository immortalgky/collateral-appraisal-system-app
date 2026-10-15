import clsx from 'clsx';
import Toggle from './Toggle';
import { useController, useFormContext } from 'react-hook-form';
import { useParametersByGroup } from '../../utils/parameterUtils';
import type { AtLeastOne } from '@/shared/types';
import { type ReactNode, useMemo } from 'react';

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
      labelAddon={labelAddon}
      options={resolvedOptions}
      size={size}
      disabled={disabled}
      // Marker for formLayoutCompact.css: a yes/no toggle gets two colours, a string toggle does not.
      className={clsx('cas-toggle-bool', className)}
      error={error?.message?.toString()}
      checked={field.value}
      onChange={field.onChange}
    />
  );
};

export default FormBooleanToggle;
