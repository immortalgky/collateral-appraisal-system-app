import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import SectionHeader from '@shared/components/sections/SectionHeader';
import Icon from '@shared/components/Icon';
import Button from '@shared/components/Button';
import ConfirmDialog from '@shared/components/ConfirmDialog';
import { TableRowSkeleton } from '@shared/components/Skeleton';
import Pagination from '@shared/components/Pagination';
import DataErrorState from '@shared/components/DataErrorState';
import { useGetClients, useRotateClientSecret, useDeleteClient } from '../api/oauthClients';
import OAuthClientFormModal from '../components/OAuthClientFormModal';
import SecretRevealModal from '../components/SecretRevealModal';
import type { CreateClientResponse, OAuthClientListItem } from '../types';

const PAGE_SIZE = 20;
const SKELETON_COLUMNS = [
  { width: 'w-32' },
  { width: 'w-40' },
  { width: 'w-20' },
  { width: 'w-40' },
  { width: 'w-40' },
  { width: 'w-24' },
];

const OAuthClientListPage = () => {
  const { t } = useTranslation('oauthAdmin');

  const [searchInput, setSearchInput] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [pageIndex, setPageIndex] = useState(0);

  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<OAuthClientListItem | null>(null);
  const [rotateTarget, setRotateTarget] = useState<OAuthClientListItem | null>(null);
  const [revealed, setRevealed] = useState<{
    clientId: string;
    secret: string;
    variant: 'created' | 'rotated';
  } | null>(null);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchInput);
      setPageIndex(0);
    }, 400);
    return () => clearTimeout(timer);
  }, [searchInput]);

  const { data, isLoading, isError, refetch } = useGetClients({
    search: debouncedSearch || undefined,
    pageNumber: pageIndex + 1,
    pageSize: PAGE_SIZE,
  });

  const rotateMutation = useRotateClientSecret();
  const deleteMutation = useDeleteClient();

  const clients = data?.items ?? [];
  const totalCount = data?.count ?? 0;

  const openCreate = () => {
    setEditId(null);
    setShowForm(true);
  };
  const openEdit = (client: OAuthClientListItem) => {
    setEditId(client.id);
    setShowForm(true);
  };

  const handleCreated = (response: CreateClientResponse) => {
    if (response.clientSecret) {
      setRevealed({ clientId: response.clientId, secret: response.clientSecret, variant: 'created' });
    }
  };

  const handleRotateConfirm = () => {
    if (!rotateTarget) return;
    rotateMutation.mutate(rotateTarget.id, {
      onSuccess: response => {
        setRotateTarget(null);
        setRevealed({ clientId: response.clientId, secret: response.clientSecret, variant: 'rotated' });
      },
      onError: () => setRotateTarget(null),
    });
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
          title={t('clients.page.title')}
          subtitle={t('clients.page.subtitle')}
          icon="key"
          iconColor="blue"
        />
        <Button onClick={openCreate}>
          <Icon name="plus" style="regular" className="size-4 mr-1.5" />
          {t('clients.actions.add')}
        </Button>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm mt-4">
        <div className="flex flex-wrap items-center gap-3 px-4 pt-4 pb-2">
          <div className="relative min-w-64">
            <Icon
              name="magnifying-glass"
              style="regular"
              className="size-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
            />
            <input
              type="text"
              value={searchInput}
              onChange={e => setSearchInput(e.target.value)}
              placeholder={t('clients.filters.searchPlaceholder')}
              className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
            />
          </div>
          {searchInput && (
            <button
              type="button"
              onClick={() => setSearchInput('')}
              className="text-xs text-gray-400 hover:text-gray-600"
            >
              {t('clients.filters.clear')}
            </button>
          )}
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                  {t('clients.columns.displayName')}
                </th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                  {t('clients.columns.clientId')}
                </th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                  {t('clients.columns.type')}
                </th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                  {t('clients.columns.grantTypes')}
                </th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                  {t('clients.columns.scopes')}
                </th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                  {t('clients.columns.actions')}
                </th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <TableRowSkeleton columns={SKELETON_COLUMNS} rows={5} />
              ) : isError ? (
                <tr>
                  <td colSpan={6} className="py-4">
                    <DataErrorState variant="inline" title={t('clients.loadFailed')} onRetry={refetch} />
                  </td>
                </tr>
              ) : clients.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-12 text-gray-400 text-sm">
                    <Icon name="key" style="regular" className="size-8 mx-auto mb-2 opacity-40" />
                    <p>{t('clients.emptyState')}</p>
                  </td>
                </tr>
              ) : (
                clients.map(client => (
                  <tr key={client.id} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3 font-medium text-gray-900">
                      <div className="flex items-center gap-2">
                        {client.displayName}
                        {client.isSystem && (
                          <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-gray-100 text-gray-500 uppercase tracking-wide">
                            {t('clients.badges.system')}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-gray-600 font-mono text-xs">{client.clientId}</td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                          client.clientType === 'confidential'
                            ? 'bg-indigo-50 text-indigo-700'
                            : 'bg-sky-50 text-sky-700'
                        }`}
                      >
                        {t(`clients.type.${client.clientType}` as const)}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-500 text-xs">
                      {client.grantTypes.join(', ') || '—'}
                    </td>
                    <td className="px-4 py-3 text-gray-500 text-xs max-w-xs">
                      <span className="block truncate" title={client.scopes.join(' ')}>
                        {client.scopes.join(', ') || '—'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          type="button"
                          onClick={() => openEdit(client)}
                          className="p-1.5 text-gray-400 hover:text-primary hover:bg-primary/5 rounded-lg transition-colors"
                          title={t('clients.actions.edit')}
                        >
                          <Icon name="pen" style="regular" className="size-4" />
                        </button>
                        {client.hasSecret && (
                          <button
                            type="button"
                            onClick={() => setRotateTarget(client)}
                            className="p-1.5 text-gray-400 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-colors"
                            title={t('clients.actions.rotateSecret')}
                          >
                            <Icon name="rotate" style="regular" className="size-4" />
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => setDeleteTarget(client)}
                          disabled={client.isSystem}
                          className="p-1.5 text-gray-400 hover:text-danger hover:bg-danger/5 rounded-lg transition-colors disabled:opacity-30 disabled:hover:bg-transparent disabled:cursor-not-allowed"
                          title={t('clients.actions.delete')}
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

      <OAuthClientFormModal
        isOpen={showForm}
        onClose={() => setShowForm(false)}
        editId={editId}
        onCreated={handleCreated}
      />

      {revealed && (
        <SecretRevealModal
          isOpen={!!revealed}
          onClose={() => setRevealed(null)}
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
