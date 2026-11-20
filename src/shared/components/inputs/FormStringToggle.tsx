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
  /**
   * An unset answer shows as unset: a value that is neither option (null, a code the toggle does not
   * know, any value while a parameter group's options are not loaded) chooses neither side, and a
   * click writes nothing until the options are known. Off (the default): the first side shows for it.
   */
  showUnset?: boolean;
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
  showUnset,
}: FormStringToggleProps) => {
  const { control } = useFormContext();
  const {
    field,
    fieldState: { error },
  } = useController({ name, control });

  const resolvedOptions = useStringToggleOptions(group, options);
  const optionsResolved = resolvedOptions[0].name !== '' && resolvedOptions[1].name !== '';

  return (
    <Toggle
      label={label}
      options={[resolvedOptions[0].label, resolvedOptions[1].label]}
      size={size}
      error={error?.message?.toString()}
      checked={
        showUnset
          ? !optionsResolved
            ? null
            : field.value === resolvedOptions[1].name
              ? true
              : field.value === resolvedOptions[0].name
                ? false
                : null
          : field.value === resolvedOptions[1].name
      }
      disabled={disabled}
      className={className}
      required={required}
      onChange={checked => {
        // With `showUnset`, until the options are resolved a click has nothing to write: never write a blank code.
        if (showUnset && !optionsResolved) return;
        field.onChange(checked ? resolvedOptions[1].name : resolvedOptions[0].name);
      }}
      showUnset={showUnset}
    />
  );
};

export default FormStringToggle;
