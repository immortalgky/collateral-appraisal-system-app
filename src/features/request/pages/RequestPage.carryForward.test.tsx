import { describe, expect, it, vi } from 'vitest';
import { StrictMode } from 'react';
import { http, HttpResponse, delay } from 'msw';
import { act } from '@testing-library/react';
import toast from 'react-hot-toast';
import { useAuthStore } from '@/features/auth/store';
import { useParameterStore } from '@/shared/store';
import { render, screen, waitFor } from '@/test/test-utils';
import { server } from '@/test/mocks/server';
import type { PriorAppraisal } from '@/features/appraisal/api/priorAppraisal';
import RequestPage from './RequestPage';

// One file as GET /appraisals/{id}?include=documents lists it
const aerial = {
  documentId: 'd-1',
  documentType: 'D005',
  suggestedType: 'D005',
  level: 'Request',
  titleId: null,
  collateralType: null,
  titleNumber: null,
  fileName: 'aerial.pdf',
  filePath: null,
  prefix: null,
  set: 1,
  notes: null,
  uploadedBy: 'u',
  uploadedByName: 'U',
  uploadedAt: '2026-01-01T00:00:00',
  defaultUse: true,
};

// What the selector hands over: the appraisal header plus `request` and `documents`
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
    titles: [{ id: 'old-t1', collateralType: '01', titleNumber: '12345', documents: [] }],
  },
  documents: [aerial],
} as unknown as PriorAppraisal;

// The page tests run in a memory router, which has no blocker to register; an edited form (the
// purpose test below) would mount the real dialog and throw.
vi.mock('@/shared/components/UnsavedChangesDialog', () => ({ default: () => null }));

// What the mocked selector hands over; a test can swap it (another appraisal, no request part)
const picked = vi.hoisted(() => ({ current: null as PriorAppraisal | null }));

vi.mock('@/features/request/components/SearchAppraisalModal', () => ({
  default: ({ isOpen, onSelect }: { isOpen: boolean; onSelect: (t: PriorAppraisal) => void }) =>
    isOpen ? (
      <button type="button" onClick={() => onSelect(picked.current ?? template)}>
        pick-template
      </button>
    ) : null,
}));

