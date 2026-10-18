import { describe, expect, it, vi } from 'vitest';
import '@/i18n';
import { render, screen } from '@/test/test-utils';
import CollateralCatalogPage from './CollateralCatalogPage';
import type { CollateralCatalogItem } from '../api/types';

// Rows as the backend sends them: per-type columns keep their `Land_` / `Condo_` prefixes
const items = [
  {
    id: 'm1',
    collateralType: 'L',
    ownerName: 'Somchai',
    createdAt: '2026-01-01T00:00:00',
    engagementCount: 2,
    land_Province: '10',
    land_District: '1001',
    land_SubDistrict: '100101',
    land_TitleNumber: '1234',
  },
  {
    id: 'm2',
    collateralType: 'U',
    ownerName: 'Somying',
    createdAt: '2026-01-01T00:00:00',
    engagementCount: 1,
    condo_Province: '50',
    condo_CondoName: 'Lumpini Tower',
  },
] as CollateralCatalogItem[];

vi.mock('../api/hooks', () => ({
  useCollateralCatalog: () => ({
    data: { items, count: 2, pageNumber: 0, pageSize: 20 },
    isLoading: false,
    isFetching: false,
    isError: false,
    error: null,
  }),
}));

describe('CollateralCatalogPage', () => {
  it('shows each type identity and province from the prefixed backend columns', () => {
    render(<CollateralCatalogPage />);
    expect(screen.getByText('1234')).toBeTruthy();
    expect(screen.getByText('Lumpini Tower')).toBeTruthy();
    // No address data is loaded here, so the province falls back to its geocode
    expect(screen.getByText('10')).toBeTruthy();
    expect(screen.getByText('50')).toBeTruthy();
  });
});
