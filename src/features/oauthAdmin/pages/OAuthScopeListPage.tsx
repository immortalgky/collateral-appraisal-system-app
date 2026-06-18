import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import SectionHeader from '@shared/components/sections/SectionHeader';
import Icon from '@shared/components/Icon';
import Button from '@shared/components/Button';
import ConfirmDialog from '@shared/components/ConfirmDialog';
import { TableRowSkeleton } from '@shared/components/Skeleton';
import Pagination from '@shared/components/Pagination';
import DataErrorState from '@shared/components/DataErrorState';
import { useGetScopes, useDeleteScope } from '../api/oauthScopes';
import OAuthScopeFormModal from '../components/OAuthScopeFormModal';
import type { OAuthScope } from '../types';

const PAGE_SIZE = 50;
const SKELETON_COLUMNS = [{ width: 'w-32' }, { width: 'w-40' }, { width: 'w-64' }, { width: 'w-24' }];

const OAuthScopeListPage = () => {
  const { t } = useTranslation('oauthAdmin');

  const [searchInput, setSearchInput] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [pageIndex, setPageIndex] = useState(0);

  const [showForm, setShowForm] = useState(false);
  const [editTarget, setEditTarget] = useState<OAuthScope | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<OAuthScope | null>(null);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchInput);
      setPageIndex(0);
    }, 400);
    return () => clearTimeout(timer);
  }, [searchInput]);

  const { data, isLoading, isError, refetch } = useGetScopes({
    search: debouncedSearch || undefined,
    pageNumber: pageIndex + 1,
    pageSize: PAGE_SIZE,
  });

  const deleteMutation = useDeleteScope();

  const scopes = data?.items ?? [];
  const totalCount = data?.count ?? 0;

  const openCreate = () => {
    setEditTarget(null);
    setShowForm(true);
  };
  const openEdit = (scope: OAuthScope) => {
    setEditTarget(scope);
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
          title={t('scopes.page.title')}
          subtitle={t('scopes.page.subtitle')}
          icon="shield-halved"
          iconColor="blue"
        />
        <Button onClick={openCreate}>
          <Icon name="plus" style="regular" className="size-4 mr-1.5" />
          {t('scopes.actions.add')}
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
              placeholder={t('scopes.filters.searchPlaceholder')}
              className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
            />
          </div>
          {searchInput && (
            <button
              type="button"
              onClick={() => setSearchInput('')}
              className="text-xs text-gray-400 hover:text-gray-600"
            >
              {t('scopes.filters.clear')}
            </button>
          )}
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                  {t('scopes.columns.name')}
                </th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                  {t('scopes.columns.displayName')}
                </th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                  {t('scopes.columns.description')}
                </th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                  {t('scopes.columns.actions')}
                </th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <TableRowSkeleton columns={SKELETON_COLUMNS} rows={5} />
              ) : isError ? (
                <tr>
                  <td colSpan={4} className="py-4">
                    <DataErrorState variant="inline" title={t('scopes.loadFailed')} onRetry={refetch} />
                  </td>
                </tr>
              ) : scopes.length === 0 ? (
                <tr>
                  <td colSpan={4} className="text-center py-12 text-gray-400 text-sm">
                    <Icon name="shield-halved" style="regular" className="size-8 mx-auto mb-2 opacity-40" />
                    <p>{t('scopes.emptyState')}</p>
                  </td>
                </tr>
              ) : (
                scopes.map(scope => (
                  <tr key={scope.id} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3 font-mono text-xs text-gray-900">{scope.name}</td>
                    <td className="px-4 py-3 text-gray-700">{scope.displayName || '—'}</td>
                    <td className="px-4 py-3 text-gray-500 max-w-md">
                      <span className="block truncate" title={scope.description ?? ''}>
                        {scope.description || '—'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          type="button"
                          onClick={() => openEdit(scope)}
                          className="p-1.5 text-gray-400 hover:text-primary hover:bg-primary/5 rounded-lg transition-colors"
                          title={t('scopes.actions.edit')}
                        >
                          <Icon name="pen" style="regular" className="size-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setDeleteTarget(scope)}
                          className="p-1.5 text-gray-400 hover:text-danger hover:bg-danger/5 rounded-lg transition-colors"
                          title={t('scopes.actions.delete')}
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

      <OAuthScopeFormModal isOpen={showForm} onClose={() => setShowForm(false)} scope={editTarget} />

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
