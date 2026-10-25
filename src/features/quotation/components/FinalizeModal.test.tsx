import { beforeEach, describe, expect, it, vi } from 'vitest';
import '@/i18n';
import { QueryClient } from '@tanstack/react-query';
import { delay, http, HttpResponse, type JsonBodyType } from 'msw';
import { render, screen, waitFor } from '@/test/test-utils';
import { server } from '@/test/mocks/server';
import FinalizeModal from './FinalizeModal';
import { quotationKeys } from '../api/quotation';
import type { AutoAssignPreview, AutoAssignPreviewAppraisal } from '../api/quotation';
import type { CompanyQuotationItemDto } from '../schemas/quotation';

// The warning toasts are the contract here, so record them instead of rendering a Toaster.
const toastMock = vi.hoisted(() => Object.assign(vi.fn(), { success: vi.fn(), error: vi.fn() }));
vi.mock('react-hot-toast', () => ({ default: toastMock }));

/** A finalize response that reports every appraisal of the preview as assigned. */
const allAssigned = (preview: AutoAssignPreview) => ({
  appraisalIds: preview.appraisals.map(a => a.appraisalId),
  autoAssignResults: preview.appraisals.map(a => ({
    appraisalId: a.appraisalId,
    result: 'Assigned',
    message: null,
  })),
});

/** A preview row the BE predicts as Ready; override `predictedOutcome` / `reason` for the others. */
const row = (
  id: string,
  over: Partial<AutoAssignPreviewAppraisal> = {},
): AutoAssignPreviewAppraisal => ({
  appraisalId: id,
  appraisalNumber: null,
  workflowInstanceId: `wf-${id}`,
  currentActivityId: 'appraisal-assignment',
  isPma: false,
  predictedOutcome: 'Ready',
  reason: null,
  taskHeldBy: null,
  ...over,
});
const parked = (id: string) =>
  row(id, {
    predictedOutcome: 'Parked',
    reason: 'notAtAssignment',
    currentActivityId: 'appraisal-initiation',
  });
const failed = (id: string, reason: string, over: Partial<AutoAssignPreviewAppraisal> = {}) =>
  row(id, { predictedOutcome: 'Failed', reason, ...over });
const skipped = (id: string, reason: string) => row(id, { predictedOutcome: 'Skipped', reason });

const item = (appraisalId: string, n: number): CompanyQuotationItemDto => ({
  id: `item-${n}`,
  companyQuotationId: 'cq-1',
  quotationRequestItemId: `qri-${n}`,
  appraisalId,
  itemNumber: n,
  quotedPrice: 1000,
  feeAmount: 1000,
  discount: 0,
  negotiatedDiscount: null,
  vatPercent: 7,
  estimatedDays: 5,
});

// a1, a2: assignable by choice. a3: PMA (keyer rule). a4: parked (routed back to RM).
const APPRAISALS = [
  { appraisalId: 'a1', appraisalNumber: 'A-1' },
  { appraisalId: 'a2', appraisalNumber: 'A-2' },
  { appraisalId: 'a3', appraisalNumber: 'A-3' },
  { appraisalId: 'a4', appraisalNumber: 'A-4' },
];
const PREVIEW: AutoAssignPreview = {
  externalAssignmentEnabled: true,
  standalone: true,
  appraisals: [row('a1'), row('a2'), row('a3', { isPma: true }), parked('a4')],
};
const PREVIEW_IDS = PREVIEW.appraisals.map(a => a.appraisalId);

/** Stubs the three endpoints the modal touches; resolves with the finalize request body. */
const STAFF = { u1: 'Staff One', u2: 'Staff Two', u3: 'Staff Three' };
const BOTH = ['u1', 'u2'];

const mockApi = (
  preview: AutoAssignPreview,
  /** What finalize answers; defaults to "every appraisal assigned". */
  finalizeResponse: JsonBodyType = allAssigned(preview),
  /** Eligible staff ids per workflow instance; instances not listed get u1 and u2. */
  eligibleByInstance: Record<string, string[]> = {},
) => {
  let body: Record<string, unknown> | undefined;
  server.use(
    http.get('*/quotations/q-1/auto-assign-preview', () => HttpResponse.json(preview)),
    http.get(
      '*/workflows/instances/:instanceId/activities/appraisal-book-verification/eligible-assignees',
      ({ params }) =>
        HttpResponse.json({
          eligibleAssignees: (eligibleByInstance[params.instanceId as string] ?? BOTH).map(id => ({
            userId: id,
            displayName: STAFF[id as keyof typeof STAFF],
          })),
        }),
    ),
    http.post('*/quotations/q-1/finalize', async ({ request }) => {
      body = (await request.json()) as Record<string, unknown>;
      return HttpResponse.json(finalizeResponse);
    }),
  );
  return () => body;
};

const open = (
  props: Partial<React.ComponentProps<typeof FinalizeModal>> = {},
  queryClient?: QueryClient,
) => {
  const onClose = vi.fn();
  const view = render(
    <FinalizeModal
      isOpen
      onClose={onClose}
      quotationId="q-1"
      companyQuotationId="cq-1"
      companyName="Winner Co"
      winnerItems={APPRAISALS.map((a, i) => item(a.appraisalId, i + 1))}
      appraisals={APPRAISALS}
      allowAutoAssign
      {...props}
    />,
    { queryClient },
  );
  return { ...view, onClose };
};

const submitButton = () => screen.getByRole('button', { name: /^Award/ });

type User = ReturnType<typeof render>['user'];

/** The staff dropdowns are shared Dropdowns (a listbox button, aria-labelled); the trigger is
 * disabled while the row's staff list loads, so wait for it before opening. */
const openStaff = async (user: User, label: string) => {
  const trigger = await screen.findByLabelText(label);
  await waitFor(() => expect(trigger).toBeEnabled());
  await user.click(trigger);
  return trigger;
};

