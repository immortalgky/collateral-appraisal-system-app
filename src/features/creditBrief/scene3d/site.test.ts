import { describe, expect, it } from 'vitest';
import {
  Box3,
  Group,
  type InstancedMesh,
  Matrix4,
  type Mesh,
  Quaternion,
  Sphere,
  Vector3,
} from 'three';
import type { BriefAsset, BriefProject } from '../api/appraisalBrief';
import { Kit, sceneSpheres } from './kit';
import {
  buildSceneSpec,
  type BlockSceneSpec,
  type CondoSceneSpec,
  type LandSceneSpec,
  type SceneEnv,
  type VillageSceneSpec,
} from './model';
import { readPalette } from './palette';
import { building, chimneyOf, footprint } from './parts';
import { buildScene, machineGrid, spreadOnFloor } from './site';

const env: SceneEnv = {
  t: (key, opts) => (opts ? `${key}${JSON.stringify(opts)}` : key),
  label: (group, code) => (code ? `${group}:${code}` : '—'),
  nf: n => String(n),
};

const asset = (o: Partial<BriefAsset>): BriefAsset =>
  ({
    propertyType: 'LB',
    areaRai: 8,
    areaNgan: 3,
    areaSquareWa: 9,
    buildingType: '01',
    numberOfFloors: 3,
    totalBuildingArea: 33,
    landUseType: [],
    boundaries: [],
    roofType: [],
    fenceType: [],
    improvements: [],
    facilityType: [],
    locationViewType: [],
    ...o,
  }) as BriefAsset;

/** Geometry needs no GL context, so a build can be inspected in the test environment. */
const build = (assets: BriefAsset[]) => {
  const spec = buildSceneSpec(assets, null, env) as LandSceneSpec;
  const kit = new Kit(readPalette(false), env);
  buildScene(kit, spec);
  return { spec, kit };
};

const pondCallout = (kit: Kit) => kit.callouts.find(c => c.title === 'titles.pond');

describe('pond placement', () => {
  it.each([
    ['04', 130],
    ['05', 130],
    ['06', 130],
    ['07', 150],
    ['08', 130],
  ])('finds room for the pond on LandShape %s', (landShapeType, roadFrontage) => {
    const { kit } = build([asset({ landShapeType, roadFrontage, pondArea: 1, pondDepth: 1 })]);
    const c = pondCallout(kit);
    expect(c).toBeDefined();
    expect(c?.sub).not.toContain('notes.pondNoRoom');
  });

  it('places a large pond on a trapezium or a triangle, shrinking only if it must', () => {
    for (const [landShapeType, roadFrontage] of [
      ['06', 60],
      ['07', 60],
    ] as const) {
      const { kit } = build([asset({ landShapeType, roadFrontage, pondArea: 600 })]);
      expect(pondCallout(kit)?.sub).not.toContain('notes.pondNoRoom');
    }
  });

  it('finds room on a narrow, deep parcel (8 m by 400 m)', () => {
    const { kit } = build([
      asset({
        landShapeType: '05',
        roadFrontage: 8,
        areaRai: 2,
        areaNgan: 0,
        areaSquareWa: 0,
        pondArea: 220,
        pondDepth: 2,
      }),
    ]);
    expect(pondCallout(kit)?.sub).not.toContain('notes.pondNoRoom');
  });

  it('says there is no room only when the pond really cannot fit', () => {
    // 4 m2 parcel, 5000 m2 pond: nothing fits however far it shrinks.
    const { kit } = build([asset({ areaRai: 0, areaNgan: 0, areaSquareWa: 1, pondArea: 100000 })]);
    expect(pondCallout(kit)?.sub).toContain('notes.pondNoRoom');
  });
});

describe('degenerate area', () => {
  it('builds finite geometry for a 0-0-0 deed on a known shape', () => {
    const { kit } = build([
      asset({ areaRai: 0, areaNgan: 0, areaSquareWa: 0, landShapeType: '05', roadFrontage: 20 }),
    ]);
    const box = new Box3().setFromObject(kit.world);
    const s = box.getBoundingSphere(new Sphere());
    expect([s.radius, s.center.x, s.center.y, s.center.z].every(Number.isFinite)).toBe(true);
    expect(s.radius).toBeGreaterThan(0);
  });
});

describe('subject', () => {
  it('marks the buildings, so a big parcel can be framed on them', () => {
    const { kit } = build([asset({ landShapeType: '05', roadFrontage: 100 })]);
    const flagged: unknown[] = [];
    kit.world.traverse(o => {
      if (o.userData.subject) flagged.push(o);
    });
    expect(flagged.length).toBeGreaterThan(0);
  });

  it('gives an unknown improvement a marker that scales with the subject', () => {
    const small = build([asset({ improvements: [{ description: 'ระบบบำบัดน้ำเสีย', area: 1 }] })]);
    const marker = (kit: Kit) => {
      let found: Mesh | null = null;
      kit.world.traverse(o => {
        if (o.userData.pick?.info.title === 'ระบบบำบัดน้ำเสีย') found = o as Mesh;
      });
      return found as Mesh | null;
    };
    const m = marker(small.kit);
    expect(m).not.toBeNull();
    m!.geometry.computeBoundingBox();
    const w = m!.geometry.boundingBox!.max.x - m!.geometry.boundingBox!.min.x;
    expect(w).toBeGreaterThanOrEqual(3);
  });
});

