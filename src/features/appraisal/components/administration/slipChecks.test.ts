import { describe, expect, it } from 'vitest';
import { computeSlipChecks, feeStatusOf, type SlipChecksInput } from './slipChecks';
import type { FeePreview } from '@/features/appraisal/types/feePreview';

const READY: SlipChecksInput = {
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
const run = (patch: Partial<SlipChecksInput> = {}) => computeSlipChecks({ ...READY, ...patch });
const statuses = (patch: Partial<SlipChecksInput> = {}) =>
  Object.fromEntries(run(patch).checks.map(c => [c.id, c.status]));

describe('computeSlipChecks: revealing errors', () => {
  const pristine = { companyId: null, revealed: {} };

  it('an unmet field nobody touched is neutral: todo marker, neutral tone, muted reason', () => {
    const r = run(pristine);
    expect(r.checks[0]).toMatchObject({ id: 'assignee', status: 'todo' });
    expect([r.tone, r.blockTone]).toEqual(['neutral', 'muted']);
    expect(r.blockReason).toBe('administration.slip.reason.companyMissing');
  });

  it('turns red once that field is touched, or after a submit attempt', () => {
    const touched = run({ ...pristine, revealed: { assignee: true } });
    expect([touched.checks[0].status, touched.tone, touched.blockTone]).toEqual([
      'error',
      'error',
      'error',
    ]);
    expect(run({ ...pristine, submitted: true }).checks[0].status).toBe('error');
  });

  it('a missing fee is neutral until revealed, and a field touched elsewhere does not reveal it', () => {
    const r = run({ feeStatus: 'missing', revealed: { followup: true } });
    expect(r.checks.find(c => c.id === 'fee')?.status).toBe('todo');
    expect([r.tone, r.blockTone]).toEqual(['neutral', 'muted']);
  });

  it('a missing fee turns red once "go fix" reveals it, or after a submit attempt', () => {
    const fixed = run({ feeStatus: 'missing', revealed: { fee: true } });
    expect(fixed.checks.find(c => c.id === 'fee')?.status).toBe('error');
    expect([fixed.tone, fixed.blockTone]).toEqual(['error', 'error']);
    expect(run({ feeStatus: 'missing', revealed: {}, submitted: true }).tone).toBe('error');
  });
});

describe('computeSlipChecks: tone of a quotation to-do', () => {
  it('quotation steps still to do are neutral, not amber', () => {
    const r = run({ assignmentMethod: 'quotation', feeStatus: 'pending', revealed: {} });
    expect(r.checks.map(c => c.status)).toEqual(['todo', 'todo', 'ok']);
    expect(r.tone).toBe('neutral');
  });
});

describe('computeSlipChecks', () => {
  it('a complete external manual draft passes 3 of 3 and can be assigned', () => {
    const r = run();
    expect(r.checks.map(c => c.id)).toEqual(['assignee', 'followup', 'fee']);
    expect([r.okCount, r.total, r.tone, r.blockReason]).toEqual([3, 3, 'ok', undefined]);
  });

  it('manual external without a company is an error and blocks with selectAssignee', () => {
    const r = run({ companyId: null });
    expect(statuses({ companyId: null }).assignee).toBe('error');
    expect(r.tone).toBe('error');
    expect([r.blockReason, r.blockTone]).toEqual([
      'administration.slip.reason.companyMissing',
      'error',
    ]);
    expect(run({ assignmentType: 'internal' }).blockReason).toBe(
      'administration.slip.reason.staffMissing',
    );
  });

  it('manual followup needs a person, round-robin does not', () => {
    expect(statuses({ followupStaffMethod: 'manual' }).followup).toBe('error');
    expect(run({ followupStaffMethod: 'manual' }).blockReason).toBe(
      'validation.selectFollowupStaff',
    );
    expect(statuses({ followupStaffMethod: 'manual', followupStaffId: 's1' }).followup).toBe('ok');
  });

  it('internal and off-system need staffId and have no followup row', () => {
    expect(statuses({ assignmentType: 'internal' })).toEqual({ assignee: 'error', fee: 'ok' });
    expect(statuses({ assignmentType: 'external-offline', staffId: 's1' })).toEqual({
      company: 'ok',
      assignee: 'ok',
      fee: 'ok',
    });
  });

  it('off-system needs its company whatever the keyer method, and names it first', () => {
    const r = run({
      assignmentType: 'external-offline',
      assignmentMethod: 'roundrobin',
      companyId: null,
    });
    expect(r.checks[0]).toMatchObject({
      id: 'company',
      status: 'error',
      labelKey: 'administration.slip.reason.companyMissing',
    });
    expect(r.blockReason).toBe('administration.slip.reason.companyMissing');
    // Untouched: a to-do, and the reason is muted.
    expect(
      run({
        assignmentType: 'external-offline',
        assignmentMethod: 'roundrobin',
        companyId: null,
        revealed: {},
      }).blockTone,
    ).toBe('muted');
  });

  it('names the missing recipient per type (company / staff / keyer)', () => {
    const label = (patch: Partial<SlipChecksInput>) => run(patch).checks[0].labelKey;
    expect(label({ companyId: null })).toBe('administration.slip.checks.companyMissing');
    expect(label({ assignmentType: 'internal' })).toBe('administration.slip.checks.staffMissing');
    // Off-system: the company check comes first, then the keyer.
    expect(run({ assignmentType: 'external-offline' }).checks[1].labelKey).toBe(
      'administration.slip.checks.keyerMissing',
    );
    // An empty string counts as missing, like the schema's length check.
    expect(statuses({ companyId: '' }).assignee).toBe('error');
  });

  it('external follow-up manual without staff blocks even when the company is picked', () => {
    const r = run({ followupStaffMethod: 'manual', followupStaffId: null });
    expect(r.tone).toBe('error');
    expect([r.blockReason, r.blockTone]).toEqual(['validation.selectFollowupStaff', 'error']);
    // Not external: the follow-up field does not exist, so a stale manual value is ignored.
    expect(
      run({ assignmentType: 'internal', staffId: 's1', followupStaffMethod: 'manual' }).blockReason,
    ).toBeUndefined();
  });

  it('a quotation winner that is not ready blocks, a draft quotation is not "sent"', () => {
    const draft = run({ assignmentMethod: 'quotation', quotationStatus: 'Draft' });
    expect(draft.checks[0]).toMatchObject({ id: 'quotationSent', status: 'todo' });
    expect(draft.blockReason).toBe('administration.slip.reason.quotationNotFinalized');
    const noQuotation = run({ assignmentMethod: 'quotation', quotationStatus: null });
    expect(noQuotation.checks[0].status).toBe('todo');
    // Finalized status alone is not enough without the resolved winner.
    expect(run({ assignmentMethod: 'quotation', quotationStatus: 'Finalized' }).blockReason).toBe(
      'administration.slip.reason.quotationNotFinalized',
    );
  });

  it('a quotation lock blocks with muted tone', () => {
    const r = run({ isLockedByQuotation: true });
    expect([r.blockReason, r.blockTone]).toEqual([
      'administration.toasts.quotationLocked',
      'muted',
    ]);
  });

  it('only the task owner can assign: a non-owner is blocked even with a perfect form', () => {
    const r = run({ isTaskOwner: false });
    expect(r.tone).toBe('ok');
    expect([r.blockReason, r.blockTone]).toEqual(['administration.toasts.notTaskOwner', 'muted']);
  });

  it('round-robin passes without a pick', () => {
    expect(run({ assignmentMethod: 'roundrobin', companyId: null }).blockReason).toBeUndefined();
  });

  it('a missing fee blocks Assign for every type; pending and unknown add no fee row and never block', () => {
    for (const patch of [
      {},
      { assignmentType: 'internal' as const, staffId: 's1' },
      { assignmentType: 'external-offline' as const, staffId: 's1' },
      { assignmentMethod: 'roundrobin' as const, companyId: null },
    ]) {
      const r = run({ ...patch, feeStatus: 'missing' });
      expect([statuses({ ...patch, feeStatus: 'missing' }).fee, r.tone, r.blockReason]).toEqual([
        'error',
        'error',
        'administration.slip.reason.feeMissing',
      ]);
    }
    for (const feeStatus of ['pending', 'unknown'] as const) {
      expect(statuses({ feeStatus }).fee).toBeUndefined();
      expect(run({ feeStatus }).blockReason).toBeUndefined();
    }
  });

  it('a fee reason comes after the fields that block first', () => {
    expect(run({ feeStatus: 'missing', companyId: null }).blockReason).toBe(
      'administration.slip.reason.companyMissing',
    );
    expect(run({ feeStatus: 'missing', remarksTooLong: true }).blockReason).toBe(
      'administration.slip.checks.remarksTooLong',
    );
  });

  it('quotation method waits for a winner and uses the quotation checklist', () => {
    const waiting = run({ assignmentMethod: 'quotation', quotationStatus: 'Sent' });
    expect(waiting.checks.map(c => [c.id, c.status])).toEqual([
      ['quotationSent', 'ok'],
      ['quotationWinner', 'todo'],
      ['followup', 'ok'],
      ['fee', 'ok'],
    ]);
    expect(waiting.titleKey).toBe('administration.slip.checks.titleQuotation');
    expect([waiting.blockReason, waiting.blockTone]).toEqual([
      'administration.slip.reason.quotationNotFinalized',
      'muted',
    ]);
    const done = run({
      assignmentMethod: 'quotation',
      quotationStatus: 'Finalized',
      quotationWinnerReady: true,
    });
    expect(done.blockReason).toBeUndefined();
  });

  it('an open quotation under another method blocks with the lock message and its values', () => {
    const r = run({
      isLockedByQuotation: true,
      lockedQuotation: { quotationNumber: 'QT-1', status: 'Sent' },
    });
    expect(r.blockReason).toBe('administration.toasts.quotationLocked');
    expect(r.blockParams).toEqual({ quotationNumber: 'QT-1', status: 'Sent' });
  });

  it('no task and not-the-owner come before any form problem', () => {
    expect(run({ hasWorkflowTask: false, companyId: null }).blockReason).toBe(
      'administration.toasts.noWorkflowTask',
    );
    const r = run({ isTaskOwner: false, companyId: null });
    expect([r.blockReason, r.blockTone]).toEqual(['administration.toasts.notTaskOwner', 'muted']);
  });

  it('no type leaves only the type check; a long remark is an error', () => {
    const noType = run({ assignmentType: '' });
    expect(noType.checks.map(c => c.id)).toEqual(['type']);
    expect(noType.blockReason).toBe('validation.assignmentTypeRequired');
    const long = run({ remarksTooLong: true });
    expect(long.checks[long.checks.length - 1]).toMatchObject({ id: 'remarks', status: 'error' });
    expect(long.blockReason).toBe('administration.slip.checks.remarksTooLong');
    expect(run({ remarksTooLong: false }).blockReason).toBeUndefined();
  });
});

describe('feeStatusOf', () => {
  const preview = (
    kind: string,
    items: Array<[feeCode: string, amount: number]>,
    hasBillableBase?: boolean,
  ) =>
    ({
      baseSource: { kind },
      items: items.map(([feeCode, amount]) => ({ feeCode, amount })),
      hasBillableBase,
    }) as unknown as FeePreview;

  it('maps the fee-preview to what the slip claims (an API without the verdict: read the items)', () => {
    expect(feeStatusOf(undefined)).toBe('unknown');
    expect(feeStatusOf(preview('Tier', [['01', 3000]]))).toBe('ready');
    expect(feeStatusOf(preview('None', []))).toBe('missing');
    expect(feeStatusOf(preview('None', [['99', 500]]))).toBe('missing');
    expect(feeStatusOf(preview('Quotation', [['01', 0]]))).toBe('missing');
    expect(feeStatusOf(preview('QuotationPending', []))).toBe('pending');
  });

  it("follows the server's hasBillableBase when it sends one", () => {
    // A 01 of 0 is not billable, whatever the items say; a billable verdict wins over the items.
    expect(feeStatusOf(preview('Tier', [['01', 3000]], false))).toBe('missing');
    expect(feeStatusOf(preview('Quotation', [['01', 0]], true))).toBe('ready');
    expect(feeStatusOf(preview('None', [], true))).toBe('ready');
  });

  it('waiting for a quotation winner is pending only until the winner is ready', () => {
    const waiting = preview('QuotationPending', [], false);
    expect(feeStatusOf(waiting)).toBe('pending');
    expect(feeStatusOf(waiting, false)).toBe('pending');
    // A Finalized winner with no price: no billable base, and Assign must be blocked.
    expect(feeStatusOf(waiting, true)).toBe('missing');
    expect(feeStatusOf(preview('Quotation', [], false), true)).toBe('missing');
  });
});
