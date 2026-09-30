import { Fragment } from 'react';
import { useTranslation } from 'react-i18next';
import { formatLocaleDateTime } from '@/shared/utils/dateUtils';
import type { PropertyCorrectionDtoType } from '@shared/schemas/v1';
import { propertyFieldLabel } from '../utils/correctionHistory';

/** Enough to recognise the edit; the full change list is one click away in the history. */
const MAX_CHANGES = 3;

interface LatestCorrectionCardProps {
  correction: PropertyCorrectionDtoType;
  onViewAll: () => void;
}

/** A changed value: struck-through "from" (omitted when there was none) → "to" (`empty`, struck, when none). */
export const ChangeValues = ({
  from,
  to,
  empty = '—',
}: {
  from?: string | null;
  to?: string | null;
  empty?: string;
}) => (
  <>
    {/* '' is as empty as null: the audit stores a cleared text field as an empty string. */}
    {from != null && from !== '' && (
      <>
        <s className="text-gray-400">{from}</s>
        <span className="text-gray-400" aria-hidden="true">
          {' → '}
        </span>
      </>
    )}
    {to != null && to !== '' ? to : <s className="text-gray-400">{empty}</s>}
  </>
);

/** The newest correction of one property, so its last edit is visible without opening the history. */
const LatestCorrectionCard = ({ correction, onViewAll }: LatestCorrectionCardProps) => {
  const { t, i18n } = useTranslation('appraisalDataCorrection');
  const shown = correction.changes.slice(0, MAX_CHANGES);
  const hidden = correction.changes.length - shown.length;

  return (
    <div className="space-y-2 rounded-lg border border-gray-200 bg-white px-4 py-3">
      <div className="flex items-center justify-between gap-3">
        <p className="min-w-0 truncate text-xs font-semibold text-gray-600">
          {t('detail.latestEdit')} · {formatLocaleDateTime(correction.changedAt, i18n.language)} ·{' '}
          {correction.changedBy}
        </p>
        <button
          type="button"
          onClick={onViewAll}
          className="shrink-0 rounded text-xs font-semibold text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
        >
          {t('detail.viewAll')}
        </button>
      </div>
      <dl className="grid grid-cols-[auto_minmax(0,1fr)] gap-x-4 gap-y-0.5 rounded-md bg-gray-50 px-3 py-2 text-xs">
        {shown.map((change, idx) => (
          <Fragment key={`${change.field}-${idx}`}>
            <dt className="text-gray-500">{propertyFieldLabel(change.field)}</dt>
            <dd className="min-w-0 break-words text-gray-900">
              <ChangeValues from={change.from} to={change.to} />
            </dd>
          </Fragment>
        ))}
      </dl>
      {hidden > 0 && (
        <p className="text-[11px] text-gray-400">{t('detail.moreChanges', { count: hidden })}</p>
      )}
      {correction.reason && (
        <p className="text-xs text-gray-600">
          <span className="text-gray-400">{t('history.reasonLabel')}</span>{' '}
          <span className="italic">{correction.reason}</span>
        </p>
      )}
    </div>
  );
};

export default LatestCorrectionCard;
