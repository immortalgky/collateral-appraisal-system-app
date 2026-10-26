import type {
  BriefAsset,
  BriefHouseModel,
  BriefPlot,
  BriefProject,
  BriefTower,
} from '../api/appraisalBrief';
import { toSquareWa } from '@/shared/utils/landArea';
import {
  BUILDING_TYPE_OTHER,
  DRAW_CAP,
  MAX_CONDO_UNITS,
  landAreaOf,
  parseFloor,
  projectArea,
  recordedArea,
  roomOf,
  totalArea,
} from '../sceneModel';
import { codedDisplay, isStated, stated } from './summaryText';
import { dedupe, labelList, list, num, plural, positive } from './values';
import { ghostTowersOf, type Plan, planOf, plotsOf, towersOf } from './drawable';
import { layoutVillage, plotSize, type VillageLayout } from './villageLayout';
import type { PaletteKey } from './palette';

/**
 * The 3D collateral scene as plain data: what to draw, with every user-visible string already
 * resolved. No three.js in here, so the rules (keyword tables, LandShape fallbacks, routing of
 * improvements) can be unit-tested without a GL context.
 *
 * Only descriptive fields recorded on the appraisal are facts. Everything else, such as where a
 * building stands, the roof FORM, the look of a land use, is an assumption of the picture and is
 * drawn but never described in text: a row or a piece of a card shows only recorded data.
 */

// ── environment ──────────────────────────────────────────────────────────────

export type ParamGroup =
  | 'BuildingType'
  | 'Roof'
  | 'Fence'
  | 'LandShape'
  | 'LandUse'
  | 'Landfill'
  | 'RoadSurface'
  | 'Facilities'
  | 'LocationView'
  | 'PropertyType';

export interface SceneEnv {
  /** i18n, already scoped to `activityTracking.brief.collateral.scene3d`. */
  t: (key: string, opts?: Record<string, unknown>) => string;
  /** Parameter description for a code (falls back to the code); '—' for no code. */
  label: (group: ParamGroup, code: string | null | undefined) => string;
  nf: (n: number, digits?: number) => string;
}

const DASH = '—';

const labels = (env: SceneEnv, group: ParamGroup, codes: string[]) =>
  labelList(env, group, codes) || DASH;

// ── output types ─────────────────────────────────────────────────────────────

export interface Row {
  label: string;
  value: string;
}

/** Hover / tap card for one object in the scene. */
export interface Info {
  title: string;
  rows: Row[];
}

export type Tone = 'side' | 'unit' | 'danger';

export interface CalloutText {
  title: string;
  sub: string;
  badge?: string;
  tone?: Tone;
  /** The pieces of `sub`, one per row of the card a pin opens. */
  rows?: Row[];
  /** Who keeps a full card when there is no room for all: 0 legal warning, 1 the subject, 2 land, 3 pond / improvements, 4 boundaries. Default 3. */
  priority?: number;
}

export type Dir = 'north' | 'south' | 'east' | 'west';
export type AdjacentKind = 'road' | 'water' | 'other';
export type RoofStyle = 'flat' | 'hip' | 'gable' | 'gable-low' | 'sawtooth';
export type ImprovementKind =
  | 'fence'
  | 'guard'
  | 'tank'
  | 'canopy'
  | 'shrine'
  | 'pool'
  | 'paving'
  | 'other';

export interface NeighbourSpec {
  dir: Dir;
  text: string;
  kind: AdjacentKind;
  /** Metres from the parcel edge to what the side adjoins (NOT the side's length). */
  distance: number;
  isAccess: boolean;
  /** Road width for the access road, a fixed width for every other neighbour. */
  thickness: number;
  surface: string | null;
  /** Nothing recorded stands here: drawn for the look of the site, with no card, no pin and no text. */
  assumed: boolean;
  info: Info | null;
  callout: CalloutText | null;
  /** Which side of its stem the callout card prefers. */
  left: boolean;
}

export interface ParcelSpec {
  sqm: number;
  /** LandShape 04 to 08 with the numbers needed to draw them; otherwise a dashed square. */
  shape: string | null;
  shapeKnown: boolean;
  frontage: number;
  info: Info;
  callout: CalloutText | null;
}

export interface BuildingSpec {
  type: string | null;
  /** The type it is drawn as (see `lookOf`): its own, or a detached house when it records none. */
  look: string;
  name: string;
  floors: number;
  area: number;
  roofColor: PaletteKey;
  roofStyle: RoofStyle;
  /** Storey height, m. */
  fh: number;
  /** Footprint depth / width. */
  ratio: number;
  under: boolean;
  info: Info;
  callout: CalloutText;
}

export interface ImprovementSpec {
  kind: ImprovementKind;
  text: string;
  area: number;
  /** Storeys, read for water tanks only. */
  floors: number;
  info: Info;
}

export interface FenceSpec {
  style: 'solid' | 'open' | 'other';
  info: Info;
}

export interface PondSpec {
  area: number;
  depth: number | null;
  /** "area 220 · depth 2.5", the unit being unrecorded. */
  note: string;
  info: Info;
}

export interface LandUseFlags {
  residential: boolean;
  agricultural: boolean;
  commercial: boolean;
  industrial: boolean;
}

export interface LandSceneSpec {
  kind: 'land';
  parcel: ParcelSpec;
  roadSide: Dir | null;
  neighbours: NeighbourSpec[];
  buildings: BuildingSpec[];
  /** Index in `buildings` of the factory / warehouse that hosts the machines, or -1. */
  machineHost: number;
  /** Machines and nothing else: they stand in a yard on the ground drawn for them. */
  machineYard: boolean;
  machines: { count: number; info: Info; callout: CalloutText } | null;
  improvements: ImprovementSpec[];
  improvementsCallout: CalloutText | null;
  fence: FenceSpec | null;
  pond: PondSpec | null;
  use: LandUseFlags;
  /** The land use is not recorded: `use` is what the drawing assumes, and what it dresses the site with says nothing in a text. */
  useAssumed: boolean;
  useInfo: { parking: Info; crops: Info; trees: Info };
  legal: CalloutText | null;
  summary: string;
}

export interface CondoUnitSpec {
  /** Null when the recorded floor cannot be read as a floor of this building. */
  floor: number | null;
  /** Where on the floor the unit is drawn: LocationView 06/12 end, 11/13 middle, otherwise the near end. */
  slot: 'end' | 'middle' | 'start';
  info: Info;
  callout: CalloutText;
}

/** The Facilities codes that have a shape in the picture; the others are listed in the callout only. */
export interface FacilityFlags {
  pool: boolean;
  fitness: boolean;
  garden: boolean;
  stadium: boolean;
  club: boolean;
  parking: boolean;
}
export type FacilityInfos = {
  pool: Info;
  fitness: Info;
  club: Info;
  stadium: Info;
  parking: Info;
};

export const facilityFlags = (codes: string[]): FacilityFlags => ({
  pool: codes.includes('06'),
  fitness: codes.includes('07'),
  garden: codes.includes('08'),
  stadium: codes.includes('09'),
  club: codes.includes('10'),
  parking: codes.includes('03'),
});

/** The facilities that call for a podium deck; the stadium court is on the ground and does not. */
const onDeck = (codes: string[]) =>
  codes.filter(c => {
    const f = facilityFlags([c]);
    return f.pool || f.fitness || f.garden || f.club;
  });

/** Hover cards for the facility shapes: the title only, since where they stand is not recorded. */
export function facilityInfos(env: SceneEnv): FacilityInfos {
  const facility = (code: string): Info => ({ title: env.label('Facilities', code), rows: [] });
  return {
    pool: facility('06'),
    fitness: facility('07'),
    club: facility('10'),
    stadium: facility('09'),
    parking: facility('03'),
  };
}

export interface CondoSceneSpec {
  kind: 'condo';
  floors: number;
  facilities: string[];
  has: FacilityFlags;
  /** No facility is recorded: `has` is the usual set, drawn without a card or a pin. */
  facilitiesAssumed: boolean;
  /** Pool / fitness / garden / stadium / club sit on a podium; nothing else needs one. */
  deckUse: boolean;
  roadWidth: number;
  roadSurface: string | null;
  water: 'river' | 'sea' | null;
  roadInfo: Info;
  waterInfo: Info | null;
  towerInfo: Info;
  podiumInfo: Info;
  facilityInfo: FacilityInfos;
  units: CondoUnitSpec[];
  towerCallout: CalloutText;
  facilitiesCallout: CalloutText | null;
  /** Legal restrictions of the condo detail: the same priority-0 callout as a land's. */
  legal: CalloutText | null;
  /** Under construction: the lower half stands finished and the upper half is bare frame (assumed). */
  under: boolean;
  summary: string;
}

export interface BlockFloorSpec {
  floor: number;
  units: number;
  sold: number;
}

export interface BlockTowerSpec {
  name: string;
  floors: number;
  units: number;
  /** Units on a floor that exists in the tower; units with no readable floor are counted, not drawn. */
  perFloor: BlockFloorSpec[];
  info: Info;
  /** Which kinds of warning this tower carries; each kind is counted and worded on its own. */
  warned: Record<TowerWarning, boolean>;
}

export type TowerWarning = 'implausible' | 'beyond' | 'nonPositive' | 'noHeight' | 'noFloor';

export interface BlockSceneSpec {
  kind: 'block';
  name: string;
  /** Project land, m². Null when the project records none. */
  sqm: number | null;
  towers: BlockTowerSpec[];
  hiddenTowers: number;
  totalUnits: number;
  soldUnits: number;
  landInfo: Info;
  callout: CalloutText;
  landCallout: CalloutText;
  summary: string;
  /** What stands round the towers, as a condo's site does: drawn from the recorded facilities, or the usual set when none is recorded. */
  has: FacilityFlags;
  /** No facility is recorded: the usual ones are drawn, and say nothing in any card. */
  facilitiesAssumed: boolean;
  deckUse: boolean;
  podiumInfo: Info;
  facilityInfo: FacilityInfos;
  roadWidth: number;
  roadSurface: string | null;
  /** Null when neither the width nor the surface of the access road is recorded: the road is then scenery. */
  roadInfo: Info | null;
}

