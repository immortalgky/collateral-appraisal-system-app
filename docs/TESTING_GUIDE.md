# Testing Guide

A comprehensive guide to testing in this React project using Vitest, React Testing Library, MSW, and Playwright.

---

## Table of Contents

1. [Testing Stack Overview](#testing-stack-overview)
2. [Project Structure](#project-structure)
3. [Running Tests](#running-tests)
4. [Topic 1: Utility Function Tests](#topic-1-utility-function-tests)
5. [Topic 2: Zustand Store Tests](#topic-2-zustand-store-tests)
6. [Topic 3: Custom Hook Tests](#topic-3-custom-hook-tests)
7. [Topic 4: Component Tests](#topic-4-component-tests)
8. [Topic 5: Form Input Tests](#topic-5-form-input-tests)
9. [Topic 6: Dropdown/Select Tests](#topic-6-dropdownselect-tests)
10. [Topic 7: Modal Tests](#topic-7-modal-tests)
11. [Topic 8: React Hook Form Tests](#topic-8-react-hook-form-tests)
12. [Topic 9: API Hooks with MSW](#topic-9-api-hooks-with-msw)
13. [Topic 10: Component with API Tests](#topic-10-component-with-api-tests)
14. [Topic 11: E2E Tests with Playwright](#topic-11-e2e-tests-with-playwright)
15. [Best Practices](#best-practices)
16. [Common Patterns](#common-patterns)
17. [Troubleshooting](#troubleshooting)

---

## Testing Stack Overview

| Tool | Purpose | When to Use |
|------|---------|-------------|
| **Vitest** | Test runner | All unit/integration tests |
| **React Testing Library** | Component testing | Testing React components |
| **MSW (Mock Service Worker)** | API mocking | Mocking HTTP requests |
| **Playwright** | E2E testing | Full browser testing |
| **@testing-library/user-event** | User interactions | Simulating clicks, typing |

### Why These Tools?

- **Vitest**: Native Vite integration, fast, compatible with Jest API
- **React Testing Library**: Tests behavior, not implementation
- **MSW**: Intercepts real network requests, works in browser and Node
- **Playwright**: Modern, fast, reliable browser automation

---

## Project Structure

```
src/
├── test/
│   ├── setup.ts          # Global test setup, mocks
│   ├── test-utils.tsx    # Custom render with providers
│   ├── vitest.d.ts       # TypeScript declarations
│   └── mocks/
│       ├── handlers.ts   # MSW request handlers
│       └── server.ts     # MSW server setup
├── shared/
│   ├── utils/
│   │   └── objectUtils.test.ts      # Topic 1
│   ├── store.test.ts                # Topic 2
│   ├── hooks/
│   │   └── useDisclosure.test.ts    # Topic 3
│   └── components/
│       ├── Button.test.tsx          # Topic 4
│       ├── Modal.test.tsx           # Topic 7
│       └── inputs/
│           ├── TextInput.test.tsx   # Topic 5
│           ├── NumberInput.test.tsx # Topic 5
│           └── Dropdown.test.tsx    # Topic 6
├── features/
│   ├── request/
│   │   ├── api.test.tsx             # Topic 9
│   │   └── forms/
│   │       └── AddressForm.test.tsx # Topic 8
│   └── dashboard/
│       └── components/
│           └── DashboardSummary.test.tsx  # Topic 10
e2e/
└── smoke.spec.ts                    # Topic 11
```

---

## Running Tests

```bash
# Run tests in watch mode (development)
npm test

# Run tests once (CI)
npm run test:run

# Run with coverage report
npm run test:coverage

# Run specific test file
npm run test:run -- src/shared/store.test.ts

# Run tests matching pattern
npm run test:run -- --grep "should render"

# Run E2E tests
npm run e2e

# Run E2E with UI
npm run e2e:ui

# Run E2E in headed mode (see browser)
npm run e2e:headed
```

---

## Topic 1: Utility Function Tests

**File:** `src/shared/utils/objectUtils.test.ts`

### What You Need to Know

- Pure functions are the easiest to test
- Test inputs → outputs
- Cover edge cases (null, undefined, empty)
- Test error throwing

### Pattern

```typescript
import { describe, it, expect } from 'vitest';
import { myFunction } from './myUtils';

describe('myFunction', () => {
  // Test normal case
  it('should return expected output for valid input', () => {
    const result = myFunction({ key: 'value' });
    expect(result).toBe('expected');
  });

  // Test edge cases
  it('should handle empty input', () => {
    expect(myFunction({})).toBe(null);
  });

  it('should handle null', () => {
    expect(myFunction(null)).toBe(null);
  });

  // Test error throwing
  it('should throw error for invalid input', () => {
    expect(() => myFunction('invalid')).toThrow('Invalid input');
  });
});
```

### Common Assertions

```typescript
expect(result).toBe(value);           // Exact equality (===)
expect(result).toEqual(object);       // Deep equality
expect(result).toBeTruthy();          // Truthy value
expect(result).toBeFalsy();           // Falsy value
expect(result).toBeNull();            // null
expect(result).toBeUndefined();       // undefined
expect(result).toContain(item);       // Array/string contains
expect(result).toHaveLength(3);       // Array/string length
expect(() => fn()).toThrow();         // Function throws
expect(() => fn()).toThrow('message'); // Throws with message
```

---

## Topic 2: Zustand Store Tests

**File:** `src/shared/store.test.ts`

### What You Need to Know

- Test initial state
- Test each action independently
- Reset store between tests
- Test computed/derived values

### Pattern

```typescript
import { describe, it, expect, beforeEach } from 'vitest';
import { useMyStore } from './store';

describe('useMyStore', () => {
  // Reset store before each test
  beforeEach(() => {
    useMyStore.setState({
      count: 0,
      items: [],
    });
  });

  describe('initial state', () => {
    it('should have correct initial values', () => {
      const state = useMyStore.getState();
      expect(state.count).toBe(0);
      expect(state.items).toEqual([]);
    });
  });

  describe('actions', () => {
    it('should increment count', () => {
      const { increment } = useMyStore.getState();
      increment();
      expect(useMyStore.getState().count).toBe(1);
    });

    it('should add item', () => {
      const { addItem } = useMyStore.getState();
      addItem({ id: 1, name: 'Test' });
      expect(useMyStore.getState().items).toHaveLength(1);
    });
  });
});
```

### Key Points

1. **Always reset state** in `beforeEach` to avoid test pollution
2. **Use `getState()`** to read current state
3. **Use `setState()`** to set state directly in tests
4. **Test actions in isolation** - one action per test

---

## Topic 3: Custom Hook Tests

**File:** `src/shared/hooks/useDisclosure.test.ts`

### What You Need to Know

- Use `renderHook` from `@testing-library/react`
- Access hook return value via `result.current`
- Wrap state changes in `act()`
- Test callback stability with `useCallback`

### Pattern

```typescript
import { describe, it, expect } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useMyHook } from './useMyHook';

describe('useMyHook', () => {
  it('should return initial state', () => {
    const { result } = renderHook(() => useMyHook());
    expect(result.current.value).toBe(0);
  });

  it('should update state when action is called', () => {
    const { result } = renderHook(() => useMyHook());

    act(() => {
      result.current.increment();
    });

    expect(result.current.value).toBe(1);
  });

  it('should accept initial value', () => {
    const { result } = renderHook(() => useMyHook(10));
    expect(result.current.value).toBe(10);
  });

  // Test callback stability
  it('should maintain callback reference', () => {
    const { result, rerender } = renderHook(() => useMyHook());
    const firstCallback = result.current.increment;

    rerender();

    expect(result.current.increment).toBe(firstCallback);
  });
});
```

### When to Use `act()`

```typescript
// Use act() when:
// 1. Calling functions that update state
act(() => {
  result.current.setValue(5);
});

// 2. Triggering effects
act(() => {
  result.current.fetchData();
});

// DON'T need act() when:
// - Just reading values
const value = result.current.value; // No act needed
```

---

## Topic 4: Component Tests

**File:** `src/shared/components/Button.test.tsx`

### What You Need to Know

- Use custom `render` from test-utils (includes providers)
- Query elements by role, text, or testid
- Use `user.click()`, `user.type()` for interactions
- Test different states (loading, disabled, variants)

### Pattern

```typescript
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@/test/test-utils';
import MyComponent from './MyComponent';

describe('MyComponent', () => {
  // Rendering tests
  describe('rendering', () => {
    it('should render with children', () => {
      render(<MyComponent>Hello</MyComponent>);
      expect(screen.getByText('Hello')).toBeInTheDocument();
    });

    it('should render with different variants', () => {
      render(<MyComponent variant="primary">Click me</MyComponent>);
      const button = screen.getByRole('button');
      expect(button).toHaveClass('btn-primary');
    });
  });

  // Interaction tests
  describe('interactions', () => {
    it('should call onClick when clicked', async () => {
      const handleClick = vi.fn();
      const { user } = render(
        <MyComponent onClick={handleClick}>Click me</MyComponent>
      );

      await user.click(screen.getByRole('button'));

      expect(handleClick).toHaveBeenCalledTimes(1);
    });

    it('should not call onClick when disabled', async () => {
      const handleClick = vi.fn();
      const { user } = render(
        <MyComponent onClick={handleClick} disabled>
          Click me
        </MyComponent>
      );

      await user.click(screen.getByRole('button'));

      expect(handleClick).not.toHaveBeenCalled();
    });
  });
});
```

### Query Priority (Best to Worst)

```typescript
// 1. Accessible queries (BEST)
screen.getByRole('button', { name: 'Submit' });
screen.getByLabelText('Email');
screen.getByPlaceholderText('Enter email');
screen.getByText('Welcome');

// 2. Semantic queries
screen.getByAltText('Profile picture');
screen.getByTitle('Close');

// 3. Test IDs (LAST RESORT)
screen.getByTestId('custom-element');
```

### Query Variants

```typescript
// getBy - throws if not found (use for elements that should exist)
screen.getByText('Hello');

// queryBy - returns null if not found (use for elements that might not exist)
screen.queryByText('Hello');

// findBy - returns promise, waits for element (use for async)
await screen.findByText('Hello');

// getAllBy - returns array (use for multiple elements)
screen.getAllByRole('listitem');
```

---

## Topic 5: Form Input Tests

**Files:** `src/shared/components/inputs/TextInput.test.tsx`, `NumberInput.test.tsx`

### What You Need to Know

- Test controlled and uncontrolled inputs
- Test user typing with `user.type()` and `user.clear()`
- Test validation states (error, required)
- Test disabled and readonly states

### Pattern

```typescript
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@/test/test-utils';
import TextInput from './TextInput';

describe('TextInput', () => {
  it('should render with label', () => {
    render(<TextInput label="Email" />);
    expect(screen.getByText('Email')).toBeInTheDocument();
  });

  it('should allow user to type', async () => {
    const handleChange = vi.fn();
    const { user } = render(
      <TextInput label="Email" onChange={handleChange} />
    );

    const input = screen.getByRole('textbox');
    await user.type(input, 'test@example.com');

    expect(handleChange).toHaveBeenCalled();
    expect(input).toHaveValue('test@example.com');
  });

  it('should clear input', async () => {
    const { user } = render(
      <TextInput label="Email" defaultValue="initial" />
    );

    const input = screen.getByRole('textbox');
    await user.clear(input);

    expect(input).toHaveValue('');
  });

  it('should show error message', () => {
    render(<TextInput label="Email" error="Invalid email" />);
    expect(screen.getByText('Invalid email')).toBeInTheDocument();
  });

  it('should be disabled', () => {
    render(<TextInput label="Email" disabled />);
    expect(screen.getByRole('textbox')).toBeDisabled();
  });
});
```

### User Event Methods

```typescript
// Typing
await user.type(input, 'hello');        // Types text
await user.clear(input);                // Clears input
await user.type(input, '{Enter}');      // Special keys

// Selection
await user.selectOptions(select, 'value');
await user.deselectOptions(select, 'value');

// Clicking
await user.click(element);
await user.dblClick(element);
await user.tripleClick(element);        // Select all text

// Keyboard
await user.keyboard('{Shift>}A{/Shift}'); // Shift+A
await user.tab();                         // Tab to next element
```

---

## Topic 6: Dropdown/Select Tests

**File:** `src/shared/components/inputs/Dropdown.test.tsx`

### What You Need to Know

- Headless UI components need special handling
- Open dropdown before testing options
- Test selection updates
- Test disabled state

### Pattern

```typescript
import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor } from '@/test/test-utils';
import Dropdown from './Dropdown';

const options = [
  { value: 'opt1', label: 'Option 1' },
  { value: 'opt2', label: 'Option 2' },
];

describe('Dropdown', () => {
  it('should render with placeholder', () => {
    render(
      <Dropdown
        options={options}
        value={null}
        onChange={() => {}}
        placeholder="Select..."
      />
    );
    expect(screen.getByText('Select...')).toBeInTheDocument();
  });

  it('should open and show options when clicked', async () => {
    const { user } = render(
      <Dropdown options={options} value={null} onChange={() => {}} />
    );

    // Click to open
    await user.click(screen.getByRole('button'));

    // Options should be visible
    await waitFor(() => {
      expect(screen.getByText('Option 1')).toBeInTheDocument();
      expect(screen.getByText('Option 2')).toBeInTheDocument();
    });
  });

  it('should call onChange when option selected', async () => {
    const handleChange = vi.fn();
    const { user } = render(
      <Dropdown options={options} value={null} onChange={handleChange} />
    );

    // Open dropdown
    await user.click(screen.getByRole('button'));

    // Select option
    await waitFor(async () => {
      await user.click(screen.getByText('Option 2'));
    });

    expect(handleChange).toHaveBeenCalledWith('opt2');
  });

  it('should display selected value', () => {
    render(
      <Dropdown options={options} value="opt1" onChange={() => {}} />
    );
    expect(screen.getByText('Option 1')).toBeInTheDocument();
  });
});
```

---

## Topic 7: Modal Tests

**File:** `src/shared/components/Modal.test.tsx`

### What You Need to Know

- Test open/closed states
- Test close triggers (button, backdrop, escape key)
- Test content rendering
- Test accessibility (dialog role)

### Pattern

```typescript
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@/test/test-utils';
import Modal from './Modal';

describe('Modal', () => {
  const defaultProps = {
    isOpen: true,
    onClose: vi.fn(),
    title: 'Test Modal',
    children: <div>Content</div>,
  };

  it('should render when open', () => {
    render(<Modal {...defaultProps} />);
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByText('Test Modal')).toBeInTheDocument();
  });

  it('should not render when closed', () => {
    render(<Modal {...defaultProps} isOpen={false} />);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('should call onClose when close button clicked', async () => {
    const onClose = vi.fn();
    const { user } = render(<Modal {...defaultProps} onClose={onClose} />);

    await user.click(screen.getByRole('button', { name: /close/i }));

    expect(onClose).toHaveBeenCalled();
  });

  it('should render children content', () => {
    render(
      <Modal {...defaultProps}>
        <p>Custom content</p>
      </Modal>
    );
    expect(screen.getByText('Custom content')).toBeInTheDocument();
  });
});
```

---

## Topic 8: React Hook Form Tests

**File:** `src/features/request/forms/AddressForm.test.tsx`

### What You Need to Know

- Wrap component with `FormProvider`
- Create a wrapper component with `useForm`
- Test validation errors
- Test form submission
- Test default values

### Pattern

```typescript
import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor } from '@/test/test-utils';
import { useForm, FormProvider } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import MyForm from './MyForm';

// Define schema
const schema = z.object({
  email: z.string().email('Invalid email'),
  name: z.string().min(1, 'Name is required'),
});

type FormData = z.infer<typeof schema>;

// Wrapper component
function FormWrapper({
  onSubmit = vi.fn(),
  defaultValues = {},
}: {
  onSubmit?: (data: FormData) => void;
  defaultValues?: Partial<FormData>;
}) {
  const methods = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      email: '',
      name: '',
      ...defaultValues,
    },
  });

  return (
    <FormProvider {...methods}>
      <form onSubmit={methods.handleSubmit(onSubmit)}>
        <MyForm />
        <button type="submit">Submit</button>
      </form>
    </FormProvider>
  );
}

describe('MyForm', () => {
  it('should render all fields', () => {
    render(<FormWrapper />);
    expect(screen.getByLabelText('Email')).toBeInTheDocument();
    expect(screen.getByLabelText('Name')).toBeInTheDocument();
  });

  it('should submit with valid data', async () => {
    const handleSubmit = vi.fn();
    const { user } = render(
      <FormWrapper
        onSubmit={handleSubmit}
        defaultValues={{ email: 'test@test.com', name: 'John' }}
      />
    );

    await user.click(screen.getByRole('button', { name: 'Submit' }));

    await waitFor(() => {
      expect(handleSubmit).toHaveBeenCalledWith(
        { email: 'test@test.com', name: 'John' },
        expect.anything()
      );
    });
  });

  it('should not submit with invalid data', async () => {
    const handleSubmit = vi.fn();
    const { user } = render(<FormWrapper onSubmit={handleSubmit} />);

    await user.click(screen.getByRole('button', { name: 'Submit' }));

    await waitFor(() => {
      expect(handleSubmit).not.toHaveBeenCalled();
    });
  });

  it('should show validation errors', async () => {
    const { user } = render(<FormWrapper />);

    await user.type(screen.getByLabelText('Email'), 'invalid');
    await user.click(screen.getByRole('button', { name: 'Submit' }));

    await waitFor(() => {
      expect(screen.getByText('Invalid email')).toBeInTheDocument();
    });
  });
});
```

---

## Topic 9: API Hooks with MSW

**File:** `src/features/request/api.test.tsx`

### What You Need to Know

- MSW intercepts real network requests
- Use `renderHook` with QueryClientProvider wrapper
- Test loading, success, and error states
- Override handlers for specific tests

### Setup

```typescript
// src/test/mocks/handlers.ts
import { http, HttpResponse } from 'msw';

export const handlers = [
  http.get('*/api/users', () => {
    return HttpResponse.json([
      { id: 1, name: 'John' },
      { id: 2, name: 'Jane' },
    ]);
  }),

  http.post('*/api/users', async ({ request }) => {
    const body = await request.json();
    return HttpResponse.json({ id: 3, ...body }, { status: 201 });
  }),
];
```

### Pattern

```typescript
import { describe, it, expect } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { http, HttpResponse } from 'msw';
import { server } from '@/test/mocks/server';
import { useCreateUser } from './api';

// Wrapper with QueryClient
function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  return function Wrapper({ children }) {
    return (
      <QueryClientProvider client={queryClient}>
        {children}
      </QueryClientProvider>
    );
  };
}

describe('useCreateUser', () => {
  it('should create user successfully', async () => {
    const { result } = renderHook(() => useCreateUser(), {
      wrapper: createWrapper(),
    });

    // Trigger mutation
    result.current.mutate({ name: 'New User' });

    // Wait for success
    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.data).toEqual({
      id: expect.any(Number),
      name: 'New User',
    });
  });

  it('should handle error', async () => {
    // Override handler for this test only
    server.use(
      http.post('*/api/users', () => {
        return HttpResponse.json(
          { message: 'Bad Request' },
          { status: 400 }
        );
      })
    );

    const { result } = renderHook(() => useCreateUser(), {
      wrapper: createWrapper(),
    });

    result.current.mutate({ name: '' });

    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });
  });
});
```

### MSW Handler Patterns

```typescript
// GET request
http.get('*/api/items', () => {
  return HttpResponse.json({ data: [] });
});

// POST request with body
http.post('*/api/items', async ({ request }) => {
  const body = await request.json();
  return HttpResponse.json(body, { status: 201 });
});

// URL parameters
http.get('*/api/items/:id', ({ params }) => {
  return HttpResponse.json({ id: params.id });
});

// Query parameters
http.get('*/api/items', ({ request }) => {
  const url = new URL(request.url);
  const page = url.searchParams.get('page');
  return HttpResponse.json({ page });
});

// Error response
http.get('*/api/items', () => {
  return HttpResponse.json({ error: 'Not found' }, { status: 404 });
});

// Network error
http.get('*/api/items', () => {
  return HttpResponse.error();
});

// Delayed response
http.get('*/api/items', async () => {
  await delay(1000);
  return HttpResponse.json({ data: [] });
});
```

---

## Topic 10: Component with API Tests

**File:** `src/features/dashboard/components/DashboardSummary.test.tsx`

### What You Need to Know

- Test loading state
- Test data display after load
- Test error state
- Use `waitFor` for async updates

### Pattern

```typescript
import { describe, it, expect } from 'vitest';
import { render, screen, waitFor } from '@/test/test-utils';
import { http, HttpResponse } from 'msw';
import { server } from '@/test/mocks/server';
import Dashboard from './Dashboard';

describe('Dashboard', () => {
  it('should show loading state initially', () => {
    render(<Dashboard />);
    expect(screen.getByText('Loading...')).toBeInTheDocument();
  });

  it('should display data after loading', async () => {
    render(<Dashboard />);

    // Wait for data to load
    await waitFor(() => {
      expect(screen.queryByText('Loading...')).not.toBeInTheDocument();
    });

    // Data should be displayed
    expect(screen.getByText('Total: 100')).toBeInTheDocument();
  });

  it('should show error state', async () => {
    // Override to return error
    server.use(
      http.get('*/api/dashboard', () => {
        return HttpResponse.json(
          { message: 'Server Error' },
          { status: 500 }
        );
      })
    );

    render(<Dashboard />);

    await waitFor(() => {
      expect(screen.getByText(/error/i)).toBeInTheDocument();
    });
  });

  it('should show empty state', async () => {
    server.use(
      http.get('*/api/dashboard', () => {
        return HttpResponse.json({ data: [] });
      })
    );

    render(<Dashboard />);

    await waitFor(() => {
      expect(screen.getByText('No data available')).toBeInTheDocument();
    });
  });
});
```

---

## Topic 11: E2E Tests with Playwright

**File:** `e2e/smoke.spec.ts`

### What You Need to Know

- Tests run in real browser
- Use `page.goto()` for navigation
- Use `page.getByRole()` for element queries
- Use `expect(page).toHaveURL()` for URL assertions
- Mock API with `page.route()`

### Pattern

```typescript
import { test, expect } from '@playwright/test';

test.describe('Authentication', () => {
  test('should redirect to login when not authenticated', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveURL(/.*login/);
  });

  test('should login successfully', async ({ page }) => {
    await page.goto('/login');

    // Fill form
    await page.getByLabel('Email').fill('user@example.com');
    await page.getByLabel('Password').fill('password123');

    // Submit
    await page.getByRole('button', { name: 'Login' }).click();

    // Should redirect to dashboard
    await expect(page).toHaveURL('/dashboard');
    await expect(page.getByText('Welcome')).toBeVisible();
  });
});

test.describe('Form Submission', () => {
  test.beforeEach(async ({ page }) => {
    // Set auth token
    await page.addInitScript(() => {
      localStorage.setItem('auth_token', 'mock-token');
    });
  });

  test('should submit form successfully', async ({ page }) => {
    // Mock API response
    await page.route('**/api/submit', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true }),
      });
    });

    await page.goto('/form');

    await page.getByLabel('Name').fill('John Doe');
    await page.getByRole('button', { name: 'Submit' }).click();

    await expect(page.getByText('Success!')).toBeVisible();
  });
});
```

### Playwright Locators

```typescript
// By role (BEST)
page.getByRole('button', { name: 'Submit' });
page.getByRole('textbox', { name: 'Email' });
page.getByRole('link', { name: 'Home' });

// By label
page.getByLabel('Email');

// By placeholder
page.getByPlaceholder('Enter email');

// By text
page.getByText('Welcome');
page.getByText(/welcome/i);  // Regex

// By test ID
page.getByTestId('submit-button');
```

### Playwright Actions

```typescript
// Click
await page.click('button');
await page.getByRole('button').click();

// Fill input
await page.fill('input', 'value');
await page.getByLabel('Email').fill('test@test.com');

// Type (with delay)
await page.type('input', 'hello', { delay: 100 });

// Select option
await page.selectOption('select', 'value');

// Check/uncheck
await page.check('input[type="checkbox"]');
await page.uncheck('input[type="checkbox"]');

// Press key
await page.press('input', 'Enter');

// Upload file
await page.setInputFiles('input[type="file"]', 'path/to/file.pdf');
```

---

## Best Practices

### 1. Test Behavior, Not Implementation

```typescript
// BAD: Testing implementation
it('should set state to true', () => {
  const { result } = renderHook(() => useState(false));
  act(() => result.current[1](true));
  expect(result.current[0]).toBe(true);
});

// GOOD: Testing behavior
it('should show modal when button clicked', async () => {
  const { user } = render(<MyComponent />);
  await user.click(screen.getByRole('button', { name: 'Open' }));
  expect(screen.getByRole('dialog')).toBeInTheDocument();
});
```

### 2. Use User-Centric Queries

```typescript
// BAD: Using test IDs when not necessary
screen.getByTestId('email-input');

// GOOD: Using accessible queries
screen.getByLabelText('Email');
screen.getByRole('textbox', { name: 'Email' });
```

### 3. Write Descriptive Test Names

```typescript
// BAD
it('test 1', () => {});
it('works', () => {});

// GOOD
it('should display error message when email is invalid', () => {});
it('should call onSubmit with form data when submitted', () => {});
```

### 4. One Assertion Per Test (Generally)

```typescript
// BAD: Multiple unrelated assertions
it('should work', () => {
  render(<Button />);
  expect(screen.getByRole('button')).toBeInTheDocument();
  expect(screen.getByRole('button')).toHaveClass('btn');
  expect(screen.getByRole('button')).not.toBeDisabled();
});

// GOOD: Focused tests
it('should render button', () => {
  render(<Button />);
  expect(screen.getByRole('button')).toBeInTheDocument();
});

it('should have correct class', () => {
  render(<Button />);
  expect(screen.getByRole('button')).toHaveClass('btn');
});
```

### 5. Arrange-Act-Assert Pattern

```typescript
it('should increment counter when clicked', async () => {
  // Arrange
  const { user } = render(<Counter />);

  // Act
  await user.click(screen.getByRole('button', { name: 'Increment' }));

  // Assert
  expect(screen.getByText('Count: 1')).toBeInTheDocument();
});
```

### 6. Use `waitFor` for Async Operations

```typescript
// BAD: No waiting
it('should load data', () => {
  render(<DataComponent />);
  expect(screen.getByText('Data loaded')).toBeInTheDocument(); // Might fail
});

// GOOD: Wait for async
it('should load data', async () => {
  render(<DataComponent />);
  await waitFor(() => {
    expect(screen.getByText('Data loaded')).toBeInTheDocument();
  });
});
```

### 7. Clean Up Between Tests

```typescript
// In setup.ts
afterEach(() => {
  cleanup();           // React Testing Library
  server.resetHandlers(); // MSW
});

// In store tests
beforeEach(() => {
  useStore.setState(initialState);
});
```

---

## Common Patterns

### Testing Loading States

```typescript
it('should show loading then content', async () => {
  render(<DataComponent />);

  // Initially loading
  expect(screen.getByText('Loading...')).toBeInTheDocument();

  // After load
  await waitFor(() => {
    expect(screen.queryByText('Loading...')).not.toBeInTheDocument();
  });
  expect(screen.getByText('Content')).toBeInTheDocument();
});
```

### Testing Forms with Validation

```typescript
it('should show validation error on invalid input', async () => {
  const { user } = render(<LoginForm />);

  await user.type(screen.getByLabelText('Email'), 'invalid');
  await user.click(screen.getByRole('button', { name: 'Submit' }));

  await waitFor(() => {
    expect(screen.getByText('Invalid email')).toBeInTheDocument();
  });
});
```

### Testing Conditional Rendering

```typescript
it('should show admin panel for admin users', () => {
  render(<Dashboard user={{ role: 'admin' }} />);
  expect(screen.getByText('Admin Panel')).toBeInTheDocument();
});

it('should not show admin panel for regular users', () => {
  render(<Dashboard user={{ role: 'user' }} />);
  expect(screen.queryByText('Admin Panel')).not.toBeInTheDocument();
});
```

### Mocking Components

```typescript
// Mock a complex child component
vi.mock('./ComplexChart', () => ({
  default: function MockChart({ data }) {
    return <div data-testid="mock-chart">Chart: {data.length} items</div>;
  },
}));

it('should render with mocked chart', () => {
  render(<Dashboard />);
  expect(screen.getByTestId('mock-chart')).toBeInTheDocument();
});
```

### Testing with Router

```typescript
import { MemoryRouter, Route, Routes } from 'react-router-dom';

function renderWithRouter(ui, { route = '/' } = {}) {
  return render(
    <MemoryRouter initialEntries={[route]}>
      <Routes>
        <Route path="/" element={ui} />
        <Route path="/details/:id" element={<Details />} />
      </Routes>
    </MemoryRouter>
  );
}

it('should navigate to details page', async () => {
  const { user } = renderWithRouter(<ItemList />);

  await user.click(screen.getByRole('link', { name: 'View Details' }));

  expect(screen.getByText('Item Details')).toBeInTheDocument();
});
```

---

## Troubleshooting

### Problem: Element not found

```typescript
// Solution 1: Use findBy for async elements
const element = await screen.findByText('Loaded');

// Solution 2: Use waitFor
await waitFor(() => {
  expect(screen.getByText('Loaded')).toBeInTheDocument();
});

// Solution 3: Check if element exists
screen.debug(); // Print DOM to console
```

### Problem: State update not wrapped in act

```typescript
// Solution: Wrap state updates in act
import { act } from '@testing-library/react';

act(() => {
  result.current.updateState();
});
```

### Problem: MSW not intercepting requests

```typescript
// Solution 1: Check URL matches
// Use wildcards: '*/api/users' instead of 'http://localhost:3000/api/users'

// Solution 2: Verify server is started
beforeAll(() => server.listen());
afterEach(() => server.resetHandlers());
afterAll(() => server.close());
```

### Problem: Test times out

```typescript
// Solution 1: Increase timeout
it('slow test', async () => {
  // test code
}, 10000); // 10 second timeout

// Solution 2: Use longer waitFor timeout
await waitFor(() => {
  expect(result).toBe(expected);
}, { timeout: 5000 });
```

### Problem: Tests affect each other

```typescript
// Solution: Reset state between tests
beforeEach(() => {
  vi.clearAllMocks();
  useStore.setState(initialState);
  localStorage.clear();
});
```

---

## Quick Reference

### Test File Naming

```
ComponentName.test.tsx   # Component tests
hookName.test.ts         # Hook tests
utilName.test.ts         # Utility tests
```

### Import Cheat Sheet

```typescript
// Vitest
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// React Testing Library
import { render, screen, waitFor } from '@/test/test-utils';
import { renderHook, act } from '@testing-library/react';

// MSW
import { http, HttpResponse } from 'msw';
import { server } from '@/test/mocks/server';

// Playwright
import { test, expect } from '@playwright/test';
```

### Common Matchers

```typescript
// DOM matchers
expect(element).toBeInTheDocument();
expect(element).toBeVisible();
expect(element).toBeDisabled();
expect(element).toHaveClass('class-name');
expect(element).toHaveValue('value');
expect(element).toHaveTextContent('text');
expect(element).toHaveAttribute('attr', 'value');

// General matchers
expect(value).toBe(exact);
expect(value).toEqual(deep);
expect(value).toBeTruthy();
expect(array).toContain(item);
expect(array).toHaveLength(3);
expect(fn).toHaveBeenCalled();
expect(fn).toHaveBeenCalledWith(arg);
expect(fn).toHaveBeenCalledTimes(2);
```

---

## Next Steps

1. **Start small**: Write tests for utility functions first
2. **Add tests for new code**: Every new feature should have tests
3. **Fix bugs with tests**: Write a failing test, then fix the bug
4. **Aim for coverage**: Focus on critical paths, not 100% coverage
5. **Keep tests fast**: Slow tests won't be run often

For more examples, see the test files in:
- `src/shared/utils/objectUtils.test.ts`
- `src/shared/store.test.ts`
- `src/shared/components/Button.test.tsx`
- `src/features/request/api.test.tsx`
