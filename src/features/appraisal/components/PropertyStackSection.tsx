import React from 'react';
import { useTranslation } from 'react-i18next';
import type { PropertyItem } from '../types';
import Icon from '@shared/components/Icon';
import ParameterDisplay from '@shared/components/ParameterDisplay';
import { PropertyCard } from './PropertyCard';
import {
  BUILDING_TYPES,
  MACHINE_TYPES,
  PropertyFlag,
  STACK_GRID_MACHINE,
  STACK_GRID_PROPERTY,
} from './PropertyCardContent';
import { formatAreaNumber, toRaiNganWa } from '../utils/areaFormat';
import { getPropertyIcon } from '../utils/propertyTypeConfig';

/** Width of PropertyCard's drag gutter. The header offsets by it so labels sit over their column. */
const HANDLE_GUTTER = 'w-5';

/** ConditionUse codes, matching PropertyCardContent: '01' is the everyday case, '03' not found. */
const IN_USE_CONDITION = '01';
const NOT_FOUND_CONDITION = '03';

interface PropertyStackSectionProps {
  /** The property type every item in this pile shares. */
  type: string;
  items: PropertyItem[];
  groupId: string;
  isExpanded: boolean;
  onToggle: (type: string) => void;
  onContextMenu: (e: React.MouseEvent, property: PropertyItem, groupId: string) => void;
  onShowOnMap?: (propertyId: string) => void;
}

/**
 * A pile of same-type properties inside a group.
 *
 * A group with six machines used to render six full-height cards, each repeating the same three
 * chips; expanded, this renders them as aligned columns instead, so the eye runs down one column
 * rather than re-reading every row. Collapsed, the whole pile is a single card.
 *
 * Every item stays a `PropertyCard`, expanded or collapsed, because that is the node dnd-kit has
 * registered as sortable. Collapsed items are kept in the DOM at zero height rather than removed
 * — drop them and dragging inside the group silently stops working, with no error to notice.
 */
