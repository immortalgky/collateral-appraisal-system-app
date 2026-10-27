/**
 * Form System
 *
 * A schema-first form system built on react-hook-form and Zod.
 * Automatically extracts validation constraints from Zod schemas
 * and applies them to form inputs.
 *
 * @example
 * ```tsx
 * import { FormFields, FormProvider, useFormSchema } from '@/shared/components/form';
 *
 * // Wrap useForm with FormProvider
 * const methods = useForm({ resolver: zodResolver(MySchema) });
 * <FormProvider methods={methods} schema={MySchema}>
 *   <FormFields fields={fields} />
 * </FormProvider>
 * ```
 */

// Components
export { FormProvider } from './FormProvider';
export { FormFields } from './FormFields';
export { FormFieldShell } from './FormFieldShell';
export { FormReadValue } from './FormReadValue';

// Layout: `standard` | `compact`, from the nearest provider (standard by default)
export { FormLayoutProvider, UserFormLayoutProvider } from './FormLayoutProvider';
export { useFormLayout, type FormLayoutMode } from './formLayoutContext';

// Sections: FormSheet is the form's root, FormSection one titled block (DESIGN.md 17.6).
// FormSectionsProvider + useFormSections feed the shell's table of contents.
export { FormSheet, FormSection } from './FormSheet';
export { FormSubheading } from './FormSubheading';
export { FormSectionsProvider } from './FormSectionsProvider';
export {
  useFormSections,
  FormSectionStatusContext,
  type FormSectionEntry,
} from './formSheetContext';

// Editable / read-only tables (DESIGN.md 17.7)
export * from './table';

// Context & Hooks
export {
  FormSchemaContext,
  useFormSchema,
  FormReadOnlyContext,
  useFormReadOnly,
  FieldLabelContext,
} from './context';

// Types
export type {
  FormField,
  TextInputField,
  NumberInputField,
  DateInputField,
  DateTimeInputField,
  SelectInputField,
  DropdownField,
  BooleanToggleField,
  StringToggleField,
  TextareaField,
  CheckboxField,
  RadioGroupField,
  SwitchField,
  AppraisalSelectorField,
  LocationSelectorField,
  FieldArrayField,
  // Condition types
  ConditionOperator,
  FieldCondition,
  FieldConditions,
  ConditionInput,
  ConditionFn,
} from './types';

// Utilities
export {
  extractFieldConstraints,
  getFieldConstraints,
  constraintsToInputProps,
  getAllFieldConstraints,
  type FieldConstraints,
} from './utils';

// Scroll-to-field. Fields are addressed by the `data-field` attribute that FormFields, FormSection
// and the array tables put on each field/container wrapper.
export { flattenFormErrors, scrollToField, type FlatFormError } from './utils';

// Missing-fields chip (FormProvider runs it for every form; ActionBar.Right shows it)
export {
  MissingFieldsChip,
  useFormMissingFields,
  useRegisterMissingReveal,
  type MissingFieldsSummary,
} from './missing';

// Schema Builder
export { mergeSchemas, buildFormSchema, type MergeSchemaOptions } from './schemaBuilder';

// Validation messages: i18n tokens made in a schema, translated where a control shows them
export { vmsg } from './validationMessage';
export { ValidationText } from './ValidationText';

// Condition Evaluation (shared between UI and schema builder)
export { evaluateCondition, evaluateConditions } from './conditions';
