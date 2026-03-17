import { z } from 'zod';
import type { FormField, LocationSelectorField } from './types';
import { evaluateConditions, getNestedValue } from './conditions';

// =============================================================================
// Types
// =============================================================================

export interface MergeSchemaOptions {
  /** Which schema takes priority on overlapping fields. Default: 'field-wins' */
  priority?: 'field-wins' | 'base-wins';
}

type ShapeNode = z.ZodTypeAny | { [key: string]: ShapeNode };

// =============================================================================
// Internal: Field → Zod type mapping
// =============================================================================

/**
 * Returns true if the field has any conditional props that require
 * the schema field to be optional (enforced via superRefine instead).
 */
function hasConditions(field: FormField): boolean {
  return !!(
    field.requiredWhen ||
    field.showWhen ||
    field.hideWhen ||
    field.disableWhen ||
    field.enableWhen
  );
}

/**
 * Maps a single FormField config to its corresponding Zod type.
 * Static `required: true` (without conditions) keeps the field required.
 * Fields with conditions are made optional — enforced by superRefine.
 */
function buildZodTypeForField(field: FormField): z.ZodTypeAny {
  const conditional = hasConditions(field);
  const staticRequired = field.required === true && !conditional;
  const requiredMsg = `${getFieldLabel(field)} is required`;

  let schema: z.ZodTypeAny;

  switch (field.type) {
    case 'text-input': {
      let s = staticRequired ? z.string({ required_error: requiredMsg, invalid_type_error: requiredMsg }) : z.string();
      const textLabel = getFieldLabel(field);
      if (staticRequired && field.minLength == null) s = s.min(1, requiredMsg);
      if (field.minLength != null)
        s = s.min(field.minLength, `${textLabel} must be at least ${field.minLength} characters`);
      if (field.maxLength != null)
        s = s.max(field.maxLength, `${textLabel} must be at most ${field.maxLength} characters`);
      if (field.formatPattern) {
        s = s.regex(new RegExp(field.formatPattern), field.formatPatternMessage);
      }
      schema = s;
      break;
    }

    case 'textarea': {
      let s = staticRequired ? z.string({ required_error: requiredMsg, invalid_type_error: requiredMsg }) : z.string();
      const textareaLabel = getFieldLabel(field);
      if (staticRequired) s = s.min(1, requiredMsg);
      if (field.maxLength != null)
        s = s.max(
          field.maxLength,
          `${textareaLabel} must be at most ${field.maxLength} characters`,
        );
      if (field.formatPattern) {
        s = s.regex(new RegExp(field.formatPattern), field.formatPatternMessage);
      }
      schema = s;
      break;
    }

    case 'number-input': {
      let n = z.coerce.number();
      const numLabel = getFieldLabel(field);
      if (field.min != null) n = n.min(field.min, `${numLabel} must be at least ${field.min}`);
      if (field.max != null) n = n.max(field.max, `${numLabel} must be at most ${field.max}`);
      if (field.allowNegative === false) n = n.nonnegative();
      if (field.decimalPlaces != null && field.decimalPlaces >= 0) {
        n = n.multipleOf(Math.pow(10, -field.decimalPlaces));
      }
      if (field.maxIntegerDigits != null) {
        const maxInt = field.maxIntegerDigits;
        n = n.refine(val => Math.trunc(Math.abs(val)).toString().length <= maxInt, {
          message: `Must not exceed ${maxInt} digits before decimal point`,
        });
      }
      // Enforce "required" for number-inputs that don't define their own min:
      // treat 0 as an empty value while preserving existing min/max semantics.
      if (staticRequired && field.min == null) {
        n = n.refine(val => val !== 0, { message: requiredMsg });
      }
      schema = n;
      break;
    }

    case 'date-input':
    case 'datetime-input': {
      let s = staticRequired ? z.string({ required_error: requiredMsg, invalid_type_error: requiredMsg }) : z.string();
      if (staticRequired) s = s.min(1, requiredMsg);
      if (field.formatPattern) {
        s = s.regex(new RegExp(field.formatPattern), field.formatPatternMessage);
      }
      schema = s;
      break;
    }

    case 'boolean-toggle':
    case 'checkbox':
    case 'switch':
      schema = z.boolean();
      break;

    case 'string-toggle':
      schema = staticRequired
        ? z.string({ required_error: requiredMsg, invalid_type_error: requiredMsg }).min(1, requiredMsg)
        : z.string();
      break;

    case 'select-input':
    case 'dropdown':
    case 'radio-group':
      schema = staticRequired
        ? z
            .string({ required_error: requiredMsg, invalid_type_error: requiredMsg })
            .min(1, requiredMsg)
        : z.string();
      break;

    case 'checkbox-group': {
      const arr = z.array(z.string());
      schema = staticRequired ? arr.min(1, requiredMsg) : arr;
      break;
    }

    case 'appraisal-selector':
    case 'location-selector':
      schema = staticRequired
        ? z.string({ required_error: requiredMsg, invalid_type_error: requiredMsg }).min(1, requiredMsg)
        : z.string();
      break;

    case 'field-array': {
      // Recursively build element schema from child fields
      const elementShape = buildNestedShape(field.fields);

      // Attach element-level superRefine if any children have conditions
      const elementRefinement = buildConditionalRefinement(field.fields);
      let elementSchema: z.ZodTypeAny = elementRefinement
        ? z.object(elementShape).superRefine(elementRefinement)
        : z.object(elementShape);

      let arr = z.array(elementSchema);
      const arrLabel = getFieldLabel(field);
      if (staticRequired && field.minItems != null)
        arr = arr.min(field.minItems, `${arrLabel} must have at least ${field.minItems} item(s)`);
      else if (staticRequired) arr = arr.min(1, `${arrLabel} must have at least 1 item`);
      if (field.maxItems != null)
        arr = arr.max(field.maxItems, `${arrLabel} must have at most ${field.maxItems} item(s)`);
      schema = arr;
      break;
    }

    default:
      schema = z.unknown();
  }

  // Make optional if not statically required or has conditions
  if (!staticRequired) {
    schema = schema.nullable().optional();
  }

  return schema;
}

