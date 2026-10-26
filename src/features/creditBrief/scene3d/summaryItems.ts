import { toSquareWa } from '@/shared/utils/landArea';
import type { BriefAsset, BriefLandTitle, BriefMachine, BriefProject } from '../api/appraisalBrief';
import {
  kindOf,
  landAreaOf,
  landAreaRows,
  landPropertiesOf,
  parseFloor,
  roomOf,
} from '../sceneModel';
import type { SceneEnv } from './model';
import { assetPlaces, deedNames, deedPlaces, placeParts } from './places';
import { dedupe, groupBy, list, plural, positive, rnw } from './values';
import {
  buildingLine,
  codedDisplay,
  buildingName,
  condoClauses,
  condoGovernmentPriceText,
  developmentLine,
  isStated,
  stated,
  landClause,
  landGovernmentPriceText,
  MACHINE_BUCKETS,
  machineLine,
  machineSections,
  type MachineBucket,
  titleDeedNoun,
  projectRows,
  type CondoUnitInput,
  type LandTitleInput,
  type MachineInput,
  type ProjectInput,
  type ProjectModelInput,
} from './summaryText';

/**
 * The property list: one item per kind of collateral, each carrying the report's own
 * sentences (summaryText.ts). Descriptive data only: no appraised price, no attributes block.
 * A brief from an older API (without the raw fields) still lists what it has.
 */

export interface SummaryRowKv {
  label: string;
  value: string | null;
}

export interface SummaryItem {
  id: string;
  kind: 'land' | 'building' | 'condo' | 'machine' | 'project' | 'other';
  title: string;
  /** One line under the title: the short form of what the sentence says. */
  key: string | null;
  figure: { value: string; unit: string } | null;
  /** The report sentences; clamped to three lines together. */
  lines: string[];
  /** Development items: plain lines under a muted label. */
  dev: string[];
  devLabel: string;
  machines: { head: string; lines: string[] }[];
  kv: SummaryRowKv[];
}

const item = (
  id: SummaryItem['id'],
  kind: SummaryItem['kind'],
  title: string,
  more: Partial<SummaryItem> = {},
): SummaryItem => ({
  id,
  kind,
  title,
  key: null,
  figure: null,
  lines: [],
  dev: [],
  devLabel: '',
  machines: [],
  kv: [],
  ...more,
});

// ── land ─────────────────────────────────────────────────────────────────────

/** A property's titles as the report's land clause takes them. An older API has none: the area fields stand in. */
function titlesOf(a: BriefAsset): { t: LandTitleInput; src: BriefLandTitle | null }[] {
  const place = deedNames(a);
  const titles = list(a.landTitles);
  // An older API has no titles: the property's own recorded area stands in (landAreaRows). With none
  // recorded there is nothing to say (no "0-0-0" is made up).
  if (titles.length === 0) {
    return landAreaRows(a).map(r => ({
      t: { areaRai: r.areaRai, areaNgan: r.areaNgan, areaSquareWa: r.areaSquareWa, ...place },
      src: null,
    }));
  }
  return titles.map(src => ({ t: { ...src, ...place }, src }));
}

/**
 * The real property types an item stands for, by their PropertyType labels: a lease reads as a
 * lease (สิทธิการเช่า…), where the item's own title is the same for freehold and lease.
 */
const typeLabels = (group: BriefAsset[], env: SceneEnv) =>
  [...new Set(group.map(a => a.propertyType).filter((c): c is string => !!c))]
    .map(code => env.label('PropertyType', code))
    .join(', ');

function landItem(land: BriefAsset[], env: SceneEnv): SummaryItem | null {
  if (land.length === 0) return null;
  const { t, nf } = env;
  const perAsset = land.map(titlesOf);
  const rows = perAsset.flat();
  // The same total, carried and rounded the same way, as the hero's land area.
  const area = landAreaOf(land);
  const sqwa = area ? toSquareWa(area.rai, area.ngan, area.wa) : 0;
  // Only recorded titles are counted and named; a stand-in row for an older API is neither.
  const titled = rows.filter(r => r.src);
  const first = titled.find(r => isStated(r.t.titleNumber));
  // District and province of the DEED address (Title masters, or the older API's geocode in them): the
  // card mirrors the report's title clause. The hero names where the property is (DOPA) instead.
  // Over every land property, as the title clause counts every title: what they share, as the hero names it.
  const where = placeParts(deedPlaces(land)).slice(-2).join(' ');
  const deed = first
    ? `${titleDeedNoun(first.t.titleTypeLabel)} ${first.t.titleNumber}`.trim() +
      (titled.length > 1 ? ` +${titled.length - 1}` : '')
    : null;
  return item('land', 'land', t('titles.land'), {
    key: [typeLabels(land, env), deed, where].filter(Boolean).join(' · ') || null,
    figure: sqwa > 0 ? { value: nf(sqwa, 2), unit: t('units.sqwa') } : null,
    // One line per title, as each is a clause of its own; the card clamps them together.
    lines: perAsset.flatMap(titles => titles.map(r => landClause(r.t))),
  });
}

