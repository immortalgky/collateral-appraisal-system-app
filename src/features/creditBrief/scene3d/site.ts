import {
  Box3,
  BoxGeometry,
  BufferGeometry,
  Color,
  CylinderGeometry,
  ExtrudeGeometry,
  Group,
  Line,
  LineDashedMaterial,
  type Mesh,
  type Object3D,
  Shape,
  Vector2,
  Vector3,
} from 'three';
import { Kit, inPoly, rng, sceneSpheres, type Pt, type Xform } from './kit';
import { groupBy } from './values';
import {
  blockCellRows,
  type BlockSceneSpec,
  type CondoSceneSpec,
  type Dir,
  FLOOR_H,
  IMPROVEMENT_HEIGHT,
  type ImprovementSpec,
  type LandSceneSpec,
  type NeighbourSpec,
  type ParcelSpec,
  type SceneSpec,
  pieceText,
  type Piece,
  withPiece,
} from './model';
import {
  building,
  facilityClub,
  facilityGym,
  facilityPool,
  fence,
  footprint,
  roofMesh,
  trees,
  chimneyOf,
  machineGeometry,
  machineYard,
} from './parts';
import type { PaletteKey } from './palette';
import { buildVillage } from './village';

/** Ground height of a parcel. SoilLevel is shown in the hover, not drawn: its reference level is not recorded. */
const LAND_TOP = 0.6;
const ROAD_TOP = 0.35;
/** A condo tower this low or lower has no podium: it would merge with it into one slab. */
const LOW_TOWER_FLOORS = 5;
/** Frame of the site so its frontage faces the access road. */
const FACING: Record<Dir, number> = {
  south: 0,
  east: Math.PI / 2,
  north: Math.PI,
  west: -Math.PI / 2,
};
const DIR_NORMAL: Record<Dir, [number, number]> = {
  north: [0, -1],
  south: [0, 1],
  east: [1, 0],
  west: [-1, 0],
};
const SURFACE_COLOR: Record<string, PaletteKey> = {
  '01': 'roadLight',
  '02': 'laterite',
  '03': 'gravel',
  '04': 'soil',
  '05': 'road',
};
/** Unit cells drawn on a project at most; the rest are counted in the callout. */
const MAX_CELLS = 4000;
/** Crop plants drawn at most. */
const MAX_CROPS = 4000;
/** The buildings stand in a row: 6 m apart where the parcel allows, never closer than 1 m, and 1 m in from its edges. */
const ROW_GAP = 6;
const MIN_GAP = 1;
const ROW_EDGE = 1;
/** Machines drawn in a building at most; the rest are counted in the callout. */
const MAX_MACHINES_DRAWN = 400;

const surfaceColor = (kit: Kit, code: string | null) =>
  kit.P[(code && SURFACE_COLOR[code]) || 'band'];

// ── parcel ───────────────────────────────────────────────────────────────────

interface Plot {
  mesh: Mesh;
  poly: Pt[];
  top: number;
  front: number;
  back: number;
  minX: number;
  maxX: number;
  cx: number;
  cz: number;
  width: number;
  depth: number;
  frontage: number;
}

/**
 * A parcel from what is recorded about its size: deed area, RoadFrontage and the LandShape code.
 * Local frame: frontage on +z. Codes 01-03/99 (or no frontage) carry no geometry, so they get a
 * square of the deed area with a dashed edge, which reads as "shape not recorded".
 */
function plot(kit: Kit, spec: ParcelSpec, material: ReturnType<Kit['mat']>): Plot {
  const { sqm, shape, frontage, shapeKnown: known } = spec;
  const f = known && shape !== '04' ? Math.min(Math.max(frontage, 2), sqm / 2) : Math.sqrt(sqm);
  let pts: [number, number][];
  if (!known || shape === '04') {
    const a = Math.sqrt(sqm) / 2;
    pts = [
      [-a, a],
      [a, a],
      [a, -a],
      [-a, -a],
    ];
  } else if (shape === '06') {
    const b = f * 0.6;
    const D = (2 * sqm) / (f + b);
    pts = [
      [-f / 2, D / 2],
      [f / 2, D / 2],
      [b / 2, -D / 2],
      [-b / 2, -D / 2],
    ];
  } else if (shape === '07') {
    const D = (2 * sqm) / f;
    pts = [
      [-f / 2, D / 2],
      [f / 2, D / 2],
      [-f * 0.3, -D / 2],
    ];
  } else if (shape === '08') {
    const D = sqm / (0.93 * f);
    pts = [
      [-f / 2, D / 2],
      [f / 2, D / 2],
      [f / 2, -D * 0.1],
      [f * 0.15, -D / 2],
      [-f / 2, -D / 2],
    ];
  } else {
    const D = sqm / f;
    pts = [
      [-f / 2, D / 2],
      [f / 2, D / 2],
      [f / 2, -D / 2],
      [-f / 2, -D / 2],
    ];
  }
  const poly = pts.map(([x, z]) => ({ x, z }));
  const geo = new ExtrudeGeometry(new Shape(poly.map(p => new Vector2(p.x, -p.z))), {
    depth: LAND_TOP,
    bevelEnabled: false,
  });
  geo.rotateX(-Math.PI / 2);
  const m = kit.mesh(geo, [material, kit.mat(kit.P.soil)], { cast: false });
  kit.outline(m, known ? 0.35 : 0.9, kit.P.edge, !known);
  kit.world.add(m);
  const xs = poly.map(p => p.x);
  const zs = poly.map(p => p.z);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const front = Math.max(...zs);
  const back = Math.min(...zs);
  return {
    mesh: m,
    poly,
    top: LAND_TOP,
    front,
    back,
    minX,
    maxX,
    cx: xs.reduce((s, v) => s + v, 0) / xs.length,
    cz: zs.reduce((s, v) => s + v, 0) / zs.length,
    width: maxX - minX,
    depth: front - back,
    frontage: poly[1].x - poly[0].x,
  };
}

interface Bounds {
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
}

