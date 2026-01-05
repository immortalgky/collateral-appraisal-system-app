import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useDeleteRequest, useGetRequests } from '../api';
import ConfirmDialog from '@/shared/components/ConfirmDialog';
import Icon from '@/shared/components/Icon';
import Button from '@/shared/components/Button';
import Badge from '@/shared/components/Badge';
import Pagination from '@/shared/components/Pagination';
import { TableRowSkeleton } from '@/shared/components/Skeleton';
import ParameterDisplay from '@/shared/components/ParameterDisplay';

type SortField = 'requestNumber' | 'status' | 'purpose' | 'channel' | 'priority' | 'requestor';
type SortDirection = 'asc' | 'desc';

function RequestListingPage() {
  const navigate = useNavigate();

  // Pagination state
  const [pageNumber, setPageNumber] = useState(0);
  const [pageSize, setPageSize] = useState(10);

  // Search and filter state
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [purposeFilter, setPurposeFilter] = useState('');

  // Sorting state
  const [sortField, setSortField] = useState<SortField | null>(null);
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');

  // Debounced search value
  const [debouncedSearch, setDebouncedSearch] = useState('');

  // Delete confirmation state
  const [deleteConfirm, setDeleteConfirm] = useState<{ isOpen: boolean; id: string | null }>({
    isOpen: false,
    id: null,
  });
  const deleteRequest = useDeleteRequest();

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchTerm);
    }, 500);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  // Reset to first page when filters or sorting change
  useEffect(() => {
    setPageNumber(0);
  }, [debouncedSearch, statusFilter, purposeFilter, sortField, sortDirection]);

  // Build request params
  const requestParams = {
    pageNumber,
    pageSize,
    search: debouncedSearch || undefined,
    status: statusFilter || undefined,
    purpose: purposeFilter || undefined,
    sortBy: sortField ?? undefined,
    sortDirection: sortField ? sortDirection : undefined,
  };

  // Fetch requests - backend handles filtering and sorting
  const { data, isLoading: isQueryLoading, isError, error } = useGetRequests(requestParams);

  // Add minimum loading delay for better UX (show skeleton)
  const [minLoadingDone, setMinLoadingDone] = useState(true);

  useEffect(() => {
    if (isQueryLoading) {
      setMinLoadingDone(false);
      setTimeout(() => {
        setMinLoadingDone(true);
      }, 500); // 500ms minimum loading time
    }
  }, [isQueryLoading]);

  const isLoading = isQueryLoading || !minLoadingDone;

  // Extract paginated result
  const paginatedResult = data?.result ?? data;
  const requests = paginatedResult?.items ?? [];
  const totalCount = paginatedResult?.count ?? 0;
  const totalPages = Math.ceil(totalCount / pageSize);

  // Filter options
  const statusOptions = ['Draft', 'Pending', 'InProgress', 'Completed', 'Cancelled', 'Rejected'];
  const purposeOptions = ['NewLoan', 'Refinance', 'Review', 'Collateral'];

  const handleDoubleClick = (requestId: string) => {
    navigate(`/requests/${requestId}`);
  };

  const handleEdit = (e: React.MouseEvent, requestId: string) => {
    e.stopPropagation();
    navigate(`/requests/${requestId}`);
  };

  const handleDelete = (e: React.MouseEvent, requestId: string) => {
    e.stopPropagation();
    setDeleteConfirm({ isOpen: true, id: requestId });
  };

  const handleConfirmDelete = () => {
    if (deleteConfirm.id) {
      deleteRequest.mutate(deleteConfirm.id, {
        onSuccess: () => {
          toast.success('Request deleted successfully');
        },
        onError: (error: any) => {
          toast.error(error.apiError?.detail || 'Failed to delete request. Please try again.');
        },
      });
    }
  };

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      // Cycle: asc → desc → clear
      if (sortDirection === 'asc') {
        setSortDirection('desc');
      } else {
        // Clear sorting
        setSortField(null);
        setSortDirection('asc');
      }
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) {
      return <Icon style="solid" name="sort" className="size-3 text-gray-300" />;
    }
    return (
      <Icon
        style="solid"
        name={sortDirection === 'asc' ? 'sort-up' : 'sort-down'}
        className="size-3 text-primary"
      />
    );
  };

  const handleClearFilters = () => {
    setSearchTerm('');
    setStatusFilter('');
    setPurposeFilter('');
  };

  const hasFilters = searchTerm || statusFilter || purposeFilter;

  if (isError) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-4">
        <Icon style="solid" name="triangle-exclamation" className="size-12 text-red-500" />
        <p className="text-gray-600">Failed to load requests</p>
        <p className="text-sm text-gray-400">{(error as Error)?.message}</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full min-h-0 gap-3">
      {/* Compact Header */}
      <div className="shrink-0 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h1 className="text-xl font-semibold text-gray-900">Requests</h1>
          <span className="px-2 py-0.5 text-xs font-medium bg-gray-100 text-gray-600 rounded-full">
            {totalCount}
          </span>
        </div>
        <Button size="sm" onClick={() => navigate('/requests/new')}>
          <Icon style="solid" name="plus" className="size-3.5 mr-1.5" />
          New Request
        </Button>
      </div>

      {/* Filters Bar */}
      <div className="shrink-0 flex items-center gap-3 pb-1">
        {/* Search */}
        <div className="relative flex-1 max-w-xs">
          <Icon
            style="solid"
            name="magnifying-glass"
            className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-gray-400"
          />
          <input
            type="text"
            placeholder="Search requests..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="w-full pl-8 pr-3 py-1.5 text-sm border border-gray-200 rounded-lg focus:ring-1 focus:ring-primary focus:border-primary outline-none"
          />
        </div>

        {/* Status Filter */}
        <select
          value={statusFilter}
          onChange={e => setStatusFilter(e.target.value)}
          className="px-3 py-1.5 text-sm border border-gray-200 rounded-lg focus:ring-1 focus:ring-primary focus:border-primary outline-none bg-white min-w-28"
        >
          <option value="">All Status</option>
          {statusOptions.map(status => (
            <option key={status} value={status}>
              {status}
            </option>
          ))}
        </select>

        {/* Purpose Filter */}
        <select
          value={purposeFilter}
          onChange={e => setPurposeFilter(e.target.value)}
          className="px-3 py-1.5 text-sm border border-gray-200 rounded-lg focus:ring-1 focus:ring-primary focus:border-primary outline-none bg-white min-w-28"
        >
          <option value="">All Purpose</option>
          {purposeOptions.map(purpose => (
            <option key={purpose} value={purpose}>
              {purpose}
            </option>
          ))}
        </select>

        {/* Clear Filters */}
        {hasFilters && (
          <button
            onClick={handleClearFilters}
            className="text-sm text-gray-500 hover:text-gray-700 flex items-center gap-1"
          >
            <Icon style="solid" name="xmark" className="size-3" />
            Clear
          </button>
        )}
      </div>

      {/* Table */}
      <div className="flex-1 min-h-0 bg-white rounded-lg border border-gray-200 overflow-hidden flex flex-col">
        <div className="flex-1 min-h-0 overflow-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 sticky top-0 z-10">
              <tr className="border-b border-gray-200">
                <th
                  onClick={() => handleSort('requestNumber')}
                  className="text-left font-medium text-gray-600 px-4 py-2.5 cursor-pointer hover:bg-gray-100 select-none"
                >
                  <div className="flex items-center gap-1.5">
                    Request #
                    <SortIcon field="requestNumber" />
                  </div>
                </th>
                <th
                  onClick={() => handleSort('status')}
                  className="text-left font-medium text-gray-600 px-4 py-2.5 cursor-pointer hover:bg-gray-100 select-none"
                >
                  <div className="flex items-center gap-1.5">
                    Status
                    <SortIcon field="status" />
                  </div>
                </th>
                <th
                  onClick={() => handleSort('purpose')}
                  className="text-left font-medium text-gray-600 px-4 py-2.5 cursor-pointer hover:bg-gray-100 select-none"
                >
                  <div className="flex items-center gap-1.5">
                    Purpose
                    <SortIcon field="purpose" />
                  </div>
                </th>
                <th
                  onClick={() => handleSort('channel')}
                  className="text-left font-medium text-gray-600 px-4 py-2.5 cursor-pointer hover:bg-gray-100 select-none"
                >
                  <div className="flex items-center gap-1.5">
                    Channel
                    <SortIcon field="channel" />
                  </div>
                </th>
                <th
                  onClick={() => handleSort('priority')}
                  className="text-left font-medium text-gray-600 px-4 py-2.5 cursor-pointer hover:bg-gray-100 select-none"
                >
                  <div className="flex items-center gap-1.5">
                    Priority
                    <SortIcon field="priority" />
                  </div>
                </th>
                <th
                  onClick={() => handleSort('requestor')}
                  className="text-left font-medium text-gray-600 px-4 py-2.5 cursor-pointer hover:bg-gray-100 select-none"
                >
                  <div className="flex items-center gap-1.5">
                    Requestor
                    <SortIcon field="requestor" />
                  </div>
                </th>
                <th className="text-center font-medium text-gray-600 px-4 py-2.5 w-24">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {isLoading ? (
                <TableRowSkeleton
                  columns={[
                    { width: 'w-24' },
                    { width: 'w-20' },
                    { width: 'w-20' },
                    { width: 'w-16' },
                    { width: 'w-14' },
                    { width: 'w-24' },
                    { width: 'w-16' },
                  ]}
                  rows={5}
                />
              ) : requests.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-16">
                    <div className="flex flex-col items-center gap-2">
                      <Icon style="regular" name="folder-open" className="size-10 text-gray-300" />
                      <p className="text-gray-500 font-medium">No requests found</p>
                      <p className="text-xs text-gray-400">
                        {hasFilters ? 'Try different filters' : 'Create your first request'}
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                requests.map(request => (
                  <tr
                    key={request.id}
                    onDoubleClick={() => request.id && handleDoubleClick(request.id)}
                    className="hover:bg-gray-50 cursor-pointer transition-colors"
                    title="Double-click to open"
                  >
                    <td className="px-4 py-2.5">
                      <span className="font-medium text-gray-900">
                        {request.requestNumber || '-'}
                      </span>
                    </td>
                    <td className="px-4 py-2.5">
                      <Badge type="status" value={request.status} />
                    </td>
                    <td className="px-4 py-2.5 text-gray-600">
                      <ParameterDisplay group="PURPOSE" code={request.purpose} />
                    </td>
                    <td className="px-4 py-2.5">
                      <Badge type="channel" value={request.channel}>
                        <ParameterDisplay group="CHANNEL" code={request.channel} />
                      </Badge>
                    </td>
                    <td className="px-4 py-2.5">
                      <Badge type="priority" value={request.priority} />
                    </td>
                    <td className="px-4 py-2.5 text-gray-600">
                      {request.requestor?.username || '-'}
                    </td>
                    <td className="px-4 py-2.5">
                      <div className="flex items-center justify-center gap-1">
                        <button
                          onClick={e => request.id && handleEdit(e, request.id)}
                          className="p-1.5 rounded hover:bg-gray-100 text-gray-500 hover:text-primary transition-colors"
                          title="Edit"
                        >
                          <Icon style="regular" name="pen-to-square" className="size-4" />
                        </button>
                        <button
                          onClick={e => request.id && handleDelete(e, request.id)}
                          className="p-1.5 rounded hover:bg-red-50 text-gray-500 hover:text-red-600 transition-colors"
                          title="Delete"
                        >
                          <Icon style="regular" name="trash-can" className="size-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
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

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        isOpen={deleteConfirm.isOpen}
        onClose={() => setDeleteConfirm({ isOpen: false, id: null })}
        onConfirm={handleConfirmDelete}
        title="Delete Request"
        message="Are you sure you want to delete this request? This action cannot be undone."
        confirmText="Delete"
        cancelText="Cancel"
        variant="danger"
      />
    </div>
  );
}

export default RequestListingPage;
