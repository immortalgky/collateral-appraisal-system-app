import { describe, expect, it } from 'vitest';
import type {
  BriefAsset,
  BriefHouseModel,
  BriefPlot,
  BriefProject,
  BriefTower,
} from '../api/appraisalBrief';
import {
  adjacentKind,
  buildSceneSpec,
  villagePlotInfo,
  improvementKind,
  improvementOfBuilding,
  ASSUMED_TOWER_FLOORS,
  roofColorOf,
  TYPE_FORM,
  roofStyleOf,
  type BlockSceneSpec,
  type CondoSceneSpec,
  MAX_HOUSES,
  type VillageSceneSpec,
  FLOOR_CAP,
  houseSetback,
  blockCounts,
  villageCounts,
  type LandSceneSpec,
  type SceneEnv,
  blockCellRows,
} from './model';
import { canDraw3D } from './drawable';
import { MAX_CONDO_UNITS } from '../sceneModel';

// The model returns keys + params; a fake `t` that prints both lets the tests read what was asked for.
const env: SceneEnv = {
  t: (key, opts) => (opts ? `${key}${JSON.stringify(opts)}` : key),
  label: (group, code) => (code ? `${group}:${code}` : '—'),
  nf: n => String(n),
};

const asset = (o: Partial<BriefAsset> = {}): BriefAsset => ({
  id: 'a',
  sequenceNumber: 1,
  propertyType: 'L',
  title: null,
  area: null,
  location: null,
  buildingType: null,
  numberOfFloors: null,
  areaRai: null,
  areaNgan: null,
  areaSquareWa: null,
  machineName: null,
  buildingTypeOther: null,
  condoFloors: null,
  condoFloorNumber: null,
  landShapeType: null,
  roadFrontage: null,
  soilLevel: null,
  landFillType: null,
  landUseType: [],
  pondArea: null,
  pondDepth: null,
  farFromElectricity: null,
  electricityDistance: null,
  accessRoadWidth: null,
  roadSurfaceType: null,
  boundaries: [],
  isLandlocked: null,
  isExpropriated: null,
  isInExpropriationLine: null,
  isEncroached: null,
  isForestBoundary: null,
  totalBuildingArea: null,
  roofType: [],
  fenceType: [],
  isUnderConstruction: null,
  isDevelopmentOnly: false,
  improvements: [],
  usableArea: null,
  facilityType: [],
  locationViewType: [],
  ...o,
});

const baseProject = (): BriefProject => ({
  projectName: 'Village',
  projectType: 'LB',
  developer: null,
  unitForSaleCount: null,
  landAreaRai: null,
  landAreaNgan: null,
  landAreaSquareWa: null,
  subDistrict: null,
  numberOfPhase: null,
  towerCount: 0,
  maxFloor: null,
  unitCount: 0,
  unitStoreys: null,
  towers: [],
  unassignedUnits: 0,
  unassignedSoldUnits: 0,
  isUnderConstruction: null,
  constructionProgressPercent: null,
  facilities: [],
  land: null,
  houseModels: [],
  plots: [],
});

const land = (o: Partial<BriefAsset> = {}) =>
  asset({ propertyType: 'L', areaRai: 1, areaNgan: 0, areaSquareWa: 0, ...o });
const house = (o: Partial<BriefAsset> = {}) =>
  asset({
    propertyType: 'LB',
    buildingType: '01',
    numberOfFloors: 2,
    totalBuildingArea: 240,
    ...o,
  });
const condoUnit = (o: Partial<BriefAsset> = {}) =>
  asset({ propertyType: 'U', condoFloors: 35, condoFloorNumber: '12', title: '1205', ...o });

const landSpec = (assets: BriefAsset[]) => {
  const spec = buildSceneSpec(assets, null, env);
  expect(spec?.kind).toBe('land');
  return spec as LandSceneSpec;
};
const condoSpec = (assets: BriefAsset[]) => {
  const spec = buildSceneSpec(assets, null, env);
  expect(spec?.kind).toBe('condo');
  return spec as CondoSceneSpec;
};

describe('adjacentKind', () => {
  it('reads roads and water from Thai words, and everything else as other', () => {
    expect(adjacentKind('ถนนซอยประชาร่วมใจ')).toBe('road');
    expect(adjacentKind('ทางสาธารณประโยชน์')).toBe('road');
    expect(adjacentKind('คลองสาธารณะ')).toBe('water');
    expect(adjacentKind('แม่น้ำเจ้าพระยา')).toBe('water');
    expect(adjacentKind('บ้านพักอาศัย')).toBe('other');
  });

  it('treats a placeholder like "-" as no text', () => {
    for (const t of ['-', '--', ' - ', '.', '/', '–']) expect(adjacentKind(t)).toBeNull();
  });

  it('is null for blank text', () => {
    expect(adjacentKind('')).toBeNull();
    expect(adjacentKind('   ')).toBeNull();
    expect(adjacentKind(null)).toBeNull();
  });
});

describe('improvementKind', () => {
  it.each([
    ['รั้วคอนกรีตสูง 2 เมตร', 'fence'],
    ['กำแพงรอบที่ดิน', 'fence'],
    ['ป้อมยาม', 'guard'],
    ['ถังน้ำ 3 ชั้น', 'tank'],
    ['โรงจอดรถ', 'canopy'],
    ['ศาลพระภูมิ', 'shrine'],
    ['สระว่ายน้ำ', 'pool'],
    ['ลานคอนกรีต', 'paving'],
    ['Perimeter fence', 'fence'],
  ])('%s -> %s', (text, kind) => {
    expect(improvementKind(text)).toBe(kind);
  });

  it('falls back to other for text it does not know, and for no text', () => {
    expect(improvementKind('ระบบบำบัดน้ำเสีย')).toBe('other');
    expect(improvementKind(null)).toBe('other');
  });
});

describe('every storey count is capped and warned the same way', () => {
  it('draws a land building with a typo storey count as the cap, with the warning', () => {
    for (const typo of [1205, 120]) {
      const spec = landSpec([land(), house({ numberOfFloors: typo })]);
      expect(spec.buildings[0].floors).toBe(FLOOR_CAP);
      expect(spec.buildings[0].info.rows.some(r => r.label === 'rows.warning')).toBe(true);
      expect(spec.buildings[0].callout.sub).toContain(
        `values.floorsClamped{"floors":"${typo}","cap":"${FLOOR_CAP}"}`,
      );
    }
    const ok = landSpec([land(), house({ numberOfFloors: 30 })]);
    expect(ok.buildings[0].floors).toBe(30);
    expect(ok.buildings[0].info.rows.some(r => r.label === 'rows.warning')).toBe(false);
  });
});

describe('the text states the recorded storey count, only the picture is capped', () => {
  it('says the recorded floors of a land building, with the warning beside it', () => {
    const spec = landSpec([land(), house({ numberOfFloors: 1205 })]);
    expect(spec.buildings[0].floors).toBe(FLOOR_CAP);
    expect(spec.buildings[0].callout.sub).toContain('values.floorsCount{"floors":"1205"}');
    expect(spec.buildings[0].callout.sub).not.toContain(`"floors":"${FLOOR_CAP}"`);
  });

  it('says the recorded height of a condo in the callout, the summary and the hover', () => {
    const spec = condoSpec([condoUnit({ condoFloors: 900 })]);
    expect(spec.floors).toBe(FLOOR_CAP);
    expect(spec.towerCallout.sub).toContain('callouts.condoFloors{"floors":"900"}');
    expect(spec.summary).toContain('900');
    expect(spec.summary).not.toContain(String(FLOOR_CAP));
    expect(spec.towerInfo.rows.find(r => r.label === 'rows.floors')?.value).toBe('900');
  });
});

describe('a type-99 building with cost rows of its own', () => {
  const b99 = (text: string, rows: { description: string | null; area: number | null }[]) =>
    asset({
      propertyType: 'B',
      buildingType: '99',
      buildingTypeOther: text,
      numberOfFloors: 1,
      totalBuildingArea: 4,
      improvements: rows,
    });

  it('draws one guard house, not one from the text and one from the row', () => {
    const spec = landSpec([land(), b99('ป้อมยาม', [{ description: 'ป้อมยาม 4 ตร.ม.', area: 4 }])]);
    expect(spec.buildings).toEqual([]);
    expect(spec.improvements).toHaveLength(1);
    expect(spec.improvements[0]).toMatchObject({ kind: 'guard', text: 'ป้อมยาม 4 ตร.ม.' });
  });

  it('draws one fence the same way', () => {
    const spec = landSpec([
      land(),
      b99('รั้ว', [{ description: 'รั้วคอนกรีต ยาว 144 ม.', area: null }]),
    ]);
    expect(spec.improvements.map(i => i.kind)).toEqual(['fence']);
    expect(spec.improvements).toHaveLength(1);
  });

  it('lets the text label a row that has no words of its own', () => {
    const spec = landSpec([land(), b99('ป้อมยาม', [{ description: null, area: 4 }])]);
    expect(spec.improvements).toHaveLength(1);
    expect(spec.improvements[0]).toMatchObject({ kind: 'guard', text: 'ป้อมยาม', area: 4 });
  });

  it('uses the text as the item only when there are no rows', () => {
    const spec = landSpec([land(), b99('ป้อมยาม', [])]);
    expect(spec.improvements.map(i => i.kind)).toEqual(['guard']);
  });
});

describe('improvement keywords are not too greedy', () => {
  it('does not read buildings and halls as paving or a shrine', () => {
    expect(improvementKind('อาคารคอนกรีตเสริมเหล็ก 2 ชั้น')).toBe('other');
    expect(improvementKind('ศาลาการเปรียญ')).toBe('other');
  });

  it('reads every occurrence of the keyword, so two carports in one text stay a carport', () => {
    expect(improvementOfBuilding('โรงจอดรถยนต์ และโรงจอดรถจักรยานยนต์')).toBe('canopy');
    expect(improvementOfBuilding('โรงจอดรถ และอาคารสำนักงาน')).toBe('other');
  });

  it.each([
    ['ศาลพระภูมิ', 'shrine'],
    ['ศาลเจ้า', 'shrine'],
    ['ศาลตา', 'shrine'],
    ['ลานคอนกรีต', 'paving'],
    ['พื้นคอนกรีต', 'paving'],
    ['ถนนคอนกรีต', 'paving'],
    ['ลานลาดยาง', 'paving'],
    ['ถนนภายใน', 'paving'],
  ])('still finds %s as %s', (text, kind) => {
    expect(improvementKind(text)).toBe(kind);
  });

  it('keeps a type-99 building that merely mentions an improvement word a building', () => {
    const b99 = (text: string) =>
      asset({
        propertyType: 'B',
        buildingType: '99',
        buildingTypeOther: text,
        numberOfFloors: 2,
        totalBuildingArea: 200,
      });
    const kept = ['อาคารคอนกรีตเสริมเหล็ก 2 ชั้น', 'ศาลาการเปรียญ', 'อาคารที่จอดรถ', 'บ้านพักยาม'];
    for (const text of kept) {
      const spec = landSpec([land(), b99(text)]);
      expect(spec.buildings.map(b => b.name)).toEqual([text]);
      expect(spec.improvements).toEqual([]);
    }
    // plain improvements still route away from the buildings
    for (const [text, kind] of [
      ['โรงจอดรถ', 'canopy'],
      ['ถังน้ำ 3 ชั้น', 'tank'],
      ['ป้อมยาม', 'guard'],
      ['รั้วคอนกรีตสูง 2 เมตร ยาว 144 เมตร', 'fence'],
      ['ศาลพระภูมิ', 'shrine'],
    ]) {
      const spec = landSpec([land(), b99(text)]);
      expect(spec.buildings).toEqual([]);
      expect(spec.improvements.map(i => i.kind)).toEqual([kind]);
    }
  });
});

describe('roof', () => {
  it('colours by the first known material and stays neutral for 08 / 99 / none', () => {
    expect(roofColorOf(['06'])).toBe('roofTile');
    expect(roofColorOf(['08', '04'])).toBe('roofMetal');
    expect(roofColorOf(['08'])).toBe('roof');
    expect(roofColorOf(['99'])).toBe('roof');
    expect(roofColorOf([])).toBe('roof');
  });

  it('draws an RC roof flat whatever the building type, otherwise by type', () => {
    expect(roofStyleOf('01', ['01'])).toBe('flat');
    expect(roofStyleOf('01', ['06'])).toBe('hip');
    expect(roofStyleOf('10', [])).toBe('sawtooth');
    expect(roofStyleOf('11', ['04'])).toBe('gable-low');
    // No type recorded: the mock's house, not a bare slab.
    expect(roofStyleOf(null, [])).toBe('hip');
  });
});

