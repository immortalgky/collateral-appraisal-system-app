import CheckboxGroup, { type CheckboxOption } from './CheckboxGroup';
import type { OtherSpec } from './OtherText';
import type { AtLeastOne } from '@/shared/types';

type GroupOrOptions = AtLeastOne<{ group: string; options: CheckboxOption[] }>;

type FormCheckboxGroupProps = FormCheckboxGroupBaseProps & GroupOrOptions;

interface FormCheckboxGroupBaseProps {
  name: string;
  label?: string;
  disabled?: boolean;
  className?: string;
  wrap?: boolean;
  size?: 'sm' | 'md';
  orientation?: 'horizontal' | 'vertical';
  /** Visual variant for checkbox group */
  variant?: 'tag' | 'chip' | 'button';
  other?: OtherSpec;
  /** Option values that stand alone (see CheckboxGroup). */
  exclusiveValues?: string[];
}

/**
 * Form-integrated CheckboxGroup component.
 * Uses react-hook-form context internally via CheckboxGroup.
 */
const FormCheckboxGroup = ({
  name,
  label,
  disabled,
  className,
  wrap,
  size,
  variant,
  other,
  exclusiveValues,
  ...groupOrOptions
}: FormCheckboxGroupProps) => {
  return (
    <CheckboxGroup
      name={name}
      label={label}
      disabled={disabled}
      className={className}
      wrap={wrap}
      size={size}
      variant={variant}
      other={other}
      exclusiveValues={exclusiveValues}
      {...groupOrOptions}
    />
  );
};

export default FormCheckboxGroup;
