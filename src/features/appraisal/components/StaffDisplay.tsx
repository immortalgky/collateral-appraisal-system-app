import clsx from 'clsx';
import Icon from '@/shared/components/Icon';
import Avatar from '@/shared/components/Avatar';
import type { InternalStaff } from '../types/administration';

interface StaffDisplayProps {
  staff: InternalStaff;
  onClear?: () => void;
  variant?: 'emerald' | 'purple';
}

const StaffDisplay = ({ staff, onClear, variant = 'emerald' }: StaffDisplayProps) => {
  return (
    <div
      className={clsx(
        'flex items-center gap-3 p-3 rounded-lg border',
        variant === 'emerald' &&
          'bg-emerald-50 dark:bg-emerald-500/10 border-emerald-200 dark:border-emerald-500/30',
        variant === 'purple' &&
          'bg-purple-50 dark:bg-purple-500/10 border-purple-200 dark:border-purple-500/30',
      )}
    >
      {/* Avatar */}
      <Avatar src={staff.avatar} name={staff.name} size="lg" />

      {/* Staff Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-(--palette-ink)">{staff.name}</span>
          <span className="text-xs text-(--palette-gray-500)">({staff.employeeId})</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-(--palette-gray-500)">{staff.department}</span>
          <span
            className={clsx(
              'inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-medium',
              staff.currentWorkload <= 2 &&
                'bg-green-50 dark:bg-green-500/10 text-green-700 dark:text-green-300',
              staff.currentWorkload > 2 &&
                staff.currentWorkload <= 4 &&
                'bg-(--palette-warn-wash) text-(--palette-warn)',
              staff.currentWorkload > 4 && 'bg-(--palette-req-wash) text-(--palette-req)',
            )}
          >
            {staff.currentWorkload} tasks
          </span>
        </div>
      </div>

      {/* Clear Button */}
      {onClear && (
        <button
          type="button"
          onClick={onClear}
          className="p-1.5 rounded-md text-(--palette-gray-400) hover:text-(--palette-gray-600) hover:bg-(--palette-surface-3) transition-colors"
          title="Clear selection"
        >
          <Icon name="xmark" style="solid" className="w-4 h-4" />
        </button>
      )}
    </div>
  );
};

export default StaffDisplay;
