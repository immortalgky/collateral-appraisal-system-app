import { useState } from 'react';
import { Link } from 'react-router-dom';
import clsx from 'clsx';
import { useTranslation } from 'react-i18next';
import Icon from '@shared/components/Icon';
import Badge from '@shared/components/Badge';
import Input from '@shared/components/Input';
import CountTabs from '@shared/components/CountTabs';
import ConfirmDialog from '@shared/components/ConfirmDialog';
import DataErrorState from '@shared/components/DataErrorState';
import Pagination from '@shared/components/Pagination';
import { TableRowSkeleton } from '@shared/components/Skeleton';
import Dropdown from '@shared/components/inputs/Dropdown';
import { useDebounce } from '@shared/hooks/useDebounce';
import { useHasPermission } from '@shared/hooks/useHasPermission';
import { formatDate, formatShortDateTime } from '@shared/utils/dateUtils';
import { useGetWebhookDeliveries } from '../api/useGetWebhookDeliveries';
import { useGetWebhookDeliverySummary } from '../api/useGetWebhookDeliverySummary';
import { useRetryWebhookDelivery } from '../api/useRetryWebhookDelivery';
import { useBulkRetryWebhookDeliveries } from '../api/useBulkRetryWebhookDeliveries';
import { useGetWebhookSubscriptions } from '../api/webhookSubscriptions';
import DeliveryBulkBar from '../components/DeliveryBulkBar';
import DeliveryFailureSummary from '../components/DeliveryFailureSummary';
import DeliveryPendingBanner from '../components/DeliveryPendingBanner';
import WebhookDeliveryDetailDrawer from '../components/WebhookDeliveryDetailDrawer';
import { deliveryStatusTone } from '../utils/deliveryStatus';
import { httpReason } from '../utils/httpStatus';
import type {
  WebhookDeliveryListItem,
  WebhookDeliveryStatus,
  WebhookDeliverySummaryParams,
} from '../types';

const PAGE_SIZE = 20;
const ALL = 'all';
const CUSTOM = 'custom';

type StatusTab = typeof ALL | WebhookDeliveryStatus;
type TimePreset = typeof ALL | typeof CUSTOM | '24h' | '7d' | '30d' | '90d';

const HOUR_MS = 60 * 60 * 1000;
const PRESET_MS: Record<Exclude<TimePreset, typeof ALL | typeof CUSTOM>, number> = {
  '24h': 24 * HOUR_MS,
  '7d': 7 * 24 * HOUR_MS,
  '30d': 30 * 24 * HOUR_MS,
  '90d': 90 * 24 * HOUR_MS,
};

const TABLE_SKELETON_COLUMNS = [
  { width: 'w-4' },
  { width: 'w-28' },
  { width: 'w-44' },
  { width: 'w-10' },
  { width: 'w-16' },
  { width: 'w-32' },
  { width: 'w-6' },
  { width: 'w-10' },
];

const thClass = 'px-4 py-2.5 text-left text-xs font-semibold text-gray-600';

