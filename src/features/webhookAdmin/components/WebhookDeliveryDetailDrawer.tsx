import { useMemo, useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import clsx from 'clsx';
import SlideOverPanel from '@shared/components/SlideOverPanel';
import Badge from '@shared/components/Badge';
import Button from '@shared/components/Button';
import Icon from '@shared/components/Icon';
import { Skeleton } from '@shared/components/Skeleton';
import DataErrorState from '@shared/components/DataErrorState';
import { useHasPermission } from '@shared/hooks/useHasPermission';
import { copyToClipboard } from '@shared/utils/clipboard';
import { formatShortDateTime } from '@shared/utils/dateUtils';
import { useGetWebhookDelivery } from '../api/useGetWebhookDelivery';
import PanelSection from './PanelSection';
import { deliveryStatusTone } from '../utils/deliveryStatus';
import { httpStatusText } from '../utils/httpStatus';
import { parsePayloadRefs, tokenizeJson } from '../utils/payload';
import type { WebhookDeliveryListItem, WebhookDeliveryStatus } from '../types';

interface WebhookDeliveryDetailDrawerProps {
  delivery: WebhookDeliveryListItem | null;
  onClose: () => void;
  /** Opens the page's retry confirmation for this delivery. */
  onRetry: (delivery: WebhookDeliveryListItem) => void;
}

const bandClass: Record<WebhookDeliveryStatus, string> = {
  Failed: 'border-red-200 bg-red-50 text-red-900',
  Pending: 'border-amber-200 bg-amber-50 text-amber-900',
  Delivered: 'border-green-200 bg-green-50 text-green-900',
};

const Row = ({ label, children }: { label: string; children: ReactNode }) => (
  <div className="grid grid-cols-[8rem_minmax(0,1fr)] gap-x-3 text-sm">
    <dt className="pt-px text-xs text-gray-500">{label}</dt>
    <dd className="min-w-0 break-words text-gray-800">{children}</dd>
  </div>
);

const useCopy = () => {
  const { t } = useTranslation('webhookAdmin');
  return (value: string) =>
    copyToClipboard(
      value,
      () => toast.success(t('drawer.copied')),
      () => toast.error(t('drawer.copyFailed')),
    );
};

/** Icon-only copy button after an ID. */
const CopyButton = ({ value, label }: { value: string; label: string }) => {
  const copy = useCopy();
  return (
    <button
      type="button"
      onClick={() => copy(value)}
      aria-label={label}
      title={label}
      className="ml-1 inline-flex size-6 items-center justify-center rounded-md align-middle text-gray-400 hover:bg-gray-100 hover:text-gray-700"
    >
      <Icon name="copy" style="regular" className="text-sm" />
    </button>
  );
};

const WebhookDeliveryDetailDrawer = ({
  delivery,
  onClose,
  onRetry,
}: WebhookDeliveryDetailDrawerProps) => {
  const { t, i18n } = useTranslation('webhookAdmin');
  const canManageSubscriptions = useHasPermission('WEBHOOK_SUBSCRIPTIONS_MANAGE');
  const canRetry = useHasPermission('WEBHOOK_DELIVERIES_RETRY');
  const copy = useCopy();
  // Closing sets `delivery` to null while the panel slides out: keep showing the last one, so the
  // content does not collapse into the error state mid-animation.
  const [last, setLast] = useState(delivery);
  if (delivery && delivery !== last) setLast(delivery);
  const shown = delivery ?? last;
  const { data, isLoading, isError, refetch } = useGetWebhookDelivery(
    shown?.id ?? null,
    !!delivery,
  );

  const payload = useMemo(() => {
    if (!data?.payload) return null;
    try {
      return JSON.stringify(JSON.parse(data.payload), null, 2);
    } catch {
      return data.payload;
    }
  }, [data?.payload]);
  const refs = useMemo(() => parsePayloadRefs(data?.payload), [data?.payload]);

  const status = data?.status ?? shown?.status;
  const code = data?.lastStatusCode ?? shown?.lastStatusCode ?? null;
  const attempts = data?.attemptCount ?? shown?.attemptCount ?? 0;
  const lastError = data?.lastError ?? shown?.lastError ?? null;

  const bandText =
    status === 'Delivered' && data?.deliveredAt
      ? t('drawer.deliveredAt', { time: formatShortDateTime(data.deliveredAt, i18n.language) })
      : attempts === 0
        ? t('drawer.neverAttempted')
        : `${t('drawer.attempts', { count: attempts })}${
            code != null ? ` · ${t('drawer.respondedWith')} ${httpStatusText(code)}` : ''
          }`;

  return (
    <SlideOverPanel
      isOpen={!!delivery}
      onClose={onClose}
      width="xl"
      title={<span className="font-mono">{shown?.eventType}</span>}
      subtitle={
        shown
          ? `${shown.systemCode} · ${t('drawer.createdAt', {
              time: formatShortDateTime(shown.createdAt, i18n.language, { seconds: true }),
            })}`
          : undefined
      }
      footer={
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={onClose}>
            {t('drawer.close')}
          </Button>
          {shown && canRetry && status === 'Failed' && (
            <Button
              onClick={() => onRetry(shown)}
              leftIcon={<Icon name="rotate-right" style="regular" className="text-sm" />}
            >
              {t('actions.retry')}
            </Button>
          )}
        </div>
      }
    >
      <div className="flex flex-col gap-5">
        {status && (
          <div
            className={clsx(
              'flex flex-col gap-1 rounded-lg border px-3 py-2.5 text-sm',
              bandClass[status],
            )}
          >
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
              <Badge tone={deliveryStatusTone[status]} className="whitespace-nowrap bg-white!">
                {t(`status.${status}`)}
              </Badge>
              <span>{bandText}</span>
            </div>
            {lastError && <p className="break-words text-xs opacity-90">{lastError}</p>}
          </div>
        )}

        {isLoading ? (
          <div className="flex flex-col gap-3" aria-busy="true">
            <Skeleton className="h-4 w-1/3" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-2/3" />
            <Skeleton className="h-40 w-full" />
          </div>
        ) : isError || !data ? (
          <DataErrorState variant="inline" title={t('loadFailed')} onRetry={refetch} />
        ) : (
          <>
            <PanelSection title={t('drawer.sections.destination')}>
              <dl className="flex flex-col gap-1.5">
                <Row label={t('drawer.callbackUrl')}>
                  <span className="font-mono text-xs text-gray-500">{data.httpMethod}</span>{' '}
                  <span className="font-mono text-xs">{data.callbackUrl}</span>
                </Row>
                <Row label={t('drawer.auth')}>
                  {t(`subscriptions.authTypeShort.${data.authType}`)}
                </Row>
                <Row label={t('drawer.subscription')}>
                  {data.systemCode} · {data.subscriptionEventType ?? t('subscriptions.catchAll')}
                  {canManageSubscriptions && (
                    <>
                      {' · '}
                      <Link
                        to="/admin/webhook-subscriptions"
                        className="text-primary hover:underline"
                      >
                        {t('drawer.openSubscription')}
                      </Link>
                    </>
                  )}
                </Row>
              </dl>
            </PanelSection>

            <PanelSection title={t('drawer.sections.reference')}>
              <dl className="flex flex-col gap-1.5">
                <Row label={t('drawer.deliveryId')}>
                  <span className="font-mono text-xs">{data.id}</span>
                  <CopyButton
                    value={data.id}
                    label={t('drawer.copyField', { field: t('drawer.deliveryId') })}
                  />
                </Row>
                {refs.eventId && (
                  <Row label={t('drawer.eventId')}>
                    <span className="font-mono text-xs">{refs.eventId}</span>
                    <CopyButton
                      value={refs.eventId}
                      label={t('drawer.copyField', { field: t('drawer.eventId') })}
                    />
                  </Row>
                )}
                {refs.appraisalNumber && (
                  <Row label={t('drawer.appraisalNumber')}>
                    <span className="font-mono text-xs">{refs.appraisalNumber}</span>
                  </Row>
                )}
              </dl>
            </PanelSection>

            <PanelSection title={t('drawer.payload')}>
              {payload ? (
                <>
                  <div className="-mt-1 flex justify-end">
                    <button
                      type="button"
                      onClick={() => copy(payload)}
                      className="inline-flex items-center gap-1.5 text-xs text-gray-600 hover:text-gray-900"
                    >
                      <Icon name="copy" style="regular" className="text-xs" />
                      {t('drawer.copy')}
                    </button>
                  </div>
                  <pre className="max-h-96 overflow-auto whitespace-pre rounded-lg border border-gray-200 bg-gray-50 px-3.5 py-3 font-mono text-xs leading-relaxed text-gray-700">
                    {tokenizeJson(payload).map((tok, i) =>
                      tok.key ? (
                        <span key={i} className="text-teal-700">
                          {tok.text}
                        </span>
                      ) : (
                        tok.text
                      ),
                    )}
                  </pre>
                </>
              ) : (
                <p className="text-sm text-gray-400">{t('drawer.noPayload')}</p>
              )}
            </PanelSection>
          </>
        )}
      </div>
    </SlideOverPanel>
  );
};

export default WebhookDeliveryDetailDrawer;
