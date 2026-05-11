import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import Icon from '@shared/components/Icon';
import Input from '@shared/components/Input';
import Pagination from '@shared/components/Pagination';
import { TableRowSkeleton } from '@shared/components/Skeleton';
import Badge from '@shared/components/Badge';
import { formatLocaleDate } from '@shared/utils/dateUtils';
import EvaluationStatusBadge from '../components/EvaluationStatusBadge';
import { useGetEvaluationList } from '../api';

const EVALUATION_STATUS_OPTIONS = ['Pending', 'Draft', 'Completed'];

function ServiceQualityEvaluationListPage() {
  const navigate = useNavigate();
  const { i18n } = useTranslation();

  // Pagination
  const [pageNumber, setPageNumber] = useState(0);
  const [pageSize, setPageSize] = useState(10);

  // Filters
  const [appraisalNumber, setAppraisalNumber] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [appraiserName, setAppraiserName] = useState('');
  const [appraisalStatus, setAppraisalStatus] = useState('');
  const [evaluationStatus, setEvaluationStatus] = useState('');

  // Debounced text filters
  const [debouncedAppraisalNumber, setDebouncedAppraisalNumber] = useState('');
  const [debouncedCustomerName, setDebouncedCustomerName] = useState('');
  const [debouncedAppraiserName, setDebouncedAppraiserName] = useState('');

  useEffect(() => {
    const t = setTimeout(() => setDebouncedAppraisalNumber(appraisalNumber), 500);
    return () => clearTimeout(t);
  }, [appraisalNumber]);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedCustomerName(customerName), 500);
    return () => clearTimeout(t);
  }, [customerName]);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedAppraiserName(appraiserName), 500);
    return () => clearTimeout(t);
  }, [appraiserName]);

  // Reset to first page on filter change
  useEffect(() => {
    setPageNumber(0);
  }, [
    debouncedAppraisalNumber,
    debouncedCustomerName,
    debouncedAppraiserName,
    appraisalStatus,
    evaluationStatus,
  ]);

  const { data, isLoading, isFetching, isError, error } = useGetEvaluationList({
    pageNumber,
    pageSize,
    appraisalNumber: debouncedAppraisalNumber || undefined,
    customerName: debouncedCustomerName || undefined,
    appraiserName: debouncedAppraiserName || undefined,
    appraisalStatus: appraisalStatus || undefined,
    evaluationStatus: evaluationStatus || undefined,
  });

  const items = data?.items ?? [];
  const totalCount = data?.count ?? 0;
  const totalPages = Math.ceil(totalCount / pageSize);

  const isFirstLoad = isLoading && items.length === 0;
  const isRefetching = isFetching && !isFirstLoad;

  const hasFilters =
    appraisalNumber || customerName || appraiserName || appraisalStatus || evaluationStatus;

  const handleClearFilters = () => {
    setAppraisalNumber('');
    setCustomerName('');
    setAppraiserName('');
    setAppraisalStatus('');
    setEvaluationStatus('');
  };

  if (isError) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-4">
        <Icon style="solid" name="triangle-exclamation" className="size-12 text-red-500" />
        <p className="text-gray-600">Failed to load evaluations</p>
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
            <h3 className="text-sm font-semibold text-gray-900">Service Quality Evaluation</h3>
            <span className="px-2 py-0.5 text-xs font-medium bg-gray-100 text-gray-600 rounded-full">
              {totalCount}
            </span>
          </div>
          <p className="text-xs text-gray-500 mt-0.5">
            Evaluate external appraiser service quality
          </p>
        </div>
      </div>

      {/* Filters Bar */}
      <div className="shrink-0 flex items-end gap-3 pb-1 flex-wrap">
        <div className="w-44">
          <Input
            label="Appraisal Report No"
            placeholder="e.g. AP-2025-001"
            value={appraisalNumber}
            onChange={e => setAppraisalNumber(e.target.value)}
          />
        </div>
        <div className="w-44">
          <Input
            label="Customer Name"
            placeholder="Customer name"
            value={customerName}
            onChange={e => setCustomerName(e.target.value)}
          />
        </div>
        <div className="w-44">
          <Input
            label="Appraiser Name"
            placeholder="Appraiser name"
            value={appraiserName}
            onChange={e => setAppraiserName(e.target.value)}
          />
        </div>
        <div className="flex flex-col gap-1">
          <label className="block text-xs font-medium text-gray-700">Status</label>
          <select
            value={appraisalStatus}
            onChange={e => setAppraisalStatus(e.target.value)}
            className="px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 outline-none bg-white min-w-32 hover:border-gray-300"
          >
            <option value="">All statuses</option>
            <option value="Pending">Pending</option>
            <option value="InProgress">In Progress</option>
            <option value="Completed">Completed</option>
            <option value="Cancelled">Cancelled</option>
          </select>
        </div>
        <div className="flex flex-col gap-1">
          <label className="block text-xs font-medium text-gray-700">Evaluation Status</label>
          <select
            value={evaluationStatus}
            onChange={e => setEvaluationStatus(e.target.value)}
            className="px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 outline-none bg-white min-w-36 hover:border-gray-300"
          >
            <option value="">All</option>
            {EVALUATION_STATUS_OPTIONS.map(s => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </div>
        {hasFilters && (
          <button
            type="button"
            onClick={handleClearFilters}
            className="inline-flex items-center gap-1 px-2 py-1 text-xs text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded transition-colors"
          >
            <Icon style="solid" name="xmark" className="size-3" />
            Clear all
          </button>
        )}
      </div>

      {/* Table */}
      <div className="flex-1 min-h-0 bg-white rounded-lg border border-gray-200 overflow-hidden flex flex-col">
        <div className="flex-1 min-h-0 overflow-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 sticky top-0 z-10 shadow-[0_1px_3px_rgba(0,0,0,0.05)]">
              <tr className="border-b border-gray-200">
                <th className="text-left font-medium text-gray-600 px-4 py-2.5 whitespace-nowrap">
                  Appraisal Report No
                </th>
                <th className="text-left font-medium text-gray-600 px-4 py-2.5">Appraiser</th>
                <th className="text-left font-medium text-gray-600 px-4 py-2.5">Customer Name</th>
                <th className="text-left font-medium text-gray-600 px-4 py-2.5 whitespace-nowrap">
                  Report Received Date
                </th>
                <th className="text-left font-medium text-gray-600 px-4 py-2.5">Status</th>
                <th className="text-left font-medium text-gray-600 px-4 py-2.5 whitespace-nowrap">
                  Evaluation Status
                </th>
                <th className="text-right font-medium text-gray-600 px-4 py-2.5 whitespace-nowrap">
                  Appraisal Value
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
                    { width: 'w-32' },
                    { width: 'w-32' },
                    { width: 'w-24' },
                    { width: 'w-20' },
                    { width: 'w-24' },
                    { width: 'w-20' },
                  ]}
                  rows={5}
                />
              ) : items.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-16">
                    <div className="flex flex-col items-center gap-2">
                      <Icon style="regular" name="folder-open" className="size-10 text-gray-300" />
                      <p className="text-gray-500 font-medium">No evaluations found</p>
                      <p className="text-xs text-gray-400">
                        {hasFilters ? 'Try different filters' : 'No appraisals to evaluate yet'}
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                items.map(item => (
                  <tr
                    key={item.appraisalId}
                    onClick={() =>
                      navigate(
                        `/standalone/service-quality-evaluation/${item.appraisalId}`,
                      )
                    }
                    className="hover:bg-gray-50 even:bg-gray-50/50 transition-colors cursor-pointer"
                  >
                    <td className="px-4 py-2.5">
                      <span className="font-medium text-primary">{item.appraisalNumber}</span>
                    </td>
                    <td className="px-4 py-2.5 text-gray-700">{item.externalAppraiserName || '—'}</td>
                    <td className="px-4 py-2.5 text-gray-700">{item.customerName || '—'}</td>
                    <td className="px-4 py-2.5 text-gray-600 whitespace-nowrap">
                      {formatLocaleDate(item.reportReceivedDate, i18n.language)}
                    </td>
                    <td className="px-4 py-2.5">
                      <Badge
                        type="status"
                        value={item.appraisalStatus?.toLowerCase()}
                        badgeStyle="soft"
                      >
                        {item.appraisalStatus}
                      </Badge>
                    </td>
                    <td className="px-4 py-2.5">
                      <EvaluationStatusBadge status={item.evaluationStatus} />
                    </td>
                    <td className="px-4 py-2.5 text-right text-gray-700 tabular-nums whitespace-nowrap">
                      {item.appraisalValue != null
                        ? item.appraisalValue.toLocaleString()
                        : '—'}
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
}

export default ServiceQualityEvaluationListPage;
