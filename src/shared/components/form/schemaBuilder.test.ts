import { describe, it, expect } from 'vitest';
import { z } from 'zod';
import { buildFormSchema, mergeSchemas } from './schemaBuilder';
import type { FormField } from './types';

// =============================================================================
// Helpers
// =============================================================================

/** Parse and return { success, data?, error? } for convenience */
function parse(schema: z.ZodTypeAny, data: unknown) {
  return schema.safeParse(data);
}

/** Unwrap ZodEffects to get inner ZodObject */
function unwrap(schema: z.ZodTypeAny): z.ZodObject<any> {
  let current = schema;
  while (current._def?.typeName === 'ZodEffects') {
    current = current._def.schema;
  }
  return current as z.ZodObject<any>;
}

// =============================================================================
// buildFormSchema — field type mapping
// =============================================================================

describe('buildFormSchema — field types', () => {
  it('text-input → z.string()', () => {
    const fields: FormField[] = [
      { type: 'text-input', name: 'title', label: 'Title', required: true },
    ];
    const schema = buildFormSchema(fields);

    expect(parse(schema, { title: 'hello' }).success).toBe(true);
    // required text-input rejects empty string via .min(1)
    expect(parse(schema, { title: '' }).success).toBe(false);
    expect(parse(schema, {}).success).toBe(false); // missing required key
  });

  it('text-input with minLength/maxLength', () => {
    const fields: FormField[] = [
      { type: 'text-input', name: 'code', label: 'Code', required: true, minLength: 2, maxLength: 5 },
    ];
    const schema = buildFormSchema(fields);

    expect(parse(schema, { code: 'AB' }).success).toBe(true);
    expect(parse(schema, { code: 'A' }).success).toBe(false); // too short
    expect(parse(schema, { code: 'ABCDEF' }).success).toBe(false); // too long
  });

  it('number-input → z.coerce.number()', () => {
    const fields: FormField[] = [
      { type: 'number-input', name: 'age', label: 'Age', required: true, min: 0, max: 150 },
    ];
    const schema = buildFormSchema(fields);

    expect(parse(schema, { age: 25 }).success).toBe(true);
    expect(parse(schema, { age: '30' }).success).toBe(true); // coerced
    expect(parse(schema, { age: -1 }).success).toBe(false);
    expect(parse(schema, { age: 200 }).success).toBe(false);
  });

  it('number-input with maxIntegerDigits limits digits before decimal', () => {
    const fields: FormField[] = [
      { type: 'number-input', name: 'amount', label: 'Amount', maxIntegerDigits: 3, decimalPlaces: 2 },
    ];
    const schema = buildFormSchema(fields);

    // 3 digits before decimal → ok
    expect(parse(schema, { amount: 999.99 }).success).toBe(true);
    expect(parse(schema, { amount: 1 }).success).toBe(true);
    expect(parse(schema, { amount: 0 }).success).toBe(true);
    // 4 digits before decimal → fail
    expect(parse(schema, { amount: 1000 }).success).toBe(false);
    expect(parse(schema, { amount: 9999.99 }).success).toBe(false);
  });

  it('boolean-toggle → z.boolean()', () => {
    const fields: FormField[] = [
      { type: 'boolean-toggle', name: 'active', label: 'Active', options: ['Yes', 'No'] },
    ];
    const schema = buildFormSchema(fields);

    expect(parse(schema, { active: true }).success).toBe(true);
    expect(parse(schema, { active: false }).success).toBe(true);
    // optional (required not set), so null/undefined ok
    expect(parse(schema, { active: null }).success).toBe(true);
  });

  it('select-input / dropdown → z.string()', () => {
    const fields: FormField[] = [
      { type: 'select-input', name: 'color', label: 'Color', required: true, options: [] },
      { type: 'dropdown', name: 'size', label: 'Size', options: [] },
    ];
    const schema = buildFormSchema(fields);

    expect(parse(schema, { color: 'red', size: 'M' }).success).toBe(true);
    expect(parse(schema, { color: 'red', size: null }).success).toBe(true); // size optional
  });

  it('checkbox-group → z.array(z.string()), required → min(1)', () => {
    const fields: FormField[] = [
      { type: 'checkbox-group', name: 'tags', label: 'Tags', required: true, options: [] },
    ];
    const schema = buildFormSchema(fields);

    expect(parse(schema, { tags: ['a'] }).success).toBe(true);
    expect(parse(schema, { tags: [] }).success).toBe(false); // min(1)
  });

  it('checkbox-group optional accepts empty array', () => {
    const fields: FormField[] = [
      { type: 'checkbox-group', name: 'tags', label: 'Tags', options: [] },
    ];
    const schema = buildFormSchema(fields);

    expect(parse(schema, { tags: [] }).success).toBe(true);
    expect(parse(schema, { tags: null }).success).toBe(true);
  });

  it('required field rejects missing value', () => {
    const fields: FormField[] = [
      { type: 'text-input', name: 'name', label: 'Name', required: true },
    ];
    const schema = buildFormSchema(fields);

    expect(parse(schema, {}).success).toBe(false);
  });

  it('optional field accepts null/undefined', () => {
    const fields: FormField[] = [
      { type: 'text-input', name: 'nickname', label: 'Nickname' },
    ];
    const schema = buildFormSchema(fields);

    expect(parse(schema, { nickname: null }).success).toBe(true);
    expect(parse(schema, { nickname: undefined }).success).toBe(true);
    expect(parse(schema, {}).success).toBe(true);
  });

  it('field with requiredWhen is optional in base schema', () => {
    const fields: FormField[] = [
      { type: 'text-input', name: 'reason', label: 'Reason', required: true, requiredWhen: { field: 'status', is: 'rejected' } },
    ];
    const schema = buildFormSchema(fields);
    // Schema should be ZodEffects (has superRefine)
    expect(schema._def.typeName).toBe('ZodEffects');

    // The inner object schema should have 'reason' as optional (nullable)
    const inner = (schema as z.ZodEffects<any>)._def.schema;
    const result = inner.safeParse({ reason: null });
    expect(result.success).toBe(true);
  });
});

