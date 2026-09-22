import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import clsx from 'clsx';
import { useAppraisalId, useBasePath } from '@/features/appraisal/context/AppraisalContext';
import type { PropertyGroup, PropertyItem } from '../types';
import Icon from '@shared/components/Icon';
import { PropertyTypeChip } from './PropertyTypeChip';
import { PropertyRowActionsMenu } from './PropertyRowActionsMenu';
import { brandModel, BUILDING_TYPES, MACHINE_TYPES, PlaceValue } from './PropertyCardContent';
import { usePropertyBasePath } from '../hooks/usePropertyBasePath';
import { getRouteSegment as getRouteSegmentFromConfig } from '../utils/propertyTypeConfig';
import { formatAreaNumber, toRaiNganWa } from '../utils/areaFormat';

const getRouteSegment = (type: string): string => getRouteSegmentFromConfig(type) ?? 'land';

/**
 * Coordinates at four decimals — about 11 m, which is plenty to tell two parcels apart, and the
 * only way six columns fit at the 1280 px width these laptops actually run.
 */
const shortCoords = (property: PropertyItem): string | null => {
  if (property.latitude == null || property.longitude == null) return null;
  if (property.latitude === 0 && property.longitude === 0) return null;
  return `${property.latitude.toFixed(4)}, ${property.longitude.toFixed(4)}`;
};

interface PropertyDenseTableProps {
  group: PropertyGroup;
  onEdit: (property: PropertyItem, groupId: string) => void;
  onMoveTo: (property: PropertyItem, groupId: string) => void;
  onCopy: (property: PropertyItem) => void;
  onPaste: (groupId: string) => void;
  onDelete: (property: PropertyItem, groupId: string) => void;
  hasClipboard: boolean;
}

/**
 * The whole group as one scannable table.
 *
 * Replaces the old PropertyTable. Two things are different beyond the density: the headers are
 * translated, and a group made entirely of machines swaps its columns for the machine facts —
 * showing "Area" over a column of dimensions was the old table's way of saying nothing.
 *
 * No drag and drop here; ordering happens in the list and card views, and this one offers
 * "Move to" in the row menu instead.
 */
