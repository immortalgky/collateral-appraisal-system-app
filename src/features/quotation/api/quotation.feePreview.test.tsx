import type { ReactNode } from 'react';
import { describe, expect, it } from 'vitest';
import { QueryClientProvider } from '@tanstack/react-query';
import { http, HttpResponse } from 'msw';
import { act, createTestQueryClient, renderHook, waitFor } from '@/test/test-utils';
import { server } from '@/test/mocks/server';
import { feePreviewKeys, useGetFeePreview } from '@/features/appraisal/api/feePreview';
import {
  quotationKeys,
  useCancelQuotation,
  useCreateQuotation,
  useFinalizeQuotation,
  useStartQuotationFromTask,
} from './quotation';

/**
 * A quotation is priced from its winner and the fee preview is cached per appraisal, so finalizing
 * or cancelling one has to make every appraisal's preview refetch.
 */

const setup = () => {
  const client = createTestQueryClient();
  // Cached data with no observer must outlive the mutation's round trip (the test client's gcTime is 0).
  client.setDefaultOptions({ queries: { retry: false, gcTime: Infinity } });
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );
  return { client, wrapper };
};

const serve = () => {
  const requests: string[] = [];
  server.use(
    http.get('*/appraisals/:id/fee-preview', ({ params }) => {
      requests.push(String(params.id));
      return HttpResponse.json({ items: [] });
    }),
    http.post('*/quotations/:id/finalize', () => HttpResponse.json({ appraisalIds: ['A1'] })),
    http.post('*/quotations/start-from-task', () =>
      HttpResponse.json({ quotationRequestId: 'Q9' }),
    ),
    http.post('*/quotations', () => HttpResponse.json({ id: 'Q9' })),
    http.post('*/quotations/:id/cancel', () => new HttpResponse(null, { status: 204 })),
  );
  return requests;
};

describe('quotation writes refresh the fee preview', () => {
  it('refetches a mounted preview after finalize', async () => {
    const requests = serve();
    const { wrapper } = setup();
    const { result } = renderHook(
      () => ({
        preview: useGetFeePreview('A1', { assignmentType: 'external' }),
        finalize: useFinalizeQuotation('Q1'),
      }),
      { wrapper },
    );
    await waitFor(() => expect(result.current.preview.isSuccess).toBe(true));
    expect(requests).toEqual(['A1']);

    await act(() => result.current.finalize.mutateAsync({ companyQuotationId: 'CQ1' }));

    await waitFor(() => expect(requests).toEqual(['A1', 'A1']));
  });

  it('refetches a mounted preview after cancel', async () => {
    const requests = serve();
    const { wrapper } = setup();
    const { result } = renderHook(
      () => ({
        preview: useGetFeePreview('A1', {}),
        cancel: useCancelQuotation('Q1'),
      }),
      { wrapper },
    );
    await waitFor(() => expect(result.current.preview.isSuccess).toBe(true));

    await act(() => result.current.cancel.mutateAsync({ reason: 'dup' }));

    await waitFor(() => expect(requests).toEqual(['A1', 'A1']));
  });

  it('with nothing known about the quotation, marks the previews of every appraisal stale, and nothing else', async () => {
    serve();
    const { client, wrapper } = setup();
    const keys = [feePreviewKeys.detail('A1', {}), feePreviewKeys.detail('A2', {})];
    const fees = ['appraisal', 'A1', 'fees'];
    for (const key of [...keys, fees]) client.setQueryData(key, {});
    const { result } = renderHook(() => useCancelQuotation('Q1'), { wrapper });

    await act(() => result.current.mutateAsync({ reason: 'dup' }));

    for (const key of keys) expect(client.getQueryState(key)?.isInvalidated).toBe(true);
    expect(client.getQueryState(fees)?.isInvalidated).toBe(false);
  });

  const previewKeys = () => ({
    a1: feePreviewKeys.detail('A1', {}),
    a2: feePreviewKeys.detail('A2', {}),
  });
  const seed = (client: ReturnType<typeof createTestQueryClient>) => {
    const keys = previewKeys();
    for (const key of Object.values(keys)) client.setQueryData(key, {});
    return keys;
  };

  it("marks only the appraisals in the quotation's cached detail", async () => {
    serve();
    const { client, wrapper } = setup();
    const keys = seed(client);
    client.setQueryData(quotationKeys.detail('Q1'), { appraisals: [{ appraisalId: 'A1' }] });
    const { result } = renderHook(() => useCancelQuotation('Q1'), { wrapper });

    await act(() => result.current.mutateAsync({ reason: 'dup' }));

    expect(client.getQueryState(keys.a1)?.isInvalidated).toBe(true);
    expect(client.getQueryState(keys.a2)?.isInvalidated).toBe(false);
  });

  it('marks only the appraisals the finalize response names', async () => {
    serve();
    const { client, wrapper } = setup();
    const keys = seed(client);
    const { result } = renderHook(() => useFinalizeQuotation('Q1'), { wrapper });

    await act(() => result.current.mutateAsync({ companyQuotationId: 'CQ1' }));

    expect(client.getQueryState(keys.a1)?.isInvalidated).toBe(true);
    expect(client.getQueryState(keys.a2)?.isInvalidated).toBe(false);
  });

  it('marks only the appraisals a new quotation covers', async () => {
    serve();
    const { client, wrapper } = setup();
    const keys = seed(client);
    const { result } = renderHook(() => useCreateQuotation(), { wrapper });

    await act(() =>
      result.current.mutateAsync({ appraisals: [{ appraisalId: 'A2' }] } as Parameters<
        typeof result.current.mutateAsync
      >[0]),
    );

    expect(client.getQueryState(keys.a2)?.isInvalidated).toBe(true);
    expect(client.getQueryState(keys.a1)?.isInvalidated).toBe(false);
  });

  it('a new quotation with no appraisals leaves every fee preview alone', async () => {
    serve();
    const { client, wrapper } = setup();
    const keys = seed(client);
    const { result } = renderHook(() => useCreateQuotation(), { wrapper });

    await act(() =>
      result.current.mutateAsync({ appraisals: [] } as unknown as Parameters<
        typeof result.current.mutateAsync
      >[0]),
    );

    for (const key of Object.values(keys)) {
      expect(client.getQueryState(key)?.isInvalidated).toBe(false);
    }
  });

  it('start-from-task marks only the preview of the appraisal it starts for', async () => {
    serve();
    const { client, wrapper } = setup();
    const keys = seed(client);
    const { result } = renderHook(() => useStartQuotationFromTask(), { wrapper });

    await act(() =>
      result.current.mutateAsync({ appraisalId: 'A1' } as Parameters<
        typeof result.current.mutateAsync
      >[0]),
    );

    expect(client.getQueryState(keys.a1)?.isInvalidated).toBe(true);
    expect(client.getQueryState(keys.a2)?.isInvalidated).toBe(false);
  });
});
