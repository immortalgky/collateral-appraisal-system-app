import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import SectionHeader from '@shared/components/sections/SectionHeader';
import Icon from '@shared/components/Icon';
import ConfirmDialog from '@shared/components/ConfirmDialog';
import { TableRowSkeleton } from '@shared/components/Skeleton';
import Pagination from '@shared/components/Pagination';
import DataErrorState from '@shared/components/DataErrorState';
import {
  useGetAuthorizations,
  useGetTokens,
  useRevokeAuthorization,
  useRevokeToken,
} from '../api/oauthTokens';

const PAGE_SIZE = 20;
const STATUS_OPTIONS = ['valid', 'revoked', 'redeemed', 'inactive'];

type Tab = 'authorizations' | 'tokens';

const statusBadgeClass = (status: string | null): string => {
  switch ((status ?? '').toLowerCase()) {
    case 'valid':
      return 'bg-emerald-50 text-emerald-700';
    case 'revoked':
      return 'bg-danger/10 text-danger';
    default:
      return 'bg-gray-100 text-gray-500';
  }
};

const OAuthTokenListPage = () => {
  const { t } = useTranslation('oauthAdmin');

  const [tab, setTab] = useState<Tab>('authorizations');
  const [clientIdInput, setClientIdInput] = useState('');
  const [subjectInput, setSubjectInput] = useState('');
  const [debounced, setDebounced] = useState({ clientId: '', subject: '' });
  const [status, setStatus] = useState('');
  const [pageIndex, setPageIndex] = useState(0);

  const [revokeTarget, setRevokeTarget] = useState<{ id: string; kind: Tab } | null>(null);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebounced({ clientId: clientIdInput, subject: subjectInput });
      setPageIndex(0);
    }, 400);
    return () => clearTimeout(timer);
  }, [clientIdInput, subjectInput]);

  useEffect(() => {
    setPageIndex(0);
  }, [status, tab]);

  const params = {
    clientId: debounced.clientId || undefined,
    subject: debounced.subject || undefined,
    status: status || undefined,
    pageNumber: pageIndex + 1,
    pageSize: PAGE_SIZE,
  };

  // Only the active tab's query fires — the inactive one is disabled so it issues no request.
  const authorizationsQuery = useGetAuthorizations(params, tab === 'authorizations');
  const tokensQuery = useGetTokens(params, tab === 'tokens');
  const active = tab === 'authorizations' ? authorizationsQuery : tokensQuery;

  const revokeAuthorization = useRevokeAuthorization();
  const revokeToken = useRevokeToken();
  const revokePending = revokeAuthorization.isPending || revokeToken.isPending;

  const totalCount = active.data?.count ?? 0;

  const handleRevokeConfirm = () => {
    if (!revokeTarget) return;
    const mutation = revokeTarget.kind === 'authorizations' ? revokeAuthorization : revokeToken;
    mutation.mutate(revokeTarget.id, {
      onSuccess: () => setRevokeTarget(null),
      onError: () => setRevokeTarget(null),
    });
  };

  const clearFilters = () => {
    setClientIdInput('');
    setSubjectInput('');
    setStatus('');
  };

  return (
    <div className="px-4 sm:px-6 lg:px-8 py-8">
      <SectionHeader
        title={t('tokens.page.title')}
        subtitle={t('tokens.page.subtitle')}
        icon="ticket"
        iconColor="blue"
      />

      {/* Tabs */}
      <div className="flex gap-1 mt-4 border-b border-gray-200">
        {(['authorizations', 'tokens'] as Tab[]).map(key => (
          <button
            key={key}
            type="button"
            onClick={() => setTab(key)}
            className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
              tab === key
                ? 'border-primary text-primary'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            {t(`tokens.tabs.${key}` as const)}
          </button>
        ))}
      </div>

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm mt-4">
        {/* Filters */}
        <div className="flex flex-wrap items-center gap-3 px-4 pt-4 pb-2">
          <input
            type="text"
            value={clientIdInput}
            onChange={e => setClientIdInput(e.target.value)}
            placeholder={t('tokens.filters.clientIdPlaceholder')}
            className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary min-w-48"
          />
          <input
            type="text"
            value={subjectInput}
            onChange={e => setSubjectInput(e.target.value)}
            placeholder={t('tokens.filters.subjectPlaceholder')}
            className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary min-w-48"
          />
          <select
            value={status}
            onChange={e => setStatus(e.target.value)}
            className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary bg-white"
          >
            <option value="">{t('tokens.filters.allStatuses')}</option>
            {STATUS_OPTIONS.map(s => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
          {(clientIdInput || subjectInput || status) && (
            <button
              type="button"
              onClick={clearFilters}
              className="text-xs text-gray-400 hover:text-gray-600"
            >
              {t('tokens.filters.clear')}
            </button>
          )}
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                  {t('tokens.columns.subject')}
                </th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                  {t('tokens.columns.clientId')}
                </th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                  {t('tokens.columns.status')}
                </th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                  {t('tokens.columns.type')}
                </th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                  {tab === 'authorizations' ? t('tokens.columns.scopes') : t('tokens.columns.expires')}
                </th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                  {t('tokens.columns.created')}
                </th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                  {t('tokens.columns.actions')}
                </th>
              </tr>
            </thead>
            <tbody>
              {active.isLoading ? (
                <TableRowSkeleton
                  columns={[
                    { width: 'w-32' },
                    { width: 'w-20' },
                    { width: 'w-16' },
                    { width: 'w-20' },
                    { width: 'w-32' },
                    { width: 'w-32' },
                    { width: 'w-16' },
                  ]}
                  rows={5}
                />
              ) : active.isError ? (
                <tr>
                  <td colSpan={7} className="py-4">
                    <DataErrorState
                      variant="inline"
                      title={t('tokens.loadFailed')}
                      onRetry={active.refetch}
                    />
                  </td>
                </tr>
              ) : (active.data?.items.length ?? 0) === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-12 text-gray-400 text-sm">
                    <Icon name="ticket" style="regular" className="size-8 mx-auto mb-2 opacity-40" />
                    <p>
                      {tab === 'authorizations'
                        ? t('tokens.emptyAuthorizations')
                        : t('tokens.emptyTokens')}
                    </p>
                  </td>
                </tr>
              ) : tab === 'authorizations' ? (
                authorizationsQuery.data?.items.map(item => (
                  <tr key={item.id} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3 text-gray-700">{item.subject ?? '—'}</td>
                    <td className="px-4 py-3 text-gray-600 font-mono text-xs">{item.clientId ?? '—'}</td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${statusBadgeClass(item.status)}`}
                      >
                        {item.status ?? '—'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-500 text-xs">{item.type ?? '—'}</td>
                    <td className="px-4 py-3 text-gray-500 text-xs max-w-xs">
                      <span className="block truncate" title={item.scopes.join(' ')}>
                        {item.scopes.join(', ') || '—'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-500 text-xs whitespace-nowrap">
                      {item.creationDate ? new Date(item.creationDate).toLocaleString() : '—'}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        type="button"
                        onClick={() => setRevokeTarget({ id: item.id, kind: 'authorizations' })}
                        className="p-1.5 text-gray-400 hover:text-danger hover:bg-danger/5 rounded-lg transition-colors"
                        title={t('tokens.actions.revoke')}
                      >
                        <Icon name="ban" style="regular" className="size-4" />
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                tokensQuery.data?.items.map(item => (
                  <tr key={item.id} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3 text-gray-700">{item.subject ?? '—'}</td>
                    <td className="px-4 py-3 text-gray-600 font-mono text-xs">{item.clientId ?? '—'}</td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${statusBadgeClass(item.status)}`}
                      >
                        {item.status ?? '—'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-500 text-xs">{item.type ?? '—'}</td>
                    <td className="px-4 py-3 text-gray-500 text-xs whitespace-nowrap">
                      {item.expirationDate ? new Date(item.expirationDate).toLocaleString() : '—'}
                    </td>
                    <td className="px-4 py-3 text-gray-500 text-xs whitespace-nowrap">
                      {item.creationDate ? new Date(item.creationDate).toLocaleString() : '—'}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        type="button"
                        onClick={() => setRevokeTarget({ id: item.id, kind: 'tokens' })}
                        className="p-1.5 text-gray-400 hover:text-danger hover:bg-danger/5 rounded-lg transition-colors"
                        title={t('tokens.actions.revoke')}
                      >
                        <Icon name="ban" style="regular" className="size-4" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {!active.isLoading && totalCount > 0 && (
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

      <ConfirmDialog
        isOpen={!!revokeTarget}
        onClose={() => setRevokeTarget(null)}
        onConfirm={handleRevokeConfirm}
        title={t('tokens.revoke.confirmTitle')}
        message={
          revokeTarget?.kind === 'authorizations'
            ? t('tokens.revoke.confirmMessageAuthorization')
            : t('tokens.revoke.confirmMessageToken')
        }
        confirmText={t('tokens.revoke.confirmButton')}
        cancelText={t('tokens.revoke.cancelButton')}
        variant="danger"
        isLoading={revokePending}
      />
    </div>
  );
};

export default OAuthTokenListPage;
