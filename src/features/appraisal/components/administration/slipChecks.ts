import {
  ASSIGNMENT_REMARKS_MAX,
  type AssignmentFormType,
} from '@/features/appraisal/schemas/administration';
import type { FeePreview } from '@/features/appraisal/types/feePreview';

/**
 * Pre-submit checklist for the assignment slip (the work order), as a pure function of the form and the
 * page's flags. The rules mirror AdministrationPage: the zod refines in schemas/administration.ts
 * (type, off-system company, assignee, follow-up, remark) and the guards at the top of onSubmit (workflow task, task
 * owner, quotation lock, quotation winner). A missing fee base blocks Assign for every type (the
 * server rejects it too); only a loaded fee-preview can say so, so loading / failed never blocks.
 */

/**
 * What the fee-preview says about the appraisal fee (feeCode '01'), for the slip:
 * ready = a billable base exists, pending = the quotation has no winner yet, missing = no
 * billable base (shown as "—", never 0.00), unknown = not loaded or failed (no claim either way).
 */
export type FeeStatus = 'ready' | 'pending' | 'missing' | 'unknown';

/**
 * The server's verdict (`hasBillableBase`) decides ready or not. An API that does not send it yet
 * falls back to a 01 item with an amount above 0. Waiting for a quotation winner is "pending" (it
 * does not block) only until the winner is ready: after that, no billable base is "missing".
 */
export function feeStatusOf(preview: FeePreview | undefined, winnerReady = false): FeeStatus {
  if (!preview) return 'unknown';
  const hasBase =
    preview.hasBillableBase ?? preview.items.some(i => i.feeCode === '01' && i.amount > 0);
  if (hasBase) return 'ready';
  return preview.baseSource.kind === 'QuotationPending' && !winnerReady ? 'pending' : 'missing';
}

export type SlipCheckId =
  | 'type'
  | 'company'
  | 'assignee'
  | 'followup'
  | 'quotationSent'
  | 'quotationWinner'
  | 'fee'
  | 'remarks';

/** ok = met, warn = unmet but allowed, error = unmet and blocks, todo = not reached yet (blocks). */
export type SlipCheckStatus = 'ok' | 'warn' | 'error' | 'todo';

/** Every key the checklist can return, so a typed `t(key)` accepts it (appraisal namespace). */
export type SlipKey =
  | 'administration.slip.checks.typeMissing'
  | 'administration.slip.checks.assigneeOk'
  | 'administration.slip.checks.assigneeAuto'
  | 'administration.slip.checks.staffMissing'
  | 'administration.slip.checks.companyMissing'
  | 'administration.slip.checks.companyOk'
  | 'administration.slip.checks.keyerOk'
  | 'administration.slip.checks.keyerAuto'
  | 'administration.slip.checks.keyerMissing'
  | 'administration.slip.checks.followupOk'
  | 'administration.slip.checks.followupMissing'
  | 'administration.slip.checks.quotationSentOk'
  | 'administration.slip.checks.quotationSentTodo'
  | 'administration.slip.checks.winnerOk'
  | 'administration.slip.checks.winnerTodo'
  | 'administration.slip.checks.feeOk'
  | 'administration.slip.checks.feeMissing'
  | 'administration.slip.checks.remarksTooLong'
  | 'administration.slip.checks.title'
  | 'administration.slip.checks.titleQuotation'
  | 'administration.toasts.noWorkflowTask'
  | 'administration.toasts.notTaskOwner'
  | 'administration.slip.reason.companyMissing'
  | 'administration.slip.reason.staffMissing'
  | 'administration.slip.reason.feeMissing'
  | 'administration.slip.reason.quotationNotFinalized'
  | 'administration.toasts.quotationLocked'
  | 'validation.assignmentTypeRequired'
  | 'validation.selectFollowupStaff';

export interface SlipCheck {
  id: SlipCheckId;
  status: SlipCheckStatus;
  labelKey: SlipKey;
  /** Interpolation values for labelKey (the remark's limit). */
  labelParams?: Record<string, string | number>;
}

