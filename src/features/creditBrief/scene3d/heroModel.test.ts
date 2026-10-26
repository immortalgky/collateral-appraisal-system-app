import { describe, expect, it } from 'vitest';
import type { BriefAsset, BriefProject } from '../api/appraisalBrief';
import { buildHero } from './heroModel';
import { placeParts } from './places';
import { buildSceneSpec, type LandSceneSpec, type SceneEnv } from './model';

// The model returns keys + params; a fake `t` that prints both lets the tests read what was asked for.
const env: SceneEnv = {
  t: (key, opts) => (opts ? `${key}${JSON.stringify(opts)}` : key),
  label: (group, code) => (code ? `${group}:${code}` : '—'),
  nf: n => String(n),
};

const asset = (o: Partial<BriefAsset>) => ({ landUseType: [], ...o }) as BriefAsset;
const hero = (assets: BriefAsset[], project: BriefProject | null = null) =>
  buildHero(assets, project, env);
const tileOf = (h: ReturnType<typeof hero>, icon: string) => h.tiles.find(t => t.icon === icon);

const house = asset({
  propertyType: 'LB',
  buildingType: '01',
  numberOfFloors: 3,
  totalBuildingArea: 33,
  buildingAge: 1,
  buildingCondition: 'ใหม่',
  areaRai: 8,
  areaNgan: 3,
  areaSquareWa: 9,
  landUseType: ['01'],
  dopaSubDistrictName: 'หนองบอน',
  dopaDistrictName: 'ประเวศ',
  dopaProvinceName: 'กรุงเทพมหานคร',
  // the deed address differs from where the property is: the hero names the latter
  deedDistrictName: 'พระโขนง',
});

