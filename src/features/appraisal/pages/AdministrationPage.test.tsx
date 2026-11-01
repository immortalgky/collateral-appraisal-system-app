import { beforeEach, describe, expect, it, vi } from 'vitest';
import toast from 'react-hot-toast';
import { http, HttpResponse } from 'msw';
import userEvent from '@testing-library/user-event';
import { fireEvent } from '@testing-library/react';
import { render, screen, waitFor, within } from '@/test/test-utils';
import { server } from '@/test/mocks/server';
import { PageReadOnlyContext } from '@/shared/contexts/PageReadOnlyContext';
import { useLocaleStore } from '@/shared/store';
import AdministrationPage from './AdministrationPage';

/**
 * The prior inspection's company on the Administration page: the banner, the preselect that only a
 * fresh row with an active MOU gets, and the confirmation before the admin moves off it. The test
 * i18n returns keys, so texts are asserted by key. Everything the page reads is mocked at its hook;
 * only the fee-preview call inside the confirm dialog goes through msw.
 */

const state = vi.hoisted(() => {
  const company = (id: string, companyName: string) => ({
    id,
    companyName,
    companyNameLocal: null,
    registrationNo: '123',
    contactPerson: 'Contact',
    contactPhone: '0800000000',
    contactEmail: 'c@example.com',
    rating: 4,
    activeAssignments: 2,
  });
  const oldCompany = company('c-old', 'Old Co');
  const newCompany = company('c-new', 'New Co');
  return {
    oldCompany,
    newCompany,
    eligibleBoth: [oldCompany, newCompany],
    eligibleNewOnly: [newCompany],
    request: { detail: { loanDetail: { bankingSegment: 'SME', facilityLimit: 1_000_000 } } },
    none: [] as unknown[],
    // Quotation detail by id (what useGetQuotationById returns for the page's shown quotation).
    quotationDetails: {} as Record<string, unknown>,
    defaults: undefined as unknown,
    assignments: [] as unknown[],
    staff: [] as unknown[],
    killSwitch: null as unknown,
    oldNotEligible: false,
    // The fee card is stubbed out except where a test is about what it shows.
    realFeeCard: false,
    // A stand-in fee card with a plain button ahead of the one that marks itself the fix target.
    twoButtonFeeCard: false,
    // Bodies of the writes that reached the network (the create / draft hooks are the real ones).
    posted: [] as unknown[],
    drafted: [] as unknown[],
    // The order the draft save and the email preview reached the network.
    calls: [] as string[],
    // What the page reads from its context, and what the company picker hands back next.
    appraisalId: 'A1',
    // The appraisal's status in its context; null = no context (most tests).
    appraisalStatus: null as string | null,
    taskOwner: true,
    workflowInstanceId: 'W1' as string | null,
    nextPick: undefined as unknown,
    // The company lookup has not answered yet (the form already holds the stored id).
    companyLoading: false,
    // Every id the page asked useGetCompanyById for (null = disabled, not recorded): each is a
    // GET /companies/{id}.
    companyLookups: [] as string[],
    // Query strings of the fee-preview requests, and how many times /fees was read.
    feePreviewQueries: [] as URLSearchParams[],
    feesReads: 0,
    // The eligible list never answers: while the page asks for it (enabled) it stays fetching.
    eligiblePending: false,
    // The `enabled` flag of every segment-filtered useGetEligibleCompanies call, in render order.
    eligibleEnabled: [] as boolean[],
    // Every enabled useGetEligibleCompanies call as [segment, requireSegment].
    eligibleCalls: [] as unknown[][],
  };
});

vi.mock('@/features/appraisal/context/AppraisalContext', () => ({
  useAppraisalId: () => state.appraisalId,
  useAppraisalRequestId: () => 'R1',
  useIsTaskOwner: () => state.taskOwner,
  useWorkflowInstanceId: () => state.workflowInstanceId,
  useAppraisalContextSafe: () =>
    state.appraisalStatus ? { appraisal: { status: state.appraisalStatus } } : null,
}));
vi.mock('@/features/request/api', () => ({
  useGetRequestById: () => ({
    data: state.request,
    isLoading: false,
    isError: false,
    isFetching: false,
  }),
}));
vi.mock('@/features/quotation/api/quotation', () => ({
  useGetQuotationById: (id: string | null) => ({
    data: id ? state.quotationDetails[id] : undefined,
  }),
}));
vi.mock('@shared/api/systemConfiguration', async importOriginal => ({
  ...(await importOriginal<typeof import('@shared/api/systemConfiguration')>()),
  useSystemConfiguration: () => ({ data: state.killSwitch, isLoading: false, isFetching: false }),
}));
// The create / draft hooks stay real so a test can read the request body they send.
vi.mock('../api/administration', async importOriginal => ({
  useCreateAssignment: (await importOriginal<typeof import('../api/administration')>())
    .useCreateAssignment,
  useSaveAssignmentDraft: (await importOriginal<typeof import('../api/administration')>())
    .useSaveAssignmentDraft,
  useGetAppraisalQuotations: () => ({ data: state.none, isError: false, isFetching: false }),
  useGetAssignment: () => ({ data: state.assignments, isLoading: false, isFetching: false }),
  useGetAssignmentDefaults: () => ({ data: state.defaults, isFetching: false }),
  useGetCompanyById: (id: string | null) => {
    if (id) state.companyLookups.push(id);
    return {
      data: id === 'c-old' && !state.companyLoading ? state.oldCompany : undefined,
      isFetching: false,
    };
  },
  // What the picker offers for the request's segment; the previous company is preselected only
  // if it is in this list.
  useGetEligibleCompanies: (segment: unknown, enabled: boolean, requireSegment = true) => {
    if (requireSegment) state.eligibleEnabled.push(enabled);
    if (enabled) state.eligibleCalls.push([segment, requireSegment]);
    return {
      // Stable arrays, like react-query's structural sharing: the seed effect depends on the list.
      data: state.eligiblePending
        ? undefined
        : state.oldNotEligible
          ? state.eligibleNewOnly
          : state.eligibleBoth,
      // A disabled query is never fetching.
      isFetching: enabled && state.eligiblePending,
    };
  },
  useGetEligibleStaff: () => ({ data: state.staff }),
  useGetUserById: () => ({ data: undefined }),
}));

// The company picker is stubbed to a button that picks "New Co"; the rest are not under test.
vi.mock('../components/SearchCompanyModal', () => ({
  default: ({ onSelect }: { onSelect: (company: unknown) => void }) => (
    <button type="button" onClick={() => onSelect(state.nextPick ?? state.newCompany)}>
      pick-other-company
    </button>
  ),
}));
vi.mock('../components/SearchStaffModal', () => ({ default: () => null }));
// Stands in for the quotation section: a text input and a textarea, for the Enter-key test.
vi.mock('../components/QuotationSection', () => ({
  default: () => (
    <div>
      <input aria-label="quotation-input" />
      <textarea aria-label="quotation-notes" />
    </div>
  ),
}));
vi.mock('../components/QuotationEntryModal', () => ({ default: () => null }));
vi.mock('../components/AssignmentFeeCard', async importOriginal => {
  const Real = (await importOriginal<typeof import('../components/AssignmentFeeCard')>()).default;
  return {
    default: (props: React.ComponentProps<typeof Real>) =>
      state.realFeeCard ? (
        <Real {...props} />
      ) : state.twoButtonFeeCard ? (
        <div>
          <button type="button">first-button</button>
          <button type="button" data-fix-target="">
            fix-target-button
          </button>
        </div>
      ) : null,
  };
});
// The email dialog's upload and picker are its own test's concern; the real module also loads the
// app's i18n instance, which would turn every key below into its translation.
vi.mock('@/features/request/api/documents', () => ({
  createUploadSession: vi.fn(),
  useUploadDocument: () => ({ mutateAsync: vi.fn() }),
  useGetRequestDocuments: () => ({ data: undefined, isLoading: false }),
}));
// Registers a router blocker, which needs a data router.
vi.mock('@/shared/components/UnsavedChangesDialog', () => ({ default: () => null }));

const previousCompany = (over = {}) => ({
  companyId: 'c-old',
  companyName: 'Old Co',
  appraisalId: 'P1',
  appraisalNumber: '69105522',
  inspectionNumber: 3,
  completedAt: '2026-05-12T10:00:00',
  mouActive: true,
  ...over,
});

// The Appraisal Type defaults say Internal + Round-robin: the preselect has to win over them.
const setDefaults = (previous: unknown, over = {}) => {
  state.defaults = {
    assignmentType: 'internal',
    assignmentMethod: 'roundrobin',
    followupStaffMethod: 'manual',
    previousCompany: previous,
    ...over,
  };
};

const draftAssignment = {
  id: 'as-1',
  appraisalId: 'A1',
  assignmentType: 'Internal',
  assignmentStatus: 'Pending',
  assignmentMethod: 'Manual',
  assigneeUserId: null,
  assigneeCompanyId: null,
  internalAppraiserId: null,
  internalFollowupAssignmentMethod: null,
  remark: null,
  draftSavedAt: '2026-10-20T10:00:00',
};

const emailPreview = {
  companyTo: 'co@example.com',
  extraTo: [],
  cc: ['IntAdminAll'],
  subject: 'ขอนำส่งงานประเมิน',
  bodyHtml: '<p>เรียน {{company}}</p>',
  attachments: [],
  maxAttachments: 10,
  maxAttachmentBytes: 10485760,
};

const feePreview = {
  systemBaseAmount: 3000,
  baseSource: {
    kind: 'ConstructionInspectionFee',
    appraisalNumber: '69105522',
    quotationNumber: null,
    winnerCompanyName: null,
    sellingPrice: null,
    tierMin: null,
    tierMax: null,
  },
  adminOverrideAmount: null,
  // The base (feeCode 01) is there, so the slip's fee check is met: a missing one blocks Assign.
  items: [
    { id: null, feeCode: '01', description: 'Appraisal fee', amount: 3000, source: 'System' },
  ],
  subtotal: 3000,
  vatRate: 7,
  vat: 210,
  total: 3210,
};

beforeEach(() => {
  state.request = { detail: { loanDetail: { bankingSegment: 'SME', facilityLimit: 1_000_000 } } };
  state.none = [];
  state.quotationDetails = {};
  state.defaults = undefined;
  state.assignments = [];
  state.staff = [];
  state.killSwitch = null;
  state.oldNotEligible = false;
  state.realFeeCard = false;
  state.twoButtonFeeCard = false;
  state.posted = [];
  state.drafted = [];
  state.calls = [];
  state.appraisalId = 'A1';
  state.appraisalStatus = null;
  state.taskOwner = true;
  state.workflowInstanceId = 'W1';
  state.nextPick = undefined;
  state.companyLoading = false;
  state.companyLookups = [];
  state.feePreviewQueries = [];
  state.feesReads = 0;
  state.eligiblePending = false;
  state.eligibleEnabled = [];
  state.eligibleCalls = [];
  server.use(
    http.get('*/appraisals/:id/fee-preview', ({ request }) => {
      state.feePreviewQueries.push(new URL(request.url).searchParams);
      return HttpResponse.json(feePreview);
    }),
    http.get('*/appraisals/:id/fees', () => {
      state.feesReads += 1;
      return HttpResponse.json({ fees: [] });
    }),
    http.post('*/appraisals/:id/assignments', async ({ request }) => {
      state.posted.push(await request.json());
      return HttpResponse.json({});
    }),
    http.put('*/appraisals/:id/assignments/draft', async ({ request }) => {
      state.calls.push('draft');
      state.drafted.push(await request.json());
      return new HttpResponse(null, { status: 204 });
    }),
    http.get('*/appraisals/:id/assignment-email/preview', () => {
      state.calls.push('preview');
      return HttpResponse.json(emailPreview);
    }),
  );
});

