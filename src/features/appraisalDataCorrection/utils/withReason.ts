import { z } from 'zod';

/**
 * A property's schema plus the correction's reason, so the resolver, the required marks and the
 * missing-fields chip all apply the same rules and list the reason with the rest. Intersected
 * rather than extended because the property schemas may carry refinements. No transform on the
 * reason: a schema that passes unknown keys through would then see two different values for it.
 */
export function withReason(schema: z.ZodTypeAny, requiredMessage: string) {
  return z.intersection(
    schema,
    z.object({
      reason: z
        .string({ required_error: requiredMessage })
        .refine(value => value.trim().length > 0, requiredMessage),
    }),
  );
}
