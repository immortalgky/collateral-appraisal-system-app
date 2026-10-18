import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import type { PriorAppraisalSource } from '../types';

const BADGE = 'inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium border';

interface StatusBadgeProps {
  status: string;
  hasOpenAppraisal: boolean;
  openAppraisalNumber?: string;
  openAppraisalGroupTag?: string;
  openAppraisalId?: string;
  openRequestNumber?: string;
  /** Put the "→ number" line under the badge (list) instead of beside it (detail header). */
  stacked?: boolean;
}

/**
 * Candidate status. "In progress" covers both an open reappraisal appraisal and a request that
 * Initiate created but staff have not submitted yet — the line under it says which.
 */
export function ReappraisalStatusBadge({
  status,
  hasOpenAppraisal,
  openAppraisalNumber,
  openAppraisalGroupTag,
  openAppraisalId,
  openRequestNumber,
  stacked = false,
}: StatusBadgeProps) {
  const { t } = useTranslation('reappraisal');
  let badge: ReactNode;

  if (status === 'Consumed') {
    badge = (
      <span className={`${BADGE} bg-gray-100 text-gray-500 border-gray-200`}>
        {t('badge.used')}
      </span>
    );
  } else if (status === 'Deleted') {
    badge = (
      <span className={`${BADGE} bg-rose-50 text-rose-700 border-rose-200`}>
        {t('badge.notReviewing')}
      </span>
    );
  } else if (status === 'Pending' && hasOpenAppraisal) {
    badge = (
      <span className={`${BADGE} bg-amber-50 text-amber-700 border-amber-200`}>
        {t('badge.inProgress')}
      </span>
    );
  } else {
    badge = (
      <span className={`${BADGE} bg-green-50 text-green-700 border-green-200`}>
        {t('badge.pending')}
      </span>
    );
  }

  let link: ReactNode = null;
  if (openAppraisalNumber != null) {
    link = (
      <span
        className="text-[10px] text-gray-400 whitespace-nowrap"
        data-appraisal-id={openAppraisalId}
        title={openAppraisalGroupTag != null ? `Group ${openAppraisalGroupTag}` : undefined}
      >
        → {openAppraisalNumber}
        {openAppraisalGroupTag != null && (
          <span className="ml-1 text-gray-300">· {openAppraisalGroupTag}</span>
        )}
      </span>
    );
  } else if (openRequestNumber != null) {
    link = (
      <span className="text-[10px] text-gray-400 whitespace-nowrap">
        → {openRequestNumber}
        <span className="ml-1 text-gray-300">· {t('badge.awaitingSubmit')}</span>
      </span>
    );
  }

  return (
    <div className={stacked ? 'flex flex-col gap-0.5' : 'flex items-center gap-2'}>
      {badge}
      {link}
    </div>
  );
}

const SOURCE_STYLE: Record<PriorAppraisalSource, string> = {
  CAS: 'bg-teal-50 text-teal-700 border-teal-200',
  AS400Legacy: 'bg-violet-50 text-violet-700 border-violet-200',
  Unknown: 'bg-rose-50 text-rose-700 border-rose-200',
};

/**
 * Where the prior book lives — a legacy AS400 book (99A…) or not found. A CAS appraisal is the normal
 * case and gets no badge, so the badge only appears where it says something.
 */
export function PriorSourceBadge({ source }: { source: PriorAppraisalSource }) {
  const { t } = useTranslation('reappraisal');
  // Anything unexpected (or missing, e.g. an older API) reads as "not found", label and style alike.
  const key: PriorAppraisalSource = source in SOURCE_STYLE ? source : 'Unknown';
  if (key === 'CAS') return null;
  return (
    <span className={`${BADGE} whitespace-nowrap ${SOURCE_STYLE[key]}`}>
      {t(`priorSource.${key}`)}
    </span>
  );
}