describe('buildHero: land and building', () => {
  it('titles the hero with the building type and the place, and counts the area', () => {
    const h = hero([house]);
    expect(h.title).toBe('BuildingType:01');
    expect(h.subtitle).toBe(
      'หนองบอน · ประเวศ · กรุงเทพมหานคร · hero.totalArea{"area":"8-3-9 hero.rai"}',
    );
  });

  it('takes the land area from the titles when the property records none of its own', () => {
    const noOwn = asset({
      propertyType: 'L',
      landTitles: [{ areaRai: 2, areaNgan: 1, areaSquareWa: 5 }] as BriefAsset['landTitles'],
    });
    expect(hero([noOwn]).subtitle).toContain('2-1-5');
  });

  it('takes frontage and shape from the one parcel the drawing shows', () => {
    const a = asset({
      propertyType: 'L',
      areaRai: 1,
      boundaries: [{ direction: 'north', adjacentArea: 'ถนน', distance: 1 }] as never,
    });
    const b = asset({ propertyType: 'L', areaRai: 1, roadFrontage: 30, landShapeType: '05' });
    // The drawing takes the first land that has any descriptive field: A, which has neither.
    expect(tileOf(hero([a, b]), 'width')).toBeUndefined();
    expect(tileOf(hero([a, b]), 'shape')).toBeUndefined();
    expect(tileOf(hero([b, a]), 'width')?.value).toContain('30');
  });

  it('counts the machines on a parcel with no building, as it does with one', () => {
    const land = asset({ propertyType: 'L', areaRai: 1, landUseType: ['01'] });
    const mac = asset({ propertyType: 'MAC' });
    const h = hero([land, mac, mac]);
    expect(h.tiles.map(t => t.icon)).toEqual(['area', 'machine']);
    expect(tileOf(h, 'machine')?.value).toBe('values.itemsCount{"count":2,"n":"2"}');
  });

  it('ignores a blank or dash display name, as the list item does', () => {
    expect(hero([{ ...house, buildingDisplayName: '' }]).title).toBe('BuildingType:01');
    expect(hero([{ ...house, buildingDisplayName: ' - ' }]).title).toBe('BuildingType:01');
  });

  it('names the building as its list item does: the display name first', () => {
    expect(hero([{ ...house, buildingDisplayName: 'บ้านเดี่ยว' }]).title).toBe('บ้านเดี่ยว');
  });

  it("shows the appraiser's words for a land shape of 99", () => {
    const land = asset({
      propertyType: 'L',
      areaRai: 1,
      landShapeType: '99',
      landShapeTypeOther: 'รูปตัว L',
    });
    expect(tileOf(hero([land]), 'shape')?.value).toBe('รูปตัว L');
  });

  it('shows floors, usable area, age, condition, land area and land use, in that order', () => {
    expect(hero([house]).tiles.map(t => t.icon)).toEqual([
      'floors',
      'usable',
      'age',
      'cond',
      'area',
      'use',
    ]);
  });

  it('drops a tile with no value', () => {
    const h = hero([{ ...house, buildingAge: null, buildingCondition: null, landUseType: [] }]);
    expect(h.tiles.map(t => t.icon)).toEqual(['floors', 'usable', 'area']);
  });

  it('swaps the last tile for the machinery count on a factory', () => {
    const h = hero([house, asset({ propertyType: 'MAC' })]);
    expect(h.tiles.at(-1)).toMatchObject({ icon: 'machine' });
    expect(tileOf(h, 'use')).toBeUndefined();
  });

  it('puts the land area in the figure, never a price, and names the government rate', () => {
    const h = hero([
      {
        ...house,
        landTitles: [
          {
            titleNumberPrefix: 'โฉนดที่ดินเลขที่',
            titleNumber: '1',
            areaRai: 8,
            areaNgan: 3,
            areaSquareWa: 9,
            governmentPricePerSqWa: 25000,
          },
        ] as BriefAsset['landTitles'],
      },
    ]);
    expect(h.figure).toMatchObject({ value: '8-3-9', label: 'hero.figure.deedArea' });
    expect(h.figure?.caption).toContain('ตารางวาละ 25,000.00 บาท');
    expect(JSON.stringify(h)).not.toMatch(/appraisalValue|forcedSale|insurance/i);
  });

  it('adds the free text behind land use 99, and ignores a raw dash', () => {
    const use = (other: string) =>
      tileOf(hero([{ ...house, landUseType: ['99'], landUseTypeOther: other }]), 'use')?.value;
    expect(use('ตลาดนัด')).toBe('LandUse:99, ตลาดนัด');
    expect(use('-')).toBe('LandUse:99');
  });

  it('keeps the recorded storeys and warns when the scene cannot draw that many', () => {
    const tile = tileOf(hero([{ ...house, numberOfFloors: 120 }]), 'floors');
    expect(tile?.value).toBe('values.floorsCount{"floors":"120"}');
    expect(tile?.note).toContain('values.floorsClamped');
    expect(tileOf(hero([house]), 'floors')?.note).toBeUndefined();
  });

  it('never takes the title or tiles from a type-99 building the scene draws as a fence', () => {
    const fence = {
      ...house,
      buildingType: '99',
      buildingTypeOther: 'รั้วคอนกรีต',
      numberOfFloors: 9,
    };
    const h = hero([fence, { ...house, numberOfFloors: 2 }]);
    expect(h.title).toBe('BuildingType:01');
    expect(tileOf(h, 'floors')?.value).toBe('values.floorsCount{"floors":"2"}');
  });

  it('has no caption when the parcel records no government rate', () => {
    expect(hero([house]).figure?.caption).toBeNull();
  });

  it('describes a vacant parcel by its area, frontage, shape and use', () => {
    const h = hero([
      asset({
        propertyType: 'L',
        areaRai: 1,
        areaNgan: 0,
        areaSquareWa: 0,
        roadFrontage: 20,
        landShapeType: '04',
        landUseType: ['02'],
      }),
    ]);
    expect(h.tiles.map(t => t.icon)).toEqual(['area', 'width', 'shape', 'use']);
    expect(h.title).toBe('PropertyType:L');
  });
});

describe('buildHero: condo', () => {
  const unit = asset({
    propertyType: 'U',
    title: '3/48',
    roomNumber: '3/48',
    condoFloorNumber: '12',
    condoFloors: 35,
    usableArea: 33,
    locationViewType: ['06'],
    governmentPricePerSqm: 100000,
    dopaDistrictName: 'ประเวศ',
    dopaProvinceName: 'กรุงเทพมหานคร',
  });

  it('lists room and floor, unit area, building height and view, with the unit area as the figure', () => {
    const h = hero([unit]);
    expect(h.tiles.map(t => t.icon)).toEqual(['room', 'usable', 'height', 'view']);
    expect(tileOf(h, 'room')?.value).toBe('3/48 · hero.values.floor{"floor":12}');
    expect(h.figure).toMatchObject({ value: '33', unit: 'units.sqm' });
    expect(h.figure?.caption).toContain('ตารางเมตรละ 100,000.00 บาท');
  });

  it('states the tallest recorded building over the units for the height tile', () => {
    const h = hero([unit, { ...unit, condoFloors: 42 }, { ...unit, condoFloors: null }]);
    expect(tileOf(h, 'height')?.value).toBe('values.floorsCount{"floors":"42"}');
  });

  it('reads the height from the highest usable unit floor when no building height is recorded', () => {
    const h = hero([
      { ...unit, condoFloors: null, condoFloorNumber: '12' },
      { ...unit, condoFloors: null, condoFloorNumber: '18' },
      { ...unit, condoFloors: null, condoFloorNumber: '9999' },
    ]);
    expect(tileOf(h, 'height')?.value).toBe('values.floorsCount{"floors":"18"}');
    expect(
      tileOf(hero([{ ...unit, condoFloors: null, condoFloorNumber: '-' }]), 'height'),
    ).toBeUndefined();
  });

  it('says how many rooms there are, not the first unit, when there are several', () => {
    const h = hero([unit, { ...unit, roomNumber: '9/9' }]);
    expect(tileOf(h, 'room')).toMatchObject({
      label: 'hero.tiles.rooms',
      value: 'hero.values.rooms{"count":2,"n":"2"}',
    });
  });

  it('has no figure when the unit records no area', () => {
    expect(hero([{ ...unit, usableArea: null }]).figure).toBeNull();
  });
});

