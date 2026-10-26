import type { MouseEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import clsx from 'clsx';
import { dueOf, formatDay, urgencyOf, type Urgency } from '../utils/due';
import { URGENCY_TEXT, useRemainingText } from '../utils/dueText';
import type { ReappraisalCandidateListItem, ReviewTypeCode } from '../types';

const URGENCY_DOT: Record<Urgency, string> = {
  overdue: 'bg-red-600',
  soon: 'bg-amber-500',
  year: 'bg-sky-400',
  later: '',
};

/** Review due date (AS400's EffectiveDateAppraisal) over the time left, coloured by urgency. */
export function DueCell({ dueDate }: { dueDate?: string }) {
  const remaining = useRemainingText();
  const due = dueOf(dueDate);
  if (!due) return <span className="text-(--palette-gray-300)">—</span>;
  const u = urgencyOf(due.daysLeft);
  return (
    <div className="flex flex-col gap-px whitespace-nowrap">
      <span className="font-medium text-(--palette-ink) tabular-nums">{formatDay(due.due)}</span>
      <span
        className={clsx(
          'inline-flex items-center gap-1.5 text-[11px] tabular-nums',
          URGENCY_TEXT[u],
        )}
      >
        {u !== 'later' && <span className={clsx('size-1.5 rounded-full', URGENCY_DOT[u])} />}
        {remaining(due.due, due.daysLeft)}
      </span>
    </div>
  );
}

const REVIEW_TYPE_STYLE: Record<ReviewTypeCode, string> = {
  '1': 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-300',
  '2': 'bg-(--palette-warn-wash) text-(--palette-warn)',
  '3': 'bg-(--palette-req-wash) text-(--palette-req)',
};

export function ReviewTypeChip({ code }: { code?: string }) {
  const { t } = useTranslation('reappraisal');
  if (!code) return <span className="text-(--palette-gray-300)">—</span>;
  const style =
    REVIEW_TYPE_STYLE[code as ReviewTypeCode] ??
    'bg-(--palette-surface-3) text-(--palette-gray-600)';
  return (
    <span
      className={clsx(
        'inline-flex px-2 py-0.5 rounded-full text-[11px] font-medium whitespace-nowrap',
        style,
      )}
    >
      {t(`reviewType.${code}`, { defaultValue: code })}
    </span>
  );
}

const stop = (e: MouseEvent) => e.stopPropagation();

/** Pending-tab "progress": the open reappraisal or the request waiting to be sent, else ready. */
export function ProgressCell({ item }: { item: ReappraisalCandidateListItem }) {
  const { t } = useTranslation('reappraisal');
  if (item.openAppraisalNumber != null) {
    return (
      <div className="flex flex-col gap-px whitespace-nowrap">
        <span className="inline-flex items-center gap-1.5 font-medium text-(--palette-warn)">
          <span className="size-1.5 rounded-full bg-amber-500" />
          {t('progress.appraising')}
        </span>
        <span className="text-[11px] text-(--palette-gray-500)">
          →{' '}
          {item.openAppraisalId ? (
            <Link
              to={`/appraisals/${item.openAppraisalId}`}
              onClick={stop}
              className="text-(--palette-primary-text) hover:underline"
            >
              {item.openAppraisalNumber}
            </Link>
          ) : (
            item.openAppraisalNumber
          )}
          {item.openAppraisalGroupTag &&
            ` · ${t('detail.banner.groupLabel')} ${item.openAppraisalGroupTag}`}
        </span>
      </div>
    );
  }
  if (item.openRequestNumber != null) {
    return (
      <div className="flex flex-col gap-px whitespace-nowrap">
        <span className="inline-flex items-center gap-1.5 font-medium text-sky-700 dark:text-sky-300">
          <span className="size-1.5 rounded-full bg-sky-400" />
          {t('progress.awaitingSubmit')}
        </span>
        <span className="text-[11px] text-(--palette-gray-500)">
          →{' '}
          {item.openRequestId ? (
            <Link
              to={`/requests/${item.openRequestId}`}
              onClick={stop}
              className="text-(--palette-primary-text) hover:underline"
            >
              {item.openRequestNumber}
            </Link>
          ) : (
            item.openRequestNumber
          )}
          {` · ${t('progress.draft')}`}
        </span>
      </div>
    );
  }
  return <span className="text-(--palette-gray-400)">{t('progress.ready')}</span>;
}

/** State of the reappraisal a processed book produced. */
export function NewAppraisalStatusChip({ status }: { status?: string }) {
  const { t } = useTranslation('reappraisal');
  if (!status) return null;
  const [key, style] =
    status === 'Completed'
      ? (['Completed', 'bg-primary/5 text-(--palette-primary-text) border-primary/20'] as const)
      : status === 'Cancelled'
        ? ([
            'Cancelled',
            'bg-(--palette-req-wash) text-(--palette-req) border-(--palette-req-line)',
          ] as const)
        : ([
            'Appraising',
            'bg-(--palette-warn-wash) text-(--palette-warn) border-amber-200 dark:border-amber-500/30',
          ] as const);
  return (
    <span
      className={clsx(
        'inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium border whitespace-nowrap',
        style,
      )}
    >
      {t(`processedQuick.${key}`)}
    </span>
  );
}

/** Processed tab: the new reappraisal's number (links to it) and its state. */
export function NewAppraisalCell({ item }: { item: ReappraisalCandidateListItem }) {
  const { t } = useTranslation('reappraisal');
  if (!item.newAppraisalId)
    return <span className="text-(--palette-gray-400)">{t('processed.notFound')}</span>;
  return (
    <div className="flex items-center gap-1.5 whitespace-nowrap">
      <Link
        to={`/appraisals/${item.newAppraisalId}`}
        onClick={stop}
        className="font-medium text-(--palette-primary-text) hover:underline tabular-nums"
      >
        {item.newAppraisalNumber}
      </Link>
      <NewAppraisalStatusChip status={item.newAppraisalStatus} />
    </div>
  );
}
