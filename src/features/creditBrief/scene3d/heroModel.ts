import type { BriefAsset, BriefProject } from '../api/appraisalBrief';
import {
  kindOf,
  landAreaOf,
  landPropertiesOf,
  parseFloor,
  projectArea,
  roomOf,
  type Kind,
} from '../sceneModel';
import { planOf, plotsOf, towersOf, type Plan } from './drawable';
import {
  blockCounts,
  condoHeight,
  primaryLand,
  towerHeight,
  codedLabel,
  capFloors,
  namesImprovement,
  type SceneEnv,
  villageCounts,
} from './model';
import { assetPlaces, placeOf, placeParts } from './places';
import { codeListDisplay, codedDisplay, stated } from './summaryText';
import { dedupe, plural, positive, rnw } from './values';
import { condoGovernmentPrice, landGovernmentPrice } from './summaryItems';

/**
 * What the hero says about the collateral, as plain data: the title and subtitle over the canvas,
 * the tiles of the overview card, the one big figure and the percentage bars. Real recorded fields
 * only: a tile with no value is dropped, and the figure is never a price.
 */

export type TileIcon =
  | 'floors'
  | 'usable'
  | 'age'
  | 'cond'
  | 'area'
  | 'use'
  | 'width'
  | 'shape'
  | 'room'
  | 'height'
  | 'view'
  | 'building'
  | 'units'
  | 'sold'
  | 'plots'
  | 'models'
  | 'progress'
  | 'machine';

export interface HeroTile {
  icon: TileIcon;
  label: string;
  value: string;
  /** A warning on the value, in the scene's own words (a storey count above what is drawn). */
  note?: string;
}

export interface HeroFigure {
  label: string;
  value: string;
  unit: string;
  /** The Government appraisal price per unit of area, when recorded. Never the appraised price. */
  caption: string | null;
}

export interface HeroBar {
  label: string;
  percent: number;
  note: string | null;
}

export interface HeroModel {
  title: string;
  subtitle: string;
  tiles: HeroTile[];
  figure: HeroFigure | null;
  bars: HeroBar[];
}

/** The labels of some codes plus the free text behind code 99 (a raw '-' is no text), as the report lists them. */
const withOther = (
  env: SceneEnv,
  group: Parameters<SceneEnv['label']>[0],
  codes: string[],
  others: (string | null | undefined)[],
) =>
  codeListDisplay(
    dedupe(codes),
    dedupe(others.map(stated).filter((o): o is string => !!o)).join(', '),
    c => env.label(group, c),
  );

/** The tallest building that is a building (not a row of development items). */
const mainBuilding = (plan: Plan) =>
  [...plan.building]
    // Not a row of development items, and not a type-99 building the scene draws as a fence or a tank.
    .filter(a => !a.isDevelopmentOnly && !namesImprovement(a))
    .sort((a, b) => (b.numberOfFloors ?? 0) - (a.numberOfFloors ?? 0))[0] ?? null;

/** The Government appraisal rate for the figure card's caption; null when none is recorded. */
const governmentCaption = (env: SceneEnv, text: string | null) =>
  text ? env.t('hero.figure.governmentPrice', { text }) : null;

const tiles = (
  rows: [TileIcon, string, string | number | null | false | undefined, string?][],
): HeroTile[] =>
  rows.flatMap(([icon, label, value, note]) =>
    value ? [{ icon, label, value: String(value), ...(note ? { note } : {}) }] : [],
  );

/** The scene's warning for a storey count it cannot draw as recorded, in the scene's words; the tile keeps the recorded value. */
const floorsNote = (env: SceneEnv, floors: number) => capFloors(env, floors).warning ?? undefined;

/** The hero's big title: the recorded name of the building, else the label of the property type, else "land". */
function titleOfLand(env: SceneEnv, b: BriefAsset | undefined, first: BriefAsset | undefined) {
  const named =
    b &&
    (stated(b.buildingDisplayName) ??
      stated(
        codedDisplay(
          b.buildingType,
          stated(b.buildingTypeOther),
          b.buildingType ? env.label('BuildingType', b.buildingType) : null,
        ),
      ));
  return (
    named ?? stated(env.label('PropertyType', (b ?? first)?.propertyType)) ?? env.t('titles.land')
  );
}