export interface VillageModelSpec {
  name: string;
  /** BuildingType code the houses are drawn as; '01' (detached house) when the model records none. */
  type: string;
  /** The brief's own record of this model; null for one synthesised from its plots. */
  src: BriefHouseModel | null;
  floors: number;
  /** The storey count as recorded (before the cap). */
  recordedFloors: number | null;
  /** False when no storey count is recorded: one storey is drawn, but the text does not state it. */
  floorsKnown: boolean;
  /** The model's storey count was above FLOOR_CAP and is drawn as the cap. */
  warning: string | null;
  roofColor: PaletteKey;
  roofStyle: RoofStyle;
  fh: number;
  ratio: number;
  units: number;
  sold: number;
}

export interface VillagePlotSpec {
  plotNumber: string;
  houseNumber: string;
  /** Index into `models`. */
  model: number;
  floors: number;
  /** The storey count as recorded (before the cap), for the hover. */
  recordedFloors: number | null;
  /** False when neither the plot nor its model records a storey count. */
  floorsKnown: boolean;
  /** As recorded, for the hover: square wa and square metres, null when blank. */
  landSqwa: number | null;
  usableSqm: number | null;
  /** The plot and its house, m. */
  plotW: number;
  plotD: number;
  houseW: number;
  houseD: number;
  sold: boolean;
  /** Drawn as a steel frame; WHICH houses is assumed. */
  under: boolean;
  /** A storey count above FLOOR_CAP (the plot's own or its model's) drawn as the cap. */
  warning: string | null;
}

export interface VillageParcel {
  /** Drawn size, m. */
  width: number;
  depth: number;
  /** Not to scale with the deed: enlarged to hold the plots, or its size is not recorded. */
  dashed: boolean;
  info: Info;
}

export interface VillageSceneSpec {
  kind: 'village';
  name: string;
  parcel: VillageParcel;
  models: VillageModelSpec[];
  /** The plots drawn, at most `MAX_HOUSES`, with their layout resolved. */
  plots: VillagePlotSpec[];
  layout: VillageLayout;
  has: FacilityFlags;
  /** No facility is recorded: `has` is the usual set, drawn without a card or a pin. */
  facilitiesAssumed: boolean;
  facilityInfo: FacilityInfos;
  plazaInfo: Info;
  roadInfo: Info;
  entranceInfo: Info;
  callout: CalloutText;
  landCallout: CalloutText;
  legal: CalloutText | null;
  summary: string;
}

export type SceneSpec = LandSceneSpec | CondoSceneSpec | BlockSceneSpec | VillageSceneSpec;

// ── conventions: not data, drawn but never described in the text ──

/** A storey, when the building type has no height of its own. */
export const FLOOR_H = 3.2;
/** Only the access road has a recorded width. */
export const OTHER_ROAD = 6;
export const SHAPE_KNOWN = ['04', '05', '06', '07', '08'];
const DEFAULT_SQM = 1600;
/** Project towers drawn. The rest are counted. (Highlighted condo units: MAX_CONDO_UNITS in sceneModel.) */
const MAX_TOWERS = 12;
/**
 * No building has more storeys than this (the tallest in Thailand has about 78). A floor number
 * above it is a typo ('1205' in the floor field): it must not make a 1,205-storey spire, so it is
 * ignored for the height and flagged.
 */
export const FLOOR_CAP = 100;
/** Storeys drawn for a tower that records no height and has no unit with a usable floor. ASSUMED, not derived from the unit count. */
export const ASSUMED_TOWER_FLOORS = 8;

/**
 * Every storey count goes through here: above FLOOR_CAP it is drawn as the cap and warned, always
 * in the same words (a typo of 1205 or 120 on a building, a plot or a model).
 */
export const capFloors = (
  env: SceneEnv,
  raw: number,
): { floors: number; warning: string | null } =>
  raw > FLOOR_CAP
    ? {
        floors: FLOOR_CAP,
        warning: env.t('values.floorsClamped', { floors: env.nf(raw, 2), cap: env.nf(FLOOR_CAP) }),
      }
    : { floors: raw, warning: null };
/** Houses drawn in a village at most; the rest are counted ("+N"). */
export const MAX_HOUSES = 300;
/** Plot area when neither the plot nor its model records one: 50 sq.wa. */
const DEFAULT_PLOT_SQM = 200;
/** House footprint as a share of its plot when no usable area is recorded. */
const HOUSE_SHARE = 0.35;
/** Gap between the village and its parcel edge, m. */
const PARCEL_MARGIN = 6;
/** Share of houses finished when a project under construction records no progress. */
const DEFAULT_PROGRESS = 50;

/** ponytail: BuildingType decides the massing; the real form is not recorded. ratio = depth / width. */
export const TYPE_FORM: Record<
  string,
  { fh: number; ratio: number; roof: RoofStyle; floors: number; footprint: number }
> = {
  // `floors` and `footprint` (m2) are what is drawn when the building records none: a believable one of its kind.
  '01': { fh: 3.2, ratio: 1.2, roof: 'hip', floors: 2, footprint: 120 }, // detached house
  '02': { fh: 3.5, ratio: 3.5, roof: 'flat', floors: 3, footprint: 75 }, // shophouse
  '03': { fh: 3.2, ratio: 1.6, roof: 'gable', floors: 2, footprint: 90 }, // twin house
  '04': { fh: 3.2, ratio: 3, roof: 'gable', floors: 3, footprint: 70 }, // townhouse
  '05': { fh: 3, ratio: 0.55, roof: 'flat', floors: 8, footprint: 450 }, // condominium unit
  '07': { fh: 3.6, ratio: 0.6, roof: 'flat', floors: 6, footprint: 700 }, // office
  '08': { fh: 3.2, ratio: 0.5, roof: 'flat', floors: 8, footprint: 900 }, // hotel
  '09': { fh: 5, ratio: 0.7, roof: 'flat', floors: 2, footprint: 2500 }, // shopping centre
  '10': { fh: 7, ratio: 0.65, roof: 'sawtooth', floors: 1, footprint: 1800 }, // factory
  '11': { fh: 7, ratio: 0.65, roof: 'gable-low', floors: 1, footprint: 1500 }, // warehouse
  '12': { fh: 3, ratio: 0.6, roof: 'flat', floors: 5, footprint: 500 }, // residential building
  '13': { fh: 3, ratio: 0.5, roof: 'flat', floors: 5, footprint: 500 }, // apartment
};
/** The type a building is DRAWN as: its own, or the mock's detached house when it has none or one with no form. Text never uses this. */
export const lookOf = (type: string | null | undefined) => (type && TYPE_FORM[type] ? type : '01');
export const formOf = (type: string | null | undefined) => TYPE_FORM[lookOf(type)];
/** Types drawn as houses: a tiled roof is what they get when no roof material is recorded. */
const HOUSE_LOOKS = ['01', '03', '04'];
/** Facility codes drawn on a condo project's site when none is recorded: pool, fitness, garden, club house, parking. */
const USUAL_FACILITIES = ['06', '07', '08', '10', '03'];
/** The same for a village's common area. */
const VILLAGE_FACILITIES = ['06', '08', '10'];

/** Roof MATERIAL (multi-select) to slab colour. 08 unverifiable / 99 other / nothing stay neutral. */
const ROOF_COLOR: Record<string, PaletteKey> = {
  '01': 'mass',
  '02': 'roofCement',
  '03': 'roofCement',
  '09': 'roofCement',
  '05': 'roofCement',
  '10': 'roofCement',
  '06': 'roofTile',
  '04': 'roofMetal',
  '07': 'roofMetal',
};
export const roofColorOf = (codes: string[], look: string | null = null): PaletteKey => {
  const hit = codes.find(c => ROOF_COLOR[c]);
  if (hit) return ROOF_COLOR[hit];
  // Nothing recorded: a house gets the mock's tiles, anything else the neutral slab.
  return look && HOUSE_LOOKS.includes(look) ? 'roofTile' : 'roof';
};
/** An RC roof (code 01) is always flat; otherwise the form comes from the building type. */
export const roofStyleOf = (type: string | null | undefined, roofCodes: string[]): RoofStyle =>
  roofCodes.includes('01') ? 'flat' : formOf(type).roof;

/** Solid / open fence sets. 06 is "No Fence". */
const FENCE_SOLID = ['01', '02', '04'];
const FENCE_OPEN = ['03', '05', '07', '08'];

/** Whether free text has a letter or a digit: a "-" or a lone punctuation mark is what a form holds when nobody typed anything. */
const hasLetterOrDigit = (text: string | null | undefined): text is string =>
  !!text && /[\p{L}\p{N}]/u.test(text);

/** AdjacentArea is free text; only what the words literally say is drawn as a road or water. */
export function adjacentKind(text: string | null | undefined): AdjacentKind | null {
  if (!hasLetterOrDigit(text)) return null;
  if (/ถนน|ซอย|ทางสาธารณ|ทางเข้า|ทางเดิน/.test(text)) return 'road';
  if (/คลอง|ลำราง|ลำน้ำ|ลำห้วย|แม่น้ำ|คูน้ำ|บึง|หนอง/.test(text)) return 'water';
  return 'other';
}

/**
 * Height, in metres, of each kind of improvement. ASSUMED: the system records no height for a
 * development item row; the height field the user mentioned has not been found in
 * `BuildingDepreciationDetails` or `BuildingAppraisalDetails`. When it is, wire the recorded value
 * here and nowhere else. `null` = no fixed height (the unknown marker is a cube of its own size).
 */
export const IMPROVEMENT_HEIGHT: Record<ImprovementKind, number | null> = {
  fence: 1.9,
  guard: 2.6,
  tank: 6,
  canopy: 2.6,
  shrine: 1.4,
  pool: 0.1,
  paving: 0.06,
  other: null,
};

