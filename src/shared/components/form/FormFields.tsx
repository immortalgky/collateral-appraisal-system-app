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
import FormCheckboxGroup from '../inputs/FormCheckboxGroup';
import FormRadioGroup from '../inputs/FormRadioGroup';
import FormSwitch from '../inputs/FormSwitch';
import AppraisalSelector from '../inputs/AppraisalSelector';
import LocationSelector from '../inputs/LocationSelector';

import { useFormSchema } from './context';
import { constraintsToInputProps, getFieldConstraints } from './utils';
import type { FormField, FieldCondition, FieldConditions, ConditionInput } from './types';
import { useEffect } from 'react';

// =============================================================================
// Condition Evaluation Utilities
// =============================================================================

/**
 * Simple utility to get a nested value from an object using dot notation.
 * Supports array indices in bracket notation (e.g., "items.0.name" or "items[0].name").
 */
function getNestedValue(obj: Record<string, unknown>, path: string): unknown {
  // Normalize bracket notation to dot notation: "items[0].name" -> "items.0.name"
  const normalizedPath = path.replace(/\[(\d+)\]/g, '.$1');
  const keys = normalizedPath.split('.');

  let current: unknown = obj;
  for (const key of keys) {
    if (current == null || typeof current !== 'object') {
      return undefined;
    }
    current = (current as Record<string, unknown>)[key];
  }
  return current;
}

/**
 * Resolves a condition field path, handling array field context.
 * - $root.fieldName → absolute path (fieldName)
 * - fieldName → relative path (namePrefix[index].fieldName)
 */
function resolveFieldPath(conditionField: string, namePrefix: string, index?: number): string {
  // Absolute path - strip $root. prefix
  if (conditionField.startsWith('$root.')) {
    return conditionField.slice(6);
  }

  // Relative path - build full path with index and prefix
  if (index !== undefined && namePrefix) {
    return `${namePrefix}.${index}.${conditionField}`;
  }
  if (namePrefix) {
    return `${namePrefix}.${conditionField}`;
  }
  return conditionField;
}

/** Type guard for FieldConditions (multiple conditions) */
function isFieldConditions(obj: unknown): obj is FieldConditions {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    'conditions' in obj &&
    Array.isArray((obj as FieldConditions).conditions)
  );
}

/**
 * Evaluates a single condition against form values.
 */
function evaluateCondition(
  condition: FieldCondition,
  values: Record<string, unknown>,
  namePrefix: string,
  index?: number,
): boolean {
  const resolvedField = resolveFieldPath(condition.field, namePrefix, index);
  const value = getNestedValue(values, resolvedField);
  const target = condition.is;
  const operator = condition.operator ?? 'equals';

  switch (operator) {
    case 'equals':
      return value === target;
    case 'notEquals':
      return value !== target;
    case 'in':
      return Array.isArray(target) && target.includes(value);
    case 'notIn':
      return Array.isArray(target) && !target.includes(value);
    case 'isEmpty':
      return value == null || value === '';
    case 'isNotEmpty':
      return value != null && value !== '';
    case 'gt':
      return typeof value === 'number' && typeof target === 'number' && value > target;
    case 'gte':
      return typeof value === 'number' && typeof target === 'number' && value >= target;
    case 'lt':
      return typeof value === 'number' && typeof target === 'number' && value < target;
    case 'lte':
      return typeof value === 'number' && typeof target === 'number' && value <= target;
    default:
      return true;
  }
}

/**
 * Evaluates condition input (single, multiple, or function).
 */
function evaluateConditions(
  input: ConditionInput,
  values: Record<string, unknown>,
  namePrefix: string,
  index?: number,
): boolean {
  // Functional condition
  if (typeof input === 'function') {
    return input(values);
  }

  // Multiple conditions with match logic
  if (isFieldConditions(input)) {
    const { conditions, match = 'all' } = input;
    if (match === 'any') {
      return conditions.some(c => evaluateCondition(c, values, namePrefix, index));
    }
    return conditions.every(c => evaluateCondition(c, values, namePrefix, index));
  }

  // Single condition
  return evaluateCondition(input, values, namePrefix, index);
}

