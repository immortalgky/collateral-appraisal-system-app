import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import Badge from '@shared/components/Badge';
import Button from '@shared/components/Button';
import ConfirmDialog from '@shared/components/ConfirmDialog';
import CountTabs from '@shared/components/CountTabs';
import DataErrorState from '@shared/components/DataErrorState';
import Icon from '@shared/components/Icon';
import Input from '@shared/components/Input';
import Switch from '@shared/components/inputs/Switch';
import { TableRowSkeleton } from '@shared/components/Skeleton';
import {
  useDeleteWebhookSubscription,
  useGetWebhookSubscriptions,
  useToggleWebhookSubscription,
} from '../api/webhookSubscriptions';
import WebhookSubscriptionPanel from '../components/WebhookSubscriptionPanel';
import type { WebhookSubscription } from '../types';

// A handful of rows at most (one per system / event): one unpaged fetch feeds the counts, the tabs and the search.
const FETCH_ALL = { pageNumber: 1, pageSize: 200 };
const COLUMN_COUNT = 5;

type ActiveTab = 'all' | 'active' | 'inactive';
type SecretState = 'encrypted' | 'plaintext' | 'notSet';

const TABLE_SKELETON_COLUMNS = [
  { width: 'w-24' },
  { width: 'w-72' },
  { width: 'w-20' },
  { width: 'w-9' },
  { width: 'w-14' },
];

const thClass = 'px-4 py-2.5 text-left text-xs font-semibold text-gray-600';

/** Set + encrypted / set but still plaintext (saved before encryption) / not set. */
const secretState = (sub: WebhookSubscription): SecretState => {
  const bearer = sub.authType === 'TokenBearer';
  if (!(bearer ? sub.hasClientSecret : sub.hasSecretKey)) return 'notSet';
  return (bearer ? sub.clientSecretEncrypted : sub.secretKeyEncrypted) ? 'encrypted' : 'plaintext';
};

const SecretBadge = ({ state }: { state: SecretState }) => {
  const { t } = useTranslation('webhookAdmin');
  const tone = { encrypted: 'green', plaintext: 'yellow', notSet: 'red' } as const;
  const title = {
    encrypted: t('subscriptions.form.secretSet'),
    plaintext: t('subscriptions.secretTitle.plaintext'),
    notSet: t('subscriptions.form.secretNotSet'),
  };
  return (
    <Badge tone={tone[state]} className="whitespace-nowrap" title={title[state]}>
      {t(`subscriptions.secretBadge.${state}`)}
    </Badge>
  );
};

