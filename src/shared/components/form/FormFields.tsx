import {
  type Control,
  type FieldValues,
  useController,
  useFormContext,
  useWatch,
} from 'react-hook-form';
import { type ComponentProps, useContext, useEffect, useId, useMemo, useRef } from 'react';
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

import { FieldLabelContext, useFormReadOnly, useFormSchema } from './context';
import { constraintsToInputProps, getFieldConstraints } from './utils';
import {
  evaluateConditions,
  extractConditionFields,
  isFieldConditions,
  setNestedValue,
} from './conditions';
import FieldHelp from './FieldHelp';
import { FormFieldShell } from './FormFieldShell';
import { useFormLayout } from './formLayoutContext';
import { FormSectionBodyContext } from './formSheetContext';
import { FormReadValue, READ_TYPES } from './FormReadValue';
import { isChipGroup, rowGroupRoles, type RowGroupRole } from './rowGroups';
import type { FormField } from './types';
import { useParametersByGroup } from '@/shared/utils/parameterUtils';
import { useFilterWatchValues } from '@/shared/hooks/useFilterWatchValues';
import ParameterSearchInput from '../inputs/ParameterSearchInput';
import type { OtherSpec } from '../inputs/OtherText';

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
  /** Disable all fields in this group (e.g. when user has no edit permission). Existing per-field disabled rules still apply. */
  disabled?: boolean;
}

interface FieldRendererProps {
  control: Control<FieldValues, any, FieldValues>;
  field: FormField;
  namePrefix?: string;
  index?: number;
  schema?: z.ZodObject<any>;
  globalShowCharCount?: boolean;
  globalDisabled?: boolean;
  /** Part of a run of fields that makes one full row (`rowGroupRoles`). */
  rowGroup?: RowGroupRole;
  /** A chip group's "other" companion, typed inside its chip. */
  other?: OtherSpec;
  /** An "other" companion drawn by its chip group: runs its rules, draws nothing. */
  folded?: boolean;
}

/** The form path of a field name under a prefix and an array index. */
function fullFieldName(name: string, namePrefix: string, index?: number): string {
  let full = name;
  if (index !== undefined) full = `${index}.${full}`;
  if (namePrefix !== undefined && namePrefix.trim() !== '') full = `${namePrefix}.${full}`;
  return full;
}

/**
 * An inline "อื่นๆ" text is longer than this and stays a separate textarea: one line in the chip
 * would not hold it.
 */
const MAX_INLINE_OTHER = 200;

/**
 * Pairs each chip group with its "other" companion: a text field in the same list whose only
 * `showWhen` is the group holding one option value ('99'). The companion keeps rendering its hooks
 * (clear-on-hide, required) but draws nothing; the chip draws the input.
 */
function pairOthers(
  fields: FormField[],
  schema: Parameters<typeof getFieldConstraints>[0] | undefined,
  namePrefix: string,
  index?: number,
) {
  const others = new Map<string, OtherSpec>();
  const folded = new Set<string>();
  for (const chip of fields) {
    const otherDropdown = chip.type === 'dropdown' && !!chip.otherField;
    if (chip.type !== 'checkbox-group' && chip.type !== 'radio-group' && !otherDropdown) continue;
    if (chip.type === 'radio-group' && chip.variant === 'card') continue;
    const operator = chip.type === 'checkbox-group' ? 'contains' : 'equals';
    const companion = fields.find(f => {
      const w = f.showWhen;
      return (
        (f.type === 'textarea' || f.type === 'text-input') &&
        !f.hide &&
        !!w &&
        typeof w === 'object' &&
        !isFieldConditions(w) &&
        w.field === chip.name &&
        typeof w.is === 'string' &&
        (w.operator ?? 'equals') === operator &&
        !folded.has(f.name)
      );
    });
    if (!companion || (companion.type !== 'textarea' && companion.type !== 'text-input')) continue;
    const name = fullFieldName(companion.name, namePrefix, index);
    const maxLength =
      companion.maxLength ?? (schema ? getFieldConstraints(schema, name).maxLength : undefined);
    if (maxLength === undefined || maxLength > MAX_INLINE_OTHER) continue;
    const w = companion.showWhen as { is: string };
    others.set(chip.name, {
      name,
      is: w.is,
      maxLength,
      label: companion.label,
      required: !!(companion.required || companion.requiredWhen),
    });
    folded.add(companion.name);
  }
  return { others, folded };
}

