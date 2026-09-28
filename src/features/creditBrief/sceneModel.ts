import type { TFunction } from 'i18next';
import { typeToBase } from '@/features/appraisal/utils/propertyTypeConfig';
import type { BriefAsset, BriefProject } from './api/appraisalBrief';

/** The four things the scene knows how to draw. Vehicles and vessels have no shape here. */
export type Kind = 'land' | 'building' | 'condo' | 'machine';

export interface SceneItem {
  kind: Kind;
  /**
   * The storey count of each object actually drawn, tallest first — so three
   * buildings of 4, 2 and 1 storeys are drawn as three different volumes rather
   * than three copies of one. Length is the number of objects to draw.
   */
  storeysEach: number[];
  /** Condo only: the floors units occupy, marked on the tower. */
  occupied: number[];
  label: string;
  detail: string | null;
  /** How many properties of this kind the application really has. */
  count: number;
  /** count − drawn, for the "และอีก N" on the callout. */
  hidden: number;
}

/**
 * How many objects of a kind are drawn before the rest become "และอีก N".
 *
 * Machines and condos are 1, for different reasons. Twenty-eight identical
 * machine boxes say nothing the count badge does not and would crowd out
 * everything else; several condo units are several FLOORS of one tower, and a
 * second tower would claim a second building the bank does not hold.
 *
 * Buildings get 4 because their storey counts differ and the shape is the only
 * place that shows; land gets 4 because more parcels genuinely mean a wider
 * site, which is worth seeing.
 */
const DRAW_CAP: Record<Kind, number> = { machine: 1, condo: 1, building: 4, land: 4 };

/**
 * The BuildingType code that means "อื่นๆ". Its label is literally "other", so
 * for that one code the appraiser's own words in `buildingTypeOther` are the
 * answer and the label is not.
 */
const BUILDING_TYPE_OTHER = '99';

const kindOf = (propertyType: string | null): Kind | null => {
  if (!propertyType) return null;
  if (propertyType === 'MAC') return 'machine';
  const base = typeToBase[propertyType];
  if (base === 'land') return 'land';
  if (base === 'building' || base === 'landBuilding') return 'building';
  if (base === 'condo') return 'condo';
  return null;
};

/**
 * A land-and-building property is one row but two things on a site: the parcel
 * is the ground and the structure stands on it. Drawing only the structure
 * would show a building floating, and drawing only the parcel would lose the
 * building entirely.
 */
const bringsLand = (propertyType: string | null) =>
  !!propertyType && typeToBase[propertyType] === 'landBuilding';

/**
 * Thai land area is mixed-radix — 100 square wa to a ngan, 4 ngan to a rai — so
 * the parts are summed separately and carried. Null when no parcel carries an
 * area at all, because "0-0-0" reads as "measured, and it is nothing".
 */
export const totalArea = (assets: BriefAsset[]) => {
  const withArea = assets.filter(
    a => a.areaRai != null || a.areaNgan != null || a.areaSquareWa != null,
  );
  if (withArea.length === 0) return null;

  // Rounded FIRST, then carried. Rounding after the carry lets a remainder of 99.97 wa round to
  // exactly 100 and be printed as "0 งาน 100 วา" — a unit that does not exist — instead of
  // "1 งาน 0 วา". Land areas arrive with two decimals, so a remainder that close to the radix is
  // an ordinary total, not a corner case.
  let wa = Math.round(withArea.reduce((s, a) => s + (a.areaSquareWa ?? 0), 0) * 10) / 10;
  let ngan = withArea.reduce((s, a) => s + (a.areaNgan ?? 0), 0) + Math.floor(wa / 100);
  wa = Math.round((wa % 100) * 10) / 10;
  const rai = withArea.reduce((s, a) => s + (a.areaRai ?? 0), 0) + Math.floor(ngan / 4);
  ngan %= 4;
  return { rai, ngan, wa };
};

/** How many condo units are named before the rest become "+N". */
const MAX_CONDO_UNITS = 3;

/**
 * "ห้อง 1205 ชั้น 12" for each unit on the application.
 *
 * The room number and the floor are what identify a condo unit to the person
 * reading — NOT how tall the building is. The label used to say "ชั้น 12 จาก 35",
 * which answered a question nobody asked and left out the room entirely; the
 * tower's height is already visible in the drawing.
 *
 * `title` is the room number for a condo: the brief resolves it as
 * COALESCE(titleNumber, roomNumber, description).
 */