const WebhookSubscriptionListPage = () => {
  const { t } = useTranslation('webhookAdmin');

  const [tab, setTab] = useState<ActiveTab>('all');
  const [search, setSearch] = useState('');
  // The panel edits the live row (looked up by id), so a toggle or a refetch shows through it.
  // Closing keeps the id and the last row, so the panel does not turn into the create form while it slides out.
  const [panelOpen, setPanelOpen] = useState(false);
  const [panelId, setPanelId] = useState<string | null>(null);
  const [lastEdited, setLastEdited] = useState<WebhookSubscription | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<WebhookSubscription | null>(null);

  const { data, isLoading, isError, refetch } = useGetWebhookSubscriptions(FETCH_ALL);
  const toggleMutation = useToggleWebhookSubscription();
  const deleteMutation = useDeleteWebhookSubscription();

  const all = data?.items ?? [];
  const activeCount = all.filter(s => s.isActive).length;
  const term = search.trim().toLowerCase();
  const rows = all.filter(
    s =>
      (tab === 'all' || s.isActive === (tab === 'active')) &&
      (!term ||
        s.systemCode.toLowerCase().includes(term) ||
        (s.eventType ?? '').toLowerCase().includes(term)),
  );
  const plaintextCount = all.filter(s => secretState(s) === 'plaintext').length;
  const live = panelId ? (all.find(s => s.id === panelId) ?? null) : null;
  if (live && live !== lastEdited) setLastEdited(live);
  const editing = panelId ? (live ?? lastEdited) : null;
  const openPanel = (id: string | null) => {
    setPanelId(id);
    setPanelOpen(true);
  };

  const tabs = [
    { value: 'all', label: t('subscriptions.tabs.all'), count: data ? all.length : undefined },
    {
      value: 'active',
      label: t('subscriptions.tabs.active'),
      count: data ? activeCount : undefined,
    },
    {
      value: 'inactive',
      label: t('subscriptions.tabs.inactive'),
      count: data ? all.length - activeCount : undefined,
    },
  ] as const;

  const handleDeleteConfirm = () => {
    if (!deleteTarget) return;
    const target = deleteTarget;
    deleteMutation.mutate(target.id, {
      onSuccess: () => {
        // Deleted from inside its own panel: close it with the row.
        if (panelId === target.id) setPanelOpen(false);
      },
      onSettled: () => setDeleteTarget(null),
    });
  };

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="min-w-64 flex-1">
          <h2 className="text-base font-semibold text-gray-900">{t('subscriptions.page.title')}</h2>
          <p className="mt-0.5 text-xs text-gray-500">{t('subscriptions.page.subtitle')}</p>
        </div>
        <Button
          onClick={() => openPanel(null)}
          leftIcon={<Icon name="plus" style="regular" className="text-sm" />}
        >
          {t('subscriptions.actions.add')}
        </Button>
      </div>

      {plaintextCount > 0 && (
        <div
          role="status"
          className="flex flex-wrap items-center gap-x-3 gap-y-1.5 rounded-lg border border-amber-200 bg-amber-50 px-3 py-1.5 text-xs text-gray-700"
        >
          <span>
            <span className="font-semibold text-amber-700">
              {t('subscriptions.banner.count', { count: plaintextCount })}
            </span>{' '}
            {t('subscriptions.banner.text', { count: plaintextCount })}
          </span>
        </div>
      )}

      <div className="overflow-hidden rounded-lg border border-gray-200 bg-white">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-2 border-b border-gray-100 px-4 py-2.5">
          <CountTabs
            tabs={tabs}
            value={tab}
            onChange={setTab}
            label={t('subscriptions.tabs.label')}
          />
          <div className="ml-auto w-60">
            <Input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder={t('subscriptions.filters.searchPlaceholder')}
              aria-label={t('subscriptions.filters.searchPlaceholder')}
              leftIcon={<Icon name="magnifying-glass" style="regular" className="text-sm" />}
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[46rem] text-table">
            <thead className="bg-gray-50">
              <tr className="border-b border-gray-200">
                <th className={`${thClass} w-[22%]`}>{t('subscriptions.columns.systemEvent')}</th>
                <th className={thClass}>{t('subscriptions.columns.destination')}</th>
                <th className={`${thClass} w-36`}>{t('subscriptions.columns.secret')}</th>
                <th className={`${thClass} w-20`}>{t('subscriptions.columns.active')}</th>
                <th className="w-20 px-4 py-2.5">
                  <span className="sr-only">{t('subscriptions.columns.actions')}</span>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {isLoading ? (
                <TableRowSkeleton columns={TABLE_SKELETON_COLUMNS} rows={4} />
              ) : isError ? (
                <tr>
                  <td colSpan={COLUMN_COUNT} className="py-4">
                    <DataErrorState
                      variant="inline"
                      title={t('subscriptions.loadFailed')}
                      onRetry={refetch}
                    />
                  </td>
                </tr>
              ) : rows.length === 0 ? (
                <tr>
                  <td colSpan={COLUMN_COUNT} className="py-12 text-center text-sm text-gray-400">
                    <Icon
                      name="plug"
                      style="regular"
                      className="mx-auto mb-2 text-3xl opacity-40"
                    />
                    <p>
                      {all.length === 0
                        ? t('subscriptions.emptyState')
                        : t('subscriptions.emptyFiltered')}
                    </p>
                  </td>
                </tr>
              ) : (
                rows.map(sub => (
                  <tr
                    key={sub.id}
                    tabIndex={0}
                    onClick={() => openPanel(sub.id)}
                    onKeyDown={e => {
                      if (e.key === 'Enter' && e.target === e.currentTarget) openPanel(sub.id);
                    }}
                    className="cursor-pointer align-top transition-colors even:bg-gray-50/50 hover:bg-gray-50"
                  >
                    <td className="px-4 py-2.5">
                      <div className="font-semibold text-gray-900">{sub.systemCode}</div>
                      {sub.eventType ? (
                        <div className="font-mono text-xs text-gray-500">{sub.eventType}</div>
                      ) : (
                        <div className="text-xs text-gray-500">{t('subscriptions.catchAll')}</div>
                      )}
                    </td>
                    <td className="max-w-0 px-4 py-2.5">
                      <div className="truncate" title={`${sub.httpMethod} ${sub.callbackUrl}`}>
                        <span className="mr-1.5 rounded bg-gray-100 px-1.5 font-mono text-xs font-medium text-gray-600">
                          {sub.httpMethod}
                        </span>
                        <span className="font-mono text-xs">{sub.callbackUrl}</span>
                      </div>
                      <div className="text-xs text-gray-500">
                        {t(`subscriptions.authLine.${sub.authType}`)}
                      </div>
                    </td>
                    <td className="px-4 py-2.5">
                      <SecretBadge state={secretState(sub)} />
                    </td>
                    <td className="px-4 py-2.5" onClick={e => e.stopPropagation()}>
                      <Switch
                        variant="primary"
                        size="sm"
                        ariaLabel={t('subscriptions.actions.toggle', { name: sub.systemCode })}
                        checked={sub.isActive}
                        disabled={toggleMutation.isPending}
                        onChange={isActive => toggleMutation.mutate({ id: sub.id, isActive })}
                      />
                    </td>
                    <td className="whitespace-nowrap px-4 py-1.5 text-right">
                      <button
                        type="button"
                        onClick={e => {
                          e.stopPropagation();
                          openPanel(sub.id);
                        }}
                        aria-label={t('subscriptions.actions.edit')}
                        title={t('subscriptions.actions.edit')}
                        className="inline-flex size-7 items-center justify-center rounded-md text-gray-400 hover:bg-primary/10 hover:text-primary"
                      >
                        <Icon name="pen" style="regular" className="text-sm" />
                      </button>
                      <button
                        type="button"
                        onClick={e => {
                          e.stopPropagation();
                          setDeleteTarget(sub);
                        }}
                        aria-label={t('subscriptions.actions.delete')}
                        title={t('subscriptions.actions.delete')}
                        className="inline-flex size-7 items-center justify-center rounded-md text-gray-400 hover:bg-danger/10 hover:text-danger"
                      >
                        <Icon name="trash" style="regular" className="text-sm" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <WebhookSubscriptionPanel
        isOpen={panelOpen}
        onClose={() => setPanelOpen(false)}
        subscription={editing}
        onRequestDelete={setDeleteTarget}
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