// =============================================================================
// buildFormSchema — required + allowZero
// =============================================================================

describe('buildFormSchema — required number-input + allowZero', () => {
  it('required number-input with min (no allowZero) rejects 0', () => {
    const fields: FormField[] = [
      { type: 'number-input', name: 'score', label: 'Score', required: true, min: -10, max: 10 },
    ];
    const schema = buildFormSchema(fields);

    expect(parse(schema, { score: 5 }).success).toBe(true);
    expect(parse(schema, { score: 0 }).success).toBe(false);
  });

  it('required number-input with allowZero accepts 0 but rejects null/empty', () => {
    const fields: FormField[] = [
      { type: 'number-input', name: 'lat', label: 'Latitude', required: true, min: -90, max: 90, allowZero: true },
    ];
    const schema = buildFormSchema(fields);

    expect(parse(schema, { lat: 0 }).success).toBe(true);
    expect(parse(schema, { lat: 45 }).success).toBe(true);
    // Empty input sends null from NumberInput component — must be rejected
    expect(parse(schema, { lat: null }).success).toBe(false);
    expect(parse(schema, { lat: undefined }).success).toBe(false);
    expect(parse(schema, { lat: '' }).success).toBe(false);
  });

  it('required number-input with allowZero shows required message (not NaN)', () => {
    const fields: FormField[] = [
      { type: 'number-input', name: 'lat', label: 'Latitude', required: true, min: -90, max: 90, allowZero: true },
    ];
    const schema = buildFormSchema(fields);

    const result = parse(schema, { lat: null });
    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.message).toBe('Latitude is required');
  });

  it('required number-input without min still rejects 0 (backward compat)', () => {
    const fields: FormField[] = [
      { type: 'number-input', name: 'qty', label: 'Quantity', required: true },
    ];
    const schema = buildFormSchema(fields);

    expect(parse(schema, { qty: 0 }).success).toBe(false);
    expect(parse(schema, { qty: 1 }).success).toBe(true);
  });

  it('required text-input with minLength still rejects empty string', () => {
    const fields: FormField[] = [
      { type: 'text-input', name: 'code', label: 'Code', required: true, minLength: 3 },
    ];
    const schema = buildFormSchema(fields);

    expect(parse(schema, { code: '' }).success).toBe(false);
    expect(parse(schema, { code: 'AB' }).success).toBe(false); // too short
    expect(parse(schema, { code: 'ABC' }).success).toBe(true);
  });
});