export const PropertyStackSection = ({
  type,
  items,
  groupId,
  isExpanded,
  onToggle,
  onContextMenu,
  onShowOnMap,
}: PropertyStackSectionProps) => {
  const { t } = useTranslation('appraisal');
  const isMachine = MACHINE_TYPES.has(type);
  const gridClass = isMachine ? STACK_GRID_MACHINE : STACK_GRID_PROPERTY;

  // Plain computation, not memoised: it loops over a handful of items, and holding translated
  // text in a memo froze whichever language was loaded at first render — on a reload that is the
  // English fallback, because Thai arrives as a lazy chunk a moment later.
  const summary = (() => {
    if (isMachine) {
      const registered = items.filter(i => i.registrationStatus).length;
      const brand = items.find(i => i.brand)?.brand;
      return [brand, t('properties.registeredCount', { registered, total: items.length })]
        .filter(Boolean)
        .join(' · ');
    }
    const parts: string[] = [];
    let wa = 0;
    let sqm = 0;
    for (const item of items) {
      if (item.areaValue == null) continue;
      if (item.areaUnit === 'wa') wa += item.areaValue;
      else sqm += item.areaValue;
    }
    if (wa > 0) parts.push(`${toRaiNganWa(wa)} ${t('properties.units.raiNganWa')}`);
    if (sqm > 0) parts.push(`${formatAreaNumber(sqm)} ${t('properties.units.sqm')}`);
    const locations = items.map(i => i.location).filter(l => l && l !== '-');
    if (locations.length > 0) {
      parts.push(
        locations.length > 1
          ? `${locations[0]} +${locations.length - 1}`
          : (locations[0] as string),
      );
    }
    return parts.join(' · ');
  })();

  /**
   * What is wrong inside the pile, named rather than counted.
   *
   * A bare "⚠ 2" says something needs attention but not what, which is no use while deciding
   * whether to open the pile at all — the mock spelled each one out. Identical problems are
   * folded together and carry their own count, so six unregistered machines are one chip, not
   * six.
   */
  const notPriceCertified = items.filter(i => i.isPriceCertified === false).length;
  const conditionCounts = items.reduce<Map<string, number>>((acc, item) => {
    if (item.conditionUse && item.conditionUse !== IN_USE_CONDITION) {
      acc.set(item.conditionUse, (acc.get(item.conditionUse) ?? 0) + 1);
    }
    return acc;
  }, new Map());

  const hiddenCards = (
    <div className="h-0 overflow-hidden" aria-hidden="true">
      <div className="opacity-0 pointer-events-none">
        {items.map(item => (
          <PropertyCard
            key={item.id}
            property={item}
            groupId={groupId}
            onContextMenu={onContextMenu}
          />
        ))}
      </div>
    </div>
  );

  if (!isExpanded) {
    const withImages = items.filter(i => i.image).slice(0, 6);
    return (
      <div>
        <button
          type="button"
          onClick={() => onToggle(type)}
          className="w-full flex items-center gap-3 px-3 py-2 text-left bg-white hover:bg-gray-50/70 transition-colors"
        >
          <div className="w-[6.6rem] h-[4.1rem] rounded-lg overflow-hidden bg-gray-50 flex-shrink-0">
            {withImages.length > 0 ? (
              <div
                className={`w-full h-full grid ${
                  withImages.length === 1
                    ? 'grid-cols-1'
                    : withImages.length <= 4
                      ? 'grid-cols-2 grid-rows-2'
                      : 'grid-cols-3 grid-rows-2'
                }`}
              >
                {withImages.map(item => (
                  <img
                    key={item.id}
                    src={item.image}
                    alt={item.address}
                    loading="lazy"
                    decoding="async"
                    className="w-full h-full object-cover"
                  />
                ))}
              </div>
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <Icon
                  name={getPropertyIcon(type).name}
                  className="text-2xl text-gray-400"
                  style={getPropertyIcon(type).style}
                />
              </div>
            )}
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h3 className="text-[13px] font-semibold text-gray-900">
                <ParameterDisplay group="PropertyType" code={type} fallback={type} />
              </h3>
              <span className="text-[11px] text-gray-400 tabular-nums">
                {t('properties.itemCount', { n: items.length })}
              </span>
            </div>
            {summary && <p className="text-[11px] text-gray-500 truncate mt-0.5">{summary}</p>}
            {(notPriceCertified > 0 || conditionCounts.size > 0) && (
              <div className="mt-1 flex flex-wrap gap-x-3 gap-y-0.5">
                {notPriceCertified > 0 && (
                  <PropertyFlag icon="triangle-exclamation">
                    {t('properties.machineryChips.notPriceCertified')}
                    {notPriceCertified > 1 && (
                      <span className="tabular-nums"> {notPriceCertified}</span>
                    )}
                  </PropertyFlag>
                )}
                {[...conditionCounts].map(([code, count]) => (
                  <PropertyFlag
                    key={code}
                    icon={code === NOT_FOUND_CONDITION ? 'magnifying-glass' : 'circle-pause'}
                  >
                    <ParameterDisplay group="ConditionUse" code={code} fallback={code} />
                    {count > 1 && <span className="tabular-nums"> {count}</span>}
                  </PropertyFlag>
                ))}
              </div>
            )}
          </div>

          <Icon name="chevron-down" className="text-gray-400 text-xs shrink-0" style="solid" />
        </button>
        {hiddenCards}
      </div>
    );
  }

  return (
    <div className="bg-gray-50/40">
      <div className="flex items-center gap-2 px-3 py-1.5">
        <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">
          <ParameterDisplay group="PropertyType" code={type} fallback={type} />
        </span>
        <span className="text-[11px] text-gray-400 tabular-nums">
          {t('properties.itemCount', { n: items.length })}
        </span>
        <button
          type="button"
          onClick={() => onToggle(type)}
          className="ml-auto inline-flex items-center gap-1 text-[11px] text-gray-400 hover:text-primary transition-colors"
        >
          {t('properties.stack.collapse')}
          <Icon name="chevron-up" className="text-[10px]" style="solid" />
        </button>
      </div>

      {/* Column labels, offset by the drag gutter so each sits over its own column. */}
      <div className="flex items-center border-b border-gray-100 pb-1">
        <div className={`${HANDLE_GUTTER} shrink-0`} />
        <div
          className={`flex-1 min-w-0 pr-3 ${gridClass} text-[10px] font-bold uppercase tracking-wider text-gray-400`}
        >
          <span />
          <span className="truncate">
            {t(isMachine ? 'properties.stackColumns.machine' : 'properties.table.property')}
          </span>
          {isMachine ? (
            <>
              <span className="truncate">{t('properties.stackColumns.registrationNumber')}</span>
              <span className="truncate">{t('properties.stackColumns.registrationStatus')}</span>
              <span className="truncate">{t('properties.stackColumns.brandModel')}</span>
            </>
          ) : (
            <>
              <span className="truncate text-right">{t('properties.table.area')}</span>
              <span className="truncate">
                {t(
                  BUILDING_TYPES.has(type)
                    ? 'properties.table.buildingType'
                    : 'properties.table.location',
                )}
              </span>
              <span className="truncate">{t('properties.table.coordinates')}</span>
            </>
          )}
          <span />
        </div>
      </div>

      <div className="divide-y divide-gray-100">
        {items.map(item => (
          <PropertyCard
            key={item.id}
            property={item}
            groupId={groupId}
            layout="stack"
            onContextMenu={onContextMenu}
            onShowOnMap={onShowOnMap}
          />
        ))}
      </div>
    </div>
  );
};

export default PropertyStackSection;
