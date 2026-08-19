/**
 * ============================================
 * TOPIC 2: ZUSTAND STORE TESTS
 * ============================================
 *
 * This file demonstrates how to test Zustand stores.
 * Zustand stores are basically functions that return state and actions.
 *
 * Key concepts:
 * - Reset store state between tests using beforeEach
 * - Use act() for state changes (React requirement)
 * - Test initial state, actions, and derived state
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { act } from '@testing-library/react';
import {
  useUIStore,
  useParameterStore,
  useLoadingStore,
  useBreadcrumbStore,
  useAddressStore,
  showLoading,
  hideLoading,
} from './store';
import type { ThaiAddress } from './data/thaiAddresses';

// ============================================
// useUIStore Tests
// ============================================
describe('useUIStore', () => {
  // Reset store before each test
  beforeEach(() => {
    act(() => {
      useUIStore.setState({
        sidebarOpen: false,
        searchQuery: '',
      });
    });
  });

  // ------------------------------------------
  // Scenario 1: Check initial state
  // ------------------------------------------
  it('should have correct initial state', () => {
    const state = useUIStore.getState();

    expect(state.sidebarOpen).toBe(false);
    expect(state.searchQuery).toBe('');
  });

  // ------------------------------------------
  // Scenario 2: Test setSidebarOpen action
  // ------------------------------------------
  it('should toggle sidebar open state', () => {
    const { setSidebarOpen } = useUIStore.getState();

    // Open sidebar
    act(() => {
      setSidebarOpen(true);
    });
    expect(useUIStore.getState().sidebarOpen).toBe(true);

    // Close sidebar
    act(() => {
      setSidebarOpen(false);
    });
    expect(useUIStore.getState().sidebarOpen).toBe(false);
  });

  // ------------------------------------------
  // Scenario 3: Test setSearchQuery action
  // ------------------------------------------
  it('should update search query', () => {
    const { setSearchQuery } = useUIStore.getState();

    act(() => {
      setSearchQuery('test query');
    });

    expect(useUIStore.getState().searchQuery).toBe('test query');
  });

  // ------------------------------------------
  // Scenario 4: Test clearing search query
  // ------------------------------------------
  it('should clear search query', () => {
    const { setSearchQuery } = useUIStore.getState();

    // Set a query first
    act(() => {
      setSearchQuery('some text');
    });
    expect(useUIStore.getState().searchQuery).toBe('some text');

    // Clear it
    act(() => {
      setSearchQuery('');
    });
    expect(useUIStore.getState().searchQuery).toBe('');
  });
});

// ============================================
// useLoadingStore Tests
// ============================================
describe('useLoadingStore', () => {
  beforeEach(() => {
    act(() => {
      useLoadingStore.setState({
        isLoading: false,
        message: undefined,
      });
    });
  });

  // ------------------------------------------
  // Scenario 1: Check initial state
  // ------------------------------------------
  it('should have correct initial state', () => {
    const state = useLoadingStore.getState();

    expect(state.isLoading).toBe(false);
    expect(state.message).toBeUndefined();
  });

  // ------------------------------------------
  // Scenario 2: Test showLoading without message
  // ------------------------------------------
  it('should show loading without message', () => {
    act(() => {
      useLoadingStore.getState().showLoading();
    });

    const state = useLoadingStore.getState();
    expect(state.isLoading).toBe(true);
    expect(state.message).toBeUndefined();
  });

  // ------------------------------------------
  // Scenario 3: Test showLoading with message
  // ------------------------------------------
  it('should show loading with message', () => {
    act(() => {
      useLoadingStore.getState().showLoading('Loading data...');
    });

    const state = useLoadingStore.getState();
    expect(state.isLoading).toBe(true);
    expect(state.message).toBe('Loading data...');
  });

  // ------------------------------------------
  // Scenario 4: Test hideLoading
  // ------------------------------------------
  it('should hide loading and clear message', () => {
    // First show loading with message
    act(() => {
      useLoadingStore.getState().showLoading('Please wait...');
    });

    // Then hide
    act(() => {
      useLoadingStore.getState().hideLoading();
    });

    const state = useLoadingStore.getState();
    expect(state.isLoading).toBe(false);
    expect(state.message).toBeUndefined();
  });

  // ------------------------------------------
  // Scenario 5: Test utility functions (exported helpers)
  // ------------------------------------------
  it('should work with exported utility functions', () => {
    // Use the exported showLoading function
    act(() => {
      showLoading('Processing...');
    });
    expect(useLoadingStore.getState().isLoading).toBe(true);
    expect(useLoadingStore.getState().message).toBe('Processing...');

    // Use the exported hideLoading function
    act(() => {
      hideLoading();
    });
    expect(useLoadingStore.getState().isLoading).toBe(false);
  });
});

// ============================================
// useBreadcrumbStore Tests
// ============================================
describe('useBreadcrumbStore', () => {
  beforeEach(() => {
    act(() => {
      useBreadcrumbStore.setState({ items: [] });
    });
  });

  // ------------------------------------------
  // Scenario 1: Check initial state
  // ------------------------------------------
  it('should have empty items initially', () => {
    const { items } = useBreadcrumbStore.getState();
    expect(items).toEqual([]);
  });

  // ------------------------------------------
  // Scenario 2: Test setItems action
  // ------------------------------------------
  it('should set breadcrumb items', () => {
    const newItems = [
      { label: 'Home', href: '/' },
      { label: 'Products', href: '/products' },
    ];

    act(() => {
      useBreadcrumbStore.getState().setItems(newItems);
    });

    expect(useBreadcrumbStore.getState().items).toEqual(newItems);
  });

  // ------------------------------------------
  // Scenario 3: Test push action (add new item)
  // ------------------------------------------
  it('should push new breadcrumb item', () => {
    // Set initial items
    act(() => {
      useBreadcrumbStore.getState().setItems([{ label: 'Home', href: '/' }]);
    });

    // Push new item
    act(() => {
      useBreadcrumbStore.getState().push({ label: 'Products', href: '/products' });
    });

    const { items } = useBreadcrumbStore.getState();
    expect(items).toHaveLength(2);
    expect(items[1]).toEqual({ label: 'Products', href: '/products' });
  });

  // ------------------------------------------
  // Scenario 4: Test push with existing href (navigate back)
  // ------------------------------------------
  it('should truncate when pushing existing item (navigate back)', () => {
    // Set multiple items
    act(() => {
      useBreadcrumbStore.getState().setItems([
        { label: 'Home', href: '/' },
        { label: 'Products', href: '/products' },
        { label: 'Details', href: '/products/1' },
      ]);
    });

    // Push existing item (going back to Products)
    act(() => {
      useBreadcrumbStore.getState().push({ label: 'Products', href: '/products' });
    });

    const { items } = useBreadcrumbStore.getState();
    expect(items).toHaveLength(2);
    expect(items[1].href).toBe('/products');
  });

  // ------------------------------------------
  // Scenario 5: Test pop action
  // ------------------------------------------
  it('should pop last breadcrumb item', () => {
    act(() => {
      useBreadcrumbStore.getState().setItems([
        { label: 'Home', href: '/' },
        { label: 'Products', href: '/products' },
      ]);
    });

    act(() => {
      useBreadcrumbStore.getState().pop();
    });

    const { items } = useBreadcrumbStore.getState();
    expect(items).toHaveLength(1);
    expect(items[0].label).toBe('Home');
  });

  // ------------------------------------------
  // Scenario 6: Test reset action
  // ------------------------------------------
  it('should reset breadcrumb items', () => {
    act(() => {
      useBreadcrumbStore.getState().setItems([
        { label: 'Home', href: '/' },
        { label: 'Products', href: '/products' },
      ]);
    });

    act(() => {
      useBreadcrumbStore.getState().reset();
    });

    expect(useBreadcrumbStore.getState().items).toEqual([]);
  });

  // ------------------------------------------
  // Scenario 7: Test multiple sequential actions
  // ------------------------------------------
  it('should handle multiple sequential actions', () => {
    // Push multiple items
    act(() => {
      useBreadcrumbStore.getState().push({ label: 'Home', href: '/' });
    });
    act(() => {
      useBreadcrumbStore.getState().push({ label: 'Products', href: '/products' });
    });
    act(() => {
      useBreadcrumbStore.getState().push({ label: 'Details', href: '/products/1' });
    });

    expect(useBreadcrumbStore.getState().items).toHaveLength(3);

    // Pop one
    act(() => {
      useBreadcrumbStore.getState().pop();
    });

    expect(useBreadcrumbStore.getState().items).toHaveLength(2);
  });
});

// ============================================
// useParameterStore Tests
// ============================================
describe('useParameterStore', () => {
  beforeEach(() => {
    act(() => {
      useParameterStore.setState({ parameters: {} });
    });
  });

  // ------------------------------------------
  // Scenario 1: Check initial state
  // ------------------------------------------
  it('should have empty parameters initially', () => {
    const { parameters } = useParameterStore.getState();
    expect(parameters).toEqual({});
  });

  // ------------------------------------------
  // Scenario 2: Test setParameters with single group
  // ------------------------------------------
  it('should group parameters by group.country.language', () => {
    const params = [
      { id: 1, group: 'collateral', country: 'TH', language: 'en', code: '01', description: 'Land' },
      { id: 2, group: 'collateral', country: 'TH', language: 'en', code: '02', description: 'Building' },
    ];

    act(() => {
      useParameterStore.getState().setParameters(params);
    });

    const { parameters } = useParameterStore.getState();
    expect(parameters['collateral.th.en']).toHaveLength(2);
    expect(parameters['collateral.th.en'][0].code).toBe('01');
    expect(parameters['collateral.th.en'][1].code).toBe('02');
  });

  // ------------------------------------------
  // Scenario 3: Test setParameters with multiple groups
  // ------------------------------------------
  it('should handle multiple parameter groups', () => {
    const params = [
      { id: 1, group: 'collateral', country: 'TH', language: 'en', code: '01', description: 'Land' },
      { id: 2, group: 'status', country: 'TH', language: 'en', code: 'active', description: 'Active' },
      { id: 3, group: 'collateral', country: 'TH', language: 'th', code: '01', description: 'ที่ดิน' },
    ];

    act(() => {
      useParameterStore.getState().setParameters(params);
    });

    const { parameters } = useParameterStore.getState();
    expect(Object.keys(parameters)).toHaveLength(3);
    expect(parameters['collateral.th.en']).toHaveLength(1);
    expect(parameters['status.th.en']).toHaveLength(1);
    expect(parameters['collateral.th.th']).toHaveLength(1);
  });

  // ------------------------------------------
  // Scenario 4: Test setParameters with empty array
  // ------------------------------------------
  it('should handle empty parameter array', () => {
    act(() => {
      useParameterStore.getState().setParameters([]);
    });

    const { parameters } = useParameterStore.getState();
    expect(parameters).toEqual({});
  });
});

// ============================================
// useAddressStore Tests
// ============================================
//
// searchBySubDistrict powers every location-selector in the app. It tokenises the query, matches
// each token against sub-district / district / province / postcode, ranks the hits and drops the
// dopa copy of a sub-district the title dataset already supplied.

const addr = (
  subDistrictCode: string,
  subDistrictName: string,
  districtName: string,
  provinceName: string,
  postcode: string,
): ThaiAddress => ({
  provinceCode: subDistrictCode.slice(0, 2),
  provinceName,
  districtCode: subDistrictCode.slice(0, 4),
  districtName,
  subDistrictCode,
  subDistrictName,
  postcode,
});

// Four rows chosen so a single "หนองบัว" query lands one row in each relevance tier.
const TITLE_FIXTURES: ThaiAddress[] = [
  addr('400101', 'หนองบัว', 'เมืองขอนแก่น', 'ขอนแก่น', '40000'), // tier 0 — exact
  addr('300101', 'หนองบัวศาลา', 'เมืองนครราชสีมา', 'นครราชสีมา', '30000'), // tier 1 — starts with
  addr('500101', 'บ้านหนองบัว', 'เมืองเชียงใหม่', 'เชียงใหม่', '50000'), // tier 2 — contains
  addr('390101', 'โพธิ์ชัย', 'เมืองหนองบัวลำภู', 'หนองบัวลำภู', '39000'), // tier 3 — district/province only
  addr('120501', 'บ้านใหม่ บางพัง', 'ปากเกร็ด', 'นนทบุรี', '11120'), // name with an internal space
];

// Same subDistrictCode as the title row above but a different district spelling, so a dedupe test
// can prove which of the two survived.
const DOPA_FIXTURES: ThaiAddress[] = [
  addr('400101', 'หนองบัว', 'เมือง', 'ขอนแก่น', '40000'),
  addr('400102', 'ศิลา', 'เมือง', 'ขอนแก่น', '40000'),
];

describe('useAddressStore.searchBySubDistrict', () => {
  beforeEach(() => {
    act(() => {
      // Going through the setters (rather than setState) also rebuilds the search index.
      useAddressStore.getState().setTitleAddresses(TITLE_FIXTURES);
      useAddressStore.getState().setDopaAddresses(DOPA_FIXTURES);
    });
  });

  const search = (query: string, source?: 'title' | 'dopa') =>
    useAddressStore.getState().searchBySubDistrict(query, source);

  // ------------------------------------------
  // Scenario 1: An empty or whitespace-only query returns nothing
  // ------------------------------------------
  it('should return nothing for a blank query', () => {
    expect(search('')).toEqual([]);
    expect(search('   ')).toEqual([]);
  });

  // ------------------------------------------
  // Scenario 2: A single token matches beyond the sub-district name
  // ------------------------------------------
  it('should match on district, province and postcode, not just sub-district', () => {
    expect(search('เชียงใหม่', 'title').map(a => a.subDistrictCode)).toEqual(['500101']);
    expect(search('ปากเกร็ด', 'title').map(a => a.subDistrictCode)).toEqual(['120501']);
    expect(search('30000', 'title').map(a => a.subDistrictCode)).toEqual(['300101']);
  });

  // ------------------------------------------
  // Scenario 3: Ranking — exact, then prefix, then substring, then other-field-only
  // ------------------------------------------
  it('should rank sub-district name matches above district/province matches', () => {
    expect(search('หนองบัว', 'title').map(a => a.subDistrictCode)).toEqual([
      '400101', // exact
      '300101', // starts with
      '500101', // contains
      '390101', // matched only via district / province
    ]);
  });

  // ------------------------------------------
  // Scenario 4: Extra tokens narrow the result set (AND, not OR)
  // ------------------------------------------
  it('should require every token to match', () => {
    expect(search('หนองบัว ขอนแก่น', 'title').map(a => a.subDistrictCode)).toEqual(['400101']);
    expect(search('หนองบัว เชียงใหม่', 'title').map(a => a.subDistrictCode)).toEqual(['500101']);
    expect(search('หนองบัว ภูเก็ต', 'title')).toEqual([]);
  });

  // ------------------------------------------
  // Scenario 5: Names containing a space are found typed either way
  // ------------------------------------------
  it('should find a sub-district whose name contains a space', () => {
    expect(search('บ้านใหม่ บางพัง', 'title').map(a => a.subDistrictCode)).toEqual(['120501']);
    expect(search('บ้านใหม่บางพัง', 'title').map(a => a.subDistrictCode)).toEqual(['120501']);
  });

  // ------------------------------------------
  // Scenario 6: Searching both datasets keeps the title row, drops the dopa duplicate
  // ------------------------------------------
  it('should dedupe by sub-district code with title winning', () => {
    const results = search('หนองบัว');
    const duplicates = results.filter(a => a.subDistrictCode === '400101');

    expect(duplicates).toHaveLength(1);
    // The title fixture spells the district "เมืองขอนแก่น"; the dopa one says just "เมือง".
    expect(duplicates[0].districtName).toBe('เมืองขอนแก่น');
  });

  // ------------------------------------------
  // Scenario 7: An explicit source never leaks rows from the other dataset
  // ------------------------------------------
  it('should honour the source filter', () => {
    expect(search('ศิลา', 'title')).toEqual([]);
    expect(search('ศิลา', 'dopa').map(a => a.subDistrictCode)).toEqual(['400102']);
    expect(search('ศิลา').map(a => a.subDistrictCode)).toEqual(['400102']);
  });
});
