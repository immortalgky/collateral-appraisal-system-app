import { describe, expect, it } from 'vitest';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { render, screen } from '@/test/test-utils';
import { FormProvider } from '@/shared/components/form';
import { PageReadOnlyContext } from '@/shared/contexts/PageReadOnlyContext';
import RentalInfoForm from './RentalInfoForm';

/** A viewer must get no add / edit / generate link and no row delete from the rental tables. */
const growth = { fromYear: 1, toYear: 3, growthRate: 0, growthAmount: 0, totalAmount: 1000 };

function Harness({ readOnly }: { readOnly: boolean }) {
  const methods = useForm({
    defaultValues: {
      rentalInfo: {
        growthRateType: 'Property',
        numberOfYears: 3,
        firstYearStartDate: '2026-01-01',
        contractRentalFeePerYear: 1000,
        upFrontEntries: [{ atYear: '1', upFrontAmount: 100 }],
        growthPeriodEntries: [growth],
        scheduleEntries: [
          {
            year: 1,
            contractStart: '2026-01-01',
            contractEnd: '2026-12-31',
            upFront: 0,
            contractRentalFee: 1000,
            totalAmount: 1000,
            contractRentalFeeGrowthRatePercent: 0,
          },
        ],
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