/** The government rate per square wa, for the figure card, from the parcels' government rates. Null when none is recorded. */
export function landGovernmentPrice(land: BriefAsset[]): string | null {
  const titles = land.flatMap(a => list(a.landTitles));
  return landGovernmentPriceText(
    titles.map((x, i) => ({
      number: x.titleNumber,
      price: x.governmentPricePerSqWa,
      isMissingFromSurvey: x.isMissingFromSurvey,
      titleNumberPrefix: x.titleNumberPrefix,
      displayOrder: i,
    })),
  );
}

/** The government rate per square metre of a condo. */
export function condoGovernmentPrice(condo: BriefAsset[]): string | null {
  return condoGovernmentPriceText(
    condo.map(a => ({
      number: roomOf(a),
      price: a.governmentPricePerSqm,
      isMissingFromSurvey: a.isMissingFromSurvey,
    })),
  );
}

// ── buildings ────────────────────────────────────────────────────────────────

function buildingItem(buildings: BriefAsset[], env: SceneEnv): SummaryItem | null {
  if (buildings.length === 0) return null;
  const { t, nf } = env;
  const inputs = buildings.map(a => ({
    a,
    input: {
      // An older API has no display name: the type's label, or the appraiser's remark for 99.
      buildingTypeDisplay:
        stated(a.buildingDisplayName) ??
        codedDisplay(
          a.buildingType,
          stated(a.buildingTypeOther),
          a.buildingType ? env.label('BuildingType', a.buildingType) : null,
        ),
      numberOfFloors: a.numberOfFloors,
      totalBuildingArea: a.totalBuildingArea,
      buildingAge: a.buildingAge,
      buildingConditionDisplay: a.buildingCondition,
    },
  }));
  // A property with nothing but development items has no building line of its own.
  const real = inputs.filter(x => !x.a.isDevelopmentOnly);
  // Numbered after the empty ones are gone, so a building with nothing to say leaves no gap.
  const built = real
    .map(x => buildingLine(x.input, x.a.constructionProgressPercent))
    .filter((l): l is string => !!l);
  const sentences = built.length > 1 ? built.map((l, i) => `${i + 1}. ${l}`) : built;
  const dev = inputs.flatMap(x =>
    list(x.a.improvements).map(m =>
      developmentLine(
        { areaDescription: m.description, area: m.area },
        x.a.constructionProgressPercent,
        x.a.isDevelopmentOnly ? buildingName(x.input) : null,
      ),
    ),
  );
  const devLines = dev.filter((l): l is string => !!l);
  // Nothing to say about the buildings still lists them: the kind and the count.
  const nothing = sentences.length === 0 && devLines.length === 0;
  const only = real.length === 1 ? real[0].input : null;
  const key = only
    ? [
        buildingName(only),
        positive(only.numberOfFloors) &&
          t('values.floorsCount', { floors: nf(only.numberOfFloors!, 2) }),
        positive(only.totalBuildingArea) && `${nf(only.totalBuildingArea!, 2)} ${t('units.sqm')}`,
      ]
        .filter(Boolean)
        .join(' · ')
    : real.length > 1
      ? [
          plural(env, 'hero.values.houses', real.length),
          real
            .map(x => stated(buildingName(x.input)))
            .filter(Boolean)
            .join(', '),
        ]
          .filter(Boolean)
          .join(' · ')
      : null;
  return item('building', 'building', t('titles.building'), {
    key:
      [
        typeLabels(buildings, env),
        nothing ? plural(env, 'hero.values.houses', buildings.length) : key,
      ]
        .filter(Boolean)
        .join(' · ') || null,
    lines: sentences,
    dev: devLines,
    devLabel: t('hero.dev'),
  });
}

// ── condo ────────────────────────────────────────────────────────────────────