/**
 * Development items are free text with no type code, so the words pick the shape. ponytail: keyword match;
 * anything unmatched still draws, as a labelled marker, so nothing valued goes missing.
 */
const IMPROVEMENT_KINDS: [Exclude<ImprovementKind, 'other'>, RegExp][] = [
  ['fence', /รั้ว|กำแพง|fence|wall/i],
  ['guard', /ป้อม|guard/i],
  ['tank', /ถังน้ำ|หอถัง|แท็งก์|tank/i],
  ['canopy', /โรงจอด|หลังคาคลุม|กันสาด|ที่จอดรถ|carport/i],
  ['shrine', /ศาลพระภูมิ|ศาลเจ้า|ศาลตา|ศาลปู่|shrine/i],
  ['pool', /สระ/],
  ['paving', /(ลาน|พื้น|ถนน)\s*(คอนกรีต|ลาดยาง)|ถนนภายใน|ทางเดิน|paving/i],
];
export const improvementKind = (text: string | null | undefined): ImprovementKind =>
  IMPROVEMENT_KINDS.find(([, re]) => re.test(text ?? ''))?.[0] ?? 'other';

/**
 * Words that say "this is a building". A type-99 BUILDING whose text names an improvement AND one
 * of these is still a building ("อาคารคอนกรีตเสริมเหล็ก 2 ชั้น", "ศาลาการเปรียญ"). The keyword's own
 * words are not counted against it (โรงจอดรถ is a carport), and a water tank may name its tiers.
 */
const BUILDING_WORDS = /อาคาร|ชั้น|บ้าน|โรง|ตึก|ศาลา/;

/** A type-99 building whose own words name an improvement (a fence, a tank): drawn as that, not as a building. */
export const namesImprovement = (a: BriefAsset) => {
  const other = a.buildingTypeOther?.trim() ?? '';
  return (
    a.buildingType === BUILDING_TYPE_OTHER &&
    other !== '' &&
    improvementOfBuilding(other) !== 'other'
  );
};

/** Which improvement a type-99 building's words name; 'other' when it is really a building. */
export function improvementOfBuilding(text: string): ImprovementKind {
  const hit = IMPROVEMENT_KINDS.find(([, re]) => re.test(text));
  if (!hit) return 'other';
  const [kind, re] = hit;
  // Every occurrence of the keyword, not the first: "โรงจอดรถ… และโรงจอดรถ…" is two carports.
  const rest = text.replace(new RegExp(re.source, `${re.flags}g`), ' ');
  const words = kind === 'tank' ? rest.replace(/ชั้น/g, ' ') : rest;
  return BUILDING_WORDS.test(words) ? 'other' : kind;
}

const DIRS: Dir[] = ['north', 'south', 'east', 'west'];
/** Which neighbour counts as the access road when several are roads. */
const ROAD_SIDE_ORDER: Dir[] = ['south', 'east', 'west', 'north'];

// ── helpers ──────────────────────────────────────────────────────────────────

const row = (label: string, value: string): Row => ({ label, value });

/** The width (to two decimals, as recorded) and the surface of a road: one wording for a parcel, a condo and a project. */
const roadRows = (env: SceneEnv, width: number, surface: string | null | undefined): Row[] => [
  row(
    env.t('rows.width'),
    width > 0 ? `${env.nf(width, 2)} ${env.t('units.m')}` : env.t('values.notEntered'),
  ),
  row(env.t('rows.surface'), env.label('RoadSurface', surface)),
];

/** The deed area, or null when nothing usable is recorded: a total of 0 is "not recorded", not a plot of no size. */
const withSqm = (total: ReturnType<typeof totalArea>) => {
  const a = recordedArea(total);
  return a ? { ...a, sqm: toSquareWa(a.rai, a.ngan, a.wa) * 4 } : null;
};
const areaOf = (assets: BriefAsset[]) => withSqm(landAreaOf(assets));

const areaText = (env: SceneEnv, a: { rai: number; ngan: number; wa: number }) =>
  env.t('values.areaRaiNganWa', {
    rai: env.nf(a.rai, 2),
    ngan: env.nf(a.ngan, 2),
    wa: env.nf(a.wa, 2),
  });

const joinPieces = (pieces: (string | null | false | undefined)[]) =>
  pieces.filter(Boolean).join(' · ');

/** One piece of a callout: the label of the field it states (a row key's text), and what it says; nothing when it has no value. */
export type Piece = readonly [label: string, value: string | null | false | undefined];

/** A callout's text from its pieces: `sub` joins the values, `rows` lists them one per row, each under its own label. */
export const pieceText = (pieces: Piece[]) => {
  const kept = pieces.filter((p): p is readonly [string, string] => !!p[1]);
  return {
    sub: kept.map(([, value]) => value).join(' · '),
    rows: kept.map(([label, value]) => ({ label, value })),
  };
};

/** `callout` with one more piece at the end, in its text and in its rows. */
export const withPiece = (c: CalloutText, label: string, piece: string): CalloutText => ({
  ...c,
  sub: c.sub ? `${c.sub} · ${piece}` : piece,
  rows: [...(c.rows ?? []), { label, value: piece }],
});

/** A coded value as the report prints it: the label, or for code 99 the appraiser's own words. */
export const codedLabel = (
  env: SceneEnv,
  group: Parameters<SceneEnv['label']>[0],
  code: string | null | undefined,
  other: string | null | undefined,
) => codedDisplay(code, stated(other), code ? env.label(group, code) : null);

/** How a building names itself: its type, or for type 99 the appraiser's own words; "building" when it has neither. */
export const buildingTitle = (
  env: SceneEnv,
  type: string | null | undefined,
  other: string | null | undefined,
) =>
  stated(codedDisplay(type, stated(other), type ? env.label('BuildingType', type) : null)) ??
  env.t('titles.building');

// ── scene choice (see drawable.ts) ───────────────────────────────────────────

export function buildSceneSpec(
  assets: BriefAsset[],
  project: BriefProject | null,
  env: SceneEnv,
): SceneSpec | null {
  if (project) {
    if (towersOf(project).length) return blockSpec(project, env);
    return plotsOf(project).length ? villageSpec(project, env) : null;
  }
  const plan = planOf(assets);
  if (!plan) return null;
  return plan.kind === 'condo' ? condoSpec(plan, env) : landSpec(plan, env);
}

// ── land ─────────────────────────────────────────────────────────────────────

/** One parcel stands for every land property on the application; its descriptive fields come from the first that has any. */
export const primaryLand = (land: BriefAsset[]): BriefAsset | null =>
  land.find(a => a.landShapeType || num(a.roadFrontage) > 0 || list(a.boundaries).length) ??
  land[0] ??
  null;

function buildingSpec(a: BriefAsset, env: SceneEnv): BuildingSpec {
  const { t, nf } = env;
  const type = a.buildingType;
  const other = a.buildingTypeOther?.trim() ?? '';
  const look = lookOf(type);
  const form = formOf(type);
  const floorsKnown = num(a.numberOfFloors) > 0;
  const areaKnown = num(a.totalBuildingArea) > 0;
  // Not recorded: the drawing assumes what is usual for its kind (never stated in a text). With only
  // an area recorded the storeys follow it, so a small area is a small one-storey building.
  const assumedFloors = areaKnown
    ? Math.min(form.floors, Math.max(1, Math.round(num(a.totalBuildingArea) / form.footprint)))
    : form.floors;
  const { floors, warning } = capFloors(env, floorsKnown ? num(a.numberOfFloors) : assumedFloors);
  const area = areaKnown ? num(a.totalBuildingArea) : form.footprint * floors;
  const roofCodes = list(a.roofType);
  const under = !!a.isUnderConstruction;
  const name = buildingTitle(env, type, other);
  const roofs = labels(env, 'Roof', roofCodes);
  return {
    type,
    look,
    name,
    floors,
    area,
    roofColor: roofColorOf(roofCodes, look),
    roofStyle: roofStyleOf(type, roofCodes),
    fh: form.fh,
    ratio: form.ratio,
    under,
    info: {
      title: name,
      rows: [
        // The RECORDED count, with the clamp warning below it: the picture's cap is not a record.
        ...(floorsKnown ? [row(t('rows.floors'), nf(num(a.numberOfFloors), 2))] : []),
        ...(areaKnown ? [row(t('rows.buildingArea'), `${nf(area, 2)} ${t('units.sqm')}`)] : []),
        row(t('rows.roof'), roofs),
        row(t('rows.status'), under ? t('values.underConstruction') : DASH),
        ...(warning ? [row(t('rows.warning'), warning)] : []),
      ],
    },
    callout: {
      title: name,
      priority: 1,
      ...pieceText([
        [
          t('rows.floors'),
          floorsKnown && t('values.floorsCount', { floors: nf(num(a.numberOfFloors), 2) }),
        ],
        [t('rows.buildingArea'), areaKnown && `${nf(area, 2)} ${t('units.sqm')}`],
        [t('rows.roof'), roofCodes.length > 0 && t('values.roofOf', { roof: roofs })],
        [t('rows.status'), under && t('values.underConstruction')],
        [t('rows.warning'), warning],
      ]),
    },
  };
}

function improvementSpec(
  env: SceneEnv,
  text: string,
  area: number,
  floors: number,
  source: 'building' | 'cost',
): ImprovementSpec {
  const { t, nf } = env;
  const name = text || t('values.unnamedImprovement');
  return {
    kind: improvementKind(text),
    text: name,
    area,
    floors,
    info: {
      title: name,
      rows: [
        row(t('rows.item'), name),
        row(t('rows.area'), area > 0 ? nf(area, 2) : DASH),
        row(
          t('rows.source'),
          t(source === 'building' ? 'values.sourceBuilding' : 'values.sourceCost'),
        ),
      ],
    },
  };
}

