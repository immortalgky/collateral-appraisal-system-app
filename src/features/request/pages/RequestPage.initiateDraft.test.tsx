import { beforeEach, describe, expect, it, vi } from 'vitest';
import { act } from '@testing-library/react';
import type { UseFormReturn } from 'react-hook-form';
import { Route, Routes } from 'react-router-dom';
import { http, HttpResponse } from 'msw';
import { useParameterStore } from '@/shared/store';
import userEvent from '@testing-library/user-event';
import { QueryClient } from '@tanstack/react-query';
import { collateralMasterKeys } from '@/features/collateralMaster/api/keys';
import { lookupParamsOf } from '../components/titles/usePriorAppraisalCheck';
import { render, screen } from '@/test/test-utils';
import { server } from '@/test/mocks/server';
import { mockRequestPageApi } from '@/test/mocks/requestPage';
import RequestPage from './RequestPage';

vi.mock('@/shared/components/UnsavedChangesDialog', () => ({ default: () => null }));

// The page's form, to fire a purpose change the way a field does
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let form: UseFormReturn<any>;
// What the page handed useForm on its first render, before any effect has run
let firstDefaults: unknown;
vi.mock('react-hook-form', async importOriginal => {
  const actual = await importOriginal<typeof import('react-hook-form')>();
  return {
    ...actual,
    useForm: ((...args: Parameters<typeof actual.useForm>) => {
      firstDefaults ??= args[0]?.defaultValues;
      return (form = actual.useForm(...args));
    }) as typeof actual.useForm,
  };
});

mockRequestPageApi();

// A file as the request holds it once carried from the previous appraisal
const carriedDoc = {
  id: null,
  documentId: 'd-1',
  documentType: 'D005',
  fileName: 'aerial.pdf',
  source: 'PREV',
  isRequired: false,
  displayName: null,
  uploadedAt: '2026-01-01T00:00:00',
};

const draft = (extra: object) => ({
  id: 'r-1',
  requestNumber: 'REQ-1',
  status: 'Draft',
  requestedAt: null,
  purpose: '03',
  detail: { prevAppraisalId: 'prev-1', prevAppraisalNumber: '69000002' },
  customers: [{ name: 'Somchai', contactNumber: '' }],
  properties: [],
  titles: [],
  documents: [],
  ...extra,
});

const renderDraft = async (extra: object, priorNumber = '69000002', queryClient?: QueryClient) => {
  useParameterStore.getState().setParameters([
    {
      parId: 3,
      group: 'AppraisalPurpose',
      country: 'TH',
      language: 'en',
      code: '03',
      description: 'Purpose Three',
      isActive: true,
      seqNo: 3,
    },
  ]);
  server.use(
    http.get('*/api/requests/r-1', () => HttpResponse.json(draft(extra))),
    http.get('*/api/appraisals/prev-1', () =>
      HttpResponse.json({ id: 'prev-1', appraisalNumber: '69000002', documents: [] }),
    ),
  );
  render(
    <Routes>
      <Route path="/requests/:requestId" element={<RequestPage />} />
    </Routes>,
    { initialEntries: ['/requests/r-1'], queryClient },
  );
  expect(await screen.findAllByText(priorNumber, {}, { timeout: 4000 })).not.toHaveLength(0);
  return screen.getByRole('button', { name: /Purpose Three/ });
};