/** Each side's AdjacentArea, drawn at its BoundaryLength from the parcel's world-space bounds. */
function neighbours(kit: Kit, list: NeighbourSpec[], b: Bounds) {
  const { P } = kit;
  for (const n of list) {
    const [nx, nz] = DIR_NORMAL[n.dir];
    const alongX = nz !== 0;
    const sgn = nx || nz;
    const lo = alongX ? b.minX : b.minZ;
    const hi = alongX ? b.maxX : b.maxZ;
    const mid = (lo + hi) / 2;
    const edge = nx > 0 ? b.maxX : nx < 0 ? b.minX : nz > 0 ? b.maxZ : b.minZ;
    const near = edge + sgn * Math.max(n.distance, 0.4);
    const c = near + (sgn * n.thickness) / 2;
    const at = (along: number, across: number, y: number) =>
      alongX ? new Vector3(along, y, across) : new Vector3(across, y, along);
    let m: Mesh;
    if (n.kind === 'road') {
      m = kit.strip(
        alongX,
        mid,
        c,
        hi - lo + 60,
        n.thickness,
        ROAD_TOP / 2,
        ROAD_TOP,
        kit.mat(n.isAccess ? surfaceColor(kit, n.surface) : P.band),
      );
      m.userData.noFit = true;
    } else if (n.kind === 'water') {
      m = kit.strip(
        alongX,
        mid,
        c,
        hi - lo + 60,
        n.thickness,
        0.05,
        0.1,
        kit.mat(P.water, { roughness: 0.2 }),
      );
      m.userData.noFit = true;
    } else {
      m = kit.outline(
        kit.strip(
          alongX,
          mid,
          c,
          hi - lo,
          n.thickness,
          0.06,
          0.12,
          kit.mat(P.band, { transparent: true, opacity: 0.4 }),
        ),
        0.7,
        P.edge,
        true,
      );
      // Like a road or water: a boundary band far out must not shrink the parcel in the frame.
      m.userData.noFit = true;
    }
    kit.world.add(n.info ? kit.pick(m, n.info) : m);
    if (n.distance > 0) {
      const line = new Line(
        new BufferGeometry().setFromPoints([
          at(mid, edge, LAND_TOP + 0.3),
          at(mid, near, LAND_TOP + 0.3),
        ]),
        new LineDashedMaterial({ color: P.amber, dashSize: 0.5, gapSize: 0.3 }),
      );
      line.computeLineDistances();
      line.userData.noFit = true;
      kit.world.add(line);
    }
    if (n.callout) kit.callout(at(mid, c, ROAD_TOP), n.callout, n.left);
  }
}

// ── land ─────────────────────────────────────────────────────────────────────

interface Occupied {
  x: number;
  z: number;
  hx: number;
  hz: number;
}

/**
 * Machines on a grid inside a building (w by d, centre at the origin): as many as fit, each as big
 * as its cell allows (never a cell under 1.2 m), the rest left to the callout. Cells that touch
 * `avoid` (a chimney's base) stay empty.
 */
export function machineGrid(
  w: number,
  d: number,
  n: number,
  avoid: { x: number; z: number; r: number } | null,
) {
  const iw = Math.max(0, w - 2);
  const id = Math.max(0, d - 2);
  const MIN_CELL = 1.2;
  const at = (cell: number) => {
    const cols = Math.floor(iw / cell);
    const rows = Math.floor(id / cell);
    const sx = cols > 0 ? iw / cols : 0;
    const sz = rows > 0 ? id / rows : 0;
    const scale = Math.min(1, Math.min(sx, sz) / 4);
    // A machine box is 3.4 x 2.2 m before scaling: its corner is ~2.03 m from its centre.
    const clear = avoid ? avoid.r + 2.03 * scale + 0.2 : 0;
    const spots: [number, number][] = [];
    for (let r = 0; r < rows; r++)
      for (let c = 0; c < cols; c++) {
        const x = -iw / 2 + sx * (c + 0.5);
        const z = -id / 2 + sz * (r + 0.5);
        if (!avoid || Math.hypot(x - avoid.x, z - avoid.z) >= clear) spots.push([x, z]);
      }
    return { spots, scale };
  };
  let cell = Math.max(MIN_CELL, Math.sqrt((iw * id) / Math.max(1, n)));
  let grid = at(cell);
  while (grid.spots.length < n && cell > MIN_CELL) {
    cell = Math.max(MIN_CELL, cell * 0.9);
    grid = at(cell);
  }
  return { spots: grid.spots.slice(0, n), scale: grid.scale };
}

/** Distance between the centres of two highlighted unit cells on one floor: a cell is 6.5 m wide. */
const UNIT_CELL_STEP = 7.5;

/**
 * Where each unit cell on one floor stands: its preferred x where that is free, otherwise the
 * nearest place `step` clear of its neighbours, all inside [lo, hi]. Returns the x per input, in
 * input order. More cells than fit (never with the unit cap) would overlap at the ends.
 */
export function spreadOnFloor(prefs: number[], lo: number, hi: number, step: number): number[] {
  const order = prefs.map((_, i) => i).sort((a, b) => prefs[a] - prefs[b] || a - b);
  const xs = order.map(i => Math.min(hi, Math.max(lo, prefs[i])));
  for (let k = 1; k < xs.length; k++) xs[k] = Math.max(xs[k], xs[k - 1] + step);
  for (let k = xs.length - 1; k >= 0; k--)
    xs[k] = Math.min(xs[k], k === xs.length - 1 ? hi : xs[k + 1] - step);
  const out = new Array<number>(prefs.length);
  order.forEach((i, k) => (out[i] = xs[k]));
  return out;
}

