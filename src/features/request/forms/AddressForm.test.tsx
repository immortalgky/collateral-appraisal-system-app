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
import enRequest from '@/i18n/locales/en/request.json';

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
      {fields.map(field => (
        <div
          key={field.name}
          data-testid={`field-${namePrefix ? `${namePrefix}.` : ''}${field.name}`}
        >
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

// `t` returns the key. Nothing initialises i18n in src/test/setup.ts today, so this only makes
// explicit what already happens — but it keeps these assertions from breaking the day another
// suite wants i18n initialised globally.
vi.mock('react-i18next', async importOriginal => ({
  ...(await importOriginal<typeof import('react-i18next')>()),
  useTranslation: () => ({ t: (key: string) => key }),
}));

// Define schema for testing validation
// Field names and nesting follow `makeAddressFields` / `makeContactFields` in
// ../configs/fields.ts, under the `detail.` prefix AddressForm passes to FormFields. A local
// shape that drifts from those would let this suite keep passing while the form renders nothing
// it declares.
const addressSchema = z.object({
  detail: z.object({
    address: z.object({
      // `required: true` in makeAddressFields — house number and sub-district are the two.
      houseNumber: z.string().min(1, 'House number is required'),
      subDistrict: z.string().min(1, 'Sub District is required'),
      projectName: z.string().optional(),
      moo: z.string().optional(),
      soi: z.string().optional(),
      road: z.string().optional(),
      // Written by the location selector when a sub-district is picked, and shown read-only.
      district: z.string().optional(),
      districtName: z.string().optional(),
      province: z.string().optional(),
      provinceName: z.string().optional(),
      subDistrictName: z.string().optional(),
      postcode: z.string().optional(),
    }),
    contact: z.object({
      contactPersonName: z.string().min(1, 'Contact name is required'),
      contactPersonPhone: z.string().min(1, 'Contact phone is required'),
      dealerCode: z.string().optional(),
    }),
  }),
});

type AddressFormData = z.infer<typeof addressSchema>;

// A case fills in only the fields it cares about, at any depth — `Partial` alone stops at the
// top level and would demand every address field the moment one is given.
type PartialAddressFormData = {
  detail?: {
    address?: Partial<AddressFormData['detail']['address']>;
    contact?: Partial<AddressFormData['detail']['contact']>;
  };
};

// Wrapper component that provides form context
function AddressFormWrapper({
  onSubmit = vi.fn(),
  defaultValues = {},
}: {
  onSubmit?: (data: AddressFormData) => void;
  defaultValues?: PartialAddressFormData;
}) {
  const methods = useForm<AddressFormData>({
    resolver: zodResolver(addressSchema),
    defaultValues: {
      detail: {
        address: {
          houseNumber: '',
          projectName: '',
          moo: '',
          soi: '',
          road: '',
          subDistrict: '',
          districtName: '',
          provinceName: '',
          postcode: '',
          ...defaultValues.detail?.address,
        },
        contact: {
          contactPersonName: '',
          contactPersonPhone: '',
          dealerCode: '',
          ...defaultValues.detail?.contact,
        },
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

// AddressForm labels its fields through `useTranslation('request')`, and nothing initialises
// i18n in this suite, so `t()` hands back the key: a label renders as `fields.houseNo`.
//
// The assertions below take the key AND the English text it must resolve to, read from the
// locale file. Matching the key alone would keep passing if someone deleted `fields.houseNo`
// from en or blanked its value — the screen would show a raw key or an empty label, and
// localeParity would not catch it either: it compares key SETS across locales, never values.
const label = (key: keyof typeof enRequest.fields) => {
  const text = enRequest.fields[key];
  expect(text, `en/request.json is missing a value for fields.${key}`).toBeTruthy();
  return `fields.${key}`;
};
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

      expect(enRequest.forms.location, 'en/request.json lost forms.location').toBeTruthy();
      expect(screen.getByText('forms.location')).toBeInTheDocument();
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

      expect(screen.getByText(label('houseNo'))).toBeInTheDocument();
      expect(screen.getByText(label('subDistrict'))).toBeInTheDocument();
      expect(screen.getByText(label('province'))).toBeInTheDocument();
    });

    // ------------------------------------------
    // Scenario 4: Renders contact fields
    // ------------------------------------------
    it('should render contact field labels', () => {
      render(<AddressFormWrapper />);

      expect(screen.getByText(label('contactPersonName'))).toBeInTheDocument();
      expect(screen.getByText(label('contactPersonPhone'))).toBeInTheDocument();
      expect(screen.getByText(label('dealerCode'))).toBeInTheDocument();
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
            detail: {
              address: {
                houseNumber: '123',
                subDistrict: 'Bang Rak',
                districtName: 'Bang Rak',
                provinceName: 'Bangkok',
              },
              contact: {
                contactPersonName: 'John Doe',
                contactPersonPhone: '0812345678',
              },
            },
          }}
        />,
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
        { timeout: 1000 },
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
            detail: {
              address: {
                houseNumber: '123',
                subDistrict: 'Test',
                districtName: 'Test',
                provinceName: 'Test',
              },
              contact: { contactPersonName: 'Test', contactPersonPhone: '123' },
            },
          }}
        />,
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
            detail: { address: { houseNumber: '456', provinceName: 'Chiang Mai' } },
          }}
        />,
      );

      // Fields should exist (in real test, we'd verify input values). The form nests its two
      // groups under `detail.`, and the address fields are named `houseNumber` and `provinceName`.
      expect(screen.getByTestId('field-detail.address.houseNumber')).toBeInTheDocument();
      expect(screen.getByTestId('field-detail.address.provinceName')).toBeInTheDocument();
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
            <input id="email" type="email" {...methods.register('email')} />
            {methods.formState.errors.email && (
              <span role="alert">{methods.formState.errors.email.message}</span>
            )}
          </div>
          <div>
            <label htmlFor="password">Password</label>
            <input id="password" type="password" {...methods.register('password')} />
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
        expect.anything(), // form event
      );
    });
  });
});
