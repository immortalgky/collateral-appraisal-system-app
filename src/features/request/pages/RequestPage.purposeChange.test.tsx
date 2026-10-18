import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Route, Routes } from 'react-router-dom';
import { http, HttpResponse } from 'msw';
import toast, { Toaster } from 'react-hot-toast';
import { act } from '@testing-library/react';
import { useUploadProgressStore } from '@/shared/api/uploadProgress';
import { REQUEST_DOCUMENT_UPLOADS } from '../types/document';
import { useParameterStore } from '@/shared/store';
import { render, screen, waitFor, within } from '@/test/test-utils';
import { server } from '@/test/mocks/server';
import { mockRequestPageApi } from '@/test/mocks/requestPage';
import type { PriorAppraisal } from '@/features/appraisal/api/priorAppraisal';
import RequestPage from './RequestPage';

vi.mock('@/shared/components/UnsavedChangesDialog', () => ({ default: () => null }));

mockRequestPageApi();

// A file as the request holds it once carried from the previous appraisal
const carriedDoc = {
  id: null,
  documentId: 'd-1',
  documentType: 'D005',
  fileName: 'aerial.pdf',
  source: 'PREV',
  isRequired: false,
  // as the checklist merge leaves a row, so a re-merge after the purpose changes back is a no-op
  displayName: null,
  uploadedAt: '2026-01-01T00:00:00',
};

const template = {
  id: 'prev-1',
  appraisalNumber: '69000002',
  appraisalValue: 1000,
  appraisalDate: '2026-03-14',
  status: 'Completed',
  request: {
    prevAppraisal: null,
    detail: { hasAppraisalBook: false, loanDetail: null, address: null, contact: null },
    customers: [],
    properties: [],
    titles: [],
  },
  documents: [],
} as unknown as PriorAppraisal;

vi.mock('@/features/request/components/SearchAppraisalModal', () => ({
  default: ({ isOpen, onSelect }: { isOpen: boolean; onSelect: (t: PriorAppraisal) => void }) =>
    isOpen ? (
      <button type="button" onClick={() => onSelect(template)}>
        pick-template
      </button>
    ) : null,
}));

const parameter = (code: string, description: string) => ({
  parId: Number(code),
  group: 'AppraisalPurpose',
  country: 'TH',
  language: 'en',
  code,
  description,
  isActive: true,
  seqNo: Number(code),
});

const duplicate = (purpose: string, withPrior: boolean, documents: object[] = []) => ({
  purpose,
  channel: 'Manual',
  priority: 'Normal',
  isPma: false,
  creator: { userId: 'u', username: 'U' },
  requestor: { employeeId: 'E1' },
  detail: {
    prevAppraisalId: withPrior ? 'prev-1' : null,
    prevAppraisalReportNo: withPrior ? '69000002' : null,
    loanDetail: {},
    appointment: {},
    fee: {},
    address: {},
    contact: {},
  },
  customers: [],
  properties: [],
  titles: [],
  documents,
  comments: [],
});

const renderPage = (purpose: string, withPrior: boolean, documents: object[] = []) =>
  render(
    <>
      <Toaster />
      <RequestPage />
    </>,
    {
      initialEntries: [
        {
          pathname: '/requests/new',
          state: { duplicateData: duplicate(purpose, withPrior, documents) },
        } as never,
      ],
    },
  );

const choosePurpose = async (user: ReturnType<typeof render>['user'], from: RegExp, to: RegExp) => {
  await user.click(screen.getByRole('button', { name: from }));
  await user.click(await screen.findByRole('option', { name: to }));
};

const withPurposes = async (run: () => Promise<void>) => {
  useParameterStore
    .getState()
    .setParameters([
      parameter('02', 'Purpose Two'),
      parameter('03', 'Purpose Three'),
      parameter('07', 'Purpose Seven'),
    ]);
  server.use(
    http.get('*/api/document-checklist', () =>
      HttpResponse.json({ applicationDocuments: [], propertyTypeGroups: [] }),
    ),
    http.get('*/api/appraisals/prev-1', () =>
      HttpResponse.json({ id: 'prev-1', appraisalNumber: '69000002', documents: [] }),
    ),
  );
  try {
    await run();
  } finally {
    useParameterStore.getState().setParameters([]);
  }
};