function fenceSpec(
  env: SceneEnv,
  codes: string[],
  fromImprovements: ImprovementSpec[],
): FenceSpec | null {
  const { t } = env;
  const named = fromImprovements.map(i => row(t('rows.item'), i.text));
  // The recorded FenceType wins when there is one, even if it says "no fence" (06). The words of a
  // fence improvement only stand in when FenceType is empty.
  if (codes.length === 0) {
    return fromImprovements.length
      ? {
          style: 'solid',
          info: { title: fromImprovements[0].text, rows: fromImprovements[0].info.rows },
        }
      : null;
  }
  const solid = codes.some(c => FENCE_SOLID.includes(c));
  const open = codes.some(c => FENCE_OPEN.includes(c));
  if (!solid && !open && !codes.includes('99')) return null;
  return {
    style: solid ? 'solid' : open ? 'open' : 'other',
    info: {
      title: t('titles.fence'),
      rows: [
        row(t('rows.type'), labels(env, 'Fence', codes)),
        row(t('rows.note'), t('notes.fenceSides')),
        ...named,
      ],
    },
  };
}

function neighbourSpecs(
  env: SceneEnv,
  detail: BriefAsset | null,
  roadSide: Dir | null,
): NeighbourSpec[] {
  const { t, nf } = env;
  const out: NeighbourSpec[] = [];
  for (const dir of DIRS) {
    const b = list(detail?.boundaries).find(x => x.direction === dir);
    const text = b?.adjacentArea?.trim() ?? '';
    const kind = adjacentKind(text);
    if (!b || !kind) continue;
    const distance = Math.max(0, num(b.distance));
    const isAccess = dir === roadSide;
    const width = num(detail?.accessRoadWidth);
    const thickness =
      kind === 'road' ? (isAccess && width > 0 ? width : OTHER_ROAD) : kind === 'water' ? 8 : 10;
    const rows = [
      row(t('rows.direction'), t(`dir.${dir}`)),
      row(t('rows.adjoins'), text),
      ...(distance > 0 ? [row(t('rows.distance'), `${nf(distance, 2)} ${t('units.m')}`)] : []),
    ];
    if (kind === 'road') {
      if (isAccess) {
        rows.push(...roadRows(env, width, detail?.roadSurfaceType));
      } else {
        rows.push(row(t('rows.note'), t('notes.notAccessRoad')));
      }
    }
    out.push({
      dir,
      text,
      kind,
      distance,
      isAccess,
      thickness,
      surface: isAccess ? (detail?.roadSurfaceType ?? null) : null,
      assumed: false,
      info: {
        title: t(
          kind === 'road' ? 'titles.road' : kind === 'water' ? 'titles.water' : 'titles.adjacent',
        ),
        rows,
      },
      callout: {
        title: t('callouts.side', { dir: t(`dir.${dir}`), text }),
        ...pieceText([
          [
            t('rows.distance'),
            distance > 0 && t('callouts.distance', { distance: nf(distance, 2) }),
          ],
        ]),
        tone: 'side',
        priority: 4,
      },
      left: dir === 'west' || dir === 'north',
    });
  }
  // The sides nothing is recorded for are dressed as the mock's site is: an access road at the front
  // (when no road is recorded at all) and a neighbouring plot on each other side. Looks only.
  const front: Dir = roadSide ?? 'south';
  const hasRoad = out.some(n => n.kind === 'road');
  const width = num(detail?.accessRoadWidth);
  for (const dir of DIRS) {
    if (out.some(n => n.dir === dir)) continue;
    const road = dir === front && !hasRoad;
    out.push({
      dir,
      text: '',
      kind: road ? 'road' : 'other',
      distance: 0,
      isAccess: road,
      thickness: road ? (width > 0 ? width : OTHER_ROAD) : 10,
      surface: road ? (detail?.roadSurfaceType ?? null) : null,
      assumed: true,
      info: null,
      callout: null,
      left: dir === 'west' || dir === 'north',
    });
  }
  return out;
}

const LEGAL_FLAGS = [
  ['isLandlocked', 'landlocked'],
  ['isExpropriated', 'expropriated'],
  ['isInExpropriationLine', 'inExpropriationLine'],
  ['isEncroached', 'encroached'],
  ['isForestBoundary', 'forestBoundary'],
] as const;

/** What the legal flags and their names read: a property, or the land of a project. */
type LegalSource = Pick<BriefAsset, (typeof LEGAL_FLAGS)[number][0]> &
  Partial<Pick<BriefAsset, 'landTitles' | 'roomNumber'>>;

/**
 * What names a property in a legal warning when there are several: a condo unit by its room (else
 * "unit n", as its pin), a parcel by its deed number (else "parcel n"). Never `title`, which is
 * free text when no number is recorded.
 */
function legalName(env: SceneEnv, a: LegalSource, i: number, kind: 'land' | 'condo') {
  if (kind === 'condo') {
    const room = roomOf(a);
    return room ? env.t('values.unitRoom', { room }) : env.t('values.unitNumber', { n: i + 1 });
  }
  const deed = list(a.landTitles)
    .map(x => stated(x.titleNumber))
    .find(Boolean);
  return deed || env.t('values.parcelNumber', { n: i + 1 });
}

/**
 * Legal restrictions on ANY land property of the application, not just the drawn parcel: a flag on
 * one of several parcels still weighs on the security. With more than one parcel each flag list is
 * prefixed with its parcel.
 */
function legalPieces(
  land: LegalSource[],
  env: SceneEnv,
  kind: 'land' | 'condo' = 'land',
): string[] {
  const multi = land.length > 1;
  return land.flatMap((a, i) => {
    const on = LEGAL_FLAGS.filter(([field]) => a[field]).map(([, key]) => env.t(`legal.${key}`));
    if (!on.length) return [];
    return [multi ? `${legalName(env, a, i, kind)}: ${on.join(', ')}` : on.join(' · ')];
  });
}

/** The warning card for the legal restrictions on an application: first in rank, in the danger tone; null when there are none. */
const legalCallout = (env: SceneEnv, labels: string[]): CalloutText | null =>
  labels.length
    ? {
        title: env.t('callouts.legal'),
        ...pieceText(labels.map((label): Piece => [env.t('rows.legal'), label])),
        tone: 'danger',
        priority: 0,
      }
    : null;