export const PropertyDenseTable = ({
  group,
  onEdit,
  onMoveTo,
  onCopy,
  onPaste,
  onDelete,
  hasClipboard,
}: PropertyDenseTableProps) => {
  const { t } = useTranslation('appraisal');
  const navigate = useNavigate();
  const appraisalId = useAppraisalId();
  const layoutBasePath = useBasePath();
  const propertyBasePath = usePropertyBasePath();

  /** A group of nothing but machines gets machine columns. A mixed group keeps the land ones. */
  const isMachineGroup = useMemo(
    () => group.items.length > 0 && group.items.every(item => MACHINE_TYPES.has(item.type)),
    [group.items],
  );

  /** Same idea for buildings, whose location column is empty by construction. */
  const isBuildingGroup = useMemo(
    () => group.items.length > 0 && group.items.every(item => BUILDING_TYPES.has(item.type)),
    [group.items],
  );

  const openProperty = (property: PropertyItem) => {
    if (!appraisalId) return;
    navigate(
      `${layoutBasePath}/${propertyBasePath}/${getRouteSegment(property.type)}/${property.id}?groupId=${group.id}`,
    );
  };

  const headerClass =
    'px-3 py-1.5 text-left text-[10px] font-bold uppercase tracking-wider text-gray-400 whitespace-nowrap';

  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead>
          <tr className="border-b border-gray-100">
            <th className={clsx(headerClass, 'w-12')}>
              <span className="sr-only">{t('properties.table.image')}</span>
            </th>
            <th className={headerClass}>
              {t(isMachineGroup ? 'properties.stackColumns.machine' : 'properties.table.property')}
            </th>
            {isMachineGroup ? (
              <>
                <th className={headerClass}>{t('properties.stackColumns.registrationNumber')}</th>
                <th className={headerClass}>{t('properties.stackColumns.registrationStatus')}</th>
                <th className={headerClass}>{t('properties.stackColumns.brandModel')}</th>
              </>
            ) : (
              <>
                <th className={headerClass}>{t('properties.table.type')}</th>
                <th className={clsx(headerClass, 'text-right')}>{t('properties.table.area')}</th>
                <th className={headerClass}>
                  {t(
                    isBuildingGroup ? 'properties.table.buildingType' : 'properties.table.location',
                  )}
                </th>
                <th className={clsx(headerClass, 'text-right')}>
                  {t('properties.table.coordinates')}
                </th>
              </>
            )}
            <th className={clsx(headerClass, 'w-10')}>
              <span className="sr-only">{t('properties.table.actions')}</span>
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-50">
          {group.items.map(property => {
            const coords = shortCoords(property);
            return (
              <tr
                key={property.id}
                data-property-id={property.id}
                className="hover:bg-gray-50/70 transition-colors"
              >
                <td
                  className="px-3 py-1 align-middle cursor-pointer"
                  onClick={() => openProperty(property)}
                >
                  <div className="w-8 h-6 rounded bg-gray-100 overflow-hidden">
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
                        <Icon name="image" className="text-gray-400 text-[10px]" />
                      </div>
                    )}
                  </div>
                </td>

                <td
                  className="px-3 py-1 max-w-0 align-middle cursor-pointer"
                  onClick={() => openProperty(property)}
                >
                  <p
                    className="text-xs font-medium text-gray-900 truncate"
                    title={property.address}
                  >
                    {property.address}
                  </p>
                </td>

                {isMachineGroup ? (
                  <>
                    <td className="px-3 py-1 text-[11px] text-gray-500 tabular-nums whitespace-nowrap">
                      {property.registrationNumber || <span className="text-gray-400">—</span>}
                    </td>
                    <td className="px-3 py-1 text-[11px] text-gray-500 whitespace-nowrap">
                      {property.registrationStatus
                        ? t('properties.machineryChips.registered')
                        : t('properties.machineryChips.unregistered')}
                    </td>
                    <td className="px-3 py-1 align-middle text-[11px] text-gray-500 whitespace-nowrap">
                      {brandModel(property) || <span className="text-gray-400">—</span>}
                    </td>
                  </>
                ) : (
                  <>
                    <td className="px-3 py-1 align-middle whitespace-nowrap">
                      <PropertyTypeChip code={property.type} variant="dot" />
                    </td>
                    <td className="px-3 py-1 align-middle text-[11px] text-gray-600 tabular-nums text-right whitespace-nowrap">
                      {property.areaValue == null ? (
                        <span className="text-gray-400">—</span>
                      ) : property.areaUnit === 'wa' ? (
                        toRaiNganWa(property.areaValue)
                      ) : (
                        formatAreaNumber(property.areaValue)
                      )}
                    </td>
                    {/* Location wraps rather than truncates: a Thai address ends in the
                        subdistrict/district/province that tell two neighbouring parcels apart,
                        so cutting the tail is cutting the useful half. The property column keeps
                        its ellipsis — its title repeats in the row beneath it. */}
                    <td className="px-3 py-1 min-w-[15rem] align-middle">
                      <p className="text-[11px] leading-snug text-gray-500">
                        <PlaceValue property={property} />
                      </p>
                    </td>
                    <td className="px-3 py-1 align-middle text-[11px] text-gray-500 tabular-nums text-right whitespace-nowrap">
                      {coords ?? (
                        <span className="italic text-gray-400">{t('properties.coordsNotSet')}</span>
                      )}
                    </td>
                  </>
                )}

                <td className="px-2 py-1 align-middle">
                  <PropertyRowActionsMenu
                    property={property}
                    groupId={group.id}
                    onEdit={onEdit}
                    onMoveTo={onMoveTo}
                    onCopy={onCopy}
                    onPaste={onPaste}
                    onDelete={onDelete}
                    hasClipboard={hasClipboard}
                  />
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};

export default PropertyDenseTable;
