import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import Badge from '@shared/components/Badge';
import Button from '@shared/components/Button';
import ConfirmDialog from '@shared/components/ConfirmDialog';
import CountTabs from '@shared/components/CountTabs';
import DataErrorState from '@shared/components/DataErrorState';
import Icon from '@shared/components/Icon';
import Input from '@shared/components/Input';
import { TableRowSkeleton } from '@shared/components/Skeleton';
import { useDeleteClient, useGetAllClients, useRotateClientSecret } from '../api/oauthClients';
import OAuthClientDrawer from '../components/OAuthClientDrawer';
import SecretRevealModal from '../components/SecretRevealModal';
import Tag from '../components/Tag';
import type { CreateClientResponse, OAuthClientListItem } from '../types';

const COLUMN_COUNT = 5;
const MAX_VISIBLE_SCOPES = 3;
const SKELETON_COLUMNS = [
  { width: 'w-32' },
  { width: 'w-24' },
  { width: 'w-40' },
  { width: 'w-48' },
  { width: 'w-16' },
];

type ClientTab = 'all' | 'confidential' | 'public';
type Target = Pick<OAuthClientListItem, 'id' | 'displayName'>;

const thClass =
  'px-4 py-2.5 text-left text-xs font-semibold whitespace-nowrap text-(--palette-gray-600)';

