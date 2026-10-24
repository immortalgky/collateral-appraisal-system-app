import { useEffect, useId, useMemo, useRef, useState, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import clsx from 'clsx';
import toast from 'react-hot-toast';
import { isAxiosError } from 'axios';
import { useDebounce } from '@/shared/hooks/useDebounce';
import Modal from '@/shared/components/Modal';
import Button from '@/shared/components/Button';
import Icon from '@/shared/components/Icon';
import Highlight from '@/shared/components/search/Highlight';
import Pagination from '@/shared/components/Pagination';
import ParameterDisplay from '@/shared/components/ParameterDisplay';
import { DateRangeInput } from '@/shared/components/inputs';
import { formatDate } from '@/shared/utils/dateUtils';
import { formatNumber } from '@/shared/utils/formatUtils';
import { useLocalizedCompanyName } from '@/shared/utils/companyName';
import { useAddressStore } from '@/shared/store';
import { useAppraisalSearch } from '@/features/appraisal/api/appraisalSearch';
import type { AppraisalDto } from '@/features/appraisal/api/appraisalSearch';
import {
  fetchPriorAppraisal,
  CARRYABLE_STATUS,
  type PriorAppraisal,
} from '@/features/appraisal/api/priorAppraisal';

interface SearchAppraisalModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (template: PriorAppraisal) => void;
}

/** The API matches nothing for a term shorter than this (AppraisalSearchPredicate.MinTermLength). */
const MIN_TERM = 3;
const PAGE_SIZES = [10, 25, 50];
const SKELETON_ROWS = 6;

/** What the API can sort this list by: the number, the customer and the appraisal date. */
type SortKey = 'AppraisalNumber' | 'CustomerName' | 'appraisalDate';

/** The order when no column is sorted: the appraisal date, newest first. */
const DEFAULT_SORT = { by: 'appraisalDate', dir: 'desc' } as const;

// The header and every row are separate grids, so no track may size itself by its own content (a
// `max-content` would differ per row and the columns would not line up). The report number's track is
// fixed to what its header needs (label and sort icon); the customer takes the room that is left, then
// the collateral and the appraiser (shown only from 62rem wide), then the two fixed columns.
const COLUMNS =
  'grid items-center gap-x-4 grid-cols-[7.5rem_minmax(0,2fr)_minmax(0,1.2fr)_8.5rem_8.5rem] ' +
  '@min-[62rem]:grid-cols-[7.5rem_minmax(0,2fr)_minmax(0,1.2fr)_minmax(0,1fr)_8.5rem_8.5rem]';
const APPRAISER_CELL = 'hidden @min-[62rem]:block';

type SortState = { by: SortKey; dir: 'asc' | 'desc' } | null;
type ShownSort = NonNullable<SortState>;

/**
 * A sortable header. Cycles unsorted → asc → desc → off, with the same icons as the listing pages
 * (a neutral `sort` when this column is not the active one). It is not their `SortableTh`, which is
 * a `<th>`: this header is a grid of divs, so the cell is a `columnheader` of a `row`.
 */
const SortHead = ({
  label,
  field,
  sort,
  onSort,
  className,
}: {
  label: string;
  field: SortKey;
  sort: ShownSort;
  onSort: (field: SortKey) => void;
  className?: string;
}) => {
  const active = sort.by === field;
  return (
    // The header cell carries the sort state (aria-sort belongs to a column header, not to a button)
    <div
      role="columnheader"
      aria-sort={active ? (sort.dir === 'asc' ? 'ascending' : 'descending') : 'none'}
      className={className}
    >
      <button
        type="button"
        onClick={() => onSort(field)}
        className={clsx(
          'group inline-flex cursor-pointer items-center gap-1 whitespace-nowrap text-left font-semibold',
          // The sorted header stays green on hover (a shade darker); the others darken to grey-900
          active ? 'text-primary hover:text-primary-700' : 'hover:text-gray-900',
        )}
      >
        {label}
        <Icon
          style="solid"
          name={active ? (sort.dir === 'asc' ? 'sort-up' : 'sort-down') : 'sort'}
          className={clsx(
            'size-2.5',
            active ? 'text-primary' : 'text-gray-300 group-hover:text-gray-500',
          )}
        />
      </button>
    </div>
  );
};

const Muted = ({ children, title }: { children: ReactNode; title?: string }) => (
  <span className="block truncate text-xs text-gray-500" title={title}>
    {children}
  </span>
);

