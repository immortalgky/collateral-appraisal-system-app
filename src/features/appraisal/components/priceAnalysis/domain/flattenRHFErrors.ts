import type { FieldErrors, SubmitErrorHandler } from 'react-hook-form';

export function flattenRHFErrors(errs: FieldErrors, parent = ''): string[] {
  return Object.entries(errs).flatMap(([key, value]) => {
    if (!value) return [];
    const path = parent ? `${parent}.${key}` : key;

    // FieldError has "message"
    if (typeof value === 'object' && 'message' in value && value.message) {
      return [`${path}: ${String(value.message)}`];
    }

    // Nested errors (objects/arrays)
    if (typeof value === 'object') {
      return flattenRHFErrors(value as FieldErrors, path);
    }

    return [];
  });
}
