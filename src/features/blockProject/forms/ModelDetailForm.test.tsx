import { describe, expect, it, vi } from 'vitest';
import i18n from '@/i18n';
import { render, screen, within } from '@/test/test-utils';
import ModelDetailForm from './ModelDetailForm';

// The section heads are what this covers; the fields, tables and parameter lookups are stubs.
vi.mock('@/shared/components/form', async importOriginal => ({
  ...(await importOriginal<typeof import('@/shared/components/form')>()),
  FormFields: () => null,
}));
vi.mock('@/shared/api/pricingParameters', async importOriginal => ({
  ...(await importOriginal<typeof import('@/shared/api/pricingParameters')>()),
  useFireInsuranceOptions: () => [],
}));
vi.mock('@/features/appraisal/components/tables/SurfaceTable', () => ({ default: () => null }));
vi.mock('@/features/appraisal/components/tables/BuildingDetail', () => ({
  BuildingDetail: () => null,
}));

const modelInformation = () =>
  screen.getByRole('region', {
    name: i18n.t('blockProject:modelDetail.sections.modelInformation'),
  });

describe('ModelDetailForm, Land and Building', () => {
  it('puts the pricing action and the model figures in the "Model information" head', () => {
    render(
      <ModelDetailForm
        projectType="LB"
        facts="Used by 12 houses · Standard price ฿3,500,000.00 / house"
        pricingAction={<button type="button">View Pricing</button>}
      />,
    );

    const head = within(modelInformation());
    expect(head.getByRole('button', { name: 'View Pricing' })).toBeInTheDocument();
    expect(
      head.getByText('Used by 12 houses · Standard price ฿3,500,000.00 / house'),
    ).toBeInTheDocument();
  });

  it('shows no pricing action for a model that is not saved yet', () => {
    render(<ModelDetailForm projectType="LB" />);

    expect(within(modelInformation()).queryByRole('button')).toBeNull();
  });
});
