import { beforeEach, describe, expect, it, vi } from 'vitest';
import i18n from '@/i18n';
import { useLocation } from 'react-router-dom';
import { delay, http, HttpResponse } from 'msw';
import { render, screen, waitFor, within } from '@/test/test-utils';
import { server } from '@/test/mocks/server';
import AssignmentResultSummary from './AssignmentResultSummary';
import type { AppraisalSummaryDto, CompanyQuotationItemDto } from '../schemas/quotation';

const appraisal = (id: string, over: Partial<AppraisalSummaryDto> = {}): AppraisalSummaryDto => ({
  appraisalId: id,
  appraisalNumber: `N-${id}`,
  titles: [],
  ...over,
});

const winnerItems: CompanyQuotationItemDto[] = [
  {
    id: 'i1',
    companyQuotationId: 'cq-1',
    quotationRequestItemId: 'qri-1',
    appraisalId: 'a1',
    itemNumber: 1,
    quotedPrice: 1070,
    feeAmount: 1000,
    discount: 0,
    negotiatedDiscount: null,
    vatPercent: 7,
    estimatedDays: 5,
  },
];

// The lock-failure toast is the contract here, so record it instead of rendering a Toaster.
const toastMock = vi.hoisted(() => Object.assign(vi.fn(), { success: vi.fn(), error: vi.fn() }));
vi.mock('react-hot-toast', () => ({ default: toastMock }));

/** The summary as an admin sees it; the non-admin case sets `canOpenAdministration={false}`. */
const Summary = (
  props: Omit<React.ComponentProps<typeof AssignmentResultSummary>, 'canOpenAdministration'> &
    Partial<Pick<React.ComponentProps<typeof AssignmentResultSummary>, 'canOpenAdministration'>>,
) => <AssignmentResultSummary canOpenAdministration {...props} />;

const rowFor = (number: string) => screen.getByRole('row', { name: new RegExp(number) });

/** Shows where the router ended up (and the state it was sent with). */
const LocationProbe = () => {
  const { pathname, state } = useLocation();
  const { lockedTaskId = '', landOn = '' } =
    (state as { lockedTaskId?: string; landOn?: string } | null) ?? {};
  return <div data-testid="location">{`${pathname}|${lockedTaskId}|${landOn}`}</div>;
};

