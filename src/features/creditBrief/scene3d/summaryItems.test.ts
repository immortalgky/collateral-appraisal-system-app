import { describe, expect, it } from 'vitest';
import type { BriefAsset, BriefMachine, BriefProject } from '../api/appraisalBrief';
import { buildSceneSpec, type LandSceneSpec, type SceneEnv } from './model';
import { buildHero } from './heroModel';
import { buildItems } from './summaryItems';

const env: SceneEnv = {
  t: (key, opts) => (opts ? `${key}${JSON.stringify(opts)}` : key),
  label: (group, code) => (code ? `${group}:${code}` : '—'),
  nf: n => String(n),
};

const asset = (o: Partial<BriefAsset>) => ({ landUseType: [], ...o }) as BriefAsset;
const title = {
  titleTypeLabel: 'โฉนดที่ดิน',
  titleNumberPrefix: 'โฉนดที่ดินเลขที่',
  titleNumber: '1234',
  bookNumber: '5',
  pageNumber: '6',
  areaRai: 1,
  areaNgan: 2,
  areaSquareWa: 30,
};
const lb = asset({
  propertyType: 'LB',
  landTitles: [title] as BriefAsset['landTitles'],
  deedDistrictName: 'พระโขนง',
  deedProvinceName: 'กรุงเทพมหานคร',
  deedSubDistrictName: 'หนองบอน',
  buildingDisplayName: 'บ้านเดี่ยว',
  numberOfFloors: 3,
  totalBuildingArea: 33,
  buildingAge: 1,
  buildingCondition: 'ใหม่',
  improvements: [{ description: 'รั้ว', area: 144 }],
});

