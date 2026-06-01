import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import SectionHeader from '@shared/components/sections/SectionHeader';
import Icon from '@shared/components/Icon';
import ConfirmDialog from '@shared/components/ConfirmDialog';
import { TableRowSkeleton } from '@shared/components/Skeleton';
import Pagination from '@shared/components/Pagination';
import { useGetWebhookDeliveries } from '../api/useGetWebhookDeliveries';
import DataErrorState from '@shared/components/DataErrorState';
import { useRetryWebhookDelivery } from '../api/useRetryWebhookDelivery';
import WebhookDeliveryDetailDrawer from '../components/WebhookDeliveryDetailDrawer';
import type { WebhookDeliveryListItem, WebhookDeliveryStatus } from '../types';

const PAGE_SIZE = 20;

const TABLE_SKELETON_COLUMNS = [
  { width: 'w-28' },
  { width: 'w-36' },
  { width: 'w-24' },
  { width: 'w-20' },
  { width: 'w-12' },
  { width: 'w-16' },
  { width: 'w-40' },
  { width: 'w-20' },
];

const statusBadgeClass: Record<WebhookDeliveryStatus, string> = {
  Pending: 'bg-amber-50 text-amber-700',
  Delivered: 'bg-emerald-50 text-emerald-700',
  Failed: 'bg-danger/10 text-danger',
};

