import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
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
import { DUE_SOON_DAYS, formatDay, parseDay } from '../utils/due';
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
  // Names the lower bound too, so a dialog lower bound is cleared rather than combined into an
  // impossible range.
  overdue: { remainingDayFrom: undefined, remainingDayTo: -1 },
  dueSoon: { remainingDayFrom: 0, remainingDayTo: DUE_SOON_DAYS },
  inProgress: { inProgress: true },
  nonCas: { priorSource: 'NonCAS' },
};

// The list's view lives in the URL, so coming back from a detail page (or a reload) restores it:
// ?tab= &q= &quick= &pq= &page= (1-based) &size= &sort= &dir=, and each dialog filter under its own name.
// Every value is checked: a bad one is dropped rather than sent to the API.
// A real calendar day (the dialog's DateInput sends ISO with a time; 2026-02-31 is not a day), and a
// day count the API's int takes (the dialog's number box allows decimals: they are truncated).
const isDay = (v: string) =>
  /^\d{4}-\d{2}-\d{2}(T\d{2}:\d{2}(:\d{2}(\.\d{1,7})?)?(Z|[+-]\d{2}:\d{2})?)?$/.test(v) &&
  !!parseDay(v);
const isDayCount = (v: string) => v.trim() !== '' && Number.isFinite(Number(v));
// The API's int range; the dialog's number box takes any size.
const MAX_DAYS = 999_999_999;
const FILTER_CHECKS: Record<keyof ReappraisalFilterValues, (v: string) => boolean> = {
  customerName: () => true,
  oldAppraisalReportNumber: () => true,
  cifNumber: () => true,
  collateralId: () => true,
  reviewType: v => ['1', '2', '3'].includes(v),
  reviewDateFrom: isDay,
  reviewDateTo: isDay,
  remainingDayFrom: isDayCount,
  remainingDayTo: isDayCount,
  priorSource: v => ['CAS', 'AS400Legacy', 'Unknown', 'NonCAS'].includes(v),
};
const SORT_FIELDS = new Set([
  'OldAppraisalReportNumber',
  'CustomerName',
  'ReviewType',
  'AppraisalDate',
  'RemainingDay',
  'NewAppraisalSubmittedAt',
  'NewAppraisalCompletedAt',
]);
// Pagination's own size choices: anything else shows an empty size box.
const PAGE_SIZES = [10, 25, 50, 100];
const DEFAULT_PAGE_SIZE = 25;
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
      ? FILTER_CHECKS[k as keyof ReappraisalFilterValues]
      : undefined;
    if (check?.(v))
      filters[k] =
        check === isDayCount ? Math.max(-MAX_DAYS, Math.min(MAX_DAYS, Math.trunc(Number(v)))) : v;
  });
  const quick = sp.get('quick');
  const pq = sp.get('pq') as ProcessedQuick | null;
  const sort = sp.get('sort');
  const dir = sp.get('dir');
  // Only a column the tab shows: the processed tab has no due date, the to-do tabs no new appraisal.
  const shown =
    sort != null &&
    SORT_FIELDS.has(sort) &&
    (status === 'Consumed'
      ? sort !== 'RemainingDay' && sort !== 'AppraisalDate'
      : !sort.startsWith('NewAppraisal') && (status === 'Pending' || sort !== 'AppraisalDate'));
  const sorted = sort === 'none' || shown;
  return {
    status,
    pageNumber: positiveInt(sp.get('page'), 1, MAX_PAGE) - 1,
    pageSize: PAGE_SIZES.includes(Number(sp.get('size')))
      ? Number(sp.get('size'))
      : DEFAULT_PAGE_SIZE,
    filters: filters as ReappraisalFilterValues,
    search: (sp.get('q') ?? '').trim(),
    // A chip and a dialog filter on the same parameter: the filter wins, as when set in the page.
    quick:
      quick &&
      Object.prototype.hasOwnProperty.call(QUICK_PARAMS, quick) &&
      !conflicts(quick as QuickFilter, filters as ReappraisalFilterValues)
        ? (quick as QuickFilter)
        : 'all',
    processedQuick: pq && PROCESSED_QUICK.includes(pq) ? pq : 'all',
    sortField: sorted ? (sort === 'none' ? null : sort) : DEFAULT_SORT[status].field,
    sortDirection: (sorted && (dir === 'asc' || dir === 'desc')
      ? dir
      : DEFAULT_SORT[status].dir) as 'asc' | 'desc',
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
  if (v.processedQuick !== 'all') next.set('pq', v.processedQuick);
  if (v.pageNumber > 0) next.set('page', String(v.pageNumber + 1));
  if (v.pageSize !== DEFAULT_PAGE_SIZE) next.set('size', String(v.pageSize));
  const d = DEFAULT_SORT[v.status];
  if (v.sortField !== d.field || v.sortDirection !== d.dir) {
    next.set('sort', v.sortField ?? 'none');
    next.set('dir', v.sortDirection);
  }
  return next;
}

/** A quick filter and the dialog can set the same parameter (due range, prior source). The one set
 *  last wins and the other is cleared, so the chips and the list agree. */
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
const TABS: readonly ReappraisalListStatus[] = ['Pending', 'Deleted', 'Consumed'];

