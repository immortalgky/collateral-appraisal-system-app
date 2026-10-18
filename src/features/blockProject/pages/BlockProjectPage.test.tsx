import { beforeEach, describe, expect, it, vi } from 'vitest';
import '@/i18n';
import { render, screen } from '@/test/test-utils';
import { AppraisalProvider } from '@/features/appraisal/context/AppraisalContext';
import BlockProjectPage from './BlockProjectPage';

// No network: every query the page reads is a fixture, and the tabs are stubs that say they rendered.
const state = vi.hoisted(() => ({
  pricing: { data: undefined as unknown, isError: false },
  units: { data: undefined as unknown, isError: false },
}));

const query = (q: { data: unknown; isError: boolean }) => ({
  data: q.data,
  isError: q.isError,
  refetch: vi.fn(),
});

vi.mock('../api/project', () => ({
  useGetProject: () => ({ data: {}, isError: false, refetch: vi.fn() }),
}));
vi.mock('../api/projectModel', () => ({
  useGetProjectModels: () => query({ data: [], isError: false }),
}));
vi.mock('../api/projectTower', () => ({
  useGetProjectTowers: () => query({ data: [], isError: false }),
}));
vi.mock('../api/projectLand', () => ({
  useGetProjectLand: () => query({ data: undefined, isError: false }),
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
vi.mock('../components/tabs/ProjectInfoTab', () => ({ default: () => null }));
vi.mock('../components/tabs/ProjectLandTab', () => ({ default: () => null }));
vi.mock('../components/tabs/ModelListingTab', () => ({ default: () => null }));
vi.mock('../components/tabs/TowerListingTab', () => ({ default: () => null }));
vi.mock('../components/tabs/UnitListingTab', () => ({
  default: () => <div data-testid="unit-listing-tab" />,
}));
vi.mock('../components/tabs/UnitPriceTab', () => ({
  default: () => <div data-testid="unit-price-tab" />,
}));

const renderPage = (tab: string) =>
  render(
    <AppraisalProvider
      value={{
        appraisal: { appraisalId: 'a1', requestId: 'r1' },
        isLoading: false,
        isError: false,
        error: null,
      }}
    >
      <BlockProjectPage projectType="U" />
    </AppraisalProvider>,
    { initialEntries: [`/?tab=${tab}`] },
  );

describe('BlockProjectPage error gates', () => {
  beforeEach(() => {
    state.pricing = { data: undefined, isError: false };
    state.units = { data: undefined, isError: false };
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
