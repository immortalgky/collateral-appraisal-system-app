/**
 * ============================================
 * TOPIC 9: API HOOKS WITH MSW
 * ============================================
 *
 * This file demonstrates how to test React Query hooks with MSW.
 *
 * Key concepts:
 * - MSW intercepts network requests
 * - Testing loading, success, and error states
 * - Using renderHook with QueryClientProvider
 * - Overriding handlers for specific tests
 *
 * ⚠️ NOTE: The current useUploadDocument and useDownloadDocument hooks
 * use internal mock implementations (with setTimeout delays) and don't
 * make real API calls. This file shows:
 * 1. How to test the current mock implementation
 * 2. Example patterns for testing real API calls with MSW (commented)
 */
import { describe, it, expect } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { http, HttpResponse } from 'msw';
import { server } from '@/test/mocks/server';
import { useUploadDocumentLegacy, useDownloadDocument, useCreateRequest } from './api';

// Create a wrapper with QueryClientProvider
function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false, // Don't retry in tests
        gcTime: 0, // Disable cache
      },
      mutations: {
        retry: false,
      },
    },
  });

  return function Wrapper({ children }: { children: ReactNode }) {
    return (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );
  };
}

// Helper to create a mock File
function createMockFile(name: string, size: number, type: string): File {
  const content = new Array(size).fill('a').join('');
  return new File([content], name, { type });
}

// Helper to create a mock FileList
function createMockFileList(files: File[]): FileList {
  const dataTransfer = new DataTransfer();
  files.forEach((file) => dataTransfer.items.add(file));
  return dataTransfer.files;
}

// Timeout value that accounts for internal mock delays (1000ms upload, 500ms download)
const MOCK_TIMEOUT = 3000;

describe('useUploadDocumentLegacy', () => {
  // ============================================
  // Success Tests
  // ============================================
  describe('successful upload', () => {
    // ------------------------------------------
    // Scenario 1: Upload single file
    // ------------------------------------------
    it('should upload a single file successfully', async () => {
      const { result } = renderHook(() => useUploadDocumentLegacy(), {
        wrapper: createWrapper(),
      });

      // Create mock file
      const file = createMockFile('document.pdf', 1024, 'application/pdf');
      const fileList = createMockFileList([file]);

      // Trigger mutation
      result.current.mutate(fileList);

      // Wait for success (with extended timeout for mock delay)
      await waitFor(
        () => {
          expect(result.current.isSuccess).toBe(true);
        },
        { timeout: MOCK_TIMEOUT }
      );

      // Check returned data
      expect(result.current.data).toHaveLength(1);
      expect(result.current.data![0].fileName).toBe('document.pdf');
      expect(result.current.data![0]).toHaveProperty('documentId');
      expect(result.current.data![0]).toHaveProperty('filePath');
      expect(result.current.data![0]).toHaveProperty('uploadDate');
    });

    // ------------------------------------------
    // Scenario 2: Upload multiple files
    // ------------------------------------------
    it('should upload multiple files successfully', async () => {
      const { result } = renderHook(() => useUploadDocumentLegacy(), {
        wrapper: createWrapper(),
      });

      // Create multiple mock files
      const files = [
        createMockFile('doc1.pdf', 1024, 'application/pdf'),
        createMockFile('doc2.pdf', 2048, 'application/pdf'),
        createMockFile('image.jpg', 512, 'image/jpeg'),
      ];
      const fileList = createMockFileList(files);

      // Trigger mutation
      result.current.mutate(fileList);

      // Wait for success
      await waitFor(
        () => {
          expect(result.current.isSuccess).toBe(true);
        },
        { timeout: MOCK_TIMEOUT }
      );

      // Should return data for all files
      expect(result.current.data).toHaveLength(3);
      expect(result.current.data![0].fileName).toBe('doc1.pdf');
      expect(result.current.data![1].fileName).toBe('doc2.pdf');
      expect(result.current.data![2].fileName).toBe('image.jpg');
    });
  });

  // ============================================
  // Loading State Tests
  // ============================================
  describe('loading state', () => {
    // ------------------------------------------
    // Scenario 3: Shows loading during upload
    // ------------------------------------------
    it('should show loading state during upload', async () => {
      const { result } = renderHook(() => useUploadDocumentLegacy(), {
        wrapper: createWrapper(),
      });

      const file = createMockFile('test.pdf', 1024, 'application/pdf');
      const fileList = createMockFileList([file]);

      // Before mutation
      expect(result.current.isPending).toBe(false);

      // Trigger mutation
      result.current.mutate(fileList);

      // Should be pending immediately after mutate
      await waitFor(() => {
        expect(result.current.isPending).toBe(true);
      });

      // Wait for completion
      await waitFor(
        () => {
          expect(result.current.isSuccess).toBe(true);
        },
        { timeout: MOCK_TIMEOUT }
      );
    });
  });

  // ============================================
  // Idle State Tests
  // ============================================
  describe('idle state', () => {
    // ------------------------------------------
    // Scenario 4: Initial state is idle
    // ------------------------------------------
    it('should be idle before mutation', () => {
      const { result } = renderHook(() => useUploadDocumentLegacy(), {
        wrapper: createWrapper(),
      });

      expect(result.current.isIdle).toBe(true);
      expect(result.current.isPending).toBe(false);
      expect(result.current.isSuccess).toBe(false);
      expect(result.current.isError).toBe(false);
      expect(result.current.data).toBeUndefined();
    });
  });
});

