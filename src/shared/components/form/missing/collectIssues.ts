import type { RefinementCtx, ZodIssue, ZodTypeAny } from 'zod';
import type { FormField } from '../types';

/** A refinement run on its own, the way the schema runs it in a superRefine. */
export type RefineRule = (values: Record<string, unknown>, ctx: RefinementCtx) => void;

/**
 * Every issue the form has: the schema's, plus the `rules` its superRefines would hide. Zod skips
 * a superRefine while any base issue exists, so a conditional "required when X" field would only
 * appear once the plain required fields are filled; running those rules on their own counts it early.
 * The same issue can come out twice (the schema also runs the rule): callers dedupe by path.
 */
export function collectSchemaIssues(
  schema: ZodTypeAny,
  values: unknown,
  rules: (RefineRule | null | undefined)[] = [],
): ZodIssue[] {
  const parsed = schema.safeParse(values);
  const issues: ZodIssue[] = parsed.success ? [] : [...parsed.error.issues];
  const ctx = {
    addIssue: (issue: unknown) => issues.push(issue as ZodIssue),
  } as unknown as RefinementCtx;
  for (const rule of rules) rule?.(values as Record<string, unknown>, ctx);
  return issues;
}

/**
 * Label of every field config by form path, row indexes left out (an array's fields sit under
 * `<array>.<field>`). Only plain string labels count.
 */
export function collectFieldLabels(
  fields: FormField[],
  into: Map<string, string> = new Map(),
  prefix = '',
): Map<string, string> {
  for (const field of fields) {
    const name = `${prefix}${field.name}`;
    if ('label' in field && typeof field.label === 'string') into.set(name, field.label);
    if (field.type === 'field-array') collectFieldLabels(field.fields, into, `${name}.`);
  }
  return into;
}
