/**
 * Unit tests for the History Search (Pin) feature.
 *
 * Scenarios:
 * 1. Renders search panel and map view in standalone mode
 * 2. Green pin checkbox shown for internal users
 * 3. Green pin checkbox hidden for external users (isExternal = true)
 * 4. Embedded mode fires search on mount
 * 5. Clicking a pin in the results list opens PinDetailDrawer
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { render } from '@/test/test-utils';
import { server } from '@/test/mocks/server';
import type { HistorySearchResult } from './types';

// ─── Module mocks ─────────────────────────────────────────────────────────────

// Hoist mock factory so we can control the role inside each test
let mockRoles: string[] = ['IntAppraisalStaff'];

vi.mock('@features/auth/store', () => ({
  useAuthStore: (selector: (s: { user: { roles: string[]; permissions: string[] } }) => unknown) =>
    selector({ user: { roles: mockRoles, permissions: [] } }),
}));

// MapView — Google Maps unavailable in happy-dom
vi.mock('./components/MapView', () => ({
  MapView: () => <div data-testid="map-view" />,
}));

// i18next — return the key itself so assertions on text work without real translations
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, _opts?: Record<string, unknown>) => key,
    i18n: { language: 'en', changeLanguage: vi.fn() },
  }),
  initReactI18next: { type: '3rdParty', init: vi.fn() },
}));

// ─── Mock data ────────────────────────────────────────────────────────────────

const mockMcPin = {
  marketComparableId: 'mc-001',
  lat: 13.76,
  lon: 100.51,
  propertyType: 'Land',
  surveyName: 'Survey Alpha',
  infoDateTime: '2024-03-01T00:00:00Z',
  offerPrice: 3000000,
  salePrice: 2800000,
  distanceKm: 1.2,
  appraisalNumber: 'RPT-2024-009',
};

const mockResult: HistorySearchResult = {
  collateral: {
    items: [{
      collateralMasterId: 'cm-001',
      lat: 13.75,
      lon: 100.5,
      collateralType: 'Land',
      propertyType: 'Residential',
      engagementCount: 3,
      lastAppraisedDate: '2024-01-15T00:00:00Z',
      lastAppraisedValue: 5000000,
      distanceKm: 0.5,
      province: 'Bangkok',
      district: 'Pathum Wan',
      subDistrict: 'Lumphini',
      lastAppraisalNumber: 'RPT-2024-001',
    }],
    count: 1,
    pageNumber: 0,
    pageSize: 50,
  },
  marketComparables: {
    items: [mockMcPin],
    count: 1,
    pageNumber: 0,
    pageSize: 50,
  },
};

const API_URL = '*/api';

function setupHistorySearchHandler(result: HistorySearchResult = mockResult) {
  server.use(
    http.post(`${API_URL}/history-search`, async () => HttpResponse.json(result)),
  );
}

// ─── Lazy import to defer until after vi.mock hoisting ────────────────────────

// We import the component lazily in tests so the vi.mock is in place first
async function getComponent() {
  const { HistorySearchMap } = await import('./HistorySearchMap');
  return HistorySearchMap;
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('HistorySearchMap', () => {
  beforeEach(() => {
    mockRoles = ['IntAppraisalStaff']; // reset to internal user
    setupHistorySearchHandler();
  });

  it('renders search panel and map view in standalone mode', async () => {
    const HistorySearchMap = await getComponent();
    render(<HistorySearchMap mode="standalone" />);

    expect(screen.getByTestId('search-panel')).toBeInTheDocument();
    expect(screen.getByTestId('map-view')).toBeInTheDocument();
  });

  it('shows green pin checkbox for internal users', async () => {
    mockRoles = ['IntAppraisalStaff'];
    const HistorySearchMap = await getComponent();
    render(<HistorySearchMap mode="standalone" />);

    expect(screen.getByTestId('filter-collateral')).toBeInTheDocument();
  });

  it('hides green pin checkbox for external users', async () => {
    mockRoles = ['ExtAdmin'];
    const HistorySearchMap = await getComponent();
    render(<HistorySearchMap mode="standalone" />);

    expect(screen.queryByTestId('filter-collateral')).not.toBeInTheDocument();
    // Market comparable filter always shown
    expect(screen.getByTestId('filter-mc')).toBeInTheDocument();
  });

  it('fires search on mount in embedded mode', async () => {
    let searchFired = false;
    server.use(
      http.post(`${API_URL}/history-search`, async () => {
        searchFired = true;
        return HttpResponse.json(mockResult);
      }),
    );

    const HistorySearchMap = await getComponent();
    render(
      <HistorySearchMap
        mode="embedded"
        initialCenter={{ lat: 13.7563, lon: 100.5018 }}
        initialRadiusKm={1}
        initialPeriod="Past3y"
      />,
    );

    await waitFor(() => {
      expect(searchFired).toBe(true);
    });
  });

  it('opens PinDetailDrawer when a result list item is clicked', async () => {
    const user = userEvent.setup();
    const HistorySearchMap = await getComponent();

    render(
      <HistorySearchMap
        mode="embedded"
        initialCenter={{ lat: 13.7563, lon: 100.5018 }}
      />,
    );

    // Wait for the MC result to appear
    await waitFor(() => {
      expect(screen.getByText('Survey Alpha')).toBeInTheDocument();
    });

    // Click the MC result row
    await user.click(screen.getByText('Survey Alpha'));

    // Drawer should appear with the correct content
    await waitFor(() => {
      expect(screen.getByTestId('pin-detail-drawer')).toBeInTheDocument();
    });

    expect(screen.getByTestId('pin-detail-drawer')).toHaveTextContent('Survey Alpha');
  });
});
