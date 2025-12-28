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

  // Note: We intentionally do NOT pass `required` to HTML elements
  // to allow React Hook Form to handle validation instead of browser native validation.
  // The red asterisk (*) is shown via the `required` prop in the label, not the HTML attribute.

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
 * Recursively flatten react-hook-form FieldErrors into an array of error messages.
 * Handles nested objects and array fields.
 *
 * @example
 * // Input: { name: { message: 'Required' }, address: { street: { message: 'Too short' } } }
 * // Output: ['Required', 'Too short']
 */
export function flattenFormErrors(errors: Record<string, any>): string[] {
  const messages: string[] = [];

  function traverse(obj: Record<string, any>) {
    for (const key of Object.keys(obj)) {
      const value = obj[key];

      if (!value) continue;

      // If this is an error object with a message property, extract it
      if (typeof value.message === 'string' && value.message) {
        messages.push(value.message);
      } else if (typeof value === 'object') {
        // Recurse into nested objects (nested fields or array items)
        traverse(value);
      }
    }
  }

  traverse(errors);
  return messages;
}
