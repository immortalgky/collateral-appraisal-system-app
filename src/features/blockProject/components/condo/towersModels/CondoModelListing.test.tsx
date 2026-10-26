import { describe, expect, it, vi } from 'vitest';
import { useLocation } from 'react-router-dom';
import '@/i18n';
import { render, screen, within } from '@/test/test-utils';
import { AppraisalProvider } from '@/features/appraisal/context/AppraisalContext';
import type { ProjectModel } from '../../../types';
import ModelListingTab from '../../tabs/ModelListingTab';

// No network: the model list and the figures built from it are fixtures.
const models = vi.hoisted(() => [
  {
    id: 'm2',
    projectId: 'p',
    modelName: 'Venice',
    usableAreaMin: 150,
    usableAreaMax: 180,
    standardLandArea: 60,
    startingPriceMin: 4_000_000,
    startingPriceMax: 5_000_000,
  },
  {
    id: 'm1',
    projectId: 'p',
    modelName: 'Monaco',
    usableAreaMin: 120,
    usableAreaMax: 120,
    standardLandArea: 50,
    startingPriceMin: 3_000_000,
    startingPriceMax: 3_000_000,
    finalAppraisedValue: 3_500_000,
  },
]);

vi.mock('../../../api/projectModel', () => ({
  useGetProjectModels: () => ({ isLoading: false, isError: false, data: models }),
  useDeleteProjectModel: () => ({ mutate: vi.fn(), isPending: false }),
}));
vi.mock('./useTowerModelFigures', () => ({
  useTowerModelFigures: () => ({
    towers: [],
    models: [...models].sort((a, b) => a.modelName.localeCompare(b.modelName)),
    hasUnits: true,
    unitsOfModel: (m: ProjectModel) =>
      m.id === 'm1' ? { total: 12, sold: 3 } : { total: 5, sold: 0 },
    towerNameOfModel: () => undefined,
  }),
  useCoverThumbnails: () => new Map<string, string>(),
}));
vi.mock('@/shared/utils/parameterUtils', () => ({ useParameterDescription: () => '' }));

const Where = () => <output data-testid="where">{useLocation().pathname}</output>;

const renderTab = (projectType: 'U' | 'LB' | 'L') =>
  render(
    <AppraisalProvider
      value={{
        appraisal: { appraisalId: 'a1', requestId: 'r1' },
        isLoading: false,
        isError: false,
        error: null,
      }}
    >
      <ModelListingTab projectType={projectType} />
      <Where />
    </AppraisalProvider>,
  );

describe('model list (Land and Building)', () => {
  it('prices a model per house, never per sq.m.', () => {
    renderTab('LB');

    expect(screen.getByText('฿3,500,000.00 / house')).toBeInTheDocument();
    expect(screen.queryByText(/฿.*sq\.m\./)).toBeNull();
    expect(
      screen.getByRole('columnheader', { name: 'Standard price (baht/house)' }),
    ).toBeInTheDocument();
    // The unpriced model waits for its analysis, as in Condo.
    expect(screen.getAllByText('Awaiting analysis').length).toBeGreaterThan(0);
  });

  it('lists the models by name with units (sold), usable area, standard land area and start price', () => {
    renderTab('LB');

    const headers = screen.getAllByRole('columnheader').map(h => h.textContent);
    expect(headers.slice(1, -1)).toEqual([
      'Model Name',
      'Units (sold)',
      'Usable area (sq.m.)',
      'Standard land area (sq.wa)',
      'Starting price (THB)',
      'Standard price (baht/house)',
    ]);

    const rows = screen.getAllByRole('row').slice(1);
    expect(rows).toHaveLength(2);
    // Sorted by name: Monaco before Venice.
    const monaco = within(rows[0]);
    expect(monaco.getByText('Monaco')).toBeInTheDocument();
    expect(monaco.getByText('12')).toBeInTheDocument();
    expect(monaco.getByText('(3)')).toBeInTheDocument();
    expect(monaco.getByText('120.00')).toBeInTheDocument();
    expect(monaco.getByText('50.00')).toBeInTheDocument();
    expect(within(rows[1]).getByText('Venice')).toBeInTheDocument();
    expect(within(rows[1]).getByText('150.00 – 180.00')).toBeInTheDocument();
  });

  it('has no tower grouping, and the waiting-for-price filter narrows the list', async () => {
    const { user } = renderTab('LB');

    expect(screen.queryByRole('checkbox')).toBeNull();

    await user.click(screen.getByRole('button', { name: /^Awaiting analysis\s*1$/ }));
    expect(screen.queryByText('Monaco')).toBeNull();
    expect(screen.getByText('Venice')).toBeInTheDocument();
  });

  it('opens a model and adds a new one under the village route', async () => {
    const { user } = renderTab('LB');

    await user.click(screen.getByText('Monaco'));
    expect(screen.getByTestId('where')).toHaveTextContent('/appraisals/a1/block-village/model/m1');

    await user.click(screen.getByRole('button', { name: /add model/i }));
    expect(screen.getByTestId('where')).toHaveTextContent('/appraisals/a1/block-village/model/new');
  });

  it('L (land only) has no models: nothing is rendered', () => {
    const { container } = renderTab('L');

    // Only the location probe is on the page.
    expect(container.querySelector('table')).toBeNull();
    expect(screen.queryByRole('button', { name: /add model/i })).toBeNull();
  });

  it('Condo still groups by tower and prices per sq.m.', () => {
    renderTab('U');

    expect(screen.getByRole('checkbox')).toBeInTheDocument();
    expect(screen.getByText('฿3,500,000.00 / sq.m.')).toBeInTheDocument();
  });
});
