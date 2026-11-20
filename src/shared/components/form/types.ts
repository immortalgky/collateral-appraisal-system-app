import type { ReactNode } from 'react';
import type { ListBoxItem, OptionFilter } from '../inputs/Dropdown';
import type { FormStringToggleOption } from '../inputs/FormStringToggle';
import type { RadioOption } from '../inputs/RadioGroup';
import type { CheckboxOption } from '../inputs/CheckboxGroup';
import type { AddressSource, AtLeastOne } from '@/shared/types';

// =============================================================================
// Conditional Field Types
// =============================================================================

/** Comparison operators for declarative field conditions */
export type ConditionOperator =
  | 'equals' // value === target (default)
  | 'notEquals' // value !== target
  | 'contains' // value (array) includes target (scalar)
  | 'notContains' // value (array) doesn't include target (scalar)
  | 'in' // value (scalar) is one of target (array)
  | 'notIn' // value (scalar) is not in target (array)
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

/**
 * A function condition. Give it `deps` — the form paths it reads — so the field re-evaluates as
 * they change; without it the function only runs at validation time, never live on screen.
 */
export type ConditionFn = ((values: Record<string, unknown>) => boolean) & { deps?: string[] };

/** Condition input: single, multiple with logic, or function */
export type ConditionInput = FieldCondition | FieldConditions | ConditionFn;

// =============================================================================
// Field Help Types
// =============================================================================

/** One rule shown in a field's help panel, evaluated live against the form values */
export interface FieldHelpCondition {
  /** Plain-language statement of the rule */
  text: string;
  /** When this holds, the rule is marked as currently in effect */
  when: ConditionInput;
}

/**
 * Explanation attached to a field and surfaced by the "?" button beside its label.
 *
 * Declare `conditions` with the same shape as `disableWhen`/`requiredWhen` and point them at the
 * same values, so the explanation cannot drift from the rule it describes.
 */
export interface FieldHelpConfig {
  /** Heading of the help panel — what this field is */
  title: string;
  /** Paragraphs explaining where the value comes from */
  lines?: string[];
  /** Rules to list, each marked met or not met against the current values */
  conditions?: FieldHelpCondition[];
  /** Shown when at least one condition is met (e.g. why the field is locked right now) */
  whenMet?: string;
  /** Shown when no condition is met */
  whenClear?: string;
}

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
  | LocationSelectorField
  | FieldArrayField
  | ParameterSearchField;

/** How a chip in `booleanChips()` reads and writes its field (see `FormField.chip`). */
export interface ChipSpec {
  isOn: (value: unknown) => boolean;
  on: unknown;
  off: unknown;
  labelKey?: string;
}

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
  /** A chip group only: keep the span in `wrapperClassName` in Standard instead of taking the whole row. */
  keepSpan?: boolean;
  /** Standard, narrow shell (below 56rem, where spans 3 and 4 fall back to 6): take this many columns instead. 12 puts the field on a row of its own, so a companion after it keeps its 6 under it; 3 or 4 keep a field at its wide span. */
  narrowSpan?: 3 | 4 | 6 | 12;
  /** Disable the input */
  disabled?: boolean;
  /** Value to set when field is disabled */
  disabledValue?: unknown;
  /** Reset the field when it becomes editable again, clearing `disabledValue` (default: true) */
  clearOnEnable?: boolean;
  /** Value to reset to when the field becomes editable again (default: null) */
  enabledValue?: unknown;
  /**
   * A chip in `booleanChips()` over a field that is not a boolean (for instance a text that is
   * "on" once it is not null): when it reads as picked, what a pick and a drop write, and the
   * `fieldLabels` key of its caption (default: the field's own name).
   */
  chip?: ChipSpec;
  /** Mark as required (shows asterisk, overrides schema) */
  required?: boolean;
  /** Unconditionally hide the field (excluded from rendering and schema) */
  hide?: boolean;

  // Conditional visibility
  /** Show field when condition is met */
  showWhen?: ConditionInput;
  /** Hide field when condition is met */
  hideWhen?: ConditionInput;
  /** Clear field value when hidden by showWhen/hideWhen (default: true) */
  clearOnHide?: boolean;
  /** Value to set when field is cleared on hide (default: null) */
  hiddenValue?: unknown;
  /**
   * Fill this field when the appraiser picks a value of another one: `cases` is checked against the
   * new value of `field`, and the first `is` that matches sets this field to its `value`, over
   * whatever it holds. Only a change made by the user counts: opening a record or a reset never
   * fires it, so saved data is not touched. A value no case names does nothing, and the field
   * stays editable afterwards.
   */
  defaultWhen?: { field: string; cases: { is: unknown; value: unknown }[] };

  // Conditional disabled state
  /** Disable field when condition is met */
  disableWhen?: ConditionInput;
  /** Enable field when condition is met (overrides disabled) */
  enableWhen?: ConditionInput;

  // Conditional required state
  /** Make field required when condition is met (shows asterisk and validates) */
  requiredWhen?: ConditionInput;

  // Help
  /** Explanation surfaced by a "?" button beside the label (see FieldHelp) */
  help?: FieldHelpConfig;
  /** One helper line under the control (`mt-1 text-xs`). Translated via `fieldHints.<scope>.<name>` (FieldLabels). */
  hint?: string;
  /** Helper line shown instead of `hint` while the field's own `disableWhen` holds: why it is locked. */
  disabledHint?: string;

  // Format & input helpers
  /** Placeholder text (e.g., "DD/MM/YYYY") */
  placeholder?: string;

  /** Regex string for format validation. Used by schema builder for z.string().regex() */
  formatPattern?: string;

  /** Error message when formatPattern fails: a `vmsg()` token, not an English sentence (default: `invalidFormat`). */
  formatPatternMessage?: string;

  /** Input mask pattern (e.g., "99/99/9999" where 9=digit, a=letter, *=any).
   *  Requires react-imask integration in input components. */
  inputMask?: string;
}