describe('buildFormSchema — conditional required + allowZero', () => {
  it('conditional required with allowZero accepts 0', () => {
    const fields: FormField[] = [
      { type: 'select-input', name: 'type', label: 'Type', required: true, options: [] },
      {
        type: 'number-input',
        name: 'value',
        label: 'Value',
        required: true,
        allowZero: true,
        requiredWhen: { field: 'type', is: 'numeric' },
      },
    ];
    const schema = buildFormSchema(fields);

    // condition met + value is 0 → should pass (allowZero)
    expect(parse(schema, { type: 'numeric', value: 0 }).success).toBe(true);
  });

  it('conditional required without allowZero rejects 0', () => {
    const fields: FormField[] = [
      { type: 'select-input', name: 'type', label: 'Type', required: true, options: [] },
      {
        type: 'number-input',
        name: 'value',
        label: 'Value',
        required: true,
        requiredWhen: { field: 'type', is: 'numeric' },
      },
    ];
    const schema = buildFormSchema(fields);

    // condition met + value is 0 → should fail (no allowZero)
    expect(parse(schema, { type: 'numeric', value: 0 }).success).toBe(false);
  });
});

// =============================================================================
// buildFormSchema — dotted field names (nested objects)
// =============================================================================

describe('buildFormSchema — dotted field names (nested objects)', () => {
  it('single-level nesting — "detail.name" → nested object', () => {
    const fields: FormField[] = [
      { type: 'text-input', name: 'detail.name', label: 'Name', required: true },
    ];
    const schema = buildFormSchema(fields);
    const inner = unwrap(schema);

    // Should have 'detail' as a ZodObject, not 'detail.name' as flat key
    expect(inner.shape['detail.name']).toBeUndefined();
    expect(inner.shape.detail).toBeDefined();
    expect(inner.shape.detail._def.typeName).toBe('ZodObject');

    // Validation works with nested data
    expect(parse(schema, { detail: { name: 'hello' } }).success).toBe(true);
    expect(parse(schema, { detail: { name: '' } }).success).toBe(false); // required rejects empty
    expect(parse(schema, {}).success).toBe(false);
  });

  it('multi-level nesting — "detail.loanDetail.bankingSegment"', () => {
    const fields: FormField[] = [
      { type: 'dropdown', name: 'detail.loanDetail.bankingSegment', label: 'Banking Segment', group: 'BankingSegment', required: true },
    ];
    const schema = buildFormSchema(fields);

    expect(parse(schema, {
      detail: { loanDetail: { bankingSegment: 'retail' } },
    }).success).toBe(true);

    expect(parse(schema, {
      detail: { loanDetail: {} },
    }).success).toBe(false);
  });

  it('mixed flat + dotted fields in same schema', () => {
    const fields: FormField[] = [
      { type: 'dropdown', name: 'purpose', label: 'Purpose', group: 'Purpose', required: true },
      { type: 'text-input', name: 'detail.address.city', label: 'City', required: true },
      { type: 'text-input', name: 'detail.address.street', label: 'Street' },
    ];
    const schema = buildFormSchema(fields);
    const inner = unwrap(schema);

    // Flat field exists
    expect(inner.shape.purpose).toBeDefined();
    // Nested fields exist
    expect(inner.shape.detail._def.typeName).toBe('ZodObject');

    expect(parse(schema, {
      purpose: 'test',
      detail: { address: { city: 'Bangkok', street: null } },
    }).success).toBe(true);
  });

  it('multiple dotted fields under same parent merge correctly', () => {
    const fields: FormField[] = [
      { type: 'text-input', name: 'detail.firstName', label: 'First Name', required: true },
      { type: 'text-input', name: 'detail.lastName', label: 'Last Name', required: true },
      { type: 'number-input', name: 'detail.age', label: 'Age' },
    ];
    const schema = buildFormSchema(fields);

    expect(parse(schema, {
      detail: { firstName: 'John', lastName: 'Doe', age: null },
    }).success).toBe(true);

    expect(parse(schema, {
      detail: { firstName: 'John' },
    }).success).toBe(false); // missing lastName
  });
});

