import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Route, Routes } from 'react-router-dom';
import { render, screen, waitFor, within } from '@/test/test-utils';
import { useParameterStore } from '@/shared/store';
import CreateCondoPage from './CreateCondoPage';

/**
 * A condo unit can be rented out to others, like land. "Tied to a lease" in its obligations turns
 * the rented-out switch on and locks it (the appraiser's own pick only), and the switch brings the
 * lease agreement and rental info tabs.
 */

const state = vi.hoisted(() => ({ record: null as unknown }));

vi.mock('@/features/appraisal/context/AppraisalContext', () => ({
  useAppraisalId: () => 'appraisal-1',
  useBasePath: () => '/appraisal/appraisal-1',
  useIsCiAppraisal: () => false,
  useAppraisalContextSafe: () => null,
}));
vi.mock('@/shared/hooks/useUnsavedChangesWarning', () => ({
  useUnsavedChangesWarning: (dirty: boolean) => ({
    blocker: { when: dirty, skipRef: { current: false } },
    skipWarning: () => {},
  }),
}));
vi.mock('@/shared/components/UnsavedChangesDialog', () => ({ default: () => null }));
vi.mock('@/shared/components/RightMenuPortal', () => ({ default: () => null }));
vi.mock('../hooks/useEnrichedPropertyGroups', () => ({
  useEnrichedPropertyGroups: () => ({ groups: [] }),
}));
vi.mock('../api/property', async importOriginal => {
  const mutation = () => ({ mutate: () => {}, isPending: false });
  return {
    ...(await importOriginal<object>()),
    useGetCondoPropertyById: () => ({ data: state.record, isLoading: false }),
    useCreateCondoProperty: mutation,
    useUpdateCondoProperty: mutation,
  };
});

const record = {
  propertyName: 'Unit 1',
  condoName: 'A',
  roomNumber: '1',
  floorNumber: '2',
  buildingNumber: 'B',
  condoRegistrationNumber: 'R',
  obligationType: [],
};

const open = () =>
  render(
    <Routes>
      <Route path="/p/:propertyId" element={<CreateCondoPage />} />
    </Routes>,
    { initialEntries: ['/p/property-1'] },
  );

const tab = (name: string) => screen.queryByRole('tab', { name: new RegExp(`^${name}`) });
const leaseTab = () => tab('Lease Agreement');
const rentedOut = () => document.querySelector<HTMLElement>('[data-field="isRentedOut"]')!;
const chip = (name: string) => screen.getByRole('button', { name });
const toggle = (caption: 'No' | 'Yes') => within(rentedOut()).getByRole('radio', { name: caption });
const loaded = () => waitFor(() => expect(rentedOut()).toBeInTheDocument());

beforeEach(() => {
  state.record = record;
  useParameterStore.getState().setParameters(
    [
      ['01', 'No obligation'],
      ['02', 'Mortgaged'],
      ['03', 'Tied to a lease'],
    ].map(([code, description], i) => ({
      parId: i,
      group: 'Obligation',
      country: 'th',
      language: 'en',
      code,
      description,
      isActive: true,
      seqNo: i,
    })),
  );
});

describe('condo page: rented out', () => {
  it('has no lease or rental tab while not rented out', async () => {
    open();
    await loaded();
    expect(leaseTab()).toBeNull();
    expect(tab('Rental Info')).toBeNull();
  });

  it('shows both tabs for a saved rented-out unit, and opens clean', async () => {
    state.record = { ...record, isRentedOut: true };
    open();
    await waitFor(() => expect(leaseTab()).toBeInTheDocument());
    expect(tab('Rental Info')).toBeInTheDocument();
    expect(screen.queryByText('Unsaved changes')).toBeNull();
  });

  it('turns on and locks when the user picks "tied to a lease", and brings the tabs', async () => {
    const { user } = open();
    await loaded();
    await user.click(chip('Tied to a lease'));
    await waitFor(() => expect(leaseTab()).toBeInTheDocument());
    expect(toggle('Yes')).toBeDisabled();
    expect(toggle('No')).toBeDisabled();
  });

  it('unlocks when the pick is dropped, keeps the tabs, and drops them when turned off', async () => {
    const { user } = open();
    await loaded();
    await user.click(chip('Tied to a lease'));
    await user.click(chip('Tied to a lease'));
    expect(toggle('No')).toBeEnabled();
    expect(leaseTab()).toBeInTheDocument();
    await user.click(toggle('No'));
    await waitFor(() => expect(leaseTab()).toBeNull());
  });
});
