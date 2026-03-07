# Schema Builder Guide

`buildFormSchema` generates Zod validation schemas from `FormField[]` configurations, keeping your form definition and validation in sync.

## 1. Basic Flat Form

```ts
import { buildFormSchema, type FormField } from '@/shared/components/form';

const fields: FormField[] = [
  { type: 'text-input', name: 'name', label: 'Name', required: true },
  { type: 'number-input', name: 'age', label: 'Age', required: true, min: 0 },
  { type: 'select-input', name: 'role', label: 'Role', options: [...] },
];

const schema = buildFormSchema(fields);
// => z.object({ name: z.string(), age: z.coerce.number().min(0), role: z.string().nullable().optional() })
```

## 2. Required vs Optional Fields

| Config | Zod output |
|--------|-----------|
| `required: true` | Base type (e.g. `z.string()`) — missing value fails |
| `required: false` or omitted | `schema.nullable().optional()` — accepts `null`/`undefined` |
| `required: true` + any condition (`requiredWhen`, `showWhen`, etc.) | `schema.nullable().optional()` in base schema; enforced by `superRefine` at runtime |

## 3. Field Constraints

Constraints on `FormField` map directly to Zod methods:

| Field prop | Zod method | Applies to |
|-----------|-----------|-----------|
| `minLength` | `.min(n)` | `text-input` |
| `maxLength` | `.max(n)` | `text-input`, `textarea` |
| `min` | `.min(n)` | `number-input` |
| `max` | `.max(n)` | `number-input` |
| `allowNegative: false` | `.nonnegative()` | `number-input` |
| `decimalPlaces` | `.multipleOf(10^-n)` | `number-input` |
| `formatPattern` | `.regex(new RegExp(pattern))` | `text-input`, `textarea`, `date-input`, `datetime-input` |
| `formatPatternMessage` | Custom error for `formatPattern` | (same as above) |
| `required: true` on `checkbox-group` | `.min(1)` | `checkbox-group` |

### Format & Input Helpers

These props live on `BaseFormField` and are available on all field types. They work across both the schema builder (validation) and the rendering layer (UI hints).

| Prop | Schema builder | Rendering |
|------|---------------|-----------|
| `formatPattern` | Adds `.regex(new RegExp(pattern), message)` to the Zod type | Not rendered (validation only) |
| `formatPatternMessage` | Custom error message for the regex | Not rendered |
| `placeholder` | Not used in schema | Passed to the input component as placeholder text |
| `inputMask` | Not used in schema | Passed to the input component for masked input (e.g., `99/99/9999`) |

```ts
// Example: Thai phone number with format validation + input mask
{
  type: 'text-input',
  name: 'phone',
  label: 'Phone',
  required: true,
  formatPattern: '^0[0-9]{8,9}$',
  formatPatternMessage: 'Invalid phone number format',
  placeholder: '0XX-XXX-XXXX',
  inputMask: '099-999-9999',
}

// Example: Date field with format validation
{
  type: 'date-input',
  name: 'birthDate',
  label: 'Birth Date',
  required: true,
  formatPattern: '^\\d{4}-\\d{2}-\\d{2}$',
  formatPatternMessage: 'Date must be YYYY-MM-DD',
  placeholder: 'DD/MM/YYYY',
}
```

**Note:** `placeholder` and `inputMask` are **rendering-only** — they don't affect schema generation. `formatPattern` and `formatPatternMessage` are **schema-only** — they are excluded from props passed to components (see `FormFields.tsx` destructuring).

## 4. Conditional Fields

Conditions control visibility, disabled state, and required state at both render time (via `useFieldState`) and validation time (via `superRefine`).

```ts
const fields: FormField[] = [
  { type: 'select-input', name: 'type', label: 'Type', required: true, options: [...] },
  {
    type: 'text-input',
    name: 'otherDetails',
    label: 'Details',
    required: true,
    showWhen: { field: 'type', is: 'other' },
  },
  {
    type: 'text-input',
    name: 'reason',
    label: 'Reason',
    requiredWhen: { field: 'type', is: 'rejected' },
  },
];
```

**How it works:**
- Fields with any condition prop become `nullable().optional()` in the base Zod schema
- A `superRefine` callback evaluates conditions at validation time, matching the UI logic
- Hidden or disabled fields skip validation entirely
- `requiredWhen` only enforces when the condition is true

### Condition props

| Prop | Effect |
|------|--------|
| `showWhen` | Field visible when condition is true; hidden otherwise |
| `hideWhen` | Field hidden when condition is true; visible otherwise |
| `disableWhen` | Field disabled when condition is true |
| `enableWhen` | Field enabled when condition is true (overrides `disabled`) |
| `requiredWhen` | Field required when condition is true |

### Multiple conditions

```ts
// AND logic (all must match)
showWhen: {
  conditions: [
    { field: 'type', is: 'custom' },
    { field: 'status', is: 'active' },
  ],
  match: 'all', // default
}

// OR logic (any must match)
showWhen: {
  conditions: [
    { field: 'type', is: 'A' },
    { field: 'type', is: 'B' },
  ],
  match: 'any',
}
```

## 5. Array Fields (`field-array`)

