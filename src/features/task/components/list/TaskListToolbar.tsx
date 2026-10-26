import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import Icon from '@/shared/components/Icon';
import Input from '@/shared/components/Input';
import FilterChipBar from '@/features/appraisal/components/search/FilterChipBar';
import type { FilterField } from '@/features/appraisal/components/search/tabConfigs';
import type { GroupByField } from '../../types';
import { GROUP_BY_VALUES } from './taskFilters';
import { TOOLBAR_CONTROL_H } from './rowMarks';

export type ViewMode = 'grid' | 'list';

const VIEW_OPTIONS = [
  { value: 'list', icon: 'list', labelKey: 'task:view.table' },
  { value: 'grid', icon: 'grid-2', labelKey: 'task:view.board' },
] as const;

interface TaskListToolbarProps {
  searchTerm: string;
  onSearchChange: (value: string) => void;
  /** A search is typed or in flight: the magnifier turns into a spinner. */
  isSearching: boolean;

  fields: FilterField[];
  values: Record<string, string>;
  onFilterChange: (key: string, value: string) => void;
  onFilterRemove: (key: string) => void;
  onFilterClear: () => void;
  /** The filters drawn as a chip even when unset; the rest are added from "add filter". */
  pinnedFilters: string[];
  /** The filters are drawn as chips (no panel beside the table). */
  showChips: boolean;

  /** There is room for the filter panel, so the button that shows and hides it is offered. */
  canDock: boolean;
  panelOpen: boolean;
  onTogglePanel: () => void;
  /** Filters in force, for the panel button's badge. */
  activeFilterCount: number;

  viewMode: ViewMode;
  onViewModeChange: (mode: ViewMode) => void;
  groupBy: GroupByField;
  onGroupByChange: (groupBy: GroupByField) => void;
  /** The column picker (table view only). */
  columnsControl: ReactNode;
}

/**
 * One line: search on the left, then the filter chips (or nothing, when the panel carries the
 * filters), then the table's own controls on the right. It never wraps; chips that do not fit fold
 * into "more +N".
 */
export function TaskListToolbar({
  searchTerm,
  onSearchChange,
  isSearching,
  fields,
  values,
  onFilterChange,
  onFilterRemove,
  onFilterClear,
  pinnedFilters,
  showChips,
  canDock,
  panelOpen,
  onTogglePanel,
  activeFilterCount,
  viewMode,
  onViewModeChange,
  groupBy,
  onGroupByChange,
  columnsControl,
}: TaskListToolbarProps) {
  const { t } = useTranslation(['task', 'common']);
  const panelTitle = panelOpen ? t('task:panel.hideTitle') : t('task:panel.showTitle');
  return (
    <div className="flex shrink-0 flex-nowrap items-center gap-2.5 border-b border-gray-100 px-4 py-3">
      {canDock && (
        <button
          type="button"
          aria-pressed={panelOpen}
          title={panelTitle}
          onClick={onTogglePanel}
          className={`inline-flex ${TOOLBAR_CONTROL_H} shrink-0 items-center gap-2 rounded-lg border px-3 text-sm font-medium whitespace-nowrap transition-colors ${
            panelOpen
              ? 'border-primary bg-primary-50 text-primary-700'
              : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300'
          }`}
        >
          <Icon style="solid" name="sliders" className="text-xs" />
          {t('task:panel.toggle')}
          {activeFilterCount > 0 && (
            <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1 text-xs font-semibold text-white tabular-nums">
              {activeFilterCount}
            </span>
          )}
        </button>
      )}

      <div role="search" className="w-68 shrink-0">
        <Input
          type="search"
          value={searchTerm}
          onChange={e => onSearchChange(e.target.value)}
          placeholder={t('task:search.placeholder')}
          aria-label={t('task:search.placeholder')}
          leftIcon={
            <Icon
              style="solid"
              name={isSearching ? 'spinner' : 'magnifying-glass'}
              className={isSearching ? 'size-3.5! animate-spin text-primary' : 'size-3.5!'}
            />
          }
        />
      </div>

      {showChips ? (
        <FilterChipBar
          singleLine
          className="relative flex min-w-0 flex-1 flex-nowrap items-center gap-2"
          filters={fields}
          values={values}
          pinned={pinnedFilters}
          onChange={onFilterChange}
          onRemove={onFilterRemove}
          onClear={onFilterClear}
        />
      ) : (
        <div className="flex-1" />
      )}

      <div className={`flex ${TOOLBAR_CONTROL_H} shrink-0 items-center gap-2`}>
        {viewMode === 'grid' ? (
          <label className="flex items-center gap-2 text-xs text-gray-500">
            {t('task:view.groupBy')}
            <select
              value={groupBy}
              onChange={e => onGroupByChange(e.target.value as GroupByField)}
              className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20"
            >
              {GROUP_BY_VALUES.map(value => (
                <option key={value} value={value}>
                  {t(`task:view.groupByOptions.${value}`)}
                </option>
              ))}
            </select>
          </label>
        ) : (
          columnsControl
        )}
        {/* Two square segments in a bordered box, like the columns button beside it */}
        <div
          role="group"
          aria-label={t('task:view.label')}
          className="flex h-full shrink-0 divide-x divide-gray-200 rounded-lg border border-gray-200 bg-white"
        >
          {VIEW_OPTIONS.map(({ value, icon, labelKey }) => {
            const active = viewMode === value;
            const label = t(labelKey);
            return (
              <button
                key={value}
                type="button"
                aria-pressed={active}
                aria-label={label}
                title={label}
                onClick={() => onViewModeChange(value)}
                className={`flex w-9 cursor-pointer items-center justify-center transition-colors first:rounded-l-md last:rounded-r-md ${
                  active ? 'bg-primary/10 text-primary' : 'text-gray-500 hover:bg-gray-50'
                }`}
              >
                <Icon style="solid" name={icon} />
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
