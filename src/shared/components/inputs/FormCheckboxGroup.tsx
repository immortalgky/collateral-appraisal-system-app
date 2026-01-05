import CheckboxGroup, { type CheckboxOption } from './CheckboxGroup';

interface FormCheckboxGroupProps {
  name: string;
  label?: string;
  options: CheckboxOption[];
  disabled?: boolean;
  className?: string;
  size?: 'sm' | 'md';
  orientation?: 'horizontal' | 'vertical';
  /** Visual variant for checkbox group */
  variant?: 'tag' | 'chip' | 'button';
}

/**
 * Form-integrated CheckboxGroup component.
 * Uses react-hook-form context internally via CheckboxGroup.
 */
const FormCheckboxGroup = ({
  name,
  label,
  options,
  disabled,
  className,
  size,
  variant,
}: FormCheckboxGroupProps) => {
  return (
    <CheckboxGroup
      name={name}
      label={label}
      options={options}
      disabled={disabled}
      className={className}
      size={size}
      variant={variant}
    />
  );
};

export default FormCheckboxGroup;