export interface SlipChecksInput {
  assignmentType: AssignmentFormType['assignmentType'] | '';
  assignmentMethod: AssignmentFormType['assignmentMethod'];
  staffId: string | null;
  companyId: string | null;
  followupStaffMethod: AssignmentFormType['followupStaffMethod'];
  followupStaffId: string | null;
  /** The remark is over ASSIGNMENT_REMARKS_MAX characters. */
  remarksTooLong: boolean;
  /** The page has an open workflow task (workflowInstanceId). */
  hasWorkflowTask: boolean;
  isTaskOwner: boolean;
  /** A non-terminal quotation owns the appraisal. */
  isLockedByQuotation: boolean;
  /** Number and status of that quotation, for the lock message. */
  lockedQuotation?: { quotationNumber: string; status: string } | null;
  /** Status of the page's active quotation; null when there is none. */
  quotationStatus: string | null;
  /** The active quotation is Finalized and its winner resolved. */
  quotationWinnerReady: boolean;
  feeStatus: FeeStatus;
  /**
   * Which fields the admin has dealt with (touched, "go fix", or a submit attempt). An unmet
   * check on a field that is not revealed yet shows the neutral `todo` marker and a muted block
   * reason, so a fresh page is not red. Leave it out to reveal everything.
   */
  revealed?: Partial<Record<SlipCheckId, boolean>>;
  /** A submit attempt has been made: every error is revealed. */
  submitted?: boolean;
}

export interface SlipChecksResult {
  checks: SlipCheck[];
  okCount: number;
  total: number;
  /**
   * Worst status in the list: error beats warn, which beats neutral (only to-dos: unmet but not
   * failed), which beats ok. Drives the count's colour.
   */
  tone: 'ok' | 'neutral' | 'warn' | 'error';
  titleKey: 'administration.slip.checks.title' | 'administration.slip.checks.titleQuotation';
  /** Why Assign is disabled; undefined when it can be pressed. */
  blockReason?: SlipKey;
  /** Interpolation values for blockReason (the quotation lock message). */
  blockParams?: Record<string, string>;
  /** error = something to fix now (red); muted = waiting on someone/something else (grey). */
  blockTone?: 'error' | 'muted';
}

/** A quotation that has gone out to the companies (anything past Draft, short of Cancelled). */
const SENT_STATUSES = [
  'Sent',
  'UnderAdminReview',
  'PendingRmSelection',
  'WinnerTentative',
  'Negotiating',
  'Finalized',
];

const filled = (value: string | null) => value !== null && value.length > 0;