const SearchAppraisalModal = ({ isOpen, onClose, onSelect }: SearchAppraisalModalProps) => {
  const { t } = useTranslation(['request', 'common']);
  const localizeCompany = useLocalizedCompanyName();
  const listId = useId();
  const listRef = useRef<HTMLDivElement>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [isFetchingTemplate, setIsFetchingTemplate] = useState(false);
  // null = the user has not sorted (or turned it off): the order is then DEFAULT_SORT
  const [sort, setSort] = useState<SortState>(null);
  const shown = sort ?? DEFAULT_SORT;
  const [dates, setDates] = useState({ from: '', to: '' });
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(25);
  const [active, setActive] = useState(0);

  const debouncedSearch = useDebounce(searchQuery.trim(), 350);
  // A term that is too short is not sent: the API would answer with nothing at all
  const termTooShort =
    searchQuery.trim().length > 0 && searchQuery.trim().replace(/^\*/, '').length < MIN_TERM;
  const term = debouncedSearch.replace(/^\*/, '').length >= MIN_TERM ? debouncedSearch : '';

  const titleAddresses = useAddressStore(s => s.titleAddresses);
  const dopaAddresses = useAddressStore(s => s.dopaAddresses);
  const { provinceCodeToName, districtCodeToName } = useMemo(() => {
    const provinceMap = new Map<string, string>();
    const districtMap = new Map<string, string>();
    for (const addr of [...titleAddresses, ...dopaAddresses]) {
      if (!provinceMap.has(addr.provinceCode))
        provinceMap.set(addr.provinceCode, addr.provinceName);
      if (!districtMap.has(addr.districtCode))
        districtMap.set(addr.districtCode, addr.districtName);
    }
    return { provinceCodeToName: provinceMap, districtCodeToName: districtMap };
  }, [titleAddresses, dopaAddresses]);

  // The first page again whenever what is asked for changes
  useEffect(() => {
    setPage(0);
    setActive(0);
  }, [term, dates.from, dates.to, sort, pageSize]);

  const { data, isLoading, isError, isPlaceholderData, refetch } = useAppraisalSearch(
    {
      search: term || undefined,
      status: 'Completed',
      appraisalDateFrom: dates.from || undefined,
      appraisalDateTo: dates.to || undefined,
      sortBy: shown.by,
      sortDir: shown.dir,
      pageNumber: page,
      pageSize,
    },
    { enabled: isOpen },
  );
  const items = data?.result?.items ?? [];
  const total = data?.result?.count ?? 0;

  // The hook keeps the previous page on screen while the next one loads (keepPreviousData). That is
  // right for a page, a sort or the dates: the rows stay, dimmed, under a progress bar. It is wrong
  // for a new search term, whose old rows are not an answer to it: those show placeholders instead.
  const [loadedTerm, setLoadedTerm] = useState(term);
  useEffect(() => {
    if (data && !isPlaceholderData) setLoadedTerm(term);
  }, [data, isPlaceholderData, term]);
  const skeleton = isLoading || (isPlaceholderData && loadedTerm !== term);
  const dimmed = isPlaceholderData && !skeleton;
  const busy = skeleton || dimmed;
  const filtered = !!term || !!dates.from || !!dates.to;

  // What is on screen is what is sent: no choice of the user's is the default order, and its header
  // reads as sorted. Another column goes ascending, descending, then off (back to the default). The
  // default's own column just flips between the two: it has no neutral state.
  const handleSort = (field: SortKey) =>
    setSort(() => {
      if (shown.by !== field) return { by: field, dir: 'asc' };
      if (field === DEFAULT_SORT.by)
        return { by: field, dir: shown.dir === 'asc' ? 'desc' : 'asc' };
      return shown.dir === 'asc' ? { by: field, dir: 'desc' } : null;
    });

  // Which pick may still deliver. Closing the dialog by any way out (Cancel, Esc, the backdrop, the
  // parent hiding it) moves it on, so a load that finishes afterwards is dropped and never reaches
  // `onSelect`: the maker backed out, and the form must not change under them.
  const pickToken = useRef(0);
  useEffect(() => {
    const token = pickToken; // a counter, not a DOM node: what the cleanup reads is the live value
    if (!isOpen) token.current++;
    return () => {
      token.current++;
    };
  }, [isOpen]);

  const handleClose = () => {
    pickToken.current++;
    setSearchQuery('');
    setSelectedId(null);
    setIsFetchingTemplate(false);
    setSort(null);
    setDates({ from: '', to: '' });
    setPage(0);
    onClose();
  };

  const pick = async (appraisalId: string) => {
    if (isFetchingTemplate) return;
    const token = ++pickToken.current;
    const current = () => token === pickToken.current;
    setSelectedId(appraisalId);
    setIsFetchingTemplate(true);
    try {
      const template = await fetchPriorAppraisal(appraisalId);
      if (!current()) return;
      // The endpoint returns any status; only a completed appraisal may be copied from
      if (template.status !== CARRYABLE_STATUS) {
        toast.error(t('toasts.appraisalNotCompleted'));
        setSelectedId(null);
        return;
      }
      onSelect(template);
      handleClose();
    } catch (err) {
      if (!current()) return;
      if (isAxiosError(err) && err.response?.status === 409) {
        toast.error(t('toasts.appraisalNotCompleted'));
      } else if (isAxiosError(err) && err.response?.status === 404) {
        toast.error(t('toasts.appraisalNotFound'));
      } else {
        toast.error(t('toasts.appraisalLoadFailed'));
      }
      setSelectedId(null);
    } finally {
      if (current()) setIsFetchingTemplate(false);
    }
  };

  const optionId = (i: number) => `${listId}-${i}`;
  const move = (delta: number) => {
    if (busy) return;
    const next = Math.min(Math.max(active + delta, 0), Math.max(items.length - 1, 0));
    setActive(next);
    document.getElementById(optionId(next))?.scrollIntoView?.({ block: 'nearest' });
  };
  const onSearchKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      move(1);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      move(-1);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const item = items[active];
      // not while the rows on screen are the previous answer
      if (item && !busy) void pick(item.id);
    }
  };

  const place = (item: AppraisalDto) => {
    const district = item.district
      ? (districtCodeToName.get(item.district) ?? item.district)
      : null;
    const province = item.province
      ? (provinceCodeToName.get(item.province) ?? item.province)
      : null;
    return [district, province].filter(Boolean).join(' ');
  };
  const money = (value: number | null | undefined) =>
    value != null && value > 0 ? formatNumber(value, Number.isInteger(value) ? 0 : 2) : null;
  const typeCodes = (item: AppraisalDto) =>
    (item.propertyTypes ?? '')
      .split(',')
      .map(code => code.trim())
      .filter(Boolean);

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title={t('searchAppraisal.modalTitle')}
      size="2xl"
      compact
    >
      <div className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative min-w-[18rem] flex-1">
            <Icon
              name="magnifying-glass"
              style="regular"
              className="pointer-events-none absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-gray-400"
            />
            <input
              type="text"
              role="combobox"
              aria-expanded
              aria-controls={listId}
              aria-activedescendant={items[active] ? optionId(active) : undefined}
              aria-label={t('searchAppraisal.searchPlaceholder')}
              placeholder={t('searchAppraisal.searchPlaceholder')}
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              onKeyDown={onSearchKeyDown}
              className="h-10 w-full rounded-lg border border-gray-200 bg-white pl-9 pr-9 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
              autoFocus // eslint-disable-line jsx-a11y/no-autofocus -- a search dialog: typing is the first thing to do
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                aria-label={t('searchAppraisal.clearSearch')}
                title={t('searchAppraisal.clearSearch')}
                className="absolute right-2 top-1/2 grid size-6 -translate-y-1/2 cursor-pointer place-items-center rounded text-gray-400 hover:text-gray-600"
              >
                <Icon name="xmark" style="solid" className="size-3" />
              </button>
            )}
          </div>
          <div className="w-60 shrink-0" title={t('searchAppraisal.dateFilterHint')}>
            <DateRangeInput
              from={dates.from}
              to={dates.to}
              onChange={(from, to) => setDates({ from, to })}
              placeholder={t('searchAppraisal.dateFilterLabel')}
            />
          </div>
          {(dates.from || dates.to) && (
            <button
              type="button"
              onClick={() => setDates({ from: '', to: '' })}
              className="cursor-pointer text-xs font-medium text-primary hover:underline"
            >
              {t('searchAppraisal.clearFilters')}
            </button>
          )}
        </div>

        <div className="flex min-h-4 items-baseline justify-between gap-3 text-xs text-gray-500">
          <span className={termTooShort ? 'text-amber-700' : undefined}>
            {termTooShort
              ? t('searchAppraisal.minChars', { n: MIN_TERM })
              : t('searchAppraisal.searchHint')}
          </span>
          {skeleton ? (
            <span className="shrink-0 text-gray-400" aria-live="polite">
              {t('searchAppraisal.searching')}
            </span>
          ) : (
            !isError && (
              <span className="shrink-0 font-medium text-gray-700" aria-live="polite">
                {t('searchAppraisal.found', { n: formatNumber(total) })}
              </span>
            )
          )}
        </div>

        <div className="@container relative overflow-hidden rounded-lg border border-gray-200">
          {dimmed && (
            <progress
              aria-hidden
              className="progress progress-primary absolute inset-x-0 top-0 z-10 h-0.5 w-full rounded-none"
            />
          )}
          <div
            role="row"
            className={clsx(
              COLUMNS,
              'whitespace-nowrap border-b border-gray-200 bg-gray-50 px-3 py-2 text-xs font-semibold text-gray-600',
            )}
          >
            <SortHead
              label={t('searchAppraisal.colNumber')}
              field="AppraisalNumber"
              {...{ sort: shown, onSort: handleSort }}
            />
            <SortHead
              label={t('searchAppraisal.colCustomer')}
              field="CustomerName"
              {...{ sort: shown, onSort: handleSort }}
            />
            <div role="columnheader">{t('searchAppraisal.colCollateral')}</div>
            <div role="columnheader" className={APPRAISER_CELL}>
              {t('searchAppraisal.colAppraiser')}
            </div>
            <div role="columnheader" className="whitespace-nowrap text-right">
              {t('searchAppraisal.colValue')}
            </div>
            <SortHead
              label={t('searchAppraisal.colDate')}
              field="appraisalDate"
              className="justify-self-center"
              {...{ sort: shown, onSort: handleSort }}
            />
          </div>

          <div
            ref={listRef}
            id={listId}
            role="listbox"
            aria-label={t('searchAppraisal.modalTitle')}
            aria-busy={busy}
            className={clsx(
              'max-h-[22rem] overflow-y-auto transition-opacity',
              dimmed && 'pointer-events-none opacity-50',
            )}
          >
            {skeleton &&
              Array.from({ length: SKELETON_ROWS }, (_, i) => (
                <div
                  key={i}
                  className={clsx(COLUMNS, 'border-b border-gray-100 px-3 py-2.5 last:border-b-0')}
                  aria-hidden
                >
                  <div className="space-y-1.5">
                    <div className="h-3 w-24 animate-pulse rounded bg-gray-200" />
                    <div className="h-2.5 w-20 animate-pulse rounded bg-gray-100" />
                  </div>
                  <div className="h-3 w-32 animate-pulse rounded bg-gray-200" />
                  <div className="space-y-1.5">
                    <div className="h-3 w-36 animate-pulse rounded bg-gray-200" />
                    <div className="h-2.5 w-24 animate-pulse rounded bg-gray-100" />
                  </div>
                  <div
                    className={clsx(APPRAISER_CELL, 'h-3 w-20 animate-pulse rounded bg-gray-100')}
                  />
                  <div className="ml-auto h-3 w-16 animate-pulse rounded bg-gray-200" />
                  <div className="mx-auto h-3 w-16 animate-pulse rounded bg-gray-200" />
                </div>
              ))}

            {isError && !skeleton && (
              <div role="alert" className="flex flex-col items-center gap-2 px-4 py-10 text-center">
                <p className="m-0 text-sm font-medium text-gray-800">
                  {t('searchAppraisal.errorTitle')}
                </p>
                <Button variant="outline" size="sm" onClick={() => void refetch()}>
                  {t('searchAppraisal.retry')}
                </Button>
              </div>
            )}

            {!skeleton && !isError && items.length === 0 && (
              <div className="flex flex-col items-center gap-1.5 px-4 py-10 text-center">
                <Icon name="magnifying-glass" style="regular" className="size-5 text-gray-300" />
                <p className="m-0 text-sm font-medium text-gray-800">
                  {t('searchAppraisal.emptyTitle')}
                </p>
                <p className="m-0 max-w-md text-xs text-gray-500">
                  {t('searchAppraisal.emptyHint')}
                </p>
                {filtered && (
                  <div className="mt-1 flex gap-3 text-xs font-medium">
                    {(dates.from || dates.to) && (
                      <button
                        type="button"
                        onClick={() => setDates({ from: '', to: '' })}
                        className="cursor-pointer text-primary hover:underline"
                      >
                        {t('searchAppraisal.clearFilters')}
                      </button>
                    )}
                    {term && (
                      <button
                        type="button"
                        onClick={() => setSearchQuery('')}
                        className="cursor-pointer text-primary hover:underline"
                      >
                        {t('searchAppraisal.clearSearch')}
                      </button>
                    )}
                  </div>
                )}
              </div>
            )}

            {!skeleton &&
              !isError &&
              items.map((item, i) => {
                const codes = typeCodes(item);
                // An internal assignment is the bank's own appraiser; an external one names its
                // company; no assignment yet has neither.
                const company =
                  item.assignmentType === 'Internal'
                    ? t('searchAppraisal.appraiserBank')
                    : item.companyName
                      ? localizeCompany(item.companyName, item.companyNameLocal)
                      : null;
                const value = money(item.appraisalValue);
                const loading = isFetchingTemplate && selectedId === item.id;
                return (
                  // Options are not focusable by design: focus stays in the search box, which carries the
                  // keys (aria-activedescendant), so the option itself takes only the pointer.
                  // eslint-disable-next-line jsx-a11y/click-events-have-key-events, jsx-a11y/interactive-supports-focus
                  <div
                    key={item.id}
                    id={optionId(i)}
                    role="option"
                    aria-selected={i === active}
                    aria-disabled={isFetchingTemplate}
                    onClick={() => void pick(item.id)}
                    onMouseMove={() => i !== active && setActive(i)}
                    className={clsx(
                      COLUMNS,
                      'cursor-pointer border-b border-gray-100 px-3 py-2 text-table last:border-b-0',
                      i === active ? 'bg-primary/5' : 'hover:bg-gray-50',
                      loading && 'opacity-60',
                      isFetchingTemplate && 'cursor-wait',
                    )}
                  >
                    <div className="min-w-0">
                      <span className="block truncate font-semibold text-primary">
                        <Highlight
                          text={item.appraisalNumber}
                          term={searchQuery}
                          minLength={MIN_TERM}
                        />
                      </span>
                    </div>
                    <div className="min-w-0">
                      <span className="flex items-baseline gap-1.5">
                        <span
                          className="truncate text-gray-900"
                          title={item.customerName ?? undefined}
                        >
                          <Highlight
                            text={item.customerName}
                            term={searchQuery}
                            minLength={MIN_TERM}
                          />
                        </span>
                        {item.customerCount > 1 && (
                          <span className="shrink-0 rounded bg-gray-100 px-1 text-xs text-gray-600">
                            {t('searchAppraisal.moreCustomers', { n: item.customerCount - 1 })}
                          </span>
                        )}
                      </span>
                    </div>
                    <div className="min-w-0">
                      <span className="block truncate text-gray-900">
                        {codes.length > 0
                          ? codes.map((code, k) => (
                              <span key={code}>
                                {k > 0 && ', '}
                                <ParameterDisplay group="PropertyType" code={code} />
                              </span>
                            ))
                          : '—'}
                        {item.propertyCount > 1 && (
                          <span className="text-gray-500">
                            {' · '}
                            {t('searchAppraisal.propertyCount', { n: item.propertyCount })}
                          </span>
                        )}
                      </span>
                      <Muted title={place(item)}>{place(item) || '—'}</Muted>
                    </div>
                    <div className={clsx(APPRAISER_CELL, 'min-w-0')}>
                      <span className="block truncate text-gray-700" title={company ?? undefined}>
                        {company ?? '—'}
                      </span>
                      {item.inspectionNumber != null && (
                        <Muted>{t('searchAppraisal.round', { n: item.inspectionNumber })}</Muted>
                      )}
                    </div>
                    <div className="text-right tabular-nums">
                      <span className={value ? 'font-medium text-gray-900' : 'text-gray-400'}>
                        {value ?? '—'}
                      </span>
                    </div>
                    <div className="text-center tabular-nums text-gray-700">
                      {item.appraisalDate ? formatDate(item.appraisalDate, 'dd/MM/yyyy') : '—'}
                      {loading && (
                        <Icon
                          name="spinner"
                          style="solid"
                          className="ml-1 inline size-3 animate-spin text-primary"
                        />
                      )}
                    </div>
                  </div>
                );
              })}
          </div>
        </div>

        {total > pageSize && (
          <Pagination
            currentPage={page}
            totalPages={Math.ceil(total / pageSize)}
            totalCount={total}
            pageSize={pageSize}
            pageSizeOptions={PAGE_SIZES}
            onPageChange={setPage}
            onPageSizeChange={setPageSize}
          />
        )}

        <div className="flex items-center justify-between gap-3">
          <p className="m-0 text-xs text-gray-500">{t('searchAppraisal.footerHint')}</p>
          <Button variant="outline" onClick={handleClose}>
            {t('common:actions.cancel')}
          </Button>
        </div>
      </div>
    </Modal>
  );
};

export default SearchAppraisalModal;