describe('parcel and LandShape', () => {
  it('draws shapes 04-08 only when they can be sized', () => {
    expect(landSpec([land({ landShapeType: '04' })]).parcel.shapeKnown).toBe(true);
    expect(landSpec([land({ landShapeType: '05', roadFrontage: 30 })]).parcel.shapeKnown).toBe(
      true,
    );
    // a non-square shape needs the frontage
    expect(landSpec([land({ landShapeType: '05' })]).parcel.shapeKnown).toBe(false);
  });

  it('falls back to a square for 01-03 / 99 / no shape', () => {
    for (const shape of ['01', '02', '03', '99', null]) {
      expect(landSpec([land({ landShapeType: shape, roadFrontage: 30 })]).parcel.shapeKnown).toBe(
        false,
      );
    }
  });

  it('turns rai-ngan-wa into square metres (1 wa = 4 m2)', () => {
    const spec = landSpec([land({ areaRai: 1, areaNgan: 2, areaSquareWa: 50 })]);
    expect(spec.parcel.sqm).toBe((400 + 200 + 50) * 4);
  });

  it('sums every land property onto the one parcel, carrying the wa into ngan', () => {
    const spec = landSpec([
      land({ areaRai: 0, areaNgan: 1, areaSquareWa: 60 }),
      land({ areaRai: 0, areaNgan: 1, areaSquareWa: 60 }),
    ]);
    expect(spec.parcel.sqm).toBe((300 + 20) * 4);
  });

  it('takes the descriptive fields from the first land property that has any', () => {
    const spec = landSpec([land(), land({ landShapeType: '06', roadFrontage: 20 })]);
    expect(spec.parcel.shape).toBe('06');
  });

  it('uses a ground apron, not a parcel, for a building on no land', () => {
    const spec = landSpec([
      asset({ propertyType: 'B', buildingType: '01', numberOfFloors: 1, totalBuildingArea: 100 }),
    ]);
    expect(spec.parcel.info.rows.map(r => r.value)).toEqual(['notes.noLand']);
    expect(spec.parcel.callout).toBeNull();
  });
});

describe('neighbours and the access road', () => {
  const boundaries = [
    { direction: 'north' as const, adjacentArea: 'คลองสาธารณะ', distance: 6 },
    { direction: 'south' as const, adjacentArea: 'ถนนซอยประชาร่วมใจ', distance: 0 },
    { direction: 'east' as const, adjacentArea: 'บ้านพักอาศัย', distance: 0 },
    { direction: 'west' as const, adjacentArea: null, distance: 2 },
  ];

  it('picks the road side as the access road and uses its recorded width', () => {
    const spec = landSpec([land({ boundaries, accessRoadWidth: 8, roadSurfaceType: '05' })]);
    expect(spec.roadSide).toBe('south');
    const south = spec.neighbours.find(n => n.dir === 'south');
    expect(south).toMatchObject({ kind: 'road', isAccess: true, thickness: 8, surface: '05' });
  });

  it('gives a text-less side no neighbour, and other roads the default width', () => {
    const spec = landSpec([
      land({
        boundaries: [
          { direction: 'south', adjacentArea: 'ถนน A', distance: 0 },
          { direction: 'east', adjacentArea: 'ถนน B', distance: 0 },
          { direction: 'west', adjacentArea: null, distance: 5 },
        ],
        accessRoadWidth: 12,
      }),
    ]);
    expect(spec.neighbours.filter(n => !n.assumed).map(n => n.dir)).toEqual(['south', 'east']);
    expect(spec.neighbours.find(n => n.dir === 'east')).toMatchObject({
      isAccess: false,
      thickness: 6,
    });
  });

  it('keeps the distance as the distance TO the neighbour', () => {
    const spec = landSpec([land({ boundaries })]);
    expect(spec.neighbours.find(n => n.dir === 'north')).toMatchObject({
      kind: 'water',
      distance: 6,
    });
  });

  it('has no road side when no neighbour is a road', () => {
    const spec = landSpec([
      land({ boundaries: [{ direction: 'east', adjacentArea: 'ที่ดินว่าง', distance: 1 }] }),
    ]);
    expect(spec.roadSide).toBeNull();
  });

  it('copes with a brief that predates the new fields', () => {
    const old = land();
    delete (old as Partial<BriefAsset>).boundaries;
    delete (old as Partial<BriefAsset>).landUseType;
    expect(landSpec([old]).neighbours.filter(n => !n.assumed)).toEqual([]);
  });
});

describe('boundary placeholders and distances', () => {
  it('draws no neighbour for a "-" side, and lists its distance on the land card instead', () => {
    const spec = landSpec([
      land({
        boundaries: [
          { direction: 'north', adjacentArea: '-', distance: 1 },
          { direction: 'west', adjacentArea: null, distance: 5 },
          { direction: 'east', adjacentArea: '-', distance: 0 },
        ],
      }),
    ]);
    expect(spec.neighbours.filter(n => !n.assumed)).toEqual([]);
    const rows = spec.parcel.info.rows.filter(r => r.label.startsWith('dir.'));
    expect(rows.map(r => r.label)).toEqual(['dir.north', 'dir.west']);
    expect(rows[1].value).toBe('values.sideDistanceOnly{"distance":"5"}');
  });

  it('shows no distance for a side that adjoins directly (0 or null)', () => {
    for (const distance of [0, null]) {
      const n = landSpec([
        land({ boundaries: [{ direction: 'east', adjacentArea: 'บ้านพักอาศัย', distance }] }),
      ]).neighbours[0];
      expect(n.callout!.sub).toBe('');
      expect(n.info!.rows.some(r => r.label === 'rows.distance')).toBe(false);
    }
  });

  it('ranks the cards: legal warning, then the subject, then land, then boundaries', () => {
    const spec = landSpec([
      land({
        boundaries: [{ direction: 'north', adjacentArea: 'คลอง', distance: 3 }],
        isEncroached: true,
        pondArea: 10,
      }),
      house(),
    ]);
    expect(spec.legal?.priority).toBe(0);
    expect(spec.buildings[0].callout.priority).toBe(1);
    expect(spec.parcel.callout?.priority).toBe(2);
    expect(spec.neighbours[0].callout!.priority).toBe(4);
  });
});

describe('fence codes from several buildings', () => {
  it('lists each recorded code once', () => {
    const spec = landSpec([
      land(),
      house({ fenceType: ['01'] }),
      house({ fenceType: ['01', '07'] }),
    ]);
    expect(spec.fence?.info.rows.find(r => r.label === 'rows.type')?.value).toBe(
      'Fence:01, Fence:07',
    );
  });
});

describe('a fence improvement the recorded FenceType does not draw', () => {
  const fenceRow = { description: 'รั้ว', area: null };
  it('stays a drawn item when FenceType says no fence or holds unknown codes', () => {
    for (const fenceType of [['06'], ['55']]) {
      const spec = landSpec([land(), house({ fenceType, improvements: [fenceRow] })]);
      expect(spec.fence).toBeNull();
      expect(spec.improvements.map(i => i.kind)).toEqual(['other']);
      expect(spec.improvementsCallout?.sub).toBe('รั้ว');
    }
  });

  it('is the fence itself when FenceType is empty, and skipped as an item when FenceType draws one', () => {
    const empty = landSpec([land(), house({ fenceType: [], improvements: [fenceRow] })]);
    expect(empty.fence?.style).toBe('solid');
    expect(empty.improvements.map(i => i.kind)).toEqual(['fence']);
    const recorded = landSpec([land(), house({ fenceType: ['07'], improvements: [fenceRow] })]);
    expect(recorded.fence?.style).toBe('open');
    expect(recorded.improvements.map(i => i.kind)).toEqual(['fence']);
  });
});

describe('legal flags across parcels', () => {
  it('shows a flag on any land property, prefixed with its parcel when there are several', () => {
    const spec = landSpec([
      land({ title: '1234', landShapeType: '04' }),
      land({ sequenceNumber: 2, title: null, isEncroached: true, isExpropriated: true }),
    ]);
    expect(spec.legal?.sub).toBe(
      'values.parcelNumber{"n":2}: legal.expropriated, legal.encroached',
    );
    expect(spec.parcel.info.rows.find(r => r.label === 'rows.legal')?.value).toBe(spec.legal?.sub);
  });

  it('numbers an untitled parcel by its place in the list, not by its sequence number', () => {
    const spec = landSpec([
      land({ sequenceNumber: 7, isLandlocked: true }),
      land({ sequenceNumber: 9, isEncroached: true }),
    ]);
    expect(spec.legal?.sub).toBe(
      'values.parcelNumber{"n":1}: legal.landlocked · values.parcelNumber{"n":2}: legal.encroached',
    );
  });

  it('prefixes with the deed number when the parcel has one, and keeps one parcel unprefixed', () => {
    const deed = (titleNumber: string) => [{ titleNumber }] as unknown as BriefAsset['landTitles'];
    const two = landSpec([
      land({ landTitles: deed('1234'), isLandlocked: true }),
      land({ landTitles: deed('5678') }),
    ]);
    expect(two.legal?.sub).toBe('1234: legal.landlocked');
    const one = landSpec([land({ isLandlocked: true })]);
    expect(one.legal?.sub).toBe('legal.landlocked');
  });

  it('names a condo unit by its room number, else by its place in the list', () => {
    const sub = condoSpec([
      condoUnit({ roomNumber: '1205', isLandlocked: true }),
      condoUnit({ roomNumber: null, isEncroached: true }),
    ]).legal?.sub;
    expect(sub).toBe(
      'values.unitRoom{"room":"1205"}: legal.landlocked · values.unitNumber{"n":2}: legal.encroached',
    );
  });
});

describe('the parcel size of a property that records its area only on its titles', () => {
  it("draws and states the titles' area", () => {
    const spec = landSpec([
      land({
        areaRai: null,
        areaNgan: null,
        areaSquareWa: null,
        landTitles: [{ areaRai: 2, areaNgan: 0, areaSquareWa: 0 }] as BriefAsset['landTitles'],
      }),
    ]);
    expect(spec.parcel.sqm).toBe(3200);
    expect(spec.parcel.callout?.sub).toContain(
      'values.areaRaiNganWa{"rai":"2","ngan":"0","wa":"0"}',
    );
  });
});

describe('primary parcel', () => {
  it('does not take a parcel with an unfilled 0 frontage for one with recorded details', () => {
    const spec = landSpec([
      land({ roadFrontage: 0 }),
      land({ landShapeType: '06', roadFrontage: 20 }),
    ]);
    expect(spec.parcel.shape).toBe('06');
    expect(spec.parcel.frontage).toBe(20);
  });
});

describe('an area that totals 0', () => {
  it('is treated as not recorded: default size and a dashed square, never NaN', () => {
    const spec = landSpec([
      land({ areaRai: 0, areaNgan: 0, areaSquareWa: 0, landShapeType: '05', roadFrontage: 20 }),
    ]);
    expect(Number.isFinite(spec.parcel.sqm)).toBe(true);
    expect(spec.parcel.sqm).toBeGreaterThan(0);
    expect(spec.parcel.shapeKnown).toBe(false);
  });
});

describe('buildings', () => {
  it('draws the usual storeys and footprint of its kind when the building records neither, without stating them', () => {
    const spec = landSpec([land(), asset({ propertyType: 'B', buildingType: '02' })]);
    expect(spec.buildings[0]).toMatchObject({
      floors: TYPE_FORM['02'].floors,
      area: TYPE_FORM['02'].footprint * TYPE_FORM['02'].floors,
    });
    const labels = spec.buildings[0].info.rows.map(r => r.label);
    expect(labels).not.toContain('rows.floors');
    expect(labels).not.toContain('rows.buildingArea');
    expect(spec.buildings[0].callout.sub).not.toContain('values.floorsCount');
    expect(spec.buildings[0].callout.sub).not.toContain('units.sqm');
    const recorded = landSpec([
      land(),
      asset({ propertyType: 'B', buildingType: '02', numberOfFloors: 2, totalBuildingArea: 80 }),
    ]);
    expect(recorded.buildings[0].info.rows.map(r => r.label)).toEqual(
      expect.arrayContaining(['rows.floors', 'rows.buildingArea']),
    );
  });

  it('carries type form, roof colour and the under-construction flag', () => {
    const spec = landSpec([
      land(),
      house({ roofType: ['06'], isUnderConstruction: true, buildingType: '10', numberOfFloors: 1 }),
    ]);
    expect(spec.buildings[0]).toMatchObject({
      roofColor: 'roofTile',
      roofStyle: 'sawtooth',
      fh: 7,
      under: true,
    });
  });

  it('draws the tallest four and says how many are left out', () => {
    const buildings = [1, 2, 3, 4, 5, 6].map(f => house({ numberOfFloors: f }));
    const spec = landSpec(buildings);
    expect(spec.buildings.map(b => b.floors)).toEqual([6, 5, 4, 3]);
    expect(spec.parcel.callout?.sub).toContain('values.moreBuildings{"n":"2"}');
  });

  it('says how many are left out on the first building when there is no parcel to say it', () => {
    const only = [1, 2, 3, 4, 5, 6].map(f => asset({ propertyType: 'B', numberOfFloors: f }));
    const spec = landSpec(only);
    expect(spec.parcel.callout).toBeNull();
    expect(spec.buildings).toHaveLength(4);
    expect(spec.buildings[0].callout.sub).toContain('values.moreBuildings{"n":"2"}');
    expect(spec.buildings[0].callout.rows?.at(-1)?.value).toBe('values.moreBuildings{"n":"2"}');
    expect(spec.buildings[1].callout.sub).not.toContain('moreBuildings');
  });

  it("names a type-99 building by the appraiser's own words", () => {
    const spec = landSpec([
      land(),
      asset({
        propertyType: 'B',
        buildingType: '99',
        buildingTypeOther: 'ห้องเย็น',
        numberOfFloors: 1,
        totalBuildingArea: 300,
      }),
    ]);
    expect(spec.buildings[0].name).toBe('ห้องเย็น');
  });
});

