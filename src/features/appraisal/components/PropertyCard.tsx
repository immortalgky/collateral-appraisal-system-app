import React, { useMemo } from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { useNavigate } from 'react-router-dom';
import { useAppraisalId, useBasePath } from '@/features/appraisal/context/AppraisalContext';
import type { PropertyItem } from '../types';
import Icon from '@shared/components/Icon';
import { PropertyCardContent } from './PropertyCardContent';
import { usePropertyBasePath } from '../hooks/usePropertyBasePath';
import { getRouteSegment as getRouteSegmentFromConfig } from '../utils/propertyTypeConfig';

const getRouteSegment = (type: string): string => getRouteSegmentFromConfig(type) ?? 'land';

interface PropertyCardProps {
  property: PropertyItem;
  groupId: string;
  onContextMenu: (e: React.MouseEvent, property: PropertyItem, groupId: string) => void;
}

export const PropertyCard = React.memo(({ property, groupId, onContextMenu }: PropertyCardProps) => {
  const navigate = useNavigate();
  const appraisalId = useAppraisalId();
  const layoutBasePath = useBasePath();
  const propertyBasePath = usePropertyBasePath();

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
        `${layoutBasePath}/${propertyBasePath}/${routeSegment}/${property.id}?groupId=${groupId}`,
      );
    }
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      data-property-id={property.id}
      onContextMenu={e => onContextMenu(e, property, groupId)}
      className="bg-white border border-gray-200 rounded-lg overflow-hidden shadow-sm hover:shadow-md hover:border-gray-300 focus-within:ring-2 focus-within:ring-primary/20 transition-all duration-150 flex"
    >
      {/* Drag Handle */}
      <div
        ref={setActivatorNodeRef}
        {...attributes}
        {...listeners}
        className="flex items-center justify-center w-8 bg-gray-50 hover:bg-gray-100 cursor-grab active:cursor-grabbing border-r border-gray-200 flex-shrink-0"
        style={{ touchAction: 'none' }}
        title="Drag to reorder"
      >
        <Icon name="grip-vertical" className="text-gray-400 text-sm" />
      </div>

      <PropertyCardContent
        property={property}
        onClick={handleCardClick}
        size="compact"
      />
    </div>
  );
});
