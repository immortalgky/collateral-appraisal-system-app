import type { ReactNode } from 'react';
import { describe, expect, it } from 'vitest';
import { QueryClientProvider } from '@tanstack/react-query';
import { http, HttpResponse } from 'msw';
import { act, renderHook } from '@testing-library/react';
import { server } from '@/test/mocks/server';
import { createTestQueryClient } from '@/test/test-utils';
import { useWinnerFeeDrafts } from './useWinnerFeeDrafts';

function renderDrafts() {
  const client = createTestQueryClient();
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );
  return renderHook(() => useWinnerFeeDrafts(), { wrapper });
}

/** Fake PATCH endpoint: answers 500 for the appraisal ids in `failFor`, 204 for the rest. */
function mockUpdateFee(failFor: string[] = []) {
  const calls: string[] = [];
  server.use(
    http.patch('*/appraisals/:appraisalId/fees/:feeId', ({ params }) => {
      const appraisalId = String(params.appraisalId);
      calls.push(appraisalId);
      return failFor.includes(appraisalId)
        ? HttpResponse.json({ detail: 'boom' }, { status: 500 })
        : new HttpResponse(null, { status: 204 });
    }),
  );
  return calls;
}

const draft = (feeId: string) => ({ feeId, feePaymentType: '04', bankAbsorbAmount: 500 });

describe('useWinnerFeeDrafts', () => {
  it('saves every draft and clears them when all succeed', async () => {
    const calls = mockUpdateFee();
    const { result } = renderDrafts();

    act(() => {
      result.current.setDraft('ap-1', draft('fee-1'), undefined);
      result.current.setDraft('ap-2', draft('fee-2'), undefined);
    });

    let ok: boolean | undefined;
    await act(async () => {
      ok = await result.current.saveAll();
    });

    expect(ok).toBe(true);
    expect(calls.sort()).toEqual(['ap-1', 'ap-2']);
    expect(result.current.drafts).toEqual({});
    expect(result.current.isSaving).toBe(false);
  });

  it('keeps only the failed draft when one update fails', async () => {
    mockUpdateFee(['ap-2']);
    const { result } = renderDrafts();

    act(() => {
      result.current.setDraft('ap-1', draft('fee-1'), undefined);
      result.current.setDraft('ap-2', draft('fee-2'), undefined);
    });

    let ok: boolean | undefined;
    await act(async () => {
      ok = await result.current.saveAll();
    });

    expect(ok).toBe(false);
    expect(Object.keys(result.current.drafts)).toEqual(['ap-2']);
    expect(result.current.isSaving).toBe(false);
  });

  it('does not call the API when there is nothing to save', async () => {
    const calls = mockUpdateFee();
    const { result } = renderDrafts();

    let ok: boolean | undefined;
    await act(async () => {
      ok = await result.current.saveAll();
    });

    expect(ok).toBe(true);
    expect(calls).toEqual([]);
  });
});

describe('useWinnerFeeDrafts.setDraft', () => {
  const saved = (feePaymentType: string, bankAbsorbAmount: number | null) => ({
    feePaymentType,
    bankAbsorbAmount,
  });
  const edit = (feePaymentType: string, bankAbsorbAmount: number | null) => ({
    feeId: 'fee-1',
    feePaymentType,
    bankAbsorbAmount,
  });

  it('keeps a draft when the fee payment type changes', () => {
    const { result } = renderDrafts();

    act(() => result.current.setDraft('ap-1', edit('04', 0), saved('01', 0)));

    expect(result.current.drafts).toEqual({ 'ap-1': edit('04', 0) });
  });

  it('keeps a draft when a bank absorb amount changes', () => {
    const { result } = renderDrafts();

    act(() => result.current.setDraft('ap-1', edit('04', 800), saved('04', 500)));

    expect(result.current.drafts).toEqual({ 'ap-1': edit('04', 800) });
  });

  it('does not keep a draft when a bank absorb amount is left as saved', () => {
    const { result } = renderDrafts();

    act(() => result.current.setDraft('ap-1', edit('04', 500), saved('04', 500)));

    expect(result.current.drafts).toEqual({});
  });

  it('does not keep a draft when a type without an absorb amount is picked again', () => {
    const { result } = renderDrafts();

    act(() => result.current.setDraft('ap-1', edit('01', 0), saved('01', 0)));

    expect(result.current.drafts).toEqual({});
  });

  it('drops the draft when an edit puts the saved value back', () => {
    const { result } = renderDrafts();

    act(() => result.current.setDraft('ap-1', edit('04', 800), saved('04', 500)));
    act(() => result.current.setDraft('ap-1', edit('04', 500), saved('04', 500)));

    expect(result.current.drafts).toEqual({});
  });

  it('only drops the draft of the appraisal that was put back', () => {
    const { result } = renderDrafts();

    act(() => {
      result.current.setDraft('ap-1', edit('04', 800), saved('04', 500));
      result.current.setDraft('ap-2', edit('04', 800), saved('04', 500));
    });
    act(() => result.current.setDraft('ap-1', edit('04', 500), saved('04', 500)));

    expect(Object.keys(result.current.drafts)).toEqual(['ap-2']);
  });

  it('sends only the changed appraisals on save', async () => {
    const calls = mockUpdateFee();
    const { result } = renderDrafts();

    act(() => {
      result.current.setDraft('ap-1', edit('04', 800), saved('04', 500));
      result.current.setDraft('ap-2', edit('01', 0), saved('01', 0));
    });
    await act(async () => {
      await result.current.saveAll();
    });

    expect(calls).toEqual(['ap-1']);
  });
});