describe('obstacles', () => {
  it('flags each building, and not the improvements or the pond, as something a card must avoid', () => {
    const { kit, spec } = build([
      asset({ landShapeType: '05', roadFrontage: 100, pondArea: 100, pondDepth: 2 }),
      asset({ buildingType: '10', numberOfFloors: 1 }),
      asset({
        improvements: [
          { description: 'ป้อมยาม', area: 4 },
          { description: 'ถังน้ำ', area: null },
        ],
      }),
    ]);
    let obstacles = 0;
    let subjects = 0;
    kit.world.traverse(o => {
      if (o.userData.obstacle) obstacles++;
      if (o.userData.subject) subjects++;
    });
    // The buildings only: the guard house, the tank and the pond frame the picture, nothing more.
    expect(obstacles).toBe(spec.buildings.length);
    expect(subjects).toBeGreaterThan(obstacles);
  });
});

describe('machinery', () => {
  const factory = (extra: BriefAsset[] = []) =>
    build([
      asset({ buildingType: '10', numberOfFloors: 1, totalBuildingArea: 400 }),
      ...Array.from({ length: 150 }, () => asset({ propertyType: 'MAC' })),
      ...extra,
    ]);

  it('anchors the callout on the building that holds the machines, not the parcel centre', () => {
    const { kit } = build([
      asset({ buildingType: '01', numberOfFloors: 2, totalBuildingArea: 200 }),
      asset({ buildingType: '10', numberOfFloors: 1, totalBuildingArea: 2400 }),
      ...Array.from({ length: 10 }, () => asset({ propertyType: 'MAC' })),
    ]);
    const callout = kit.callouts.find(c => c.title === 'titles.machinery')!;
    let host: { x: number; z: number; w: number } | null = null;
    kit.world.traverse(o => {
      if (o.userData.obstacle && o.userData.pick === undefined) {
        const b = new Box3().setFromObject(o);
        const x = (b.min.x + b.max.x) / 2;
        // the factory is the 2,400 m2 one: the wide box
        if (!host || b.max.x - b.min.x > host.w)
          host = { x, z: (b.min.z + b.max.z) / 2, w: b.max.x - b.min.x };
      }
    });
    expect(host).not.toBeNull();
    expect(callout.pos.x).toBeCloseTo(host!.x, 3);
    expect(callout.pos.z).toBeCloseTo(host!.z, 3);
  });

  it('leaves the chimney corner free of machines', () => {
    const { kit, spec } = factory();
    let drawn: InstancedMesh | null = null;
    kit.world.traverse(o => {
      if (
        (o as InstancedMesh).isInstancedMesh &&
        o.userData.pick?.info.title === 'titles.machinery'
      )
        drawn = o as InstancedMesh;
    });
    expect(drawn).not.toBeNull();
    const im = drawn as unknown as InstancedMesh;
    // The factory is the only building: its group sits at its centre, its size is the footprint.
    const bs = spec.buildings[0];
    const { w, d } = footprint(bs.area, bs.floors, bs.ratio);
    let centre = new Vector3();
    kit.world.traverse(o => {
      if (o.userData.obstacle) centre = o.position.clone();
    });
    const ch = chimneyOf(w, d);
    const cx = centre.x;
    const cz = centre.z;
    const m = new Matrix4();
    for (let i = 0; i < im.count; i++) {
      im.getMatrixAt(i, m);
      const p = new Vector3().setFromMatrixPosition(m);
      expect(Math.hypot(p.x - cx - ch.x, p.z - cz - ch.z)).toBeGreaterThan(ch.r);
    }
  });

  it('machines alone stand in a dressed yard: apron, open shed, trees, and shaped machines', () => {
    const { kit } = build([asset({ propertyType: 'MAC' }), asset({ propertyType: 'MAC' })]);
    let machines: InstancedMesh | null = null;
    let posts = 0;
    let see = 0;
    kit.world.traverse(o => {
      if (
        (o as InstancedMesh).isInstancedMesh &&
        o.userData.pick?.info.title === 'titles.machinery'
      )
        machines = o as InstancedMesh;
      const m = o as Mesh;
      if (m.isMesh && !(m as unknown as InstancedMesh).isInstancedMesh) {
        const g = m.geometry as { parameters?: { height?: number; width?: number } };
        if (g.parameters?.height === 4.2 && g.parameters.width === 0.4) posts++;
        if ((m.material as { transparent?: boolean }).transparent) see++;
      }
    });
    expect(machines).not.toBeNull();
    // base + body + hopper + panel in one geometry, painted by vertex colour
    expect((machines as unknown as InstancedMesh).geometry.getAttribute('color')).toBeDefined();
    expect(posts).toBe(4);
    expect(see).toBeGreaterThan(0);
    // The pin and the card stay recorded-only: the shed carries no pick of its own.
    expect(kit.picks.every(o => o.userData.pick.info.title !== '')).toBe(true);
  });

  it('machineGrid skips the cells that touch the avoided circle and still fills the rest', () => {
    const avoid = { x: 17, z: -7, r: 1.2 };
    const free = machineGrid(40, 20, 1000, null);
    const grid = machineGrid(40, 20, 1000, avoid);
    expect(grid.spots.length).toBeLessThan(free.spots.length);
    for (const [x, z] of grid.spots)
      expect(Math.hypot(x - avoid.x, z - avoid.z)).toBeGreaterThan(avoid.r);
  });
});