describe('improvements', () => {
  it('routes a type-99 building whose words name an improvement to improvements, not a box', () => {
    const spec = landSpec([
      land(),
      house(),
      asset({
        propertyType: 'B',
        buildingType: '99',
        buildingTypeOther: 'รั้วคอนกรีตสูง 2 เมตร',
        numberOfFloors: 1,
        totalBuildingArea: 144,
      }),
    ]);
    expect(spec.buildings).toHaveLength(1);
    expect(spec.improvements).toHaveLength(1);
    expect(spec.improvements[0]).toMatchObject({ kind: 'fence', area: 144 });
  });

  it('draws nothing as a building for a development-only property but keeps its improvements', () => {
    const spec = landSpec([
      land(),
      asset({
        propertyType: 'LB',
        isDevelopmentOnly: true,
        buildingType: '01',
        numberOfFloors: 1,
        totalBuildingArea: 50,
        improvements: [
          { description: 'ป้อมยาม', area: 4 },
          { description: 'ศาลพระภูมิ', area: null },
        ],
      }),
    ]);
    expect(spec.buildings).toEqual([]);
    expect(spec.improvements.map(i => i.kind)).toEqual(['guard', 'shrine']);
    expect(spec.improvementsCallout?.sub).toBe('ป้อมยาม · ศาลพระภูมิ');
  });

  it('keeps unknown text and area-only rows: nothing valued may vanish', () => {
    const spec = landSpec([
      land(),
      house({
        improvements: [
          { description: 'ระบบบำบัดน้ำเสีย', area: 10 },
          { description: null, area: 25 },
          { description: '  ', area: null },
        ],
      }),
    ]);
    expect(spec.improvements.map(i => i.kind)).toEqual(['other', 'other']);
    expect(spec.improvements[1].text).toBe('values.unnamedImprovement');
  });

  it('has none when the lists are empty', () => {
    const spec = landSpec([land(), house()]);
    expect(spec.improvements).toEqual([]);
    expect(spec.improvementsCallout).toBeNull();
  });
});

describe('fence', () => {
  it('is solid for 01/02/04, open for 03/05/07/08, nothing for 06', () => {
    expect(landSpec([land(), house({ fenceType: ['01'] })]).fence?.style).toBe('solid');
    expect(landSpec([land(), house({ fenceType: ['07'] })]).fence?.style).toBe('open');
    expect(landSpec([land(), house({ fenceType: ['06'] })]).fence).toBeNull();
    expect(landSpec([land(), house({ fenceType: ['99'] })]).fence?.style).toBe('other');
    expect(landSpec([land(), house({ fenceType: ['03', '01'] })]).fence?.style).toBe('solid');
  });

  it('lets the recorded FenceType win over a fence improvement, which stays in the card', () => {
    const spec = landSpec([
      land(),
      house({ fenceType: ['07'], improvements: [{ description: 'รั้ว', area: null }] }),
    ]);
    expect(spec.fence?.style).toBe('open');
    expect(spec.fence?.info.rows.some(r => r.value === 'รั้ว')).toBe(true);
    expect(spec.improvements.map(i => i.text)).toEqual(['รั้ว']);
    // "No fence" recorded is a recorded answer too
    expect(
      landSpec([
        land(),
        house({ fenceType: ['06'], improvements: [{ description: 'รั้ว', area: null }] }),
      ]).fence,
    ).toBeNull();
  });

  it('falls back to a fence improvement only when FenceType is empty', () => {
    const spec = landSpec([
      land(),
      house({ fenceType: [], improvements: [{ description: 'รั้ว', area: null }] }),
    ]);
    expect(spec.fence?.style).toBe('solid');
    expect(spec.fence?.info.title).toBe('รั้ว');
  });
});

describe('pond, land use, legal flags, machines', () => {
  it('has a pond only for a positive area', () => {
    expect(landSpec([land({ pondArea: 0 })]).pond).toBeNull();
    expect(landSpec([land({ pondArea: null })]).pond).toBeNull();
    expect(landSpec([land({ pondArea: 220, pondDepth: 2.5 })]).pond).toMatchObject({
      area: 220,
      depth: 2.5,
    });
  });

  it('reads the LandUse codes', () => {
    const spec = landSpec([land({ landUseType: ['01', '03'] })]);
    expect(spec.use).toEqual({
      residential: true,
      agricultural: false,
      commercial: true,
      industrial: false,
    });
  });

  it('lists only the legal flags that are on', () => {
    expect(landSpec([land()]).legal).toBeNull();
    const spec = landSpec([
      land({ isLandlocked: true, isEncroached: true, isExpropriated: false }),
    ]);
    expect(spec.legal?.sub).toBe('legal.landlocked · legal.encroached');
    expect(spec.legal?.tone).toBe('danger');
  });

  it('puts machines in the first factory or warehouse, and says so when there is none', () => {
    const mac = asset({ propertyType: 'MAC' });
    const withHost = landSpec([
      land(),
      house({ buildingType: '01' }),
      house({ buildingType: '10' }),
      mac,
      mac,
    ]);
    expect(withHost.machines?.count).toBe(2);
    expect(withHost.buildings[withHost.machineHost].type).toBe('10');
    const noHost = landSpec([land(), house(), mac]);
    expect(noHost.machineHost).toBe(-1);
    expect(noHost.machines?.callout.sub).toBe('callouts.machinesNoHost');
  });

  it("keeps the machines' factory inside the draw cap", () => {
    const mac = asset({ propertyType: 'MAC' });
    const spec = landSpec([
      land(),
      ...Array.from({ length: 4 }, () => house({ buildingType: '01', numberOfFloors: 2 })),
      house({ buildingType: '10', numberOfFloors: 1 }),
      ...Array.from({ length: 30 }, () => mac),
    ]);
    expect(spec.buildings).toHaveLength(4);
    expect(spec.machineHost).toBeGreaterThanOrEqual(0);
    expect(spec.buildings[spec.machineHost].type).toBe('10');
    expect(spec.machines?.callout.sub).toBe('callouts.machinesNoPosition');
  });

  it('reads "far from electricity" the right way round', () => {
    const rows = (far: boolean | null) =>
      landSpec([land({ farFromElectricity: far, electricityDistance: 40 })]).parcel.info.rows.find(
        r => r.label === 'rows.electricity',
      )?.value;
    expect(rows(true)).toBe('values.farElectricity{"distance":"40"}');
    expect(rows(false)).toBe('values.notFar');
    expect(rows(null)).toBe('—');
  });
});

describe('zero means not recorded', () => {
  const row = (spec: LandSceneSpec, label: string) =>
    spec.parcel.info.rows.find(r => r.label === label)?.value;

  it('draws no pond for 0, and drops a 0 depth from the pond text', () => {
    expect(landSpec([land({ pondArea: 0, pondDepth: 3 })]).pond).toBeNull();
    const pond = landSpec([land({ pondArea: 50, pondDepth: 0 })]).pond;
    expect(pond?.depth).toBeNull();
    expect(pond?.note).toBe('values.pondNoteAreaOnly{"area":"50"}');
    expect(pond?.info.rows.find(r => r.label === 'rows.depth')?.value).toBe('values.notRecorded');
  });

  it('falls back to a square parcel for a 0 road frontage', () => {
    const spec = landSpec([land({ landShapeType: '05', roadFrontage: 0 })]);
    expect(spec.parcel.shapeKnown).toBe(false);
    expect(spec.parcel.frontage).toBe(0);
    expect(row(spec, 'rows.roadFrontage')).toBe('values.notEntered');
  });

  it('uses the default road width and says so for a 0 access road width', () => {
    const spec = landSpec([
      land({
        accessRoadWidth: 0,
        boundaries: [{ direction: 'south', adjacentArea: 'ถนน', distance: 0 }],
      }),
    ]);
    expect(spec.neighbours[0].thickness).toBe(6);
    expect(spec.neighbours[0].info!.rows.find(r => r.label === 'rows.width')?.value).toBe(
      'values.notEntered',
    );
  });

  it('shows 0 soil level and 0 electricity distance as not recorded', () => {
    const spec = landSpec([
      land({ soilLevel: 0, farFromElectricity: true, electricityDistance: 0 }),
    ]);
    expect(row(spec, 'rows.soilLevel')).toBe('—');
    expect(row(spec, 'rows.electricity')).toBe('values.farNoDistance');
  });

  it('treats a 0 building area and a 0 usable area as not recorded', () => {
    const b = landSpec([
      land(),
      asset({ propertyType: 'B', buildingType: '02', numberOfFloors: 2, totalBuildingArea: 0 }),
    ]);
    expect(b.buildings[0].area).toBe(TYPE_FORM['02'].footprint * 2);
    const c = condoSpec([condoUnit({ usableArea: 0 })]);
    expect(c.units[0].info.rows.find(r => r.label === 'rows.usableArea')?.value).toBe('—');
  });
});

