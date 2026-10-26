import { useEffect, useState } from 'react';
import clsx from 'clsx';
import { useTranslation } from 'react-i18next';
import Badge, { type BadgeTone } from '@shared/components/Badge';
import Button from '@shared/components/Button';
import ConfirmDialog from '@shared/components/ConfirmDialog';
import CountTabs from '@shared/components/CountTabs';
import DataErrorState from '@shared/components/DataErrorState';
import Icon from '@shared/components/Icon';
import Input from '@shared/components/Input';
import NativeSelect from '@shared/components/inputs/NativeSelect';
import Pagination from '@shared/components/Pagination';
import { TableRowSkeleton } from '@shared/components/Skeleton';
import { formatShortDateTime } from '@shared/utils/dateUtils';
import { useGetAllClients } from '../api/oauthClients';
import {
  useGetAuthorizations,
  useGetTokens,
  useRevokeAuthorization,
  useRevokeToken,
} from '../api/oauthTokens';
import Tag from '../components/Tag';
import { describeExpiry } from '../utils/expiry';

const PAGE_SIZE = 20;
const STATUSES = ['valid', 'revoked', 'redeemed', 'inactive'] as const;
type Status = (typeof STATUSES)[number];
type Tab = 'authorizations' | 'tokens';

const STATUS_TONE: Record<Status, BadgeTone> = {
  valid: 'green',
  revoked: 'red',
  redeemed: 'gray',
  inactive: 'gray',
};

const thClass =
  'px-4 py-2.5 text-left text-xs font-semibold whitespace-nowrap text-(--palette-gray-600)';

const isStatus = (value: string | null): value is Status => STATUSES.some(s => s === value);

