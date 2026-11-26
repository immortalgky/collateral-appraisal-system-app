import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import clsx from 'clsx';
import Icon from '@/shared/components/Icon';
import Input from '@/shared/components/Input';
import Button from '@/shared/components/Button';
import Badge from '@/shared/components/Badge';
import Pagination from '@/shared/components/Pagination';
import SlideOverPanel from '@/shared/components/SlideOverPanel';
import { TableRowSkeleton } from '@/shared/components/Skeleton';
import { formatNumber } from '@/shared/utils/formatUtils';
import { formatLocaleDate } from '@/shared/utils/dateUtils';
import { useDebounce } from '@/shared/hooks/useDebounce';
import { useAppraisalTypeLabel } from '@/shared/hooks/useCodeLabels';
import { useAppraisalSuspensions } from '../api/appraisalSuspension';
import SuspensionActionDialog from '../components/SuspensionActionDialog';
import SuspensionHistoryPanel from '../components/SuspensionHistoryPanel';
import SuspensionSwitch from '../components/SuspensionSwitch';
import type { AppraisalSuspensionRow, SuspensionFilter } from '../types';

const FILTERS: readonly SuspensionFilter[] = ['All', 'Active', 'Suspended'];

const COLUMNS = [
  ['appraisalNumber', 'text-left'],
  ['customerName', 'text-left'],
  ['appraisalType', 'text-left'],
  ['appraisedValue', 'text-right'],
  ['completedAt', 'text-left'],
  ['status', 'text-center'],
  ['actions', 'text-center sticky right-0 z-20 bg-(--palette-surface-2)'],
] as const;

