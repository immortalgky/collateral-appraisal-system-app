import { useTranslation } from 'react-i18next';
import { useNow } from '@shared/hooks/useNow';
import { formatShortDateTime } from '@shared/utils/dateUtils';
import type { WebhookDeliverySummary } from '../types';

const DAY_MS = 24 * 60 * 60 * 1000;

interface DeliveryPendingBannerProps {
  pending: number;
  oldest: NonNullable<WebhookDeliverySummary['oldestPending']>;
  /** Hidden when the Pending tab is already showing. */
  onView?: () => void;
}

/** "N still waiting" notice (DESIGN.md section 7): how many, since when, and whether any was ever tried. */
const DeliveryPendingBanner = ({ pending, oldest, onView }: DeliveryPendingBannerProps) => {
  const { t, i18n } = useTranslation('webhookAdmin');
  const now = useNow();
  const since = oldest.createdAt ? new Date(oldest.createdAt) : null;
  // The "since when" part is left out when the oldest date is not known.
  const sincePart = since
    ? t('pendingBanner.since', {
        since: formatShortDateTime(since, i18n.language),
        days: t('pendingBanner.days', {
          count: Math.max(0, Math.floor((now.getTime() - since.getTime()) / DAY_MS)),
        }),
      })
    : null;
  const neverPart =
    oldest.neverAttemptedCount > 0
      ? t('pendingBanner.never', { count: oldest.neverAttemptedCount })
      : null;

  return (
    <div
      role="status"
      className="flex flex-wrap items-center gap-x-3 gap-y-1.5 rounded-lg border border-amber-200 bg-amber-50 px-3 py-1.5 text-xs text-gray-700"
    >
      <span>
        <span className="font-semibold text-amber-700">
          {t('pendingBanner.count', { count: pending })}
        </span>{' '}
        {[sincePart, neverPart].filter(Boolean).join(' · ')}
      </span>
      {oldest.bySystem.length > 0 && (
        <span className="text-gray-400">
          {oldest.bySystem.map(s => `${s.systemCode} ${s.count}`).join(' · ')}
        </span>
      )}
      {onView && (
        <button type="button" onClick={onView} className="font-medium text-primary hover:underline">
          {t('pendingBanner.view')}
        </button>
      )}
    </div>
  );
};

export default DeliveryPendingBanner;
