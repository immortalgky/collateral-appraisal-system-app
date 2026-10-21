import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { http, HttpResponse } from 'msw';
import toast from 'react-hot-toast';
import { render, screen, waitFor } from '@/test/test-utils';
import { server } from '@/test/mocks/server';
import { mockRequestPageApi } from '@/test/mocks/requestPage';
import type {
  ConstructionChainStatus,
  PriorAppraisal,
} from '@/features/appraisal/api/priorAppraisal';
import RequestPage from './RequestPage';

// The page tests run in a memory router, which has no blocker to register
vi.mock('@/shared/components/UnsavedChangesDialog', () => ({ default: () => null }));

mockRequestPageApi();

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

const appraisal = (id: string, number: string) =>
  ({
    id,
    appraisalNumber: number,
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
    documents: [aerial],
  }) as unknown as PriorAppraisal;

const picked = appraisal('prev-1', '69000002');
const latest = appraisal('latest-1', '69120871');

const chain = (over: Partial<ConstructionChainStatus> = {}): ConstructionChainStatus => ({
  appraisalId: 'prev-1',
  construction: {
    status: 'InProgress',
    progressPct: 72.69,
    sourceAppraisalId: 'prev-1',
    sourceAppraisalNumber: '69000002',
    sourceInspectionNumber: 3,
    sourceCompletedAt: '2026-03-14T00:00:00',
  },
  laterInspection: null,
  openInspectionRequest: null,
  // a re-appraisal after the picked appraisal: allowed, but the maker is asked
  latestAppraisal: {
    appraisalId: 'latest-1',
    appraisalNumber: '69120871',
    purposeCode: '03',
    completedAt: '2026-08-02T00:00:00',
  },
  blockReason: null,
  ...over,
});

// What the mocked search modal hands over with the pick
const handed = vi.hoisted(() => ({ chain: undefined as unknown }));

vi.mock('@/features/request/components/SearchAppraisalModal', () => ({
  default: ({
    isOpen,
    onSelect,
  }: {
    isOpen: boolean;
    onSelect: (t: PriorAppraisal, c?: unknown) => void;
  }) =>
    isOpen ? (
      <button type="button" onClick={() => onSelect(picked, handed.chain)}>
        pick-template
      </button>
    ) : null,
}));

const duplicate = (purpose: string) => ({
  purpose,
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
});

/** The server side of a pick, and of picking the latest of the chain (whose own status is `latestChain`). */
const serve = (latestChain: ConstructionChainStatus) =>
  server.use(
    http.get('*/api/appraisals/:id/next-inspection-number', () =>
      HttpResponse.json({ nextInspectionNumber: 4 }),
    ),
    http.get('*/api/appraisals/prev-1', () => HttpResponse.json(picked)),
    http.get('*/api/appraisals/latest-1', () => HttpResponse.json(latest)),
    http.get('*/api/appraisals/latest-1/construction-chain-status', () =>
      HttpResponse.json(latestChain),
    ),
  );

const pickOnPurpose = async (purpose: string) => {
  const view = render(<RequestPage />, {
    initialEntries: [
      { pathname: '/requests/new', state: { duplicateData: duplicate(purpose) } } as never,
    ],
  });
  await view.user.click(await screen.findByRole('button', { name: /Search prior appraisal/ }));
  await view.user.click(await screen.findByRole('button', { name: 'pick-template' }));
  return view;
};

const DIALOG_TITLE = 'The selected appraisal is not the latest in the chain';
const latestOf = chain().latestAppraisal;

