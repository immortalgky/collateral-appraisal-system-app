import React, { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import clsx from 'clsx';
import { useAppraisalId, useBasePath } from '@/features/appraisal/context/AppraisalContext';
import type { PropertyGroup, PropertyItem } from '../types';
import Icon from '@shared/components/Icon';
import ParameterDisplay from '@shared/components/ParameterDisplay';
import PropertyTypeDropdown from './PropertyTypeDropdown';
import { brandModel, MACHINE_TYPES, PlaceValue, PropertyFlag } from './PropertyCardContent';
import { usePropertyBasePath } from '../hooks/usePropertyBasePath';
import { usePageReadOnly } from '@/shared/contexts/PageReadOnlyContext';
import { getRouteSegment as getRouteSegmentFromConfig } from '../utils/propertyTypeConfig';
import { formatAreaNumber, toRaiNganWa } from '../utils/areaFormat';
import { getTypeDotColor } from '../utils/propertyTypeConfig';

const getRouteSegment = (type: string): string => getRouteSegmentFromConfig(type) ?? 'land';

/** One line of facts under the title, absent ones dropped rather than spelled out. */
function metaFor(property: PropertyItem, unregistered: string): React.ReactNode {
  if (MACHINE_TYPES.has(property.type)) {
    return [brandModel(property), property.registrationNumber || unregistered]
      .filter(Boolean)
      .join(' · ');
  }
  const area =
    property.areaValue == null
      ? null
      : property.areaUnit === 'wa'
        ? toRaiNganWa(property.areaValue)
        : formatAreaNumber(property.areaValue);
  return (
    <>
      {area && <>{area} · </>}
      <PlaceValue property={property} />
    </>
  );
}

interface GridCardProps {
  property: PropertyItem;
  groupId: string;
  onContextMenu: (e: React.MouseEvent, property: PropertyItem, groupId: string) => void;
}

/**
 * One property as a card. The whole card is the drag handle — a grid has no left gutter to put
 * one in, and a card is a big enough target that a dedicated grip would only take space away
 * from the photo.
 */
const GridCard = ({ property, groupId, onContextMenu }: GridCardProps) => {
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

  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: property.id,
    data: sortableData,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const open = () => {
    if (!appraisalId) return;
    navigate(
      `${layoutBasePath}/${propertyBasePath}/${getRouteSegment(property.type)}/${property.id}?groupId=${groupId}`,
    );
  };

  const exceptions: React.ReactNode[] = [];
  if (property.conditionUse && property.conditionUse !== '01') {
    const notFound = property.conditionUse === '03';
    exceptions.push(
      <PropertyFlag key="condition" icon={notFound ? 'magnifying-glass' : 'circle-pause'}>
        <ParameterDisplay
          group="ConditionUse"
          code={property.conditionUse}
          fallback={property.conditionUse}
        />
      </PropertyFlag>,
    );
  }
  if (property.isPriceCertified === false) {
    exceptions.push(
      <PropertyFlag key="not-appraised" icon="triangle-exclamation">
        {t('properties.machineryChips.notPriceCertified')}
      </PropertyFlag>,
    );
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      data-property-id={property.id}
      onClick={open}
      onContextMenu={readOnly ? undefined : e => onContextMenu(e, property, groupId)}
      {...(!readOnly ? attributes : {})}
      {...(!readOnly ? listeners : {})}
      className={clsx(
        'relative border border-gray-200 rounded-lg overflow-hidden bg-white transition-all',
        'hover:border-gray-300 hover:shadow-md',
        readOnly ? 'cursor-pointer' : 'cursor-grab active:cursor-grabbing',
      )}
    >
      <div className="relative w-full h-[4.4rem] bg-gray-100">
        {property.image ? (
          <>
            <img
              src={property.image}
              alt={property.address}
              loading="lazy"
              decoding="async"
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/35 to-transparent" />
          </>
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Icon name="image" className="text-gray-400 text-xl" />
          </div>
        )}
        {property.photos && property.photos.length > 0 && (
          <span className="absolute bottom-1 right-1 flex items-center gap-1 bg-black/50 text-white rounded-full text-[10px] px-1">
            <Icon name="camera" className="text-[9px]" style="solid" />
            {property.photos.length}
          </span>
        )}
      </div>

      <div className="px-2.5 py-2">
        <h4 className="text-xs font-semibold text-gray-900 truncate" title={property.address}>
          {property.address}
        </h4>
        <span className="inline-flex items-center gap-1.5 text-[11px] text-gray-500 mt-0.5">
          <i className={clsx('w-1.5 h-1.5 rounded-full', getTypeDotColor(property.type))} />
          <ParameterDisplay group="PropertyType" code={property.type} fallback={property.type} />
        </span>
        <p className="text-[11px] text-gray-500 truncate mt-0.5">
          {metaFor(property, t('properties.machineryChips.unregistered'))}
        </p>
        {exceptions.length > 0 && <div className="flex flex-wrap gap-1 mt-1.5">{exceptions}</div>}
      </div>
    </div>
  );
};

interface PropertyCardGridProps {
  group: PropertyGroup;
  onContextMenu: (e: React.MouseEvent, property: PropertyItem, groupId: string) => void;
}

/**
 * The group as a grid of cards.
 *
 * This is the view that answers "why is this page so long": a row spends the full width on one
 * property while using about 40 % of it, so six machines cost six rows. Here the same six fill
 * one or two, and the photo is larger than it was in the list.
 *
 * Piles are deliberately not collapsed here — a grid is already dense, and one lone card standing
 * in for six would read as a mistake.
 */
export const PropertyCardGrid = ({ group, onContextMenu }: PropertyCardGridProps) => {
  const readOnly = usePageReadOnly();

  // An empty group falls through to the shared empty state rather than showing a lone dashed
  // tile next to it.
  if (group.items.length === 0) return null;

  return (
    <div className="grid gap-2 p-2.5 grid-cols-[repeat(auto-fill,minmax(12.5rem,1fr))]">
      {group.items.map(property => (
        <GridCard
          key={property.id}
          property={property}
          groupId={group.id}
          onContextMenu={onContextMenu}
        />
      ))}
      {!readOnly && (
        <PropertyTypeDropdown
          groupId={group.id}
          className="block"
          buttonClassName="w-full h-full min-h-[7rem] justify-center rounded-lg border border-dashed border-gray-300 px-3 py-2 text-xs text-gray-400 hover:border-gray-400 hover:bg-gray-50 hover:text-gray-700"
        />
      )}
    </div>
  );
};

export default PropertyCardGrid;
