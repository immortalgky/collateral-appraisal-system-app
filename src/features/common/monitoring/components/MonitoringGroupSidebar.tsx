import { useTranslation } from 'react-i18next';
import Icon from '@shared/components/Icon';
import type { MonitoringGroupRow, GroupByField } from '../api/types';

interface MonitoringGroupSidebarProps {
  groups: MonitoringGroupRow[];
  isLoading: boolean;
  groupBy: GroupByField;
  activeKey: string | null;
  onSelect: (group: MonitoringGroupRow | null) => void;
}

const GROUP_BY_LABEL_KEY: Record<GroupByField, 'common.groupBy.pic' | 'common.groupBy.company' | 'common.groupBy.activity'> = {
  pic: 'common.groupBy.pic',
  company: 'common.groupBy.company',
  activity: 'common.groupBy.activity',
};

function MonitoringGroupSidebar({
  groups,
  isLoading,
  groupBy,
  activeKey,
  onSelect,
}: MonitoringGroupSidebarProps) {
  const { t } = useTranslation('monitoring');

  return (
    <aside className="shrink-0 w-60 border-r border-gray-200 bg-gray-50 flex flex-col min-h-0">
      {/* Header */}
      <div className="shrink-0 px-3 py-2.5 border-b border-gray-200 bg-white">
        <p className="text-[10px] font-medium tracking-wider uppercase text-gray-500">
          {t('common.groupBy.label')}
        </p>
        <p className="text-sm font-semibold text-gray-800 mt-0.5">
          {t(GROUP_BY_LABEL_KEY[groupBy])}
        </p>
      </div>

      {/* Body */}
      <div className="flex-1 min-h-0 overflow-auto">
        {isLoading ? (
          <div className="p-3 space-y-2">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-9 bg-gray-100 animate-pulse rounded" />
            ))}
          </div>
        ) : groups.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 px-4 gap-2">
            <Icon style="regular" name="inbox" className="size-6 text-gray-300" />
            <p className="text-xs text-gray-400 text-center">{t('common.noRecords')}</p>
          </div>
        ) : (
          <ul className="py-1">
            {groups.map(group => {
              const isActive = activeKey === group.key;
              return (
                <li key={group.key}>
                  <button
                    type="button"
                    onClick={() => onSelect(isActive ? null : group)}
                    className={`w-full flex items-center justify-between gap-2 px-3 py-2 text-left transition-colors ${
                      isActive
                        ? 'bg-white border-l-2 border-primary text-primary'
                        : 'border-l-2 border-transparent text-gray-700 hover:bg-white'
                    }`}
                  >
                    <span className="text-xs font-medium truncate flex-1 min-w-0">
                      {group.label || group.key}
                    </span>
                    <span className="shrink-0 flex items-center gap-1.5">
                      {group.breached > 0 && (
                        <span
                          className="inline-flex items-center gap-0.5 text-[10px] font-semibold tabular-nums text-red-600"
                          title={`${group.breached} breached`}
                        >
                          <span className="size-1.5 rounded-full bg-red-500" />
                          {group.breached}
                        </span>
                      )}
                      {group.atRisk > 0 && (
                        <span
                          className="inline-flex items-center gap-0.5 text-[10px] font-semibold tabular-nums text-amber-600"
                          title={`${group.atRisk} at risk`}
                        >
                          <span className="size-1.5 rounded-full bg-amber-500" />
                          {group.atRisk}
                        </span>
                      )}
                      <span className="text-xs font-semibold tabular-nums text-gray-700 ml-1">
                        {group.count}
                      </span>
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </aside>
  );
}

export default MonitoringGroupSidebar;
