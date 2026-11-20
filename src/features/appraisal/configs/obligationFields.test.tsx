import { describe, expect, it, vi } from 'vitest';
import '@/i18n';
import { act } from '@testing-library/react';
import { FormProvider, useForm } from 'react-hook-form';
import { render, screen } from '@/test/test-utils';
import { buildFormSchema, FormFields } from '@/shared/components/form';
import { useRentedOutFollowsLease } from '../hooks/useRentedOutFollowsLease';
import { allLeaseAgreementFields, leaseLegalField, otherInformationField } from './fields';
import { obligationFields } from './obligationFields';

vi.mock('@/shared/utils/parameterUtils', async importOriginal => {
  const rows = [
    { code: '01', description: 'No obligation' },
    { code: '02', description: 'Mortgaged' },
    { code: '03', description: 'Tied to a lease' },
    { code: '04', description: 'Usufruct' },
    { code: '05', description: 'Superficies' },
    { code: '06', description: 'Easement' },
    { code: '99', description: 'Other' },
  ];
  return {
    ...(await importOriginal<object>()),
    useParametersByGroup: (group: string) => (group === 'Obligation' ? rows : []),
    useParameterAsCheckboxOptions: (group: string) =>
      group === 'Obligation' ? rows.map(r => ({ value: r.code, label: r.description })) : [],
  };
});

const isRentedOut = otherInformationField.find(f => f.name === 'isRentedOut')!;
const fields = [...obligationFields, isRentedOut];

type Values = {
  obligationType: string[];
  mortgageDetails: string;
  obligationDetails: string;
  isRentedOut: boolean | null;
};
let methods: ReturnType<typeof useForm<Values>>;

const Rule = () => {
  useRentedOutFollowsLease();
  return null;
};

const Harness = ({ defaults }: { defaults?: Partial<Values> }) => {
  methods = useForm<Values>({
    defaultValues: {
      obligationType: [],
      mortgageDetails: '',
      obligationDetails: '',
      isRentedOut: false,
      ...defaults,
    },
  });
  return (
    <FormProvider {...methods}>
      <Rule />
      <FormFields fields={fields} />
      <output data-testid="dirty">{String(methods.formState.isDirty)}</output>
    </FormProvider>
  );
};

const chip = (name: string) => screen.getByRole('button', { name });
const pressed = (name: string) => chip(name).getAttribute('aria-pressed') === 'true';
const mortgage = () => screen.queryByRole('textbox', { name: /Mortgage Details/ });
const other = () => screen.queryByRole('textbox', { name: /Other Obligation Details/ });
const rentedOut = (caption: 'No' | 'Yes') => screen.getByRole('radio', { name: caption });

describe('obligation chips', () => {
  it('"no obligation" clears the other picks, and any other pick clears "no obligation"', async () => {
    const { user } = render(<Harness />);
    await user.click(chip('Mortgaged'));
    await user.click(chip('Usufruct'));
    expect(methods.getValues('obligationType')).toEqual(['02', '04']);
    await user.click(chip('No obligation'));
    expect(methods.getValues('obligationType')).toEqual(['01']);
    expect(pressed('Mortgaged')).toBe(false);
    await user.click(chip('Tied to a lease'));
    expect(methods.getValues('obligationType')).toEqual(['03']);
    expect(pressed('No obligation')).toBe(false);
  });

  it('has no hint line under the chips', () => {
    render(<Harness />);
    expect(screen.queryByText(/stands alone/)).toBeNull();
  });
});

describe('details fields', () => {
  it('shows nothing extra for "no obligation" or for no pick', async () => {
    const { user } = render(<Harness />);
    expect(mortgage()).toBeNull();
    expect(other()).toBeNull();
    await user.click(chip('No obligation'));
    expect(mortgage()).toBeNull();
    expect(other()).toBeNull();
  });

  it('shows the mortgage details for a mortgage, the other details for any of 03/04/05/06/99', async () => {
    const { user } = render(<Harness />);
    await user.click(chip('Mortgaged'));
    expect(mortgage()).toBeInTheDocument();
    expect(other()).toBeNull();
    for (const name of ['Tied to a lease', 'Usufruct', 'Superficies', 'Easement', 'Other']) {
      await user.click(chip(name));
      expect(other()).toBeInTheDocument();
      await user.click(chip(name));
      expect(other()).toBeNull();
    }
    expect(mortgage()).toBeInTheDocument();
  });

  it('drops the mortgage text when the mortgage pick is dropped', async () => {
    const { user } = render(
      <Harness defaults={{ obligationType: ['02'], mortgageDetails: 'Bank A' }} />,
    );
    await user.click(chip('Mortgaged'));
    expect(mortgage()).toBeNull();
    expect(methods.getValues('mortgageDetails')).toBeNull();
  });
});