// =============================================================================
// Field Visibility Hook
// =============================================================================

interface UseFieldVisibilityOptions {
  field: FormField;
  namePrefix: string;
  index?: number;
}

/**
 * Hook to compute field visibility and disabled state based on conditions.
 */
function useFieldVisibility({ field, namePrefix, index }: UseFieldVisibilityOptions) {
  const { watch } = useFormContext();
  const values = watch();

  // Calculate visibility
  let isVisible = true;
  if (field.showWhen) {
    isVisible = evaluateConditions(field.showWhen, values, namePrefix, index);
  } else if (field.hideWhen) {
    isVisible = !evaluateConditions(field.hideWhen, values, namePrefix, index);
  }

  // Calculate disabled state
  let isDisabled = field.disabled ?? false;
  if (!isDisabled && field.disableWhen) {
    isDisabled = evaluateConditions(field.disableWhen, values, namePrefix, index);
  } else if (isDisabled && field.enableWhen) {
    isDisabled = !evaluateConditions(field.enableWhen, values, namePrefix, index);
  }
  return { isVisible, isDisabled };
}

// =============================================================================
// Component Interfaces
// =============================================================================

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
        <FieldRenderer
          key={field.key ?? field.name}
          control={control}
          field={field}
          namePrefix={namePrefix}
          index={index}
          schema={schema as z.ZodObject<any> | undefined}
          globalShowCharCount={showCharCount}
        />
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
  namePrefix = '',
  index,
  schema,
  globalShowCharCount,
}: FieldRendererProps) {
  // Check visibility and disabled state
  const { isVisible, isDisabled } = useFieldVisibility({ field, namePrefix, index });
  const { setValue, getValues } = useFormContext();

  // Build a full field name with prefix and index
  let name = field.name;
  if (index !== undefined) {
    name = `${index}.${name}`;
  }
  if (namePrefix !== undefined && namePrefix.trim() !== '') {
    name = `${namePrefix}.${name}`;
  }

  // Set disabled value if field is disabled
  useEffect(() => {
    if (!isDisabled) return;
    if (field.disabledValue === undefined) return;

    const currentValue = getValues(name);

    if (currentValue !== field.disabledValue) {
      setValue(name, field.disabledValue, {
        shouldDirty: true,
        shouldValidate: true,
      });
    }
  }, [isDisabled, name, field.disabledValue, getValues, setValue]);

  const {
    field: fieldProps,
    fieldState: { error },
  } = useController({ name, control });

  // Don't render if field is not visible
  if (!isVisible) {
    return null;
  }

  // Extract constraints from schema if available
  const schemaConstraints = schema ? getFieldConstraints(schema, name) : {};
  const schemaProps = constraintsToInputProps(schemaConstraints);

  // Exclude wrapperClassName and condition props from being passed to components
  const {
    wrapperClassName: _w,
    showWhen: _sw,
    hideWhen: _hw,
    disableWhen: _dw,
    enableWhen: _ew,
    disabled: _d,
    disabledValue: _dv,
    ...passedField
  } = field;

  // Render the appropriate field component
  const renderFieldComponent = () => {
    switch (passedField.type) {
      case 'text-input': {
        // Merge schema constraints with field overrides (field overrides take precedence)
        const textProps = {
          ...schemaProps,
          maxLength: passedField.maxLength ?? schemaProps.maxLength,
          minLength: passedField.minLength ?? schemaProps.minLength,
          required: passedField.required ?? schemaProps.required,
          showCharCount: passedField.showCharCount ?? globalShowCharCount,
          disabled: isDisabled,
        };
        return <TextInput {...fieldProps} {...passedField} {...textProps} error={error?.message} />;
      }

      case 'number-input': {
        const numberProps = {
          ...schemaProps,
          min: passedField.min ?? schemaProps.min,
          max: passedField.max ?? schemaProps.max,
          required: passedField.required ?? schemaProps.required,
          disabled: isDisabled,
        };
        return (
          <NumberInput {...fieldProps} {...passedField} {...numberProps} error={error?.message} />
        );
      }

      case 'date-input': {
        const dateProps = {
          required: passedField.required ?? schemaProps.required,
          disabled: isDisabled,
        };
        return <DateInput {...fieldProps} {...passedField} {...dateProps} error={error?.message} />;
      }

      case 'datetime-input': {
        const dateTimeProps = {
          required: passedField.required ?? schemaProps.required,
          disabled: isDisabled,
        };
        return (
          <DateTimeInput
            {...fieldProps}
            {...passedField}
            {...dateTimeProps}
            error={error?.message}
          />
        );
      }

      case 'select-input': {
        const selectProps = {
          required: passedField.required ?? schemaProps.required,
          disabled: isDisabled,
        };
        return (
          <SelectInput {...fieldProps} {...passedField} {...selectProps} error={error?.message} />
        );
      }

      case 'dropdown': {
        const dropdownProps = {
          required: passedField.required ?? schemaProps.required,
          disabled: isDisabled,
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
            size={passedField.size}
            name={name}
            className={passedField.className}
            disabled={isDisabled}
          />
        );

      case 'string-toggle':
        return (
          <FormStringToggle
            label={passedField.label}
            options={passedField.options}
            size={passedField.size}
            name={name}
            className={passedField.className}
            disabled={isDisabled}
          />
        );

      case 'textarea': {
        const textareaProps = {
          ...schemaProps,
          maxLength: passedField.maxLength ?? schemaProps.maxLength,
          required: passedField.required ?? schemaProps.required,
          showCharCount: passedField.showCharCount ?? globalShowCharCount,
          disabled: isDisabled,
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
            disabled={isDisabled}
            className={passedField.className}
            size={passedField.size}
          />
        );

      case 'checkbox-group':
        return (
          <FormCheckboxGroup
            name={name}
            label={passedField.label}
            options={passedField.options}
            disabled={isDisabled}
            className={passedField.className}
            size={passedField.size}
            orientation={passedField.orientation}
          />
        );

      case 'radio-group':
        return (
          <FormRadioGroup
            name={name}
            label={passedField.label}
            options={passedField.options}
            disabled={isDisabled}
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
            disabled={isDisabled}
            className={passedField.className}
            size={passedField.size}
            labelPosition={passedField.labelPosition}
          />
        );

      case 'appraisal-selector':
        return (
          <AppraisalSelector
            name={name}
            label={passedField.label}
            placeholder={passedField.placeholder}
            idField={passedField.idField}
            valueField={passedField.valueField}
            dateField={passedField.dateField}
            disabled={isDisabled}
            error={error?.message}
            className={passedField.className}
          />
        );

      case 'location-selector': {
        // Helper to prefix a field path - ONLY when index is defined (array context)
        // Non-array usage (like AddressForm) uses absolute paths that don't need prefixing
        const prefixFieldPath = (fieldPath: string | undefined): string | undefined => {
          if (!fieldPath) return undefined;

          // Only prefix in array context (when index is defined)
          if (index === undefined) {
            return fieldPath; // Return as-is for non-array usage
          }

          let prefixedPath = `${index}.${fieldPath}`;
          if (namePrefix !== undefined && namePrefix.trim() !== '') {
            prefixedPath = `${namePrefix}.${prefixedPath}`;
          }
          return prefixedPath;
        };

        const locationProps = {
          required: passedField.required ?? schemaProps.required,
          disabled: isDisabled,
        };
        return (
          <LocationSelector
            name={name}
            label={passedField.label}
            placeholder={passedField.placeholder}
            districtField={prefixFieldPath(passedField.districtField) ?? ''}
            districtNameField={prefixFieldPath(passedField.districtNameField)}
            provinceField={prefixFieldPath(passedField.provinceField) ?? ''}
            provinceNameField={prefixFieldPath(passedField.provinceNameField)}
            postcodeField={prefixFieldPath(passedField.postcodeField) ?? ''}
            subDistrictNameField={prefixFieldPath(passedField.subDistrictNameField)}
            error={error?.message}
            className={passedField.className}
            {...locationProps}
          />
        );
      }
    }
  };

  // Wrap the field component with the wrapper div
  return <div className={clsx(field.wrapperClassName)}>{renderFieldComponent()}</div>;
}

// Re-export types for convenience
export type { FormField } from './types';
