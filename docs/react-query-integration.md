# React Query + React Hook Form Integration Guide

> Complete guide to integrating React Query (TanStack Query) with React Hook Form for powerful form handling with server state management.

---

## Table of Contents

1. [Why Integrate React Query with Forms?](#why-integrate-react-query-with-forms)
2. [Basic Concepts](#basic-concepts)
3. [Form Submission with Mutations](#form-submission-with-mutations)
4. [Loading Initial Data](#loading-initial-data)
5. [Optimistic Updates](#optimistic-updates)
6. [Error Handling](#error-handling)
7. [Server-Side Validation](#server-side-validation)
8. [Multi-Step Forms with Drafts](#multi-step-forms-with-drafts)
9. [Real-World Patterns](#real-world-patterns)
10. [Best Practices](#best-practices)

---

## Why Integrate React Query with Forms?

### Problems React Query Solves

1. **Server State Management** - Handle loading, error, and success states
2. **Cache Management** - Automatically update lists after mutations
3. **Optimistic Updates** - Update UI before server responds
4. **Retry Logic** - Automatically retry failed requests
5. **Deduplication** - Prevent duplicate requests
6. **Background Refetching** - Keep data fresh

### The Stack

```
User Input → React Hook Form → Validation (Zod) → React Query → API → Server
                ↓                                        ↓
            Form State                            Server State
```

---

## Basic Concepts

### React Query Core Hooks

```typescript
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

// Fetching data (GET)
const { data, isLoading, error } = useQuery({
  queryKey: ['users'],           // Unique identifier
  queryFn: fetchUsers,            // Function that returns a promise
});

// Mutating data (POST, PUT, DELETE)
const { mutate, isPending } = useMutation({
  mutationFn: createUser,         // Function that returns a promise
  onSuccess: (data) => {          // Called on success
    console.log('Created:', data);
  },
});

// Query client for cache management
const queryClient = useQueryClient();
queryClient.invalidateQueries({ queryKey: ['users'] }); // Refetch
```

---

## Form Submission with Mutations

### Pattern 1: Basic Form Submission

```typescript
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation } from '@tanstack/react-query';
import axios from 'axios';

// 1. Define schema
const UserSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  email: z.string().email('Invalid email'),
});

type UserFormData = z.infer<typeof UserSchema>;

// 2. API function
const createUser = async (data: UserFormData) => {
  const response = await axios.post('/api/users', data);
  return response.data;
};

// 3. Form component
function CreateUserForm() {
  const methods = useForm<UserFormData>({
    resolver: zodResolver(UserSchema),
    defaultValues: { name: '', email: '' },
  });

  // 4. React Query mutation
  const { mutate, isPending, isError, error } = useMutation({
    mutationFn: createUser,
    onSuccess: (data) => {
      console.log('User created:', data);
      methods.reset(); // Reset form on success
    },
  });

  // 5. Form submission handler
  const onSubmit = (data: UserFormData) => {
    mutate(data);
  };

  return (
    <form onSubmit={methods.handleSubmit(onSubmit)}>
      <input {...methods.register('name')} />
      {methods.formState.errors.name && <span>{methods.formState.errors.name.message}</span>}

      <input {...methods.register('email')} />
      {methods.formState.errors.email && <span>{methods.formState.errors.email.message}</span>}

      {isError && <div className="error">{error.message}</div>}

      <button type="submit" disabled={isPending}>
        {isPending ? 'Creating...' : 'Create User'}
      </button>
    </form>
  );
}
```

### Pattern 2: With Cache Invalidation (Our Pattern)

```typescript
import { useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';

function CreateUserForm() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const methods = useForm<UserFormData>({
    resolver: zodResolver(UserSchema),
  });

  const { mutate, isPending } = useMutation({
    mutationFn: createUser,
    onSuccess: (data) => {
      // 1. Invalidate queries to refetch fresh data
      queryClient.invalidateQueries({ queryKey: ['users'] });

      // 2. Show success message
      toast.success('User created successfully!');

      // 3. Navigate to detail page
      navigate(`/users/${data.id}`);

      // 4. Reset form
      methods.reset();
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to create user');
    },
  });

  const onSubmit = (data: UserFormData) => {
    mutate(data);
  };

  return (
    <form onSubmit={methods.handleSubmit(onSubmit)}>
      {/* Form fields */}
      <button type="submit" disabled={isPending}>
        {isPending ? 'Creating...' : 'Create'}
      </button>
    </form>
  );
}
```

### Pattern 3: Our Codebase Pattern

Based on `src/features/request/api.ts` and `CreateRequestPage.tsx`:

```typescript
// api.ts - Custom hook for mutation
export const useCreateRequest = () => {
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  return useMutation({
    mutationFn: async (request: CreateRequestRequestType): Promise<CreateRequestResponseType> => {
      const { data } = await axios.post('/requests', request);
      return data;
    },
    onSuccess: (data) => {
      // Invalidate and refetch requests list
      queryClient.invalidateQueries({ queryKey: ['requests'] });

      // Show success notification
      toast.success('Request created successfully!');

      // Navigate to request detail
      navigate(`/requests/${data.id}`);
    },
    onError: (error: any) => {
      // Handle error
      const message = error.response?.data?.message || 'Failed to create request';
      toast.error(message);
    },
  });
};

// CreateRequestPage.tsx - Usage in component
function CreateRequestPage() {
  const methods = useForm<CreateRequestRequestType>({
    defaultValues: createRequestRequestDefaults,
    resolver: zodResolver(CreateRequestRequest),
  });

  const { mutate, isPending } = useCreateRequest();

  const onSubmit: SubmitHandler<CreateRequestRequestType> = (data) => {
    mutate(data);
  };

  return (
    <FormProvider {...methods}>
      <form onSubmit={methods.handleSubmit(onSubmit)}>
        <CustomersForm />
        <RequestForm />
        {/* Other forms */}

        <button type="submit" disabled={isPending}>
          {isPending ? 'Saving...' : 'Save'}
        </button>
      </form>
    </FormProvider>
  );
}
```

---

## Loading Initial Data

### Pattern 1: Edit Form with Query

```typescript
import { useQuery } from '@tanstack/react-query';
import { useEffect } from 'react';

function EditUserForm({ userId }: { userId: number }) {
  const methods = useForm<UserFormData>({
    resolver: zodResolver(UserSchema),
  });

  // Fetch user data
  const { data, isLoading } = useQuery({
    queryKey: ['user', userId],
    queryFn: () => fetchUser(userId),
  });

  // Update form when data loads
  useEffect(() => {
    if (data) {
      methods.reset(data); // Populate form with fetched data
    }
  }, [data, methods]);

  const { mutate, isPending } = useMutation({
    mutationFn: (formData: UserFormData) => updateUser(userId, formData),
    onSuccess: () => {
      toast.success('User updated!');
    },
  });

  if (isLoading) {
    return <div>Loading...</div>;
  }

  return (
    <form onSubmit={methods.handleSubmit((data) => mutate(data))}>
      {/* Form fields */}
    </form>
  );
}
```

### Pattern 2: With Skeleton Loading

```typescript
function EditUserForm({ userId }: { userId: number }) {
  const methods = useForm<UserFormData>({
    resolver: zodResolver(UserSchema),
  });

  const { data, isLoading } = useQuery({
    queryKey: ['user', userId],
    queryFn: () => fetchUser(userId),
  });

  useEffect(() => {
    if (data) {
      methods.reset(data);
    }
  }, [data, methods]);

  const { mutate, isPending } = useMutation({
    mutationFn: (formData: UserFormData) => updateUser(userId, formData),
  });

  return (
    <form onSubmit={methods.handleSubmit((data) => mutate(data))}>
      {isLoading ? (
        <>
          <Skeleton height={40} />
          <Skeleton height={40} />
          <Skeleton height={100} />
        </>
      ) : (
        <>
          <input {...methods.register('name')} />
          <input {...methods.register('email')} />
          <textarea {...methods.register('bio')} />
        </>
      )}

      <button type="submit" disabled={isPending || isLoading}>
        {isPending ? 'Updating...' : 'Update'}
      </button>
    </form>
  );
}
```

### Pattern 3: Default Values from Query

```typescript
function EditUserForm({ userId }: { userId: number }) {
  const { data } = useQuery({
    queryKey: ['user', userId],
    queryFn: () => fetchUser(userId),
  });

  // Pass data as default values directly
  const methods = useForm<UserFormData>({
    resolver: zodResolver(UserSchema),
    values: data, // ✅ Automatically updates when data changes
  });

  // No need for useEffect!

  return <form>{/* Form fields */}</form>;
}
```

---

## Optimistic Updates

Optimistic updates make your UI feel instant by updating the cache before the server responds.

### Pattern 1: Basic Optimistic Update

```typescript
function TodoList() {
  const queryClient = useQueryClient();

  const { mutate } = useMutation({
    mutationFn: toggleTodo,
    // Before mutation runs
    onMutate: async (todoId) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: ['todos'] });

      // Snapshot current value
      const previousTodos = queryClient.getQueryData(['todos']);

      // Optimistically update
      queryClient.setQueryData(['todos'], (old: Todo[]) => {
        return old.map((todo) =>
          todo.id === todoId ? { ...todo, completed: !todo.completed } : todo
        );
      });

      // Return context with snapshot
      return { previousTodos };
    },
    // If mutation fails, rollback
    onError: (err, todoId, context) => {
      queryClient.setQueryData(['todos'], context?.previousTodos);
      toast.error('Failed to update todo');
    },
    // Always refetch after error or success
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['todos'] });
    },
  });

  return (
    <div>
      {/* Render todos */}
    </div>
  );
}
```

### Pattern 2: Optimistic Create

```typescript
function CreateTodoForm() {
  const queryClient = useQueryClient();
  const methods = useForm<TodoFormData>({
    resolver: zodResolver(TodoSchema),
  });

  const { mutate } = useMutation({
    mutationFn: createTodo,
    onMutate: async (newTodo) => {
      await queryClient.cancelQueries({ queryKey: ['todos'] });

      const previousTodos = queryClient.getQueryData(['todos']);

      // Add optimistic todo with temporary ID
      queryClient.setQueryData(['todos'], (old: Todo[] = []) => [
        ...old,
        { ...newTodo, id: 'temp-' + Date.now(), createdAt: new Date() },
      ]);

      return { previousTodos };
    },
    onSuccess: (data) => {
      // Replace temp todo with real one
      queryClient.setQueryData(['todos'], (old: Todo[]) =>
        old.map((todo) => (todo.id.toString().startsWith('temp-') ? data : todo))
      );
      methods.reset();
    },
    onError: (err, newTodo, context) => {
      queryClient.setQueryData(['todos'], context?.previousTodos);
    },
  });

  return <form onSubmit={methods.handleSubmit((data) => mutate(data))}>{/* Form */}</form>;
}
```

---

## Error Handling

### Pattern 1: Display Server Errors

```typescript
function CreateUserForm() {
  const methods = useForm<UserFormData>({
    resolver: zodResolver(UserSchema),
  });

  const { mutate, isPending, isError, error } = useMutation({
    mutationFn: createUser,
  });

  return (
    <form onSubmit={methods.handleSubmit((data) => mutate(data))}>
      {/* Form fields */}

      {/* Display mutation error */}
      {isError && (
        <div className="error-banner">
          {error instanceof Error ? error.message : 'An error occurred'}
        </div>
      )}

      <button type="submit" disabled={isPending}>
        Submit
      </button>
    </form>
  );
}
```

### Pattern 2: Map Server Errors to Form Fields

```typescript
function CreateUserForm() {
  const methods = useForm<UserFormData>({
    resolver: zodResolver(UserSchema),
  });

  const { mutate, isPending } = useMutation({
    mutationFn: createUser,
    onError: (error: any) => {
      // Server returns field-specific errors
      if (error.response?.data?.errors) {
        // Example: { email: "Email already exists", name: "Name too short" }
        Object.entries(error.response.data.errors).forEach(([field, message]) => {
          methods.setError(field as keyof UserFormData, {
            type: 'server',
            message: message as string,
          });
        });
      } else {
        // Generic error
        toast.error(error.message || 'Something went wrong');
      }
    },
  });

  return (
    <form onSubmit={methods.handleSubmit((data) => mutate(data))}>
      <input {...methods.register('name')} />
      {methods.formState.errors.name && <span>{methods.formState.errors.name.message}</span>}

      <input {...methods.register('email')} />
      {methods.formState.errors.email && <span>{methods.formState.errors.email.message}</span>}

      <button type="submit" disabled={isPending}>
        Submit
      </button>
    </form>
  );
}
```

### Pattern 3: Retry Logic

```typescript
const { mutate } = useMutation({
  mutationFn: createUser,
  retry: 3, // Retry failed requests 3 times
  retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000), // Exponential backoff
  onError: (error, variables, context) => {
    console.log('Failed after 3 retries');
  },
});
```

---

## Server-Side Validation

### Complete Example

```typescript
// API Response Type
interface ValidationError {
  field: string;
  message: string;
}

interface ApiError {
  message: string;
  errors?: ValidationError[];
}

function CreateUserForm() {
  const methods = useForm<UserFormData>({
    resolver: zodResolver(UserSchema),
  });

  const { mutate, isPending } = useMutation({
    mutationFn: createUser,
    onSuccess: (data) => {
      toast.success('User created!');
      methods.reset();
    },
    onError: (error: AxiosError<ApiError>) => {
      if (error.response?.data?.errors) {
        // Map field errors to form
        error.response.data.errors.forEach((err) => {
          methods.setError(err.field as keyof UserFormData, {
            type: 'server',
            message: err.message,
          });
        });
      } else {
        // Show general error
        toast.error(error.response?.data?.message || 'Failed to create user');
      }
    },
  });

  return (
    <form onSubmit={methods.handleSubmit((data) => mutate(data))}>
      <input {...methods.register('email')} />
      {methods.formState.errors.email && (
        <span className="error">{methods.formState.errors.email.message}</span>
      )}

      <button type="submit" disabled={isPending}>
        {isPending ? 'Creating...' : 'Create'}
      </button>
    </form>
  );
}
```

---

## Multi-Step Forms with Drafts

### Pattern: Auto-save Drafts

```typescript
function MultiStepRequestForm() {
  const [step, setStep] = useState(1);
  const methods = useForm<CreateRequestRequestType>({
    defaultValues: createRequestRequestDefaults,
    resolver: zodResolver(CreateRequestRequest),
  });

  // Auto-save draft mutation
  const { mutate: saveDraft } = useMutation({
    mutationFn: async (data: CreateRequestRequestType) => {
      const { data: response } = await axios.post('/requests/draft', data);
      return response;
    },
    onSuccess: () => {
      toast.success('Draft saved');
    },
  });

  // Final submit mutation
  const { mutate: submitFinal, isPending } = useMutation({
    mutationFn: async (data: CreateRequestRequestType) => {
      const { data: response } = await axios.post('/requests', data);
      return response;
    },
    onSuccess: (data) => {
      toast.success('Request created!');
      navigate(`/requests/${data.id}`);
    },
  });

  // Watch form changes and auto-save
  useEffect(() => {
    const subscription = methods.watch(() => {
      const timeout = setTimeout(() => {
        const data = methods.getValues();
        saveDraft(data);
      }, 2000); // Debounce 2 seconds

      return () => clearTimeout(timeout);
    });

    return () => subscription.unsubscribe();
  }, [methods, saveDraft]);

  const onSubmit = (data: CreateRequestRequestType) => {
    if (step < 3) {
      setStep(step + 1);
    } else {
      submitFinal(data);
    }
  };

  return (
    <FormProvider {...methods}>
      <form onSubmit={methods.handleSubmit(onSubmit)}>
        {step === 1 && <Step1Fields />}
        {step === 2 && <Step2Fields />}
        {step === 3 && <Step3Fields />}

        <button type="submit" disabled={isPending}>
          {step < 3 ? 'Next' : isPending ? 'Submitting...' : 'Submit'}
        </button>
      </form>
    </FormProvider>
  );
}
```

---

## Real-World Patterns

### Pattern 1: File Upload with Progress

```typescript
function FileUploadForm() {
  const [uploadProgress, setUploadProgress] = useState(0);
  const methods = useForm<FileFormData>({
    resolver: zodResolver(FileSchema),
  });

  const { mutate, isPending } = useMutation({
    mutationFn: async (formData: FormData) => {
      const { data } = await axios.post('/upload', formData, {
        onUploadProgress: (progressEvent) => {
          const percentCompleted = Math.round(
            (progressEvent.loaded * 100) / (progressEvent.total || 1)
          );
          setUploadProgress(percentCompleted);
        },
      });
      return data;
    },
    onSuccess: () => {
      toast.success('File uploaded!');
      setUploadProgress(0);
      methods.reset();
    },
  });

  const onSubmit = (data: FileFormData) => {
    const formData = new FormData();
    formData.append('file', data.file[0]);
    formData.append('description', data.description);
    mutate(formData);
  };

  return (
    <form onSubmit={methods.handleSubmit(onSubmit)}>
      <input type="file" {...methods.register('file')} />
      <input {...methods.register('description')} />

      {isPending && (
        <div className="progress-bar">
          <div style={{ width: `${uploadProgress}%` }}>{uploadProgress}%</div>
        </div>
      )}

      <button type="submit" disabled={isPending}>
        {isPending ? 'Uploading...' : 'Upload'}
      </button>
    </form>
  );
}
```

### Pattern 2: Dependent Dropdowns

```typescript
function AddressForm() {
  const methods = useForm<AddressFormData>({
    resolver: zodResolver(AddressSchema),
  });

  const province = methods.watch('province');

  // Districts query depends on province
  const { data: districts, isLoading: loadingDistricts } = useQuery({
    queryKey: ['districts', province],
    queryFn: () => fetchDistricts(province),
    enabled: !!province, // Only run when province is selected
  });

  const district = methods.watch('district');

  // Sub-districts query depends on district
  const { data: subDistricts, isLoading: loadingSubDistricts } = useQuery({
    queryKey: ['subDistricts', district],
    queryFn: () => fetchSubDistricts(district),
    enabled: !!district,
  });

  // Reset dependent fields when parent changes
  useEffect(() => {
    methods.setValue('district', '');
    methods.setValue('subDistrict', '');
  }, [province, methods]);

  useEffect(() => {
    methods.setValue('subDistrict', '');
  }, [district, methods]);

  return (
    <form>
      <select {...methods.register('province')}>
        <option value="">Select Province</option>
        {/* Options */}
      </select>

      <select {...methods.register('district')} disabled={!province || loadingDistricts}>
        <option value="">Select District</option>
        {districts?.map((d) => (
          <option key={d.id} value={d.id}>
            {d.name}
          </option>
        ))}
      </select>

      <select {...methods.register('subDistrict')} disabled={!district || loadingSubDistricts}>
        <option value="">Select Sub-district</option>
        {subDistricts?.map((s) => (
          <option key={s.id} value={s.id}>
            {s.name}
          </option>
        ))}
      </select>
    </form>
  );
}
```

### Pattern 3: Infinite Scroll with Form

```typescript
function SearchableUserList() {
  const methods = useForm<SearchFormData>({
    defaultValues: { search: '' },
  });

  const searchTerm = methods.watch('search');

  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useInfiniteQuery({
    queryKey: ['users', searchTerm],
    queryFn: ({ pageParam = 0 }) => fetchUsers({ page: pageParam, search: searchTerm }),
    getNextPageParam: (lastPage) => lastPage.nextPage,
    initialPageParam: 0,
  });

  return (
    <div>
      <form>
        <input
          {...methods.register('search')}
          placeholder="Search users..."
        />
      </form>

      <div>
        {data?.pages.map((page) =>
          page.users.map((user) => <UserCard key={user.id} user={user} />)
        )}
      </div>

      {hasNextPage && (
        <button onClick={() => fetchNextPage()} disabled={isFetchingNextPage}>
          {isFetchingNextPage ? 'Loading...' : 'Load More'}
        </button>
      )}
    </div>
  );
}
```

---

## Best Practices

### ✅ DO

1. **Extract mutation logic** - Create custom hooks like `useCreateRequest()`
2. **Invalidate queries** - Always invalidate after mutations
3. **Handle loading states** - Show spinners/skeletons during loading
4. **Use optimistic updates** - For better UX on fast operations
5. **Map server errors** - Convert API errors to form field errors
6. **Reset forms** - Clear form after successful submission
7. **Debounce auto-save** - Don't save on every keystroke
8. **Use enabled option** - For dependent queries
9. **Cancel queries** - Before optimistic updates
10. **Show success feedback** - Toast notifications or redirects

### ❌ DON'T

1. **Don't ignore errors** - Always handle onError
2. **Don't forget to invalidate** - Stale data will persist
3. **Don't over-optimistic update** - Only for fast operations
4. **Don't block the UI** - Show loading states properly
5. **Don't forget retry logic** - For network-dependent operations
6. **Don't mutate cache directly** - Use setQueryData
7. **Don't forget cleanup** - Unsubscribe from watchers
8. **Don't skip error boundaries** - Catch unexpected errors
9. **Don't duplicate keys** - Use consistent queryKey patterns
10. **Don't forget TypeScript** - Type your API responses

---

## Query Key Patterns

```typescript
// ✅ GOOD: Hierarchical keys
['users']                    // All users
['users', userId]            // Single user
['users', userId, 'posts']   // User's posts
['users', { role: 'admin' }] // Filtered users

// ❌ BAD: Flat keys
['allUsers']
['singleUser']
['userPosts']

// ✅ GOOD: Invalidate all user-related queries
queryClient.invalidateQueries({ queryKey: ['users'] });

// ✅ GOOD: Invalidate specific user
queryClient.invalidateQueries({ queryKey: ['users', userId] });
```

---

## Complete Example: CRUD Operations

```typescript
// hooks/useUsers.ts
export const useUsers = () => {
  return useQuery({
    queryKey: ['users'],
    queryFn: fetchUsers,
  });
};

export const useCreateUser = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createUser,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      toast.success('User created!');
    },
  });
};

export const useUpdateUser = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: UserFormData }) =>
      updateUser(id, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      queryClient.invalidateQueries({ queryKey: ['users', variables.id] });
      toast.success('User updated!');
    },
  });
};

export const useDeleteUser = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: deleteUser,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      toast.success('User deleted!');
    },
  });
};

// components/UserForm.tsx
function UserForm({ userId }: { userId?: number }) {
  const isEditMode = !!userId;

  const { data: user } = useQuery({
    queryKey: ['users', userId],
    queryFn: () => fetchUser(userId!),
    enabled: isEditMode,
  });

  const methods = useForm<UserFormData>({
    resolver: zodResolver(UserSchema),
    values: user, // Auto-populate in edit mode
  });

  const createMutation = useCreateUser();
  const updateMutation = useUpdateUser();

  const onSubmit = (data: UserFormData) => {
    if (isEditMode) {
      updateMutation.mutate({ id: userId, data });
    } else {
      createMutation.mutate(data);
    }
  };

  const isPending = createMutation.isPending || updateMutation.isPending;

  return (
    <form onSubmit={methods.handleSubmit(onSubmit)}>
      <input {...methods.register('name')} />
      <input {...methods.register('email')} />

      <button type="submit" disabled={isPending}>
        {isPending ? 'Saving...' : isEditMode ? 'Update' : 'Create'}
      </button>
    </form>
  );
}
```

---

## Additional Resources

- [TanStack Query Documentation](https://tanstack.com/query/latest)
- [React Hook Form Documentation](https://react-hook-form.com/)
- [Optimistic Updates Guide](https://tanstack.com/query/latest/docs/react/guides/optimistic-updates)

---

**Last Updated:** 2024-11-30
