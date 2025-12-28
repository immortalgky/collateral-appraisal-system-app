import { type Control, type FieldValues, useController, useFormContext } from 'react-hook-form';
import clsx from 'clsx';
import type { z } from 'zod';

import Dropdown from '../inputs/Dropdown';
import NumberInput from '../inputs/NumberInput';
import TextInput from '../inputs/TextInput';
import DateInput from '../inputs/DateInput';
import Textarea from '../inputs/Textarea';
import DateTimeInput from '../inputs/DateTimeInput';
import SelectInput from '../inputs/SelectInput';
import FormStringToggle from '../inputs/FormStringToggle';
import FormBooleanToggle from '../inputs/FormBooleanToggle';
import FormCheckbox from '../inputs/FormCheckbox';
import FormRadioGroup from '../inputs/FormRadioGroup';
import FormSwitch from '../inputs/FormSwitch';

import { useFormSchema } from './context';
import { constraintsToInputProps, getFieldConstraints } from './utils';
import type { FormField } from './types';

interface FormFieldsProps {
  /** Array of field configurations to render */
  fields: FormField[];
  /** Prefix for nested field names (e.g., "address" for "address.street") */
  namePrefix?: string;
  /** Index for array fields */
  index?: number;
  /**
   * Zod schema for auto-extracting validation constraints.
   * If not provided, will try to get from FormProvider context.
   */
  schema?: z.ZodObject<any>;
  /** Show character count for text fields with maxLength */
  showCharCount?: boolean;
}

interface FieldRendererProps {
  control: Control<FieldValues, any, FieldValues>;
  field: FormField;
  namePrefix?: string;
  index?: number;
  schema?: z.ZodObject<any>;
  globalShowCharCount?: boolean;
}

/**
 * Renders a group of form fields based on configuration.
 *
 * Features:
 * - Declarative field configuration via array
 * - Automatic validation constraint extraction from Zod schema
 * - Support for nested fields (namePrefix) and array fields (index)
 * - Character count display for text fields
 *
 * @example
 * ```tsx
 * const fields: FormField[] = [
 *   { type: 'text-input', name: 'name', label: 'Name' },
 *   { type: 'text-input', name: 'email', label: 'Email' },
 *   { type: 'number-input', name: 'age', label: 'Age', decimalPlaces: 0 },
 * ];
 *
 * <FormFields fields={fields} showCharCount />
 * ```
 */
export function FormFields({
  fields,
  namePrefix = '',
  index,
  schema: schemaProp,
  showCharCount,
}: FormFieldsProps) {
  const { control } = useFormContext();
  // Use schema from props, or fall back to context from FormProvider
  const contextSchema = useFormSchema();
  const schema = schemaProp ?? contextSchema;

  return (
    <>
      {fields.map(field => (
        <div className={clsx(field.wrapperClassName)} key={field.key ?? field.name}>
          <FieldRenderer
            control={control}
            field={field}
            namePrefix={namePrefix}
            index={index}
            schema={schema as z.ZodObject<any> | undefined}
            globalShowCharCount={showCharCount}
          />
        </div>
      ))}
    </>
  );
}

/**
 * Internal component that renders individual fields
 */
function FieldRenderer({
  control,
  field,
  namePrefix,
  index,
  schema,
  globalShowCharCount,
}: FieldRendererProps) {
  // Build a full field name with prefix and index
  let name = field.name;
  if (index !== undefined) {
    name = `${index}.${name}`;
  }
  if (namePrefix !== undefined && namePrefix.trim() !== '') {
    name = `${namePrefix}.${name}`;
  }

  const {
    field: fieldProps,
    fieldState: { error },
  } = useController({ name, control });

  // Extract constraints from schema if available
  const schemaConstraints = schema ? getFieldConstraints(schema, name) : {};
  const schemaProps = constraintsToInputProps(schemaConstraints);

  // Exclude wrapperClassName from being passed to the components
  const { wrapperClassName: _, ...passedField } = field;

  switch (passedField.type) {
    case 'text-input': {
      // Merge schema constraints with field overrides (field overrides take precedence)
      const textProps = {
        ...schemaProps,
        maxLength: passedField.maxLength ?? schemaProps.maxLength,
        minLength: passedField.minLength ?? schemaProps.minLength,
        required: passedField.required ?? schemaProps.required,
        showCharCount: passedField.showCharCount ?? globalShowCharCount,
      };
      return <TextInput {...fieldProps} {...passedField} {...textProps} error={error?.message} />;
    }

    case 'number-input': {
      const numberProps = {
        ...schemaProps,
        min: passedField.min ?? schemaProps.min,
        max: passedField.max ?? schemaProps.max,
        required: passedField.required ?? schemaProps.required,
      };
      return (
        <NumberInput {...fieldProps} {...passedField} {...numberProps} error={error?.message} />
      );
    }

    case 'date-input': {
      const dateProps = {
        required: passedField.required ?? schemaProps.required,
      };
      return <DateInput {...fieldProps} {...passedField} {...dateProps} error={error?.message} />;
    }

    case 'datetime-input': {
      const dateTimeProps = {
        required: passedField.required ?? schemaProps.required,
      };
      return (
        <DateTimeInput {...fieldProps} {...passedField} {...dateTimeProps} error={error?.message} />
      );
    }

    case 'select-input': {
      const selectProps = {
        required: passedField.required ?? schemaProps.required,
      };
      return (
        <SelectInput {...fieldProps} {...passedField} {...selectProps} error={error?.message} />
      );
    }

    case 'dropdown': {
      const dropdownProps = {
        required: passedField.required ?? schemaProps.required,
      };
      return (
        <Dropdown {...fieldProps} {...passedField} {...dropdownProps} error={error?.message} />
      );
    }

    case 'boolean-toggle':
      return (
        <FormBooleanToggle
          label={passedField.label}
          options={passedField.options}
          name={name}
          className={passedField.className}
        />
      );

    case 'string-toggle':
      return (
        <FormStringToggle
          label={passedField.label}
          options={passedField.options}
          name={name}
          className={passedField.className}
        />
      );

    case 'textarea': {
      const textareaProps = {
        ...schemaProps,
        maxLength: passedField.maxLength ?? schemaProps.maxLength,
        required: passedField.required ?? schemaProps.required,
        showCharCount: passedField.showCharCount ?? globalShowCharCount,
      };
      return (
        <Textarea {...fieldProps} {...passedField} {...textareaProps} error={error?.message} />
      );
    }

    case 'checkbox':
      return (
        <FormCheckbox
          name={name}
          label={passedField.label}
          description={passedField.description}
          disabled={passedField.disabled}
          className={passedField.className}
          size={passedField.size}
        />
      );

    case 'radio-group':
      return (
        <FormRadioGroup
          name={name}
          label={passedField.label}
          options={passedField.options}
          disabled={passedField.disabled}
          className={passedField.className}
          size={passedField.size}
          orientation={passedField.orientation}
        />
      );

    case 'switch':
      return (
        <FormSwitch
          name={name}
          label={passedField.label}
          description={passedField.description}
          disabled={passedField.disabled}
          className={passedField.className}
          size={passedField.size}
          labelPosition={passedField.labelPosition}
        />
      );
  }
}

// Re-export types for convenience
export type { FormField } from './types';