const condoInput = (a: BriefAsset): CondoUnitInput => ({
  roomNumber: roomOf(a),
  floorNumber: a.condoFloorNumber,
  buildingNumber: a.buildingNumber,
  condoName: a.condoName,
  condoRegistrationNumber: a.condoRegistrationNumber,
  builtOnTitleNumber: a.builtOnTitleNumber,
  ...deedNames(a),
  areas: list(a.condoAreas).map(x => ({ areaDescription: x.description, areaSize: x.size })),
  usableArea: a.usableArea,
  numberOfFloors: a.condoFloors,
  buildingAge: a.buildingAge,
  buildingConditionDisplay: a.buildingCondition,
});

function condoItem(condo: BriefAsset[], env: SceneEnv): SummaryItem | null {
  if (condo.length === 0) return null;
  const { t, nf } = env;
  const u = condo[0];
  const floor = parseFloor(u.condoFloorNumber);
  const sentence = condoClauses(condo.map(condoInput));
  const usable = condo.reduce((s, a) => s + (positive(a.usableArea) ?? 0), 0);
  return item('condo', 'condo', t('titles.units'), {
    // The type first (a lease reads as one); several units: how many and their total area, not the first one's room and floor.
    key:
      [
        typeLabels(condo, env),
        ...(condo.length > 1
          ? [
              plural(env, 'hero.values.rooms', condo.length),
              usable > 0 && `${nf(usable, 2)} ${t('units.sqm')}`,
            ]
          : [
              roomOf(u) && t('hero.values.room', { room: roomOf(u) }),
              floor && t('hero.values.floor', { floor }),
              positive(u.usableArea) && `${nf(u.usableArea!, 2)} ${t('units.sqm')}`,
            ]),
      ]
        .filter(Boolean)
        .join(' · ') || null,
    lines: sentence ? [sentence] : [],
  });
}

// ── machines ─────────────────────────────────────────────────────────────────

const machineInput = (m: BriefMachine): MachineInput => ({
  machineName: m.machineName,
  brand: m.brand,
  model: m.model,
  registrationNumber: m.registrationNumber,
  serialNumber: m.serialNumber,
  yearOfManufacture: m.yearOfManufacture,
  machineCondition: m.machineCondition,
  section: m.section as MachineInput['section'],
  isPriceCertified: m.isPriceCertified,
  conditionUse: m.conditionUse,
});

function machineItem(
  assets: BriefAsset[],
  machines: BriefMachine[],
  env: SceneEnv,
): SummaryItem | null {
  const count = assets.length;
  if (count === 0) return null;
  // An older API sends no machine rows: the names the properties carry stand in, as one line.
  const names = machines.length
    ? []
    : dedupe(assets.map(a => a.machineName?.trim()).filter((n): n is string => !!n));
  return item('machine', 'machine', env.t('titles.machinery'), {
    key: plural(env, 'hero.values.machines', count),
    lines: names.length ? [names.join(', ')] : [],
    // The report prints one set of sections per property group; the brief lists them in that order.
    machines: [...groupBy(machines, m => m.groupNumber ?? -1).values()].flatMap(group => {
      const inputs = group.map(machineInput);
      // A machine in no section the report prints is still a machine of the application: it is listed
      // last, under a heading of its own, so the count in the key and the list agree.
      const unsectioned = inputs
        .filter(m => !MACHINE_BUCKETS.includes(m.section as MachineBucket))
        .map(machineLine)
        .filter(l => l.length > 0);
      return [
        ...machineSections(inputs),
        ...(unsectioned.length ? [{ section: 'other', lines: unsectioned }] : []),
      ].map(s => ({
        head: env.t(`hero.machineHead.${s.section}`, { n: env.nf(s.lines.length) }),
        lines: s.lines,
      }));
    }),
  });
}

// ── project ──────────────────────────────────────────────────────────────────

