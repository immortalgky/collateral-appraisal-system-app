import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import SectionHeader from '@shared/components/sections/SectionHeader';
import Icon from '@shared/components/Icon';
import Button from '@shared/components/Button';
import ConfirmDialog from '@shared/components/ConfirmDialog';
import { TableRowSkeleton } from '@shared/components/Skeleton';
import Pagination from '@shared/components/Pagination';
import DataErrorState from '@shared/components/DataErrorState';
import {
  useGetWebhookSubscriptions,
  useToggleWebhookSubscription,
  useDeleteWebhookSubscription,
} from '../api/webhookSubscriptions';
import WebhookSubscriptionFormModal from '../components/WebhookSubscriptionFormModal';
import type { WebhookSubscription } from '../types';

const PAGE_SIZE = 20;

const TABLE_SKELETON_COLUMNS = [
  { width: 'w-24' },
  { width: 'w-64' },
  { width: 'w-16' },
  { width: 'w-20' },
  { width: 'w-32' },
  { width: 'w-24' },
];

type ActiveFilter = '' | 'true' | 'false';

const WebhookSubscriptionListPage = () => {
  const { t } = useTranslation('webhookAdmin');

  const [systemCodeInput, setSystemCodeInput] = useState('');
  const [debouncedSystemCode, setDebouncedSystemCode] = useState('');
  const [activeFilter, setActiveFilter] = useState<ActiveFilter>('');
  const [pageIndex, setPageIndex] = useState(0);

  const [formTarget, setFormTarget] = useState<WebhookSubscription | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<WebhookSubscription | null>(null);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSystemCode(systemCodeInput);
      setPageIndex(0);
    }, 400);
    return () => clearTimeout(timer);
  }, [systemCodeInput]);

  useEffect(() => {
    setPageIndex(0);
  }, [activeFilter]);

  const { data, isLoading, isError, refetch } = useGetWebhookSubscriptions({
    pageNumber: pageIndex + 1,
    pageSize: PAGE_SIZE,
    systemCode: debouncedSystemCode || undefined,
    isActive: activeFilter === '' ? undefined : activeFilter === 'true',
  });

  const toggleMutation = useToggleWebhookSubscription();
  const deleteMutation = useDeleteWebhookSubscription();

  const subscriptions = data?.items ?? [];
  const totalCount = data?.count ?? 0;

  const openCreate = () => {
    setFormTarget(null);
    setShowForm(true);
  };

  const openEdit = (subscription: WebhookSubscription) => {
    setFormTarget(subscription);
    setShowForm(true);
  };

  const handleDeleteConfirm = () => {
    if (!deleteTarget) return;
    deleteMutation.mutate(deleteTarget.id, {
      onSuccess: () => setDeleteTarget(null),
      onError: () => setDeleteTarget(null),
    });
  };

  return (
    <div className="px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex items-start justify-between">
        <SectionHeader
          title={t('subscriptions.page.title')}
          subtitle={t('subscriptions.page.subtitle')}
          icon="satellite-dish"
          iconColor="blue"
        />
        <Button onClick={openCreate}>
          <Icon name="plus" style="regular" className="size-4 mr-1.5" />
          {t('subscriptions.actions.add')}
        </Button>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm mt-4">
        {/* Filters */}
        <div className="flex flex-wrap items-center gap-3 px-4 pt-4 pb-2">
          <div className="relative min-w-48">
            <Icon
              name="magnifying-glass"
              style="regular"
              className="size-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
            />
            <input
              type="text"
              value={systemCodeInput}
              onChange={e => setSystemCodeInput(e.target.value)}
              placeholder={t('subscriptions.filters.systemCodePlaceholder')}
              className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
            />
          </div>

          <select
            value={activeFilter}
            onChange={e => setActiveFilter(e.target.value as ActiveFilter)}
            className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary bg-white"
          >
            <option value="">{t('subscriptions.filters.statusAll')}</option>
            <option value="true">{t('subscriptions.filters.statusActive')}</option>
            <option value="false">{t('subscriptions.filters.statusInactive')}</option>
          </select>

          {(systemCodeInput || activeFilter) && (
            <button
              type="button"
              onClick={() => {
                setSystemCodeInput('');
                setActiveFilter('');
              }}
              className="text-xs text-gray-400 hover:text-gray-600 transition-colors"
            >
              {t('subscriptions.filters.clear')}
            </button>
          )}
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                  {t('subscriptions.columns.systemCode')}
                </th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                  {t('subscriptions.columns.callbackUrl')}
                </th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                  {t('subscriptions.columns.active')}
                </th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                  {t('subscriptions.columns.secret')}
                </th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                  {t('subscriptions.columns.lastDelivery')}
                </th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                  {t('subscriptions.columns.actions')}
                </th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <TableRowSkeleton columns={TABLE_SKELETON_COLUMNS} rows={5} />
              ) : isError ? (
                <tr>
                  <td colSpan={6} className="py-4">
                    <DataErrorState
                      variant="inline"
                      title={t('subscriptions.loadFailed')}
                      onRetry={refetch}
                    />
                  </td>
                </tr>
              ) : subscriptions.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-12 text-gray-400 text-sm">
                    <Icon name="plug" style="regular" className="size-8 mx-auto mb-2 opacity-40" />
                    <p>{t('subscriptions.emptyState')}</p>
                  </td>
                </tr>
              ) : (
                subscriptions.map(sub => (
                  <tr
                    key={sub.id}
                    className="border-b border-gray-50 hover:bg-gray-50 transition-colors"
                  >
                    <td className="px-4 py-3 font-medium text-gray-900">{sub.systemCode}</td>
                    <td className="px-4 py-3 text-gray-600 max-w-xs">
                      <span className="block truncate" title={sub.callbackUrl}>
                        {sub.callbackUrl}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                          sub.isActive
                            ? 'bg-emerald-50 text-emerald-700'
                            : 'bg-gray-100 text-gray-500'
                        }`}
                      >
                        {sub.isActive ? t('subscriptions.active.yes') : t('subscriptions.active.no')}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-500 font-mono text-xs">
                      ••••{sub.secretLast4 ?? '____'}
                    </td>
                    <td className="px-4 py-3 text-gray-600 whitespace-nowrap">
                      {sub.lastDeliveryAt ? (
                        new Date(sub.lastDeliveryAt).toLocaleString()
                      ) : (
                        <span className="text-gray-300">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          type="button"
                          onClick={() => openEdit(sub)}
                          className="p-1.5 text-gray-400 hover:text-primary hover:bg-primary/5 rounded-lg transition-colors"
                          title={t('subscriptions.actions.edit')}
                        >
                          <Icon name="pen" style="regular" className="size-4" />
                        </button>

                        <button
                          type="button"
                          onClick={() =>
                            toggleMutation.mutate({ id: sub.id, isActive: !sub.isActive })
                          }
                          disabled={toggleMutation.isPending}
                          className="p-1.5 text-gray-400 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-colors"
                          title={
                            sub.isActive
                              ? t('subscriptions.actions.deactivate')
                              : t('subscriptions.actions.activate')
                          }
                        >
                          <Icon
                            name={sub.isActive ? 'toggle-on' : 'toggle-off'}
                            style="regular"
                            className="size-4"
                          />
                        </button>

                        <button
                          type="button"
                          onClick={() => setDeleteTarget(sub)}
                          className="p-1.5 text-gray-400 hover:text-danger hover:bg-danger/5 rounded-lg transition-colors"
                          title={t('subscriptions.actions.delete')}
                        >
                          <Icon name="trash" style="regular" className="size-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
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
            onPageChange={setPageIndex}
            showPageSizeSelector={false}
          />
        )}
      </div>

      <WebhookSubscriptionFormModal
        isOpen={showForm}
        onClose={() => setShowForm(false)}
        subscription={formTarget}
      />

      <ConfirmDialog
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDeleteConfirm}
        title={t('subscriptions.delete.confirmTitle')}
        message={t('subscriptions.delete.confirmMessage')}
        confirmText={t('subscriptions.delete.confirmButton')}
        cancelText={t('subscriptions.delete.cancelButton')}
        variant="danger"
        isLoading={deleteMutation.isPending}
      />
    </div>
  );
};

export default WebhookSubscriptionListPage;