describe('RequestPage pick keeps the request-level checklist', () => {
  it('keeps the required slot and the optional chip after a previous appraisal is picked', async () => {
    server.use(
      http.get('*/api/document-checklist', ({ request }) => {
        const titleLevel = new URL(request.url).searchParams.get('propertyTypeCodes');
        return HttpResponse.json(
          titleLevel
            ? {
                applicationDocuments: [],
                propertyTypeGroups: [
                  {
                    propertyTypeCode: '01',
                    propertyTypeName: 'Land',
                    documents: [
                      {
                        documentTypeId: '3',
                        code: 'D013',
                        name: 'Deed',
                        category: null,
                        isRequired: true,
                        notes: null,
                      },
                    ],
                  },
                ],
              }
            : {
                applicationDocuments: [
                  {
                    documentTypeId: '1',
                    code: 'D036',
                    name: 'Previous Summary',
                    category: null,
                    isRequired: true,
                    notes: null,
                  },
                  {
                    documentTypeId: '2',
                    code: 'D015',
                    name: 'ID Card',
                    category: null,
                    isRequired: false,
                    notes: null,
                  },
                ],
                propertyTypeGroups: [],
              },
        );
      }),
      http.get('*/api/appraisals/prev-1', () =>
        HttpResponse.json({
          id: 'prev-1',
          appraisalNumber: '69000002',
          status: 'Completed',
          documents: [aerial],
        }),
      ),
    );

    const duplicateData = {
      purpose: '03',
      channel: 'Manual',
      priority: 'Normal',
      isPma: false,
      creator: { userId: 'u', username: 'U' },
      requestor: { employeeId: 'E1' },
      detail: {
        prevAppraisalId: null,
        prevAppraisalReportNo: null,
        loanDetail: {},
        appointment: {},
        fee: {},
        address: {},
        contact: {},
      },
      customers: [],
      properties: [],
      titles: [],
      documents: [],
      comments: [],
    };
    const { user } = render(
      <StrictMode>
        <RequestPage />
      </StrictMode>,
      {
        initialEntries: [{ pathname: '/requests/new', state: { duplicateData } } as never],
      },
    );

    // before the pick: the purpose's required slot is a row
    expect(await screen.findByText('Previous Summary')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: SEARCH_PRIOR }));
    await user.click(await screen.findByRole('button', { name: 'pick-template' }));

    expect(await screen.findByText(/aerial\.pdf/)).toBeInTheDocument();
    // checked at once, not after a wait: the slots are never missing, even for a moment
    expect(screen.getByText('Previous Summary')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '+ ID Card' })).toBeInTheDocument();
  });

  it('adds the slots when the checklist arrives after the pick', async () => {
    server.use(
      http.get('*/api/document-checklist', async () => {
        await delay(700);
        return HttpResponse.json({
          applicationDocuments: [
            {
              documentTypeId: '1',
              code: 'D036',
              name: 'Previous Summary',
              category: null,
              isRequired: true,
              notes: null,
            },
          ],
          propertyTypeGroups: [],
        });
      }),
      http.get('*/api/appraisals/prev-1', () =>
        HttpResponse.json({
          id: 'prev-1',
          appraisalNumber: '69000002',
          status: 'Completed',
          documents: [aerial],
        }),
      ),
    );
    const duplicateData = {
      purpose: '03',
      channel: 'Manual',
      priority: 'Normal',
      isPma: false,
      creator: { userId: 'u', username: 'U' },
      requestor: { employeeId: 'E1' },
      detail: {
        prevAppraisalId: null,
        prevAppraisalReportNo: null,
        loanDetail: {},
        appointment: {},
        fee: {},
        address: {},
        contact: {},
      },
      customers: [],
      properties: [],
      titles: [],
      documents: [],
      comments: [],
    };
    const { user } = render(<RequestPage />, {
      initialEntries: [{ pathname: '/requests/new', state: { duplicateData } } as never],
    });
    await user.click(screen.getByRole('button', { name: SEARCH_PRIOR }));
    await user.click(await screen.findByRole('button', { name: 'pick-template' }));
    expect(await screen.findByText(/aerial\.pdf/)).toBeInTheDocument();
    await waitFor(() => expect(screen.getByText('Previous Summary')).toBeInTheDocument(), {
      timeout: 3000,
    });
  });

  it('does not reset the form when the logged-in user object is replaced mid-session', async () => {
    // The auth store's user is replaced during a session (a token refresh while the pick calls the
    // API). That used to re-run the create-mode reset and wipe what the maker had entered, the
    // purpose included, so the request-level slots vanished and never came back.
    server.use(
      http.get('*/api/document-checklist', () =>
        HttpResponse.json({
          applicationDocuments: [
            {
              documentTypeId: '1',
              code: 'D036',
              name: 'Previous Summary',
              category: null,
              isRequired: true,
              notes: null,
            },
          ],
          propertyTypeGroups: [],
        }),
      ),
      http.get('*/api/appraisals/prev-1', () =>
        HttpResponse.json({
          id: 'prev-1',
          appraisalNumber: '69000002',
          status: 'Completed',
          documents: [aerial],
        }),
      ),
    );
    const duplicateData = {
      purpose: '03',
      channel: 'Manual',
      priority: 'Normal',
      isPma: false,
      creator: { userId: 'u', username: 'U' },
      requestor: { employeeId: 'E1' },
      detail: {
        prevAppraisalId: null,
        prevAppraisalReportNo: null,
        loanDetail: {},
        appointment: {},
        fee: {},
        address: {},
        contact: {},
      },
      customers: [],
      properties: [],
      titles: [],
      documents: [],
      comments: [],
    };
    const { user } = render(<RequestPage />, {
      initialEntries: [{ pathname: '/requests/new', state: { duplicateData } } as never],
    });
    expect(await screen.findByText('Previous Summary')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: SEARCH_PRIOR }));
    await user.click(await screen.findByRole('button', { name: 'pick-template' }));
    expect(await screen.findByText(/aerial\.pdf/)).toBeInTheDocument();

    act(() => useAuthStore.setState({ user: { username: 'u', name: 'U' } as never }));
    act(() => useAuthStore.setState({ user: { username: 'u', name: 'U' } as never }));
    await new Promise(resolve => setTimeout(resolve, 150));

    // nothing was reset: the carried file and the slot are still there
    expect(screen.getByText(/aerial\.pdf/)).toBeInTheDocument();
    expect(screen.getByText('Previous Summary')).toBeInTheDocument();
    useAuthStore.setState({ user: null });
  });
});