describe('AdministrationPage: previous inspection company', () => {
  it('shows the banner and starts on the previous company, ahead of the type defaults', async () => {
    setDefaults(previousCompany());
    render(<AdministrationPage />);

    expect(await screen.findByText('administration.previousCompany.title')).toBeInTheDocument();
    expect(screen.getByText(/hintSelected/)).toBeInTheDocument();
    expect(screen.getByText('Old Co', { selector: 'span' })).toBeInTheDocument();
    expect(screen.getByText('administration.previousCompany.badge')).toBeInTheDocument();
  });

  it('leaves out the inspection number when the prior is the original appraisal', async () => {
    setDefaults(previousCompany({ inspectionNumber: null }));
    render(<AdministrationPage />);

    expect(await screen.findByText('administration.previousCompany.title')).toBeInTheDocument();
    expect(
      screen.getByText('administration.previousCompany.badgeNoInspection'),
    ).toBeInTheDocument();
    expect(screen.queryByText(/previousCompany\.inspection/)).not.toBeInTheDocument();
  });

  it('says so and preselects nothing when the MOU is not active', async () => {
    setDefaults(previousCompany({ mouActive: false }));
    render(<AdministrationPage />);

    expect(await screen.findByText(/hintMouInactive/)).toBeInTheDocument();
    expect(screen.queryByText('Old Co')).not.toBeInTheDocument();
  });

  it('says so and preselects nothing when the company is not offered for this segment', async () => {
    setDefaults(previousCompany());
    state.oldNotEligible = true;
    render(<AdministrationPage />);

    expect(await screen.findByText(/hintNotEligible/)).toBeInTheDocument();
    expect(screen.queryByText('Old Co')).not.toBeInTheDocument();
  });

  it('shows the banner without preselecting while in-system assignment is off', async () => {
    setDefaults(previousCompany());
    state.killSwitch = { key: 'k', value: 'false', valueType: 'bool', isActive: true };
    render(<AdministrationPage />);

    // Not the current selection, so no claim about being asked to confirm a change.
    expect(await screen.findByText('administration.previousCompany.title')).toBeInTheDocument();
    expect(screen.queryByText(/previousCompany\.hint/)).not.toBeInTheDocument();
    expect(screen.queryByText('Old Co')).not.toBeInTheDocument();
  });

  it('shows the internal card disabled with its reason when the facility limit is over 50 million', async () => {
    setDefaults(null);
    state.request = {
      detail: { loanDetail: { bankingSegment: 'SME', facilityLimit: 60_000_000 } },
    };
    render(<AdministrationPage />);

    const internal = await screen.findByRole('radio', {
      name: 'administration.assignmentType.internal',
    });
    expect(internal).toHaveAttribute('aria-disabled', 'true');
    expect(internal).toHaveAccessibleDescription(
      'administration.assignmentType.internalDisabledReason',
    );
  });

  it('shows the in-system external card dimmed with its reason while in-system assignment is off', async () => {
    setDefaults(previousCompany());
    state.killSwitch = { key: 'k', value: 'false', valueType: 'bool', isActive: true };
    render(<AdministrationPage />);

    const external = await screen.findByRole('radio', {
      name: 'administration.assignmentType.external',
    });
    expect(external).toHaveAttribute('aria-disabled', 'true');
    expect(external).toHaveAccessibleDescription(
      'administration.assignmentType.externalDisabledReason',
    );
  });

  // The seed waits for the eligible list only when a preselect can happen. Here the list never
  // answers, so a page that waited anyway would never leave its loading screen.
  it('seeds without waiting for the eligible list while in-system assignment is off', async () => {
    setDefaults(previousCompany());
    state.killSwitch = { key: 'k', value: 'false', valueType: 'bool', isActive: true };
    state.eligiblePending = true;
    render(<AdministrationPage />);

    expect(await screen.findByText('administration.previousCompany.title')).toBeInTheDocument();
    expect(screen.queryByText('Old Co')).not.toBeInTheDocument();
  });

  it('seeds without waiting for the eligible list while a quotation owns the page', async () => {
    setDefaults(previousCompany());
    state.none = [
      {
        id: 'SENT',
        quotationNumber: 'QT-SENT',
        status: 'Sent',
        requestDate: '2026-10-01',
        selectedAt: null,
      },
    ];
    state.eligiblePending = true;
    render(<AdministrationPage />);

    expect(await screen.findByText('administration.assignmentType.title')).toBeInTheDocument();
  });

  it('waits for the eligible list on a fresh row, where it decides the preselect', async () => {
    setDefaults(previousCompany());
    state.eligiblePending = true;
    render(<AdministrationPage />);
    await new Promise(resolve => setTimeout(resolve, 100));

    expect(screen.queryByText('administration.assignmentType.title')).not.toBeInTheDocument();
  });

  it('does not override a saved draft', async () => {
    setDefaults(previousCompany());
    state.assignments = [draftAssignment];
    render(<AdministrationPage />);

    expect(await screen.findByText('administration.previousCompany.title')).toBeInTheDocument();
    expect(screen.queryByText(/previousCompany\.hint/)).not.toBeInTheDocument();
    expect(screen.queryByText('Old Co')).not.toBeInTheDocument();
  });

  it('stops saying it was chosen for the admin once they clear it and pick it again themselves', async () => {
    setDefaults(previousCompany());
    const { user } = render(<AdministrationPage />);
    expect(await screen.findByText('administration.previousCompany.hintSelected')).toBeVisible();

    await user.click(screen.getByRole('button', { name: 'administration.clearSelection' }));
    await waitFor(() =>
      expect(screen.queryByText('administration.previousCompany.hintSelected')).toBeNull(),
    );

    state.nextPick = state.oldCompany;
    await user.click(screen.getByText('pick-other-company'));

    expect(await screen.findByText('administration.previousCompany.hintAvailable')).toBeVisible();
    expect(screen.queryByText('administration.previousCompany.hintSelected')).toBeNull();
  });

  it('keeps the "chosen for you" hint when the admin picks the company that is already selected', async () => {
    setDefaults(previousCompany());
    const { user } = render(<AdministrationPage />);
    expect(await screen.findByText('administration.previousCompany.hintSelected')).toBeVisible();

    state.nextPick = state.oldCompany;
    await user.click(screen.getByText('pick-other-company'));

    expect(screen.queryByText('administration.changeCompany.title')).not.toBeInTheDocument();
    expect(screen.getByText('administration.previousCompany.hintSelected')).toBeVisible();
  });

  it('keeps the "chosen for you" hint after the preselected company is saved as a draft', async () => {
    setDefaults(previousCompany(), { assignmentType: 'external', assignmentMethod: 'manual' });
    // Saving turns the fresh row into a saved draft that still holds the same company; the page
    // then reads the draft back (stood in for here by the PUT handler) and seeds again.
    server.use(
      http.put('*/appraisals/:id/assignments/draft', async ({ request }) => {
        state.drafted.push(await request.json());
        state.assignments = [
          {
            ...draftAssignment,
            assignmentType: 'External',
            assignmentMethod: 'Manual',
            assigneeCompanyId: 'c-old',
          },
        ];
        return new HttpResponse(null, { status: 204 });
      }),
    );
    const { user } = render(<AdministrationPage />);
    expect(await screen.findByText('administration.previousCompany.hintSelected')).toBeVisible();

    await user.type(screen.getByPlaceholderText('administration.remark.placeholder'), 'note');
    await user.click(within(slipCard()).getByRole('button', { name: 'administration.saveDraft' }));

    await waitFor(() => expect(state.drafted).toHaveLength(1));
    expect(state.drafted[0]).toMatchObject({ assigneeCompanyId: 'c-old' });
    await waitFor(() => expect(screen.getByText('Old Co', { selector: 'span' })).toBeVisible());
    expect(screen.getByText('administration.previousCompany.hintSelected')).toBeVisible();
  });

  it('stops calling the previous company selected once the method is not manual, and shows it again on return', async () => {
    setDefaults(previousCompany());
    const { user } = render(<AdministrationPage />);
    expect(await screen.findByText('administration.previousCompany.hintSelected')).toBeVisible();

    await user.click(screen.getAllByTitle('administration.assignmentDetails.roundrobin')[0]);
    await waitFor(() =>
      expect(screen.queryByText('administration.previousCompany.hintSelected')).toBeNull(),
    );
    expect(screen.queryByText('administration.previousCompany.hintAvailable')).toBeNull();

    await user.click(screen.getAllByTitle('administration.assignmentDetails.manual')[0]);
    expect(await screen.findByText('administration.previousCompany.hintSelected')).toBeVisible();
  });

  it('shows no banner when there is no previous company', async () => {
    setDefaults(null);
    render(<AdministrationPage />);

    expect(await screen.findByText('administration.assignmentType.title')).toBeInTheDocument();
    expect(screen.queryByText('administration.previousCompany.title')).not.toBeInTheDocument();
  });
});

describe('AdministrationPage: changing the previous company', () => {
  const pickOther = async () => {
    const user = userEvent.setup();
    render(<AdministrationPage />);
    await screen.findByText('Old Co', { selector: 'span' });
    await user.click(screen.getByText('pick-other-company'));
    return user;
  };

  it('asks first, with the agreed fee that still applies', async () => {
    setDefaults(previousCompany());
    await pickOther();

    expect(await screen.findByText('administration.changeCompany.title')).toBeInTheDocument();
    expect(await screen.findByText('administration.changeCompany.feeKept')).toBeInTheDocument();
    // The pick has not been applied yet.
    expect(screen.queryByText('New Co', { selector: 'span' })).not.toBeInTheDocument();
  });

  it('says the fee failed to load, not that it is loading, when the preview request fails', async () => {
    server.use(
      http.get('*/appraisals/:id/fee-preview', () => new HttpResponse(null, { status: 500 })),
    );
    setDefaults(previousCompany());
    await pickOther();

    expect(await screen.findByText('feePreview.loadFailed')).toBeInTheDocument();
    expect(screen.queryByText('feePreview.loading')).not.toBeInTheDocument();
    expect(screen.queryByText('administration.changeCompany.feeKept')).not.toBeInTheDocument();
  });

  it('leaves the inspection number out of the dialog when there is none', async () => {
    setDefaults(previousCompany({ inspectionNumber: null }));
    await pickOther();

    expect(await screen.findByText('administration.changeCompany.title')).toBeInTheDocument();
    expect(screen.queryByText(/previousCompany\.inspection/)).not.toBeInTheDocument();
  });

  it('goes back to the previous company when the admin keeps it', async () => {
    setDefaults(previousCompany());
    const user = await pickOther();

    await user.click(await screen.findByText('administration.changeCompany.keepPrevious'));

    await waitFor(() =>
      expect(screen.queryByText('administration.changeCompany.title')).not.toBeInTheDocument(),
    );
    expect(screen.getByText('Old Co', { selector: 'span' })).toBeInTheDocument();
    expect(screen.queryByText('New Co')).not.toBeInTheDocument();
  });

  it('takes the previous company from the eligible list: no GET /companies/{id} is sent', async () => {
    setDefaults(previousCompany());
    // Were the page to look the company up, this lookup would never answer.
    state.companyLoading = true;
    const user = await pickOther();
    await user.click(await screen.findByText('administration.changeCompany.keepPrevious'));

    expect(await screen.findByText('Old Co', { selector: 'span' })).toBeInTheDocument();
    expect(state.companyLookups).toEqual([]);
  });

  it('looks the previous company up on its own only when the eligible list does not hold it', async () => {
    setDefaults(previousCompany());
    state.oldNotEligible = true;
    render(<AdministrationPage />);

    expect(await screen.findByText(/hintNotEligible/)).toBeInTheDocument();
    expect(new Set(state.companyLookups)).toEqual(new Set(['c-old']));
  });

  it('drops only the pick when the dialog is dismissed with Escape: the selection stays', async () => {
    setDefaults(previousCompany());
    const user = await pickOther();
    await screen.findByText('administration.changeCompany.title');

    await user.keyboard('{Escape}');

    await waitFor(() =>
      expect(screen.queryByText('administration.changeCompany.title')).not.toBeInTheDocument(),
    );
    expect(screen.getByText('Old Co', { selector: 'span' })).toBeInTheDocument();
    expect(screen.queryByText('New Co')).not.toBeInTheDocument();
  });

  it('keeping the company that is already selected leaves the "chosen for you" hint as it was', async () => {
    setDefaults(previousCompany());
    const user = await pickOther();
    expect(screen.getByText('administration.previousCompany.hintSelected')).toBeVisible();

    await user.click(await screen.findByText('administration.changeCompany.keepPrevious'));

    await waitFor(() =>
      expect(screen.queryByText('administration.changeCompany.title')).not.toBeInTheDocument(),
    );
    expect(screen.getByText('administration.previousCompany.hintSelected')).toBeVisible();
  });

  it('asks again for a later pick of yet another company: every non-previous pick is asked about', async () => {
    setDefaults(previousCompany());
    const user = await pickOther();
    await user.click(await screen.findByText('administration.changeCompany.confirm'));
    expect(await screen.findByText('New Co', { selector: 'span' })).toBeInTheDocument();

    state.nextPick = { ...state.newCompany, id: 'c-third', companyName: 'Third Co' };
    await user.click(screen.getByText('pick-other-company'));

    expect(await screen.findByText('administration.changeCompany.title')).toBeInTheDocument();
    // Not applied until confirmed.
    expect(screen.queryByText('Third Co', { selector: 'span' })).not.toBeInTheDocument();
    await user.click(screen.getByText('administration.changeCompany.confirm'));
    expect(await screen.findByText('Third Co', { selector: 'span' })).toBeInTheDocument();
    expect(screen.queryByText('New Co')).not.toBeInTheDocument();
  });

  it('does not ask when the company picked is the previous one itself', async () => {
    setDefaults(previousCompany());
    const { user } = render(<AdministrationPage />);
    await screen.findByText('Old Co', { selector: 'span' });

    state.nextPick = state.oldCompany;
    await user.click(screen.getByText('pick-other-company'));

    expect(screen.queryByText('administration.changeCompany.title')).not.toBeInTheDocument();
    expect(screen.getByText('Old Co', { selector: 'span' })).toBeInTheDocument();
  });

  it('cancelling the question leaves the previous company in place', async () => {
    setDefaults(previousCompany());
    const user = await pickOther();

    await user.click(await screen.findByText('administration.changeCompany.keepPrevious'));

    await waitFor(() =>
      expect(screen.queryByText('administration.changeCompany.title')).not.toBeInTheDocument(),
    );
    expect(screen.getByText('Old Co', { selector: 'span' })).toBeInTheDocument();
    expect(screen.queryByText('New Co')).not.toBeInTheDocument();
  });

  it('applies the new company once the change is confirmed', async () => {
    setDefaults(previousCompany());
    const user = await pickOther();

    await user.click(await screen.findByText('administration.changeCompany.confirm'));

    expect(await screen.findByText('New Co', { selector: 'span' })).toBeInTheDocument();
    expect(screen.queryByText('Old Co')).not.toBeInTheDocument();
  });

  it('still asks after the admin cleared the company, then picked another', async () => {
    setDefaults(previousCompany());
    const { user } = render(<AdministrationPage />);
    await screen.findByText('Old Co', { selector: 'span' });
    await user.click(screen.getByRole('button', { name: 'administration.clearSelection' }));
    await waitFor(() => expect(screen.queryByText('Old Co', { selector: 'span' })).toBeNull());

    await user.click(screen.getByText('pick-other-company'));

    expect(await screen.findByText('administration.changeCompany.title')).toBeInTheDocument();
    expect(screen.queryByText('New Co', { selector: 'span' })).not.toBeInTheDocument();
  });

  it('still asks after the admin toggled the type away and back (that clears the company)', async () => {
    setDefaults(previousCompany());
    const { user } = render(<AdministrationPage />);
    await screen.findByText('Old Co', { selector: 'span' });
    await user.click(
      screen.getByRole('radio', { name: /administration\.assignmentType\.internal$/ }),
    );
    await user.click(
      screen.getByRole('radio', { name: /administration\.assignmentType\.external$/ }),
    );
    await user.click(await screen.findByText('pick-other-company'));

    expect(await screen.findByText('administration.changeCompany.title')).toBeInTheDocument();
  });

  it('asks for a saved draft that has another company selected, and "keep" selects the previous one', async () => {
    setDefaults(previousCompany());
    state.assignments = [
      {
        ...draftAssignment,
        assignmentType: 'External',
        assignmentMethod: 'Manual',
        assigneeCompanyId: 'c-new',
      },
    ];
    const { user } = render(<AdministrationPage />);
    await screen.findByText('New Co', { selector: 'span' });

    state.nextPick = { ...state.newCompany, id: 'c-third', companyName: 'Third Co' };
    await user.click(screen.getByText('pick-other-company'));
    expect(await screen.findByText('administration.changeCompany.title')).toBeInTheDocument();

    await user.click(screen.getByText('administration.changeCompany.keepPrevious'));
    expect(await screen.findByText('Old Co', { selector: 'span' })).toBeInTheDocument();
    expect(screen.queryByText('New Co')).not.toBeInTheDocument();
    expect(screen.queryByText('Third Co')).not.toBeInTheDocument();
  });

  it('Escape over an empty selection only drops the pick: nothing is selected', async () => {
    setDefaults(previousCompany());
    state.assignments = [
      { ...draftAssignment, assignmentType: 'External', assignmentMethod: 'Manual' },
    ];
    const { user } = render(<AdministrationPage />);
    await user.click(await screen.findByText('pick-other-company'));
    await screen.findByText('administration.changeCompany.title');

    await user.keyboard('{Escape}');

    await waitFor(() =>
      expect(screen.queryByText('administration.changeCompany.title')).not.toBeInTheDocument(),
    );
    expect(screen.queryByText('Old Co', { selector: 'span' })).not.toBeInTheDocument();
    expect(screen.queryByText('New Co', { selector: 'span' })).not.toBeInTheDocument();
  });

  it('asks again when the previous company is picked back and then left', async () => {
    setDefaults(previousCompany());
    const user = await pickOther();
    await user.click(await screen.findByText('administration.changeCompany.confirm'));
    await screen.findByText('New Co', { selector: 'span' });

    state.nextPick = state.oldCompany;
    await user.click(screen.getByText('pick-other-company'));
    await screen.findByText('Old Co', { selector: 'span' });
    state.nextPick = undefined;
    await user.click(screen.getByText('pick-other-company'));

    expect(await screen.findByText('administration.changeCompany.title')).toBeInTheDocument();
  });

  it('names the base amount the admin set, not the system one, in the question', async () => {
    server.use(
      http.get('*/appraisals/:id/fee-preview', () =>
        HttpResponse.json({ ...feePreview, adminOverrideAmount: 3500 }),
      ),
    );
    setDefaults(previousCompany());
    await pickOther();

    expect(await screen.findByText('administration.changeCompany.feeAdmin')).toBeInTheDocument();
    expect(screen.queryByText('administration.changeCompany.feeKept')).not.toBeInTheDocument();
  });

  it('does not ask when the previous company had no active MOU to offer', async () => {
    setDefaults(previousCompany({ mouActive: false }), {
      assignmentType: 'external',
      assignmentMethod: 'manual',
    });
    const user = userEvent.setup();
    render(<AdministrationPage />);
    await user.click(await screen.findByText('pick-other-company'));

    expect(await screen.findByText('New Co', { selector: 'span' })).toBeInTheDocument();
    expect(screen.queryByText('administration.changeCompany.title')).not.toBeInTheDocument();
  });
});

