import {
  type Control,
  type FieldValues,
  useController,
  useFormContext,
  useWatch,
} from 'react-hook-form';
import { useEffect, useMemo } from 'react';
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
import type { ConditionInput, FieldCondition, FieldConditions, FormField } from './types';

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
 * Extracts dependency field names from a condition input.
 * Returns empty array for function conditions (rare/unsupported for targeted watch).
 */
function extractConditionFields(
  input: ConditionInput | undefined,
  namePrefix: string,
  index?: number,
): string[] {
  if (!input) return [];
  if (typeof input === 'function') return [];
  if (isFieldConditions(input)) {
    return input.conditions.map(c => resolveFieldPath(c.field, namePrefix, index));
  }
  return [resolveFieldPath(input.field, namePrefix, index)];
}

/**
 * Sets a nested value in an object using dot-notation path.
 * Inverse of getNestedValue — creates intermediate objects/arrays as needed.
 */
function setNestedValue(obj: Record<string, unknown>, path: string, value: unknown): void {
  const normalizedPath = path.replace(/\[(\d+)\]/g, '.$1');
  const keys = normalizedPath.split('.');
  let current: any = obj;
  for (let i = 0; i < keys.length - 1; i++) {
    const key = keys[i];
    if (current[key] == null || typeof current[key] !== 'object') {
      current[key] = /^\d+$/.test(keys[i + 1]) ? [] : {};
    }
    current = current[key];
  }
  current[keys[keys.length - 1]] = value;
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
// Field State Hook
// =============================================================================

interface UseFieldStateOptions {
  field: FormField;
  namePrefix: string;
  index?: number;
}

/**
 * Hook to compute field visibility, disabled, and required state based on conditions.
 * Uses targeted useWatch to only subscribe to the specific fields that conditions depend on,
 * preventing unnecessary re-renders when unrelated form fields change.
 */
function useFieldState({ field, namePrefix, index }: UseFieldStateOptions) {
  const hasConditions = !!(
    field.showWhen ||
    field.hideWhen ||
    field.disableWhen ||
    field.enableWhen ||
    field.requiredWhen
  );

  // Collect only the field names this field's conditions depend on
  const watchFields = useMemo(() => {
    if (!hasConditions) return [] as string[];
    const fields: string[] = [];
    for (const cond of [
      field.showWhen,
      field.hideWhen,
      field.disableWhen,
      field.enableWhen,
      field.requiredWhen,
    ]) {
      fields.push(...extractConditionFields(cond, namePrefix, index));
    }
    return [...new Set(fields)];
  }, [
    field.showWhen,
    field.hideWhen,
    field.disableWhen,
    field.enableWhen,
    field.requiredWhen,
    namePrefix,
    index,
    hasConditions,
  ]);

  // Only subscribe to the specific fields that conditions reference
  const watchedValues = useWatch({ name: watchFields });

  // Build a values object that evaluateConditions can traverse via getNestedValue
  const values = useMemo(() => {
    if (!hasConditions || watchFields.length === 0) return {};
    const obj: Record<string, unknown> = {};
    watchFields.forEach((fieldName, i) => {
      setNestedValue(
        obj,
        fieldName,
        Array.isArray(watchedValues) ? watchedValues[i] : watchedValues,
      );
    });
    return obj;
  }, [hasConditions, watchFields, watchedValues]);

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

  // Calculate required state
  let isRequired = field.required ?? false;
  if (field.requiredWhen) {
    isRequired = evaluateConditions(field.requiredWhen, values, namePrefix, index);
  }

  return { isVisible, isDisabled, isRequired };
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
  // Check visibility, disabled, and required state
  const { isVisible, isDisabled, isRequired } = useFieldState({ field, namePrefix, index });
  const { setValue, getValues } = useFormContext();

  // Build a full field name with prefix and index
  let name = field.name;
  if (index !== undefined) {
    name = `${index}.${name}`;
  }
  if (namePrefix !== undefined && namePrefix.trim() !== '') {
    name = `${namePrefix}.${name}`;
  }

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
  } = useController({
    name,
    control,
  });

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
    requiredWhen: _rw,
    disabled: _d,
    required: _r,
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
          required: isRequired,
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
          required: isRequired,
          disabled: isDisabled,
        };
        return (
          <NumberInput {...fieldProps} {...passedField} {...numberProps} error={error?.message} />
        );
      }

      case 'date-input': {
        const dateProps = {
          required: isRequired,
          disabled: isDisabled,
        };
        return <DateInput {...fieldProps} {...passedField} {...dateProps} error={error?.message} />;
      }

      case 'datetime-input': {
        const dateTimeProps = {
          required: isRequired,
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
          required: isRequired,
          disabled: isDisabled,
        };
        return (
          <SelectInput {...fieldProps} {...passedField} {...selectProps} error={error?.message} />
        );
      }

      case 'dropdown': {
        const dropdownProps = {
          required: isRequired,
          disabled: isDisabled,
        };
        return (
          <Dropdown {...fieldProps} {...passedField} {...dropdownProps} error={error?.message} />
        );
      }

      case 'boolean-toggle': {
        const {
          type: _bt,
          name: _bn,
          key: _bk,
          disabledValue: _bdv,
          ...boolToggleRest
        } = passedField;
        return <FormBooleanToggle {...boolToggleRest} name={name} disabled={isDisabled} />;
      }

      case 'string-toggle': {
        const {
          type: _st,
          name: _sn,
          key: _sk,
          disabledValue: _sdv,
          ...strToggleRest
        } = passedField;
        return <FormStringToggle {...strToggleRest} name={name} disabled={isDisabled} />;
      }

      case 'textarea': {
        const textareaProps = {
          ...schemaProps,
          maxLength: passedField.maxLength ?? schemaProps.maxLength,
          required: isRequired,
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

      case 'checkbox-group': {
        const {
          type: _cgt,
          name: _cgn,
          key: _cgk,
          disabledValue: _cgdv,
          label: cgLabel,
          className: cgClass,
          wrap: cgWrap,
          size: cgSize,
          orientation: _cgOri,
          ...cgGroupOrOptions
        } = passedField;
        return (
          <FormCheckboxGroup
            name={name}
            label={cgLabel}
            disabled={isDisabled}
            className={cgClass}
            wrap={cgWrap}
            size={cgSize}
            {...cgGroupOrOptions}
          />
        );
      }

      case 'radio-group': {
        const {
          type: _rgt,
          name: _rgn,
          key: _rgk,
          disabledValue: _rgdv,
          label: rgLabel,
          className: rgClass,
          size: rgSize,
          orientation: rgOri,
          ...rgGroupOrOptions
        } = passedField;
        return (
          <FormRadioGroup
            name={name}
            label={rgLabel}
            disabled={isDisabled}
            className={rgClass}
            size={rgSize}
            orientation={rgOri}
            {...rgGroupOrOptions}
          />
        );
      }

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
          required: isRequired,
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