export const condoUnitLabels = (units: BriefAsset[], t: TFunction<'appraisal'>): string[] =>
  units
    .map(u => {
      const room = u.title?.trim() || null;
      const floor = parseFloor(u.condoFloorNumber);
      if (room && floor) return t('activityTracking.brief.collateral.condoUnit', { room, floor });
      if (floor) return t('activityTracking.brief.collateral.condoUnitNoRoom', { floor });
      if (room) return t('activityTracking.brief.collateral.condoUnitNoFloor', { room });
      return null;
    })
    .filter(Boolean) as string[];

/** `CondoAppraisalDetails.FloorNumber` is nvarchar and carries '-' where nobody filled it in. */
const parseFloor = (raw: string | null): number | null => {
  if (!raw) return null;
  const n = Number.parseInt(raw, 10);
  return Number.isFinite(n) && n > 0 ? n : null;
};

/**
 * Turn the flat asset list into the handful of objects the scene draws.
 *
 * One entry per KIND, not per property: the scene answers "what kind of site is
 * this", and the rows underneath carry the itemisation. Counts ride on the
 * callout badge so nothing is lost by collapsing.
 */
export function buildScene(
  assets: BriefAsset[],
  project: BriefProject | null,
  t: TFunction<'appraisal'>,
  buildingTypeName: (code: string | null) => string,
): SceneItem[] {
  /**
   * A block appraisal has no properties at all — the project IS the collateral.
   * Drawn as one object of whatever the project is made of, carrying the unit
   * count, rather than as N units: a 1,614-unit project is one site.
   */
  if (project) {
    const base = project.projectType ? typeToBase[project.projectType] : undefined;
    const area = totalArea([
      {
        areaRai: project.landAreaRai,
        areaNgan: project.landAreaNgan,
        areaSquareWa: project.landAreaSquareWa,
      } as BriefAsset,
    ]);
    const areaText = area
      ? t('activityTracking.brief.collateral.totalArea', {
          area: [
            `${area.rai} ${t('activityTracking.brief.collateral.rai')}`,
            `${area.ngan} ${t('activityTracking.brief.collateral.ngan')}`,
            `${area.wa} ${t('activityTracking.brief.collateral.wa')}`,
          ].join(' '),
        })
      : null;
    const name = project.projectName || t('activityTracking.brief.collateral.project');
    const units = project.unitForSaleCount ?? project.unitCount ?? 1;

    /**
     * A VERTICAL project — a condominium. Drawn as its actual towers at their
     * actual height: two 30-storey towers and one 8-storey block are not the
     * same security, and the shape is the only place that shows it.
     */
    if (base === 'condo') {
      const towers = Math.max(1, Math.min(project.towerCount || 1, 3));
      const items: SceneItem[] = [];

      /* The parcel the towers stand on. A condominium project owns its land —
         it was being drawn on the dashed "no parcel" apron, which says the
         opposite — and the area is a fact about the security that the tower
         count does not replace. Only when the project records one: a project
         with no land figure should not be given an invented plot. */
      if (area) {
        items.push({
          kind: 'land',
          storeysEach: [1],
          occupied: [],
          label: t('activityTracking.brief.collateral.kinds.land'),
          detail: areaText,
          count: 1,
          hidden: 0,
        });
      }

      items.push({
        kind: 'condo',
        storeysEach: Array.from({ length: towers }, () => Math.max(1, project.maxFloor ?? 1)),
        occupied: [],
        label: name,
        detail:
          project.towerCount > 0 && project.maxFloor
            ? t('activityTracking.brief.collateral.towerFloors', {
                towers: project.towerCount,
                floors: project.maxFloor,
              })
            : areaText,
        count: units,
        hidden: Math.max(0, (project.towerCount || 0) - towers),
      });

      return items;
    }

    /**
     * A HORIZONTAL project — a housing estate. It has no towers, so the shape
     * is a plot with houses standing on it. Two items, not one: the land is
     * real collateral here, and returning only the structure left the houses
     * on the dashed "no parcel" apron, which says the opposite of the truth.
     */
    if (base === 'landBuilding' || base === 'land') {
      const items: SceneItem[] = [
        {
          kind: 'land',
          storeysEach: [1],
          occupied: [],
          label: base === 'land' ? name : t('activityTracking.brief.collateral.kinds.land'),
          detail: areaText,
          count: base === 'land' ? units : 1,
          hidden: 0,
        },
      ];
      if (base === 'landBuilding') {
        const houses = Math.max(1, Math.min(project.unitCount || 1, 4));
        const storeys = Math.max(1, Math.round(project.unitStoreys ?? 1));
        items.push({
          kind: 'building',
          storeysEach: Array.from({ length: houses }, () => storeys),
          occupied: [],
          label: name,
          detail: project.unitStoreys
            ? t('activityTracking.brief.collateral.houseStoreys', { count: units, floors: storeys })
            : null,
          count: units,
          hidden: Math.max(0, units - houses),
        });
      }
      return items;
    }

    // Some other project shape — draw it as a single volume rather than nothing.
    return [
      {
        kind: 'building',
        storeysEach: [1],
        occupied: [],
        label: name,
        detail: areaText,
        count: units,
        hidden: 0,
      },
    ];
  }

  const byKind = new Map<Kind, BriefAsset[]>();
  const add = (k: Kind, a: BriefAsset) => byKind.set(k, [...(byKind.get(k) ?? []), a]);

  for (const asset of assets) {
    const kind = kindOf(asset.propertyType);
    if (!kind) continue;
    add(kind, asset);
    if (bringsLand(asset.propertyType)) add('land', asset);
  }

  const label = (k: Kind) => t(`activityTracking.brief.collateral.kinds.${k}`);
  const items: SceneItem[] = [];

  const land = byKind.get('land');
  if (land?.length) {
    const area = totalArea(land);
    const drawn = Math.min(land.length, DRAW_CAP.land);
    items.push({
      kind: 'land',
      storeysEach: Array.from({ length: drawn }, () => 1),
      occupied: [],
      label: label('land'),
      /* Here "รวม" is correct: the scene's land object stands for every parcel on
         the application, whatever type carried it. */
      detail: area
        ? t('activityTracking.brief.collateral.totalArea', {
            area: [
              `${area.rai} ${t('activityTracking.brief.collateral.rai')}`,
              `${area.ngan} ${t('activityTracking.brief.collateral.ngan')}`,
              `${area.wa} ${t('activityTracking.brief.collateral.wa')}`,
            ].join(' '),
          })
        : null,
      count: land.length,
      hidden: land.length - Math.min(land.length, DRAW_CAP.land),
    });
  }

  const buildings = byKind.get('building');
  if (buildings?.length) {
    /* Tallest first, then capped: the storey lines are the one thing the shape
       says that the rows do not, so if some must be dropped it should be the
       ones that say the least. */
    const storeysEach = buildings
      .map(b => Math.max(1, Math.round(b.numberOfFloors ?? 1)))
      .sort((a, b) => b - a)
      .slice(0, DRAW_CAP.building);
    const names = [
      ...new Set(
        buildings
          .map(b =>
            b.buildingType === BUILDING_TYPE_OTHER
              ? (b.buildingTypeOther?.trim() ?? '')
              : buildingTypeName(b.buildingType),
          )
          .filter(Boolean),
      ),
    ];
    items.push({
      kind: 'building',
      storeysEach,
      occupied: [],
      label: label('building'),
      detail: names.length ? names.slice(0, 2).join(', ') : null,
      count: buildings.length,
      hidden: buildings.length - storeysEach.length,
    });
  }

  const condos = byKind.get('condo');
  if (condos?.length) {
    const storeys = Math.max(1, ...condos.map(c => Math.round(c.condoFloors ?? 1)));
    const occupied = [
      ...new Set(condos.map(c => parseFloor(c.condoFloorNumber)).filter(Boolean)),
    ] as number[];
    const unitLabels = condoUnitLabels(condos, t);
    items.push({
      kind: 'condo',
      storeysEach: [storeys],
      occupied,
      label: label('condo'),
      detail: unitLabels.length
        ? unitLabels.slice(0, MAX_CONDO_UNITS).join(', ') +
          (unitLabels.length > MAX_CONDO_UNITS ? ` +${unitLabels.length - MAX_CONDO_UNITS}` : '')
        : null,
      count: condos.length,
      hidden: 0,
    });
  }

  const machines = byKind.get('machine');
  if (machines?.length) {
    const names = [...new Set(machines.map(m => m.machineName).filter(Boolean))] as string[];
    items.push({
      kind: 'machine',
      storeysEach: [1],
      occupied: [],
      label: label('machine'),
      detail: names[0] ?? null,
      count: machines.length,
      hidden: 0,
    });
  }

  return items;
}