// ---- The assignment slip and the field errors ---------------------------------------------------

/** The slip is in the right rail and, below 64rem, also as a bar: the DOM has both (no CSS here). */
const bar = () => document.querySelector<HTMLElement>('[data-page-actions]')!;
const slipCard = () =>
  screen.getByText('administration.slip.title').closest<HTMLElement>('.rounded-2xl')!;
const assignButtons = () => screen.getAllByRole('button', { name: 'administration.assign' });
const slipAssign = () => assignButtons().find(button => !bar().contains(button))!;
const barAssign = () => assignButtons().find(button => bar().contains(button))!;

/** EXT / EXTO open the email dialog at Assign; these tests are about the assignment, not the email. */
const assignWithoutEmail = async (user: ReturnType<typeof userEvent.setup>) =>
  user.click(await screen.findByRole('button', { name: 'administration.email.assignWithoutSend' }));

const externalManual = () =>
  setDefaults(null, {
    assignmentType: 'external',
    assignmentMethod: 'manual',
    followupStaffMethod: 'roundrobin',
  });
const externalAuto = () =>
  setDefaults(null, {
    assignmentType: 'external',
    assignmentMethod: 'roundrobin',
    followupStaffMethod: 'roundrobin',
  });

/** The fee preview carries the appraisal fee (feeCode 01), so the slip's fee check is met. */
const withBase = () =>
  server.use(
    http.get('*/appraisals/:id/fee-preview', ({ request }) => {
      state.feePreviewQueries.push(new URL(request.url).searchParams);
      return HttpResponse.json({
        ...feePreview,
        items: [
          {
            id: null,
            feeCode: '01',
            description: 'Appraisal fee',
            amount: 3000,
            source: 'System',
          },
        ],
      });
    }),
  );

describe('AdministrationPage: a missing fee base', () => {
  const noBase = () =>
    server.use(
      http.get('*/appraisals/:id/fee-preview', () =>
        HttpResponse.json({
          ...feePreview,
          systemBaseAmount: null,
          baseSource: { ...feePreview.baseSource, kind: 'None' },
          items: [],
        }),
      ),
    );

  it('blocks Assign with a muted reason until touched, but a draft can still be saved', async () => {
    noBase();
    externalAuto();
    const { user } = render(<AdministrationPage />);

    const reason = await within(slipCard()).findByText('administration.slip.reason.feeMissing');
    expect(reason).toHaveClass('text-(--palette-gray-500)');
    expect(slipAssign()).toBeDisabled();
    expect(barAssign()).toBeDisabled();

    await user.type(screen.getByPlaceholderText('administration.remark.placeholder'), 'x');
    await user.click(within(slipCard()).getByRole('button', { name: 'administration.saveDraft' }));

    await waitFor(() => expect(state.drafted).toHaveLength(1));
  });

  it('"go fix" focuses the control the fee card marks as its fix target, not its first button', async () => {
    state.twoButtonFeeCard = true;
    noBase();
    externalAuto();
    const { user } = render(<AdministrationPage />);

    await user.click(
      await within(slipCard()).findByRole('button', { name: 'administration.slip.checks.fixAria' }),
    );

    expect(await screen.findByText('fix-target-button')).toHaveFocus();
  });

  it('"go fix" turns it red and focuses the fee card\'s Set amount button', async () => {
    state.realFeeCard = true;
    noBase();
    externalAuto();
    const { user } = render(<AdministrationPage />);

    await user.click(
      await within(slipCard()).findByRole('button', { name: 'administration.slip.checks.fixAria' }),
    );

    expect(within(slipCard()).getByText('administration.slip.reason.feeMissing')).toHaveClass(
      'text-(--palette-req)',
    );
    expect(await screen.findByLabelText('feePreview.aria.setBase')).toHaveFocus();
  });
});

describe('AdministrationPage: field errors', () => {
  it('shows no error on load, only the checklist and the reason Assign is off', async () => {
    externalManual();
    render(<AdministrationPage />);
    await screen.findByText('administration.assignmentType.title');

    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    expect(screen.queryByText('validation.selectCompany')).not.toBeInTheDocument();
    expect(within(slipCard()).getByText('administration.slip.checks.companyMissing')).toBeVisible();
  });

  it('a pristine page is neutral: no error marker, a grey count and a grey bar chip', async () => {
    withBase();
    externalManual();
    render(<AdministrationPage />);
    const todo = await within(slipCard()).findByRole('img', {
      name: 'administration.slip.checks.status.todo',
    });

    expect(todo).toBeVisible();
    expect(
      within(slipCard()).queryByRole('img', { name: 'administration.slip.checks.status.error' }),
    ).not.toBeInTheDocument();
    // company todo, follow-up (round-robin) and fee met
    const count = await within(slipCard()).findByText('2 / 3');
    expect(count.parentElement).toHaveClass('text-(--palette-gray-500)');
    expect(count.parentElement).not.toHaveClass('text-(--palette-req)');
    expect(within(bar()).getByText('2 / 3').parentElement).toHaveClass('border-(--palette-line)');
    // The reason Assign is off is there, but muted
    expect(within(slipCard()).getByText('administration.slip.reason.companyMissing')).toHaveClass(
      'text-(--palette-gray-500)',
    );
  });

  it('turns red after the admin touches the company and clears it', async () => {
    withBase();
    externalManual();
    const { user } = render(<AdministrationPage />);
    await user.click(await screen.findByText('pick-other-company'));
    await user.click(await screen.findByRole('button', { name: 'administration.clearSelection' }));

    expect(
      await within(slipCard()).findByRole('img', {
        name: 'administration.slip.checks.status.error',
      }),
    ).toBeVisible();
    expect(within(slipCard()).getByText('2 / 3').parentElement).toHaveClass('text-(--palette-req)');
    expect(within(bar()).getByText('2 / 3').parentElement).toHaveClass(
      'border-(--palette-req-line)',
    );
    expect(within(slipCard()).getByText('administration.slip.reason.companyMissing')).toHaveClass(
      'text-(--palette-req)',
    );
  });

  it('"go fix" shows that field\'s error under its picker and focuses the picker', async () => {
    externalManual();
    const { user } = render(<AdministrationPage />);
    await screen.findByText('administration.assignmentType.title');

    await user.click(
      within(slipCard()).getByRole('button', { name: 'administration.slip.checks.fixAria' }),
    );

    const error = await screen.findByRole('alert');
    expect(error).toHaveTextContent('validation.selectCompany');
    const picker = screen.getByText('administration.manualCompany.placeholder').closest('button')!;
    expect(picker).toHaveFocus();
    expect(picker.parentElement).toContainElement(error);
  });

  it('shows the company error under the picker once the admin clears the company', async () => {
    externalManual();
    const { user } = render(<AdministrationPage />);
    await user.click(await screen.findByText('pick-other-company'));
    await user.click(await screen.findByRole('button', { name: 'administration.clearSelection' }));

    const error = await screen.findByRole('alert');
    expect(error).toHaveTextContent('validation.selectCompany');
    const picker = screen.getByText('administration.manualCompany.placeholder').closest('button')!;
    expect(picker.parentElement).toContainElement(error);
  });

  it('has nothing to fix, and no error, for a complete form', async () => {
    externalAuto();
    render(<AdministrationPage />);
    await screen.findByText('administration.assignmentType.title');

    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /fixAria/ })).not.toBeInTheDocument();
  });
});

describe('AdministrationPage: the slip actions', () => {
  it('disables Assign, with the reason, in both the slip and the bar while incomplete', async () => {
    externalManual();
    render(<AdministrationPage />);
    await screen.findByText('administration.assignmentType.title');

    for (const button of [slipAssign(), barAssign()]) expect(button).toBeDisabled();
    expect(within(slipCard()).getByText('administration.slip.reason.companyMissing')).toBeVisible();
    expect(within(bar()).getByText('administration.slip.reason.companyMissing')).toBeVisible();
  });

  it('posts the assignment from the slip once the form is complete', async () => {
    externalAuto();
    const { user } = render(<AdministrationPage />);
    await screen.findByText('administration.assignmentType.title');
    expect(slipAssign()).toBeEnabled();

    await user.click(slipAssign());
    await assignWithoutEmail(user);

    await waitFor(() => expect(state.posted).toHaveLength(1));
    expect(state.posted[0]).toMatchObject({
      assignmentType: 'External',
      assignmentMethod: 'roundrobin',
      assigneeUserId: null,
      assigneeCompanyId: null,
      internalFollowupAssignmentMethod: 'roundrobin',
      decisionTaken: 'EXT',
      workflowInstanceId: 'W1',
    });
  });

  it('posts the same from the bar', async () => {
    externalAuto();
    const { user } = render(<AdministrationPage />);
    await screen.findByText('administration.assignmentType.title');

    await user.click(barAssign());
    await assignWithoutEmail(user);

    await waitFor(() => expect(state.posted).toHaveLength(1));
  });

  it('saves a draft with the payload the page always sent', async () => {
    externalManual();
    const { user } = render(<AdministrationPage />);
    await user.click(await screen.findByText('pick-other-company'));
    await user.type(screen.getByPlaceholderText('administration.remark.placeholder'), 'note');

    await user.click(within(slipCard()).getByRole('button', { name: 'administration.saveDraft' }));

    await waitFor(() => expect(state.drafted).toHaveLength(1));
    expect(state.drafted[0]).toEqual({
      assignmentType: 'External',
      assigneeUserId: null,
      assigneeCompanyId: 'c-new',
      assignmentMethod: 'manual',
      internalAppraiserId: null,
      internalFollowupAssignmentMethod: 'roundrobin',
      remark: 'note',
    });
  });

  it('explains round-robin with one hint line per choice, not an info box', async () => {
    externalManual();
    const { user } = render(<AdministrationPage />);
    await screen.findByText('administration.assignmentDetails.manualDesc');

    await user.click(screen.getAllByTitle('administration.assignmentDetails.roundrobin')[0]);
    expect(
      await screen.findByText('administration.roundrobinInfo.externalDesc'),
    ).toBeInTheDocument();
    expect(screen.queryByText('administration.assignmentDetails.manualDesc')).toBeNull();
  });

  it('does not save a company left in the form after switching to round-robin', async () => {
    externalManual();
    const { user } = render(<AdministrationPage />);
    await user.click(await screen.findByText('pick-other-company'));
    await screen.findByText('New Co', { selector: 'span' });

    await user.click(screen.getAllByTitle('administration.assignmentDetails.roundrobin')[0]);
    await user.click(within(slipCard()).getByRole('button', { name: 'administration.saveDraft' }));

    await waitFor(() => expect(state.drafted).toHaveLength(1));
    expect(state.drafted[0]).toMatchObject({
      assignmentMethod: 'roundrobin',
      assigneeCompanyId: null,
    });
  });

  it('does not assign a company left in the form after switching to round-robin', async () => {
    externalManual();
    const { user } = render(<AdministrationPage />);
    await user.click(await screen.findByText('pick-other-company'));
    await screen.findByText('New Co', { selector: 'span' });

    await user.click(screen.getAllByTitle('administration.assignmentDetails.roundrobin')[0]);
    await waitFor(() => expect(slipAssign()).toBeEnabled());
    await user.click(slipAssign());
    await assignWithoutEmail(user);

    await waitFor(() => expect(state.posted).toHaveLength(1));
    expect(state.posted[0]).toMatchObject({
      assignmentMethod: 'roundrobin',
      assigneeCompanyId: null,
      assigneeCompanyName: null,
    });
  });

  it('saves an off-system external draft as Offline with no company', async () => {
    setDefaults(null, { assignmentType: 'external-offline', assignmentMethod: 'roundrobin' });
    const { user } = render(<AdministrationPage />);
    await user.type(await screen.findByPlaceholderText('administration.remark.placeholder'), 'x');

    await user.click(within(slipCard()).getByRole('button', { name: 'administration.saveDraft' }));

    await waitFor(() => expect(state.drafted).toHaveLength(1));
    expect(state.drafted[0]).toEqual({
      assignmentType: 'External',
      assigneeUserId: null,
      assigneeCompanyId: null,
      assignmentMethod: 'Offline',
      internalAppraiserId: null,
      internalFollowupAssignmentMethod: null,
      remark: 'x',
    });
  });
});

