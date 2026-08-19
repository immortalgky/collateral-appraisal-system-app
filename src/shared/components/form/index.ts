/**
 * Form System
 *
 * A schema-first form system built on react-hook-form and Zod.
 * Automatically extracts validation constraints from Zod schemas
 * and applies them to form inputs.
 *
 * @example
 * ```tsx
 * import { Form, FormFields, FormProvider, useFormSchema } from '@/shared/components/form';
 *
 * // Option 1: All-in-one Form component
 * <Form schema={MySchema} onSubmit={handleSubmit}>
 *   {(methods) => <FormFields fields={fields} showCharCount />}
 * </Form>
 *
 * // Option 2: Wrap existing useForm with FormProvider
 * const methods = useForm({ resolver: zodResolver(MySchema) });
 * <FormProvider methods={methods} schema={MySchema}>
 *   <FormFields fields={fields} />
 * </FormProvider>
 * ```
 */

// Components
export { Form } from './Form';
export { FormProvider } from './FormProvider';
export { FormFields } from './FormFields';
export { FormErrorAlert } from './FormErrorAlert';

// Context & Hooks
export { FormSchemaContext, useFormSchema, FormReadOnlyContext, useFormReadOnly } from './context';

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
} from './types';

// Utilities
export {
  extractFieldConstraints,
  getFieldConstraints,
  constraintsToInputProps,
  getAllFieldConstraints,
  type FieldConstraints,
} from './utils';

// Scroll-to-error. Fields are addressed by the `data-field` attribute that FormFields, FormSection
// and the array tables put on each field/container wrapper. Forms that do not use the shared
// FormProvider can still opt in by calling useScrollToFirstError(methods) themselves.
export {
  flattenFormErrors,
  scrollToField,
  useScrollToFirstError,
  type FlatFormError,
} from './utils';

// Schema Builder
export {
  mergeSchemas,
  buildFormSchema,
  type MergeSchemaOptions,
} from './schemaBuilder';

// Condition Evaluation (shared between UI and schema builder)
export { evaluateCondition, evaluateConditions } from './conditions';
