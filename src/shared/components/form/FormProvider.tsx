import { type ReactNode, useState, useEffect } from 'react';
import {
  type FieldValues,
  FormProvider as RHFFormProvider,
  type UseFormReturn,
} from 'react-hook-form';
import type { z } from 'zod';
import { FormSchemaContext, FormReadOnlyContext } from './context';
import { flattenFormErrors } from './utils';
import Alert from '../Alert';

interface FormProviderProps<TFieldValues extends FieldValues> {
  /** Form methods from useForm() */
  methods: UseFormReturn<TFieldValues>;
  /** Zod schema for validation - same one passed to zodResolver() */
  schema: z.ZodType<TFieldValues>;
  children: ReactNode;
  /** Show error alert when validation fails (default: true) */
  showErrorAlert?: boolean;
  /** When true, all form inputs will be disabled (default: false) */
  readOnly?: boolean;
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
  readOnly = false,
}: FormProviderProps<TFieldValues>) {
  const { errors, isSubmitted, submitCount } = methods.formState;
  const [isDismissed, setIsDismissed] = useState(false);
  const errorMessages = showErrorAlert && isSubmitted && !isDismissed ? flattenFormErrors(errors) : [];

  // Reset dismissed state when user submits again
  useEffect(() => {
    setIsDismissed(false);
  }, [submitCount]);

  return (
    <FormSchemaContext.Provider value={schema}>
      <FormReadOnlyContext.Provider value={readOnly}>
        <RHFFormProvider {...methods}>
          {errorMessages.length > 0 && (
            <Alert
              variant="danger"
              title={`Please fix the following errors (${errorMessages.length}):`}
              className="mb-4"
              dismissible
              onDismiss={() => setIsDismissed(true)}
            >
              <ul className="list-disc list-inside space-y-0.5 max-h-24 overflow-y-auto text-xs">
                {errorMessages.map((message, index) => (
                  <li key={index}>{message}</li>
                ))}
              </ul>
            </Alert>
          )}
          {children}
        </RHFFormProvider>
      </FormReadOnlyContext.Provider>
    </FormSchemaContext.Provider>
  );
}