export function computeSlipChecks(input: SlipChecksInput): SlipChecksResult {
  const { assignmentType: type, assignmentMethod: method } = input;
  const isOffline = type === 'external-offline';
  const isExternal = type === 'external';
  const isManual = method === 'manual';
  // The submit guard tests the method alone, so this does too (a stale 'quotation' still blocks).
  const isQuotation = method === 'quotation';
  const { remarksTooLong } = input;

  const isRevealed = (id: SlipCheckId) =>
    input.revealed === undefined || !!input.submitted || !!input.revealed[id];
  const checks: SlipCheck[] = [];
  const add = (
    id: SlipCheckId,
    status: SlipCheckStatus,
    labelKey: SlipKey,
    labelParams?: SlipCheck['labelParams'],
  ) => {
    // An error on a field nobody has touched yet reads as "still to do", not as a failure.
    if (status === 'error' && !isRevealed(id)) {
      checks.push({ id, status: 'todo', labelKey, labelParams });
      return;
    }
    checks.push({ id, status, labelKey, labelParams });
  };

  // Zod's refine: manual needs staffId (internal / off-system keyer) or companyId (external).
  const assigneeMissing =
    isManual && (type === 'external' ? !filled(input.companyId) : !filled(input.staffId));
  // Off-system external: the company the bank engaged is always picked by hand, whatever the keyer method.
  const offlineCompanyMissing = isOffline && !filled(input.companyId);
  const followupMissing =
    isExternal && input.followupStaffMethod === 'manual' && !filled(input.followupStaffId);

  if (!type) {
    add('type', 'error', 'administration.slip.checks.typeMissing');
  } else {
    if (isOffline) {
      add(
        'company',
        offlineCompanyMissing ? 'error' : 'ok',
        offlineCompanyMissing
          ? 'administration.slip.checks.companyMissing'
          : 'administration.slip.checks.companyOk',
      );
    }
    if (isQuotation) {
      const sent = input.quotationStatus !== null && SENT_STATUSES.includes(input.quotationStatus);
      add(
        'quotationSent',
        sent ? 'ok' : 'todo',
        sent
          ? 'administration.slip.checks.quotationSentOk'
          : 'administration.slip.checks.quotationSentTodo',
      );
      add(
        'quotationWinner',
        input.quotationWinnerReady ? 'ok' : 'todo',
        input.quotationWinnerReady
          ? 'administration.slip.checks.winnerOk'
          : 'administration.slip.checks.winnerTodo',
      );
    } else if (assigneeMissing) {
      add(
        'assignee',
        'error',
        isOffline
          ? 'administration.slip.checks.keyerMissing'
          : isExternal
            ? 'administration.slip.checks.companyMissing'
            : 'administration.slip.checks.staffMissing',
      );
    } else if (isManual) {
      add(
        'assignee',
        'ok',
        isOffline ? 'administration.slip.checks.keyerOk' : 'administration.slip.checks.assigneeOk',
      );
    } else {
      add(
        'assignee',
        'ok',
        isOffline
          ? 'administration.slip.checks.keyerAuto'
          : 'administration.slip.checks.assigneeAuto',
      );
    }

    // Only a real external assignment has a follow-up staff member.
    if (isExternal) {
      add(
        'followup',
        followupMissing ? 'error' : 'ok',
        followupMissing
          ? 'administration.slip.checks.followupMissing'
          : 'administration.slip.checks.followupOk',
      );
    }

    // "pending" is covered by the quotation checks; "unknown" claims nothing.
    if (input.feeStatus === 'ready') add('fee', 'ok', 'administration.slip.checks.feeOk');
    if (input.feeStatus === 'missing') add('fee', 'error', 'administration.slip.checks.feeMissing');
  }

  if (remarksTooLong) {
    add('remarks', 'error', 'administration.slip.checks.remarksTooLong', {
      max: ASSIGNMENT_REMARKS_MAX,
    });
  }

  const okCount = checks.filter(check => check.status === 'ok').length;
  // A warn (none is produced today) makes the count amber; to-dos, revealed or not, are neutral.
  const tone = checks.some(check => check.status === 'error')
    ? 'error'
    : checks.some(check => check.status === 'warn')
      ? 'warn'
      : okCount < checks.length
        ? 'neutral'
        : 'ok';

  const result: SlipChecksResult = {
    checks,
    okCount,
    total: checks.length,
    tone,
    titleKey: isQuotation
      ? 'administration.slip.checks.titleQuotation'
      : 'administration.slip.checks.title',
  };

  // Block reasons in the order the page disables or rejects: no task, not the owner, no type,
  // quotation without a winner (the lock banner already explains the lock itself), a lock under
  // any other method, then the zod fields.
  const block = (
    reason: SlipKey,
    kind: 'error' | 'muted',
    params?: Record<string, string>,
    field?: SlipCheckId,
  ) => {
    result.blockReason = reason;
    // A field error stays muted until that field is revealed.
    result.blockTone = kind === 'error' && field && !isRevealed(field) ? 'muted' : kind;
    if (params) result.blockParams = params;
  };

  if (!input.hasWorkflowTask) block('administration.toasts.noWorkflowTask', 'muted');
  else if (!input.isTaskOwner) block('administration.toasts.notTaskOwner', 'muted');
  else if (!type) block('validation.assignmentTypeRequired', 'error', undefined, 'type');
  else if (isQuotation && !input.quotationWinnerReady) {
    block('administration.slip.reason.quotationNotFinalized', 'muted');
  } else if (input.isLockedByQuotation) {
    block('administration.toasts.quotationLocked', 'muted', {
      quotationNumber: input.lockedQuotation?.quotationNumber ?? '',
      status: input.lockedQuotation?.status ?? '',
    });
  } else if (offlineCompanyMissing) {
    block('administration.slip.reason.companyMissing', 'error', undefined, 'company');
  } else if (assigneeMissing) {
    block(
      isExternal
        ? 'administration.slip.reason.companyMissing'
        : 'administration.slip.reason.staffMissing',
      'error',
      undefined,
      'assignee',
    );
  } else if (followupMissing) {
    block('validation.selectFollowupStaff', 'error', undefined, 'followup');
  } else if (remarksTooLong) {
    block(
      'administration.slip.checks.remarksTooLong',
      'error',
      { max: String(ASSIGNMENT_REMARKS_MAX) },
      'remarks',
    );
  } else if (input.feeStatus === 'missing') {
    block('administration.slip.reason.feeMissing', 'error', undefined, 'fee');
  }

  return result;
}
