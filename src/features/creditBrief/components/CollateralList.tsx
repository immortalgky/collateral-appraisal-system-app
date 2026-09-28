import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import Icon from '@/shared/components/Icon';
import ParameterDisplay from '@/shared/components/ParameterDisplay';
import { findAddressBySubDistrictCode } from '@/shared/data/thaiAddresses';
import { getPropertyIcon, typeToBase } from '@/features/appraisal/utils/propertyTypeConfig';
import { condoUnitLabels, totalArea } from '../sceneModel';
import type { BriefAsset } from '../api/appraisalBrief';

/**
 * The collateral on an appraisal, as one summary line per property type.
 *
 * Not an itemised list. A credit officer opens this panel to answer "what security is on this
 * application", and the per-item detail actively got in the way of that: a machinery appraisal
 * carries dozens of properties whose title, area and location are all blank, so the section
 * became twenty-eight identical "เครื่องจักร —" rows that pushed the documents and the log off
 * the screen. "เครื่องจักร 28 รายการ" is the entire answer.
 *
 * No expand control either — a disclosure triangle implies there is something worth opening, and
 * for this reader there is not. Whoever needs parcel-level detail has the appraisal workspace.
 */
interface CollateralListProps {
  assets: BriefAsset[];
}

/**
 * The BuildingType code that means "อื่นๆ". Its label is literally "other",
 * which tells the reader nothing — the free text in `buildingTypeOther` is what
 * the appraiser actually wrote, so that is shown in its place.
 */
const BUILDING_TYPE_OTHER = '99';

/** How many buildings to describe individually before falling back to "+N". */
const MAX_BUILDINGS = 3;

/** How many place names to spell out before falling back to a count. */
const MAX_PLACES = 2;

/**
 * `BriefAsset.location` carries a sub-district GEOCODE, not a name — the column it comes from
 * stores the code (see the sub-district gotcha in the address master). Rendering it raw put
 * "100907" on screen, so it is resolved here and the code is dropped if the master has no match
 * rather than shown as a number nobody can read.
 */
const placeName = (location: string | null): string | null => {
  if (!location) return null;
  const address = findAddressBySubDistrictCode(location);
  if (!address) return /^\d+$/.test(location) ? null : location;
  return address.provinceName;
};

