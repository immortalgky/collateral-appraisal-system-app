import React, { useMemo } from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { useNavigate, useParams } from 'react-router-dom';
import type { PropertyItem } from '../types';
import Icon from '@shared/components/Icon';
import { PropertyCardContent } from './PropertyCardContent';

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

      <PropertyCardContent
        property={property}
        onClick={handleCardClick}
        size="md"
      />
    </div>
  );
});
