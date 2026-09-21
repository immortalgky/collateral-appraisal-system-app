import React, { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { useNavigate } from 'react-router-dom';
import { useAppraisalId, useBasePath } from '@/features/appraisal/context/AppraisalContext';
import type { PropertyItem } from '../types';
import Icon from '@shared/components/Icon';
import { PropertyCardContent } from './PropertyCardContent';
import { usePropertyBasePath } from '../hooks/usePropertyBasePath';
import { getRouteSegment as getRouteSegmentFromConfig } from '../utils/propertyTypeConfig';
import { usePageReadOnly } from '@/shared/contexts/PageReadOnlyContext';

const getRouteSegment = (type: string): string => getRouteSegmentFromConfig(type) ?? 'land';

interface PropertyCardProps {
  property: PropertyItem;
  groupId: string;
  onContextMenu: (e: React.MouseEvent, property: PropertyItem, groupId: string) => void;
  /** Opens the in-app properties map centred on this property. */
  onShowOnMap?: (propertyId: string) => void;
  /**
   * `row` is the standalone property row; `stack` is the same row squeezed into the aligned
   * columns of a same-type pile. Both stay a single sortable node so drag and drop keeps
   * working either way — see PropertyStackSection.
   */
  layout?: 'row' | 'stack';
}

export const PropertyCard = React.memo(
  ({ property, groupId, onContextMenu, onShowOnMap, layout = 'row' }: PropertyCardProps) => {
    const { t } = useTranslation('appraisal');
    const readOnly = usePageReadOnly();
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
        onContextMenu={readOnly ? undefined : e => onContextMenu(e, property, groupId)}
        className="group/row flex items-stretch bg-white hover:bg-gray-50/70 focus-within:bg-gray-50 transition-colors"
      >
        {/* Drag handle — a faint gutter rather than a filled bar, so the row reads as one
            surface. It stays in the DOM (never display:none) or dnd-kit loses its activator. */}
        <div
          ref={setActivatorNodeRef}
          {...(!readOnly ? attributes : {})}
          {...(!readOnly ? listeners : {})}
          className={`flex items-center justify-center w-5 flex-shrink-0 text-gray-200 transition-colors ${
            readOnly
              ? 'cursor-default'
              : 'cursor-grab active:cursor-grabbing group-hover/row:text-gray-400'
          }`}
          style={{ touchAction: 'none' }}
          title={readOnly ? undefined : t('properties.dragToReorder')}
        >
          <Icon name="grip-vertical" className="text-[11px]" />
        </div>

        <PropertyCardContent
          property={property}
          onClick={handleCardClick}
          size={layout === 'stack' ? 'stack' : 'compact'}
          onLocationClick={onShowOnMap ? () => onShowOnMap(property.id) : undefined}
        />
      </div>
    );
  },
);
