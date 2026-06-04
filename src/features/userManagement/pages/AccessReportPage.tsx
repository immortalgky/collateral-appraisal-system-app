import { useState } from 'react';
import toast from 'react-hot-toast';
import { useTranslation } from 'react-i18next';
import SectionHeader from '@shared/components/sections/SectionHeader';
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

  const [filters, setFilters] = useState<Omit<GetUserAccessMatrixParams, 'pageNumber' | 'pageSize'>>(
    {
      scope: '',
      companyId: '',
      roleName: '',
      groupId: '',
      teamId: '',
      search: '',
    },
  );

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
    <div className="px-4 sm:px-6 lg:px-8 py-8 h-full flex flex-col">
      <SectionHeader
        title={t('page.accessReport.title')}
        subtitle={t('page.accessReport.subtitle')}
        icon="table-list"
        iconColor="primary"
      />

      {/* Filter bar */}
      <div className="mt-4 bg-white rounded-xl border border-gray-200 shadow-sm p-4">
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {/* Search */}
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">
              {t('filters.search')}
            </label>
            <div className="relative">
              <Icon
                name="magnifying-glass"
                style="regular"
                className="size-3 absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400"
              />
              <input
                type="text"
                value={filters.search}
                onChange={e => handleFilterChange('search', e.target.value)}
                placeholder={t('placeholders.searchByNameOrEmail')}
                className="w-full pl-7 pr-2 py-1.5 text-xs border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
              />
            </div>
          </div>

          {/* Scope */}
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">
              {t('fields.scope')}
            </label>
            <select
              value={filters.scope}
              onChange={e => handleFilterChange('scope', e.target.value)}
              className="w-full text-xs border border-gray-200 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
            >
              <option value="">{t('filters.all')}</option>
              <option value="Bank">{t('tabs.bank')}</option>
              <option value="Company">{t('tabs.company')}</option>
            </select>
          </div>

          {/* Role name */}
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">
              {t('filters.roleName')}
            </label>
            <input
              type="text"
              value={filters.roleName}
              onChange={e => handleFilterChange('roleName', e.target.value)}
              placeholder={t('placeholders.roleName')}
              className="w-full text-xs border border-gray-200 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
            />
          </div>

          {/* Group */}
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">
              {t('filters.group')}
            </label>
            <select
              value={filters.groupId}
              onChange={e => handleFilterChange('groupId', e.target.value)}
              className="w-full text-xs border border-gray-200 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
            >
              <option value="">{t('filters.all')}</option>
              {(groupsData?.items ?? []).map(g => (
                <option key={g.id} value={g.id}>
                  {g.name}
                </option>
              ))}
            </select>
          </div>

          {/* Team */}
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">
              {t('filters.team')}
            </label>
            <select
              value={filters.teamId}
              onChange={e => handleFilterChange('teamId', e.target.value)}
              className="w-full text-xs border border-gray-200 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
            >
              <option value="">{t('filters.all')}</option>
              {(teamsData?.items ?? []).map(tm => (
                <option key={tm.id} value={tm.id}>
                  {tm.name}
                </option>
              ))}
            </select>
          </div>

          {/* Active */}
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">
              {t('fields.status')}
            </label>
            <select
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
              className="w-full text-xs border border-gray-200 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
            >
              <option value="">{t('filters.all')}</option>
              <option value="true">{t('status.active')}</option>
              <option value="false">{t('status.inactive')}</option>
            </select>
          </div>
        </div>
      </div>

      {/* Table + Export */}
      <div className="flex items-center justify-between mt-4 mb-2">
        <p className="text-xs text-gray-500">
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

      <div className="flex-1 bg-white rounded-xl border border-gray-200 shadow-sm flex flex-col min-h-0">
        <div className="flex-1 overflow-auto">
          <table className="w-full text-sm">
            <thead className="sticky top-0 bg-primary/10 z-10">
              <tr>
                <th className="px-4 py-2.5 text-left text-xs font-semibold text-primary whitespace-nowrap">
                  {t('columns.username')}
                </th>
                <th className="px-4 py-2.5 text-left text-xs font-semibold text-primary whitespace-nowrap">
                  {t('columns.fullName')}
                </th>
                <th className="px-4 py-2.5 text-left text-xs font-semibold text-primary whitespace-nowrap">
                  {t('columns.email')}
                </th>
                <th className="px-4 py-2.5 text-left text-xs font-semibold text-primary whitespace-nowrap">
                  {t('columns.scope')}
                </th>
                <th className="px-4 py-2.5 text-left text-xs font-semibold text-primary whitespace-nowrap">
                  {t('fields.status')}
                </th>
                <th className="px-4 py-2.5 text-left text-xs font-semibold text-primary">
                  {t('sections.roles')}
                </th>
                <th className="px-4 py-2.5 text-left text-xs font-semibold text-primary">
                  {t('sections.groups')}
                </th>
                <th className="px-4 py-2.5 text-left text-xs font-semibold text-primary">
                  {t('page.teams.title')}
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {isLoading ? (
                <TableRowSkeleton columns={Array(8).fill({ width: 'w-full' })} rows={10} />
              ) : rows.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-12 text-center text-gray-400 text-sm">
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
                  <tr key={row.userId} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-2.5 text-xs font-medium text-gray-800">
                      {row.userName}
                    </td>
                    <td className="px-4 py-2.5 text-xs text-gray-700">{row.fullName}</td>
                    <td className="px-4 py-2.5 text-xs text-gray-500">{row.email}</td>
                    <td className="px-4 py-2.5">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                          row.scope === 'Bank'
                            ? 'bg-blue-50 text-blue-700'
                            : 'bg-violet-50 text-violet-700'
                        }`}
                      >
                        {row.scope}
                      </span>
                    </td>
                    <td className="px-4 py-2.5">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                          row.isActive
                            ? 'bg-emerald-50 text-emerald-700'
                            : 'bg-gray-100 text-gray-500'
                        }`}
                      >
                        {row.isActive ? t('status.active') : t('status.inactive')}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 text-xs text-gray-600 max-w-[160px]">
                      <CommaSeparatedChips value={row.roles} color="blue" />
                    </td>
                    <td className="px-4 py-2.5 text-xs text-gray-600 max-w-[160px]">
                      <CommaSeparatedChips value={row.groups} color="amber" />
                    </td>
                    <td className="px-4 py-2.5 text-xs text-gray-600 max-w-[160px]">
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
  blue: 'bg-blue-50 text-blue-700',
  amber: 'bg-amber-50 text-amber-700',
  cyan: 'bg-cyan-50 text-cyan-700',
};

const CommaSeparatedChips = ({ value, color }: CommaSeparatedChipsProps) => {
  if (!value) return <span className="text-gray-300">—</span>;
  const items = value
    .split(',')
    .map(s => s.trim())
    .filter(Boolean);
  if (items.length === 0) return <span className="text-gray-300">—</span>;
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