describe('RequestPage: a construction-inspection pick that is not the latest of its chain', () => {
  const spyOnToastError = () => vi.spyOn(toast, 'error');
  let error: ReturnType<typeof spyOnToastError>;
  beforeEach(() => {
    handed.chain = chain();
    error = spyOnToastError();
  });
  afterEach(() => error.mockRestore());

  it('asks first, and applies nothing until the maker answers', async () => {
    serve(chain({ latestAppraisal: null }));
    await pickOnPurpose('06');
    expect(await screen.findByText(DIALOG_TITLE)).toBeInTheDocument();
    expect(screen.queryByText(/aerial\.pdf/)).not.toBeInTheDocument();
    // the number is on the dialog alone: the prior-appraisal strip does not show it yet
    expect(screen.getAllByText('69000002')).toHaveLength(1);
  });

  it('"use the selected" copies from the picked appraisal, and the banner shows the chain', async () => {
    serve(chain({ latestAppraisal: null }));
    const { user } = await pickOnPurpose('06');
    await user.click(
      await screen.findByRole('button', { name: 'Use the selected (69000002)', hidden: true }),
    );

    expect(await screen.findByText(/aerial\.pdf/)).toBeInTheDocument();
    expect(screen.queryByText(DIALOG_TITLE)).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: '69000002' })).toBeInTheDocument();
    expect(await screen.findByText(/Latest construction 72\.69%/)).toBeInTheDocument();
    expect(
      screen.getByText(/Not the latest appraisal in the chain: appraisal 69120871/),
    ).toBeInTheDocument();
  });

  it('"use the latest" picks the latest appraisal: reads it, and does not ask again', async () => {
    serve(chain({ appraisalId: 'latest-1', latestAppraisal: null }));
    const { user } = await pickOnPurpose('06');
    await user.click(
      await screen.findByRole('button', { name: 'Use the latest (69120871)', hidden: true }),
    );

    expect(await screen.findByRole('link', { name: '69120871' })).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: '69000002' })).not.toBeInTheDocument();
    expect(screen.queryByText(DIALOG_TITLE)).not.toBeInTheDocument();
    expect(await screen.findByText(/aerial\.pdf/)).toBeInTheDocument();
    // the latest of its own chain: no newer appraisal to warn about
    await waitFor(() => expect(screen.queryByText(/Not the latest/)).not.toBeInTheDocument());
  });

  it('does not ask again when the latest one’s own status still names a newer appraisal', async () => {
    serve(chain({ appraisalId: 'latest-1', latestAppraisal: latestOf }));
    const { user } = await pickOnPurpose('06');
    await user.click(
      await screen.findByRole('button', { name: 'Use the latest (69120871)', hidden: true }),
    );
    expect(await screen.findByRole('link', { name: '69120871' })).toBeInTheDocument();
    expect(screen.queryByText(DIALOG_TITLE)).not.toBeInTheDocument();
  });

  it('Escape picks nothing: the form is as it was', async () => {
    serve(chain({ latestAppraisal: null }));
    const { user } = await pickOnPurpose('06');
    await screen.findByText(DIALOG_TITLE);
    await user.keyboard('{Escape}');
    await waitFor(() => expect(screen.queryByText(DIALOG_TITLE)).not.toBeInTheDocument());
    expect(screen.queryByText(/aerial\.pdf/)).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Search prior appraisal/ })).toBeInTheDocument();
  });

  it('is not asked when the pick carries no chain (a purpose that is not a construction inspection)', async () => {
    handed.chain = undefined;
    serve(chain({ latestAppraisal: null }));
    await pickOnPurpose('03');
    expect(await screen.findByText(/aerial\.pdf/)).toBeInTheDocument();
    expect(screen.queryByText(DIALOG_TITLE)).not.toBeInTheDocument();
  });

  it('the banner link swaps to the latest later on, and a latest that is itself refused changes nothing', async () => {
    serve(
      chain({
        appraisalId: 'latest-1',
        latestAppraisal: null,
        blockReason: 'ConstructionComplete',
      }),
    );
    const { user } = await pickOnPurpose('06');
    await user.click(
      await screen.findByRole('button', { name: 'Use the selected (69000002)', hidden: true }),
    );
    const swap = await screen.findByRole('button', { name: 'Use appraisal 69120871 instead' });

    await user.click(swap);
    await waitFor(() =>
      expect(error).toHaveBeenCalledWith(
        'The selected prior appraisal is already 100% built, so no further inspection is needed. Choose another appraisal or clear the prior appraisal.',
      ),
    );
    // still following the picked appraisal
    expect(screen.getByRole('link', { name: '69000002' })).toBeInTheDocument();
    expect(screen.queryByText('69120871')).not.toBeInTheDocument();
  });
});