const WebhookDeliveryListPage = () => {
  const { t } = useTranslation('webhookAdmin');

  const statusOptions: { value: WebhookDeliveryStatus | ''; label: string }[] = [
    { value: '', label: t('filters.allStatuses') },
    { value: 'Pending', label: t('status.Pending') },
    { value: 'Delivered', label: t('status.Delivered') },
    { value: 'Failed', label: t('status.Failed') },
  ];

  // ─── Filter state ───────────────────────────────────────────────────────────
  const [eventTypeInput, setEventTypeInput] = useState('');
  const [debouncedEventType, setDebouncedEventType] = useState('');
  const [status, setStatus] = useState<WebhookDeliveryStatus | ''>('');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [pageIndex, setPageIndex] = useState(0);

  // Drawer state
  const [selectedDelivery, setSelectedDelivery] = useState<WebhookDeliveryListItem | null>(null);

  // Retry confirm state
  const [retryTarget, setRetryTarget] = useState<WebhookDeliveryListItem | null>(null);

  // Debounce event type filter
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedEventType(eventTypeInput);
      setPageIndex(0);
    }, 400);
    return () => clearTimeout(timer);
  }, [eventTypeInput]);

  // Reset to page 0 on filter changes
  useEffect(() => {
    setPageIndex(0);
  }, [status, fromDate, toDate]);

  const { data, isLoading, isError, refetch } = useGetWebhookDeliveries({
    pageNumber: pageIndex + 1,
    pageSize: PAGE_SIZE,
    status: status || undefined,
    eventType: debouncedEventType || undefined,
    fromDate: fromDate || undefined,
    toDate: toDate || undefined,
  });

  const retryMutation = useRetryWebhookDelivery();

  const deliveries = data?.items ?? [];
  const totalCount = data?.count ?? 0;

  const handleRetryConfirm = () => {
    if (!retryTarget) return;
    retryMutation.mutate(retryTarget.id, {
      onSuccess: () => setRetryTarget(null),
      onError: () => setRetryTarget(null),
    });
  };

  return (
    <div className="px-4 sm:px-6 lg:px-8 py-8">
      <SectionHeader
        title={t('page.title')}
        subtitle={t('page.subtitle')}
        icon="satellite-dish"
        iconColor="blue"
      />

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm mt-4">
        {/* Filters */}
        <div className="flex flex-wrap items-center gap-3 px-4 pt-4 pb-2">
          {/* Event Type */}
          <div className="relative min-w-48">
            <Icon
              name="magnifying-glass"
              style="regular"
              className="size-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
            />
            <input
              type="text"
              value={eventTypeInput}
              onChange={e => setEventTypeInput(e.target.value)}
              placeholder={t('filters.eventTypePlaceholder')}
              className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
            />
          </div>

          {/* Status */}
          <select
            value={status}
            onChange={e => setStatus(e.target.value as WebhookDeliveryStatus | '')}
            className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary bg-white"
          >
            {statusOptions.map(opt => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>

          {/* From date */}
          <div className="flex items-center gap-1.5">
            <span className="text-xs text-gray-500">{t('filters.from')}</span>
            <input
              type="date"
              value={fromDate}
              onChange={e => setFromDate(e.target.value)}
              className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
            />
          </div>

          {/* To date */}
          <div className="flex items-center gap-1.5">
            <span className="text-xs text-gray-500">{t('filters.to')}</span>
            <input
              type="date"
              value={toDate}
              onChange={e => setToDate(e.target.value)}
              className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
            />
          </div>

          {/* Clear filters */}
          {(eventTypeInput || status || fromDate || toDate) && (
            <button
              type="button"
              onClick={() => {
                setEventTypeInput('');
                setStatus('');
                setFromDate('');
                setToDate('');
              }}
              className="text-xs text-gray-400 hover:text-gray-600 transition-colors"
            >
              {t('filters.clear')}
            </button>
          )}
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                  {t('columns.created')}
                </th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                  {t('columns.eventType')}
                </th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                  {t('columns.system')}
                </th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                  {t('columns.status')}
                </th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                  {t('columns.attempts')}
                </th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                  {t('columns.lastStatusCode')}
                </th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                  {t('columns.lastError')}
                </th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                  {t('columns.actions')}
                </th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <TableRowSkeleton columns={TABLE_SKELETON_COLUMNS} rows={5} />
              ) : isError ? (
                <tr>
                  <td colSpan={8} className="py-4">
                    <DataErrorState variant="inline" title={t('loadFailed')} onRetry={refetch} />
                  </td>
                </tr>
              ) : deliveries.length === 0 ? (
                <tr>
                  <td colSpan={8} className="text-center py-12 text-gray-400 text-sm">
                    <Icon name="plug" style="regular" className="size-8 mx-auto mb-2 opacity-40" />
                    <p>{t('emptyState')}</p>
                  </td>
                </tr>
              ) : (
                deliveries.map(delivery => (
                  <tr
                    key={delivery.id}
                    className="border-b border-gray-50 hover:bg-gray-50 transition-colors"
                  >
                    <td className="px-4 py-3 text-gray-600 whitespace-nowrap">
                      {new Date(delivery.createdAt).toLocaleString()}
                    </td>
                    <td className="px-4 py-3 font-medium text-gray-900">{delivery.eventType}</td>
                    <td className="px-4 py-3 text-gray-600">{delivery.systemCode}</td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${statusBadgeClass[delivery.status]}`}
                      >
                        {delivery.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-600 tabular-nums">
                      {delivery.attemptCount}
                    </td>
                    <td className="px-4 py-3 text-gray-600 tabular-nums">
                      {delivery.lastStatusCode ?? <span className="text-gray-300">—</span>}
                    </td>
                    <td className="px-4 py-3 max-w-xs">
                      {delivery.lastError ? (
                        <span
                          title={delivery.lastError}
                          className="block truncate text-danger text-xs cursor-help"
                        >
                          {delivery.lastError}
                        </span>
                      ) : (
                        <span className="text-gray-300">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        {/* View */}
                        <button
                          type="button"
                          onClick={() => setSelectedDelivery(delivery)}
                          className="p-1.5 text-gray-400 hover:text-primary hover:bg-primary/5 rounded-lg transition-colors"
                          title={t('actions.view')}
                        >
                          <Icon name="eye" style="regular" className="size-4" />
                        </button>

                        {/* Retry — only for Failed rows */}
                        {delivery.status === 'Failed' && (
                          <button
                            type="button"
                            onClick={() => setRetryTarget(delivery)}
                            className="p-1.5 text-gray-400 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-colors"
                            title={t('actions.retry')}
                          >
                            <Icon name="rotate-right" style="regular" className="size-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {!isLoading && totalCount > 0 && (
          <Pagination
            currentPage={pageIndex}
            totalPages={Math.ceil(totalCount / PAGE_SIZE)}
            totalCount={totalCount}
            pageSize={PAGE_SIZE}
            onPageChange={setPageIndex}
            showPageSizeSelector={false}
          />
        )}
      </div>

      {/* Detail drawer */}
      <WebhookDeliveryDetailDrawer
        delivery={selectedDelivery}
        onClose={() => setSelectedDelivery(null)}
      />

      {/* Retry confirmation dialog */}
      <ConfirmDialog
        isOpen={!!retryTarget}
        onClose={() => setRetryTarget(null)}
        onConfirm={handleRetryConfirm}
        title={t('retry.confirmTitle')}
        message={t('retry.confirmMessage')}
        confirmText={t('retry.confirmButton')}
        cancelText={t('retry.cancelButton')}
        variant="warning"
        isLoading={retryMutation.isPending}
      />
    </div>
  );
};

export default WebhookDeliveryListPage;
