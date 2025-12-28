import type { ListBoxItem } from '../inputs/Dropdown';
import type { FormStringToggleOption } from '../inputs/FormStringToggle';
import type { RadioOption } from '../inputs/RadioGroup';
import type { AtLeastOne } from '@/shared/types';
import type { ParameterParams } from '@/shared/types/api';

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
  | RadioGroupField
  | SwitchField;

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
}

export interface StringToggleField extends BaseFormField {
  type: 'string-toggle';
  label: string;
  options: [FormStringToggleOption, FormStringToggleOption];
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