function landSpec(plan: Plan, env: SceneEnv): LandSceneSpec {
  const { t, nf } = env;
  const detail = primaryLand(plan.land);
  const area = areaOf(plan.land);

  // Buildings, and the improvements that ride on them.
  const built: BuildingSpec[] = [];
  const improvements: ImprovementSpec[] = [];
  for (const a of plan.building) {
    const other = a.buildingTypeOther?.trim() ?? '';
    // A building typed 99 whose own words name an improvement is drawn as that improvement, not a box.
    const asImprovement = namesImprovement(a);
    // The building's own cost rows (IsBuilding = 0) are its improvements. Its text then only labels
    // a row that has no words of its own; it is an item itself only when there are no rows.
    const rows = list(a.improvements).filter(m => (m.description?.trim() ?? '') || num(m.area) > 0);
    if (asImprovement && rows.length === 0) {
      improvements.push(
        improvementSpec(
          env,
          other,
          num(a.totalBuildingArea),
          num(a.numberOfFloors) || 1,
          'building',
        ),
      );
    } else if (!asImprovement && !a.isDevelopmentOnly) {
      built.push(buildingSpec(a, env));
    }
    for (const m of rows) {
      const text = m.description?.trim() || (asImprovement ? other : '');
      improvements.push(improvementSpec(env, text, num(m.area), 1, 'cost'));
    }
  }

  // Tallest first, then capped: the storey count is the one thing the shape says that the rows do not.
  const machineCount = plan.machines;
  const isHost = (b: { type: string | null }) => b.type === '10' || b.type === '11';
  built.sort((x, y) => y.floors - x.floors);
  const buildings = built.slice(0, DRAW_CAP.building);
  // The machines stand inside a drawn factory or warehouse: when the cap cut every one, the
  // tallest host takes the place of the last building drawn.
  const host = machineCount > 0 && !buildings.some(isHost) ? built.find(isHost) : undefined;
  if (host && buildings.length) buildings[buildings.length - 1] = host;
  const hiddenBuildings = built.length - buildings.length;
  const machineHost = machineCount > 0 ? buildings.findIndex(isHost) : -1;
  const machineYard = machineCount > 0 && plan.land.length === 0 && built.length === 0;

  // Parcel.
  const shape = detail?.landShapeType ?? null;
  const frontage = num(detail?.roadFrontage);
  const shapeKnown =
    !!area && !!shape && SHAPE_KNOWN.includes(shape) && (shape === '04' || frontage > 0);
  const footprint = buildings.reduce((s, b) => s + b.area / Math.max(1, b.floors), 0);
  const sqm = area?.sqm ?? Math.max(DEFAULT_SQM, footprint * 3);
  const isApron = plan.land.length === 0;
  // With no parcel callout to say it, the first building's callout says how many are not drawn.
  if (isApron && hiddenBuildings > 0 && buildings.length) {
    buildings[0] = {
      ...buildings[0],
      callout: withPiece(
        buildings[0].callout,
        t('rows.note'),
        t('values.moreBuildings', { n: nf(hiddenBuildings) }),
      ),
    };
  }
  const use = list(detail?.landUseType);
  // Not recorded: the site is drawn as the usual one for what stands on it (a yard for a factory or
  // a warehouse, a garden otherwise), so it is never bare ground. The text states only `use`.
  const useAssumed = use.length === 0;
  const drawUse = useAssumed
    ? [
        built.some(b => b.look === '10' || b.look === '11') ||
        (built.length === 0 && plan.machines > 0)
          ? '04'
          : '01',
      ]
    : use;
  const useFlags: LandUseFlags = {
    residential: drawUse.includes('01'),
    agricultural: drawUse.includes('02'),
    commercial: drawUse.includes('03'),
    industrial: drawUse.includes('04'),
  };
  const legalLabels = legalPieces(plan.land, env);
  const far = detail?.farFromElectricity;
  const parcelRows = [
    row(t('rows.deedArea'), area ? areaText(env, area) : t('values.notRecorded')),
    row(t('rows.shape'), codedLabel(env, 'LandShape', shape, detail?.landShapeTypeOther) ?? DASH),
    row(
      t('rows.roadFrontage'),
      frontage > 0 ? `${nf(frontage, 2)} ${t('units.m')}` : t('values.notEntered'),
    ),
    row(
      t('rows.soilLevel'),
      num(detail?.soilLevel) !== 0 ? `${nf(num(detail?.soilLevel), 2)} ${t('units.cm')}` : DASH,
    ),
    row(
      t('rows.landfill'),
      codedLabel(env, 'Landfill', detail?.landFillType, detail?.landFillTypeOther) ?? DASH,
    ),
    row(t('rows.landUse'), labels(env, 'LandUse', use)),
    row(
      t('rows.electricity'),
      far == null
        ? DASH
        : far
          ? num(detail?.electricityDistance) > 0
            ? t('values.farElectricity', { distance: nf(num(detail?.electricityDistance), 2) })
            : t('values.farNoDistance')
          : t('values.notFar'),
    ),
    ...(legalLabels.length ? [row(t('rows.legal'), legalLabels.join(' · '))] : []),
    // A distance with no text says nothing is drawn there, but it is recorded data: list it.
    ...DIRS.flatMap(dir => {
      const b = list(detail?.boundaries).find(x => x.direction === dir);
      return b && !hasLetterOrDigit(b.adjacentArea) && num(b.distance) > 0
        ? [row(t(`dir.${dir}`), t('values.sideDistanceOnly', { distance: nf(num(b.distance), 2) }))]
        : [];
    }),
  ];
  const parcel: ParcelSpec = {
    sqm,
    shape,
    shapeKnown,
    frontage,
    info: isApron
      ? { title: t('titles.ground'), rows: [row(t('rows.note'), t('notes.noLand'))] }
      : { title: t('titles.land'), rows: parcelRows },
    callout: isApron
      ? null
      : {
          title: t('titles.land'),
          priority: 2,
          ...pieceText([
            [t('rows.deedArea'), area && areaText(env, area)],
            [
              t('rows.shape'),
              shape && codedLabel(env, 'LandShape', shape, detail?.landShapeTypeOther),
            ],
            [
              t('rows.roadFrontage'),
              frontage > 0 && t('values.frontageOf', { value: nf(frontage, 2) }),
            ],
            [t('rows.landUse'), use.length > 0 && labels(env, 'LandUse', use)],
            [
              t('rows.note'),
              hiddenBuildings > 0 && t('values.moreBuildings', { n: nf(hiddenBuildings) }),
            ],
          ]),
        },
  };

  // Neighbours and the access road.
  const roadSide =
    ROAD_SIDE_ORDER.find(d =>
      list(detail?.boundaries).some(
        b => b.direction === d && adjacentKind(b.adjacentArea) === 'road',
      ),
    ) ?? null;

  const fenceImprovements = improvements.filter(i => i.kind === 'fence');
  const fenceCodes = dedupe(plan.building.flatMap(a => list(a.fenceType)));
  const fence = fenceSpec(env, fenceCodes, fenceImprovements);
  // A fence the recorded FenceType does not draw (06 "no fence", or unknown codes) is still a valued
  // item: it stays in the list and is drawn as a labelled marker, not skipped as "the fence".
  // With FenceType empty it IS the fence (fenceSpec).
  const drawnImprovements = improvements.map(i =>
    i.kind === 'fence' && fenceCodes.length > 0 && !fence ? { ...i, kind: 'other' as const } : i,
  );

  // 0 is what an unfilled number column holds, so it reads as "not recorded", like null.
  const pondArea = num(detail?.pondArea);
  const pondDepth = num(detail?.pondDepth);
  const pond: PondSpec | null =
    pondArea > 0
      ? {
          area: pondArea,
          depth: pondDepth > 0 ? pondDepth : null,
          note:
            pondDepth > 0
              ? t('values.pondNote', { area: nf(pondArea, 2), depth: nf(pondDepth, 2) })
              : t('values.pondNoteAreaOnly', { area: nf(pondArea, 2) }),
          info: {
            title: t('titles.pond'),
            rows: [
              row(t('rows.area'), nf(pondArea, 2)),
              row(t('rows.depth'), pondDepth > 0 ? nf(pondDepth, 2) : t('values.notRecorded')),
            ],
          },
        }
      : null;

  const sourceInfo = (title: string, source: string): Info => ({
    title: t(title),
    rows: [row(t('rows.source'), t(source))],
  });

  const machines =
    machineCount > 0
      ? {
          count: machineCount,
          info: {
            title: t('titles.machinery'),
            rows: [
              row(t('rows.countOnRequest'), plural(env, 'values.itemsCount', machineCount)),
              row(t('rows.position'), t('values.notRecorded')),
            ],
          },
          callout: {
            title: t('titles.machinery'),
            ...pieceText([
              [
                t('rows.note'),
                t(
                  machineHost < 0 && !machineYard
                    ? 'callouts.machinesNoHost'
                    : 'callouts.machinesNoPosition',
                ),
              ],
            ]),
            badge: `×${machineCount}`,
            tone: 'unit' as const,
            priority: 1,
          },
        }
      : null;

  const improvementsCallout: CalloutText | null = improvements.length
    ? {
        title: t('callouts.improvements'),
        ...pieceText(improvements.map((i): Piece => [t('rows.item'), i.text])),
        tone: 'side',
        priority: 3,
      }
    : null;

  return {
    kind: 'land',
    parcel,
    roadSide,
    neighbours: neighbourSpecs(env, detail, roadSide),
    buildings,
    machineHost,
    machineYard,
    machines,
    improvements: drawnImprovements,
    improvementsCallout,
    fence,
    pond,
    use: useFlags,
    useAssumed,
    useInfo: {
      parking: sourceInfo('titles.parking', 'values.sourceCommercial'),
      crops: sourceInfo('titles.crops', 'values.sourceAgricultural'),
      trees: sourceInfo('titles.trees', 'values.sourceResidential'),
    },
    legal: legalCallout(env, legalLabels),
    summary: t('summary', {
      items: joinPieces([
        parcel.callout && `${parcel.callout.title}: ${parcel.callout.sub}`,
        ...buildings.map(b => `${b.callout.title}: ${b.callout.sub}`),
        machines && `${machines.callout.title} ×${machines.count}`,
      ]),
    }),
  };
}

// ── condo ────────────────────────────────────────────────────────────────────

/**
 * The height of a condo building as the text states it: the recorded condoFloors, else the highest
 * unit floor that can be a floor of it (`usable`); null when neither is known. One reading for the
 * tower callout and the hero.
 */
export const condoHeight = (condos: BriefAsset[]) => {
  const recorded = Math.max(0, ...condos.map(c => Math.round(num(c.condoFloors))));
  const usable = condos
    .map(c => parseFloor(c.condoFloorNumber) ?? 0)
    .filter(f => f > 0 && f <= FLOOR_CAP);
  const stated = recorded > 0 ? recorded : usable.length ? Math.max(...usable) : null;
  return { recorded, usable, stated };
};

