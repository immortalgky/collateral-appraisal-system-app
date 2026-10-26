import type { ReactNode } from 'react';
import {
  type FieldValues,
  FormProvider as RHFFormProvider,
  type UseFormReturn,
} from 'react-hook-form';
import type { z } from 'zod';
import { FormSchemaContext, FormReadOnlyContext } from './context';
import { FormMissingFields } from './missing/FormMissingFields';
import type { FormField } from './types';
import { usePageReadOnly } from '@shared/contexts/PageReadOnlyContext';

interface FormProviderProps<TFieldValues extends FieldValues> {
  /** Form methods from useForm() */
  methods: UseFormReturn<TFieldValues>;
  /** Zod schema for validation - same one passed to zodResolver() */
  schema: z.ZodType<TFieldValues>;
  children: ReactNode;
  /**
   * The field configs `schema` was built from. Lets the missing-fields chip count conditional
   * "required when X" fields before the plain required ones are filled, which zod would hide.
   */
  fields?: FormField[];
  /**
   * The chip lists only fields the page draws. For a schema that also flags fields the user cannot
   * fill in (the hidden half of an either/or pair, a value a picker sets).
   */
  renderedOnly?: boolean;
  /**
   * Set to false when the page runs its own missing-fields provider (Request), so the form is not
   * parsed twice. Default true.
   */
  missingSummary?: boolean;
}

/**
 * Enhanced FormProvider that also provides Zod schema via context.
 *
 * This allows FormFields and other components to automatically extract
 * validation constraints (maxLength, minLength, required, etc.) from the schema.
 *
 * It is also what feeds the missing-fields chip (DESIGN.md 17.8): the form is checked against
 * `schema` live, `ActionBar.Right` shows the chip, and a failed Save opens its popover. A form never
 * shows an error banner; field errors stay inline.
 *
 * @example
 * ```tsx
 * const CustomerSchema = z.object({
 *   name: z.string().min(2).max(100),
 *   email: z.string().email(),
 * });
 *
 * const methods = useForm({
 *   resolver: zodResolver(CustomerSchema),
 *   defaultValues: { name: '', email: '' },
 * });
 *
 * return (
 *   <FormProvider methods={methods} schema={CustomerSchema}>
 *     <form onSubmit={handleSubmit(onSubmit)}>
 *       <FormFields fields={fields} showCharCount />
 *     </form>
 *   </FormProvider>
 * );
 * ```
 */
export function FormProvider<TFieldValues extends FieldValues>({
  methods,
  schema,
  children,
  fields,
  renderedOnly,
  missingSummary = true,
}: FormProviderProps<TFieldValues>) {
  const readOnly = usePageReadOnly();

  return (
    <FormSchemaContext.Provider value={schema}>
      <FormReadOnlyContext.Provider value={readOnly}>
        <RHFFormProvider {...methods}>
          {missingSummary ? (
            <FormMissingFields schema={schema} fields={fields} renderedOnly={renderedOnly}>
              {children}
            </FormMissingFields>
          ) : (
            children
          )}
        </RHFFormProvider>
      </FormReadOnlyContext.Provider>
    </FormSchemaContext.Provider>
  );
}
