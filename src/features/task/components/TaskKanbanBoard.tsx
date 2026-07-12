import { useMemo, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import type { GroupByField, Task } from '../types';
import { useTaskGroupCounts, type KanbanScope, type TaskGroupCount } from '../api';
import { TaskKanbanColumn } from './TaskKanbanColumn';
import { getActivityConfig } from '../config/activityConfig';
import Icon from '@/shared/components/Icon';
import { useParameterOptions } from '@/shared/utils/parameterUtils';

interface TaskKanbanBoardProps {
  groupBy: GroupByField;
  /** Filters shared by every column (search, request status, date range, ...). */
  baseFilters: Record<string, unknown>;
  /** Which task endpoint family backs the board — 'me' (default) or 'pool'. */
  scope?: KanbanScope;
  /** Overrides the default TaskKanbanCard rendering per-task (e.g. the pool board's card + actions). */
  renderCard?: (task: Task) => ReactNode;
  /** Overrides the default row-click navigation (`/tasks/:id/opening`). */
  onTaskClick?: (task: Task) => void;
}

type ColumnColor = 'blue' | 'yellow' | 'red' | 'green' | 'gray' | 'purple' | 'emerald' | 'amber';

// Rotating palette for groupings whose column set is derived from the data
// (activity, purpose) rather than a small fixed enum, so every column still
// gets a color.
const ROTATING_COLORS: ColumnColor[] = ['blue', 'purple', 'emerald', 'amber', 'red', 'green'];

const STATUS_LABELS: Record<string, string> = {
  NotStarted: 'Not Started',
  InProgress: 'In Progress',
  Overdue: 'Overdue',
};
const STATUS_COLORS: Record<string, ColumnColor> = {
  NotStarted: 'gray',
  InProgress: 'blue',
  Overdue: 'red',
};
const STATUS_ORDER = ['NotStarted', 'InProgress', 'Overdue'] as const;

const SLA_LABELS: Record<string, string> = {
  Breached: 'Breached',
  AtRisk: 'At Risk',
  OnTime: 'On Time',
  NoSla: 'No SLA',
};
const SLA_COLORS: Record<string, ColumnColor> = {
  Breached: 'red',
  AtRisk: 'amber',
  OnTime: 'green',
  NoSla: 'gray',
};
const SLA_ORDER = ['Breached', 'AtRisk', 'OnTime', 'NoSla'] as const;

const PRIORITY_COLORS: Record<string, ColumnColor> = {
  High: 'red',
  Normal: 'gray',
};
const PRIORITY_ORDER = ['High'] as const;

// Per-grouping presentation only — the column *set* is entirely data-driven
// (see useTaskGroupCounts), so there are no hardcoded value lists here.
interface GroupPresentation {
  getLabel: (value: string) => string;
  getColor: (value: string, idx: number) => ColumnColor;
  icon?: (value: string) => string | undefined;
  /** Preferred lane order; values not listed here sort after, by count desc. */
  order?: readonly string[];
}

const presentations: Record<GroupByField, GroupPresentation> = {
  status: {
    getLabel: value => STATUS_LABELS[value] ?? value,
    getColor: value => STATUS_COLORS[value] ?? 'gray',
    order: STATUS_ORDER,
  },
  slaStatus: {
    getLabel: value => SLA_LABELS[value] ?? value,
    getColor: value => SLA_COLORS[value] ?? 'gray',
    order: SLA_ORDER,
  },
  priority: {
    getLabel: value => value,
    getColor: value => PRIORITY_COLORS[value] ?? 'gray',
    order: PRIORITY_ORDER,
  },
  purpose: {
    getLabel: value => value,
    getColor: (_value, idx) => ROTATING_COLORS[idx % ROTATING_COLORS.length],
  },
  activity: {
    getLabel: value => getActivityConfig(value)?.title ?? value,
    getColor: (_value, idx) => ROTATING_COLORS[idx % ROTATING_COLORS.length],
    icon: value => getActivityConfig(value)?.icon,
  },
};

// Sorts columns by the grouping's preferred order (ties/unlisted values by
// count desc); falls back to plain count desc when no order is defined.
function sortGroups(groups: TaskGroupCount[], order?: readonly string[]): TaskGroupCount[] {
  if (!order) return [...groups].sort((a, b) => b.count - a.count);
  const rank = new Map(order.map((value, i) => [value, i]));
  return [...groups].sort((a, b) => {
    const rankA = rank.get(a.value) ?? order.length;
    const rankB = rank.get(b.value) ?? order.length;
    return rankA !== rankB ? rankA - rankB : b.count - a.count;
  });
}

// Maps a column's raw group value onto the server-side filter that scopes
// that column's fetch.
function columnFilterFor(groupBy: GroupByField, value: string): Record<string, unknown> {
  switch (groupBy) {
    case 'status':
      return { taskStatusBucket: value };
    case 'priority':
      return { priority: value };
    case 'purpose':
      return { purpose: value };
    case 'slaStatus':
      return { slaStatus: value };
    case 'activity':
      return { activityId: value };
  }
}

export const TaskKanbanBoard = ({
  groupBy,
  baseFilters,
  scope = 'me',
  renderCard,
  onTaskClick,
}: TaskKanbanBoardProps) => {
  const navigate = useNavigate();
  const presentation = presentations[groupBy];
  const { data: groups, isLoading } = useTaskGroupCounts(groupBy, baseFilters, scope);

  // Purpose columns are grouped by raw code (e.g. "01"); resolve to the
  // AppraisalPurpose description for the column heading, mirroring the table view.
  const purposeOptions = useParameterOptions('AppraisalPurpose');
  const purposeLabels = useMemo(
    () => new Map(purposeOptions.map(o => [o.value, o.label])),
    [purposeOptions],
  );
  const labelFor = (value: string) =>
    groupBy === 'purpose'
      ? (purposeLabels.get(value) ?? presentation.getLabel(value))
      : presentation.getLabel(value);

  const sortedGroups = useMemo(
    () => sortGroups(groups ?? [], presentation.order),
    [groups, presentation.order],
  );

  const handleTaskClick =
    onTaskClick ?? ((task: Task) => navigate(`/tasks/${task.id}/opening`));

  if (isLoading) return null;

  if (sortedGroups.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-gray-400">
        <Icon style="regular" name="inbox" className="size-10 mb-3" />
        <p className="text-sm">No tasks</p>
      </div>
    );
  }

  return (
    <div className="flex gap-4 h-full overflow-x-auto pb-4">
      {sortedGroups.map(({ value }, idx) => (
        <TaskKanbanColumn
          key={value}
          title={labelFor(value)}
          icon={presentation.icon?.(value)}
          color={presentation.getColor(value, idx)}
          columnFilters={{ ...baseFilters, ...columnFilterFor(groupBy, value) }}
          onTaskClick={handleTaskClick}
          scope={scope}
          renderCard={renderCard}
        />
      ))}
    </div>
  );
};
