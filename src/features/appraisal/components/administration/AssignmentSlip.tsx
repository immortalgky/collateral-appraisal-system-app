import { type ReactNode, useId } from 'react';
import { useTranslation } from 'react-i18next';
import clsx from 'clsx';
import Badge from '@/shared/components/Badge';
import Button from '@/shared/components/Button';
import Icon from '@/shared/components/Icon';
import FormCard from '@/shared/components/sections/FormCard';
import { formatLocaleDateTime } from '@/shared/utils/dateUtils';
import { formatCurrency } from '@/shared/utils/formatUtils';
import { personLabel } from '@/features/appraisal/utils/personLabel';
import type { FeePreview } from '@/features/appraisal/types/feePreview';
import type {
  FeeStatus,
  SlipCheck,
  SlipCheckId,
  SlipCheckStatus,
  SlipChecksInput,
  SlipChecksResult,
} from './slipChecks';

/** The three figures the slip shows; the fee-preview response has them, so the page can pass it as is. */
export type SlipFee = Pick<FeePreview, 'subtotal' | 'vat' | 'total'>;

export interface AssignmentSlipProps {
  /** e.g. "69105526 · Construction inspection". */
  subtitle?: string;
  /** A made assignment (or a read-only page): shows who and when, no checklist, no actions. */
  readOnly?: boolean;
  /**
   * The assignment has been made (badge "Assigned"). Defaults to readOnly; a page that is
   * read-only for permission reasons while the assignment is still a draft passes false.
   */
  isAssigned?: boolean;
  /** Drops the card chrome so the slip can sit inside the bottom sheet. */
  embedded?: boolean;
  /** For placement, e.g. `xl:sticky xl:top-0`. */
  className?: string;

  assignmentType: SlipChecksInput['assignmentType'];
  assignmentMethod: SlipChecksInput['assignmentMethod'];
  /** The chosen staff member or company. Draft: used for a manual pick. Read-only: always shown. */
  assigneeName?: string | null;
  /** The chosen company is the one that did the prior inspection: adds "(previous company)". */
  isPreviousCompany?: boolean;
  followupMethod: SlipChecksInput['followupStaffMethod'];
  followupName?: string | null;
  /** Off-system external: the company the bank engaged (the recipient row is the keyer). */
  offlineCompanyName?: string | null;
  /** The finalized quotation's winner, once there is one (quotation method). */
  quotationWinnerName?: string | null;

  /** From the same fee-preview the fee card reads. Only shown when feeStatus is 'ready'. */
  fee: SlipFee | null;
  feeStatus: FeeStatus;

  /** The checklist and the reason Assign is disabled: computeSlipChecks(...). */
  result: SlipChecksResult;
  /** "Go to fix": the page scrolls to / focuses the field behind this check. */
  onFix: (id: SlipCheckId) => void;

  isDirty: boolean;
  isAssigning: boolean;
  isSavingDraft: boolean;
  onAssign: () => void;
  onSaveDraft: () => void;
  onCancel: () => void;

  /** Read-only only. assignedAt is local time (no Z); assignedBy is an employee code. */
  assignedAt?: string | null;
  assignedBy?: string | null;
  assignedByName?: string | null;
  /** Read-only only: the "อีเมลถึงบริษัท" section (EXT / EXTO), under the details. */
  emailSection?: ReactNode;
}

const MARKER: Record<SlipCheckStatus, { box: string; icon?: string }> = {
  ok: {
    box: 'bg-green-100 dark:bg-green-500/20 text-green-600 dark:text-green-400',
    icon: 'check',
  },
  warn: { box: 'bg-amber-100 dark:bg-amber-500/20 text-(--palette-warn)', icon: 'exclamation' },
  error: { box: 'bg-red-100 dark:bg-red-500/20 text-(--palette-danger)', icon: 'xmark' },
  todo: { box: 'border border-(--palette-line-strong) bg-(--palette-surface)' },
};