describe('required rules (schema)', () => {
  const schema = buildFormSchema(obligationFields);
  const ok = (v: object) =>
    schema.safeParse({ obligationType: [], mortgageDetails: '', obligationDetails: '', ...v })
      .success;

  it('needs the mortgage details with 02 and the other details with any of 03/04/05/06/99', () => {
    expect(ok({ obligationType: ['01'] })).toBe(true);
    expect(ok({ obligationType: ['02'] })).toBe(false);
    expect(ok({ obligationType: ['02'], mortgageDetails: 'Bank A' })).toBe(true);
    for (const code of ['03', '04', '05', '06', '99']) {
      expect(ok({ obligationType: [code] })).toBe(false);
      expect(ok({ obligationType: [code], obligationDetails: 'x' })).toBe(true);
    }
    expect(ok({ obligationType: ['02', '03'], mortgageDetails: 'Bank A' })).toBe(false);
    expect(
      ok({ obligationType: ['02', '03'], mortgageDetails: 'Bank A', obligationDetails: 'x' }),
    ).toBe(true);
  });
});

describe('rented out follows "tied to a lease"', () => {
  it('turns on and locks when the user picks 03, with the lock line', async () => {
    const { user } = render(<Harness />);
    expect(screen.queryByText(/Yes because/)).toBeNull();
    await user.click(chip('Tied to a lease'));
    expect(methods.getValues('isRentedOut')).toBe(true);
    expect(rentedOut('Yes')).toBeDisabled();
    expect(rentedOut('No')).toBeDisabled();
    const line = screen.getByText(/Yes because/);
    expect(line.querySelector('svg')).not.toBeNull();
    // The chosen option keeps the accent fill while locked.
    expect(
      document.querySelector('[data-field="isRentedOut"] span[aria-hidden]')?.className,
    ).toMatch(/bg-primary-700/);
  });

  it('unlocks when 03 is dropped, keeping the value', async () => {
    const { user } = render(<Harness />);
    await user.click(chip('Tied to a lease'));
    await user.click(chip('Tied to a lease'));
    expect(methods.getValues('isRentedOut')).toBe(true);
    expect(rentedOut('No')).toBeEnabled();
    expect(screen.queryByText(/Yes because/)).toBeNull();
    await user.click(rentedOut('No'));
    expect(methods.getValues('isRentedOut')).toBe(false);
  });

  it('is left alone, and nothing is dirtied, when a saved record loads', () => {
    render(<Harness />);
    act(() =>
      methods.reset({
        obligationType: ['03'],
        mortgageDetails: '',
        obligationDetails: 'lease 30y',
        isRentedOut: false,
      }),
    );
    expect(methods.getValues('isRentedOut')).toBe(false);
    expect(screen.getByTestId('dirty')).toHaveTextContent('false');
  });
});

describe('lease registration and pledge toggles', () => {
  const Lease = () => {
    const m = useForm<{ isLeaseRegistered: boolean | null; isLeaseholdPledgeable: boolean | null }>(
      {
        defaultValues: { isLeaseRegistered: null, isLeaseholdPledgeable: null },
      },
    );
    methods = m as never;
    return (
      <FormProvider {...m}>
        <FormFields fields={leaseLegalField} />
      </FormProvider>
    );
  };

  it('start with neither option chosen, accept a pick and clear it by clicking it again', async () => {
    const { user } = render(<Lease />);
    const [reg] = screen.getAllByRole('radio', { name: 'Registered' });
    expect(reg).toHaveAttribute('aria-checked', 'false');
    expect(screen.getByRole('radio', { name: 'Not registered' })).toHaveAttribute(
      'aria-checked',
      'false',
    );
    await user.click(reg);
    expect(methods.getValues('isLeaseRegistered' as never)).toBe(true);
    await user.click(reg);
    expect(methods.getValues('isLeaseRegistered' as never)).toBeNull();
    await user.click(screen.getByRole('radio', { name: 'Not allowed' }));
    expect(methods.getValues('isLeaseholdPledgeable' as never)).toBe(false);
  });

  it('are optional in the lease schema, and carry no helper text', () => {
    const schema = buildFormSchema(allLeaseAgreementFields);
    const result = schema.safeParse({ isLeaseRegistered: null, isLeaseholdPledgeable: null });
    expect(result.success || !result.error.issues.some(i => /isLease/.test(i.path.join('.')))).toBe(
      true,
    );
    render(<Lease />);
    expect(screen.queryByText(/538/)).toBeNull();
  });
});
