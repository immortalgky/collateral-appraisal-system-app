import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import Icon from '@/shared/components/Icon';
import Input from '@/shared/components/Input';
import Pagination from '@/shared/components/Pagination';
import Button from '@/shared/components/Button';
import { TableRowSkeleton } from '@/shared/components/Skeleton';
import { Dropdown } from '@/shared/components/inputs';
import { formatLocaleDate } from '@/shared/utils/dateUtils';
import { useParameterOptions, useParametersByGroup } from '@/shared/utils/parameterUtils';
import {
  useGetBlockUnitMaintenanceList,
  type GetBlockUnitMaintenanceListParams,
} from '../api/blockUnitMaintenance';
import type { ProjectType } from '../types';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function useDebounce<T>(value: T, ms: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), ms);
    return () => clearTimeout(timer);
  }, [value, ms]);
  return debounced;
}

// ─── SortableTh ───────────────────────────────────────────────────────────────

const SortableTh = ({
  field,
  sortBy,
  sortDir,
  onSort,
  align = 'left',
  children,
}: {
  field: string;
  sortBy: string | null;
  sortDir: 'asc' | 'desc';
  onSort: (f: string) => void;
  align?: 'left' | 'center' | 'right';
  children: React.ReactNode;
}) => {
  const isActive = sortBy === field;
  const alignCls =
    align === 'right' ? 'text-right' : align === 'center' ? 'text-center' : 'text-left';
  const flexAlign =
    align === 'right' ? 'flex-row-reverse' : align === 'center' ? 'justify-center' : '';
  const iconName = isActive ? (sortDir === 'asc' ? 'sort-up' : 'sort-down') : 'sort';
  return (
    <th
      onClick={() => onSort(field)}
      className={`font-medium px-4 py-2.5 whitespace-nowrap select-none cursor-pointer hover:text-gray-900 ${alignCls} ${
        isActive ? 'text-primary' : 'text-gray-600'
      }`}
    >
      <div className={`inline-flex items-center gap-1 ${flexAlign}`}>
        <span>{children}</span>
        <Icon
          style="solid"
          name={iconName}
          className={`size-2.5 ${isActive ? 'text-primary' : 'text-gray-300'}`}
        />
      </div>
    </th>
  );
};

// ─── Main Page ────────────────────────────────────────────────────────────────

const TOTAL_COLS = 7; // number of <td/th> columns in the listing table

