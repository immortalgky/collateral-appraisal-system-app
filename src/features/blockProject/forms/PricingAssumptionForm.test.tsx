import { describe, expect, it } from 'vitest';
import '@/i18n';
import { FormProvider, useForm } from 'react-hook-form';
import { render, screen } from '@/test/test-utils';
import type { ProjectType } from '../types';
import PricingAssumptionForm from './PricingAssumptionForm';

const Harness = ({
  projectType,
  method = 'AdjustPriceSqm',
}: {
  projectType: ProjectType;
  method?: string;
}) => {
  const methods = useForm({ defaultValues: { locationMethod: method } });
  return (
    <FormProvider {...methods}>
      <PricingAssumptionForm projectType={projectType} />
    </FormProvider>
  );
};

const rowLabels = () =>
  Array.from(document.querySelectorAll('label'), label => label.firstChild?.textContent);

describe('PricingAssumptionForm', () => {
  it('condo: pool view and south, a floor group, no land group', () => {
    render(<Harness projectType="U" />);

    expect(rowLabels()).toEqual([
      'Corner',
      'Edge',
      'Pool View',
      'South',
      'Other',
      'Every X Floor',
      'Amount (Baht)',
      'Force Sale Percentage (%)',
    ]);
    expect(screen.queryByText('Land Assumption')).toBeNull();
  });

  it('LB: near garden and the land rate, per Sq.Wa; no floor group', () => {
    render(<Harness projectType="LB" />);

    expect(rowLabels()).toEqual([
      'Corner',
      'Edge',
      'Near Garden/Clubhouse',
      'Other',
      'Land increase / decrease',
      'Force Sale Percentage (%)',
    ]);
    expect(screen.queryByText('Floor Assumptions')).toBeNull();
    expect(screen.getAllByText('Baht/Sq.Wa').length).toBeGreaterThan(0);
  });

  it('L: no near garden, and the land rate is the standard land price itself', () => {
    render(<Harness projectType="L" />);

    expect(rowLabels()).toEqual([
      'Corner',
      'Edge',
      'Other',
      'Standard land price',
      'Force Sale Percentage (%)',
    ]);
    expect(screen.queryByText('Floor Assumptions')).toBeNull();
    expect(screen.queryByText('Land increase / decrease')).toBeNull();
  });

  it.each<ProjectType>(['U', 'LB', 'L'])(
    '%s: the percentage method is not offered (L has no standard price to take a percentage of)',
    async projectType => {
      const { user } = render(<Harness projectType={projectType} />);

      await user.click(screen.getAllByRole('button', { name: /^01 - Adjust Price/ })[0]);

      const options = screen.getAllByRole('option').map(o => o.textContent);
      expect(options).toHaveLength(2);
      expect(options.join(' ')).not.toMatch(/%/);
    },
  );

  it('a saved percentage method shows in %, and stays listed after another method is picked', async () => {
    const { user } = render(<Harness projectType="U" method="AdjustPricePercentage" />);

    expect(screen.queryByText('Baht/sq.m.')).toBeNull();
    expect(screen.getAllByText('%').length).toBeGreaterThan(0);

    await user.click(screen.getByRole('button', { name: /Adjust Price \(%\)/ }));
    await user.click(screen.getByRole('option', { name: /02 - Lumpsum/ }));
    await user.click(screen.getByRole('button', { name: /02 - Lumpsum/ }));

    expect(screen.getAllByRole('option').map(o => o.textContent)).toContain('Adjust Price (%)');
  });
});