// =============================================================================
// Deep merge with base schema
// =============================================================================

describe('buildFormSchema — deep merge with base', () => {
  it('deep merge preserves non-overlapping base sub-fields', () => {
    const baseSchema = z.object({
      detail: z.object({
        a: z.string(),
        b: z.number(),
        c: z.boolean(),
      }),
    });

    // Fields only define detail.a — b and c should be preserved from base
    const fields: FormField[] = [
      { type: 'number-input', name: 'detail.a', label: 'A', required: true },
    ];
    const schema = buildFormSchema(fields, baseSchema);
    const inner = unwrap(schema);
    const detailShape = (inner.shape.detail as z.ZodObject<any>)._def.shape();

    expect(detailShape.a).toBeDefined();
    expect(detailShape.b).toBeDefined();
    expect(detailShape.c).toBeDefined();

    // detail.a should be number (field-wins), detail.b stays number, detail.c stays boolean
    expect(parse(schema, {
      detail: { a: 42, b: 1, c: true },
    }).success).toBe(true);
  });

  it('deep merge with field-wins overrides overlapping sub-field', () => {
    const baseSchema = z.object({
      detail: z.object({
        name: z.string(),
        age: z.string(), // string in base
      }),
    });

    const fields: FormField[] = [
      { type: 'number-input', name: 'detail.age', label: 'Age', required: true },
    ];
    const schema = buildFormSchema(fields, baseSchema);

    // age should now be number (field wins)
    expect(parse(schema, { detail: { name: 'Alice', age: 25 } }).success).toBe(true);
    expect(parse(schema, { detail: { name: 'Alice', age: 'twenty' } }).success).toBe(false);
  });

  it('deep merge base-wins preserves base on overlap', () => {
    const baseSchema = z.object({
      detail: z.object({
        name: z.string(),
      }),
    });

    const fields: FormField[] = [
      { type: 'number-input', name: 'detail.name', label: 'Name', required: true },
    ];
    const schema = buildFormSchema(fields, baseSchema, { priority: 'base-wins' });

    // name stays string (base wins)
    expect(parse(schema, { detail: { name: 'Alice' } }).success).toBe(true);
  });

  it('multi-level deep merge preserves all levels', () => {
    const baseSchema = z.object({
      detail: z.object({
        address: z.object({
          houseNumber: z.string().nullable(),
          projectName: z.string().nullable(),
          moo: z.string().nullable(),
          soi: z.string().nullable(),
          road: z.string().nullable(),
          subDistrict: z.string(),
          district: z.string(),
          province: z.string(),
          postcode: z.string().nullable(),
        }),
      }),
    });

    // Fields only define 3 address sub-fields
    const fields: FormField[] = [
      { type: 'text-input', name: 'detail.address.houseNumber', label: 'House No' },
      { type: 'text-input', name: 'detail.address.subDistrict', label: 'Sub District', required: true },
      { type: 'text-input', name: 'detail.address.postcode', label: 'Postcode' },
    ];
    const schema = buildFormSchema(fields, baseSchema);
    const inner = unwrap(schema);
    const detailShape = (inner.shape.detail as z.ZodObject<any>)._def.shape();
    const addressShape = (detailShape.address as z.ZodObject<any>)._def.shape();

    // All 9 fields should exist
    expect(Object.keys(addressShape).length).toBe(9);
    expect(addressShape.road).toBeDefined(); // from base
    expect(addressShape.subDistrict).toBeDefined(); // overridden by field
  });
});

