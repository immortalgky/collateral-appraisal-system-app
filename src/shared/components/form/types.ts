import type { ListBoxItem } from '../inputs/Dropdown';
import type { FormStringToggleOption } from '../inputs/FormStringToggle';
import type { RadioOption } from '../inputs/RadioGroup';
import type { CheckboxOption } from '../inputs/CheckboxGroup';
import type { AtLeastOne } from '@/shared/types';
import type { ParameterParams } from '@/shared/types/api';

// =============================================================================
// Conditional Field Types
// =============================================================================

/** Comparison operators for declarative field conditions */
export type ConditionOperator =
  | 'equals' // value === target (default)
  | 'notEquals' // value !== target
  | 'in' // target array includes value
  | 'notIn' // target array doesn't include value
  | 'isEmpty' // value is null/undefined/''
  | 'isNotEmpty' // value is truthy
  | 'gt' // value > target (number)
  | 'gte' // value >= target (number)
  | 'lt' // value < target (number)
  | 'lte'; // value <= target (number)

/**
 * Single condition for field visibility/disabled state.
 * Use $root. prefix for absolute paths in array fields.
 */
export interface FieldCondition {
  /** Field name to watch. Use $root.fieldName for absolute paths in arrays. */
  field: string;
  /** Value to match against */
  is?: unknown;
  /** Comparison operator (default: 'equals') */
  operator?: ConditionOperator;
}

/** Multiple conditions with AND/OR logic */
export interface FieldConditions {
  /** Array of conditions to evaluate */
  conditions: FieldCondition[];
  /** Match mode: 'all' = AND (default), 'any' = OR */
  match?: 'all' | 'any';
}

/** Condition input: single, multiple with logic, or function */
export type ConditionInput =
  | FieldCondition
  | FieldConditions
  | ((values: Record<string, unknown>) => boolean);

/**
 * Union type of all supported form field configurations.
 * Used by FormFields component to render the appropriate input.
 */
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
  | CheckboxGroupField
  | RadioGroupField
  | SwitchField
  | AppraisalSelectorField
  | LocationSelectorField;

/**
 * Base properties shared by all form fields
 */
interface BaseFormField {
  /** Field name/path in the form data (e.g., "address.street") */
  name: string;
  /** Optional React key override */
  key?: string;
  /** CSS classes for the input element */
  className?: string;
  /** CSS classes for the wrapper div (e.g., grid span) */
  wrapperClassName?: string;
  /** Disable the input */
  disabled?: boolean;
  /** Mark as required (shows asterisk, overrides schema) */
  required?: boolean;

  // Conditional visibility (values kept when hidden)
  /** Show field when condition is met */
  showWhen?: ConditionInput;
  /** Hide field when condition is met */
  hideWhen?: ConditionInput;

  // Conditional disabled state
  /** Disable field when condition is met */
  disableWhen?: ConditionInput;
  /** Enable field when condition is met (overrides disabled) */
  enableWhen?: ConditionInput;
}

// =============================================================================
// Text-based fields
// =============================================================================

export interface TextInputField extends BaseFormField {
  type: 'text-input';
  label: string;
  /** Override maxLength from schema */
  maxLength?: number;
  /** Override minLength from schema */
  minLength?: number;
  /** Show character count */
  showCharCount?: boolean;
}

export interface TextareaField extends BaseFormField {
  type: 'textarea';
  label: string;
  /** Override maxLength from schema */
  maxLength?: number;
  /** Show character count */
  showCharCount?: boolean;
}

// =============================================================================
// Number fields
// =============================================================================

export interface NumberInputField extends BaseFormField {
  type: 'number-input';
  label: string;
  /** Number of decimal places (default: 2) */
  decimalPlaces?: number;
  /** Allow negative numbers (default: false) */
  allowNegative?: boolean;
  /** Override min value from schema */
  min?: number;
  /** Override max value from schema */
  max?: number;
}

// =============================================================================
// Date/Time fields
// =============================================================================

export interface DateInputField extends BaseFormField {
  type: 'date-input';
  label: string;
}

export interface DateTimeInputField extends BaseFormField {
  type: 'datetime-input';
  label: string;
}

// =============================================================================
// Select/Dropdown fields
// =============================================================================

export interface SelectInputField extends BaseFormField {
  type: 'select-input';
  label: string;
  options: ListBoxItem[];
}

export type DropdownField = BaseDropdownField &
  AtLeastOne<{ queryParameters: ParameterParams; options: ListBoxItem[] }>;

interface BaseDropdownField extends BaseFormField {
  type: 'dropdown';
  label: string;
}

// =============================================================================
// Toggle fields
// =============================================================================

export interface BooleanToggleField extends BaseFormField {
  type: 'boolean-toggle';
  label: string;
  /** Labels for [false, true] states */
  options: [string, string];
  /** Size variant */
  size?: 'sm' | 'md';
}

export interface StringToggleField extends BaseFormField {
  type: 'string-toggle';
  label: string;
  options: [FormStringToggleOption, FormStringToggleOption];
  /** Size variant */
  size?: 'sm' | 'md';
}

// =============================================================================
// Checkbox/Radio/Switch fields
// =============================================================================

export interface CheckboxField extends BaseFormField {
  type: 'checkbox';
  label?: string;
  description?: string;
  size?: 'sm' | 'md' | 'lg';
}

export interface CheckboxGroupField extends BaseFormField {
  type: 'checkbox-group';
  label?: string;
  options: CheckboxOption[];
  wrap?: boolean;
  size?: 'sm' | 'md' | 'lg';
  orientation?: 'horizontal' | 'vertical';
}

export interface RadioGroupField extends BaseFormField {
  type: 'radio-group';
  label?: string;
  options: RadioOption[];
  size?: 'sm' | 'md' | 'lg';
  orientation?: 'horizontal' | 'vertical';
}

export interface SwitchField extends BaseFormField {
  type: 'switch';
  label?: string;
  description?: string;
  size?: 'sm' | 'md' | 'lg';
  labelPosition?: 'left' | 'right';
}

// =============================================================================
// Custom selector fields
// =============================================================================

export interface AppraisalSelectorField extends BaseFormField {
  type: 'appraisal-selector';
  label: string;
  placeholder?: string;
  /** Form path for appraisal ID (required) */
  idField: string;
  /** Form path for appraisal value (optional) */
  valueField?: string;
  /** Form path for appraisal date (optional) */
  dateField?: string;
}

export interface LocationSelectorField extends BaseFormField {
  type: 'location-selector';
  label: string;
  placeholder?: string;
  /** Form path for district code */
  districtField: string;
  /** Form path for district name (optional) */
  districtNameField?: string;
  /** Form path for province code */
  provinceField: string;
  /** Form path for province name (optional) */
  provinceNameField?: string;
  /** Form path for postcode */
  postcodeField: string;
  /** Form path for sub-district name (optional) */
  subDistrictNameField?: string;
}