/**
 * A row of yes/no toggles that flow at their own width, with the fields they open as plain rows
 * under it. They are drawn only while one of `follow` shows; in Compact the fields are the
 * plain label/value pairs, in order. Build one with `flowGroup()`; it is a layout for a form's
 * field list, not a field of the schema.
 */
export interface FlowGroup {
  type: 'flow';
  /** The toggles (and any small inline field, e.g. a distance) of the row, in order. */
  row: FormField[];
  /** What the row opens: its fields, drawn together under it. */
  follow: FormField[];
  /** Standard only: a width class per field name of the row (a number input beside a toggle). */
  rowWidths?: Record<string, string>;
}

/** Builds a flow group (see {@link FlowGroup}). */
export const flowGroup = (
  row: FormField[],
  follow: FormField[],
  rowWidths?: Record<string, string>,
): FlowGroup => ({ type: 'flow', row, follow, rowWidths });

/** What `FormFields` takes: fields, and flow groups and boolean chips among them. */
export type FormFieldItem = FormField | FlowGroup | BooleanChips;

/**
 * One multi-select chip group that stands for several yes/no fields: a chip per boolean, selected
 * while it is true. Picking a chip sets its boolean true, dropping it sets it false; a stored null
 * shows as unselected and is not written. The booleans keep their own names, so the data and the
 * API are what they were, and what a boolean opens (`showWhen`) is listed as ordinary fields.
 * `name` only names the group (its label key, `data-field`): it is not a field of the schema.
 * Build one with `booleanChips()`.
 */
export interface BooleanChips {
  type: 'boolean-chips';
  name: string;
  label: string;
  /** The booleans, in chip order; each `label` is its chip's caption. */
  items: FormField[];
}

/** Builds a boolean chip group (see {@link BooleanChips}). */
export const booleanChips = (name: string, label: string, items: FormField[]): BooleanChips => ({
  type: 'boolean-chips',
  name,
  label,
  items,
});

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
  /** Icon rendered inside the input on the left */
  leftIcon?: ReactNode;
  /** Icon rendered inside the input on the right (e.g. an action button) */
  rightIcon?: ReactNode;
}

export interface TextareaField extends BaseFormField {
  type: 'textarea';
  label: string;
  /** Override maxLength from schema */
  maxLength?: number;
  /** Show character count */
  showCharCount?: boolean;
  /** Visible rows; the default is 5 for a maxLength of 1,000 or more. */
  rows?: number;
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
  /** Max digits before the decimal point, excluding commas (e.g., 15 for DECIMAL(17,2)) */
  maxIntegerDigits?: number;
  /** Show thousand separators (default: true) */
  thousandSeparator?: boolean;
  /** When true, 0 is treated as a valid value instead of "empty" (default: false) */
  allowZero?: boolean;
  /** Non-interactive unit shown inside the input on the right. A key of `common:units.*` ('m', 'sqm', 'baht', …) is translated; any other text is shown as given. Visual-only — does not affect the value. */
  suffix?: string;
  /** Icon rendered inside the input on the left */
  leftIcon?: ReactNode;
  /** Icon rendered inside the input on the right (e.g. an action button) */
  rightIcon?: ReactNode;
  /** Note shown under the input */
  helperText?: ReactNode;
}

// =============================================================================
// Date/Time fields
// =============================================================================

export interface DateInputField extends BaseFormField {
  type: 'date-input';
  label: string;
  /** Disable dates before today */
  disablePastDates?: boolean;
  /** Disable dates after today */
  disableFutureDates?: boolean;
  /** Disable today specifically */
  disableToday?: boolean;
  /** Disable dates strictly before this date (minDate itself is selectable) */
  minDate?: Date | string | null;
  /** Disable dates more than N days before today */
  disableDaysBefore?: number;
  /** Disable dates more than N days after today */
  disableDaysAfter?: number;
}