const TONE_TEXT = {
  ok: 'text-green-700 dark:text-green-300',
  neutral: 'text-(--palette-gray-500)',
  warn: 'text-(--palette-warn)',
  error: 'text-(--palette-req)',
} as const;

/** The quotation steps are done on the quotation card; the board gives them no "go fix". */
const NO_FIX: SlipCheckId[] = ['quotationSent', 'quotationWinner'];

const ROW = 'border-b border-(--palette-line-soft) px-5 py-2.5';

function Muted({ children }: { children: ReactNode }) {
  return <span className="font-normal text-(--palette-gray-500)">{children}</span>;
}

function Row({
  label,
  className,
  children,
}: {
  label: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <div className={clsx(ROW, className)}>
      <dt className="text-xs text-(--palette-gray-500)">{label}</dt>
      <dd className="text-sm font-medium break-words text-(--palette-ink)">{children}</dd>
    </div>
  );
}

function CheckItem({ check, onFix }: { check: SlipCheck; onFix: (id: SlipCheckId) => void }) {
  const { t } = useTranslation('appraisal');
  const marker = MARKER[check.status];
  const label = t(check.labelKey, check.labelParams);
  return (
    <li className="flex items-center gap-2 py-0.5 text-sm">
      <span
        role="img"
        aria-label={t(`administration.slip.checks.status.${check.status}`)}
        className={clsx('grid size-4.5 shrink-0 place-items-center rounded-full', marker.box)}
      >
        {marker.icon && <Icon name={marker.icon} style="solid" className="text-xs" />}
      </span>
      <span
        className={clsx(
          'min-w-0',
          check.status === 'ok' ? 'text-(--palette-gray-600)' : 'text-(--palette-ink)',
        )}
      >
        {label}
      </span>
      {check.status !== 'ok' && !NO_FIX.includes(check.id) && (
        <button
          type="button"
          onClick={() => onFix(check.id)}
          aria-label={t('administration.slip.checks.fixAria', { label })}
          className="ml-auto shrink-0 text-xs font-medium text-(--palette-primary-text) hover:underline"
        >
          {t('administration.slip.checks.fix')}
        </button>
      )}
    </li>
  );
}

/** The recipient line. A made assignment shows what was stored; a draft shows what the method means. */
function useRecipient(props: AssignmentSlipProps): ReactNode {
  const { t } = useTranslation('appraisal');
  const { assignmentType, assignmentMethod, assigneeName, isPreviousCompany, readOnly } = props;
  const named = (
    <>
      {assigneeName}
      {isPreviousCompany && (
        <>
          {' '}
          <Muted>{t('administration.slip.previousCompany')}</Muted>
        </>
      )}
    </>
  );
  // A read-only page never says "not selected": nothing stored means there is no data.
  const empty = (
    <Muted>{t(readOnly ? 'administration.noData' : 'administration.slip.notSelected')}</Muted>
  );
  if (!assignmentType) return empty;
  if (readOnly && assigneeName) return named;
  if (assignmentMethod === 'quotation') {
    return props.quotationWinnerName ?? <Muted>{t('administration.slip.awaitingWinner')}</Muted>;
  }
  if (assignmentMethod === 'roundrobin') return t('administration.slip.auto');
  return assigneeName ? named : empty;
}

function FeeBlock({ fee, feeStatus }: Pick<AssignmentSlipProps, 'fee' | 'feeStatus'>) {
  const { t } = useTranslation('appraisal');
  if (feeStatus === 'ready' && fee) {
    return (
      <>
        <div className="mt-0.5 flex flex-wrap items-baseline gap-x-2">
          <span className="text-sm font-medium text-(--palette-gray-500)">
            {t('administration.slip.fee.total')}
          </span>
          <span className="text-2xl leading-tight font-bold text-(--palette-ink) tabular-nums">
            {formatCurrency(fee.total)}
          </span>
        </div>
        <div className="flex gap-3.5 text-xs text-(--palette-gray-500) tabular-nums">
          <span>
            {t('administration.slip.fee.beforeVat', { amount: formatCurrency(fee.subtotal) })}
          </span>
          <span>{t('administration.slip.fee.vat', { amount: formatCurrency(fee.vat) })}</span>
        </div>
      </>
    );
  }
  if (feeStatus === 'pending') {
    return <Muted>{t('feePreview.pending.title')}</Muted>;
  }
  // No amount: a dash, never 0.00.
  return (
    <>
      <div className="mt-0.5 text-2xl leading-tight font-bold text-(--palette-gray-400)">—</div>
      {feeStatus === 'missing' && (
        <div className="text-xs font-normal text-(--palette-gray-500)">
          {t('administration.slip.fee.none')}
        </div>
      )}
    </>
  );
}

