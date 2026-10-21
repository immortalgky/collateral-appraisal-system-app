import { describe, expect, it } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import { http, HttpResponse, delay } from 'msw';
import type { ReactNode } from 'react';
import { server } from '@/test/mocks/server';
import {
  carriableDocuments,
  constructionRefusalOf,
  fetchConstructionChainStatus,
  useConstructionChainStatus,
  useNextInspectionNumber,
  type AppraisalDocument,
  type ConstructionChainStatus,
} from './priorAppraisal';

const doc = (over: Partial<AppraisalDocument>): AppraisalDocument => ({
  documentId: 'd1',
  documentType: 'D015',
  suggestedType: 'D015',
  level: 'Request',
  titleId: null,
  collateralType: null,
  titleNumber: null,
  fileName: 'a.pdf',
  filePath: null,
  prefix: null,
  set: null,
  notes: null,
  uploadedBy: null,
  uploadedByName: null,
  uploadedAt: '2026-10-01T00:00:00',
  defaultUse: true,
  ...over,
});

describe('carriableDocuments', () => {
  it('drops a file with no documentId (a tracking-only user before release), keeps the rest in order', () => {
    const out = carriableDocuments([
      doc({ documentId: 'a' }),
      doc({ documentId: null, fileName: 'hidden.pdf' }),
      doc({ documentId: 'b' }),
    ]);
    expect(out.map(d => d.documentId)).toEqual(['a', 'b']);
  });

  it('treats a missing list as empty (the include was not asked for)', () => {
    expect(carriableDocuments(undefined)).toEqual([]);
  });
});

describe('useNextInspectionNumber', () => {
  const wrapper = () => {
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const Wrapper = ({ children }: { children: ReactNode }) => (
      <QueryClientProvider client={client}>{children}</QueryClientProvider>
    );
    return Wrapper;
  };

  it('is not asked for while it is not shown (no prior, or not a construction inspection)', async () => {
    let calls = 0;
    server.use(
      http.get('*/api/appraisals/:id/next-inspection-number', () => {
        calls++;
        return HttpResponse.json({ nextInspectionNumber: 2 });
      }),
    );
    const { result, rerender } = renderHook(
      ({ id, on }: { id: string | null; on: boolean }) => useNextInspectionNumber(id, on),
      { wrapper: wrapper(), initialProps: { id: null as string | null, on: true } },
    );
    rerender({ id: 'b', on: false });
    await new Promise(resolve => setTimeout(resolve, 50));
    expect(calls).toBe(0);
    expect(result.current.data).toBeUndefined();
  });

  it('after pick B and then pick C quickly, the round is C\u2019s, however late B answers', async () => {
    server.use(
      http.get('*/api/appraisals/b/next-inspection-number', async () => {
        await delay(150);
        return HttpResponse.json({ nextInspectionNumber: 2 });
      }),
      http.get('*/api/appraisals/c/next-inspection-number', () =>
        HttpResponse.json({ nextInspectionNumber: 7 }),
      ),
    );
    const { result, rerender } = renderHook(
      ({ id }: { id: string }) => useNextInspectionNumber(id, true),
      { wrapper: wrapper(), initialProps: { id: 'b' } },
    );
    rerender({ id: 'c' });
    await waitFor(() => expect(result.current.data).toBe(7));
    await new Promise(resolve => setTimeout(resolve, 250));
    expect(result.current.data).toBe(7);
  });
});

describe('construction chain status', () => {
  const status = (id: string): ConstructionChainStatus => ({
    appraisalId: id,
    construction: {
      status: 'InProgress',
      progressPct: 72.69,
      sourceAppraisalId: id,
      sourceAppraisalNumber: '69105522',
      sourceInspectionNumber: 3,
      sourceCompletedAt: '2026-05-12T00:00:00',
    },
    laterInspection: null,
    openInspectionRequest: null,
    latestAppraisal: null,
    blockReason: null,
  });
  const wrapper = () => {
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const Wrapper = ({ children }: { children: ReactNode }) => (
      <QueryClientProvider client={client}>{children}</QueryClientProvider>
    );
    return Wrapper;
  };

  it('reads GET /appraisals/{id}/construction-chain-status', async () => {
    server.use(
      http.get('*/api/appraisals/:id/construction-chain-status', ({ params }) =>
        HttpResponse.json(status(String(params.id))),
      ),
    );
    expect(await fetchConstructionChainStatus('a-1')).toEqual(status('a-1'));
  });

  it('the hook is not asked for while it is not shown (no prior, or not a construction inspection)', async () => {
    let calls = 0;
    server.use(
      http.get('*/api/appraisals/:id/construction-chain-status', () => {
        calls++;
        return HttpResponse.json(status('b'));
      }),
    );
    const { result, rerender } = renderHook(
      ({ id, on }: { id: string | null; on: boolean }) => useConstructionChainStatus(id, on),
      { wrapper: wrapper(), initialProps: { id: null as string | null, on: true } },
    );
    rerender({ id: 'b', on: false });
    await new Promise(resolve => setTimeout(resolve, 50));
    expect(calls).toBe(0);
    expect(result.current.data).toBeUndefined();
  });

  it('after pick B and then pick C quickly, the status is C’s, however late B answers', async () => {
    server.use(
      http.get('*/api/appraisals/b/construction-chain-status', async () => {
        await delay(150);
        return HttpResponse.json(status('b'));
      }),
      http.get('*/api/appraisals/c/construction-chain-status', () =>
        HttpResponse.json(status('c')),
      ),
    );
    const { result, rerender } = renderHook(
      ({ id }: { id: string }) => useConstructionChainStatus(id, true),
      { wrapper: wrapper(), initialProps: { id: 'b' } },
    );
    rerender({ id: 'c' });
    await waitFor(() => expect(result.current.data?.appraisalId).toBe('c'));
    await new Promise(resolve => setTimeout(resolve, 250));
    expect(result.current.data?.appraisalId).toBe('c');
  });
});

describe('constructionRefusalOf', () => {
  const refusedWith = (errorCode: unknown) => ({ apiError: { errorCode, detail: 'Refused' } });

  it('reads the reason from the errorCode of the interceptor’s apiError', () => {
    for (const code of ['ConstructionComplete', 'LaterInspectionExists', 'OpenInspectionRequest']) {
      expect(constructionRefusalOf(refusedWith(code))).toBe(code);
    }
  });

  it('is null for any other error, so it keeps its usual toast', () => {
    expect(constructionRefusalOf(refusedWith('SomethingElse'))).toBeNull();
    expect(constructionRefusalOf(refusedWith(null))).toBeNull();
    expect(constructionRefusalOf({ apiError: { detail: 'No code' } })).toBeNull();
    expect(constructionRefusalOf(new Error('Network Error'))).toBeNull();
    expect(constructionRefusalOf(null)).toBeNull();
    expect(constructionRefusalOf(undefined)).toBeNull();
  });
});