const CollateralList = ({ assets }: CollateralListProps) => {
  const { t } = useTranslation('appraisal');

  /**
   * One row per property type, in the order the types first appear.
   *
   * That order comes from the server, which now sorts by property GROUP then sequence-in-group —
   * the same walk the Property Information screen makes. It is not the appraisal's
   * SequenceNumber, which is order of entry and is a different axis entirely: on a real appraisal
   * that reads 2, 12, 1, 32, 33 across group 1, so it put the types in an order matching no other
   * screen. Sorting by size was tried and dropped for the same reason — consistency with the rest
   * of the system beats a locally tidier ranking.
   */
  const groups = useMemo(() => {
    const byType = new Map<string, BriefAsset[]>();
    for (const asset of assets) {
      const key = asset.propertyType ?? '';
      const bucket = byType.get(key);
      if (bucket) bucket.push(asset);
      else byType.set(key, [asset]);
    }

    return [...byType.entries()].map(([propertyType, items]) => {
      const places = [
        ...new Set(items.map(i => placeName(i.location)).filter(Boolean)),
      ] as string[];
      /**
       * What the buildings in this group actually are. A group row that says only
       * "สิ่งปลูกสร้าง 2 รายการ" leaves the reader none the wiser — the type and the storey count
       * are the two facts that tell a credit officer what is standing on the land.
       *
       * One entry PER BUILDING, not per distinct description: three identical townhouses are
       * three buildings, and collapsing them to one would understate the security. The row caps
       * at MAX_BUILDINGS and counts the remainder instead, so it stays one line.
       */
      const buildings = items
        .filter(i => i.buildingType)
        .map(i => ({
          type: i.buildingType as string,
          // Only for '99'. Every other code has a label worth resolving, and a stray remark on
          // one of those must not override it.
          remark:
            i.buildingType === BUILDING_TYPE_OTHER ? (i.buildingTypeOther?.trim() ?? null) : null,
          floors: i.numberOfFloors ? Math.round(i.numberOfFloors) : null,
        }));

      /**
       * Machines, named. Same rule as buildings — one entry per machine, capped, because a line
       * of twenty-eight identical names is not a summary. Distinct names ARE collapsed here,
       * unlike buildings: repeating "เครื่องผลิตเม็ดพลาสติก" four times says nothing the count
       * beside it has not already said, whereas a building's storey count varies per building.
       */
      const machines = [...new Set(items.map(i => i.machineName).filter(Boolean))] as string[];

      /* The same room-and-floor line the scene callout shows, from the same
         helper — two different descriptions of one unit on one screen is worse
         than either of them alone.
         
         ONLY for condo types. `condoUnitLabels` reads the room number out of
         `title`, and `title` is COALESCE(titleNumber, roomNumber, description):
         on a land-and-building property that resolves to the TITLE DEED number,
         so every such row was being labelled "ห้อง 1" after its deed. */
      const condos = typeToBase[propertyType] === 'condo' ? condoUnitLabels(items, t) : [];

      return {
        propertyType,
        count: items.length,
        area: totalArea(items),
        condos: condos.slice(0, MAX_BUILDINGS),
        condosOverflow: Math.max(0, condos.length - MAX_BUILDINGS),
        machines: machines.slice(0, MAX_BUILDINGS),
        machinesOverflow: Math.max(0, machines.length - MAX_BUILDINGS),
        buildings: buildings.slice(0, MAX_BUILDINGS),
        buildingsOverflow: Math.max(0, buildings.length - MAX_BUILDINGS),
        // Two names, then a count: "นครสวรรค์, ชัยนาท และอีก 3 จังหวัด" stays one line where the
        // full list would wrap and stop being a summary.
        where:
          places.length === 0
            ? null
            : places.length <= MAX_PLACES
              ? places.join(', ')
              : `${places.slice(0, MAX_PLACES).join(', ')} ${t(
                  'activityTracking.brief.collateral.morePlaces',
                  {
                    count: places.length - MAX_PLACES,
                  },
                )}`,
      };
    });
  }, [assets, t]);

  return (
    <ul className="flex flex-col gap-2">
      {groups.map(group => (
        <li
          key={group.propertyType || 'unspecified'}
          className="flex items-center justify-between gap-4 rounded-lg bg-gray-50 px-3 py-2.5 ring-1 ring-gray-200"
        >
          <div className="flex min-w-0 items-center gap-2.5">
            <span className="grid h-7 w-7 flex-none place-items-center rounded-md bg-white text-amber-600 ring-1 ring-gray-200">
              {/* getPropertyIcon, not typeToIconName. The latter is only the Font Awesome
                  FALLBACK — land, building, land-and-building and condo are drawn from this
                  project's own sprite (`/icons/property.svg`) precisely because Font Awesome had
                  no honest glyph for them, which is why land was rendering as a globe here and a
                  building and a land-and-building differed only by a chimney. A lease type picks
                  up its freehold twin's drawing for free. */}
              <Icon
                name={getPropertyIcon(group.propertyType).name}
                style={getPropertyIcon(group.propertyType).style}
                className="h-3.5 w-3.5"
              />
            </span>
            <div className="min-w-0">
              <span className="block truncate text-sm font-medium text-gray-900">
                <ParameterDisplay
                  group="PropertyType"
                  code={group.propertyType}
                  fallback={
                    group.propertyType || t('activityTracking.brief.collateral.unspecifiedType')
                  }
                />
              </span>
              {/* Whether this line exists at all. `condos` belongs here for the same reason it
                  belongs in the separators below: a condo-only group has no building, no machine
                  and a null area, so without it the whole line — unit labels included — was
                  dropped for any condo group whose sub-district is unset. */}
              {(group.buildings.length > 0 ||
                group.machines.length > 0 ||
                group.condos.length > 0 ||
                group.area ||
                group.where) && (
                <p className="truncate text-xs text-gray-500">
                  {group.buildings.map((b, i) => (
                    /* Index in the key on purpose: two identical buildings are two entries here,
                       so the description is not unique and must not be the identity. */
                    <span key={`${b.type}-${b.floors}-${i}`}>
                      {i > 0 && ', '}
                      {b.remark ? (
                        b.remark
                      ) : (
                        <ParameterDisplay group="BuildingType" code={b.type} fallback={b.type} />
                      )}
                      {b.floors
                        ? ` ${t(`${'activityTracking.brief.collateral.floors'}`, { count: b.floors })}`
                        : ''}
                    </span>
                  ))}
                  {group.buildingsOverflow > 0 && (
                    <span className="font-medium text-gray-400"> +{group.buildingsOverflow}</span>
                  )}
                  {group.machines.map((name, i) => (
                    <span key={`${name}-${i}`}>
                      {i > 0 && ', '}
                      {name}
                    </span>
                  ))}
                  {group.machinesOverflow > 0 && (
                    <span className="font-medium text-gray-400"> +{group.machinesOverflow}</span>
                  )}

                  {/* Identical to the scene callout by design: two different descriptions of one
                      unit on one screen is worse than either of them alone. */}
                  {group.condos.join(', ')}
                  {group.condosOverflow > 0 && (
                    <span className="font-medium text-gray-400"> +{group.condosOverflow}</span>
                  )}

                  {group.area && (
                    <>
                      {(group.buildings.length > 0 ||
                        group.machines.length > 0 ||
                        group.condos.length > 0) &&
                        ' · '}
                      {/* The bare figure, NOT the "รวม …" phrasing. A row is already one property
                          type, and on a group of one — which most are — "total" describes nothing
                          and reads as though it had been added up from somewhere. The only place
                          that word belongs is the section header, where the figure really does
                          span every type on the application. */}
                      {[
                        `${group.area.rai} ${t(`${'activityTracking.brief.collateral.rai'}`)}`,
                        `${group.area.ngan} ${t(`${'activityTracking.brief.collateral.ngan'}`)}`,
                        `${group.area.wa} ${t(`${'activityTracking.brief.collateral.wa'}`)}`,
                      ].join(' ')}
                    </>
                  )}

                  {/* Every kind that can precede the province, `condos` included. Leaving it out
                      ran the unit labels straight into the place name — "ห้อง 1205 ชั้น
                      12กรุงเทพมหานคร" — because a condo group has no building, no machine, and a
                      null area (its area lives on LandTitles, which a condo row does not have), so
                      not one arm of the test was true on exactly the groups that needed it. */}
                  {(group.buildings.length > 0 ||
                    group.machines.length > 0 ||
                    group.condos.length > 0 ||
                    group.area) &&
                    group.where &&
                    ' · '}
                  {group.where}
                </p>
              )}
            </div>
          </div>
          <span className="flex-none rounded-full bg-white px-2.5 py-1 text-xs font-semibold tabular-nums text-gray-600 ring-1 ring-gray-200">
            {t('activityTracking.sections.itemsCount', { count: group.count })}
          </span>
        </li>
      ))}
    </ul>
  );
};

export default CollateralList;
