import { describe, expect, it } from 'vitest';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { render, screen, within } from '@/test/test-utils';
import { FormProvider } from '@/shared/components/form';
import { PageReadOnlyContext } from '@/shared/contexts/PageReadOnlyContext';
import RentalInfoForm from './RentalInfoForm';

/** A viewer must get no add / edit / generate link and no row delete from the rental tables. */
const growth = { fromYear: 1, toYear: 3, growthRate: 0, growthAmount: 0, totalAmount: 1000 };

const entry = (year: number, upFront: number, contractRentalFee: number) => ({
  year,
  contractStart: `${2025 + year}-01-01`,
  contractEnd: `${2025 + year}-12-31`,
  upFront,
  contractRentalFee,
  totalAmount: upFront + contractRentalFee,
  contractRentalFeeGrowthRatePercent: 0,
});

function Harness({
  readOnly,
  scheduleEntries = [entry(1, 0, 1000)],
}: {
  readOnly: boolean;
  scheduleEntries?: ReturnType<typeof entry>[];
}) {
  const methods = useForm({
    defaultValues: {
      rentalInfo: {
        growthRateType: 'Property',
        numberOfYears: 3,
        firstYearStartDate: '2026-01-01',
        contractRentalFeePerYear: 1000,
        upFrontEntries: [{ atYear: '1', upFrontAmount: 100 }],
        growthPeriodEntries: [growth],
        scheduleEntries,
        scheduleOverrides: [],
      },
    },
  });
  return (
    <PageReadOnlyContext.Provider value={readOnly}>
      <FormProvider methods={methods} schema={z.any()}>
        <RentalInfoForm namePrefix="rentalInfo" />
      </FormProvider>
    </PageReadOnlyContext.Provider>
  );
}

const ACTIONS = /add period|add up-front|^edit$|^generate$|^delete row \d+$/i;

describe('RentalInfoForm schedule totals', () => {
  it('ends the schedule with the sums of up-front, rental fee and total', () => {
    render(<Harness readOnly scheduleEntries={[entry(1, 100000, 600000), entry(2, 0, 630000)]} />);

    const footer = screen.getAllByRole('row').at(-1)!;
    expect(within(footer).getByText('Total · 2 years')).toBeInTheDocument();
    expect(within(footer).getByText('100,000.00')).toBeInTheDocument();
    expect(within(footer).getByText('1,230,000.00')).toBeInTheDocument();
    expect(within(footer).getByText('1,330,000.00')).toBeInTheDocument();
  });
});

describe('RentalInfoForm read-only', () => {
  it('shows the add / edit / generate links and the row deletes when editable', () => {
    render(<Harness readOnly={false} />);

    expect(screen.getAllByRole('button', { name: ACTIONS }).length).toBeGreaterThanOrEqual(6);
  });

  it('renders none of them for a viewer', () => {
    render(<Harness readOnly />);

    expect(screen.queryAllByRole('button', { name: ACTIONS })).toHaveLength(0);
  });
});
