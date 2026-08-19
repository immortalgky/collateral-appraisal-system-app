import { useEffect } from 'react';
import type { FieldValues, UseFormReturn } from 'react-hook-form';
import type { z, ZodTypeAny } from 'zod';

/**
 * Validation constraints extracted from Zod schema
 */
export interface FieldConstraints {
  // String constraints
  minLength?: number;
  maxLength?: number;
  pattern?: RegExp;

  // Number constraints
  min?: number;
  max?: number;

  // Common constraints
  required?: boolean;

  // String format validations
  isEmail?: boolean;
  isUrl?: boolean;
  isUuid?: boolean;

  // Custom error messages
  requiredMessage?: string;
  minLengthMessage?: string;
  maxLengthMessage?: string;
  minMessage?: string;
  maxMessage?: string;
  patternMessage?: string;
}

/**
 * Extract validation constraints from a Zod schema field.
 * Works by inspecting the internal _def property of Zod types.
 */
export function extractFieldConstraints(schema: ZodTypeAny): FieldConstraints {
  const constraints: FieldConstraints = {};

  let currentSchema = schema;
  let isOptional = false;
  let isNullable = false;

  // Unwrap optional, nullable, and default wrappers
  while (currentSchema) {
    const typeName = currentSchema._def?.typeName;

    if (typeName === 'ZodOptional') {
      isOptional = true;
      currentSchema = currentSchema._def.innerType;
    } else if (typeName === 'ZodNullable') {
      isNullable = true;
      currentSchema = currentSchema._def.innerType;
    } else if (typeName === 'ZodDefault') {
      currentSchema = currentSchema._def.innerType;
    } else if (typeName === 'ZodEffects') {
      currentSchema = currentSchema._def.schema;
    } else {
      break;
    }
  }

  // Determine if required
  constraints.required = !isOptional && !isNullable;

  const typeName = currentSchema._def?.typeName;

  // Extract string constraints
  if (typeName === 'ZodString') {
    const checks = currentSchema._def.checks || [];

    for (const check of checks) {
      switch (check.kind) {
        case 'min':
          constraints.minLength = check.value;
          if (check.message) constraints.minLengthMessage = check.message;
          break;
        case 'max':
          constraints.maxLength = check.value;
          if (check.message) constraints.maxLengthMessage = check.message;
          break;
        case 'regex':
          constraints.pattern = check.regex;
          if (check.message) constraints.patternMessage = check.message;
          break;
        case 'email':
          constraints.isEmail = true;
          break;
        case 'url':
          constraints.isUrl = true;
          break;
        case 'uuid':
          constraints.isUuid = true;
          break;
      }
    }
  }

  // Extract number constraints
  if (typeName === 'ZodNumber') {
    const checks = currentSchema._def.checks || [];

    for (const check of checks) {
      switch (check.kind) {
        case 'min':
          constraints.min = check.value;
          if (check.message) constraints.minMessage = check.message;
          break;
        case 'max':
          constraints.max = check.value;
          if (check.message) constraints.maxMessage = check.message;
          break;
      }
    }
  }

  return constraints;
}

/**
 * Extract constraints for a specific field path from an object schema.
 * Supports nested paths like "address.street" or "items.0.name".
 */
export function getFieldConstraints(
  schema: z.ZodObject<any> | z.ZodEffects<any>,
  fieldPath: string
): FieldConstraints {
  const parts = fieldPath.split('.');
  let currentSchema: ZodTypeAny = schema;

  // Handle ZodEffects wrapper
  if (currentSchema._def?.typeName === 'ZodEffects') {
    currentSchema = currentSchema._def.schema;
  }

  for (const part of parts) {
    // Skip array indices
    if (!isNaN(Number(part))) {
      continue;
    }

    // Unwrap the schema to get to the object shape
    let unwrapped = currentSchema;
    while (unwrapped) {
      const typeName = unwrapped._def?.typeName;

      if (typeName === 'ZodObject') {
        const shape = unwrapped._def.shape();
        if (shape[part]) {
          currentSchema = shape[part];
          break;
        }
        return {}; // Field not found
      } else if (typeName === 'ZodArray') {
        currentSchema = unwrapped._def.type;
        unwrapped = currentSchema;
      } else if (typeName === 'ZodOptional' || typeName === 'ZodNullable' || typeName === 'ZodDefault') {
        unwrapped = unwrapped._def.innerType;
      } else if (typeName === 'ZodEffects') {
        unwrapped = unwrapped._def.schema;
      } else {
        return {}; // Can't navigate further
      }
    }
  }

  return extractFieldConstraints(currentSchema);
}

