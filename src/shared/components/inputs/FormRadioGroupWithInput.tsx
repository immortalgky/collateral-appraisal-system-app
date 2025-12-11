import { useController, useFormContext } from 'react-hook-form';
import RadioGroup from './RadioGroup';
import TextInput from './TextInput';
import clsx from 'clsx';
import type { FormField } from '../sections';

export interface RadioGroupWithInputOption {
  value: string;
  label: string;
  description?: string;
  disabled?: boolean;
  isInput?: boolean;
}

export interface RadioGroupInputOption {
  type: 'text-input' | 'number-input' | 'date-input' | 'datetime-input';
  label: string;
  name: string;
}

interface FormRadioGroupProps {
  namePrefix?: string;

  name: string;
  options: RadioGroupWithInputOption[];
  label?: string;
  disabled?: boolean;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
  orientation?: 'horizontal' | 'vertical';

  inputValue: FormField;
  inputName: string;
  inputClassName?: string;
}

const FormRadioGroupWithInput = ({
  namePrefix = '',
  name,
  options,
  label,
  disabled,
  size,
  orientation,
  inputType,
  inputName = 'other',
  inputLabel,
  inputClassName,
}: FormRadioGroupProps) => {
  const { control, setValue } = useFormContext();

  const {
    field: typeField,
    fieldState: { error: typeError },
  } = useController({ name: `${namePrefix}.${name}`, control });

  const {
    field: inputField,
    fieldState: { error: inputError },
  } = useController({ name: `${namePrefix}.${inputName}`, control });

  const selectedOption = options.find(opt => opt.value === typeField.value);
  const isInputSelected = !!selectedOption?.isInput;
  const handleRadioChange = (val: string) => {
    typeField.onChange(val);

    // if user switches away from "Other", clear the other text
    const nextIsInput = options.find(o => o.value === val)?.isInput;
    if (!nextIsInput) setValue(`${namePrefix}.${inputName}`, '');
  };

  return (
    <div
      className={clsx('flex gap-4', orientation === 'vertical' ? 'flex-col' : 'flex-row flex-wrap')}
    >
      <div className="flex">
        <RadioGroup
          value={typeField.value}
          onChange={handleRadioChange}
          options={options}
          label={label}
          error={typeError?.message}
          disabled={disabled}
          className={''}
          size={size}
          orientation={orientation}
          name={`${name}.type`}
        />
      </div>

      {isInputSelected && (
        <div className={clsx('w-full', inputClassName)}>
          <TextInput
            label={inputLabel}
            {...inputField}
            disabled={disabled}
            error={inputError?.message}
            required={true}
          />
        </div>
      )}
    </div>
  );
};

export default FormRadioGroupWithInput;
