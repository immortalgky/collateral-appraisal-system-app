import { beforeEach, describe, expect, it, vi } from 'vitest';
import i18n from '@/i18n';
import toast from 'react-hot-toast';
import { render, screen, userEvent, within } from '@/test/test-utils';
import { AppraisalProvider } from '@/features/appraisal/context/AppraisalContext';
import { PageReadOnlyContext } from '@/shared/contexts/PageReadOnlyContext';
import UnitListingTab from './UnitListingTab';

vi.mock('react-hot-toast', () => ({ default: { success: vi.fn(), error: vi.fn() } }));

// No network: the hooks UnitListingTab reads are replaced by fixtures with a stable identity
// (the tab keeps effects keyed on them).
const oneUnit = vi.hoisted(() => ({
  units: [{ id: 'u1', sequenceNumber: 1, roomNumber: '15A01', isSold: false }],
  totalCount: 1,
  remainingCount: 1,
  models: [] as string[],
}));
const state = vi.hoisted(() => ({
  source: undefined as unknown,
  units: oneUnit,
  uploads: [] as unknown[],
  sourceEnabled: [] as (boolean | undefined)[],
  previewReappraisal: undefined as unknown as ReturnType<typeof vi.fn>,
  unitsLoading: false,
  unitsFetching: false,
  fetching: false,
  failed: false,
  alwaysRefetch: undefined as boolean | undefined,
}));

vi.mock('../../api/projectUnit', () => ({
  useGetProjectUnits: () => ({
    data: state.unitsLoading ? undefined : state.units,
    isLoading: state.unitsLoading,
    isError: false,
    isFetching: state.unitsFetching,
  }),
  useGetProjectUnitUploads: () => ({ data: state.uploads, isLoading: false }),
  useUploadProjectUnits: () => ({ mutate: vi.fn(), isPending: false }),
  useUploadReappraisalUnits: () => ({ mutate: vi.fn(), isPending: false }),
  useReappraisalPreview: () => ({ mutate: state.previewReappraisal, isPending: false }),
}));
vi.mock('../../api/projectUnitPrice', () => ({
  useGetUnitPriceSource: (
    _id: string,
    options?: { enabled?: boolean; alwaysRefetch?: boolean },
  ) => {
    state.sourceEnabled.push(options?.enabled);
    state.alwaysRefetch = options?.alwaysRefetch;
    // A disabled query has no data, like the real one.
    return {
      data: options?.enabled ? state.source : undefined,
      isFetching: state.fetching,
      isError: state.failed,
    };
  },
}));

const renderTab = (appraisalType = 'Initial') =>
  render(
    <AppraisalProvider
      value={{
        appraisal: { appraisalId: 'a1', requestId: 'r1', appraisalType },
        isLoading: false,
        isError: false,
        error: null,
      }}
    >
      <UnitListingTab projectType="U" />
    </AppraisalProvider>,
  );

const pickFile = async (user: ReturnType<typeof renderTab>['user']) => {
  const input = document.querySelector('input[type="file"]') as HTMLInputElement;
  await user.upload(input, new File(['x'], 'units.xlsx'));
};

const pickFileOf = async (user: ReturnType<typeof renderTab>['user'], file: File) => {
  const input = document.querySelector('input[type="file"]') as HTMLInputElement;
  await user.upload(input, file);
};

const withPrices = i18n.t('blockProject:unitListing.confirmReplace.messageWithPrices');
const withoutPrices = i18n.t('blockProject:unitListing.confirmReplace.message');

