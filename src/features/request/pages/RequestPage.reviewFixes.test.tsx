import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useLocation, Route, Routes } from 'react-router-dom';
import { http, HttpResponse } from 'msw';
import { act } from '@testing-library/react';
import { useUploadProgressStore } from '@/shared/api/uploadProgress';
import { createTestQueryClient, render, screen, waitFor, within } from '@/test/test-utils';
import { server } from '@/test/mocks/server';
import { mockRequestPageApi } from '@/test/mocks/requestPage';
import { PageReadOnlyContext } from '@/shared/contexts/PageReadOnlyContext';
import { REQUEST_DOCUMENT_UPLOADS } from '../types/document';
import RequestPage from './RequestPage';

vi.mock('@/shared/components/UnsavedChangesDialog', () => ({ default: () => null }));

mockRequestPageApi();

const request = (over: Record<string, unknown> = {}) => ({
  id: 'r-1',
  requestNumber: 'REQ-1',
  status: 'Draft',
  requestedAt: null,
  purpose: '03',
  customers: [],
  properties: [],
  titles: [],
  documents: [],
  ...over,
});

let rev = 0;
const serveRequest = (body: object) =>
  server.use(
    // `rev` changes on every read, so a refetch is new data (react-query keeps the old object when
    // the response is equal) and the page resets the form to it
    http.get('*/api/requests/r-1', () => HttpResponse.json({ ...body, rev: (rev += 1) })),
    // the prior appraisal a draft follows is read for its files
    http.get('*/api/appraisals/prev-1', () =>
      HttpResponse.json({ id: 'prev-1', appraisalNumber: '69000002', documents: [] }),
    ),
    http.get('*/api/document-checklist', () =>
      HttpResponse.json({ applicationDocuments: [], propertyTypeGroups: [] }),
    ),
  );

const renderEdit = (extraRoutes?: React.ReactNode, queryClient = createTestQueryClient()) =>
  render(
    <Routes>
      <Route path="/requests/:requestId" element={<RequestPage />} />
      {extraRoutes}
    </Routes>,
    { initialEntries: ['/requests/r-1'], queryClient },
  );

