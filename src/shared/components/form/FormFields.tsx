import { type Control, type FieldValues, useController, useFormContext, useWatch, } from 'react-hook-form';
import { useEffect, useMemo, useRef } from 'react';
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
import { evaluateConditions, extractConditionFields, setNestedValue } from './conditions';
import type { FormField } from './types';

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
      {fields
        .filter(f => !f.hide)
        .map(field => (
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
        shouldDirty: false,
        shouldValidate: true,
      });
    }
  }, [isDisabled, name, field.disabledValue, getValues, setValue]);

  // Clear field value when hidden by showWhen/hideWhen (clearOnHide defaults to true)
  const prevVisibleRef = useRef<boolean | null>(null);

  useEffect(() => {
    const wasVisible = prevVisibleRef.current;
    prevVisibleRef.current = isVisible;

    // Only clear on a genuine visible → hidden transition.
    // Skip if: initial mount (null), still hidden (false→false), or became visible.
    // This prevents clearing during form init and reset() propagation delays.
    if (!isVisible && wasVisible === true) {
      if (field.clearOnHide === false) return;

      const clearValue = field.hiddenValue ?? null;
      const currentValue = getValues(name);
      if (currentValue !== clearValue) {
        setValue(name, clearValue, {
          shouldDirty: false,
          shouldValidate: false,
        });
      }
    }
  }, [isVisible, name, field.clearOnHide, field.hiddenValue, getValues, setValue]);

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

  // Exclude wrapperClassName, condition props, and schema-builder-only props from being passed to components
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
    clearOnHide: _coh,
    hiddenValue: _hv,
    formatPattern: _fp,
    formatPatternMessage: _fpm,
    inputMask,
    placeholder: fieldPlaceholder,
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
          ...(fieldPlaceholder && { placeholder: fieldPlaceholder }),
        };
        return (
          <TextInput
            {...fieldProps}
            {...passedField}
            {...textProps}
            inputMask={inputMask}
            error={error?.message}
          />
        );
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
          ...(fieldPlaceholder && { placeholder: fieldPlaceholder }),
        };
        return <DateInput {...fieldProps} {...passedField} {...dateProps} error={error?.message} />;
      }

      case 'datetime-input': {
        const dateTimeProps = {
          required: isRequired,
          disabled: isDisabled,
          ...(fieldPlaceholder && { placeholder: fieldPlaceholder }),
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
        const { type: _bt, name: _bn, key: _bk, ...boolToggleRest } = passedField;
        return <FormBooleanToggle {...boolToggleRest} name={name} disabled={isDisabled} />;
      }

      case 'string-toggle': {
        const { type: _st, name: _sn, key: _sk, ...strToggleRest } = passedField;
        return <FormStringToggle {...strToggleRest} name={name} disabled={isDisabled} />;
      }

      case 'textarea': {
        const textareaProps = {
          ...schemaProps,
          maxLength: passedField.maxLength ?? schemaProps.maxLength,
          required: isRequired,
          showCharCount: passedField.showCharCount ?? globalShowCharCount,
          disabled: isDisabled,
          ...(fieldPlaceholder && { placeholder: fieldPlaceholder }),
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
          label: cgLabel,
          className: cgClass,
          wrap: cgWrap,
          size: cgSize,
          orientation: _cgOri,
          variant: cgVariant,
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
            variant={cgVariant}
            {...cgGroupOrOptions}
          />
        );
      }

      case 'radio-group': {
        const {
          type: _rgt,
          name: _rgn,
          key: _rgk,
          label: rgLabel,
          className: rgClass,
          size: rgSize,
          orientation: rgOri,
          variant: rgVariant,
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
            variant={rgVariant}
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
            placeholder={fieldPlaceholder}
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
            placeholder={fieldPlaceholder}
            districtField={prefixFieldPath(passedField.districtField) ?? ''}
            districtNameField={prefixFieldPath(passedField.districtNameField)}
            provinceField={prefixFieldPath(passedField.provinceField) ?? ''}
            provinceNameField={prefixFieldPath(passedField.provinceNameField)}
            postcodeField={prefixFieldPath(passedField.postcodeField) ?? ''}
            subDistrictNameField={prefixFieldPath(passedField.subDistrictNameField)}
            addressSource={passedField.addressSource}
            error={error?.message}
            className={passedField.className}
            {...locationProps}
          />
        );
      }

      case 'field-array':
        return null; // Schema-only — array rendering handled by useFieldArray + namePrefix
    }
  };

  // Wrap the field component with the wrapper div
  return <div className={clsx(field.wrapperClassName)}>{renderFieldComponent()}</div>;
}

// Re-export types for convenience
export type { FormField } from './types';
