import { useGetTaskCounts } from '../api';

interface TaskCountBadgeProps {
  /** Activity id from the task workflow (e.g. 'appraisal-initiation-check'). Omit for total count. */
  activityId?: string;
}

/**
 * Inline count pill for the sidebar Task menu children.
 *
 * Reads from the shared `useGetTaskCounts` cache so every sidebar badge — and
 * the activity-page Pool badge — share a single round-trip to `/tasks/counts`.
 * When `activityId` is provided, shows that activity's My + Pool total; when
 * omitted, sums every activity. Renders nothing while loading or when count is
 * zero so the menu stays uncluttered.
 */
export function TaskCountBadge({ activityId }: TaskCountBadgeProps) {
  const { data: counts } = useGetTaskCounts();

  let count = 0;
  if (counts) {
    if (activityId) {
      const row = counts.get(activityId);
      count = (row?.myCount ?? 0) + (row?.poolCount ?? 0);
    } else {
      for (const row of counts.values()) count += row.myCount + row.poolCount;
    }
  }

  if (count <= 0) return null;

  const display = count > 99 ? '99+' : String(count);

  const ariaLabel = activityId
    ? `${count} pending tasks (private + pool)`
    : `${count} pending tasks across all activities`;

  return (
    <span
      className="ml-auto inline-flex items-center justify-center min-w-[1.25rem] h-5 px-1.5 rounded-full bg-primary/10 text-primary text-[10px] font-semibold leading-none"
      aria-label={ariaLabel}
    >
      {display}
    </span>
  );
}
