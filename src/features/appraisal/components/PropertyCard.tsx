import React, { useMemo } from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { useNavigate, useParams } from 'react-router-dom';
import type { PropertyItem } from '../types';
import Icon from '@shared/components/Icon';
import ParameterDisplay from '@shared/components/ParameterDisplay';

// Map property type to route a segment
const getRouteSegment = (type: string): string => {
  const typeMap: Record<string, string> = {
    Building: 'building',
    Condominium: 'condo',
    'Land and building': 'land-building',
    Lands: 'land',
    'Lease Agreement Building': 'building',
    'Lease Agreement Land and building': 'land-building',
    'Lease Agreement Lands': 'land',
    L: 'land',
    B: 'building',
    LB: 'land-building',
    U: 'condo',
  };
  return typeMap[type] || 'land';
};

interface PropertyCardProps {
  property: PropertyItem;
  groupId: string;
  onContextMenu: (e: React.MouseEvent, property: PropertyItem, groupId: string) => void;
}

export const PropertyCard = React.memo(({ property, groupId, onContextMenu }: PropertyCardProps) => {
  const navigate = useNavigate();
  const { appraisalId } = useParams<{ appraisalId: string }>();

  const sortableData = useMemo(
    () => ({ type: 'property' as const, property, groupId }),
    [property, groupId],
  );

  const {
    attributes,
    listeners,
    setNodeRef,
    setActivatorNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: property.id,
    data: sortableData,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const handleCardClick = () => {
    const routeSegment = getRouteSegment(property.type);
    if (appraisalId) {
      navigate(
        `/appraisal/${appraisalId}/property/${routeSegment}/${property.id}?groupId=${groupId}`,
      );
    }
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      onContextMenu={e => onContextMenu(e, property, groupId)}
      className="bg-white border border-gray-200 rounded-lg overflow-hidden shadow-sm hover:shadow-md transition-shadow flex"
    >
      {/* Drag Handle */}
      <div
        ref={setActivatorNodeRef}
        {...attributes}
        {...listeners}
        className="flex items-center justify-center w-10 bg-gray-50 hover:bg-gray-100 cursor-grab active:cursor-grabbing border-r border-gray-200 flex-shrink-0"
        style={{ touchAction: 'none' }}
        title="Drag to reorder"
      >
        <Icon name="grip-vertical" className="text-gray-400" />
      </div>

      {/* Clickable Card Content */}
      <div
        onClick={handleCardClick}
        className="flex flex-1 cursor-pointer hover:bg-gray-50/50 transition-colors"
      >
        {/* Property Image - Left Side */}
        <div className="relative w-44 h-28 bg-gray-100 flex-shrink-0">
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
          {/* Location Pin Overlay */}
          <div className="absolute top-2 left-2 bg-white rounded-full p-1 shadow-sm">
            <Icon name="location-dot" className="text-green-500 text-[10px]" style="solid" />
          </div>
        </div>

        {/* Property Details - Right Side */}
        <div className="flex-1 p-2.5 flex flex-col justify-between min-w-0">
          <div>
            {/* Address/Title */}
            <h3
              className="font-medium text-gray-900 text-sm mb-1.5 line-clamp-1"
              title={property.address}
            >
              {property.address}
            </h3>

            <div className="flex items-center gap-3 text-xs text-gray-500">
              {/* Area with icon */}
              <div className="flex items-center gap-1">
                <Icon name="ruler-combined" className="text-gray-400 text-[10px]" style="solid" />
                <span>{property.area}</span>
              </div>
            </div>

            {/* Location */}
            <div className="flex items-center gap-1 text-xs text-gray-400 mt-1">
              <Icon name="location-dot" className="text-[10px]" style="solid" />
              <span className="truncate" title={property.location}>
                {property.location}
              </span>
            </div>
          </div>

          {/* Property Type Badge - Bottom Right */}
          <div className="flex justify-end">
            <ParameterDisplay group="PropertyType" code={property.type}
              fallback="Unknown type"
              className="inline-block px-1.5 py-0.5 bg-primary/10 text-primary rounded text-[10px] font-medium" />
          </div>
        </div>

        {/* Arrow indicator */}
        <div className="flex items-center pr-3">
          <Icon name="chevron-right" className="text-gray-300 text-sm" style="solid" />
        </div>
      </div>
    </div>
  );
});