describe('AssignmentResultSummary', () => {
  beforeEach(() => vi.clearAllMocks());

  it('renders nothing for a quotation finalized before auto-assign existed', () => {
    const { container } = render(
      <Summary
        appraisals={[appraisal('a1'), appraisal('a2', { autoAssignResult: null })]}
        winnerItems={winnerItems}
      />,
    );
    expect(container).toBeEmptyDOMElement();
  });

  it('shows a badge per result, the follow-up staff and the net fee', () => {
    render(
      <Summary
        appraisals={[
          appraisal('a1', {
            autoAssignResult: 'Assigned',
            currentActivityId: 'ext-appraisal-assignment',
            assignmentStatus: 'Assigned',
            followupStaffName: 'Staff One',
            followupMethod: 'RoundRobin',
          }),
          appraisal('a2', {
            autoAssignResult: 'Failed',
            autoAssignMessage: 'Company is excluded',
            currentActivityId: 'appraisal-assignment',
            assignmentStatus: 'Pending',
            assignmentTaskId: 'task-2',
          }),
          appraisal('a3', {
            autoAssignResult: 'Parked',
            currentActivityId: 'appraisal-initiation',
            assignmentStatus: 'Pending',
          }),
        ]}
        winnerItems={winnerItems}
      />,
    );

    const assigned = within(rowFor('N-a1'));
    expect(assigned.getByText('Assigned')).toBeInTheDocument();
    expect(assigned.getByText('Staff One')).toBeInTheDocument();
    expect(assigned.getByText('Round robin')).toBeInTheDocument();
    // The activity id reads as the name the task views use.
    expect(assigned.getByText('External Appraisal Assignment')).toBeInTheDocument();
    // 1,000 less 0 discount plus 7% VAT: same figure the Finalize modal shows.
    expect(assigned.getByText(/1,070\.00/)).toBeInTheDocument();

    const failed = within(rowFor('N-a2'));
    expect(failed.getByText('Failed')).toBeInTheDocument();
    expect(failed.getByText('Company is excluded')).toBeInTheDocument();
    // The task id is what opens the Administration page, so only this row can offer it.
    expect(failed.getByRole('button', { name: 'Open Administration' })).toBeInTheDocument();

    const parked = within(rowFor('N-a3'));
    expect(parked.getByText('Parked')).toBeInTheDocument();
    expect(parked.queryByRole('button')).not.toBeInTheDocument();
  });

  it('lets the live state win: a Failed/Parked appraisal assigned by hand reads as assigned', () => {
    render(
      <Summary
        appraisals={[
          appraisal('a1', {
            autoAssignResult: 'Failed',
            assignmentStatus: 'Assigned',
            assignmentTaskId: 'task-1',
          }),
          appraisal('a2', { autoAssignResult: 'Parked', assignmentStatus: 'Pending' }),
        ]}
        winnerItems={winnerItems}
      />,
    );

    const overridden = within(rowFor('N-a1'));
    expect(overridden.getByText('Assigned on Administration page')).toBeInTheDocument();
    expect(overridden.queryByText('Failed')).not.toBeInTheDocument();
    expect(overridden.queryByRole('button')).not.toBeInTheDocument();
    // Still Pending: the stored result stands.
    expect(within(rowFor('N-a2')).getByText('Parked')).toBeInTheDocument();
  });

  it('treats Completed as assigned by hand, but not Rejected or Cancelled', () => {
    render(
      <Summary
        appraisals={[
          appraisal('a1', { autoAssignResult: 'Failed', assignmentStatus: 'Completed' }),
          appraisal('a2', { autoAssignResult: 'Failed', assignmentStatus: 'Rejected' }),
          appraisal('a3', { autoAssignResult: 'Parked', assignmentStatus: 'Cancelled' }),
        ]}
        winnerItems={winnerItems}
      />,
    );

    expect(within(rowFor('N-a1')).getByText('Assigned on Administration page')).toBeInTheDocument();
    // A rejected or cancelled assignment is not an assignment: the stored result stands.
    expect(within(rowFor('N-a2')).getByText('Failed')).toBeInTheDocument();
    expect(within(rowFor('N-a3')).getByText('Parked')).toBeInTheDocument();
  });

  describe('Open Administration', () => {
    const renderFailedRow = () =>
      render(
        <>
          <Summary
            appraisals={[
              appraisal('a2', {
                autoAssignResult: 'Failed',
                assignmentStatus: 'Pending',
                currentActivityId: 'appraisal-assignment',
                assignmentTaskId: 'task-2',
              }),
            ]}
            winnerItems={winnerItems}
          />
          <LocationProbe />
        </>,
      );

    it('locks the pool task first, then opens it on the Administration tab with the lock noted for the opening page', async () => {
      const lockCalls = vi.fn();
      server.use(
        http.post('*/tasks/task-2/lock', () => {
          lockCalls();
          return HttpResponse.json({ lockedBy: 'me', lockedAt: '2026-10-16T00:00:00Z' });
        }),
      );
      const { user } = renderFailedRow();

      await user.click(screen.getByRole('button', { name: 'Open Administration' }));

      await waitFor(() =>
        expect(screen.getByTestId('location')).toHaveTextContent(
          '/tasks/task-2/opening|task-2|administration',
        ),
      );
      expect(lockCalls).toHaveBeenCalledTimes(1);
    });

    it('shows who holds the task and stays put when the lock is refused', async () => {
      server.use(
        http.post('*/tasks/task-2/lock', () =>
          HttpResponse.json({ message: 'Task is locked by somchai' }, { status: 409 }),
        ),
      );
      const { user } = renderFailedRow();

      await user.click(screen.getByRole('button', { name: 'Open Administration' }));

      await waitFor(() =>
        expect(toastMock.error).toHaveBeenCalledWith('Task is locked by somchai'),
      );
      // No navigation: still on the page's own route.
      expect(screen.getByTestId('location').textContent).toBe('/||');
    });

    it('falls back to a generic message when a 409 carries no message', async () => {
      server.use(http.post('*/tasks/task-2/lock', () => HttpResponse.json({}, { status: 409 })));
      const { user } = renderFailedRow();

      await user.click(screen.getByRole('button', { name: 'Open Administration' }));

      await waitFor(() =>
        expect(toastMock.error).toHaveBeenCalledWith('Could not lock task. Try again.'),
      );
      expect(screen.getByTestId('location').textContent).toBe('/||');
    });

    it('opens a task that cannot be locked (assigned to a person, not a pool task) without a lock to release', async () => {
      server.use(
        http.post('*/tasks/task-2/lock', () =>
          HttpResponse.json({ message: 'Only pool tasks can be locked' }, { status: 400 }),
        ),
      );
      const { user } = renderFailedRow();

      await user.click(screen.getByRole('button', { name: 'Open Administration' }));

      // OpenTask decides access; no lockedTaskId, so it has no lock of ours to release, and no toast.
      await waitFor(() =>
        expect(screen.getByTestId('location').textContent).toBe(
          '/tasks/task-2/opening||administration',
        ),
      );
      expect(toastMock.error).not.toHaveBeenCalled();
    });

    it('disables every Open Administration button while a lock request is pending', async () => {
      server.use(
        http.post('*/tasks/:taskId/lock', async () => {
          await delay(150);
          return HttpResponse.json({ lockedBy: 'me', lockedAt: '2026-10-16T00:00:00Z' });
        }),
      );
      const { user } = render(
        <>
          <Summary
            appraisals={[
              appraisal('a2', {
                autoAssignResult: 'Failed',
                currentActivityId: 'appraisal-assignment',
                assignmentTaskId: 'task-2',
              }),
              appraisal('a3', {
                autoAssignResult: 'Failed',
                currentActivityId: 'appraisal-assignment',
                assignmentTaskId: 'task-3',
              }),
            ]}
            winnerItems={winnerItems}
          />
          <LocationProbe />
        </>,
      );

      const buttons = screen.getAllByRole('button', { name: 'Open Administration' });
      await user.click(buttons[0]);
      buttons.forEach(b => expect(b).toBeDisabled());

      await waitFor(() =>
        expect(screen.getByTestId('location')).toHaveTextContent('/tasks/task-2/opening'),
      );
    });
  });

  it('keeps a Failed row that bounced back to appraisal-assignment as needing action', () => {
    // A no-match bounce leaves the workflow right back at appraisal-assignment, whatever the status.
    render(
      <Summary
        appraisals={[
          appraisal('a1', {
            autoAssignResult: 'Failed',
            assignmentStatus: 'Assigned',
            currentActivityId: 'appraisal-assignment',
            assignmentTaskId: 'task-1',
          }),
          appraisal('a2', {
            autoAssignResult: 'Failed',
            assignmentStatus: 'Assigned',
            currentActivityId: 'ext-appraisal-assignment',
            assignmentTaskId: 'task-2',
          }),
        ]}
        winnerItems={winnerItems}
      />,
    );

    const bounced = within(rowFor('N-a1'));
    expect(bounced.getByText('Failed')).toBeInTheDocument();
    expect(bounced.getByRole('button', { name: 'Open Administration' })).toBeInTheDocument();
    // Moved on to the next activity: assigned by hand.
    expect(within(rowFor('N-a2')).getByText('Assigned on Administration page')).toBeInTheDocument();
  });

  it('shows an Assigned row that is back at appraisal-assignment as Returned, needing action again', () => {
    render(
      <Summary
        appraisals={[
          appraisal('a1', {
            autoAssignResult: 'Assigned',
            autoAssignMessage: 'Assigned to the winner',
            currentActivityId: 'appraisal-assignment',
            assignmentTaskId: 'task-1',
          }),
          // Back at the activity but no task to open: nothing to act on, so the result stands.
          appraisal('a2', {
            autoAssignResult: 'Assigned',
            currentActivityId: 'appraisal-assignment',
          }),
          // Still where the auto-assign sent it.
          appraisal('a3', {
            autoAssignResult: 'Assigned',
            currentActivityId: 'ext-appraisal-assignment',
            assignmentTaskId: 'task-3',
          }),
          // A stored Failed row (a no-match bounce) stays Failed here: only Assigned, and Skipped
          // for notPending, are read as "came back".
          appraisal('a4', {
            autoAssignResult: 'Failed',
            currentActivityId: 'appraisal-assignment',
            assignmentTaskId: 'task-4',
          }),
        ]}
        winnerItems={winnerItems}
      />,
    );

    const returned = within(rowFor('N-a1'));
    expect(returned.getByText('Back at assignment')).toBeInTheDocument();
    // The stored message describes the old outcome, so the live note replaces it.
    expect(returned.getByText('Assign it on the Administration page.')).toBeInTheDocument();
    expect(returned.queryByText('Assigned to the winner')).not.toBeInTheDocument();
    expect(returned.queryByText('Assigned')).not.toBeInTheDocument();
    expect(returned.getByRole('button', { name: 'Open Administration' })).toBeInTheDocument();

    expect(within(rowFor('N-a2')).getByText('Assigned')).toBeInTheDocument();
    expect(within(rowFor('N-a3')).getByText('Assigned')).toBeInTheDocument();
    expect(within(rowFor('N-a3')).queryByRole('button')).not.toBeInTheDocument();
    expect(within(rowFor('N-a4')).getByText('Failed')).toBeInTheDocument();
  });

  it('shows a Skipped/notPending row that is back at appraisal-assignment with a task as Returned', () => {
    render(
      <Summary
        appraisals={[
          appraisal('a1', {
            autoAssignResult: 'Skipped',
            autoAssignReasonCode: 'notPending',
            currentActivityId: 'appraisal-assignment',
            assignmentTaskId: 'task-1',
          }),
          // No task to open: nothing to act on, so it stays Skipped.
          appraisal('a2', {
            autoAssignResult: 'Skipped',
            autoAssignReasonCode: 'notPending',
            currentActivityId: 'appraisal-assignment',
          }),
        ]}
        winnerItems={winnerItems}
      />,
    );

    const returned = within(rowFor('N-a1'));
    expect(returned.getByText('Back at assignment')).toBeInTheDocument();
    expect(returned.queryByText('Skipped')).not.toBeInTheDocument();
    expect(returned.getByRole('button', { name: 'Open Administration' })).toBeInTheDocument();
    expect(within(rowFor('N-a2')).getByText('Skipped')).toBeInTheDocument();
  });

  it('hides "Open Administration" from anyone who is not an admin, but still shows the result', () => {
    render(
      <Summary
        canOpenAdministration={false}
        appraisals={[
          appraisal('a1', {
            autoAssignResult: 'Failed',
            currentActivityId: 'appraisal-assignment',
            assignmentTaskId: 'task-1',
          }),
          appraisal('a2', {
            autoAssignResult: 'Parked',
            currentActivityId: 'appraisal-assignment',
            assignmentTaskId: 'task-2',
          }),
        ]}
        winnerItems={winnerItems}
      />,
    );

    expect(within(rowFor('N-a1')).getByText('Failed')).toBeInTheDocument();
    expect(within(rowFor('N-a2')).getByText('Parked')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Open Administration' })).not.toBeInTheDocument();
  });

  it('offers "Open Administration" by the live state alone: at appraisal-assignment with a task, whatever the badge', () => {
    const at = { currentActivityId: 'appraisal-assignment' } as const;
    const away = { currentActivityId: 'ext-appraisal-assignment' } as const;
    render(
      <Summary
        appraisals={[
          // noAssignment is never relabelled (it can be stored for an appraisal that never left
          // appraisal-assignment), but the task is open, so the button is there.
          appraisal('a1', {
            autoAssignResult: 'Skipped',
            autoAssignReasonCode: 'noAssignment',
            assignmentTaskId: 'task-1',
            ...at,
          }),
          appraisal('a2', { autoAssignResult: 'Failed', assignmentTaskId: 'task-2', ...at }),
          appraisal('a3', { autoAssignResult: 'Parked', assignmentTaskId: 'task-3', ...at }),
          // Elsewhere, a task or not: no button.
          appraisal('a4', {
            autoAssignResult: 'Skipped',
            autoAssignReasonCode: 'deleted',
            assignmentTaskId: 'task-4',
            ...away,
          }),
          appraisal('a5', { autoAssignResult: 'Failed', assignmentTaskId: 'task-5', ...away }),
          // At the activity with no task to open: no button.
          appraisal('a6', { autoAssignResult: 'Failed', ...at }),
        ]}
        winnerItems={winnerItems}
      />,
    );

    const first = within(rowFor('N-a1'));
    expect(first.getByText('Skipped')).toBeInTheDocument();
    expect(first.getByRole('button', { name: 'Open Administration' })).toBeInTheDocument();
    expect(within(rowFor('N-a2')).getByRole('button')).toBeInTheDocument();
    expect(within(rowFor('N-a3')).getByRole('button')).toBeInTheDocument();
    for (const n of ['N-a4', 'N-a5', 'N-a6']) {
      expect(within(rowFor(n)).queryByRole('button')).not.toBeInTheDocument();
    }
    expect(within(rowFor('N-a4')).getByText('Skipped')).toBeInTheDocument();
  });

  it('never turns Skipped into an assigned outcome from the live assignment status alone', () => {
    // Both are away from appraisal-assignment (with a task), so only the live status could change them.
    const away = {
      currentActivityId: 'ext-appraisal-assignment',
      assignmentTaskId: 'task',
    } as const;
    render(
      <Summary
        appraisals={[
          // "Assignment is not pending (status 'X')" is recorded as Skipped, and X is often an assigned status.
          appraisal('a1', {
            autoAssignResult: 'Skipped',
            autoAssignReasonCode: 'notPending',
            assignmentStatus: 'Assigned',
            autoAssignMessage: "Assignment is not pending (status 'Assigned')",
            ...away,
          }),
          appraisal('a2', {
            autoAssignResult: 'Skipped',
            autoAssignReasonCode: 'notPending',
            assignmentStatus: 'Cancelled',
            ...away,
          }),
        ]}
        winnerItems={winnerItems}
      />,
    );
    const first = within(rowFor('N-a1'));
    expect(first.getByText('Skipped')).toBeInTheDocument();
    expect(
      first.getByText(
        'The assignment was no longer pending when the quotation was finalized, so it was not assigned.',
      ),
    ).toBeInTheDocument();
    expect(within(rowFor('N-a2')).getByText('Skipped')).toBeInTheDocument();
  });

  describe('reason code', () => {
    it('shows translated text by code instead of the stored message', () => {
      render(
        <Summary
          appraisals={[
            appraisal('a1', {
              autoAssignResult: 'Skipped',
              autoAssignReasonCode: 'deleted',
              autoAssignMessage: 'Appraisal is deleted',
            }),
            appraisal('a2', {
              autoAssignResult: 'Failed',
              autoAssignReasonCode: 'staffIneligible',
              autoAssignMessage: 'Staff x is not in the pool',
            }),
            appraisal('a3', {
              autoAssignResult: 'Parked',
              autoAssignReasonCode: 'notAtAssignment',
              autoAssignMessage: "Appraisal is at 'ext-appraisal-assignment', not at assignment",
              currentActivityId: 'appraisal-initiation',
            }),
          ]}
          winnerItems={winnerItems}
        />,
      );

      expect(
        within(rowFor('N-a1')).getByText('The appraisal was deleted, so it was not assigned.'),
      ).toBeInTheDocument();
      expect(within(rowFor('N-a1')).queryByText('Appraisal is deleted')).not.toBeInTheDocument();
      expect(
        within(rowFor('N-a2')).getByText(
          'The follow-up staff member is not eligible for this appraisal. Assign it on the Administration page.',
        ),
      ).toBeInTheDocument();
      // The activity id stays out of the text: the "Now at" column already says where it is.
      expect(
        within(rowFor('N-a3')).getByText(
          'The appraisal was not at the assignment step. Assign it on the Administration page once it gets there.',
        ),
      ).toBeInTheDocument();
      expect(
        within(rowFor('N-a3')).queryByText(/ext-appraisal-assignment/),
      ).not.toBeInTheDocument();
    });

    it('reads in Thai in a Thai UI', async () => {
      // Same order as TitleTable.deedColumn.test: register the namespace, then switch, so the
      // Thai bundle is loaded before render and nothing suspends.
      await i18n.loadNamespaces('quotation');
      await i18n.changeLanguage('th');
      try {
        render(
          <Summary
            appraisals={[
              appraisal('a1', {
                autoAssignResult: 'Failed',
                autoAssignReasonCode: 'assignFailed',
                autoAssignMessage: 'boom',
              }),
            ]}
            winnerItems={winnerItems}
          />,
        );

        expect(
          within(rowFor('N-a1')).getByText('จ่ายงานไม่สำเร็จ ให้ลองจ่ายใหม่ที่หน้า Administration'),
        ).toBeInTheDocument();
      } finally {
        await i18n.changeLanguage('en');
      }
    });

    it('falls back to the stored message for a null or unknown code', () => {
      render(
        <Summary
          appraisals={[
            appraisal('a1', {
              autoAssignResult: 'Failed',
              autoAssignMessage: 'Company is excluded',
            }),
            appraisal('a2', {
              autoAssignResult: 'Failed',
              autoAssignReasonCode: 'somethingNew',
              autoAssignMessage: 'A brand new failure',
            }),
            // Own-property check: an inherited name must not look like a code.
            appraisal('a3', {
              autoAssignResult: 'Failed',
              autoAssignReasonCode: 'constructor',
              autoAssignMessage: 'Odd code',
            }),
          ]}
          winnerItems={winnerItems}
        />,
      );

      expect(within(rowFor('N-a1')).getByText('Company is excluded')).toBeInTheDocument();
      expect(within(rowFor('N-a2')).getByText('A brand new failure')).toBeInTheDocument();
      expect(within(rowFor('N-a3')).getByText('Odd code')).toBeInTheDocument();
    });

    it('follows the translated prefix of assignRejected with the stored message', () => {
      render(
        <Summary
          appraisals={[
            appraisal('a1', {
              autoAssignResult: 'Failed',
              autoAssignReasonCode: 'assignRejected',
              autoAssignMessage: 'Company is excluded',
            }),
            appraisal('a2', { autoAssignResult: 'Failed', autoAssignReasonCode: 'assignRejected' }),
          ]}
          winnerItems={winnerItems}
        />,
      );

      expect(
        within(rowFor('N-a1')).getByText('Assignment was rejected: Company is excluded'),
      ).toBeInTheDocument();
      expect(within(rowFor('N-a2')).getByText('Assignment was rejected')).toBeInTheDocument();
    });

    it('keeps the live note for a row whose live state replaced the stored result', () => {
      render(
        <Summary
          appraisals={[
            appraisal('a1', {
              autoAssignResult: 'Failed',
              autoAssignReasonCode: 'assignFailed',
              assignmentStatus: 'Assigned',
            }),
          ]}
          winnerItems={winnerItems}
        />,
      );

      const row = within(rowFor('N-a1'));
      expect(row.getByText('Assigned by hand on the Administration page.')).toBeInTheDocument();
      expect(row.queryByText(/Assignment failed/)).not.toBeInTheDocument();
    });

    it('turns Skipped into Returned at appraisal-assignment only for notPending', () => {
      const back = { currentActivityId: 'appraisal-assignment', assignmentTaskId: 'task' } as const;
      render(
        <Summary
          appraisals={[
            appraisal('a1', {
              autoAssignResult: 'Skipped',
              autoAssignReasonCode: 'deleted',
              ...back,
            }),
            appraisal('a2', {
              autoAssignResult: 'Skipped',
              autoAssignReasonCode: 'workflowEnded',
              ...back,
            }),
            appraisal('a3', {
              autoAssignResult: 'Skipped',
              autoAssignReasonCode: 'noAssignment',
              ...back,
            }),
            appraisal('a4', {
              autoAssignResult: 'Skipped',
              autoAssignReasonCode: 'notPending',
              ...back,
            }),
          ]}
          winnerItems={winnerItems}
        />,
      );

      for (const n of ['N-a1', 'N-a2', 'N-a3']) {
        expect(within(rowFor(n)).getByText('Skipped')).toBeInTheDocument();
      }
      const returned = within(rowFor('N-a4'));
      expect(returned.getByText('Back at assignment')).toBeInTheDocument();
      expect(returned.queryByText('Skipped')).not.toBeInTheDocument();
      expect(returned.getByRole('button', { name: 'Open Administration' })).toBeInTheDocument();
    });

    const HISTORICAL_NOTE =
      'Auto-assign went through, but the workflow went to an unexpected step at that time.';

    it('shows Assigned/workflowElsewhere as Assigned once it has moved on, with the historical note', () => {
      render(
        <Summary
          appraisals={[
            appraisal('a1', {
              autoAssignResult: 'Assigned',
              autoAssignReasonCode: 'workflowElsewhere',
              autoAssignMessage: "Workflow is at 'appraisal-initiation'",
              assignmentStatus: 'Assigned',
              currentActivityId: 'ext-appraisal-assignment',
            }),
          ]}
          winnerItems={winnerItems}
        />,
      );

      const moved = within(rowFor('N-a1'));
      expect(moved.getByText('Assigned')).toBeInTheDocument();
      expect(moved.queryByText('Failed')).not.toBeInTheDocument();
      expect(moved.queryByText('Assigned on Administration page')).not.toBeInTheDocument();
      // Describes finalize time, never the present; the stored snapshot's activity id is not shown.
      expect(moved.getByText(HISTORICAL_NOTE)).toBeInTheDocument();
      expect(moved.queryByText(/appraisal-initiation/)).not.toBeInTheDocument();
      expect(moved.queryByRole('button')).not.toBeInTheDocument();
      // No row badge says Failed, so the stat label is the only "Failed" text.
      expect(screen.getByText('Failed').previousSibling).toHaveTextContent('0');
    });

    it('shows Assigned/workflowElsewhere back at appraisal-assignment with a task as Returned', () => {
      render(
        <Summary
          appraisals={[
            appraisal('a1', {
              autoAssignResult: 'Assigned',
              autoAssignReasonCode: 'workflowElsewhere',
              assignmentStatus: 'Assigned',
              currentActivityId: 'appraisal-assignment',
              assignmentTaskId: 'task-1',
            }),
          ]}
          winnerItems={winnerItems}
        />,
      );

      const back = within(rowFor('N-a1'));
      expect(back.getByText('Back at assignment')).toBeInTheDocument();
      // The Returned note wins over the historical one.
      expect(back.getByText('Assign it on the Administration page.')).toBeInTheDocument();
      expect(back.queryByText(HISTORICAL_NOTE)).not.toBeInTheDocument();
      expect(back.getByRole('button', { name: 'Open Administration' })).toBeInTheDocument();
    });

    it('shows Assigned/workflowElsewhere routed back to Pending elsewhere as plain Assigned', () => {
      const state = { assignmentStatus: 'Pending', currentActivityId: 'appraisal-initiation' };
      render(
        <Summary
          appraisals={[
            appraisal('a1', {
              autoAssignResult: 'Assigned',
              autoAssignReasonCode: 'workflowElsewhere',
              ...state,
            }),
            appraisal('a2', { autoAssignResult: 'Assigned', ...state }),
          ]}
          winnerItems={winnerItems}
        />,
      );

      for (const n of ['N-a1', 'N-a2']) {
        const row = within(rowFor(n));
        expect(row.getByText('Assigned')).toBeInTheDocument();
        expect(row.queryByText('Failed')).not.toBeInTheDocument();
        expect(row.queryByRole('button')).not.toBeInTheDocument();
      }
    });
  });
});