describe('UnitListingTab replace confirm', () => {
  beforeEach(() => {
    state.source = { source: 'Calculated', pricedUnitCount: 0 };
    state.units = oneUnit;
    state.sourceEnabled = [];
    vi.mocked(toast.error).mockClear();
    state.fetching = false;
    state.unitsLoading = false;
    state.previewReappraisal = vi.fn();
    state.unitsFetching = false;
    state.failed = false;
  });

  it('warns that every unit price will be cleared when the project has stored prices', async () => {
    state.source = { source: 'Calculated', pricedUnitCount: 1 };
    const { user } = renderTab();

    await pickFile(user);

    expect(screen.getByText(withPrices)).toBeInTheDocument();
    expect(screen.queryByText(withoutPrices)).toBeNull();
  });

  it('keeps the plain replace warning when no unit has a price', async () => {
    state.source = { source: 'Calculated', pricedUnitCount: 0 };
    const { user } = renderTab();

    await pickFile(user);

    expect(screen.getByText(withoutPrices)).toBeInTheDocument();
    expect(screen.queryByText(withPrices)).toBeNull();
  });

  it('only asks for the price source once a replacement file is waiting for confirmation', async () => {
    const { user } = renderTab();

    expect(state.sourceEnabled.every(e => e === false)).toBe(true);
    await pickFile(user);
    expect(state.sourceEnabled.at(-1)).toBe(true);
  });

  it('asks again every time, and warns strongly while a cached count is being refreshed', async () => {
    state.source = { source: 'Calculated', pricedUnitCount: 0 }; // the stale cached count
    state.fetching = true;
    const { user } = renderTab();

    await pickFile(user);

    expect(state.alwaysRefetch).toBe(true);
    expect(screen.getByText(withPrices)).toBeInTheDocument();
  });

  it('treats a failed refresh as unknown even with a cached count of zero', async () => {
    state.source = { source: 'Calculated', pricedUnitCount: 0 };
    state.failed = true;
    const { user } = renderTab();

    await pickFile(user);

    expect(screen.getByText(withPrices)).toBeInTheDocument();
  });

  it('assumes prices exist (stronger warning) while the count is still loading', async () => {
    state.source = undefined;
    const { user } = renderTab();

    await pickFile(user);

    expect(screen.getByText(withPrices)).toBeInTheDocument();
  });

  it('takes .xlsx only, like the backend, and refuses another type before any confirmation', async () => {
    renderTab();
    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    expect(input).toHaveAttribute('accept', '.xlsx');

    // applyAccept: false, so user-event's emulation of the browser filter does not hide the app's own check.
    await userEvent.setup({ applyAccept: false }).upload(input, new File(['x'], 'units.xls'));

    expect(toast.error).toHaveBeenCalledTimes(1);
    expect(screen.queryByText(withPrices)).toBeNull();
    expect(screen.queryByText(withoutPrices)).toBeNull();
  });

  const sized = (name: string, bytes: number) => {
    const file = new File(['x'], name);
    Object.defineProperty(file, 'size', { value: bytes });
    return file;
  };
  const MB = 1024 * 1024;

  it('refuses a file named just "xlsx" (no extension), with no confirm', async () => {
    renderTab();
    const input = document.querySelector('input[type="file"]') as HTMLInputElement;

    // applyAccept: false, so user-event's emulation of the browser filter does not hide the app's own check.
    await userEvent.setup({ applyAccept: false }).upload(input, new File(['x'], 'xlsx'));

    expect(toast.error).toHaveBeenCalledTimes(1);
    expect(screen.queryByText(withPrices)).toBeNull();
    expect(screen.queryByText(withoutPrices)).toBeNull();
  });

  it('unit-list upload: 5 MB + 1 byte is refused with the 5 MB limit, and no confirm appears', async () => {
    const { user } = renderTab();

    await pickFileOf(user, sized('units.xlsx', 5 * MB + 1));

    expect(toast.error).toHaveBeenCalledTimes(1);
    expect(toast.error).toHaveBeenCalledWith('File size exceeds 5 MB limit.');
    expect(screen.queryByText(withPrices)).toBeNull();
    expect(screen.queryByText(withoutPrices)).toBeNull();
  });

  it('reappraisal upload: a 7 MB .xlsx is fine (the BE takes up to 10 MB there)', async () => {
    const { user } = renderTab('ReAppraisal');

    await pickFileOf(user, sized('units.xlsx', 7 * MB));

    expect(toast.error).not.toHaveBeenCalled();
    expect(state.previewReappraisal).toHaveBeenCalledTimes(1);
  });

  it('reappraisal upload: over 10 MB is refused with the 10 MB limit', async () => {
    const { user } = renderTab('ReAppraisal');

    await pickFileOf(user, sized('units.xlsx', 10 * MB + 1));

    expect(toast.error).toHaveBeenCalledWith('File size exceeds 10 MB limit.');
    expect(state.previewReappraisal).not.toHaveBeenCalled();
  });

  it('condo: the import Button opens the hidden file input, which keeps an accessible name', async () => {
    const { user } = renderTab();
    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    const label = i18n.t('blockProject:unitListing.importUnits');
    expect(input).toHaveAttribute('aria-label', label);
    expect(input).toHaveAttribute('tabindex', '-1'); // the Button is the one tab stop
    const open = vi.spyOn(input, 'click');

    const button = screen.getByRole('button', { name: label });
    button.focus();
    await user.keyboard('{Enter}'); // keyboard activation goes through the Button

    expect(open).toHaveBeenCalled();
  });

  it('accepts no file before the unit list is known, so the confirmation cannot be skipped', () => {
    state.unitsLoading = true;
    renderTab();

    expect(document.querySelector('input[type="file"]')).toBeDisabled();
  });

  it('accepts no file while a refetch of the unit list is in flight, even over a cached empty list', () => {
    state.units = { units: [], totalCount: 0, remainingCount: 0, models: [] };
    state.unitsFetching = true;
    renderTab();

    expect(document.querySelector('input[type="file"]')).toBeDisabled();
  });

  it('asks nothing for a project with no units yet', async () => {
    state.units = { units: [], totalCount: 0, remainingCount: 0, models: [] };
    const { user } = renderTab();

    await pickFile(user);

    expect(screen.queryByText(withPrices)).toBeNull();
    expect(screen.queryByText(withoutPrices)).toBeNull();
  });
});

