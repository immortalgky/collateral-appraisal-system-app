import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import clsx from 'clsx';
import Icon from '@/shared/components/Icon';
import Pagination from '@/shared/components/Pagination';
import SectionHeader from '@shared/components/sections/SectionHeader';
import { TableRowSkeleton } from '@/shared/components/Skeleton';
import { formatLocaleDate } from '@/shared/utils/dateUtils';
import { useDebounce } from '@/shared/hooks/useDebounce';
import toast from 'react-hot-toast';
import { DUE_SOON_DAYS, formatDay, parseDay } from '@/features/reappraisal/utils/due';
import { useBlockReappraisalDueList, useRestoreBlockReappraisal } from '../api/blockReappraisal';
import { BlockReappraisalFilterDialog } from '../components/BlockReappraisalFilterDialog';
import type {
  BlockReappraisalFilterValues,
  BlockReappraisalListParams,
  BlockReappraisalListStatus,
} from '../types';

function formatNumber(n?: number | null): string {
  if (n == null) return '-';
  return n.toLocaleString();
}

const TABS: readonly BlockReappraisalListStatus[] = ['Pending', 'Deleted'];

// Quick filters on the Pending tab. Each maps onto list parameters.
type QuickFilter = 'all' | 'overdue' | 'dueSoon';

const QUICK_FILTERS: readonly QuickFilter[] = ['all', 'overdue', 'dueSoon'];

const QUICK_PARAMS: Record<QuickFilter, Partial<BlockReappraisalFilterValues>> = {
  all: {},
  overdue: { remainingDayMin: undefined, remainingDayMax: -1 },
  dueSoon: { remainingDayMin: 0, remainingDayMax: DUE_SOON_DAYS },
};

const QUICK_DOT: Partial<Record<QuickFilter, string>> = {
  overdue: 'bg-red-600',
  dueSoon: 'bg-amber-500',
};

function conflicts(q: QuickFilter, v: BlockReappraisalFilterValues): boolean {
  return Object.keys(QUICK_PARAMS[q]).some(k => v[k as keyof BlockReappraisalFilterValues] != null);
}

// The list's view lives in the URL, so coming back from a detail page (or a reload) restores it:
// ?tab= &q= &quick= &page= (1-based) &size= &sort= &dir=, and each dialog filter under its own name.
// Every value is checked: a bad one is dropped rather than sent to the API.
const isDay = (v: string) => /^\d{4}-\d{2}-\d{2}$/.test(v) && !!parseDay(v);
const isDayCount = (v: string) => v.trim() !== '' && Number.isFinite(Number(v));
// The API's int range; the dialog's number box takes any size.
const MAX_DAYS = 999_999_999;
const FILTER_CHECKS: Record<keyof BlockReappraisalFilterValues, (v: string) => boolean> = {
  lastAppraisedDateFrom: isDay,
  lastAppraisedDateTo: isDay,
  remainingDayMin: isDayCount,
  remainingDayMax: isDayCount,
};
const SORT_FIELDS = new Set([
  'oldAppraisalNumber',
  'projectName',
  'projectSellingPrice',
  'remainingUnits',
  'lastAppraisedDate',
  'remainingDay',
]);
const PAGE_SIZES = [10, 20, 25, 50, 100];
const DEFAULT_PAGE_SIZE = 20;
const MAX_PAGE = 100_000;

function positiveInt(v: string | null, fallback: number, max = Infinity): number {
  const n = Number(v);
  return Number.isInteger(n) && n > 0 && n <= max ? n : fallback;
}