describe('RequestPage: a draft created by Initiate', () => {
  beforeEach(() => {
    firstDefaults = undefined;
  });

  it('is locked from the first render when the request is already in the cache', async () => {
    const client = new QueryClient();
    client.setQueryData(['request', 'r-1'], draft({ isPeriodicalReappraisal: true }));
    await renderDraft({ isPeriodicalReappraisal: true }, '69000002', client);
    expect(firstDefaults).toMatchObject({ meta: { priorLocked: true } });
  });

  it('is not locked on the first render for an ordinary cached draft', async () => {
    const client = new QueryClient();
    client.setQueryData(['request', 'r-1'], draft({}));
    await renderDraft({}, '69000002', client);
    expect(firstDefaults).toMatchObject({ meta: { priorLocked: false } });
  });

  it('locks the purpose and the prior appraisal when the request says so', async () => {
    const purpose = await renderDraft({ isPeriodicalReappraisal: true });
    expect(purpose).toBeDisabled();
    expect(form.getValues('meta.priorLocked')).toBe(true);
    expect(screen.queryByRole('button', { name: 'Change' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Clear/ })).not.toBeInTheDocument();
  });

  it('stays editable when the field is absent (an older backend)', async () => {
    const purpose = await renderDraft({});
    expect(purpose).toBeEnabled();
    expect(form.getValues('meta.priorLocked')).toBe(false);
    expect(screen.getByRole('button', { name: 'Change' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Clear/ })).toBeInTheDocument();
  });

  // The page clears the prior from a microtask queued by the purpose subscriber: flushing them inside
  // act leaves nothing pending, so a prior that is still there was kept, not cleared yet.
  const changePurposeAndSettle = () =>
    act(async () => {
      void form
        .register('purpose')
        .onChange({ target: { name: 'purpose', value: '02' }, type: 'change' });
    });
  const purposeChangeDialog = () => document.querySelector('dialog.modal-open');

  it('keeps the prior when a purpose change gets through', async () => {
    await renderDraft({ isPeriodicalReappraisal: true });
    await changePurposeAndSettle();
    expect(form.getValues('detail.prevAppraisalId')).toBe('prev-1');
    expect(screen.getAllByText('69000002')).not.toHaveLength(0);
  });

  it('clears the prior on the same change for an ordinary draft', async () => {
    await renderDraft({});
    await changePurposeAndSettle();
    expect(form.getValues('detail.prevAppraisalId')).toBeFalsy();
  });

  it('asks about the files carried from the prior on an ordinary draft', async () => {
    await renderDraft({ documents: [carriedDoc] });
    await changePurposeAndSettle();
    await vi.waitFor(() => expect(purposeChangeDialog()).not.toBeNull());
  });

  it('neither asks nor clears on an Initiate draft that has carried files', async () => {
    await renderDraft({ isPeriodicalReappraisal: true, documents: [carriedDoc] });
    await changePurposeAndSettle();
    expect(purposeChangeDialog()).toBeNull();
    expect(form.getValues('detail.prevAppraisalId')).toBe('prev-1');
  });

  describe('the title cards', () => {
    const land = {
      collateralType: '01',
      titleNumber: '1111',
      titleAddress: { province: '10', district: '1001', subDistrict: '100101' },
    };
    const masterAnswer = {
      id: 'm',
      collateralType: 'L',
      createdAt: '2026-01-01T00:00:00',
      engagementCount: 1,
      priorAppraisalCompanyIds: [],
      landDetail: {
        lastAppraisalId: 'a1',
        lastAppraisalNumber: '69000180',
        lastAppraisedDate: '2026-03-15T00:00:00',
      },
    };

    it('shows the in-progress card but never the pick-a-prior card, whatever the cache holds', async () => {
      let lookups = 0;
      server.use(
        http.get('*/api/collateral-masters/lookup', () => {
          lookups += 1;
          return HttpResponse.json(masterAnswer);
        }),
        http.get('*/api/appraisals/in-progress-by-collateral', () =>
          HttpResponse.json([
            { appraisalId: 'o1', appraisalNumber: '69000777', status: 'UnderReview' },
          ]),
        ),
      );
      const client = new QueryClient();
      await renderDraft({ isPeriodicalReappraisal: true, titles: [land] }, '69000002', client);
      // What an earlier visit would have left in the cache for this title
      act(() => {
        client.setQueryData(
          collateralMasterKeys.lookup(lookupParamsOf(form.getValues('titles.0'))!),
          masterAnswer,
        );
      });

      expect(await screen.findByText(/being appraised in another report/)).toBeInTheDocument();
      expect(screen.queryByText(/have been appraised before/)).not.toBeInTheDocument();
      expect(lookups).toBe(0);
    });
  });

  describe('saving', () => {
    // The body the draft save sends back
    const saveDraft = async (extra: object, priorNumber?: string) => {
      let body: Record<string, any> | null = null; // eslint-disable-line @typescript-eslint/no-explicit-any
      server.use(
        http.put('*/api/requests/r-1/draft', async ({ request }) => {
          body = (await request.json()) as typeof body;
          return HttpResponse.json({ isSuccess: true });
        }),
      );
      await renderDraft(extra, priorNumber);
      await userEvent.click(screen.getByRole('button', { name: 'Save draft' }));
      await vi.waitFor(() => expect(body).not.toBeNull());
      return body!;
    };

    it('sends the stored purpose and prior back unchanged', async () => {
      const body = await saveDraft({
        isPeriodicalReappraisal: true,
        detail: {
          prevAppraisalId: 'prev-1',
          prevAppraisalNumber: '69000002',
          prevAppraisalValue: 1_500_000,
          prevAppraisalDate: '2026-03-14T00:00:00',
        },
      });
      expect(body.purpose).toBe('03');
      expect(body.detail).toMatchObject({
        prevAppraisalId: 'prev-1',
        prevAppraisalReportNo: '69000002',
        prevAppraisalValue: 1_500_000,
        prevAppraisalDate: '2026-03-14T00:00:00',
      });
    });

    it('shows a legacy AS400 book as its number alone, and saves its number, value and date', async () => {
      const body = await saveDraft(
        {
          isPeriodicalReappraisal: true,
          detail: {
            prevAppraisalId: null,
            prevAppraisalNumber: '99A1234',
            prevAppraisalValue: 2_000_000,
            prevAppraisalDate: '2025-01-31T00:00:00',
          },
        },
        '99A1234',
      );
      expect(screen.queryByRole('link', { name: '99A1234' })).not.toBeInTheDocument();
      expect(screen.queryByRole('button', { name: 'Change' })).not.toBeInTheDocument();
      expect(screen.queryByRole('button', { name: /Clear/ })).not.toBeInTheDocument();
      expect(
        screen.queryByRole('button', { name: /Search prior appraisal/ }),
      ).not.toBeInTheDocument();
      expect(body.purpose).toBe('03');
      expect(body.detail).toMatchObject({
        prevAppraisalId: null,
        prevAppraisalReportNo: '99A1234',
        prevAppraisalValue: 2_000_000,
        prevAppraisalDate: '2025-01-31T00:00:00',
      });
    });
  });
});
