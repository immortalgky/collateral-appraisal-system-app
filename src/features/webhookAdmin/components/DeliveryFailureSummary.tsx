import { Link } from 'react-router-dom';
import clsx from 'clsx';
import { useTranslation } from 'react-i18next';
import { useHasPermission } from '@shared/hooks/useHasPermission';
import { httpStatusText } from '../utils/httpStatus';
import type { WebhookDeliverySummary } from '../types';

interface DeliveryFailureSummaryProps {
  summary: WebhookDeliverySummary;
  /** The event type the list is filtered to, if a chip is pressed. */
  activeEventType: string;
  onToggleEventType: (eventType: string) => void;
}

/**
 * Why the Failed tab is failing: the top causes (one line each, naming the receiving endpoint)
 * and the failing event types as chips that filter the list.
 */
const DeliveryFailureSummary = ({
  summary,
  activeEventType,
  onToggleEventType,
}: DeliveryFailureSummaryProps) => {
  const { t } = useTranslation('webhookAdmin');
  const canManageSubscriptions = useHasPermission('WEBHOOK_SUBSCRIPTIONS_MANAGE');
  const { failedByCause, failedByEventType, failed } = summary;

  if (failedByCause.length === 0 && failedByEventType.length === 0) return null;

  return (
    <div className="flex flex-col gap-2 border-b border-gray-100 px-4 py-2.5">
      {failedByCause.map(cause => {
        const all = cause.count === failed;
        const status = cause.lastStatusCode != null ? httpStatusText(cause.lastStatusCode) : '';
        const params = { count: cause.count, system: cause.systemCode, status };
        const sentence =
          cause.lastStatusCode == null
            ? all
              ? t('failure.noResponseAll', params)
              : t('failure.noResponseSome', params)
            : all
              ? t('failure.httpAll', params)
              : t('failure.httpSome', params);
        return (
          <div
            key={`${cause.systemCode}|${cause.lastStatusCode}|${cause.httpMethod}|${cause.callbackUrl}`}
            className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-gray-700"
          >
            <span className="font-semibold text-red-700">{sentence}</span>
            <span className="text-gray-400">·</span>
            <span>
              {t('failure.destination')}{' '}
              <span className="font-mono text-gray-600">
                {cause.httpMethod} {cause.callbackUrl}
              </span>
            </span>
            {canManageSubscriptions && (
              <Link to="/admin/webhook-subscriptions" className="text-primary hover:underline">
                {t('failure.checkSubscription', { system: cause.systemCode })}
              </Link>
            )}
          </div>
        );
      })}
      {failedByEventType.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {failedByEventType.map(e => {
            const active = e.eventType === activeEventType;
            return (
              <button
                key={e.eventType}
                type="button"
                aria-pressed={active}
                onClick={() => onToggleEventType(e.eventType)}
                className={clsx(
                  'inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border px-2.5 py-0.5 text-xs transition-colors',
                  active
                    ? 'border-primary bg-primary-50 text-primary-700'
                    : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300',
                )}
              >
                <span className="font-mono">{e.eventType}</span>
                <b className="font-semibold tabular-nums text-gray-800">{e.count}</b>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default DeliveryFailureSummary;
