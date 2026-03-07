import type { ConditionInput, FieldCondition, FieldConditions } from './types';

// =============================================================================
// Condition Evaluation Utilities
// =============================================================================

/**
 * Simple utility to get a nested value from an object using dot notation.
 * Supports array indices in bracket notation (e.g., "items.0.name" or "items[0].name").
 */
export function getNestedValue(obj: Record<string, unknown>, path: string): unknown {
  // Normalize bracket notation to dot notation: "items[0].name" -> "items.0.name"
  const normalizedPath = path.replace(/\[(\d+)\]/g, '.$1');
  const keys = normalizedPath.split('.');

  let current: unknown = obj;
  for (const key of keys) {
    if (current == null || typeof current !== 'object') {
      return undefined;
    }
    current = (current as Record<string, unknown>)[key];
  }
  return current;
}

/**
 * Resolves a condition field path, handling array field context.
 * - $root.fieldName → absolute path (fieldName)
 * - fieldName → relative path (namePrefix[index].fieldName)
 */
export function resolveFieldPath(
  conditionField: string,
  namePrefix: string,
  index?: number,
): string {
  // Absolute path - strip $root. prefix
  if (conditionField.startsWith('$root.')) {
    return conditionField.slice(6);
  }

  // Relative path - build full path with index and prefix
  if (index !== undefined && namePrefix) {
    return `${namePrefix}.${index}.${conditionField}`;
  }
  if (namePrefix) {
    return `${namePrefix}.${conditionField}`;
  }
  return conditionField;
}

/** Type guard for FieldConditions (multiple conditions) */
export function isFieldConditions(obj: unknown): obj is FieldConditions {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    'conditions' in obj &&
    Array.isArray((obj as FieldConditions).conditions)
  );
}

/**
 * Extracts dependency field names from a condition input.
 * Returns empty array for function conditions (rare/unsupported for targeted watch).
 */
export function extractConditionFields(
  input: ConditionInput | undefined,
  namePrefix: string,
  index?: number,
): string[] {
  if (!input) return [];
  if (typeof input === 'function') return [];
  if (isFieldConditions(input)) {
    return input.conditions.map(c => resolveFieldPath(c.field, namePrefix, index));
  }
  return [resolveFieldPath(input.field, namePrefix, index)];
}

/**
 * Sets a nested value in an object using dot-notation path.
 * Inverse of getNestedValue — creates intermediate objects/arrays as needed.
 */
export function setNestedValue(obj: Record<string, unknown>, path: string, value: unknown): void {
  const normalizedPath = path.replace(/\[(\d+)\]/g, '.$1');
  const keys = normalizedPath.split('.');
  let current: any = obj;
  for (let i = 0; i < keys.length - 1; i++) {
    const key = keys[i];
    if (current[key] == null || typeof current[key] !== 'object') {
      current[key] = /^\d+$/.test(keys[i + 1]) ? [] : {};
    }
    current = current[key];
  }
  current[keys[keys.length - 1]] = value;
}

/**
 * Evaluates a single condition against form values.
 */
export function evaluateCondition(
  condition: FieldCondition,
  values: Record<string, unknown>,
  namePrefix: string,
  index?: number,
): boolean {
  const resolvedField = resolveFieldPath(condition.field, namePrefix, index);
  const value = getNestedValue(values, resolvedField);
  const target = condition.is;
  const operator = condition.operator ?? 'equals';

  switch (operator) {
    case 'equals':
      return value === target;
    case 'notEquals':
      return value !== target;
    case 'contains':
      return Array.isArray(value) && value.includes(target);
    case 'notContains':
      return Array.isArray(value) && !value.includes(target);
    case 'in':
      return Array.isArray(target) && target.includes(value);
    case 'notIn':
      return Array.isArray(target) && !target.includes(value);
    case 'isEmpty':
      return value == null || value === '';
    case 'isNotEmpty':
      return value != null && value !== '';
    case 'gt':
      return typeof value === 'number' && typeof target === 'number' && value > target;
    case 'gte':
      return typeof value === 'number' && typeof target === 'number' && value >= target;
    case 'lt':
      return typeof value === 'number' && typeof target === 'number' && value < target;
    case 'lte':
      return typeof value === 'number' && typeof target === 'number' && value <= target;
    default:
      return true;
  }
}

/**
 * Evaluates condition input (single, multiple, or function).
 */
export function evaluateConditions(
  input: ConditionInput,
  values: Record<string, unknown>,
  namePrefix: string,
  index?: number,
): boolean {
  // Functional condition
  if (typeof input === 'function') {
    return input(values);
  }

  // Multiple conditions with match logic
  if (isFieldConditions(input)) {
    const { conditions, match = 'all' } = input;
    if (match === 'any') {
      return conditions.some(c => evaluateCondition(c, values, namePrefix, index));
    }
    return conditions.every(c => evaluateCondition(c, values, namePrefix, index));
  }

  // Single condition
  return evaluateCondition(input, values, namePrefix, index);
}