function landHero(plan: Plan, assets: BriefAsset[], env: SceneEnv): HeroModel {
  const { t, nf } = env;
  const b = mainBuilding(plan);
  const areaOk = landAreaOf(plan.land);
  const use = withOther(
    env,
    'LandUse',
    plan.land.flatMap(a => a.landUseType ?? []),
    plan.land.map(a => a.landUseTypeOther),
  );
  const places = placeParts(assetPlaces(assets));
  // The frontage and the shape of the ONE parcel the drawing shows, not of whichever property has them.
  const parcel = primaryLand(plan.land);
  const frontage = positive(parcel?.roadFrontage);
  const shape =
    parcel?.landShapeType &&
    codedLabel(env, 'LandShape', parcel.landShapeType, parcel.landShapeTypeOther);
  const age = positive(b?.buildingAge);
  // The last tile: how many machines when the application has any, else what the land is used for.
  const lastTile: [TileIcon, string, string | number | null | false | undefined] =
    plan.machines > 0
      ? ['machine', t('hero.tiles.machines'), plural(env, 'values.itemsCount', plan.machines)]
      : ['use', t('hero.tiles.use'), use];
  const rows: [TileIcon, string, string | number | null | false | undefined, string?][] = b
    ? [
        [
          'floors',
          t('hero.tiles.floors'),
          positive(b.numberOfFloors) &&
            t('values.floorsCount', { floors: nf(b.numberOfFloors!, 2) }),
          floorsNote(env, b.numberOfFloors ?? 0),
        ],
        [
          'usable',
          t('hero.tiles.usable'),
          positive(b.totalBuildingArea) && `${nf(b.totalBuildingArea!, 2)} ${t('units.sqm')}`,
        ],
        ['age', t('hero.tiles.age'), age && plural(env, 'hero.values.years', age)],
        ['cond', t('hero.tiles.condition'), b.buildingCondition],
        ['area', t('hero.tiles.area'), areaOk && rnw(env, areaOk)],
        lastTile,
      ]
    : [
        ['area', t('hero.tiles.area'), areaOk && rnw(env, areaOk)],
        ['width', t('hero.tiles.frontage'), frontage && `${nf(frontage, 2)} ${t('units.m')}`],
        ['shape', t('hero.tiles.shape'), shape],
        lastTile,
      ];
  const first = plan.land[0] ?? plan.building[0];
  return {
    // The building's name is the list item's: the display name first, then its type. With neither
    // recorded, what the property IS (a recorded type), never a blank title.
    title: titleOfLand(env, b, first),
    subtitle: [...places, areaOk && t('hero.totalArea', { area: rnw(env, areaOk) })]
      .filter(Boolean)
      .join(' · '),
    tiles: tiles(rows),
    figure: areaOk
      ? {
          label: t('hero.figure.deedArea'),
          value: rnw(env, areaOk, false),
          unit: t('hero.rai'),
          caption: governmentCaption(env, landGovernmentPrice(plan.land)),
        }
      : null,
    bars: [],
  };
}

function condoHero(plan: Plan, assets: BriefAsset[], env: SceneEnv): HeroModel {
  const { t, nf, label } = env;
  const u = plan.condo[0];
  const floor = parseFloor(u.condoFloorNumber);
  const room = roomOf(u);
  // The figure the tower callout states.
  const height = condoHeight(plan.condo).stated ?? 0;
  const usable = plan.condo.reduce((s, a) => s + (positive(a.usableArea) ?? 0), 0);
  const places = placeParts(assetPlaces(assets));
  const view = withOther(
    env,
    'LocationView',
    plan.condo.flatMap(a => a.locationViewType ?? []),
    plan.condo.map(a => a.locationViewTypeOther),
  );
  return {
    title:
      label('PropertyType', u.propertyType) === '—'
        ? t('titles.units')
        : label('PropertyType', u.propertyType),
    subtitle: [...places, plural(env, 'hero.values.rooms', plan.condo.length)].join(' · '),
    tiles: tiles([
      // Several units: how many, not the first one's room and floor.
      plan.condo.length > 1
        ? ['room', t('hero.tiles.rooms'), plural(env, 'hero.values.rooms', plan.condo.length)]
        : [
            'room',
            t('hero.tiles.room'),
            [room, floor && t('hero.values.floor', { floor })].filter(Boolean).join(' · '),
          ],
      ['usable', t('hero.tiles.roomArea'), usable > 0 && `${nf(usable, 2)} ${t('units.sqm')}`],
      [
        'height',
        t('hero.tiles.height'),
        height > 0 && t('values.floorsCount', { floors: nf(height, 2) }),
        floorsNote(env, height),
      ],
      ['view', t('hero.tiles.view'), view],
    ]),
    figure:
      usable > 0
        ? {
            label: t('hero.figure.roomArea'),
            value: nf(usable, 2),
            unit: t('units.sqm'),
            caption: governmentCaption(env, condoGovernmentPrice(plan.condo)),
          }
        : null,
    bars: [],
  };
}