const duplicate = (purpose: string, prevAppraisalId: string | null = null) => ({
  purpose,
  channel: 'Manual',
  priority: 'Normal',
  isPma: false,
  creator: { userId: 'u', username: 'U' },
  requestor: { employeeId: 'E1' },
  detail: {
    prevAppraisalId,
    prevAppraisalReportNo: prevAppraisalId ? '69000002' : null,
    loanDetail: {},
    appointment: {},
    fee: {},
    address: {},
    contact: {},
  },
  customers: [],
  properties: [],
  titles: [],
  documents: [],
  comments: [],
});

// The server side of a pick: an empty checklist, the appraisal's own read, and the round endpoint
const serve = (nextHandler: Parameters<typeof http.get>[1] = () => HttpResponse.json({})) => {
  const calls = { round: 0, documents: 0 };
  server.use(
    http.get('*/api/document-checklist', () =>
      HttpResponse.json({ applicationDocuments: [], propertyTypeGroups: [] }),
    ),
    http.get('*/api/appraisals/:id/next-inspection-number', info => {
      calls.round++;
      return nextHandler(info);
    }),
    http.get('*/api/appraisals/prev-1', () => {
      calls.documents++;
      return HttpResponse.json({
        id: 'prev-1',
        appraisalNumber: '69000002',
        status: 'Completed',
        documents: [aerial],
      });
    }),
  );
  return calls;
};

// The search field of the prior-appraisal block, which exists once a purpose is chosen
const SEARCH_PRIOR = /Search prior appraisal/;

const openPicker = async (user: ReturnType<typeof render>['user']) => {
  await user.click(await screen.findByRole('button', { name: SEARCH_PRIOR }));
  await user.click(await screen.findByRole('button', { name: 'pick-template' }));
};

const purposeParameter = (code: string, description: string) => ({
  parId: Number(code) || 1,
  group: 'AppraisalPurpose',
  country: 'TH',
  language: 'en',
  code,
  description,
  isActive: true,
  seqNo: Number(code) || 1,
});

const choosePurpose = async (
  user: ReturnType<typeof render>['user'],
  from: RegExp | null,
  to: RegExp,
) => {
  const button = from
    ? screen.getByRole('button', { name: from })
    : (document.querySelector('[data-field="purpose"] button') as HTMLElement);
  await user.click(button);
  await user.click(await screen.findByRole('option', { name: to }));
};

