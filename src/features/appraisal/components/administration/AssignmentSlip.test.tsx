import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@/test/test-utils';
import AssignmentSlip, { type AssignmentSlipProps } from './AssignmentSlip';
import { computeSlipChecks, type SlipChecksInput } from './slipChecks';

// Echo the key plus its interpolation values, so the amounts passed to t() can be asserted.
vi.mock('react-i18next', async importOriginal => {
  const actual = await importOriginal<typeof import('react-i18next')>();
  return {
    ...actual,
    useTranslation: () => ({
      t: (key: string, options?: Record<string, unknown>) =>
        options && Object.keys(options).length > 0 ? `${key} ${JSON.stringify(options)}` : key,
      i18n: { language: 'en' },
    }),
  };
});

const INPUT: SlipChecksInput = {
  assignmentType: 'external',
  assignmentMethod: 'manual',
  staffId: null,
  companyId: 'c1',
  followupStaffMethod: 'roundrobin',
  followupStaffId: null,
  remarksTooLong: false,
  hasWorkflowTask: true,
  isTaskOwner: true,
  isLockedByQuotation: false,
  lockedQuotation: null,
  quotationStatus: null,
  quotationWinnerReady: false,
  feeStatus: 'ready',
};

const FEE = { subtotal: 3000, vat: 210, total: 3210 };

function props(
  over: Partial<AssignmentSlipProps> = {},
  input: Partial<SlipChecksInput> = {},
): AssignmentSlipProps {
  return {
    assignmentType: 'external',
    assignmentMethod: 'manual',
    assigneeName: 'ABC Appraisal Co.',
    followupMethod: 'roundrobin',
    fee: FEE,
    feeStatus: 'ready',
    result: computeSlipChecks({ ...INPUT, ...input }),
    onFix: vi.fn(),
    isDirty: false,
    isAssigning: false,
    isSavingDraft: false,
    onAssign: vi.fn(),
    onSaveDraft: vi.fn(),
    onCancel: vi.fn(),
    ...over,
  };
}

describe('AssignmentSlip (draft)', () => {
  it('shows the draft badge, the type, the recipient and the follow-up segment', () => {
    render(<AssignmentSlip {...props()} />);
    expect(screen.getByText('administration.slip.status.draft')).toBeInTheDocument();
    expect(screen.getByText('administration.assignmentType.external')).toBeInTheDocument();
    expect(screen.getByText('ABC Appraisal Co.')).toBeInTheDocument();
    expect(screen.getByText('administration.slip.segment.followup')).toBeInTheDocument();
    // round-robin follow-up reads as automatic
    expect(screen.getAllByText('administration.slip.auto')).toHaveLength(1);
  });

  it('internal has no follow-up segment', () => {
    render(
      <AssignmentSlip
        {...props({ assignmentType: 'internal' }, { assignmentType: 'internal', staffId: 's1' })}
      />,
    );
    expect(screen.queryByText('administration.slip.segment.followup')).not.toBeInTheDocument();
  });

  it('shows total, before VAT and VAT from the fee preview', () => {
    render(<AssignmentSlip {...props()} />);
    expect(screen.getByText('administration.slip.fee.total')).toBeInTheDocument();
    expect(screen.getByText(/3,210\.00/)).toBeInTheDocument();
    expect(
      screen.getByText('administration.slip.fee.beforeVat {"amount":"฿3,000.00"}'),
    ).toBeInTheDocument();
    expect(
      screen.getByText('administration.slip.fee.vat {"amount":"฿210.00"}'),
    ).toBeInTheDocument();
  });

  it('fee null shows a dash and the "none" note, never 0.00', () => {
    const { container } = render(
      <AssignmentSlip {...props({ fee: null, feeStatus: 'missing' }, { feeStatus: 'missing' })} />,
    );
    expect(screen.getByText('—')).toBeInTheDocument();
    expect(screen.getByText('administration.slip.fee.none')).toBeInTheDocument();
    expect(screen.queryByText('administration.slip.fee.total')).not.toBeInTheDocument();
    expect(container.textContent).not.toMatch(/0\.00/);
  });

  it('a pending fee shows the waiting text instead of an amount', () => {
    const { container } = render(
      <AssignmentSlip {...props({ fee: null, feeStatus: 'pending' }, { feeStatus: 'pending' })} />,
    );
    expect(screen.getByText('feePreview.pending.title')).toBeInTheDocument();
    expect(container.textContent).not.toMatch(/0\.00/);
  });

  it('a manual pick without a name reads as not selected', () => {
    render(<AssignmentSlip {...props({ assigneeName: null })} />);
    expect(screen.getByText('administration.slip.notSelected')).toBeInTheDocument();
  });

  it('lists the checks and "go to fix" calls onFix with the check id', async () => {
    const onFix = vi.fn();
    const { user } = render(
      <AssignmentSlip
        {...props(
          { onFix, assigneeName: null },
          { companyId: null, followupStaffMethod: 'manual' },
        )}
      />,
    );
    expect(screen.getByText('administration.slip.checks.companyMissing')).toBeInTheDocument();
    expect(screen.getByText('administration.slip.checks.followupMissing')).toBeInTheDocument();
    // An ok check (fee) has no fix button; the two failing ones do.
    const fixes = screen.getAllByRole('button', { name: /administration\.slip\.checks\.fixAria/ });
    expect(fixes).toHaveLength(2);
    await user.click(fixes[0]);
    expect(onFix).toHaveBeenCalledTimes(1);
    expect(onFix).toHaveBeenCalledWith('assignee');
    await user.click(fixes[1]);
    expect(onFix).toHaveBeenLastCalledWith('followup');
  });

  it('quotation to-dos name no "go fix": they are done on the quotation card', () => {
    render(
      <AssignmentSlip
        {...props(
          { assignmentMethod: 'quotation', assigneeName: null },
          { assignmentMethod: 'quotation' },
        )}
      />,
    );
    expect(screen.getByText('administration.slip.checks.quotationSentTodo')).toBeInTheDocument();
    expect(screen.getByText('administration.slip.checks.winnerTodo')).toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: /administration\.slip\.checks\.fixAria/ }),
    ).not.toBeInTheDocument();
  });

  it('an untouched field reads as a neutral to-do: and "go fix" is still offered', () => {
    render(
      <AssignmentSlip {...props({ assigneeName: null }, { companyId: null, revealed: {} })} />,
    );
    expect(
      screen.getByRole('img', { name: 'administration.slip.checks.status.todo' }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole('img', { name: 'administration.slip.checks.status.error' }),
    ).not.toBeInTheDocument();
    expect(screen.getByText('administration.slip.reason.companyMissing')).toHaveClass(
      'text-gray-500',
    );
    expect(
      screen.getByRole('button', { name: /administration\.slip\.checks\.fixAria/ }),
    ).toBeInTheDocument();
  });

  it('a complete draft enables Assign and calls onAssign', async () => {
    const onAssign = vi.fn();
    const { user } = render(<AssignmentSlip {...props({ onAssign })} />);
    const assign = screen.getByRole('button', { name: /administration\.assign$/ });
    expect(assign).toBeEnabled();
    await user.click(assign);
    expect(onAssign).toHaveBeenCalledTimes(1);
  });

  it('a blocked draft disables Assign and shows the reason', () => {
    render(<AssignmentSlip {...props({ assigneeName: null }, { companyId: null })} />);
    const assign = screen.getByRole('button', { name: /administration\.assign$/ });
    expect(assign).toBeDisabled();
    const reason = screen.getByText('administration.slip.reason.companyMissing');
    expect(assign).toHaveAttribute('aria-describedby', reason.id);
  });

  it('shows Save draft and the unsaved note only when dirty', async () => {
    const onSaveDraft = vi.fn();
    const { rerender, user } = render(<AssignmentSlip {...props({ onSaveDraft })} />);
    expect(screen.queryByText('administration.saveDraft')).not.toBeInTheDocument();
    rerender(<AssignmentSlip {...props({ onSaveDraft, isDirty: true })} />);
    expect(screen.getByText('administration.unsavedChanges')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /administration\.saveDraft$/ }));
    expect(onSaveDraft).toHaveBeenCalledTimes(1);
  });
});