describe('AdministrationPage: fee totals', () => {
  it('puts the total in the slip and the bar, and none in the fee card', async () => {
    state.realFeeCard = true;
    withBase();
    externalAuto();
    render(<AdministrationPage />);

    const card = (await screen.findByText('feePreview.title')).closest<HTMLElement>(
      '.rounded-2xl',
    )!;
    // The card has loaded its rows (the base amount) ...
    expect(await within(card).findByText('3,000.00')).toBeInTheDocument();
    // ... but carries no total / VAT / subtotal line; the slip and the bar do.
    expect(within(card).queryByText(/3,210/)).not.toBeInTheDocument();
    expect(within(card).queryByText('administration.slip.fee.total')).not.toBeInTheDocument();
    expect(await within(slipCard()).findByText(/3,210\.00/)).toBeInTheDocument();
    expect(within(slipCard()).getByText('administration.slip.fee.total')).toBeInTheDocument();
    expect(within(bar()).getByText(/3,210\.00/)).toBeInTheDocument();
  });
});

describe('AdministrationPage: fee estimate on a read-only page', () => {
  const renderReadOnly = () =>
    render(
      <PageReadOnlyContext.Provider value>
        <AdministrationPage />
      </PageReadOnlyContext.Provider>,
    );

  it('estimates a Pending draft from its own type and method, not from the stored row', async () => {
    state.assignments = [
      { ...draftAssignment, assignmentType: 'External', assignmentMethod: 'Manual' },
    ];
    renderReadOnly();

    await waitFor(() => expect(state.feePreviewQueries.length).toBeGreaterThan(0));
    const query = state.feePreviewQueries[0];
    expect(query.get('assignmentType')).toBe('external');
    expect(query.get('assignmentMethod')).toBe('manual');
  });

  it('asks for the stored fee, with no type or method, once the assignment is made', async () => {
    state.assignments = [
      {
        ...draftAssignment,
        assignmentStatus: 'Assigned',
        assigneeUserId: 'u1',
        draftSavedAt: null,
      },
    ];
    renderReadOnly();

    await waitFor(() => expect(state.feePreviewQueries.length).toBeGreaterThan(0));
    expect(
      state.feePreviewQueries.every(q => !q.has('assignmentType') && !q.has('assignmentMethod')),
    ).toBe(true);
  });
});

describe('AdministrationPage: an assignment that was made', () => {
  const made = {
    ...draftAssignment,
    assignmentStatus: 'Assigned',
    assigneeUserId: 'u1',
    draftSavedAt: null,
    assignedAt: '2026-10-21T09:30:00',
    assignedBy: 'E0001',
    assignedByName: 'Somchai Jaidee',
  };

  it('is read-only: assigned badge, who and when, and no actions', async () => {
    state.assignments = [made];
    state.staff = [
      {
        id: 'u1',
        employeeId: 'E0042',
        name: 'Staff Person',
        email: '',
        department: 'Valuation',
        avatar: null,
        currentWorkload: 1,
      },
    ];
    render(<AdministrationPage />);

    // Read-only keeps no bar, so the slip is there twice: in the rail and (narrow) at the form's end.
    expect(await screen.findAllByText('administration.slip.status.assigned')).toHaveLength(2);
    expect(screen.getByText('administration.readOnlyBanner.assigned')).toBeInTheDocument();
    expect(screen.getAllByText('administration.slip.readOnly.assignedAt')).toHaveLength(2);
    expect(screen.getAllByText('administration.slip.readOnly.assignedBy')).toHaveLength(2);
    expect(screen.queryByRole('button', { name: 'administration.assign' })).not.toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: 'administration.saveDraft' }),
    ).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'common:actions.cancel' })).not.toBeInTheDocument();
    expect(document.querySelector('[data-page-actions]')).toBeNull();
  });
});

describe('AdministrationPage: read-only details', () => {
  const made = {
    ...draftAssignment,
    assignmentStatus: 'Assigned',
    assignmentMethod: 'Manual',
    draftSavedAt: null,
    assignedAt: '2026-10-21T09:30:00',
    assignedBy: 'E0001',
    assignedByName: 'Somchai Jaidee',
  };

  it('shows the stored keyer of an off-system assignment, as the keyer', async () => {
    // A made off-system assignment is stored as External, method 'Offline' (the workflow stamps
    // it), with the keyer as the assignee and no company (made before the admin picked it, #535).
    state.assignments = [
      {
        ...made,
        assignmentType: 'External',
        assignmentMethod: 'Offline',
        assigneeUserId: 'K-0042',
      },
    ];
    render(<AdministrationPage />);

    // Form card + the slip in the rail + the slip at the form's end.
    expect(await screen.findAllByText('K-0042')).toHaveLength(3);
    expect(screen.getAllByText('administration.slip.segment.keyer')).toHaveLength(2);
    // Only the missing company says so (form card + both slips), not the keyer.
    expect(screen.getAllByText('administration.noData')).toHaveLength(3);
  });

  it('shows a made off-system assignment as off-system even once the keyer has recorded its company', async () => {
    // Real rows: the keyer records the company at book key-in, so an Offline row ends up with one.
    state.assignments = [
      {
        ...made,
        assignmentType: 'External',
        assignmentMethod: 'Offline',
        assigneeUserId: 'K-0042',
        assigneeCompanyId: 'c-old',
      },
    ];
    render(<AdministrationPage />);

    expect(await screen.findAllByText('K-0042')).toHaveLength(3);
    expect(screen.getAllByText('administration.slip.segment.keyer')).toHaveLength(2);
    expect(screen.getByText('administration.offlineExternal.title')).toBeInTheDocument();
    expect(screen.queryByText('administration.assignmentDetails.titleExternal')).toBeNull();
  });

  it('says there is no data, not an empty picker, when nothing was stored', async () => {
    state.assignments = [{ ...made, assignmentType: 'Internal', assigneeUserId: null }];
    render(<AdministrationPage />);

    expect((await screen.findAllByText('administration.noData')).length).toBeGreaterThan(0);
    expect(screen.queryByText('administration.manualStaff.placeholder')).not.toBeInTheDocument();
  });

  it('writes a person as "Name (code)" when the record carries the name, the code alone otherwise', async () => {
    state.assignments = [
      {
        ...made,
        assignmentType: 'Internal',
        assigneeUserId: 'int.staff1',
        internalAppraiserId: null,
      },
    ];
    const { unmount } = render(<AdministrationPage />);
    expect((await screen.findAllByText('int.staff1')).length).toBeGreaterThanOrEqual(2);
    unmount();

    state.assignments = [
      {
        ...made,
        assignmentType: 'Internal',
        assigneeUserId: 'int.staff1',
        assigneeUserName: 'Somying Rakngan',
      },
    ];
    render(<AdministrationPage />);
    expect(
      (await screen.findAllByText('Somying Rakngan (int.staff1)')).length,
    ).toBeGreaterThanOrEqual(2);
  });

  it('lets the admin remove a stored assignee the lookup cannot resolve, on a draft only', async () => {
    const draft = {
      ...made,
      assignmentType: 'Internal',
      assignmentMethod: 'Manual',
      assigneeUserId: 'int.staff1',
      assignmentStatus: 'Pending',
      assignedAt: null,
      draftSavedAt: '2026-10-20T10:00:00',
    };
    state.assignments = [draft];
    const { user, unmount } = render(<AdministrationPage />);
    expect((await screen.findAllByText('int.staff1')).length).toBeGreaterThanOrEqual(1);

    await user.click(screen.getByRole('button', { name: 'administration.clearSelection' }));

    expect(await screen.findByText('administration.manualStaff.placeholder')).toBeInTheDocument();
    expect(screen.queryByText('int.staff1')).not.toBeInTheDocument();
    unmount();

    // Already assigned: read-only, so the code is shown with no way to clear it.
    state.assignments = [{ ...made, assignmentType: 'Internal', assigneeUserId: 'int.staff1' }];
    render(<AdministrationPage />);
    expect((await screen.findAllByText('int.staff1')).length).toBeGreaterThanOrEqual(1);
    expect(
      screen.queryByRole('button', { name: 'administration.clearSelection' }),
    ).not.toBeInTheDocument();
  });

  describe('follow-up, keyer and assignee are "Name (code)", from the assignment record', () => {
    const external = {
      ...made,
      assignmentType: 'External',
      assigneeCompanyId: 'c-old',
      assigneeUserId: null,
      internalAppraiserId: 'int.staff2',
      internalFollowupAssignmentMethod: 'manual',
    };

    it('follow-up: the name from internalAppraiserName', async () => {
      state.assignments = [{ ...external, internalAppraiserName: 'Staff Name' }];
      render(<AdministrationPage />);

      // Form card + the slip in the rail + the slip at the form's end.
      expect(await screen.findAllByText('Staff Name (int.staff2)')).toHaveLength(3);
      expect(screen.queryByText('int.staff2')).not.toBeInTheDocument();
    });

    it('follow-up: the code alone when the record carries no name', async () => {
      state.assignments = [{ ...external, internalAppraiserName: null }];
      render(<AdministrationPage />);

      expect(await screen.findAllByText('int.staff2')).toHaveLength(3);
      expect(screen.queryByText(/\(int\.staff2\)/)).not.toBeInTheDocument();
    });

    it('off-system keyer: the name from assigneeUserName', async () => {
      state.assignments = [
        {
          ...made,
          assignmentType: 'External',
          assignmentMethod: 'Offline',
          assigneeUserId: 'K-0042',
          assigneeUserName: 'Keyer Name',
        },
      ];
      render(<AdministrationPage />);

      expect(await screen.findAllByText('Keyer Name (K-0042)')).toHaveLength(3);
      expect(screen.queryByText('K-0042')).not.toBeInTheDocument();
    });

    it('assignee: the name from assigneeUserName, in the form and both slips', async () => {
      state.assignments = [
        {
          ...made,
          assignmentType: 'Internal',
          assigneeUserId: 'int.staff1',
          assigneeUserName: 'Somying Rakngan',
        },
      ];
      render(<AdministrationPage />);

      expect(await screen.findAllByText('Somying Rakngan (int.staff1)')).toHaveLength(3);
    });

    it('draft: assignee and follow-up the lookup cannot resolve keep their stored names', async () => {
      state.assignments = [
        {
          ...external,
          assignmentStatus: 'Pending',
          assignedAt: null,
          draftSavedAt: '2026-10-20T10:00:00',
          assigneeUserId: null,
          internalAppraiserName: 'Staff Name',
        },
      ];
      render(<AdministrationPage />);

      // The follow-up pick: the form's stored-code card + the slip.
      expect(await screen.findAllByText('Staff Name (int.staff2)')).toHaveLength(2);
    });
  });

  it('shows the stored remark as plain text, with no textbox', async () => {
    state.assignments = [{ ...made, assigneeUserId: 'u1', remark: 'Please call first' }];
    render(<AdministrationPage />);

    expect(await screen.findByText('Please call first')).toBeInTheDocument();
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
    expect(screen.queryByText('administration.remark.empty')).not.toBeInTheDocument();
  });

  it('says there is no remark when none was stored', async () => {
    state.assignments = [{ ...made, assigneeUserId: 'u1', remark: '   ' }];
    render(<AdministrationPage />);

    expect(await screen.findByText('administration.remark.empty')).toBeInTheDocument();
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
  });
});

