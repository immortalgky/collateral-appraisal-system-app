import { beforeEach, describe, expect, it, vi } from 'vitest';
import '@/i18n';
import { render, screen } from '@/test/test-utils';
import { AppraisalProvider } from '@/features/appraisal/context/AppraisalContext';
import BlockProjectPage from './BlockProjectPage';

// No network: every query the page reads is a fixture, and the tabs are stubs that say they rendered.
const state = vi.hoisted(() => ({
  project: { data: {} as unknown, isError: false },
  pricing: { data: undefined as unknown, isError: false },
  units: { data: undefined as unknown, isError: false },
  land: { data: undefined as unknown, isError: false },
}));

const query = (q: { data: unknown; isError: boolean }) => ({
  data: q.data,
  isError: q.isError,
  refetch: vi.fn(),
});

vi.mock('../api/project', () => ({ useGetProject: () => query(state.project) }));
// The Condo header reads the price source for its totals; no source yet means "—".
vi.mock('../api/projectUnitPrice', () => ({
  CALCULATE_MUTATION_KEY: ['project-unit-prices', 'calculate'],
  useGetUnitPriceSource: () => ({ data: undefined }),
}));
vi.mock('../api/projectModel', () => ({
  useGetProjectModels: () => query({ data: [], isError: false }),
}));
vi.mock('../api/projectTower', () => ({
  useGetProjectTowers: () => query({ data: [], isError: false }),
}));
vi.mock('../api/projectLand', () => ({
  useGetProjectLand: () => query(state.land),
}));
vi.mock('../api/projectUnit', () => ({ useGetProjectUnits: () => query(state.units) }));
vi.mock('../api/projectPricingAssumption', () => ({
  useGetProjectPricingAssumptions: () => query(state.pricing),
}));
vi.mock('@/features/appraisal/components/tabs', () => ({
  GalleryTab: () => null,
  LawsRegulationTab: () => null,
  MarketsTab: () => null,
  PhotosTab: () => null,
}));
// The stub shows the type the page resolved and handed down.
vi.mock('../components/tabs/ProjectInfoTab', () => ({
  default: ({ projectType }: { projectType: string }) => (
    <div data-testid="project-info-tab" data-type={projectType} />
  ),
}));
vi.mock('../components/tabs/ProjectLandTab', () => ({ default: () => null }));
vi.mock('../components/tabs/ModelListingTab', () => ({ default: () => null }));
vi.mock('../components/tabs/TowerListingTab', () => ({ default: () => null }));
vi.mock('../components/tabs/UnitListingTab', () => ({
  default: () => <div data-testid="unit-listing-tab" />,
}));
// The stub has the one control the real tab owns that the shell cares about: expand table.
vi.mock('../components/tabs/UnitPriceTab', async () => {
  const { useCondoFocus } = await import('../components/condo/CondoShellContext');
  return {
    default: function UnitPriceTabStub() {
      const { focus, onFocusChange } = useCondoFocus();
      return (
        <div data-testid="unit-price-tab">
          <button type="button" onClick={() => onFocusChange(!focus)}>
            toggle-focus
          </button>
        </div>
      );
    },
  };
});

const renderPage = (tab: string, projectType: 'U' | 'LB' | 'L' = 'U') =>
  render(
    <AppraisalProvider
      value={{
        appraisal: { appraisalId: 'a1', requestId: 'r1' },
        isLoading: false,
        isError: false,
        error: null,
      }}
    >
      <BlockProjectPage projectType={projectType} />
    </AppraisalProvider>,
    { initialEntries: [`/?tab=${tab}`] },
  );

