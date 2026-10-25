import type { ReactNode } from 'react';
import { describe, expect, it } from 'vitest';
import { QueryClientProvider } from '@tanstack/react-query';
import { http, HttpResponse } from 'msw';
import { act, createTestQueryClient, renderHook } from '@/test/test-utils';
import { server } from '@/test/mocks/server';
import { feePreviewKeys } from './feePreview';
import { useCreateQuotation } from './administration';

describe('useCreateQuotation refreshes the fee preview', () => {
  it('marks only the preview of the appraisal the quotation starts for (and nothing else)', async () => {
    server.use(
      http.post('*/quotations/start-from-task', () =>
        HttpResponse.json({ quotationRequestId: 'Q9' }),
      ),
    );
    const client = createTestQueryClient();
    // Cached data with no observer must outlive the mutation's round trip.
    client.setDefaultOptions({ queries: { retry: false, gcTime: Infinity } });
    const wrapper = ({ children }: { children: ReactNode }) => (
      <QueryClientProvider client={client}>{children}</QueryClientProvider>
    );
    const a1 = feePreviewKeys.detail('A1', {});
    const a2 = feePreviewKeys.detail('A2', {});
    const fees = ['appraisal', 'A1', 'fees'];
    for (const key of [a1, a2, fees]) client.setQueryData(key, {});
    const { result } = renderHook(() => useCreateQuotation(), { wrapper });

    await act(() =>
      result.current.mutateAsync({ appraisalId: 'A1' } as Parameters<
        typeof result.current.mutateAsync
      >[0]),
    );

    expect(client.getQueryState(a1)?.isInvalidated).toBe(true);
    expect(client.getQueryState(a2)?.isInvalidated).toBe(false);
    expect(client.getQueryState(fees)?.isInvalidated).toBe(false);
  });
});