function readView(sp: URLSearchParams) {
  const tab = sp.get('tab')?.toLowerCase();
  const status = TABS.find(s => s.toLowerCase() === tab) ?? 'Pending';
  const filters: Record<string, string | number> = {};
  sp.forEach((v, k) => {
    // Own keys only: ?valueOf= or ?__proto__= must not reach Object.prototype.
    const check = Object.prototype.hasOwnProperty.call(FILTER_CHECKS, k)
      ? FILTER_CHECKS[k as keyof BlockReappraisalFilterValues]
      : undefined;
    if (!check?.(v)) return;
    filters[k] =
      check === isDayCount ? Math.max(-MAX_DAYS, Math.min(MAX_DAYS, Math.trunc(Number(v)))) : v;
  });
  const quick = sp.get('quick');
  const sort = sp.get('sort');
  const dir = sp.get('dir');
  const sortField = sort && SORT_FIELDS.has(sort) ? sort : null;
  return {
    status,
    pageNumber: positiveInt(sp.get('page'), 1, MAX_PAGE) - 1,
    pageSize: PAGE_SIZES.includes(Number(sp.get('size')))
      ? Number(sp.get('size'))
      : DEFAULT_PAGE_SIZE,
    filters: filters as BlockReappraisalFilterValues,
    search: (sp.get('q') ?? '').trim(),
    // A chip and a dialog filter on the same parameter: the filter wins, as when set in the page.
    quick:
      quick &&
      (QUICK_FILTERS as readonly string[]).includes(quick) &&
      !conflicts(quick as QuickFilter, filters as BlockReappraisalFilterValues)
        ? (quick as QuickFilter)
        : 'all',
    sortField,
    sortDirection: (sortField && dir === 'desc' ? 'desc' : 'asc') as 'asc' | 'desc',
  };
}

type ListView = ReturnType<typeof readView>;

/** The URL for a view: only what differs from the defaults. */
function writeView(v: ListView): URLSearchParams {
  const next = new URLSearchParams();
  if (v.status !== 'Pending') next.set('tab', v.status.toLowerCase());
  Object.entries(v.filters).forEach(([k, val]) => {
    if (val != null && val !== '') next.set(k, String(val));
  });
  if (v.search) next.set('q', v.search);
  if (v.quick !== 'all') next.set('quick', v.quick);
  if (v.pageNumber > 0) next.set('page', String(v.pageNumber + 1));
  if (v.pageSize !== DEFAULT_PAGE_SIZE) next.set('size', String(v.pageSize));
  if (v.sortField) {
    next.set('sort', v.sortField);
    next.set('dir', v.sortDirection);
  }
  return next;
}

// Clickable sort header — same caret style (sort / sort-up / sort-down) as the
// rest of the app's list tables.
const SortableTh = ({
  field,
  sortBy,
  sortDir,
  onSort,
  align = 'left',
  className = '',
  children,
}: {
  field: string;
  sortBy: string | null;
  sortDir: 'asc' | 'desc';
  onSort: (f: string) => void;
  align?: 'left' | 'center' | 'right';
  className?: string;
  children: ReactNode;
}) => {
  const isActive = sortBy === field;
  const alignCls =
    align === 'right' ? 'text-right' : align === 'center' ? 'text-center' : 'text-left';
  const flexAlign = align === 'center' ? 'justify-center' : align === 'right' ? 'justify-end' : '';
  return (
    <th
      onClick={() => onSort(field)}
      aria-sort={isActive ? (sortDir === 'asc' ? 'ascending' : 'descending') : undefined}
      className={clsx(
        'px-4 py-2.5 text-xs font-semibold text-(--palette-gray-600) whitespace-nowrap select-none cursor-pointer hover:bg-gray-100',
        alignCls,
        isActive && 'bg-primary/5',
        className,
      )}
    >
      <div className={clsx('flex items-center gap-1.5', flexAlign)}>
        <span>{children}</span>
        <Icon
          style="solid"
          name={isActive ? (sortDir === 'asc' ? 'sort-up' : 'sort-down') : 'sort'}
          className={clsx('size-3', isActive ? 'text-(--palette-primary-text)' : 'text-(--palette-gray-300)')}
        />
      </div>
    </th>
  );
};