describe('BlockProjectPage error gates', () => {
  beforeEach(() => {
    state.project = { data: {}, isError: false };
    state.pricing = { data: undefined, isError: false };
    state.units = { data: undefined, isError: false };
    state.land = { data: undefined, isError: false };
  });

  it('does not gate the Unit Price tab on the assumption query: the tab handles its own failure', () => {
    state.pricing = { data: undefined, isError: true };
    renderPage('unit-price');

    expect(screen.getByTestId('unit-price-tab')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Retry' })).toBeNull();
  });

  it('the Unit Listing tab still shows the error state when it failed with no data', () => {
    state.units = { data: undefined, isError: true };
    renderPage('unit-listing');

    expect(screen.queryByTestId('unit-listing-tab')).toBeNull();
    expect(screen.getByRole('button', { name: 'Retry' })).toBeInTheDocument();
  });

  it('the Unit Listing tab keeps rendering on a failed refetch with cached data', () => {
    state.units = { data: { units: [], totalCount: 0 }, isError: true };
    renderPage('unit-listing');
    expect(screen.getByTestId('unit-listing-tab')).toBeInTheDocument();
  });
});

describe('BlockProjectPage Condo shell', () => {
  beforeEach(() => {
    state.project = { data: {}, isError: false };
    state.pricing = { data: undefined, isError: false };
    state.units = { data: undefined, isError: false };
    state.land = { data: undefined, isError: false };
  });

  it('wraps a Condo tab in the header and tab bar', () => {
    renderPage('unit-price');
    expect(screen.getByRole('tablist')).toBeInTheDocument();
    expect(screen.getByTestId('unit-price-tab')).toBeInTheDocument();
  });

  it('shows no mismatch indicator in the header (only the per-field hints compare figures)', () => {
    state.project = { data: { unitForSaleCount: 3 }, isError: false };
    state.units = { data: { units: [], totalCount: 5, remainingCount: 5 }, isError: false };
    renderPage('unit-price');
    expect(screen.queryByRole('button', { name: /Mismatch/ })).toBeNull();
    expect(screen.queryByText(/Mismatch/)).toBeNull();
  });

  it('expand table hides the project header and the tab bar; Esc brings them back', async () => {
    const { user } = renderPage('unit-price');
    expect(screen.getByRole('tablist')).toBeInTheDocument();

    await user.click(screen.getByText('toggle-focus'));
    expect(screen.queryByRole('tablist')).toBeNull();
    expect(screen.getByTestId('unit-price-tab')).toBeInTheDocument();

    await user.keyboard('{Escape}');
    expect(screen.getByRole('tablist')).toBeInTheDocument();
  });

  it('Esc does not leave the expanded table while a dialog is open (it owns Esc)', async () => {
    const { user } = renderPage('unit-price');
    await user.click(screen.getByText('toggle-focus'));
    const dialog = document.body.appendChild(document.createElement('dialog'));

    await user.keyboard('{Escape}');
    expect(screen.queryByRole('tablist')).toBeNull();

    dialog.remove();
    await user.keyboard('{Escape}');
    expect(screen.getByRole('tablist')).toBeInTheDocument();
  });
});

describe('BlockProjectPage LB and L share the shell', () => {
  beforeEach(() => {
    state.project = { data: {}, isError: false };
    state.pricing = { data: undefined, isError: false };
    state.units = { data: undefined, isError: false };
    state.land = { data: undefined, isError: false };
  });

  it('LB gets the header and tab bar, with a title-deeds tile instead of a towers tile', () => {
    state.project = { data: { projectType: 'LB' }, isError: false };
    state.land = { data: { titles: [{}, {}], totalLandAreaInSqWa: 630 }, isError: false };
    renderPage('unit-price', 'LB');

    expect(screen.getByRole('tablist')).toBeInTheDocument();
    expect(screen.getByTestId('unit-price-tab')).toBeInTheDocument();
    expect(screen.getByText('Housing estate')).toBeInTheDocument();
    const tile = screen.getByRole('button', { name: /Title deeds/ });
    expect(tile).toHaveTextContent('2 plots');
    expect(tile).toHaveTextContent('1-2-30.00 rai');
    expect(screen.queryByText('Towers')).toBeNull();
    expect(screen.getByRole('tab', { name: /Model/ })).toBeInTheDocument();
  });

  it('an L project opened on the village route resolves to L: no models tab or tile, L badge', () => {
    state.project = { data: { projectType: 'L' }, isError: false };
    // The project-info tab owns its own frame (stubbed here), so it only shows the resolved type;
    // the shell around it is read on another tab.
    const { unmount } = renderPage('project-info', 'LB');
    expect(screen.getByTestId('project-info-tab')).toHaveAttribute('data-type', 'L');
    unmount();

    renderPage('unit-price', 'LB');
    expect(screen.getByText('Land and Building (Construction)')).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /Project Land/ })).toBeInTheDocument();
    expect(screen.queryByRole('tab', { name: /Model/ })).toBeNull();
    expect(screen.queryByRole('button', { name: /Models/ })).toBeNull();
  });

  it('an L project falls back to project info when the URL asks for the models tab', () => {
    state.project = { data: { projectType: 'L' }, isError: false };
    renderPage('models', 'LB');
    expect(screen.getByTestId('project-info-tab')).toHaveAttribute('data-type', 'L');
  });
});