describe('UnitListingTab (Land and Building / Land)', () => {
  const plot = (over: Record<string, unknown>) => ({
    sequenceNumber: 1,
    isSold: false,
    landArea: 50,
    usableArea: 100,
    sellingPrice: 1_000_000,
    ...over,
  });
  const village = {
    units: [
      plot({ id: 'u1', plotNumber: 'A-01', houseNumber: '1/1', modelType: 'Monaco' }),
      plot({
        id: 'u2',
        plotNumber: 'A-02',
        houseNumber: '1/2',
        modelType: 'Venice',
        isSold: true,
        landArea: 60,
      }),
      plot({ id: 'u3', plotNumber: 'B-01', houseNumber: '2/1', modelType: 'Monaco' }),
    ],
    totalCount: 3,
    remainingCount: 2,
    models: ['Monaco', 'Venice'],
  };
  const renderAs = (projectType: 'LB' | 'L') =>
    render(
      <AppraisalProvider
        value={{
          appraisal: { appraisalId: 'a1', requestId: 'r1', appraisalType: 'Initial' },
          isLoading: false,
          isError: false,
          error: null,
        }}
      >
        <UnitListingTab projectType={projectType} />
      </AppraisalProvider>,
    );
  const footerOf = (label: string) => screen.getByText(label).closest('tr') as HTMLElement;
  const searchBox = () =>
    screen.getByRole('textbox', {
      name: i18n.t('blockProject:lbLists.units.searchPlaceholder'),
    });

  beforeEach(() => {
    state.source = { source: 'Calculated', pricedUnitCount: 0 };
    state.units = village as unknown as typeof oneUnit;
    state.sourceEnabled = [];
    state.unitsLoading = false;
    state.unitsFetching = false;
    state.fetching = false;
    state.failed = false;
  });

  it('Land and Building: model chips narrow the list and its totals; search finds a house number', async () => {
    const { user } = renderAs('LB');

    expect(within(footerOf('Total 3 units (filtered)')).getByText('160.00')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /^Venice\s*1$/ }));
    expect(screen.queryByText('A-01')).toBeNull();
    expect(screen.getByText('A-02')).toBeInTheDocument();
    expect(within(footerOf('Total 1 unit (filtered)')).getByText('60.00')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /^All\s*\d/, pressed: false }));
    await user.type(searchBox(), '2/1');
    expect(screen.queryByText('A-01')).toBeNull();
    expect(screen.getByText('B-01')).toBeInTheDocument();
  });

  it('Land: plot columns only, with no model chips', () => {
    state.units = {
      ...village,
      units: village.units.map(u => ({ ...u, modelType: undefined })),
      models: [],
    } as unknown as typeof oneUnit;
    renderAs('L');

    const headers = screen.getAllByRole('columnheader').map(h => h.textContent);
    expect(headers).toContain(i18n.t('blockProject:unitListing.cols.landAreaSqWa'));
    expect(headers).not.toContain(i18n.t('blockProject:unitListing.cols.modelName'));
    expect(headers).not.toContain(i18n.t('blockProject:unitListing.cols.usableAreaSqm'));
    expect(screen.queryByRole('group', { name: 'Model Name' })).toBeNull();
    // The same warning before an Excel upload replaces every unit.
    expect(
      screen.getByText(i18n.t('blockProject:condoUnitsPrice.listing.replaceNote')),
    ).toBeInTheDocument();
  });
});