describe('condo units on one floor', () => {
  const condoUnit = (name: string, view: string[]) =>
    asset({
      propertyType: 'U',
      condoFloors: 20,
      condoFloorNumber: '5',
      title: name,
      locationViewType: view,
    });

  it.each([
    ['end', ['06']],
    ['middle', ['11']],
  ])('puts two %s units on one floor side by side, not on top of one another', (_slot, view) => {
    const spec = buildSceneSpec(
      [condoUnit('501', view), condoUnit('502', view)],
      null,
      env,
    ) as CondoSceneSpec;
    const kit = new Kit(readPalette(false), env);
    buildScene(kit, spec);
    const at = kit.callouts.filter(c => c.title.startsWith('callouts.unitOnFloor'));
    expect(at).toHaveLength(2);
    expect(Math.abs(at[0].pos.x - at[1].pos.x)).toBeGreaterThanOrEqual(6.5);
  });

  it('keeps every cell on a floor clear of the others, across start, middle and end mixes', () => {
    const views: string[][] = [['11'], [], ['06']];
    for (let mask = 1; mask < 8; mask++) {
      const picked = views.filter((_, k) => mask & (1 << k));
      if (picked.length < 2) continue;
      const spec = buildSceneSpec(
        picked.map((v, k) => condoUnit(`50${k}`, v)),
        null,
        env,
      ) as CondoSceneSpec;
      const kit = new Kit(readPalette(false), env);
      buildScene(kit, spec);
      const xs = kit.callouts
        .filter(c => c.title.startsWith('callouts.unitOnFloor'))
        .map(c => c.pos.x)
        .sort((a, b) => a - b);
      expect(xs).toHaveLength(picked.length);
      for (let k = 1; k < xs.length; k++) expect(xs[k] - xs[k - 1]).toBeGreaterThanOrEqual(6.5);
    }
  });

  it('spreadOnFloor keeps a free preference and pushes the rest apart inside the limits', () => {
    expect(spreadOnFloor([0], -13, 13, 7.5)).toEqual([0]);
    const xs = spreadOnFloor([13, 0, -13, -13], -13, 13, 7.5);
    const sorted = [...xs].sort((a, b) => a - b);
    for (let k = 1; k < sorted.length; k++)
      expect(sorted[k] - sorted[k - 1]).toBeGreaterThanOrEqual(7.5);
    for (const x of xs) expect(x).toBeGreaterThanOrEqual(-13);
    for (const x of xs) expect(x).toBeLessThanOrEqual(13);
  });
});