const OAuthClientListPage = () => {
  const { t } = useTranslation('oauthAdmin');

  const [tab, setTab] = useState<ClientTab>('all');
  const [search, setSearch] = useState('');
  // Closing keeps the id, so the drawer does not turn into the create form while it slides out.
  const [panelOpen, setPanelOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Target | null>(null);
  const [rotateTarget, setRotateTarget] = useState<Target | null>(null);
  const [revealed, setRevealed] = useState<{
    name: string;
    clientId: string;
    secret: string;
    variant: 'created' | 'rotated';
  } | null>(null);

  const { data, isLoading, isError, refetch } = useGetAllClients();
  const rotateMutation = useRotateClientSecret();
  const deleteMutation = useDeleteClient();

  const all = data?.items ?? [];
  const confidentialCount = all.filter(c => c.clientType === 'confidential').length;
  const term = search.trim().toLowerCase();
  const rows = all.filter(
    c =>
      (tab === 'all' || c.clientType === tab) &&
      (!term ||
        c.displayName.toLowerCase().includes(term) ||
        c.clientId.toLowerCase().includes(term)),
  );

  const tabs = [
    { value: 'all', label: t('clients.tabs.all'), count: data ? all.length : undefined },
    {
      value: 'confidential',
      label: t('clients.type.confidential'),
      count: data ? confidentialCount : undefined,
    },
    {
      value: 'public',
      label: t('clients.type.public'),
      count: data ? all.length - confidentialCount : undefined,
    },
  ] as const;

  const openPanel = (id: string | null) => {
    setEditId(id);
    setPanelOpen(true);
  };

  const handleCreated = (response: CreateClientResponse, name: string) => {
    if (response.clientSecret) {
      setRevealed({
        name,
        clientId: response.clientId,
        secret: response.clientSecret,
        variant: 'created',
      });
    }
  };

  const handleRotateConfirm = () => {
    if (!rotateTarget) return;
    const target = rotateTarget;
    rotateMutation.mutate(target.id, {
      onSuccess: response => {
        setRotateTarget(null);
        setRevealed({
          name: target.displayName,
          clientId: response.clientId,
          secret: response.clientSecret,
          variant: 'rotated',
        });
      },
      onError: () => setRotateTarget(null),
    });
  };

  const handleDeleteConfirm = () => {
    if (!deleteTarget) return;
    const target = deleteTarget;
    deleteMutation.mutate(target.id, {
      onSuccess: () => {
        // Deleted from inside its own drawer: close it with the row.
        if (panelOpen && editId === target.id) setPanelOpen(false);
      },
      onSettled: () => setDeleteTarget(null),
    });
  };

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="min-w-64 flex-1">
          <h2 className="text-base font-semibold text-(--palette-ink)">
            {t('clients.page.title')}
          </h2>
          <p className="mt-0.5 text-xs text-(--palette-gray-500)">{t('clients.page.subtitle')}</p>
        </div>
        <Button
          onClick={() => openPanel(null)}
          leftIcon={<Icon name="plus" style="regular" className="text-sm" />}
        >
          {t('clients.actions.add')}
        </Button>
      </div>

      <div className="overflow-hidden rounded-lg border border-(--palette-line) bg-(--palette-surface)">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-2 border-b border-(--palette-line-soft) px-4 py-2.5">
          <CountTabs tabs={tabs} value={tab} onChange={setTab} label={t('clients.tabs.label')} />
          <div className="ml-auto w-64">
            <Input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder={t('clients.filters.searchPlaceholder')}
              aria-label={t('clients.filters.searchPlaceholder')}
              leftIcon={<Icon name="magnifying-glass" style="regular" className="text-sm" />}
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[56rem] text-table">
            <thead className="bg-(--palette-surface-2)">
              <tr className="border-b border-(--palette-line)">
                <th className={`${thClass} w-[22%]`}>{t('clients.columns.client')}</th>
                <th className={`${thClass} w-32`}>{t('clients.columns.type')}</th>
                <th className={`${thClass} w-[26%]`}>{t('clients.columns.grantTypes')}</th>
                <th className={thClass}>{t('clients.columns.scopes')}</th>
                <th className="w-24 px-4 py-2.5">
                  <span className="sr-only">{t('clients.columns.actions')}</span>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-(--palette-line-soft)">
              {isLoading ? (
                <TableRowSkeleton columns={SKELETON_COLUMNS} rows={4} />
              ) : isError ? (
                <tr>
                  <td colSpan={COLUMN_COUNT} className="py-4">
                    <DataErrorState
                      variant="inline"
                      title={t('clients.loadFailed')}
                      onRetry={refetch}
                    />
                  </td>
                </tr>
              ) : rows.length === 0 ? (
                <tr>
                  <td
                    colSpan={COLUMN_COUNT}
                    className="py-12 text-center text-sm text-(--palette-gray-400)"
                  >
                    <Icon name="key" style="regular" className="mx-auto mb-2 text-3xl opacity-40" />
                    <p>{all.length === 0 ? t('clients.emptyState') : t('clients.emptyFiltered')}</p>
                  </td>
                </tr>
              ) : (
                rows.map(client => {
                  const shown = client.scopes.slice(0, MAX_VISIBLE_SCOPES);
                  const hidden = client.scopes.slice(MAX_VISIBLE_SCOPES);
                  return (
                    <tr
                      key={client.id}
                      tabIndex={0}
                      onClick={() => openPanel(client.id)}
                      onKeyDown={e => {
                        if (e.key === 'Enter' && e.target === e.currentTarget) openPanel(client.id);
                      }}
                      className="cursor-pointer transition-colors even:bg-(--palette-surface-2)/50 hover:bg-(--palette-surface-2)"
                    >
                      <td className="px-4 py-2.5">
                        <div className="flex items-center gap-1.5">
                          <span className="font-semibold text-(--palette-ink)">
                            {client.displayName}
                          </span>
                          {client.isSystem && (
                            <span
                              title={t('clients.badges.systemTitle')}
                              className="rounded bg-(--palette-surface-3) px-1.5 text-xs font-medium text-(--palette-gray-600)"
                            >
                              {t('clients.badges.system')}
                            </span>
                          )}
                        </div>
                        <div className="font-mono text-xs text-(--palette-gray-500)">
                          {client.clientId}
                        </div>
                      </td>
                      <td className="px-4 py-2.5">
                        <Badge
                          size="sm"
                          className="whitespace-nowrap"
                          {...(client.clientType === 'confidential'
                            ? { tone: 'teal' as const }
                            : { variant: 'info' as const })}
                        >
                          {t(`clients.type.${client.clientType}` as const)}
                        </Badge>
                      </td>
                      <td className="px-4 py-2.5">
                        <div className="flex flex-wrap gap-1">
                          {client.grantTypes.map(grant => (
                            <Tag key={grant}>
                              {grant === 'authorization_code' ||
                              grant === 'client_credentials' ||
                              grant === 'refresh_token'
                                ? t(`clients.grant.${grant}` as const)
                                : grant}
                            </Tag>
                          ))}
                        </div>
                      </td>
                      <td className="px-4 py-2.5">
                        <div className="flex flex-wrap items-center gap-1">
                          {shown.map(scope => (
                            <Tag key={scope} mono>
                              {scope}
                            </Tag>
                          ))}
                          {hidden.length > 0 && (
                            <span
                              className="px-0.5 text-xs text-(--palette-gray-500)"
                              title={hidden.join(', ')}
                            >
                              +{hidden.length}
                            </span>
                          )}
                          {client.scopes.length === 0 && (
                            <span
                              className="text-(--palette-gray-400)"
                              title={t('clients.noScopesTitle')}
                            >
                              {t('clients.noScopes')}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-1.5 text-right whitespace-nowrap">
                        {/* Not applicable = absent, not faded; the spacer keeps the columns aligned. */}
                        {client.hasSecret ? (
                          <button
                            type="button"
                            onClick={e => {
                              e.stopPropagation();
                              setRotateTarget(client);
                            }}
                            aria-label={t('clients.actions.rotateSecret')}
                            title={t('clients.actions.rotateSecret')}
                            className="inline-flex size-7 items-center justify-center rounded-md text-(--palette-gray-400) hover:bg-(--palette-warn-wash) hover:text-amber-600 dark:hover:text-amber-400"
                          >
                            <Icon name="rotate" style="regular" className="text-sm" />
                          </button>
                        ) : (
                          <span className="inline-block size-7" aria-hidden="true" />
                        )}
                        {client.isSystem ? (
                          <span className="inline-block size-7" aria-hidden="true" />
                        ) : (
                          <button
                            type="button"
                            onClick={e => {
                              e.stopPropagation();
                              setDeleteTarget(client);
                            }}
                            aria-label={t('clients.actions.delete')}
                            title={t('clients.actions.delete')}
                            className="inline-flex size-7 items-center justify-center rounded-md text-(--palette-gray-400) hover:bg-danger/10 hover:text-danger"
                          >
                            <Icon name="trash" style="regular" className="text-sm" />
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {!isLoading && !isError && (
          <div className="border-t border-(--palette-line) bg-(--palette-surface-2) px-4 py-2 text-sm text-(--palette-gray-600) tabular-nums">
            {t('clients.footer.count', { count: rows.length })}
          </div>
        )}
      </div>

      <OAuthClientDrawer
        isOpen={panelOpen}
        onClose={() => setPanelOpen(false)}
        editId={editId}
        onCreated={handleCreated}
        onRequestDelete={setDeleteTarget}
        onRequestRotate={setRotateTarget}
      />

      {revealed && (
        <SecretRevealModal
          isOpen
          onClose={() => setRevealed(null)}
          clientName={revealed.name}
          clientId={revealed.clientId}
          secret={revealed.secret}
          variant={revealed.variant}
        />
      )}

      <ConfirmDialog
        isOpen={!!rotateTarget}
        onClose={() => setRotateTarget(null)}
        onConfirm={handleRotateConfirm}
        title={t('clients.secret.rotateConfirmTitle')}
        message={t('clients.secret.rotateConfirmMessage')}
        confirmText={t('clients.secret.rotateConfirmButton')}
        cancelText={t('clients.delete.cancelButton')}
        variant="warning"
        isLoading={rotateMutation.isPending}
      />

      <ConfirmDialog
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDeleteConfirm}
        title={t('clients.delete.confirmTitle')}
        message={t('clients.delete.confirmMessage')}
        confirmText={t('clients.delete.confirmButton')}
        cancelText={t('clients.delete.cancelButton')}
        variant="danger"
        isLoading={deleteMutation.isPending}
      />
    </div>
  );
};

export default OAuthClientListPage;
