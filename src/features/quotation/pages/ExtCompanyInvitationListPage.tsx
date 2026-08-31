import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import Icon from '@/shared/components/Icon';
import Button from '@/shared/components/Button';
import Pagination from '@/shared/components/Pagination';
import { TableRowSkeleton } from '@/shared/components/Skeleton';
import { DateInput } from '@/shared/components/inputs';
import MultiSelectDropdown from '@/shared/components/inputs/MultiSelectDropdown';
import { formatLocaleDateTime } from '@/shared/utils/dateUtils';
import MyInvitationStatusBadge from '../components/MyInvitationStatusBadge';
import SearchByInput from '@/shared/components/inputs/SearchByInput';
import SortableTh from '@/features/taskMonitor/components/SortableTh';
import type { SortDir } from '@/features/taskMonitor/types';
import { useGetMyInvitations } from '../api/quotation';

/** Slice a DatePickerInput ISO value down to the `yyyy-MM-dd` slug the backend's
    `DateOnly?` query binder expects. */
const toDateOnly = (iso: string | null | undefined) => (iso ? iso.slice(0, 10) : undefined);

// Vendor-relevant status filter options (backend code values — labels are translated via t())
const VENDOR_STATUS_CODES = [
  'Pending',
  'Draft',
  'PendingCheckerReview',
  'Submitted',
  'UnderReview',
  'Tentative',
  'Negotiating',
  'Declined',
  'Cancelled',
] as const;

// Single search box + a "search by" selector: only the chosen field is sent to the backend.
type SearchField = 'quotationNo' | 'appraisalNo' | 'customerName';

const formatCurrency = (amount: number | null) => {
  if (amount == null) return '—';
  return new Intl.NumberFormat('th-TH', { style: 'currency', currency: 'THB' }).format(amount);
};

/**
 * External company invitation list page.
 * Route: /ext/quotations  (gated by RoleProtectedRoute for ['ExtAdmin', 'ExtAppraisalChecker'])
 *
 * Uses useGetMyInvitations() — GET /quotations/my-invitations.
 * Backend scopes results to the caller's company_id claim and returns
 * vendor-side companyStatus rather than the parent RFQ status.
 */