describe('condo', () => {
  it('highlights the unit floor and puts the unit by LocationView', () => {
    const spec = condoSpec([
      condoUnit({ locationViewType: ['02', '06'], facilityType: ['01', '06'] }),
    ]);
    expect(spec.floors).toBe(35);
    expect(spec.units[0]).toMatchObject({ floor: 12, slot: 'end' });
    expect(spec.water).toBe('river');
    expect(spec.has.pool).toBe(true);
    expect(spec.deckUse).toBe(true);
  });

  it('says so when units past the draw cap have a floor problem, and only then', () => {
    const ok = (n: number) => condoUnit({ condoFloorNumber: '5', title: `50${n}` });
    const bad = (raw: string) => condoUnit({ condoFloorNumber: raw, title: 'X' });
    // 3 drawn units (MAX_CONDO_UNITS); the rest: two fine, three with a bad floor ('G', 999, above the 35 floors),
    // and two that never had one ('-', blank), which are not bad.
    const spec = condoSpec([
      ok(1),
      ok(2),
      ok(3),
      ok(4),
      ok(5),
      bad('G'),
      bad('999'),
      bad('40'),
      bad('-'),
      bad(''),
    ]);
    expect(spec.units).toHaveLength(MAX_CONDO_UNITS);
    expect(spec.towerCallout.sub).toContain('callouts.condoUnitsNotDrawn{"n":"3"}');
    expect(spec.towerInfo.rows.map(r => r.value)).toContain('callouts.condoUnitsNotDrawn{"n":"3"}');
    // Nothing to say when the extra units are fine, or when there are none.
    expect(condoSpec([ok(1), ok(2), ok(3), ok(4)]).towerCallout.sub).not.toContain(
      'condoUnitsNotDrawn',
    );
  });

  it.each([
    [['11'], 'middle'],
    [['13'], 'middle'],
    [['12'], 'end'],
    [['07'], 'start'],
    [[], 'start'],
  ])('LocationView %j -> %s', (view, slot) => {
    expect(condoSpec([condoUnit({ locationViewType: view })]).units[0].slot).toBe(slot);
  });

  it('warns instead of highlighting when FloorNumber is there but is not a floor', () => {
    for (const raw of ['G', 'B1', '5 - 6']) {
      const unit = condoSpec([condoUnit({ condoFloorNumber: raw })]).units[0];
      expect(unit.floor).toBeNull();
      expect(unit.callout.tone).toBe('danger');
      expect(unit.callout.priority).toBe(0);
      expect(unit.callout.sub).toContain('callouts.floorUnreadable');
    }
  });

  it('says "not recorded", neutrally, when FloorNumber was never filled in', () => {
    for (const raw of ['-', '—', '', ' ', '0', null]) {
      const unit = condoSpec([condoUnit({ condoFloorNumber: raw })]).units[0];
      expect(unit.floor).toBeNull();
      expect(unit.callout.tone).toBeUndefined();
      expect(unit.callout.priority).toBeUndefined();
      expect(unit.callout.sub).toContain('callouts.floorNotRecorded');
      expect(unit.callout.sub).not.toContain('floorUnreadable');
      expect(unit.info.rows[0].value).toBe('values.notRecorded');
    }
  });

  it('warns when the floor is above the building', () => {
    const unit = condoSpec([condoUnit({ condoFloors: 8, condoFloorNumber: '12' })]).units[0];
    expect(unit.floor).toBeNull();
    expect(unit.callout.sub).toContain('callouts.floorBeyond');
  });

  it('builds the same priority-0 legal callout and hover row as a land from the condo flags', () => {
    const spec = condoSpec([condoUnit({ isExpropriated: true, isForestBoundary: true })]);
    expect(spec.legal).toMatchObject({
      title: 'callouts.legal',
      sub: 'legal.expropriated · legal.forestBoundary',
      tone: 'danger',
      priority: 0,
    });
    expect(spec.towerInfo.rows.find(r => r.label === 'rows.legal')?.value).toBe(spec.legal?.sub);
    expect(condoSpec([condoUnit()]).legal).toBeNull();
  });

  it('needs no podium for a stadium alone, which stands on the ground', () => {
    expect(condoSpec([condoUnit({ facilityType: ['09'] })]).deckUse).toBe(false);
    expect(condoSpec([condoUnit({ facilityType: ['09', '06'] })]).deckUse).toBe(true);
  });

  it('ignores a typo floor for the height and warns, instead of drawing a 1,205-storey spire', () => {
    const spec = condoSpec([condoUnit({ condoFloors: null, condoFloorNumber: '1205' })]);
    expect(spec.floors).toBeLessThanOrEqual(FLOOR_CAP);
    expect(spec.floors).toBe(1);
    expect(spec.units[0].floor).toBeNull();
    expect(spec.units[0].callout.tone).toBe('danger');
    expect(spec.units[0].callout.sub).toContain('callouts.floorImplausible');
    // a sane unit beside it still sets the height
    const both = condoSpec([
      condoUnit({ condoFloors: null, condoFloorNumber: '12' }),
      condoUnit({ condoFloors: null, condoFloorNumber: '999' }),
    ]);
    expect(both.floors).toBe(12);
  });

  it('clamps a recorded height above the cap for drawing, and warns on the tower', () => {
    const spec = condoSpec([condoUnit({ condoFloors: 999, condoFloorNumber: '12' })]);
    expect(spec.floors).toBe(FLOOR_CAP);
    expect(spec.towerInfo.rows.some(r => r.label === 'rows.warning')).toBe(true);
    expect(spec.towerCallout.sub).toContain('values.floorsClamped');
    expect(spec.units[0].floor).toBe(12);
  });

  it('carries the under-construction state to the tower hover and callout', () => {
    const spec = condoSpec([condoUnit({ isUnderConstruction: true })]);
    expect(spec.under).toBe(true);
    expect(spec.towerInfo.rows.some(r => r.value === 'values.underConstruction')).toBe(true);
    expect(spec.towerCallout.sub).toContain('values.underConstruction');
    const done = condoSpec([condoUnit()]);
    expect(done.under).toBe(false);
    expect(done.towerCallout.sub).not.toContain('values.underConstruction');
  });

  it('has no podium or water when nothing asks for them', () => {
    const spec = condoSpec([condoUnit({ facilityType: ['01', '03'] })]);
    expect(spec.deckUse).toBe(false);
    expect(spec.water).toBeNull();
    expect(spec.has.parking).toBe(true);
  });

  it('reads the sea over the river', () => {
    expect(condoSpec([condoUnit({ locationViewType: ['02', '09'] })]).water).toBe('sea');
  });

  it('counts every unit on the badge but highlights at most MAX_CONDO_UNITS', () => {
    const spec = condoSpec(
      Array.from({ length: 6 }, (_, i) =>
        condoUnit({ title: `10${i}`, condoFloorNumber: String(i + 1) }),
      ),
    );
    expect(spec.units).toHaveLength(MAX_CONDO_UNITS);
    expect(spec.towerCallout.badge).toBe('×6');
  });

  it('leaves a mix of condo with land, buildings or machines to the hero without a model', () => {
    expect(buildSceneSpec([condoUnit(), land()], null, env)).toBeNull();
    expect(canDraw3D([condoUnit(), land()], null)).toBe(false);
    expect(canDraw3D([condoUnit(), asset({ propertyType: 'MAC' })], null)).toBe(false);
  });
});

describe('machines alone', () => {
  const macs = (n: number) =>
    Array.from({ length: n }, () => asset({ propertyType: 'MAC', machineName: 'Press' }));

  it('builds the apron with the machines in a yard, and states only the count', () => {
    const spec = landSpec(macs(2));
    expect(spec.parcel.callout).toBeNull();
    expect(spec.parcel.info.rows.map(r => r.value)).toEqual(['notes.noLand']);
    expect(spec.buildings).toEqual([]);
    expect(spec.machineYard).toBe(true);
    expect(spec.machineHost).toBe(-1);
    expect(spec.machines?.count).toBe(2);
    expect(spec.machines?.info.rows.map(r => r.label)).toEqual([
      'rows.countOnRequest',
      'rows.position',
    ]);
    // Positions are not recorded; no land or price is claimed.
    expect(spec.machines?.callout.sub).toContain('callouts.machinesNoPosition');
    expect(spec.machines?.callout.sub).not.toContain('machinesNoHost');
    expect(spec.machines?.callout.badge).toBe('×2');
  });

  it('is not a yard when the machines have a building or land of their own', () => {
    expect(landSpec([land(), ...macs(2)]).machineYard).toBe(false);
    expect(landSpec([house(), ...macs(2)]).machineYard).toBe(false);
  });
});

describe('what can be drawn', () => {
  it('draws land, buildings, condo and machines alone; not vehicles alone', () => {
    expect(canDraw3D([land()], null)).toBe(true);
    expect(canDraw3D([house()], null)).toBe(true);
    expect(canDraw3D([condoUnit()], null)).toBe(true);
    expect(canDraw3D([asset({ propertyType: 'MAC' })], null)).toBe(true);
    expect(canDraw3D([asset({ propertyType: 'VEH' })], null)).toBe(false);
    expect(canDraw3D([], null)).toBe(false);
  });
});

