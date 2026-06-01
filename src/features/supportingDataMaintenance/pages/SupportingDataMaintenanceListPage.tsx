import { Icon } from '@/shared/components';
import Badge from '@/shared/components/Badge';
import Pagination from '@/shared/components/Pagination';
import { TableRowSkeleton } from '@/shared/components/Skeleton';
import { useDebounce } from '@/shared/hooks/useDebounce';
import { formatLocaleDate, formatLocaleDateTime } from '@/shared/utils/dateUtils';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useDeleteSupportingData, useGetSupportingDataMaintenanceList } from '../api';
import type {
  GetSupportingDataMaintenanceListParams,
  GetSupportingDataMaintenanceListResponse,
  SupportingDataDateType,
  SupportingDataMaintenance,
  SupportingDataParams,
} from '../api/types';
import { SupportingDataFilterDialog } from '../components/SupportingDataFilterDialog';
import ConfirmDialog from '@/shared/components/ConfirmDialog';
import { getImportChannelLabel, getSourceOfDataLabel, getStatusLabel } from '../utils/getLabel';
import { ARCHIVED_STATUSES, REMOVABLE_STATUSES } from '../constants/parameters';
import toast from 'react-hot-toast';
import { useTranslation } from 'react-i18next';

interface ContextMenuState {
  visible: boolean;
  x: number;
  y: number;
  supportingId: string | null;
  status: string | null;
}

type ActiveTab = 'importing' | 'archived';

const FILTER_KEYS: (keyof GetSupportingDataMaintenanceListParams)[] = [
  'status',
  'supportingNumber',
  'dateType',
  'dateFrom',
  'dateTo',
];

const readFiltersFromSearchParams = (
  sp: URLSearchParams,
): GetSupportingDataMaintenanceListParams => {
  const out: GetSupportingDataMaintenanceListParams = {};
  for (const key of FILTER_KEYS) {
    const v = sp.get(key);
    if (v) {
      if (key === 'dateType') {
        if (v === 'createdDate' || v === 'lastModifiedDate') {
          out.dateType = v as SupportingDataDateType;
        }
      } else {
        (out as Record<string, string>)[key] = v;
      }
    }
  }
  return out;
};

export function SupportingDataMaintenanceListPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { t, i18n } = useTranslation(['supportingDataMaintenance', 'common']);


