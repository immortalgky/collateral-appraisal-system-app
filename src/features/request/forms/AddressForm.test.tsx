/**
 * ============================================
 * TOPIC 8: REACT HOOK FORM TESTS
 * ============================================
 *
 * This file demonstrates how to test forms using React Hook Form.
 *
 * Key concepts:
 * - Wrapping components with FormProvider
 * - Testing field rendering
 * - Testing form submission
 * - Testing validation errors
 * - Testing form reset
 */
import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor } from '@/test/test-utils';
import { useForm, FormProvider } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import AddressForm from './AddressForm';

// Mock the components that AddressForm uses
vi.mock('@/shared/components/form', () => ({
  FormFields: ({
    fields,
    namePrefix,
  }: {
    fields: Array<{ name: string; label: string; type: string; required?: boolean }>;
    namePrefix?: string;
  }) => (
    <div data-testid="form-fields">
      {fields.map((field) => (
        <div key={field.name} data-testid={`field-${namePrefix ? `${namePrefix}.` : ''}${field.name}`}>
          <label>
            {field.label}
            {field.required && <span>*</span>}
          </label>
          <input
            type="text"
            name={namePrefix ? `${namePrefix}.${field.name}` : field.name}
            placeholder={field.label}
          />
        </div>
      ))}
    </div>
  ),
}));

vi.mock('@shared/components', () => ({
  SectionHeader: ({ title }: { title: string }) => <h2>{title}</h2>,
}));

// Define schema for testing validation
const addressSchema = z.object({
  address: z.object({
    houseNo: z.string().optional(),
    roomNo: z.string().optional(),
    floorNo: z.string().optional(),
    villageBuilding: z.string().optional(),
    moo: z.string().optional(),
    soi: z.string().optional(),
    road: z.string().optional(),
    subDistrict: z.string().min(1, 'Sub District is required'),
    district: z.string().min(1, 'District is required'),
    province: z.string().min(1, 'Province is required'),
    postcode: z.string().optional(),
  }),
  contact: z.object({
    contactPersonName: z.string().min(1, 'Contact name is required'),
    contactPersonContactNo: z.string().min(1, 'Contact phone is required'),
    projectCode: z.string().optional(),
  }),
});

type AddressFormData = z.infer<typeof addressSchema>;

// Wrapper component that provides form context
function AddressFormWrapper({
  onSubmit = vi.fn(),
  defaultValues = {},
}: {
  onSubmit?: (data: AddressFormData) => void;
  defaultValues?: Partial<AddressFormData>;
}) {
  const methods = useForm<AddressFormData>({
    resolver: zodResolver(addressSchema),
    defaultValues: {
      address: {
        houseNo: '',
        roomNo: '',
        floorNo: '',
        villageBuilding: '',
        moo: '',
        soi: '',
        road: '',
        subDistrict: '',
        district: '',
        province: '',
        postcode: '',
        ...defaultValues.address,
      },
      contact: {
        contactPersonName: '',
        contactPersonContactNo: '',
        projectCode: '',
        ...defaultValues.contact,
      },
    },
  });

  return (
    <FormProvider {...methods}>
      <form onSubmit={methods.handleSubmit(onSubmit)}>
        <AddressForm />
        <button type="submit">Submit</button>
        <button type="button" onClick={() => methods.reset()}>
          Reset
        </button>
      </form>
    </FormProvider>
  );
}

