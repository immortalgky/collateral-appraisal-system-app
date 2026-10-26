import clsx from 'clsx';
import Icon from '@/shared/components/Icon';
import { avatarColor } from '../../config/columnDefs';
import { getActivityConfig } from '../../config/activityConfig';

/**
 * A task type's icon (from the activity config) on a tinted tile. The tint comes from the id, like a
 * customer's avatar, so a type keeps its colour on every row and in the filter panel.
 */
export function ActivityTile({
  activityId,
  size = 'md',
}: {
  /** A row without one (the backend sends none for an odd task) gets the default icon and tint. */
  activityId: string | null | undefined;
  size?: 'sm' | 'md';
}) {
  const id = activityId ?? '';
  return (
    <span
      aria-hidden="true"
      className={clsx(
        'inline-flex shrink-0 items-center justify-center',
        size === 'md' ? 'size-7 rounded-md' : 'size-5.5 rounded',
        avatarColor(id),
      )}
    >
      <Icon
        style="solid"
        name={getActivityConfig(id)?.icon ?? 'clipboard-list'}
        className="text-xs"
      />
    </span>
  );
}
