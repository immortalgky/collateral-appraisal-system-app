import { useState } from 'react';
import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import SlideOverPanel from '@shared/components/SlideOverPanel';
import Icon from '@shared/components/Icon';
import { TableRowSkeleton } from '@shared/components/Skeleton';
import { useGetWebhookDelivery } from '../api/useGetWebhookDelivery';
import type { WebhookDeliveryListItem } from '../types';

interface WebhookDeliveryDetailDrawerProps {
  delivery: WebhookDeliveryListItem | null;
  onClose: () => void;
}

const LabelValue = ({ label, value }: { label: string; value: ReactNode }) => (
  <div className="flex flex-col gap-0.5">
    <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">{label}</span>
    <span className="text-sm text-gray-900">
      {value ?? <span className="text-gray-300">—</span>}
    </span>
  </div>
);

const WebhookDeliveryDetailDrawer = ({ delivery, onClose }: WebhookDeliveryDetailDrawerProps) => {
  const { t } = useTranslation('webhookAdmin');
  const [copied, setCopied] = useState(false);

  const { data, isLoading } = useGetWebhookDelivery(delivery?.id ?? null);

  const handleCopy = () => {
    if (!data?.payload) return;
    void navigator.clipboard.writeText(data.payload).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const prettyPayload = (() => {
    if (!data?.payload) return null;
    try {
      return JSON.stringify(JSON.parse(data.payload), null, 2);
    } catch {
      return data.payload;
    }
  })();

  return (
    <SlideOverPanel
      isOpen={!!delivery}
      onClose={onClose}
      title={t('drawer.title')}
      subtitle={delivery?.eventType}
      width="xl"
    >
      {isLoading ? (
        <table className="w-full">
          <tbody>
            <TableRowSkeleton columns={[{ width: 'w-full' }]} rows={6} />
          </tbody>
        </table>
      ) : data ? (
        <div className="flex flex-col gap-5">
          {/* Meta fields */}
          <div className="grid grid-cols-2 gap-4">
            <LabelValue
              label={t('columns.id')}
              value={<code className="text-xs bg-gray-100 px-1.5 py-0.5 rounded">{data.id}</code>}
            />
            <LabelValue
              label={t('columns.subscriptionId')}
              value={
                <code className="text-xs bg-gray-100 px-1.5 py-0.5 rounded">
                  {data.subscriptionId}
                </code>
              }
            />
            <LabelValue label={t('columns.eventType')} value={data.eventType} />
            <LabelValue label={t('columns.system')} value={data.systemCode} />
            <LabelValue label={t('columns.status')} value={data.status} />
            <LabelValue label={t('columns.attempts')} value={String(data.attemptCount)} />
            <LabelValue
              label={t('columns.lastStatusCode')}
              value={data.lastStatusCode != null ? String(data.lastStatusCode) : null}
            />
            <LabelValue
              label={t('columns.created')}
              value={new Date(data.createdAt).toLocaleString()}
            />
            {data.deliveredAt && (
              <LabelValue
                label={t('columns.deliveredAt')}
                value={new Date(data.deliveredAt).toLocaleString()}
              />
            )}
          </div>

          {data.lastError && (
            <div>
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">
                {t('columns.lastError')}
              </p>
              <p className="text-sm text-danger bg-danger/5 rounded-lg px-3 py-2">
                {data.lastError}
              </p>
            </div>
          )}

          {/* Payload */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                {t('drawer.payload')}
              </p>
              <button
                type="button"
                onClick={handleCopy}
                className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-primary transition-colors"
              >
                <Icon
                  name={copied ? 'circle-check' : 'copy'}
                  style="regular"
                  className="size-3.5"
                />
                {copied ? t('drawer.copied') : t('drawer.copy')}
              </button>
            </div>
            <pre className="text-xs bg-gray-950 text-gray-100 rounded-xl p-4 overflow-x-auto overflow-y-auto max-h-96 leading-relaxed">
              {prettyPayload ?? <span className="text-gray-500">{t('drawer.noPayload')}</span>}
            </pre>
          </div>
        </div>
      ) : null}
    </SlideOverPanel>
  );
};

export default WebhookDeliveryDetailDrawer;
