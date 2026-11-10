import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import Icon from '@/shared/components/Icon';
import Input from '@/shared/components/Input';
import { neutralToolButtonClass } from '@/shared/components/columnLayout';
import FilterChipBar from '@/features/appraisal/components/search/FilterChipBar';
import type { FilterField } from '@/features/appraisal/components/search/tabConfigs';
import type { FilterPinControls } from '@/features/appraisal/components/search/FilterPinPicker';
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
  /** Lets the user choose and order `pinnedFilters` from the "add filter" menu. */
  filterPinControls?: FilterPinControls;
  /** Every filter is offered as a chip (no panel beside the table); otherwise only those in force. */
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
  /** How many tasks the search and filters leave; null hides it (not known yet, or the board). */
  shownCount: number | null;
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
  filterPinControls,
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
  shownCount,
}: TaskListToolbarProps) {
  const { t } = useTranslation(['task', 'common']);
  const panelTitle = panelOpen ? t('task:panel.hideTitle') : t('task:panel.showTitle');
  return (
    <div className="flex shrink-0 flex-nowrap items-center gap-2.5 border-b border-gray-100 px-4 py-3">
      {canDock && (
        // Icon only, like the column picker; the count of filters in force sits on its corner. The
        // wrapper gives the button's h-full the toolbar's control height, as the picker's does.
        <div className={`flex ${TOOLBAR_CONTROL_H} shrink-0`}>
          <button
            type="button"
            aria-pressed={panelOpen}
            aria-label={
              activeFilterCount > 0
                ? `${t('task:panel.toggle')} (${activeFilterCount})`
                : t('task:panel.toggle')
            }
            title={panelTitle}
            onClick={onTogglePanel}
            className={neutralToolButtonClass(panelOpen)}
          >
            <Icon style="solid" name="sidebar" className="size-4" />
            {activeFilterCount > 0 && (
              <span
                aria-hidden
                className="absolute -top-1.5 -right-1.5 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1 text-xs font-semibold text-white tabular-nums"
              >
                {activeFilterCount}
              </span>
            )}
          </button>
        </div>
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

      {/* With the filter panel open it picks the filters: the bar only shows the ones in force,
          in the same place and style, with nothing pinned and no "add filter" */}
      <FilterChipBar
        singleLine
        className="relative flex min-w-0 flex-1 flex-nowrap items-center gap-2"
        filters={fields}
        values={values}
        pinned={showChips ? pinnedFilters : []}
        pinControls={showChips ? filterPinControls : undefined}
        canAdd={showChips}
        onChange={onFilterChange}
        onRemove={onFilterRemove}
        onClear={onFilterClear}
      />

      <div className={`flex ${TOOLBAR_CONTROL_H} shrink-0 items-center gap-2`}>
        {shownCount !== null && (
          <span className="mr-1 text-xs whitespace-nowrap text-(--palette-gray-500) tabular-nums">
            {t('task:page.shownCount', { count: shownCount })}
          </span>
        )}
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