/**
 * Renders a group of form fields based on configuration.
 *
 * Features:
 * - Declarative field configuration via array
 * - Automatic validation constraint extraction from Zod schema
 * - Support for nested fields (namePrefix) and array fields (index)
 * - Character count display for text fields
 * - The field wrapper (DESIGN.md 17.4): label above the control in Standard; in Compact, inside a
 *   `FormSection`, a label-left pair that sits two to a row on a wide sheet
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
  disabled,
}: FormFieldsProps) {
  const { control } = useFormContext();
  // Use schema from props, or fall back to context from FormProvider
  const contextSchema = useFormSchema();
  const schema = schemaProp ?? contextSchema;
  const relabel = useContext(FieldLabelContext);
  const visible = fields.filter(f => !f.hide);
  const shown = relabel ? visible.map(relabel) : visible;
  const { others, folded } = pairOthers(
    shown,
    schema as z.ZodObject<any> | undefined,
    namePrefix,
    index,
  );
  // A folded companion draws nothing, so it takes no part in the row groups.
  const layout = useFormLayout();
  const inSectionBody = useContext(FormSectionBodyContext);
  const standardBody = layout === 'standard' && inSectionBody;
  const roles = rowGroupRoles(
    shown.filter(f => !folded.has(f.name)),
    standardBody,
  );
  let drawn = 0;

  return (
    <>
      {shown.map(field => (
        <FieldRenderer
          rowGroup={folded.has(field.name) ? undefined : roles[drawn++]}
          other={others.get(field.name)}
          folded={folded.has(field.name)}
          key={field.key ?? field.name}
          control={control}
          field={field}
          namePrefix={namePrefix}
          index={index}
          schema={schema as z.ZodObject<any> | undefined}
          globalShowCharCount={showCharCount}
          globalDisabled={disabled}
        />
      ))}
    </>
  );
}

/** Compact keeps these on a pair of their own: textareas and multi-input rows. */
const FULL_PAIR_TYPES = new Set<FormField['type']>(['textarea', 'location-selector']);

/** A chip group of at most this many options is short enough to share a Compact row. */
const SHORT_CHOICE_GROUP = 4;

/**
 * Types whose label FormFields draws (in `FormFieldShell`). A single control is labelled by
 * `htmlFor`; a group of controls (chips, toggle, dropdown, the several inputs of an address) is
 * named by `aria-labelledby` on a wrapper. A checkbox and a switch carry their label inline and keep it.
 */