// =============================================================================
// Internal: Nested shape builder
// =============================================================================

/**
 * Builds a nested shape tree from fields, handling dotted names.
 * "detail.loanDetail.bankingSegment" → { detail: { loanDetail: { bankingSegment: z.string() } } }
 */
function buildNestedShape(fields: FormField[]): Record<string, z.ZodTypeAny> {
  const tree: Record<string, ShapeNode> = {};

  for (const field of fields) {
    const zodType = buildZodTypeForField(field);
    const segments = field.name.split('.');

    // For location-selector, also emit auxiliary fields so Zod doesn't strip them
    if (field.type === 'location-selector') {
      const loc = field as LocationSelectorField;
      const optionalString = z.string().nullable().optional();
      if (loc.districtField) tree[loc.districtField] = optionalString;
      if (loc.provinceField) tree[loc.provinceField] = optionalString;
      if (loc.postcodeField) tree[loc.postcodeField] = optionalString;
      if (loc.subDistrictNameField) tree[loc.subDistrictNameField] = optionalString;
    }

    if (segments.length === 1) {
      // Flat name — direct assignment
      tree[segments[0]] = zodType;
    } else {
      // Dotted name — build nested tree
      let current = tree;
      for (let i = 0; i < segments.length - 1; i++) {
        const seg = segments[i];
        if (!current[seg] || current[seg] instanceof z.ZodType) {
          current[seg] = {};
        }
        current = current[seg] as Record<string, ShapeNode>;
      }
      current[segments[segments.length - 1]] = zodType;
    }
  }

  return shapeNodeToZod(tree);
}

/** Recursively convert ShapeNode tree to Record<string, ZodTypeAny> */
function shapeNodeToZod(tree: Record<string, ShapeNode>): Record<string, z.ZodTypeAny> {
  const shape: Record<string, z.ZodTypeAny> = {};
  for (const [key, value] of Object.entries(tree)) {
    if (value instanceof z.ZodType) {
      shape[key] = value;
    } else {
      shape[key] = z.object(shapeNodeToZod(value));
    }
  }
  return shape;
}

// =============================================================================
// Internal: Deep merge for nested ZodObjects
// =============================================================================

function isZodObject(schema: z.ZodTypeAny): boolean {
  return schema._def?.typeName === 'ZodObject';
}

function deepMergeShapes(
  base: Record<string, z.ZodTypeAny>,
  override: Record<string, z.ZodTypeAny>,
  priority: 'field-wins' | 'base-wins',
): Record<string, z.ZodTypeAny> {
  const result = { ...base };

  for (const [key, overrideValue] of Object.entries(override)) {
    const baseValue = result[key];

    if (baseValue && isZodObject(baseValue) && isZodObject(overrideValue)) {
      // Both are ZodObjects — recursively deep merge
      const baseInner = (baseValue as z.ZodObject<any>)._def.shape();
      const overrideInner = (overrideValue as z.ZodObject<any>)._def.shape();
      result[key] = z.object(deepMergeShapes(baseInner, overrideInner, priority));
    } else if (baseValue && priority === 'base-wins') {
      // keep base
    } else {
      result[key] = overrideValue; // field wins or new key
    }
  }

  return result;
}

// =============================================================================
// Internal: Conditional refinement
// =============================================================================