describe('useDownloadDocument', () => {
  // ============================================
  // Success Tests
  // ============================================
  describe('successful download', () => {
    // ------------------------------------------
    // Scenario 5: Download document returns blob
    // ------------------------------------------
    it('should download document and return blob', async () => {
      const { result } = renderHook(() => useDownloadDocument(), {
        wrapper: createWrapper(),
      });

      // Trigger download
      result.current.mutate('doc-123');

      // Wait for success
      await waitFor(
        () => {
          expect(result.current.isSuccess).toBe(true);
        },
        { timeout: MOCK_TIMEOUT }
      );

      // Should return a Blob
      expect(result.current.data).toBeInstanceOf(Blob);
    });

    // ------------------------------------------
    // Scenario 6: Download shows pending state
    // ------------------------------------------
    it('should show pending state during download', async () => {
      const { result } = renderHook(() => useDownloadDocument(), {
        wrapper: createWrapper(),
      });

      // Before mutation
      expect(result.current.isPending).toBe(false);

      // Trigger download
      result.current.mutate('doc-456');

      // Should be pending
      await waitFor(() => {
        expect(result.current.isPending).toBe(true);
      });

      // Wait for completion
      await waitFor(
        () => {
          expect(result.current.isSuccess).toBe(true);
        },
        { timeout: MOCK_TIMEOUT }
      );
    });
  });
});