function condoSpec(plan: Plan, env: SceneEnv): CondoSceneSpec {
  const { t, nf } = env;
  const condos = plan.condo;
  const facilities = dedupe(condos.flatMap(c => list(c.facilityType)));
  const views = dedupe(condos.flatMap(c => list(c.locationViewType)));

  const { recorded, usable: usableFloors, stated } = condoHeight(condos);
  // A recorded height above the cap is drawn as the cap and warned; a missing one comes from the
  // unit floors, ignoring any implausible one.
  const capped = capFloors(env, recorded);
  // With neither a recorded height nor a usable unit floor, one storey is drawn but not stated.
  const floorsKnown = stated !== null;
  const floors = recorded > 0 ? capped.floors : Math.max(1, ...usableFloors);
  // What the text states: the recorded height, with the clamp warning beside it. Only the picture is capped.
  const statedFloors = stated ?? floors;

  const roadWidth = num(condos.map(c => c.accessRoadWidth).find(w => num(w) > 0));
  const roadSurface = condos.find(c => c.roadSurfaceType)?.roadSurfaceType ?? null;
  const water = views.includes('09') ? 'sea' : views.includes('02') ? 'river' : null;
  // The stadium court is on the ground, so it does not call for a podium.
  // None recorded: the drawing gives the site the usual facilities (see USUAL_FACILITIES), which no card states.
  const facilitiesAssumed = facilities.length === 0;
  const drawnFacilities = facilitiesAssumed ? USUAL_FACILITIES : facilities;
  const deckUse = onDeck(drawnFacilities).length > 0;

  // Units past the draw cap have no card, but a bad floor on one of them must not vanish.
  // A floor that was never filled in ("-", blank, 0) is not a bad one: it is not counted here.
  const undrawnBad = condos.slice(MAX_CONDO_UNITS).filter(c => {
    const raw = c.condoFloorNumber?.trim() ?? '';
    const f = parseFloor(raw);
    return isStated(raw) && !(f !== null && f <= floors);
  }).length;
  const undrawnNote = undrawnBad > 0 ? t('callouts.condoUnitsNotDrawn', { n: nf(undrawnBad) }) : '';
  const units: CondoUnitSpec[] = condos.slice(0, MAX_CONDO_UNITS).map((c, i) => {
    const raw = c.condoFloorNumber?.trim() ?? '';
    const parsed = parseFloor(raw);
    // Never filled in (blank, a dash, 0): "not recorded", not an error; text that is there but cannot be read is.
    const notRecorded = !isStated(raw);
    // The floor as read when it can be read ("5 -" is floor 5); the raw text only when it cannot (that carries the warning).
    const floorText = parsed !== null ? nf(parsed) : raw || DASH;
    const implausible = parsed !== null && parsed > FLOOR_CAP;
    const floor = parsed !== null && parsed <= floors ? parsed : null;
    const room = roomOf(c);
    // With no room number the unit is named by its condominium, or by its kind; several such units are numbered.
    const name = room
      ? t('values.unitRoom', { room })
      : condos.length > 1
        ? t('values.unitNumber', { n: i + 1 })
        : c.condoName?.trim() || t('titles.units');
    const view = list(c.locationViewType);
    const slot = view.some(v => v === '06' || v === '12')
      ? 'end'
      : view.some(v => v === '11' || v === '13')
        ? 'middle'
        : 'start';
    const areaStr = num(c.usableArea) > 0 ? `${nf(num(c.usableArea), 2)} ${t('units.sqm')}` : DASH;
    return {
      floor,
      slot,
      info: {
        title: name,
        rows: [
          // The height is stated only when known: otherwise "of 1" would claim a building of one storey.
          row(
            t('rows.floor'),
            notRecorded
              ? t('values.notRecorded')
              : floorsKnown
                ? t('values.floorOf', { floor: floorText, floors: nf(statedFloors, 2) })
                : floorText,
          ),
          row(t('rows.usableArea'), areaStr),
          row(t('rows.locationView'), labels(env, 'LocationView', view)),
        ],
      },
      callout:
        floor !== null
          ? {
              title: t('callouts.unitOnFloor', { name, floor: floorText }),
              ...pieceText([
                [t('rows.usableArea'), areaStr !== DASH && areaStr],
                [t('rows.locationView'), view.length > 0 && labels(env, 'LocationView', view)],
              ]),
              tone: 'unit',
              priority: 1,
            }
          : notRecorded
            ? {
                title: name,
                ...pieceText([
                  [t('rows.floor'), t('callouts.floorNotRecorded')],
                  [t('rows.usableArea'), areaStr !== DASH && areaStr],
                  [t('rows.locationView'), view.length > 0 && labels(env, 'LocationView', view)],
                ]),
              }
            : {
                title: name,
                ...pieceText([
                  [
                    t('rows.warning'),
                    implausible
                      ? t('callouts.floorImplausible', { floor: floorText, cap: FLOOR_CAP })
                      : parsed !== null
                        ? t('callouts.floorBeyond', {
                            floor: floorText,
                            floors: nf(statedFloors, 2),
                          })
                        : t('callouts.floorUnreadable', { floor: floorText }),
                  ],
                ]),
                tone: 'danger',
                priority: 0,
              },
    };
  });

  const facilityLabels = labels(env, 'Facilities', facilities);
  const legalLabels = legalPieces(condos, env, 'condo');
  const under = condos.some(c => c.isUnderConstruction);

  return {
    kind: 'condo',
    floors,
    facilities,
    has: facilityFlags(drawnFacilities),
    facilitiesAssumed,
    deckUse,
    roadWidth,
    roadSurface,
    water,
    roadInfo: {
      title: t('titles.road'),
      rows: roadRows(env, roadWidth, roadSurface),
    },
    waterInfo: water
      ? {
          title: t(water === 'sea' ? 'titles.sea' : 'titles.river'),
          rows: [row(t('rows.source'), env.label('LocationView', water === 'sea' ? '09' : '02'))],
        }
      : null,
    towerInfo: {
      title: t('titles.condo'),
      rows: [
        ...(floorsKnown ? [row(t('rows.floors'), env.nf(statedFloors, 2))] : []),
        row(t('rows.facilities'), facilityLabels),
        ...(under ? [row(t('rows.status'), t('values.underConstruction'))] : []),
        ...(capped.warning ? [row(t('rows.warning'), capped.warning)] : []),
        ...(undrawnNote ? [row(t('rows.warning'), undrawnNote)] : []),
        ...(legalLabels.length ? [row(t('rows.legal'), legalLabels.join(' · '))] : []),
      ],
    },
    podiumInfo: {
      title: t('titles.podium'),
      rows: [row(t('rows.use'), labels(env, 'Facilities', onDeck(facilities)))],
    },
    facilityInfo: facilityInfos(env),
    units,
    towerCallout: {
      title: t('titles.condo'),
      ...pieceText([
        [
          t('rows.floors'),
          floorsKnown && t('callouts.condoFloors', { floors: env.nf(statedFloors, 2) }),
        ],
        [t('rows.status'), under && t('values.underConstruction')],
        [t('rows.warning'), capped.warning],
        [t('rows.note'), undrawnNote],
      ]),
      badge: `×${condos.length}`,
      priority: 1,
    },
    facilitiesCallout: facilities.length
      ? {
          title: t('callouts.facilities'),
          ...pieceText([[t('rows.facilities'), facilityLabels]]),
          tone: 'side',
          priority: 4,
        }
      : null,
    legal: legalCallout(env, legalLabels),
    under,
    summary: t('summary', {
      items: joinPieces([
        // The storeys are stated only when recorded (or read from a unit floor), as in the tower callout.
        floorsKnown
          ? `${t('titles.condo')}: ${t('callouts.condoFloors', { floors: env.nf(statedFloors, 2) })}`
          : t('titles.condo'),
        ...units.map(u => `${u.callout.title}: ${u.callout.sub}`),
      ]),
    }),
  };
}

// ── block project ────────────────────────────────────────────────────────────

/** Rows for one drawn unit cell (hover), derived on demand so a 1,600-unit project builds no 1,600 cards. */
export const blockCellRows = (
  env: SceneEnv,
  tower: string,
  floor: number,
  sold: boolean,
): Row[] => [
  row(env.t('rows.tower'), tower),
  row(env.t('rows.floor'), env.nf(floor)),
  row(env.t('rows.status'), env.t(sold ? 'values.sold' : 'values.unsold')),
];

/** Units of a tower: its per-floor rows when there are any, otherwise the tower's own count. */
const towerUnits = (t: BriefTower) =>
  list(t.floors).reduce((s, f) => s + f.units, 0) || num(t.numberOfUnits);
const towerSold = (t: BriefTower) =>
  list(t.floors).reduce((s, f) => s + Math.min(f.soldUnits, f.units), 0);

/** The project's land area, with m2: what a block and a village both draw their parcel from. */
const projectAreaM2 = (project: BriefProject) => withSqm(projectArea(project));

const towerCollator = new Intl.Collator('en', { numeric: true });

/**
 * One label per tower: its name, or "#n" for an unnamed one. A "#n" never repeats another tower's
 * label, whatever the towers are called.
 */
function towerNames(all: BriefTower[]): string[] {
  const named = all.map(x => x.towerName?.trim() ?? '');
  const taken = new Set(named.filter(Boolean));
  return named.map(n => {
    if (n) return n;
    let k = 1;
    while (taken.has(`#${k}`)) k++;
    const label = `#${k}`;
    taken.add(label);
    return label;
  });
}

/** The unit rows of a tower that sit on a floor it can have: a real floor, up to the cap, with units on it. */
const saneRows = (t: BriefTower) =>
  list(t.floors).filter(
    f => f.floor != null && f.floor >= 1 && f.floor <= FLOOR_CAP && f.units > 0,
  );

/**
 * The height of a tower as the text states it: its recorded floors, else the highest floor with
 * units on it; 0 when neither is known. The scene and the hero read the same rule.
 */
export const towerHeight = (t: BriefTower) => {
  const recorded = Math.round(num(t.numberOfFloors));
  if (recorded > 0) return recorded;
  return Math.max(0, ...saneRows(t).map(f => Math.round(f.floor as number)));
};

function towerSpec(t: BriefTower, name: string, env: SceneEnv): BlockTowerSpec {
  const rows = list(t.floors);
  const recorded = Math.round(num(t.numberOfFloors));
  const capped = capFloors(env, recorded);
  const sane = saneRows(t);
  // A RECORDED height wins. Only when nothing is recorded is it derived from the units' floors
  // (sane ones), so a typo unit floor can never grow a recorded tower. With neither, the height
  // is assumed.
  const noHeight = recorded <= 0 && sane.length === 0;
  const floors =
    recorded > 0
      ? capped.floors
      : noHeight
        ? ASSUMED_TOWER_FLOORS
        : Math.max(...sane.map(f => Math.round(f.floor as number)));
  // A unit above the tower's height, or above the cap, counts but is not placed and is warned.
  const perFloor = sane
    .filter(f => Math.round(f.floor as number) <= floors)
    .map(f => ({
      floor: Math.round(f.floor as number),
      units: f.units,
      sold: Math.min(f.soldUnits, f.units),
    }));
  // Units that cannot be placed: above the cap (a typo), above the tower, on floor 0 or below
  // (recorded, a basement or the ground, just not drawn), or on no floor at all. Each group is
  // one row, with the units counted and the floors as a range.
  const group = (list: { floor: number | null; units: number }[]) => {
    const floorsOf = list.map(f => Math.round(f.floor ?? 0));
    const lo = Math.min(...floorsOf);
    const hi = Math.max(...floorsOf);
    return {
      has: list.length > 0,
      count: list.reduce((n, f) => n + f.units, 0),
      range: lo === hi ? env.nf(lo) : `${env.nf(lo)}–${env.nf(hi)}`,
    };
  };
  const withUnits = rows.filter(f => f.units > 0);
  const implausible = group(withUnits.filter(f => f.floor != null && f.floor > FLOOR_CAP));
  const beyond = group(sane.filter(f => Math.round(f.floor as number) > floors));
  const nonPositive = group(withUnits.filter(f => f.floor != null && f.floor < 1));
  const noFloorUnits = withUnits.filter(f => f.floor == null).reduce((n, f) => n + f.units, 0);
  const units = towerUnits(t);
  // With no uploaded rows `units` is the recorded count itself, so they never differ then.
  const recordedUnits = positive(t.numberOfUnits);
  const warned = {
    implausible: !!capped.warning || implausible.has,
    beyond: beyond.has,
    nonPositive: nonPositive.has,
    noHeight,
    noFloor: noFloorUnits > 0,
  };
  const warnings = [
    ...(capped.warning ? [capped.warning] : []),
    ...(implausible.has
      ? [
          env.t('callouts.towerUnitsImplausible', {
            n: env.nf(implausible.count),
            range: implausible.range,
          }),
        ]
      : []),
    ...(beyond.has
      ? [
          env.t('callouts.towerUnitsAbove', {
            n: env.nf(beyond.count),
            floors: env.nf(floors),
            range: beyond.range,
          }),
        ]
      : []),
    ...(nonPositive.has
      ? [env.t('callouts.towerUnitsNonPositive', { n: env.nf(nonPositive.count) })]
      : []),
    ...(noFloorUnits > 0 ? [env.t('callouts.towerUnitsNoFloor', { n: env.nf(noFloorUnits) })] : []),
  ];
  return {
    name,
    floors,
    units,
    perFloor,
    info: {
      title: env.t('titles.tower', { name }),
      rows: [
        ...(noHeight
          ? []
          : [row(env.t('rows.floors'), env.nf(recorded > 0 ? recorded : floors, 2))]),
        row(env.t('rows.units'), env.nf(units)),
        // The totals use the UPLOADED units (they match the project summary); the recorded count
        // is shown here when it differs, so it is never hidden.
        ...(recordedUnits !== null && recordedUnits !== units
          ? [
              row(
                env.t('rows.units'),
                env.t('values.towerUnitsRecorded', {
                  recorded: env.nf(recordedUnits),
                  uploaded: env.nf(units),
                }),
              ),
            ]
          : []),
        ...warnings.map(w => row(env.t('rows.warning'), w)),
      ],
    },
    warned,
  };
}

