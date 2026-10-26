import { useState } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import '@/i18n';
import toast from 'react-hot-toast';
import { QueryClient } from '@tanstack/react-query';
import { render, screen, waitFor, within } from '@/test/test-utils';
import { AppraisalProvider } from '@/features/appraisal/context/AppraisalContext';
import { CondoShellContext } from '../condo/CondoShellContext';
import { PageReadOnlyContext } from '@/shared/contexts/PageReadOnlyContext';
import type { ProjectType, ProjectUnitPrice, UnitPriceSourceInfo } from '../../types';
import UnitPriceTab from './UnitPriceTab';

vi.mock('react-hot-toast', () => ({ default: { success: vi.fn(), error: vi.fn() } }));

// No network: every API hook the tab reads is replaced by a fixture.
const state = vi.hoisted(() => ({
  prices: [] as unknown[],
  source: {
    source: 'Calculated',
    fileName: null,
    importedAt: null,
    importedBy: null,
    pricedUnitCount: 2,
  } as unknown,
  sourceStatus: 'ok' as 'ok' | 'loading' | 'error' | 'cachedError',
  busy: false,
  hasAssumption: true,
  saveAssumptionError: undefined as unknown,
  assumptionStatus: 'ok' as 'ok' | 'loading' | 'error' | 'cachedError',
  ratesStatus: 'ok' as 'ok' | 'loading' | 'error' | 'cachedError',
  pricesStatus: 'ok' as 'ok' | 'loading' | 'error' | 'cachedError',
  ratesOptions: [] as unknown[],
  sourceOptions: [] as unknown[],
  pricesOptions: [] as unknown[],
  sourceFetching: false,
  assumptionFetching: false,
  pricesFetching: false,
  sourceUpdatedAt: 1,
  refetchRates: undefined as unknown as ReturnType<typeof vi.fn>,
  refetchPrices: undefined as unknown as ReturnType<typeof vi.fn>,
  afterAssumptionSave: undefined as (() => void) | undefined,
}));

vi.mock('../../api/projectUnitPrice', () => ({
  projectUnitPriceKeys: {
    all: (id: string) => ['appraisal', id, 'project', 'unit-prices'] as const,
  },
  useGetProjectUnitPrices: (_id: string, options?: unknown) => {
    state.pricesOptions.push(options);
    return {
      data: ['error', 'loading'].includes(state.pricesStatus) ? undefined : state.prices,
      isLoading: state.pricesStatus === 'loading',
      isFetching: state.pricesFetching,
      isError: state.pricesStatus !== 'ok',
      refetch: state.refetchPrices,
    };
  },
  useGetUnitPriceSource: (_id: string, options?: unknown) => {
    state.sourceOptions.push(options);
    return {
      data:
        state.sourceStatus === 'ok' || state.sourceStatus === 'cachedError'
          ? state.source
          : undefined,
      isLoading: state.sourceStatus === 'loading',
      isError: state.sourceStatus === 'error' || state.sourceStatus === 'cachedError',
      isFetching: state.sourceFetching,
      dataUpdatedAt: state.sourceUpdatedAt,
      refetch: vi.fn(),
    };
  },
  useCalculateProjectUnitPrices: () => ({ mutateAsync: vi.fn(), isPending: false }),
  useSaveProjectUnitPrices: () => ({ mutateAsync: vi.fn(), isPending: state.busy }),
  useDownloadUnitPriceTemplate: () => ({ mutate: vi.fn(), isPending: false }),
  usePreviewUnitPriceImport: () => ({ mutate: vi.fn(), isPending: false }),
  useImportUnitPrices: () => ({ mutate: vi.fn(), isPending: false }),
}));
// Stable identity on purpose: the tab resets its form from this object in an effect, so a fresh
// object per render would loop forever.
const assumption = vi.hoisted(() => ({
  locationMethod: 'AdjustPriceSqm',
  systemDefaultForceSalePercentage: 80,
  // The model would price this unit at 85,000/sq.m., not the stored 99,000.
  modelAssumptions: [
    {
      projectModelId: 'm1',
      modelType: '1 Br.',
      finalAppraisedValue: 85_000,
      coverageAmount: 15_000,
      fireInsuranceCode: 'RC',
    },
  ],
}));
vi.mock('../../api/projectPricingAssumption', () => ({
  useGetProjectPricingAssumptions: () => ({
    // A saved assumption, or null (the endpoint answers 204 when nothing is saved yet): data either way.
    data: ['ok', 'cachedError'].includes(state.assumptionStatus)
      ? state.hasAssumption
        ? assumption
        : null
      : undefined,
    isLoading: state.assumptionStatus === 'loading',
    isFetching: state.assumptionFetching,
    isError: ['error', 'cachedError'].includes(state.assumptionStatus),
    refetch: vi.fn(),
  }),
  useSaveProjectPricingAssumptions: () => ({
    mutateAsync: vi.fn(() => {
      if (state.saveAssumptionError) return Promise.reject(state.saveAssumptionError);
      state.afterAssumptionSave?.();
      return Promise.resolve();
    }),
    isPending: false,
  }),
}));
// The current rate for code RC is 16,000, not the 15,000 saved on the model assumption.
const fireRates = vi.hoisted(() => [
  { code: 'RC', condition: 'RC', propertyKind: 'Condo', ratePerSqm: 16_000, displaySeq: 1 },
]);
vi.mock('@/shared/api/pricingParameters', () => ({
  useFireInsuranceOptions: () => [],
  useGetFireInsuranceRates: (options?: unknown) => {
    state.ratesOptions.push(options);
    return {
      data: ['ok', 'cachedError'].includes(state.ratesStatus) ? fireRates : undefined,
      isLoading: state.ratesStatus === 'loading',
      isError: ['error', 'cachedError'].includes(state.ratesStatus),
      refetch: state.refetchRates,
    };
  },
}));
// The dialog has its own tests; here it is a button that reports a finished import.
vi.mock('../UnitPriceImportDialog', () => ({
  default: ({
    onImported,
    onClose,
  }: {
    onImported: (result: { fileName: string }, startedAt: number) => void;
    onClose: () => void;
  }) => (
    <button
      type="button"
      onClick={() => {
        onImported({ fileName: 'B.xlsx' }, Date.now());
        onClose();
      }}
    >
      fake-import-succeeds
    </button>
  ),
}));
vi.mock('../../forms/PricingAssumptionForm', async () => {
  const { useFormContext } = await import('react-hook-form');
  const { useFormReadOnly } = await import('@/shared/components/form/context');
  return {
    // One real field, so a test can make the form dirty by typing.
    default: function PricingAssumptionFormStub() {
      const { register } = useFormContext();
      const readOnly = useFormReadOnly();
      return (
        <div data-testid="assumption-form">
          <input
            aria-label="corner adjustment"
            disabled={readOnly}
            {...register('cornerAdjustment')}
          />
        </div>
      );
    },
  };
});

const unitPrice = (over: Partial<ProjectUnitPrice> = {}): ProjectUnitPrice => ({
  projectUnitId: 'u1',
  sequenceNumber: 1,
  projectModelId: 'm1',
  roomNumber: '15A01',
  usableArea: 30.5,
  isSold: false,
  isCorner: false,
  isEdge: false,
  isOther: false,
  isPoolView: false,
  isSouth: false,
  isNearGarden: false,
  standardPrice: 99_000,
  totalAppraisalValue: 3_021_000,
  totalAppraisalValueRounded: 3_021_000,
  forceSellingPrice: 2_417_000,
  coverageAmount: 458_000,
  ...over,
});

const tabTree = (readOnly = false, projectType: ProjectType = 'U') => (
  <AppraisalProvider
    value={{
      appraisal: { appraisalId: 'a1', requestId: 'r1' },
      isLoading: false,
      isError: false,
      error: null,
    }}
  >
    <PageReadOnlyContext.Provider value={readOnly}>
      <UnitPriceTab projectType={projectType} />
    </PageReadOnlyContext.Provider>
  </AppraisalProvider>
);

const renderTab = (readOnly = false, projectType: ProjectType = 'U', queryClient?: QueryClient) =>
  render(tabTree(readOnly, projectType), { queryClient });

const importedSource: UnitPriceSourceInfo = {
  source: 'Imported',
  fileName: 'prices.xlsx',
  importedAt: '2026-10-16T14:20:00',
  importedBy: 'somchai',
  pricedUnitCount: 2,
};

const setViewport = (width: number) =>
  Object.defineProperty(window, 'innerWidth', { value: width, configurable: true, writable: true });

