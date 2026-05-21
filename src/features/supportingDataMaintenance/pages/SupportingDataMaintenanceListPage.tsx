import { Icon } from '@/shared/components';
import Badge from '@/shared/components/Badge';
import Pagination from '@/shared/components/Pagination';
import { TableRowSkeleton } from '@/shared/components/Skeleton';
import { useDebounce } from '@/shared/hooks/useDebounce';
import { format } from 'date-fns';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useGetSupportingDataMaintenanceList } from '../api';
import type {
  GetSupportingDataMaintenanceListParams,
  SupportingDataMaintenance,
} from '../api/types';

type ActiveTab = 'importing' | 'archived';

const ARCHIVED_STATUSES = new Set(['cancelled', 'approved', 'rejected']);

const readFiltersFromSearchParams = (
  _sp: URLSearchParams,
): GetSupportingDataMaintenanceListParams => {
  // Filters are not wired yet; placeholder for future URL hydration.
  return {};
};

const formatDateTime = (dateString?: string | null): string => {
  if (!dateString) return '-';
  try {
    return format(new Date(dateString), 'dd/MM/yyyy HH:mm');
  } catch {
    return dateString;
  }
};

// ── Column config (local to this page, mirrors task/columnDefs pattern) ──
type ColumnDef = {
  key: string;
  label: string;
  tdClassName?: string;
  render: (item: SupportingDataMaintenance) => React.ReactNode;
};

const columns: ColumnDef[] = [
  {
    key: 'supportingNumber',
    label: 'Supporting No.',
    render: item => (
      <span className="font-medium text-primary">{item.supportingNumber ?? '-'}</span>
    ),
  },
  {
    key: 'createdDate',
    label: 'Created Date',
    render: item => formatDateTime(item.createdDate),
  },
  {
    key: 'importChannel',
    label: 'Import Channel',
    render: item => item.importChannel ?? '-',
  },
  {
    key: 'sourceOfData',
    label: 'Source of Data',
    render: item => item.sourceOfData ?? '-',
  },
  {
    key: 'lastModifiedBy',
    label: 'Last Modified By',
    render: item => item.lastModifiedBy ?? '-',
  },
  {
    key: 'lastModifiedDate',
    label: 'Last Modified Date',
    render: item => formatDateTime(item.lastModifiedDate),
  },
  {
    key: 'status',
    label: 'Status',
    tdClassName: 'px-4 py-3',
    render: item => <Badge type="status" value={item.status} size="sm" />,
  },
];

const STICKY_COLUMN_KEY = 'supportingNumber';

export function SupportingDataMaintenanceListPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  // Hydrate from URL on mount
  const initRef = useRef({
    filters: readFiltersFromSearchParams(searchParams),
    search: searchParams.get('search') ?? '',
  });

  const [activeTab, setActiveTab] = useState<ActiveTab>('importing');
  const [pageNumber, setPageNumber] = useState(0);
  const [pageSize, setPageSize] = useState(25);
  const [searchTerm, setSearchTerm] = useState(initRef.current.search);
  const debouncedSearch = useDebounce(searchTerm, 400);
  const isSearchPending = searchTerm !== debouncedSearch;
  const [filters] = useState<GetSupportingDataMaintenanceListParams>(initRef.current.filters);

  // Reset to first page whenever the effective query changes
  useEffect(() => {
    setPageNumber(0);
  }, [debouncedSearch, activeTab, filters]);

  // Sync search back to the URL so the view is shareable
  useEffect(() => {
    const next = new URLSearchParams();
    if (debouncedSearch) next.set('search', debouncedSearch);
    if (next.toString() !== searchParams.toString()) {
      setSearchParams(next, { replace: true });
    }
  }, [debouncedSearch, searchParams, setSearchParams]);

  const requestListParams = {
    pageNumber,
    pageSize,
    ...filters,
  };

  const {
    data: listData,
    isLoading: isListLoading,
    isError: isListError,
    error: listError,
  } = useGetSupportingDataMaintenanceList(requestListParams);

  const allItems = useMemo<SupportingDataMaintenance[]>(() => listData?.items ?? [], [listData]);

  // Tab partition (status-based)
  const importingItems = useMemo(
    () => allItems.filter(d => !d.status || !ARCHIVED_STATUSES.has(d.status)),
    [allItems],
  );
  const archivedItems = useMemo(
    () => allItems.filter(d => !!d.status && ARCHIVED_STATUSES.has(d.status)),
    [allItems],
  );

  const tabItems = activeTab === 'importing' ? importingItems : archivedItems;

  // Client-side search across the textual fields we display
  const filteredItems = useMemo(() => {
    const q = debouncedSearch.trim().toLowerCase();
    if (!q) return tabItems;
    return tabItems.filter(item =>
      [
        item.supportingNumber,
        item.importChannel,
        item.sourceOfData,
        item.lastModifiedBy,
        item.status,
      ]
        .filter(Boolean)
        .some(v => (v as string).toLowerCase().includes(q)),
    );
  }, [tabItems, debouncedSearch]);

  // Client-side pagination over the filtered set (server returns all rows in mock)
  const totalCount = filteredItems.length;
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));
  const pageItems = useMemo(
    () => filteredItems.slice(pageNumber * pageSize, pageNumber * pageSize + pageSize),
    [filteredItems, pageNumber, pageSize],
  );

  const importingCount = importingItems.length;
  const archivedCount = archivedItems.length;
  const hasFilters = !!searchTerm;

  const handleRowClick = (item: SupportingDataMaintenance) => {
    if (!item.id) return;
    navigate(`/standalone/supporting-data-maintenance/${item.id}`);
  };

  const handleCreate = () => {
    navigate('/standalone/supporting-data-maintenance/new');
  };

  if (isListError) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-3">
        <div className="size-12 rounded-full bg-red-50 flex items-center justify-center">
          <Icon style="solid" name="triangle-exclamation" className="size-5 text-red-500" />
        </div>
        <div className="text-center">
          <p className="text-sm font-medium text-gray-800">Failed to load supporting data</p>
          <p className="text-xs text-gray-400 mt-0.5">{(listError as Error)?.message}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full min-h-0 min-w-0">
      {/* ── Page header ── */}
      <div className="shrink-0 mb-3 flex items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-3">
            <h2 className="text-sm font-semibold text-gray-900">Supporting Data Maintenance</h2>
            {!isListLoading && totalCount > 0 && (
              <span className="px-2 py-0.5 text-xs font-medium bg-gray-100 text-gray-600 rounded-full tabular-nums">
                {totalCount}
              </span>
            )}
          </div>
          <p className="text-xs text-gray-500 mt-0.5">Manage imported supporting data requests</p>
        </div>
        <button
          onClick={handleCreate}
          className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors shadow-sm"
        >
          <Icon style="solid" name="plus" className="size-3.5" />
          Create
        </button>
      </div>

      {/* ── Toolbar: tabs + controls ── */}
      <div className="shrink-0 flex items-end gap-2 border-b border-gray-200 mb-3">
        <button
          onClick={() => setActiveTab('importing')}
          className={`relative flex items-center gap-1 px-1 pb-2 text-xs font-medium transition-colors ${
            activeTab === 'importing' ? 'text-primary' : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          <Icon style="solid" name="user" className="size-3" />
          Importing
          {!isListLoading && importingCount > 0 && (
            <span
              className={`px-1 py-0.5 rounded text-[10px] font-semibold tabular-nums ${
                activeTab === 'importing'
                  ? 'bg-primary/10 text-primary'
                  : 'bg-gray-100 text-gray-500'
              }`}
            >
              {importingCount}
            </span>
          )}
          {activeTab === 'importing' && (
            <span className="absolute bottom-[-1px] left-0 right-0 h-0.5 bg-primary rounded-t-full" />
          )}
        </button>
        <button
          onClick={() => setActiveTab('archived')}
          className={`relative flex items-center gap-1 px-1 pb-2 ml-3 text-xs font-medium transition-colors ${
            activeTab === 'archived' ? 'text-primary' : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          <Icon style="solid" name="users" className="size-3" />
          Archived
          {archivedCount > 0 && (
            <span
              className={`px-1 py-0.5 rounded text-[10px] font-semibold tabular-nums ${
                activeTab === 'archived'
                  ? 'bg-primary/10 text-primary'
                  : 'bg-gray-100 text-gray-500'
              }`}
            >
              {archivedCount}
            </span>
          )}
          {activeTab === 'archived' && (
            <span className="absolute bottom-[-1px] left-0 right-0 h-0.5 bg-primary rounded-t-full" />
          )}
        </button>

        {/* Spacer */}
        <div className="flex-1" />

        {/* Search */}
        <div className="relative w-56 mb-2">
          {!isSearchPending && isListLoading && !!debouncedSearch ? (
            <Icon
              style="solid"
              name="spinner"
              className="absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-primary animate-spin pointer-events-none"
            />
          ) : (
            <Icon
              style="solid"
              name="magnifying-glass"
              className="absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-gray-400 pointer-events-none"
            />
          )}
          <input
            type="text"
            placeholder="Search supporting data..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-8 py-2 text-sm bg-gray-50 border border-gray-200 rounded-lg focus:bg-white focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all placeholder:text-gray-400"
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              <Icon style="solid" name="xmark" className="size-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* ── Table ── */}
      <div className="flex-1 min-h-0 min-w-0 bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden flex flex-col">
        <div className="flex-1 min-h-0 overflow-auto">
          <table className="w-full min-w-max text-sm">
            <thead className="sticky top-0 z-20">
              <tr className="bg-gray-50 border-b border-gray-200">
                {columns.map(col => {
                  const isSticky = col.key === STICKY_COLUMN_KEY;
                  const base =
                    'px-4 py-2.5 text-left text-xs font-medium text-gray-500 whitespace-nowrap select-none bg-gray-50';
                  const thClass = isSticky
                    ? `${base} sticky left-0 z-30 after:absolute after:right-0 after:top-0 after:h-full after:w-px after:bg-gray-200`
                    : base;
                  return (
                    <th key={col.key} className={thClass}>
                      {col.label}
                    </th>
                  );
                })}
                <th className="px-4 py-2.5 w-8 bg-gray-50" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {isListLoading ? (
                <TableRowSkeleton columns={columns.map(() => ({ width: 'w-24' }))} rows={8} />
              ) : pageItems.length === 0 ? (
                <tr>
                  <td colSpan={columns.length + 1} className="py-24">
                    <div className="flex flex-col items-center gap-4">
                      <div className="size-16 rounded-2xl bg-gray-50 border border-gray-100 flex items-center justify-center">
                        <Icon style="regular" name="inbox" className="size-7 text-gray-300" />
                      </div>
                      <div className="text-center">
                        <p className="text-sm font-semibold text-gray-700">
                          {hasFilters ? 'No matching records' : 'No supporting data'}
                        </p>
                        <p className="text-xs text-gray-400 mt-1">
                          {hasFilters
                            ? 'Try adjusting your search.'
                            : activeTab === 'archived'
                              ? 'Archived items will appear here.'
                              : 'Imported supporting data will appear here.'}
                        </p>
                      </div>
                      {hasFilters && (
                        <button
                          onClick={() => setSearchTerm('')}
                          className="text-xs text-primary hover:underline font-medium"
                        >
                          Clear search
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ) : (
                pageItems.map(item => (
                  <tr
                    key={item.supportingNumber}
                    onDoubleClick={() => handleRowClick(item)}
                    className="group hover:bg-gray-50 cursor-default transition-colors"
                  >
                    {columns.map(col => {
                      const isSticky = col.key === STICKY_COLUMN_KEY;
                      return (
                        <td
                          key={col.key}
                          className={
                            isSticky
                              ? 'bg-white group-hover:bg-gray-50 transition-colors sticky left-0 z-10 px-4 py-3 after:absolute after:right-0 after:top-0 after:h-full after:w-px after:bg-gray-100'
                              : (col.tdClassName ?? 'px-4 py-3 text-gray-600 text-sm')
                          }
                        >
                          {col.render(item)}
                        </td>
                      );
                    })}
                    <td className="px-4 py-3 w-8">
                      <Icon
                        style="solid"
                        name="arrow-right"
                        className="size-3 text-gray-200 group-hover:text-primary/40 transition-colors"
                      />
                    </td>
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
