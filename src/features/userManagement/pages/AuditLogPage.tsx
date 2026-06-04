import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import SectionHeader from '@shared/components/sections/SectionHeader';
import Icon from '@shared/components/Icon';
import Pagination from '@shared/components/Pagination';
import { TableRowSkeleton } from '@shared/components/Skeleton';
import { formatLocaleDateTime } from '@shared/utils/dateUtils';
import { useGetAuditLogs } from '../api/auditLogs';
import type { AuditAction, AuditEntityType, GetAuditLogsParams } from '../types';

const ENTITY_TYPES: AuditEntityType[] = ['User', 'Role', 'Permission', 'Group', 'Team'];
const ACTIONS: AuditAction[] = ['Created', 'Updated', 'Deleted', 'AssignmentChanged'];

interface ChangesJsonParsed {
  setName?: string;
  added?: string[];
  removed?: string[];
  [key: string]: unknown;
}

const parseChanges = (raw: string | null): ChangesJsonParsed | null => {
  if (!raw) return null;
  try {
    return JSON.parse(raw) as ChangesJsonParsed;
  } catch {
    return null;
  }
};

const ChangesCell = ({ changesJson }: { changesJson: string | null }) => {
  const parsed = parseChanges(changesJson);
  if (!parsed) return <span className="text-gray-400 text-xs">—</span>;

  if (parsed.added !== undefined || parsed.removed !== undefined) {
    const added = parsed.added ?? [];
    const removed = parsed.removed ?? [];
    return (
      <div className="flex flex-wrap gap-1">
        {parsed.setName && (
          <span className="text-xs text-gray-500 mr-1">{parsed.setName}:</span>
        )}
        {added.map((val, i) => (
          <span
            key={`add-${i}`}
            className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-emerald-50 text-emerald-700"
          >
            +{val}
          </span>
        ))}
        {removed.map((val, i) => (
          <span
            key={`rem-${i}`}
            className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-red-50 text-red-600"
          >
            -{val}
          </span>
        ))}
        {added.length === 0 && removed.length === 0 && (
          <span className="text-gray-400 text-xs">—</span>
        )}
      </div>
    );
  }

  // Generic key-value display
  const entries = Object.entries(parsed).slice(0, 4);
  return (
    <div className="flex flex-wrap gap-1">
      {entries.map(([k, v]) => (
        <span key={k} className="text-xs text-gray-600">
          <span className="text-gray-400">{k}:</span> {String(v ?? '—')}
        </span>
      ))}
    </div>
  );
};

const actionBadgeClass: Record<AuditAction, string> = {
  Created: 'bg-emerald-50 text-emerald-700',
  Updated: 'bg-blue-50 text-blue-700',
  Deleted: 'bg-red-50 text-red-700',
  AssignmentChanged: 'bg-amber-50 text-amber-700',
};