// ── Column config (local to this page, mirrors task/columnDefs pattern) ──
  type ColumnDef = {
    key: string;
    label: string;
    tdClassName?: string;
    render: (item: SupportingDataMaintenance) => React.ReactNode;
  };

  const columns: ColumnDef[] = useMemo(() => [{
    key: 'supportingNumber',
    label: t('columns.supportingNumber'),
    render: item => (
      <Link
        to={`/standalone/supporting-data-maintenance/${item.id}`}
        onClick={e => e.stopPropagation()}
        className="font-medium text-primary hover:underline inline-flex items-center gap-1.5"
      >
        {item.supportingNumber ?? '-'}
      </Link>
    ),
  },
    {
      key: 'createdDate',
      label: t('columns.createdDate'),
      render: item => formatLocaleDateTime(item.createdDate, i18n.language),
    },
    {
      key: 'importChannel',
      label: t('columns.importChannel'),
      render: item => (item.importChannel ? getImportChannelLabel(item.importChannel) : '-'),
    },
    {
      key: 'sourceOfData',
      label: t('columns.sourceOfData'),
      render: item => (item.sourceOfData ? getSourceOfDataLabel(item.sourceOfData) : '-'),
    },
    {
      key: 'lastModifiedBy',
      label: t('columns.lastModifiedBy'),
      render: item => item.lastModifiedBy ?? '-',
    },
    {
      key: 'lastModifiedDate',
      label: t('columns.lastModifiedDate'),
      render: item => formatLocaleDateTime(item.lastModifiedDate, i18n.language),
    },
    {
      key: 'status',
      label: t('columns.status'),
      tdClassName: 'px-4 py-3',
      render: item => (
        <Badge type="status" value={item.status ? getStatusLabel(item.status) : '-'} size="sm" />
      ),
    }], [t, i18n.language]);



  const STICKY_COLUMN_KEY = 'supportingNumber';

  const FILTER_LABELS: Record<keyof SupportingDataParams, string> = {
    supportingNumber: t('filterLabels.supportingNumber'),
    dateType: t('filterLabels.dateType'),
    dateFrom: t('filterLabels.dateFrom'),
    dateTo: t('filterLabels.dateTo'),
    status: t('filterLabels.status'),
    importChannel: t('filterLabels.importChannel'),
  };

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
  const [filterDialogOpen, setFilterDialogOpen] = useState(false);
  const [filters, setFilters] = useState<GetSupportingDataMaintenanceListParams>(
    initRef.current.filters,
  );
  const [contextMenu, setContextMenu] = useState<ContextMenuState>({
    visible: false,
    x: 0,
    y: 0,
    supportingId: null,
    status: null,
  });
  const contextMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (contextMenuRef.current && !contextMenuRef.current.contains(e.target as Node)) {
        setContextMenu(prev => ({ ...prev, visible: false }));
      }
    };
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, []);

  const [deleteConfirm, setDeleteConfirm] = useState<{
    isOpen: boolean;
    id: string | null;
  }>({
    isOpen: false,
    id: null,
  });

  const activeFilterChips = Object.entries(filters).filter(([, v]) => !!v) as [
    keyof SupportingDataParams,
    string,
  ][];
  const hasFilters = !!searchTerm || activeFilterChips.length > 0;

  const removeFilter = (key: keyof GetSupportingDataMaintenanceListParams) => {
    setFilters(prev => {
      const next = { ...prev };
      delete next[key];
      return next;
    });
  };

  // Reset to first page whenever the effective query changes
  useEffect(() => {
    setPageNumber(0);
  }, [debouncedSearch, activeTab, filters]);

  // Sync search back to the URL so the view is shareable
  useEffect(() => {
    const next = new URLSearchParams();
    if (debouncedSearch) next.set('search', debouncedSearch);
    if (filters.status) next.set('status', filters.status);
    if (filters.dateFrom) next.set('dateFrom', filters.dateFrom);
    if (filters.dateTo) next.set('dateTo', filters.dateTo);
    if (filters.dateType) next.set('dateType', filters.dateType);
    if (filters.supportingNumber) next.set('supportingNumber', filters.supportingNumber);
    // if (filters.importChannel) next.set('importChannel', filters.importChannel);
    if (next.toString() !== searchParams.toString()) {
      setSearchParams(next, { replace: true });
    }
  }, [debouncedSearch, filters, searchParams, setSearchParams]);

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

  const { mutate: deleteSupportingData, isPending: isDeleting } = useDeleteSupportingData();

  const hasAuthorityToEdit = listData?.hasAuthorityToEdit ?? false;
  const hasAuthorityToRemove = listData?.hasAuthorityToRemove ?? false;

  const isLoading = isListLoading || isDeleting;

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

  // Client-side pagination over the filtered set (server returns all rows in mock)
  const totalCount = listData?.count ?? 0;
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));

  const importingCount = importingItems.length;
  const archivedCount = archivedItems.length;

  const handleRowClick = (item: SupportingDataMaintenance) => {
    if (!item.id) return;
    navigate(`/standalone/supporting-data-maintenance/${item.id}`);
  };

  const handleRowRemove = (item: SupportingDataMaintenance) => {
    if (!item.id) return;
    setDeleteConfirm({ isOpen: true, id: item.id });
  };

  const confirmDelete = () => {
    // Api to delete
    if (!deleteConfirm.id) return;

    deleteSupportingData(
      { supportingId: deleteConfirm.id },
      {
        onSuccess: () => {
          setDeleteConfirm({ isOpen: false, id: null });
          toast.success(t('toasts.deletedSuccess'));
        },
        onError: (error: any) => {
          setDeleteConfirm({ isOpen: false, id: null });
          toast.error(error.apiError?.detail || t('toasts.deleteFailed'));
        },
      },
    );
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
          <p className="text-sm font-medium text-gray-800">{t('errors.failedToLoad')}</p>
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
            <h2 className="text-sm font-semibold text-gray-900">{t('page.listTitle')}</h2>
            {!isListLoading && totalCount > 0 && (
              <span className="px-2 py-0.5 text-xs font-medium bg-gray-100 text-gray-600 rounded-full tabular-nums">
                {totalCount}
              </span>
            )}
          </div>
          <p className="text-xs text-gray-500 mt-0.5">{t('page.subtitle')}</p>
        </div>
      </div>

      {/* ── Toolbar: tabs + controls ── */}
      <div className="shrink-0 flex items-end gap-2 border-b border-gray-200 mb-3">
        <button
          onClick={() => setActiveTab('importing')}
          className={`relative flex items-center gap-1 px-1 pb-2 text-xs font-medium transition-colors cursor-pointer ${
            activeTab === 'importing' ? 'text-primary' : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          <Icon style="solid" name="user" className="size-3" />
          {t('tabs.importing')}
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
          className={`relative flex items-center gap-1 px-1 pb-2 ml-3 text-xs font-medium transition-colors cursor-pointer ${
            activeTab === 'archived' ? 'text-primary' : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          <Icon style="solid" name="users" className="size-3" />
          {t('tabs.archived')}
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
            placeholder={t('search.placeholder')}
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-8 py-2 text-sm bg-gray-50 border border-gray-200 rounded-lg focus:bg-white focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all placeholder:text-gray-400"
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm('')}
              aria-label={t('aria.clearSearch')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              <Icon style="solid" name="xmark" className="size-3.5" />
            </button>
          )}
        </div>

        {/* Filter */}
        <button
          onClick={() => setFilterDialogOpen(true)}
          title={t('actions.filters')}
          className={`mb-2 relative flex items-center gap-1.5 px-3 py-2 text-sm border rounded-lg transition-all cursor-pointer ${
            activeFilterChips.length > 0
              ? 'border-primary/30 bg-primary/5 text-primary hover:bg-primary/10'
              : 'border-gray-200 text-gray-500 hover:border-gray-300 hover:text-gray-700'
          }`}
        >
          <Icon style="solid" name="sliders" className="size-3.5" />
          {t('actions.filters')}
          {activeFilterChips.length > 0 && (
            <span className="inline-flex items-center justify-center size-4 rounded-full bg-primary text-white text-[10px] font-semibold">
              {activeFilterChips.length}
            </span>
          )}
        </button>

        {hasAuthorityToEdit && (
          <button
            onClick={handleCreate}
            className="mb-2 relative flex items-center gap-1.5 px-3 py-2 text-sm bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors shadow-sm cursor-pointer"
          >
            <Icon style="solid" name="plus" className="size-3.5" />
            {t('actions.create')}
          </button>
        )}
      </div>

      <SupportingDataFilterDialog
        open={filterDialogOpen}
        initialValues={filters}
        onApply={v => setFilters(v)}
        onClose={() => setFilterDialogOpen(false)}
      />

      {/* Active filter chips */}
      {activeFilterChips.length > 0 && (
        <div className="shrink-0 flex items-center gap-1.5 flex-wrap mb-3">
          {activeFilterChips.map(([key, value]) => (
            <span
              key={key}
              className="inline-flex items-center gap-1.5 pl-2.5 pr-1.5 py-0.5 text-xs bg-primary/8 text-primary border border-primary/15 rounded-full font-medium"
            >
              <span className="text-primary/60">{FILTER_LABELS[key]}:</span>{' '}
              {key === 'dateFrom' || key === 'dateTo'
                ? formatLocaleDate(value, i18n.language)
                : value}
              <button onClick={() => removeFilter(key)} className="hover:text-primary/60 ml-0.5">
                <Icon style="solid" name="xmark" className="size-2.5" />
              </button>
            </span>
          ))}
          <button
            onClick={() => setFilters({})}
            className="text-xs text-gray-400 hover:text-gray-600 hover:underline underline-offset-2"
          >
            {t('actions.clearAll')}
          </button>
        </div>
      )}

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
              {isLoading ? (
                <TableRowSkeleton columns={columns.map(() => ({ width: 'w-24' }))} rows={8} />
              ) : tabItems.length === 0 ? (
                <tr>
                  <td colSpan={columns.length + 1} className="py-24">
                    <div className="flex flex-col items-center gap-4">
                      <div className="size-16 rounded-2xl bg-gray-50 border border-gray-100 flex items-center justify-center">
                        <Icon style="regular" name="inbox" className="size-7 text-gray-300" />
                      </div>
                      <div className="text-center">
                        <p className="text-sm font-semibold text-gray-700">
                          {hasFilters ? t('empty.noMatchingRecords') : t('empty.noSupportingData')}
                        </p>
                        <p className="text-xs text-gray-400 mt-1">
                          {hasFilters
                            ? t('empty.tryAdjusting')
                            : activeTab === 'archived'
                              ? t('empty.archivedItems')
                              : t('empty.importedItems')}
                        </p>
                      </div>
                      {hasFilters && (
                        <button
                          onClick={() => setSearchTerm('')}
                          className="text-xs text-primary hover:underline font-medium"
                        >
                          {t('actions.clearSearch')}
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ) : (
                tabItems.map(item => (
                  <tr
                    key={item.id}
                    onDoubleClick={() => handleRowClick(item)}
                    className="group hover:bg-gray-50 cursor-default transition-colors"
                    onContextMenu={e => {
                      e.preventDefault();
                      setContextMenu({
                        visible: true,
                        x: e.clientX,
                        y: e.clientY,
                        supportingId: item?.id ?? null,
                        status: item?.status ?? null,
                      });
                    }}
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
                          onClick={isSticky ? e => e.stopPropagation() : undefined}
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

        {/* Context menu */}
        {contextMenu.visible && (
          <div
            ref={contextMenuRef}
            className="fixed bg-white rounded-xl shadow-xl border border-gray-100 py-1 z-50 min-w-[160px]"
            style={{ top: contextMenu.y, left: contextMenu.x }}
          >
            <button
              onClick={() => {
                const item = allItems.find(t => t.id === contextMenu.supportingId);
                if (item) handleRowClick(item);
                setContextMenu(p => ({ ...p, visible: false }));
              }}
              className="w-full px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2.5 rounded-lg mx-1"
              style={{ width: 'calc(100% - 8px)' }}
            >
              <Icon
                style="regular"
                name="arrow-up-right-from-square"
                className="size-3.5 text-gray-400"
              />
              {t('actions.open')}
            </button>
            {hasAuthorityToRemove && REMOVABLE_STATUSES.has(contextMenu.status ?? '') && (
              <button
                onClick={() => {
                  const item = allItems.find(t => t.id === contextMenu.supportingId);
                  if (item?.id) handleRowRemove(item);
                  setContextMenu(p => ({ ...p, visible: false }));
                }}
                className="w-full px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2.5 rounded-lg mx-1"
                style={{ width: 'calc(100% - 8px)' }}
              >
                <Icon style="regular" name="trash" className="size-3.5 text-gray-400" />
                {t('common:actions.delete')}
              </button>
            )}
          </div>
        )}

        {/* Delete confirmation */}
        <ConfirmDialog
          isOpen={deleteConfirm.isOpen}
          onClose={() => setDeleteConfirm({ isOpen: false, id: null })}
          onConfirm={confirmDelete}
          title={t('confirm.deleteTitle')}
          message={t('confirm.deleteMessage')}
          confirmText={t('common:actions.delete')}
          cancelText={t('common:actions.cancel')}
          variant="danger"
        />
      </div>
    </div>
  );
}