describe('UnitPriceTab', () => {
  beforeEach(() => {
    state.prices = [
      unitPrice(),
      unitPrice({ projectUnitId: 'u2', sequenceNumber: 2, roomNumber: '16A02', isSold: true }),
    ];
    state.source = {
      source: 'Calculated',
      fileName: null,
      importedAt: null,
      importedBy: null,
      pricedUnitCount: 2,
    };
    state.sourceStatus = 'ok';
    state.busy = false;
    state.hasAssumption = true;
    state.saveAssumptionError = undefined;
    vi.mocked(toast.error).mockClear();
    state.assumptionStatus = 'ok';
    state.ratesStatus = 'ok';
    state.pricesStatus = 'ok';
    state.ratesOptions = [];
    state.sourceOptions = [];
    state.pricesOptions = [];
    state.sourceFetching = false;
    state.assumptionFetching = false;
    state.pricesFetching = false;
    state.sourceUpdatedAt = 1;
    state.refetchRates = vi.fn();
    state.refetchPrices = vi.fn();
    state.afterAssumptionSave = undefined;
    // The assumptions panel starts open from 1600px wide, and its choice lives in localStorage.
    setViewport(1600);
    window.localStorage.clear();
  });

  // Typing into the form is the cheapest real edit: it makes the form dirty, and with no flag set
  // it leaves every price exactly as the model would price it.
  const editAssumption = (user: ReturnType<typeof renderTab>['user']) =>
    user.type(screen.getByLabelText('corner adjustment'), '5');
  // The condo flags are toggle chips named after the location.
  const cornerChips = () => screen.getAllByRole('button', { name: 'Corner' });

  it('condo shows the stored prices on load: no preview badge, no unsaved indicator', () => {
    renderTab(); // the fixture rows were stored from a different price (99,000/sq.m.)

    expect(screen.getAllByText('99,000.00').length).toBeGreaterThan(0);
    expect(screen.queryByText('85,000.00')).toBeNull();
    expect(screen.getByText('Saved prices')).toBeInTheDocument();
    expect(screen.queryByText('Preview (not saved)')).toBeNull();
    expect(screen.queryByText('Unsaved changes')).toBeNull();
    // What a recalculation would do is a hint, not an unsaved change.
    expect(
      screen.getByText('Recalculating would change the price of 2 units.'),
    ).toBeInTheDocument();
  });

  it('read-only: no "recalculating would change" hint, since nobody there can recalculate', () => {
    renderTab(true);

    expect(screen.queryByText(/Recalculating would change/)).toBeNull();
  });

  it('editing an assumption shows the recompute, highlights it and offers the way back', async () => {
    const { user } = renderTab();

    await editAssumption(user);

    expect(screen.getByText('Preview (not saved)')).toBeInTheDocument();
    expect(screen.getByText('Unsaved changes')).toBeInTheDocument();
    expect(screen.getByText(/-857,000\.00/)).toBeInTheDocument(); // 2 x (2,592,500 - 3,021,000)
    expect(screen.queryByText(/Recalculating would change/)).toBeNull();

    await user.click(screen.getByRole('button', { name: 'Back to saved values' }));

    expect(screen.queryByText('Unsaved changes')).toBeNull();
    expect(screen.queryByText('Preview (not saved)')).toBeNull();
    expect(screen.getAllByText('99,000.00').length).toBeGreaterThan(0);
    expect(screen.getByLabelText('corner adjustment')).toHaveValue('');
  });

  // m2 is not among the model assumptions: it has no standard price.
  const withUnpricedModelUnit = () => {
    state.prices = [
      unitPrice(),
      unitPrice({
        projectUnitId: 'u2',
        sequenceNumber: 2,
        projectModelId: 'm2',
        roomNumber: '16A02',
      }),
    ];
  };

  it('stored view: a unit whose model has no standard price still shows and counts its stored values', () => {
    withUnpricedModelUnit();
    renderTab();

    const row = screen.getByText('16A02').closest('tr') as HTMLElement;
    expect(within(row).getAllByText('3,021,000.00').length).toBeGreaterThan(0);
    expect(within(row).queryByText('Standard price pending')).toBeNull();
    // Both units carry a stored price, as the source's pricedUnitCount (2) says: both are in the
    // totals row (2 x 3,021,000, under the appraisal value and the rounded value).
    const foot = screen.getByText('Total — 2 units').closest('tr') as HTMLElement;
    expect(within(foot).getAllByText('6,042,000.00')).toHaveLength(2);
    // The hint counts the unit whose price a recalculation would replace, and says why.
    expect(
      screen.getByText(
        /would change the price of 2 units\. 1 of them has a model with no standard/,
      ),
    ).toBeInTheDocument();
  });

  it('recompute view: a unit whose model has no standard price shows a dash, stays out of the totals, and the note says Save would recalculate it', async () => {
    withUnpricedModelUnit();
    const { user } = renderTab();
    await editAssumption(user);

    const row = screen.getByText('16A02').closest('tr') as HTMLElement;
    expect(within(row).getByText('Standard price pending')).toBeInTheDocument();
    expect(within(row).queryByText('3,021,000.00')).toBeNull();
    expect(within(row).getAllByText('—').length).toBeGreaterThan(0);
    // Only the priced unit is in the totals row.
    const foot = screen.getByText('Total — 2 units').closest('tr') as HTMLElement;
    expect(within(foot).getAllByText('2,592,500.00').length).toBeGreaterThan(0);
    expect(within(foot).queryByText('6,042,000.00')).toBeNull();
    expect(
      screen.getByText(/1 unit holds a stored price but its model has no standard price/),
    ).toBeInTheDocument();
    // The difference counts losing that unit's stored price: 2,592,500 - 2 x 3,021,000.
    expect(screen.getByText(/-3,449,500\.00/)).toBeInTheDocument();
  });

  it('Calculated view recomputes from the model once edited; coverage is a per-unit total, not x area', async () => {
    const { user } = renderTab();
    await editAssumption(user);

    // The model's 85,000/sq.m., not the stored 99,000.
    expect(screen.getAllByText('85,000.00').length).toBeGreaterThan(0);
    expect(screen.queryByText('99,000.00')).toBeNull();
    // The current fire-insurance rate (16,000), not the saved 15,000: 16,000 x 30.5 = 488,000 per
    // unit, 976,000 for the two. Never multiplied by the area a second time.
    expect(screen.getAllByText('488,000.00').length).toBe(2);
    expect(screen.getByText('976,000.00')).toBeInTheDocument();
    expect(screen.queryByText('458,000.00')).toBeNull();
    expect(screen.queryByText('14,884,000.00')).toBeNull();
  });

  it('prices the forced sale with the system default when the form has no valid percentage', async () => {
    const { user } = renderTab();
    await editAssumption(user);

    // 85,000 x 30.5 = 2,592,500 x 80% = 2,074,000
    expect(screen.getAllByText('2,074,000.00').length).toBe(2);
  });

  it('marks sold units and still counts them in the totals', () => {
    renderTab();

    const soldRow = screen.getByText('16A02').closest('tr') as HTMLElement;
    expect(within(soldRow).getByText('Sold')).toBeInTheDocument();
    expect(screen.getByText('Total — 2 units')).toBeInTheDocument();
  });

  it('says "1 unit", not "1 units", in the header count and the total row', () => {
    state.prices = [unitPrice()];
    renderTab();

    expect(screen.getByText('1 unit')).toBeInTheDocument();
    expect(screen.getByText('Total — 1 unit')).toBeInTheDocument();
  });

  it('offers the model assumptions and Save in the Calculated view', () => {
    renderTab();

    expect(screen.getByTestId('assumption-form')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^Save and recalculate$/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Save Draft/ })).toBeInTheDocument();
  });

  it('Imported view: import card, stored values, no assumption form, flags or Save', () => {
    state.source = importedSource;
    renderTab();

    expect(screen.getByText('prices.xlsx')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Upload price file/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Download template/ })).toBeInTheDocument();
    expect(screen.queryByTestId('assumption-form')).toBeNull();
    expect(screen.queryByRole('button', { name: /^Save and recalculate$/ })).toBeNull();
    expect(screen.queryByRole('button', { name: /Save Draft/ })).toBeNull();
    expect(screen.queryByRole('columnheader', { name: 'Corner' })).toBeNull();
    expect(screen.getAllByText('99,000.00').length).toBeGreaterThan(0);
  });

  it('Imported view with no prices yet asks the user to upload', () => {
    state.source = { ...importedSource, fileName: null };
    state.prices = [unitPrice({ totalAppraisalValueRounded: undefined })];
    renderTab();

    expect(screen.getByText(/No prices yet/)).toBeInTheDocument();
  });

  it('shows a skeleton, not rows priced at 0, while the model lookup is loading', () => {
    state.assumptionStatus = 'loading';
    renderTab();

    expect(screen.queryByText('16A02')).toBeNull();
    expect(screen.queryByText('0.00')).toBeNull();
  });

  it('shows an error with retry, not rows priced at 0, when the model lookup fails', () => {
    state.assumptionStatus = 'error';
    renderTab();

    expect(screen.queryByText('16A02')).toBeNull();
    expect(screen.getByRole('button', { name: 'Retry' })).toBeInTheDocument();
  });

  it('cannot save over the stored assumption while it is loading or has failed to load', () => {
    state.assumptionStatus = 'loading';
    const first = renderTab();
    expect(screen.queryByTestId('assumption-form')).toBeNull();
    expect(screen.getByRole('button', { name: /^Save and recalculate$/ })).toBeDisabled();
    expect(screen.getByRole('button', { name: /Save Draft/ })).toBeDisabled();
    first.unmount();

    state.assumptionStatus = 'error';
    renderTab();
    expect(screen.queryByTestId('assumption-form')).toBeNull();
    expect(screen.getByRole('button', { name: /^Save and recalculate$/ })).toBeDisabled();
    expect(screen.getByRole('button', { name: /Save Draft/ })).toBeDisabled();
  });

  it.each(['Calculated', 'Imported'] as const)(
    'a failed unit-price load is an error with Retry, not "no units uploaded" (%s view)',
    source => {
      state.source = { ...importedSource, source };
      state.pricesStatus = 'error';
      renderTab();

      expect(screen.getByRole('button', { name: 'Retry' })).toBeInTheDocument();
      expect(screen.queryByText(/No units uploaded/i)).toBeNull();
    },
  );

  it('takes the current fire-insurance rates on mount, and again after a successful Save', async () => {
    const { user } = renderTab();

    // The global cache is "never stale"; this tab previews what the server will price with.
    expect(state.ratesOptions.every(o => (o as { alwaysRefetch?: boolean })?.alwaysRefetch)).toBe(
      true,
    );
    expect(state.refetchRates).not.toHaveBeenCalled();

    await user.click(screen.getByRole('button', { name: /^Save and recalculate$/ }));

    await waitFor(() => expect(state.refetchRates).toHaveBeenCalled());
  });

  it('is not a preview while the lookup is still loading: an empty lookup would flag every row', () => {
    state.assumptionStatus = 'loading';
    renderTab();

    expect(screen.queryByText('Preview (not saved)')).toBeNull();
    expect(screen.queryByText('Unsaved changes')).toBeNull();
  });

  it('condo: lists the model assumptions by tower then model in natural order, no tower last', async () => {
    const saved = assumption.modelAssumptions;
    const model = (id: string, towerName: string | undefined, modelType: string) => ({
      projectModelId: id,
      towerName,
      modelType,
      finalAppraisedValue: 1,
    });
    // Unsorted on purpose.
    assumption.modelAssumptions = [
      model('a', 'B', '3 BEDROOMS'),
      model('b', 'A', '1 BEDROOM'),
      model('c', undefined, 'Z LOFT'),
      model('d', 'B', 'STUDIO'),
      model('e', 'A', '10 X'),
      model('f', 'A', '2 Y'),
    ] as unknown as typeof saved;
    try {
      const { user } = renderTab();
      await user.click(screen.getByRole('button', { name: /^Model assumptions/ }));

      const table = screen.getByText('STUDIO').closest('table') as HTMLElement;
      const order = within(table)
        .getAllByRole('row')
        .slice(1) // the header row
        .map(row => Array.from(row.querySelectorAll('td'), td => td.textContent).slice(0, 2));
      expect(order).toEqual([
        ['A', '1 BEDROOM'],
        ['A', '2 Y'],
        ['A', '10 X'],
        ['B', '3 BEDROOMS'],
        ['B', 'STUDIO'],
        ['-', 'Z LOFT'],
      ]);
    } finally {
      assumption.modelAssumptions = saved;
    }
  });

  it('lists the same coverage rate the preview uses: the current fire rate, not the saved snapshot', async () => {
    const { user } = renderTab();
    expect(screen.queryByText('16,000')).toBeNull(); // the model assumptions start folded

    await user.click(screen.getByRole('button', { name: /^Model assumptions/ }));

    expect(screen.getByText('16,000')).toBeInTheDocument(); // current rate for code RC
    expect(screen.queryByText('15,000')).toBeNull(); // the rate saved on the model assumption
  });

  it.each(['sourceStatus', 'assumptionStatus', 'ratesStatus', 'pricesStatus'] as const)(
    'a failed background refetch with cached data (%s) keeps the tab on screen',
    key => {
      state[key] = 'cachedError';
      renderTab();

      expect(screen.getByText('16A02')).toBeInTheDocument(); // the rows are still there
      expect(screen.getByRole('button', { name: /Import from Excel/ })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /^Save and recalculate$/ })).toBeEnabled();
      expect(screen.queryByRole('button', { name: 'Retry' })).toBeNull();
    },
  );

  it('takes the price source and the unit prices fresh on mount, and holds Save until the source is in', () => {
    // A cached 'Calculated' while the server already says 'Imported'.
    state.source = { ...importedSource, source: 'Calculated', fileName: null };
    state.sourceFetching = true;
    const view = renderTab();

    const alwaysRefetch = (o: unknown) => (o as { alwaysRefetch?: boolean })?.alwaysRefetch;
    expect(state.sourceOptions.every(alwaysRefetch)).toBe(true);
    expect(state.pricesOptions.every(alwaysRefetch)).toBe(true);
    expect(screen.getByRole('button', { name: /^Save and recalculate$/ })).toBeDisabled();
    expect(screen.getByRole('button', { name: /Save Draft/ })).toBeDisabled();

    // The refetch lands: the mode follows the server, and Save is not held any longer.
    state.source = importedSource;
    state.sourceFetching = false;
    view.rerender(tabTree());

    expect(screen.getByRole('button', { name: /Upload price file/ })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /^Save and recalculate$/ })).toBeNull(); // Imported view: no Save
  });

  it('after an import succeeds, leaving it asks for confirmation even while the source refetch is in flight', async () => {
    state.source = { ...importedSource, source: 'Calculated', fileName: null }; // the cached source
    const { user } = renderTab();

    await user.click(screen.getByRole('button', { name: /Import from Excel/ }));
    await user.click(screen.getByText('Switch mode')); // condo asks first: the units hold prices
    await user.click(screen.getByRole('button', { name: /Upload price file/ }));
    state.sourceFetching = true; // the invalidated source query is refetching
    await user.click(screen.getByText('fake-import-succeeds'));

    await user.click(screen.getByRole('button', { name: /Calculated in system/ }));

    expect(screen.getByText('Switch to system calculation?')).toBeInTheDocument();
  });

  it('shows the file just imported, not the previous one, while the source refetch is in flight', async () => {
    state.source = { ...importedSource, fileName: 'A.xlsx' };
    const { user } = renderTab();
    expect(screen.getByText('A.xlsx')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /Upload price file/ }));
    state.sourceFetching = true; // the source is refetching; the cache still says A
    await user.click(screen.getByText('fake-import-succeeds'));

    expect(screen.getByText('B.xlsx')).toBeInTheDocument();
    expect(screen.queryByText('A.xlsx')).toBeNull();
  });

  it('keeps showing the file just imported when the source refetch failed (the cache still says A)', async () => {
    state.source = { ...importedSource, fileName: 'A.xlsx' }; // already Imported, from A
    const { user } = renderTab();

    await user.click(screen.getByRole('button', { name: /Upload price file/ }));
    await user.click(screen.getByText('fake-import-succeeds'));
    // The refetch is over (not fetching) but failed: dataUpdatedAt is still the old read's.

    expect(screen.getByText('B.xlsx')).toBeInTheDocument();
    expect(screen.queryByText('A.xlsx')).toBeNull();
  });

  it('hands over to the server record once a read newer than the write shows the new file', async () => {
    state.source = { ...importedSource, fileName: 'A.xlsx' };
    const { user, rerender } = renderTab();

    await user.click(screen.getByRole('button', { name: /Upload price file/ }));
    await user.click(screen.getByText('fake-import-succeeds'));
    expect(screen.getByText('B.xlsx')).toBeInTheDocument();
    // The importer is in the file's tooltip.
    expect(screen.queryByTitle(/server-user/)).toBeNull();

    state.source = { ...importedSource, fileName: 'B.xlsx', importedBy: 'server-user' };
    state.sourceUpdatedAt = Date.now() + 60_000; // a read that completed after the write
    rerender(tabTree());

    // The server's own record (its importer) has replaced the optimistic one.
    expect(screen.getByTitle(/server-user/)).toBeInTheDocument();
    expect(screen.getByText('B.xlsx')).toBeInTheDocument();
  });

  it('after a calculate, a stale cached Imported record never reads as current', async () => {
    state.source = { ...importedSource, fileName: 'A.xlsx' }; // cached; the refetch will fail
    const { user } = renderTab();

    await user.click(screen.getByRole('button', { name: /Calculated in system/ }));
    await user.click(screen.getByText('Switch mode'));
    await user.click(screen.getByRole('button', { name: /^Save and recalculate$/ })); // calculate succeeds
    await waitFor(() =>
      expect(screen.getByRole('button', { name: /^Save and recalculate$/ })).toBeEnabled(),
    );

    await user.click(screen.getByRole('button', { name: /Import from Excel/ }));
    await user.click(screen.getByText('Switch mode'));

    expect(screen.queryByText('A.xlsx')).toBeNull();
    // The import controls are still in the head, without a file and without the no-file hint.
    expect(screen.getByRole('button', { name: /Upload price file/ })).toBeInTheDocument();
    expect(screen.queryByText(/No price file yet/)).toBeNull();
  });

  it('shows the unsaved indicator for a form edit even when the lookup is not ready', async () => {
    state.ratesStatus = 'error'; // no rates: the preview badge is withheld
    const { user } = renderTab();
    expect(screen.queryByText('Unsaved changes')).toBeNull();

    await user.type(screen.getByLabelText('corner adjustment'), '5');

    expect(screen.getByText('Unsaved changes')).toBeInTheDocument();
    expect(screen.queryByText('Preview (not saved)')).toBeNull();
  });

  it('Imported view stays usable when the assumption query failed with no data', () => {
    state.source = importedSource;
    state.assumptionStatus = 'error';
    renderTab();

    expect(screen.getByText('prices.xlsx')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Download template/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Upload price file/ })).toBeInTheDocument();
    expect(screen.getByText('16A02')).toBeInTheDocument(); // the stored rows
    expect(screen.queryByRole('button', { name: 'Retry' })).toBeNull();
  });

  it('keeps B on the card when a read that began before the import lands after it, still showing A', async () => {
    state.source = { ...importedSource, fileName: 'A.xlsx' };
    const { user, rerender } = renderTab();

    await user.click(screen.getByRole('button', { name: /Upload price file/ }));
    await user.click(screen.getByText('fake-import-succeeds'));
    expect(screen.getByText('B.xlsx')).toBeInTheDocument();

    // The slow GET (started before the import) lands now: newer than the write, same source, but
    // still the record of file A. The import's own refetch failed, so nothing else has come in.
    state.sourceUpdatedAt = Date.now() + 60_000;
    rerender(tabTree());

    expect(screen.getByText('B.xlsx')).toBeInTheDocument();
    expect(screen.queryByText('A.xlsx')).toBeNull();
  });

  it('never says "no price file yet" over imported prices whose file record is gone', () => {
    state.source = { ...importedSource, fileName: null };
    renderTab();

    expect(screen.queryByText(/No price file yet/)).toBeNull();
    expect(screen.getByText(/details are not available/)).toBeInTheDocument();
  });

  it('a successful null assumption is data: a failed refetch afterwards is not an error state', () => {
    state.hasAssumption = false; // resolved to null
    state.assumptionStatus = 'cachedError';
    renderTab();

    expect(screen.getByText('16A02')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Retry' })).toBeNull();
    expect(screen.getByRole('button', { name: /^Save and recalculate$/ })).toBeEnabled();
  });

  it('waits for the fire-insurance rates too: skeleton while loading, retry if they fail', () => {
    state.ratesStatus = 'loading';
    const first = renderTab();
    expect(screen.queryByText('16A02')).toBeNull();
    first.unmount();

    state.ratesStatus = 'error';
    renderTab();
    expect(screen.queryByText('16A02')).toBeNull();
    expect(screen.getByRole('button', { name: 'Retry' })).toBeInTheDocument();
  });

  it('is not a preview when the recompute merely differs from what is stored: a hint, nothing unsaved', () => {
    renderTab(); // the fixture rows were stored from a different price

    expect(screen.queryByText('Preview (not saved)')).toBeNull();
    expect(screen.queryByText('Unsaved changes')).toBeNull();
    expect(screen.getByText(/Recalculating would change the price of 2 units/)).toBeInTheDocument();
  });

  it('a project that was never calculated shows dashes, not zeros, and offers the recalculation as a hint', () => {
    state.prices = [
      unitPrice({
        totalAppraisalValueRounded: undefined,
        forceSellingPrice: undefined,
        coverageAmount: undefined,
      }),
    ];
    renderTab();

    expect(screen.queryByText('Preview (not saved)')).toBeNull();
    expect(screen.queryByText('Unsaved changes')).toBeNull();
    const row = screen.getByText('15A01').closest('tr') as HTMLElement;
    expect(within(row).getAllByText('—').length).toBeGreaterThan(0); // not priced: dashes
    expect(within(row).queryByText('0.00')).toBeNull();
    expect(
      screen.getByText(/Recalculating would change the price of 1 unit\./),
    ).toBeInTheDocument();
  });

  // Rows stored exactly as the recompute from the fixture model would write them.
  const matching = (over: Partial<ProjectUnitPrice> = {}) =>
    unitPrice({
      standardPrice: 85_000,
      totalAppraisalValue: 2_592_500,
      totalAppraisalValueRounded: 2_592_500,
      forceSellingPrice: 2_074_000,
      coverageAmount: 488_000,
      adjustPriceLocation: 0,
      priceIncrementPerFloor: 0,
      ...over,
    });

  it('is plainly "Calculated" only when the recompute equals what is stored', () => {
    state.prices = [matching(), matching({ projectUnitId: 'u2', roomNumber: '16A02' })];
    renderTab();

    expect(screen.queryByText('Preview (not saved)')).toBeNull();
    expect(screen.queryByText('Unsaved changes')).toBeNull();
    expect(screen.queryByText(/Recalculating would change/)).toBeNull();
  });

  it('a saved assumption loaded into the form is the baseline, not an edit: nothing unsaved on load', () => {
    // Same object (the tab resets from it in an effect), with values the blank form does not have.
    Object.assign(assumption, { cornerAdjustment: 5000, forceSalePercentage: 80 });
    try {
      state.prices = [matching(), matching({ projectUnitId: 'u2', roomNumber: '16A02' })];
      renderTab();

      expect(screen.getByLabelText('corner adjustment')).toHaveValue('5000');
      expect(screen.queryByText('Unsaved changes')).toBeNull();
      expect(screen.queryByText('Preview (not saved)')).toBeNull();
    } finally {
      const saved = assumption as Record<string, unknown>;
      delete saved.cornerAdjustment;
      delete saved.forceSalePercentage;
    }
  });

  it('clears the unsaved marker after Save even when the refetch returns the same array', async () => {
    // The mocked query hands back the very same array before and after: no new reference, so
    // nothing but the save itself can reset the flag state.
    state.prices = [matching(), matching({ projectUnitId: 'u2', roomNumber: '16A02' })];
    const { user } = renderTab();

    const corner = cornerChips()[0];
    await user.click(corner); // on...
    await user.click(corner); // ...and off again: the value is unchanged but the edit is "dirty"
    expect(screen.getByText('Preview (not saved)')).toBeInTheDocument();
    expect(screen.getByText('Unsaved changes')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /^Save and recalculate$/ }));

    await waitFor(() => expect(screen.queryByText('Unsaved changes')).toBeNull());
    expect(screen.queryByText('Preview (not saved)')).toBeNull();
  });

  // LB and L share the condo layout and its rules. Fixtures: an LB unit stored from a different
  // model price (99,000) than the one the model assumption gives (85,000, a total per house).
  const lbUnit = (over: Partial<ProjectUnitPrice> = {}): ProjectUnitPrice =>
    unitPrice({
      roomNumber: undefined,
      plotNumber: 'P-01',
      houseNumber: '99/1',
      numberOfFloors: 2,
      landArea: 50,
      usableArea: 120,
      standardPrice: 99_000,
      landAreaDifference: 0,
      landIncreaseDecreaseAmount: 0,
      adjustPriceLocation: 0,
      totalAppraisalValue: 100_000,
      totalAppraisalValueRounded: 100_000,
      forceSellingPrice: 80_000,
      coverageAmount: 458_000,
      ...over,
    });
  // L (appraised as land only): no model, so the price is the land alone. Stored from a different rate (10,000/Sq.Wa)
  // than the saved 12,000.
  const landUnit = (over: Partial<ProjectUnitPrice> = {}): ProjectUnitPrice =>
    lbUnit({
      projectModelId: undefined,
      numberOfFloors: undefined,
      usableArea: undefined,
      landArea: 100,
      standardPrice: 0,
      landAreaDifference: 100,
      landIncreaseDecreaseAmount: 1_000_000,
      totalAppraisalValue: 1_000_000,
      totalAppraisalValueRounded: 1_000_000,
      forceSellingPrice: 800_000,
      coverageAmount: undefined,
      ...over,
    });
  const headers = () => screen.getAllByRole('columnheader').map(th => th.textContent);
  // An L project has no models, and its assumption holds the land rate and a corner amount.
  const withLandAssumption = async (run: () => void | Promise<void>) => {
    const models = assumption.modelAssumptions;
    Object.assign(assumption, {
      modelAssumptions: [],
      landIncreaseDecreaseRate: 12_000,
      cornerAdjustment: 5_000,
    });
    try {
      await run();
    } finally {
      const saved = assumption as Record<string, unknown>;
      delete saved.landIncreaseDecreaseRate;
      delete saved.cornerAdjustment;
      assumption.modelAssumptions = models;
    }
  };

  describe('LB: the condo layout and rules', () => {
    beforeEach(() => {
      state.prices = [
        lbUnit(),
        lbUnit({ projectUnitId: 'u2', sequenceNumber: 2, plotNumber: 'P-02' }),
      ];
    });

    it('has the LB columns: plot and house, land and land +/-, location, no tower or floor columns', () => {
      renderTab(false, 'LB');

      expect(headers()).toEqual([
        'Seq No',
        'Plot No',
        'House No',
        'Model',
        'No. of Floors',
        'Land Area (Sq.Wa)',
        'Usable Area (sq.m)',
        'Selling Price',
        'Standard Price (Baht/house)',
        'Location',
        'Land Diff (Sq.Wa)',
        'Land +/- (Baht)',
        'Location Adj.',
        'Appraisal Value',
        'Rounded Value',
        'Forced sale price',
        'Fire insurance value',
      ]);
    });

    it('lights LB locations as chips: near garden instead of pool view and south', () => {
      renderTab(false, 'LB');

      for (const name of ['Corner', 'Edge', 'Near Garden/Clubhouse', 'Other']) {
        expect(screen.getAllByRole('button', { name })).toHaveLength(2);
      }
      expect(screen.queryByRole('button', { name: 'Pool View' })).toBeNull();
      expect(screen.queryByRole('button', { name: 'South' })).toBeNull();
    });

    it('shows the stored prices on load: no preview, nothing unsaved, the recompute only a hint', () => {
      renderTab(false, 'LB');

      expect(screen.getAllByText('99,000.00').length).toBeGreaterThan(0);
      expect(screen.queryByText('85,000.00')).toBeNull(); // what the model would price it at
      expect(screen.getByText('Saved prices')).toBeInTheDocument();
      expect(screen.queryByText('Preview (not saved)')).toBeNull();
      expect(screen.queryByText('Unsaved changes')).toBeNull();
      expect(
        screen.getByText('Recalculating would change the price of 2 units.'),
      ).toBeInTheDocument();
    });

    it('a recompute that merely differs in the standard price is a hint, not a preview', () => {
      // Every figure but the model price (88,000 against 85,000: both round to 90,000) equals the
      // recompute: still a hint on one unit, nothing unsaved.
      state.prices = [
        lbUnit({
          standardPrice: 88_000,
          totalAppraisalValue: 85_000,
          totalAppraisalValueRounded: 90_000,
          forceSellingPrice: 72_000,
          coverageAmount: 1_920_000,
        }),
      ];
      renderTab(false, 'LB');

      expect(screen.queryByText('Preview (not saved)')).toBeNull();
      expect(screen.queryByText('Unsaved changes')).toBeNull();
      expect(
        screen.getByText('Recalculating would change the price of 1 unit.'),
      ).toBeInTheDocument();
    });

    it('a flag edit shows the recompute: the model price is a total per house, rounded to 10,000', async () => {
      const { user } = renderTab(false, 'LB');

      await user.click(screen.getAllByRole('button', { name: 'Corner' })[0]);

      expect(screen.getByText('Preview (not saved)')).toBeInTheDocument();
      expect(screen.getByText('Unsaved changes')).toBeInTheDocument();
      const row = screen.getByText('P-01').closest('tr') as HTMLElement;
      expect(within(row).getAllByText('85,000.00').length).toBeGreaterThan(0); // not x land area
      expect(within(row).getAllByText('90,000.00').length).toBeGreaterThan(0); // 10,000 rounding
      expect(within(row).getByText('72,000.00')).toBeInTheDocument(); // 80% of 90,000
      expect(within(row).getByText('1,920,000.00')).toBeInTheDocument(); // 16,000 x 120
    });

    it('switching Calculated to Imported asks in the page when units hold prices', async () => {
      const { user } = renderTab(false, 'LB');

      await user.click(screen.getByRole('button', { name: /Import from Excel/ }));

      expect(screen.getByText('Switch to imported prices?')).toBeInTheDocument();
      expect(screen.getByText(/2 units currently hold a price/)).toBeInTheDocument();
      expect(screen.getByTestId('assumption-form')).toBeInTheDocument(); // nothing switched yet
      expect(screen.queryByRole('button', { name: /Upload price file/ })).toBeNull();

      await user.click(screen.getByText('Switch mode'));
      expect(screen.queryByTestId('assumption-form')).toBeNull();
      expect(screen.getByRole('button', { name: /Upload price file/ })).toBeInTheDocument();
    });

    it('Imported view: the import controls in the head, the stored rows, no assumption form or Save', () => {
      state.source = importedSource;
      renderTab(false, 'LB');

      expect(screen.getByText('prices.xlsx')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Upload price file/ })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Download template/ })).toBeInTheDocument();
      expect(screen.queryByTestId('assumption-form')).toBeNull();
      expect(screen.queryByRole('button', { name: /^Save and recalculate$/ })).toBeNull();
      expect(screen.queryByRole('columnheader', { name: 'Location Adj.' })).toBeNull();
      expect(screen.getAllByText('99,000.00').length).toBeGreaterThan(0);
    });

    it('folds the model assumptions under the head, with the standard price per house', async () => {
      const { user } = renderTab(false, 'LB');

      await user.click(screen.getByRole('button', { name: 'Model assumptions 1/1' }));

      expect(screen.getByText('1 Br.')).toBeInTheDocument();
      expect(screen.getAllByText('Standard Price (Baht/house)')).toHaveLength(2); // table + results
    });
  });

  describe('L (land only): no models', () => {
    beforeEach(() => {
      state.prices = [
        landUnit(),
        landUnit({ projectUnitId: 'u2', sequenceNumber: 2, plotNumber: 'P-02' }),
      ];
    });

    it('has the L columns: land and its price, location; no model, floors, usable area, standard price or fire cover', async () => {
      await withLandAssumption(() => {
        renderTab(false, 'L');

        expect(headers()).toEqual([
          'Seq No',
          'Plot No',
          'House No',
          'Land Area (Sq.Wa)',
          'Selling Price',
          'Land price (Baht)',
          'Location',
          'Location Adj.',
          'Appraisal Value',
          'Rounded Value',
          'Forced sale price',
        ]);
        // No model table to open and nothing waiting on a standard price.
        expect(screen.queryByRole('button', { name: /^Model assumptions/ })).toBeNull();
        expect(screen.queryByText('Standard price pending')).toBeNull();
      });
    });

    it('lights Corner, Edge and Other only', async () => {
      await withLandAssumption(() => {
        renderTab(false, 'L');

        for (const name of ['Corner', 'Edge', 'Other']) {
          expect(screen.getAllByRole('button', { name })).toHaveLength(2);
        }
        expect(screen.queryByRole('button', { name: 'Near Garden/Clubhouse' })).toBeNull();
      });
    });

    it('the first state, before any assumption is saved (the endpoint answers null), renders and can be saved', () => {
      state.hasAssumption = false;
      renderTab(false, 'L');

      expect(screen.getByText('P-01')).toBeInTheDocument();
      expect(screen.getByTestId('assumption-form')).toBeInTheDocument();
      expect(screen.queryByRole('button', { name: 'Retry' })).toBeNull();
      expect(screen.queryByText('Unsaved changes')).toBeNull();
      expect(screen.queryByText('Preview (not saved)')).toBeNull();
      expect(screen.getByRole('button', { name: /^Save and recalculate$/ })).toBeEnabled();
    });

    it('recomputes a unit as land area x the land rate + the location amount, with no model to read', async () => {
      await withLandAssumption(async () => {
        const { user } = renderTab(false, 'L');
        expect(screen.queryByText('Preview (not saved)')).toBeNull(); // the stored prices first

        await user.click(screen.getAllByRole('button', { name: 'Corner' })[0]);

        // 100 Sq.Wa x 12,000 = 1,200,000, + corner 5,000 x 100 Sq.Wa = 500,000 (per Sq.Wa).
        const lit = screen.getByText('P-01').closest('tr') as HTMLElement;
        expect(within(lit).getAllByText('1,200,000.00').length).toBe(1); // the land price
        expect(within(lit).getAllByText('1,700,000.00').length).toBe(2); // value and rounded value
        expect(within(lit).getByText('1,360,000.00')).toBeInTheDocument(); // 80% forced sale
        // The unit without the location is the land alone.
        const plain = screen.getByText('P-02').closest('tr') as HTMLElement;
        expect(within(plain).getAllByText('1,200,000.00').length).toBe(3);
        expect(within(plain).queryByText('1,700,000.00')).toBeNull();
      });
    });
  });

  it('keeps the form inputs and Save disabled while the cached assumption is being refetched', () => {
    state.assumptionFetching = true;
    const view = renderTab();

    expect(screen.getByLabelText('corner adjustment')).toBeDisabled();
    expect(screen.getByRole('button', { name: /^Save and recalculate$/ })).toBeDisabled();
    expect(screen.getByRole('button', { name: /Save Draft/ })).toBeDisabled();

    state.assumptionFetching = false; // the refetch has landed
    view.rerender(tabTree());
    expect(screen.getByLabelText('corner adjustment')).toBeEnabled();
    expect(screen.getByRole('button', { name: /^Save and recalculate$/ })).toBeEnabled();
  });

  it('one lock: while a save is running the form input is read-only too', () => {
    state.busy = true;
    renderTab();

    expect(screen.getByLabelText('corner adjustment')).toBeDisabled();
    expect(cornerChips()[0]).toBeDisabled();
    expect(screen.getByRole('button', { name: /^Save and recalculate$/ })).toBeDisabled();
  });

  it('one lock: while the price source refetches the flag chips and the form are locked as well', () => {
    state.sourceFetching = true;
    renderTab();

    expect(cornerChips()[0]).toBeDisabled();
    expect(screen.getByLabelText('corner adjustment')).toBeDisabled();
  });

  it('keeps the flag chips disabled while the cached unit prices are being refetched', () => {
    state.pricesFetching = true;
    const view = renderTab();

    expect(cornerChips()[0]).toBeDisabled();
    expect(screen.getByRole('button', { name: /^Save and recalculate$/ })).toBeDisabled();

    state.pricesFetching = false;
    view.rerender(tabTree());
    expect(cornerChips()[0]).toBeEnabled();
  });

  it('with no saved assumption and so no models, a stored forced sale of 0 matches: no preview', () => {
    state.hasAssumption = false;
    state.prices = [
      unitPrice({
        standardPrice: 0,
        totalAppraisalValue: 0,
        totalAppraisalValueRounded: 0,
        forceSellingPrice: 0,
        coverageAmount: undefined,
        adjustPriceLocation: 0,
        priceIncrementPerFloor: 0,
      }),
    ];
    renderTab();

    expect(screen.queryByText('Preview (not saved)')).toBeNull();
    expect(screen.queryByText('Unsaved changes')).toBeNull();
  });

  it("a failed save shows the server's message, or the translated fallback when there is none", async () => {
    state.saveAssumptionError = {
      isAxiosError: true,
      response: { status: 422, data: { detail: 'Percentage out of range' } },
    };
    const { user } = renderTab();
    await user.click(screen.getByRole('button', { name: /^Save and recalculate$/ }));
    await waitFor(() => expect(toast.error).toHaveBeenCalledWith('Percentage out of range'));

    vi.mocked(toast.error).mockClear();
    state.saveAssumptionError = new Error('Network Error');
    await user.click(screen.getByRole('button', { name: /^Save and recalculate$/ }));
    await waitFor(() => expect(toast.error).toHaveBeenCalledTimes(1));
    expect(toast.error).not.toHaveBeenCalledWith('Network Error');
  });

  it('shows a loading state, with no toggle or Save, until the price source is known', () => {
    state.sourceStatus = 'loading';
    renderTab();

    expect(screen.getByRole('status', { name: 'Loading price source' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Import from Excel/ })).toBeNull();
    expect(screen.queryByRole('button', { name: /Save/ })).toBeNull();
  });

  it('shows an error with retry, and never Save Draft, when the price source fails to load', () => {
    state.sourceStatus = 'error';
    renderTab();

    expect(screen.getByRole('button', { name: 'Retry' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Save/ })).toBeNull();
    expect(screen.queryByRole('button', { name: /Calculated in system/ })).toBeNull();
  });

  it('over an imported price list the Calculated view is a preview with an unsaved marker', async () => {
    state.source = importedSource;
    const { user } = renderTab();

    await user.click(screen.getByRole('button', { name: /Calculated in system/ }));
    await user.click(screen.getByText('Switch mode'));

    expect(screen.getByText('Preview (not saved)')).toBeInTheDocument();
    expect(screen.getByText('Unsaved changes')).toBeInTheDocument();
  });

  it('the source toggle is locked while a save is running', () => {
    state.busy = true;
    renderTab();

    expect(screen.getByRole('button', { name: /Import from Excel/ })).toBeDisabled();
  });

  it('the flag chips stay disabled for as long as the save is pending', () => {
    state.busy = true; // the save (its mutation includes the refetch of the stored prices)
    renderTab();

    expect(cornerChips()[0]).toBeDisabled();
  });

  it('read-only: no upload button, template download still available', () => {
    state.source = importedSource;
    renderTab(true);

    expect(screen.queryByRole('button', { name: /Upload price file/ })).toBeNull();
    expect(screen.getByRole('button', { name: /Download template/ })).toBeInTheDocument();
  });

  it('asks before leaving an imported price list for system calculation', async () => {
    state.source = importedSource;
    const { user } = renderTab();

    await user.click(screen.getByRole('button', { name: /Calculated in system/ }));

    expect(screen.getByText('Switch to system calculation?')).toBeInTheDocument();
    // Nothing switches until the user confirms.
    expect(screen.queryByTestId('assumption-form')).toBeNull();

    // ConfirmDialog is a <dialog> without `open`, which the a11y tree hides from role queries.
    await user.click(screen.getByText('Switch mode'));
    expect(screen.getByTestId('assumption-form')).toBeInTheDocument();
  });

  it('condo: switching Calculated to Imported asks in the page when units hold prices, and says what happens', async () => {
    const { user } = renderTab();

    await user.click(screen.getByRole('button', { name: /Import from Excel/ }));

    expect(screen.getByText('Switch to imported prices?')).toBeInTheDocument();
    expect(screen.getByText(/2 units currently hold a price/)).toBeInTheDocument();
    // Nothing switches until the user confirms.
    expect(screen.getByTestId('assumption-form')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Upload price file/ })).toBeNull();

    await user.click(screen.getByText('Switch mode'));
    expect(screen.queryByTestId('assumption-form')).toBeNull();
    expect(screen.getByRole('button', { name: /Upload price file/ })).toBeInTheDocument();
  });

  it('condo: cancelling the switch keeps the current source', async () => {
    const { user } = renderTab();

    await user.click(screen.getByRole('button', { name: /Import from Excel/ }));
    // The page's own Cancel button is in the action bar: scope to the dialog.
    const dialog = document.querySelector('dialog') as HTMLElement;
    await user.click(within(dialog).getByText('Cancel'));

    expect(screen.getByTestId('assumption-form')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Upload price file/ })).toBeNull();
  });

  it('condo: with no priced unit the switch needs no confirmation', async () => {
    state.source = { ...(state.source as object), pricedUnitCount: 0 };
    const { user } = renderTab();

    await user.click(screen.getByRole('button', { name: /Import from Excel/ }));

    expect(screen.queryByText('Switch to imported prices?')).toBeNull();
    expect(screen.getByRole('button', { name: /Upload price file/ })).toBeInTheDocument();
  });

  it('LB: with no priced unit the switch needs no confirmation', async () => {
    state.source = { ...(state.source as object), pricedUnitCount: 0 };
    const { user } = renderTab(false, 'LB');

    await user.click(screen.getByRole('button', { name: /Import from Excel/ }));

    expect(screen.queryByText('Switch to imported prices?')).toBeNull();
    expect(screen.getByRole('button', { name: /Upload price file/ })).toBeInTheDocument();
  });

  describe('assumptions panel: expanded, or a strip', () => {
    const PANEL_KEY = 'blockProject.assumptionsPanel';
    const strip = () => screen.queryByRole('complementary', { name: 'Pricing assumptions' });

    it('is open from 1600px wide when nothing is remembered', () => {
      renderTab();

      expect(screen.getByTestId('assumption-form')).toBeInTheDocument();
      expect(strip()).toBeNull();
      expect(screen.getByRole('button', { name: 'Hide assumptions panel' })).toHaveTextContent(
        'Hide',
      );
    });

    it('starts collapsed below 1600px: a strip with a labelled expand button, the method and the forced sale', () => {
      setViewport(1440);
      renderTab();

      expect(screen.queryByTestId('assumption-form')).toBeNull();
      const bar = strip() as HTMLElement;
      expect(within(bar).getByRole('button', { name: 'Show assumptions panel' })).toHaveTextContent(
        'Show',
      );
      expect(within(bar).getByText('01')).toBeInTheDocument(); // Adjust price
      expect(within(bar).getByText('80%')).toBeInTheDocument(); // the system default (none saved)
      expect(within(bar).queryByText('Edited')).toBeNull();
    });

    it('collapses and expands by hand, and remembers the choice', async () => {
      const first = renderTab();

      await first.user.click(screen.getByRole('button', { name: 'Hide assumptions panel' }));
      expect(screen.queryByTestId('assumption-form')).toBeNull();
      expect(window.localStorage.getItem(PANEL_KEY)).toBe('strip');

      // A new visit at a wide window: the remembered choice wins over the width rule.
      first.unmount();
      const second = renderTab();
      expect(screen.queryByTestId('assumption-form')).toBeNull();

      await second.user.click(screen.getByRole('button', { name: 'Show assumptions panel' }));
      expect(screen.getByTestId('assumption-form')).toBeInTheDocument();
      expect(window.localStorage.getItem(PANEL_KEY)).toBe('open');
    });

    it('a remembered "open" beats the narrow-window default', () => {
      window.localStorage.setItem(PANEL_KEY, 'open');
      setViewport(1280);
      renderTab();

      expect(screen.getByTestId('assumption-form')).toBeInTheDocument();
    });

    it('works with storage unavailable: the width rule applies and nothing throws', async () => {
      const get = vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
        throw new Error('blocked');
      });
      const set = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
        throw new Error('blocked');
      });
      try {
        const { user } = renderTab();
        expect(screen.getByTestId('assumption-form')).toBeInTheDocument();
        await user.click(screen.getByRole('button', { name: 'Hide assumptions panel' }));
        expect(screen.queryByTestId('assumption-form')).toBeNull();
      } finally {
        get.mockRestore();
        set.mockRestore();
      }
    });

    it('marks the strip as edited while assumptions are dirty', async () => {
      window.localStorage.setItem(PANEL_KEY, 'strip');
      const { user } = renderTab();
      expect(within(strip() as HTMLElement).queryByText('Edited')).toBeNull();

      await user.click(screen.getByRole('button', { name: 'Show assumptions panel' }));
      await editAssumption(user);
      await user.click(screen.getByRole('button', { name: 'Hide assumptions panel' }));

      expect(within(strip() as HTMLElement).getByText('Edited')).toBeInTheDocument();
    });

    it('"Expand table" folds the panel and gives it back on exit, without touching the choice', async () => {
      function Shell() {
        const [focus, setFocus] = useState(false);
        return (
          <CondoShellContext.Provider
            value={{
              projectType: 'U',
              tabs: [],
              activeTab: 'unit-price',
              onTabChange: () => {},
              focus,
              onFocusChange: setFocus,
            }}
          >
            {tabTree()}
          </CondoShellContext.Provider>
        );
      }
      const { user } = render(<Shell />);
      window.localStorage.setItem(PANEL_KEY, 'open');
      expect(screen.getByTestId('assumption-form')).toBeInTheDocument();

      await user.click(screen.getByRole('button', { name: 'Expand table' }));
      expect(screen.queryByTestId('assumption-form')).toBeNull();
      expect(strip()).not.toBeNull();
      expect(window.localStorage.getItem(PANEL_KEY)).toBe('open'); // not overwritten

      await user.click(screen.getByRole('button', { name: 'Collapse table' }));
      expect(screen.getByTestId('assumption-form')).toBeInTheDocument();
    });

    it('a save the form refuses brings a collapsed panel back', async () => {
      window.localStorage.setItem(PANEL_KEY, 'strip');
      const { user } = renderTab();
      expect(screen.queryByTestId('assumption-form')).toBeNull();
      // ...fine with the stub's valid form, so make the validation fail: a text where a number goes.
      await user.click(screen.getByRole('button', { name: 'Show assumptions panel' }));
      await user.type(screen.getByLabelText('corner adjustment'), 'abc');
      await user.click(screen.getByRole('button', { name: 'Hide assumptions panel' }));
      await user.click(screen.getByRole('button', { name: /^Save and recalculate$/ }));

      await waitFor(() => expect(screen.getByTestId('assumption-form')).toBeInTheDocument());
    });

    it('the Imported view has neither the panel nor the strip', () => {
      state.source = importedSource;
      window.localStorage.setItem(PANEL_KEY, 'strip');
      renderTab();

      expect(strip()).toBeNull();
      expect(screen.queryByTestId('assumption-form')).toBeNull();
    });
  });

  describe('Save and recalculate', () => {
    // What calculate's onSettled leaves in the cache: the refetched rows, or the old ones (a refetch
    // that failed does not move `dataUpdatedAt`).
    const pricesKey = ['appraisal', 'a1', 'project', 'unit-prices'];
    const recalcSave = async (
      after: ProjectUnitPrice[],
      readOnly = false,
      refetchFailed = false,
    ) => {
      const queryClient = new QueryClient();
      // calculate's own refetch lands after the save started: stamped in the future.
      queryClient.setQueryData(pricesKey, after, { updatedAt: Date.now() + 60_000 });
      if (refetchFailed)
        queryClient
          .getQueryCache()
          .find({ queryKey: pricesKey })!
          .setState({ status: 'error', error: new Error('offline') });
      const view = renderTab(readOnly, 'U', queryClient);
      await view.user.click(screen.getByRole('button', { name: /^Save and recalculate$/ }));
      return view;
    };

    it('says what a recalculation does, next to the button and as its title', () => {
      renderTab();

      const hint =
        "Recalculates every unit's price from the assumptions and replaces the saved prices.";
      expect(screen.getByText(hint)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /^Save and recalculate$/ })).toHaveAttribute(
        'title',
        hint,
      );
    });

    it('then shows a dismissible summary: units changed and both totals, before and after', async () => {
      const { user } = await recalcSave([
        unitPrice({
          totalAppraisalValue: 3_521_000,
          totalAppraisalValueRounded: 3_521_000,
          forceSellingPrice: 2_817_000,
        }),
        unitPrice({ projectUnitId: 'u2', sequenceNumber: 2, roomNumber: '16A02', isSold: true }),
      ]);

      const summary = (await screen.findByText('Prices recalculated')).closest(
        '[role="status"]',
      ) as HTMLElement;
      expect(summary).toHaveTextContent('Units whose price changed 1 of 2');
      expect(summary).toHaveTextContent(
        'Total appraisal value +500,000 Baht (฿6,042,000 → ฿6,542,000)',
      );
      expect(summary).toHaveTextContent(
        'Total forced-sale price +400,000 Baht (฿4,834,000 → ฿5,234,000)',
      );
      expect(toast.success).not.toHaveBeenCalled(); // the summary replaces the toast

      await user.click(
        within(summary).getByRole('button', { name: 'Dismiss the recalculation summary' }),
      );
      expect(screen.queryByText('Prices recalculated')).toBeNull();
    });

    it('a recalculation that changes nothing says so', async () => {
      await recalcSave(state.prices as ProjectUnitPrice[]);

      expect(await screen.findByText('Prices recalculated · no price changed')).toBeInTheDocument();
      expect(screen.getByText(/Units whose price changed/)).toHaveTextContent('0 of 2');
    });

    it('falls back to the toast when the refetch after calculate failed', async () => {
      await recalcSave(state.prices as ProjectUnitPrice[], false, true);

      await waitFor(() => expect(toast.success).toHaveBeenCalled());
      expect(screen.queryByText('Prices recalculated')).toBeNull();
    });

    it('falls back to the toast when the prices were last fetched before calculate began', async () => {
      // The assumption save refetched the prices (stamping them), then calculate's refetch failed.
      const queryClient = new QueryClient();
      state.afterAssumptionSave = () => {
        const stamp = Date.now();
        queryClient.setQueryData(pricesKey, state.prices, { updatedAt: stamp });
        while (Date.now() === stamp); // calculate starts in a later millisecond
      };
      const { user } = renderTab(false, 'U', queryClient);
      await user.click(screen.getByRole('button', { name: /^Save and recalculate$/ }));

      await waitFor(() => expect(toast.success).toHaveBeenCalled());
      expect(screen.queryByText('Prices recalculated')).toBeNull();
    });

    it('a draft shows no summary', async () => {
      const { user } = renderTab();
      await user.click(screen.getByRole('button', { name: 'Save Draft' }));

      await waitFor(() => expect(toast.success).toHaveBeenCalled());
      expect(screen.queryByText('Prices recalculated')).toBeNull();
    });
  });

  it('read-only (condo): the current source is pressed and the other cannot be chosen, no chips to toggle', () => {
    renderTab(true);

    expect(screen.getByRole('button', { name: /Calculated in system/ })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    expect(screen.getByRole('button', { name: /Import from Excel/ })).toBeDisabled();
    expect(screen.queryByRole('button', { name: 'Corner' })).toBeNull();
    expect(screen.queryByRole('button', { name: /^Save and recalculate$/ })).toBeNull();
  });

  it('condo: one head row carries the source switch; no KPI strip and no separate source card', async () => {
    const { user } = renderTab();

    // The four figure tiles are gone (the totals live in the project header and the totals row).
    for (const label of [
      'Total appraisal value (rounded)',
      'Total forced sale price',
      'Total fire insurance value',
      'Units with a price',
    ]) {
      expect(screen.queryByText(label)).toBeNull();
    }
    expect(screen.queryByText('Use this')).toBeNull(); // the old source card's switch button
    // The totals row still has the fire insurance total: 2 x 458,000.
    const foot = screen.getByText('Total — 2 units').closest('tr') as HTMLElement;
    expect(within(foot).getByText('916,000.00')).toBeInTheDocument();

    const head = screen
      .getByRole('heading', { name: 'Unit Price' })
      .closest('.justify-between') as HTMLElement;
    const group = within(head).getByRole('group', { name: 'Unit price source' });
    expect(within(group).getByRole('button', { name: /Calculated in system/ })).toHaveAttribute(
      'aria-pressed',
      'true',
    );

    // The current option does nothing; the other one asks first.
    await user.click(within(group).getByRole('button', { name: /Calculated in system/ }));
    expect(screen.queryByText('Back to system calculation?')).toBeNull();
    await user.click(within(group).getByRole('button', { name: /Import from Excel/ }));
    expect(screen.getByText('Switch to imported prices?')).toBeInTheDocument();
  });

  it('condo: the result columns scroll with the table: only the two identity columns are frozen', () => {
    renderTab();

    for (const name of ['Appraisal Value', 'Rounded Value', 'Forced sale price']) {
      const th = screen.getByRole('columnheader', { name });
      expect(th.className).not.toContain('z-20');
      expect(th.style.right).toBe('');
    }
    expect(screen.getByRole('columnheader', { name: 'Seq No' }).className).toContain('sticky');
  });

  it('condo: the location column shows the raw flag total and, beside it, what the method makes of it', () => {
    // Per sq.m. (the fixture's method): 200 x 47.5 = 9,500. The second unit has no flag total.
    state.prices = [
      unitPrice({ usableArea: 47.5, isCorner: true, adjustPriceLocation: 200 }),
      unitPrice({ projectUnitId: 'u2', sequenceNumber: 2, roomNumber: '16A02' }),
    ];
    renderTab();

    const row = screen.getByText('15A01').closest('tr') as HTMLElement;
    expect(within(row).getByText('200.00')).toBeInTheDocument();
    expect(within(row).getByText(/→ 9,500\.00/)).toBeInTheDocument();
    // A unit with nothing to adjust gets no hint.
    const other = screen.getByText('16A02').closest('tr') as HTMLElement;
    expect(within(other).queryByText(/→/)).toBeNull();
    // The totals row sums the contributions (9,500), not the raw per-sq.m. rates (200).
    const foot = screen.getByText('Total — 2 units').closest('tr') as HTMLElement;
    expect(within(foot).getByText('9,500.00')).toBeInTheDocument();
    expect(within(foot).queryByText('200.00')).toBeNull();
  });

  it('condo: the column groups are toggle chips; unpressing "Calculation inputs" drops the Location column', async () => {
    const { user } = renderTab();
    expect(screen.getByRole('columnheader', { name: 'Location' })).toBeInTheDocument();

    const group = screen.getByRole('group', { name: 'Columns' });
    const inputs = within(group).getByRole('button', { name: 'Calculation inputs' });
    expect(within(group).getByRole('button', { name: 'Unit data' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    expect(inputs).toHaveAttribute('aria-pressed', 'true');

    await user.click(inputs);

    expect(inputs).toHaveAttribute('aria-pressed', 'false');
    expect(screen.queryByRole('columnheader', { name: 'Location' })).toBeNull();
    expect(screen.getByRole('columnheader', { name: 'Forced sale price' })).toBeInTheDocument(); // results stay

    await user.click(inputs);
    expect(screen.getByRole('columnheader', { name: 'Location' })).toBeInTheDocument();
  });

  it('condo, Imported view: no "Calculation inputs" chip, and the results chip says they come from the file', () => {
    state.source = importedSource;
    renderTab();

    const group = screen.getByRole('group', { name: 'Columns' });
    expect(within(group).queryByRole('button', { name: 'Calculation inputs' })).toBeNull();
    expect(
      within(group).getByRole('button', { name: 'From the imported file' }),
    ).toBeInTheDocument();
  });

  it('condo: paging works through the usual Pagination under the table (range, page numbers, page size)', async () => {
    state.prices = Array.from({ length: 120 }, (_, i) =>
      unitPrice({ projectUnitId: `u${i}`, sequenceNumber: i + 1, roomNumber: `R${i + 1}` }),
    );
    const { user } = renderTab();

    expect(screen.getByText('1-50 of 120')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Previous page' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Rows per page' })).toBeInTheDocument();
    // Under the table, not in the toolbar with the search box.
    const toolbar = screen.getByLabelText('Search room or tower').closest('.flex-wrap');
    expect(toolbar).not.toContainElement(screen.getByRole('button', { name: 'Next page' }));

    await user.click(screen.getByRole('button', { name: 'Next page' }));
    expect(screen.getByText('51-100 of 120')).toBeInTheDocument();
    expect(screen.getByText('R51')).toBeInTheDocument();
    expect(screen.queryByText('R1')).toBeNull();

    await user.click(screen.getByRole('button', { name: '3' }));
    expect(screen.getByText('101-120 of 120')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Next page' })).toBeDisabled();
  });

  it('condo: the sequence number column (header and cells) is centred', () => {
    renderTab();

    const [seqHeader] = screen.getAllByRole('columnheader');
    expect(seqHeader).toHaveClass('text-center');
    const row = screen.getByText('15A01').closest('tr') as HTMLElement;
    expect(row.querySelector('td')).toHaveClass('text-center');
  });

  it('condo: the model assumptions fold open under the head, on the head toggle', async () => {
    const { user } = renderTab();
    const toggle = screen.getByRole('button', { name: 'Model assumptions 1/1' });
    expect(toggle).toHaveAttribute('aria-expanded', 'false');
    expect(screen.queryByText('1 Br.')).toBeNull();

    await user.click(toggle);

    expect(toggle).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByText('1 Br.')).toBeInTheDocument();
    await user.click(toggle);
    expect(screen.queryByText('1 Br.')).toBeNull();
  });

  it('condo: the expand-table button flips the shell focus flag and its label', async () => {
    function Shell() {
      const [focus, setFocus] = useState(false);
      return (
        <CondoShellContext.Provider
          value={{
            projectType: 'U',
            tabs: [],
            activeTab: 'unit-price',
            onTabChange: () => {},
            focus,
            onFocusChange: setFocus,
          }}
        >
          {tabTree()}
        </CondoShellContext.Provider>
      );
    }
    const { user } = render(<Shell />);

    await user.click(screen.getByRole('button', { name: 'Expand table' }));
    expect(screen.queryByRole('button', { name: 'Expand table' })).toBeNull();

    await user.click(screen.getByRole('button', { name: 'Collapse table' }));
    expect(screen.getByRole('button', { name: 'Expand table' })).toBeInTheDocument();
  });

  it('a local switch to Imported over calculated prices shows no old import metadata', async () => {
    state.source = { ...importedSource, source: 'Calculated' };
    const { user } = renderTab();

    await user.click(screen.getByRole('button', { name: /Import from Excel/ }));
    await user.click(screen.getByText('Switch mode'));

    expect(screen.queryByText('prices.xlsx')).toBeNull();
    // The import controls are in the head, without a file and without the no-file hint.
    expect(screen.queryByText(/No price file yet/)).toBeNull();
    expect(screen.getByRole('button', { name: /Download template/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Upload price file/ })).toBeInTheDocument();
    // The prices on screen are the calculated ones, so they must not be labelled as imported: the
    // pill follows the stored data, not the toggle.
    expect(screen.queryByText('Values from imported file')).toBeNull();
    expect(screen.getByText('Saved prices')).toBeInTheDocument();
  });

  it('after leaving an import for Calculated only Save is offered, not Save Draft', async () => {
    state.source = importedSource;
    const { user } = renderTab();

    await user.click(screen.getByRole('button', { name: /Calculated in system/ }));
    await user.click(screen.getByText('Switch mode'));

    expect(screen.getByRole('button', { name: /^Save and recalculate$/ })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Save Draft/ })).toBeNull();
  });

  it('discarding edits with no saved assumption resets to the blank form without error', async () => {
    state.hasAssumption = false;
    const { user } = renderTab();

    await user.click(cornerChips()[0]);
    await user.click(screen.getByRole('button', { name: /Import from Excel/ }));
    await user.click(screen.getByText('Discard and switch'));

    expect(screen.getByRole('button', { name: /Upload price file/ })).toBeInTheDocument();
  });

  it('asks before dropping unsaved edits when switching to Imported, then resets them', async () => {
    const { user } = renderTab();

    await user.click(cornerChips()[0]); // light a location flag: now dirty
    await user.click(screen.getByRole('button', { name: /Import from Excel/ }));

    expect(screen.getByText('Discard unsaved changes?')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Upload price file/ })).toBeNull();

    await user.click(screen.getByText('Discard and switch'));
    expect(screen.getByRole('button', { name: /Upload price file/ })).toBeInTheDocument();

    // Back to Calculated (the units hold prices, so it asks): the flag edit is gone, so nothing
    // is dirty any more.
    await user.click(screen.getByRole('button', { name: /Calculated in system/ }));
    await user.click(screen.getByText('Switch mode'));
    expect(cornerChips()[0]).toHaveAttribute('aria-pressed', 'false');
    expect(screen.queryByText('Unsaved changes')).toBeNull();
  });
});
