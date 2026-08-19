import { type ReactNode, useState, useEffect } from 'react';
import { FormProvider as RHFFormProvider, useForm, type UseFormProps, type UseFormReturn } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import type { z } from 'zod';
import { FormSchemaContext } from './context';
import { flattenFormErrors, useScrollToFirstError } from './utils';
import FormErrorAlert from './FormErrorAlert';

interface FormProps<TSchema extends z.ZodType<any, any, any>> {
  /** Zod schema - automatically sets up zodResolver */
  schema: TSchema;
  /** Default values for the form */
  defaultValues?: UseFormProps<z.infer<TSchema>>['defaultValues'];
  /** Additional useForm options */
  formOptions?: Omit<UseFormProps<z.infer<TSchema>>, 'resolver' | 'defaultValues'>;
  /** Form submit handler */
  onSubmit?: (data: z.infer<TSchema>) => void | Promise<void>;
  /** Render function that receives form methods */
  children: (methods: UseFormReturn<z.infer<TSchema>>) => ReactNode;
  /** Optional className for the form element */
  className?: string;
  /** Show error alert above form when validation fails (default: true) */
  showErrorAlert?: boolean;
}

/**
 * All-in-one form component with schema-based validation.
 *
 * Automatically sets up:
 * - useForm with zodResolver
 * - FormProvider context (so FormFields can extract constraints)
 * - Form element with onSubmit
 *
 * @example
 * ```tsx
 * const CustomerSchema = z.object({
 *   name: z.string().min(2).max(100),
 *   email: z.string().email(),
 * });
 *
 * <Form
 *   schema={CustomerSchema}
 *   defaultValues={{ name: '', email: '' }}
 *   onSubmit={(data) => console.log(data)}
 * >
 *   {(methods) => (
 *     <>
 *       <FormFields fields={fields} showCharCount />
 *       <button type="submit">Submit</button>
 *     </>
 *   )}
 * </Form>
 * ```
 */
export function Form<TSchema extends z.ZodType<any, any, any>>({
  schema,
  defaultValues,
  formOptions,
  onSubmit,
  children,
  className,
  showErrorAlert = true,
}: FormProps<TSchema>) {
  const methods = useForm<z.infer<TSchema>>({
    ...formOptions,
    defaultValues,
    resolver: zodResolver(schema),
  });

  const handleSubmit = onSubmit ? methods.handleSubmit(onSubmit) : undefined;

  const { errors, isSubmitted, submitCount } = methods.formState;
  const [isDismissed, setIsDismissed] = useState(false);
  const formErrors = showErrorAlert && isSubmitted && !isDismissed ? flattenFormErrors(errors) : [];

  // Reset dismissed state when user submits again
  useEffect(() => {
    setIsDismissed(false);
  }, [submitCount]);

  // Independent of showErrorAlert: forms that hide the banner should still scroll.
  useScrollToFirstError(methods);

  return (
    <FormSchemaContext.Provider value={schema}>
      <RHFFormProvider {...methods}>
        <form onSubmit={handleSubmit} className={className}>
          <FormErrorAlert errors={formErrors} onDismiss={() => setIsDismissed(true)} />
          {children(methods)}
        </form>
      </RHFFormProvider>
    </FormSchemaContext.Provider>
  );
}