describe('AssignmentSlip (read-only)', () => {
  const readOnly = (over: Partial<AssignmentSlipProps> = {}) =>
    props({
      readOnly: true,
      assignedAt: '2026-10-20T09:30:00',
      assignedBy: 'E0042',
      assignedByName: 'Somchai',
      ...over,
    });

  it('shows the assigned badge, the recipient, who and when, and no actions or checklist', () => {
    render(<AssignmentSlip {...readOnly()} />);
    expect(screen.getByText('administration.slip.status.assigned')).toBeInTheDocument();
    expect(screen.queryByText('administration.slip.status.draft')).not.toBeInTheDocument();
    expect(screen.getByText('ABC Appraisal Co.')).toBeInTheDocument();
    expect(
      screen.getByText('administration.slip.readOnly.assignedBy {"by":"Somchai (E0042)"}'),
    ).toBeInTheDocument();
    expect(screen.getByText(/administration\.slip\.readOnly\.assignedAt/)).toBeInTheDocument();
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
    expect(screen.queryByText('administration.slip.checks.title')).not.toBeInTheDocument();
  });

  it('shows only the code when the name is not known', () => {
    render(<AssignmentSlip {...readOnly({ assignedByName: null })} />);
    expect(
      screen.getByText('administration.slip.readOnly.assignedBy {"by":"E0042"}'),
    ).toBeInTheDocument();
  });

  it('shows only the name when there is no code', () => {
    render(<AssignmentSlip {...readOnly({ assignedBy: null })} />);
    expect(
      screen.getByText('administration.slip.readOnly.assignedBy {"by":"Somchai"}'),
    ).toBeInTheDocument();
  });

  it('leaves the assigned-by line out when neither name nor code is known', () => {
    render(<AssignmentSlip {...readOnly({ assignedBy: null, assignedByName: null })} />);
    expect(
      screen.queryByText(/administration\.slip\.readOnly\.assignedBy/),
    ).not.toBeInTheDocument();
    expect(screen.getByText(/administration\.slip\.readOnly\.assignedAt/)).toBeInTheDocument();
  });

  it('shows the stored recipient even when the method is round-robin', () => {
    render(<AssignmentSlip {...readOnly({ assignmentMethod: 'roundrobin' })} />);
    expect(screen.getByText('ABC Appraisal Co.')).toBeInTheDocument();
  });
});
