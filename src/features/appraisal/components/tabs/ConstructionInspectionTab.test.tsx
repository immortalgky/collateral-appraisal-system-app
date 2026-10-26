import { describe, expect, it, vi } from 'vitest';
import '@/i18n';
import { FormProvider, useForm, useWatch } from 'react-hook-form';
import { fireEvent, render, screen, waitFor } from '@/test/test-utils';
import { ConstructionInspectionTab } from './ConstructionInspectionTab';

vi.mock('../../hooks/useEnrichedPropertyGroups', () => ({
  useEnrichedPropertyGroups: () => ({
    groups: [
      {
        id: 'g1',
        items: [
          { id: 'p1', type: 'B', address: 'First building' },
          { id: 'p2', type: 'B', address: 'Second building' },
        ],
      },
    ],
  }),
}));
vi.mock('../../hooks/usePropertyBasePath', () => ({ usePropertyBasePath: () => 'properties' }));
vi.mock('../../api/constructionWorkGroups', () => ({
  useConstructionWorkGroups: () => ({ data: [], isLoading: false, isError: false }),
}));
vi.mock('@shared/api/axiosInstance', () => ({
  default: {
    get: vi.fn().mockResolvedValue({
      data: { constructionInspection: { isFullDetail: true, workDetails: [] } },
    }),
  },
}));

const row = {
  id: null,
  constructionWorkGroupId: 'gx',
  constructionWorkItemId: null,
  workItemName: 'Roof',
  displayOrder: 1,
  proportionPct: 100,
  previousProgressPct: 0,
  currentProgressPct: 50,
};
const summary = (over: object = {}) => ({
  summaryDetail: '',
  summaryPreviousProgressPct: 0,
  summaryCurrentProgressPct: 50,
  currentValueOverride: 400_000,
  ...over,
});

/** The override on the form, printed so a test can read what the tab did to it. */
function Probe() {
  const v = useWatch({ name: 'constructionSummary.currentValueOverride' });
  return <output data-testid="override">{String(v ?? null)}</output>;
}

function Host({ enterDetail, base = 1_000_000 }: { enterDetail: boolean; base?: number }) {
  const form = useForm({
    defaultValues: {
      buildingCostValue: base,
      depreciationDetails: [],
      constructionEnterDetail: enterDetail,
      constructionSubItems: [row],
      constructionSummary: summary(),
      constructionRemark: '',
    },
  });
  return (
    <FormProvider {...form}>
      <ConstructionInspectionTab condo={false} propertyId="p1" />
      <Probe />
    </FormProvider>
  );
}

const override = () => screen.getByTestId('override').textContent;

describe('ConstructionInspectionTab: the typed current value goes back to the rows', () => {
  it('on a progress edit in summary mode', () => {
    render(<Host enterDetail={false} />);
    expect(override()).toBe('400000');
    fireEvent.change(screen.getByLabelText('This round'), { target: { value: '60' } });
    expect(override()).toBe('null');
  });

  it('on a progress edit even when there is no value base, where the override is hidden', () => {
    render(<Host enterDetail={false} base={0} />);
    expect(override()).toBe('400000');
    fireEvent.change(screen.getByLabelText('This round'), { target: { value: '60' } });
    expect(override()).toBe('null');
  });

  it('on a proportion edit in detail mode', () => {
    render(<Host enterDetail />);
    expect(override()).toBe('400000');
    fireEvent.change(screen.getByLabelText('Roof Proportion'), { target: { value: '90' } });
    expect(override()).toBe('null');
  });

  it('on a row delete', () => {
    render(<Host enterDetail />);
    expect(override()).toBe('400000');
    const remove = screen.getByRole('button', { name: 'Remove Roof' });
    fireEvent.click(remove);
    fireEvent.click(screen.getByRole('button', { name: /Remove Roof|Confirm/ }));
    expect(override()).toBe('null');
  });

  it('on a method switch', async () => {
    render(<Host enterDetail />);
    expect(override()).toBe('400000');
    fireEvent.click(screen.getByRole('button', { name: 'Overall' }));
    fireEvent.click(await screen.findByText('Confirm'));
    await waitFor(() => expect(override()).toBe('null'));
  });

  it('on copy-from another building', async () => {
    render(<Host enterDetail />);
    expect(override()).toBe('400000');
    fireEvent.click(screen.getByRole('button', { name: /Copy from/ }));
    fireEvent.click(await screen.findByText('Second building'));
    fireEvent.click(await screen.findByText('Confirm'));
    await waitFor(() => expect(override()).toBe('null'));
  });
});