describe('block project', () => {
  const project = (o: Partial<BriefProject> = {}): BriefProject => ({
    projectName: 'Block 16/09',
    projectType: 'U',
    developer: null,
    unitForSaleCount: null,
    landAreaRai: 3,
    landAreaNgan: 1,
    landAreaSquareWa: 20,
    subDistrict: null,
    numberOfPhase: null,
    towerCount: 2,
    maxFloor: 8,
    unitCount: 0,
    unitStoreys: null,
    unassignedUnits: 0,
    unassignedSoldUnits: 0,
    isUnderConstruction: null,
    constructionProgressPercent: null,
    facilities: [],
    land: null,
    houseModels: [],
    plots: [],
    towers: [
      {
        towerName: 'A',
        numberOfFloors: 8,
        numberOfUnits: 20,
        floors: [
          { floor: 1, units: 4, soldUnits: 1 },
          { floor: 2, units: 4, soldUnits: 4 },
          { floor: null, units: 2, soldUnits: 1 },
        ],
      },
      {
        towerName: 'B',
        numberOfFloors: null,
        numberOfUnits: 6,
        floors: [{ floor: 10, units: 6, soldUnits: 0 }],
      },
    ],
    ...o,
  });
  const block = (p: BriefProject) => buildSceneSpec([], p, env) as BlockSceneSpec;

  it('keeps units with no floor in the totals even though they cannot be placed', () => {
    const spec = block(project());
    expect(spec.towers[0].units).toBe(10);
    expect(spec.callout.badge).toBe('×16');
  });

  it('counts every unit and sold unit, and draws only units with a readable floor', () => {
    const spec = block(project());
    expect(spec.totalUnits).toBe(10 + 6);
    expect(spec.soldUnits).toBe(1 + 4 + 1);
    expect(spec.towers[0].perFloor).toEqual([
      { floor: 1, units: 4, sold: 1 },
      { floor: 2, units: 4, sold: 4 },
    ]);
  });

  it('sizes a tower from the recorded floors, the highest occupied floor, or 1', () => {
    const spec = block(project());
    expect(spec.towers[0].floors).toBe(8);
    expect(spec.towers[1].floors).toBe(10); // no NumberOfFloors: the highest floor with a unit
    expect(spec.towers[1].name).toBe('B');
  });

  it('derives the project plot from the recorded area', () => {
    expect(block(project()).sqm).toBe((3 * 400 + 100 + 20) * 4);
    expect(
      block(project({ landAreaRai: null, landAreaNgan: null, landAreaSquareWa: null })).sqm,
    ).toBeNull();
  });

  it('draws every real tower up to 12, and counts the rest', () => {
    const t = project().towers[0];
    expect(block(project({ towers: [t, t, t, t, t] })).towers).toHaveLength(5);
    const many = block(project({ towers: Array.from({ length: 15 }, () => t) }));
    expect(many.towers).toHaveLength(12);
    expect(many.hiddenTowers).toBe(3);
  });

  it('counts units with no tower in the totals and the callout, without drawing or counting a tower', () => {
    const spec = block(project({ unassignedUnits: 7, unassignedSoldUnits: 3 }));
    expect(spec.totalUnits).toBe(10 + 6 + 7);
    expect(spec.soldUnits).toBe(1 + 4 + 1 + 3);
    expect(spec.towers).toHaveLength(2);
    expect(spec.hiddenTowers).toBe(0);
    expect(spec.callout.sub).toContain('callouts.blockSub{"towers":"2"');
    expect(spec.callout.sub).toContain('callouts.unassignedUnits{"n":"7"}');
    expect(spec.landInfo.rows.some(r => r.label === 'rows.unassignedUnits')).toBe(true);
    expect(block(project()).callout.sub).not.toContain('unassignedUnits');
  });

  it('keeps the units of a leftover tower in the totals, so they still add up to the unit count', () => {
    const real = project().towers[0];
    const ghost = {
      towerName: null,
      numberOfFloors: null,
      numberOfUnits: 9,
      floors: [
        { floor: 1, units: 4, soldUnits: 1 },
        { floor: null, units: 2, soldUnits: 1 },
      ],
    };
    const base = block(project({ towers: [real] }));
    const spec = block(project({ towers: [real, ghost] }));
    expect(spec.towers).toHaveLength(1);
    expect(spec.totalUnits).toBe(base.totalUnits + 6);
    expect(spec.soldUnits).toBe(base.soldUnits + 2);
    expect(spec.callout.sub).toContain('callouts.unassignedUnits{"n":"6"}');
  });

  it('ignores a typo floor and clamps a typo height on a tower, and says so', () => {
    const t = (o: Partial<BriefTower>) => ({
      towerName: 'A',
      numberOfFloors: null,
      numberOfUnits: 4,
      floors: [{ floor: 3, units: 4, soldUnits: 1 }],
      ...o,
    });
    const typo = block(
      project({
        towers: [
          t({
            floors: [
              { floor: 3, units: 2, soldUnits: 0 },
              { floor: 999, units: 2, soldUnits: 1 },
            ],
          }),
        ],
      }),
    );
    expect(typo.towers[0].floors).toBe(3);
    expect(typo.towers[0].units).toBe(4); // the units still count
    expect(typo.towers[0].perFloor).toEqual([{ floor: 3, units: 2, sold: 0 }]);
    expect(typo.towers[0].warned.implausible).toBe(true);
    expect(typo.callout.sub).toContain('callouts.towerFloorWarning{"n":"1"}');
    const tall = block(project({ towers: [t({ numberOfFloors: 999 })] }));
    expect(tall.towers[0].floors).toBe(FLOOR_CAP);
    expect(tall.towers[0].warned.implausible).toBe(true);
    expect(
      Object.values(block(project({ towers: [t({ numberOfFloors: 30 })] })).towers[0].warned),
    ).not.toContain(true);
  });

  it('keeps the totals on the uploaded units and shows a differing recorded count in the hover', () => {
    const t = (units: number | null) => ({
      towerName: 'A',
      numberOfFloors: 5,
      numberOfUnits: units,
      floors: [{ floor: 1, units: 100, soldUnits: 10 }],
    });
    const spec = block(project({ towers: [t(120)] }));
    expect(spec.towers[0].units).toBe(100);
    expect(spec.totalUnits).toBe(100);
    const rows = spec.towers[0].info.rows.filter(r => r.label === 'rows.units');
    expect(rows.map(r => r.value)).toContain(
      'values.towerUnitsRecorded{"recorded":"120","uploaded":"100"}',
    );
    // nothing to say when they agree or when nothing was recorded
    for (const same of [100, null]) {
      const none = block(project({ towers: [t(same)] }));
      expect(none.towers[0].info.rows.filter(r => r.label === 'rows.units')).toHaveLength(1);
    }
  });

  it("lets a recorded height win over the units' floors, and warns on a unit above it", () => {
    const tower = (numberOfFloors: number | null) => ({
      towerName: 'A',
      numberOfFloors,
      numberOfUnits: 6,
      floors: [
        { floor: 3, units: 4, soldUnits: 1 },
        { floor: 85, units: 2, soldUnits: 0 },
      ],
    });
    const spec = block(project({ towers: [tower(30)] })).towers[0];
    expect(spec.floors).toBe(30);
    expect(spec.perFloor).toEqual([{ floor: 3, units: 4, sold: 1 }]);
    expect(spec.units).toBe(6); // the unit above the tower still counts
    expect(spec.warned).toMatchObject({ beyond: true, implausible: false });
    expect(spec.info.rows.some(r => r.value.startsWith('callouts.towerUnitsAbove'))).toBe(true);
    // with nothing recorded, the units' sane floors set the height
    const derived = block(project({ towers: [tower(null)] })).towers[0];
    expect(derived.floors).toBe(85);
    expect(Object.values(derived.warned)).not.toContain(true);
  });

  it('draws an assumed height, and only counts the tower, when no floors are recorded anywhere', () => {
    const tower = (floors: { floor: number | null; units: number; soldUnits: number }[]) => ({
      towerName: 'A',
      numberOfFloors: null,
      numberOfUnits: 12,
      floors,
    });
    const spec = block(project({ towers: [tower([{ floor: null, units: 12, soldUnits: 0 }])] }));
    const t = spec.towers[0];
    expect(t.floors).toBe(ASSUMED_TOWER_FLOORS);
    expect(t.units).toBe(12); // the units still count
    expect(t.perFloor).toEqual([]);
    expect(t.warned).toMatchObject({ noHeight: true, noFloor: true });
    const says = t.info.rows.map(r => r.value);
    expect(t.info.rows.map(r => r.label)).not.toContain('rows.floors');
    expect(says).toContain('callouts.towerUnitsNoFloor{"n":"12"}');
    expect(spec.callout.sub).toContain('callouts.towerHeightWarning{"n":"1"}');
    expect(spec.callout.sub).toContain('callouts.towerNoFloorWarning{"n":"1"}');
    // Floor 0 is a recorded value, not "no floor": it has its own wording.
    const zero = block(project({ towers: [tower([{ floor: 0, units: 12, soldUnits: 0 }])] }));
    expect(zero.towers[0].floors).toBe(ASSUMED_TOWER_FLOORS);
    expect(zero.towers[0].warned).toMatchObject({
      noHeight: true,
      noFloor: false,
      nonPositive: true,
    });
    // The height does not follow the unit count.
    const many = block(project({ towers: [tower([{ floor: null, units: 900, soldUnits: 0 }])] }))
      .towers[0];
    expect(many.floors).toBe(ASSUMED_TOWER_FLOORS);
  });

  it('notes units with no floor even when the height is recorded', () => {
    const spec = block(
      project({
        towers: [
          {
            towerName: 'A',
            numberOfFloors: 20,
            numberOfUnits: 7,
            floors: [
              { floor: 3, units: 4, soldUnits: 0 },
              { floor: null, units: 3, soldUnits: 0 },
            ],
          },
        ],
      }),
    ).towers[0];
    expect(spec.floors).toBe(20);
    expect(spec.warned).toMatchObject({ noHeight: false, noFloor: true });
    expect(spec.info.rows.map(r => r.value)).toContain('callouts.towerUnitsNoFloor{"n":"3"}');
  });

  it('words each warning kind on its own and gives units above the height one row', () => {
    const above = {
      towerName: 'A',
      numberOfFloors: 8,
      numberOfUnits: 44,
      floors: [
        { floor: 3, units: 2, soldUnits: 0 },
        ...Array.from({ length: 22 }, (_, i) => ({ floor: 9 + i, units: 2, soldUnits: 0 })),
      ],
    };
    const spec = block(project({ towers: [above] }));
    const rows = spec.towers[0].info.rows.filter(r => r.label === 'rows.warning');
    expect(rows.map(r => r.value)).toEqual([
      'callouts.towerUnitsAbove{"n":"44","floors":"8","range":"9–30"}',
    ]);
    // Only the beyond kind is worded: not the "implausible floor number" text.
    expect(spec.callout.sub).toContain('callouts.towerBeyondWarning{"n":"1"}');
    expect(spec.callout.sub).not.toContain('callouts.towerFloorWarning');
  });

  it('words floor 0, a basement and a missing floor each on its own', () => {
    const spec = block(
      project({
        towers: [
          {
            towerName: 'A',
            numberOfFloors: 10,
            numberOfUnits: 9,
            floors: [
              { floor: 0, units: 2, soldUnits: 0 },
              { floor: -1, units: 3, soldUnits: 0 },
              { floor: null, units: 4, soldUnits: 0 },
            ],
          },
        ],
      }),
    );
    const says = spec.towers[0].info.rows.map(r => r.value);
    expect(says).toContain('callouts.towerUnitsNonPositive{"n":"5"}');
    expect(says).toContain('callouts.towerUnitsNoFloor{"n":"4"}');
    expect(spec.towers[0].warned).toMatchObject({ nonPositive: true, noFloor: true });
    expect(spec.callout.sub).toContain('callouts.towerNonPositiveWarning{"n":"1"}');
  });

  it('gives implausible floors one row, however many floors there are', () => {
    const typos = Array.from({ length: 30 }, (_, i) => ({
      floor: 1201 + i,
      units: 1,
      soldUnits: 0,
    }));
    const spec = block(
      project({
        towers: [{ towerName: 'A', numberOfFloors: 10, numberOfUnits: 30, floors: typos }],
      }),
    );
    const rows = spec.towers[0].info.rows.filter(r => r.label === 'rows.warning');
    expect(rows.map(r => r.value)).toEqual([
      'callouts.towerUnitsImplausible{"n":"30","range":"1201–1230"}',
    ]);
  });

  it('reports a warning on a tower that is not drawn', () => {
    const tower = (name: string, floor: number) => ({
      towerName: name,
      numberOfFloors: 10,
      numberOfUnits: 2,
      floors: [{ floor, units: 2, soldUnits: 0 }],
    });
    const towers = Array.from({ length: 12 }, (_, i) => tower(`T${i + 1}`, 3));
    const spec = block(project({ towers: [...towers, tower('T13', 1205)] }));
    expect(spec.towers).toHaveLength(12);
    expect(spec.hiddenTowers).toBe(1);
    expect(spec.callout.sub).toContain('callouts.towerFloorWarning{"n":"1"}');
  });

  it('never gives an unnamed tower the label of a tower that has that name', () => {
    const tower = (towerName: string | null) => ({
      towerName,
      numberOfFloors: 8,
      numberOfUnits: 4,
      floors: [{ floor: 2, units: 4, soldUnits: 0 }],
    });
    // Unnamed sorts first, so its position is 1: the same as the real tower '1'.
    const names = (towers: ReturnType<typeof tower>[]) =>
      block(project({ towers })).towers.map(t => t.name);
    const a = names([tower('1'), tower(null)]);
    expect(new Set(a).size).toBe(2);
    expect(a).toContain('1');
    const b = names([tower('#1'), tower(null), tower('')]);
    expect(new Set(b).size).toBe(3);
    // Each unnamed tower takes the first free "#k": the count restarts for every one.
    expect(names([tower(''), tower(''), tower(''), tower('#2')])).toEqual(['#1', '#3', '#4', '#2']);
  });

  it('draws towers in numeric order, not the text order the brief sends', () => {
    const t = (name: string) => ({
      towerName: name,
      numberOfFloors: 5,
      numberOfUnits: 1,
      floors: [],
    });
    const spec = block(project({ towers: ['1', '10', '11', '12', '2', '3'].map(t) }));
    expect(spec.towers.map(x => x.name)).toEqual(['1', '2', '3', '10', '11', '12']);
    expect(spec.hiddenTowers).toBe(0);
  });

  it('skips a tower with neither a name nor a floor count', () => {
    const real = project().towers[0];
    const ghost = { towerName: null, numberOfFloors: null, numberOfUnits: 9, floors: [] };
    const spec = block(project({ towers: [real, ghost] }));
    expect(spec.towers).toHaveLength(1);
    expect(canDraw3D([], project({ towers: [ghost] }))).toBe(false);
  });

  it('is left to the CSS scene when there are no towers (horizontal project)', () => {
    expect(buildSceneSpec([], project({ towers: [] }), env)).toBeNull();
    expect(canDraw3D([], project({ towers: [] }))).toBe(false);
    expect(canDraw3D([], project())).toBe(true);
  });
});

