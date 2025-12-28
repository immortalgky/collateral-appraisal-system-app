/**
 * Global test setup file
 * This file runs before each test file
 */
import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterEach, beforeAll, afterAll, vi } from 'vitest';
import { server } from './mocks/server';

// ============================================
// Mock: window.matchMedia
// Used by responsive components
// ============================================
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(), // deprecated
    removeListener: vi.fn(), // deprecated
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});

// ============================================
// Mock: localStorage
// Used by Zustand persist middleware
// ============================================
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: vi.fn((key: string) => store[key] ?? null),
    setItem: vi.fn((key: string, value: string) => {
      store[key] = value;
    }),
    removeItem: vi.fn((key: string) => {
      delete store[key];
    }),
    clear: vi.fn(() => {
      store = {};
    }),
    get length() {
      return Object.keys(store).length;
    },
    key: vi.fn((index: number) => Object.keys(store)[index] ?? null),
  };
})();
Object.defineProperty(window, 'localStorage', { value: localStorageMock });

// ============================================
// Mock: ResizeObserver
// Used by some UI components
// ============================================
class ResizeObserverMock {
  observe = vi.fn();
  unobserve = vi.fn();
  disconnect = vi.fn();
}
global.ResizeObserver = ResizeObserverMock as unknown as typeof ResizeObserver;

// ============================================
// Mock: IntersectionObserver
// Used by lazy loading, infinite scroll
// ============================================
class IntersectionObserverMock {
  observe = vi.fn();
  unobserve = vi.fn();
  disconnect = vi.fn();
}
global.IntersectionObserver = IntersectionObserverMock as unknown as typeof IntersectionObserver;

// ============================================
// Mock: scrollTo
// Used by navigation, scroll to top
// ============================================
window.scrollTo = vi.fn();

// ============================================
// MSW Server Setup
// Mock API calls at the network level
// ============================================
beforeAll(() => {
  // Start MSW server before all tests
  server.listen({ onUnhandledRequest: 'warn' });
});

afterEach(() => {
  // Cleanup DOM after each test
  cleanup();

  // Reset MSW handlers to defaults
  server.resetHandlers();

  // Clear localStorage
  localStorageMock.clear();
});

afterAll(() => {
  // Stop MSW server after all tests
  server.close();
});