Declare repeatable field groups that generate `z.array(z.object({...}))`:

```ts
const fields: FormField[] = [
  {
    type: 'field-array',
    name: 'customers',
    required: true,
    minItems: 1,
    fields: [
      { type: 'text-input', name: 'name', label: 'Name', required: true, minLength: 1 },
      { type: 'text-input', name: 'contactNumber', label: 'Contact', required: true, minLength: 1 },
    ],
  },
];

const schema = buildFormSchema(fields);
// => z.object({
//      customers: z.array(z.object({
//        name: z.string().min(1),
//        contactNumber: z.string().min(1),
//      })).min(1)
//    })
```

### Constraints

| Config | Behavior |
|--------|----------|
| `required: true` + no `minItems` | Defaults to `.min(1)` |
| `required: true` + `minItems: N` | Uses `.min(N)` |
| `maxItems: N` | Applies `.max(N)` |
| `required: false` / omitted | Array is `.nullable().optional()` |

### Nested arrays

`field-array` fields can be nested (array within array):

```ts
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
}
```

### Rendering

`field-array` is **schema-only** — it does not render anything in `FormFields`. Array rendering is handled separately via `useFieldArray` + `namePrefix` + `index`:

```tsx
const { fields: arrayFields } = useFieldArray({ control, name: 'customers' });

{arrayFields.map((item, index) => (
  <FormFields
    key={item.id}
    fields={customerFields}  // the child fields
    namePrefix="customers"
    index={index}
  />
))}
```

## 6. Merging with Base Schema

When you have an existing Zod schema (e.g., from DTOs) and want to overlay field-driven validation:

```ts
const baseSchema = z.object({
  id: z.string(),
  name: z.string(),
  status: z.enum(['draft', 'active']),
});

const fields: FormField[] = [
  { type: 'text-input', name: 'name', label: 'Name', required: true, maxLength: 100 },
  { type: 'number-input', name: 'priority', label: 'Priority', required: true },
];

// field-wins (default): field schema overrides base on 'name'
const schema = buildFormSchema(fields, baseSchema);

// base-wins: base schema kept for 'name'
const schema = buildFormSchema(fields, baseSchema, { priority: 'base-wins' });
```

## 7. Merging Schemas Directly

Use `mergeSchemas` when combining two `ZodObject` schemas without field configs:

```ts
import { mergeSchemas } from '@/shared/components/form';

const combined = mergeSchemas(schemaA, schemaB);
const combined = mergeSchemas(schemaA, schemaB, { priority: 'base-wins' });
```

`mergeSchemas` unwraps `ZodEffects` automatically and returns a plain `ZodObject`.

## 8. Complex Forms (Hand-Written Base + Field Overrides)

For forms with arrays, discriminated unions, or other complex shapes that can't be expressed declaratively:

```ts
// 1. Hand-write the complex parts
const baseSchema = z.object({
  requestType: z.string(),
  // Discriminated union — too complex for field config
  titles: z.discriminatedUnion('collateralType', [...]),
  // Simple array — could use field-array, or hand-write
  documents: z.array(DocumentDto),
});

// 2. Use field config for the simple flat fields
const fields: FormField[] = [
  { type: 'text-input', name: 'requestType', label: 'Type', required: true },
  { type: 'text-input', name: 'notes', label: 'Notes' },
];

// 3. Merge — field-wins by default, so 'requestType' gets field constraints
const schema = buildFormSchema(fields, baseSchema);
```

## 9. Condition Operators Reference

| Operator | Description | Example |
|----------|------------|---------|
| `equals` (default) | `value === target` | `{ field: 'status', is: 'active' }` |
| `notEquals` | `value !== target` | `{ field: 'status', is: 'draft', operator: 'notEquals' }` |
| `contains` | `value` (array) includes `target` (scalar) | `{ field: 'tags', is: '99', operator: 'contains' }` |
| `notContains` | `value` (array) doesn't include `target` (scalar) | `{ field: 'tags', is: '99', operator: 'notContains' }` |
| `in` | `value` (scalar) is one of `target` (array) | `{ field: 'type', is: ['A', 'B'], operator: 'in' }` |
| `notIn` | `value` (scalar) is not in `target` (array) | `{ field: 'type', is: ['X', 'Y'], operator: 'notIn' }` |
| `isEmpty` | value is null/undefined/'' | `{ field: 'notes', operator: 'isEmpty' }` |
| `isNotEmpty` | value is truthy | `{ field: 'notes', operator: 'isNotEmpty' }` |
| `gt` | `value > target` | `{ field: 'age', is: 18, operator: 'gt' }` |
| `gte` | `value >= target` | `{ field: 'age', is: 18, operator: 'gte' }` |
| `lt` | `value < target` | `{ field: 'count', is: 100, operator: 'lt' }` |
| `lte` | `value <= target` | `{ field: 'count', is: 100, operator: 'lte' }` |

### `$root.` prefix for array fields

Inside array fields, condition fields are resolved relative to the current array item by default. Use `$root.fieldName` for absolute paths:

```ts
{
  type: 'text-input',
  name: 'details',
  label: 'Details',
  showWhen: { field: '$root.globalType', is: 'custom' }, // watches top-level field
}
```