describe('village', () => {
  const buildVillageScene = (n: number, models = 3, extra: Partial<BriefProject> = {}) => {
    const project = {
      projectName: 'V',
      projectType: 'LB',
      landAreaRai: null,
      landAreaNgan: null,
      landAreaSquareWa: null,
      towers: [],
      unassignedUnits: 0,
      unassignedSoldUnits: 0,
      isUnderConstruction: true,
      constructionProgressPercent: 60,
      facilities: ['06', '08', '10'],
      land: null,
      houseModels: Array.from({ length: models }, (_, i) => ({
        id: `m${i}`,
        modelName: `M${i}`,
        buildingType: null,
        buildingTypeOther: null,
        numberOfFloors: 1 + (i % 2),
        standardLandArea: 50 + i * 20,
        standardUsableArea: 120,
        roofType: [],
        fenceType: [],
        units: 0,
        soldUnits: 0,
      })),
      plots: Array.from({ length: n }, (_, i) => ({
        plotNumber: String(i + 1),
        houseNumber: null,
        modelId: `m${i % models}`,
        modelType: null,
        numberOfFloors: null,
        landArea: null,
        usableArea: null,
        isSold: i % 3 === 0,
      })),
      unitCount: n,
      ...extra,
    } as unknown as BriefProject;
    const spec = buildSceneSpec([], project, env);
    const kit = new Kit(readPalette(false), env);
    buildScene(kit, spec!);
    return { spec: spec as VillageSceneSpec, kit };
  };

  const obstacleCount = (kit: Kit) => {
    let n = 0;
    kit.world.traverse(o => {
      if (o.userData.obstacle) n++;
    });
    return n;
  };

  it('makes the house block of a small village obstacles, one per house group, and not a big one', () => {
    // A group is a model, a floor count and a build state: one obstacle each, not one per part.
    const groups = (spec: VillageSceneSpec) =>
      new Set(spec.plots.map(p => `${p.model}|${p.floors}|${p.under ? 1 : 0}`)).size;
    for (const n of [30, 40]) {
      const { spec, kit } = buildVillageScene(n);
      expect(obstacleCount(kit)).toBe(groups(spec));
    }
    expect(obstacleCount(buildVillageScene(41).kit)).toBe(0);
    expect(obstacleCount(buildVillageScene(200).kit)).toBe(0);
  });

  const drawObjects = (kit: Kit) => {
    let n = 0;
    kit.world.traverse(o => {
      if ((o as Mesh).isMesh) n++;
    });
    return n;
  };

  it.each([2, 40, 300, 800])('builds finite geometry for %i plots', n => {
    const { kit } = buildVillageScene(n);
    const s = new Box3().setFromObject(kit.world).getBoundingSphere(new Sphere());
    expect([s.radius, s.center.x, s.center.y, s.center.z].every(Number.isFinite)).toBe(true);
  });

  it('draws 300 houses in a few dozen meshes, not thousands', () => {
    const { kit } = buildVillageScene(800);
    expect(drawObjects(kit)).toBeLessThan(250);
  });

  it('answers a hover on a house with that house, by instance', () => {
    const { kit, spec } = buildVillageScene(12, 2);
    const house = kit.picks.find(o => o.userData.pick?.infoFor);
    expect(house).toBeDefined();
    const info = house!.userData.pick.infoFor(0) as { title: string; rows: { label: string }[] };
    expect(info.title).toContain('values.plotTitle');
    expect(spec.plots.length).toBe(12);
    expect(info.rows.some(r => r.label === 'rows.houseNumber')).toBe(true);
  });

  it('puts the common area above the spine that crosses it, so the two do not z-fight', () => {
    const { kit } = buildVillageScene(12, 2);
    const top = (title: string) => {
      const tops: number[] = [];
      kit.world.traverse(o => {
        if (o.userData.pick?.info.title === title) tops.push(new Box3().setFromObject(o).max.y);
      });
      return Math.max(...tops);
    };
    expect(top('titles.commonArea')).toBeGreaterThan(top('titles.entranceRoad'));
  });

  it('does not list a prototype that is only copied from among the things that rise', () => {
    const kit = new Kit(readPalette(false), env);
    building(kit, { w: 5, d: 5, floors: 2, rise: false });
    expect(kit.risers).toHaveLength(0);
    building(kit, { w: 5, d: 5, floors: 2 });
    expect(kit.risers).toHaveLength(1);
  });

  it('builds frames for houses under construction without losing the finished ones', () => {
    const { spec } = buildVillageScene(10);
    expect(spec.plots.filter(p => p.under)).toHaveLength(4);
  });
});

const instanceScales = (im: InstancedMesh) => {
  const m = new Matrix4();
  const out: { scale: Vector3; pos: Vector3 }[] = [];
  for (let i = 0; i < im.count; i++) {
    im.getMatrixAt(i, m);
    const pos = new Vector3();
    const scale = new Vector3();
    m.decompose(pos, new Quaternion(), scale);
    out.push({ scale, pos });
  }
  return out;
};

describe('improvements with no room', () => {
  it('keeps the callout and says so for an item that cannot be placed', () => {
    const { kit } = build([
      asset({
        areaRai: 0,
        areaNgan: 0,
        areaSquareWa: 1,
        improvements: [{ description: 'ลานคอนกรีต', area: 100000 }],
      }),
    ]);
    const c = kit.callouts.find(x => x.title === 'callouts.improvements');
    expect(c).toBeDefined();
    expect(c?.sub).toBe('ลานคอนกรีต (notes.improvementNoRoom)');
  });
});