describe('AdministrationPage: a stored staff code the lookup cannot resolve', () => {
  // The eligible-staff pool (state.staff) is empty, so neither id below resolves to a person.
  const made = {
    ...draftAssignment,
    assignmentStatus: 'Assigned',
    assignmentMethod: 'Manual',
    assigneeUserId: 'U-GONE',
    draftSavedAt: null,
    assignedAt: '2026-10-21T09:30:00',
    assignedBy: 'E0001',
    assignedByName: 'Somchai Jaidee',
  };

  it('read-only: shows the stored code in the form and in both slips, not "not selected"', async () => {
    state.assignments = [made];
    render(<AdministrationPage />);

    // Form card + the slip in the rail + the slip at the form's end.
    expect(await screen.findAllByText('U-GONE')).toHaveLength(3);
    expect(screen.queryByText('administration.slip.notSelected')).not.toBeInTheDocument();
    expect(screen.queryByText('administration.manualStaff.placeholder')).not.toBeInTheDocument();
    // Read-only: no way to change it.
    expect(
      screen.queryByRole('button', { name: 'administration.changeStaff' }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: 'administration.clearSelection' }),
    ).not.toBeInTheDocument();
  });

  it('read-only: a stored company id that does not resolve shows in the form and both slips, with no Change or clear', async () => {
    state.assignments = [
      { ...made, assignmentType: 'External', assigneeUserId: null, assigneeCompanyId: 'c-gone' },
    ];
    render(<AdministrationPage />);

    // Form card + the slip in the rail + the slip at the form's end.
    expect(await screen.findAllByText('c-gone')).toHaveLength(3);
    expect(screen.queryByText('administration.slip.notSelected')).not.toBeInTheDocument();
    expect(screen.queryByText('administration.manualCompany.placeholder')).not.toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: 'administration.changeStaff' }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: 'administration.clearSelection' }),
    ).not.toBeInTheDocument();
  });

  it('draft: the stored code can be cleared, which brings the picker back', async () => {
    state.assignments = [
      {
        ...made,
        assignmentStatus: 'Pending',
        assignedAt: null,
        draftSavedAt: '2026-10-20T10:00:00',
      },
    ];
    const { user } = render(<AdministrationPage />);
    await screen.findAllByText('U-GONE');

    await user.click(screen.getByRole('button', { name: 'administration.clearSelection' }));

    expect(await screen.findByText('administration.manualStaff.placeholder')).toBeInTheDocument();
    expect(screen.queryByText('U-GONE')).not.toBeInTheDocument();
  });

  it('draft: shows the stored code with a Change button, and the slip names it', async () => {
    state.assignments = [
      {
        ...made,
        assignmentStatus: 'Pending',
        assignedAt: null,
        draftSavedAt: '2026-10-20T10:00:00',
      },
    ];
    render(<AdministrationPage />);

    expect(await screen.findAllByText('U-GONE')).toHaveLength(2);
    expect(screen.getByRole('button', { name: 'administration.changeStaff' })).toBeInTheDocument();
    expect(within(slipCard()).getByText('U-GONE')).toBeInTheDocument();
    expect(screen.queryByText('administration.manualStaff.placeholder')).not.toBeInTheDocument();
    expect(
      within(slipCard()).queryByText('administration.slip.notSelected'),
    ).not.toBeInTheDocument();
  });

  it('draft: a stored company id that does not resolve is shown in the form and the slip, with Change and clear', async () => {
    state.assignments = [
      {
        ...draftAssignment,
        assignmentType: 'External',
        assignmentMethod: 'Manual',
        assigneeCompanyId: 'c-gone',
        // Follow-up by round-robin, so the only "not selected" the slip could show is the company's.
        internalFollowupAssignmentMethod: 'roundrobin',
      },
    ];
    const { user } = render(<AdministrationPage />);

    expect(await screen.findAllByText('c-gone')).toHaveLength(2);
    expect(
      within(slipCard()).queryByText('administration.slip.notSelected'),
    ).not.toBeInTheDocument();
    // The company's own wording, not the staff one.
    expect(
      screen.getByRole('button', { name: 'administration.changeCompanyButton' }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: 'administration.changeStaff' }),
    ).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'administration.clearSelection' }));

    expect(await screen.findByText('administration.manualCompany.placeholder')).toBeInTheDocument();
    expect(screen.queryByText('c-gone')).not.toBeInTheDocument();
  });

  it('draft: re-picking the stored company whose record was missing fills the record in', async () => {
    state.assignments = [
      {
        ...draftAssignment,
        assignmentType: 'External',
        assignmentMethod: 'Manual',
        assigneeCompanyId: 'c-gone',
        internalFollowupAssignmentMethod: 'roundrobin',
      },
    ];
    state.nextPick = { ...state.newCompany, id: 'c-gone', companyName: 'Gone Co' };
    const { user } = render(<AdministrationPage />);
    await screen.findAllByText('c-gone');

    await user.click(screen.getByText('pick-other-company'));

    expect(await screen.findByText('Gone Co', { selector: 'span' })).toBeInTheDocument();
    expect(screen.queryByText('administration.changeCompany.title')).not.toBeInTheDocument();
  });

  it('draft: the follow-up staff code shows in the form and in the slip', async () => {
    state.assignments = [
      {
        ...draftAssignment,
        assignmentType: 'External',
        assignmentMethod: 'Manual',
        assigneeCompanyId: 'c-old',
        internalAppraiserId: 'F-GONE',
        internalFollowupAssignmentMethod: 'manual',
      },
    ];
    render(<AdministrationPage />);

    expect(await screen.findAllByText('F-GONE')).toHaveLength(2);
    expect(screen.queryByText('administration.followupStaff.placeholder')).not.toBeInTheDocument();
    expect(within(slipCard()).getByText('F-GONE')).toBeInTheDocument();
  });
});

describe('AdministrationPage: why Assign is off, per type', () => {
  it('internal manual without staff says staffMissing in the slip and the bar', async () => {
    setDefaults(null, { assignmentType: 'internal', assignmentMethod: 'manual' });
    render(<AdministrationPage />);
    await screen.findByText('administration.assignmentType.title');

    expect(within(slipCard()).getByText('administration.slip.reason.staffMissing')).toBeVisible();
    expect(within(bar()).getByText('administration.slip.reason.staffMissing')).toBeVisible();
    expect(screen.queryByText('administration.slip.reason.companyMissing')).not.toBeInTheDocument();
  });

  it('external by quotation without a finalized winner says quotationNotFinalized', async () => {
    setDefaults(null, {
      assignmentType: 'external',
      assignmentMethod: 'quotation',
      followupStaffMethod: 'roundrobin',
    });
    render(<AdministrationPage />);
    await screen.findByText('administration.assignmentType.title');

    expect(
      within(slipCard()).getByText('administration.slip.reason.quotationNotFinalized'),
    ).toBeVisible();
    expect(slipAssign()).toBeDisabled();
    // Two quotation steps still to do: a grey count and a grey bar chip, no amber.
    expect(within(slipCard()).getByText('1 / 3').parentElement).toHaveClass(
      'text-(--palette-gray-500)',
    );
    expect(within(bar()).getByText('1 / 3').parentElement).toHaveClass('border-(--palette-line)');
  });
});

describe('AdministrationPage: one quotation for the lock, the winner and the slip', () => {
  const row = (id: string, status: string, requestDate: string) => ({
    id,
    quotationNumber: `QT-${id}`,
    status,
    requestDate,
    selectedAt: status === 'Finalized' ? '2026-10-05T00:00:00Z' : null,
  });
  const finalizedDetail = {
    status: 'Finalized',
    tentativeWinnerQuotationId: 'CQ1',
    companyQuotations: [{ id: 'CQ1', companyId: 'c-old', companyName: 'Old Co' }],
  };
  const byQuotation = () =>
    setDefaults(null, {
      assignmentType: 'external',
      assignmentMethod: 'quotation',
      followupStaffMethod: 'roundrobin',
    });

  it('a newer Cancelled quotation over an older Finalized one: the Finalized winner is usable and nothing is locked', async () => {
    state.none = [row('CANC', 'Cancelled', '2026-10-20'), row('FIN', 'Finalized', '2026-10-01')];
    state.quotationDetails = { FIN: finalizedDetail, CANC: { status: 'Cancelled' } };
    withBase();
    byQuotation();
    render(<AdministrationPage />);
    await screen.findByText('administration.assignmentType.title');

    await waitFor(() => expect(slipAssign()).toBeEnabled());
    expect(screen.queryByText('administration.assignmentLocked')).not.toBeInTheDocument();
    expect(
      screen.queryByText('administration.slip.reason.quotationNotFinalized'),
    ).not.toBeInTheDocument();
  });

  it('names the winner on the slip by the data language, like every other company name', async () => {
    state.none = [row('FIN', 'Finalized', '2026-10-01')];
    state.quotationDetails = {
      FIN: {
        ...finalizedDetail,
        companyQuotations: [
          { id: 'CQ1', companyId: 'c-old', companyName: 'Old Co', companyNameLocal: 'บริษัท เก่า' },
        ],
      },
    };
    withBase();
    byQuotation();
    useLocaleStore.setState({ language: 'th' });
    try {
      render(<AdministrationPage />);
      await screen.findByText('administration.assignmentType.title');

      expect(await within(slipCard()).findByText('บริษัท เก่า')).toBeVisible();
      expect(within(slipCard()).queryByText('Old Co')).not.toBeInTheDocument();
    } finally {
      useLocaleStore.setState({ language: 'en' });
    }
  });

  it('only Cancelled quotations: no winner, not locked', async () => {
    state.none = [row('CANC', 'Cancelled', '2026-10-20')];
    state.quotationDetails = { CANC: { status: 'Cancelled' } };
    withBase();
    byQuotation();
    render(<AdministrationPage />);
    await screen.findByText('administration.assignmentType.title');

    expect(
      within(slipCard()).getByText('administration.slip.reason.quotationNotFinalized'),
    ).toBeVisible();
    expect(slipAssign()).toBeDisabled();
    expect(screen.queryByText('administration.assignmentLocked')).not.toBeInTheDocument();
  });

  it('an older open quotation under a newer Cancelled one locks the page', async () => {
    state.none = [row('CANC', 'Cancelled', '2026-10-20'), row('SENT', 'Sent', '2026-10-01')];
    byQuotation();
    render(<AdministrationPage />);

    expect(await screen.findByText('administration.assignmentLocked')).toBeVisible();
    expect(slipAssign()).toBeDisabled();
  });

  it('re-reads a fee preview that still waits for a winner once the quotation is Finalized, never calling the fee missing meanwhile', async () => {
    state.none = [row('FIN', 'Finalized', '2026-10-01')];
    state.quotationDetails = { FIN: finalizedDetail };
    let reads = 0;
    let release!: () => void;
    const secondReadGate = new Promise<void>(resolve => (release = resolve));
    server.use(
      http.get('*/appraisals/:id/fee-preview', async () => {
        reads += 1;
        if (reads > 1) await secondReadGate; // hold the re-read so the in-between state is observable
        // The cached answer predates the finalize: still waiting for a winner, no base.
        return HttpResponse.json(
          reads === 1
            ? {
                ...feePreview,
                items: [],
                hasBillableBase: false,
                baseSource: { ...feePreview.baseSource, kind: 'QuotationPending' },
              }
            : feePreview,
        );
      }),
    );
    byQuotation();
    render(<AdministrationPage />);
    await screen.findByText('administration.assignmentType.title');

    await waitFor(() => expect(reads).toBe(2));
    // While the re-read is in flight the stale answer is on screen: the fee is not called missing.
    expect(screen.queryByText('administration.slip.reason.feeMissing')).not.toBeInTheDocument();
    release();
    await waitFor(() => expect(slipAssign()).toBeEnabled());
    expect(screen.queryByText('administration.slip.reason.feeMissing')).not.toBeInTheDocument();
  });

  it('the Finalized quotation shown is the winner, so Assign opens', async () => {
    state.none = [row('FIN', 'Finalized', '2026-10-01')];
    state.quotationDetails = { FIN: finalizedDetail };
    withBase();
    byQuotation();
    render(<AdministrationPage />);
    await screen.findByText('administration.assignmentType.title');

    await waitFor(() => expect(slipAssign()).toBeEnabled());
    expect(screen.queryByText('administration.assignmentLocked')).not.toBeInTheDocument();
    expect(
      screen.queryByText('administration.slip.reason.quotationNotFinalized'),
    ).not.toBeInTheDocument();
  });
});

describe('AdministrationPage: a Finalized winner with no billable base', () => {
  it('blocks Assign with the missing-fee reason instead of waiting for a winner', async () => {
    state.none = [
      {
        id: 'FIN',
        quotationNumber: 'QT-FIN',
        status: 'Finalized',
        requestDate: '2026-10-01',
        selectedAt: '2026-10-05T00:00:00Z',
      },
    ];
    state.quotationDetails = {
      FIN: {
        status: 'Finalized',
        tentativeWinnerQuotationId: 'CQ1',
        companyQuotations: [{ id: 'CQ1', companyId: 'c-old', companyName: 'Old Co' }],
      },
    };
    server.use(
      http.get('*/appraisals/:id/fee-preview', () =>
        HttpResponse.json({
          ...feePreview,
          systemBaseAmount: null,
          baseSource: { ...feePreview.baseSource, kind: 'QuotationPending' },
          items: [],
          hasBillableBase: false,
        }),
      ),
    );
    setDefaults(null, {
      assignmentType: 'external',
      assignmentMethod: 'quotation',
      followupStaffMethod: 'roundrobin',
    });
    render(<AdministrationPage />);

    expect(
      await within(slipCard()).findByText('administration.slip.reason.feeMissing'),
    ).toBeVisible();
    expect(slipAssign()).toBeDisabled();
  });
});

