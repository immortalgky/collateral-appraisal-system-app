import type { z } from 'zod';

/**
 * A zod object that validates a form whose values are the full interface T. The WQS/SAG/DC form
 * schemas only check the fields that carry a message and pass the rest through, so their inferred
 * type is a thin subset of what the form holds; they are cast to this to type the resolver.
 */
export type FormValidator<T> = z.ZodObject<z.ZodRawShape, 'passthrough', z.ZodTypeAny, T, T>;