function BlockReappraisalListPage() {
  const navigate = useNavigate();
  const { t, i18n } = useTranslation(['blockReappraisal', 'common']);
  const [searchParams, setSearchParams] = useSearchParams();
  const view = useMemo(() => readView(searchParams), [searchParams]);
  const { status, pageNumber, pageSize, quick, sortField, sortDirection, filters } = view;
  const pending = useRef<ListView | null>(null);
  const setView = (patch: Partial<ListView>) => {
    const next = { ...(pending.current ?? view), ...patch };
    const url = writeView(next);
    const committed = searchParams.toString();
    const target = pending.current ? writeView(pending.current).toString() : committed;
    if (url.toString() === target) return;
    pending.current = url.toString() === committed ? null : next;
    setSearchParams(url, { replace: true });
  };
  const [filterDialogOpen, setFilterDialogOpen] = useState(false);

  const [search, setSearch] = useState(view.search);
  const debouncedSearch = useDebounce(search.trim(), 350);
  useEffect(() => {
    if (debouncedSearch !== view.search) setView({ search: debouncedSearch, pageNumber: 0 });
  }, [debouncedSearch]);

  useEffect(() => {
    if (!pending.current) setSearch(view.search);
    pending.current = null;
  }, [searchParams]);

  const setStatus = (tab: BlockReappraisalListStatus) =>
    setView({ status: tab, sortField: null, sortDirection: 'asc', pageNumber: 0 });

  const isPending = status === 'Pending';
  const isNotRequired = status === 'Deleted';

  const queryParams: BlockReappraisalListParams = {
    ...filters,
    ...(isPending && !conflicts(quick, filters) ? QUICK_PARAMS[quick] : {}),
    search: view.search || undefined,
    status,
    pageNumber,
    pageSize,
    ...(sortField && { sortBy: sortField, sortDir: sortDirection }),
  };

  const toggleSort = (field: string) => {
    if (sortField !== field) {
      setView({ sortField: field, sortDirection: 'asc', pageNumber: 0 });
    } else if (sortDirection === 'asc') {
      setView({ sortDirection: 'desc', pageNumber: 0 });
    } else {
      setView({ sortField: null, sortDirection: 'asc', pageNumber: 0 });
    }
  };

  const { data, isLoading, isPlaceholderData, isError, error } =
    useBlockReappraisalDueList(queryParams);
  const restoreMutation = useRestoreBlockReappraisal();
  const restore = (collateralMasterId: string) =>
    restoreMutation.mutate(collateralMasterId, {
      onSuccess: () => toast.success(t('success.restore')),
      onError: () => toast.error(t('error.restoreFailed')),
    });

  const items = data?.items ?? [];
  const totalCount = data?.count ?? 0;
  const totalPages = Math.ceil(totalCount / pageSize);

  useEffect(() => {
    if (data && !isPlaceholderData && pageNumber > 0 && pageNumber >= Math.max(totalPages, 1)) {
      setView({ pageNumber: Math.max(totalPages - 1, 0) });
    }
  }, [data, isPlaceholderData, totalPages, pageNumber]);

  const showSkeleton = isLoading || isPlaceholderData;

  const activeFilterChips = Object.entries(filters).filter(([, v]) => v != null && v !== '') as [
    keyof BlockReappraisalFilterValues,
    string | number,
  ][];
  const isFiltered =
    activeFilterChips.length > 0 || !!view.search || (isPending && quick !== 'all');

  // Filter edits start from the latest write, which may not be in the URL yet.
  const currentFilters = () => (pending.current ?? view).filters;

  const removeFilter = (key: keyof BlockReappraisalFilterValues) => {
    const next = { ...currentFilters() };
    delete next[key];
    setView({ filters: next, pageNumber: 0 });
  };

  const clearAll = () => {
    setSearch('');
    setView({ filters: {}, search: '', quick: 'all', pageNumber: 0 });
  };

  const getChipLabel = (key: keyof BlockReappraisalFilterValues, value: string | number) =>
    key === 'lastAppraisedDateFrom' || key === 'lastAppraisedDateTo'
      ? formatDay(String(value))
      : String(value);

  if (isError) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-3">
        <div className="size-12 rounded-full bg-(--palette-req-wash) flex items-center justify-center">
          <Icon style="solid" name="triangle-exclamation" className="size-5 text-red-500" />
        </div>
        <div className="text-center">
          <p className="text-sm font-medium text-(--palette-ink)">{t('error.loadFailed')}</p>
          <p className="text-xs text-(--palette-gray-400) mt-0.5">{(error as Error)?.message}</p>
        </div>
      </div>
    );
  }

  const columnCount = isNotRequired ? 6 : 7;

  return (
    <div className="flex flex-col h-full min-h-0 min-w-0">
      {/* ── Page header: title left; search and filter (they apply to every tab) right ── */}
      <div className="shrink-0 mb-3 flex flex-wrap items-start justify-between gap-x-4 gap-y-2">
        <SectionHeader
          title={t('page.list.title')}
          subtitle={t('page.list.description')}
          icon="arrows-rotate"
          className="mb-0"
        />
        <div className="flex flex-wrap items-center gap-2">
          <label className="relative">
            <Icon
              style="regular"
              name="magnifying-glass"
              className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3 text-(--palette-gray-400) pointer-events-none"
            />
            <input
              id="block-reappraisal-search"
              type="search"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder={t('filter.placeholders.search')}
              aria-label={t('filter.placeholders.search')}
              className="w-64 max-w-full pl-7 pr-2.5 py-1.5 text-sm border border-(--palette-line) rounded-lg bg-(--palette-surface) focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
            />
          </label>
          <button
            type="button"
            onClick={() => setFilterDialogOpen(true)}
            className={clsx(
              'flex items-center gap-1.5 px-3 py-1.5 text-sm border rounded-lg transition-all',
              activeFilterChips.length > 0
                ? 'border-primary/30 bg-primary/5 text-(--palette-primary-text) hover:bg-primary/10'
                : 'border-(--palette-line) bg-(--palette-surface) text-(--palette-gray-600) hover:border-gray-300 hover:text-(--palette-ink)',
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

      {/* ── Tabs, then the Pending tab's quick filters; they wrap on a narrow screen ── */}
      <div className="shrink-0 mb-3 flex flex-wrap items-center gap-x-3 gap-y-2">
        <div
          className="inline-flex rounded-lg border border-gray-200 bg-gray-50 p-0.5"
          role="group"
        >
          {TABS.map(tab => (
            <button
              key={tab}
              type="button"
              aria-pressed={status === tab}
              onClick={() => setStatus(tab)}
              className={clsx(
                'inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-md transition-colors',
                status === tab
                  ? 'bg-white text-primary shadow-sm'
                  : 'text-gray-500 hover:text-gray-700',
              )}
            >
              {t(`tabs.${tab}`)}
            </button>
          ))}
        </div>
        {isPending && (
          <>
            <span className="h-5 w-px bg-gray-200" aria-hidden />
            <div className="flex flex-wrap items-center gap-1.5">
              {QUICK_FILTERS.map(q => (
                <button
                  key={q}
                  type="button"
                  aria-pressed={quick === q}
                  onClick={() => {
                    const next = { ...currentFilters() };
                    for (const k of Object.keys(QUICK_PARAMS[q]))
                      delete next[k as keyof BlockReappraisalFilterValues];
                    setView({ quick: q, filters: next, pageNumber: 0 });
                  }}
                  className={clsx(
                    'inline-flex items-center gap-1.5 px-2.5 py-1 text-xs rounded-full border transition-colors',
                    quick === q
                      ? 'border-primary bg-primary/5 text-primary'
                      : 'border-gray-200 bg-white text-gray-500 hover:border-gray-300',
                  )}
                >
                  {QUICK_DOT[q] && <span className={clsx('size-1.5 rounded-full', QUICK_DOT[q])} />}
                  {t(`quick.${q}`)}
                </button>
              ))}
            </div>
          </>
        )}
      </div>

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
                type="button"
                onClick={() => removeFilter(key)}
                className="hover:text-primary/60 ml-0.5"
                aria-label={t('common:actions.clear')}
              >
                <Icon style="solid" name="xmark" className="size-2.5" />
              </button>
            </span>
          ))}
          <button
            type="button"
            onClick={() => setView({ filters: {}, pageNumber: 0 })}
            className="text-xs text-gray-400 hover:text-gray-600 hover:underline underline-offset-2"
          >
            {t('common:actions.clearAll')}
          </button>
        </div>
      )}

      <BlockReappraisalFilterDialog
        open={filterDialogOpen}
        initialValues={filters}
        onApply={v =>
          setView({ filters: v, quick: conflicts(quick, v) ? 'all' : quick, pageNumber: 0 })
        }
        onClose={() => setFilterDialogOpen(false)}
      />

      {/* ── Table ── */}
      <div className="flex-1 min-h-0 min-w-0 bg-(--palette-surface) rounded-lg border border-(--palette-line) shadow-sm overflow-hidden flex flex-col">
        <div className="flex-1 min-h-0 overflow-auto">
          <table className="w-full text-table">
            <thead className="sticky top-0 z-10">
              <tr className="bg-(--palette-surface-2) border-b border-(--palette-line)">
                <SortableTh
                  field="oldAppraisalNumber"
                  sortBy={sortField}
                  sortDir={sortDirection}
                  onSort={toggleSort}
                >
                  {t('columns.oldAppraisalNumber')}
                </SortableTh>
                <SortableTh
                  field="projectName"
                  sortBy={sortField}
                  sortDir={sortDirection}
                  onSort={toggleSort}
                  className="w-full"
                >
                  {t('columns.projectName')}
                </SortableTh>
                <SortableTh
                  field="projectSellingPrice"
                  sortBy={sortField}
                  sortDir={sortDirection}
                  onSort={toggleSort}
                  align="right"
                >
                  {t('columns.projectSellingPrice')}
                </SortableTh>
                <SortableTh
                  field="remainingUnits"
                  sortBy={sortField}
                  sortDir={sortDirection}
                  onSort={toggleSort}
                  align="center"
                >
                  {t('columns.remainingTotalUnit')}
                </SortableTh>
                <SortableTh
                  field="lastAppraisedDate"
                  sortBy={sortField}
                  sortDir={sortDirection}
                  onSort={toggleSort}
                  align="center"
                >
                  {t('columns.lastAppraisedDate')}
                </SortableTh>
                {!isNotRequired && (
                  <SortableTh
                    field="remainingDay"
                    sortBy={sortField}
                    sortDir={sortDirection}
                    onSort={toggleSort}
                    align="center"
                  >
                    {t('columns.remainingDay')}
                  </SortableTh>
                )}
                <th className="px-4 py-2.5 w-8" />
              </tr>
            </thead>
            <tbody className="divide-y divide-(--palette-line-soft)">
              {showSkeleton ? (
                <TableRowSkeleton
                  columns={Array(columnCount - 1).fill({ width: 'w-24' })}
                  rows={8}
                />
              ) : items.length === 0 ? (
                <tr>
                  <td colSpan={columnCount} className="py-24">
                    <div className="flex flex-col items-center gap-4">
                      <div className="size-16 rounded-2xl bg-(--palette-surface-2) border border-(--palette-line-soft) flex items-center justify-center">
                        <Icon
                          style="regular"
                          name="inbox"
                          className="size-7 text-(--palette-gray-300)"
                        />
                      </div>
                      <div className="text-center">
                        <p className="text-sm font-semibold text-(--palette-ink)">
                          {isFiltered ? t('empty.noMatching') : t(`empty.tab.${status}`)}
                        </p>
                        <p className="text-xs text-(--palette-gray-400) mt-1">
                          {isFiltered ? t('empty.tryAdjusting') : t(`empty.tabHint.${status}`)}
                        </p>
                      </div>
                      {isFiltered && (
                        <button
                          type="button"
                          onClick={clearAll}
                          className="text-xs text-(--palette-primary-text) hover:underline font-medium"
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
                    key={item.collateralMasterId}
                    tabIndex={0}
                    onClick={() =>
                      navigate(`/standalone/block-reappraisal/${item.collateralMasterId}`, {
                        state: { fromList: true },
                      })
                    }
                    onKeyDown={e => {
                      if (e.key === 'Enter')
                        navigate(`/standalone/block-reappraisal/${item.collateralMasterId}`, {
                          state: { fromList: true },
                        });
                    }}
                    className="group cursor-pointer transition-colors hover:bg-(--palette-surface-2)"
                  >
                    <td className="px-4 py-2.5 text-left text-(--palette-primary-text) font-medium whitespace-nowrap">
                      {item.oldAppraisalNumber ?? '-'}
                    </td>
                    <td className="px-4 py-2.5 text-(--palette-ink)">{item.projectName ?? '-'}</td>
                    <td className="px-4 py-2.5 text-(--palette-ink) tabular-nums text-right whitespace-nowrap">
                      {formatNumber(item.projectSellingPrice)}
                    </td>
                    <td className="px-4 py-2.5 text-(--palette-ink) tabular-nums text-center whitespace-nowrap">
                      {item.remainingUnits} / {item.totalUnits}
                    </td>
                    <td className="px-4 py-2.5 text-center text-(--palette-ink) whitespace-nowrap">
                      {formatLocaleDate(item.lastAppraisedDate, i18n.language)}
                    </td>
                    {!isNotRequired && (
                      <td className="px-4 py-2.5 text-center whitespace-nowrap tabular-nums">
                        {item.remainingDay < 0 ? (
                          <span className="text-(--palette-danger) font-medium">
                            {t('remainingDayBadge.overdue')}{' '}
                            {t('remainingDayBadge.daysLeft', {
                              days: Math.abs(item.remainingDay),
                            })}
                          </span>
                        ) : (
                          <span className="text-(--palette-ink)">{item.remainingDay}</span>
                        )}
                      </td>
                    )}
                    {isNotRequired ? (
                      <td className="px-4 py-2.5">
                        <button
                          type="button"
                          onClick={e => {
                            e.stopPropagation();
                            restore(item.collateralMasterId);
                          }}
                          onKeyDown={e => e.stopPropagation()}
                          disabled={restoreMutation.isPending}
                          className="px-3 py-1 text-xs font-medium border border-(--palette-line) rounded-lg bg-(--palette-surface) text-(--palette-ink) hover:border-primary/40 hover:text-(--palette-primary-text) whitespace-nowrap disabled:opacity-50"
                        >
                          {t('actions.restore')}
                        </button>
                      </td>
                    ) : (
                      <td className="px-4 py-2.5 w-8">
                        <Icon
                          style="solid"
                          name="chevron-right"
                          className="size-3 text-(--palette-gray-300) group-hover:text-(--palette-primary-text) transition-colors"
                        />
                      </td>
                    )}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <Pagination
          pageSizeOptions={PAGE_SIZES}
          currentPage={pageNumber}
          totalPages={totalPages}
          totalCount={totalCount}
          pageSize={pageSize}
          onPageChange={p => setView({ pageNumber: p })}
          onPageSizeChange={size => setView({ pageSize: size, pageNumber: 0 })}
        />
      </div>
    </div>
  );
}

export default BlockReappraisalListPage;
