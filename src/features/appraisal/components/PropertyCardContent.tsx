import type { PropertyItem } from '../types';
import Icon from '@shared/components/Icon';
import Badge from '@shared/components/Badge';
import ParameterDisplay from '@shared/components/ParameterDisplay';

const MACHINE_TYPES = new Set(['MAC', 'Machine', 'Machinery']);

type CardSize = 'xs' | 'compact' | 'sm' | 'md';

interface PropertyCardContentProps {
  property: PropertyItem;
  onClick?: () => void;
  /** Show the right-arrow chevron indicator */
  showArrow?: boolean;
  /** Card size variant — 'sm' for compact lists, 'md' for standard cards */
  size?: CardSize;
}

const sizeConfig = {
  xs: {
    image: 'w-10 h-10',
    title: 'text-[11px] line-clamp-1',
    text: 'text-[10px]',
    iconSize: 'text-[8px]',
    padding: 'px-2 py-1',
    gap: 'gap-1',
  },
  compact: {
    image: 'w-28 h-[72px]',
    title: 'text-xs line-clamp-1 mb-0.5',
    text: 'text-[11px]',
    iconSize: 'text-[9px]',
    padding: 'p-2',
    gap: 'gap-1.5',
  },
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
      <div
        className={`relative ${cfg.image} bg-gray-100 flex-shrink-0 ${size === 'compact' ? 'rounded-md m-2 mr-0 overflow-hidden' : size === 'md' ? 'rounded-lg m-2.5 mr-0 overflow-hidden' : size === 'xs' ? 'rounded' : ''}`}
      >
        {property.image ? (
          <>
            <img
              src={property.image}
              alt={property.address}
              loading="lazy"
              decoding="async"
              className={`w-full h-full object-cover ${size === 'compact' ? 'rounded-md' : size === 'md' ? 'rounded-lg' : size === 'xs' ? 'rounded' : ''}`}
            />
            {size !== 'xs' && (
              <div
                className={`absolute inset-0 bg-gradient-to-t from-black/40 to-transparent ${size === 'compact' ? 'rounded-md' : size === 'md' ? 'rounded-lg' : ''}`}
              />
            )}
          </>
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Icon
              name="image"
              className={`text-gray-400 ${size === 'xs' ? 'text-sm' : size === 'compact' ? 'text-lg' : 'text-2xl'}`}
            />
          </div>
        )}
        {size !== 'xs' && (
          <a
            href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(property.address)}`}
            target="_blank"
            rel="noopener noreferrer"
            onClick={e => e.stopPropagation()}
            className={`absolute bg-white rounded-full shadow-sm hover:shadow-md hover:scale-110 transition-all ${size === 'compact' ? 'top-1 left-1 p-0.5' : 'top-2 left-2 p-1'}`}
            title="Open in Google Maps"
          >
            <Icon
              name="location-dot"
              className={`text-green-500 ${size === 'compact' ? 'text-[8px]' : 'text-[10px]'}`}
              style="solid"
            />
          </a>
        )}
        {size !== 'xs' && property.photos && property.photos.length > 0 && (
          <div
            className={`absolute flex items-center gap-1 bg-black/50 text-white rounded-full text-[10px] ${size === 'compact' ? 'bottom-1 right-1 px-1 py-0' : 'bottom-2 right-2 px-1.5 py-0.5'}`}
          >
            <Icon name="camera" className="text-[9px]" style="solid" />
            <span>{property.photos.length}</span>
          </div>
        )}
      </div>

      {/* Property Details */}
      <div
        className={`flex-1 ${cfg.padding} flex ${size === 'xs' ? 'flex-row items-center gap-2' : 'flex-col justify-between'} min-w-0`}
      >
        {size === 'xs' ? (
          <>
            <h3
              className={`font-medium text-gray-900 ${cfg.title} min-w-0 flex-1`}
              title={property.address}
            >
              {property.address}
            </h3>
            <Badge type="property" value={property.type} size="xs" dot={false} className="shrink-0">
              <ParameterDisplay
                group="PropertyType"
                code={property.type}
                fallback={property.type}
              />
            </Badge>
            <div className={`flex items-center gap-1 ${cfg.text} text-gray-500 shrink-0`}>
              <Icon
                name="ruler-combined"
                className={`text-gray-400 ${cfg.iconSize}`}
                style="solid"
              />
              <span>{property.area}</span>
            </div>
          </>
        ) : (
          <div>
            <h3 className={`font-medium text-gray-900 ${cfg.title}`} title={property.address}>
              {property.address}
            </h3>

            <Badge type="property" value={property.type} size="xs" dot={false} className="mt-0.5">
              <ParameterDisplay
                group="PropertyType"
                code={property.type}
                fallback={property.type}
              />
            </Badge>

            {size === 'md' || size === 'compact' ? (
              <div
                className={`flex items-center gap-1 flex-wrap ${size === 'compact' ? 'mt-1' : 'mt-2 gap-1.5'}`}
              >
                {MACHINE_TYPES.has(property.type) ? (
                  <>
                    {property.machineName && (
                      <span className="inline-flex items-center gap-1 text-[11px] text-gray-500 bg-gray-50 border border-gray-100 rounded-full px-2 py-0.5">
                        <Icon name="gear" className="text-[9px] text-gray-400" style="solid" />
                        {property.machineName}
                      </span>
                    )}
                    {(property.brand || property.model) && (
                      <span className="inline-flex items-center gap-1 text-[11px] text-gray-500 bg-gray-50 border border-gray-100 rounded-full px-2 py-0.5">
                        <Icon name="tag" className="text-[9px] text-gray-400" style="solid" />
                        {[property.brand, property.model].filter(Boolean).join(' ')}
                      </span>
                    )}
                    {property.registrationNo && (
                      <span className="inline-flex items-center gap-1 text-[11px] text-gray-500 bg-gray-50 border border-gray-100 rounded-full px-2 py-0.5">
                        <Icon name="hashtag" className="text-[9px] text-gray-400" style="solid" />
                        {property.registrationNo}
                      </span>
                    )}
                    {property.dimension && (
                      <span className="inline-flex items-center gap-1 text-[11px] text-gray-500 bg-gray-50 border border-gray-100 rounded-full px-2 py-0.5">
                        <Icon name="cube" className="text-[9px] text-gray-400" style="solid" />
                        {property.dimension}
                      </span>
                    )}
                  </>
                ) : (
                  <>
                    <span className="inline-flex items-center gap-1 text-[11px] text-gray-500 bg-gray-50 border border-gray-100 rounded-full px-2 py-0.5">
                      <Icon
                        name="ruler-combined"
                        className="text-[9px] text-gray-400"
                        style="solid"
                      />
                      {property.area}
                    </span>
                    <span className="inline-flex items-center gap-1 text-[11px] text-gray-500 bg-gray-50 border border-gray-100 rounded-full px-2 py-0.5">
                      <Icon
                        name="location-dot"
                        className="text-[9px] text-gray-400"
                        style="solid"
                      />
                      {property.location}
                    </span>
                    {property.latitude != null && property.longitude != null ? (
                      <span className="inline-flex items-center gap-1 text-[11px] text-gray-500 bg-gray-50 border border-gray-100 rounded-full px-2 py-0.5">
                        <Icon name="map-pin" className={cfg.iconSize} style="solid" />
                        {property.latitude.toFixed(6)}, {property.longitude.toFixed(6)}
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-[11px] text-gray-500 bg-gray-50 border border-gray-100 rounded-full px-2 py-0.5">
                        <Icon name="map-pin" className={cfg.iconSize} style="solid" />
                        {'-'}, {'-'}
                      </span>
                    )}
                  </>
                )}
              </div>
            ) : MACHINE_TYPES.has(property.type) ? (
              <>
                {(property.brand || property.model) && (
                  <div className={`flex items-center gap-1 ${cfg.text} text-gray-500 mt-1`}>
                    <Icon name="tag" className={`text-gray-400 ${cfg.iconSize}`} style="solid" />
                    <span>{[property.brand, property.model].filter(Boolean).join(' ')}</span>
                  </div>
                )}
                {property.registrationNo && (
                  <div className={`flex items-center gap-1 ${cfg.text} text-gray-400 mt-0.5`}>
                    <Icon name="hashtag" className={cfg.iconSize} style="solid" />
                    <span>{property.registrationNo}</span>
                  </div>
                )}
              </>
            ) : (
              <>
                <div className={`flex items-center ${cfg.gap} ${cfg.text} text-gray-500 mt-1`}>
                  <div className="flex items-center gap-1">
                    <Icon
                      name="ruler-combined"
                      className={`text-gray-400 ${cfg.iconSize}`}
                      style="solid"
                    />
                    <span>{property.area}</span>
                  </div>
                </div>

                <div className={`flex items-center gap-1 ${cfg.text} text-gray-400 mt-0.5`}>
                  <Icon name="location-dot" className={cfg.iconSize} style="solid" />
                  <span className="truncate" title={property.location}>
                    {property.location}
                  </span>
                </div>
              </>
            )}
          </div>
        )}
      </div>

      {/* Arrow indicator */}
      {showArrow && (
        <div className={`flex items-center ${size === 'compact' ? 'pr-2' : 'pr-3'}`}>
          <Icon
            name="chevron-right"
            className={`text-gray-300 ${size === 'compact' ? 'text-xs' : 'text-sm'}`}
            style="solid"
          />
        </div>
      )}
    </div>
  );
}