/** Completed appraisals; search and filter combine. Without a search, only "Suspended" lists rows. */
function AppraisalSuspensionPage() {
  const { t, i18n } = useTranslation('appraisalSuspension');
  const appraisalTypeLabel = useAppraisalTypeLabel();

  const [searched, setSearched] = useState('');
  const [statusFilter, setStatusFilter] = useState<SuspensionFilter>('All');
  const [pageNumber, setPageNumber] = useState(0);
  const [pageSize, setPageSize] = useState(20);
  const [actionRow, setActionRow] = useState<AppraisalSuspensionRow | null>(null);
  // Kept after closing so the title does not go blank while the panel slides out.
  const [historyRow, setHistoryRow] = useState<AppraisalSuspensionRow | null>(null);
  const [historyOpen, setHistoryOpen] = useState(false);

  const debouncedSearch = useDebounce(searched, 300).trim();

  const { data, isLoading, isFetching, isPlaceholderData } = useAppraisalSuspensions({
    appraisalNumber: debouncedSearch || undefined,
    status: statusFilter,
    pageNumber,
    pageSize,
  });

  // Same rule as the query's `enabled`, applied to the debounced value so "not found" never flashes while typing.
  const hasQuery = !!debouncedSearch || statusFilter === 'Suspended';
  const items = hasQuery ? (data?.items ?? []) : [];
  const totalCount = hasQuery ? (data?.count ?? 0) : 0;
  const totalPages = Math.ceil(totalCount / pageSize);
  const isFirstLoad = hasQuery && isLoading;

  // Acting on the last row of the last page can leave it empty, so step back a page.
  useEffect(() => {
    if (!isPlaceholderData && totalPages > 0 && pageNumber >= totalPages) {
      setPageNumber(totalPages - 1);
    }
  }, [isPlaceholderData, totalPages, pageNumber]);

  const changeSearch = (value: string) => {
    setSearched(value);
    setPageNumber(0);
  };

  return (
    <div className="flex flex-col h-full min-h-0 gap-3">
      <div className="shrink-0">
        <h3 className="text-base font-semibold text-(--palette-ink)">{t('page.title')}</h3>
        <p className="text-xs text-(--palette-gray-500) mt-0.5">{t('page.subtitle')}</p>
      </div>

      <div className="flex-1 min-h-0 bg-(--palette-surface) rounded-lg border border-(--palette-line) overflow-hidden flex flex-col">
        <div className="shrink-0 flex flex-wrap items-center gap-x-3 gap-y-2 border-b border-(--palette-line) px-4 py-2.5">
          <div className="shrink-0 w-80">
            <Input
              placeholder={t('page.searchPlaceholder')}
              value={searched}
              onChange={e => changeSearch(e.target.value)}
              leftIcon={<Icon style="solid" name="magnifying-glass" className="size-3.5" />}
              rightIcon={
                searched ? (
                  // The icon slot is pointer-events-none; the button opts back in.
                  <button
                    type="button"
                    onClick={() => changeSearch('')}
                    aria-label={t('page.clearSearch')}
                    title={t('page.clearSearch')}
                    className="pointer-events-auto cursor-pointer text-(--palette-gray-400) hover:text-(--palette-gray-600)"
                  >
                    <Icon style="solid" name="xmark" className="size-3.5" />
                  </button>
                ) : undefined
              }
            />
          </div>

          <div className="flex items-center gap-1.5">
            {FILTERS.map(s => (
              <button
                key={s}
                type="button"
                aria-pressed={statusFilter === s}
                onClick={() => {
                  setStatusFilter(s);
                  setPageNumber(0);
                }}
                className={clsx(
                  'cursor-pointer rounded-full border px-3 py-1 text-sm',
                  statusFilter === s
                    ? 'border-primary bg-primary/10 font-semibold text-(--palette-primary-text)'
                    : 'border-(--palette-line) bg-(--palette-surface) text-(--palette-gray-600) hover:border-(--palette-line-strong)',
                )}
              >
                {t(`page.filter.${s}`)}
              </button>
            ))}
          </div>

          {hasQuery && !isFirstLoad && (
            <span className="ml-auto text-xs text-(--palette-gray-500)">
              {t('page.resultCount', { count: totalCount })}
            </span>
          )}
        </div>

        <div className="flex-1 min-h-0 overflow-auto">
          <table className="w-full text-table">
            <thead className="bg-(--palette-surface-2) sticky top-0 z-10">
              <tr className="border-b border-(--palette-line)">
                {COLUMNS.map(([key, align]) => (
                  <th
                    key={key}
                    className={`px-4 py-2.5 text-xs font-semibold text-(--palette-gray-600) whitespace-nowrap ${align}`}
                  >
                    {t(`table.col.${key}`)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody
              className={`divide-y divide-(--palette-line-soft) ${isFetching && !isFirstLoad ? 'opacity-50' : ''}`}
            >
              {isFirstLoad ? (
                <TableRowSkeleton
                  columns={Array.from({ length: COLUMNS.length }, () => ({ width: 'w-20' }))}
                  rows={3}
                />
              ) : items.length === 0 ? (
                <tr>
                  <td colSpan={COLUMNS.length} className="text-center py-16">
                    <div className="flex flex-col items-center gap-2">
                      <Icon
                        style="regular"
                        name="folder-open"
                        className="size-10 text-(--palette-gray-300)"
                      />
                      {/* "Not found" only once there is a search; before that, ask for one. */}
                      <p className="text-(--palette-gray-500) font-medium">
                        {t(hasQuery ? 'table.empty' : 'table.prompt')}
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                items.map(row => (
                  // Opaque background: the sticky actions cell inherits it.
                  <tr
                    key={row.appraisalId}
                    className="bg-(--palette-surface) hover:bg-(--palette-surface-2)"
                  >
                    <td className="px-4 py-2.5 font-medium text-(--palette-primary-text) whitespace-nowrap">
                      {row.appraisalNumber}
                    </td>
                    <td
                      className="px-4 py-2.5 text-(--palette-ink) truncate max-w-[16rem]"
                      title={row.customerName ?? ''}
                    >
                      {row.customerName ?? '—'}
                    </td>
                    <td className="px-4 py-2.5 text-(--palette-ink) whitespace-nowrap">
                      {appraisalTypeLabel(row.appraisalType) ?? row.appraisalType}
                    </td>
                    <td className="px-4 py-2.5 text-right tabular-nums text-(--palette-ink)">
                      {row.appraisedValue != null ? formatNumber(row.appraisedValue, 2) : '—'}
                    </td>
                    <td className="px-4 py-2.5 text-(--palette-ink) whitespace-nowrap">
                      {formatLocaleDate(row.completedAt, i18n.language)}
                    </td>
                    <td className="px-4 py-2.5 text-center">
                      <Badge
                        size="sm"
                        tone={row.isSuspended ? 'red' : 'green'}
                        className="whitespace-nowrap"
                      >
                        {t(row.isSuspended ? 'table.suspended' : 'table.active')}
                      </Badge>
                    </td>
                    <td className="px-4 py-2.5 text-center sticky right-0 z-[1] bg-inherit">
                      <div className="inline-flex items-center gap-2">
                        <SuspensionSwitch
                          checked={row.isSuspended}
                          ariaLabel={t(row.isSuspended ? 'action.reactivate' : 'action.suspend')}
                          onChange={() => setActionRow(row)}
                        />
                        <Button
                          variant="ghost"
                          size="sm"
                          className="cursor-pointer"
                          aria-label={t('history.open')}
                          title={t('history.open')}
                          onClick={() => {
                            setHistoryRow(row);
                            setHistoryOpen(true);
                          }}
                        >
                          <Icon name="clock-rotate-left" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {totalCount > 0 && (
          <div className="shrink-0 border-t border-(--palette-line)">
            <Pagination
              currentPage={pageNumber}
              totalPages={totalPages}
              totalCount={totalCount}
              pageSize={pageSize}
              onPageChange={setPageNumber}
              onPageSizeChange={size => {
                setPageSize(size);
                setPageNumber(0);
              }}
            />
          </div>
        )}
      </div>

      <SuspensionActionDialog
        key={actionRow?.appraisalId}
        row={actionRow}
        onClose={() => setActionRow(null)}
      />

      <SlideOverPanel
        isOpen={historyOpen}
        onClose={() => setHistoryOpen(false)}
        title={t('history.title', { number: historyRow?.appraisalNumber ?? '' })}
        width="md"
      >
        <SuspensionHistoryPanel row={historyRow} />
      </SlideOverPanel>
    </div>
  );
}

export default AppraisalSuspensionPage;
