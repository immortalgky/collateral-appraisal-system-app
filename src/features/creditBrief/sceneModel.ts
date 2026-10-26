import { toSquareWa } from '@/shared/utils/landArea';
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
export const DRAW_CAP: Record<Kind, number> = { machine: 1, condo: 1, building: 4, land: 4 };

/**
 * The BuildingType code that means "อื่นๆ". Its label is literally "other", so
 * for that one code the appraiser's own words in `buildingTypeOther` are the
 * answer and the label is not.
 */
export const BUILDING_TYPE_OTHER = '99';

export const kindOf = (propertyType: string | null): Kind | null => {
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
export const bringsLand = (propertyType: string | null) =>
  !!propertyType && typeToBase[propertyType] === 'landBuilding';

/** The three parts of a Thai land area, as a property, a title or a project's land records them. */
export interface AreaFields {
  areaRai?: number | null;
  areaNgan?: number | null;
  areaSquareWa?: number | null;
}

/**
 * Thai land area is mixed-radix: 100 square wa to a ngan, 4 ngan to a rai. Each of the three parts
 * can be a decimal (1 rai 2.5 ngan is a real record), so the parts are summed in square wa, rounded
 * to two decimals, and the triple is read off that one total: wa is a remainder below 100 and ngan
 * one below 4, so nothing can overflow ("0 งาน 100 วา") and the triple always agrees with the
 * square-wa figure. The report does exactly this (ThaiLandAreaFormatter.NormalizeTotal). Null when
 * no parcel carries an area at all, because "0-0-0" reads as "measured, and it is nothing".
 */
export const totalArea = (assets: AreaFields[]) => {
  const withArea = assets.filter(
    a => a.areaRai != null || a.areaNgan != null || a.areaSquareWa != null,
  );
  if (withArea.length === 0) return null;
  const sum = (part: keyof AreaFields) => withArea.reduce((s, a) => s + (a[part] ?? 0), 0);
  const squareWa =
    Math.round(toSquareWa(sum('areaRai'), sum('areaNgan'), sum('areaSquareWa')) * 100) / 100;
  const rai = Math.floor(squareWa / 400);
  const afterRai = squareWa - rai * 400;
  const ngan = Math.floor(afterRai / 100);
  const wa = Math.round((afterRai - ngan * 100) * 100) / 100;
  return { rai, ngan, wa };
};

/** A total of 0 is "not recorded", not a plot of no size: null for it, the area otherwise. */
export const recordedArea = <A extends { rai: number; ngan: number; wa: number }>(a: A | null) =>
  a && a.rai + a.ngan + a.wa > 0 ? a : null;

/** The properties that carry land: a parcel, or a parcel with a building on it. What every land figure sums. */
export const landPropertiesOf = (assets: BriefAsset[]) =>
  assets.filter(a => kindOf(a.propertyType) === 'land' || bringsLand(a.propertyType));

/** A number as the screens print it: grouped, with the locale of the language, at most `digits` decimals. */
export type NumberFormatter = (n: number, digits?: number) => string;
const formats = new Map<string, Intl.NumberFormat>();
export const numberFormat =
  (language: string | undefined): NumberFormatter =>
  (n, digits = 0) => {
    // One formatter per locale and precision: building an Intl.NumberFormat costs more than formatting with it.
    const locale = language?.startsWith('th') ? 'th-TH' : 'en-US';
    const key = `${locale}|${digits}`;
    let format = formats.get(key);
    if (!format)
      formats.set(key, (format = new Intl.NumberFormat(locale, { maximumFractionDigits: digits })));
    return format.format(n);
  };

/** "รวม 8 ไร่ 3 งาน 9 วา": a land area in words, the way the section header and the CSS scene say it (wa to two decimals). */
export const areaWords = (
  t: TFunction<'appraisal'>,
  area: { rai: number; ngan: number; wa: number },
  nf: NumberFormatter,
) =>
  t('activityTracking.brief.collateral.totalArea', {
    area: [
      `${nf(area.rai, 2)} ${t('activityTracking.brief.collateral.rai')}`,
      `${nf(area.ngan, 2)} ${t('activityTracking.brief.collateral.ngan')}`,
      `${nf(area.wa, 2)} ${t('activityTracking.brief.collateral.wa')}`,
    ].join(' '),
  });

/** The area a property records in its own fields, or null when it records none (0 is not a record). */
const ownArea = (a: AreaFields) =>
  (a.areaRai ?? 0) + (a.areaNgan ?? 0) + (a.areaSquareWa ?? 0) > 0 ? a : null;

/**
 * The area rows a land property counts for. The report's land figure (the พื้นที่ cell, `total_square_wa`
 * in AppraisalSummaryLandBuildingDataProvider) is made of the property's TITLES: each title's rai-ngan-wa
 * summed per property, then over the group. A title with no area adds nothing, as in the report. Only
 * when the brief sends NO titles (an older API) does the property's own area stand in, which is
 * itself the server's sum of its titles.
 * Not modelled here: the report prints the priced land area when pricing recorded one, and takes off
 * what the appraiser deducted; the brief carries neither.
 */
export const landAreaRows = (a: BriefAsset): AreaFields[] => {
  const titles = a.landTitles ?? [];
  if (titles.length > 0) return titles;
  return ownArea(a) ? [a] : [];
};

/**
 * The land area of properties: ONE rule for the sentence, the card, the hero, the 3D parcel, the CSS
 * scene and the section header, carried and rounded once (see `totalArea`). Null when nothing says,
 * and a total of 0 counts as not recorded.
 */
export const landAreaOf = (land: BriefAsset[]) =>
  recordedArea(totalArea(land.flatMap(landAreaRows)));

/** The land of a project as the area parts `totalArea` sums, so a project and a property are summed alike. */
export const projectArea = (p: BriefProject) =>
  recordedArea(
    totalArea([
      { areaRai: p.landAreaRai, areaNgan: p.landAreaNgan, areaSquareWa: p.landAreaSquareWa },
    ]),
  );

/**
 * A condo unit's room number, as recorded. Not the property's title: with no room number that is
 * free text (the description), which must not be printed as a room.
 */
export const roomOf = (a: Pick<BriefAsset, 'roomNumber'>) => a.roomNumber?.trim() || null;

/**
 * How many condo units are named before the rest become "+N", in the CSS scene's callout and in the
 * 3D scene's highlighted units alike. Three: the CSS callout is one 170px line, which holds three
 * room-and-floor labels at most; the 3D scene counts the units past it (a bad floor on one is still said).
 */
export const MAX_CONDO_UNITS = 3;

/**
 * "ห้อง 1205 ชั้น 12" for each unit on the application.
 *
 * The room number and the floor are what identify a condo unit to the person
 * reading — NOT how tall the building is. The label used to say "ชั้น 12 จาก 35",
 * which answered a question nobody asked and left out the room entirely; the
 * tower's height is already visible in the drawing.
 *
 * The room number is `roomNumber` only. `title` is no substitute: the brief resolves it as
 * COALESCE(titleNumber, roomNumber, description), so without a room number it is free text.
 */
export const condoUnitLabels = (units: BriefAsset[], t: TFunction<'appraisal'>): string[] =>
  units
    .map(u => {
      const room = roomOf(u);
      const floor = parseFloor(u.condoFloorNumber);
      if (room && floor) return t('activityTracking.brief.collateral.condoUnit', { room, floor });
      if (floor) return t('activityTracking.brief.collateral.condoUnitNoRoom', { floor });
      if (room) return t('activityTracking.brief.collateral.condoUnitNoFloor', { room });
      return null;
    })
    .filter(Boolean) as string[];

/**
 * `CondoAppraisalDetails.FloorNumber` is nvarchar and carries '-' where nobody filled it in. A
 * single number is a floor, whatever stray dashes or spaces ride on it ("5 -" is floor 5). Not a
 * floor to place, so unreadable (the text is printed as written, with the warning):
 *  - two numbers in any form ("5-6", "5~6", "5/6", "5,6", "5 และ 6");
 *  - any other letters before the number ("B1", "P2", "LG", "G", "ชั้นใต้ดิน 2": a basement, a car-park
 *    level); only a floor word (ชั้น, ชั้นที่, F, Fl., Floor) may stand before it;
 *  - a negative ("-1").
 */
/** What may stand before the number of a floor: "ชั้น 5", "ชั้นที่ 12", "F5", "Fl.5", "Floor 5". */
/** A dash or minus of any kind (the set summaryText treats as a dash) at the end. */
const MINUS = /[-−–—‐‑‒－﹣]$/;
const FLOOR_WORD = /^\s*(?:ชั้นที่|ชั้น|floor|fl|f)\s*\.?\s*$/i;

export const parseFloor = (raw: string | null): number | null => {
  // Thai digits (๐-๙) are digits.
  const text = raw?.replace(/[๐-๙]/g, d => String(d.charCodeAt(0) - 0x0e50)) ?? '';
  const found = [...text.matchAll(/\d+/g)];
  if (found.length !== 1) return null;
  const before = text.slice(0, found[0].index);
  // Any dash of the report's set straight before the number is a minus sign.
  if (MINUS.test(before) || (/\p{L}/u.test(before) && !FLOOR_WORD.test(before))) return null;
  const n = Number.parseInt(found[0][0], 10);
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
  nf: NumberFormatter,
): SceneItem[] {
  /**
   * A block appraisal has no properties at all — the project IS the collateral.
   * Drawn as one object of whatever the project is made of, carrying the unit
   * count, rather than as N units: a 1,614-unit project is one site.
   */
  if (project) {
    const base = project.projectType ? typeToBase[project.projectType] : undefined;
    const area = projectArea(project);
    const areaText = area ? areaWords(t, area, nf) : null;
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
    const area = landAreaOf(land);
    const drawn = Math.min(land.length, DRAW_CAP.land);
    items.push({
      kind: 'land',
      storeysEach: Array.from({ length: drawn }, () => 1),
      occupied: [],
      label: label('land'),
      /* Here "รวม" is correct: the scene's land object stands for every parcel on
         the application, whatever type carried it. */
      detail: area ? areaWords(t, area, nf) : null,
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