// =============================================================================
// buildFormSchema — with base schema
// =============================================================================

describe('buildFormSchema — base schema merge', () => {
  const baseSchema = z.object({
    id: z.string(),
    name: z.string(),
  });

  it('merges base + field schemas', () => {
    const fields: FormField[] = [
      { type: 'number-input', name: 'age', label: 'Age', required: true },
    ];
    const schema = buildFormSchema(fields, baseSchema);

    expect(parse(schema, { id: '1', name: 'A', age: 25 }).success).toBe(true);
    expect(parse(schema, { age: 25 }).success).toBe(false); // missing base fields
  });

  it('priority: field-wins (default) — field overrides base on overlap', () => {
    const fields: FormField[] = [
      { type: 'number-input', name: 'name', label: 'Name', required: true },
    ];
    const schema = buildFormSchema(fields, baseSchema);

    // 'name' should now be number (from field), not string (from base)
    expect(parse(schema, { id: '1', name: 42 }).success).toBe(true);
    // z.coerce.number() on 'text' → NaN → fails validation
    expect(parse(schema, { id: '1', name: 'text' }).success).toBe(false);
  });

  it('priority: base-wins — base kept on overlap', () => {
    const fields: FormField[] = [
      { type: 'number-input', name: 'name', label: 'Name', required: true },
    ];
    const schema = buildFormSchema(fields, baseSchema, { priority: 'base-wins' });

    // 'name' should stay string (from base)
    expect(parse(schema, { id: '1', name: 'Alice' }).success).toBe(true);
    expect(parse(schema, { id: '1', name: 42 }).success).toBe(false);
  });
});

// =============================================================================
// mergeSchemas
// =============================================================================

describe('mergeSchemas', () => {
  it('merges two ZodObjects', () => {
    const a = z.object({ x: z.string() });
    const b = z.object({ y: z.number() });
    const merged = mergeSchemas(a, b);

    expect(parse(merged, { x: 'hi', y: 1 }).success).toBe(true);
  });

  it('unwraps ZodEffects before merging', () => {
    const a = z.object({ x: z.string() }).superRefine(() => {});
    const b = z.object({ y: z.number() });
    const merged = mergeSchemas(a, b);

    // Result should be a plain ZodObject (no effects)
    expect(merged._def.typeName).toBe('ZodObject');
    expect(parse(merged, { x: 'hi', y: 1 }).success).toBe(true);
  });

  it('field-wins priority (default)', () => {
    const a = z.object({ overlap: z.string() });
    const b = z.object({ overlap: z.number() });
    const merged = mergeSchemas(a, b);

    // b (field) wins — overlap is number
    expect(parse(merged, { overlap: 42 }).success).toBe(true);
    expect(parse(merged, { overlap: 'text' }).success).toBe(false);
  });

  it('base-wins priority', () => {
    const a = z.object({ overlap: z.string() });
    const b = z.object({ overlap: z.number() });
    const merged = mergeSchemas(a, b, { priority: 'base-wins' });

    // a (base) wins — overlap is string
    expect(parse(merged, { overlap: 'text' }).success).toBe(true);
    expect(parse(merged, { overlap: 42 }).success).toBe(false);
  });

  it('deep merges nested ZodObjects', () => {
    const a = z.object({
      detail: z.object({ a: z.string(), b: z.number() }),
    });
    const b = z.object({
      detail: z.object({ b: z.string(), c: z.boolean() }),
    });
    const merged = mergeSchemas(a, b);
    const detailShape = (merged.shape.detail as z.ZodObject<any>)._def.shape();

    // a from base, b overridden by field (string), c from field
    expect(detailShape.a).toBeDefined();
    expect(detailShape.b).toBeDefined();
    expect(detailShape.c).toBeDefined();

    // b should be string (field wins)
    expect(parse(merged, { detail: { a: 'x', b: 'y', c: true } }).success).toBe(true);
    expect(parse(merged, { detail: { a: 'x', b: 42, c: true } }).success).toBe(false);
  });
});