describe('machines in a host too small to hold them', () => {
  it('stay inside the building: as many as fit are drawn, the rest are counted', () => {
    const macs = Array.from({ length: 60 }, () => ({ propertyType: 'MAC' }) as BriefAsset);
    const { kit } = build([
      asset({ buildingType: '10', numberOfFloors: 1, totalBuildingArea: 40 }),
      ...macs,
    ]);
    let found: InstancedMesh | null = null;
    let host: Mesh | null = null;
    kit.world.traverse(o => {
      if (o.userData.pick?.info.title === 'titles.machinery') found = o as InstancedMesh;
      if (o.userData.pick?.info.title === 'BuildingType:10') host = o as Mesh;
    });
    expect(found).not.toBeNull();
    const all = instanceScales(found!);
    expect(all.length).toBeGreaterThan(0);
    expect(all.length).toBeLessThan(60);
    expect(host).not.toBeNull();
    const box = new Box3().setFromObject(host!);
    for (const { scale, pos } of all) {
      expect(scale.x).toBeGreaterThan(0);
      expect(pos.x).toBeGreaterThan(box.min.x);
      expect(pos.x).toBeLessThan(box.max.x);
      expect(pos.z).toBeGreaterThan(box.min.z);
      expect(pos.z).toBeLessThan(box.max.z);
    }
    const c = kit.callouts.find(x => x.title === 'titles.machinery');
    expect(c?.sub).toContain(`values.machinesNotDrawn{"n":"${60 - all.length}"}`);
  });

  it('draws all of them when the building is big enough', () => {
    const macs = Array.from({ length: 28 }, () => ({ propertyType: 'MAC' }) as BriefAsset);
    const { kit } = build([
      asset({ buildingType: '10', numberOfFloors: 1, totalBuildingArea: 2400 }),
      ...macs,
    ]);
    let found: InstancedMesh | null = null;
    kit.world.traverse(o => {
      if (o.userData.pick?.info.title === 'titles.machinery') found = o as InstancedMesh;
    });
    expect(found!.count).toBe(28);
    expect(kit.callouts.find(x => x.title === 'titles.machinery')?.sub).not.toContain(
      'machinesNotDrawn',
    );
  });
});

describe('condo garden trees', () => {
  it('stand on the ground where they are outside the podium, and on the deck where they are on it', () => {
    const spec = buildSceneSpec(
      [
        {
          propertyType: 'U',
          condoFloors: 20,
          condoFloorNumber: '5',
          title: '1',
          facilityType: ['08'],
          locationViewType: [],
        } as unknown as BriefAsset,
      ],
      null,
      env,
    );
    const kit = new Kit(readPalette(false), env);
    buildScene(kit, spec!);
    const crowns: InstancedMesh[] = [];
    kit.world.traverse(o => {
      if (o.userData.pick?.info.title === 'Facilities:08') crowns.push(o as InstancedMesh);
    });
    expect(crowns).toHaveLength(2);
    const heights = crowns.map(c => Math.max(...instanceScales(c).map(i => i.pos.y)));
    expect(Math.min(...heights)).toBeLessThan(6);
    expect(Math.max(...heights)).toBeGreaterThan(9);
  });
});

describe('block unit cells', () => {
  it('appear when the towers finish rising, like the condo unit cells', () => {
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
      ],
      unassignedUnits: 0,
      unassignedSoldUnits: 0,
    } as unknown as BriefProject;
    const kit = new Kit(readPalette(false), env);
    buildScene(kit, buildSceneSpec([], project, env)!);
    expect(kit.risersAfter.some(o => (o as InstancedMesh).isInstancedMesh)).toBe(true);
  });
});

describe('block units beyond the cell cap', () => {
  it('says how many units are not drawn', () => {
    const project = {
      projectName: 'B',
      projectType: 'U',
      towers: [
        {
          towerName: 'A',
          numberOfFloors: 5,
          numberOfUnits: 4100,
          floors: [{ floor: 1, units: 4100, soldUnits: 0 }],
        },
      ],
      unassignedUnits: 0,
      unassignedSoldUnits: 0,
    } as unknown as BriefProject;
    const kit = new Kit(readPalette(false), env);
    buildScene(kit, buildSceneSpec([], project, env)!);
    const c = kit.callouts.find(x => x.badge);
    expect(c?.sub).toContain('values.unitsNotDrawn{"n":"100"}');
    expect(c?.rows?.at(-1)).toEqual({
      label: 'rows.note',
      value: 'values.unitsNotDrawn{"n":"100"}',
    });
  });
});

describe('condo podium deck items', () => {
  it('appear after the podium has risen, not with it', () => {
    const spec = buildSceneSpec(
      [
        {
          propertyType: 'U',
          condoFloors: 20,
          condoFloorNumber: '5',
          title: '1',
          facilityType: ['06', '07', '08'],
          locationViewType: [],
        } as unknown as BriefAsset,
      ],
      null,
      env,
    );
    const kit = new Kit(readPalette(false), env);
    buildScene(kit, spec!);
    const after = new Set(kit.risersAfter);
    const picked = (title: string) => kit.picks.find(p => p.userData.pick.info.title === title)!;
    expect(after.has(picked('Facilities:06'))).toBe(true); // the pool
    expect(after.has(picked('Facilities:07'))).toBe(true); // the gym
    expect(kit.world.children.some(o => after.has(o) && (o as InstancedMesh).isInstancedMesh)).toBe(
      true,
    ); // deck trees
  });
});

