import { describe, expect, it, vi } from 'vitest';
import '@/i18n';
import { act, render, screen } from '@/test/test-utils';
import { useAddressStore } from '@/shared/store';
import type { ThaiAddress } from '@/shared/data/thaiAddresses';
import CollateralMasterDetailPage from './CollateralMasterDetailPage';
import type { CollateralMasterDto } from '../api/types';

// The backend returns collateralType as a code ('U'), never a name; the detail card follows the
// detail object the backend filled.
const master = {
  id: 'm1',
  collateralType: 'U',
  isDeleted: false,
  createdAt: '2026-01-01T00:00:00',
  engagementCount: 1,
  condoDetail: {
    condoRegistrationNumber: 'REG-1',
    buildingNumber: 'B1',
    roomNumber: '301',
    province: '10',
    district: '1001',
    subDistrict: '100101',
    appraisalValue: 2_000_000,
  },
} as unknown as CollateralMasterDto;

const mutation = { mutate: vi.fn(), isPending: false };
vi.mock('../api/hooks', () => ({
  useCollateralMaster: () => ({ data: master, isLoading: false, isError: false }),
  useCollateralEngagements: () => ({ data: undefined }),
  useEngagementSnapshot: () => ({ data: undefined, isLoading: false }),
  useEditCollateralMaster: () => mutation,
  useSoftDeleteCollateralMaster: () => mutation,
  useRestoreCollateralMaster: () => mutation,
}));

describe('CollateralMasterDetailPage', () => {
  it('renders the condo card for collateralType "U"', () => {
    render(<CollateralMasterDetailPage />);
    expect(screen.getByText('Condo Identity')).toBeTruthy();
    expect(screen.getByText('REG-1')).toBeTruthy();
    expect(screen.getByText('301')).toBeTruthy();
    expect(screen.getByText('฿2,000,000.00')).toBeTruthy();
    expect(screen.getByText('U Master')).toBeTruthy();
    // No address data yet: the geocodes show as they are
    expect(screen.getByText('100101')).toBeTruthy();

    // Once the addresses load, the cards re-render with names
    act(() =>
      useAddressStore.getState().setTitleAddresses([
        {
          provinceCode: '10',
          provinceName: 'Bangkok',
          districtCode: '1001',
          districtName: 'Phra Nakhon',
          subDistrictCode: '100101',
          subDistrictName: 'Phra Borom',
          postcode: '10200',
        } as ThaiAddress,
      ]),
    );
    expect(screen.getByText('Bangkok')).toBeTruthy();
    expect(screen.getByText('Phra Nakhon')).toBeTruthy();
    expect(screen.getByText('Phra Borom')).toBeTruthy();
  });
});