describe('horizontal (LB) project: a village', () => {
  const model = (o: Partial<BriefHouseModel> = {}): BriefHouseModel => ({
    id: 'm1',
    modelName: 'Monaco',
    buildingType: null,
    buildingTypeOther: null,
    numberOfFloors: 2,
    standardLandArea: 60,
    standardUsableArea: 150,
    roofType: ['06'],
    fenceType: [],
    units: 4,
    soldUnits: 1,
    ...o,
  });
  const plot = (i: number, o: Partial<BriefPlot> = {}): BriefPlot => ({
    plotNumber: String(i),
    houseNumber: `${i}/1`,
    modelId: 'm1',
    modelType: null,
    numberOfFloors: null,
    landArea: 55,
    usableArea: 140,
    isSold: false,
    ...o,
  });
  const lb = (n: number, o: Partial<BriefProject> = {}): BriefProject => ({
    ...baseProject(),
    projectType: 'LB',
    towers: [],
    houseModels: [model()],
    plots: Array.from({ length: n }, (_, i) => plot(i + 1)),
    unitCount: n,
    ...o,
  });
  const village = (p: BriefProject) => {
    const spec = buildSceneSpec([], p, env);
    expect(spec?.kind).toBe('village');
    return spec as VillageSceneSpec;
  };

  it('caps a typo storey count on a plot and on a model, and warns in the hover and the parcel card', () => {
    const own = village(lb(1, { plots: [plot(1, { numberOfFloors: 1205 })] }));
    expect(own.plots[0].floors).toBe(FLOOR_CAP);
    expect(villagePlotInfo(env, own, 0).rows.some(r => r.label === 'rows.warning')).toBe(true);
    // a plot with no storeys of its own inherits its model's, typo and warning included
    const viaModel = village(
      lb(1, {
        houseModels: [model({ numberOfFloors: 999 })],
        plots: [plot(1, { numberOfFloors: null })],
      }),
    );
    expect(viaModel.plots[0].floors).toBe(FLOOR_CAP);
    expect(viaModel.plots[0].warning).toContain('values.floorsClamped');
    expect(viaModel.parcel.info.rows.some(r => r.label === 'rows.warning')).toBe(true);
    const fine = village(lb(1));
    expect(fine.plots[0].warning).toBeNull();
  });

  it('is drawn when the project has plots, and left to the CSS scene otherwise', () => {
    expect(canDraw3D([], lb(3))).toBe(true);
    expect(canDraw3D([], lb(0))).toBe(false);
    expect(buildSceneSpec([], lb(0), env)).toBeNull();
  });

  it('draws at most MAX_HOUSES and counts the rest, including plots the brief did not send', () => {
    const spec = village(lb(800, { unitCount: 1200 }));
    expect(spec.plots).toHaveLength(MAX_HOUSES);
    expect(spec.callout.sub).toContain(`values.moreHouses{"n":"${1200 - MAX_HOUSES}"}`);
    expect(spec.callout.badge).toBe('×1200');
  });

  it('lays the plots out without overlaps, at 40, 300 and 800 plots over 2-3 models', () => {
    for (const n of [40, 300, 800]) {
      const models = [
        model({ id: 'a' }),
        model({ id: 'b', standardLandArea: 90 }),
        model({ id: 'c', standardLandArea: 40 }),
      ];
      const plots = Array.from({ length: n }, (_, i) =>
        plot(i + 1, { modelId: models[i % 3].id, landArea: [55, 90, 40][i % 3] }),
      );
      const spec = village(lb(n, { houseModels: models, plots }));
      const rects = spec.layout.plots;
      expect(rects).toHaveLength(Math.min(n, MAX_HOUSES));
      for (let i = 0; i < rects.length; i++) {
        for (let j = i + 1; j < rects.length; j++) {
          const a = rects[i];
          const b = rects[j];
          const clash =
            Math.abs(a.x - b.x) < (a.w + b.w) / 2 - 1e-6 &&
            Math.abs(a.z - b.z) < (a.d + b.d) / 2 - 1e-6;
          expect(clash).toBe(false);
        }
      }
    }
  });

  it('sizes a plot from its own area, then its model, then an assumed 50 sq.wa', () => {
    const area = (o: Partial<BriefPlot>, m: Partial<BriefHouseModel> = {}) => {
      const spec = village(lb(1, { houseModels: [model(m)], plots: [plot(1, o)] }));
      return spec.plots[0].plotW * spec.plots[0].plotD;
    };
    expect(area({ landArea: 80 })).toBeCloseTo(80 * 4);
    expect(area({ landArea: null })).toBeCloseTo(60 * 4); // the model's standard
    expect(area({ landArea: 0 }, { standardLandArea: null })).toBeCloseTo(50 * 4);
  });

  it('takes floors from the unit, then the model, then 1', () => {
    const floors = (o: Partial<BriefPlot>, m: Partial<BriefHouseModel> = {}) =>
      village(lb(1, { houseModels: [model(m)], plots: [plot(1, o)] })).plots[0].floors;
    expect(floors({ numberOfFloors: 3 })).toBe(3);
    expect(floors({ numberOfFloors: null })).toBe(2);
    expect(floors({ numberOfFloors: null }, { numberOfFloors: null })).toBe(1);
  });

  it('draws a model with no BuildingType as a generic detached house, with no text about it', () => {
    const spec = village(lb(2));
    expect(spec.models[0]).toMatchObject({ type: '01', roofColor: 'roofTile' });
    const labels = villagePlotInfo(env, spec, 0).rows.map(r => r.label);
    expect(labels).not.toContain('rows.form');
    expect(labels).not.toContain('rows.position');
    const typed = village(lb(2, { houseModels: [model({ buildingType: '04' })] }));
    expect(typed.models[0]).toMatchObject({ type: '04' });
  });

  it('keeps a house inside its plot', () => {
    const huge = village(lb(1, { plots: [plot(1, { landArea: 20, usableArea: 900 })] }));
    const p = huge.plots[0];
    expect(p.houseW).toBeLessThanOrEqual(p.plotW);
    expect(p.houseD).toBeLessThanOrEqual(p.plotD);
  });

  it('marks sold plots and counts them', () => {
    const plots = [plot(1, { isSold: true }), plot(2), plot(3, { isSold: true })];
    const spec = village(lb(3, { plots, houseModels: [model({ units: 3, soldUnits: 2 })] }));
    expect(spec.plots.map(p => p.sold)).toEqual([true, false, true]);
    expect(spec.callout.sub).toContain('callouts.villageSub{"sold":"2","total":"3","models":"1"}');
  });

  it('draws about (100 - progress)% of the houses as frames, the last ones, only when under construction', () => {
    const under = (n: number, o: Partial<BriefProject>) =>
      village(lb(n, o)).plots.map(p => p.under);
    const eighty = under(10, { isUnderConstruction: true, constructionProgressPercent: 80 });
    expect(eighty.filter(Boolean)).toHaveLength(2);
    expect(eighty.slice(-2)).toEqual([true, true]);
    // no progress recorded: half is drawn, but the text only says "under construction"
    const half = village(lb(10, { isUnderConstruction: true, constructionProgressPercent: null }));
    expect(half.plots.filter(p => p.under)).toHaveLength(5);
    expect(half.callout.sub).toContain('values.underConstruction');
    expect(half.callout.sub).not.toContain('values.villageUnder');
    expect(half.parcel.info.rows.some(r => r.value.startsWith('values.underConstruction'))).toBe(
      true,
    );
    // a recorded progress is stated, and the frame share is never described
    const rec = village(lb(10, { isUnderConstruction: true, constructionProgressPercent: 60 }));
    expect(rec.callout.sub).toContain('values.villageUnder{"percent":"60"}');
    expect(rec.parcel.info.rows.filter(r => r.label === 'rows.progress')).toHaveLength(1);
    expect(
      under(10, { isUnderConstruction: false, constructionProgressPercent: 20 }).some(Boolean),
    ).toBe(false);
    expect(
      under(10, { isUnderConstruction: true, constructionProgressPercent: 100 }).some(Boolean),
    ).toBe(false);
    // a recorded 0% is real (just started): every house is a frame, nothing is assumed
    const zero = village(lb(4, { isUnderConstruction: true, constructionProgressPercent: 0 }));
    expect(zero.plots.every(p => p.under)).toBe(true);
    expect(zero.callout.sub).toContain('values.villageUnder{"percent":"0"}');
  });

  it('gives a plot whose model is not listed a model of its own', () => {
    const spec = village(
      lb(2, {
        houseModels: [],
        plots: [
          plot(1, { modelId: 'x', modelType: 'Riviera' }),
          plot(2, { modelId: 'x', modelType: 'Riviera' }),
        ],
      }),
    );
    expect(spec.models.map(m => m.name)).toEqual(['Riviera']);
    expect(spec.plots.every(p => p.model === 0)).toBe(true);
  });

  it('shows plot, house number, model, floors, land and usable area and sold in the hover', () => {
    const spec = village(lb(1, { plots: [plot(7, { isSold: true })] }));
    const info = villagePlotInfo(env, spec, 0);
    expect(info.title).toBe('values.plotTitle{"plot":"7"}');
    const labelsOf = info.rows.map(r => r.label);
    for (const l of [
      'rows.houseNumber',
      'rows.model',
      'rows.floors',
      'rows.landArea',
      'rows.usableArea',
      'rows.status',
    ]) {
      expect(labelsOf).toContain(l);
    }
    expect(info.rows.find(r => r.label === 'rows.landArea')?.value).toBe('55 units.sqwa');
    expect(info.rows.find(r => r.label === 'rows.status')?.value).toBe('values.sold');
  });

  it('puts the land flags in a legal callout, and the facilities in a common area', () => {
    const none = village(lb(3));
    expect(none.legal).toBeNull();
    // Nothing recorded: the common area is still drawn, with the usual facilities, and says nothing.
    expect(none.layout.plaza).not.toBeNull();
    expect(none.facilitiesAssumed).toBe(true);
    expect(none.has).toMatchObject({ pool: true, garden: true, club: true });
    const spec = village(
      lb(3, {
        facilities: ['06', '10'],
        land: {
          landShapeType: null,
          roadFrontage: null,
          accessRoadWidth: null,
          roadSurfaceType: null,
          landUseType: [],
          isLandlocked: true,
          isExpropriated: null,
          isInExpropriationLine: null,
          isEncroached: null,
          isForestBoundary: null,
        },
      }),
    );
    expect(spec.legal).toMatchObject({ priority: 0, tone: 'danger' });
    expect(spec.layout.plaza).not.toBeNull();
    expect(spec.facilitiesAssumed).toBe(false);
    expect(spec.has).toMatchObject({ pool: true, club: true, garden: false });
  });

  it('draws the deed rectangle when it holds the layout, and a dashed one around the village otherwise', () => {
    const land = {
      landShapeType: '05',
      roadFrontage: 300,
      accessRoadWidth: null,
      roadSurfaceType: null,
      landUseType: [],
      isLandlocked: null,
      isExpropriated: null,
      isInExpropriationLine: null,
      isEncroached: null,
      isForestBoundary: null,
    };
    // 30 rai is 48,000 m2: 300 m by 160 m holds 6 plots easily
    const fits = village(lb(6, { land, landAreaRai: 30, landAreaNgan: 0, landAreaSquareWa: 0 }));
    expect(fits.parcel).toMatchObject({ width: 300, dashed: false });
    // a deed far too small for 200 plots is enlarged, dashed, and says so
    const small = village(lb(200, { land, landAreaRai: 1, landAreaNgan: 0, landAreaSquareWa: 0 }));
    expect(small.parcel.dashed).toBe(true);
    expect(small.parcel.width).toBeGreaterThanOrEqual(small.layout.width);
    expect(small.parcel.info.rows.some(r => r.value === 'notes.villageEnlarged')).toBe(true);
    // no deed area at all
    const none = village(lb(6));
    expect(none.parcel.dashed).toBe(true);
    expect(none.parcel.info.rows.some(r => r.value === 'notes.villageSizeUnknown')).toBe(true);
  });

  it('takes sold from the models, which count every unit, not from the plots the brief sent', () => {
    // 600 units, only 500 plots sent: the model says 240 are sold
    const plots = Array.from({ length: 500 }, (_, i) => plot(i + 1, { isSold: i < 100 }));
    const spec = village(lb(600, { plots, houseModels: [model({ units: 600, soldUnits: 240 })] }));
    expect(spec.callout.sub).toContain('"sold":"240","total":"600"');
  });

  it('shows 600 sold of 800 when the models say so and only 500 plots came back', () => {
    const models = [
      model({ id: 'a', units: 500, soldUnits: 380 }),
      model({ id: 'b', units: 300, soldUnits: 220 }),
    ];
    const plots = Array.from({ length: 500 }, (_, i) =>
      plot(i + 1, { modelId: i % 2 ? 'a' : 'b', isSold: i < 50 }),
    );
    const spec = village(lb(800, { plots, houseModels: models }));
    expect(spec.callout.sub).toContain('callouts.villageSub{"sold":"600","total":"800"');
  });

  it('counts the sold plots of a listed model that records no sold count, so the hero equals the pads', () => {
    const plots = [
      plot(1, { modelId: 'm1', isSold: true }),
      plot(2, { modelId: 'm1', isSold: true }),
      plot(3, { modelId: 'm1', isSold: false }),
    ];
    const project = lb(3, {
      plots,
      houseModels: [model({ units: null as never, soldUnits: null as never })],
    });
    const spec = village(project);
    expect(spec.plots.filter(p => p.sold)).toHaveLength(2);
    expect(spec.callout.sub).toContain('callouts.villageSub{"sold":"2","total":"3"');
    expect(villageCounts(project, env).sold).toBe(2);
    expect(spec.models[0].sold).toBe(2);
    // And its units the same way, so a model never reads "0 units, 2 sold".
    expect(spec.models[0].units).toBe(3);
    // A recorded count stays the source, whatever the plots say.
    const recorded = lb(3, { plots, houseModels: [model({ units: 3, soldUnits: 3 })] });
    expect(villageCounts(recorded, env).sold).toBe(3);
  });

  it('adds the sold plots of a model the project does not list, and falls back to the plots with no models', () => {
    const plots = [
      plot(1, { modelId: 'x', isSold: true }),
      plot(2, { modelId: 'x', isSold: true }),
      plot(3, { modelId: 'm1', isSold: true }),
    ];
    // m1 is listed with 1 sold; the two sold plots of unlisted x are added
    expect(village(lb(3, { plots })).callout.sub).toContain('"sold":"3"');
    expect(village(lb(3, { plots, houseModels: [] })).callout.sub).toContain('"sold":"3"');
  });

  it("counts a plot tied to a listed model only by its name into that model, on top of the brief's counts", () => {
    // Monaco is listed (4 units, 1 sold) with no BuildingType; this plot names it but has no matching id
    const plots = [
      plot(1, { modelId: 'm1' }),
      plot(2, { modelId: 'gone', modelType: 'Monaco', isSold: true }),
    ];
    const spec = village(lb(2, { plots }));
    expect(spec.models).toHaveLength(1);
    expect([spec.models[0].units, spec.models[0].sold]).toEqual([5, 2]);
    const row = spec.parcel.info.rows.find(r => r.label === 'Monaco');
    expect(row?.value).toBe('values.modelSummary{"units":"5","sold":"2"}');
  });

  it('matches an unlisted plot by name to a TYPED listed model too, not a made-up duplicate', () => {
    const typed = model({ buildingType: '04', modelName: 'Monaco' });
    const spec = village(
      lb(1, { houseModels: [typed], plots: [plot(1, { modelId: 'gone', modelType: 'Monaco' })] }),
    );
    expect(spec.models).toHaveLength(1);
    expect(spec.models[0]).toMatchObject({ type: '04', units: 5 });
  });

  it("carries each model's source record, and none for a made-up one", () => {
    const listed = model();
    const spec = village(
      lb(2, {
        houseModels: [listed],
        plots: [plot(1), plot(2, { modelId: 'x', modelType: 'Other' })],
      }),
    );
    expect(spec.models[0].src).toBe(listed);
    expect(spec.models[1].src).toBeNull();
  });

  it('counts the plots of a model the project does not list', () => {
    const plots = [
      plot(1, { modelId: 'x', modelType: 'Riviera', isSold: true }),
      plot(2, { modelId: 'x', modelType: 'Riviera' }),
      plot(3, { modelId: 'x', modelType: 'Riviera' }),
      plot(4, { modelId: 'm1' }),
    ];
    const spec = village(lb(4, { plots }));
    const riviera = spec.models.find(m => m.name === 'Riviera')!;
    expect([riviera.units, riviera.sold]).toEqual([3, 1]);
    // a listed model keeps what the brief says about it
    expect(spec.models.find(m => m.name === 'Monaco')!.units).toBe(4);
  });

  it('keeps a house inside a plot only 4 sq.wa big, with a positive size and a setback that fits', () => {
    const spec = village(lb(1, { plots: [plot(1, { landArea: 4, usableArea: 120 })] }));
    const p = spec.plots[0];
    expect(p.houseW).toBeGreaterThan(0);
    expect(p.houseD).toBeGreaterThan(0);
    expect(p.houseW).toBeLessThanOrEqual(p.plotW);
    expect(p.houseD).toBeLessThanOrEqual(p.plotD);
    const back = houseSetback(p.plotD, p.houseD);
    expect(back).toBeGreaterThanOrEqual(0);
    expect(back + p.houseD).toBeLessThanOrEqual(p.plotD + 1e-9);
    expect(houseSetback(40, 10)).toBe(3);
  });

  it.each([20, 30, 50, 100])(
    'draws the recorded deed, not a dashed one, when %i rai holds the plots',
    rai => {
      for (const n of [40, 60, 100, 200]) {
        const sqm = rai * 1600;
        // 50 sq.wa plots with roads and the margin need under half the deed
        if (n * 200 * 2 > sqm) continue;
        const land = {
          landShapeType: '04',
          roadFrontage: null,
          accessRoadWidth: null,
          roadSurfaceType: null,
          landUseType: [],
          isLandlocked: null,
          isExpropriated: null,
          isInExpropriationLine: null,
          isEncroached: null,
          isForestBoundary: null,
        };
        const plots = Array.from({ length: n }, (_, i) => plot(i + 1, { landArea: 50 }));
        const spec = village(
          lb(n, {
            land,
            plots,
            landAreaRai: rai,
            landAreaNgan: 0,
            landAreaSquareWa: 0,
            facilities: ['06', '10'],
          }),
        );
        expect(spec.parcel.dashed).toBe(false);
        expect(spec.parcel.width).toBeCloseTo(Math.sqrt(sqm));
      }
    },
  );

  it('draws the real dev LB project: 1 plot sent of 3, no deed land, facilities with no shape', () => {
    const spec = village({
      ...baseProject(),
      projectName: 'IDEO',
      projectType: 'LB',
      unitCount: 3,
      unassignedUnits: 3,
      unassignedSoldUnits: 1,
      facilities: ['01', '16'],
      land: {
        landShapeType: null,
        roadFrontage: 0,
        accessRoadWidth: 0,
        roadSurfaceType: null,
        landUseType: [],
        isLandlocked: false,
        isExpropriated: false,
        isInExpropriationLine: false,
        isEncroached: false,
        isForestBoundary: false,
      },
      houseModels: [
        model({
          id: 'r',
          modelName: 'Riviera',
          numberOfFloors: null,
          standardLandArea: 60.5,
          standardUsableArea: 180,
          roofType: [],
          units: 2,
          soldUnits: 1,
        }),
      ],
      plots: [
        plot(1, {
          plotNumber: 'P-001',
          houseNumber: '101',
          modelId: 'r',
          modelType: 'Riviera',
          numberOfFloors: 2,
          landArea: 60.5,
          usableArea: 180,
          isSold: true,
        }),
      ],
    });
    expect(spec.plots).toHaveLength(1);
    expect(spec.callout.sub).toContain('values.moreHouses{"n":"2"}');
    // every unit is "unassigned" for an LB project; that is not something to show
    expect(spec.callout.sub).not.toContain('unassigned');
    expect(spec.layout.plaza).toBeNull(); // elevator and waste disposal have no shape here
    expect(spec.legal).toBeNull();
    expect(spec.parcel.dashed).toBe(true);
    expect(spec.plots[0].floors).toBe(2);
  });
});

