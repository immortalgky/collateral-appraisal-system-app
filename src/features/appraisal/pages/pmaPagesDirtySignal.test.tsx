import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Route, Routes } from 'react-router-dom';
import { render, screen, waitFor } from '@/test/test-utils';
import { useAddressStore } from '@/shared/store';
import { mockThaiAddresses } from '@/shared/data/thaiAddresses';
import CondoPMAPage from './CondoPMAPage';
import LandBuildingPMAPage from './LandBuildingPMAPage';

/**
 * The PMA pages drive four things from one dirty signal: the leave guard, the "Unsaved changes"
 * badge, Save draft and Save. These render the real pages, so a page that goes back to reading
 * react-hook-form's whole-form isDirty — which a derived write can leave stale — fails here, as does
 * a guard that is fed a constant.
 *
 * The record has a sub-district that is in the address store and no district, so LocationSelector's
 * on-load self-heal writes the district code (and province, postcode) without shouldDirty. That
 * leaves district differing from its reset default, which is what makes the put-back test fail for
 * a page reading isDirty: after an edit is put back, isDirty still sees that difference.
 */

const state = vi.hoisted(() => ({
  condo: null as unknown,
  landBuilding: null as unknown,
  guard: [] as boolean[],
  saved: [] as { data: Record<string, unknown> }[],
}));

vi.mock('@/features/appraisal/context/AppraisalContext', () => ({
  useAppraisalId: () => 'appraisal-1',
  useBasePath: () => '/appraisal/appraisal-1',
}));

vi.mock('@/shared/hooks/useUnsavedChangesWarning', () => ({
  useUnsavedChangesWarning: (dirty: boolean) => {
    state.guard.push(dirty);
    return { blocker: { when: dirty, skipRef: { current: false } }, skipWarning: () => {} };
  },
}));

// Registers a router blocker, which needs a data router; the guard's input is captured above.
vi.mock('@/shared/components/UnsavedChangesDialog', () => ({ default: () => null }));
vi.mock('@/shared/components/RightMenuPortal', () => ({ default: () => null }));

vi.mock('../api', () => {
  // Every save succeeds and is recorded, so the pages' onSuccess (which resets the form) runs.
  const mutation = () => ({
    mutate: (
      vars: { data: Record<string, unknown> },
      options?: { onSuccess?: (r?: unknown) => void },
    ) => {
      state.saved.push(vars);
      options?.onSuccess?.({ propertyId: 'property-1' });
    },
    isPending: false,
  });
  return {
    useGetCondoPMAPropertyById: () => ({ data: state.condo, isLoading: false }),
    useUpdateCondoPMAProperty: mutation,
    useSaveCondoPMAPropertyDraft: mutation,
    useCreateCondoPMAProperty: mutation,
    useGetLandAndBuildingPMAPropertyById: () => ({ data: state.landBuilding, isLoading: false }),
    useUpdateLandAndBuildingPMAProperty: mutation,
    useSaveLandAndBuildingPMAPropertyDraft: mutation,
    useCreateLandAndBuildingPMAProperty: mutation,
  };
});

const address = mockThaiAddresses[0];

const condoRecord = {
  sellingPrice: 1_000_000,
  forcedSalePrice: 750_000,
  buildingInsurancePrice: 123_456,
  titleNumber: '123',
  condoName: 'A',
  roomNumber: '1',
  floorNumber: '2',
  buildingNumber: 'B',
  condoRegistrationNumber: 'R',
  subDistrict: address.subDistrictCode,
  district: null, // the self-heal fills these in on load
  province: null,
  externalSyncStatus: 'Delivered', // a real value: NotSynced | Pending | Delivered | Failed
};

const landBuildingRecord = {
  sellingPrice: 1_000_000,
  forcedSalePrice: 750_000,
  buildingInsurancePrice: 123_456,
  titles: [{ titleNumber: 'T1', rai: 1, ngan: 2, squareWa: 3 }],
  subDistrict: address.subDistrictCode,
  district: null,
  province: null,
  externalSyncStatus: 'Delivered', // a real value: NotSynced | Pending | Delivered | Failed
};