const WebhookDeliveryListPage = () => {
  const { t, i18n } = useTranslation('webhookAdmin');
  const canManageSubscriptions = useHasPermission('WEBHOOK_SUBSCRIPTIONS_MANAGE');
  const canRetry = useHasPermission('WEBHOOK_DELIVERIES_RETRY');

  const [tab, setTab] = useState<StatusTab>(ALL);
  const [searchInput, setSearchInput] = useState('');
  const search = useDebounce(searchInput.trim());
  const [systemCode, setSystemCode] = useState(ALL);
  // `from` is frozen when the preset is picked: a moving "now" in the query key would refetch forever.
  const [time, setTime] = useState<{ preset: TimePreset; from?: string }>({ preset: ALL });
  // The custom range is typed as dates; the last day is included through its end (app-local, never UTC).
  const [customRange, setCustomRange] = useState({ from: '', to: '' });
  const [eventType, setEventType] = useState('');
  const isCustom = time.preset === CUSTOM;
  // A reversed range (from after to) is swapped, never sent as it is. yyyy-MM-dd sorts as text.
  const [rangeFrom, rangeTo] =
    customRange.from && customRange.to && customRange.from > customRange.to
      ? [customRange.to, customRange.from]
      : [customRange.from, customRange.to];
  const fromDate = isCustom ? (rangeFrom ? `${rangeFrom}T00:00:00` : undefined) : time.from;
  const toDate = isCustom && rangeTo ? `${rangeTo}T23:59:59.999` : undefined;

  // Page and ticked rows belong to the filters they were made under. Keying them on the filters
  // (instead of resetting in an effect) means a stale page or selection can never be on screen.
  const filterKey = [tab, search, systemCode, fromDate, toDate, eventType].join('|');
  const [paging, setPaging] = useState({ key: filterKey, index: 0 });
  const pageIndex = paging.key === filterKey ? paging.index : 0;
  const pickScope = `${filterKey}|${pageIndex}`;
  const [picked, setPicked] = useState<{ scope: string; ids: string[] }>({ scope: '', ids: [] });
  const pickedIds = picked.scope === pickScope ? picked.ids : [];

  const [selectedDelivery, setSelectedDelivery] = useState<WebhookDeliveryListItem | null>(null);
  const [retryTargets, setRetryTargets] = useState<WebhookDeliveryListItem[] | null>(null);

  const scope: WebhookDeliverySummaryParams = {
    systemCode: systemCode === ALL ? undefined : systemCode,
    search: search || undefined,
    fromDate,
    toDate,
  };
  const { data, isLoading, isError, isPlaceholderData, refetch } = useGetWebhookDeliveries({
    ...scope,
    eventType: eventType || undefined,
    status: tab === ALL ? undefined : tab,
    pageNumber: pageIndex + 1,
    pageSize: PAGE_SIZE,
  });
  const summaryQuery = useGetWebhookDeliverySummary(scope);
  const summary = summaryQuery.data;
  // The system choices are the subscriptions' systems; a viewer without the subscriptions
  // permission just gets "all systems".
  const subscriptionsQuery = useGetWebhookSubscriptions(
    { pageNumber: 1, pageSize: 200 },
    canManageSubscriptions,
  );

  const retryMutation = useRetryWebhookDelivery();
  const bulkRetryMutation = useBulkRetryWebhookDeliveries();

  const deliveries = data?.items ?? [];
  const totalCount = data?.count ?? 0;
  const columnCount = canRetry ? 8 : 7;
  const failedRows = deliveries.filter(d => d.status === 'Failed');
  // Only ticks that are still Failed rows of the page on screen count (a refetch can change a row's status).
  const pickedRows = failedRows.filter(d => pickedIds.includes(d.id));
  const allPicked = failedRows.length > 0 && pickedRows.length === failedRows.length;
  // Rows shown from the previous query (keepPreviousData) are not the page the ticks would belong to.
  const canTick = canRetry && !isPlaceholderData;

  // The page count can shrink under the current page (a bulk retry emptied the last one).
  const lastPage = Math.max(0, Math.ceil(totalCount / PAGE_SIZE) - 1);
  if (data && !isPlaceholderData && pageIndex > lastPage)
    setPaging({ key: filterKey, index: lastPage });

  const systemOptions = [
    { value: ALL, label: t('filters.allSystems') },
    ...[...new Set((subscriptionsQuery.data?.items ?? []).map(s => s.systemCode))]
      .sort()
      .map(code => ({ value: code, label: code })),
  ];
  const timeOptions: { value: TimePreset; label: string }[] = [
    { value: ALL, label: t('filters.time.all') },
    { value: '24h', label: t('filters.time.24h') },
    { value: '7d', label: t('filters.time.7d') },
    { value: '30d', label: t('filters.time.30d') },
    { value: '90d', label: t('filters.time.90d') },
    { value: CUSTOM, label: t('filters.time.custom') },
  ];

  const pick = (ids: string[]) => setPicked({ scope: pickScope, ids });
  const togglePick = (id: string) =>
    pick(pickedIds.includes(id) ? pickedIds.filter(x => x !== id) : [...pickedIds, id]);

  const selectTime = (preset: TimePreset) =>
    setTime({
      preset,
      from:
        preset === ALL || preset === CUSTOM
          ? undefined
          : formatDate(new Date(Date.now() - PRESET_MS[preset]), 'yyyy-MM-ddTHH:mm:ss'),
    });
  const toggleEventType = (value: string) => setEventType(eventType === value ? '' : value);

  const askBulkRetry = () => {
    if (pickedRows.length > 0) setRetryTargets(pickedRows);
  };
  const handleRetryConfirm = () => {
    if (!retryTargets) return;
    const close = () => setRetryTargets(null);
    if (retryTargets.length === 1) {
      retryMutation.mutate(retryTargets[0].id, { onSuccess: () => pick([]), onSettled: close });
    } else {
      bulkRetryMutation.mutate(
        retryTargets.map(d => d.id),
        {
          onSuccess: () => pick([]),
          onSettled: close,
        },
      );
    }
  };

  const tabs = [
    { value: ALL, label: t('tabs.all'), count: summary?.total },
    { value: 'Failed', label: t('status.Failed'), count: summary?.failed, tone: 'red' },
    { value: 'Pending', label: t('status.Pending'), count: summary?.pending, tone: 'amber' },
    { value: 'Delivered', label: t('status.Delivered'), count: summary?.delivered },
  ] as const;

  return (
    <div className={clsx('flex flex-col gap-3', canRetry && pickedRows.length > 0 && 'pb-24')}>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="min-w-64 flex-1">
          <h2 className="text-base font-semibold text-gray-900">{t('page.title')}</h2>
          <p className="mt-0.5 text-xs text-gray-500">{t('page.subtitle')}</p>
        </div>
        {canManageSubscriptions && (
          <Link
            to="/admin/webhook-subscriptions"
            className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
          >
            {t('page.subscriptionsLink')}
            <Icon name="chevron-right" style="regular" className="text-xs" />
          </Link>
        )}
      </div>

      {summary?.oldestPending && (
        <DeliveryPendingBanner
          pending={summary.pending}
          oldest={summary.oldestPending}
          onView={tab === 'Pending' ? undefined : () => setTab('Pending')}
        />
      )}

      <div className="overflow-hidden rounded-lg border border-gray-200 bg-white">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-2 border-b border-gray-100 px-4 py-2.5">
          <CountTabs tabs={tabs} value={tab} onChange={setTab} label={t('tabs.label')} />
          <div className="ml-auto flex flex-wrap items-center gap-2">
            <div className="w-72">
              <Input
                type="text"
                value={searchInput}
                onChange={e => setSearchInput(e.target.value)}
                placeholder={t('filters.searchPlaceholder')}
                maxLength={100}
                aria-label={t('filters.searchLabel')}
                leftIcon={<Icon name="magnifying-glass" style="regular" className="text-sm" />}
              />
            </div>
            <div className="w-40">
              <Dropdown
                options={systemOptions}
                value={systemCode}
                onChange={(v: string) => setSystemCode(v)}
                showPlaceholderOption={false}
                showValuePrefix={false}
                aria-label={t('filters.systemLabel')}
              />
            </div>
            <div className="w-40">
              <Dropdown
                options={timeOptions}
                value={time.preset}
                onChange={(v: TimePreset) => selectTime(v)}
                showPlaceholderOption={false}
                showValuePrefix={false}
                aria-label={t('filters.timeLabel')}
              />
            </div>
            {isCustom && (
              <>
                <div className="w-40">
                  <Input
                    type="date"
                    value={customRange.from}
                    onChange={e => setCustomRange(r => ({ ...r, from: e.target.value }))}
                    aria-label={t('filters.from')}
                  />
                </div>
                <span className="text-xs text-gray-500">{t('filters.to')}</span>
                <div className="w-40">
                  <Input
                    type="date"
                    value={customRange.to}
                    onChange={e => setCustomRange(r => ({ ...r, to: e.target.value }))}
                    aria-label={t('filters.to')}
                  />
                </div>
              </>
            )}
          </div>
        </div>

        {tab === 'Failed' && summary && (
          <DeliveryFailureSummary
            summary={summary}
            activeEventType={eventType}
            onToggleEventType={toggleEventType}
          />
        )}
        {eventType && tab !== 'Failed' && (
          <div className="border-b border-gray-100 px-4 py-2">
            <button
              type="button"
              onClick={() => setEventType('')}
              className="inline-flex items-center gap-1.5 rounded-full border border-primary bg-primary-50 px-2.5 py-0.5 text-xs text-primary-700"
            >
              <span className="font-mono">{eventType}</span>
              <Icon name="xmark" style="regular" className="text-xs" />
              <span className="sr-only">{t('filters.clear')}</span>
            </button>
          </div>
        )}

        <div className="overflow-x-auto">
          <table className="w-full min-w-[52rem] text-table">
            <thead className="bg-gray-50">
              <tr className="border-b border-gray-200">
                {canRetry && (
                  <th className="w-9 py-2.5 pr-0 pl-4">
                    {failedRows.length > 0 && (
                      <input
                        type="checkbox"
                        className="size-4 cursor-pointer accent-primary"
                        aria-label={t('select.all')}
                        checked={allPicked}
                        disabled={!canTick}
                        onChange={() => pick(allPicked ? [] : failedRows.map(d => d.id))}
                      />
                    )}
                  </th>
                )}
                <th className={thClass}>{t('columns.created')}</th>
                <th className={thClass}>{t('columns.eventType')}</th>
                <th className={thClass}>{t('columns.system')}</th>
                <th className={thClass}>{t('columns.status')}</th>
                <th className={thClass}>{t('columns.lastResult')}</th>
                <th className={clsx(thClass, 'text-right')}>{t('columns.attempts')}</th>
                <th className="w-20 px-4 py-2.5">
                  <span className="sr-only">{t('actions.view')}</span>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {isLoading ? (
                <TableRowSkeleton
                  columns={canRetry ? TABLE_SKELETON_COLUMNS : TABLE_SKELETON_COLUMNS.slice(1)}
                  rows={6}
                />
              ) : isError ? (
                <tr>
                  <td colSpan={columnCount} className="py-4">
                    <DataErrorState variant="inline" title={t('loadFailed')} onRetry={refetch} />
                  </td>
                </tr>
              ) : deliveries.length === 0 ? (
                <tr>
                  <td colSpan={columnCount} className="py-12 text-center text-sm text-gray-400">
                    <Icon
                      name="plug"
                      style="regular"
                      className="mx-auto mb-2 text-3xl opacity-40"
                    />
                    <p>{t('emptyState')}</p>
                  </td>
                </tr>
              ) : (
                deliveries.map(delivery => {
                  const checked = pickedIds.includes(delivery.id);
                  const failed = delivery.status === 'Failed';
                  const code = delivery.lastStatusCode;
                  return (
                    <tr
                      key={delivery.id}
                      tabIndex={0}
                      onClick={() => setSelectedDelivery(delivery)}
                      onKeyDown={e => {
                        if (e.key === 'Enter' && e.target === e.currentTarget)
                          setSelectedDelivery(delivery);
                      }}
                      className={clsx(
                        'cursor-pointer transition-colors',
                        checked ? 'bg-primary-50' : 'even:bg-gray-50/50 hover:bg-gray-50',
                      )}
                    >
                      {canRetry && (
                        <td className="py-2.5 pr-0 pl-4" onClick={e => e.stopPropagation()}>
                          {failed && (
                            <input
                              type="checkbox"
                              className="size-4 cursor-pointer accent-primary"
                              aria-label={t('select.row')}
                              checked={checked}
                              disabled={!canTick}
                              onChange={() => togglePick(delivery.id)}
                            />
                          )}
                        </td>
                      )}
                      <td className="whitespace-nowrap px-4 py-2.5 tabular-nums text-gray-700">
                        {formatShortDateTime(delivery.createdAt, i18n.language, { seconds: true })}
                      </td>
                      <td className="px-4 py-2.5 font-mono text-xs font-medium text-gray-900">
                        {delivery.eventType}
                      </td>
                      <td className="px-4 py-2.5 text-gray-700">{delivery.systemCode}</td>
                      <td className="px-4 py-2.5">
                        <Badge
                          tone={deliveryStatusTone[delivery.status]}
                          className="whitespace-nowrap"
                        >
                          {t(`status.${delivery.status}`)}
                        </Badge>
                      </td>
                      <td className="max-w-[22rem] px-4 py-2.5">
                        {code != null ? (
                          <>
                            <div className="whitespace-nowrap">
                              <span
                                className={clsx(
                                  'font-medium tabular-nums',
                                  failed ? 'text-red-700' : 'text-gray-700',
                                )}
                              >
                                {code}
                              </span>{' '}
                              <span className="text-gray-500">{httpReason(code)}</span>
                            </div>
                            {delivery.lastError && (
                              <div
                                className="truncate text-xs text-gray-500"
                                title={delivery.lastError}
                              >
                                {delivery.lastError}
                              </div>
                            )}
                          </>
                        ) : delivery.lastError ? (
                          <div
                            className={clsx('truncate', failed ? 'text-red-700' : 'text-gray-500')}
                            title={delivery.lastError}
                          >
                            {delivery.lastError}
                          </div>
                        ) : (
                          <span className="text-gray-400">—</span>
                        )}
                      </td>
                      <td className="px-4 py-2.5 text-right tabular-nums">
                        {delivery.attemptCount}
                      </td>
                      <td className="px-4 py-1">
                        <div className="flex items-center justify-end gap-1">
                          {failed && canRetry && (
                            <button
                              type="button"
                              onClick={e => {
                                e.stopPropagation();
                                setRetryTargets([delivery]);
                              }}
                              aria-label={t('actions.retry')}
                              title={t('actions.retry')}
                              className="inline-flex size-7 items-center justify-center rounded-md text-gray-400 hover:bg-primary/10 hover:text-primary"
                            >
                              <Icon name="rotate-right" style="regular" className="text-sm" />
                            </button>
                          )}
                          <Icon
                            name="chevron-right"
                            style="regular"
                            className="text-xs text-gray-300"
                          />
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {!isLoading && totalCount > 0 && (
          <Pagination
            currentPage={pageIndex}
            totalPages={Math.ceil(totalCount / PAGE_SIZE)}
            totalCount={totalCount}
            pageSize={PAGE_SIZE}
            onPageChange={index => setPaging({ key: filterKey, index })}
            showPageSizeSelector={false}
          />
        )}
      </div>

      <DeliveryBulkBar
        count={canRetry ? pickedRows.length : 0}
        onRetry={askBulkRetry}
        onClear={() => pick([])}
        disabled={bulkRetryMutation.isPending}
      />

      <WebhookDeliveryDetailDrawer
        delivery={selectedDelivery}
        onClose={() => setSelectedDelivery(null)}
        onRetry={delivery => setRetryTargets([delivery])}
      />

      <ConfirmDialog
        isOpen={!!retryTargets}
        onClose={() => setRetryTargets(null)}
        onConfirm={handleRetryConfirm}
        title={t('retry.confirmTitle')}
        message={
          retryTargets && retryTargets.length > 1
            ? t('bulk.confirmMessage', { count: retryTargets.length })
            : t('retry.confirmMessage')
        }
        confirmText={t('retry.confirmButton')}
        cancelText={t('retry.cancelButton')}
        variant="warning"
        isLoading={retryMutation.isPending || bulkRetryMutation.isPending}
      />
    </div>
  );
};

export default WebhookDeliveryListPage;