/** Get display label for a field (used in error messages). */
function getFieldLabel(field: FormField): string {
  if ('label' in field && field.label) return field.label;
  return field.name;
}

/**
 * Builds a superRefine callback that evaluates conditional visibility,
 * disabled state, and required state at validation time — mirroring the
 * same logic used by useFieldState in the UI.
 */
function buildConditionalRefinement(fields: FormField[]) {
  const conditionalFields = fields.filter(f => hasConditions(f));

  if (conditionalFields.length === 0) return null;

  return (data: Record<string, unknown>, ctx: z.RefinementCtx) => {
    for (const field of conditionalFields) {
      // 1. Evaluate visibility (same logic as useFieldState)
      let isVisible = true;
      if (field.showWhen) {
        isVisible = evaluateConditions(field.showWhen, data, '');
      } else if (field.hideWhen) {
        isVisible = !evaluateConditions(field.hideWhen, data, '');
      }

      // 2. Evaluate disabled state
      let isDisabled = field.disabled ?? false;
      if (!isDisabled && field.disableWhen) {
        isDisabled = evaluateConditions(field.disableWhen, data, '');
      } else if (isDisabled && field.enableWhen) {
        isDisabled = !evaluateConditions(field.enableWhen, data, '');
      }

      // 3. Skip validation for hidden or disabled fields
      if (!isVisible || isDisabled) continue;

      // 4. Evaluate conditional required
      let isRequired = field.required ?? false;
      if (field.requiredWhen) {
        isRequired = evaluateConditions(field.requiredWhen, data, '');
      }

      // 5. Enforce required — resolve dotted paths
      if (isRequired) {
        const value = getNestedValue(data, field.name);
        const isNumberField = field.type === 'number-input';
        if (
          value == null ||
          value === '' ||
          (isNumberField && value === 0 && field.min == null)
        ) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: field.name.split('.'),
            message: `${getFieldLabel(field)} is required`,
          });
        }
      }
    }
  };
}

// =============================================================================
// Internal: Schema unwrapping
// =============================================================================

/**
 * Unwraps ZodEffects to get the inner ZodObject.
 * Returns the schema as-is if it's already a ZodObject.
 */
function unwrapEffects(schema: z.ZodTypeAny): z.ZodObject<any> {
  let current = schema;
  while (current._def?.typeName === 'ZodEffects') {
    current = current._def.schema;
  }
  return current as z.ZodObject<any>;
}

// =============================================================================
// Public API
// =============================================================================

/**
 * Merge two Zod schemas (base + field-generated) into a single ZodObject.
 *
 * Unwraps ZodEffects from both inputs. Performs deep merge — if both base
 * and field have a ZodObject at the same key, their shapes are recursively merged.
 * Does NOT re-apply refinements — use `buildFormSchema` for that.
 *
 * @param priority - 'field-wins' (default): field schema overwrites base on overlap.
 *                   'base-wins': base schema kept on overlap.
 */
export function mergeSchemas(
  baseSchema: z.ZodObject<any> | z.ZodEffects<any>,
  fieldSchema: z.ZodObject<any> | z.ZodEffects<any>,
  options?: MergeSchemaOptions,
): z.ZodObject<any> {
  const priority = options?.priority ?? 'field-wins';

  const baseObj = unwrapEffects(baseSchema);
  const fieldObj = unwrapEffects(fieldSchema);

  const baseShape = baseObj._def.shape() as Record<string, z.ZodTypeAny>;
  const fieldShape = fieldObj._def.shape() as Record<string, z.ZodTypeAny>;

  return z.object(deepMergeShapes(baseShape, fieldShape, priority));
}

/**
 * Convenience function: build a schema from fields, optionally merge with a
 * base schema, and attach conditional superRefine if needed.
 *
 * @example
 * ```ts
 * const schema = buildFormSchema(fields);
 * const schema = buildFormSchema(fields, existingZodSchema);
 * const schema = buildFormSchema(fields, existingZodSchema, { priority: 'base-wins' });
 * ```
 */
export function buildFormSchema(
  fields: FormField[],
  baseSchema?: z.ZodObject<any> | z.ZodEffects<any>,
  options?: MergeSchemaOptions,
): z.ZodObject<any> | z.ZodEffects<z.ZodObject<any>> {
  // 1. Build field schema using nested shape builder
  const fieldShape = buildNestedShape(fields);
  const fieldObj = z.object(fieldShape);

  // 2. Merge if base schema provided (deep merge)
  const merged = baseSchema ? mergeSchemas(baseSchema, fieldObj, options) : fieldObj;

  // 3. Attach conditional refinement if needed
  const refinement = buildConditionalRefinement(fields);
  if (refinement) {
    return merged.superRefine(refinement);
  }

  return merged;
}
