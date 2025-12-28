import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import type { PropertyItem } from '../types';
import Icon from '@shared/components/Icon';

interface PropertyCardProps {
  property: PropertyItem;
  groupId: string;
  onContextMenu: (e: React.MouseEvent, property: PropertyItem, groupId: string) => void;
}

export const PropertyCard = ({ property, groupId, onContextMenu }: PropertyCardProps) => {
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
    data: {
      type: 'property',
      property,
      groupId,
    },
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      onContextMenu={(e) => onContextMenu(e, property, groupId)}
      className="bg-white border border-gray-200 rounded-lg overflow-hidden shadow-sm hover:shadow-md transition-shadow flex"
    >
      {/* Drag Handle */}
      <div
        ref={setActivatorNodeRef}
        {...attributes}
        {...listeners}
        className="flex items-center justify-center w-12 bg-gray-50 hover:bg-gray-100 cursor-grab active:cursor-grabbing border-r border-gray-200 flex-shrink-0"
        style={{ touchAction: 'none' }}
        title="Drag to reorder"
      >
        <Icon name="grip-vertical" className="text-gray-500" />
      </div>

      {/* Property Image - Left Side */}
      <div className="relative w-48 h-32 bg-gray-100 flex-shrink-0">
        {property.image ? (
          <img
            src={property.image}
            alt={property.address}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Icon name="image" className="text-gray-400 text-2xl" />
          </div>
        )}
        {/* Location Pin Overlay */}
        <div className="absolute top-2 left-2 bg-white rounded-full p-1.5 shadow-md">
          <Icon name="location-dot" className="text-green-500 text-xs" />
        </div>
      </div>

      {/* Property Details - Right Side */}
      <div className="flex-1 p-3 flex flex-col justify-between">
        <div>
          {/* Address/Title */}
          <h3 className="font-semibold text-gray-900 text-sm mb-2 line-clamp-1" title={property.address}>
            {property.address}
          </h3>

          <div className="flex items-center gap-4 text-xs text-gray-600">
            {/* Area with icon */}
            <div className="flex items-center gap-1">
              <Icon name="ruler-combined" className="text-gray-400" style="light" />
              <span>{property.area}</span>
            </div>

            {/* Price Range with icon */}
            <div className="flex items-center gap-1">
              <Icon name="dollar-sign" className="text-gray-400" style="light" />
              <span>{property.priceRange}</span>
            </div>

            {/* Location with icon */}
            <div className="flex items-center gap-1 flex-1 min-w-0">
              <Icon name="location-dot" className="text-gray-400 flex-shrink-0" style="light" />
              <span className="truncate" title={property.location}>
                {property.location}
              </span>
            </div>
          </div>
        </div>

        {/* Property Type Badge - Bottom Right */}
        <div className="flex justify-end mt-2">
          <span className="inline-block px-2 py-0.5 bg-gray-100 text-gray-700 rounded text-xs font-medium">
            {property.type}
          </span>
        </div>
      </div>
    </div>
  );
};