function buildLand(kit: Kit, spec: LandSceneSpec) {
  const { P, env } = kit;
  const outer = kit.world;
  // The site stands in the world turned to face its road, and is built in its own coordinates.
  const site = new Group();
  site.rotation.y = FACING[spec.roadSide ?? 'south'];
  kit.enter(site);

  const use = spec.use;
  // Assumed look per LandUse: industrial = paved yard, residential/agricultural = grass, otherwise bare ground.
  const ground = spec.machineYard
    ? P.lawn
    : use.industrial
      ? P.roadLight
      : use.residential || use.agricultural
        ? P.lawn
        : P.land;
  const land = plot(kit, spec.parcel, kit.mat(ground));
  const { poly, top, front } = land;
  const occupied: Occupied[] = [];
  let pond: { x: number; z: number; r: number } | null = null;
  const clear = (x: number, z: number, m: number) =>
    inPoly(x, z, poly) &&
    inPoly(x - m, z, poly) &&
    inPoly(x + m, z, poly) &&
    inPoly(x, z - m, poly) &&
    inPoly(x, z + m, poly) &&
    !occupied.some(o => Math.abs(x - o.x) < o.hx + m && Math.abs(z - o.z) < o.hz + m) &&
    !(pond && Math.hypot(x - pond.x, z - pond.z) < pond.r + m);

  // Buildings: their place on the parcel is not recorded, so they stand in a row about the centre.
  // The row keeps its gaps (6 m) where it fits the parcel, and closes them down to MIN_GAP where it
  // does not. A row that is still wider than the parcel stays as it is, and says so.
  const sizes = spec.buildings.map(b => footprint(b.area, b.floors, b.ratio));
  const sumW = sizes.reduce((a, z) => a + z.w, 0);
  const between = Math.max(0, sizes.length - 1);
  const avail = land.width - 2 * ROW_EDGE;
  const gap =
    between > 0 && sumW + between * ROW_GAP > avail
      ? Math.max(MIN_GAP, (avail - sumW) / between)
      : ROW_GAP;
  const rowW = sumW + between * gap;
  // Only a parcel that is collateral says it; the ground drawn under a building on no land does not.
  const overhangs = !!spec.parcel.callout && rowW > avail + 1e-6;
  const overhangNote = overhangs ? env.t('notes.buildingsLargerThanParcel') : null;
  kit.pick(
    land.mesh,
    overhangNote
      ? {
          ...spec.parcel.info,
          rows: [...spec.parcel.info.rows, { label: env.t('rows.note'), value: overhangNote }],
        }
      : spec.parcel.info,
  );
  const built = spec.buildings.map((b, i) => {
    const { w, d } = sizes[i];
    const r = building(kit, {
      w,
      d,
      floors: b.floors,
      fh: b.fh,
      roofStyle: b.roofStyle,
      roofColor: b.roofColor,
      under: b.under,
      glass: i === spec.machineHost,
      type: b.look,
    });
    return { ...r, w, d };
  });
  const subjectSpan = Math.max(rowW, 12);
  let x = land.cx - rowW / 2;
  // Machines not drawn, each count with its own reason: no room left in the host, and past the drawing limit.
  const machineNotes: string[] = [];
  let hostAt: Vector3 | null = null;
  // The count is real; where each machine stands is not recorded: a grid inside the host, or the yard.
  const drawMachines = (
    cx: number,
    cz: number,
    w: number,
    d: number,
    avoid: { x: number; z: number; r: number } | null,
  ) => {
    const machines = spec.machines!;
    const grid = machineGrid(w, d, Math.min(machines.count, MAX_MACHINES_DRAWN), avoid);
    const overLimit = Math.max(0, machines.count - MAX_MACHINES_DRAWN);
    const noRoom = Math.min(machines.count, MAX_MACHINES_DRAWN) - grid.spots.length;
    if (noRoom > 0) machineNotes.push(env.t('values.machinesNotDrawn', { n: env.nf(noRoom) }));
    if (overLimit > 0)
      machineNotes.push(env.t('values.machinesOverLimit', { n: env.nf(overLimit) }));
    const spots: Xform[] = grid.spots.map(([sx, sz]) => [
      cx + sx,
      top + 1.1 * grid.scale,
      cz + sz,
      0,
      grid.scale,
    ]);
    const mesh = kit.pick(
      kit.instanced(machineGeometry(P), kit.mat('#ffffff', { vertexColors: true }), spots),
      machineNotes.length > 0
        ? {
            ...machines.info,
            rows: [
              ...machines.info.rows,
              ...machineNotes.map(value => ({ label: env.t('rows.note'), value })),
            ],
          }
        : machines.info,
    );
    site.add(mesh);
    return mesh;
  };
  built.forEach((b, i) => {
    const bx = x + b.w / 2;
    const bz = land.cz;
    x += b.w + gap;
    occupied.push({ x: bx, z: bz, hx: b.w / 2, hz: b.d / 2 });
    b.group.position.set(bx, top, bz);
    b.group.userData.subject = true;
    b.group.userData.obstacle = true;
    site.add(b.group);
    const bs = spec.buildings[i];
    kit.pick(b.body, bs.info);
    kit.callout(
      new Vector3(bx, top + (b.group.userData.top as number) + 1.5, bz),
      bs.callout,
      i % 2 === 1,
    );
    if (i === spec.machineHost && spec.machines) {
      hostAt = new Vector3(bx, top + 1, bz);
      // A factory's chimney stands in the back-right corner: no machine under it.
      drawMachines(bx, bz, b.w, b.d, spec.buildings[i].type === '10' ? chimneyOf(b.w, b.d) : null);
    }
  });
  // Machines and nothing else on the request: they stand in a yard on the ground drawn for them.
  if (spec.machineYard && spec.machines) {
    hostAt = new Vector3(land.cx, top + 1, land.cz);
    const side = Math.min(
      Math.max(10, 6 * Math.sqrt(spec.machines.count) + 6),
      Math.min(land.width, land.depth) - 2 * ROW_EDGE,
    );
    const shed = machineYard(kit, land.cx, top, land.cz, side);
    shed.userData.subject = true;
    site.add(shed);
    const yard = drawMachines(land.cx, land.cz, side, side, null);
    yard.userData.subject = true;
    yard.userData.obstacle = true;
    // Trees along the edges of the lot, clear of the apron.
    occupied.push({ x: land.cx, z: land.cz, hx: side / 2 + 2, hz: side / 2 + 2 });
    const edge: [number, number][] = [];
    for (let k = 0; k < 900 && edge.length < 12; k++) {
      const tx = land.minX + (((k * 53) % 100) / 100) * land.width;
      const tz = land.back + (((k * 29) % 100) / 100) * land.depth;
      if (clear(tx, tz, 2.2) && !edge.some(p => Math.hypot(p[0] - tx, p[1] - tz) < 4))
        edge.push([tx, tz]);
    }
    trees(kit, edge, top, null);
  }
  if (spec.machines) {
    kit.callout(
      // On the building that holds them; with no factory or warehouse, on the parcel.
      hostAt ?? new Vector3(land.cx, top + 1, land.cz + 2),
      machineNotes.reduce(
        (c, note) => withPiece(c, env.t('rows.note'), note),
        spec.machines.callout,
      ),
      true,
    );
  }

  // Development items: the kind comes from the words; where it stands is assumed.
  const findSpot = (cands: [number, number][], m: number): [number, number] | null =>
    cands.find(([cx, cz]) => clear(cx, cz, m)) ??
    (() => {
      for (let k = 0; k < 400; k++) {
        const cx = land.minX + (((k * 37) % 100) / 100) * land.width;
        const cz = land.back + (((k * 61) % 100) / 100) * land.depth;
        if (clear(cx, cz, m)) return [cx, cz] as [number, number];
      }
      return null;
    })();
  let impAnchor: Vector3 | null = null;
  const unplaced = new Set<ImprovementSpec>();
  for (const [i, m] of spec.improvements.entries()) {
    if (m.kind === 'fence') {
      impAnchor = impAnchor ?? new Vector3(poly[1].x, top + 2, poly[1].z);
      continue;
    }
    const size = {
      guard: 2.6,
      tank: 3,
      canopy: Math.sqrt(m.area || 36),
      shrine: 1.6,
      pool: Math.sqrt(m.area || 32),
      paving: Math.sqrt(m.area || 60),
      // Unknown text is drawn as an assumed marker; it scales with the subject so it stays noticeable.
      other: Math.min(10, Math.max(3, subjectSpan * 0.2, Math.sqrt(spec.parcel.sqm) * 0.06)),
    }[m.kind];
    const fx = poly[1].x;
    const prefer: Record<string, [number, number][]> = {
      guard: [
        [fx - 3, front - 3],
        [poly[0].x + 3, front - 3],
      ],
      shrine: [
        [poly[0].x + 3, front - 4],
        [fx - 6, front - 4],
      ],
      tank: [
        [land.maxX - 4, land.back + 4],
        [land.minX + 4, land.back + 4],
      ],
      paving: [
        [land.cx, front - size / 2 - 1],
        [land.cx, land.cz],
      ],
      canopy: [[poly[0].x + size / 2 + 2, front - size / 2 - 2]],
      pool: [[land.cx, land.back + size / 2 + 2]],
      other: [[land.minX + 3 + i * 4, land.back + 3]],
    };
    const spot = findSpot(
      prefer[m.kind],
      ['paving', 'canopy', 'pool'].includes(m.kind) ? size / 2 : size,
    );
    if (!spot) {
      unplaced.add(m);
      continue;
    }
    const [sx, sz] = spot;
    const g = new Group();
    g.userData.subject = true;
    g.position.set(sx, top, sz);
    let body: Object3D;
    const H = IMPROVEMENT_HEIGHT[m.kind] ?? size;
    if (m.kind === 'guard') {
      const b = kit.outline(kit.box(size, H, size, kit.mat(P.mass)), 0.6);
      b.position.y = H / 2;
      const r = kit.outline(kit.box(size + 0.8, 0.2, size + 0.8, kit.mat(P.roof)), 0.5);
      r.position.y = H + 0.1;
      g.add(b, r);
      body = b;
    } else if (m.kind === 'tank') {
      // A stand of height H with 1-5 tiers stacked on it.
      // At least one tier: a tank with none would register an empty group as its pick, which a
      // non-recursive raycast never hits.
      const tiers = Math.min(5, Math.max(1, Math.round(m.floors || 1)));
      const tierH = H * 0.3;
      g.add(
        kit.instanced(new BoxGeometry(0.25, H, 0.25), kit.mat(P.steel), [
          [-1.2, H / 2, -1.2],
          [1.2, H / 2, -1.2],
          [-1.2, H / 2, 1.2],
          [1.2, H / 2, 1.2],
        ]),
      );
      body = g;
      for (let t = 0; t < tiers; t++) {
        const c = kit.outline(
          kit.mesh(new CylinderGeometry(1.4, 1.4, tierH, 20), kit.mat(P.glass)),
          0.5,
        );
        c.position.y = H + tierH / 2 + t * (tierH + 0.1);
        g.add(c);
        if (t === 0) body = c;
      }
    } else if (m.kind === 'shrine') {
      const post = kit.box(0.3, H, 0.3, kit.mat(P.mass));
      post.position.y = H / 2;
      const b = kit.outline(kit.box(1, 0.8, 0.8, kit.mat(P.amber)), 0.6);
      b.position.y = H + 0.4;
      const { object: r } = roofMesh(kit, 'gable', 1, 0.8, kit.mat(P.roofTile));
      r.position.y += H + 0.8;
      g.add(post, b, r);
      body = b;
    } else if (m.kind === 'canopy') {
      const posts = kit.instanced(new BoxGeometry(0.2, H, 0.2), kit.mat(P.steel), [
        [-size / 2, H / 2, -size / 2],
        [size / 2, H / 2, -size / 2],
        [-size / 2, H / 2, size / 2],
        [size / 2, H / 2, size / 2],
      ]);
      const b = kit.outline(kit.box(size + 0.6, 0.15, size + 0.6, kit.mat(P.roofMetal)), 0.6);
      b.position.y = H + 0.1;
      g.add(posts, b);
      body = b;
    } else if (m.kind === 'pool') {
      const b = kit.outline(
        kit.box(size * 1.4, H, size / 1.4, kit.mat(P.water, { roughness: 0.15 }), {
          cast: false,
        }),
        0.5,
      );
      b.position.y = H * 0.6;
      g.add(b);
      body = b;
    } else if (m.kind === 'paving') {
      const b = kit.outline(kit.box(size, H, size, kit.mat(P.roadLight), { cast: false }), 0.4);
      b.position.y = H / 2;
      g.add(b);
      body = b;
    } else {
      // Unknown text still draws: nothing valued may vanish.
      const b = kit.outline(
        kit.box(size, H, size, kit.glassMat(0.35, P.amber)),
        0.9,
        P.amber,
        true,
      );
      b.position.y = H / 2;
      g.add(b);
      body = b;
    }
    kit.pick(body, m.info);
    site.add(g);
    if (m.kind !== 'paving' && m.kind !== 'pool') kit.risers.push(g);
    const half = ['paving', 'canopy', 'pool'].includes(m.kind) ? size / 2 + 0.5 : size / 2 + 1;
    occupied.push({ x: sx, z: sz, hx: half, hz: half });
    impAnchor = impAnchor ?? new Vector3(sx, top + 3, sz);
  }
  // Nothing valued may vanish: an item with no room says so, and the callout stays even if none fit.
  if (spec.improvementsCallout) {
    kit.callout(impAnchor ?? new Vector3(land.cx, top + 3, land.cz), {
      ...spec.improvementsCallout,
      ...pieceText(
        spec.improvements.map(
          (i): Piece => [
            env.t('rows.item'),
            unplaced.has(i) ? `${i.text} (${env.t('notes.improvementNoRoom')})` : i.text,
          ],
        ),
      ),
    });
  }
  if (spec.fence) fence(kit, poly, top, spec.fence);

  // Pond: the area is recorded (unit assumed m2), the position is not. The free spot nearest the
  // middle of the parcel, behind the buildings rather than in front of them, so it stays with the
  // subject; shrunk if nothing fits. Candidates are a grid over the parcel, so any LandShape works.
  if (spec.pond) {
    const r0 = Math.sqrt(spec.pond.area / Math.PI);
    let r = r0;
    // Cell centres, per axis: a narrow parcel still gets a column down its middle.
    const cells = (min: number, span: number, rad: number) => {
      const n = Math.min(48, Math.max(1, Math.ceil(span / Math.max(rad, span / 24, 1))));
      return Array.from({ length: n }, (_, i) => min + (span / n) * (i + 0.5));
    };
    const spots = (rad: number) => {
      const pts: [number, number, number][] = [];
      for (const z of cells(land.back, land.depth, rad)) {
        for (const px of cells(land.minX, land.width, rad)) {
          const dz = z - land.cz;
          pts.push([px, z, Math.hypot(px - land.cx, dz) * (dz > 0 ? 1.6 : 1)]);
        }
      }
      return pts.sort((a, b) => a[2] - b[2]);
    };
    for (let k = 0; k < 8 && !pond; k++) {
      const c = spots(r).find(([px, pz]) => clear(px, pz, r + 1.5));
      if (c) pond = { x: c[0], z: c[1], r };
      else r *= 0.8;
    }
    const placed = pond as { x: number; z: number; r: number } | null;
    if (placed) {
      const bank = kit.mesh(
        new CylinderGeometry(placed.r + 0.8, placed.r + 1, 0.06, 48),
        kit.mat(P.soil),
        { cast: false },
      );
      bank.position.set(placed.x, top + 0.02, placed.z);
      bank.userData.subject = true;
      const water = kit.mesh(
        new CylinderGeometry(placed.r, placed.r, 0.08, 48),
        kit.mat(P.water, { roughness: 0.15, metalness: 0.1 }),
        { cast: false },
      );
      water.position.set(placed.x, top + 0.05, placed.z);
      site.add(bank, kit.pick(water, spec.pond.info));
      kit.callout(
        new Vector3(placed.x, top, placed.z),
        {
          title: spec.pond.info.title,
          ...pieceText([[env.t('rows.area'), spec.pond.note]]),
          priority: 3,
        },
        true,
      );
    } else {
      kit.callout(
        new Vector3(land.cx, top, land.back + 2),
        {
          title: spec.pond.info.title,
          ...pieceText([
            [env.t('rows.area'), spec.pond.note],
            [env.t('rows.note'), env.t('notes.pondNoRoom')],
          ]),
          priority: 3,
        },
        true,
      );
    }
  }

  // Commercial: a paved forecourt with parking bays along the frontage.
  if (use.commercial) {
    let depth = 9;
    while (
      depth > 3 &&
      [0.15, 0.5, 0.85].some(
        t => !clear(poly[0].x + (poly[1].x - poly[0].x) * t, front - depth / 2 - 0.5, depth / 2),
      )
    ) {
      depth -= 2;
    }
    if (depth > 3) {
      const w = land.frontage - 2;
      const z = front - depth / 2 - 0.5;
      const cx = (poly[0].x + poly[1].x) / 2;
      const lot = kit.mesh(new BoxGeometry(w, 0.04, depth), kit.mat(P.road), { cast: false });
      lot.position.set(cx, top + 0.02, z);
      site.add(kit.pick(lot, spec.useInfo.parking));
      const bays: Xform[] = [];
      for (let bx = cx - w / 2 + 1.5; bx < cx + w / 2 - 1; bx += 2.6)
        bays.push([bx, top + 0.05, z]);
      site.add(
        kit.instanced(new BoxGeometry(0.12, 0.02, depth * 0.7), kit.mat(0xffffff), bays, {
          cast: false,
        }),
      );
      occupied.push({ x: cx, z, hx: w / 2, hz: depth / 2 });
    }
  }

  // Agricultural: crop rows; behind the house when the land is also residential.
  const split = use.residential && use.agricultural ? land.cz : Infinity;
  if (use.agricultural) {
    const cells: Xform[] = [];
    // Rows and plants thin out with the parcel, so a huge one stays a few thousand instances.
    const rowGap = Math.max(2.4, Math.sqrt((land.width * land.depth) / 2500));
    const colGap = (rowGap * 2) / 3;
    const scale = rowGap / 2.4;
    for (let z = land.back + 1.5; z < Math.min(front - 1.5, split); z += rowGap) {
      for (let cx = land.minX + 1; cx < land.maxX - 1; cx += colGap) {
        if (cells.length >= MAX_CROPS) break;
        if (clear(cx, z, 0.9)) cells.push([cx, top + 0.25, z, 0, scale, 1]);
      }
    }
    site.add(
      kit.pick(
        kit.instanced(
          new BoxGeometry(1.4, 0.5, 0.9),
          kit.mat(P.crop, { flatShading: true }),
          cells,
        ),
        spec.useInfo.crops,
      ),
    );
  }

  // Residential: trees in the free garden space.
  if (use.residential) {
    const r = rng(11);
    const spots: [number, number][] = [];
    const want = Math.min(40, Math.max(6, Math.round((land.width * land.depth) / 90)));
    for (let k = 0; k < 900 && spots.length < want; k++) {
      const tx = land.minX + r() * land.width;
      const tz = land.back + r() * land.depth;
      if (use.agricultural && tz < split) continue;
      if (!clear(tx, tz, 2.2) || spots.some(p => Math.hypot(p[0] - tx, p[1] - tz) < 3.4)) continue;
      spots.push([tx, tz]);
    }
    trees(kit, spots, top, spec.useAssumed ? null : spec.useInfo.trees);
  }
  kit.leave();

  const b = new Box3().setFromObject(land.mesh);
  neighbours(kit, spec.neighbours, { minX: b.min.x, maxX: b.max.x, minZ: b.min.z, maxZ: b.max.z });
  // A big parcel is framed on the buildings and its corners leave the canvas (or the camera), so
  // its callouts anchor at the middle, where the buildings are; a small one keeps the corner. The
  // engine frames by the same reading of the world, so the two never disagree.
  const { big } = sceneSpheres(outer);
  const middle = () => site.localToWorld(new Vector3(land.cx, top, land.cz));
  if (spec.parcel.callout) {
    kit.callout(
      big ? middle() : site.localToWorld(new Vector3(poly[0].x + 2, top, poly[0].z - 2)),
      overhangNote
        ? withPiece(spec.parcel.callout, env.t('rows.note'), overhangNote)
        : spec.parcel.callout,
      true,
    );
  }
  if (spec.legal) {
    kit.callout(big ? middle() : new Vector3(b.max.x, top, b.max.z), spec.legal);
  }
}

