import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import type { Task } from '../types';
import Icon from '@/shared/components/Icon';
import { TaskKanbanCard } from './TaskKanbanCard';
import { CardSkeleton } from '@/shared/components/Skeleton';
import { useKanbanColumnTasks, type KanbanColumnParams, type KanbanScope } from '../api';
import { SORTABLE_FIELDS } from '../config/columnDefs';
import Dropdown from '@/shared/components/inputs/Dropdown';

// Sort-field options for the shared Dropdown. "Default order" is supplied via the
// Dropdown's `placeholder` (auto-prepended as a null-value option).
const SORT_DROPDOWN_OPTIONS = SORTABLE_FIELDS.map(sf => ({
  value: sf.sortField,
  label: `Sort: ${sf.label}`,
}));

interface TaskKanbanColumnProps {
  title: string;
  /** Server filter scoping this column's fetch — base filters merged with the column's own value. */
  columnFilters: Record<string, unknown>;
  color: 'blue' | 'yellow' | 'red' | 'green' | 'gray' | 'purple' | 'emerald' | 'amber';
  /** Optional activity icon (only set for the 'activity' grouping). */
  icon?: string;
  onTaskClick?: (task: Task) => void;
  /** Which task endpoint family backs this column — 'me' (default) or 'pool'. */
  scope?: KanbanScope;
  /** Overrides the default TaskKanbanCard rendering per-task. */
  renderCard?: (task: Task) => ReactNode;
}

// Column header dot colors
const dotColors: Record<string, string> = {
  blue: 'bg-blue-500',
  yellow: 'bg-yellow-500',
  red: 'bg-red-500',
  green: 'bg-green-500',
  gray: 'bg-gray-400',
  purple: 'bg-purple-500',
  emerald: 'bg-emerald-500',
  amber: 'bg-amber-500',
};

export const TaskKanbanColumn = ({
  title,
  columnFilters,
  color,
  icon,
  onTaskClick,
  scope = 'me',
  renderCard,
}: TaskKanbanColumnProps) => {
  const [collapsed, setCollapsed] = useState(false);
  // null field → omit sortBy/sortDir so the backend falls back to default ordering.
  const [sortField, setSortField] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');
  const scrollRef = useRef<HTMLDivElement>(null);
  const sentinelRef = useRef<HTMLDivElement>(null);

  const sortParams = sortField ? { sortBy: sortField, sortDir } : {};
  const query = useKanbanColumnTasks(
    { ...columnFilters, ...sortParams } as unknown as KanbanColumnParams,
    { enabled: !collapsed, scope },
  );

  const tasks = useMemo(() => query.data?.pages.flatMap(page => page.items) ?? [], [query.data]);
  const total = query.data?.pages[0]?.count ?? 0;

  // Infinite scroll — fetch the next page once the sentinel near the bottom of
  // the card list scrolls into view. The observer is rooted on the column's own
  // scroll container (not the viewport): the cards scroll INSIDE this overflow
  // container, so a viewport-rooted observer would never see the sentinel. A
  // rootMargin prefetches the next page before the exact bottom is reached.
  const { hasNextPage, isFetchingNextPage, fetchNextPage } = query;
  useEffect(() => {
    const sentinel = sentinelRef.current;
    const root = scrollRef.current;
    if (!sentinel || !root || collapsed) return;
    const observer = new IntersectionObserver(
      entries => {
        if (entries[0]?.isIntersecting && hasNextPage && !isFetchingNextPage) {
          fetchNextPage();
        }
      },
      { root, rootMargin: '400px 0px' },
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [collapsed, hasNextPage, isFetchingNextPage, fetchNextPage]);

  return (
    <div className="flex flex-col flex-1 min-w-[320px] h-full">
      {/* Column Header */}
      <div className="sticky top-0 z-10 flex items-center justify-between gap-2 px-2 py-2 mb-3 bg-gray-50 rounded-lg">
        <button
          onClick={() => setCollapsed(c => !c)}
          className="flex items-center gap-2 min-w-0 text-left"
          title={collapsed ? 'Expand column' : 'Collapse column'}
        >
          <Icon
            style="solid"
            name={collapsed ? 'chevron-right' : 'chevron-down'}
            className="size-2.5 text-gray-400 flex-shrink-0"
          />
          <span className={`size-2.5 rounded-full flex-shrink-0 ${dotColors[color]}`} />
          {icon && (
            <Icon style="solid" name={icon} className="size-3.5 text-gray-500 flex-shrink-0" />
          )}
          <h3 className="font-medium text-gray-900 truncate">{title}</h3>
          <span className="text-sm text-gray-500 flex-shrink-0">{total}</span>
        </button>

        {!collapsed && (
          <div className="flex items-center gap-1 flex-shrink-0">
            <div className="w-40">
              <Dropdown
                options={SORT_DROPDOWN_OPTIONS}
                value={sortField ?? undefined}
                onChange={value => {
                  setSortField(value || null);
                  setSortDir('asc');
                }}
                placeholder="Default order"
                showValuePrefix={false}
              />
            </div>
            {sortField && (
              <button
                onClick={() => setSortDir(d => (d === 'asc' ? 'desc' : 'asc'))}
                title={sortDir === 'asc' ? 'Ascending' : 'Descending'}
                className="p-1 rounded border border-gray-200 bg-white text-gray-500 hover:text-gray-700 hover:bg-gray-50"
              >
                <Icon
                  style="solid"
                  name={sortDir === 'asc' ? 'sort-up' : 'sort-down'}
                  className="size-3"
                />
              </button>
            )}
          </div>
        )}
      </div>

      {/* Cards Container */}
      {!collapsed && (
        <div ref={scrollRef} className="flex-1 overflow-y-auto space-y-3 pr-1">
          {query.isLoading ? (
            <>
              <CardSkeleton />
              <CardSkeleton />
              <CardSkeleton />
            </>
          ) : total === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-gray-400">
              <Icon style="regular" name="inbox" className="size-8 mb-2" />
              <p className="text-sm">No tasks</p>
            </div>
          ) : (
            <>
              {tasks.map(task =>
                renderCard ? (
                  <div key={task.id}>{renderCard(task)}</div>
                ) : (
                  <TaskKanbanCard key={task.id} task={task} onClick={() => onTaskClick?.(task)} />
                ),
              )}
              <div ref={sentinelRef} className="h-4" aria-hidden />
              {query.isFetchingNextPage && (
                <div className="flex items-center justify-center gap-1.5 py-3 text-gray-400">
                  <Icon style="solid" name="spinner" className="size-3 animate-spin" />
                  <span className="text-xs">Loading more…</span>
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
};