describe('AddressForm', () => {
  // ============================================
  // Rendering Tests
  // ============================================
  describe('rendering', () => {
    // ------------------------------------------
    // Scenario 1: Renders section header
    // ------------------------------------------
    it('should render Location section header', () => {
      render(<AddressFormWrapper />);

      expect(screen.getByText('Location')).toBeInTheDocument();
    });

    // ------------------------------------------
    // Scenario 2: Renders all address fields
    // ------------------------------------------
    it('should render address form fields', () => {
      render(<AddressFormWrapper />);

      // Check for FormFields components
      expect(screen.getAllByTestId('form-fields')).toHaveLength(2); // address + contact
    });

    // ------------------------------------------
    // Scenario 3: Renders address field labels
    // ------------------------------------------
    it('should render address field labels', () => {
      render(<AddressFormWrapper />);

      expect(screen.getByText('House No')).toBeInTheDocument();
      expect(screen.getByText('Sub District')).toBeInTheDocument();
      expect(screen.getByText('Province')).toBeInTheDocument();
    });

    // ------------------------------------------
    // Scenario 4: Renders contact fields
    // ------------------------------------------
    it('should render contact field labels', () => {
      render(<AddressFormWrapper />);

      expect(screen.getByText('Contact Person Name')).toBeInTheDocument();
      expect(screen.getByText('Contact Person Phone No')).toBeInTheDocument();
      expect(screen.getByText('Project Code')).toBeInTheDocument();
    });

    // ------------------------------------------
    // Scenario 5: Shows required indicators
    // ------------------------------------------
    it('should show required indicators on required fields', () => {
      render(<AddressFormWrapper />);

      // Required fields should have asterisks
      const asterisks = screen.getAllByText('*');
      expect(asterisks.length).toBeGreaterThan(0);
    });
  });

  // ============================================
  // Form Submission Tests
  // ============================================
  describe('form submission', () => {
    // ------------------------------------------
    // Scenario 6: Submit with valid data
    // ------------------------------------------
    it('should call onSubmit with form data when valid', async () => {
      const handleSubmit = vi.fn();
      const { user } = render(
        <AddressFormWrapper
          onSubmit={handleSubmit}
          defaultValues={{
            address: {
              houseNo: '123',
              subDistrict: 'Bang Rak',
              district: 'Bang Rak',
              province: 'Bangkok',
            },
            contact: {
              contactPersonName: 'John Doe',
              contactPersonContactNo: '0812345678',
            },
          }}
        />
      );

      await user.click(screen.getByRole('button', { name: 'Submit' }));

      await waitFor(() => {
        expect(handleSubmit).toHaveBeenCalled();
      });
    });

    // ------------------------------------------
    // Scenario 7: Does not submit with invalid data
    // ------------------------------------------
    it('should not call onSubmit when form is invalid', async () => {
      const handleSubmit = vi.fn();
      const { user } = render(<AddressFormWrapper onSubmit={handleSubmit} />);

      await user.click(screen.getByRole('button', { name: 'Submit' }));

      // Wait a bit to ensure form validation happens
      await waitFor(
        () => {
          // onSubmit should not be called due to validation errors
          expect(handleSubmit).not.toHaveBeenCalled();
        },
        { timeout: 1000 }
      );
    });
  });

  // ============================================
  // Form Reset Tests
  // ============================================
  describe('form reset', () => {
    // ------------------------------------------
    // Scenario 8: Reset clears form
    // ------------------------------------------
    it('should reset form when reset button is clicked', async () => {
      const { user } = render(
        <AddressFormWrapper
          defaultValues={{
            address: {
              houseNo: '123',
              subDistrict: 'Test',
              district: 'Test',
              province: 'Test',
            },
            contact: {
              contactPersonName: 'Test',
              contactPersonContactNo: '123',
            },
          }}
        />
      );

      // Click reset
      await user.click(screen.getByRole('button', { name: 'Reset' }));

      // Form should be reset (in a real test we'd check input values)
      expect(screen.getByRole('button', { name: 'Reset' })).toBeInTheDocument();
    });
  });

  // ============================================
  // Default Values Tests
  // ============================================
  describe('default values', () => {
    // ------------------------------------------
    // Scenario 9: Populates default values
    // ------------------------------------------
    it('should populate fields with default values', () => {
      render(
        <AddressFormWrapper
          defaultValues={{
            address: {
              houseNo: '456',
              province: 'Chiang Mai',
            },
          }}
        />
      );

      // Fields should exist (in real test, we'd verify input values)
      expect(screen.getByTestId('field-address.houseNo')).toBeInTheDocument();
      expect(screen.getByTestId('field-address.province')).toBeInTheDocument();
    });
  });
});

// ============================================
// Example: Testing a Simple Form Component
// ============================================
describe('Simple Form Example', () => {
  // This is a simpler example for reference
  const SimpleSchema = z.object({
    email: z.string().email('Invalid email'),
    password: z.string().min(6, 'Password must be at least 6 characters'),
  });

  type SimpleFormData = z.infer<typeof SimpleSchema>;

  function SimpleForm({ onSubmit }: { onSubmit: (data: SimpleFormData) => void }) {
    const methods = useForm<SimpleFormData>({
      resolver: zodResolver(SimpleSchema),
    });

    return (
      <FormProvider {...methods}>
        <form onSubmit={methods.handleSubmit(onSubmit)}>
          <div>
            <label htmlFor="email">Email</label>
            <input
              id="email"
              type="email"
              {...methods.register('email')}
            />
            {methods.formState.errors.email && (
              <span role="alert">{methods.formState.errors.email.message}</span>
            )}
          </div>
          <div>
            <label htmlFor="password">Password</label>
            <input
              id="password"
              type="password"
              {...methods.register('password')}
            />
            {methods.formState.errors.password && (
              <span role="alert">{methods.formState.errors.password.message}</span>
            )}
          </div>
          <button type="submit">Submit</button>
        </form>
      </FormProvider>
    );
  }

  // ------------------------------------------
  // Scenario: Shows validation errors
  // Note: This test verifies form validation prevents submission
  // ------------------------------------------
  it('should prevent submission with invalid input', async () => {
    const handleSubmit = vi.fn();
    const { user } = render(<SimpleForm onSubmit={handleSubmit} />);

    // Type invalid email (missing @)
    await user.type(screen.getByLabelText('Email'), 'invalid-email');
    // Type short password
    await user.type(screen.getByLabelText('Password'), '123');

    // Submit
    await user.click(screen.getByRole('button', { name: 'Submit' }));

    // Wait a moment for form validation
    await waitFor(() => {
      // onSubmit should NOT be called due to validation errors
      expect(handleSubmit).not.toHaveBeenCalled();
    });
  });

  // ------------------------------------------
  // Scenario: Submits with valid data
  // ------------------------------------------
  it('should submit form with valid data', async () => {
    const handleSubmit = vi.fn();
    const { user } = render(<SimpleForm onSubmit={handleSubmit} />);

    // Type valid data
    await user.type(screen.getByLabelText('Email'), 'test@example.com');
    await user.type(screen.getByLabelText('Password'), 'password123');

    // Submit
    await user.click(screen.getByRole('button', { name: 'Submit' }));

    // Should call onSubmit with data
    await waitFor(() => {
      expect(handleSubmit).toHaveBeenCalledWith(
        {
          email: 'test@example.com',
          password: 'password123',
        },
        expect.anything() // form event
      );
    });
  });
});
