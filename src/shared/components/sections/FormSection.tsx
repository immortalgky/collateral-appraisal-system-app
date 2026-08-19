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
import FormCheckbox from '../inputs/FormCheckbox';
import FormRadioGroup from '../inputs/FormRadioGroup';
import FormSwitch from '../inputs/FormSwitch';
import type { RadioOption } from '../inputs/RadioGroup';
import type { AtLeastOne } from '@/shared/types';

interface FormSectionProps {
  fields: FormField[];
  namePrefix?: string;
  index?: number;
  form?: any;
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
  | TextareaField
  | CheckboxField
  | RadioGroupField
  | SwitchField;

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
  AtLeastOne<{ group: string; options: ListBoxItem[] }>;

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

interface CheckboxField extends BaseFormField {
  type: 'checkbox';
  label?: string;
  description?: string;
  size?: 'sm' | 'md' | 'lg';
}

interface RadioGroupField extends BaseFormField {
  type: 'radio-group';
  label?: string;
  options: RadioOption[];
  size?: 'sm' | 'md' | 'lg';
  orientation?: 'horizontal' | 'vertical';
}

interface SwitchField extends BaseFormField {
  type: 'switch';
  label?: string;
  description?: string;
  size?: 'sm' | 'md' | 'lg';
  labelPosition?: 'left' | 'right';
}

interface BaseFormField {
  name?: string;
  key?: string;
  className?: string;
  wrapperClassName?: string;
  disabled?: boolean;
  required?: boolean;
}

interface FieldProps {
  control: Control<FieldValues, any, FieldValues>;
  value: FormField;
  /** Fully-qualified react-hook-form path, built by the parent so the wrapper can anchor on it too. */
  name: string;
}

/** Build the react-hook-form path for a field, e.g. `titles.0.titleNo`. */
const buildFieldName = (fieldName: string, namePrefix?: string, index?: number) => {
  let name = fieldName || '';
  if (index !== undefined) {
    name = `${index}.${name}`;
  }
  if (namePrefix !== undefined && namePrefix.trim() !== '') {
    name = `${namePrefix}.${name}`;
  }
  return name;
};

const FormSection = ({ fields, namePrefix = '', index }: FormSectionProps) => {
  const { control } = useFormContext();
  return (
    <>
      {fields.map(value => {
        const name = buildFieldName(value.name || '', namePrefix, index);
        return (
          // data-field is how scrollToField locates this field; see form/utils.ts.
          <div
            data-field={name}
            className={clsx(value.wrapperClassName)}
            key={value.name || value.key}
          >
            <Field control={control} value={value} name={name} />
          </div>
        );
      })}
    </>
  );
};

const Field = ({ control, value, name }: FieldProps) => {
  const {
    field,
    fieldState: { error },
  } = useController({ name, control });

  // Exclude wrapperClassName from being passed to the components
  const { wrapperClassName: _, ...passedValue } = value;
  const fieldValue = passedValue;

  switch (fieldValue.type) {
    case 'text-input':
      return <TextInput {...field} {...fieldValue} error={error?.message} />;
    case 'number-input':
      return <NumberInput {...field} {...fieldValue} error={error?.message} />;
    case 'date-input':
      return <DateInput {...field} {...fieldValue} error={error?.message} />;
    case 'datetime-input':
      return <DateTimeInput {...field} {...fieldValue} error={error?.message} />;
    case 'select-input':
      return <SelectInput {...field} {...fieldValue} error={error?.message} />;
    case 'dropdown':
      return <Dropdown {...field} {...fieldValue} error={error?.message} />;
    case 'boolean-toggle':
      return (
        <FormBooleanToggle
          label={fieldValue.label}
          options={fieldValue.options}
          name={name}
          className={fieldValue.className}
        />
      );
    case 'string-toggle':
      return (
        <FormStringToggle
          label={fieldValue.label}
          options={fieldValue.options}
          name={name}
          className={fieldValue.className}
        />
      );
    case 'textarea':
      return <Textarea {...field} {...fieldValue} error={error?.message} />;
    case 'checkbox':
      return (
        <FormCheckbox
          name={name}
          label={fieldValue.label}
          description={fieldValue.description}
          disabled={fieldValue.disabled}
          className={fieldValue.className}
          size={fieldValue.size}
        />
      );
    case 'radio-group':
      return (
        <FormRadioGroup
          name={name}
          label={fieldValue.label}
          options={fieldValue.options}
          disabled={fieldValue.disabled}
          className={fieldValue.className}
          size={fieldValue.size}
          orientation={fieldValue.orientation}
        />
      );
    case 'switch':
      return (
        <FormSwitch
          name={name}
          label={fieldValue.label}
          description={fieldValue.description}
          disabled={fieldValue.disabled}
          className={fieldValue.className}
          size={fieldValue.size}
          labelPosition={fieldValue.labelPosition}
        />
      );
  }
};

export default FormSection;