describe('AdministrationPage: the fee card and fee requests', () => {
  const editBase = () => screen.queryByLabelText('feePreview.aria.editBase');

  it('is editable for the task owner of an open workflow task', async () => {
    state.realFeeCard = true;
    withBase();
    externalAuto();
    render(<AdministrationPage />);

    expect(await screen.findByLabelText('feePreview.aria.editBase')).toBeInTheDocument();
    expect(screen.getByText('+ fee.addFee')).toBeInTheDocument();
  });

  it('is read-only for someone who does not own the task', async () => {
    state.realFeeCard = true;
    state.taskOwner = false;
    withBase();
    externalAuto();
    render(<AdministrationPage />);

    expect(await screen.findByText('3,000.00')).toBeInTheDocument();
    expect(editBase()).not.toBeInTheDocument();
    expect(screen.queryByText('+ fee.addFee')).not.toBeInTheDocument();
  });

  it('is read-only with no workflow task, even for the owner', async () => {
    state.realFeeCard = true;
    state.workflowInstanceId = null;
    withBase();
    externalAuto();
    render(<AdministrationPage />);

    expect(await screen.findByText('3,000.00')).toBeInTheDocument();
    expect(editBase()).not.toBeInTheDocument();
  });

  it('does not read the appraisal fees on load', async () => {
    state.realFeeCard = true;
    withBase();
    externalAuto();
    render(<AdministrationPage />);

    expect(await screen.findByLabelText('feePreview.aria.editBase')).toBeInTheDocument();
    expect(state.feePreviewQueries.length).toBeGreaterThan(0);
    expect(state.feesReads).toBe(0);
  });

  it('never sends a company to the fee preview, even for a stored one still loading', async () => {
    state.companyLoading = true;
    state.assignments = [
      {
        ...draftAssignment,
        assignmentType: 'External',
        assignmentMethod: 'Manual',
        assigneeCompanyId: 'c-old',
      },
    ];
    render(<AdministrationPage />);

    await waitFor(() => expect(state.feePreviewQueries.length).toBeGreaterThan(0));
    expect(state.feePreviewQueries.every(q => !q.has('companyId'))).toBe(true);
  });

  it('does not ask for the fee again when a different company is picked', async () => {
    externalManual();
    const { user } = render(<AdministrationPage />);
    await waitFor(() => expect(state.feePreviewQueries).toHaveLength(1));

    await user.click(await screen.findByText('pick-other-company'));
    expect(await screen.findByText('New Co', { selector: 'span' })).toBeInTheDocument();
    // Pick again: a second company, still no new request (a request would be in flight by now).
    state.nextPick = { ...state.newCompany, id: 'c-third', companyName: 'Third Co' };
    await user.click(screen.getByText('pick-other-company'));
    expect(await screen.findByText('Third Co', { selector: 'span' })).toBeInTheDocument();

    expect(state.feePreviewQueries).toHaveLength(1);
  });

  it("claims no fee in the slip while the previous selection's figures are still on screen", async () => {
    withBase();
    externalAuto();
    // The fee for the manual method answers only when released; the auto one at once.
    let release!: () => void;
    const gate = new Promise<void>(resolve => (release = resolve));
    server.use(
      http.get('*/appraisals/:id/fee-preview', async ({ request }) => {
        const method = new URL(request.url).searchParams.get('assignmentMethod');
        if (method === 'manual') await gate;
        return HttpResponse.json({
          ...feePreview,
          items: [
            {
              id: null,
              feeCode: '01',
              description: 'Appraisal fee',
              amount: 3000,
              source: 'System',
            },
          ],
        });
      }),
    );
    const { user } = render(<AdministrationPage />);
    expect(await within(slipCard()).findByText(/3,210\.00/)).toBeInTheDocument();
    expect(within(slipCard()).getByText('administration.slip.checks.feeOk')).toBeInTheDocument();

    // The assignment method's Manual radio comes first in the page; the follow-up staff's is below it.
    await user.click(screen.getAllByTitle('administration.assignmentDetails.manual')[0]);

    // The old figures are still what the query holds, but the slip stops claiming them.
    await waitFor(() =>
      expect(within(slipCard()).queryByText(/3,210\.00/)).not.toBeInTheDocument(),
    );
    expect(within(slipCard()).getByText('—')).toBeInTheDocument();
    expect(within(slipCard()).queryByText('administration.slip.checks.feeOk')).toBeNull();
    expect(within(slipCard()).queryByText('administration.slip.checks.feeMissing')).toBeNull();

    release();
    expect(await within(slipCard()).findByText(/3,210\.00/)).toBeInTheDocument();
    expect(within(slipCard()).getByText('administration.slip.checks.feeOk')).toBeInTheDocument();
  });
});

describe('AdministrationPage: Assign with a form the schema rejects', () => {
  it('says so in a toast instead of doing nothing', async () => {
    const error = vi.spyOn(toast, 'error').mockImplementation(() => '');
    externalManual();
    // A company with a field the schema requires missing: the slip's checklist is satisfied (a
    // company id is set), only the schema objects.
    state.nextPick = { ...state.newCompany, registrationNo: null };
    const { user } = render(<AdministrationPage />);
    await user.click(await screen.findByText('pick-other-company'));
    await waitFor(() => expect(slipAssign()).toBeEnabled());

    await user.click(slipAssign());

    await waitFor(() => expect(error).toHaveBeenCalledWith('administration.toasts.selectAssignee'));
    expect(state.posted).toHaveLength(0);
    error.mockRestore();
  });
});

describe('AdministrationPage: Assign refused by the server', () => {
  const assignRefusedWith = async (body: Record<string, unknown>) => {
    const error = vi.spyOn(toast, 'error').mockImplementation(() => '');
    server.use(
      http.post('*/appraisals/:id/assignments', () =>
        HttpResponse.json({ status: 400, ...body }, { status: 400 }),
      ),
    );
    // Internal: no email dialog, so the refusal is a toast (the dialog shows it for EXT / EXTO).
    setDefaults(null, { assignmentType: 'internal', assignmentMethod: 'roundrobin' });
    const { user } = render(<AdministrationPage />);
    await screen.findByText('administration.assignmentType.title');
    await waitFor(() => expect(slipAssign()).toBeEnabled());
    await user.click(slipAssign());
    return error;
  };

  it('shows the translated message for FeeBaseMissing, not the English detail', async () => {
    const error = await assignRefusedWith({
      errorCode: 'FeeBaseMissing',
      detail: 'English server detail',
    });

    await waitFor(() =>
      expect(error).toHaveBeenCalledWith('administration.slip.reason.feeMissing'),
    );
    expect(error).not.toHaveBeenCalledWith('English server detail');
    error.mockRestore();
  });

  it('shows the server detail for any other error', async () => {
    const error = await assignRefusedWith({ errorCode: 'SomethingElse', detail: 'Other detail' });

    await waitFor(() => expect(error).toHaveBeenCalledWith('Other detail'));
    expect(error).not.toHaveBeenCalledWith('administration.slip.reason.feeMissing');
    error.mockRestore();
  });
});

describe('AdministrationPage: the email to the company at Assign', () => {
  const openEmail = async () => {
    externalAuto();
    const view = render(<AdministrationPage />);
    await screen.findByText('administration.assignmentType.title');
    await waitFor(() => expect(slipAssign()).toBeEnabled());
    await view.user.click(slipAssign());
    await screen.findByRole('button', { name: 'administration.email.assignAndSend' });
    return view;
  };

  it('saves the assignment draft before it reads the email, and assigns nothing yet', async () => {
    await openEmail();

    expect(state.calls).toEqual(['draft', 'preview']);
    expect(state.drafted[0]).toMatchObject({ assignmentType: 'External' });
    expect(state.posted).toEqual([]);
  });

  it('assigns with the email when sent', async () => {
    const { user } = await openEmail();

    await user.click(screen.getByRole('button', { name: 'administration.email.assignAndSend' }));

    await waitFor(() => expect(state.posted).toHaveLength(1));
    expect(state.posted[0]).toMatchObject({
      decisionTaken: 'EXT',
      sendEmail: true,
      email: {
        extraTo: [],
        cc: ['IntAdminAll'],
        subject: 'ขอนำส่งงานประเมิน',
        bodyHtml: '<p>เรียน {{company}}</p>',
        attachments: [],
      },
    });
  });

  it('assigns without the email', async () => {
    const { user } = await openEmail();

    await assignWithoutEmail(user);

    await waitFor(() => expect(state.posted).toHaveLength(1));
    expect(state.posted[0]).toMatchObject({ decisionTaken: 'EXT', sendEmail: false });
    expect(state.posted[0]).not.toHaveProperty('email');
  });

  it('keeps the dialog open with the reason when the server refuses the email', async () => {
    const error = vi.spyOn(toast, 'error').mockImplementation(() => '');
    server.use(
      http.post('*/appraisals/:id/assignments', () =>
        HttpResponse.json({ status: 400, detail: 'Attachments exceed 10 MB.' }, { status: 400 }),
      ),
    );
    const { user } = await openEmail();

    await user.click(screen.getByRole('button', { name: 'administration.email.assignAndSend' }));

    expect(await screen.findByText('Attachments exceed 10 MB.')).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'administration.email.assignAndSend' }),
    ).toBeEnabled();
    error.mockRestore();
  });

  it('opens for an off-system external assignment too, with its company saved first', async () => {
    withBase();
    setDefaults(null, { assignmentType: 'external-offline', assignmentMethod: 'roundrobin' });
    const { user } = render(<AdministrationPage />);
    await user.click(await screen.findByText('pick-other-company'));
    await waitFor(() => expect(slipAssign()).toBeEnabled());

    await user.click(slipAssign());
    await assignWithoutEmail(user);

    await waitFor(() => expect(state.posted).toHaveLength(1));
    expect(state.drafted[0]).toMatchObject({
      assignmentMethod: 'Offline',
      assigneeCompanyId: 'c-new',
    });
    expect(state.posted[0]).toMatchObject({ decisionTaken: 'EXTO', sendEmail: false });
  });

  it('assigns an internal appraisal straight away, with no email', async () => {
    setDefaults(null, { assignmentType: 'internal', assignmentMethod: 'roundrobin' });
    const { user } = render(<AdministrationPage />);
    await screen.findByText('administration.assignmentType.title');
    await waitFor(() => expect(slipAssign()).toBeEnabled());

    await user.click(slipAssign());

    await waitFor(() => expect(state.posted).toHaveLength(1));
    expect(state.posted[0]).toMatchObject({ decisionTaken: 'INT' });
    expect(state.posted[0]).not.toHaveProperty('sendEmail');
    expect(state.calls).toEqual([]);
  });
});

describe('AdministrationPage: Enter inside the quotation section', () => {
  beforeEach(() =>
    setDefaults(null, {
      assignmentType: 'external',
      assignmentMethod: 'quotation',
      followupStaffMethod: 'roundrobin',
    }),
  );

  it('has no form around the section, so Enter in its text fields cannot submit the page', async () => {
    render(<AdministrationPage />);
    const input = await screen.findByLabelText('quotation-input');
    const notes = screen.getByLabelText('quotation-notes');

    expect(input.closest('form')).toBeNull();
    expect(notes.closest('form')).toBeNull();
    expect(document.querySelector('form')).toBeNull();
    // Enter is left alone everywhere (fireEvent returns false when the default was prevented).
    expect(fireEvent.keyDown(input, { key: 'Enter' })).toBe(true);
    expect(fireEvent.keyDown(notes, { key: 'Enter' })).toBe(true);
  });
});

describe('AdministrationPage: Enter in the remarks', () => {
  it('in the remarks textarea writes no assignment and no draft', async () => {
    withBase();
    externalAuto();
    const { user } = render(<AdministrationPage />);
    const remarks = await screen.findByPlaceholderText('administration.remark.placeholder');

    await user.type(remarks, 'call first{Enter}second line');
    await new Promise(r => setTimeout(r, 100));

    expect(state.posted).toEqual([]);
    expect(state.drafted).toEqual([]);
  });
});

