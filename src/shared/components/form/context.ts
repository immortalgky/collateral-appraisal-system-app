import { createContext, useContext } from 'react';
import type { ZodTypeAny } from 'zod';

/**
 * Context for providing Zod schema to form components.
 * Used by FormFields to automatically extract validation constraints.
 */
export const FormSchemaContext = createContext<ZodTypeAny | null>(null);

/**
 * Context for providing readOnly state to form components.
 * When true, all form inputs should be disabled.
 */
export const FormReadOnlyContext = createContext<boolean>(false);

/**
 * Hook to access the Zod schema from FormProvider context.
 *
 * @example
 * ```tsx
 * const schema = useFormSchema();
 * if (schema) {
 *   const constraints = getFieldConstraints(schema, 'fieldName');
 * }
 * ```
 */
export function useFormSchema<T extends ZodTypeAny = ZodTypeAny>(): T | null {
  return useContext(FormSchemaContext) as T | null;
}

/**
 * Hook to check if the form is in readOnly mode.
 *
 * @example
 * ```tsx
 * const isReadOnly = useFormReadOnly();
 * return <input disabled={isReadOnly} />;
 * ```
 */
export function useFormReadOnly(): boolean {
  return useContext(FormReadOnlyContext);
}