const AuditLogPage = () => {
  const { t, i18n } = useTranslation(['userManagement', 'common']);

  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(20);

  const [filters, setFilters] = useState<Omit<GetAuditLogsParams, 'pageNumber' | 'pageSize'>>({
    entityType: '',
    action: '',
    actorUserId: '',
    from: '',
    to: '',
  });

  const { data, isLoading } = useGetAuditLogs({
    ...filters,
    pageNumber: page,
    pageSize,
  });

  const rows = data?.items ?? [];
  const totalCount = data?.totalCount ?? 0;
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));

  const handleFilterChange = (key: keyof typeof filters, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }));
    setPage(0);
  };

  return (
    <div className="px-4 sm:px-6 lg:px-8 py-8 h-full flex flex-col">
      <SectionHeader
        title={t('page.auditLogs.title')}
        subtitle={t('page.auditLogs.subtitle')}
        icon="clock-rotate-left"
        iconColor="purple"
      />

      {/* Filter bar */}
      <div className="mt-4 bg-white rounded-xl border border-gray-200 shadow-sm p-4">
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          {/* Entity Type */}
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">
              {t('filters.entityType')}
            </label>
            <select
              value={filters.entityType}
              onChange={e => handleFilterChange('entityType', e.target.value)}
              className="w-full text-xs border border-gray-200 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
            >
              <option value="">{t('filters.all')}</option>
              {ENTITY_TYPES.map(et => (
                <option key={et} value={et}>
                  {et}
                </option>
              ))}
            </select>
          </div>

          {/* Action */}
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">
              {t('filters.action')}
            </label>
            <select
              value={filters.action}
              onChange={e => handleFilterChange('action', e.target.value)}
              className="w-full text-xs border border-gray-200 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
            >
              <option value="">{t('filters.all')}</option>
              {ACTIONS.map(a => (
                <option key={a} value={a}>
                  {a}
                </option>
              ))}
            </select>
          </div>

          {/* Actor */}
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">
              {t('filters.actor')}
            </label>
            <div className="relative">
              <Icon
                name="magnifying-glass"
                style="regular"
                className="size-3 absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400"
              />
              <input
                type="text"
                value={filters.actorUserId}
                onChange={e => handleFilterChange('actorUserId', e.target.value)}
                placeholder={t('placeholders.searchActor')}
                className="w-full pl-7 pr-2 py-1.5 text-xs border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
              />
            </div>
          </div>

          {/* From */}
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">
              {t('filters.from')}
            </label>
            <input
              type="date"
              value={filters.from}
              onChange={e => handleFilterChange('from', e.target.value)}
              className="w-full text-xs border border-gray-200 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
            />
          </div>

          {/* To */}
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">
              {t('filters.to')}
            </label>
            <input
              type="date"
              value={filters.to}
              onChange={e => handleFilterChange('to', e.target.value)}
              className="w-full text-xs border border-gray-200 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
            />
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="flex-1 mt-4 bg-white rounded-xl border border-gray-200 shadow-sm flex flex-col min-h-0">
        <div className="flex-1 overflow-auto">
          <table className="w-full text-sm">
            <thead className="sticky top-0 bg-primary/10 z-10">
              <tr>
                <th className="px-4 py-2.5 text-left text-xs font-semibold text-primary whitespace-nowrap">
                  {t('columns.when')}
                </th>
                <th className="px-4 py-2.5 text-left text-xs font-semibold text-primary whitespace-nowrap">
                  {t('columns.actor')}
                </th>
                <th className="px-4 py-2.5 text-left text-xs font-semibold text-primary whitespace-nowrap">
                  {t('columns.action')}
                </th>
                <th className="px-4 py-2.5 text-left text-xs font-semibold text-primary whitespace-nowrap">
                  {t('columns.entityType')}
                </th>
                <th className="px-4 py-2.5 text-left text-xs font-semibold text-primary whitespace-nowrap">
                  {t('columns.entityName')}
                </th>
                <th className="px-4 py-2.5 text-left text-xs font-semibold text-primary">
                  {t('columns.changes')}
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {isLoading ? (
                <TableRowSkeleton columns={Array(6).fill({ width: 'w-full' })} rows={10} />
              ) : rows.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center text-gray-400 text-sm">
                    <Icon
                      name="clock-rotate-left"
                      style="regular"
                      className="size-8 mx-auto mb-2 opacity-30"
                    />
                    {t('empty.noAuditLogs')}
                  </td>
                </tr>
              ) : (
                rows.map(row => (
                  <tr key={row.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-2.5 text-gray-600 text-xs whitespace-nowrap">
                      {formatLocaleDateTime(row.occurredAt, i18n.language)}
                    </td>
                    <td className="px-4 py-2.5">
                      <div className="text-xs font-medium text-gray-800">{row.actorName}</div>
                      <div className="text-xs text-gray-400">{row.actorUserId}</div>
                    </td>
                    <td className="px-4 py-2.5">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${actionBadgeClass[row.action] ?? 'bg-gray-100 text-gray-600'}`}
                      >
                        {row.action}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 text-xs text-gray-600">{row.entityType}</td>
                    <td className="px-4 py-2.5 text-xs font-medium text-gray-800">
                      {row.entityName}
                    </td>
                    <td className="px-4 py-2.5 max-w-xs">
                      <ChangesCell changesJson={row.changesJson} />
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

export default AuditLogPage;