// ============================================
// useCreateRequest - Uses Real API (with MSW)
// ============================================
describe('useCreateRequest', () => {
  // ------------------------------------------
  // Scenario 7: Successful request creation
  // ------------------------------------------
  it('should create request successfully', async () => {
    // Setup MSW handler for this test (use wildcard to match any origin)
    server.use(
      http.post('*/api/requests', () => {
        return HttpResponse.json({
          id: 1,
          appraisalNo: 'APR-001',
          status: 'pending',
        });
      })
    );

    const { result } = renderHook(() => useCreateRequest(), {
      wrapper: createWrapper(),
    });

    // Trigger mutation with minimal data
    result.current.mutate({} as any);

    // Wait for success
    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });
  });

  // ------------------------------------------
  // Scenario 8: Handle 400 Bad Request
  // ------------------------------------------
  it('should handle 400 Bad Request error', async () => {
    server.use(
      http.post('*/api/requests', () => {
        return HttpResponse.json(
          { message: 'Invalid request data' },
          { status: 400 }
        );
      })
    );

    const { result } = renderHook(() => useCreateRequest(), {
      wrapper: createWrapper(),
    });

    result.current.mutate({} as any);

    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });
  });

  // ------------------------------------------
  // Scenario 9: Handle 401 Unauthorized
  // ------------------------------------------
  it('should handle 401 Unauthorized error', async () => {
    server.use(
      http.post('*/api/requests', () => {
        return HttpResponse.json({ message: 'Unauthorized' }, { status: 401 });
      })
    );

    const { result } = renderHook(() => useCreateRequest(), {
      wrapper: createWrapper(),
    });

    result.current.mutate({} as any);

    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });
  });

  // ------------------------------------------
  // Scenario 10: Handle 500 Server Error
  // ------------------------------------------
  it('should handle 500 Internal Server Error', async () => {
    server.use(
      http.post('*/api/requests', () => {
        return HttpResponse.json(
          { message: 'Internal Server Error' },
          { status: 500 }
        );
      })
    );

    const { result } = renderHook(() => useCreateRequest(), {
      wrapper: createWrapper(),
    });

    result.current.mutate({} as any);

    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });
  });

  // ------------------------------------------
  // Scenario 11: Handle network error
  // ------------------------------------------
  it('should handle network error', async () => {
    server.use(
      http.post('*/api/requests', () => {
        return HttpResponse.error();
      })
    );

    const { result } = renderHook(() => useCreateRequest(), {
      wrapper: createWrapper(),
    });

    result.current.mutate({} as any);

    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });
  });
});

// ============================================
// Example: Testing Query Hooks (GET requests)
// ============================================
describe('Query Hook Example', () => {
  // This demonstrates how to test a useQuery hook
  // Even though the actual code doesn't have one, this is for reference

  // Note: This test is disabled because useGetRequests doesn't exist
  // It's here as an example of how you would test it
  it.skip('example: should fetch requests successfully', async () => {
    // Mock a simple query hook inline
    const useGetRequests = () => {
      const { useQuery } = require('@tanstack/react-query');
      const axios = require('@shared/api/axiosInstance').default;

      return useQuery({
        queryKey: ['requests'],
        queryFn: async () => {
          const { data } = await axios.get('/requests');
          return data;
        },
      });
    };

    // Add handler for GET /requests (use wildcard to match any origin)
    server.use(
      http.get('*/api/requests', () => {
        return HttpResponse.json({
          data: [
            { id: 1, appraisalNo: 'APR-001' },
            { id: 2, appraisalNo: 'APR-002' },
          ],
          total: 2,
        });
      })
    );

    const { result } = renderHook(() => useGetRequests(), {
      wrapper: createWrapper(),
    });

    // Initially loading
    expect(result.current.isLoading).toBe(true);

    // Wait for data
    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    // Check data
    expect(result.current.data.data).toHaveLength(2);
    expect(result.current.data.total).toBe(2);
  });
});

/**
 * ============================================
 * REFERENCE: Testing Hooks with Real API
 * ============================================
 *
 * When useUploadDocument is updated to use real API:
 *
 * 1. Add MSW handler in handlers.ts:
 *    ```ts
 *    http.post('/api/documents/upload', async ({ request }) => {
 *      const formData = await request.formData();
 *      const files = formData.getAll('Files');
 *      return HttpResponse.json(
 *        files.map((file, i) => ({
 *          documentId: `doc-${i}`,
 *          fileName: (file as File).name,
 *          filePath: `/uploads/${(file as File).name}`,
 *          uploadDate: new Date().toISOString(),
 *        }))
 *      );
 *    })
 *    ```
 *
 * 2. Override for error tests:
 *    ```ts
 *    server.use(
 *      http.post('/api/documents/upload', () => {
 *        return HttpResponse.json({ error: 'Bad Request' }, { status: 400 });
 *      })
 *    );
 *    ```
 *
 * 3. Test error state:
 *    ```ts
 *    await waitFor(() => {
 *      expect(result.current.isError).toBe(true);
 *      expect(result.current.error.response.status).toBe(400);
 *    });
 *    ```
 */