describe('callout rows (the card a pin opens)', () => {
  it('labels a legal warning as legal and a bad floor as a warning, each piece on its own row', () => {
    const spec = condoSpec([condoUnit({ condoFloorNumber: 'G', isLandlocked: true })]);
    const bad = spec.units[0].callout;
    expect(bad.tone).toBe('danger');
    expect(bad.rows).toEqual([{ label: 'rows.warning', value: bad.sub }]);
    expect(spec.legal?.rows?.every(r => r.label === 'rows.legal')).toBe(true);
    expect(spec.legal?.rows?.map(r => r.value).join(' · ')).toBe(spec.legal?.sub);
  });

  it('carries the pieces of a callout as rows that join back to its text', () => {
    const spec = landSpec([house({ numberOfFloors: 2, totalBuildingArea: 240 })]);
    const c = spec.buildings[0].callout;
    expect(c.rows!.length).toBeGreaterThan(1);
    expect(c.rows!.map(r => r.value).join(' · ')).toBe(c.sub);
  });
});

describe('recorded but undrawable land shape', () => {
  it('shows the recorded label only, with no "not recorded" or "drawn as a square" text', () => {
    const spec = landSpec([land({ landShapeType: '02' })]);
    const shapeRow = spec.parcel.info.rows.find(r => r.label === 'rows.shape');
    expect(shapeRow?.value).toBe('LandShape:02');
    expect(spec.parcel.callout?.sub).toContain('LandShape:02');
    expect(spec.parcel.callout?.sub).not.toContain('shapeNotRecorded');
  });
});

describe('condo unit naming and the canvas label', () => {
  it('names a unit by its room number, never by its title (free text without a room)', () => {
    const spec = condoSpec([condoUnit({ roomNumber: '3/48', title: 'deed-1' })]);
    expect(spec.units[0].info.title).toContain('3/48');
    const noRoom = condoSpec([
      condoUnit({ roomNumber: null, title: 'free text', condoName: 'IDEO' }),
    ]);
    expect(noRoom.units[0].info.title).toBe('IDEO');
    expect(
      condoSpec([condoUnit({ roomNumber: null, title: 'free text' })]).units[0].info.title,
    ).toBe('titles.units');
  });

  it('does not state storeys in the canvas label when none is recorded or readable', () => {
    const spec = condoSpec([condoUnit({ condoFloors: null, condoFloorNumber: '-', title: '1' })]);
    expect(spec.summary).not.toContain('callouts.condoFloors');
  });
});

describe('project counts from the brief alone', () => {
  it('give a village the same plots, sold and models the scene states', () => {
    const project = {
      ...baseProject(),
      unitCount: 9,
      houseModels: [
        { id: 'm1', modelName: 'A', buildingType: '01', units: 3, soldUnits: 2 },
        {
          id: 'm2',
          modelName: null,
          buildingType: '99',
          buildingTypeOther: 'ทาวน์',
          units: 2,
          soldUnits: 9,
        },
      ],
      plots: [
        { modelId: 'm1', isSold: true },
        { modelId: 'x', modelType: 'C', isSold: true },
        { modelId: null, modelType: 'C', isSold: false },
        { modelId: null, modelType: null, isSold: true },
      ],
    } as unknown as BriefProject;
    const counts = villageCounts(project, env);
    const spec = buildSceneSpec([], project, env) as VillageSceneSpec;
    // The numbers the hero states are the ones the callout states.
    expect(spec.callout.sub).toContain(
      `callouts.villageSub{"sold":"${counts.sold}","total":"${counts.total}","models":"${counts.models}"}`,
    );
    // 2 listed models + C + the plot with no model type = 4 models; sold never exceeds the 9 units
    expect(counts.models).toBe(4);
  });

  it('give a condo project the same towers, units and sold units the scene states', () => {
    const project = {
      projectName: 'B',
      projectType: 'U',
      towers: [
        {
          towerName: 'A',
          numberOfFloors: 5,
          numberOfUnits: 4,
          floors: [{ floor: 1, units: 4, soldUnits: 1 }],
        },
        {
          towerName: null,
          numberOfFloors: null,
          numberOfUnits: 2,
          floors: [{ floor: 1, units: 2, soldUnits: 2 }],
        },
      ],
      unassignedUnits: 3,
      unassignedSoldUnits: 1,
    } as unknown as BriefProject;
    const counts = blockCounts(project);
    const spec = buildSceneSpec([], project, env) as BlockSceneSpec;
    expect(counts).toMatchObject({ totalUnits: spec.totalUnits, soldUnits: spec.soldUnits });
    expect(counts.towers).toBe(spec.towers.length + spec.hiddenTowers);
  });
});

describe('hover rows state the recorded storey count, not the cap', () => {
  const floorsRow = (rows: { label: string; value: string }[]) =>
    rows.find(r => r.label === 'rows.floors')?.value;

  it('prints 120 for a 120-storey building, with the clamp warning beside it', () => {
    const b = landSpec([house({ numberOfFloors: 120 })]).buildings[0];
    expect(floorsRow(b.info.rows)).toBe('120');
    expect(b.info.rows.some(r => r.label === 'rows.warning')).toBe(true);
  });

  it('prints the recorded height of a condo tower', () => {
    const spec = condoSpec([condoUnit({ condoFloors: 130 })]);
    expect(floorsRow(spec.towerInfo.rows)).toBe('130');
  });

  it('prints the recorded storeys of a village plot', () => {
    const project = {
      ...baseProject(),
      unitCount: 1,
      houseModels: [],
      plots: [
        { plotNumber: '1', houseNumber: '1', modelId: null, numberOfFloors: 150, isSold: false },
      ],
    } as unknown as BriefProject;
    const spec = buildSceneSpec([], project, env) as VillageSceneSpec;
    expect(spec.plots[0].floors).toBe(100);
    expect(floorsRow(villagePlotInfo(env, spec, 0).rows)).toBe('150');
  });
});

describe('a field that arrives as null where it used to be 0 gives the same scene', () => {
  const same = <T>(build: (v: number | null) => T) => expect(build(null)).toEqual(build(0));

  it.each(['roadFrontage', 'pondArea', 'pondDepth', 'accessRoadWidth'] as const)(
    'land %s',
    field => {
      same(v =>
        landSpec([land({ landShapeType: '04', roadFrontage: 20, pondArea: 100, [field]: v })]),
      );
    },
  );

  it('still draws a pond with an area and no depth, and none with a depth and no area', () => {
    const areaOnly = landSpec([land({ pondArea: 220, pondDepth: null })]).pond;
    expect(areaOnly).toMatchObject({ area: 220, depth: null });
    expect(areaOnly?.note).toContain('values.pondNoteAreaOnly');
    expect(landSpec([land({ pondArea: null, pondDepth: 2 })]).pond).toBeNull();
  });

  it.each(['usableArea', 'accessRoadWidth'] as const)('condo %s', field => {
    same(v => condoSpec([condoUnit({ [field]: v })]));
  });

  it('a condo floor that arrives as null (blank, dashes or 0 on the BE) is a floor not recorded, as "-" is', () => {
    const unit = condoSpec([condoUnit({ condoFloorNumber: null })]).units[0];
    expect(unit.floor).toBeNull();
    expect(unit.callout.sub).toContain('callouts.floorNotRecorded');
    expect(unit.callout.tone).toBeUndefined();
  });

  it('a condo unit with no usable area says so with a dash, as a 0 did', () => {
    const rows = condoSpec([condoUnit({ usableArea: null })]).units[0].info.rows;
    expect(rows.find(r => r.label === 'rows.usableArea')?.value).toBe('—');
  });

  it.each(['landArea', 'usableArea'] as const)('village plot %s', field => {
    same(v => {
      const project = {
        ...baseProject(),
        unitCount: 2,
        houseModels: [{ id: 'm', modelName: 'A', buildingType: '01', units: 2, soldUnits: 0 }],
        plots: [
          {
            plotNumber: '1',
            houseNumber: '1',
            modelId: 'm',
            isSold: false,
            landArea: 50,
            [field]: v,
          },
          {
            plotNumber: '2',
            houseNumber: '2',
            modelId: 'm',
            isSold: false,
            landArea: 50,
            usableArea: 90,
          },
        ],
      } as unknown as BriefProject;
      return buildSceneSpec([], project, env);
    });
  });

  it.each(['standardLandArea'] as const)('house model %s', field => {
    same(v => {
      const project = {
        ...baseProject(),
        unitCount: 1,
        houseModels: [
          { id: 'm', modelName: 'A', buildingType: '01', units: 1, soldUnits: 0, [field]: v },
        ],
        plots: [{ plotNumber: '1', houseNumber: '1', modelId: 'm', isSold: false }],
      } as unknown as BriefProject;
      // The model echoes its own source field; what is drawn is the plots, their layout and the parcel.
      const spec = buildSceneSpec([], project, env) as VillageSceneSpec;
      return { plots: spec.plots, layout: spec.layout, parcel: spec.parcel };
    });
  });

  it.each(['roadFrontage', 'accessRoadWidth'] as const)('project land %s', field => {
    same(v => {
      const project = {
        ...baseProject(),
        landAreaRai: 10,
        unitCount: 1,
        plots: [{ plotNumber: '1', houseNumber: '1', isSold: false }],
        land: { landShapeType: '05', roadFrontage: 30, accessRoadWidth: 6, [field]: v },
      } as unknown as BriefProject;
      return buildSceneSpec([], project, env);
    });
  });
});

