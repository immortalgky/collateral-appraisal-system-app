import { useController, useFormContext } from 'react-hook-form';
import RadioGroup, { type RadioOption } from './RadioGroup';
import TextInput from './TextInput';
import clsx from 'clsx';
import { error } from 'console';

export interface RadioGroupWithInputOption {
  value: string;
  label: string;
  description?: string;
  disabled?: boolean;
  isInput?: boolean;
}

interface FormRadioGroupProps {
  name: string;
  options: RadioGroupWithInputOption[];
  label?: string;
  disabled?: boolean;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
  orientation?: 'horizontal' | 'vertical';
  inputName: string;
  inputLabel?: string;
}

const FormRadioGroupWithInput = ({
  name,
  options,
  label,
  disabled,
  size,
  orientation,
  inputName,
  inputLabel,
}: FormRadioGroupProps) => {
  const { control, setValue } = useFormContext();

  // radio selection lives at `${name}.type`
  const {
    field: typeField,
    fieldState: { error: typeError },
  } = useController({ name: `${name}.type`, control });

  // other text lives at `${name}.other`
  const {
    field: inputField,
    fieldState: { error: inputError },
  } = useController({ name: `${name}.${inputName}`, control });

  const selectedOption = options.find(opt => opt.value === typeField.value);
  const isInputSelected = !!selectedOption?.isInput;
  const handleRadioChange = (val: string) => {
    typeField.onChange(val);

    // if user switches away from "Other", clear the other text
    const nextIsInput = options.find(o => o.value === val)?.isInput;
    if (!nextIsInput) setValue(`${name}.other`, '');
  };

  return (
    <div className={'flex gap-4 flex-wrap'}>
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

      {isInputSelected && (
        <div className="flex">
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