/**
 * Towers, units and sold units of a condo project, from the brief alone: what the callout and the
 * hero state. Units of a leftover tower (no name, no floors) are not drawn, but they are units of
 * the project.
 */
export function blockCounts(project: BriefProject) {
  const all = towersOf(project);
  const ghosts = ghostTowersOf(project);
  const ghostUnits = ghosts.reduce((s, x) => s + towerUnits(x), 0);
  const ghostSold = ghosts.reduce((s, x) => s + towerSold(x), 0);
  const unassigned = Math.max(0, num(project.unassignedUnits)) + ghostUnits;
  return {
    towers: all.length,
    unassigned,
    totalUnits: all.reduce((s, x) => s + towerUnits(x), 0) + unassigned,
    soldUnits:
      all.reduce((s, x) => s + towerSold(x), 0) +
      Math.min(Math.max(0, num(project.unassignedSoldUnits)) + ghostSold, unassigned),
  };
}

function blockSpec(project: BriefProject, env: SceneEnv): BlockSceneSpec {
  const { t, nf } = env;
  // The brief orders towers as text ('1', '10', '2'); the picture wants them in numeric order.
  const all = [...towersOf(project)].sort((a, b) =>
    towerCollator.compare(a.towerName ?? '', b.towerName ?? ''),
  );
  // Specs for every tower: a typo in the 13th is still reported, though only 12 are drawn.
  const names = towerNames(all);
  const specs = all.map((x, i) => towerSpec(x, names[i], env));
  const towers = specs.slice(0, MAX_TOWERS);
  const area = projectAreaM2(project);
  const name = project.projectName?.trim() || t('titles.project');
  const { totalUnits, soldUnits, unassigned } = blockCounts(project);
  const warnedCount = (kind: TowerWarning) => specs.filter(x => x.warned[kind]).length;
  const towerWarnings = (
    [
      ['implausible', 'towerFloorWarning'],
      ['beyond', 'towerBeyondWarning'],
      ['nonPositive', 'towerNonPositiveWarning'],
      ['noHeight', 'towerHeightWarning'],
      ['noFloor', 'towerNoFloorWarning'],
    ] as const
  ).map(
    ([kind, key]) => warnedCount(kind) > 0 && t(`callouts.${key}`, { n: nf(warnedCount(kind)) }),
  );
  const unassignedLine = unassigned > 0 ? t('callouts.unassignedUnits', { n: nf(unassigned) }) : '';
  const text = area ? areaText(env, area) : null;
  // The site is dressed as the mock's condo is: what the project records, else the usual set (pool,
  // fitness, garden, club house, parking), which only the picture knows about.
  const recorded = dedupe(list(project.facilities));
  const facilitiesAssumed = recorded.length === 0;
  const drawn = facilitiesAssumed ? USUAL_FACILITIES : recorded;
  const roadWidth = num(project.land?.accessRoadWidth);
  const roadSurface = project.land?.roadSurfaceType ?? null;
  return {
    kind: 'block',
    name,
    sqm: area?.sqm ?? null,
    towers,
    hiddenTowers: all.length - towers.length,
    totalUnits,
    soldUnits,
    landInfo: {
      title: t('titles.projectLand'),
      rows: [
        row(t('rows.deedArea'), text ?? t('values.notRecorded')),
        ...(unassigned > 0 ? [row(t('rows.unassignedUnits'), nf(unassigned))] : []),
      ],
    },
    callout: {
      title: name,
      ...pieceText([
        [
          t('rows.units'),
          t('callouts.blockSub', {
            towers: nf(all.length),
            sold: nf(soldUnits),
            total: nf(totalUnits),
          }),
        ],
        [t('rows.unassignedUnits'), unassignedLine],
        ...towerWarnings.map((w): Piece => [t('rows.warning'), w]),
      ]),
      badge: `×${nf(totalUnits)}`,
      priority: 1,
    },
    landCallout: {
      title: t('titles.projectLand'),
      ...pieceText([[t('rows.deedArea'), text ?? t('values.notRecorded')]]),
      priority: 2,
    },
    summary: t('summary', {
      items: `${name}: ${t('callouts.blockSub', { towers: nf(all.length), sold: nf(soldUnits), total: nf(totalUnits) })}`,
    }),
    has: facilityFlags(drawn),
    facilitiesAssumed,
    deckUse: onDeck(drawn).length > 0,
    podiumInfo: {
      title: t('titles.podium'),
      rows: [row(t('rows.use'), labels(env, 'Facilities', onDeck(drawn)))],
    },
    facilityInfo: facilityInfos(env),
    roadWidth,
    roadSurface,
    roadInfo:
      roadWidth > 0 || roadSurface
        ? { title: t('titles.road'), rows: roadRows(env, roadWidth, roadSurface) }
        : null,
  };
}

// ── horizontal (LB) project: a village of plots ─────────────────────────────

/** Gap between a house and its plot's front edge: 3 m, less on a plot too shallow for that. */
export const houseSetback = (plotD: number, houseD: number) =>
  Math.min(3, Math.max(0, (plotD - houseD) / 2));

/** Hover card for one drawn plot, derived on demand: a 300-house village builds no 300 cards. */
export function villagePlotInfo(env: SceneEnv, spec: VillageSceneSpec, i: number): Info {
  const { t, nf } = env;
  const p = spec.plots[i];
  const m = spec.models[p.model];
  return {
    title: t('values.plotTitle', { plot: p.plotNumber || DASH }),
    rows: [
      row(t('rows.houseNumber'), p.houseNumber || DASH),
      row(t('rows.model'), m.name),
      ...(p.floorsKnown ? [row(t('rows.floors'), nf(p.recordedFloors ?? p.floors, 2))] : []),
      row(
        t('rows.landArea'),
        p.landSqwa != null ? `${nf(p.landSqwa, 2)} ${t('units.sqwa')}` : t('values.notRecorded'),
      ),
      row(
        t('rows.usableArea'),
        p.usableSqm != null ? `${nf(p.usableSqm, 2)} ${t('units.sqm')}` : t('values.notRecorded'),
      ),
      row(t('rows.status'), t(p.sold ? 'values.sold' : 'values.unsold')),
      ...(p.under ? [row(t('rows.progress'), t('values.underConstruction'))] : []),
      ...(p.warning ? [row(t('rows.warning'), p.warning)] : []),
    ],
  };
}

/** A house model's name: its own, else the type's label (for type 99 the appraiser's words). */
const villageModelName = (env: SceneEnv, m: BriefHouseModel) =>
  m.modelName?.trim() || buildingTitle(env, m.buildingType ?? '01', m.buildingTypeOther);

/**
 * Sold units of a listed model, from ONE source: its recorded `soldUnits` (which counts every unit,
 * where the brief sends only some of the plots), else the sold plots that name it, so the figure
 * stated is the one the tinted pads show.
 */
const soldOfModel = (m: BriefHouseModel, plots: BriefPlot[]) =>
  m.soldUnits != null ? num(m.soldUnits) : plots.filter(p => p.modelId === m.id && p.isSold).length;

/** Units of a listed model by the same rule: its recorded count, else the plots that name it. */
const unitsOfModel = (m: BriefHouseModel, plots: BriefPlot[]) =>
  m.units != null ? num(m.units) : plots.filter(p => p.modelId === m.id).length;

/**
 * The models of a horizontal project, resolved once for everything that states them: the listed
 * ones and a model made from what a plot says for each plot the project does not tie to a listed
 * one, with the units and sold counts of each, and which model each plot is drawn as.
 */