/** Pick a staff member by id in the dropdown named `label`. */
const chooseStaff = async (user: User, label: string, staffId: string) => {
  await openStaff(user, label);
  await user.click(
    await screen.findByRole('option', { name: STAFF[staffId as keyof typeof STAFF] }),
  );
};

/** Pick the dropdown's blank (placeholder) entry. */
const chooseBlank = async (user: User, label: string, placeholder: string) => {
  await openStaff(user, label);
  await user.click(await screen.findByRole('option', { name: placeholder }));
};

/** The option names of the dropdown named `label` (opens it, reads, closes it). */
const staffOptionNames = async (user: User, label: string) => {
  const trigger = await openStaff(user, label);
  const names = (await screen.findAllByRole('option')).map(o => o.textContent);
  await user.click(trigger);
  return names;
};

/** The readiness cell: the status in a badge, with the reason (when there is one) right beneath it. */
const expectReadiness = (status: string, reason: string, rows = 1) => {
  const reasons = screen.getAllByText(reason);
  expect(reasons).toHaveLength(rows);
  reasons.forEach(el => expect(el.previousElementSibling).toHaveTextContent(status));
};

const dialogPanel = () => document.querySelector('.shadow-xl');

describe('FinalizeModal auto-assign', () => {
  beforeEach(() => vi.clearAllMocks());

  it('uses the wide dialog only while auto-assign is available, whatever the switch says', async () => {
    mockApi(PREVIEW);
    const { user } = open();

    await screen.findByRole('button', { name: 'Award and assign 3 appraisal(s)' });
    expect(dialogPanel()).toHaveClass('max-w-4xl');

    await user.click(screen.getByRole('switch'));
    expect(dialogPanel()).toHaveClass('max-w-4xl');
  });

  it('is already wide while the preview loads, so it does not jump when the answer arrives', async () => {
    mockApi(PREVIEW);
    server.use(
      http.get('*/quotations/q-1/auto-assign-preview', async () => {
        await delay(150);
        return HttpResponse.json(PREVIEW);
      }),
    );
    open();

    expect(await screen.findByText(/Checking whether/)).toBeInTheDocument();
    expect(dialogPanel()).toHaveClass('max-w-4xl');
    await screen.findByRole('button', { name: 'Award and assign 3 appraisal(s)' });
    expect(dialogPanel()).toHaveClass('max-w-4xl');
  });

  it('keeps the narrower dialog when auto-assign is not available', async () => {
    mockApi({ ...PREVIEW, externalAssignmentEnabled: false });
    open();

    await screen.findByText(/not enabled yet/);
    expect(dialogPanel()).toHaveClass('max-w-2xl');
  });

  it('disables the switch and sends no autoAssign when external assignment is not enabled', async () => {
    const sent = mockApi({ ...PREVIEW, externalAssignmentEnabled: false });
    const { user, onClose } = open();

    expect(await screen.findByText(/not enabled yet/)).toBeInTheDocument();
    const toggle = screen.getByRole('switch');
    expect(toggle).toBeDisabled();
    expect(toggle).not.toBeChecked();

    await user.click(submitButton());
    await waitFor(() => expect(onClose).toHaveBeenCalled());
    expect(sent()).toEqual({ companyQuotationId: 'cq-1', reason: '' });
    // A plain award keeps the wording that sends the admin to Assign on the task.
    expect(toastMock.success).toHaveBeenCalledWith(
      'Quotation awarded — click Assign to route externally',
    );
  });

  it('defaults to round robin: lists parked appraisals and sends an empty staff list', async () => {
    const sent = mockApi(PREVIEW);
    const { user } = open();

    // 3 ready (a1, a2, PMA a3), 1 parked (a4)
    const button = await screen.findByRole('button', { name: 'Award and assign 3 appraisal(s)' });
    // The activity id reads as the name the task views use.
    expectReadiness('Parked', 'at Appraisal Initiation');
    // Ready carries no reason line, the PMA row included: its follow-up cell explains the rule.
    const readyBadges = screen.getAllByText('Ready');
    expect(readyBadges).toHaveLength(3);
    readyBadges.forEach(badge => expect(badge.nextElementSibling).toBeNull());
    expect(screen.queryByText('PMA')).not.toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveTextContent(/not at Appraisal Assignment yet: A-4\./);
    expect(screen.getByText('int-pma-input keyer (PMA rule)')).toBeInTheDocument();

    await user.click(button);
    await waitFor(() => expect(sent()).toBeDefined());
    expect(sent()).toEqual({ companyQuotationId: 'cq-1', reason: '', autoAssign: { staff: [] } });
  });

  it('manual mode blocks submit until every ready non-PMA row has staff, then sends only those rows', async () => {
    const sent = mockApi(PREVIEW);
    const { user } = open();

    await user.click(await screen.findByRole('radio', { name: 'Choose manually' }));
    expect(submitButton()).toBeDisabled();
    expect(
      screen.getByText('Select follow-up staff for every ready appraisal'),
    ).toBeInTheDocument();

    // The PMA row and the parked row get no select.
    expect(screen.queryByLabelText('Follow-up staff for A-3')).not.toBeInTheDocument();
    expect(screen.queryByLabelText('Follow-up staff for A-4')).not.toBeInTheDocument();

    await chooseStaff(user, 'Follow-up staff for A-1', 'u1');
    expect(submitButton()).toBeDisabled();
    await chooseStaff(user, 'Follow-up staff for A-2', 'u2');
    expect(submitButton()).toBeEnabled();

    await user.click(submitButton());
    await waitFor(() => expect(sent()).toBeDefined());
    expect(sent()).toEqual({
      companyQuotationId: 'cq-1',
      reason: '',
      autoAssign: {
        staff: [
          { appraisalId: 'a1', staffId: 'u1' },
          { appraisalId: 'a2', staffId: 'u2' },
        ],
      },
    });
  });

  it('"same person for all" fills every manual row', async () => {
    const sent = mockApi(PREVIEW);
    const { user } = open();

    await user.click(await screen.findByRole('radio', { name: 'Choose manually' }));
    await chooseStaff(user, 'Same person for all', 'u2');
    expect(submitButton()).toBeEnabled();

    await user.click(submitButton());
    await waitFor(() => expect(sent()).toBeDefined());
    expect(sent()).toMatchObject({
      autoAssign: {
        staff: [
          { appraisalId: 'a1', staffId: 'u2' },
          { appraisalId: 'a2', staffId: 'u2' },
        ],
      },
    });
  });

  it.each([
    ['unpriced', 'no price from the winner'],
    ['feeBaseMissing', 'No base fee (01) — set the fee before assigning'],
    ['constructionInspection', 'construction inspection'],
    ['taskHeld', 'task held by Somchai'],
    ['winnerUnavailable', 'winning company not available'],
    ['assignmentNotReset', 'assignment record not reset yet, assign on Administration'],
    ['documentFollowupOpen', 'open document follow-up must be cleared first'],
  ])(
    'a row the BE predicts as Failed (%s) is labelled, uncounted and gets no picker',
    async (reason, reasonText) => {
      const sent = mockApi({
        ...PREVIEW,
        appraisals: [...PREVIEW.appraisals, failed('a6', reason, { taskHeldBy: 'Somchai' })],
      });
      const { user } = open();

      // a1, a2 and the PMA a3 are assignable; a4 is parked; a6 is neither counted nor parked.
      const button = await screen.findByRole('button', { name: 'Award and assign 3 appraisal(s)' });
      expectReadiness('Will not be assigned', reasonText);
      expect(screen.getByText('3 ready · 1 parked')).toBeInTheDocument();
      // The Failed row is counted apart, and the "none ready" note stays away.
      expect(screen.getByText(/1 will not be assigned/)).toBeInTheDocument();
      expect(screen.queryByText(/No appraisal is ready to assign now/)).not.toBeInTheDocument();
      expect(screen.getByRole('status')).not.toHaveTextContent(/a6/);

      await user.click(screen.getByRole('radio', { name: 'Choose manually' }));
      expect(screen.queryByLabelText('Follow-up staff for a6')).not.toBeInTheDocument();
      await chooseStaff(user, 'Same person for all', 'u1');

      await user.click(button);
      await waitFor(() => expect(sent()).toBeDefined());
      expect(sent()).toMatchObject({
        autoAssign: {
          staff: [
            { appraisalId: 'a1', staffId: 'u1' },
            { appraisalId: 'a2', staffId: 'u1' },
          ],
        },
      });
    },
  );

  it('keeps a holder name that contains a separator whole in the reason', async () => {
    mockApi({
      ...PREVIEW,
      appraisals: [
        ...PREVIEW.appraisals,
        failed('a6', 'taskHeld', { taskHeldBy: 'Somchai · Ops' }),
      ],
    });
    open();

    await screen.findByRole('button', { name: 'Award and assign 3 appraisal(s)' });
    expectReadiness('Will not be assigned', 'task held by Somchai · Ops');
  });

  it.each([null, '  '])(
    'a held task with no holder name (%j) reads as held by another user',
    async holder => {
      mockApi({
        ...PREVIEW,
        appraisals: [...PREVIEW.appraisals, failed('a6', 'taskHeld', { taskHeldBy: holder })],
      });
      open();

      await screen.findByRole('button', { name: 'Award and assign 3 appraisal(s)' });
      expectReadiness('Will not be assigned', 'task is held by another user');
      expect(screen.queryByText(/task held by/)).not.toBeInTheDocument();
    },
  );

  it('shows a parked row with no activity as a bare status, never "at —"', async () => {
    mockApi({
      ...PREVIEW,
      appraisals: [row('a1'), row('a4', { predictedOutcome: 'Parked', currentActivityId: null })],
    });
    open();

    await screen.findByRole('button', { name: 'Award and assign 1 appraisal(s)' });
    expect(screen.getByText('Parked')).toBeInTheDocument();
    expect(screen.queryByText(/^at /)).not.toBeInTheDocument();
  });

  it('shows an outcome this build does not know as a fallback status, never blank', async () => {
    mockApi({
      ...PREVIEW,
      appraisals: [
        row('a1'),
        row('a2', {
          predictedOutcome: 'Brand new' as AutoAssignPreviewAppraisal['predictedOutcome'],
        }),
      ],
    });
    open();

    await screen.findByRole('button', { name: 'Award and assign 1 appraisal(s)' });
    expect(screen.getByText('Unknown')).toHaveClass('bg-gray-100');
  });

  it('takes the grouping from predictedOutcome alone: a not-ready row stays parked although the winner cannot take work', async () => {
    // The BE classifier decides Parked before it looks at the winner, so the modal must not re-derive.
    mockApi({
      ...PREVIEW,
      appraisals: [
        failed('a1', 'winnerUnavailable'),
        failed('a2', 'winnerUnavailable'),
        parked('a4'),
      ],
    });
    open();

    await screen.findByText('at Appraisal Initiation');
    expectReadiness('Parked', 'at Appraisal Initiation');
    expectReadiness('Will not be assigned', 'winning company not available', 2);
    expect(screen.getByRole('status')).toHaveTextContent(/not at Appraisal Assignment yet: A-4\./);
    expect(screen.getByText('0 ready · 1 parked')).toBeInTheDocument();
  });

  it('with nothing assignable the button falls back to the plain label but still sends autoAssign', async () => {
    const sent = mockApi({
      ...PREVIEW,
      appraisals: [failed('a1', 'winnerUnavailable'), failed('a2', 'winnerUnavailable')],
    });
    const { user } = open();

    await screen.findAllByText('winning company not available');
    expect(screen.getByRole('switch')).toBeEnabled();
    expect(screen.queryByText(/Award and assign/)).not.toBeInTheDocument();
    // The payload still carries autoAssign, and the footer says why the button is a plain Award.
    expect(
      screen.getByText(
        'No appraisal is ready to assign now. The results will be recorded on the summary.',
      ),
    ).toBeInTheDocument();
    expect(screen.getByText('0 ready · 0 parked')).toBeInTheDocument();
    expect(screen.getByText(/2 will not be assigned/)).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Award' }));
    await waitFor(() => expect(sent()).toBeDefined());
    expect(sent()).toEqual({ companyQuotationId: 'cq-1', reason: '', autoAssign: { staff: [] } });
  });

  it('"same person for all" fills only rows whose list loaded, so the others still count as missing', async () => {
    mockApi(PREVIEW);
    server.use(
      http.get(
        '*/workflows/instances/wf-a1/activities/appraisal-book-verification/eligible-assignees',
        () => HttpResponse.json({}, { status: 500 }),
      ),
    );
    const { user } = open();

    await user.click(await screen.findByRole('radio', { name: 'Choose manually' }));
    expect(await screen.findByText('Could not load staff')).toBeInTheDocument();
    await chooseStaff(user, 'Same person for all', 'u2');

    expect(await screen.findByLabelText('Follow-up staff for A-2')).toHaveTextContent('Staff Two');
    // A-1 could not be filled: still missing, so submit stays blocked.
    expect(
      screen.getByText('Select follow-up staff for every ready appraisal'),
    ).toBeInTheDocument();
    expect(submitButton()).toBeDisabled();
  });

  it('the blank option of "same person for all" takes the person back off the rows', async () => {
    mockApi(PREVIEW);
    const { user } = open();

    await user.click(await screen.findByRole('radio', { name: 'Choose manually' }));
    await chooseStaff(user, 'Same person for all', 'u2');
    expect(submitButton()).toBeEnabled();

    await chooseBlank(user, 'Same person for all', 'Same person for all');
    expect(screen.getByLabelText('Follow-up staff for A-1')).toHaveTextContent('Select staff');
    expect(screen.getByLabelText('Follow-up staff for A-2')).toHaveTextContent('Select staff');
    expect(submitButton()).toBeDisabled();
  });

  it('does not trust a cached preview after the re-read failed, and will not award silently without assigning', async () => {
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    queryClient.setQueryData(quotationKeys.autoAssignPreview('q-1'), PREVIEW);
    const sent = mockApi(PREVIEW);
    server.use(
      http.get('*/quotations/q-1/auto-assign-preview', () =>
        HttpResponse.json({}, { status: 500 }),
      ),
    );
    const { user } = open({}, queryClient);

    expect(
      await screen.findByText(/Could not check whether each appraisal is ready/),
    ).toBeInTheDocument();
    // TanStack keeps the old data on a failed refetch; the modal must not act on it.
    expect(screen.queryByText('Readiness')).not.toBeInTheDocument();
    // The user still wants auto-assign, so a plain award is not offered...
    const toggle = screen.getByRole('switch');
    expect(toggle).toBeChecked();
    expect(submitButton()).toBeDisabled();

    // ...until they turn the switch off themselves.
    await user.click(toggle);
    expect(submitButton()).toBeEnabled();
    await user.click(submitButton());
    await waitFor(() => expect(sent()).toBeDefined());
    expect(sent()).toEqual({ companyQuotationId: 'cq-1', reason: '' });
  });

  it('lets the user retry a failed preview without closing the window', async () => {
    let previewCalls = 0;
    mockApi(PREVIEW);
    server.use(
      http.get('*/quotations/q-1/auto-assign-preview', () => {
        previewCalls += 1;
        return previewCalls === 1
          ? HttpResponse.json({}, { status: 500 })
          : HttpResponse.json(PREVIEW);
      }),
    );
    const { user } = open();

    expect(
      await screen.findByText(/Could not check whether each appraisal is ready/),
    ).toBeInTheDocument();
    expect(submitButton()).toBeDisabled();

    await user.click(screen.getByRole('button', { name: 'Retry' }));

    expect(await screen.findByRole('button', { name: /Award and assign/ })).toBeEnabled();
    expect(
      screen.queryByText(/Could not check whether each appraisal is ready/),
    ).not.toBeInTheDocument();
    expect(previewCalls).toBe(2);
  });

  it('does not re-read the preview after a 5xx from finalize, and keeps auto-assign on', async () => {
    let previewCalls = 0;
    mockApi(PREVIEW);
    server.use(
      http.get('*/quotations/q-1/auto-assign-preview', () => {
        previewCalls += 1;
        return HttpResponse.json(PREVIEW);
      }),
      http.post('*/quotations/q-1/finalize', () =>
        HttpResponse.json({ title: 'Boom', detail: 'Something broke' }, { status: 500 }),
      ),
    );
    const { user } = open();

    await user.click(await screen.findByRole('button', { name: /Award and assign/ }));
    await waitFor(() => expect(toastMock.error).toHaveBeenCalledWith('Something broke'));
    // Finalize's invalidation of the quotation detail must not reach the preview.
    await new Promise(resolve => setTimeout(resolve, 50));
    expect(previewCalls).toBe(1);
    expect(screen.getByRole('switch')).toBeChecked();
    expect(screen.getByRole('button', { name: /Award and assign/ })).toBeEnabled();
  });

  it('re-reads the preview after a 4xx refusal, so the modal shows the current flag state', async () => {
    let previewCalls = 0;
    mockApi(PREVIEW);
    server.use(
      http.get('*/quotations/q-1/auto-assign-preview', () => {
        previewCalls += 1;
        // The go-live flag is switched off after the first read.
        return HttpResponse.json({ ...PREVIEW, externalAssignmentEnabled: previewCalls === 1 });
      }),
      http.post('*/quotations/q-1/finalize', () =>
        HttpResponse.json({ title: 'Bad', detail: 'Auto-assign is disabled' }, { status: 400 }),
      ),
    );
    const { user } = open();

    await user.click(await screen.findByRole('button', { name: /Award and assign/ }));
    await waitFor(() => expect(toastMock.error).toHaveBeenCalledWith('Auto-assign is disabled'));

    expect(await screen.findByText(/not enabled yet/)).toBeInTheDocument();
    expect(previewCalls).toBe(2);
    expect(screen.getByRole('switch')).toBeDisabled();
  });

  it('"same person for all" only offers staff eligible on every manual row', async () => {
    mockApi(PREVIEW, undefined, { 'wf-a1': ['u1', 'u2'], 'wf-a2': ['u2', 'u3'] });
    const { user } = open();

    await user.click(await screen.findByRole('radio', { name: 'Choose manually' }));
    expect(await staffOptionNames(user, 'Same person for all')).toEqual([
      'Same person for all',
      'Staff Two',
    ]);
    // Each row still offers its own list.
    expect(await staffOptionNames(user, 'Follow-up staff for A-2')).toEqual([
      'Select staff',
      'Staff Two',
      'Staff Three',
    ]);
  });

  it('holds submit and hides a cached preview while it is being re-read', async () => {
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    // A cached answer from an earlier open: the flag was on, every appraisal ready.
    queryClient.setQueryData(quotationKeys.autoAssignPreview('q-1'), PREVIEW);
    server.use(
      http.get('*/quotations/q-1/auto-assign-preview', async () => {
        await delay(50);
        return HttpResponse.json({ ...PREVIEW, externalAssignmentEnabled: false });
      }),
    );
    open({}, queryClient);

    expect(await screen.findByText(/Checking whether/)).toBeInTheDocument();
    expect(submitButton()).toBeDisabled();
    expect(screen.queryByText('Readiness')).not.toBeInTheDocument();
    // The fresh answer replaces the cached one.
    expect(await screen.findByText(/not enabled yet/)).toBeInTheDocument();
    expect(submitButton()).toBeEnabled();
  });

  it('does not make a plain award wait for a preview it does not use', async () => {
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const sent = mockApi(PREVIEW);
    const { user } = open({}, queryClient);

    await screen.findByRole('button', { name: /Award and assign/ });
    await user.click(screen.getByRole('switch'));

    // The preview is being re-read (slowly) while the switch is off.
    server.use(
      http.get('*/quotations/q-1/auto-assign-preview', async () => {
        await delay(300);
        return HttpResponse.json(PREVIEW);
      }),
    );
    void queryClient.invalidateQueries({ queryKey: quotationKeys.autoAssignPreview('q-1') });
    expect(await screen.findByText(/Checking whether/)).toBeInTheDocument();
    expect(submitButton()).toBeEnabled();

    await user.click(submitButton());
    await waitFor(() => expect(sent()).toBeDefined());
    expect(sent()).toEqual({ companyQuotationId: 'cq-1', reason: '' });
  });

  it('switching assignment off sends a plain finalize', async () => {
    const sent = mockApi(PREVIEW);
    const { user } = open();

    await screen.findByRole('button', { name: /Award and assign/ });
    await user.click(screen.getByRole('switch'));
    expect(screen.queryByText('Readiness')).not.toBeInTheDocument();

    await user.click(submitButton());
    await waitFor(() => expect(sent()).toBeDefined());
    expect(sent()).toEqual({ companyQuotationId: 'cq-1', reason: '' });
  });

  it('closes after a partly failed assignment so the page can show the result', async () => {
    mockApi(PREVIEW, {
      appraisalIds: PREVIEW_IDS,
      autoAssignResults: [
        { appraisalId: 'a1', result: 'Assigned', message: null },
        { appraisalId: 'a2', result: 'Failed', message: 'Company is excluded' },
        { appraisalId: 'a3', result: 'Skipped', message: null },
        { appraisalId: 'a4', result: 'Parked', message: null },
      ],
    });
    const { user, onClose } = open();

    await user.click(await screen.findByRole('button', { name: /Award and assign/ }));
    await waitFor(() => expect(onClose).toHaveBeenCalled());
    expect(toastMock).toHaveBeenCalledWith(
      expect.stringContaining('1 assigned · 1 failed · 1 parked · 1 skipped'),
      expect.anything(),
    );
    // The modal opens from pages that show no result card, so the message must not point at one.
    expect(toastMock).not.toHaveBeenCalledWith(expect.stringContaining('below'), expect.anything());
  });

  it('stays quiet when the only non-assigned result is Skipped', async () => {
    const { autoAssignResults } = allAssigned(PREVIEW);
    mockApi(PREVIEW, {
      appraisalIds: PREVIEW_IDS,
      autoAssignResults: [
        ...autoAssignResults.slice(0, 3),
        { ...autoAssignResults[3], result: 'Skipped' },
      ],
    });
    const { user, onClose } = open();

    await user.click(await screen.findByRole('button', { name: /Award and assign/ }));
    await waitFor(() => expect(onClose).toHaveBeenCalled());
    expect(toastMock).not.toHaveBeenCalled();
  });

  it('stays quiet when every appraisal was assigned', async () => {
    mockApi(PREVIEW);
    const { user, onClose } = open();

    await user.click(await screen.findByRole('button', { name: /Award and assign/ }));
    await waitFor(() => expect(onClose).toHaveBeenCalled());
    expect(toastMock).not.toHaveBeenCalled();
  });

  it.each([
    ['no results', { appraisalIds: PREVIEW_IDS, autoAssignResults: [] }],
    [
      'fewer results than appraisals',
      {
        appraisalIds: PREVIEW_IDS,
        autoAssignResults: allAssigned(PREVIEW).autoAssignResults.slice(0, 2),
      },
    ],
    [
      'an appraisalId the results omit',
      { ...allAssigned(PREVIEW), appraisalIds: [...PREVIEW_IDS, 'a9'] },
    ],
  ])('warns instead of reporting done when the response has %s', async (_name, response) => {
    mockApi(PREVIEW, response);
    const { user, onClose } = open();

    await user.click(await screen.findByRole('button', { name: /Award and assign/ }));
    await waitFor(() => expect(onClose).toHaveBeenCalled());
    expect(toastMock).toHaveBeenCalledWith(
      expect.stringMatching(/result is missing/),
      expect.anything(),
    );
  });

  it('cannot be dismissed with Esc while the request is running', async () => {
    mockApi(PREVIEW);
    server.use(
      http.post('*/quotations/q-1/finalize', async () => {
        await delay(150);
        return HttpResponse.json(allAssigned(PREVIEW));
      }),
    );
    const { user, onClose } = open();

    await user.click(await screen.findByRole('button', { name: /Award and assign/ }));
    await screen.findByText('Awarding...');
    await user.keyboard('{Escape}');
    expect(onClose).not.toHaveBeenCalled();

    // It closes itself once the request settles.
    await waitFor(() => expect(onClose).toHaveBeenCalledTimes(1));
  });

  it('locks the switch, the mode toggle and the staff pickers while the request is running', async () => {
    mockApi(PREVIEW);
    server.use(
      http.post('*/quotations/q-1/finalize', async () => {
        await delay(150);
        return HttpResponse.json(allAssigned(PREVIEW));
      }),
    );
    const { user } = open();

    await user.click(await screen.findByRole('radio', { name: 'Choose manually' }));
    await chooseStaff(user, 'Same person for all', 'u1');
    await user.click(submitButton());
    await screen.findByText('Awarding...');

    expect(screen.getByRole('switch')).toBeDisabled();
    expect(screen.getByRole('radio', { name: 'Choose manually' })).toBeDisabled();
    expect(screen.getByRole('radio', { name: 'Round robin' })).toBeDisabled();
    expect(screen.getByLabelText('Same person for all')).toBeDisabled();
    expect(screen.getByLabelText('Follow-up staff for A-1')).toBeDisabled();
    expect(screen.getByLabelText('Follow-up staff for A-2')).toBeDisabled();
  });

  it('still raises the result toasts when the dialog unmounts before the request resolves', async () => {
    // Finalize commits before the auto-assign loop, so a refetch can flip the status and unmount the
    // dialog while the loop is still running; per-call mutate callbacks would be dropped with it.
    mockApi(PREVIEW);
    server.use(
      http.post('*/quotations/q-1/finalize', async () => {
        await delay(100);
        return HttpResponse.json({
          appraisalIds: PREVIEW_IDS,
          autoAssignResults: [
            { appraisalId: 'a1', result: 'Assigned', message: null },
            { appraisalId: 'a2', result: 'Failed', message: 'Company is excluded' },
            { appraisalId: 'a3', result: 'Assigned', message: null },
            { appraisalId: 'a4', result: 'Parked', message: null },
          ],
        });
      }),
    );
    const { user, unmount } = open();

    await user.click(await screen.findByRole('button', { name: /Award and assign/ }));
    await screen.findByText('Awarding...');
    unmount();

    await waitFor(() =>
      expect(toastMock).toHaveBeenCalledWith(
        expect.stringContaining('2 assigned · 1 failed · 1 parked · 0 skipped'),
        expect.anything(),
      ),
    );
    // Auto-assign ran, so the toast must not tell the admin to click Assign on the task.
    expect(toastMock.success).toHaveBeenCalledWith(
      'Quotation awarded. The ready appraisals were assigned to the winner.',
    );
  });

  it('still raises the "may have completed" toast when the dialog unmounts before a dropped connection', async () => {
    mockApi(PREVIEW);
    server.use(
      http.post('*/quotations/q-1/finalize', async () => {
        await delay(100);
        return HttpResponse.error();
      }),
    );
    const { user, unmount } = open();

    await user.click(await screen.findByRole('button', { name: /Award and assign/ }));
    await screen.findByText('Awarding...');
    unmount();

    await waitFor(() =>
      expect(toastMock).toHaveBeenCalledWith(
        expect.stringContaining('may have completed'),
        expect.anything(),
      ),
    );
  });

  it('on a dropped connection says the award may have completed and closes', async () => {
    mockApi(PREVIEW);
    server.use(http.post('*/quotations/q-1/finalize', () => HttpResponse.error()));
    const { user, onClose } = open();

    await user.click(await screen.findByRole('button', { name: /Award and assign/ }));
    await waitFor(() => expect(onClose).toHaveBeenCalled());
    expect(toastMock).toHaveBeenCalledWith(
      expect.stringContaining('may have completed'),
      expect.anything(),
    );
    expect(toastMock.error).not.toHaveBeenCalledWith('Failed to award quotation');
  });

  it('keeps the modal open and shows the failure when the server answers with an error', async () => {
    mockApi(PREVIEW);
    server.use(
      http.post('*/quotations/q-1/finalize', () =>
        HttpResponse.json({ title: 'Bad', detail: 'Quotation is not awardable' }, { status: 400 }),
      ),
    );
    const { user, onClose } = open();

    await user.click(await screen.findByRole('button', { name: /Award and assign/ }));
    await waitFor(() => expect(toastMock.error).toHaveBeenCalledWith('Quotation is not awardable'));
    expect(onClose).not.toHaveBeenCalled();
  });

  it.each([408, 499, 502, 503, 504])(
    'treats a %i (timeout / gateway gave up) like a dropped connection: may have completed, closes',
    async status => {
      mockApi(PREVIEW);
      server.use(http.post('*/quotations/q-1/finalize', () => HttpResponse.json({}, { status })));
      const { user, onClose } = open();

      await user.click(await screen.findByRole('button', { name: /Award and assign/ }));
      await waitFor(() => expect(onClose).toHaveBeenCalled());
      expect(toastMock).toHaveBeenCalledWith(
        expect.stringContaining('may have completed'),
        expect.anything(),
      );
      expect(toastMock.error).not.toHaveBeenCalledWith('Failed to award quotation');
    },
  );

  it('keeps the modal open on a 500 from the API itself', async () => {
    mockApi(PREVIEW);
    server.use(
      http.post('*/quotations/q-1/finalize', () => HttpResponse.json({}, { status: 500 })),
    );
    const { user, onClose } = open();

    await user.click(await screen.findByRole('button', { name: /Award and assign/ }));
    await waitFor(() => expect(toastMock.error).toHaveBeenCalledWith('Failed to award quotation'));
    expect(onClose).not.toHaveBeenCalled();
  });

  it('labels Skipped rows by their reason, apart from parked ones', async () => {
    mockApi({
      ...PREVIEW,
      appraisals: [
        row('a1'),
        skipped('a2', 'workflowEnded'),
        skipped('a3', 'notPending'),
        parked('a4'),
        skipped('a5', 'noAssignment'),
        skipped('a6', 'deleted'),
      ],
    });
    open();

    await screen.findByRole('button', { name: 'Award and assign 1 appraisal(s)' });
    expectReadiness('Skipped', 'workflow ended');
    expectReadiness('Skipped', 'assignment not pending');
    expectReadiness('Skipped', 'no assignment');
    expectReadiness('Skipped', 'appraisal deleted');
    expectReadiness('Parked', 'at Appraisal Initiation');
    // Only the truly parked appraisal is named in the note and counted.
    const note = screen.getByRole('status');
    expect(note).toHaveTextContent(/not at Appraisal Assignment yet: A-4\./);
    expect(note).not.toHaveTextContent(/A-2|A-3|a5|a6/);
    expect(screen.getByText('1 ready · 1 parked')).toBeInTheDocument();
  });

  it('counts a chosen person as missing once they are no longer in the row’s eligible list', async () => {
    mockApi(PREVIEW);
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const { user } = open({}, queryClient);

    await user.click(await screen.findByRole('radio', { name: 'Choose manually' }));
    await chooseStaff(user, 'Same person for all', 'u1');
    expect(submitButton()).toBeEnabled();

    // The lists are re-read and u1 is gone from them.
    server.use(
      http.get(
        '*/workflows/instances/:instanceId/activities/appraisal-book-verification/eligible-assignees',
        () =>
          HttpResponse.json({ eligibleAssignees: [{ userId: 'u2', displayName: 'Staff Two' }] }),
      ),
    );
    await queryClient.invalidateQueries({ queryKey: ['eligible-assignees'] });

    await waitFor(() => expect(submitButton()).toBeDisabled());
    expect(
      screen.getByText('Select follow-up staff for every ready appraisal'),
    ).toBeInTheDocument();
  });

  it('shows an inline retry when a row cannot load its staff, and drops it from "same person for all"', async () => {
    mockApi(PREVIEW);
    let calls = 0;
    server.use(
      http.get(
        '*/workflows/instances/wf-a1/activities/appraisal-book-verification/eligible-assignees',
        () => {
          calls += 1;
          return calls === 1
            ? HttpResponse.json({}, { status: 500 })
            : HttpResponse.json({
                eligibleAssignees: [{ userId: 'u1', displayName: 'Staff One' }],
              });
        },
      ),
    );
    const { user } = open();

    await user.click(await screen.findByRole('radio', { name: 'Choose manually' }));
    expect(await screen.findByText('Could not load staff')).toBeInTheDocument();
    // The failed list does not empty the intersection: the other row's list is offered.
    expect(await staffOptionNames(user, 'Same person for all')).toEqual([
      'Same person for all',
      'Staff One',
      'Staff Two',
    ]);

    await user.click(screen.getByRole('button', { name: 'Retry' }));
    expect(await screen.findByLabelText('Follow-up staff for A-1')).toBeInTheDocument();
  });

  it('does not touch the preview endpoint unless auto-assign is allowed', async () => {
    const previewCalled = vi.fn();
    server.use(
      http.get('*/quotations/q-1/auto-assign-preview', () => {
        previewCalled();
        return HttpResponse.json(PREVIEW);
      }),
    );
    open({ allowAutoAssign: false });

    expect(await screen.findByText(/Winner Co/)).toBeInTheDocument();
    expect(screen.queryByRole('switch')).not.toBeInTheDocument();
    expect(previewCalled).not.toHaveBeenCalled();
  });

  it('does not tell the admin to click Assign on the task while it is going to assign for them', async () => {
    mockApi(PREVIEW);
    const { user } = open();

    // Switch on and assigning: the banner says the ready appraisals are assigned right after.
    await screen.findByRole('button', { name: /Award and assign/ });
    expect(screen.getByText(/assign the ready appraisals to it right away/)).toBeInTheDocument();
    expect(screen.queryByText(/Click "Assign" on the task/)).not.toBeInTheDocument();

    // Switch off: back to the manual wording.
    await user.click(screen.getByRole('switch'));
    expect(screen.getByText(/Click "Assign" on the task/)).toBeInTheDocument();
    expect(screen.queryByText(/assign the ready appraisals/)).not.toBeInTheDocument();
  });

  describe('cache after finalize', () => {
    const seed = (queryClient: QueryClient) => {
      for (const id of PREVIEW_IDS) {
        queryClient.setQueryData(['appraisal', id, 'assignments'], ['stale']);
        queryClient.setQueryData(['appraisal', id, 'fees'], ['stale']);
        queryClient.setQueryData(['appraisal', id, 'photos'], ['keep']);
      }
    };

    const isInvalidated = (queryClient: QueryClient, key: unknown[]) =>
      queryClient.getQueryState(key)?.isInvalidated === true;

    it('invalidates only the assignment and fee queries of the appraisals once the award may have committed', async () => {
      const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
      seed(queryClient);
      mockApi(PREVIEW);
      const { user, onClose } = open({}, queryClient);

      await user.click(await screen.findByRole('button', { name: /Award and assign/ }));
      await waitFor(() => expect(onClose).toHaveBeenCalled());

      for (const id of PREVIEW_IDS) {
        // Invalidated, not removed: a mounted page keeps its data and refetches without a flash.
        expect(queryClient.getQueryData(['appraisal', id, 'assignments'])).toEqual(['stale']);
        expect(isInvalidated(queryClient, ['appraisal', id, 'assignments'])).toBe(true);
        expect(isInvalidated(queryClient, ['appraisal', id, 'fees'])).toBe(true);
        // Everything else under ['appraisal', id] (photos, comparables, ...) is left as it was.
        expect(isInvalidated(queryClient, ['appraisal', id, 'photos'])).toBe(false);
      }
    });

    it('invalidates them after a 5xx too, since the finalize may have committed', async () => {
      const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
      seed(queryClient);
      mockApi(PREVIEW);
      server.use(
        http.post('*/quotations/q-1/finalize', () => HttpResponse.json({}, { status: 500 })),
      );
      const { user } = open({}, queryClient);

      await user.click(await screen.findByRole('button', { name: /Award and assign/ }));
      await waitFor(() => expect(toastMock.error).toHaveBeenCalled());

      for (const id of PREVIEW_IDS) {
        expect(isInvalidated(queryClient, ['appraisal', id, 'assignments'])).toBe(true);
        expect(isInvalidated(queryClient, ['appraisal', id, 'photos'])).toBe(false);
      }
    });

    it.each([408, 499])(
      'treats a %i like "no answer": the finalize may have committed, so the cache is refreshed',
      async status => {
        const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
        seed(queryClient);
        mockApi(PREVIEW);
        server.use(http.post('*/quotations/q-1/finalize', () => HttpResponse.json({}, { status })));
        const { user, onClose } = open({}, queryClient);

        await user.click(await screen.findByRole('button', { name: /Award and assign/ }));
        await waitFor(() => expect(onClose).toHaveBeenCalled());

        for (const id of PREVIEW_IDS) {
          expect(isInvalidated(queryClient, ['appraisal', id, 'assignments'])).toBe(true);
        }
      },
    );

    it('leaves the cache alone after a 4xx refusal, which changed nothing', async () => {
      const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
      seed(queryClient);
      mockApi(PREVIEW);
      server.use(
        http.post('*/quotations/q-1/finalize', () =>
          HttpResponse.json({ title: 'Bad', detail: 'Refused' }, { status: 400 }),
        ),
      );
      const invalidate = vi.spyOn(queryClient, 'invalidateQueries');
      const { user } = open({}, queryClient);

      await user.click(await screen.findByRole('button', { name: /Award and assign/ }));
      await waitFor(() => expect(toastMock.error).toHaveBeenCalledWith('Refused'));

      for (const id of PREVIEW_IDS) {
        expect(isInvalidated(queryClient, ['appraisal', id, 'assignments'])).toBe(false);
        expect(isInvalidated(queryClient, ['appraisal', id, 'fees'])).toBe(false);
      }
      // Nothing was committed, so the task lists are not refetched either; only the preview is re-read.
      expect(invalidate).not.toHaveBeenCalledWith({ queryKey: ['my-tasks'] });
      expect(invalidate).toHaveBeenCalledWith({
        queryKey: quotationKeys.autoAssignPreview('q-1'),
      });
    });
  });

  it('offers no auto-assign when the preview says the quotation is not standalone', async () => {
    const sent = mockApi({ ...PREVIEW, standalone: false });
    const { user } = open();

    expect(await screen.findByText(/only available for standalone quotations/)).toBeInTheDocument();
    const toggle = screen.getByRole('switch');
    expect(toggle).toBeDisabled();
    expect(toggle).not.toBeChecked();
    expect(screen.queryByText('Readiness')).not.toBeInTheDocument();

    // A plain award, with no autoAssign for the backend to refuse.
    await user.click(submitButton());
    await waitFor(() => expect(sent()).toBeDefined());
    expect(sent()).toEqual({ companyQuotationId: 'cq-1', reason: '' });
  });

  it('shows a generic badge when a Skipped or Failed row has a null or unknown reason', async () => {
    mockApi({
      ...PREVIEW,
      appraisals: [
        row('a1'),
        row('a2', { predictedOutcome: 'Skipped', reason: null }),
        row('a3', { predictedOutcome: 'Failed', reason: 'somethingNew' }),
        row('a4', { predictedOutcome: 'Skipped', reason: 'somethingNew' }),
      ],
    });
    open();

    await screen.findByRole('button', { name: 'Award and assign 1 appraisal(s)' });
    expect(screen.getAllByText('Skipped')).toHaveLength(2);
    expect(screen.getByText('Will not be assigned')).toBeInTheDocument();
  });

  it('renders the company name as text, never as HTML', async () => {
    const hostile = '<img src="x" onerror="alert(1)">Evil Co';
    open({ allowAutoAssign: false, companyName: hostile });

    expect(
      await screen.findByText(
        (_, el) => el?.tagName === 'P' && !!el.textContent?.includes(hostile),
      ),
    ).toBeInTheDocument();
    expect(document.querySelector('img')).toBeNull();
    // Still bold, and the bold text is the literal name, not parsed markup.
    expect(document.querySelector('strong')?.textContent).toBe(hostile);
  });

  it('does not let a name containing <strong> add a second bold element', async () => {
    // Without escaping the name before <Trans> parses the string, this would nest a real <strong>
    // inside the template's own one, even with shouldUnescape set.
    const hostile = '<strong>Injected</strong>Evil';
    open({ allowAutoAssign: false, companyName: hostile });

    const paragraph = await screen.findByText(
      (_, el) => el?.tagName === 'P' && !!el.textContent?.includes(hostile),
    );
    const bold = paragraph.querySelectorAll('strong');
    expect(bold).toHaveLength(1);
    expect(bold[0].textContent).toBe(hostile);
  });

  it('does not follow a legal name that ends with a period by a sentence period', async () => {
    open({ allowAutoAssign: false, companyName: 'Thai Appraisal Co., Ltd.' });

    const bold = await screen.findByText('Thai Appraisal Co., Ltd.');
    expect(bold.tagName).toBe('STRONG');
    expect(bold.parentElement?.textContent).not.toContain('Ltd..');
  });

  it('shows the winner name in bold', async () => {
    open({ allowAutoAssign: false });

    expect((await screen.findByText('Winner Co')).tagName).toBe('STRONG');
  });
});