export interface DateTimeInputField extends BaseFormField {
  type: 'datetime-input';
  label: string;
  /** Disable dates before today */
  disablePastDates?: boolean;
  /** Disable dates after today */
  disableFutureDates?: boolean;
  /** Disable today specifically */
  disableToday?: boolean;
  /** Disable dates strictly before this date (minDate itself is selectable) */
  minDate?: Date | string | null;
  /** Disable dates more than N days before today */
  disableDaysBefore?: number;
  /** Disable dates more than N days after today */
  disableDaysAfter?: number;
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
  AtLeastOne<{ group: string; options: ListBoxItem[] }>;

interface BaseDropdownField extends BaseFormField {
  type: 'dropdown';
  label: string;
  filterOptions?: OptionFilter | OptionFilter[];
  /** Passed through to Dropdown; false hides the "code - " prefix on each option. */
  showValuePrefix?: boolean;
}

// =============================================================================
// Toggle fields
// =============================================================================

export type BooleanToggleField = BaseBooleanToggleField &
  AtLeastOne<{ group: string; options: [string, string] }>;

interface BaseBooleanToggleField extends BaseFormField {
  type: 'boolean-toggle';
  label: string;
  /** Size variant */
  size?: 'sm' | 'md';
  /** Optional answer: neither option is chosen until picked, and a click on the chosen one clears it (null). */
  nullable?: boolean;
}

export type StringToggleField = BaseStringToggleField &
  AtLeastOne<{ group: string; options: [FormStringToggleOption, FormStringToggleOption] }>;

interface BaseStringToggleField extends BaseFormField {
  type: 'string-toggle';
  label: string;
  /** Size variant */
  size?: 'sm' | 'md';
  /** An unset answer (null, an unknown code, options not loaded yet) shows as unset, and a click writes nothing until the options are known. */
  showUnset?: boolean;
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

export type CheckboxGroupField = BaseCheckboxGroupField &
  AtLeastOne<{ group: string; options: CheckboxOption[] }>;

interface BaseCheckboxGroupField extends BaseFormField {
  type: 'checkbox-group';
  label?: string;
  wrap?: boolean;
  size?: 'sm' | 'md';
  orientation?: 'horizontal' | 'vertical';
  /** Visual variant: 'tag' (default), 'chip', or 'button' */
  variant?: 'tag' | 'chip' | 'button';
  /** Option values that stand alone: picking one clears the rest, picking any other clears it. */
  exclusiveValues?: string[];
}

export type RadioGroupField = BaseRadioGroupField &
  AtLeastOne<{ group: string; options: RadioOption[] }>;

interface BaseRadioGroupField extends BaseFormField {
  type: 'radio-group';
  label?: string;
  size?: 'sm' | 'md' | 'lg';
  orientation?: 'horizontal' | 'vertical';
  /** Visual variant: 'default' (radio circles), 'card', or 'button' (pill style) */
  variant?: 'default' | 'card' | 'button';
  /** Leave retired parameter options out; the saved value's own option stays. */
  activeOnly?: boolean;
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
  /** Which address dataset to search: 'title' | 'dopa'. Defaults to searching both. */
  addressSource?: AddressSource;
  /**
   * Resolve an already-stored code against both address masters while the picker still offers only
   * `addressSource`. For a form whose source changed after rows were saved — see LocationSelector.
   */
  resolveFromAnySource?: boolean;
}

// =============================================================================
// Array fields (schema-only — rendering handled by useFieldArray + namePrefix)
// =============================================================================

export interface FieldArrayField extends BaseFormField {
  type: 'field-array';
  /** Display label used in validation error messages */
  label?: string;
  /** Child fields defining the shape of each array element */
  fields: FormField[];
  /** Minimum number of items (maps to z.array().min()) */
  minItems?: number;
  /** Maximum number of items (maps to z.array().max()) */
  maxItems?: number;
  /**
   * Rows this says are untouched are not validated and do not count toward `minItems`: a table that
   * starts with one empty row would otherwise fail on a row that is never sent. The errors of the
   * other rows keep their own positions (a skipped row in between does not shift them).
   */
  skipRow?: (row: unknown) => boolean;
}

// =============================================================================
// Parameter Search Field
// =============================================================================
export interface ParameterSearchField extends BaseFormField {
  type: 'parameter-search';
  label: string;
  /** Parameter group to search from (e.g., 'LandOffice'). Optional when `options` is supplied. */
  group?: string;
  /** Explicit options — used instead of the parameter group (e.g. dedicated lookup like dealers). */
  options?: ListBoxItem[];
}