describe('AdministrationPage: another appraisal on the same page', () => {
  it('starts the next appraisal with no field marked as touched', async () => {
    externalManual();
    const { user, rerender } = render(<AdministrationPage />);
    await user.click(await screen.findByText('pick-other-company'));
    await user.click(await screen.findByRole('button', { name: 'administration.clearSelection' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('validation.selectCompany');

    state.appraisalId = 'A2';
    rerender(<AdministrationPage />);

    await screen.findByText('administration.assignmentType.title');
    await waitFor(() =>
      expect(
        within(slipCard()).getByText('administration.slip.reason.companyMissing'),
      ).toBeVisible(),
    );
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    expect(within(slipCard()).getByText('administration.slip.reason.companyMissing')).toHaveClass(
      'text-(--palette-gray-500)',
    );
  });
});

describe('AdministrationPage: the watched fields drive the form', () => {
  const person = {
    id: 'f1',
    employeeId: 'E1',
    name: 'Follow Person',
    email: '',
    department: 'Dept',
    avatar: null,
    currentWorkload: 0,
  };
  // The groups in page order: type, method, then the follow-up method (external only).
  const methodGroup = () =>
    screen.getByRole('radiogroup', { name: 'administration.assignmentDetails.methodLabel' });
  const methodRadio = (name: 'manual' | 'roundrobin') =>
    within(methodGroup()).getByRole('radio', {
      name: new RegExp(`administration\\.assignmentDetails\\.${name}`),
    });
  const typeRadio = (name: string) =>
    screen.getByRole('radio', { name: new RegExp(`administration\\.assignmentType\\.${name}$`) });

  it('seeds a saved external draft into every field, and the draft saves back unchanged', async () => {
    state.staff = [person];
    state.assignments = [
      {
        ...draftAssignment,
        assignmentType: 'External',
        assignmentMethod: 'Manual',
        assigneeCompanyId: 'c-old',
        internalAppraiserId: 'f1',
        internalFollowupAssignmentMethod: 'manual',
        remark: 'kept note',
      },
    ];
    const { user } = render(<AdministrationPage />);

    // type, method, company, follow-up staff and remark all reach the page from the one reset
    expect(await screen.findByText('Old Co', { selector: 'span' })).toBeInTheDocument();
    expect(typeRadio('external')).toBeChecked();
    expect(methodRadio('manual')).toBeChecked();
    expect(screen.getAllByText('Follow Person (E1)').length).toBeGreaterThan(0);
    expect(screen.getByPlaceholderText('administration.remark.placeholder')).toHaveValue(
      'kept note',
    );

    // The slip offers Save draft once something changed: add one character to the note.
    await user.type(screen.getByPlaceholderText('administration.remark.placeholder'), '!');
    await user.click(within(slipCard()).getByRole('button', { name: 'administration.saveDraft' }));

    await waitFor(() => expect(state.drafted).toHaveLength(1));
    expect(state.drafted[0]).toEqual({
      assignmentType: 'External',
      assigneeUserId: null,
      assigneeCompanyId: 'c-old',
      assignmentMethod: 'manual',
      internalAppraiserId: 'f1',
      internalFollowupAssignmentMethod: 'manual',
      remark: 'kept note!',
    });
  });

  it('switching the type clears the company and follow-up picks and puts the method back to manual', async () => {
    state.staff = [person];
    setDefaults(previousCompany(), { assignmentType: 'external', assignmentMethod: 'roundrobin' });
    const { user } = render(<AdministrationPage />);
    // The previous company is preselected on a fresh row, over the round-robin default.
    await screen.findByText('Old Co', { selector: 'span' });
    await user.click(methodRadio('roundrobin'));
    expect(methodRadio('roundrobin')).toBeChecked();

    await user.click(typeRadio('internal'));

    expect(await screen.findByText('administration.manualStaff.placeholder')).toBeInTheDocument();
    expect(methodRadio('manual')).toBeChecked();
    expect(screen.queryByText('Old Co', { selector: 'span' })).not.toBeInTheDocument();

    await user.click(typeRadio('external'));

    expect(await screen.findByText('administration.manualCompany.placeholder')).toBeInTheDocument();
    expect(methodRadio('manual')).toBeChecked();
    expect(screen.queryByText('Old Co', { selector: 'span' })).not.toBeInTheDocument();
  });

  it('switching the type clears a picked staff member', async () => {
    state.staff = [person];
    state.assignments = [{ ...draftAssignment, assignmentType: 'Internal', assigneeUserId: 'f1' }];
    const { user } = render(<AdministrationPage />);
    expect((await screen.findAllByText('Follow Person (E1)')).length).toBeGreaterThan(0);

    await user.click(typeRadio('external'));
    await user.click(typeRadio('internal'));

    expect(await screen.findByText('administration.manualStaff.placeholder')).toBeInTheDocument();
    expect(screen.queryByText('Follow Person (E1)')).not.toBeInTheDocument();
  });

  it('stops asking for the eligible list once seeded and switched to internal, and asks again for external', async () => {
    setDefaults(previousCompany(), { assignmentType: 'external', assignmentMethod: 'roundrobin' });
    const { user } = render(<AdministrationPage />);
    await screen.findByText('Old Co', { selector: 'span' });
    // Seeded as external (the previous company is preselected): the list is wanted.
    expect(state.eligibleEnabled.at(-1)).toBe(true);

    await user.click(typeRadio('internal'));
    await screen.findByText('administration.manualStaff.placeholder');
    // The seed is done and nothing external is on screen: the preselect check no longer keeps it on.
    expect(state.eligibleEnabled.at(-1)).toBe(false);

    await user.click(typeRadio('external'));
    await screen.findByText('administration.manualCompany.placeholder');
    expect(state.eligibleEnabled.at(-1)).toBe(true);
  });

  it('kill switch off: a saved external draft is moved to off-system with the method manual', async () => {
    state.killSwitch = { value: 'false' };
    state.assignments = [
      {
        ...draftAssignment,
        assignmentType: 'External',
        assignmentMethod: 'RoundRobin',
        assigneeCompanyId: null,
      },
    ];
    render(<AdministrationPage />);

    expect(await screen.findByText('administration.offlineExternal.title')).toBeInTheDocument();
    expect(typeRadio('externalOffline')).toBeChecked();
  });
});

describe('AdministrationPage: the off-system (EXTO) company', () => {
  const offlineRoundrobin = () =>
    setDefaults(null, { assignmentType: 'external-offline', assignmentMethod: 'roundrobin' });

  it('asks for the company on the EXTO card and blocks Assign until it is picked', async () => {
    withBase();
    offlineRoundrobin();
    const { user } = render(<AdministrationPage />);

    const label = await screen.findByText('administration.offlineExternal.companyLabel');
    expect(label).toBeInTheDocument();
    // The check and the reason Assign is off both name the missing company.
    expect(
      within(slipCard()).getAllByText('administration.slip.reason.companyMissing'),
    ).toHaveLength(2);
    expect(slipAssign()).toBeDisabled();

    await user.click(
      within(slipCard()).getByRole('button', { name: 'administration.slip.checks.fixAria' }),
    );
    expect(await screen.findByRole('alert')).toHaveTextContent('validation.selectCompany');

    await user.click(screen.getByText('pick-other-company'));
    await waitFor(() => expect(slipAssign()).toBeEnabled());
  });

  it('offers every company with an MOU, not only the request segment, and only once the picker opens', async () => {
    offlineRoundrobin();
    const { user } = render(<AdministrationPage />);
    await screen.findByText('administration.offlineExternal.companyLabel');
    expect(state.eligibleCalls).not.toContainEqual([undefined, false]);

    await user.click(screen.getByText('administration.manualCompany.placeholder'));

    expect(state.eligibleCalls).toContainEqual([undefined, false]);
  });

  it('sends the picked company with the EXTO assignment', async () => {
    withBase();
    offlineRoundrobin();
    const { user } = render(<AdministrationPage />);
    await user.click(await screen.findByText('pick-other-company'));
    await waitFor(() => expect(slipAssign()).toBeEnabled());
    await user.click(slipAssign());
    await assignWithoutEmail(user);

    await waitFor(() => expect(state.posted).toHaveLength(1));
    expect(state.posted[0]).toMatchObject({
      decisionTaken: 'EXTO',
      assignmentType: 'External',
      assigneeCompanyId: 'c-new',
      assigneeCompanyName: 'New Co',
    });
  });

  it('saves the picked company with the EXTO draft', async () => {
    offlineRoundrobin();
    const { user } = render(<AdministrationPage />);
    await user.click(await screen.findByText('pick-other-company'));
    await user.click(within(slipCard()).getByRole('button', { name: 'administration.saveDraft' }));

    await waitFor(() => expect(state.drafted).toHaveLength(1));
    expect(state.drafted[0]).toMatchObject({
      assignmentMethod: 'Offline',
      assigneeCompanyId: 'c-new',
    });
  });

  it('restores the company of a reopened EXTO draft', async () => {
    state.assignments = [
      {
        ...draftAssignment,
        assignmentType: 'External',
        assignmentMethod: 'Offline',
        assigneeCompanyId: 'c-old',
      },
    ];
    render(<AdministrationPage />);

    expect(await screen.findByText('Old Co', { selector: 'span' })).toBeInTheDocument();
    expect(screen.getByText('administration.offlineExternal.companyLabel')).toBeInTheDocument();
  });

  it('holds the company and the keyer under a quotation lock, like every other choice', async () => {
    state.staff = [
      {
        id: 'K-1',
        employeeId: 'K-1',
        name: 'Keyer',
        email: '',
        department: '',
        avatar: null,
        currentWorkload: 0,
      },
    ];
    state.assignments = [
      {
        ...draftAssignment,
        assignmentType: 'External',
        assignmentMethod: 'Offline',
        assigneeUserId: 'K-1',
        assigneeCompanyId: 'c-old',
      },
    ];
    state.none = [
      {
        id: 'SENT',
        quotationNumber: 'QT-SENT',
        status: 'Sent',
        requestDate: '2026-10-01',
        selectedAt: null,
      },
    ];
    render(<AdministrationPage />);

    expect(await screen.findByText('Old Co', { selector: 'span' })).toBeInTheDocument();
    expect(screen.getAllByText('Keyer', { exact: false }).length).toBeGreaterThan(0);
    expect(
      screen.queryByRole('button', { name: 'administration.clearSelection' }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: 'administration.changeCompanyButton' }),
    ).not.toBeInTheDocument();
  });

  it('shows the EXTO company on the read-only page, with no way to change it', async () => {
    state.assignments = [
      {
        ...draftAssignment,
        assignmentType: 'External',
        assignmentMethod: 'Offline',
        assignmentStatus: 'Assigned',
        draftSavedAt: null,
        assigneeUserId: 'K-0042',
        assigneeCompanyId: 'c-old',
      },
    ];
    render(<AdministrationPage />);

    expect((await screen.findAllByText('Old Co')).length).toBeGreaterThan(0);
    expect(screen.queryByText('pick-other-company')).not.toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: 'administration.clearSelection' }),
    ).not.toBeInTheDocument();
  });
});

