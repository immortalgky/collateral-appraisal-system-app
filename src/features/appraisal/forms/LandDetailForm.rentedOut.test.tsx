import { describe, expect, it, vi } from 'vitest';
import '@/i18n';
import { FormProvider, useForm } from 'react-hook-form';
import { render, screen } from '@/test/test-utils';
import { createLandFormDefault } from '../schemas/form';
import LandDetailForm from './LandDetailForm';
import CondoDetailForm from './CondoDetailForm';

/**
 * The rented-out switch belongs to the plain pages (land, land-and-building, condo). A leasehold
 * page has its lease tabs always on, so it hides the switch and never sets it from the obligations.
 */

vi.mock('@/shared/utils/parameterUtils', async importOriginal => {
  const rows = [
    { code: '01', description: 'No obligation' },
    { code: '03', description: 'Tied to a lease' },
  ];
  return {
    ...(await importOriginal<object>()),
    useParameterAsCheckboxOptions: (group: string) =>
      group === 'Obligation' ? rows.map(r => ({ value: r.code, label: r.description })) : [],
  };
});

let methods: ReturnType<typeof useForm<Record<string, unknown>>>;

const Harness = ({ condo, hide }: { condo?: boolean; hide?: boolean }) => {
  methods = useForm<Record<string, unknown>>({
    defaultValues: { ...createLandFormDefault, obligationType: [], isRentedOut: false },
  });
  return (
    <FormProvider {...methods}>
      {condo ? <CondoDetailForm hideRentedOut={hide} /> : <LandDetailForm hideRentedOut={hide} />}
    </FormProvider>
  );
};

const rentedOut = () => document.querySelector('[data-field="isRentedOut"]');

describe.each([
  ['land', false],
  ['condo', true],
])('%s form: rented-out switch', (_name, condo) => {
  it('is on a plain page, and picking "tied to a lease" turns it on', async () => {
    const { user } = render(<Harness condo={condo} />);
    expect(rentedOut()).not.toBeNull();
    await user.click(screen.getByRole('button', { name: 'Tied to a lease' }));
    expect(methods.getValues('isRentedOut')).toBe(true);
  });

  it('is absent on a leasehold page, and picking "tied to a lease" leaves the value alone', async () => {
    const { user } = render(<Harness condo={condo} hide />);
    expect(rentedOut()).toBeNull();
    await user.click(screen.getByRole('button', { name: 'Tied to a lease' }));
    expect(methods.getValues('isRentedOut')).toBe(false);
  });
});
