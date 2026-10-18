import { beforeEach, describe, expect, it, vi } from 'vitest';
import i18n from '@/i18n';
import toast from 'react-hot-toast';
import { render, screen, userEvent } from '@/test/test-utils';
import { AppraisalProvider } from '@/features/appraisal/context/AppraisalContext';
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
