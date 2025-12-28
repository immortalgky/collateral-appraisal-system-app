/**
 * Custom Test Utilities
 * Provides render function with all necessary providers
 */
import type { ReactElement, ReactNode } from 'react';
import {
  render,
  type RenderOptions,
  type RenderResult,
} from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter, MemoryRouter } from 'react-router-dom';
import userEvent from '@testing-library/user-event';

// ============================================
// Create Test QueryClient
// Disabled retries for predictable tests
// ============================================
function createTestQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: false, // Don't retry failed queries in tests
        gcTime: 0, // Disable garbage collection
        staleTime: 0, // Always fetch fresh data
      },
      mutations: {
        retry: false, // Don't retry failed mutations
      },
    },
  });
}

// ============================================
// Custom Render Options
// ============================================
interface WrapperOptions {
  // Provide custom QueryClient
  queryClient?: QueryClient;
  // Initial route entries for MemoryRouter
  initialEntries?: string[];
  // Use BrowserRouter instead of MemoryRouter
  useBrowserRouter?: boolean;
}

interface CustomRenderOptions
  extends Omit<RenderOptions, 'wrapper'>,
    WrapperOptions {}

// ============================================
// Custom Render Function
// Wraps component with QueryClient, Router
// ============================================
function customRender(
  ui: ReactElement,
  options: CustomRenderOptions = {}
): RenderResult & { user: ReturnType<typeof userEvent.setup> } {
  const {
    queryClient = createTestQueryClient(),
    initialEntries = ['/'],
    useBrowserRouter = false,
    ...renderOptions
  } = options;

  // Router wrapper - use MemoryRouter for isolated tests
  function RouterWrapper({ children }: { children: ReactNode }) {
    if (useBrowserRouter) {
      return <BrowserRouter>{children}</BrowserRouter>;
    }
    return (
      <MemoryRouter initialEntries={initialEntries}>{children}</MemoryRouter>
    );
  }

  // All providers wrapper
  function AllProviders({ children }: { children: ReactNode }) {
    return (
      <QueryClientProvider client={queryClient}>
        <RouterWrapper>{children}</RouterWrapper>
      </QueryClientProvider>
    );
  }

  // Setup userEvent before render
  const user = userEvent.setup();

  return {
    user,
    ...render(ui, { wrapper: AllProviders, ...renderOptions }),
  };
}

// ============================================
// Re-export everything from testing-library
// ============================================
export * from '@testing-library/react';
export { userEvent };

// Override render with custom render
export { customRender as render };

// Export helper to create QueryClient
export { createTestQueryClient };

// ============================================
// Additional Test Helpers
// ============================================

/**
 * Wait for loading state to finish
 * Useful when testing components that show loading spinners
 */
export async function waitForLoadingToFinish() {
  const { waitFor, screen } = await import('@testing-library/react');
  await waitFor(() => {
    const loaders = screen.queryAllByRole('progressbar');
    expect(loaders).toHaveLength(0);
  });
}

/**
 * Create a mock file for testing file uploads
 */
export function createMockFile(
  name: string,
  size: number,
  type: string
): File {
  const content = new Array(size).fill('a').join('');
  return new File([content], name, { type });
}

/**
 * Create a mock FileList for testing file inputs
 */
export function createMockFileList(files: File[]): FileList {
  const dataTransfer = new DataTransfer();
  files.forEach((file) => dataTransfer.items.add(file));
  return dataTransfer.files;
}