/**
 * The assignment slip (the work order): what this assignment will be, what is still missing, and the
 * actions. Pure props: the page owns the form, the fee-preview query and the handlers. Place it
 * in a sticky rail (className) on wide screens; AssignmentSlipBar wraps it for narrow ones.
 */
export default function AssignmentSlip(props: AssignmentSlipProps) {
  const { t, i18n } = useTranslation(['appraisal', 'common']);
  const reasonId = useId();
  const {
    subtitle,
    readOnly = false,
    isAssigned = readOnly,
    embedded = false,
    className,
    assignmentType,
    followupMethod,
    followupName,
    offlineCompanyName,
    fee,
    feeStatus,
    result,
    onFix,
    isDirty,
    isAssigning,
    isSavingDraft,
    onAssign,
    onSaveDraft,
    onCancel,
    assignedAt,
    assignedBy,
    assignedByName,
    emailSection,
  } = props;

  const recipient = useRecipient(props);
  const isOffline = assignmentType === 'external-offline';
  const showFollowup = assignmentType === 'external';
  const followup =
    followupName ??
    (followupMethod === 'roundrobin' ? (
      t('administration.slip.auto')
    ) : (
      <Muted>{t(readOnly ? 'administration.noData' : 'administration.slip.notSelected')}</Muted>
    ));
  const typeLabel = assignmentType ? (
    <>
      {t(
        assignmentType === 'internal'
          ? 'administration.assignmentType.internal'
          : 'administration.assignmentType.external',
      )}
      {isOffline && (
        <>
          {' '}
          <Muted>{t('administration.slip.offlineSuffix')}</Muted>
        </>
      )}
    </>
  ) : (
    <Muted>{t(readOnly ? 'administration.noData' : 'administration.slip.notSelected')}</Muted>
  );

  const assignedAtText = assignedAt ? formatLocaleDateTime(assignedAt, i18n.language) : null;
  // The system stamps "System", or nothing, on an assignment it made itself (as the API reads it);
  // a name without a code is still a person.
  const bySystem =
    isAssigned &&
    !!assignedAt &&
    !assignedByName?.trim() &&
    (!assignedBy?.trim() || assignedBy.trim().toLowerCase() === 'system');
  const assignedByText = bySystem ? null : personLabel(assignedByName, assignedBy) || null;

  return (
    <FormCard
      title={t('administration.slip.title')}
      subtitle={subtitle}
      noPadding
      className={clsx('@container', embedded && 'rounded-none! border-0! shadow-none!', className)}
      rightIcon={
        <Badge tone={isAssigned ? 'green' : 'yellow'} className="whitespace-nowrap">
          {isAssigned
            ? t('administration.slip.status.assigned')
            : t('administration.slip.status.draft')}
        </Badge>
      }
    >
      {/* Two columns once the slip is wider than the sticky rail (the bottom sheet): type and
          follow-up (off-system: the company) side by side, recipient and fee full width. */}
      <dl className="grid @lg:grid-cols-2">
        <Row
          label={t('administration.slip.segment.type')}
          className={clsx('@lg:order-1', !showFollowup && !isOffline && '@lg:col-span-2')}
        >
          {typeLabel}
        </Row>
        <Row
          label={t(
            isOffline
              ? 'administration.slip.segment.keyer'
              : 'administration.slip.segment.assignee',
          )}
          className="@lg:order-3 @lg:col-span-2"
        >
          {recipient}
        </Row>
        {isOffline && (
          <Row label={t('administration.slip.segment.company')} className="@lg:order-2">
            {offlineCompanyName || (
              <Muted>
                {t(readOnly ? 'administration.noData' : 'administration.slip.notSelected')}
              </Muted>
            )}
          </Row>
        )}
        {showFollowup && (
          <Row label={t('administration.slip.segment.followup')} className="@lg:order-2">
            {followup}
          </Row>
        )}
        <Row label={t('administration.slip.segment.fee')} className="@lg:order-4 @lg:col-span-2">
          <FeeBlock fee={fee} feeStatus={feeStatus} />
        </Row>
      </dl>

      {readOnly && emailSection}

      {readOnly ? (
        (assignedAtText || assignedByText) && (
          <div className="flex flex-col gap-0.5 px-5 py-3 text-xs text-(--palette-gray-500)">
            {assignedAtText && (
              <span>{t('administration.slip.readOnly.assignedAt', { at: assignedAtText })}</span>
            )}
            {assignedByText && (
              <span>{t('administration.slip.readOnly.assignedBy', { by: assignedByText })}</span>
            )}
            {bySystem && <span>{t('administration.slip.readOnly.bySystem')}</span>}
          </div>
        )
      ) : (
        <>
          <div className="px-5 pt-2.5 pb-1.5">
            <div className="mb-0.5 flex items-center justify-between text-xs font-semibold text-(--palette-gray-600)">
              <h4>{t(result.titleKey)}</h4>
              <span className={TONE_TEXT[result.tone]}>
                <span aria-hidden="true">
                  {result.okCount} / {result.total}
                </span>
                <span className="sr-only">
                  {t('administration.slip.checks.progress', {
                    ok: result.okCount,
                    total: result.total,
                  })}
                </span>
              </span>
            </div>
            <ul>
              {result.checks.map(check => (
                <CheckItem key={check.id} check={check} onFix={onFix} />
              ))}
            </ul>
          </div>

          <div className="flex flex-col gap-2 px-5 pt-2.5 pb-4">
            <Button
              type="button"
              size="lg"
              fullWidth
              onClick={onAssign}
              isLoading={isAssigning}
              disabled={!!result.blockReason || isSavingDraft}
              aria-describedby={result.blockReason ? reasonId : undefined}
              leftIcon={isAssigning ? undefined : <Icon name="paper-plane" style="solid" />}
            >
              {isAssigning ? t('administration.assigning') : t('administration.assign')}
            </Button>
            {result.blockReason && (
              <p
                id={reasonId}
                className={clsx(
                  'text-center text-xs',
                  result.blockTone === 'error'
                    ? 'text-(--palette-req)'
                    : 'text-(--palette-gray-500)',
                )}
              >
                {t(result.blockReason, result.blockParams)}
              </p>
            )}
            {isDirty && (
              <Button
                type="button"
                variant="outline"
                fullWidth
                onClick={onSaveDraft}
                isLoading={isSavingDraft}
                disabled={isAssigning}
                leftIcon={isSavingDraft ? undefined : <Icon name="floppy-disk" style="solid" />}
              >
                {isSavingDraft ? t('administration.savingDraft') : t('administration.saveDraft')}
              </Button>
            )}
            <Button
              type="button"
              variant="ghost"
              fullWidth
              onClick={onCancel}
              className="text-(--palette-gray-500)!"
            >
              {t('common:actions.cancel')}
            </Button>
            {isDirty && (
              <p className="flex items-center justify-center gap-1.5 text-center text-xs text-(--palette-warn)">
                <span className="size-1.5 shrink-0 rounded-full bg-amber-500" aria-hidden="true" />
                {t('administration.unsavedChanges')}
              </p>
            )}
          </div>
        </>
      )}
    </FormCard>
  );
}