/**
 * Convert field constraints to HTML input attributes.
 */
export function constraintsToInputProps(constraints: FieldConstraints) {
  const props: Record<string, any> = {};

  // Note: We do NOT pass `required` to HTML elements (components destructure it out).
  // React Hook Form handles validation. This is used by components for the asterisk indicator.
  if (constraints.required !== undefined) {
    props.required = constraints.required;
  }

  if (constraints.minLength !== undefined) {
    props.minLength = constraints.minLength;
  }

  if (constraints.maxLength !== undefined) {
    props.maxLength = constraints.maxLength;
  }

  if (constraints.min !== undefined) {
    props.min = constraints.min;
  }

  if (constraints.max !== undefined) {
    props.max = constraints.max;
  }

  if (constraints.pattern) {
    props.pattern = constraints.pattern.source;
  }

  if (constraints.isEmail) {
    props.type = 'email';
  }

  if (constraints.isUrl) {
    props.type = 'url';
  }

  return props;
}

/**
 * Get all field constraints for an object schema.
 * Returns a map of field paths to constraints.
 */
export function getAllFieldConstraints(
  schema: z.ZodObject<any>,
  prefix = ''
): Record<string, FieldConstraints> {
  const result: Record<string, FieldConstraints> = {};

  let schemaToProcess = schema;

  // Unwrap ZodEffects if present
  if ((schemaToProcess as any)._def?.typeName === 'ZodEffects') {
    schemaToProcess = (schemaToProcess as any)._def.schema;
  }

  if ((schemaToProcess as any)._def?.typeName !== 'ZodObject') {
    return result;
  }

  const shape = (schemaToProcess as any)._def.shape();

  for (const [key, value] of Object.entries(shape)) {
    const fieldPath = prefix ? `${prefix}.${key}` : key;
    const fieldSchema = value as ZodTypeAny;

    // Extract constraints for this field
    const constraints = extractFieldConstraints(fieldSchema);
    if (Object.keys(constraints).length > 0) {
      result[fieldPath] = constraints;
    }

    // If it's an object, recurse
    let unwrapped = fieldSchema;
    while (unwrapped) {
      const typeName = unwrapped._def?.typeName;

      if (typeName === 'ZodObject') {
        const nestedConstraints = getAllFieldConstraints(unwrapped as z.ZodObject<any>, fieldPath);
        Object.assign(result, nestedConstraints);
        break;
      } else if (typeName === 'ZodOptional' || typeName === 'ZodNullable' || typeName === 'ZodDefault') {
        unwrapped = unwrapped._def.innerType;
      } else {
        break;
      }
    }
  }

  return result;
}

/**
 * Turn a react-hook-form field key into a human-readable label.
 * camelCase / sn_case / kebab-case → Title Case, e.g. `sellingAreaPercent` → `Selling Area Percent`.
 */
function humanizeFieldLabel(key: string): string {
  return key
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .replace(/^\w/, (c) => c.toUpperCase())
    .trim();
}

/** A single flattened validation error: where it lives, and what to show for it. */
export interface FlatFormError {
  /** Dotted react-hook-form path, e.g. `purpose`, `detail.loanDetail.bankingSegment`, `properties.0.buildingType`. */
  path: string;
  /** Display text, `"Label: message"` (or just the message when no label can be derived). */
  text: string;
}