const OAuthTokenListPage = () => {
  const { t, i18n } = useTranslation('oauthAdmin');

  const [tab, setTab] = useState<Tab>('authorizations');
  const [clientId, setClientId] = useState('');
  const [subjectInput, setSubjectInput] = useState('');
  // '' = all statuses. Starts on "valid": the rows an admin can still act on.
  const [status, setStatus] = useState<Status | ''>('valid');
  const [pageIndex, setPageIndex] = useState(0);
  const [debouncedSubject, setDebouncedSubject] = useState('');
  const [revokeTarget, setRevokeTarget] = useState<{ id: string; kind: Tab } | null>(null);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSubject(subjectInput.trim());
      setPageIndex(0);
    }, 400);
    return () => clearTimeout(timer);
  }, [subjectInput]);

  const params = {
    clientId: clientId || undefined,
    subject: debouncedSubject || undefined,
    status: status || undefined,
    pageNumber: pageIndex + 1,
    pageSize: PAGE_SIZE,
  };

  // Only the active tab's query fires — the inactive one is disabled so it issues no request.
  const authorizationsQuery = useGetAuthorizations(params, tab === 'authorizations');
  const tokensQuery = useGetTokens(params, tab === 'tokens');
  const clientsQuery = useGetAllClients();

  const revokeAuthorization = useRevokeAuthorization();
  const revokeToken = useRevokeToken();
  const revokePending = revokeAuthorization.isPending || revokeToken.isPending;

  const clients = clientsQuery.data?.items ?? [];
  const clientName = (id: string | null) =>
    clients.find(c => c.clientId === id)?.displayName ?? id ?? '—';

  const isAuthorizations = tab === 'authorizations';
  const active = isAuthorizations ? authorizationsQuery : tokensQuery;
  const items =
    (isAuthorizations ? authorizationsQuery.data?.items : tokensQuery.data?.items) ?? [];
  const totalCount = active.data?.count ?? 0;
  const columnCount = 7;
  const now = Date.now();

  // The API counts only the tab it was asked about, so only that tab shows a number.
  const tabs = [
    {
      value: 'authorizations',
      label: t('tokens.tabs.authorizations'),
      count: isAuthorizations && active.data ? totalCount : undefined,
    },
    {
      value: 'tokens',
      label: t('tokens.tabs.tokens'),
      count: !isAuthorizations && active.data ? totalCount : undefined,
    },
  ] as const;

  const selectTab = (next: Tab) => {
    setTab(next);
    setPageIndex(0);
  };

  const handleRevokeConfirm = () => {
    if (!revokeTarget) return;
    const mutation = revokeTarget.kind === 'authorizations' ? revokeAuthorization : revokeToken;
    mutation.mutate(revokeTarget.id, { onSettled: () => setRevokeTarget(null) });
  };

  const statusChips: { value: Status | ''; label: string }[] = [
    { value: '', label: t('tokens.filters.allStatuses') },
    ...STATUSES.map(s => ({ value: s, label: t(`tokens.status.${s}` as const) })),
  ];

  return (
    <div className="flex flex-col gap-3">
      <div>
        <h2 className="text-base font-semibold text-(--palette-ink)">{t('tokens.page.title')}</h2>
        <p className="mt-0.5 text-xs text-(--palette-gray-500)">{t('tokens.page.subtitle')}</p>
      </div>

      <div className="overflow-hidden rounded-lg border border-(--palette-line) bg-(--palette-surface)">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-2 border-b border-(--palette-line-soft) px-4 py-2.5">
          <CountTabs tabs={tabs} value={tab} onChange={selectTab} label={t('tokens.tabs.label')} />
          <div className="ml-auto flex flex-wrap items-center gap-3">
            <NativeSelect
              value={clientId}
              onChange={e => {
                setClientId(e.target.value);
                setPageIndex(0);
              }}
              aria-label={t('tokens.filters.client')}
              className="w-48"
            >
              <option value="">{t('tokens.filters.allClients')}</option>
              {clients.map(c => (
                <option key={c.id} value={c.clientId}>
                  {c.displayName}
                </option>
              ))}
            </NativeSelect>
            <div className="w-60">
              <Input
                type="text"
                value={subjectInput}
                onChange={e => setSubjectInput(e.target.value)}
                placeholder={t('tokens.filters.subjectPlaceholder')}
                aria-label={t('tokens.filters.subjectPlaceholder')}
                leftIcon={<Icon name="magnifying-glass" style="regular" className="text-sm" />}
              />
            </div>
          </div>
        </div>

        <div
          role="group"
          aria-label={t('tokens.filters.status')}
          className="flex flex-wrap items-center gap-1.5 border-b border-(--palette-line-soft) px-4 py-2"
        >
          <span className="mr-1 text-xs text-(--palette-gray-500)">
            {t('tokens.filters.status')}
          </span>
          {statusChips.map(chip => {
            const selected = status === chip.value;
            return (
              <button
                key={chip.value || 'all'}
                type="button"
                aria-pressed={selected}
                onClick={() => {
                  setStatus(chip.value);
                  setPageIndex(0);
                }}
                className={clsx(
                  'rounded-full border px-3 py-1 text-sm leading-normal whitespace-nowrap transition-colors',
                  selected
                    ? 'border-primary-700 bg-primary-700 font-medium text-white hover:bg-primary-800'
                    : 'border-(--palette-input-edge) bg-(--form-input-bg) text-(--palette-ink) hover:border-(--palette-input-edge-hover)',
                )}
              >
                {chip.label}
              </button>
            );
          })}
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[60rem] text-table">
            <thead className="bg-(--palette-surface-2)">
              <tr className="border-b border-(--palette-line)">
                <th className={thClass}>{t('tokens.columns.subject')}</th>
                <th className={thClass}>{t('tokens.columns.client')}</th>
                <th className={thClass}>{t('tokens.columns.type')}</th>
                <th className={thClass}>{t('tokens.columns.status')}</th>
                <th className={thClass}>{t('tokens.columns.created')}</th>
                <th className={thClass}>
                  {isAuthorizations ? t('tokens.columns.scopes') : t('tokens.columns.expires')}
                </th>
                <th className="w-28 px-4 py-2.5">
                  <span className="sr-only">{t('tokens.columns.actions')}</span>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-(--palette-line-soft)">
              {active.isLoading ? (
                <TableRowSkeleton
                  columns={[
                    { width: 'w-32' },
                    { width: 'w-20' },
                    { width: 'w-24' },
                    { width: 'w-20' },
                    { width: 'w-24' },
                    { width: 'w-28' },
                    { width: 'w-16' },
                  ]}
                  rows={5}
                />
              ) : active.isError ? (
                <tr>
                  <td colSpan={columnCount} className="py-4">
                    <DataErrorState
                      variant="inline"
                      title={t('tokens.loadFailed')}
                      onRetry={active.refetch}
                    />
                  </td>
                </tr>
              ) : items.length === 0 ? (
                <tr>
                  <td
                    colSpan={columnCount}
                    className="py-12 text-center text-sm text-(--palette-gray-400)"
                  >
                    <Icon
                      name="ticket"
                      style="regular"
                      className="mx-auto mb-2 text-3xl opacity-40"
                    />
                    <p>
                      {isAuthorizations ? t('tokens.emptyAuthorizations') : t('tokens.emptyTokens')}
                    </p>
                  </td>
                </tr>
              ) : (
                items.map(item => {
                  const expiry =
                    'expirationDate' in item && item.expirationDate
                      ? describeExpiry(item.expirationDate, now)
                      : null;
                  return (
                    <tr key={item.id} className="align-top even:bg-(--palette-surface-2)/50">
                      <td className="max-w-64 px-4 py-2.5">
                        <div
                          className="truncate font-mono text-xs text-(--palette-ink)"
                          title={item.subject ?? undefined}
                        >
                          {item.subject ?? '—'}
                        </div>
                      </td>
                      <td className="px-4 py-2.5 font-medium text-(--palette-ink)">
                        {clientName(item.clientId)}
                      </td>
                      <td className="px-4 py-2.5">
                        {item.type ? <Tag mono>{item.type}</Tag> : '—'}
                      </td>
                      <td className="px-4 py-2.5">
                        {isStatus(item.status) ? (
                          <Badge
                            tone={STATUS_TONE[item.status]}
                            size="sm"
                            className="whitespace-nowrap"
                          >
                            {t(`tokens.status.${item.status}` as const)}
                          </Badge>
                        ) : (
                          <Badge tone="gray" size="sm" className="whitespace-nowrap">
                            {item.status ?? '—'}
                          </Badge>
                        )}
                      </td>
                      <td className="px-4 py-2.5 whitespace-nowrap text-(--palette-ink) tabular-nums">
                        {formatShortDateTime(item.creationDate, i18n.language)}
                      </td>
                      <td className="px-4 py-2.5 tabular-nums">
                        {'scopes' in item ? (
                          <div className="flex flex-wrap gap-1">
                            {item.scopes.map(scope => (
                              <Tag key={scope} mono>
                                {scope}
                              </Tag>
                            ))}
                            {item.scopes.length === 0 && '—'}
                          </div>
                        ) : expiry ? (
                          <>
                            <div
                              className={clsx(
                                'whitespace-nowrap',
                                expiry.kind === 'expired'
                                  ? 'text-(--palette-gray-500)'
                                  : expiry.soon
                                    ? 'font-medium text-amber-700 dark:text-amber-300'
                                    : 'text-(--palette-ink)',
                              )}
                            >
                              {expiry.kind === 'expired'
                                ? t('tokens.expiry.expired')
                                : t(`tokens.expiry.${expiry.unit}` as const, { n: expiry.n })}
                            </div>
                            <div className="text-xs whitespace-nowrap text-(--palette-gray-500)">
                              {formatShortDateTime(
                                'expirationDate' in item ? item.expirationDate : null,
                                i18n.language,
                              )}
                            </div>
                          </>
                        ) : (
                          '—'
                        )}
                      </td>
                      <td className="px-4 py-1.5 text-right">
                        {item.status === 'valid' && (
                          <Button
                            variant="dangerOutline"
                            size="xs"
                            onClick={() => setRevokeTarget({ id: item.id, kind: tab })}
                          >
                            {t('tokens.actions.revoke')}
                          </Button>
                        )}
                      </td>
                    </tr>
                  );
                })
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