describe('UnitListingTab (condo)', () => {
  const unit = (over: Record<string, unknown>) => ({
    id: 'u',
    sequenceNumber: 1,
    isSold: false,
    ...over,
  });
  const towers = {
    units: [
      unit({
        id: 'u1',
        sequenceNumber: 1,
        towerName: 'A',
        floor: 1,
        roomNumber: '101',
        usableArea: 30,
        sellingPrice: 3_000_000,
      }),
      unit({
        id: 'u2',
        sequenceNumber: 2,
        towerName: 'A',
        floor: 2,
        roomNumber: '201',
        usableArea: 40.5,
        sellingPrice: 4_000_000,
        isSold: true,
      }),
      unit({
        id: 'u3',
        sequenceNumber: 3,
        towerName: 'B',
        floor: 1,
        roomNumber: '301',
        usableArea: 50,
        sellingPrice: 5_000_000,
      }),
    ],
    totalCount: 3,
    remainingCount: 2,
    models: [] as string[],
  };
  const footerOf = (label: string) => screen.getByText(label).closest('tr') as HTMLElement;

  beforeEach(() => {
    state.source = { source: 'Calculated', pricedUnitCount: 0 };
    state.units = towers as unknown as typeof oneUnit;
    state.sourceEnabled = [];
    state.unitsLoading = false;
    state.unitsFetching = false;
    state.fetching = false;
    state.failed = false;
  });

  it('says before any upload that a new file replaces every unit and clears every unit price', () => {
    renderTab();

    expect(
      screen.getByText(i18n.t('blockProject:condoUnitsPrice.listing.replaceNote')),
    ).toBeInTheDocument();
  });

  it('read-only: no upload button and no replace note', () => {
    render(
      <AppraisalProvider
        value={{
          appraisal: { appraisalId: 'a1', requestId: 'r1', appraisalType: 'Initial' },
          isLoading: false,
          isError: false,
          error: null,
        }}
      >
        <PageReadOnlyContext.Provider value={true}>
          <UnitListingTab projectType="U" />
        </PageReadOnlyContext.Provider>
      </AppraisalProvider>,
    );

    expect(document.querySelector('input[type="file"]')).toBeNull();
    expect(
      screen.queryByText(i18n.t('blockProject:condoUnitsPrice.listing.replaceNote')),
    ).toBeNull();
  });

  it('the totals row follows the filters: status chips and tower chips', async () => {
    const { user } = renderTab();

    const all = footerOf('Total 3 units (filtered)');
    expect(within(all).getByText('120.50')).toBeInTheDocument();
    expect(within(all).getByText('12,000,000.00')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /^Sold/ }));
    const sold = footerOf('Total 1 unit (filtered)');
    expect(within(sold).getByText('4,000,000.00')).toBeInTheDocument();
    // The rows too: area and price carry two decimals.
    const soldRow = screen.getByText('201').closest('tr') as HTMLElement;
    expect(within(soldRow).getByText('40.50')).toBeInTheDocument();
    expect(within(soldRow).getByText('4,000,000.00')).toBeInTheDocument();
    expect(within(soldRow).queryByText('2.00')).toBeNull(); // the floor stays a whole number

    // Two "All" chips: the status one comes first, then the tower one.
    await user.click(screen.getAllByRole('button', { name: /^All/ })[0]);
    await user.click(screen.getByRole('button', { name: /^B\s*\d/ }));
    expect(
      within(footerOf('Total 1 unit (filtered)')).getByText('5,000,000.00'),
    ).toBeInTheDocument();
  });

  it('mutes sold rows with a pill and filters by floor and search', async () => {
    const { user } = renderTab();

    const soldRow = screen.getByText('201').closest('tr') as HTMLElement;
    expect(within(soldRow).getByText('Sold')).toBeInTheDocument();

    // The floor filter is the shared compact Dropdown: open it, pick an entry.
    await user.click(screen.getByRole('button', { name: 'Floor' }));
    await user.click(screen.getByRole('option', { name: '2' }));
    expect(screen.queryByText('101')).toBeNull();
    expect(screen.getByText('201')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Floor' }));
    await user.click(screen.getByRole('option', { name: 'All floors' }));
    await user.type(
      screen.getByRole('textbox', {
        name: i18n.t('blockProject:condoUnitsPrice.listing.searchPlaceholder'),
      }),
      '301',
    );
    expect(screen.queryByText('101')).toBeNull();
    expect(screen.getByText('301')).toBeInTheDocument();
  });
});