const pages = [
  {
    name: 'condo',
    Page: CondoPMAPage,
    record: condoRecord,
    set: (r: unknown) => (state.condo = r),
  },
  {
    name: 'land+building',
    Page: LandBuildingPMAPage,
    record: landBuildingRecord,
    set: (r: unknown) => (state.landBuilding = r),
  },
] as const;

function open(Page: React.ComponentType) {
  render(
    <Routes>
      <Route path="/p/:propertyId" element={<Page />} />
    </Routes>,
    { initialEntries: ['/p/property-1'] },
  );
}

const badge = () => screen.queryByText('Unsaved changes');
const saveDraft = () => screen.getByRole('button', { name: /save draft/i });
const save = () => screen.getByRole('button', { name: /^save$/i });
const guard = () => state.guard[state.guard.length - 1];

async function typeInto(displayed: RegExp, text: string) {
  const { default: userEvent } = await import('@testing-library/user-event');
  const user = userEvent.setup();
  const input = screen.getByDisplayValue(displayed);
  await user.clear(input);
  await user.type(input, text);
  await user.tab();
}

beforeEach(() => {
  state.guard = [];
  state.saved = [];
  useAddressStore.setState({ titleAddresses: [address], dopaAddresses: [address] });
});

describe.each(pages)('$name PMA page: one dirty signal', ({ Page, record, set }) => {
  it('opens clean', async () => {
    set(record);
    open(Page);
    // Wait for the loaded record to be on screen (the mapper fills the district name at reset()).
    await waitFor(() =>
      expect(screen.getAllByDisplayValue(address.districtName).length).toBeGreaterThan(0),
    );

    expect(badge()).toBeNull();
    expect(saveDraft()).toBeDisabled();
    expect(save()).toBeDisabled();
    expect(guard()).toBe(false);
  });

  it('turns all four on for an edit and off again when it is put back', async () => {
    set(record);
    open(Page);
    await waitFor(() =>
      expect(screen.getAllByDisplayValue(address.districtName).length).toBeGreaterThan(0),
    );

    await typeInto(/123,456/, '200000');
    await waitFor(() => expect(badge()).not.toBeNull());
    expect(saveDraft()).toBeEnabled();
    expect(save()).toBeEnabled();
    expect(guard()).toBe(true);

    await typeInto(/200,000/, '123456');
    await waitFor(() => expect(badge()).toBeNull());
    expect(saveDraft()).toBeDisabled();
    expect(save()).toBeDisabled();
    expect(guard()).toBe(false);
  });

  it('Save draft sends the self-healed address, and a saved page is clean again', async () => {
    set(record);
    open(Page);
    await waitFor(() =>
      expect(screen.getAllByDisplayValue(address.districtName).length).toBeGreaterThan(0),
    );

    await typeInto(/123,456/, '200000');
    await waitFor(() => expect(saveDraft()).toBeEnabled());
    const { default: userEvent } = await import('@testing-library/user-event');
    await userEvent.setup().click(saveDraft());

    // The record came with no district; the mapper leaves it '' and only LocationSelector's on-load
    // self-heal writes the code. So this shows the self-heal ran for this fixture — which the
    // put-back test relies on to catch a page reading isDirty.
    await waitFor(() => expect(state.saved).toHaveLength(1));
    expect(state.saved[0].data.district).toBe(address.districtCode);

    // onSuccess resets the form to what was saved.
    await waitFor(() => expect(badge()).toBeNull());
    expect(saveDraft()).toBeDisabled();
    expect(save()).toBeDisabled();
    expect(guard()).toBe(false);
  });

  it('lets Save retry a failed sync with nothing edited, but not Save draft', async () => {
    set({ ...record, externalSyncStatus: 'Failed' });
    open(Page);
    await waitFor(() =>
      expect(screen.getAllByDisplayValue(address.districtName).length).toBeGreaterThan(0),
    );

    expect(save()).toBeEnabled();
    expect(saveDraft()).toBeDisabled();
    expect(badge()).toBeNull();
  });
});
