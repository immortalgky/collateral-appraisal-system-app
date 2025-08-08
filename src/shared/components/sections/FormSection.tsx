import Dropdown, { type ListBoxItem } from '../inputs/Dropdown';
import NumberInput from '../inputs/NumberInput';
import { useController, useFormContext, type Control, type FieldValues } from 'react-hook-form';
import TextInput from '../inputs/TextInput';
import DateInput from '../inputs/DateInput';
import clsx from 'clsx';
import Textarea from '../inputs/Textarea';
import DateTimeInput from '../inputs/DateTimeInput';
import SelectInput from '../inputs/SelectInput';
import FormStringToggle, { type FormStringToggleOption } from '../inputs/FormStringToggle';
import FormBooleanToggle from '../inputs/FormBooleanToggle';
import type { AtLeastOne } from '@/shared/types';
import type { ParameterParams } from '@/shared/types/api';

interface FormSectionProps {
  fields: FormField[];
  namePrefix?: string;
  index?: number;
}

export type FormField =
  | TextInputField
  | NumberInputField
  | DateInputField
  | DateTimeInputField
  | SelectInputField
  | DropdownField
  | BooleanToggleField
  | StringToggleField
  | TextareaField;

interface TextInputField extends BaseFormField {
  type: 'text-input';
  label: string;
}

interface NumberInputField extends BaseFormField {
  type: 'number-input';
  label: string;
}

interface DateInputField extends BaseFormField {
  type: 'date-input';
  label: string;
}

interface DateTimeInputField extends BaseFormField {
  type: 'datetime-input';
  label: string;
}

interface SelectInputField extends BaseFormField {
  type: 'select-input';
  label: string;
  options: ListBoxItem[];
}

type DropdownField = BaseDropdownField &
  AtLeastOne<{ queryParameters: ParameterParams; options: ListBoxItem[] }>;

interface BaseDropdownField extends BaseFormField {
  type: 'dropdown';
  label: string;
}

interface BooleanToggleField extends BaseFormField {
  type: 'boolean-toggle';
  label: string;
  options: [string, string];
}

interface StringToggleField extends BaseFormField {
  type: 'string-toggle';
  label: string;
  options: [FormStringToggleOption, FormStringToggleOption];
}

interface TextareaField extends BaseFormField {
  type: 'textarea';
  label: string;
}

interface BaseFormField {
  name: string;
  key?: string;
  className?: string;
  wrapperClassName?: string;
  disabled?: boolean;
  required?: boolean;
}

interface FieldProps {
  control: Control<FieldValues, any, FieldValues>;
  value: FormField;
  namePrefix?: string;
  index?: number;
}

const FormSection = ({ fields, namePrefix = '', index }: FormSectionProps) => {
  const { control } = useFormContext();
  return (
    <>
      {fields.map(value => (
        <div className={clsx(value.wrapperClassName)} key={value.name}>
          <Field control={control} value={value} namePrefix={namePrefix} index={index} />
        </div>
      ))}
    </>
  );
};

const Field = ({ control, value, namePrefix, index }: FieldProps) => {
  let name = value.name;
  if (index !== undefined) {
    name = `${index}.${name}`;
  }
  if (namePrefix !== undefined && namePrefix.trim() !== '') {
    name = `${namePrefix}.${name}`;
  }

  const {
    field,
    fieldState: { error },
  } = useController({ name, control });

  // Exclude wrapperClassName from being passed to the components
  const { wrapperClassName: _, ...passedValue } = value;
  value = passedValue;

  switch (value.type) {
    case 'text-input':
      return <TextInput {...field} {...value} error={error?.message} />;
    case 'number-input':
      return <NumberInput {...field} {...value} error={error?.message} />;
    case 'date-input':
      return <DateInput {...field} {...value} error={error?.message} />;
    case 'datetime-input':
      return <DateTimeInput {...field} {...value} error={error?.message} />;
    case 'select-input':
      return <SelectInput {...field} {...value} error={error?.message} />;
    case 'dropdown':
      return <Dropdown {...field} {...value} error={error?.message} />;
    case 'boolean-toggle':
      return (
        <FormBooleanToggle
          label={value.label}
          options={value.options}
          name={name}
          className={value.className}
        />
      );
    case 'string-toggle':
      return (
        <FormStringToggle
          label={value.label}
          options={value.options}
          name={name}
          className={value.className}
        />
      );
    case 'textarea':
      return <Textarea {...field} {...value} error={error?.message} />;
  }
};

export default FormSection;