// =============================================================================
// Conditional validation (superRefine)
// =============================================================================

describe('buildFormSchema — conditional validation', () => {
  it('showWhen false → field not required even if required: true', () => {
    const fields: FormField[] = [
      { type: 'select-input', name: 'type', label: 'Type', required: true, options: [] },
      {
        type: 'text-input',
        name: 'details',
        label: 'Details',
        required: true,
        showWhen: { field: 'type', is: 'other' },
      },
    ];
    const schema = buildFormSchema(fields);

    // type != 'other' → details hidden → should pass without details
    const result = parse(schema, { type: 'normal', details: null });
    expect(result.success).toBe(true);
  });

  it('showWhen true + required + empty → error', () => {
    const fields: FormField[] = [
      { type: 'select-input', name: 'type', label: 'Type', required: true, options: [] },
      {
        type: 'text-input',
        name: 'details',
        label: 'Details',
        required: true,
        showWhen: { field: 'type', is: 'other' },
      },
    ];
    const schema = buildFormSchema(fields);

    // type == 'other' → details visible + required → empty should fail
    const result = parse(schema, { type: 'other', details: '' });
    expect(result.success).toBe(false);
    expect(result.error?.issues.some(i => i.path.includes('details'))).toBe(true);
  });

  it('requiredWhen true + empty → error', () => {
    const fields: FormField[] = [
      { type: 'select-input', name: 'status', label: 'Status', required: true, options: [] },
      {
        type: 'text-input',
        name: 'reason',
        label: 'Reason',
        requiredWhen: { field: 'status', is: 'rejected' },
      },
    ];
    const schema = buildFormSchema(fields);

    const result = parse(schema, { status: 'rejected', reason: '' });
    expect(result.success).toBe(false);
    expect(result.error?.issues.some(i => i.path.includes('reason'))).toBe(true);
  });

  it('requiredWhen false + empty → passes', () => {
    const fields: FormField[] = [
      { type: 'select-input', name: 'status', label: 'Status', required: true, options: [] },
      {
        type: 'text-input',
        name: 'reason',
        label: 'Reason',
        requiredWhen: { field: 'status', is: 'rejected' },
      },
    ];
    const schema = buildFormSchema(fields);

    const result = parse(schema, { status: 'approved', reason: null });
    expect(result.success).toBe(true);
  });

  it('conditional refinement with dotted path — requiredWhen on nested field', () => {
    const fields: FormField[] = [
      { type: 'dropdown', name: 'purpose', label: 'Purpose', group: 'Purpose', required: true },
      {
        type: 'text-input',
        name: 'detail.loanDetail.loanApplicationNumber',
        label: 'Loan Application No',
        requiredWhen: { field: 'purpose', is: '01' },
      },
    ];
    const schema = buildFormSchema(fields);

    // purpose === '01' + empty loan app number → fails
    const fail = parse(schema, {
      purpose: '01',
      detail: { loanDetail: { loanApplicationNumber: '' } },
    });
    expect(fail.success).toBe(false);
    expect(fail.error?.issues.some(i =>
      i.path.length === 3 &&
      i.path[0] === 'detail' &&
      i.path[1] === 'loanDetail' &&
      i.path[2] === 'loanApplicationNumber',
    )).toBe(true);

    // purpose !== '01' + empty loan app number → passes
    const pass = parse(schema, {
      purpose: '02',
      detail: { loanDetail: { loanApplicationNumber: null } },
    });
    expect(pass.success).toBe(true);

    // purpose === '01' + filled loan app number → passes
    const passWithValue = parse(schema, {
      purpose: '01',
      detail: { loanDetail: { loanApplicationNumber: 'APP-123' } },
    });
    expect(passWithValue.success).toBe(true);
  });
});