/** A share as a percent within 0-100 to two decimals (1 in 500 is 0.2%, not 0%), so a bar and its aria values stay valid. */
const pct = (part: number, whole: number) =>
  whole > 0 ? Math.min(100, Math.max(0, Math.round((part / whole) * 10000) / 100)) : null;

function projectHero(project: BriefProject, env: SceneEnv): HeroModel {
  const { t, nf } = env;
  const places = placeParts([
    placeOf(
      {
        subDistrict: project.subDistrictName,
        district: project.districtName,
        province: project.provinceName,
      },
      project.subDistrict,
    ),
  ]);
  const title = project.projectName?.trim() || t('titles.project');
  const under = !!project.isUnderConstruction;
  const progress =
    under && project.constructionProgressPercent != null
      ? Math.min(100, Math.max(0, project.constructionProgressPercent))
      : null;

  // The counts the scene's callout states, read from the brief without laying the project out.
  const block = towersOf(project).length ? blockCounts(project) : null;
  const village = !block && plotsOf(project).length ? villageCounts(project, env) : null;

  if (block) {
    const towers = block.towers;
    // The tallest tower by the scene's own rule (recorded floors, else the highest unit floor).
    const maxFloor = Math.max(0, ...towersOf(project).map(towerHeight), project.maxFloor ?? 0);
    const p = pct(block.soldUnits, block.totalUnits);
    return {
      title,
      subtitle: [...places, towers ? plural(env, 'hero.values.buildings', towers) : null]
        .filter(Boolean)
        .join(' · '),
      tiles: tiles([
        [
          'building',
          t('hero.tiles.buildings'),
          towers > 0 && plural(env, 'hero.values.buildings', towers),
        ],
        [
          'units',
          t('hero.tiles.rooms'),
          block.totalUnits > 0 && plural(env, 'hero.values.rooms', block.totalUnits),
        ],
        [
          'sold',
          t('hero.tiles.sold'),
          block.totalUnits > 0 && plural(env, 'hero.values.rooms', block.soldUnits),
        ],
        [
          'height',
          t('hero.tiles.maxFloor'),
          maxFloor > 0 && t('values.floorsCount', { floors: nf(maxFloor, 2) }),
          floorsNote(env, maxFloor),
        ],
      ]),
      figure:
        block.totalUnits > 0
          ? {
              label: t('hero.figure.rooms'),
              value: nf(block.totalUnits),
              unit: t('hero.room'),
              caption: null,
            }
          : null,
      bars:
        p == null
          ? []
          : [
              {
                label: t('hero.bars.sold'),
                percent: p,
                note: t('hero.bars.soldOf', {
                  sold: nf(block.soldUnits),
                  total: nf(block.totalUnits),
                  unit: t('hero.room'),
                }),
              },
            ],
    };
  }

  if (village) {
    const sold = village.sold;
    const p = pct(sold, village.total);
    return {
      title,
      subtitle: [...places, village.total ? plural(env, 'hero.values.plots', village.total) : null]
        .filter(Boolean)
        .join(' · '),
      tiles: tiles([
        [
          'plots',
          t('hero.tiles.plots'),
          village.total > 0 && plural(env, 'hero.values.plots', village.total),
        ],
        ['sold', t('hero.tiles.sold'), village.total > 0 && plural(env, 'hero.values.plots', sold)],
        [
          'models',
          t('hero.tiles.models'),
          village.models > 0 && plural(env, 'hero.values.models', village.models),
        ],
        ['progress', t('hero.tiles.progress'), progress != null && `${nf(progress, 2)}%`],
      ]),
      figure:
        village.total > 0
          ? {
              label: t('hero.figure.plots'),
              value: nf(village.total),
              unit: t('hero.plot'),
              caption: null,
            }
          : null,
      bars: [
        ...(p == null
          ? []
          : [
              {
                label: t('hero.bars.sold'),
                percent: p,
                note: t('hero.bars.soldOf', {
                  sold: nf(sold),
                  total: nf(village.total),
                  unit: t('hero.plot'),
                }),
              },
            ]),
        ...(progress == null
          ? []
          : [{ label: t('hero.bars.progress'), percent: progress, note: null }]),
      ],
    };
  }

  // A project the 3D scene cannot draw (no towers, no plots): the facts the brief does record.
  const areaOk = projectArea(project);
  const units = positive(project.unitForSaleCount) ?? positive(project.unitCount);
  return {
    title,
    subtitle: [...places, areaOk && t('hero.totalArea', { area: rnw(env, areaOk) })]
      .filter(Boolean)
      .join(' · '),
    tiles: tiles([
      ['area', t('hero.tiles.area'), areaOk && rnw(env, areaOk)],
      ['units', t('hero.tiles.units'), units && nf(units)],
      ['progress', t('hero.tiles.progress'), progress != null && `${nf(progress, 2)}%`],
    ]),
    figure: areaOk
      ? {
          label: t('hero.figure.deedArea'),
          value: rnw(env, areaOk, false),
          unit: t('hero.rai'),
          caption: null,
        }
      : null,
    bars:
      progress == null ? [] : [{ label: t('hero.bars.progress'), percent: progress, note: null }],
  };
}