describe('a low condo tower has no podium', () => {
  const draw = (condoFloors: number) => {
    const spec = buildSceneSpec(
      [
        {
          propertyType: 'U',
          condoFloors,
          condoFloorNumber: '2',
          title: '1',
          facilityType: ['06', '07'],
          locationViewType: [],
        } as unknown as BriefAsset,
      ],
      null,
      env,
    );
    const kit = new Kit(readPalette(false), env);
    buildScene(kit, spec!);
    const subjects: Group[] = [];
    kit.world.children.forEach(o => o.userData.subject && subjects.push(o as Group));
    const top = (title: string) =>
      new Box3().setFromObject(kit.picks.find(p => p.userData.pick.info.title === title)!).min.y;
    return { subjects, top };
  };

  it('puts the facilities on the ground beside it, and frames them with it', () => {
    const { subjects, top } = draw(3);
    expect(subjects.length).toBeGreaterThanOrEqual(3); // the tower, the pool and the gym
    expect(top('Facilities:06')).toBeLessThan(1); // on the ground, not on a deck 7 m up
  });

  it('keeps the podium of a tall tower, and frames it as part of the subject', () => {
    const { subjects, top } = draw(20);
    expect(top('Facilities:06')).toBeGreaterThan(7);
    expect(subjects.length).toBe(2); // the tower and its podium
  });
});

describe('condo legal callout', () => {
  it("is placed on the site like a land's", () => {
    const spec = buildSceneSpec(
      [
        {
          propertyType: 'U',
          condoFloors: 20,
          condoFloorNumber: '5',
          title: '1',
          isForestBoundary: true,
          facilityType: [],
          locationViewType: [],
        } as unknown as BriefAsset,
      ],
      null,
      env,
    );
    const kit = new Kit(readPalette(false), env);
    buildScene(kit, spec!);
    const c = kit.callouts.find(x => x.title === 'callouts.legal');
    expect(c).toMatchObject({ priority: 0, tone: 'danger', sub: 'legal.forestBoundary' });
  });
});

describe('every improvement stays hoverable', () => {
  it('registers a mesh, not an empty group, for a water tank with a tiny storey count', () => {
    const { kit } = build([
      asset({
        propertyType: 'LB',
        improvements: [],
      }),
      asset({
        propertyType: 'B',
        buildingType: '99',
        buildingTypeOther: 'ถังน้ำ',
        numberOfFloors: 0.2,
        totalBuildingArea: 10,
      }),
    ]);
    const tank = kit.picks.find(o => o.userData.pick?.info.title === 'ถังน้ำ');
    expect(tank).toBeDefined();
    expect((tank as Mesh).isMesh).toBe(true);
  });
});

describe('condo under construction', () => {
  it('builds the frame of the upper half: more parts than a finished tower', () => {
    const count = (under: boolean) => {
      const spec = buildSceneSpec(
        [
          {
            propertyType: 'U',
            condoFloors: 20,
            condoFloorNumber: '5',
            title: '1',
            isUnderConstruction: under,
            facilityType: [],
            locationViewType: [],
          } as unknown as BriefAsset,
        ],
        null,
        env,
      );
      const kit = new Kit(readPalette(false), env);
      buildScene(kit, spec!);
      let n = 0;
      kit.world.traverse(o => {
        if ((o as InstancedMesh).isInstancedMesh) n++;
      });
      return n;
    };
    expect(count(true)).toBeGreaterThan(count(false));
  });
});

describe('what is not drawn is said', () => {
  const block = (towers: unknown[]) => {
    const project = {
      projectName: 'P',
      projectType: 'U',
      towers,
      unassignedUnits: 0,
      unassignedSoldUnits: 0,
      facilities: [],
      houseModels: [],
      plots: [],
      land: null,
    } as unknown as BriefProject;
    const spec = buildSceneSpec([], project, env)!;
    const kit = new Kit(readPalette(false), env);
    buildScene(kit, spec);
    return kit;
  };

  it('counts the units of a tower that records a count but no floor of them', () => {
    const kit = block([{ towerName: 'A', numberOfFloors: 10, numberOfUnits: 50, floors: [] }]);
    expect(kit.callouts[0].sub).toContain('values.unitsNotDrawn{"n":"50"}');
  });

  it('counts only the units past the cell cap when every floor is known', () => {
    const floors = Array.from({ length: 10 }, (_, i) => ({ floor: i + 1, units: 5, soldUnits: 0 }));
    const kit = block([{ towerName: 'A', numberOfFloors: 10, numberOfUnits: 50, floors }]);
    expect(kit.callouts[0].sub).not.toContain('unitsNotDrawn');
  });

  it('says the drawing limit, not the room, when 400 machines are drawn and more remain', () => {
    const macs = Array.from({ length: 500 }, () => ({ propertyType: 'MAC' }) as BriefAsset);
    const { kit } = build([
      asset({ buildingType: '10', numberOfFloors: 1, totalBuildingArea: 200000 }),
      ...macs,
    ]);
    const sub = kit.callouts.find(x => x.title === 'titles.machinery')?.sub;
    expect(sub).toContain('values.machinesOverLimit{"n":"100"}');
    expect(sub).not.toContain('machinesNotDrawn');
  });
});