describe('buildHero: projects', () => {
  const project = (o: Partial<BriefProject>) =>
    ({
      projectName: 'IDEO',
      projectType: 'LB',
      towers: [],
      plots: [],
      houseModels: [],
      unitCount: 0,
      towerCount: 0,
      maxFloor: null,
      unassignedUnits: 0,
      unassignedSoldUnits: 0,
      ...o,
    }) as unknown as BriefProject;

  it('counts plots, sold plots and models for a village, with sold and progress bars', () => {
    const p = project({
      unitCount: 4,
      isUnderConstruction: true,
      constructionProgressPercent: 40,
      houseModels: [{ id: 'm', units: 4, soldUnits: 1 } as never],
      plots: [
        { modelId: 'm', isSold: true },
        { modelId: 'm' },
        { modelId: 'm' },
        { modelId: 'm' },
      ] as never,
    });
    const h = hero([], p);
    expect(h.title).toBe('IDEO');
    expect(h.tiles.map(t => t.icon)).toEqual(['plots', 'sold', 'models', 'progress']);
    expect(h.figure).toMatchObject({ value: '4', unit: 'hero.plot' });
    expect(h.bars.map(b => b.percent)).toEqual([25, 40]);
  });

  it('prints a construction progress to two decimals, as the report does, in the tile and the bar', () => {
    const real: SceneEnv = {
      ...env,
      nf: (n, digits = 0) => n.toLocaleString('en-US', { maximumFractionDigits: digits }),
    };
    const p = project({
      unitCount: 1,
      isUnderConstruction: true,
      constructionProgressPercent: 47.07,
      plots: [{}] as never,
    });
    const h = buildHero([], p, real);
    expect(tileOf(h, 'progress')?.value).toBe('47.07%');
    expect(h.bars.at(-1)?.percent).toBe(47.07);
  });

  it('reads a tower with no recorded height from its highest unit floor, as the scene does', () => {
    const p = project({
      unitCount: 30,
      towerCount: 1,
      towers: [
        {
          towerName: 'A',
          numberOfFloors: null,
          numberOfUnits: 30,
          floors: [
            { floor: 4, units: 10, soldUnits: 0 },
            { floor: 17, units: 20, soldUnits: 0 },
            { floor: 9999, units: 1, soldUnits: 0 },
          ],
        },
      ] as never,
    });
    expect(tileOf(hero([], p), 'height')?.value).toBe('values.floorsCount{"floors":"17"}');
  });

  it('words the storey warning of the tile as the scene words it, with formatted numbers', () => {
    const real: SceneEnv = {
      ...env,
      nf: (n, digits = 0) => n.toLocaleString('en-US', { maximumFractionDigits: digits }),
    };
    const b = { ...house, numberOfFloors: 1205 };
    const note = buildHero([b], null, real).tiles.find(t => t.icon === 'floors')?.note;
    expect(note).toBe('values.floorsClamped{"floors":"1,205","cap":"100"}');
    const spec = buildSceneSpec([b], null, real) as LandSceneSpec;
    expect(spec.buildings[0].callout.sub).toContain(note);
  });

  it('keeps two decimals of a small share, so 1 sold of 500 is not 0%', () => {
    const p = project({
      unitCount: 500,
      houseModels: [{ id: 'm', units: 500, soldUnits: 1 } as never],
      plots: Array.from({ length: 500 }, () => ({ modelId: 'm' })) as never,
    });
    expect(hero([], p).bars.map(b => b.percent)).toEqual([0.2]);
  });

  it('never reports more sold than there are plots, so the bar stays within 0-100', () => {
    const p = project({
      unitCount: 2,
      houseModels: [{ id: 'm', units: 2, soldUnits: 5 } as never],
      plots: [{ modelId: 'm' }, { modelId: 'm' }] as never,
    });
    const h = hero([], p);
    expect(h.bars.map(b => b.percent)).toEqual([100]);
    expect(tileOf(h, 'sold')?.value).toBe('hero.values.plots{"count":2,"n":"2"}');
  });

  it('takes the unit count when the units for sale is 0', () => {
    const p = project({ unitForSaleCount: 0, unitCount: 7, landAreaRai: 1 });
    expect(tileOf(hero([], p), 'units')?.value).toBe('7');
  });

  it('shows no progress for a finished village, only the sold share', () => {
    const p = project({ unitCount: 1, plots: [{}] as never, isUnderConstruction: false });
    expect(hero([], p).tiles.map(t => t.icon)).not.toContain('progress');
    expect(hero([], p).bars.map(b => b.percent)).toEqual([0]);
  });

  it('counts towers, rooms, sold rooms and the tallest tower for a condo project', () => {
    const p = project({
      towerCount: 2,
      towers: [
        {
          towerName: 'A',
          numberOfFloors: 30,
          numberOfUnits: 2,
          floors: [{ floor: 1, units: 2, soldUnits: 1 }],
        },
        {
          towerName: 'B',
          numberOfFloors: 12,
          numberOfUnits: 2,
          floors: [{ floor: 1, units: 2, soldUnits: 0 }],
        },
      ] as never,
    });
    const h = hero([], p);
    expect(h.tiles.map(t => t.icon)).toEqual(['building', 'units', 'sold', 'height']);
    expect(tileOf(h, 'height')?.value).toBe('values.floorsCount{"floors":"30"}');
    expect(h.figure).toMatchObject({ value: '4', unit: 'hero.room' });
    expect(h.bars).toEqual([expect.objectContaining({ percent: 25 })]);
  });
});

