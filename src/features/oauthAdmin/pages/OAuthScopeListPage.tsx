import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import Button from '@shared/components/Button';
import ConfirmDialog from '@shared/components/ConfirmDialog';
import DataErrorState from '@shared/components/DataErrorState';
import Icon from '@shared/components/Icon';
import Input from '@shared/components/Input';
import { TableRowSkeleton } from '@shared/components/Skeleton';
import { useGetAllClients } from '../api/oauthClients';
import { FETCH_ALL_SCOPES, useDeleteScope, useGetScopes } from '../api/oauthScopes';
import OAuthScopeDrawer from '../components/OAuthScopeDrawer';
import Tag from '../components/Tag';
import type { OAuthScope } from '../types';

const COLUMN_COUNT = 5;
const SKELETON_COLUMNS = [
  { width: 'w-32' },
  { width: 'w-64' },
  { width: 'w-20' },
  { width: 'w-20' },
  { width: 'w-6' },
];

const thClass =
  'px-4 py-2.5 text-left text-xs font-semibold whitespace-nowrap text-(--palette-gray-600)';

const OAuthScopeListPage = () => {
  const { t } = useTranslation('oauthAdmin');

  const [search, setSearch] = useState('');
  // Closing keeps the scope, so the drawer does not turn into the create form while it slides out.
  const [panelOpen, setPanelOpen] = useState(false);
  const [editing, setEditing] = useState<OAuthScope | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<OAuthScope | null>(null);

  const { data, isLoading, isError, refetch } = useGetScopes(FETCH_ALL_SCOPES);
  const clientsQuery = useGetAllClients();
  const deleteMutation = useDeleteScope();

  // Which clients hold each scope. Deleting one that is still held would break those clients, so
  // the delete button waits for the clients list (`usageKnown`) before it can enable.
  const usageKnown = clientsQuery.isSuccess;
  const usedBy = (name: string) =>
    (clientsQuery.data?.items ?? []).filter(c => c.scopes.includes(name)).map(c => c.displayName);

  const all = data?.items ?? [];
  const term = search.trim().toLowerCase();
  const rows = all.filter(
    s =>
      !term ||
      s.name.toLowerCase().includes(term) ||
      (s.displayName ?? '').toLowerCase().includes(term),
  );

  const openPanel = (scope: OAuthScope | null) => {
    setEditing(scope);
    setPanelOpen(true);
  };

  const handleDeleteConfirm = () => {
    if (!deleteTarget) return;
    const target = deleteTarget;
    deleteMutation.mutate(target.id, {
      onSuccess: () => {
        // Deleted from inside its own drawer: close it with the row.
        if (editing?.id === target.id) setPanelOpen(false);
      },
      onSettled: () => setDeleteTarget(null),
    });
  };

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="min-w-64 flex-1">
          <h2 className="text-base font-semibold text-(--palette-ink)">{t('scopes.page.title')}</h2>
          <p className="mt-0.5 text-xs text-(--palette-gray-500)">{t('scopes.page.subtitle')}</p>
        </div>
        <Button
          onClick={() => openPanel(null)}
          leftIcon={<Icon name="plus" style="regular" className="text-sm" />}
        >
          {t('scopes.actions.add')}
        </Button>
      </div>

      <div className="overflow-hidden rounded-lg border border-(--palette-line) bg-(--palette-surface)">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-2 border-b border-(--palette-line-soft) px-4 py-2.5">
          <div className="w-64">
            <Input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder={t('scopes.filters.searchPlaceholder')}
              aria-label={t('scopes.filters.searchPlaceholder')}
              leftIcon={<Icon name="magnifying-glass" style="regular" className="text-sm" />}
            />
          </div>
          <span className="ml-auto text-xs text-(--palette-gray-500)">
            {t('scopes.standardNote')}
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[56rem] table-fixed text-table">
            <colgroup>
              <col className="w-[24%]" />
              <col />
              <col className="w-[16%]" />
              <col className="w-[18%]" />
              <col className="w-14" />
            </colgroup>
            <thead className="bg-(--palette-surface-2)">
              <tr className="border-b border-(--palette-line)">
                <th className={thClass}>{t('scopes.columns.scope')}</th>
                <th className={thClass}>{t('scopes.columns.description')}</th>
                <th className={thClass}>{t('scopes.columns.resources')}</th>
                <th className={thClass}>{t('scopes.columns.usedBy')}</th>
                <th className="px-4 py-2.5">
                  <span className="sr-only">{t('scopes.columns.actions')}</span>
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
                      title={t('scopes.loadFailed')}
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
                    <p>{all.length === 0 ? t('scopes.emptyState') : t('scopes.emptyFiltered')}</p>
                  </td>
                </tr>
              ) : (
                rows.map(scope => {
                  const users = usedBy(scope.name);
                  const blocked = !usageKnown || users.length > 0;
                  const deleteLabel =
                    users.length > 0
                      ? t('scopes.deleteBlocked', { clients: users.join(', ') })
                      : t('scopes.actions.delete');
                  return (
                    <tr
                      key={scope.id}
                      tabIndex={0}
                      onClick={() => openPanel(scope)}
                      onKeyDown={e => {
                        if (e.key === 'Enter' && e.target === e.currentTarget) openPanel(scope);
                      }}
                      className="cursor-pointer align-top transition-colors even:bg-(--palette-surface-2)/50 hover:bg-(--palette-surface-2)"
                    >
                      <td className="px-4 py-2.5">
                        <div
                          className="truncate font-mono text-xs font-medium text-(--palette-ink)"
                          title={scope.name}
                        >
                          {scope.name}
                        </div>
                        {scope.displayName && (
                          <div
                            className="truncate text-xs text-(--palette-gray-500)"
                            title={scope.displayName}
                          >
                            {scope.displayName}
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-2.5">
                        <span className="block truncate" title={scope.description ?? undefined}>
                          {scope.description || (
                            <span className="text-(--palette-gray-400)">—</span>
                          )}
                        </span>
                      </td>
                      <td className="px-4 py-2.5">
                        <div className="flex flex-wrap gap-1">
                          {scope.resources.map(resource => (
                            <Tag key={resource} mono>
                              {resource}
                            </Tag>
                          ))}
                        </div>
                      </td>
                      <td className="px-4 py-2.5">
                        <div className="flex flex-wrap gap-1">
                          {users.map(name => (
                            <Tag key={name}>{name}</Tag>
                          ))}
                          {usageKnown && users.length === 0 && (
                            <span className="text-(--palette-gray-400)">{t('scopes.unused')}</span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-1.5 text-right">
                        <button
                          type="button"
                          disabled={blocked}
                          onClick={e => {
                            e.stopPropagation();
                            setDeleteTarget(scope);
                          }}
                          aria-label={t('scopes.actions.delete')}
                          title={deleteLabel}
                          className="inline-flex size-7 items-center justify-center rounded-md text-(--palette-gray-400) enabled:hover:bg-danger/10 enabled:hover:text-danger disabled:cursor-not-allowed disabled:opacity-40"
                        >
                          <Icon name="trash" style="regular" className="text-sm" />
                        </button>
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
            {t('scopes.footer.count', { count: rows.length })}
          </div>
        )}
      </div>

      <OAuthScopeDrawer
        isOpen={panelOpen}
        onClose={() => setPanelOpen(false)}
        scope={editing}
        usedBy={editing ? usedBy(editing.name) : []}
        usageKnown={usageKnown}
        onRequestDelete={setDeleteTarget}
      />

      <ConfirmDialog
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDeleteConfirm}
        title={t('scopes.delete.confirmTitle')}
        message={t('scopes.delete.confirmMessage')}
        confirmText={t('scopes.delete.confirmButton')}
        cancelText={t('scopes.delete.cancelButton')}
        variant="danger"
        isLoading={deleteMutation.isPending}
      />
    </div>
  );
};

export default OAuthScopeListPage;