describe('machines past the limit in a host that is also too small', () => {
  it('states each count with its own reason', () => {
    const macs = Array.from({ length: 900 }, () => ({ propertyType: 'MAC' }) as BriefAsset);
    const { kit } = build([
      asset({ buildingType: '10', numberOfFloors: 1, totalBuildingArea: 600 }),
      ...macs,
    ]);
    let drawn = 0;
    kit.world.traverse(o => {
      if (o.userData.pick?.info.title === 'titles.machinery') drawn = (o as InstancedMesh).count;
    });
    expect(drawn).toBeGreaterThan(0);
    expect(drawn).toBeLessThan(400);
    const sub = kit.callouts.find(x => x.title === 'titles.machinery')?.sub;
    expect(sub).toContain(`values.machinesNotDrawn{"n":"${400 - drawn}"}`);
    expect(sub).toContain('values.machinesOverLimit{"n":"500"}');
  });
});

describe('a row of buildings on a narrow parcel', () => {
  const onParcel = (frontage: number, area: number, count: number) => {
    const land = asset({
      propertyType: 'L',
      landShapeType: '05',
      roadFrontage: frontage,
      areaRai: 2,
      areaNgan: 0,
      areaSquareWa: 0,
    });
    const buildings = Array.from({ length: count }, () =>
      asset({ propertyType: 'B', buildingType: '01', numberOfFloors: 1, totalBuildingArea: area }),
    );
    const { spec, kit } = build([land, ...buildings]);
    const row = new Box3();
    kit.world.traverse(o => {
      if (o.userData.subject) row.expandByObject(o);
    });
    const parcel = kit.callouts.find(c => c.title === spec.parcel.callout?.title);
    return { row, parcel, spec };
  };

  it('closes the gaps to keep the row inside a 10 m frontage when it can', () => {
    const { row, parcel } = onParcel(10, 10, 2);
    // Inside the 10 m parcel, roofs included.
    expect(row.min.x).toBeGreaterThanOrEqual(-5);
    expect(row.max.x).toBeLessThanOrEqual(5);
    expect(parcel?.sub).not.toContain('buildingsLargerThanParcel');
  });

  it('keeps the row and says so when even a tight row is wider than the parcel', () => {
    const { row, parcel, spec } = onParcel(10, 300, 2);
    expect(row.max.x - row.min.x).toBeGreaterThan(10);
    expect(parcel?.sub).toContain('notes.buildingsLargerThanParcel');
    expect(parcel?.rows?.at(-1)?.value).toBe('notes.buildingsLargerThanParcel');
    expect(spec.parcel.info.rows.map(r => r.value)).not.toContain(
      'notes.buildingsLargerThanParcel',
    );
  });

  it('leaves a row that fits at its 6 m gaps', () => {
    const { row, parcel } = onParcel(40, 100, 2);
    expect(parcel?.sub).not.toContain('buildingsLargerThanParcel');
    expect(row.max.x - row.min.x).toBeGreaterThan(14);
  });
});

describe('building inside a group', () => {
  it('adds to the group, and anchors its callouts in the world as they are made', () => {
    const kit = new Kit(readPalette(false), env);
    const outer = kit.world;
    const group = new Group();
    group.rotation.y = Math.PI / 2;
    group.position.set(10, 0, 0);
    kit.enter(group);
    expect(kit.world).toBe(group);
    kit.callout(new Vector3(1, 0, 0), { title: 't', sub: '' });
    kit.leave();
    expect(kit.world).toBe(outer);
    expect(group.parent).toBe(outer);
    const { x, z } = kit.callouts[0].pos;
    // (1, 0, 0) turned a quarter about y lands on -z, then moved 10 along x.
    expect(x).toBeCloseTo(10, 5);
    expect(z).toBeCloseTo(-1, 5);
    // Outside the group a callout is already in world coordinates.
    kit.callout(new Vector3(2, 0, 0), { title: 'u', sub: '' });
    expect(kit.callouts[1].pos.x).toBe(2);
  });
});