describe('AdministrationPage: the company email on the read-only slip', () => {
  const madeExternal = {
    ...draftAssignment,
    assignmentType: 'External',
    assignmentMethod: 'Manual',
    assignmentStatus: 'Assigned',
    assigneeCompanyId: 'c-old',
    draftSavedAt: null,
    assignedAt: '2026-10-29T14:32:00',
    assignedBy: 'IA0012',
    assignedByName: 'Somsri Jaingam',
  };
  const historyItem = (over = {}) => ({
    id: 'e1',
    isResend: false,
    status: 'Sent',
    createdBy: 'IA0012',
    createdByName: 'Somsri Jaingam',
    createdAt: '2026-10-29T14:32:00',
    sentAt: '2026-10-29T14:33:00',
    sentTo: ['co@example.com'],
    ccCount: 9,
    attachmentCount: 3,
    ...over,
  });
  const useHistory = (items: unknown[] | 'forbidden') =>
    server.use(
      http.get('*/appraisals/:id/assignment-emails', () =>
        items === 'forbidden'
          ? HttpResponse.json({ title: 'Forbidden' }, { status: 403 })
          : HttpResponse.json(items),
      ),
    );
  // Read-only keeps no bar: the slip is in the rail and at the form's end; the rail one is first.
  const emailSection = async () =>
    (await screen.findAllByRole('region', { name: 'administration.email.title' }))[0];

  it('shows the latest email sent, with when, to whom, the counts and the history', async () => {
    state.assignments = [madeExternal];
    useHistory([
      historyItem({
        id: 'e2',
        isResend: true,
        createdAt: '2026-10-30T09:10:00',
        sentAt: '2026-10-30T09:10:30',
      }),
      historyItem(),
    ]);
    render(<AdministrationPage />);

    const section = await emailSection();
    expect(within(section).getByText('administration.email.status.Sent')).toBeInTheDocument();
    expect(within(section).getByText('co@example.com')).toBeInTheDocument();
    // The latest one's send time, machine-readable on its <time>.
    expect(section.querySelector('time[datetime="2026-10-30T09:10:30"]')).not.toBeNull();
    const history = within(section).getByRole('list', {
      name: 'administration.email.history.title',
    });
    const rows = within(history).getAllByRole('listitem');
    expect(rows).toHaveLength(2);
    expect(within(rows[0]).getByText(/administration\.email\.history\.resend/)).toBeInTheDocument();
    expect(within(rows[0]).getByText(/Somsri Jaingam/)).toBeInTheDocument();
    expect(within(rows[1]).getByText('administration.email.history.first')).toBeInTheDocument();
    expect(
      within(section).getByRole('button', { name: 'administration.email.resend' }),
    ).toBeInTheDocument();
    expect(
      within(section).getByRole('button', { name: 'administration.email.viewSent' }),
    ).toBeInTheDocument();
  });

  it('reads "waiting to send" while the email waits for the handover, with no resend', async () => {
    state.assignments = [madeExternal];
    useHistory([historyItem({ status: 'Pending', sentAt: null, sentTo: [] })]);
    render(<AdministrationPage />);

    const section = await emailSection();
    expect(within(section).getByText('administration.email.status.Pending')).toBeInTheDocument();
    expect(within(section).getByText('administration.email.pendingHint')).toBeInTheDocument();
    expect(within(section).queryByRole('button')).toBeNull();
  });

  it('reads "waiting to send" once handed over, with no second send while it is on its way', async () => {
    state.assignments = [madeExternal];
    useHistory([historyItem({ status: 'Queued', sentAt: null })]);
    render(<AdministrationPage />);

    const section = await emailSection();
    expect(within(section).getByText('administration.email.status.Queued')).toBeInTheDocument();
    expect(within(section).getByText('co@example.com')).toBeInTheDocument();
    expect(within(section).queryByRole('button')).toBeNull();
  });

  it('offers no send once the case is closed', async () => {
    state.assignments = [madeExternal];
    state.appraisalStatus = 'Completed';
    useHistory([historyItem()]);
    render(<AdministrationPage />);

    const section = await emailSection();
    expect(
      within(section).queryByRole('button', { name: 'administration.email.resend' }),
    ).toBeNull();
    expect(
      within(section).getByRole('button', { name: 'administration.email.viewSent' }),
    ).toBeInTheDocument();
  });

  it('offers "send email" from the template when the admin assigned without sending', async () => {
    state.assignments = [madeExternal];
    useHistory([historyItem({ status: 'NotSent', sentAt: null, sentTo: [] })]);
    render(<AdministrationPage />);

    const section = await emailSection();
    expect(within(section).getByText('administration.email.status.NotSent')).toBeInTheDocument();
    expect(within(section).getByText('administration.email.notSentHint')).toBeInTheDocument();
    expect(
      within(section).getByRole('button', { name: 'administration.email.sendNow' }),
    ).toBeInTheDocument();
    expect(
      within(section).queryByRole('button', { name: 'administration.email.viewSent' }),
    ).toBeNull();
  });

  it('reads plain "sent" when the send time does not parse', async () => {
    state.assignments = [madeExternal];
    useHistory([historyItem({ sentAt: 'not-a-date' })]);
    render(<AdministrationPage />);

    const section = await emailSection();
    expect(within(section).getByText('administration.email.status.Sent')).toBeInTheDocument();
    expect(section.querySelector('time')).toBeNull();
    expect(within(section).queryByText(/Invalid|—/)).toBeNull();
  });

  it.each([
    ['no email', [] as unknown[]],
    ['a non-admin (403)', 'forbidden' as const],
  ])('has no email row for %s', async (_, items) => {
    state.assignments = [madeExternal];
    let asked = false;
    server.use(
      http.get('*/appraisals/:id/assignment-emails', () => {
        asked = true;
        return items === 'forbidden'
          ? HttpResponse.json({ title: 'Forbidden' }, { status: 403 })
          : HttpResponse.json(items);
      }),
    );
    render(<AdministrationPage />);

    expect(await screen.findAllByText('administration.slip.status.assigned')).toHaveLength(2);
    await waitFor(() => expect(asked).toBe(true));
    expect(screen.queryByRole('region', { name: 'administration.email.title' })).toBeNull();
  });

  it('does not ask for the email of an internal assignment', async () => {
    state.assignments = [{ ...madeExternal, assignmentType: 'Internal', assigneeCompanyId: null }];
    let asked = false;
    server.use(
      http.get('*/appraisals/:id/assignment-emails', () => {
        asked = true;
        return HttpResponse.json([historyItem()]);
      }),
    );
    render(<AdministrationPage />);

    expect(await screen.findAllByText('administration.slip.status.assigned')).toHaveLength(2);
    expect(asked).toBe(false);
  });

  it.each([null, 'System', 'system'])(
    'says the system assigned it when assignedBy is %s',
    async assignedBy => {
      state.assignments = [{ ...madeExternal, assignedBy, assignedByName: null }];
      useHistory([historyItem({ createdBy: null, createdByName: null })]);
      render(<AdministrationPage />);

      expect(await screen.findAllByText('administration.slip.readOnly.bySystem')).toHaveLength(2);
      expect(screen.queryByText('administration.slip.readOnly.assignedBy')).toBeNull();
      // Its one email came from the system template.
      expect(
        within(await emailSection()).getByText(/administration\.email\.history\.system/),
      ).toBeInTheDocument();
    },
  );

  const sentEmail = {
    id: 'e1',
    isResend: false,
    status: 'Sent',
    createdBy: 'IA0012',
    createdAt: '2026-10-29T14:32:00',
    sentAt: '2026-10-29T14:33:00',
    sentTo: ['co@example.com', 'second@example.com'],
    sentCc: ['admin1@bank.example', 'followup@bank.example'],
    extraTo: ['second@example.com'],
    cc: ['IntAdminAll', 'FollowupStaff'],
    subject: 'ขอนำส่งงานประเมิน ลูกค้าราย Taeko 69105526',
    bodyHtml: '<p>เรียน บริษัท ตัวอย่าง</p>',
    attachments: [
      { documentId: 'd1', source: 'request', fileName: 'deed.pdf', fileSizeBytes: 2048 },
    ],
  };

  it('shows exactly what was sent: resolved To and Cc, subject, body and files', async () => {
    state.assignments = [madeExternal];
    useHistory([historyItem()]);
    server.use(
      http.get('*/appraisals/:id/assignment-emails/:emailId', ({ params }) =>
        params.emailId === 'e1'
          ? HttpResponse.json(sentEmail)
          : HttpResponse.json({}, { status: 404 }),
      ),
    );
    const user = userEvent.setup();
    render(<AdministrationPage />);

    await user.click(
      within(await emailSection()).getByRole('button', { name: 'administration.email.viewSent' }),
    );
    const dialog = await screen.findByRole('dialog');
    expect(await within(dialog).findByText(sentEmail.subject)).toBeInTheDocument();
    expect(within(dialog).getByText('co@example.com, second@example.com')).toBeInTheDocument();
    expect(
      within(dialog).getByText('admin1@bank.example, followup@bank.example'),
    ).toBeInTheDocument();
    expect(within(dialog).getByText('deed.pdf')).toBeInTheDocument();
    // The stored HTML as it went out, in a sandbox that runs no script.
    const body = within(dialog).getByTitle('administration.email.view.body');
    // As stored, after a base that keeps a clicked link from replacing it.
    expect(body.getAttribute('srcdoc')).toBe(`<base target="_blank">${sentEmail.bodyHtml}`);
    // No script; a link may only open a new tab.
    expect(body.getAttribute('sandbox')).toBe('allow-popups allow-popups-to-escape-sandbox');
  });

  it('sends again from the latest email, and the slip shows the new send', async () => {
    state.assignments = [madeExternal];
    const history = [historyItem()];
    const resent: unknown[] = [];
    server.use(
      http.get('*/appraisals/:id/assignment-emails', () => HttpResponse.json(history)),
      http.get('*/appraisals/:id/assignment-emails/:emailId', () => HttpResponse.json(sentEmail)),
      http.post('*/appraisals/:id/assignment-emails/resend', async ({ request }) => {
        resent.push(await request.json());
        history.unshift(historyItem({ id: 'e2', isResend: true, status: 'Queued', sentAt: null }));
        return HttpResponse.json({ emailId: 'e2' });
      }),
    );
    const user = userEvent.setup();
    render(<AdministrationPage />);

    await user.click(
      within(await emailSection()).getByRole('button', { name: 'administration.email.resend' }),
    );
    const dialog = await screen.findByRole('dialog');
    // Pre-filled from the latest email, not the template.
    expect(await within(dialog).findByDisplayValue(sentEmail.subject)).toBeInTheDocument();
    expect(
      within(dialog).queryByRole('button', { name: 'administration.email.assignWithoutSend' }),
    ).toBeNull();
    await user.click(within(dialog).getByRole('button', { name: 'administration.email.send' }));

    await waitFor(() => expect(resent).toHaveLength(1));
    expect(resent[0]).toEqual({
      extraTo: ['second@example.com'],
      cc: ['IntAdminAll', 'FollowupStaff'],
      subject: sentEmail.subject,
      bodyHtml: sentEmail.bodyHtml,
      attachments: [{ documentId: 'd1', source: 'request' }],
    });
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
    expect(
      await within(await emailSection()).findByText('administration.email.status.Queued'),
    ).toBeInTheDocument();
  });

  it('sends the template when the admin assigned without sending', async () => {
    state.assignments = [madeExternal];
    useHistory([historyItem({ status: 'NotSent', sentAt: null, sentTo: [] })]);
    const resent: unknown[] = [];
    server.use(
      http.post('*/appraisals/:id/assignment-emails/resend', async ({ request }) => {
        resent.push(await request.json());
        return HttpResponse.json({ emailId: 'e2' });
      }),
    );
    const user = userEvent.setup();
    render(<AdministrationPage />);

    await user.click(
      within(await emailSection()).getByRole('button', { name: 'administration.email.sendNow' }),
    );
    const dialog = await screen.findByRole('dialog');
    expect(await within(dialog).findByDisplayValue(emailPreview.subject)).toBeInTheDocument();
    await user.click(within(dialog).getByRole('button', { name: 'administration.email.send' }));

    await waitFor(() => expect(resent).toHaveLength(1));
    expect(resent[0]).toMatchObject({ subject: emailPreview.subject, cc: ['IntAdminAll'] });
  });

  it('keeps the composer open with the reason when the send is refused', async () => {
    state.assignments = [madeExternal];
    useHistory([historyItem()]);
    server.use(
      http.get('*/appraisals/:id/assignment-emails/:emailId', () => HttpResponse.json(sentEmail)),
      http.post('*/appraisals/:id/assignment-emails/resend', () =>
        HttpResponse.json({ title: 'Bad Request', detail: 'The case is closed.' }, { status: 400 }),
      ),
    );
    const user = userEvent.setup();
    render(<AdministrationPage />);

    await user.click(
      within(await emailSection()).getByRole('button', { name: 'administration.email.resend' }),
    );
    const dialog = await screen.findByRole('dialog');
    await within(dialog).findByDisplayValue(sentEmail.subject);
    await user.click(within(dialog).getByRole('button', { name: 'administration.email.send' }));

    expect(await within(dialog).findByText('The case is closed.')).toBeInTheDocument();
  });

  it('shows a failed email with its time and reason, a resend and the still-assigned note', async () => {
    state.assignments = [madeExternal];
    useHistory([
      historyItem({
        status: 'Failed',
        sentAt: null,
        failedAt: '2026-10-29T14:41:00',
        failureReason: 'บริษัทไม่มีอีเมลในระบบ',
      }),
    ]);
    render(<AdministrationPage />);

    const section = within(await emailSection());
    expect(section.getByText('administration.email.status.Failed')).toBeInTheDocument();
    expect(section.getByText(/บริษัทไม่มีอีเมลในระบบ/)).toBeInTheDocument();
    expect(
      within(section.getByText(/บริษัทไม่มีอีเมลในระบบ/)).getByText(
        (_, el) => el?.tagName === 'TIME',
      ),
    ).toHaveAttribute('dateTime', '2026-10-29T14:41:00');
    expect(section.getByRole('button', { name: 'administration.email.resend' })).toBeEnabled();
    expect(section.getByText('administration.email.failedNote')).toBeInTheDocument();
    // Who it was for still reads.
    expect(section.getByText('co@example.com')).toBeInTheDocument();
    // Nothing went out: no "View sent".
    expect(section.queryByRole('button', { name: 'administration.email.viewSent' })).toBeNull();
  });

  it('names a history row that did not go out by its status', async () => {
    state.assignments = [madeExternal];
    useHistory([
      historyItem({ id: 'e2', isResend: true, createdAt: '2026-10-30T09:10:00' }),
      historyItem({ status: 'Failed', sentAt: null }),
    ]);
    render(<AdministrationPage />);

    const history = within(await emailSection()).getByRole('list', {
      name: 'administration.email.history.title',
    });
    const rows = within(history).getAllByRole('listitem');
    // Not "sent with the assignment": the email of the assignment, and that it failed.
    expect(
      within(rows[1]).getByText(/administration\.email\.history\.firstEmail/),
    ).toBeInTheDocument();
    expect(within(rows[1]).getByText(/administration\.email\.status\.Failed/)).toBeInTheDocument();
    expect(within(rows[0]).queryByText(/administration\.email\.status/)).toBeNull();
  });

  it('names the resender by code when the name comes back empty, and drops a Sent with no time', async () => {
    state.assignments = [madeExternal];
    useHistory([
      historyItem({ id: 'e2', isResend: true, createdByName: '', sentAt: null }),
      historyItem(),
    ]);
    render(<AdministrationPage />);

    const section = await emailSection();
    const rows = within(
      within(section).getByRole('list', { name: 'administration.email.history.title' }),
    ).getAllByRole('listitem');
    expect(within(rows[0]).getByText(/IA0012/)).toBeInTheDocument();
    // No dangling "sent" label without its time on the latest line.
    expect(within(section).queryByText(/administration\.email\.sentLabel/)).toBeNull();
  });

  it('shows the new email at once after a send, so it cannot be sent twice', async () => {
    state.assignments = [madeExternal];
    let release: () => void = () => {};
    let reads = 0;
    server.use(
      http.get('*/appraisals/:id/assignment-emails', async () => {
        reads += 1;
        // The list read after the send hangs: the slip must not wait for it.
        if (reads > 1) await new Promise<void>(r => (release = r));
        return HttpResponse.json([historyItem()]);
      }),
      http.get('*/appraisals/:id/assignment-emails/:emailId', () => HttpResponse.json(sentEmail)),
      http.post('*/appraisals/:id/assignment-emails/resend', () =>
        HttpResponse.json({ emailId: 'e2' }),
      ),
    );
    const user = userEvent.setup();
    render(<AdministrationPage />);

    await user.click(
      within(await emailSection()).getByRole('button', { name: 'administration.email.resend' }),
    );
    const dialog = await screen.findByRole('dialog');
    await within(dialog).findByDisplayValue(sentEmail.subject);
    await user.click(within(dialog).getByRole('button', { name: 'administration.email.send' }));

    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
    const section = await emailSection();
    expect(within(section).getByText('administration.email.status.Queued')).toBeInTheDocument();
    expect(
      within(section).queryByRole('button', { name: 'administration.email.resend' }),
    ).toBeNull();
    release();
  });

  it('reads a sent email again after a failed read', async () => {
    state.assignments = [madeExternal];
    useHistory([historyItem()]);
    let fail = true;
    server.use(
      http.get('*/appraisals/:id/assignment-emails/:emailId', () =>
        fail ? HttpResponse.json({}, { status: 500 }) : HttpResponse.json(sentEmail),
      ),
    );
    const user = userEvent.setup();
    render(<AdministrationPage />);

    await user.click(
      within(await emailSection()).getByRole('button', { name: 'administration.email.viewSent' }),
    );
    const dialog = await screen.findByRole('dialog');
    const retry = await within(dialog).findByRole(
      'button',
      { name: 'common:actions.retry' },
      { timeout: 4000 },
    );
    fail = false;
    await user.click(retry);

    expect(await within(dialog).findByText(sentEmail.subject)).toBeInTheDocument();
  });

  it('still opens what the company last received after a later send failed', async () => {
    state.assignments = [madeExternal];
    useHistory([
      historyItem({ id: 'e2', isResend: true, status: 'Failed', sentAt: null }),
      historyItem(),
    ]);
    let opened = '';
    server.use(
      http.get('*/appraisals/:id/assignment-emails/:emailId', ({ params }) => {
        opened = String(params.emailId);
        return HttpResponse.json(sentEmail);
      }),
    );
    const user = userEvent.setup();
    render(<AdministrationPage />);

    await user.click(
      within(await emailSection()).getByRole('button', { name: 'administration.email.viewSent' }),
    );

    expect(
      await within(await screen.findByRole('dialog')).findByText(sentEmail.subject),
    ).toBeInTheDocument();
    expect(opened).toBe('e1');
  });

  it("does not offer a previous assignment's sent email as this one's", async () => {
    state.assignments = [madeExternal];
    // Re-assigned without sending; the Sent one below went to the company assigned before.
    useHistory([
      historyItem({ id: 'e2', status: 'NotSent', sentAt: null, sentTo: [] }),
      historyItem(),
    ]);
    render(<AdministrationPage />);

    const section = await emailSection();
    expect(within(section).getByText('administration.email.status.NotSent')).toBeInTheDocument();
    expect(
      within(section).queryByRole('button', { name: 'administration.email.viewSent' }),
    ).toBeNull();
  });
});