describe('buildItems', () => {
  it('lists the land, the building and its development items, with the report sentences', () => {
    const [land, building] = buildItems([lb], null, [], env);
    expect(land).toMatchObject({
      id: 'land',
      key: 'PropertyType:LB · โฉนดที่ดิน 1234 · พระโขนง กรุงเทพมหานคร',
      // 1 rai 2 ngan 30 wa = 630 sq.wa
      figure: { value: '630', unit: 'units.sqwa' },
    });
    expect(land.lines).toEqual([
      'โฉนดที่ดินเลขที่ 1234 เล่ม 5 หน้า 6 เนื้อที่ 1-2-30 ไร่ ตำบล/แขวง หนองบอน อำเภอ/เขต พระโขนง จังหวัดกรุงเทพมหานคร',
    ]);
    expect(building.lines).toEqual([
      'บ้านเดี่ยว 3 ชั้น พื้นที่ใช้สอย 33 ตารางเมตร อายุอาคาร 1 ปี สภาพอาคารใหม่',
    ]);
    expect(building.dev).toEqual(['รั้ว พื้นที่ 144 ตารางเมตร']);
  });

  it('gives the land figure the same rounding as the hero area', () => {
    // Two decimals, as the report prints them: 99.97 sq.wa stays 99.97, and 99.997 carries to 1 ngan.
    const area = (areaSquareWa: number) =>
      buildItems(
        [asset({ propertyType: 'L', areaRai: 0, areaNgan: 0, areaSquareWa })],
        null,
        [],
        env,
      )[0];
    expect(area(99.97).figure).toEqual({ value: '99.97', unit: 'units.sqwa' });
    expect(area(99.997).figure).toEqual({ value: '100', unit: 'units.sqwa' });
  });

  it('numbers the buildings when there are several', () => {
    const items = buildItems([lb, { ...lb, buildingDisplayName: 'ทาวน์เฮ้าส์' }], null, [], env);
    expect(items.find(i => i.id === 'building')?.lines).toEqual([
      '1. บ้านเดี่ยว 3 ชั้น พื้นที่ใช้สอย 33 ตารางเมตร อายุอาคาร 1 ปี สภาพอาคารใหม่',
      '2. ทาวน์เฮ้าส์ 3 ชั้น พื้นที่ใช้สอย 33 ตารางเมตร อายุอาคาร 1 ปี สภาพอาคารใหม่',
    ]);
  });

  it('names an enhancement-only property by its building, not by the row text', () => {
    const only = asset({
      propertyType: 'B',
      isDevelopmentOnly: true,
      buildingDisplayName: 'รั้ว',
      improvements: [{ description: 'กำแพง', area: 10 }],
    });
    const [building] = buildItems([only], null, [], env);
    expect(building.lines).toEqual([]);
    expect(building.dev).toEqual(['รั้ว พื้นที่ 10 ตารางเมตร']);
  });

  it('writes the condo clause from the raw unit fields', () => {
    const unit = asset({
      propertyType: 'U',
      roomNumber: '3/48',
      condoFloorNumber: '12',
      condoName: 'IDEO',
      usableArea: 33,
      condoFloors: 35,
    });
    const [condo] = buildItems([unit], null, [], env);
    expect(condo.lines[0]).toBe(
      'ห้องชุดเลขที่ 3/48 ชั้นที่ 12 ชื่ออาคารชุด IDEO พื้นที่ห้องชุด 33 ตารางเมตร อาคารสูง 35 ชั้น',
    );
  });

  it('sections the machines the way the report does', () => {
    const m = (o: Partial<BriefMachine>) =>
      ({
        machineName: 'Press',
        registrationStatus: false,
        isPriceCertified: true,
        ...o,
      }) as BriefMachine;
    const machines = [
      m({ section: 'registered', registrationNumber: 'ทร.1' }),
      m({ section: 'notRegistered' }),
      m({ section: 'notInstalled', isPriceCertified: false }),
    ];
    const [item] = buildItems(
      [
        asset({ propertyType: 'MAC' }),
        asset({ propertyType: 'MAC' }),
        asset({ propertyType: 'MAC' }),
      ],
      null,
      machines,
      env,
    );
    expect(item.kind).toBe('machine');
    expect(item.machines.map(s => s.head)).toEqual([
      'hero.machineHead.registered{"n":"1"}',
      'hero.machineHead.notRegistered{"n":"1"}',
      'hero.machineHead.notInstalled{"n":"1"}',
    ]);
    expect(item.machines[2].lines).toEqual(['Press (ไม่รับรองราคา)']);
  });

  it('prints one set of machine sections per property group', () => {
    const m = (g: number | null) =>
      ({ machineName: 'Press', groupNumber: g, section: 'notRegistered' }) as BriefMachine;
    const [item] = buildItems([asset({ propertyType: 'MAC' })], null, [m(1), m(1), m(2)], env);
    expect(item.machines.map(s => s.head)).toEqual([
      'hero.machineHead.notRegistered{"n":"2"}',
      'hero.machineHead.notRegistered{"n":"1"}',
    ]);
  });

  it('lists a kind it cannot describe by its count, so nothing on the application disappears', () => {
    const items = buildItems(
      [asset({ propertyType: 'VEH' }), asset({ propertyType: 'VEH' })],
      null,
      [],
      env,
    );
    expect(items).toEqual([
      expect.objectContaining({
        kind: 'other',
        title: 'PropertyType:VEH',
        key: 'values.itemsCount{"count":2,"n":"2"}',
      }),
    ]);
  });

  it('lists the buildings by count when no sentence can be built for them', () => {
    const [building] = buildItems(
      [asset({ propertyType: 'B' }), asset({ propertyType: 'B' })],
      null,
      [],
      env,
    );
    expect(building).toMatchObject({
      kind: 'building',
      key: 'PropertyType:B · hero.values.houses{"count":2,"n":"2"}',
      lines: [],
    });
  });

  it('never names a building by the property title (a deed number on a land-and-building)', () => {
    const [, building] = buildItems(
      [asset({ ...lb, buildingDisplayName: null, buildingType: null, title: '1234' })],
      null,
      [],
      env,
    );
    expect(building.lines.join(' ')).not.toContain('1234');
  });

  it('prints no room clause for a condo without a room number, whatever its title says', () => {
    const [condo] = buildItems(
      [asset({ propertyType: 'U', title: 'free text', condoFloorNumber: '3' })],
      null,
      [],
      env,
    );
    expect(condo.lines[0]).toBe('ชั้นที่ 3');
  });

  it('keeps province and land area on a kind it has no sentence for', () => {
    const [item] = buildItems(
      [
        asset({
          propertyType: 'VEH',
          dopaProvinceName: 'ชลบุรี',
          areaRai: 1,
          areaNgan: 0,
          areaSquareWa: 0,
        }),
      ],
      null,
      [],
      env,
    );
    expect(item.key).toBe('values.itemsCount{"count":1,"n":"1"} · ชลบุรี · 1-0-0 hero.rai');
  });

  it('keeps the phase count and the units (condo) or houses badge of a project', () => {
    const project = {
      projectName: 'P',
      projectType: 'U',
      towerCount: 2,
      numberOfPhase: 3,
      unitCount: 40,
      unitForSaleCount: null,
      houseModels: [],
    } as unknown as BriefProject;
    const [item] = buildItems([], project, [], env);
    expect(item.key).toBe('@activityTracking.brief.collateral.phases{"count":3,"n":"3"}');
    expect(item.figure?.value).toBe(
      '@activityTracking.brief.collateral.unitsOrHouses_unit{"count":40,"n":"40"}',
    );
    const houses = { ...project, towerCount: 0 } as BriefProject;
    expect(buildItems([], houses, [], env)[0].figure?.value).toContain('unitsOrHouses_house');
  });

  it('lists a project first and then the assets, when a brief carries both', () => {
    const project = {
      projectName: 'P',
      projectType: 'LB',
      houseModels: [],
    } as unknown as BriefProject;
    const items = buildItems([lb], project, [], env);
    expect(items.map(i => i.id)).toEqual(['project', 'land', 'building']);
  });

  it('falls back to the label when the type-99 text is only a placeholder', () => {
    const [building] = buildItems(
      [asset({ propertyType: 'B', buildingType: '99', buildingTypeOther: '-', numberOfFloors: 2 })],
      null,
      undefined,
      env,
    );
    expect(building.lines).toEqual(['BuildingType:99 2 ชั้น']);
  });

  it('says how many condo units and their total area, not the first unit, when there are several', () => {
    const unit = (room: string) => asset({ propertyType: 'U', roomNumber: room, usableArea: 30 });
    const [condo] = buildItems([unit('1'), unit('2')], null, [], env);
    expect(condo.key).toBe('PropertyType:U · hero.values.rooms{"count":2,"n":"2"} · 60 units.sqm');
  });

  it('states the real property type on each item, so a lease reads as a lease', () => {
    const lease = asset({ propertyType: 'LSB', buildingDisplayName: 'โรงงาน', numberOfFloors: 1 });
    const items = buildItems(
      [asset({ propertyType: 'LSL' }), lease, asset({ propertyType: 'LSU', roomNumber: '1' })],
      null,
      [],
      env,
    );
    expect(items.find(i => i.id === 'land')?.key).toContain('PropertyType:LSL');
    expect(items.find(i => i.id === 'building')?.key).toContain('PropertyType:LSB');
    expect(items.find(i => i.id === 'condo')?.key).toContain('PropertyType:LSU');
  });

  it('makes up no title or area for a land property that records neither', () => {
    const [land] = buildItems([asset({ propertyType: 'L' })], null, undefined, env);
    expect(land.lines).toEqual([]);
    expect(land.figure).toBeNull();
    expect(land.key).toBe('PropertyType:L');
  });

  it('counts only real titles in the +N of the land key', () => {
    const t = (n: string) => ({ titleNumber: n, areaRai: 1 });
    const two = asset({
      propertyType: 'L',
      landTitles: [t('1'), t('2')] as BriefAsset['landTitles'],
    });
    expect(buildItems([two], null, [], env)[0].key).toContain('1 +1');
    const stand = asset({ propertyType: 'L', areaRai: 1 }); // an older API: one stand-in row, not a title
    expect(buildItems([stand], null, undefined, env)[0].key).not.toContain('+');
  });

  it('describes a house model by its standard usable area, else the minimum', () => {
    const project = {
      projectName: 'P',
      projectType: 'LB',
      houseModels: [
        {
          id: 'a',
          modelName: 'A',
          buildingTypeDisplay: 'บ้านเดี่ยว',
          numberOfHouse: 2,
          standardUsableArea: null,
          usableAreaMin: 120,
        },
      ],
    } as unknown as BriefProject;
    const [item] = buildItems([], project, [], env);
    expect(item.kv.find(r => r.label === 'hero.rows.details')?.value).toContain('120');
  });

  it('still lists the land of a brief from an older API, from its area fields', () => {
    const old = asset({ propertyType: 'L', areaRai: 1, areaNgan: 0, areaSquareWa: 0 });
    const [land] = buildItems([old], null, undefined, env);
    expect(land.figure).toEqual({ value: '400', unit: 'units.sqwa' });
    expect(land.lines).toEqual(['เนื้อที่ 1-0-0 ไร่']);
  });

  it('names a building of an older brief by its type label, or the remark for code 99', () => {
    const old = (o: Partial<BriefAsset>) =>
      buildItems([asset({ propertyType: 'B', numberOfFloors: 2, ...o })], null, undefined, env)[0];
    expect(old({ buildingType: '01' }).lines).toEqual(['BuildingType:01 2 ชั้น']);
    expect(old({ buildingType: '99', buildingTypeOther: 'ศาลา' }).lines).toEqual(['ศาลา 2 ชั้น']);
  });

  it('describes a project by the report rows, without a price', () => {
    const project = {
      projectName: 'IDEO',
      projectType: 'LB',
      developer: 'Ananda',
      provinceName: 'กรุงเทพมหานคร',
      utilities: ['ไฟฟ้า'],
      facilityLabels: ['Pool'],
      houseModels: [],
    } as unknown as BriefProject;
    const [item] = buildItems([], project, [], env);
    expect(item).toMatchObject({ kind: 'project', title: 'IDEO', key: 'Ananda' });
    expect(item.kv.map(r => r.label)).toEqual([
      'hero.rows.address',
      'hero.rows.developer',
      'hero.rows.details',
      'hero.rows.saleLaunch',
      'hero.rows.utilities',
      'hero.rows.facilities',
      'hero.rows.coordinates',
    ]);
    expect(item.kv.find(r => r.label === 'hero.rows.utilities')?.value).toBe('ไฟฟ้า');
    expect(JSON.stringify(item)).not.toMatch(/ราคา/);
  });

  it('numbers the buildings after the empty ones are dropped, so there is no gap', () => {
    const b = (o: Partial<BriefAsset>) => asset({ propertyType: 'B', ...o });
    const [item] = buildItems(
      [b({ buildingDisplayName: 'บ้าน' }), b({}), b({ buildingDisplayName: 'โกดัง' })],
      null,
      undefined,
      env,
    );
    expect(item.lines).toEqual(['1. บ้าน', '2. โกดัง']);
  });

  it('names the machines from the properties when the API sent no machine rows', () => {
    const mac = (machineName: string | null) => asset({ propertyType: 'MAC', machineName });
    const assets = [mac('Press'), mac('Lathe'), mac('Press'), mac(null)];
    const [fallback] = buildItems(assets, null, undefined, env);
    expect(fallback.lines).toEqual(['Press, Lathe']);
    expect(fallback.machines).toEqual([]);
    const [withRows] = buildItems(assets, null, [{ machineName: 'Press' } as BriefMachine], env);
    expect(withRows.lines).toEqual([]);
  });

  it('treats a total land area of zero as not recorded', () => {
    const zero = asset({ propertyType: 'V', areaRai: 0, areaNgan: 0, areaSquareWa: 0 });
    const [item] = buildItems([zero], null, undefined, env);
    expect(item.key).not.toMatch(/0-0-0/);
  });

  it('names the project facilities from their codes when the API sent no labels', () => {
    const base = { projectName: 'IDEO', projectType: 'LB', houseModels: [] };
    const facilities = (p: object) =>
      buildItems([], { ...base, ...p } as unknown as BriefProject, [], env)[0].kv.find(
        r => r.label === 'hero.rows.facilities',
      )?.value;
    expect(facilities({ facilities: ['06', '10'], facilitiesOther: 'Sky bar' })).toContain(
      'Facilities:06',
    );
    expect(facilities({ facilities: ['06', '10'], facilitiesOther: 'Sky bar' })).toContain(
      'Sky bar',
    );
    // Labels from the API win.
    expect(facilities({ facilities: ['06'], facilityLabels: ['Pool'] })).toBe('Pool');
  });

  it('lists a machine in no printed section last, so the count and the list agree', () => {
    const m = (section: string, machineName: string): BriefMachine =>
      ({ groupNumber: 1, section, machineName }) as BriefMachine;
    const [item] = buildItems(
      [asset({ propertyType: 'MAC' }), asset({ propertyType: 'MAC' })],
      null,
      [m('registered', 'Press'), m('unknownSection', 'Lathe')],
      env,
    );
    expect(item.machines.map(g => g.lines)).toEqual([['Press'], ['Lathe']]);
    expect(item.machines[1].head).toBe('hero.machineHead.other{"n":"1"}');
  });

  it('ignores a blank display name on a building', () => {
    const [, building] = buildItems(
      [{ ...lb, buildingDisplayName: ' ', buildingType: '01' }],
      null,
      [],
      env,
    );
    expect(building.lines[0]).toContain('BuildingType:01');
  });

  it('states one land area in the hero, the card and the sentence: titles first, two decimals', () => {
    const parcel = asset({
      propertyType: 'L',
      areaRai: 7,
      areaNgan: 0,
      areaSquareWa: 0,
      landTitles: [
        { ...title, areaRai: 0, areaNgan: 0, areaSquareWa: 41.25 },
      ] as BriefAsset['landTitles'],
    });
    const [land] = buildItems([parcel], null, [], env);
    expect(land.figure).toEqual({ value: '41.25', unit: 'units.sqwa' });
    expect(land.lines[0]).toContain('0-0-41.25');
    const hero = buildHero([parcel], null, env);
    expect(hero.figure?.value).toBe('0-0-41.25');
  });

  it("prints floors and building area to the report's two decimals on every surface", () => {
    const real: SceneEnv = {
      ...env,
      nf: (n, digits = 0) => n.toLocaleString('en-US', { maximumFractionDigits: digits }),
    };
    const b = asset({
      propertyType: 'B',
      buildingType: '01',
      numberOfFloors: 2.25,
      totalBuildingArea: 120.5,
    });
    const spec = buildSceneSpec([b], null, real) as LandSceneSpec;
    const texts = [
      buildHero([b], null, real)
        .tiles.map(t => t.value)
        .join(' '),
      buildItems([b], null, [], real)[0].key ?? '',
      spec.buildings[0].callout.sub,
      spec.buildings[0].info.rows.map(r => r.value).join(' '),
    ];
    for (const text of texts) {
      expect(text).toContain('2.25');
      expect(text).toContain('120.5');
    }
  });

  it("names the deed place shared by every land property, not the first one's", () => {
    const at = (deedDistrictName: string) =>
      asset({
        propertyType: 'L',
        areaRai: 1,
        deedDistrictName,
        deedProvinceName: 'กรุงเทพมหานคร',
      });
    const key = (lands: BriefAsset[]) => buildItems(lands, null, [], env)[0].key;
    expect(key([at('พระโขนง'), at('พระโขนง')])).toContain('พระโขนง กรุงเทพมหานคร');
    const mixed = key([at('พระโขนง'), at('ประเวศ')]);
    expect(mixed).toContain('กรุงเทพมหานคร');
    expect(mixed).not.toContain('พระโขนง');
  });

  it("gives each land title its own line, in the report's wording", () => {
    const t = (titleNumber: string, areaSquareWa: number) => ({
      ...title,
      titleNumber,
      areaRai: 0,
      areaNgan: 0,
      areaSquareWa,
    });
    const parcel = asset({
      propertyType: 'L',
      landTitles: [t('111', 400), t('222', 500), t('333', 520)] as BriefAsset['landTitles'],
      deedDistrictName: 'พระโขนง',
      deedProvinceName: 'กรุงเทพมหานคร',
    });
    const [land] = buildItems([parcel], null, [], env);
    expect(land.lines).toHaveLength(3);
    expect(land.lines.map(l => /เลขที่ (\d+)/.exec(l)?.[1])).toEqual(['111', '222', '333']);
    expect(land.lines.every(l => l.includes('จังหวัดกรุงเทพมหานคร'))).toBe(true);
    // Two properties: all their titles, one line each.
    expect(buildItems([parcel, parcel], null, [], env)[0].lines).toHaveLength(6);
  });
});
