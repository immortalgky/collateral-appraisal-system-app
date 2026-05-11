import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import Icon from '@/shared/components/Icon';
import Input from '@/shared/components/Input';
import Pagination from '@/shared/components/Pagination';
import Button from '@/shared/components/Button';
import { TableRowSkeleton } from '@/shared/components/Skeleton';
import { DateInput } from '@/shared/components/inputs';
import { formatLocaleDate, formatLocaleDateTime } from '@/shared/utils/dateUtils';
import InvoiceStatusBadge from '../components/InvoiceStatusBadge';
import { useGetInvoices } from '../api/invoice';
import type { InvoiceListItem } from '../types/invoice';

const toDateOnly = (iso: string | null | undefined) => (iso ? iso.slice(0, 10) : undefined);

const INVOICE_STATUS_OPTIONS = ['Draft', 'Submitted', 'Approved'];

const formatCurrency = (amount: number) =>
  `฿${amount.toLocaleString('th-TH', { minimumFractionDigits: 2 })}`;

const IntInvoiceListPage = () => {
  const navigate = useNavigate();
  const { i18n } = useTranslation();

  const [pageNumber, setPageNumber] = useState(0);
  const [pageSize, setPageSize] = useState(20);
  const [statusFilter, setStatusFilter] = useState('');
  const [companySearch, setCompanySearch] = useState('');
  const [debouncedCompanySearch, setDebouncedCompanySearch] = useState('');
  const [dateFrom, setDateFrom] = useState<string | null>(null);
  const [dateTo, setDateTo] = useState<string | null>(null);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedCompanySearch(companySearch), 500);
    return () => clearTimeout(timer);
  }, [companySearch]);

  useEffect(() => {
    setPageNumber(0);
  }, [statusFilter, debouncedCompanySearch, dateFrom, dateTo]);

  const { data, isLoading, isFetching, isError, error } = useGetInvoices({
    pageNumber,
    pageSize,
    status: statusFilter || undefined,
    companySearch: debouncedCompanySearch || undefined,
    dateFrom: toDateOnly(dateFrom),
    dateTo: toDateOnly(dateTo),
  });

  const items = data?.items ?? [];
  const totalCount = data?.totalCount ?? 0;
  const totalPages = Math.ceil(totalCount / pageSize);

  const isFirstLoad = isLoading && items.length === 0;
  const isRefetching = isFetching && !isFirstLoad;
  const hasFilters = statusFilter || companySearch || dateFrom || dateTo;

  const handleClearFilters = () => {
    setStatusFilter('');
    setCompanySearch('');
    setDateFrom(null);
    setDateTo(null);
  };

  // Group items by company name for rendering
  const groupedRows: Array<{ type: 'group'; companyName: string } | { type: 'row'; item: InvoiceListItem }> = [];
  let lastCompany: string | null = null;
  for (const item of items) {
    const company = item.companyName ?? '(Unknown)';
    if (company !== lastCompany) {
      groupedRows.push({ type: 'group', companyName: company });
      lastCompany = company;
    }
    groupedRows.push({ type: 'row', item });
  }

  if (isError) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-4">
        <Icon style="solid" name="triangle-exclamation" className="size-12 text-red-500" />
        <p className="text-gray-600">Failed to load invoices</p>
        <p className="text-sm text-gray-400">{(error as Error)?.message}</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full min-h-0 gap-3">
      {/* Header */}
      <div className="shrink-0 flex items-center justify-between">
        <div>
          <div className="flex items-center gap-3">
            <h3 className="text-sm font-semibold text-gray-900">Invoice</h3>
            <span className="px-2 py-0.5 text-xs font-medium bg-gray-100 text-gray-600 rounded-full">
              {totalCount}
            </span>
          </div>
          <p className="text-xs text-gray-500 mt-0.5">Review and approve company invoices</p>
        </div>
      </div>

      {/* Filters Bar */}
      <div className="shrink-0 flex items-end gap-3 pb-1 flex-wrap">
        <div className="flex-1 max-w-xs">
          <Input
            placeholder="Search by company name"
            value={companySearch}
            onChange={e => setCompanySearch(e.target.value)}
            leftIcon={<Icon style="solid" name="magnifying-glass" className="size-3.5" />}
          />
        </div>

        <select
          value={statusFilter}
          onChange={e => setStatusFilter(e.target.value)}
          className="px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 outline-none bg-white min-w-36 hover:border-gray-300"
        >
          <option value="">All statuses</option>
          {INVOICE_STATUS_OPTIONS.map(s => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>

        <div className="w-40">
          <DateInput
            label="Date From"
            value={dateFrom}
            onChange={setDateFrom}
            placeholder="dd/mm/yyyy"
          />
        </div>

        <div className="w-40">
          <DateInput
            label="Date To"
            value={dateTo}
            onChange={setDateTo}
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
                <th className="text-left font-medium text-gray-600 px-4 py-2.5 whitespace-nowrap">
                  Invoice No.
                </th>
                <th className="text-left font-medium text-gray-600 px-4 py-2.5 whitespace-nowrap">
                  Start Date
                </th>
                <th className="text-left font-medium text-gray-600 px-4 py-2.5 whitespace-nowrap">
                  End Date
                </th>
                <th className="text-center font-medium text-gray-600 px-4 py-2.5 whitespace-nowrap">
                  Items
                </th>
                <th className="text-right font-medium text-gray-600 px-4 py-2.5 whitespace-nowrap">
                  Total Amount
                </th>
                <th className="text-left font-medium text-gray-600 px-4 py-2.5">Status</th>
                <th className="text-left font-medium text-gray-600 px-4 py-2.5 whitespace-nowrap">
                  Submitted At
                </th>
                <th className="w-20 px-4 py-2.5" />
              </tr>
            </thead>
            <tbody
              className={`divide-y divide-gray-100 ${isRefetching ? 'opacity-50 pointer-events-none' : ''}`}
            >
              {isFirstLoad ? (
                <TableRowSkeleton
                  columns={[
                    { width: 'w-28' },
                    { width: 'w-24' },
                    { width: 'w-24' },
                    { width: 'w-10' },
                    { width: 'w-28' },
                    { width: 'w-24' },
                    { width: 'w-32' },
                    { width: 'w-16' },
                  ]}
                  rows={5}
                />
              ) : groupedRows.length === 0 ? (
                <tr>
                  <td colSpan={8} className="text-center py-16">
                    <div className="flex flex-col items-center gap-2">
                      <Icon style="regular" name="folder-open" className="size-10 text-gray-300" />
                      <p className="text-gray-500 font-medium">No invoices found</p>
                      <p className="text-xs text-gray-400">
                        {hasFilters ? 'Try different filters' : 'No invoices have been submitted yet'}
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                groupedRows.map((row, index) => {
                  if (row.type === 'group') {
                    return (
                      <tr key={`group-${row.companyName}-${index}`} className="bg-gray-100 border-t border-b border-gray-200">
                        <td colSpan={8} className="px-4 py-1.5">
                          <span className="text-xs font-semibold text-gray-600 uppercase tracking-wide">
                            {row.companyName}
                          </span>
                        </td>
                      </tr>
                    );
                  }

                  const item = row.item;
                  return (
                    <tr key={item.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-2.5">
                        <span className="font-medium text-primary">
                          {item.invoiceNumber ?? '—'}
                        </span>
                      </td>
                      <td className="px-4 py-2.5 text-gray-600 whitespace-nowrap">
                        {formatLocaleDate(item.periodStartDate, i18n.language)}
                      </td>
                      <td className="px-4 py-2.5 text-gray-600 whitespace-nowrap">
                        {formatLocaleDate(item.periodEndDate, i18n.language)}
                      </td>
                      <td className="px-4 py-2.5 text-center text-gray-600 tabular-nums">
                        {item.itemCount}
                      </td>
                      <td className="px-4 py-2.5 text-right text-gray-700 tabular-nums whitespace-nowrap">
                        {formatCurrency(item.totalAmount)}
                      </td>
                      <td className="px-4 py-2.5">
                        <InvoiceStatusBadge status={item.status} />
                      </td>
                      <td className="px-4 py-2.5 text-gray-600 whitespace-nowrap">
                        {formatLocaleDateTime(item.submittedAt, i18n.language)}
                      </td>
                      <td className="px-4 py-2.5 text-right">
                        <button
                          type="button"
                          onClick={() => navigate(`/admin/invoices/${item.id}`)}
                          className="px-3 py-1 text-xs font-medium border border-gray-200 rounded-lg hover:bg-gray-50 text-gray-700 transition-colors"
                        >
                          View
                        </button>
                      </td>
                    </tr>
                  );
                })
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

export default IntInvoiceListPage;