describe('a block condo is drawn as a condo site', () => {
  const project = (o: object = {}) =>
    ({
      projectName: 'B',
      projectType: 'U',
      towers: [1, 2, 3].map(n => ({
        towerName: String(n),
        numberOfFloors: 20 + n,
        numberOfUnits: 4,
        floors: [],
      })),
      unassignedUnits: 0,
      unassignedSoldUnits: 0,
      facilities: [],
      houseModels: [],
      plots: [],
      land: null,
      ...o,
    }) as unknown as BriefProject;
  const draw = (p: BriefProject) => {
    const spec = buildSceneSpec([], p, env) as BlockSceneSpec;
    const kit = new Kit(readPalette(false), env);
    buildScene(kit, spec);
    return { spec, kit };
  };
  const buildings = (kit: Kit) => kit.world.children.filter(o => o.userData.top !== undefined);

  it('stands N towers on a site with a podium for the recorded facilities', () => {
    const { spec, kit } = draw(project({ facilities: ['06'] }));
    expect(spec.deckUse).toBe(true);
    expect(spec.facilitiesAssumed).toBe(false);
    expect(kit.world.children.filter(o => o.userData.subject)).toHaveLength(3);
    // The three towers and the podium.
    expect(buildings(kit)).toHaveLength(4);
    const picked: string[] = [];
    kit.world.traverse(o => o.userData.pick && picked.push(o.userData.pick.info.title));
    expect(picked).toContain('titles.podium');
  });

  it('draws the usual podium and facilities when none is recorded, as scenery that answers nothing', () => {
    const { spec, kit } = draw(project());
    expect(spec.facilitiesAssumed).toBe(true);
    expect(spec.deckUse).toBe(true);
    expect(buildings(kit).length).toBeGreaterThanOrEqual(4);
    const titles = new Set<string>();
    kit.world.traverse(o => o.userData.pick && titles.add(o.userData.pick.info.title));
    expect(titles.has('titles.podium')).toBe(false);
    expect([...titles].some(t => t.startsWith('Facilities:'))).toBe(false);
  });
});

describe('callout identity', () => {
  it('numbers a callout within its class, so adding one of another class does not move it', () => {
    const kit = new Kit(readPalette(false), env);
    const at = new Vector3();
    kit.callout(at, { title: 'a', sub: '', priority: 2 });
    kit.callout(at, { title: 'b', sub: '', priority: 0, tone: 'danger' });
    kit.callout(at, { title: 'c', sub: '', priority: 2 });
    expect(kit.callouts.map(c => c.key)).toEqual(['2::0', '0:danger:0', '2::1']);
    const other = new Kit(readPalette(false), env);
    other.callout(at, { title: 'x', sub: '', priority: 1 });
    other.callout(at, { title: 'a', sub: '', priority: 2 });
    expect(other.callouts[1].key).toBe('2::0');
  });
});

describe('an assumed site stays quiet', () => {
  it('draws an assumed garden and an assumed neighbour with nothing to hover', () => {
    const { spec, kit } = build([
      asset({
        landUseType: [],
        boundaries: [],
        totalBuildingArea: 40,
        numberOfFloors: null as never,
      }),
    ]);
    expect(spec.useAssumed).toBe(true);
    let treeMeshes = 0;
    kit.world.traverse(o => {
      if ((o as InstancedMesh).isInstancedMesh && o.userData.pick?.info.title === 'titles.trees')
        treeMeshes++;
    });
    expect(treeMeshes).toBe(0);
    // Neighbours: scenery, so no callout for any of them.
    expect(kit.callouts.map(c => c.title).filter(t => t.startsWith('callouts.side'))).toEqual([]);
    expect(kit.callouts.every(c => c.title.trim() !== '')).toBe(true);
  });
});

describe('a boundary band', () => {
  it('does not enlarge the frame, however far out it is', () => {
    const radius = (distance: number) => {
      const { kit } = build([
        asset({
          boundaries: [{ direction: 'north', adjacentArea: 'ที่ดินเอกชน', distance }] as never,
        }),
      ]);
      return sceneSpheres(kit.world).all.radius;
    };
    expect(radius(400)).toBeCloseTo(radius(1), 5);
  });
});

describe('a big parcel', () => {
  it('anchors the parcel callout at the middle exactly when the engine frames the subject alone', () => {
    const seen: boolean[] = [];
    for (const area of [
      { areaRai: 0, areaSquareWa: 400, numberOfFloors: 1, totalBuildingArea: 900 },
      { areaRai: 400, areaSquareWa: 0 },
    ]) {
      const { kit } = build([asset({ areaNgan: 0, ...area })]);
      const { big, subject } = sceneSpheres(kit.world);
      const parcel = kit.callouts.find(c => c.title === 'titles.land')!;
      const fromSubject = Math.hypot(
        parcel.pos.x - subject!.center.x,
        parcel.pos.z - subject!.center.z,
      );
      // The same reading decides both: a big parcel puts the callout among the buildings.
      expect(fromSubject < 12).toBe(big);
      seen.push(big);
    }
    // Both cases are exercised.
    expect(seen).toEqual([false, true]);
  });
});
