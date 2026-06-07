import { useTranslation } from 'react-i18next';
import Icon from '@shared/components/Icon';
import type { GetMonitoredTasksParams, SlaStatus } from '../types';

interface TaskMonitorFiltersProps {
  filters: GetMonitoredTasksParams;
  search: string;
  onSearchChange: (value: string) => void;
  onFilterChange: (patch: Partial<GetMonitoredTasksParams>) => void;
  onClearAll: () => void;
}

function TaskMonitorFilters({
  filters,
  search,
  onSearchChange,
  onFilterChange,
  onClearAll,
}: TaskMonitorFiltersProps) {
  const { t } = useTranslation(['taskMonitor', 'common']);

  const slaOptions: { value: SlaStatus; label: string }[] = [
    { value: 'OnTrack', label: t('sla.onTrack') },
    { value: 'AtRisk', label: t('sla.atRisk') },
    { value: 'Breached', label: t('sla.breached') },
  ];

  const activeCount = Object.values(filters).filter(Boolean).length;
  const hasAny = !!search || activeCount > 0;

  return (
    <div className="shrink-0 flex flex-wrap items-center gap-2 mb-3">
      {/* Search */}
      <div className="relative w-56">
        <Icon
          style="solid"
          name="magnifying-glass"
          className="absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-gray-400 pointer-events-none"
        />
        <input
          type="text"
          placeholder={t('filters.searchTasksPlaceholder')}
          value={search}
          onChange={e => onSearchChange(e.target.value)}
          className="w-full pl-9 pr-8 py-2 text-sm bg-gray-50 border border-gray-200 rounded-lg focus:bg-white focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all placeholder:text-gray-400"
        />
        {search && (
          <button
            type="button"
            onClick={() => onSearchChange('')}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
          >
            <Icon style="solid" name="xmark" className="size-3.5" />
          </button>
        )}
      </div>

      {/* SLA filter */}
      <select
        value={filters.sla ?? ''}
        onChange={e => onFilterChange({ sla: (e.target.value as SlaStatus) || undefined })}
        className="px-3 py-2 text-sm border border-gray-200 rounded-lg bg-gray-50 focus:bg-white focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all text-gray-600"
      >
        <option value="">{t('filters.allSla')}</option>
        {slaOptions.map(o => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>

      {/* Group ID filter */}
      <div className="relative">
        <input
          type="text"
          placeholder={t('filters.groupPlaceholder')}
          value={filters.groupId ?? ''}
          onChange={e => onFilterChange({ groupId: e.target.value || undefined })}
          className="w-32 px-3 py-2 text-sm bg-gray-50 border border-gray-200 rounded-lg focus:bg-white focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all placeholder:text-gray-400"
        />
      </div>

      {/* Assignee filter */}
      <div className="relative">
        <input
          type="text"
          placeholder={t('filters.assigneePlaceholder')}
          value={filters.assigneeUsername ?? ''}
          onChange={e => onFilterChange({ assigneeUsername: e.target.value || undefined })}
          className="w-36 px-3 py-2 text-sm bg-gray-50 border border-gray-200 rounded-lg focus:bg-white focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all placeholder:text-gray-400"
        />
      </div>

      {/* Activity ID filter */}
      <div className="relative">
        <input
          type="text"
          placeholder={t('filters.activityPlaceholder')}
          value={filters.activityId ?? ''}
          onChange={e => onFilterChange({ activityId: e.target.value || undefined })}
          className="w-36 px-3 py-2 text-sm bg-gray-50 border border-gray-200 rounded-lg focus:bg-white focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all placeholder:text-gray-400"
        />
      </div>

      {/* Clear all */}
      {hasAny && (
        <button
          type="button"
          onClick={onClearAll}
          className="flex items-center gap-1.5 px-3 py-2 text-sm text-gray-500 border border-gray-200 rounded-lg hover:border-gray-300 hover:text-gray-700 transition-all"
        >
          <Icon style="solid" name="xmark" className="size-3.5" />
          {t('common:actions.clear')}
          {activeCount > 0 && (
            <span className="inline-flex items-center justify-center size-4 rounded-full bg-gray-200 text-gray-600 text-[10px] font-semibold">
              {activeCount}
            </span>
          )}
        </button>
      )}
    </div>
  );
}

export default TaskMonitorFilters;
