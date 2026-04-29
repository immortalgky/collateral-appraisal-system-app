import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import Icon from '@/shared/components/Icon';
import Button from '@/shared/components/Button';
import Input from '@/shared/components/Input';
import Pagination from '@/shared/components/Pagination';
import { TableRowSkeleton } from '@/shared/components/Skeleton';
import { DateInput } from '@/shared/components/inputs';
import { formatLocaleDateTime } from '@/shared/utils/dateUtils';
import MyInvitationStatusBadge from '../components/MyInvitationStatusBadge';
import { useGetMyInvitations } from '../api/quotation';

/** Slice a DatePickerInput ISO value down to the `yyyy-MM-dd` slug the backend's
    `DateOnly?` query binder expects. */
const toDateOnly = (iso: string | null | undefined) => (iso ? iso.slice(0, 10) : undefined);

// Vendor-relevant status filter options (subset of all companyStatus values)
const VENDOR_STATUS_OPTIONS: { value: string; label: string }[] = [
  { value: 'Pending', label: 'Pending Submission' },
  { value: 'Draft', label: 'Draft' },
  { value: 'PendingCheckerReview', label: 'Pending Checker Review' },
  { value: 'Submitted', label: 'Submitted' },
  { value: 'UnderReview', label: 'Under Review' },
  { value: 'Tentative', label: 'Tentative Winner' },
  { value: 'Negotiating', label: 'Negotiating' },
  { value: 'Declined', label: 'Declined' },
  { value: 'Cancelled', label: 'Cancelled' },
];

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
  const { i18n } = useTranslation();

  // Pagination state
  const [pageNumber, setPageNumber] = useState(0);
  const [pageSize, setPageSize] = useState(10);

  // Filter state — date filters store ISO from DatePickerInput; sliced to yyyy-MM-dd at the API boundary.
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [dueDateFrom, setDueDateFrom] = useState<string | null>(null);
  const [dueDateTo, setDueDateTo] = useState<string | null>(null);

  // Debounced search
  const [debouncedSearch, setDebouncedSearch] = useState('');

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchTerm);
    }, 500);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  useEffect(() => {
    setPageNumber(0);
  }, [debouncedSearch, statusFilter, dueDateFrom, dueDateTo]);

  const { data, isLoading, isFetching, isError, error } = useGetMyInvitations({
    pageNumber,
    pageSize,
    search: debouncedSearch || undefined,
    status: statusFilter || undefined,
    dueDateFrom: toDateOnly(dueDateFrom),
    dueDateTo: toDateOnly(dueDateTo),
  });

  const items = data?.items ?? [];
  const totalCount = data?.count ?? 0;
  const totalPages = Math.ceil(totalCount / pageSize);

  const isFirstLoad = isLoading && items.length === 0;
  const isRefetching = isFetching && !isFirstLoad;

  const hasFilters = searchTerm || statusFilter || dueDateFrom || dueDateTo;

  const handleClearFilters = () => {
    setSearchTerm('');
    setStatusFilter('');
    setDueDateFrom(null);
    setDueDateTo(null);
  };

  if (isError) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-4">
        <Icon style="solid" name="triangle-exclamation" className="size-12 text-red-500" />
        <p className="text-gray-600">Failed to load quotation invitations</p>
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
            <h3 className="text-sm font-semibold text-gray-900">Quotation Invitations</h3>
            <span className="px-2 py-0.5 text-xs font-medium bg-gray-100 text-gray-600 rounded-full">
              {totalCount}
            </span>
          </div>
          <p className="text-xs text-gray-500 mt-0.5">
            Manage your company's quotation invitations from banks
          </p>
        </div>
      </div>

      {/* Filters Bar */}
      <div className="shrink-0 flex items-end gap-3 pb-1 flex-wrap">
        {/* Search */}
        <div className="flex-1 max-w-xs">
          <Input
            placeholder="Quotation number or requester"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            leftIcon={<Icon style="solid" name="magnifying-glass" className="size-3.5" />}
          />
        </div>

        {/* Status Filter — kept as native select; shared Dropdown renders "value - label" which is wrong here. */}
        <select
          value={statusFilter}
          onChange={e => setStatusFilter(e.target.value)}
          className="px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 outline-none bg-white min-w-36 hover:border-gray-300"
        >
          <option value="">All statuses</option>
          {VENDOR_STATUS_OPTIONS.map(opt => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>

        {/* Cut Off Time — From */}
        <div className="w-40">
          <DateInput
            label="Cut Off From"
            value={dueDateFrom}
            onChange={setDueDateFrom}
            placeholder="dd/mm/yyyy"
          />
        </div>

        {/* Cut Off Time — To */}
        <div className="w-40">
          <DateInput
            label="Cut Off To"
            value={dueDateTo}
            onChange={setDueDateTo}
            placeholder="dd/mm/yyyy"
          />
        </div>

        {hasFilters && (
          <Button variant="ghost" size="xs" onClick={handleClearFilters}>
            <Icon style="solid" name="xmark" className="size-3 mr-1" />
            Clear all
          </Button>
        )}
      </div>

      {/* Table */}
      <div className="flex-1 min-h-0 bg-white rounded-lg border border-gray-200 overflow-hidden flex flex-col">
        <div className="flex-1 min-h-0 overflow-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 sticky top-0 z-10 shadow-[0_1px_3px_rgba(0,0,0,0.05)]">
              <tr className="border-b border-gray-200">
                <th className="text-left font-medium text-gray-600 px-4 py-2.5">Quotation #</th>
                <th className="text-left font-medium text-gray-600 px-4 py-2.5">Status</th>
                <th className="text-center font-medium text-gray-600 px-4 py-2.5 whitespace-nowrap">
                  No of Appraisal
                </th>
                <th className="text-right font-medium text-gray-600 px-4 py-2.5 whitespace-nowrap">
                  Total Fee Amount
                </th>
                <th className="text-left font-medium text-gray-600 px-4 py-2.5 whitespace-nowrap">
                  Received On
                </th>
                <th className="text-left font-medium text-gray-600 px-4 py-2.5 whitespace-nowrap">
                  Cut Off Time
                </th>
                <th className="text-left font-medium text-gray-600 px-4 py-2.5">Quoted By</th>
                <th className="text-left font-medium text-gray-600 px-4 py-2.5 whitespace-nowrap">
                  Quoted At
                </th>
              </tr>
            </thead>
            <tbody
              className={`divide-y divide-gray-100 ${isRefetching ? 'opacity-50 pointer-events-none' : ''}`}
            >
              {isFirstLoad ? (
                <TableRowSkeleton
                  columns={[
                    { width: 'w-28' },
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
                  <td colSpan={8} className="text-center py-16">
                    <div className="flex flex-col items-center gap-3">
                      <Icon name="inbox" style="regular" className="size-12 text-gray-300" />
                      <div className="text-center">
                        <p className="text-sm font-medium text-gray-700">No invitations yet</p>
                        <p className="text-xs text-gray-500 mt-0.5">
                          {hasFilters
                            ? 'Try different filters'
                            : 'When a bank invites your company to bid, it will appear here'}
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
                      {formatLocaleDateTime(item.dueDate, i18n.language)}
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
