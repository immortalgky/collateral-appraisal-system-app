import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import clsx from 'clsx';
import Icon from '@/shared/components/Icon';
import Pagination from '@/shared/components/Pagination';
import SectionHeader from '@shared/components/sections/SectionHeader';
import { TableRowSkeleton } from '@/shared/components/Skeleton';
import { useDebounce } from '@shared/hooks/useDebounce';
import { useReappraisalCandidates, useRestoreReappraisalCandidate } from '../api/reappraisal';
import { PriorSourceBadge } from '../components/ReappraisalBadges';
import {
  DueCell,
  NewAppraisalCell,
  ProgressCell,
  ReviewTypeChip,
} from '../components/ReappraisalCells';
import { ReappraisalFilterDialog } from '../components/ReappraisalFilterDialog';
import { DUE_SOON_DAYS, formatDay } from '../utils/due';
import { unitLabel } from '../utils/unitLabel';
import type {
  ReappraisalCandidateListItem,
  ReappraisalCandidateListParams,
  ReappraisalFilterValues,
  ReappraisalListStatus,
  NewAppraisalState,
  ReviewTypeCode,
} from '../types';

// Quick filters on the Pending tab. Each maps onto list parameters.
type QuickFilter = 'all' | 'overdue' | 'dueSoon' | 'inProgress' | 'nonCas';

const QUICK_PARAMS: Record<QuickFilter, Partial<ReappraisalCandidateListParams>> = {
  all: {},
  overdue: { remainingDayTo: -1 },
  dueSoon: { remainingDayFrom: 0, remainingDayTo: DUE_SOON_DAYS },
  inProgress: { inProgress: true },
  nonCas: { priorSource: 'NonCAS' },
};

/** A quick filter and the dialog can set the same parameter (due range, prior source). The one set
 *  last wins and the other is cleared, so the chips, the dialog's result count and the list agree. */
function conflicts(q: QuickFilter, v: ReappraisalFilterValues): boolean {
  return Object.keys(QUICK_PARAMS[q]).some(k => v[k as keyof ReappraisalFilterValues] != null);
}

const QUICK_DOT: Partial<Record<QuickFilter, string>> = {
  overdue: 'bg-red-600',
  dueSoon: 'bg-amber-500',
  inProgress: 'bg-sky-400',
};

// Quick filters on the processed tab: the state of the reappraisal each book produced.
type ProcessedQuick = 'all' | NewAppraisalState;
const PROCESSED_QUICK: ProcessedQuick[] = [
  'all',
  'Appraising',
  'Completed',
  'Cancelled',
  'NotFound',
];
const PROCESSED_DOT: Partial<Record<ProcessedQuick, string>> = {
  Appraising: 'bg-amber-500',
  Completed: 'bg-primary',
  Cancelled: 'bg-red-600',
};

// Each tab opens on its natural order: due date (closest first) for the to-do tabs, the latest
// submission for the processed history.
const DEFAULT_SORT: Record<ReappraisalListStatus, { field: string; dir: 'asc' | 'desc' }> = {
  Pending: { field: 'RemainingDay', dir: 'asc' },
  Deleted: { field: 'RemainingDay', dir: 'asc' },
  Consumed: { field: 'NewAppraisalSubmittedAt', dir: 'desc' },
};

const TH = 'px-3 py-2.5 text-left font-medium text-gray-600 whitespace-nowrap';
// Columns shrink to their content; only the customer column grows into the free width.
const SHRINK = 'w-px';

// ─── Component ────────────────────────────────────────────────────────────────