// The round a new Construction Inspection would be: a query that runs while a prior is set and the
// purpose is a construction-inspection one, whichever of the two came first
describe('RequestPage: construction-inspection round', () => {
  const round = () => HttpResponse.json({ nextInspectionNumber: 3 });

  const renderDuplicate = (purpose: string, prevAppraisalId: string | null = null) =>
    render(<RequestPage />, {
      initialEntries: [
        {
          pathname: '/requests/new',
          state: { duplicateData: duplicate(purpose, prevAppraisalId) },
        } as never,
      ],
    });

  it('asks for the round on a construction-inspection purpose and shows it', async () => {
    const calls = serve(round);
    const { user } = renderDuplicate('06');
    await openPicker(user);
    expect(await screen.findByText(/aerial\.pdf/)).toBeInTheDocument();
    expect(await screen.findByText(/Inspection round 3/)).toBeInTheDocument();
    expect(calls.round).toBe(1);
  });

  it('does not ask on another purpose, and the field stays empty', async () => {
    const calls = serve(round);
    const { user } = renderDuplicate('03');
    await openPicker(user);
    expect(await screen.findByText(/aerial\.pdf/)).toBeInTheDocument();
    expect(calls.round).toBe(0);
    expect(screen.queryByText(/Inspection round/)).not.toBeInTheDocument();
  });

  it('a failed read leaves the field empty and the pick still works', async () => {
    const calls = serve(() => new HttpResponse(null, { status: 500 }));
    const { user } = renderDuplicate('06');
    await openPicker(user);
    expect(await screen.findByText(/aerial\.pdf/)).toBeInTheDocument();
    await waitFor(() => expect(calls.round).toBe(1));
    expect(screen.queryByText(/Inspection round/)).not.toBeInTheDocument();
  });

  // A new purpose starts without a prior, so the construction-inspection purpose is chosen first
  it('choose a construction-inspection purpose, then pick the prior: the round shows', async () => {
    useParameterStore
      .getState()
      .setParameters([
        purposeParameter('03', 'Purpose Three'),
        purposeParameter('06', 'Purpose Six'),
      ]);
    try {
      const calls = serve(round);
      const { user } = renderDuplicate('03');
      await choosePurpose(user, /Purpose Three/, /Purpose Six/);
      // nothing picked yet, so nothing to clear and no round to ask for
      expect(screen.queryByText('Change purpose')).not.toBeInTheDocument();
      expect(calls.round).toBe(0);

      await openPicker(user);
      expect(await screen.findByText(/aerial\.pdf/)).toBeInTheDocument();
      expect(await screen.findByText(/Inspection round 3/)).toBeInTheDocument();
      expect(calls.round).toBe(1);
    } finally {
      useParameterStore.getState().setParameters([]);
    }
  });

  it('changing the purpose after a pick clears the prior and its round, once confirmed', async () => {
    useParameterStore
      .getState()
      .setParameters([
        purposeParameter('03', 'Purpose Three'),
        purposeParameter('06', 'Purpose Six'),
      ]);
    try {
      serve(round);
      const { user } = renderDuplicate('03');
      await openPicker(user);
      expect(await screen.findByText(/aerial\.pdf/)).toBeInTheDocument();
      expect(await screen.findByRole('link', { name: '69000002' })).toBeInTheDocument();

      await choosePurpose(user, /Purpose Three/, /Purpose Six/);
      // files were taken from the prior, so the page asks before clearing them
      await user.click(await screen.findByText('Change and clear'));
      await waitFor(() =>
        expect(screen.queryByRole('link', { name: '69000002' })).not.toBeInTheDocument(),
      );
      expect(screen.queryByText(/Inspection round/)).not.toBeInTheDocument();
      expect(screen.queryByText(/aerial\.pdf/)).not.toBeInTheDocument();
      // the purpose needs a prior, so the search field is back
      expect(screen.getByRole('button', { name: SEARCH_PRIOR })).toBeInTheDocument();
    } finally {
      useParameterStore.getState().setParameters([]);
    }
  });

  it('a form that arrives with a prior and a CI purpose (a reopened draft) shows the round', async () => {
    const calls = serve(round);
    renderDuplicate('06', 'prev-1');
    expect(await screen.findByText(/Inspection round 3/)).toBeInTheDocument();
    expect(calls.round).toBe(1);
  });

  it('switching away from a construction-inspection purpose clears the round', async () => {
    useParameterStore
      .getState()
      .setParameters([
        purposeParameter('03', 'Purpose Three'),
        purposeParameter('06', 'Purpose Six'),
      ]);
    try {
      serve(round);
      const { user } = renderDuplicate('06', 'prev-1');
      expect(await screen.findByText(/Inspection round 3/)).toBeInTheDocument();

      await choosePurpose(user, /Purpose Six/, /Purpose Three/);
      await waitFor(() => expect(screen.queryByText(/Inspection round/)).not.toBeInTheDocument());
    } finally {
      useParameterStore.getState().setParameters([]);
    }
  });
});

describe('RequestPage pick: what the pick response already holds', () => {
  it('does not read the appraisal\u2019s files again for the document card', async () => {
    const calls = serve();
    const { user } = render(<RequestPage />, {
      initialEntries: [
        { pathname: '/requests/new', state: { duplicateData: duplicate('03') } } as never,
      ],
    });
    await openPicker(user);
    expect(await screen.findByText(/aerial\.pdf/)).toBeInTheDocument();
    await new Promise(resolve => setTimeout(resolve, 200));
    expect(calls.documents).toBe(0);
  });

  it('an appraisal whose request part is missing sets the reference, copies nothing and says so', async () => {
    serve();
    const error = vi.spyOn(toast, 'error');
    picked.current = { ...template, request: null };
    try {
      const { user } = render(<RequestPage />, {
        initialEntries: [
          { pathname: '/requests/new', state: { duplicateData: duplicate('03') } } as never,
        ],
      });
      await openPicker(user);
      await waitFor(() =>
        expect(error).toHaveBeenCalledWith(
          expect.stringMatching(/has no request data to copy/),
          expect.anything(),
        ),
      );
      // the reference is set and the files still come along
      expect(await screen.findByRole('link', { name: '69000002' })).toBeInTheDocument();
      expect(await screen.findByText(/aerial\.pdf/)).toBeInTheDocument();
    } finally {
      picked.current = null;
      error.mockRestore();
    }
  });
});