/** Machines and nothing else: how many, never a land figure or a price. */
function machineHero(plan: Plan, assets: BriefAsset[], env: SceneEnv): HeroModel {
  const { t, nf } = env;
  const count = plural(env, 'values.itemsCount', plan.machines);
  return {
    title: t('titles.machinery'),
    subtitle: [...placeParts(assetPlaces(assets)), count].join(' · '),
    tiles: tiles([['machine', t('hero.tiles.machines'), count]]),
    figure: {
      label: t('hero.tiles.machines'),
      value: nf(plan.machines),
      unit: t('hero.machine'),
      caption: null,
    },
    bars: [],
  };
}

/** What a mixed or machines-only application can say: the land it holds and how many of each kind. */
function plainHero(assets: BriefAsset[], env: SceneEnv): HeroModel {
  const { t } = env;
  const places = placeParts(assetPlaces(assets));
  const kind = (a: BriefAsset) => kindOf(a.propertyType);
  const land = landPropertiesOf(assets);
  const areaOk = landAreaOf(land);
  const count = (k: Kind) => assets.filter(a => kind(a) === k).length;
  const buildings = count('building');
  return {
    title: t('hero.mixedTitle'),
    subtitle: [...places, plural(env, 'values.itemsCount', assets.length)].join(' · '),
    tiles: tiles([
      ['area', t('hero.tiles.area'), areaOk && rnw(env, areaOk)],
      [
        'building',
        t('titles.building'),
        buildings > 0 && plural(env, 'hero.values.houses', buildings),
      ],
      [
        'room',
        t('titles.units'),
        count('condo') > 0 && plural(env, 'hero.values.rooms', count('condo')),
      ],
      [
        'machine',
        t('hero.tiles.machines'),
        count('machine') > 0 && plural(env, 'values.itemsCount', count('machine')),
      ],
    ]),
    figure: areaOk
      ? {
          label: t('hero.figure.deedArea'),
          value: rnw(env, areaOk, false),
          unit: t('hero.rai'),
          caption: governmentCaption(env, landGovernmentPrice(land)),
        }
      : null,
    bars: [],
  };
}

/** The least a hero can say, for when the full one cannot be built: a title and how many items there are. */
export function minimalHero(
  assets: BriefAsset[],
  project: BriefProject | null,
  env: SceneEnv,
): HeroModel {
  return {
    title: project?.projectName?.trim() || env.t('hero.mixedTitle'),
    subtitle: project ? '' : plural(env, 'values.itemsCount', assets.length),
    tiles: [],
    figure: null,
    bars: [],
  };
}

export function buildHero(
  assets: BriefAsset[],
  project: BriefProject | null,
  env: SceneEnv,
): HeroModel {
  if (project) return projectHero(project, env);
  const plan = planOf(assets);
  if (!plan) return plainHero(assets, env);
  if (plan.land.length + plan.building.length + plan.condo.length === 0)
    return machineHero(plan, assets, env);
  return plan.kind === 'condo' ? condoHero(plan, assets, env) : landHero(plan, assets, env);
}