function projectItem(p: BriefProject, env: SceneEnv): SummaryItem {
  const { t } = env;
  const input: ProjectInput = {
    houseNumber: p.houseNumber,
    soi: p.soi,
    road: p.road,
    subDistrict: p.subDistrictName,
    district: p.districtName,
    province: p.provinceName,
    developer: p.developer,
    projectType: p.projectType,
    landAreaRai: p.landAreaRai,
    landAreaNgan: p.landAreaNgan,
    landAreaSquareWa: p.landAreaSquareWa,
    unitForSaleCount: p.unitForSaleCount,
    projectSaleLaunchDate: p.projectSaleLaunchDate,
    // Already labels: the identity below passes them through.
    utilities: list(p.utilities),
    utilitiesOther: p.utilitiesOther,
    // An older API sends no labels: the codes are resolved here, through the same lookup as the scene's.
    facilities: p.facilityLabels ?? list(p.facilities).map(code => env.label('Facilities', code)),
    facilitiesOther: p.facilitiesOther,
    latitude: p.latitude,
    longitude: p.longitude,
  };
  const models: ProjectModelInput[] = list(p.houseModels).map(m => ({
    modelName: m.modelName,
    buildingType: m.buildingTypeDisplay,
    numberOfFloors: m.numberOfFloors,
    numberOfHouse: m.numberOfHouse,
    standardUsableArea: m.standardUsableArea,
    usableAreaMin: m.usableAreaMin,
  }));
  // What the project is made of, as the old summary row said it: phases, and the units (condo) or houses on sale.
  const phases = positive(p.numberOfPhase);
  const units = positive(p.unitForSaleCount) ?? positive(p.unitCount);
  return item('project', 'project', p.projectName?.trim() || t('titles.project'), {
    key:
      [
        p.developer?.trim(),
        phases &&
          t('@activityTracking.brief.collateral.phases', { count: phases, n: env.nf(phases) }),
      ]
        .filter(Boolean)
        .join(' · ') || null,
    figure: units
      ? {
          value: t(
            `@activityTracking.brief.collateral.unitsOrHouses_${p.towerCount > 0 ? 'unit' : 'house'}`,
            { count: units, n: env.nf(units) },
          ),
          unit: '',
        }
      : null,
    kv: projectRows(input, models, (_group, code) => code).map(r => ({
      label: t(`hero.rows.${r.key}`),
      value: r.value,
    })),
  });
}

// ── everything ───────────────────────────────────────────────────────────────

export function buildItems(
  assets: BriefAsset[],
  project: BriefProject | null,
  machines: BriefMachine[] | null | undefined,
  env: SceneEnv,
): SummaryItem[] {
  const projectItems = project ? [projectItem(project, env)] : [];
  const kind = (a: BriefAsset) => kindOf(a.propertyType);
  const land = landPropertiesOf(assets);
  const buildings = assets.filter(a => kind(a) === 'building');
  const condo = assets.filter(a => kind(a) === 'condo');
  const machineAssets = assets.filter(a => kind(a) === 'machine');
  const others = groupBy(
    assets.filter(a => !kind(a)),
    a => a.propertyType ?? '',
  );
  return [
    ...projectItems,
    landItem(land, env),
    buildingItem(buildings, env),
    condoItem(condo, env),
    machineItem(machineAssets, list(machines), env),
    ...[...others].map(([code, group]) => otherItem(code, group, env)),
  ].filter((x): x is SummaryItem => !!x);
}

const typeTitle = (code: string, env: SceneEnv) =>
  code
    ? env.label('PropertyType', code)
    : env.t('@activityTracking.brief.collateral.unspecifiedType');

/** A kind the scene and the report have no sentence for (vehicle, vessel): its count, where it is and its land area. */
function otherItem(code: string, group: BriefAsset[], env: SceneEnv): SummaryItem {
  const area = landAreaOf(group);
  return item(`other:${code}`, 'other', typeTitle(code, env), {
    key: [
      plural(env, 'values.itemsCount', group.length),
      // Province (or provinces) only, as the old row said it.
      ...placeParts(assetPlaces(group)).slice(-1),
      area && rnw(env, area),
    ]
      .filter(Boolean)
      .join(' · '),
  });
}

/**
 * The least a list can say: one item per kind with its count (a project is its name). What the
 * panel shows if the full list cannot be built, so a bad field never takes the panel down.
 */
export function countItems(
  assets: BriefAsset[],
  project: BriefProject | null,
  env: SceneEnv,
): SummaryItem[] {
  const projectItems = project
    ? [item('project', 'project', project.projectName?.trim() || env.t('titles.project'))]
    : [];
  return [
    ...projectItems,
    ...[...groupBy(assets, a => a.propertyType ?? '')].map(([code, group]) =>
      item(`count:${code}`, kindOf(code) ?? 'other', typeTitle(code, env), {
        key: plural(env, 'values.itemsCount', group.length),
      }),
    ),
  ];
}
