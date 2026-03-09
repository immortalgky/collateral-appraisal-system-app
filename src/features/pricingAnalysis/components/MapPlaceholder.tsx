import { Icon } from '@/shared/components';
import clsx from 'clsx';

interface MapPlaceholderProps {
  className?: string;
}

export function MapPlaceholder({ className }: MapPlaceholderProps) {
  return (
    <div
      className={clsx(
        'bg-gray-100 rounded-lg flex flex-col items-center justify-center text-gray-400',
        className,
      )}
    >
      <Icon name="map" style="solid" className="size-10 mb-3 text-gray-300" />
      <span className="text-sm font-medium">Map coming soon</span>
    </div>
  );
}