/**
 * Recursively flatten react-hook-form FieldErrors into an array of errors carrying both the
 * humanized display text (so the banner names the offending field) and the dotted field path
 * (so the banner can scroll to it — see `scrollToField`).
 *
 * Handles nested objects and array fields (numeric array indices fall back to the array field name
 * as the label source, while still contributing to the path).
 *
 * @example
 * // Input: { name: { message: 'Required' }, address: { street: { message: 'Too short' } } }
 * // Output: [{ path: 'name', text: 'Name: Required' },
 * //          { path: 'address.street', text: 'Street: Too short' }]
 */
export function flattenFormErrors(errors: Record<string, any>): FlatFormError[] {
  const found: FlatFormError[] = [];

  function traverse(obj: Record<string, any>, parentKey?: string, parentPath = '') {
    for (const key of Object.keys(obj)) {
      const value = obj[key];

      if (!value) continue;

      // Numeric keys are array indices — carry the array field name down as the label source.
      const isIndex = /^\d+$/.test(key);
      // RHF parks array-level errors on a synthetic `root` key. It is not a real field: keep the
      // parent's name for the label and leave it out of the path so the array itself stays targetable.
      const isRoot = key === 'root';
      const labelKey = isIndex || isRoot ? parentKey : key;
      const path = isRoot ? parentPath : parentPath ? `${parentPath}.${key}` : key;

      // If this is an error object with a message property, extract it
      if (typeof value.message === 'string' && value.message) {
        const label = labelKey ? humanizeFieldLabel(labelKey) : '';
        found.push({ path, text: label ? `${label}: ${value.message}` : value.message });
      } else if (typeof value === 'object') {
        // Recurse into nested objects (nested fields or array items)
        traverse(value, labelKey, path);
      }
    }
  }

  traverse(errors);
  return found;
}

/**
 * Scroll the field at `path` into view and focus its control.
 *
 * Fields are addressed by the `data-field` attribute that `FormFields` and `FormTable` put on each
 * field wrapper. A `[name=...]` selector would not work: `Dropdown` never forwards `name` to the DOM.
 *
 * Falls back to a prefix match so array-level errors (`customers`, `titles`) land on the first cell
 * of the offending table, which no focus-based mechanism could ever reach.
 */
export function scrollToField(path: string): void {
  if (!path) return;

  const escaped = CSS.escape(path);
  const el =
    document.querySelector(`[data-field="${escaped}"]`) ??
    document.querySelector(`[data-field^="${escaped}."]`);

  if (!el) return;

  // Honour prefers-reduced-motion. A `behavior` passed here overrides the global
  // `scroll-behavior: smooth` in index.css, so the check has to happen in JS, not CSS.
  // scrollToField is a plain function, so matchMedia is read directly rather than through
  // the useMediaQuery hook that wraps it.
  const reducedMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;

  el.scrollIntoView({ behavior: reducedMotion ? 'auto' : 'smooth', block: 'center' });
  // preventScroll so focusing does not fight the smooth scroll already in flight.
  el.querySelector<HTMLElement>('input,select,textarea,button')?.focus({ preventScroll: true });
}

/**
 * After a failed submit, scroll to the first validation error.
 *
 * The app cannot rely on react-hook-form's `shouldFocusError` for this: it only reaches fields whose
 * ref landed on a focusable node, it handles a single field, and it can never reach array-level
 * errors, which have no input behind them at all.
 */
export function useScrollToFirstError<T extends FieldValues>(methods: UseFormReturn<T>): void {
  const { submitCount } = methods.formState;

  useEffect(() => {
    if (!submitCount) return;
    // Read errors here rather than depending on them: as a dep, every keystroke that clears an
    // error would re-fire the scroll.
    const [first] = flattenFormErrors(methods.formState.errors);
    if (!first) return;
    // Next frame: the error banner is inserted above the form on this same commit, and scrolling
    // before that reflow lands on a stale offset. Cancelled on unmount — a form that closes
    // between submit and the next frame would otherwise scroll to whatever `data-field` the
    // replacement screen happens to expose.
    const frame = requestAnimationFrame(() => scrollToField(first.path));
    return () => cancelAnimationFrame(frame);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [submitCount]);
}