describe('buildHero: mixed and non-drawable applications', () => {
  it('still gives the land figure and the counts of each kind', () => {
    const h = hero([
      house,
      asset({ propertyType: 'U', title: '1' }),
      asset({ propertyType: 'MAC' }),
    ]);
    expect(h.title).toBe('hero.mixedTitle');
    expect(h.figure).toMatchObject({ value: '8-3-9' });
    expect(h.tiles.map(t => t.icon)).toEqual(['area', 'building', 'room', 'machine']);
  });

  it('has nothing to show for vehicles alone', () => {
    const h = hero([asset({ propertyType: 'VEH' })]);
    expect(h.tiles).toEqual([]);
    expect(h.figure).toBeNull();
  });
});

describe('placeParts', () => {
  const p = (s: string, d: string, v: string) => ({ subDistrict: s, district: d, province: v });
  it('names one place in full, and what several places share', () => {
    expect(placeParts([p('ก', 'ข', 'ค')])).toEqual(['ก', 'ข', 'ค']);
    expect(placeParts([p('ก', 'ข', 'ค'), p('ง', 'ข', 'ค')])).toEqual(['ข', 'ค']);
    expect(placeParts([p('ก', 'ข', 'ค'), p('ง', 'จ', 'ค')])).toEqual(['ค']);
  });
  it('keeps two provinces and counts the rest', () => {
    expect(placeParts([p('', '', 'A'), p('', '', 'B'), p('', '', 'C')])).toEqual(['A, B +1']);
  });
  it('says nothing when no place is known', () => {
    expect(placeParts([null])).toEqual([]);
  });

  it('says only how many machines there are for machines alone, never a land figure or a price', () => {
    const h = hero([asset({ propertyType: 'MAC' }), asset({ propertyType: 'MAC' })]);
    expect(h.title).toBe('titles.machinery');
    expect(h.tiles.map(t => t.icon)).toEqual(['machine']);
    expect(h.figure).toMatchObject({ value: '2', unit: 'hero.machine', caption: null });
    expect(JSON.stringify(h)).not.toMatch(/ราคา|price|deedArea/i);
  });

  it('titles a land-and-building hero by what the property is when the building has no name', () => {
    const blank = asset({
      propertyType: 'LB',
      areaRai: 1,
      totalBuildingArea: 40,
      buildingType: ' ',
      buildingDisplayName: ' ',
    });
    // The parameter lookup answers an unknown code with the code itself, a blank one included.
    const real: SceneEnv = {
      ...env,
      label: (group, code) => (code?.trim() ? `${group}:${code}` : (code ?? '—')),
    };
    expect(buildHero([blank], null, real).title).toBe('PropertyType:LB');
  });
});