// =============================================================================
// buildFormSchema — field-array
// =============================================================================

describe('buildFormSchema — field-array', () => {
  it('basic array of objects', () => {
    const fields: FormField[] = [
      {
        type: 'field-array',
        name: 'customers',
        required: true,
        fields: [
          { type: 'text-input', name: 'name', label: 'Name', required: true, minLength: 1 },
          { type: 'text-input', name: 'contactNumber', label: 'Contact', required: true, minLength: 1 },
        ],
      },
    ];
    const schema = buildFormSchema(fields);

    expect(parse(schema, {
      customers: [{ name: 'Alice', contactNumber: '123' }],
    }).success).toBe(true);

    // child field validation: name too short
    expect(parse(schema, {
      customers: [{ name: '', contactNumber: '123' }],
    }).success).toBe(false);
  });

  it('minItems / maxItems constraints', () => {
    const fields: FormField[] = [
      {
        type: 'field-array',
        name: 'items',
        required: true,
        minItems: 2,
        maxItems: 4,
        fields: [
          { type: 'text-input', name: 'value', label: 'Value', required: true },
        ],
      },
    ];
    const schema = buildFormSchema(fields);

    // too few
    expect(parse(schema, { items: [{ value: 'a' }] }).success).toBe(false);
    // just right
    expect(parse(schema, { items: [{ value: 'a' }, { value: 'b' }] }).success).toBe(true);
    // max
    expect(parse(schema, {
      items: [{ value: 'a' }, { value: 'b' }, { value: 'c' }, { value: 'd' }],
    }).success).toBe(true);
    // too many
    expect(parse(schema, {
      items: [{ value: 'a' }, { value: 'b' }, { value: 'c' }, { value: 'd' }, { value: 'e' }],
    }).success).toBe(false);
  });

  it('required + no minItems defaults to .min(1)', () => {
    const fields: FormField[] = [
      {
        type: 'field-array',
        name: 'tags',
        required: true,
        fields: [
          { type: 'text-input', name: 'label', label: 'Label', required: true },
        ],
      },
    ];
    const schema = buildFormSchema(fields);

    // empty array fails (min 1)
    expect(parse(schema, { tags: [] }).success).toBe(false);
    // one item passes
    expect(parse(schema, { tags: [{ label: 'x' }] }).success).toBe(true);
  });

  it('optional field-array accepts null/undefined', () => {
    const fields: FormField[] = [
      {
        type: 'field-array',
        name: 'notes',
        fields: [
          { type: 'text-input', name: 'text', label: 'Text' },
        ],
      },
    ];
    const schema = buildFormSchema(fields);

    expect(parse(schema, { notes: null }).success).toBe(true);
    expect(parse(schema, { notes: undefined }).success).toBe(true);
    expect(parse(schema, {}).success).toBe(true);
    // also accepts valid array
    expect(parse(schema, { notes: [{ text: 'hi' }] }).success).toBe(true);
  });

  it('nested field-array (array within array)', () => {
    const fields: FormField[] = [
      {
        type: 'field-array',
        name: 'groups',
        required: true,
        fields: [
          { type: 'text-input', name: 'groupName', label: 'Group', required: true },
          {
            type: 'field-array',
            name: 'members',
            required: true,
            minItems: 1,
            fields: [
              { type: 'text-input', name: 'memberName', label: 'Member', required: true },
            ],
          },
        ],
      },
    ];
    const schema = buildFormSchema(fields);

    expect(parse(schema, {
      groups: [{
        groupName: 'Team A',
        members: [{ memberName: 'Alice' }],
      }],
    }).success).toBe(true);

    // nested array empty fails (minItems: 1)
    expect(parse(schema, {
      groups: [{
        groupName: 'Team A',
        members: [],
      }],
    }).success).toBe(false);
  });

  it('array with conditional child field is optional in element schema', () => {
    const fields: FormField[] = [
      {
        type: 'field-array',
        name: 'entries',
        required: true,
        fields: [
          { type: 'text-input', name: 'title', label: 'Title', required: true },
          {
            type: 'text-input',
            name: 'details',
            label: 'Details',
            required: true,
            requiredWhen: { field: 'type', is: 'custom' },
          },
        ],
      },
    ];
    const schema = buildFormSchema(fields);

    // 'details' has requiredWhen → optional in base schema → null accepted
    expect(parse(schema, {
      entries: [{ title: 'Test', details: null }],
    }).success).toBe(true);
  });

  it('field-array with requiredWhen child — enforces per element', () => {
    const fields: FormField[] = [
      {
        type: 'field-array',
        name: 'titles',
        required: true,
        fields: [
          { type: 'dropdown', name: 'collateralType', label: 'Type', options: [], required: true },
          {
            type: 'text-input',
            name: 'titleNumber',
            label: 'Title Number',
            requiredWhen: { field: 'collateralType', is: 'L' },
          },
        ],
      },
    ];
    const schema = buildFormSchema(fields);

    // collateralType = 'L' + empty titleNumber → fails
    const fail = parse(schema, {
      titles: [{ collateralType: 'L', titleNumber: '' }],
    });
    expect(fail.success).toBe(false);
    expect(fail.error?.issues.some(i => i.path.includes('titleNumber'))).toBe(true);

    // collateralType = 'L' + filled titleNumber → passes
    expect(parse(schema, {
      titles: [{ collateralType: 'L', titleNumber: '123' }],
    }).success).toBe(true);

    // collateralType = 'B' + empty titleNumber → passes (condition not met)
    expect(parse(schema, {
      titles: [{ collateralType: 'B', titleNumber: null }],
    }).success).toBe(true);
  });

  it('field-array with showWhen child — hidden child skips validation', () => {
    const fields: FormField[] = [
      {
        type: 'field-array',
        name: 'items',
        required: true,
        fields: [
          { type: 'dropdown', name: 'type', label: 'Type', options: [], required: true },
          {
            type: 'text-input',
            name: 'extra',
            label: 'Extra',
            required: true,
            showWhen: { field: 'type', is: 'special' },
          },
        ],
      },
    ];
    const schema = buildFormSchema(fields);

    // type != 'special' → extra hidden → should pass with null
    expect(parse(schema, {
      items: [{ type: 'normal', extra: null }],
    }).success).toBe(true);

    // type == 'special' → extra visible + required → empty fails
    const fail = parse(schema, {
      items: [{ type: 'special', extra: '' }],
    });
    expect(fail.success).toBe(false);

    // type == 'special' + filled → passes
    expect(parse(schema, {
      items: [{ type: 'special', extra: 'data' }],
    }).success).toBe(true);
  });

  it('field-array element-level validation — per-element errors', () => {
    const fields: FormField[] = [
      {
        type: 'field-array',
        name: 'titles',
        required: true,
        fields: [
          { type: 'dropdown', name: 'collateralType', label: 'Type', options: [], required: true },
          {
            type: 'text-input',
            name: 'titleNumber',
            label: 'Title Number',
            requiredWhen: { field: 'collateralType', is: 'L' },
          },
        ],
      },
    ];
    const schema = buildFormSchema(fields);

    // Two elements: first valid (L with title), second invalid (L without title)
    const result = parse(schema, {
      titles: [
        { collateralType: 'L', titleNumber: '123' },
        { collateralType: 'L', titleNumber: '' },
      ],
    });
    expect(result.success).toBe(false);

    // Error should be on the second element (index 1)
    const titleIssue = result.error?.issues.find(i => i.path.includes('titleNumber'));
    expect(titleIssue).toBeDefined();
    expect(titleIssue!.path[0]).toBe('titles');
    expect(titleIssue!.path[1]).toBe(1); // second element
    expect(titleIssue!.path[2]).toBe('titleNumber');
  });
});
