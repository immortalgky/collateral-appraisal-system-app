import { useController, useFormContext } from 'react-hook-form';
import RadioGroup, { type RadioOption } from './RadioGroup';
import type { AtLeastOne } from '@/shared/types';

type GroupOrOptions = AtLeastOne<{ group: string; options: RadioOption[] }>;

type FormRadioGroupProps = FormRadioGroupBaseProps & GroupOrOptions;

interface FormRadioGroupBaseProps {
  name: string;
  label?: string;
  disabled?: boolean;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
  orientation?: 'horizontal' | 'vertical';
  variant?: 'default' | 'card' | 'button';
}

const FormRadioGroup = ({
  name,
  label,
  disabled,
  className,
  size,
  orientation,
  variant,
  ...groupOrOptions
}: FormRadioGroupProps) => {
  const { control } = useFormContext();
  const {
    field,
    fieldState: { error },
  } = useController({ name, control });

  return (
    <RadioGroup
      value={field.value}
      onChange={field.onChange}
      label={label}
      error={error?.message}
      disabled={disabled}
      className={className}
      size={size}
      orientation={orientation}
      variant={variant}
      name={name}
      {...groupOrOptions}
    />
  );
};

export default FormRadioGroup;