const ExtCompanyInvitationListPage = () => {
  const navigate = useNavigate();
  const { t, i18n } = useTranslation(['quotation', 'common']);

  // Pagination state
  const [pageNumber, setPageNumber] = useState(0);
  const [pageSize, setPageSize] = useState(10);

  // Filter state — date filters store ISO from DatePickerInput; sliced to yyyy-MM-dd at the API boundary.
  const [searchField, setSearchField] = useState<SearchField>('quotationNo');
  const [searchTerm, setSearchTerm] = useState('');
  const [statuses, setStatuses] = useState<string[]>([]);
  const [cutOffTimeFrom, setCutOffTimeFrom] = useState<string | null>(null);
  const [cutOffTimeTo, setCutOffTimeTo] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<string | undefined>(undefined);
  const [sortDir, setSortDir] = useState<SortDir | undefined>(undefined);

  const handleSortChange = (key: string | undefined, dir: SortDir | undefined) => {
    setSortBy(key);
    setSortDir(dir);
    setPageNumber(0);
  };

  // Debounced search term — only the value is debounced; switching field applies immediately.
  const [debouncedTerm, setDebouncedTerm] = useState('');

  const statusOptions = VENDOR_STATUS_CODES.map(code => ({
    value: code,
    label: t(`vendorStatus.${code}` as `vendorStatus.${(typeof VENDOR_STATUS_CODES)[number]}`),
  }));
  const searchFieldOptions = [
    { value: 'quotationNo', label: t('filters.quotationNoPlaceholder'), icon: 'file-invoice' },
    { value: 'appraisalNo', label: t('filters.appraisalNoPlaceholder'), icon: 'building' },
    { value: 'customerName', label: t('filters.customerNamePlaceholder'), icon: 'user' },
  ];

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedTerm(searchTerm);
    }, 500);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  useEffect(() => {
    setPageNumber(0);
  }, [debouncedTerm, searchField, statuses, cutOffTimeFrom, cutOffTimeTo]);

  const term = debouncedTerm || undefined;
  const { data, isLoading, isFetching, isError, error } = useGetMyInvitations({
    pageNumber,
    pageSize,
    quotationNo: searchField === 'quotationNo' ? term : undefined,
    appraisalNo: searchField === 'appraisalNo' ? term : undefined,
    customerName: searchField === 'customerName' ? term : undefined,
    statuses: statuses.length ? statuses : undefined,
    cutOffTimeFrom: toDateOnly(cutOffTimeFrom),
    cutOffTimeTo: toDateOnly(cutOffTimeTo),
    sortBy,
    sortDir,
  });

  const items = data?.items ?? [];
  const totalCount = data?.count ?? 0;
  const totalPages = Math.ceil(totalCount / pageSize);

  const isFirstLoad = isLoading && items.length === 0;
  const isRefetching = isFetching && !isFirstLoad;

  const hasFilters = searchTerm || statuses.length || cutOffTimeFrom || cutOffTimeTo;

  const handleClearFilters = () => {
    setSearchTerm('');
    setStatuses([]);
    setCutOffTimeFrom(null);
    setCutOffTimeTo(null);
  };

  if (isError) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-4">
        <Icon style="solid" name="triangle-exclamation" className="size-12 text-red-500" />
        <p className="text-gray-600">{t('errors.failedToLoadInvitations')}</p>
        <p className="text-sm text-gray-400">{(error as Error)?.message}</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full min-h-0 gap-3">
      {/* Header — no "New Quotation" button for vendors */}
      <div className="shrink-0 flex items-center justify-between">
        <div>
          <div className="flex items-center gap-3">
            <h3 className="text-sm font-semibold text-gray-900">{t('page.invitationsTitle')}</h3>
            <span className="px-2 py-0.5 text-xs font-medium bg-gray-100 text-gray-600 rounded-full">
              {totalCount}
            </span>
          </div>
          <p className="text-xs text-gray-500 mt-0.5">{t('page.invitationsSubtitle')}</p>
        </div>
      </div>

      {/* Filters Bar */}
      <div className="shrink-0 flex items-end gap-3 pb-1 flex-wrap">
        {/* Search — one bar: "search by" selector + input */}
        <div className="flex flex-col gap-1">
          <label className="block text-xs font-medium text-gray-700">{t('filters.searchBy')}</label>
          <SearchByInput
            options={searchFieldOptions}
            field={searchField}
            onFieldChange={v => setSearchField(v as SearchField)}
            value={searchTerm}
            onChange={setSearchTerm}
            placeholder={t('filters.searchPlaceholder')}
            className="w-96"
          />
        </div>

        {/* Status Filter — multi-select */}
        <div className="flex flex-col gap-1">
          <label className="block text-xs font-medium text-gray-700">{t('columns.status')}</label>
          <MultiSelectDropdown
            options={statusOptions}
            value={statuses}
            onChange={setStatuses}
            placeholder={t('filters.allStatuses')}
            showValuePrefix={false}
            className="min-w-40"
          />
        </div>

        {/* Cut Off Time — From */}
        <div className="w-40">
          <DateInput
            label={t('filters.cutOffFrom')}
            value={cutOffTimeFrom}
            onChange={setCutOffTimeFrom}
            placeholder="dd/mm/yyyy"
          />
        </div>

        {/* Cut Off Time — To */}
        <div className="w-40">
          <DateInput
            label={t('filters.cutOffTo')}
            value={cutOffTimeTo}
            onChange={setCutOffTimeTo}
            placeholder="dd/mm/yyyy"
          />
        </div>

        {hasFilters && (
          <Button variant="ghost" size="xs" onClick={handleClearFilters}>
            <Icon style="solid" name="xmark" className="size-3 mr-1" />
            {t('common:actions.clearAll')}
          </Button>
        )}
      </div>

      {/* Table */}
      <div className="flex-1 min-h-0 bg-white rounded-lg border border-gray-200 overflow-hidden flex flex-col">
        <div className="flex-1 min-h-0 overflow-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 sticky top-0 z-10 shadow-[0_1px_3px_rgba(0,0,0,0.05)]">
              <tr className="border-b border-gray-200">
                <SortableTh
                  label={t('columns.quotationNumber')}
                  sortKey="QuotationNumber"
                  activeSortKey={sortBy}
                  activeSortDir={sortDir}
                  onSortChange={handleSortChange}
                />
                <SortableTh
                  label={t('columns.customerName')}
                  sortKey="CustomerName"
                  activeSortKey={sortBy}
                  activeSortDir={sortDir}
                  onSortChange={handleSortChange}
                />
                <SortableTh
                  label={t('columns.status')}
                  sortKey="CompanyStatus"
                  activeSortKey={sortBy}
                  activeSortDir={sortDir}
                  onSortChange={handleSortChange}
                />
                <SortableTh
                  label={t('columns.noOfAppraisal')}
                  sortKey="TotalAppraisals"
                  activeSortKey={sortBy}
                  activeSortDir={sortDir}
                  onSortChange={handleSortChange}
                  className="text-center"
                />
                <SortableTh
                  label={t('columns.totalFeeAmount')}
                  sortKey="TotalFeeAmount"
                  activeSortKey={sortBy}
                  activeSortDir={sortDir}
                  onSortChange={handleSortChange}
                  className="text-right"
                />
                <SortableTh
                  label={t('columns.receivedAt')}
                  sortKey="ReceivedAt"
                  activeSortKey={sortBy}
                  activeSortDir={sortDir}
                  onSortChange={handleSortChange}
                />
                <SortableTh
                  label={t('columns.cutOffTime')}
                  sortKey="CutOffTime"
                  activeSortKey={sortBy}
                  activeSortDir={sortDir}
                  onSortChange={handleSortChange}
                />
                <SortableTh label={t('columns.quotedBy')} />
                <SortableTh
                  label={t('columns.quotedAt')}
                  sortKey="QuotedAt"
                  activeSortKey={sortBy}
                  activeSortDir={sortDir}
                  onSortChange={handleSortChange}
                />
              </tr>
            </thead>
            <tbody
              className={`divide-y divide-gray-100 ${isRefetching ? 'opacity-50 pointer-events-none' : ''}`}
            >
              {isFirstLoad ? (
                <TableRowSkeleton
                  columns={[
                    { width: 'w-28' },
                    { width: 'w-32' },
                    { width: 'w-12' },
                    { width: 'w-24' },
                    { width: 'w-24' },
                    { width: 'w-32' },
                    { width: 'w-32' },
                    { width: 'w-24' },
                    { width: 'w-32' },
                  ]}
                  rows={5}
                />
              ) : items.length === 0 ? (
                <tr>
                  <td colSpan={9} className="text-center py-16">
                    <div className="flex flex-col items-center gap-3">
                      <Icon name="inbox" style="regular" className="size-12 text-gray-300" />
                      <div className="text-center">
                        <p className="text-sm font-medium text-gray-700">
                          {t('empty.noInvitations')}
                        </p>
                        <p className="text-xs text-gray-500 mt-0.5">
                          {hasFilters
                            ? t('empty.noInvitationsFilterHint')
                            : t('empty.noInvitationsHint')}
                        </p>
                      </div>
                    </div>
                  </td>
                </tr>
              ) : (
                items.map(item => (
                  <tr
                    key={item.id}
                    onClick={() => navigate(`/ext/quotations/${item.id}`)}
                    className="hover:bg-gray-50 even:bg-gray-50/50 transition-colors cursor-pointer"
                  >
                    <td className="px-4 py-2.5">
                      <span className="font-medium text-primary">{item.quotationNumber}</span>
                    </td>
                    <td
                      className="px-4 py-2.5 text-gray-600 max-w-[16rem]"
                      title={item.customerNames ?? undefined}
                    >
                      <span className="inline-block max-w-full truncate align-bottom">
                        {item.customerName ?? '—'}
                      </span>
                      {item.customerCount > 1 && (
                        <span className="ml-1 text-xs text-gray-400">
                          +{item.customerCount - 1}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-2.5">
                      <MyInvitationStatusBadge status={item.companyStatus} />
                    </td>
                    <td className="px-4 py-2.5 text-center text-gray-600 tabular-nums">
                      {item.totalAppraisals}
                    </td>
                    <td className="px-4 py-2.5 text-right text-gray-600 tabular-nums whitespace-nowrap">
                      {formatCurrency(item.totalFeeAmount)}
                    </td>
                    <td className="px-4 py-2.5 text-gray-600 whitespace-nowrap">
                      {formatLocaleDateTime(item.receivedAt, i18n.language)}
                    </td>
                    <td className="px-4 py-2.5 text-gray-600 whitespace-nowrap">
                      {formatLocaleDateTime(item.cutOffTime, i18n.language)}
                    </td>
                    <td className="px-4 py-2.5 text-gray-600">{item.quotedBy ?? '—'}</td>
                    <td className="px-4 py-2.5 text-gray-600 whitespace-nowrap">
                      {formatLocaleDateTime(item.quotedAt, i18n.language)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
          {isRefetching && (
            <div className="flex justify-center py-2">
              <Icon style="solid" name="spinner" className="size-4 text-primary animate-spin" />
            </div>
          )}
        </div>

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
    </div>
  );
};

export default ExtCompanyInvitationListPage;