const DEFAULT_SORT: Record<ReappraisalListStatus, { field: string; dir: 'asc' | 'desc' }> = {
  Pending: { field: 'RemainingDay', dir: 'asc' },
  Deleted: { field: 'RemainingDay', dir: 'asc' },
  Consumed: { field: 'NewAppraisalSubmittedAt', dir: 'desc' },
};

// "CIF" / "COL" tag in front of an id.
const ID_TAG = 'px-1 rounded bg-gray-100 text-[9px] font-bold text-gray-700';

const TH = 'px-3 py-2.5 text-left font-medium text-gray-600 whitespace-nowrap';
// Columns shrink to their content; only the customer column grows into the free width.
const SHRINK = 'w-px';

// ─── Component ────────────────────────────────────────────────────────────────

function ReappraisalListPage() {
  const navigate = useNavigate();
  const { t, i18n } = useTranslation(['reappraisal', 'common']);

  // Tabs: the to-do list and books marked "not reviewing this round" (both only books on AS400's
  // latest file), and processed books — the whole history.
  // The view lives only in the URL (see readView): coming back from a detail page, Back/Forward and
  // the menu link all just show what their URL says. Every change replaces the entry in one write.
  const [searchParams, setSearchParams] = useSearchParams();
  const view = useMemo(() => readView(searchParams), [searchParams]);
  const { status, pageNumber, pageSize, quick, processedQuick, sortField, sortDirection } = view;
  const filters = view.filters;
  // Writes build on the last one not yet in the URL (navigation commits later), so two quick writes —
  // the search debounce and a chip click — both land.
  const pending = useRef<ListView | null>(null);
  const setView = (patch: Partial<ListView>) => {
    const next = { ...(pending.current ?? view), ...patch };
    const url = writeView(next);
    // No change from what the URL is (or is about to be): skip, so `pending` is never left set by a
    // navigation that will not commit. Reverting a pending write still navigates.
    const target = pending.current ? writeView(pending.current) : searchParams;
    if (url.toString() === target.toString()) return;
    pending.current = next;
    setSearchParams(url, { replace: true });
  };
  const [filterDialogOpen, setFilterDialogOpen] = useState(false);
  const restoreMutation = useRestoreReappraisalCandidate();

  // The search box types locally and reaches the URL (and the API) once typing pauses.
  const [search, setSearch] = useState(view.search);
  const debouncedSearch = useDebounce(search.trim(), 350);
  useEffect(() => {
    if (debouncedSearch !== view.search) setView({ search: debouncedSearch, pageNumber: 0 });
    // Only a settled search writes; the URL's own changes are picked up below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedSearch]);
  // A URL this page did not write (the menu link, Back/Forward) wins over the box, unsettled typing
  // included. The page's own write only clears `pending`, so typing that went on meanwhile stays.
  useEffect(() => {
    if (!pending.current) setSearch(view.search);
    pending.current = null;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  // Each tab opens on its own order, page 1 — clicking the active tab resets it too.
  const setStatus = (tab: ReappraisalListStatus) =>
    setView({
      status: tab,
      sortField: DEFAULT_SORT[tab].field,
      sortDirection: DEFAULT_SORT[tab].dir,
      pageNumber: 0,
    });

  const isPending = status === 'Pending';
  const isProcessed = status === 'Consumed';
  // The processed tab has no due date: its due and date ranges stay in the URL for the to-do tabs
  // but are not sent.
  const paramsFor = (v: ReappraisalFilterValues): ReappraisalCandidateListParams => ({
    ...v,
    ...(isProcessed && {
      remainingDayFrom: undefined,
      remainingDayTo: undefined,
      reviewDateFrom: undefined,
      reviewDateTo: undefined,
    }),
    ...(isPending && !conflicts(quick, v) ? QUICK_PARAMS[quick] : {}),
    ...(isProcessed && processedQuick !== 'all' ? { newAppraisalState: processedQuick } : {}),
    search: view.search || undefined,
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
    if (sortField === field && sortDirection === 'asc') {
      setView({ sortDirection: 'desc', pageNumber: 0 });
    } else if (sortField === field) {
      setView({ sortField: null, sortDirection: 'asc', pageNumber: 0 });
    } else {
      setView({ sortField: field, sortDirection: 'asc', pageNumber: 0 });
    }
  };

  const { data, isLoading, isPlaceholderData, isError, error } =
    useReappraisalCandidates(queryParams);

  const items = data?.items ?? [];
  const totalCount = data?.count ?? 0;
  const totalPages = Math.ceil(totalCount / pageSize);
  // A page from the URL can be past the end (a row was initiated or skipped meanwhile). Only on this
  // view's own data — placeholder rows belong to the previous query.
  useEffect(() => {
    if (data && !isPlaceholderData && pageNumber > 0 && pageNumber >= Math.max(totalPages, 1)) {
      setView({ pageNumber: Math.max(totalPages - 1, 0) });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data, isPlaceholderData, totalPages, pageNumber]);

  // Skeleton on the first load and whenever the tab, filters, search, sort or page change (the old
  // rows are only a placeholder then). A background refresh of the same view keeps the rows.
  const showSkeleton = isLoading || isPlaceholderData;

  // The processed tab has no due date: the API ignores the due and date ranges there, so they are not
  // shown as active.
  const activeFilterChips = Object.entries(filters).filter(
    ([k, v]) =>
      v != null &&
      v !== '' &&
      !(isProcessed && (k.startsWith('remainingDay') || k.startsWith('reviewDate'))),
  ) as [keyof ReappraisalFilterValues, string | number][];
  const isFiltered =
    activeFilterChips.length > 0 ||
    !!view.search ||
    (isPending && quick !== 'all') ||
    (isProcessed && processedQuick !== 'all');

  // Filter edits start from the latest write, which may not be in the URL yet.
  const currentFilters = () => (pending.current ?? view).filters;

  const removeFilter = (key: keyof ReappraisalFilterValues) => {
    const next = { ...currentFilters() };
    delete next[key];
    setView({ filters: next, pageNumber: 0 });
  };

  const clearAll = () => {
    setSearch('');
    setView({ filters: {}, search: '', quick: 'all', processedQuick: 'all', pageNumber: 0 });
  };

  const getChipLabel = (key: keyof ReappraisalFilterValues, value: string | number): string => {
    if (key === 'reviewType') {
      return t(`reviewType.${value as ReviewTypeCode}`, { defaultValue: String(value) });
    }
    if (key === 'priorSource')
      return t(`filter.priorSource.${value}`, { defaultValue: String(value) });
    if (key === 'reviewDateFrom' || key === 'reviewDateTo') return formatDay(String(value));
    return String(value);
  };

  const restore = (item: ReappraisalCandidateListItem) =>
    // Restoring the last row of a later page leaves it empty: the past-the-end effect steps back.
    restoreMutation.mutate(item.id);

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
              className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3 text-gray-400 pointer-events-none"
            />
            <input
              id="reappraisal-search"
              type="search"
              value={search}
              onChange={e => setSearch(e.target.value)}
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

      {/* ── Tabs, then that tab's quick filters; the quick filters wrap on a narrow screen ── */}
      <div className="shrink-0 mb-3 flex flex-wrap items-center gap-x-3 gap-y-2">
        <div
          className="inline-flex rounded-lg border border-gray-200 bg-gray-50 p-0.5"
          role="group"
        >
          {TABS.map(tab => {
            return (
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
            );
          })}
        </div>
        {(isPending || isProcessed) && (
          <>
            <span className="h-5 w-px bg-gray-200" aria-hidden />
            <div className="flex flex-wrap items-center gap-1.5">
              {isPending
                ? (['all', 'overdue', 'dueSoon', 'inProgress', 'nonCas'] as const).map(q => {
                    return (
                      <button
                        key={q}
                        type="button"
                        aria-pressed={quick === q}
                        onClick={() => {
                          const next = { ...currentFilters() };
                          for (const k of Object.keys(QUICK_PARAMS[q]))
                            delete next[k as keyof ReappraisalFilterValues];
                          setView({ quick: q, filters: next, pageNumber: 0 });
                        }}
                        className={clsx(
                          'inline-flex items-center gap-1.5 px-2.5 py-1 text-[12px] rounded-full border transition-colors',
                          quick === q
                            ? 'border-primary bg-primary/5 text-primary'
                            : 'border-gray-200 bg-white text-gray-500 hover:border-gray-300',
                        )}
                      >
                        {QUICK_DOT[q] && (
                          <span className={clsx('size-1.5 rounded-full', QUICK_DOT[q])} />
                        )}
                        {t(`quick.${q}`)}
                      </button>
                    );
                  })
                : PROCESSED_QUICK.map(q => {
                    return (
                      <button
                        key={q}
                        type="button"
                        aria-pressed={processedQuick === q}
                        onClick={() => setView({ processedQuick: q, pageNumber: 0 })}
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
                onClick={() => removeFilter(key)}
                className="hover:text-primary/60 ml-0.5"
                aria-label={t('common:actions.clear')}
              >
                <Icon style="solid" name="xmark" className="size-2.5" />
              </button>
            </span>
          ))}
          <button
            onClick={() => setView({ filters: {}, pageNumber: 0 })}
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
        onApply={v =>
          setView({ filters: v, quick: conflicts(quick, v) ? 'all' : quick, pageNumber: 0 })
        }
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
                    onClick={() =>
                      navigate(`/reappraisal/${item.id}`, {
                        state: { fromList: true },
                      })
                    }
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
                        <span className="flex items-baseline gap-1 min-w-0">
                          <span className="shrink-0 flex items-center gap-1 text-[11px] text-gray-500 tabular-nums">
                            <span className={ID_TAG}>COL</span>
                            {item.collateralId} ·
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
                        </span>
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
                        <span className="flex items-center gap-1 text-[11px] text-gray-500 tabular-nums">
                          <span className={ID_TAG}>CIF</span>
                          {item.cifNumber}
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
                        <DueCell dueDate={item.dueDate} />
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