function buildVillageModels(project: BriefProject, env: SceneEnv) {
  const { t } = env;
  const rawPlots = plotsOf(project);
  // Models: the form of the houses. No BuildingType (all dev data) is a generic detached house.
  const models: VillageModelSpec[] = list(project.houseModels).map(m => {
    const type = m.buildingType ?? '01';
    const roofCodes = list(m.roofType);
    const form = formOf(type);
    const floorsKnown = positive(m.numberOfFloors) != null;
    const { floors, warning } = capFloors(env, positive(m.numberOfFloors) ?? 1);
    const modelName = villageModelName(env, m);
    const units = unitsOfModel(m, rawPlots);
    return {
      name: modelName,
      type,
      src: m,
      floors,
      recordedFloors: positive(m.numberOfFloors),
      floorsKnown,
      warning,
      roofColor: roofColorOf(roofCodes, lookOf(type)),
      roofStyle: roofStyleOf(type, roofCodes),
      fh: form.fh,
      ratio: form.ratio,
      units,
      sold: soldOfModel(m, rawPlots),
    };
  });
  const modelIndex = new Map(list(project.houseModels).map((m, i) => [m.id, i]));
  // A plot whose model is not listed gets a model of its own, from what the plot says.
  const modelFor = (p: BriefPlot): number => {
    const known = p.modelId != null ? modelIndex.get(p.modelId) : undefined;
    if (known !== undefined) return known;
    const label0 = p.modelType?.trim() || t('titles.house');
    // By name to ANY model, typed or not, before a model of its own is made up.
    let at = models.findIndex(m => m.name === label0);
    if (at < 0) {
      const form = formOf('01');
      const { floors, warning } = capFloors(env, positive(p.numberOfFloors) ?? 1);
      models.push({
        name: label0,
        type: '01',
        src: null,
        floors,
        recordedFloors: positive(p.numberOfFloors),
        floorsKnown: positive(p.numberOfFloors) != null,
        warning,
        roofColor: 'roofTile',
        roofStyle: form.roof,
        fh: form.fh,
        ratio: form.ratio,
        units: 0,
        sold: 0,
      });
      at = models.length - 1;
    }
    return at;
  };
  // A plot the brief did not tie to a listed model (no id, or an id that matches none) is counted
  // into the model it is drawn as, ON TOP of that model's own counts: the brief counted only the
  // units that carry its id. So the model rows of the parcel card add up to the callout's total.
  const modelOf = rawPlots.map(modelFor);
  rawPlots.forEach((p, i) => {
    if (p.modelId != null && modelIndex.has(p.modelId)) return;
    models[modelOf[i]].units += 1;
    models[modelOf[i]].sold += p.isSold ? 1 : 0;
  });
  return { models, modelOf, plots: rawPlots };
}

// One resolution per build: the counts the hero and the callout state and the spec the scene draws
// read the same models, so they cannot drift (and the plots are walked once, not three times).
const resolvedVillages = new WeakMap<
  BriefProject,
  WeakMap<SceneEnv, ReturnType<typeof buildVillageModels>>
>();
function villageModels(project: BriefProject, env: SceneEnv) {
  let byEnv = resolvedVillages.get(project);
  if (!byEnv) resolvedVillages.set(project, (byEnv = new WeakMap()));
  let resolved = byEnv.get(env);
  if (!resolved) byEnv.set(env, (resolved = buildVillageModels(project, env)));
  return resolved;
}

/**
 * Plots, sold plots and models of a horizontal project, from the brief alone: what the callout and
 * the hero state, without laying the village out. The models' sold counts cover EVERY unit (the
 * brief sends at most 500 plots), so they are the source; plots of a model the project does not
 * list add their own, and each such model is named by what its plot says.
 */
export function villageCounts(project: BriefProject, env: SceneEnv) {
  const { models, plots } = villageModels(project, env);
  // The unit count is the total; the brief sends at most 500 of the plots.
  const total = Math.max(num(project.unitCount), plots.length);
  return {
    total,
    // The models' sold counts may exceed the plots: never more sold than there are.
    sold: Math.min(
      total,
      models.reduce((n, m) => n + m.sold, 0),
    ),
    models: models.length,
  };
}

function villageSpec(project: BriefProject, env: SceneEnv): VillageSceneSpec {
  const { t, nf, label } = env;
  const name = project.projectName?.trim() || t('titles.project');
  const { models, modelOf, plots: rawPlots } = villageModels(project, env);
  const drawnIn = rawPlots.slice(0, MAX_HOUSES);
  const { total, sold } = villageCounts(project, env);
  const hidden = total - drawnIn.length;

  // Progress: about (100 - progress)% of the houses are steel frames; which ones is assumed.
  const under = !!project.isUnderConstruction;
  // A recorded progress is real even at 0 (just started); only a missing one gets the half default.
  const recorded = project.constructionProgressPercent;
  const progressRecorded = under && recorded != null && Number.isFinite(recorded);
  const progress = progressRecorded
    ? Math.min(100, Math.max(0, recorded as number))
    : DEFAULT_PROGRESS;
  const underCount = under ? Math.round((drawnIn.length * (100 - progress)) / 100) : 0;

  const plots: VillagePlotSpec[] = drawnIn.map((p, i) => {
    const mi = modelOf[i];
    const m = models[mi];
    const src = m.src;
    const sqm =
      (positive(p.landArea) ?? positive(src?.standardLandArea) ?? DEFAULT_PLOT_SQM / 4) * 4;
    const plot = plotSize(sqm);
    const pf = positive(p.numberOfFloors);
    const capped = pf != null ? capFloors(env, pf) : { floors: m.floors, warning: m.warning };
    const floors = capped.floors;
    const usable = positive(p.usableArea) ?? positive(src?.standardUsableArea);
    const fp = usable ? usable / floors : sqm * HOUSE_SHARE;
    let w = Math.sqrt(fp / m.ratio);
    let d = fp / w;
    // A house stays inside its plot, with a setback in front.
    // Half the depth is the floor, so a shallow plot still gets a positive, in-plot house.
    const k = Math.min(1, (plot.w * 0.8) / w, Math.max(plot.d - 4, plot.d * 0.5) / d);
    w *= k;
    d *= k;
    return {
      plotNumber: p.plotNumber?.trim() ?? '',
      houseNumber: p.houseNumber?.trim() ?? '',
      model: mi,
      floors,
      recordedFloors: pf ?? m.recordedFloors,
      floorsKnown: pf != null || m.floorsKnown,
      landSqwa: positive(p.landArea),
      usableSqm: positive(p.usableArea),
      plotW: plot.w,
      plotD: plot.d,
      houseW: w,
      houseD: d,
      sold: !!p.isSold,
      under: under && i >= drawnIn.length - underCount,
      warning: capped.warning,
    };
  });

  // Parcel: the project land under the same rules as a land asset. A deed rectangle that holds the
  // layout is drawn as it is; anything else is a dashed rectangle around the village.
  const area = projectAreaM2(project);
  const shape = project.land?.landShapeType ?? null;
  const frontage = num(project.land?.roadFrontage);
  let deedW = 0;
  let deedD = 0;
  if (area && shape === '04') {
    deedW = deedD = Math.sqrt(area.sqm);
  } else if (area && shape === '05' && frontage > 0) {
    deedW = frontage;
    deedD = area.sqm / frontage;
  }
  // None recorded: a village has its common area all the same, with the usual pool, garden and club
  // house, which only the picture knows about (no card or pin states them).
  const facilitiesAssumed = list(project.facilities).length === 0;
  const has = facilityFlags(facilitiesAssumed ? VILLAGE_FACILITIES : list(project.facilities));
  const plaza = Object.values(has).some(Boolean);
  const layout = layoutVillage(
    plots.map(p => ({ w: p.plotW, d: p.plotD })),
    { plaza, targetWidth: deedW > 0 ? deedW - 2 * PARCEL_MARGIN : undefined },
  );
  const fits =
    deedW >= layout.width + 2 * PARCEL_MARGIN && deedD >= layout.depth + 2 * PARCEL_MARGIN;
  const text = area ? areaText(env, area) : null;
  const legalLabels = legalPieces(project.land ? [project.land] : [], env);
  const sizeNote = fits
    ? []
    : [row(t('rows.note'), t(area ? 'notes.villageEnlarged' : 'notes.villageSizeUnknown'))];
  // Only a recorded progress is stated; without one the project just reads "under construction".
  const progressText = t(progressRecorded ? 'values.villageUnder' : 'values.underConstruction', {
    percent: nf(progress, 2),
  });
  const progressNote = under ? [row(t('rows.progress'), progressText)] : [];

  const callout: CalloutText = {
    title: name,
    ...pieceText([
      [
        t('rows.units'),
        t('callouts.villageSub', { sold: nf(sold), total: nf(total), models: nf(models.length) }),
      ],
      [t('rows.note'), hidden > 0 && t('values.moreHouses', { n: nf(hidden) })],
      [t('rows.progress'), under && progressText],
    ]),
    badge: `×${nf(total)}`,
    priority: 1,
  };
  return {
    kind: 'village',
    name,
    parcel: {
      width: fits ? deedW : layout.width + 2 * PARCEL_MARGIN,
      depth: fits ? deedD : layout.depth + 2 * PARCEL_MARGIN,
      dashed: !fits,
      info: {
        title: t('titles.projectLand'),
        rows: [
          row(t('rows.deedArea'), text ?? t('values.notRecorded')),
          row(t('rows.shape'), shape ? label('LandShape', shape) : DASH),
          row(
            t('rows.roadFrontage'),
            frontage > 0 ? `${nf(frontage, 2)} ${t('units.m')}` : t('values.notEntered'),
          ),
          ...models.map(m =>
            row(m.name, t('values.modelSummary', { units: nf(m.units), sold: nf(m.sold) })),
          ),
          ...models
            .filter(m => m.warning)
            .map(m => row(t('rows.warning'), `${m.name}: ${m.warning}`)),
          ...(legalLabels.length ? [row(t('rows.legal'), legalLabels.join(' · '))] : []),
          ...progressNote,
          ...sizeNote,
        ],
      },
    },
    models,
    plots,
    layout,
    has,
    facilitiesAssumed,
    facilityInfo: facilityInfos(env),
    plazaInfo: {
      title: t('titles.commonArea'),
      rows: [row(t('rows.facilities'), labels(env, 'Facilities', list(project.facilities)))],
    },
    roadInfo: { title: t('titles.internalRoad'), rows: [] },
    entranceInfo: {
      title: t('titles.entranceRoad'),
      rows: roadRows(env, num(project.land?.accessRoadWidth), project.land?.roadSurfaceType),
    },
    callout,
    landCallout: {
      title: t('titles.projectLand'),
      ...pieceText([[t('rows.deedArea'), text ?? t('values.notRecorded')]]),
      priority: 2,
    },
    legal: legalCallout(env, legalLabels),
    summary: t('summary', { items: `${name}: ${callout.sub}` }),
  };
}
