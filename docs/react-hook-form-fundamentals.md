# React Hook Form + Zod - Complete Fundamentals Guide

> A comprehensive guide to understanding and using React Hook Form with Zod validation in TypeScript projects.

---

## Table of Contents

1. [Understanding the Problem](#understanding-the-problem)
2. [What is Zod?](#what-is-zod)
3. [What is React Hook Form?](#what-is-react-hook-form)
4. [Connecting Zod + React Hook Form](#connecting-zod--react-hook-form)
5. [Building Forms - Simple to Complex](#building-forms---simple-to-complex)
6. [Working with Custom Components](#working-with-custom-components)
7. [Understanding z.coerce](#understanding-zcoerce)
8. [Real Examples from Our Codebase](#real-examples-from-our-codebase)
9. [Key Concepts Summary](#key-concepts-summary)
10. [Quick Reference](#quick-reference)

---

## Understanding the Problem

### Traditional Form Handling (The Old Way)

```typescript
function LoginForm() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState<any>({});

  const handleSubmit = (e) => {
    e.preventDefault();

    // Manual validation
    const newErrors: any = {};
    if (!email) newErrors.email = 'Email is required';
    if (!email.includes('@')) newErrors.email = 'Invalid email';
    if (!password) newErrors.password = 'Password is required';
    if (password.length < 8) newErrors.password = 'Min 8 characters';

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    // Submit form
    console.log({ email, password });
  };

  return (
    <form onSubmit={handleSubmit}>
      <input
        value={email}
        onChange={(e) => setEmail(e.target.value)}
      />
      {errors.email && <span>{errors.email}</span>}

      <input
        value={password}
        onChange={(e) => setPassword(e.target.value)}
      />
      {errors.password && <span>{errors.password}</span>}

      <button type="submit">Login</button>
    </form>
  );
}
```

### Problems with This Approach

1. **Too much boilerplate** - useState for each field
2. **Re-renders on every keystroke** - Whole component re-renders
3. **Manual validation** - Error-prone and repetitive
4. **No TypeScript safety** - Errors object is `any`
5. **Hard to scale** - Imagine 20+ fields!

---

## What is Zod?

**Zod is a TypeScript-first schema validation library.**

Think of it as a way to:
1. **Define the shape** of your data
2. **Validate** that data at runtime
3. **Automatically generate TypeScript types** from the schema

### Basic Zod Example

```typescript
import { z } from 'zod';

// 1. Define a schema (the "blueprint")
const UserSchema = z.object({
  email: z.string(),
  age: z.number(),
});

// 2. Validate data
const result = UserSchema.safeParse({
  email: "john@example.com",
  age: 25
});

if (result.success) {
  console.log(result.data);  // { email: "john@example.com", age: 25 }
} else {
  console.log(result.error);  // Validation errors
}

// 3. Get TypeScript type automatically
type User = z.infer<typeof UserSchema>;
// type User = { email: string; age: number; }
```

### Why Use Zod?

```typescript
// Without Zod - Manual validation
function validateUser(data: any) {
  if (typeof data.email !== 'string') throw new Error('Email must be string');
  if (!data.email.includes('@')) throw new Error('Invalid email');
  if (typeof data.age !== 'number') throw new Error('Age must be number');
  if (data.age < 0) throw new Error('Age must be positive');
  return data;
}

// With Zod - Declarative validation
const UserSchema = z.object({
  email: z.string().email('Invalid email'),
  age: z.number().positive('Age must be positive'),
});

// Validate with one line
const user = UserSchema.parse(data);  // Throws if invalid
```

### Zod Basic Building Blocks

```typescript
// Primitives
z.string()
z.number()
z.boolean()
z.date()
z.null()
z.undefined()

// Strings with validation
z.string().min(3)                    // Min length
z.string().max(10)                   // Max length
z.string().email()                   // Email format
z.string().url()                     // URL format
z.string().uuid()                    // UUID format
z.string().regex(/^\d+$/)            // Custom regex

// Numbers with validation
z.number().min(0)                    // Minimum value
z.number().max(100)                  // Maximum value
z.number().int()                     // Must be integer
z.number().positive()                // Must be > 0
z.number().negative()                // Must be < 0

// Objects
z.object({
  name: z.string(),
  age: z.number(),
})

// Arrays
z.array(z.string())                  // Array of strings
z.array(z.object({ id: z.number() })) // Array of objects

// Optional and nullable
z.string().optional()                // string | undefined
z.string().nullable()                // string | null
z.string().nullish()                 // string | null | undefined

// Default values
z.string().default('hello')          // Uses 'hello' if undefined
z.number().default(0)

// Enums
z.enum(['admin', 'user', 'guest'])   // Only these values allowed

// Unions (OR)
z.union([z.string(), z.number()])    // string OR number
z.string().or(z.number())            // Same as above

// Transformations
z.string().transform((val) => val.toLowerCase())
z.coerce.number()                    // Convert string "123" → number 123
```

### Real Example: Form Schema

```typescript
const LoginSchema = z.object({
  email: z
    .string()
    .min(1, "Email is required")
    .email("Invalid email format"),

  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .regex(/[A-Z]/, "Must contain uppercase letter")
    .regex(/[0-9]/, "Must contain number"),

  rememberMe: z.boolean().default(false),
});

// Get TypeScript type
type LoginForm = z.infer<typeof LoginSchema>;
// type LoginForm = {
//   email: string;
//   password: string;
//   rememberMe: boolean;
// }
```

---

## What is React Hook Form?

**React Hook Form is a library for managing forms with minimal re-renders.**

### Key Concepts

1. **Uncontrolled Components** - Uses refs instead of state
2. **Performance** - Only re-renders what's necessary
3. **Native Validation** - Uses browser validation when possible
4. **Minimal API** - Few core hooks to learn

### Basic Usage - Step by Step

#### Step 1: Import and Initialize

```typescript
import { useForm } from 'react-hook-form';

function MyForm() {
  const { register, handleSubmit, formState: { errors } } = useForm();

  // register: Function to register input fields
  // handleSubmit: Wrapper for your submit function
  // errors: Object containing validation errors
}
```

#### Step 2: Register Fields

```typescript
function MyForm() {
  const { register, handleSubmit } = useForm();

  return (
    <form>
      {/* register() returns: onChange, onBlur, ref, name */}
      <input {...register('email')} />
      <input {...register('password')} />
    </form>
  );
}

// Under the hood, register does this:
// {
//   onChange: (e) => { /* update form state */ },
//   onBlur: (e) => { /* trigger validation */ },
//   ref: (el) => { /* store reference */ },
//   name: 'email'
// }
```

#### Step 3: Handle Submission

```typescript
function MyForm() {
  const { register, handleSubmit } = useForm();

  const onSubmit = (data) => {
    console.log(data);  // { email: '...', password: '...' }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <input {...register('email')} />
      <input {...register('password')} />
      <button type="submit">Submit</button>
    </form>
  );
}

// handleSubmit does this:
// 1. Prevents default form submission
// 2. Validates all fields
// 3. If valid, calls your onSubmit with data
// 4. If invalid, shows errors
```

#### Step 4: Display Errors

```typescript
function MyForm() {
  const { register, handleSubmit, formState: { errors } } = useForm();

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <input {...register('email', { required: 'Email is required' })} />
      {errors.email && <span>{errors.email.message}</span>}

      <input {...register('password', {
        required: 'Password is required',
        minLength: { value: 8, message: 'Min 8 characters' }
      })} />
      {errors.password && <span>{errors.password.message}</span>}
    </form>
  );
}
```

### Core Hooks Explained

```typescript
const {
  // Field registration
  register,           // Register input fields

  // Form submission
  handleSubmit,       // Wrap your submit function

  // Reading values
  watch,              // Watch field values (causes re-render)
  getValues,          // Get values without re-render

  // Setting values
  setValue,           // Update field value
  reset,              // Reset entire form

  // Validation
  trigger,            // Manually trigger validation
  setError,           // Manually set errors
  clearErrors,        // Clear errors

  // Form state
  formState: {
    errors,           // Validation errors
    isDirty,          // Has form been modified?
    isValid,          // Is form valid?
    isSubmitting,     // Is form submitting?
    isSubmitted,      // Has form been submitted?
    touchedFields,    // Which fields were touched?
    dirtyFields,      // Which fields changed?
  },

  // Advanced
  control,            // For custom components (we use this!)
} = useForm();
```

---

## Connecting Zod + React Hook Form

This is where the magic happens! We use `zodResolver` to connect them.

### Step-by-Step Integration

#### Step 1: Create Zod Schema

```typescript
import { z } from 'zod';

const LoginSchema = z.object({
  email: z.string().email('Invalid email'),
  password: z.string().min(8, 'Min 8 characters'),
});

type LoginFormData = z.infer<typeof LoginSchema>;
```

#### Step 2: Add zodResolver to useForm

```typescript
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';

function LoginForm() {
  const { register, handleSubmit, formState: { errors } } = useForm<LoginFormData>({
    resolver: zodResolver(LoginSchema),  // ← This connects Zod!
  });

  const onSubmit = (data: LoginFormData) => {
    // data is fully typed and validated!
    console.log(data);
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <input {...register('email')} />
      {errors.email && <span>{errors.email.message}</span>}

      <input {...register('password')} type="password" />
      {errors.password && <span>{errors.password.message}</span>}

      <button type="submit">Login</button>
    </form>
  );
}
```

### What zodResolver Does

```typescript
// When form submits:
// 1. Collects all form data
// 2. Passes to Zod schema
const result = LoginSchema.safeParse(formData);

// 3. If valid:
if (result.success) {
  onSubmit(result.data);  // Call your function
}

// 4. If invalid:
else {
  // Convert Zod errors to react-hook-form format
  setErrors(result.error.format());
}
```

---

## Building Forms - Simple to Complex

### Example 1: Simple Contact Form

```typescript
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';

// 1. Define schema
const ContactSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  email: z.string().email('Invalid email'),
  message: z.string().min(10, 'Message must be at least 10 characters'),
});

type ContactFormData = z.infer<typeof ContactSchema>;

// 2. Create form component
function ContactForm() {
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting }
  } = useForm<ContactFormData>({
    resolver: zodResolver(ContactSchema),
  });

  const onSubmit = async (data: ContactFormData) => {
    console.log('Submitting:', data);
    // Call API
    await new Promise(resolve => setTimeout(resolve, 1000));
    alert('Message sent!');
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <div>
        <label>Name</label>
        <input {...register('name')} />
        {errors.name && <span>{errors.name.message}</span>}
      </div>

      <div>
        <label>Email</label>
        <input {...register('email')} />
        {errors.email && <span>{errors.email.message}</span>}
      </div>

      <div>
        <label>Message</label>
        <textarea {...register('message')} />
        {errors.message && <span>{errors.message.message}</span>}
      </div>

      <button type="submit" disabled={isSubmitting}>
        {isSubmitting ? 'Sending...' : 'Send'}
      </button>
    </form>
  );
}
```

### Example 2: Form with Nested Objects

```typescript
// Schema with nested structure
const AddressSchema = z.object({
  street: z.string(),
  city: z.string(),
  zipCode: z.string().regex(/^\d{5}$/, 'Must be 5 digits'),
});

const UserSchema = z.object({
  name: z.string(),
  email: z.string().email(),
  address: AddressSchema,  // ← Nested object
});

type UserFormData = z.infer<typeof UserSchema>;

function UserForm() {
  const { register, handleSubmit, formState: { errors } } = useForm<UserFormData>({
    resolver: zodResolver(UserSchema),
  });

  return (
    <form onSubmit={handleSubmit(console.log)}>
      <input {...register('name')} placeholder="Name" />
      <input {...register('email')} placeholder="Email" />

      {/* Nested fields use dot notation */}
      <input {...register('address.street')} placeholder="Street" />
      <input {...register('address.city')} placeholder="City" />
      <input {...register('address.zipCode')} placeholder="Zip" />
      {errors.address?.zipCode && <span>{errors.address.zipCode.message}</span>}

      <button type="submit">Submit</button>
    </form>
  );
}
```

### Example 3: Form with Arrays (Dynamic Fields)

```typescript
import { useFieldArray } from 'react-hook-form';

// Schema with array of items
const TodoSchema = z.object({
  title: z.string(),
  todos: z.array(
    z.object({
      task: z.string().min(1, 'Task is required'),
      completed: z.boolean(),
    })
  ),
});

type TodoFormData = z.infer<typeof TodoSchema>;

function TodoForm() {
  const { register, control, handleSubmit } = useForm<TodoFormData>({
    resolver: zodResolver(TodoSchema),
    defaultValues: {
      title: '',
      todos: [{ task: '', completed: false }],
    },
  });

  // useFieldArray manages array fields
  const { fields, append, remove } = useFieldArray({
    control,
    name: 'todos',
  });

  return (
    <form onSubmit={handleSubmit(console.log)}>
      <input {...register('title')} placeholder="List title" />

      {fields.map((field, index) => (
        <div key={field.id}>  {/* Use field.id, not index! */}
          <input
            {...register(`todos.${index}.task`)}
            placeholder="Task"
          />
          <input
            {...register(`todos.${index}.completed`)}
            type="checkbox"
          />
          <button type="button" onClick={() => remove(index)}>
            Remove
          </button>
        </div>
      ))}

      <button
        type="button"
        onClick={() => append({ task: '', completed: false })}
      >
        Add Todo
      </button>

      <button type="submit">Save</button>
    </form>
  );
}
```

---

## Working with Custom Components

### Problem: register() doesn't work with custom components

```typescript
// ❌ This won't work with custom components
<CustomInput {...register('email')} />

// Why? Because CustomInput might not accept onChange, onBlur, ref
```

### Solution 1: Use Controller

```typescript
import { Controller } from 'react-hook-form';

function MyForm() {
  const { control, handleSubmit } = useForm();

  return (
    <form onSubmit={handleSubmit(console.log)}>
      <Controller
        name="email"
        control={control}
        render={({ field, fieldState: { error } }) => (
          <CustomInput
            value={field.value}
            onChange={field.onChange}
            onBlur={field.onBlur}
            error={error?.message}
          />
        )}
      />
    </form>
  );
}
```

### Solution 2: Use useController (Recommended)

```typescript
import { useController } from 'react-hook-form';

function EmailField({ name, control }) {
  const {
    field,           // { value, onChange, onBlur, ref, name }
    fieldState: { error }  // { invalid, error }
  } = useController({
    name,
    control,
  });

  return (
    <CustomInput
      {...field}  // Spread all field props
      error={error?.message}
    />
  );
}
```

### Our FormSection Component Explained

```typescript
const FormSection = ({ fields, namePrefix = '', index }: FormSectionProps) => {
  // Get control from parent form
  const { control } = useFormContext();

  return (
    <>
      {fields.map(value => (
        <div className={clsx(value.wrapperClassName)} key={value.name}>
          {/* Pass control to each field */}
          <Field control={control} value={value} namePrefix={namePrefix} index={index} />
        </div>
      ))}
    </>
  );
};

const Field = ({ control, value, namePrefix, index }: FieldProps) => {
  // Build field name (supports nested objects and arrays)
  let name = value.name;
  if (index !== undefined) {
    name = `${index}.${name}`;  // For arrays: "customers.0.name"
  }
  if (namePrefix !== undefined && namePrefix.trim() !== '') {
    name = `${namePrefix}.${name}`;  // For nested: "address.street"
  }

  // useController connects this field to the form
  const {
    field,  // Contains: value, onChange, onBlur, ref, name
    fieldState: { error },  // Contains validation error
  } = useController({ name, control });

  // Render appropriate component based on type
  switch (value.type) {
    case 'text-input':
      return <TextInput {...field} {...value} error={error?.message} />;
    case 'number-input':
      return <NumberInput {...field} {...value} error={error?.message} />;
    // ... etc
  }
};
```

**How it works:**
1. Parent form provides `control` via `FormProvider`
2. `FormSection` gets `control` from context
3. Each `Field` uses `useController` to register with the form
4. `field` object contains all the props needed by the input
5. Validation errors are automatically available

---

## Understanding z.coerce

### The Problem: HTML Forms Return Strings

```typescript
<input type="number" />  {/* Value is STILL a string! */}

// When user types "42", the value is "42" (string), not 42 (number)
```

### Without z.coerce

```typescript
const Schema = z.object({
  age: z.number(),  // Expects number
});

Schema.parse({ age: "42" });  // ❌ Error: Expected number, got string
```

### With z.coerce

```typescript
const Schema = z.object({
  age: z.coerce.number(),  // Converts string → number
});

Schema.parse({ age: "42" });  // ✅ Success: { age: 42 }
Schema.parse({ age: 42 });    // ✅ Also works
Schema.parse({ age: "abc" }); // ❌ Error: Invalid number
```

### Common Coercions

```typescript
z.coerce.number()   // "123" → 123
z.coerce.boolean()  // "true" → true, "false" → false
z.coerce.date()     // "2024-01-01" → Date object
z.coerce.string()   // 123 → "123"
```

### Usage in Our Codebase

```typescript
export const LoanDetailDto = z.object({
  limitAmt: z.coerce.number().nullable(),
  // This handles:
  // - Empty string from <input type="number" /> → null
  // - "1000" → 1000
  // - 1000 → 1000
});
```

---

## Real Examples from Our Codebase

### Complete Flow Example

#### 1. Define Schema (src/shared/forms/v1.ts)

```typescript
export const RequestCustomerDto = z.object({
  name: z.string().min(1),        // Required, non-empty
  contactNumber: z.string(),      // Required
});

export const CreateRequestRequest = z.object({
  purpose: z.string(),
  hasAppraisalBook: z.boolean(),
  priority: z.string(),
  customers: z.array(RequestCustomerDto),  // Array of customers
  // ... other fields
});

export type CreateRequestRequestType = z.infer<typeof CreateRequestRequest>;
```

#### 2. Set Default Values (src/shared/forms/defaults.ts)

```typescript
export const createRequestRequestDefaults: CreateRequestRequestType = {
  purpose: '',
  hasAppraisalBook: false,
  priority: 'Normal',
  customers: [],  // Start with empty array
  // ... other defaults
};
```

#### 3. Initialize Form (src/features/request/pages/CreateRequestPage.tsx)

```typescript
const methods = useForm<CreateRequestRequestType>({
  defaultValues: createRequestRequestDefaults,
  resolver: zodResolver(CreateRequestRequest),  // Zod validates!
});
```

#### 4. Provide Context to Children

```typescript
<FormProvider {...methods}>
  <form onSubmit={handleSubmit(onSubmit)}>
    <CustomersForm />  {/* Can access form via useFormContext */}
  </form>
</FormProvider>
```

#### 5. Render Fields

```typescript
const CustomersForm = () => {
  return (
    <>
      <SectionHeader title="Customers" />
      <FormTable headers={customersTableHeader} name={'customers'} />
    </>
  );
};
```

#### 6. Submit Form

```typescript
const onSubmit: SubmitHandler<CreateRequestRequestType> = data => {
  // data is validated by Zod and fully typed!
  mutate(data);  // Send to API
};
```

---

## Key Concepts Summary

### Zod
- Defines data structure (schema)
- Validates data at runtime
- Generates TypeScript types
- Use `.parse()` to validate (throws on error)
- Use `.safeParse()` to validate (returns result object)

### React Hook Form
- Manages form state efficiently
- Uses refs (uncontrolled) for performance
- Provides `register` for simple inputs
- Provides `control` + `useController` for custom components
- Handles validation and errors

### @hookform/resolvers
- Bridges Zod and React Hook Form
- `zodResolver` converts Zod errors to form errors
- Enables type-safe forms

### Key Hooks
- `useForm()` - Initialize form
- `useFormContext()` - Access form from children
- `useController()` - Connect custom components
- `useFieldArray()` - Manage dynamic arrays
- `useWatch()` - Watch field values

---

## Quick Reference

### Basic Form Setup

```typescript
// 1. Schema
const schema = z.object({
  email: z.string().email(),
});

// 2. Type
type FormData = z.infer<typeof schema>;

// 3. Form
const methods = useForm<FormData>({
  resolver: zodResolver(schema),
  defaultValues: { email: '' },
});

// 4. Submit
const onSubmit = (data: FormData) => {
  console.log(data);
};

// 5. Render
<form onSubmit={methods.handleSubmit(onSubmit)}>
  <input {...methods.register('email')} />
  <button type="submit">Submit</button>
</form>
```

### With Custom Components

```typescript
const { field, fieldState: { error } } = useController({
  name: 'email',
  control,
});

<CustomInput {...field} error={error?.message} />
```

### With Arrays

```typescript
const { fields, append, remove } = useFieldArray({
  control,
  name: 'items',
});

{fields.map((field, index) => (
  <div key={field.id}>
    <input {...register(`items.${index}.name`)} />
  </div>
))}
```

### Form Validation Modes

```typescript
useForm({
  mode: 'onBlur',      // ✅ BEST: Validate when field loses focus
  mode: 'onChange',    // ⚠️  Validates on every keystroke
  mode: 'onSubmit',    // ❌ Only validates on submit
  mode: 'onTouched',   // ✅ GOOD: After field is touched
  mode: 'all',         // Validates onChange + onBlur

  reValidateMode: 'onChange',  // How to revalidate after first error
});
```

### Advanced Zod Validation

```typescript
// Custom validation
z.string().refine((val) => val.length >= 3, {
  message: "Must be at least 3 characters"
})

// Conditional validation
z.object({
  hasAppraisalBook: z.boolean(),
  appraisalBookNo: z.string().optional(),
}).refine((data) => {
  if (data.hasAppraisalBook) {
    return data.appraisalBookNo && data.appraisalBookNo.length > 0;
  }
  return true;
}, {
  message: "Appraisal book number required when book exists",
  path: ["appraisalBookNo"],
})

// Number constraints
z.coerce.number()
  .min(0, "Must be positive")
  .max(1000000, "Cannot exceed 1M")
  .int("Must be an integer")
```

---

## Best Practices

### ✅ DO

1. **Use TypeScript** - Always infer types from Zod schemas
2. **Separate concerns** - Keep schemas, defaults, and API calls in separate files
3. **Use z.coerce** - For number inputs from HTML forms
4. **Use mode: 'onBlur'** - Better UX than onChange
5. **Use field.id** - For dynamic array keys, not index
6. **Handle loading states** - Show spinner during mutation
7. **Use useController** - For better performance with custom components
8. **Validate early** - Use Zod's .refine() for complex rules

### ❌ DON'T

1. **Don't use mode: 'onChange'** - Unless necessary (performance hit)
2. **Don't ignore errors** - Always display validation errors
3. **Don't mutate form state directly** - Use setValue, reset, etc.
4. **Don't forget to reset** - After successful submission
5. **Don't use index as key** - In field arrays
6. **Don't over-validate** - Balance UX with validation strictness
7. **Don't forget .nullable()** - For optional fields that can be null
8. **Don't duplicate schemas** - Reuse and compose

---

## Additional Resources

- [React Hook Form Documentation](https://react-hook-form.com/)
- [Zod Documentation](https://zod.dev/)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/handbook/intro.html)

---

**Last Updated:** 2024-11-30