describe('storey counts are formatted by the locale', () => {
  const loud: SceneEnv = { ...env, nf: n => `#${n}` };

  it('formats the floor of a block cell and the recorded floors of a condo tower', () => {
    expect(blockCellRows(loud, 'A', 12, true)[1].value).toBe('#12');
    const spec = buildSceneSpec([condoUnit()], null, loud) as CondoSceneSpec;
    expect(spec.towerInfo.rows.find(r => r.label === 'rows.floors')?.value).toBe('#35');
  });
});

describe('"other" text behind a coded land value', () => {
  it("shows the appraiser's words for shape and landfill 99, and the label otherwise", () => {
    const spec = landSpec([
      land({
        landShapeType: '99',
        landShapeTypeOther: 'รูปตัว L',
        landFillType: '99',
        landFillTypeOther: 'ดินลูกรัง',
      }),
    ]);
    const rows = spec.parcel.info.rows;
    expect(rows.find(r => r.label === 'rows.shape')?.value).toBe('รูปตัว L');
    expect(rows.find(r => r.label === 'rows.landfill')?.value).toBe('ดินลูกรัง');
    expect(spec.parcel.callout?.sub).toContain('รูปตัว L');
    // Code 99 with no words, and any other code, read as their labels.
    const plain = landSpec([land({ landShapeType: '99', landFillType: '01' })]).parcel.info.rows;
    expect(plain.find(r => r.label === 'rows.shape')?.value).toBe('LandShape:99');
    expect(plain.find(r => r.label === 'rows.landfill')?.value).toBe('Landfill:01');
  });
});

describe('a condo floor is printed as read', () => {
  it('prints the parsed floor of "5 -" and the recorded height, never the capped one', () => {
    const unit = condoSpec([condoUnit({ condoFloorNumber: '5 -', condoFloors: 900 })]).units[0];
    expect(unit.info.rows[0].value).toBe('values.floorOf{"floor":"5","floors":"900"}');
    expect(unit.callout.title).toContain('"floor":"5"');
    expect(unit.callout.title).not.toContain('5 -');
  });

  it('prints the raw text only when it cannot be read, with its warning', () => {
    const unit = condoSpec([condoUnit({ condoFloorNumber: '5 - 6' })]).units[0];
    expect(unit.info.rows[0].value).toContain('5 - 6');
    expect(unit.callout.sub).toContain('callouts.floorUnreadable{"floor":"5 - 6"}');
  });
});

describe('a condo floor written as stored', () => {
  it('reads a trailing dash as the floor, and a range as no floor at all', () => {
    expect(condoSpec([condoUnit({ condoFloorNumber: '5 -' })]).units[0].floor).toBe(5);
    const range = condoSpec([condoUnit({ condoFloorNumber: '5 - 6' })]).units[0];
    expect(range.floor).toBeNull();
    expect(range.callout.tone).toBe('danger');
  });
});

describe('the deck follows the facilities that need one', () => {
  it('has a deck for a pool, a gym, a garden or a club, and none for a stadium or parking', () => {
    const deck = (codes: string[]) => condoSpec([condoUnit({ facilityType: codes })]).deckUse;
    for (const code of ['06', '07', '08', '10']) expect(deck([code])).toBe(true);
    for (const code of ['09', '03']) expect(deck([code])).toBe(false);
  });
});

describe('a village is resolved once per build', () => {
  it('gives the counts and the spec the same models', () => {
    const project = {
      ...baseProject(),
      unitCount: 2,
      houseModels: [{ id: 'm', modelName: 'A', units: 2, soldUnits: 1 }],
      plots: [{ modelId: 'm' }, { modelId: 'm' }],
    } as unknown as BriefProject;
    const first = buildSceneSpec([], project, env) as VillageSceneSpec;
    const again = buildSceneSpec([], project, env) as VillageSceneSpec;
    expect(again.models).toBe(first.models);
    expect(villageCounts(project, env).models).toBe(first.models.length);
  });
});

describe('the numbers of warning texts go through the formatter', () => {
  it("groups the counts of a block project's unassigned units and tower warnings", () => {
    const real: SceneEnv = {
      ...env,
      nf: (n, digits = 0) => n.toLocaleString('en-US', { maximumFractionDigits: digits }),
    };
    const spec = buildSceneSpec(
      [],
      {
        ...baseProject(),
        projectType: 'U',
        unassignedUnits: 1234,
        towers: [{ towerName: 'A', numberOfFloors: 5, numberOfUnits: 4, floors: [] }] as never,
      },
      real,
    ) as BlockSceneSpec;
    expect(spec.callout.sub).toContain('callouts.unassignedUnits{"n":"1,234"}');
  });
});

describe('recorded figures are not rounded', () => {
  const real: SceneEnv = {
    ...env,
    nf: (n, digits = 0) => n.toLocaleString('en-US', { maximumFractionDigits: digits }),
  };

  it('prints a road width and an electricity distance to two decimals, on every surface', () => {
    const parcel = buildSceneSpec(
      [
        land({
          accessRoadWidth: 8.25,
          farFromElectricity: true,
          electricityDistance: 12.5,
          boundaries: [
            { direction: 'north', adjacentArea: 'ถนนซอย 5', distance: 1, isAccess: true },
          ] as never,
        }),
      ],
      null,
      real,
    ) as LandSceneSpec;
    const text = JSON.stringify([parcel.parcel.info, parcel.neighbours.map(n => n.info)]);
    expect(text).toContain('8.25');
    expect(text).toContain('12.5');
    const condo = buildSceneSpec(
      [condoUnit({ accessRoadWidth: 8.25 })],
      null,
      real,
    ) as CondoSceneSpec;
    expect(condo.roadInfo.rows[0].value).toBe('8.25 units.m');
  });
});

describe("the rows of a pin's card each carry their own field label", () => {
  const labels = (c: { rows?: { label: string }[] }) => (c.rows ?? []).map(r => r.label);

  it('a building states its floors, area, roof and status, not a row of "item"', () => {
    const spec = landSpec([
      land(),
      house({
        numberOfFloors: 2,
        totalBuildingArea: 80,
        roofType: ['06'],
        isUnderConstruction: true,
      }),
    ]);
    const rows = labels(spec.buildings[0].callout);
    expect(rows).toEqual(['rows.floors', 'rows.buildingArea', 'rows.roof', 'rows.status']);
    expect(new Set(rows).size).toBe(rows.length);
    expect(rows).not.toContain('rows.item');
  });

  it('a parcel states its area, shape, frontage and use', () => {
    const spec = landSpec([
      land({ landShapeType: '04', roadFrontage: 20, landUseType: ['01'] }),
      house(),
    ]);
    expect(labels(spec.parcel.callout!)).toEqual([
      'rows.deedArea',
      'rows.shape',
      'rows.roadFrontage',
      'rows.landUse',
    ]);
  });

  it('a note is a note, and a list piece stays an item', () => {
    const many = landSpec([land(), ...[1, 2, 3, 4, 5, 6].map(f => house({ numberOfFloors: f }))]);
    expect(many.parcel.callout!.rows!.at(-1)).toMatchObject({ label: 'rows.note' });
    const imp = landSpec([
      house({
        improvements: [
          { description: 'รั้ว', area: 10 },
          { description: 'ลานจอด', area: 20 },
        ] as never,
      }),
    ]);
    expect(labels(imp.improvementsCallout!)).toEqual(['rows.item', 'rows.item']);
  });

  it('a condo unit states its area and view, and the tower its floors and status', () => {
    const spec = condoSpec([
      condoUnit({ usableArea: 33, locationViewType: ['06'], condoFloors: 20 }),
    ]);
    expect(labels(spec.units[0].callout)).toEqual(['rows.usableArea', 'rows.locationView']);
    expect(labels(spec.towerCallout)).toEqual(['rows.floors']);
  });
});

describe("the mock's look when little is recorded", () => {
  const sparse = () =>
    landSpec([
      asset({
        propertyType: 'LB',
        areaRai: 1,
        areaNgan: 0,
        areaSquareWa: 33,
        totalBuildingArea: 40,
      }),
    ]);

  it('draws a building of no recorded type as a detached house, and states none of that', () => {
    const b = sparse().buildings[0];
    expect(b).toMatchObject({ type: null, look: '01', roofStyle: 'hip', roofColor: 'roofTile' });
    // 40 m2 in all is one small storey, not the usual two.
    expect(b.floors).toBe(1);
    expect(b.area).toBe(40);
    const labels = b.info.rows.map(r => r.label);
    expect(labels).not.toContain('rows.floors');
    expect(labels).toContain('rows.buildingArea');
    expect(b.callout.sub).not.toContain('values.floorsCount');
    // A type with no form of its own (a code the drawing does not know) is a house too.
    expect(landSpec([land(), house({ buildingType: '77' })]).buildings[0].look).toBe('01');
    expect(landSpec([land(), house({ buildingType: '10' })]).buildings[0].look).toBe('10');
  });

  it('assumes the usual floors and footprint of its kind when neither is recorded', () => {
    const b = landSpec([land(), asset({ propertyType: 'B', buildingType: '05' })]).buildings[0];
    expect(b.floors).toBe(TYPE_FORM['05'].floors);
    expect(b.area).toBe(TYPE_FORM['05'].footprint * TYPE_FORM['05'].floors);
  });

  it('dresses a site with no boundaries, road or land use, and says nothing of the dressing', () => {
    const spec = sparse();
    expect(spec.useAssumed).toBe(true);
    expect(spec.use).toMatchObject({ residential: true, industrial: false });
    // The parcel card still states no land use.
    expect(spec.parcel.info.rows.find(r => r.label === 'rows.landUse')?.value).toBe('—');
    // A road at the front and a plot on each other side, none with a card or a pin.
    expect(spec.neighbours).toHaveLength(4);
    expect(spec.neighbours.every(n => n.assumed && n.info === null && n.callout === null)).toBe(
      true,
    );
    expect(spec.neighbours.filter(n => n.kind === 'road').map(n => n.dir)).toEqual(['south']);
    // A recorded land use is what it says, and no neighbour is assumed where one is recorded.
    const recorded = landSpec([
      land({
        landUseType: ['04'],
        boundaries: [{ direction: 'north', adjacentArea: 'ถนน', distance: 0 }] as never,
      }),
    ]);
    expect(recorded.useAssumed).toBe(false);
    expect(recorded.use.industrial).toBe(true);
    expect(recorded.neighbours.filter(n => !n.assumed).map(n => n.dir)).toEqual(['north']);
    expect(recorded.neighbours.filter(n => n.assumed && n.kind === 'road')).toEqual([]);
  });

  it('never names a building or a pin with a blank', () => {
    // The parameter lookup answers an unknown code with the code itself, a blank one included.
    const real: SceneEnv = { ...env, label: (_group, code) => code ?? '—' };
    const spec = (type: string | null) =>
      buildSceneSpec(
        [land(), house({ buildingType: type, buildingTypeOther: ' ' })],
        null,
        real,
      ) as LandSceneSpec;
    for (const type of [null, '', ' ', '-', '77']) {
      const b = spec(type).buildings[0];
      expect(b.name.trim()).not.toBe('');
      expect(b.callout.title.trim()).not.toBe('');
    }
    expect(spec(' ').buildings[0].name).toBe('titles.building');
  });
});