// ── condo ────────────────────────────────────────────────────────────────────

function buildCondo(kit: Kit, spec: CondoSceneSpec) {
  const { P } = kit;
  const floors = spec.floors;
  const fh = 3;
  const { has } = spec;
  // Nothing recorded about the facilities: they are scenery, and answer nothing.
  const quiet = spec.facilitiesAssumed;
  // Site, podium, tower footprint and where each facility sits are not recorded: all assumed.
  // What is drawn follows FacilityType.
  const siteW = 120;
  const siteD = 72;
  const top = 0.45;
  const front = siteD / 2;
  const site = kit.outline(
    kit.box(siteW, top, siteD, kit.mat(has.garden ? P.lawn : P.land), { cast: false }),
    0.3,
  );
  site.position.y = top / 2;
  kit.world.add(site);
  const roadW = spec.roadWidth > 0 ? spec.roadWidth : 6;
  const road = kit.strip(
    true,
    0,
    front + 1 + roadW / 2,
    siteW + 120,
    roadW,
    ROAD_TOP / 2,
    ROAD_TOP,
    kit.mat(surfaceColor(kit, spec.roadSurface)),
  );
  road.userData.noFit = true;
  kit.world.add(kit.pick(road, spec.roadInfo));
  if (spec.water && spec.waterInfo) {
    const sea = spec.water === 'sea';
    const water = kit.strip(
      true,
      0,
      front + 1 + roadW + (sea ? 70 : 24),
      siteW + 300,
      sea ? 130 : 40,
      0.05,
      0.1,
      kit.mat(P.water, { roughness: 0.2 }),
    );
    water.userData.noFit = true;
    kit.world.add(kit.pick(water, spec.waterInfo));
  }

  const pw = 64;
  const pd = 40;
  const px = -14;
  const pz = front - 6 - pd / 2;
  const podiumH = 2 * 3.6;
  // A low tower has no podium to stand on: it would merge with it into one long slab. Its
  // facilities stand on the ground beside it instead, close, and are part of what the camera frames.
  const lowTower = floors <= LOW_TOWER_FLOORS;
  const onPodium = spec.deckUse && !lowTower;
  if (onPodium) {
    const podium = building(kit, { w: pw, d: pd, floors: 2, fh: 3.6 });
    podium.group.position.set(px, top, pz);
    podium.group.userData.subject = true;
    kit.world.add(podium.group);
    if (!spec.facilitiesAssumed) kit.pick(podium.body, spec.podiumInfo);
  }
  const tw = 34;
  const td = 18;
  const tx = px - pw / 2 + tw / 2;
  const tz = pz + pd / 2 - td / 2 + 0.01;
  const tower = building(kit, { w: tw, d: td, floors, fh, type: '05', under: spec.under });
  tower.group.position.set(tx, top, tz);
  tower.group.userData.subject = true;
  tower.group.userData.obstacle = true;
  kit.world.add(tower.group);
  kit.pick(tower.body, spec.towerInfo);

  // The deck sits on the podium's roof slab, or the items sink into it.
  const deckY = onPodium ? top + podiumH + 0.35 : top;
  const dx = tx + tw / 2;
  // Where each facility stands: on the podium deck, or (low tower) in a cluster beside the tower.
  const at = onPodium
    ? { pool: [dx + 15, pz + 4], gym: [dx + 15, pz - 9], club: [dx + 26, pz - 12] }
    : { pool: [dx + 14, tz - 5], gym: [dx + 8, tz + 8], club: [dx + 21, tz + 7] };
  // What stands on the podium deck appears when the podium has risen, not before it.
  const deckFrom = kit.world.children.length;
  let deckDone = false;
  const deckItems = () => {
    if (deckDone) return;
    deckDone = true;
    if (spec.deckUse) kit.risersAfter.push(...kit.world.children.slice(deckFrom));
  };
  if (has.pool)
    facilityPool(kit, at.pool[0], deckY, at.pool[1], quiet ? null : spec.facilityInfo.pool);
  if (has.fitness)
    facilityGym(kit, at.gym[0], deckY, at.gym[1], quiet ? null : spec.facilityInfo.fitness);
  if (has.club)
    facilityClub(kit, at.club[0], deckY, at.club[1], quiet ? null : spec.facilityInfo.club);
  // Beside a low tower the facilities are part of the subject: the camera frames them, so none ends under a card.
  if (lowTower) kit.world.children.slice(deckFrom).forEach(o => (o.userData.subject = true));
  if (has.garden) {
    const gardenInfo = quiet ? null : { title: kit.env.label('Facilities', '08'), rows: [] };
    // On the podium deck, and on the ground round the site: the ones outside the podium's
    // footprint stand on the ground, not 8 m up in the air.
    trees(
      kit,
      [
        ...(onPodium
          ? ([
              [dx + 4, pz + 14],
              [dx + 27, pz + 14],
              [dx + 4, pz - 15],
              [dx + 28, pz + 3],
            ] as [number, number][])
          : ([
              [dx + 28, tz - 5],
              [dx + 28, tz + 4],
              [dx + 2, tz + 14],
            ] as [number, number][])),
      ],
      deckY,
      gardenInfo,
    );
    deckItems();
    trees(
      kit,
      [
        [-siteW / 2 + 6, front - 6],
        [-siteW / 2 + 6, -front + 8],
        [siteW / 2 - 6, -front + 8],
      ],
      top,
      gardenInfo,
    );
  }
  deckItems();
  if (has.stadium) {
    const court = kit.outline(
      kit.box(28, 0.06, 15, kit.mat(P.crop), { cast: false }),
      0.9,
      0xffffff,
    );
    court.position.set(siteW / 2 - 20, top + 0.03, -front + 12);
    kit.world.add(quiet ? court : kit.pick(court, spec.facilityInfo.stadium));
  }
  if (has.parking) {
    const park = building(kit, { w: 24, d: 32, floors: 6, fh: 2.8, glass: true });
    park.group.position.set(siteW / 2 - 18, top, front - 8 - 16);
    kit.world.add(park.group);
    if (!quiet) kit.pick(park.body, spec.facilityInfo.parking);
  }

  // The unit's place on its floor is not recorded; LocationView hints at it.
  const amber = kit.mat(P.amber, { emissive: P.amber, emissiveIntensity: 0.45 });
  const ringed = new Set<number>();
  // Every unit on a floor is laid out in one pass: each keeps its slot's place where it can, and
  // none overlaps another.
  const unitX = new Map<number, number>();
  const byFloor = groupBy(
    spec.units.flatMap((u, i) => (u.floor === null ? [] : [i])),
    i => spec.units[i].floor as number,
  );
  const lim = tw / 2 - 3.3;
  const prefer = { end: tx + tw / 2 - 3.6, middle: tx, start: tx - tw / 2 + 5 };
  for (const ids of byFloor.values()) {
    const xs = spreadOnFloor(
      ids.map(i => prefer[spec.units[i].slot]),
      tx - lim,
      tx + lim,
      UNIT_CELL_STEP,
    );
    ids.forEach((i, k) => unitX.set(i, xs[k]));
  }
  spec.units.forEach((u, i) => {
    if (u.floor === null) {
      kit.callout(new Vector3(tx - tw / 2, top, tz + td / 2), u.callout, true);
      return;
    }
    const ux = unitX.get(i) ?? tx;
    if (!ringed.has(u.floor)) {
      ringed.add(u.floor);
      const ring = kit.box(
        tw + 0.5,
        0.22,
        td + 0.5,
        kit.mat(P.amber, { transparent: true, opacity: 0.75 }),
        { cast: false },
      );
      ring.position.set(tx, top + (u.floor - 1) * fh + 0.11, tz);
      kit.risersAfter.push(ring);
      kit.world.add(ring);
    }
    const cell = kit.box(6.5, fh * 0.82, 0.8, amber, { cast: false });
    cell.position.set(ux, top + (u.floor - 0.5) * fh, tz + td / 2 + 1.5);
    kit.risersAfter.push(cell);
    kit.world.add(kit.pick(cell, u.info));
    kit.callout(
      new Vector3(ux, top + (u.floor - 0.5) * fh, tz + td / 2 + 1.8),
      u.callout,
      i % 2 === 0,
    );
  });

  kit.callout(new Vector3(tx, top + floors * fh + 3, tz), spec.towerCallout);
  if (spec.facilitiesCallout) {
    kit.callout(
      new Vector3(at.pool[0], spec.deckUse ? deckY : top, at.pool[1]),
      spec.facilitiesCallout,
    );
  }
  if (spec.legal) kit.callout(new Vector3(siteW / 2 - 6, top, front - 4), spec.legal);
}

