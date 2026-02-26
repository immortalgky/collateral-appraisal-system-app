import type { PropertyItem } from '../types';
import Icon from '@shared/components/Icon';
import ParameterDisplay from '@shared/components/ParameterDisplay';

type CardSize = 'sm' | 'md';

interface PropertyCardContentProps {
  property: PropertyItem;
  onClick?: () => void;
  /** Show the right-arrow chevron indicator */
  showArrow?: boolean;
  /** Card size variant — 'sm' for compact lists, 'md' for standard cards */
  size?: CardSize;
}

const sizeConfig = {
  sm: {
    image: 'w-20 min-h-[80px]',
    title: 'text-xs line-clamp-2',
    text: 'text-[10px]',
    iconSize: 'text-[8px]',
    padding: 'p-2',
    gap: 'gap-0.5 mt-1',
  },
  md: {
    image: 'w-44 h-28',
    title: 'text-sm line-clamp-1 mb-1.5',
    text: 'text-xs',
    iconSize: 'text-[10px]',
    padding: 'p-2.5',
    gap: 'gap-3',
  },
} as const;

/**
 * Presentational component for rendering a property card's visual content.
 * Used by PropertyCard (with drag-and-drop) and pricing analysis (without).
 */
export function PropertyCardContent({
  property,
  onClick,
  showArrow = true,
  size = 'sm',
}: PropertyCardContentProps) {
  const cfg = sizeConfig[size];

  return (
    <div
      onClick={onClick}
      className={`flex flex-1 ${onClick ? 'cursor-pointer hover:bg-gray-50/50' : ''} transition-colors`}
    >
      {/* Property Image */}
      <div className={`relative ${cfg.image} bg-gray-100 flex-shrink-0`}>
        {property.image ? (
          <img
            src={property.image}
            alt={property.address}
            loading="lazy"
            decoding="async"
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Icon name="image" className="text-gray-400 text-2xl" />
          </div>
        )}
        <div className="absolute top-2 left-2 bg-white rounded-full p-1 shadow-sm">
          <Icon name="location-dot" className="text-green-500 text-[10px]" style="solid" />
        </div>
      </div>

      {/* Property Details */}
      <div className={`flex-1 ${cfg.padding} flex flex-col justify-between min-w-0`}>
        <div>
          <h3
            className={`font-medium text-gray-900 ${cfg.title}`}
            title={property.address}
          >
            {property.address}
          </h3>

          <ParameterDisplay
            group="PropertyType"
            code={property.type}
            fallback={property.type}
            className={`${cfg.text} text-gray-500`}
          />

          <div className={`flex items-center ${cfg.gap} ${cfg.text} text-gray-500 mt-1`}>
            <div className="flex items-center gap-1">
              <Icon name="ruler-combined" className={`text-gray-400 ${cfg.iconSize}`} style="solid" />
              <span>{property.area}</span>
            </div>
          </div>

          <div className={`flex items-center gap-1 ${cfg.text} text-gray-400 mt-0.5`}>
            <Icon name="location-dot" className={cfg.iconSize} style="solid" />
            <span className="truncate" title={property.location}>
              {property.location}
            </span>
          </div>
        </div>
      </div>

      {/* Arrow indicator */}
      {showArrow && (
        <div className="flex items-center pr-3">
          <Icon name="chevron-right" className="text-gray-300 text-sm" style="solid" />
        </div>
      )}
    </div>
  );
}
