import { beforeEach, describe, expect, it, vi } from 'vitest';
import '@/i18n';
import toast from 'react-hot-toast';
import { render, screen, waitFor, within } from '@/test/test-utils';
import { AppraisalProvider } from '@/features/appraisal/context/AppraisalContext';
import { PageReadOnlyContext } from '@/shared/contexts/PageReadOnlyContext';
import type { ProjectUnitPrice, UnitPriceSourceInfo } from '../../types';
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
}));

vi.mock('../../api/projectUnitPrice', () => ({
  useGetProjectUnitPrices: (_id: string, options?: unknown) => {
    state.pricesOptions.push(options);
    return {
      data: ['error', 'loading'].includes(state.pricesStatus) ? undefined : state.prices,
      isLoading: state.pricesStatus === 'loading',
      isFetching: state.pricesFetching,
      isError: state.pricesStatus !== 'ok',
      refetch: vi.fn(),
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
    mutateAsync: vi.fn(() =>
      state.saveAssumptionError ? Promise.reject(state.saveAssumptionError) : Promise.resolve(),
    ),
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

const tabTree = (readOnly = false, projectType: 'U' | 'LB' = 'U') => (
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

const renderTab = (readOnly = false, projectType: 'U' | 'LB' = 'U') =>
  render(tabTree(readOnly, projectType));

const importedSource: UnitPriceSourceInfo = {
  source: 'Imported',
  fileName: 'prices.xlsx',
  importedAt: '2026-10-16T14:20:00',
  importedBy: 'somchai',
  pricedUnitCount: 2,
};

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
  });

  it('Calculated view recomputes from the model; coverage is a per-unit total, not x area', () => {
    renderTab();

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

  it('prices the forced sale with the system default when the form has no valid percentage', () => {
    renderTab();

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
    expect(screen.getByRole('button', { name: /^Save$/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Save Draft/ })).toBeInTheDocument();
  });

  it('Imported view: import card, stored values, no assumption form, flags or Save', () => {
    state.source = importedSource;
    renderTab();

    expect(screen.getByText('prices.xlsx')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Upload price file/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Download template/ })).toBeInTheDocument();
    expect(screen.queryByTestId('assumption-form')).toBeNull();
    expect(screen.queryByRole('button', { name: /^Save$/ })).toBeNull();
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
    expect(screen.getByRole('button', { name: /^Save$/ })).toBeDisabled();
    expect(screen.getByRole('button', { name: /Save Draft/ })).toBeDisabled();
    first.unmount();

    state.assumptionStatus = 'error';
    renderTab();
    expect(screen.queryByTestId('assumption-form')).toBeNull();
    expect(screen.getByRole('button', { name: /^Save$/ })).toBeDisabled();
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

    await user.click(screen.getByRole('button', { name: /^Save$/ }));

    await waitFor(() => expect(state.refetchRates).toHaveBeenCalled());
  });

  it('is not a preview while the lookup is still loading: an empty lookup would flag every row', () => {
    state.assumptionStatus = 'loading';
    renderTab();

    expect(screen.queryByText('Preview (not saved)')).toBeNull();
    expect(screen.queryByText('Unsaved changes')).toBeNull();
  });

  it('lists the same coverage rate the preview uses: the current fire rate, not the saved snapshot', () => {
    renderTab();

    expect(screen.getByText('16,000')).toBeInTheDocument(); // current rate for code RC
    expect(screen.queryByText('15,000')).toBeNull(); // the rate saved on the model assumption
  });

  it.each(['sourceStatus', 'assumptionStatus', 'ratesStatus', 'pricesStatus'] as const)(
    'a failed background refetch with cached data (%s) keeps the tab on screen',
    key => {
      state[key] = 'cachedError';
      renderTab();

      expect(screen.getByText('16A02')).toBeInTheDocument(); // the rows are still there
      expect(screen.getByRole('button', { name: /Import prices from Excel/ })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /^Save$/ })).toBeEnabled();
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
    expect(screen.getByRole('button', { name: /^Save$/ })).toBeDisabled();
    expect(screen.getByRole('button', { name: /Save Draft/ })).toBeDisabled();

    // The refetch lands: the mode follows the server, and Save is not held any longer.
    state.source = importedSource;
    state.sourceFetching = false;
    view.rerender(tabTree());

    expect(screen.getByRole('button', { name: /Upload price file/ })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /^Save$/ })).toBeNull(); // Imported view: no Save
  });

  it('after an import succeeds, leaving it asks for confirmation even while the source refetch is in flight', async () => {
    state.source = { ...importedSource, source: 'Calculated', fileName: null }; // the cached source
    const { user } = renderTab();

    await user.click(screen.getByRole('button', { name: /Import prices from Excel/ }));
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
    expect(screen.queryByText(/server-user/)).toBeNull();

    state.source = { ...importedSource, fileName: 'B.xlsx', importedBy: 'server-user' };
    state.sourceUpdatedAt = Date.now() + 60_000; // a read that completed after the write
    rerender(tabTree());

    // The server's own record (its importer) has replaced the optimistic one.
    expect(screen.getByText(/server-user/)).toBeInTheDocument();
    expect(screen.getByText('B.xlsx')).toBeInTheDocument();
  });

  it('after a calculate, a stale cached Imported record never reads as current', async () => {
    state.source = { ...importedSource, fileName: 'A.xlsx' }; // cached; the refetch will fail
    const { user } = renderTab();

    await user.click(screen.getByRole('button', { name: /Calculated in system/ }));
    await user.click(screen.getByText('Switch mode'));
    await user.click(screen.getByRole('button', { name: /^Save$/ })); // calculate succeeds
    await waitFor(() => expect(screen.getByRole('button', { name: /^Save$/ })).toBeEnabled());

    await user.click(screen.getByRole('button', { name: /Import prices from Excel/ }));

    expect(screen.queryByText('A.xlsx')).toBeNull();
    expect(screen.getByText(/No price file yet/)).toBeInTheDocument();
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
    expect(screen.getByRole('button', { name: /^Save$/ })).toBeEnabled();
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

  it('is a preview when the recompute differs from what is stored, even with nothing edited', () => {
    renderTab(); // the fixture rows were stored from a different price

    expect(screen.getByText('Preview (not saved)')).toBeInTheDocument();
  });

  it('is a preview for a project that was never calculated', () => {
    state.prices = [
      unitPrice({
        totalAppraisalValueRounded: undefined,
        forceSellingPrice: undefined,
        coverageAmount: undefined,
      }),
    ];
    renderTab();

    expect(screen.getByText('Preview (not saved)')).toBeInTheDocument();
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

    const corner = screen.getAllByRole('checkbox')[0];
    await user.click(corner); // on...
    await user.click(corner); // ...and off again: the value is unchanged but the edit is "dirty"
    expect(screen.getByText('Preview (not saved)')).toBeInTheDocument();
    expect(screen.getByText('Unsaved changes')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /^Save$/ }));

    await waitFor(() => expect(screen.queryByText('Unsaved changes')).toBeNull());
    expect(screen.queryByText('Preview (not saved)')).toBeNull();
  });

  describe('LB: every calculated figure counts, not only the rounded total', () => {
    // Model price 85,000 (a total Baht for LB): total 85,000 -> rounded 90,000; 80% forced sale
    // 72,000; coverage 16,000 x 30.5 = 488,000; no land difference and no location flags.
    const lbRow = (over: Partial<ProjectUnitPrice> = {}) =>
      unitPrice({
        standardPrice: 85_000,
        totalAppraisalValue: 85_000,
        totalAppraisalValueRounded: 90_000,
        forceSellingPrice: 72_000,
        coverageAmount: 488_000,
        adjustPriceLocation: 0,
        landIncreaseDecreaseAmount: 0,
        ...over,
      });

    it('is plainly Calculated when every figure equals what is stored', () => {
      state.prices = [lbRow()];
      renderTab(false, 'LB');

      expect(screen.queryByText('Preview (not saved)')).toBeNull();
    });

    it('is a preview when only the model standard price differs (the rounded total is unchanged)', () => {
      // The model price moved by 3,000 since the last Save, but both round to 90,000.
      state.prices = [lbRow({ standardPrice: 88_000 })];
      renderTab(false, 'LB');

      expect(screen.getByText('Preview (not saved)')).toBeInTheDocument();
    });
  });

  it('keeps the form inputs and Save disabled while the cached assumption is being refetched', () => {
    state.assumptionFetching = true;
    const view = renderTab();

    expect(screen.getByLabelText('corner adjustment')).toBeDisabled();
    expect(screen.getByRole('button', { name: /^Save$/ })).toBeDisabled();
    expect(screen.getByRole('button', { name: /Save Draft/ })).toBeDisabled();

    state.assumptionFetching = false; // the refetch has landed
    view.rerender(tabTree());
    expect(screen.getByLabelText('corner adjustment')).toBeEnabled();
    expect(screen.getByRole('button', { name: /^Save$/ })).toBeEnabled();
  });

  it('one lock: while a save is running the form input is read-only too', () => {
    state.busy = true;
    renderTab();

    expect(screen.getByLabelText('corner adjustment')).toBeDisabled();
    expect(screen.getAllByRole('checkbox')[0]).toHaveAttribute('aria-disabled', 'true');
    expect(screen.getByRole('button', { name: /^Save$/ })).toBeDisabled();
  });

  it('one lock: while the price source refetches the checkboxes and the form are locked as well', () => {
    state.sourceFetching = true;
    renderTab();

    expect(screen.getAllByRole('checkbox')[0]).toHaveAttribute('aria-disabled', 'true');
    expect(screen.getByLabelText('corner adjustment')).toBeDisabled();
  });

  it('Imported card: while the unit prices load, a placeholder replaces the figures, never 0 / 0', () => {
    state.source = importedSource;
    state.pricesStatus = 'loading';
    renderTab();

    expect(screen.queryByText('0 / 0')).toBeNull();
    expect(screen.getAllByRole('status', { name: 'Loading figures' })).toHaveLength(2);
  });

  it('Imported card: if the unit prices failed to load the figures are dashes, never 0 / 0', () => {
    state.source = importedSource;
    state.pricesStatus = 'error';
    renderTab();

    expect(screen.queryByText('0 / 0')).toBeNull();
    expect(screen.queryByRole('status', { name: 'Loading figures' })).toBeNull();
    expect(screen.getAllByText('-').length).toBeGreaterThanOrEqual(2);
  });

  it('keeps the flag checkboxes disabled while the cached unit prices are being refetched', () => {
    state.pricesFetching = true;
    const view = renderTab();

    expect(screen.getAllByRole('checkbox')[0]).toHaveAttribute('aria-disabled', 'true');
    expect(screen.getByRole('button', { name: /^Save$/ })).toBeDisabled();

    state.pricesFetching = false;
    view.rerender(tabTree());
    expect(screen.getAllByRole('checkbox')[0]).not.toHaveAttribute('aria-disabled', 'true');
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
    await user.click(screen.getByRole('button', { name: /^Save$/ }));
    await waitFor(() => expect(toast.error).toHaveBeenCalledWith('Percentage out of range'));

    vi.mocked(toast.error).mockClear();
    state.saveAssumptionError = new Error('Network Error');
    await user.click(screen.getByRole('button', { name: /^Save$/ }));
    await waitFor(() => expect(toast.error).toHaveBeenCalledTimes(1));
    expect(toast.error).not.toHaveBeenCalledWith('Network Error');
  });

  it('shows a loading state, with no toggle or Save, until the price source is known', () => {
    state.sourceStatus = 'loading';
    renderTab();

    expect(screen.getByRole('status', { name: 'Loading price source' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Import prices from Excel/ })).toBeNull();
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

    expect(screen.getByRole('button', { name: /Import prices from Excel/ })).toBeDisabled();
  });

  it('the flag checkboxes stay disabled for as long as the save is pending', () => {
    state.busy = true; // the save (its mutation includes the refetch of the stored prices)
    renderTab();

    // Headless UI's checkbox is a span: disabled shows as aria-disabled, not a `disabled` attribute.
    expect(screen.getAllByRole('checkbox')[0]).toHaveAttribute('aria-disabled', 'true');
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

  it('switching Calculated to Imported needs no confirmation', async () => {
    const { user } = renderTab();

    await user.click(screen.getByRole('button', { name: /Import prices from Excel/ }));

    expect(screen.queryByText('Switch to system calculation?')).toBeNull();
    expect(screen.queryByTestId('assumption-form')).toBeNull();
    expect(screen.getByRole('button', { name: /Upload price file/ })).toBeInTheDocument();
  });

  it('a local switch to Imported over calculated prices shows no old import metadata', async () => {
    state.source = { ...importedSource, source: 'Calculated' };
    const { user } = renderTab();

    await user.click(screen.getByRole('button', { name: /Import prices from Excel/ }));

    expect(screen.queryByText('prices.xlsx')).toBeNull();
    expect(screen.getByText(/No price file yet/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Download template/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Upload price file/ })).toBeInTheDocument();
    // The prices on screen are the calculated ones, so they must not be labelled as imported.
    expect(screen.queryByText('Values from imported file')).toBeNull();
    // The title follows the stored data, not the toggle: these are still the calculated prices.
    expect(screen.getByText('Calculated Unit Prices')).toBeInTheDocument();
    expect(screen.queryByText('Unit prices from imported file')).toBeNull();
  });

  it('after leaving an import for Calculated only Save is offered, not Save Draft', async () => {
    state.source = importedSource;
    const { user } = renderTab();

    await user.click(screen.getByRole('button', { name: /Calculated in system/ }));
    await user.click(screen.getByText('Switch mode'));

    expect(screen.getByRole('button', { name: /^Save$/ })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Save Draft/ })).toBeNull();
  });

  it('discarding edits with no saved assumption resets to the blank form without error', async () => {
    state.hasAssumption = false;
    const { user } = renderTab();

    await user.click(screen.getAllByRole('checkbox')[0]);
    await user.click(screen.getByRole('button', { name: /Import prices from Excel/ }));
    await user.click(screen.getByText('Discard and switch'));

    expect(screen.getByRole('button', { name: /Upload price file/ })).toBeInTheDocument();
  });

  it('asks before dropping unsaved edits when switching to Imported, then resets them', async () => {
    const { user } = renderTab();

    await user.click(screen.getAllByRole('checkbox')[0]); // tick a location flag: now dirty
    await user.click(screen.getByRole('button', { name: /Import prices from Excel/ }));

    expect(screen.getByText('Discard unsaved changes?')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Upload price file/ })).toBeNull();

    await user.click(screen.getByText('Discard and switch'));
    expect(screen.getByRole('button', { name: /Upload price file/ })).toBeInTheDocument();

    // Back to Calculated: the flag edit is gone, so nothing is dirty any more.
    await user.click(screen.getByRole('button', { name: /Calculated in system/ }));
    expect(screen.getAllByRole('checkbox')[0]).not.toBeChecked();
  });
});
