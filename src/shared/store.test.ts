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
  showLoading,
  hideLoading,
} from './store';

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
    expect(parameters['collateral.TH.en']).toHaveLength(2);
    expect(parameters['collateral.TH.en'][0].code).toBe('01');
    expect(parameters['collateral.TH.en'][1].code).toBe('02');
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
    expect(parameters['collateral.TH.en']).toHaveLength(1);
    expect(parameters['status.TH.en']).toHaveLength(1);
    expect(parameters['collateral.TH.th']).toHaveLength(1);
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