const BlockUnitMaintenancePage = () => {
  const navigate = useNavigate();
  const { i18n, t } = useTranslation('blockUnitMaintenance');

  const [pageNumber, setPageNumber] = useState(0);
  const [pageSize, setPageSize] = useState(20);
  const [search, setSearch] = useState('');
  const [projectType, setProjectType] = useState<ProjectType | null>(null);
  const [developer, setDeveloper] = useState('');
  const [sortBy, setSortBy] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');

  const debouncedSearch = useDebounce(search, 300);
  const debouncedDeveloper = useDebounce(developer, 300);

  const params: GetBlockUnitMaintenanceListParams = {
    pageNumber,
    pageSize,
    ...(debouncedSearch && { search: debouncedSearch }),
    ...(projectType && { projectType }),
    ...(debouncedDeveloper && { developer: debouncedDeveloper }),
    ...(sortBy && { sortBy }),
    ...(sortBy && { sortDir }),
  };

  const { data, isLoading, isFetching, isError, error } = useGetBlockUnitMaintenanceList(params);

  const items = data?.items ?? [];
  const totalCount = data?.totalCount ?? 0;
  const totalPages = Math.ceil(totalCount / pageSize);

  const isFirstLoad = isLoading && items.length === 0;
  const isRefetching = isFetching && !isFirstLoad;

  const toggleSort = (field: string) => {
    if (sortBy !== field) {
      setSortBy(field);
      setSortDir('asc');
    } else if (sortDir === 'asc') {
      setSortDir('desc');
    } else {
      setSortBy(null);
      setSortDir('asc');
    }
    setPageNumber(0);
  };

  const hasActiveFilters = !!debouncedSearch || !!projectType || !!debouncedDeveloper;

  // ProjectType options sourced from the parameter store (group: 'ProjectType').
  // Values are codes ('U', 'LB', 'L') which the API filter accepts directly.
  const projectTypeOptions = useParameterOptions('ProjectType');
  // Lookup map for per-row description without per-row hook calls.
  const projectTypeParams = useParametersByGroup('ProjectType');
  const projectTypeDescMap = new Map(projectTypeParams.map(p => [p.code, p.description]));

  if (isError) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-4">
        <Icon style="solid" name="triangle-exclamation" className="size-12 text-red-500" />
        <p className="text-gray-600">{t('errors.loadFailed')}</p>
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
            <h3 className="text-sm font-semibold text-gray-900">{t('list.title')}</h3>
            <span className="px-2 py-0.5 text-xs font-medium bg-gray-100 text-gray-600 rounded-full">
              {totalCount}
            </span>
          </div>
          <p className="text-xs text-gray-500 mt-0.5">{t('list.subtitle')}</p>
        </div>
      </div>

      {/* Filter bar */}
      <div className="shrink-0 flex flex-wrap items-end gap-2">
        <div className="w-72">
          <Input
            placeholder={t('list.filter.searchPlaceholder')}
            value={search}
            onChange={e => {
              setSearch(e.target.value);
              setPageNumber(0);
            }}
            leftIcon={<Icon style="solid" name="magnifying-glass" className="size-3.5" />}
          />
        </div>
        <div className="w-44">
          <Dropdown
            label={t('list.projectType.label')}
            placeholder={t('list.projectType.placeholder')}
            options={projectTypeOptions}
            value={projectType ?? undefined}
            showValuePrefix={false}
            onChange={(val: string | null) => {
              setProjectType((val as ProjectType | null) ?? null);
              setPageNumber(0);
            }}
          />
        </div>
        <div className="w-56">
          <Input
            placeholder={t('list.filter.developerPlaceholder')}
            value={developer}
            onChange={e => {
              setDeveloper(e.target.value);
              setPageNumber(0);
            }}
            leftIcon={<Icon style="solid" name="building" className="size-3.5" />}
          />
        </div>
        {hasActiveFilters && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setSearch('');
              setProjectType(null);
              setDeveloper('');
              setPageNumber(0);
            }}
          >
            <Icon style="regular" name="xmark" className="size-3.5 mr-1" />
            {t('list.clearFilters')}
          </Button>
        )}
      </div>

      {/* Table card */}
      <div className="flex-1 min-h-0 bg-white rounded-lg border border-gray-200 overflow-hidden flex flex-col">
        <div className="flex-1 min-h-0 overflow-auto">
          <table className="w-full text-sm table-fixed">
            <colgroup>
              <col className="w-36" />
              <col className="w-48" />
              <col className="w-40" />
              <col className="w-32" />
              <col className="w-64" />
              <col className="w-32" />
              <col className="w-28" />
            </colgroup>
            <thead className="bg-gray-50 sticky top-0 z-10 shadow-[0_1px_3px_rgba(0,0,0,0.05)]">
              <tr className="border-b border-gray-200">
                <SortableTh
                  field="appraisalReportNo"
                  sortBy={sortBy}
                  sortDir={sortDir}
                  onSort={toggleSort}
                >
                  {t('list.col.reportNo')}
                </SortableTh>
                <SortableTh
                  field="projectName"
                  sortBy={sortBy}
                  sortDir={sortDir}
                  onSort={toggleSort}
                >
                  {t('list.col.projectName')}
                </SortableTh>
                <th className="font-medium px-4 py-2.5 text-gray-600 text-left whitespace-nowrap">
                  {t('list.col.projectType')}
                </th>
                <SortableTh field="developer" sortBy={sortBy} sortDir={sortDir} onSort={toggleSort}>
                  {t('list.col.developer')}
                </SortableTh>
                <SortableTh field="soldUnits" sortBy={sortBy} sortDir={sortDir} onSort={toggleSort}>
                  {t('list.col.salesProgress')}
                </SortableTh>
                <SortableTh field="updatedOn" sortBy={sortBy} sortDir={sortDir} onSort={toggleSort}>
                  {t('list.col.updatedOn')}
                </SortableTh>
                <SortableTh field="updatedBy" sortBy={sortBy} sortDir={sortDir} onSort={toggleSort}>
                  {t('list.col.updatedBy')}
                </SortableTh>
              </tr>
            </thead>
            <tbody
              className={`divide-y divide-gray-100 ${isRefetching ? 'opacity-50 pointer-events-none' : ''}`}
            >
              {isFirstLoad ? (
                <TableRowSkeleton
                  columns={[
                    { width: 'w-24' },
                    { width: 'w-36' },
                    { width: 'w-32' },
                    { width: 'w-28' },
                    { width: 'w-48' },
                    { width: 'w-20' },
                    { width: 'w-20' },
                  ]}
                  rows={5}
                />
              ) : items.length === 0 ? (
                <tr>
                  <td colSpan={TOTAL_COLS} className="text-center py-16">
                    <div className="flex flex-col items-center gap-2">
                      <Icon style="regular" name="folder-open" className="size-10 text-gray-300" />
                      <p className="text-gray-500 font-medium">{t('list.empty')}</p>
                      <p className="text-xs text-gray-400">
                        {hasActiveFilters ? t('list.tryFilters') : t('list.emptyHint')}
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                items.map(item => {
                  const total = item.totalUnits ?? 0;
                  const sold = item.soldUnits ?? 0;
                  const pct = total > 0 ? Math.round((sold / total) * 100) : 0;
                  return (
                    <tr
                      key={item.projectId}
                      className="hover:bg-gray-50 cursor-pointer transition-colors"
                      onClick={() =>
                        navigate(`/standalone/block-unit-maintenance/${item.projectId}`)
                      }
                    >
                      <td className="px-4 py-2.5">
                        <span className="font-medium text-primary text-xs">
                          {item.appraisalReportNo ?? '—'}
                        </span>
                      </td>
                      <td className="px-4 py-2.5 text-gray-700 truncate">
                        {item.projectName ?? '—'}
                      </td>
                      <td className="px-4 py-2.5 text-gray-700">
                        {projectTypeDescMap.get(item.projectType) ?? item.projectType}
                      </td>
                      <td className="px-4 py-2.5 text-gray-600 truncate">
                        {item.developer ?? '—'}
                      </td>
                      <td className="px-4 py-2.5">
                        <div className="flex items-center gap-2">
                          <div className="flex-1 h-2 rounded-full bg-gray-100 overflow-hidden">
                            <div
                              className="h-full bg-gradient-to-r from-violet-400 to-indigo-500 transition-[width]"
                              style={{ width: `${pct}%` }}
                              role="progressbar"
                              aria-valuenow={pct}
                              aria-valuemin={0}
                              aria-valuemax={100}
                            />
                          </div>
                          <span className="text-[11px] tabular-nums text-gray-600 whitespace-nowrap">
                            {sold} / {total}
                            <span className="text-gray-400 ml-1">({pct}%)</span>
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-2.5 text-gray-500 text-xs whitespace-nowrap">
                        {formatLocaleDate(item.updatedOn, i18n.language)}
                      </td>
                      <td className="px-4 py-2.5 text-gray-600 text-xs truncate">
                        {item.updatedBy ?? '—'}
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

        {/* Pagination */}
        {totalCount > 0 && (
          <div className="shrink-0 border-t border-gray-200">
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
        )}
      </div>
    </div>
  );
};

export default BlockUnitMaintenancePage;