describe('RequestPage: saving while a file uploads', () => {
  beforeEach(() => useUploadProgressStore.setState({ batches: [] }));

  it('disables the three save buttons, with a reason, until the upload is done; the chip stays usable', async () => {
    render(<RequestPage />, { initialEntries: ['/requests/new'] });
    const draft = await screen.findByRole('button', { name: 'Save draft' });
    expect(draft).toBeEnabled();

    let end = () => {};
    act(() => {
      end = useUploadProgressStore.getState().beginBatch(REQUEST_DOCUMENT_UPLOADS);
    });
    await waitFor(() => expect(draft).toBeDisabled());
    expect(draft).toHaveAttribute('title', 'Wait for the file uploads to finish first');
    expect(screen.getByRole('button', { name: 'Save' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Submit' })).toBeDisabled();
    expect(screen.getByRole('button', { name: /^\d+ missing$/ })).toBeEnabled();

    act(() => end());
    await waitFor(() => expect(draft).toBeEnabled());
  });
});

describe('RequestPage: the inspection round', () => {
  const rounds = () => {
    const calls = { n: 0 };
    server.use(
      http.get('*/api/appraisals/:id/next-inspection-number', () => {
        calls.n++;
        return HttpResponse.json({ nextInspectionNumber: 4 });
      }),
    );
    return calls;
  };
  const withPrior = (over: Record<string, unknown>) =>
    request({
      purpose: '06',
      detail: { prevAppraisalId: 'prev-1', prevAppraisalNumber: '69000002' },
      ...over,
    });

  it('is asked for and shown on a draft', async () => {
    const calls = rounds();
    serveRequest(withPrior({}));
    renderEdit();
    expect(
      await screen.findByText(/Inspection round 4/, {}, { timeout: 4000 }),
    ).toBeInTheDocument();
    expect(calls.n).toBe(1);
  });

  it('is still shown after a save refetches the request and resets the form', async () => {
    rounds();
    serveRequest(withPrior({}));
    const queryClient = createTestQueryClient();
    renderEdit(undefined, queryClient);
    expect(
      await screen.findByText(/Inspection round 4/, {}, { timeout: 4000 }),
    ).toBeInTheDocument();

    // what a save does: the request is read again and the form is reset to it
    await act(() => queryClient.invalidateQueries({ queryKey: ['request', 'r-1'] }));
    await new Promise(resolve => setTimeout(resolve, 600));
    expect(screen.getByText(/Inspection round 4/)).toBeInTheDocument();
  });

  it('is still asked for and shown on a read-only draft: only a submitted request is settled', async () => {
    const calls = rounds();
    serveRequest(withPrior({}));
    render(
      <PageReadOnlyContext.Provider value>
        <Routes>
          <Route path="/requests/:requestId" element={<RequestPage />} />
        </Routes>
      </PageReadOnlyContext.Provider>,
      { initialEntries: ['/requests/r-1'] },
    );

    expect(
      await screen.findByText(/Inspection round 4/, {}, { timeout: 4000 }),
    ).toBeInTheDocument();
    expect(calls.n).toBe(1);
  });

  describe('once the request is submitted', () => {
    const submitted = (over: Record<string, unknown>) =>
      withPrior({ status: 'Submitted', requestedAt: '2026-10-01T00:00:00+07:00', ...over });
    // The chain as the API reads it for a request that is itself the chain's open inspection
    // request: blocked by its own self, and with a newer appraisal named
    const serveChain = (selected: { status: string; progressPct: number | null }) =>
      server.use(
        http.get('*/api/appraisals/prev-1/construction-chain-status', () =>
          HttpResponse.json({
            appraisalId: 'prev-1',
            selected,
            construction: {
              status: selected.status,
              progressPct: selected.progressPct,
              sourceAppraisalId: 'prev-1',
              sourceAppraisalNumber: '69000002',
              sourceInspectionNumber: 3,
              sourceCompletedAt: '2026-03-14T00:00:00',
            },
            laterInspection: null,
            openInspectionRequest: { requestId: 'r-1', requestNumber: 'REQ-1' },
            latestAppraisal: {
              appraisalId: 'latest-1',
              appraisalNumber: '69120871',
              purposeCode: '03',
              completedAt: '2026-08-02T00:00:00',
              progressPct: null,
            },
            blockReason: 'OpenInspectionRequest',
          }),
        ),
      );
    const strip = () => document.querySelector('[data-field="detail.prevAppraisalReportNo"]');
    const noBlockedUi = () => {
      expect(screen.queryByRole('alert')).toBeNull();
      expect(screen.queryByText(/still open/)).toBeNull();
      expect(screen.queryByText(/Not the latest/)).toBeNull();
      expect(screen.queryByRole('button', { name: /Use appraisal .* instead/ })).toBeNull();
      expect(strip()?.querySelector('[role="status"]')).not.toHaveClass('border-danger');
    };

    it('shows the round stamped on its own appraisal and its own %, with nothing blocked, and never asks for the next number', async () => {
      const calls = rounds();
      serveChain({ status: 'InProgress', progressPct: 72.5 });
      serveRequest(submitted({ inspectionNumber: 4 }));
      renderEdit();
      expect(
        await screen.findByText(/Inspection round 4/, {}, { timeout: 4000 }),
      ).toBeInTheDocument();
      expect(await screen.findByText(/Construction 72\.50%/)).toBeInTheDocument();
      noBlockedUi();
      expect(calls.n).toBe(0);
    });

    it('shows no round while its appraisal does not exist yet, and still its own %', async () => {
      const calls = rounds();
      serveChain({ status: 'InProgress', progressPct: 72.5 });
      serveRequest(submitted({ inspectionNumber: null }));
      renderEdit();
      expect(
        await screen.findByText(/Construction 72\.50%/, {}, { timeout: 4000 }),
      ).toBeInTheDocument();
      expect(screen.queryByText(/Inspection round/)).toBeNull();
      noBlockedUi();
      expect(calls.n).toBe(0);
    });

    it('says the prior has no construction % when it has none', async () => {
      rounds();
      serveChain({ status: 'NoData', progressPct: null });
      serveRequest(submitted({ inspectionNumber: 4 }));
      renderEdit();
      expect(
        await screen.findByText(/No construction % on this appraisal/, {}, { timeout: 4000 }),
      ).toBeInTheDocument();
      expect(screen.queryByText(/Construction \d/)).toBeNull();
      noBlockedUi();
    });
  });
});

describe('RequestPage: duplicate', () => {
  const Probe = () => {
    const state = useLocation().state as { duplicateData?: Record<string, unknown> } | null;
    return <pre data-testid="dup">{JSON.stringify(state?.duplicateData ?? null)}</pre>;
  };

  it('copies the titles without the old ids, and no documents or comments', async () => {
    serveRequest(
      request({
        titles: [
          {
            id: '11111111-1111-4111-8111-111111111111',
            requestId: '22222222-2222-4222-8222-222222222222',
            collateralType: '01',
            titleNumber: '123',
            documents: [
              {
                id: '33333333-3333-4333-8333-333333333333',
                titleId: '11111111-1111-4111-8111-111111111111',
                fileName: 'deed.pdf',
              },
            ],
          },
        ],
        customers: [{ name: 'Somchai', contactNumber: '0812345678' }],
      }),
    );
    const { user } = renderEdit(<Route path="/requests/new" element={<Probe />} />);

    await screen.findByText('REQ-1', {}, { timeout: 4000 });
    await user.click(await screen.findByRole('button', { name: 'Copy / delete' }));
    await user.click(await screen.findByRole('menuitem', { name: /Duplicate/ }));
    const dialog = await waitFor(() => {
      const d = document.querySelector('dialog.modal-open');
      expect(d).not.toBeNull();
      return d as HTMLElement;
    });
    await user.click(within(dialog).getByText('Confirm'));

    const copy = JSON.parse((await screen.findByTestId('dup')).textContent ?? 'null');
    expect(copy.titles).toHaveLength(1);
    expect(copy.titles[0]).toMatchObject({
      collateralType: '01',
      titleNumber: '123',
      documents: [],
    });
    expect(copy.titles[0]).not.toHaveProperty('id');
    expect(copy.titles[0]).not.toHaveProperty('requestId');
    expect(copy.documents).toEqual([]);
    expect(copy.comments).toEqual([]);
    expect(copy.customers).toEqual([{ name: 'Somchai', contactNumber: '0812345678' }]);
  });
});

describe('RequestPage: purpose and prior appraisal once submitted', () => {
  const withPrior = (over: Record<string, unknown>) =>
    request({
      purpose: '03',
      detail: { prevAppraisalId: 'prev-1', prevAppraisalNumber: '69000002' },
      ...over,
    });
  const priorStrip = () => document.querySelector('[data-field="detail.prevAppraisalReportNo"]');
  const purposeButton = () =>
    document.querySelector('[data-field="purpose"] button') as HTMLButtonElement | null;

  it('locks the purpose and shows the prior with no change, clear or search', async () => {
    serveRequest(withPrior({ status: 'New', requestedAt: '2026-10-01T00:00:00+07:00' }));
    renderEdit();
    await waitFor(() => expect(priorStrip()).toHaveTextContent('69000002'), { timeout: 4000 });

    expect(purposeButton()).toBeDisabled();
    expect(screen.queryByRole('button', { name: 'Change' })).toBeNull();
    expect(
      screen.queryByRole('button', { name: 'Clear the prior appraisal reference' }),
    ).toBeNull();
    expect(screen.queryByRole('button', { name: /Search prior appraisal/ })).toBeNull();
    // the rest of a route-back request stays editable
    expect(document.querySelector('[data-field="customers.0.name"] input')).not.toBeDisabled();
  });

  it('leaves a draft as it was: purpose open, prior can be changed or cleared', async () => {
    serveRequest(withPrior({}));
    renderEdit();
    await waitFor(() => expect(priorStrip()).toHaveTextContent('69000002'), { timeout: 4000 });

    expect(purposeButton()).toBeEnabled();
    expect(screen.getByRole('button', { name: 'Change' })).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Clear the prior appraisal reference' }),
    ).toBeInTheDocument();
  });
});

describe('RequestPage: the prior appraisal is asked for only before submit', () => {
  const noPrior = (over: Record<string, unknown>) => request({ purpose: '02', ...over });
  const openMissing = async (user: ReturnType<typeof render>['user']) => {
    // the list follows the loaded form a debounce later (300 ms): wait for it, or it is the empty form's
    await new Promise(resolve => setTimeout(resolve, 700));
    await user.click(
      await screen.findByRole('button', { name: /^\d+ missing$/ }, { timeout: 4000 }),
    );
    return screen.getByRole('dialog', { name: 'Missing fields' });
  };

  it('does not count it, or block a save, on a submitted request without one', async () => {
    serveRequest(noPrior({ status: 'New', requestedAt: '2026-10-01T00:00:00+07:00' }));
    const { user } = renderEdit();
    await screen.findByText('REQ-1', {}, { timeout: 4000 });
    const popover = await openMissing(user);
    expect(popover).not.toHaveTextContent('Previous Appraisal Report No');
    // the rest of what is missing is still listed
    expect(popover).toHaveTextContent('House No');
  });

  it('still counts it on a draft', async () => {
    serveRequest(noPrior({}));
    const { user } = renderEdit();
    await screen.findByText('REQ-1', {}, { timeout: 4000 });
    expect(await openMissing(user)).toHaveTextContent('Previous Appraisal Report No');
  });
});