// ── block project ────────────────────────────────────────────────────────────

function buildBlock(kit: Kit, spec: BlockSceneSpec) {
  const { P, env } = kit;
  const towers = spec.towers;
  const { has } = spec;
  // Nothing recorded about the facilities: they are scenery, and answer nothing.
  const quiet = spec.facilitiesAssumed;
  // The brief has no project parcel shape, so a square of the recorded area; tower footprints and
  // placement are not recorded either.
  const tw = 24;
  const td = 16;
  const gap = 10;
  let side = Math.sqrt(Math.max(spec.sqm ?? 0, 1));
  // Up to 12 towers: one row to 6, two rows beyond, so the group stays compact.
  const rows = towers.length > 6 ? 2 : 1;
  const cols = Math.ceil(towers.length / rows);
  const rowStep = td + gap + 6;
  // A podium with the deck facilities stands in front of the towers, as a condo's does.
  const podiumD = 22;
  const podiumZone = spec.deckUse ? podiumD + 10 : 0;
  const podiumH = 2 * 3.6;
  const need = Math.max(
    cols * (tw + gap) + 12,
    spec.deckUse ? 56 : 0,
    rows * rowStep + 12 + podiumZone,
    td + 20,
  );
  const widened = side < need;
  side = Math.max(side, need);
  const site = kit.box(side, LAND_TOP, side, kit.mat(has.garden ? P.lawn : P.land), {
    cast: false,
  });
  site.position.y = LAND_TOP / 2;
  kit.world.add(kit.outline(site, widened ? 0.9 : 0.3, P.edge, widened));
  kit.pick(site, {
    title: spec.landInfo.title,
    rows: [
      ...spec.landInfo.rows,
      ...(widened ? [{ label: env.t('rows.note'), value: env.t('notes.plotWidened') }] : []),
    ],
  });
  // The access road along the front; its width and surface where they are recorded.
  const roadW = spec.roadWidth > 0 ? spec.roadWidth : 6;
  const road = kit.strip(
    true,
    0,
    side / 2 + 1 + roadW / 2,
    side + 120,
    roadW,
    ROAD_TOP / 2,
    ROAD_TOP,
    kit.mat(surfaceColor(kit, spec.roadSurface)),
  );
  road.userData.noFit = true;
  kit.world.add(spec.roadInfo ? kit.pick(road, spec.roadInfo) : road);

  // Rows of towers, set back to leave the podium its place at the front.
  const rowZ = (row: number) => (row - (rows - 1) / 2) * rowStep - podiumZone / 2;
  if (spec.deckUse) {
    const pw = Math.min(side - 12, Math.max(cols * (tw + gap), 56));
    const pz = rowZ(rows - 1) + td / 2 + 4 + podiumD / 2;
    const podium = building(kit, { w: pw, d: podiumD, floors: 2, fh: 3.6 });
    podium.group.position.set(0, LAND_TOP, pz);
    kit.world.add(podium.group);
    if (!quiet) kit.pick(podium.body, spec.podiumInfo);
    const deckY = LAND_TOP + podiumH + 0.35;
    const deckFrom = kit.world.children.length;
    // Facilities on the deck, spread across it: each takes the width it needs.
    const items = [
      has.pool && {
        w: 20,
        put: (x: number) => facilityPool(kit, x, deckY, pz, quiet ? null : spec.facilityInfo.pool),
      },
      has.fitness && {
        w: 10,
        put: (x: number) =>
          facilityGym(kit, x, deckY, pz, quiet ? null : spec.facilityInfo.fitness),
      },
      has.club && {
        w: 9,
        put: (x: number) => facilityClub(kit, x, deckY, pz, quiet ? null : spec.facilityInfo.club),
      },
    ].filter(Boolean) as { w: number; put: (x: number) => void }[];
    const free = pw - 8 - items.reduce((n, i) => n + i.w, 0);
    const step = Math.max(2, free / (items.length + 1));
    let x = -pw / 2 + 4 + step;
    for (const it of items) {
      it.put(x + it.w / 2);
      x += it.w + step;
    }
    if (has.garden) {
      const gardenInfo = quiet ? null : { title: kit.env.label('Facilities', '08'), rows: [] };
      trees(
        kit,
        [
          [-pw / 2 + 3, pz - podiumD / 2 + 3],
          [pw / 2 - 3, pz - podiumD / 2 + 3],
          [-pw / 2 + 3, pz + podiumD / 2 - 3],
          [pw / 2 - 3, pz + podiumD / 2 - 3],
        ],
        deckY,
        gardenInfo,
      );
    }
    // What stands on the deck appears when the podium has risen, not before it.
    kit.risersAfter.push(...kit.world.children.slice(deckFrom));
  }
  if (has.garden) {
    const gardenInfo = quiet ? null : { title: kit.env.label('Facilities', '08'), rows: [] };
    trees(
      kit,
      [
        [-side / 2 + 6, side / 2 - 6],
        [side / 2 - 6, side / 2 - 6],
        [-side / 2 + 6, -side / 2 + 8],
        [side / 2 - 6, -side / 2 + 8],
      ],
      LAND_TOP,
      gardenInfo,
    );
  }
  // The court and the car park take the back corners, where the site has the room.
  const room = side - need >= 36;
  if (has.stadium && room) {
    const court = kit.outline(
      kit.box(28, 0.06, 15, kit.mat(P.crop), { cast: false }),
      0.9,
      0xffffff,
    );
    court.position.set(side / 2 - 20, LAND_TOP + 0.03, -side / 2 + 12);
    kit.world.add(quiet ? court : kit.pick(court, spec.facilityInfo.stadium));
  }
  if (has.parking && room) {
    const park = building(kit, { w: 24, d: 32, floors: 6, fh: 2.8, glass: true });
    park.group.position.set(-side / 2 + 18, LAND_TOP, -side / 2 + 22);
    kit.world.add(park.group);
    if (!quiet) kit.pick(park.body, spec.facilityInfo.parking);
  }

  const cells: Xform[] = [];
  const colors: Color[] = [];
  const meta: { tower: string; floor: number; sold: boolean }[] = [];
  // The units the drawn towers record, whether or not a floor of them is known: each is a cell or counted.
  const planned = towers.reduce((n, t) => n + t.units, 0);
  towers.forEach((t, i) => {
    const col = i % cols;
    const row = Math.floor(i / cols);
    const inRow = Math.min(cols, towers.length - row * cols);
    const x = (col - (inRow - 1) / 2) * (tw + gap);
    const z = rowZ(row);
    const b = building(kit, { w: tw, d: td, floors: t.floors, type: '05' });
    b.group.position.set(x, LAND_TOP, z);
    b.group.userData.subject = true;
    b.group.userData.obstacle = true;
    kit.world.add(b.group);
    kit.pick(b.body, t.info);
    // One cell per unit, on the floor ProjectUnits records for it; the first `sold` of a floor are the sold ones.
    for (const f of t.perFloor) {
      const perSide = Math.ceil(f.units / 2);
      const cw = tw / perSide;
      for (let k = 0; k < f.units && cells.length < MAX_CELLS; k++) {
        const face = k % 2 ? -1 : 1;
        const pos = Math.floor(k / 2);
        const isSold = k < f.sold;
        cells.push([
          x - tw / 2 + cw * (pos + 0.5),
          LAND_TOP + (f.floor - 0.5) * FLOOR_H,
          z + face * (td / 2 + 0.16),
          0,
          cw / 2.4,
          1,
        ]);
        colors.push(isSold ? P.sold : P.glass);
        meta.push({ tower: t.name, floor: f.floor, sold: isSold });
      }
    }
  });
  if (cells.length) {
    const im = kit.instanced(
      new BoxGeometry(2.4 * 0.84, FLOOR_H * 0.66, 0.3),
      kit.mat(0xffffff),
      cells,
      { cast: false, colors },
    );
    // They appear with the towers' rise finishing, or they hang in the air while the towers grow.
    kit.risersAfter.push(im);
    kit.world.add(
      kit.pick(im, { title: env.t('titles.units'), rows: [] }, i => {
        const m = meta[i];
        return { title: env.t('titles.units'), rows: blockCellRows(env, m.tower, m.floor, m.sold) };
      }),
    );
  }
  const tallest = Math.max(1, ...towers.map(t => t.floors));
  // What is not drawn is said, as a count: towers past the cap, and units past the cell cap.
  const notDrawn = planned - cells.length;
  let main = spec.callout;
  if (spec.hiddenTowers > 0)
    main = withPiece(
      main,
      env.t('rows.note'),
      env.t('values.moreTowers', { n: env.nf(spec.hiddenTowers) }),
    );
  if (notDrawn > 0)
    main = withPiece(
      main,
      env.t('rows.note'),
      env.t('values.unitsNotDrawn', { n: env.nf(notDrawn) }),
    );
  kit.callout(new Vector3(0, LAND_TOP + tallest * FLOOR_H + 3, 0), main);
  kit.callout(
    new Vector3(side / 2 - 4, LAND_TOP, side / 2 - 4),
    widened
      ? withPiece(spec.landCallout, env.t('rows.note'), env.t('notes.plotWidenedShort'))
      : spec.landCallout,
  );
}

/** Fill `kit.world` for a scene spec. */
export function buildScene(kit: Kit, spec: SceneSpec) {
  if (spec.kind === 'land') buildLand(kit, spec);
  else if (spec.kind === 'condo') buildCondo(kit, spec);
  else if (spec.kind === 'block') buildBlock(kit, spec);
  else buildVillage(kit, spec);
}