function ReappraisalListPage() {
  const navigate = useNavigate();
  const { t, i18n } = useTranslation(['reappraisal', 'common']);

  const [pageNumber, setPageNumber] = useState(0);
  const [pageSize, setPageSize] = useState(20);
  const [filterDialogOpen, setFilterDialogOpen] = useState(false);
  const [filters, setFilters] = useState<ReappraisalFilterValues>({});
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounce(search.trim(), 350);
  const [quick, setQuick] = useState<QuickFilter>('all');
  const [processedQuick, setProcessedQuick] = useState<ProcessedQuick>('all');
  // Tabs: the to-do list and books marked "not reviewing this round" (both only books on AS400's
  // latest file), and processed books — the whole history.
  const [status, setStatus] = useState<ReappraisalListStatus>('Pending');
  const restoreMutation = useRestoreReappraisalCandidate();

  // Sort — sortField carries the whitelisted PascalCase view column name. Opens on the due date
  // (closest first) so the column shows it; cleared, the API falls back to the same order.
  const [sortField, setSortField] = useState<string | null>('RemainingDay');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

  const isPending = status === 'Pending';
  const isProcessed = status === 'Consumed';
  // One builder for the list and the filter dialog's result count.
  const paramsFor = (v: ReappraisalFilterValues): ReappraisalCandidateListParams => ({
    ...v,
    ...(isPending && !conflicts(quick, v) ? QUICK_PARAMS[quick] : {}),
    ...(isProcessed && processedQuick !== 'all' ? { newAppraisalState: processedQuick } : {}),
    search: debouncedSearch || undefined,
    status,
  });
  const queryParams: ReappraisalCandidateListParams = {
    ...paramsFor(filters),
    pageNumber,
    pageSize,
    sortBy: sortField ?? undefined,
    sortDir: sortDirection,
    status,
  };

  // Three-state cycle: unsorted -> asc -> desc -> unsorted
  const handleSort = (field: string) => {
    if (sortField === field) {
      if (sortDirection === 'asc') {
        setSortDirection('desc');
      } else {
        setSortField(null);
        setSortDirection('asc');
      }
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
    setPageNumber(0);
  };

  const { data, isLoading, isPlaceholderData, isError, error } =
    useReappraisalCandidates(queryParams);

  const items = data?.items ?? [];
  const totalCount = data?.count ?? 0;
  const totalPages = Math.ceil(totalCount / pageSize);

  // Skeleton on the first load and whenever the tab, filters, search, sort or page change (the old
  // rows are only a placeholder then). A background refresh of the same view keeps the rows.
  const showSkeleton = isLoading || isPlaceholderData;

  // The processed tab has no due date: the API ignores the due range there, so it is not shown as active.
  const activeFilterChips = Object.entries(filters).filter(
    ([k, v]) => v != null && v !== '' && !(isProcessed && k.startsWith('remainingDay')),
  ) as [keyof ReappraisalFilterValues, string | number][];
  const isFiltered =
    activeFilterChips.length > 0 ||
    !!debouncedSearch ||
    (isPending && quick !== 'all') ||
    (isProcessed && processedQuick !== 'all');

  const removeFilter = (key: keyof ReappraisalFilterValues) => {
    setFilters(prev => {
      const next = { ...prev };
      delete next[key];
      return next;
    });
    setPageNumber(0);
  };

  const clearAll = () => {
    setFilters({});
    setSearch('');
    setQuick('all');
    setProcessedQuick('all');
    setPageNumber(0);
  };

  const getChipLabel = (key: keyof ReappraisalFilterValues, value: string | number): string => {
    if (key === 'reviewType') {
      return t(`reviewType.${value as ReviewTypeCode}`, { defaultValue: String(value) });
    }
    if (key === 'priorSource')
      return t(`filter.priorSource.${value}`, { defaultValue: String(value) });
    return String(value);
  };

  const restore = (item: ReappraisalCandidateListItem) =>
    restoreMutation.mutate(item.id, {
      // Restoring the last row of a later page would leave an empty page.
      onSuccess: () => {
        if (items.length === 1 && pageNumber > 0) setPageNumber(pageNumber - 1);
      },
    });

  if (isError) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-3">
        <div className="size-12 rounded-full bg-red-50 flex items-center justify-center">
          <Icon style="solid" name="triangle-exclamation" className="size-5 text-red-500" />
        </div>
        <div className="text-center">
          <p className="text-sm font-medium text-gray-800">{t('error.loadFailed')}</p>
          <p className="text-xs text-gray-400 mt-0.5">{(error as Error)?.message}</p>
        </div>
      </div>
    );
  }

  const SortHeader = ({ field, label, grow }: { field: string; label: string; grow?: boolean }) => {
    const active = sortField === field;
    return (
      <th
        onClick={() => handleSort(field)}
        aria-sort={active ? (sortDirection === 'asc' ? 'ascending' : 'descending') : undefined}
        className={clsx(
          TH,
          !grow && SHRINK,
          'cursor-pointer hover:bg-gray-100 select-none',
          active && 'bg-primary/5',
        )}
      >
        <div className="flex items-center gap-1.5">
          {label}
          {active ? (
            <Icon
              style="solid"
              name={sortDirection === 'asc' ? 'sort-up' : 'sort-down'}
              className="size-3 text-primary"
            />
          ) : (
            <Icon style="solid" name="sort" className="size-3 text-gray-300" />
          )}
        </div>
      </th>
    );
  };

  const columnCount = isPending || isProcessed ? 8 : 6;

  return (
    <div className="flex flex-col h-full min-h-0 min-w-0">
      {/* ── Page header: title left; tabs, search and filter right ── */}
      <div className="shrink-0 mb-3 flex flex-wrap items-start justify-between gap-x-4 gap-y-2">
        <SectionHeader
          title={t('page.list.title')}
          subtitle={t('page.list.description')}
          icon="arrows-rotate"
          className="mb-0"
        />
        <div className="flex flex-wrap items-center gap-2">
          <div
            className="inline-flex rounded-lg border border-gray-200 bg-gray-50 p-0.5"
            role="group"
          >
            {(['Pending', 'Deleted', 'Consumed'] as const).map(tab => {
              return (
                <button
                  key={tab}
                  type="button"
                  aria-pressed={status === tab}
                  onClick={() => {
                    setStatus(tab);
                    setSortField(DEFAULT_SORT[tab].field);
                    setSortDirection(DEFAULT_SORT[tab].dir);
                    setPageNumber(0);
                  }}
                  className={clsx(
                    'inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-md transition-colors',
                    status === tab
                      ? 'bg-white text-gray-900 shadow-sm'
                      : 'text-gray-500 hover:text-gray-700',
                  )}
                >
                  {t(`tabs.${tab}`)}
                </button>
              );
            })}
          </div>

          <label className="relative">
            <Icon
              style="regular"
              name="magnifying-glass"
              className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3 text-gray-400 pointer-events-none"
            />
            <input
              id="reappraisal-search"
              type="search"
              value={search}
              onChange={e => {
                setSearch(e.target.value);
                setPageNumber(0);
              }}
              placeholder={t('search.placeholder')}
              aria-label={t('search.placeholder')}
              className="w-64 max-w-full pl-7 pr-2.5 py-1.5 text-sm border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
            />
          </label>

          <button
            type="button"
            onClick={() => setFilterDialogOpen(true)}
            className={clsx(
              'flex items-center gap-1.5 px-3 py-1.5 text-sm border rounded-lg transition-all',
              activeFilterChips.length > 0
                ? 'border-primary/30 bg-primary/5 text-primary hover:bg-primary/10'
                : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300 hover:text-gray-800',
            )}
          >
            <Icon style="solid" name="filter" className="size-3" />
            {t('filter.button')}
            {activeFilterChips.length > 0 && (
              <span className="inline-flex items-center justify-center size-4 rounded-full bg-primary text-white text-[10px] font-semibold">
                {activeFilterChips.length}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* ── Quick filters (Pending tab) ── */}
      {isPending && (
        <div className="shrink-0 mb-3 flex flex-wrap items-center gap-1.5">
          {(['all', 'overdue', 'dueSoon', 'inProgress', 'nonCas'] as const).map(q => {
            return (
              <button
                key={q}
                type="button"
                aria-pressed={quick === q}
                onClick={() => {
                  setQuick(q);
                  if (conflicts(q, filters)) {
                    setFilters(prev => {
                      const next = { ...prev };
                      for (const k of Object.keys(QUICK_PARAMS[q]))
                        delete next[k as keyof ReappraisalFilterValues];
                      return next;
                    });
                  }
                  setPageNumber(0);
                }}
                className={clsx(
                  'inline-flex items-center gap-1.5 px-2.5 py-1 text-[12px] rounded-full border transition-colors',
                  quick === q
                    ? 'border-primary bg-primary/5 text-primary'
                    : 'border-gray-200 bg-white text-gray-500 hover:border-gray-300',
                )}
              >
                {QUICK_DOT[q] && <span className={clsx('size-1.5 rounded-full', QUICK_DOT[q])} />}
                {t(`quick.${q}`)}
              </button>
            );
          })}
        </div>
      )}

      {/* ── Quick filters (processed tab) ── */}
      {isProcessed && (
        <div className="shrink-0 mb-3 flex flex-wrap items-center gap-1.5">
          {PROCESSED_QUICK.map(q => {
            return (
              <button
                key={q}
                type="button"
                aria-pressed={processedQuick === q}
                onClick={() => {
                  setProcessedQuick(q);
                  setPageNumber(0);
                }}
                className={clsx(
                  'inline-flex items-center gap-1.5 px-2.5 py-1 text-[12px] rounded-full border transition-colors',
                  processedQuick === q
                    ? 'border-primary bg-primary/5 text-primary'
                    : 'border-gray-200 bg-white text-gray-500 hover:border-gray-300',
                )}
              >
                {PROCESSED_DOT[q] && (
                  <span className={clsx('size-1.5 rounded-full', PROCESSED_DOT[q])} />
                )}
                {t(`processedQuick.${q}`)}
              </button>
            );
          })}
        </div>
      )}

      {/* ── Active filter chips ── */}
      {activeFilterChips.length > 0 && (
        <div className="shrink-0 flex items-center gap-1.5 flex-wrap mb-3">
          {activeFilterChips.map(([key, value]) => (
            <span
              key={key}
              className="inline-flex items-center gap-1.5 pl-2.5 pr-1.5 py-0.5 text-xs bg-primary/8 text-primary border border-primary/15 rounded-full font-medium"
            >
              <span className="text-primary/60">{t(`filter.chips.${key}`)}:</span>
              {getChipLabel(key, value)}
              <button
                onClick={() => removeFilter(key)}
                className="hover:text-primary/60 ml-0.5"
                aria-label={t('common:actions.clear')}
              >
                <Icon style="solid" name="xmark" className="size-2.5" />
              </button>
            </span>
          ))}
          <button
            onClick={() => {
              setFilters({});
              setPageNumber(0);
            }}
            className="text-xs text-gray-400 hover:text-gray-600 hover:underline underline-offset-2"
          >
            {t('common:actions.clearAll')}
          </button>
        </div>
      )}

      <ReappraisalFilterDialog
        open={filterDialogOpen}
        initialValues={filters}
        showDue={!isProcessed}
        onApply={v => {
          setFilters(v);
          if (conflicts(quick, v)) setQuick('all');
          setPageNumber(0);
        }}
        onClose={() => setFilterDialogOpen(false)}
      />

      {/* ── Table ── */}
      <div className="flex-1 min-h-0 min-w-0 bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden flex flex-col">
        <div className="flex-1 min-h-0 overflow-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 sticky top-0 z-10 shadow-[0_1px_3px_rgba(0,0,0,0.05)]">
              <tr className="border-b border-gray-200">
                <SortHeader
                  field="OldAppraisalReportNumber"
                  label={t('columns.bookAndCollateral')}
                />
                <SortHeader field="CustomerName" label={t('columns.customer')} grow />
                <SortHeader field="ReviewType" label={t('columns.reviewType')} />
                {isPending && (
                  <SortHeader field="AppraisalDate" label={t('columns.lastAppraisal')} />
                )}
                {!isProcessed && <SortHeader field="RemainingDay" label={t('columns.reviewDue')} />}
                {isProcessed ? (
                  <>
                    <th className={clsx(TH, SHRINK)}>{t('columns.newAppraisal')}</th>
                    <th className={clsx(TH, SHRINK)}>{t('columns.createdFrom')}</th>
                    <SortHeader field="NewAppraisalSubmittedAt" label={t('columns.submittedAt')} />
                    <SortHeader field="NewAppraisalCompletedAt" label={t('columns.completedAt')} />
                    <th className="w-8" />
                  </>
                ) : isPending ? (
                  <>
                    <th className={clsx(TH, SHRINK)}>{t('columns.progress')}</th>
                    <th className={clsx(TH, SHRINK)}>{t('columns.queuedSince')}</th>
                    <th className="w-8" />
                  </>
                ) : (
                  <>
                    <th className={clsx(TH, SHRINK)}>{t('columns.lastFileUpdate')}</th>
                    <th className="w-8" />
                  </>
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {showSkeleton ? (
                <TableRowSkeleton columns={Array(columnCount).fill({ width: 'w-24' })} rows={8} />
              ) : items.length === 0 ? (
                <tr>
                  <td colSpan={columnCount} className="py-24">
                    <div className="flex flex-col items-center gap-4">
                      <div className="size-16 rounded-2xl bg-gray-50 border border-gray-100 flex items-center justify-center">
                        <Icon style="regular" name="inbox" className="size-7 text-gray-300" />
                      </div>
                      <div className="text-center">
                        <p className="text-sm font-semibold text-gray-700">
                          {isFiltered
                            ? t('empty.noMatching')
                            : status === 'Deleted'
                              ? t('empty.noSkipped')
                              : isProcessed
                                ? t('empty.noProcessed')
                                : t('empty.noCandidates')}
                        </p>
                        <p className="text-xs text-gray-400 mt-1">
                          {isFiltered
                            ? t('empty.tryAdjusting')
                            : status === 'Deleted'
                              ? t('empty.noSkippedHint')
                              : isProcessed
                                ? t('empty.noProcessedHint')
                                : t('empty.noneAtThisTime')}
                        </p>
                      </div>
                      {isFiltered && (
                        <button
                          onClick={clearAll}
                          className="text-xs text-primary hover:underline font-medium"
                        >
                          {t('empty.clearFilters')}
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ) : (
                items.map(item => (
                  <tr
                    key={item.id}
                    onClick={() => navigate(`/reappraisal/${item.id}`)}
                    className={clsx(
                      'group cursor-pointer transition-colors hover:bg-gray-50',
                      item.hasOpenAppraisal && 'bg-gray-50/40',
                    )}
                  >
                    <td className="px-3 py-2">
                      <div className="flex flex-col gap-px min-w-0">
                        <span className="inline-flex items-center gap-1.5 font-medium text-primary whitespace-nowrap tabular-nums">
                          {item.oldAppraisalReportNumber}
                          <PriorSourceBadge source={item.priorAppraisalSource} />
                          {item.isBlockUnit && (
                            <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium border bg-teal-50 text-teal-700 border-teal-200 whitespace-nowrap">
                              {t('unit.tag')}
                            </span>
                          )}
                        </span>
                        {item.isBlockUnit ? (
                          item.unitMatchedUnits === 1 ? (
                            <span className="text-[11px] text-gray-500 truncate max-w-64">
                              {unitLabel(
                                {
                                  roomNumber: item.unitRoomNumber,
                                  floor: item.unitFloor,
                                  towerName: item.unitTowerName,
                                  houseNumber: item.unitHouseNumber,
                                  plotNumber: item.unitPlotNumber,
                                },
                                t,
                              )}
                            </span>
                          ) : (
                            <span className="text-[11px] text-amber-700 truncate max-w-64">
                              {t('unit.notFoundShort')}
                            </span>
                          )
                        ) : (
                          <span className="text-[11px] text-gray-500 truncate max-w-64">
                            {item.collateralName ?? '—'}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-3 py-2 w-full max-w-0 min-w-40">
                      <div className="flex flex-col gap-px min-w-0">
                        <span
                          className="font-medium text-gray-900 truncate"
                          title={item.customerName ?? undefined}
                        >
                          {item.customerName ?? '—'}
                        </span>
                        <span className="text-[11px] text-gray-500 tabular-nums">
                          CIF {item.cifNumber}
                        </span>
                      </div>
                    </td>
                    <td className="px-3 py-2">
                      <ReviewTypeChip code={item.reviewType} />
                    </td>
                    {isPending && (
                      <td className="px-3 py-2 text-gray-700 whitespace-nowrap tabular-nums">
                        {formatDay(item.appraisalDate)}
                      </td>
                    )}
                    {!isProcessed && (
                      <td className="px-3 py-2">
                        <DueCell appraisalDate={item.appraisalDate} />
                      </td>
                    )}
                    {isProcessed ? (
                      <>
                        <td className="px-3 py-2">
                          <NewAppraisalCell item={item} />
                        </td>
                        <td className="px-3 py-2 text-gray-500 whitespace-nowrap">
                          {item.newAppraisalId == null ? (
                            '—'
                          ) : item.newAppraisalGroupTag ? (
                            <>
                              {t('detail.banner.groupLabel')}{' '}
                              <span className="tabular-nums">{item.newAppraisalGroupTag}</span>
                            </>
                          ) : (
                            t('processed.createdByHand')
                          )}
                        </td>
                        <td className="px-3 py-2 text-gray-700 whitespace-nowrap tabular-nums">
                          {formatDay(item.newAppraisalSubmittedAt)}
                        </td>
                        <td className="px-3 py-2 text-gray-700 whitespace-nowrap tabular-nums">
                          {item.newAppraisalStatus === 'Completed'
                            ? formatDay(item.newAppraisalCompletedAt)
                            : '—'}
                        </td>
                        <td className="px-3 py-2 w-8">
                          <Icon
                            style="solid"
                            name="chevron-right"
                            className="size-3 text-gray-300 group-hover:text-primary transition-colors"
                          />
                        </td>
                      </>
                    ) : isPending ? (
                      <>
                        <td className="px-3 py-2">
                          <ProgressCell item={item} />
                        </td>
                        <td className="px-3 py-2 text-gray-400 whitespace-nowrap tabular-nums">
                          {formatMonthYear(item.firstSeenFileDate, i18n.language)}
                        </td>
                        <td className="px-3 py-2 w-8">
                          <Icon
                            style="solid"
                            name="chevron-right"
                            className="size-3 text-gray-300 group-hover:text-primary transition-colors"
                          />
                        </td>
                      </>
                    ) : (
                      <>
                        <td className="px-3 py-2 text-gray-500 whitespace-nowrap tabular-nums">
                          {formatDay(item.lastSeenFileDate)}
                        </td>
                        <td className="px-3 py-2">
                          <button
                            type="button"
                            onClick={e => {
                              e.stopPropagation();
                              restore(item);
                            }}
                            disabled={restoreMutation.isPending}
                            className="px-3 py-1 text-[12px] font-medium border border-gray-200 rounded-lg bg-white text-gray-700 hover:border-primary/40 hover:text-primary whitespace-nowrap disabled:opacity-50"
                          >
                            {t('actions.restore')}
                          </button>
                        </td>
                      </>
                    )}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <Pagination
          currentPage={pageNumber}
          totalPages={totalPages}
          totalCount={totalCount}
          pageSize={pageSize}
          onPageChange={p => {
            setPageNumber(p);
          }}
          onPageSizeChange={size => {
            setPageSize(size);
            setPageNumber(0);
          }}
        />
      </div>
    </div>
  );
}

/** "มิ.ย. 69" / "Jun 2026" — how long a book has been on AS400's list. */
function formatMonthYear(iso: string | undefined, language: string | undefined): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '—';
  return language?.startsWith('th')
    ? d.toLocaleDateString('th-TH', { month: 'short', year: '2-digit' })
    : d.toLocaleDateString('en-GB', { month: 'short', year: 'numeric' });
}

export default ReappraisalListPage;
