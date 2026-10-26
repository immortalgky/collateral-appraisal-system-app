import { useState } from 'react';
import toast from 'react-hot-toast';
import { useTranslation } from 'react-i18next';
import NativeSelect from '@/shared/components/inputs/NativeSelect';
import Button from '@shared/components/Button';
import Icon from '@shared/components/Icon';
import Pagination from '@shared/components/Pagination';
import { TableRowSkeleton } from '@shared/components/Skeleton';
import { useGetUserAccessMatrix, exportUserAccessReport } from '../api/reports';
import { useGetTeams } from '../api/teams';
import { useGetGroups } from '../api/groups';
import type { GetUserAccessMatrixParams } from '../types';

const AccessReportPage = () => {
  const { t } = useTranslation(['userManagement', 'common']);

  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(20);
  const [isExporting, setIsExporting] = useState(false);

  const [filters, setFilters] = useState<
    Omit<GetUserAccessMatrixParams, 'pageNumber' | 'pageSize'>
  >({
    scope: '',
    companyId: '',
    roleName: '',
    groupId: '',
    teamId: '',
    search: '',
  });

  const { data, isLoading } = useGetUserAccessMatrix({
    ...filters,
    pageNumber: page,
    pageSize,
  });

  // Groups and Teams for dropdowns
  const { data: groupsData } = useGetGroups({ pageSize: 200 });
  const { data: teamsData } = useGetTeams({ pageSize: 200 });

  const rows = data?.items ?? [];
  const totalCount = data?.totalCount ?? 0;
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));

  const handleFilterChange = (key: keyof typeof filters, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }));
    setPage(0);
  };

  const handleExport = async () => {
    setIsExporting(true);
    try {
      await exportUserAccessReport(filters);
    } catch {
      toast.error(t('toasts.exportFailed'));
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="h-full flex flex-col min-h-0 min-w-0">
      <div className="shrink-0 flex items-center justify-between">
        <div>
          <div className="flex items-center gap-3">
            <h3 className="text-base font-semibold text-(--palette-ink)">
              {t('page.accessReport.title')}
            </h3>
            <span className="px-2 py-0.5 text-xs font-medium bg-(--palette-surface-3) text-(--palette-gray-600) rounded-full">
              {totalCount}
            </span>
          </div>
          <p className="text-xs text-(--palette-gray-500) mt-0.5">
            {t('page.accessReport.subtitle')}
          </p>
        </div>
      </div>

      {/* Filter bar */}
      <div className="mt-4 bg-(--palette-surface) rounded-xl border border-(--palette-line) shadow-sm p-4">
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {/* Search */}
          <div>
            <label className="block text-xs font-medium text-(--palette-gray-600) mb-1">
              {t('filters.search')}
            </label>
            <div className="relative">
              <Icon
                name="magnifying-glass"
                style="regular"
                className="size-3 absolute left-2.5 top-1/2 -translate-y-1/2 text-(--palette-gray-400)"
              />
              <input
                type="text"
                value={filters.search}
                onChange={e => handleFilterChange('search', e.target.value)}
                placeholder={t('placeholders.searchByNameOrEmail')}
                className="w-full pl-7 pr-2 py-1.5 text-xs border border-(--palette-line) rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
              />
            </div>
          </div>

          {/* Scope */}
          <div>
            <label className="block text-xs font-medium text-(--palette-gray-600) mb-1">
              {t('fields.scope')}
            </label>
            <NativeSelect
              value={filters.scope}
              onChange={e => handleFilterChange('scope', e.target.value)}
              className="w-full"
            >
              <option value="">{t('filters.all')}</option>
              <option value="Bank">{t('tabs.bank')}</option>
              <option value="Company">{t('tabs.company')}</option>
            </NativeSelect>
          </div>

          {/* Role name */}
          <div>
            <label className="block text-xs font-medium text-(--palette-gray-600) mb-1">
              {t('filters.roleName')}
            </label>
            <input
              type="text"
              value={filters.roleName}
              onChange={e => handleFilterChange('roleName', e.target.value)}
              placeholder={t('placeholders.roleName')}
              className="w-full"
            />
          </div>

          {/* Group */}
          <div>
            <label className="block text-xs font-medium text-(--palette-gray-600) mb-1">
              {t('filters.group')}
            </label>
            <NativeSelect
              value={filters.groupId}
              onChange={e => handleFilterChange('groupId', e.target.value)}
              className="w-full"
            >
              <option value="">{t('filters.all')}</option>
              {(groupsData?.items ?? []).map(g => (
                <option key={g.id} value={g.id}>
                  {g.name}
                </option>
              ))}
            </NativeSelect>
          </div>

          {/* Team */}
          <div>
            <label className="block text-xs font-medium text-(--palette-gray-600) mb-1">
              {t('filters.team')}
            </label>
            <NativeSelect
              value={filters.teamId}
              onChange={e => handleFilterChange('teamId', e.target.value)}
              className="w-full"
            >
              <option value="">{t('filters.all')}</option>
              {(teamsData?.items ?? []).map(tm => (
                <option key={tm.id} value={tm.id}>
                  {tm.name}
                </option>
              ))}
            </NativeSelect>
          </div>

          {/* Active */}
          <div>
            <label className="block text-xs font-medium text-(--palette-gray-600) mb-1">
              {t('fields.status')}
            </label>
            <NativeSelect
              value={
                filters.isActive === undefined ? '' : filters.isActive === true ? 'true' : 'false'
              }
              onChange={e => {
                const val = e.target.value;
                setFilters(prev => ({
                  ...prev,
                  isActive: val === '' ? undefined : val === 'true',
                }));
                setPage(0);
              }}
              className="w-full"
            >
              <option value="">{t('filters.all')}</option>
              <option value="true">{t('status.active')}</option>
              <option value="false">{t('status.inactive')}</option>
            </NativeSelect>
          </div>
        </div>
      </div>

      {/* Table + Export */}
      <div className="flex items-center justify-between mt-4 mb-2">
        <p className="text-xs text-(--palette-gray-500)">
          {t('counts.results', { count: totalCount })}
        </p>
        <Button
          variant="outline"
          size="sm"
          isLoading={isExporting}
          onClick={handleExport}
          leftIcon={<Icon name="file-csv" style="regular" className="size-3.5" />}
        >
          {t('buttons.exportCsv')}
        </Button>
      </div>

      <div className="flex-1 bg-(--palette-surface) rounded-xl border border-(--palette-line) shadow-sm flex flex-col min-h-0">
        <div className="flex-1 overflow-auto">
          <table className="w-full text-sm">
            <thead className="sticky top-0 bg-primary/10 z-10">
              <tr>
                <th className="px-4 py-2.5 text-left text-xs font-semibold text-(--palette-primary-text) whitespace-nowrap">
                  {t('columns.username')}
                </th>
                <th className="px-4 py-2.5 text-left text-xs font-semibold text-(--palette-primary-text) whitespace-nowrap">
                  {t('columns.fullName')}
                </th>
                <th className="px-4 py-2.5 text-left text-xs font-semibold text-(--palette-primary-text) whitespace-nowrap">
                  {t('columns.email')}
                </th>
                <th className="px-4 py-2.5 text-left text-xs font-semibold text-(--palette-primary-text) whitespace-nowrap">
                  {t('columns.scope')}
                </th>
                <th className="px-4 py-2.5 text-left text-xs font-semibold text-(--palette-primary-text) whitespace-nowrap">
                  {t('fields.status')}
                </th>
                <th className="px-4 py-2.5 text-left text-xs font-semibold text-(--palette-primary-text)">
                  {t('sections.roles')}
                </th>
                <th className="px-4 py-2.5 text-left text-xs font-semibold text-(--palette-primary-text)">
                  {t('sections.groups')}
                </th>
                <th className="px-4 py-2.5 text-left text-xs font-semibold text-(--palette-primary-text)">
                  {t('page.teams.title')}
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-(--palette-line-soft)">
              {isLoading ? (
                <TableRowSkeleton columns={Array(8).fill({ width: 'w-full' })} rows={10} />
              ) : rows.length === 0 ? (
                <tr>
                  <td
                    colSpan={8}
                    className="px-4 py-12 text-center text-(--palette-gray-400) text-sm"
                  >
                    <Icon
                      name="table-list"
                      style="regular"
                      className="size-8 mx-auto mb-2 opacity-30"
                    />
                    {t('empty.noResults')}
                  </td>
                </tr>
              ) : (
                rows.map(row => (
                  <tr key={row.userId} className="hover:bg-(--palette-surface-2) transition-colors">
                    <td className="px-4 py-2.5 text-xs font-medium text-(--palette-ink)">
                      {row.userName}
                    </td>
                    <td className="px-4 py-2.5 text-xs text-(--palette-ink)">{row.fullName}</td>
                    <td className="px-4 py-2.5 text-xs text-(--palette-gray-500)">{row.email}</td>
                    <td className="px-4 py-2.5">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                          row.scope === 'Bank'
                            ? 'bg-blue-50 dark:bg-blue-500/10 text-blue-700 dark:text-blue-300'
                            : 'bg-violet-50 dark:bg-violet-500/10 text-violet-700 dark:text-violet-300'
                        }`}
                      >
                        {row.scope}
                      </span>
                    </td>
                    <td className="px-4 py-2.5">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                          row.isActive
                            ? 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-300'
                            : 'bg-(--palette-surface-3) text-(--palette-gray-500)'
                        }`}
                      >
                        {row.isActive ? t('status.active') : t('status.inactive')}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 text-xs text-(--palette-gray-600) max-w-[160px]">
                      <CommaSeparatedChips value={row.roles} color="blue" />
                    </td>
                    <td className="px-4 py-2.5 text-xs text-(--palette-gray-600) max-w-[160px]">
                      <CommaSeparatedChips value={row.groups} color="amber" />
                    </td>
                    <td className="px-4 py-2.5 text-xs text-(--palette-gray-600) max-w-[160px]">
                      <CommaSeparatedChips value={row.teams} color="cyan" />
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <Pagination
          currentPage={page}
          totalPages={totalPages}
          totalCount={totalCount}
          pageSize={pageSize}
          onPageChange={setPage}
          onPageSizeChange={size => {
            setPageSize(size);
            setPage(0);
          }}
        />
      </div>
    </div>
  );
};

interface CommaSeparatedChipsProps {
  value: string;
  color: 'blue' | 'amber' | 'cyan';
}

const chipColorMap: Record<string, string> = {
  blue: 'bg-blue-50 dark:bg-blue-500/10 text-blue-700 dark:text-blue-300',
  amber: 'bg-(--palette-warn-wash) text-(--palette-warn)',
  cyan: 'bg-cyan-50 dark:bg-cyan-500/10 text-cyan-700 dark:text-cyan-300',
};

const CommaSeparatedChips = ({ value, color }: CommaSeparatedChipsProps) => {
  if (!value) return <span className="text-(--palette-gray-300)">—</span>;
  const items = value
    .split(',')
    .map(s => s.trim())
    .filter(Boolean);
  if (items.length === 0) return <span className="text-(--palette-gray-300)">—</span>;
  return (
    <div className="flex flex-wrap gap-1">
      {items.map((item, i) => (
        <span
          key={i}
          className={`inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium ${chipColorMap[color]}`}
        >
          {item}
        </span>
      ))}
    </div>
  );
};

export default AccessReportPage;
