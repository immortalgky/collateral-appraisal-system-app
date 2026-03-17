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
        variant === 'emerald' && 'bg-emerald-50 border-emerald-200',
        variant === 'purple' && 'bg-purple-50 border-purple-200'
      )}
    >
      {/* Avatar */}
      <Avatar src={staff.avatar} name={staff.name} size="lg" />

      {/* Staff Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-gray-900">{staff.name}</span>
          <span className="text-xs text-gray-500">({staff.employeeId})</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-500">{staff.department}</span>
          <span
            className={clsx(
              'inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-medium',
              staff.currentWorkload <= 2 && 'bg-green-50 text-green-700',
              staff.currentWorkload > 2 && staff.currentWorkload <= 4 && 'bg-amber-50 text-amber-700',
              staff.currentWorkload > 4 && 'bg-red-50 text-red-700'
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
          className="p-1.5 rounded-md text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
          title="Clear selection"
        >
          <Icon name="xmark" style="solid" className="w-4 h-4" />
        </button>
      )}
    </div>
  );
};

export default StaffDisplay;