const LABEL_FOR_TYPES = new Set<FormField['type']>([
  'text-input',
  'number-input',
  'date-input',
  'datetime-input',
  'textarea',
  'parameter-search',
]);
const LABELLED_BY_TYPES = new Set<FormField['type']>([
  'boolean-toggle',
  'string-toggle',
  'checkbox-group',
  'radio-group',
  'location-selector',
  'appraisal-selector',
  // Not `aria-label` on the trigger: that would replace its name, which carries the selected value.
  'dropdown',
  'select-input',
]);
const drawsLabel = (type: FormField['type']) =>
  LABEL_FOR_TYPES.has(type) || LABELLED_BY_TYPES.has(type);

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
  globalDisabled,
  rowGroup,
  other,
  folded,
}: FieldRendererProps) {
  // Check visibility, disabled, and required state
  const {
    isVisible,
    isDisabled: fieldDisabled,
    isRequired,
  } = useFieldState({ field, namePrefix, index });
  const isDisabled = fieldDisabled || (globalDisabled ?? false);
  const pageReadOnly = useFormReadOnly();
  const { setValue, getValues } = useFormContext();
  const uid = useId();
  const controlId = `${uid}-control`;
  const labelId = `${uid}-label`;

  // Compact: a short chip group takes half a row, a longer one a row of its own.
  const choice = field.type === 'radio-group' || field.type === 'checkbox-group' ? field : null;
  const groupOptions = useParametersByGroup(choice?.group ?? '');
  const longChoiceGroup =
    !!choice && (choice.options?.length ?? groupOptions.length) > SHORT_CHOICE_GROUP;

  const filterWatchValues = useFilterWatchValues(
    field.type === 'dropdown' ? (field as any).filterOptions : undefined,
  );

  // Build a full field name with prefix and index
  const name = fullFieldName(field.name, namePrefix, index);

  // Clamp a disabled field to its `disabledValue`. Subscribing to the field's own value
  // (via useWatch) means this also re-fires when the value is re-seeded while already
  // disabled — e.g. a parent reset()/async load populating the form after mount, which a
  // one-shot "on became disabled" effect would miss.
  //
  // Keyed on the field's OWN rule, never on `globalDisabled`: a read-only page disables every
  // field, and a page that is read-only only until its menu tree loads would otherwise rewrite
  // values on a form nobody is allowed to edit.
  const watchedValue = useWatch({ control, name });
  // What the field held just before it was clamped, so a toggle flipped by mistake can be undone.
  const preClampRef = useRef<unknown>(undefined);
  const wasFieldDisabledRef = useRef<boolean | null>(null);
  const lastSeenValueRef = useRef<unknown>(undefined);
  useEffect(() => {
    const wasDisabled = wasFieldDisabledRef.current;
    const lastSeenValue = lastSeenValueRef.current;
    wasFieldDisabledRef.current = fieldDisabled;
    const current = getValues(name);
    lastSeenValueRef.current = current;

    if (!fieldDisabled) return;
    if (field.disabledValue === undefined) return;
    if (current === field.disabledValue) return;

    // A blank always takes the stand-in: there is nothing to lose and the field should read
    // "not applicable" rather than sit empty.
    const isEmpty = current === null || current === undefined || current === '';
    if (isEmpty) {
      // Not dirty: filling a blank as a record opens is presentation, and marking it would arm
      // the unsaved-changes prompt on a form nobody has touched.
      setValue(name, field.disabledValue, { shouldDirty: false, shouldValidate: true });
      return;
    }

    // Overwriting text takes more than the field being disabled — it takes the appraiser having
    // just said so. Two other things reach this line and must not destroy stored data:
    //   • mount (wasDisabled === null), and
    //   • reset() landing a record — every page seeds module defaults and applies the record in
    //     an effect, so the governing field flips to "disabled" and this field's value arrives in
    //     the SAME commit. A user flipping a toggle changes only the governing field, so the two
    //     are told apart by whether this field's own value moved at the same time.
    // Getting this wrong destroys data silently: the clamped '' is posted on the next save and
    // the API reads '' as "clear this".
    const userFlippedTheRule = wasDisabled === false && current === lastSeenValue;
    if (!userFlippedTheRule) return;

    preClampRef.current = current;
    // Dirty, unlike the blank-filling case above: the appraiser's own action changed a stored
    // value, and that change must show as an edit (unsaved-changes guard, the Data Correction
    // confirm dialog). A quiet clamp once cleared the number on screen but left it in the
    // database, so the report kept printing a registration number under the
    // "ยังไม่ได้รับการจดทะเบียน" heading.
    setValue(name, field.disabledValue, {
      shouldDirty: true,
      shouldValidate: true,
    });
  }, [fieldDisabled, watchedValue, name, field.disabledValue, getValues, setValue]);

  // …and let it go again when the field becomes editable. `disabledValue` is a stand-in for "not
  // applicable" — "ไม่สามารถตรวจสอบกรรมสิทธิ์ได้", "-", 0 — not data the appraiser meant to enter,
  // so leaving it behind made them delete it by hand before they could type. Opt out with
  // `clearOnEnable: false` where the stand-in is a legitimate resting value, as on a toggle.
  const prevDisabledRef = useRef<boolean | null>(null);
  useEffect(() => {
    const wasDisabled = prevDisabledRef.current;
    prevDisabledRef.current = fieldDisabled;

    // The field's own rule again, not `globalDisabled` — a page leaving read-only is not the
    // appraiser saying this field now applies.
    // Only on a real disabled → enabled transition. Never on mount: a saved record whose value
    // genuinely equals the stand-in must survive being opened.
    if (fieldDisabled || wasDisabled !== true) return;
    if (field.disabledValue === undefined || field.clearOnEnable === false) return;

    // Release it to the empty value the control itself understands. A text input handed `null`
    // flips from controlled to uncontrolled: React stops managing it and the DOM keeps showing
    // the stand-in, which is exactly the bug this effect was written to fix. An empty string is
    // still a controlled value. Non-string stand-ins (a number, a date) have no such literal, so
    // they fall back to null.
    // Give back what was clamped away, if anything: a saved description survives its toggle
    // being flipped to No and back, instead of being destroyed by a stray click and then saved
    // as an empty string. An explicit `enabledValue` still wins — it names a resting value the
    // field must land on, not the appraiser's own text.
    const restored =
      field.enabledValue !== undefined
        ? field.enabledValue
        : preClampRef.current !== undefined
          ? preClampRef.current
          : typeof field.disabledValue === 'string'
            ? ''
            : null;
    if (getValues(name) === field.disabledValue && getValues(name) !== restored) {
      // Dirty on purpose: the stored value really does change, so the form must offer to save it.
      setValue(name, restored, { shouldDirty: true, shouldValidate: false });
      preClampRef.current = undefined;
    }
  }, [
    fieldDisabled,
    name,
    field.disabledValue,
    field.clearOnEnable,
    field.enabledValue,
    getValues,
    setValue,
  ]);

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

  // The text of a chip group's "other" option, for a read page.
  const otherText = useWatch({ control, name: other?.name ?? name });

  // Don't render if field is not visible, or if its chip group draws it
  if (!isVisible || folded) {
    return null;
  }

  // Extract constraints from schema if available
  const schemaConstraints = schema ? getFieldConstraints(schema, name) : {};
  const schemaProps = constraintsToInputProps(schemaConstraints);

  // Exclude wrapperClassName, condition props, and schema-builder-only props from being passed to components
  const {
    wrapperClassName: _w,
    keepSpan: _ks,
    narrowSpan: _ns,
    showWhen: _sw,
    hideWhen: _hw,
    disableWhen: _dw,
    enableWhen: _ew,
    requiredWhen: _rw,
    disabled: _d,
    required: _r,
    disabledValue: _dv,
    clearOnEnable: _coe,
    enabledValue: _ev,
    clearOnHide: _coh,
    hiddenValue: _hv,
    formatPattern: _fp,
    formatPatternMessage: _fpm,
    help: _help,
    inputMask,
    placeholder: fieldPlaceholder,
    ...passedField
  } = field;

  // The wrapper draws the label (and the "?" beside it), so no input below gets `label` or
  // `labelAddon`; a checkbox or switch keeps its inline label.
  // A read page draws a checkbox's or switch's label too: the value beside it is just its state.
  const read = pageReadOnly && READ_TYPES.has(passedField.type);
  const labelText =
    drawsLabel(passedField.type) ||
    (read && (passedField.type === 'checkbox' || passedField.type === 'switch'))
      ? field.label
      : undefined;
  const labelAddon = field.help ? (
    <FieldHelp config={field.help} namePrefix={namePrefix} index={index} />
  ) : undefined;

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
            id={controlId}
            label={undefined}
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
          ...(fieldPlaceholder && { placeholder: fieldPlaceholder }),
        };
        return (
          <NumberInput
            {...fieldProps}
            {...passedField}
            {...numberProps}
            id={controlId}
            label={undefined}
            error={error?.message}
          />
        );
      }

      case 'date-input': {
        const dateProps = {
          required: isRequired,
          disabled: isDisabled,
          ...(fieldPlaceholder && { placeholder: fieldPlaceholder }),
        };
        return (
          <DateInput
            {...fieldProps}
            {...passedField}
            {...dateProps}
            id={controlId}
            label={undefined}
            error={error?.message}
          />
        );
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
            id={controlId}
            label={undefined}
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
          <SelectInput
            {...fieldProps}
            {...passedField}
            {...selectProps}
            label={undefined}
            error={error?.message}
          />
        );
      }

      case 'dropdown': {
        const { otherField: _of, ...dropdownField } = passedField;
        const dropdownProps = {
          ...fieldProps,
          ...dropdownField,
          required: isRequired,
          disabled: isDisabled,
          label: undefined,
          error: error?.message,
          filterWatchValues,
        };
        return other ? (
          <DropdownWithOther {...dropdownProps} other={other} />
        ) : (
          <Dropdown {...dropdownProps} />
        );
      }

      case 'boolean-toggle': {
        const { type: _bt, name: _bn, key: _bk, ...boolToggleRest } = passedField;
        return (
          <FormBooleanToggle
            {...boolToggleRest}
            name={name}
            disabled={isDisabled}
            label={undefined}
          />
        );
      }

      case 'string-toggle': {
        const { type: _st, name: _sn, key: _sk, ...strToggleRest } = passedField;
        return (
          <FormStringToggle
            {...strToggleRest}
            name={name}
            disabled={isDisabled}
            label={undefined}
          />
        );
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
          <Textarea
            {...fieldProps}
            {...passedField}
            {...textareaProps}
            id={controlId}
            label={undefined}
            error={error?.message}
          />
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
            disabled={isDisabled}
            className={cgClass}
            wrap={cgWrap}
            size={cgSize}
            variant={cgVariant}
            other={other}
            {...cgGroupOrOptions}
            label={undefined}
          />
        );
      }

      case 'radio-group': {
        const {
          type: _rgt,
          name: _rgn,
          key: _rgk,
          className: rgClass,
          size: rgSize,
          orientation: rgOri,
          variant: rgVariant,
          ...rgGroupOrOptions
        } = passedField;
        return (
          <FormRadioGroup
            name={name}
            disabled={isDisabled}
            className={rgClass}
            size={rgSize}
            orientation={rgOri}
            variant={rgVariant}
            other={other}
            {...rgGroupOrOptions}
            label={undefined}
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
            placeholder={fieldPlaceholder}
            idField={passedField.idField}
            valueField={passedField.valueField}
            dateField={passedField.dateField}
            disabled={isDisabled}
            required={isRequired}
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
            placeholder={fieldPlaceholder}
            districtField={prefixFieldPath(passedField.districtField) ?? ''}
            districtNameField={prefixFieldPath(passedField.districtNameField)}
            provinceField={prefixFieldPath(passedField.provinceField) ?? ''}
            provinceNameField={prefixFieldPath(passedField.provinceNameField)}
            postcodeField={prefixFieldPath(passedField.postcodeField) ?? ''}
            subDistrictNameField={prefixFieldPath(passedField.subDistrictNameField)}
            addressSource={passedField.addressSource}
            resolveFromAnySource={passedField.resolveFromAnySource}
            error={error?.message}
            className={passedField.className}
            {...locationProps}
          />
        );
      }
      case 'parameter-search': {
        return (
          <ParameterSearchInput
            {...fieldProps}
            group={(passedField as any).group ?? ''}
            options={(passedField as any).options}
            id={controlId}
            {...{ required: isRequired, disabled: isDisabled }}
            error={error?.message}
          />
        );
      }

      case 'field-array':
        return null; // Schema-only — array rendering handled by useFieldArray + namePrefix
    }
  };

  // A read page shows label and value, not disabled controls (DESIGN.md 17.3). A field that is only
  // disabled on an editable page keeps its control.
  // data-field is how scrollToField locates this field: a [name=...] selector cannot be used
  // because Dropdown never forwards `name` to the DOM.
  return (
    <FormFieldShell
      name={name}
      label={labelText}
      labelFor={!read && LABEL_FOR_TYPES.has(passedField.type) ? controlId : undefined}
      labelId={!read && LABELLED_BY_TYPES.has(passedField.type) ? labelId : undefined}
      required={isRequired}
      addon={labelAddon}
      wrapperClassName={field.wrapperClassName}
      full={FULL_PAIR_TYPES.has(passedField.type) || longChoiceGroup}
      rowGroup={rowGroup}
      chips={isChipGroup(field)}
      narrowSpan={field.narrowSpan}
      read={read}
    >
      {read ? (
        <FormReadValue
          field={field}
          name={name}
          value={fieldProps.value}
          required={isRequired}
          other={other && { is: other.is, text: otherText }}
        />
      ) : (
        renderFieldComponent()
      )}
    </FormFieldShell>
  );
}

function DropdownWithOther({
  other,
  error,
  ...props
}: ComponentProps<typeof Dropdown> & { other: OtherSpec }) {
  const { control } = useFormContext();
  const { field, fieldState } = useController({ name: other.name, control });
  return (
    <Dropdown
      {...props}
      otherField
      otherTriggerValue={other.is}
      otherText={field.value ?? ''}
      onOtherTextChange={field.onChange}
      otherMaxLength={other.maxLength}
      error={error ?? fieldState.error?.message}
    />
  );
}

// Re-export types for convenience
export type { FormField } from './types';
