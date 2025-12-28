import clsx from 'clsx';
import Icon from '@/shared/components/Icon';
import type { InternalStaff } from '../types/administration';

interface StaffDisplayProps {
  staff: InternalStaff;
  onClear?: () => void;
}

const StaffDisplay = ({ staff, onClear }: StaffDisplayProps) => {
  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <div className="flex items-center gap-3 p-3 bg-emerald-50 rounded-lg border border-emerald-200">
      {/* Avatar */}
      {staff.avatar ? (
        <img
          src={staff.avatar}
          alt={staff.name}
          className="w-10 h-10 rounded-full object-cover"
        />
      ) : (
        <div className="w-10 h-10 rounded-full bg-emerald-200 flex items-center justify-center shrink-0">
          <span className="text-sm font-medium text-emerald-700">{getInitials(staff.name)}</span>
        </div>
      )}

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
