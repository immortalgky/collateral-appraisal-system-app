import { useGetTasks } from '../api';

interface TaskCountBadgeProps {
  /** Activity id from the task workflow (e.g. 'appraisal-initiation-check') */
  activityId: string;
}

/**
 * Inline count pill for the sidebar Task menu children.
 *
 * Reuses the existing `useGetTasks` hook with `pageSize=1` so each badge only
 * pays for the `count` field — full lists are still cached separately by
 * activity pages (different query key, different page size). Renders nothing
 * while loading, on error, or when count is zero, so the menu stays uncluttered.
 */
export function TaskCountBadge({ activityId }: TaskCountBadgeProps) {
  const { data } = useGetTasks({ activityId, pageNumber: 0, pageSize: 1 });
  const count = data?.count ?? 0;

  if (count <= 0) return null;

  const display = count > 99 ? '99+' : String(count);

  return (
    <span
      className="ml-auto inline-flex items-center justify-center min-w-[1.25rem] h-5 px-1.5 rounded-full bg-primary/10 text-primary text-[10px] font-semibold leading-none"
      aria-label={`${count} pending tasks`}
    >
      {display}
    </span>
  );
}