const priorLink = () => screen.queryByRole('link', { name: '69000002' });

describe('RequestPage: changing the purpose clears the prior appraisal', () => {
  // the toast store is global: a toast from one test must not be there for the next
  beforeEach(() => toast.remove());

  it('clears it at once, with a toast, when no files came from it', async () =>
    withPurposes(async () => {
      const { user } = renderPage('03', true);
      expect(await screen.findByRole('link', { name: '69000002' })).toBeInTheDocument();

      await choosePurpose(user, /Purpose Three/, /Purpose Two/);

      await waitFor(() => expect(priorLink()).toBeNull());
      expect(
        await screen.findByText(/Purpose changed, the prior report was cleared/),
      ).toBeInTheDocument();
    }));

  it('asks first when files came from it; Cancel puts the purpose back and keeps everything', async () =>
    withPurposes(async () => {
      const { user } = renderPage('03', true, [carriedDoc]);
      expect(await screen.findByText(/aerial\.pdf/)).toBeInTheDocument();
      await choosePurpose(user, /Purpose Three/, /Purpose Two/);
      expect(
        await screen.findByText(/clears the prior report 69000002 and the 1 files/),
      ).toBeInTheDocument();

      // the page's own Cancel is behind the dialog: take the dialog's
      await user.click(within(document.querySelector('dialog') as HTMLElement).getByText('Cancel'));
      expect(await screen.findByRole('button', { name: /Purpose Three/ })).toBeInTheDocument();
      expect(priorLink()).not.toBeNull();
      expect(screen.getByText(/aerial\.pdf/)).toBeInTheDocument();
    }));

  it('Confirm with an upload started meanwhile keeps the old purpose together with the old prior', async () =>
    withPurposes(async () => {
      const { user } = renderPage('03', true, [carriedDoc]);
      expect(await screen.findByText(/aerial\.pdf/)).toBeInTheDocument();

      await choosePurpose(user, /Purpose Three/, /Purpose Two/);
      const dialog = (await waitFor(() => {
        const d = document.querySelector('dialog.modal-open');
        expect(d).not.toBeNull();
        return d;
      })) as HTMLElement;

      let end = () => {};
      act(() => {
        end = useUploadProgressStore.getState().beginBatch(REQUEST_DOCUMENT_UPLOADS);
      });
      await user.click(within(dialog).getByText('Change and clear'));

      expect(await screen.findByRole('button', { name: /Purpose Three/ })).toBeInTheDocument();
      expect(priorLink()).not.toBeNull();
      expect(screen.getByText(/aerial\.pdf/)).toBeInTheDocument();
      expect(document.querySelector('dialog.modal-open')).toBeNull();
      act(() => end());
    }));

  it('leaves a saved draft pristine when the change is cancelled', async () =>
    withPurposes(async () => {
      server.use(
        http.get('*/api/requests/r-1', () =>
          HttpResponse.json({
            id: 'r-1',
            requestNumber: 'REQ-1',
            status: 'Draft',
            requestedAt: null,
            purpose: '03',
            detail: { prevAppraisalId: 'prev-1', prevAppraisalNumber: '69000002' },
            customers: [{ name: 'Somchai', contactNumber: '' }],
            properties: [],
            titles: [],
            documents: [carriedDoc],
          }),
        ),
      );
      const { user } = render(
        <Routes>
          <Route path="/requests/:requestId" element={<RequestPage />} />
        </Routes>,
        { initialEntries: ['/requests/r-1'] },
      );
      expect(await screen.findByText(/aerial\.pdf/, {}, { timeout: 4000 })).toBeInTheDocument();
      await new Promise(resolve => setTimeout(resolve, 400));
      expect(screen.queryByText('Unsaved changes')).toBeNull();

      await choosePurpose(user, /Purpose Three/, /Purpose Two/);
      await user.click(
        within(
          (await waitFor(
            () => {
              const d = document.querySelector('dialog.modal-open');
              expect(d).not.toBeNull();
              return d;
            },
            { timeout: 4000 },
          )) as HTMLElement,
        ).getByText('Cancel'),
      );

      expect(
        await screen.findByRole('button', { name: /Purpose Three/ }, { timeout: 4000 }),
      ).toBeInTheDocument();
      await new Promise(resolve => setTimeout(resolve, 400));
      expect(screen.queryByText('Unsaved changes')).toBeNull();
    }));

  it('puts only the purpose back, and stays pristine, when an upload is running at the change', async () =>
    withPurposes(async () => {
      server.use(
        http.get('*/api/requests/r-1', () =>
          HttpResponse.json({
            id: 'r-1',
            requestNumber: 'REQ-1',
            status: 'Draft',
            requestedAt: null,
            purpose: '03',
            detail: { prevAppraisalId: 'prev-1', prevAppraisalNumber: '69000002' },
            customers: [{ name: 'Somchai', contactNumber: '' }],
            properties: [],
            titles: [],
            documents: [carriedDoc],
          }),
        ),
      );
      const { user } = render(
        <Routes>
          <Route path="/requests/:requestId" element={<RequestPage />} />
        </Routes>,
        { initialEntries: ['/requests/r-1'] },
      );
      expect(await screen.findByText(/aerial\.pdf/, {}, { timeout: 4000 })).toBeInTheDocument();

      let end = () => {};
      act(() => {
        end = useUploadProgressStore.getState().beginBatch(REQUEST_DOCUMENT_UPLOADS);
      });
      await choosePurpose(user, /Purpose Three/, /Purpose Two/);

      expect(
        await screen.findByRole('button', { name: /Purpose Three/ }, { timeout: 4000 }),
      ).toBeInTheDocument();
      expect(document.querySelector('dialog.modal-open')).toBeNull();
      expect(priorLink()).not.toBeNull();
      await new Promise(resolve => setTimeout(resolve, 400));
      expect(screen.queryByText('Unsaved changes')).toBeNull();
      act(() => end());
    }));

  it('Confirm applies the new purpose, clears the prior and drops the carried files', async () =>
    withPurposes(async () => {
      const { user } = renderPage('03', true, [carriedDoc]);
      expect(await screen.findByText(/aerial\.pdf/)).toBeInTheDocument();

      await choosePurpose(user, /Purpose Three/, /Purpose Seven/);
      await user.click(await screen.findByText('Change and clear'));

      await waitFor(() => expect(priorLink()).toBeNull());
      expect(screen.queryByText(/aerial\.pdf/)).toBeNull();
      expect(screen.getByRole('button', { name: /Purpose Seven/ })).toBeInTheDocument();
    }));

  it('does nothing when there is no prior', async () =>
    withPurposes(async () => {
      const { user } = renderPage('03', false);
      await choosePurpose(user, /Purpose Three/, /Purpose Two/);
      expect(screen.queryByText(/Purpose changed/)).toBeNull();
      expect(screen.queryByText('Change and clear')).toBeNull();
    }));

  it('does not clear for a load or a copy: a prior picked afterwards stays', async () =>
    withPurposes(async () => {
      const { user } = renderPage('03', false);
      await user.click(await screen.findByRole('button', { name: /Search prior appraisal/ }));
      await user.click(await screen.findByRole('button', { name: 'pick-template' }));

      expect(await screen.findByRole('link', { name: '69000002' })).toBeInTheDocument();
      // the prior has no customers or properties: each table still has a row to type in
      expect(document.querySelector('[data-field="customers.0.name"]')).not.toBeNull();
      expect(document.querySelector('[data-field="properties.0.propertyType"]')).not.toBeNull();
      await new Promise(resolve => setTimeout(resolve, 300));
      expect(priorLink()).not.toBeNull();
      expect(screen.queryByText('Change and clear')).toBeNull();
    }));
});
