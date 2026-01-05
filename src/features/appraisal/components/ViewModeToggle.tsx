import clsx from 'clsx';
import Icon from '@shared/components/Icon';

export type GalleryViewMode = 'grid' | 'list' | 'display';

interface ViewModeToggleProps {
  mode: GalleryViewMode;
  onChange: (mode: GalleryViewMode) => void;
  className?: string;
}

const VIEW_MODES: { id: GalleryViewMode; label: string; icon: string }[] = [
  { id: 'grid', label: 'Grid', icon: 'grid-2' },
  { id: 'list', label: 'List', icon: 'list' },
];

export const ViewModeToggle = ({ mode, onChange, className }: ViewModeToggleProps) => {
  return (
    <div
      className={clsx(
        'flex gap-1 p-1 bg-gray-100 border border-gray-200 rounded-lg',
        className
      )}
    >
      {VIEW_MODES.map(viewMode => {
        const isActive = mode === viewMode.id;
        return (
          <button
            key={viewMode.id}
            type="button"
            onClick={() => onChange(viewMode.id)}
            className={clsx(
              'flex items-center gap-1 px-2 py-1 text-xs font-normal rounded transition-all',
              isActive
                ? 'bg-white text-primary shadow-sm'
                : 'text-gray-500 hover:text-gray-700'
            )}
          >
            <Icon name={viewMode.icon} className="text-base" />
            <span>{viewMode.label}</span>
          </button>
        );
      })}
    </div>
  );
};

export default ViewModeToggle;
