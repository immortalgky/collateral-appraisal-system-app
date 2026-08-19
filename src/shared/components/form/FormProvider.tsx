import { type ReactNode, useState, useEffect } from 'react';
import {
  type FieldValues,
  FormProvider as RHFFormProvider,
  type UseFormReturn,
} from 'react-hook-form';
import type { z } from 'zod';
import { FormSchemaContext, FormReadOnlyContext } from './context';
import { flattenFormErrors, useScrollToFirstError } from './utils';
import FormErrorAlert from './FormErrorAlert';
import { usePageReadOnly } from '@shared/contexts/PageReadOnlyContext';

interface FormProviderProps<TFieldValues extends FieldValues> {
  /** Form methods from useForm() */
  methods: UseFormReturn<TFieldValues>;
  /** Zod schema for validation - same one passed to zodResolver() */
  schema: z.ZodType<TFieldValues>;
  children: ReactNode;
  /** Show error alert when validation fails (default: true) */
  showErrorAlert?: boolean;
}

/**
 * Enhanced FormProvider that also provides Zod schema via context.
 *
 * This allows FormFields and other components to automatically extract
 * validation constraints (maxLength, minLength, required, etc.) from the schema.
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
  showErrorAlert = true,
}: FormProviderProps<TFieldValues>) {
  const readOnly = usePageReadOnly();
  const { errors, isSubmitted, submitCount } = methods.formState;
  const [isDismissed, setIsDismissed] = useState(false);
  const formErrors =
    showErrorAlert && isSubmitted && !isDismissed ? flattenFormErrors(errors) : [];

  // Reset dismissed state when user submits again
  useEffect(() => {
    setIsDismissed(false);
  }, [submitCount]);

  // Independent of showErrorAlert: forms that hide the banner should still scroll.
  useScrollToFirstError(methods);

  return (
    <FormSchemaContext.Provider value={schema}>
      <FormReadOnlyContext.Provider value={readOnly}>
        <RHFFormProvider {...methods}>
          <FormErrorAlert errors={formErrors} onDismiss={() => setIsDismissed(true)} />
          {children}
        </RHFFormProvider>
      </FormReadOnlyContext.Provider>
    </FormSchemaContext.Provider>
  );
}
