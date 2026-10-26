import {
  BoxGeometry,
  type BufferGeometry,
  Color,
  ConeGeometry,
  CylinderGeometry,
  ExtrudeGeometry,
  Group,
  Float32BufferAttribute,
  IcosahedronGeometry,
  type Material,
  type Mesh,
  Object3D,
  Shape,
  Vector2,
} from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { Kit, rng, type Pt, type Xform } from './kit';
import { FLOOR_H, type FenceSpec, IMPROVEMENT_HEIGHT, type Info, type RoofStyle } from './model';
import type { Palette, PaletteKey } from './palette';

/**
 * Roof forms. Only the roof MATERIAL is recorded; the form is assumed from BuildingType and an RC
 * roof is always flat (decided in the model). Overhang 0.6 m.
 */
export function roofMesh(
  kit: Kit,
  style: RoofStyle,
  w: number,
  d: number,
  material: Material,
): { object: Object3D; height: number } {
  const oh = 0.6;
  const W = w + oh * 2;
  const D = d + oh * 2;
  let m: Mesh;
  let height: number;
  if (style === 'hip') {
    height = Math.min(w, d) * 0.3;
    const g = new ConeGeometry(1, height, 4, 1);
    g.rotateY(Math.PI / 4);
    g.translate(0, height / 2, 0);
    m = kit.mesh(g, material);
    m.scale.set(W / Math.SQRT2, 1, D / Math.SQRT2);
  } else if (style === 'gable' || style === 'gable-low') {
    height = w * (style === 'gable' ? 0.3 : 0.12);
    const g = new ExtrudeGeometry(
      new Shape([new Vector2(-W / 2, 0), new Vector2(W / 2, 0), new Vector2(0, height)]),
      { depth: D, bevelEnabled: false },
    );
    g.translate(0, 0, -D / 2);
    m = kit.mesh(g, material);
  } else if (style === 'sawtooth') {
    const n = Math.max(2, Math.round(w / 9));
    const sw = W / n;
    height = sw * 0.42;
    const g = new Group();
    for (let i = 0; i < n; i++) {
      const x0 = -W / 2 + i * sw;
      const sg = new ExtrudeGeometry(
        new Shape([new Vector2(x0, 0), new Vector2(x0 + sw, 0), new Vector2(x0, height)]),
        { depth: D, bevelEnabled: false },
      );
      sg.translate(0, 0, -D / 2);
      g.add(kit.outline(kit.mesh(sg, material), 0.5));
    }
    return { object: g, height };
  } else {
    height = 0.35;
    m = kit.box(w + 0.3, height, d + 0.3, material);
    m.position.y = 0.17;
  }
  return { object: kit.outline(m, 0.5), height };
}

interface SlotOpts {
  faces?: string;
  from?: number;
  yAt?: number;
  out?: number;
}

/** Window / door / balcony slots on a building's faces: f(ront) b(ack) L R, one row per storey. */
export function facadeSlots(
  w: number,
  d: number,
  floors: number,
  fh: number,
  spacing: number,
  { faces = 'fbLR', from = 0, yAt = 0.55, out = 0.06 }: SlotOpts = {},
): Xform[] {
  const slots: Xform[] = [];
  const n = Math.max(1, Math.floor(w / spacing));
  const m = Math.max(1, Math.floor(d / spacing));
  for (let f = from; f < floors; f++) {
    const y = f * fh + fh * yAt;
    for (let i = 0; i < n; i++) {
      const x = -w / 2 + ((i + 0.5) * w) / n;
      if (faces.includes('f')) slots.push([x, y, d / 2 + out, 0]);
      if (faces.includes('b')) slots.push([x, y, -d / 2 - out, 0]);
    }
    for (let j = 0; j < m; j++) {
      const z = -d / 2 + ((j + 0.5) * d) / m;
      if (faces.includes('L')) slots.push([-w / 2 - out, y, z, Math.PI / 2]);
      if (faces.includes('R')) slots.push([w / 2 + out, y, z, Math.PI / 2]);
    }
  }
  return slots;
}

/**
 * The details that make each BuildingType read as itself: windows, doors, balconies, signage,
 * chimney, loading dock. All assumed; only the type, storeys and area are recorded.
 */
function dress(
  kit: Kit,
  g: Group,
  type: string | null,
  w: number,
  d: number,
  floors: number,
  fh: number,
) {
  const { P } = kit;
  const whole = Math.floor(floors + 1e-6);
  const H = floors * fh;
  if (!type || whole < 1) return;
  const add = (
    geo: BoxGeometry,
    material: Material,
    t: Xform[],
    o: { cast?: boolean } = { cast: false },
  ) => {
    if (t.length) g.add(kit.instanced(geo, material, t, o));
  };
  const win = kit.mat(P.window, { roughness: 0.25, metalness: 0.2 });
  const steel = kit.mat(P.steel, { roughness: 0.5, metalness: 0.3 });
  const windows = (spacing: number, ww: number, wh: number, opts?: SlotOpts) =>
    add(new BoxGeometry(ww, wh, 0.12), win, facadeSlots(w, d, whole, fh, spacing, opts));
  const part = (
    geo: BoxGeometry | CylinderGeometry,
    material: Material,
    x: number,
    y: number,
    z: number,
    cast = true,
  ) => {
    const m = kit.outline(kit.mesh(geo, material, { cast }), 0.5);
    m.position.set(x, y, z);
    g.add(m);
    return m;
  };
  const balconies = (spacing: number, faces = 'fb') => {
    const slots = facadeSlots(w, d, whole, fh, spacing, { faces, from: 1, yAt: 0, out: 0.6 });
    const bw = (w / Math.max(1, Math.floor(w / spacing))) * 0.8;
    add(new BoxGeometry(bw, 0.18, 1.2), kit.mat(P.mass), slots, { cast: true });
    add(
      new BoxGeometry(bw, 1.0, 0.06),
      kit.glassMat(0.45),
      slots.map(([x, y, z, r]) => [x, y + 0.55, z + Math.sign(z) * 0.6, r] as Xform),
    );
  };
  const door = (x = 0) =>
    part(new BoxGeometry(1.1, 2.2, 0.12), kit.mat(P.trunk), x, 1.1, d / 2 + 0.06, false);

  if (type === '01' || type === '03') {
    // detached / twin house
    windows(3.2, 1.4, 1.3);
    door(w * 0.15);
    if (type === '01')
      part(new BoxGeometry(2.8, 0.15, 1.8), kit.mat(P.roof), w * 0.15, 2.6, d / 2 + 0.9);
  } else if (type === '04') {
    // townhouse
    windows(3, 1.4, 1.3, { faces: 'fb' });
    door(-w * 0.2);
    balconies(w, 'f');
  } else if (type === '02') {
    // shophouse: roll-up shutter, awning, upper windows
    part(new BoxGeometry(w * 0.86, fh * 0.75, 0.12), steel, 0, fh * 0.38, d / 2 + 0.06, false);
    const ribs: Xform[] = [];
    for (let y = 0.3; y < fh * 0.74; y += 0.3) ribs.push([0, y, d / 2 + 0.14]);
    add(new BoxGeometry(w * 0.86, 0.04, 0.04), kit.mat(P.band), ribs);
    part(new BoxGeometry(w + 0.2, 0.15, 1.6), kit.mat(P.roof), 0, fh, d / 2 + 0.8);
    windows(2.2, 1.4, 1.6, { faces: 'fb', from: 1 });
  } else if (['05', '12', '13'].includes(type)) {
    // condominium / residential building / apartment
    windows(3.4, 1.8, 1.6);
    balconies(3.4);
  } else if (type === '07') {
    // office: curtain wall
    const mull: Xform[] = [];
    for (let x = -w / 2; x <= w / 2 + 0.01; x += 1.8)
      mull.push([x, H / 2, d / 2 + 0.08], [x, H / 2, -d / 2 - 0.08]);
    for (let z = -d / 2; z <= d / 2 + 0.01; z += 1.8)
      mull.push([w / 2 + 0.08, H / 2, z], [-w / 2 - 0.08, H / 2, z]);
    add(new BoxGeometry(0.14, H, 0.14), steel, mull);
    part(new BoxGeometry(Math.min(10, w * 0.5), 0.3, 4), kit.mat(P.mass), 0, 4, d / 2 + 2);
    part(new BoxGeometry(w * 0.3, 3, d * 0.3), kit.mat(P.band), w * 0.15, H + 1.85, -d * 0.1);
  } else if (type === '08') {
    // hotel: porte-cochere and rooftop sign
    windows(3.4, 1.8, 1.6);
    balconies(3.4, 'f');
    part(new BoxGeometry(12, 0.4, 7), kit.mat(P.mass), 0, 4.6, d / 2 + 4.5);
    add(
      new BoxGeometry(0.35, 4.4, 0.35),
      kit.mat(P.mass),
      [
        [-5.5, 2.2, d / 2 + 7.5],
        [5.5, 2.2, d / 2 + 7.5],
      ],
      { cast: true },
    );
    part(
      new BoxGeometry(w * 0.45, 2.2, 0.4),
      kit.mat(P.accent, { emissive: P.accent, emissiveIntensity: 0.3 }),
      0,
      H + 1.6,
      d / 2 - 0.4,
    );
  } else if (type === '09') {
    // shopping centre: glass entrance, sign band, skylights
    const entH = Math.min(H, fh * 2) + 2;
    part(
      new BoxGeometry(w * 0.3, entH, 7),
      kit.glassMat(0.45, P.curtain),
      0,
      entH / 2,
      d / 2 + 3.5,
    );
    part(
      new BoxGeometry(w * 0.55, 2.6, 0.4),
      kit.mat(P.amber, { emissive: P.amber, emissiveIntensity: 0.25 }),
      0,
      H - 1.6,
      d / 2 + 0.25,
      false,
    );
    const sky: Xform[] = [];
    for (let x = -w / 2 + 6; x < w / 2 - 4; x += 8) sky.push([x, H + 0.45, 0]);
    add(new BoxGeometry(2.5, 0.25, d * 0.6), kit.glassMat(0.6, P.curtain), sky);
    windows(6, 4, 1.4, { faces: 'LR', yAt: 0.6 });
  } else if (type === '10') {
    // factory: clerestory, big doors, chimney
    windows(4.5, 2.6, 0.9, { faces: 'LR', yAt: 0.82 });
    const doors: Xform[] = [];
    for (let x = -w / 2 + 8; x < w / 2 - 4; x += 14) doors.push([x, 2.6, d / 2 + 0.07]);
    add(new BoxGeometry(5, 5.2, 0.12), steel, doors);
    const { x: cx, z: cz, scale: cs } = chimneyOf(w, d);
    const stack = 14 * cs;
    part(
      new CylinderGeometry(0.9 * cs, 1.2 * cs, H + stack, 16),
      kit.mat(P.band),
      cx,
      (H + stack) / 2,
      cz,
    );
    part(
      new CylinderGeometry(1.0 * cs, 1.0 * cs, 1.2 * cs, 16),
      kit.mat(P.danger),
      cx,
      H + stack - 0.6 * cs,
      cz,
      false,
    );
  } else if (type === '11') {
    // warehouse: corrugated walls, dock doors, loading apron
    const ribs: Xform[] = [];
    for (let x = -w / 2 + 0.6; x < w / 2; x += 1.2)
      ribs.push([x, H / 2, d / 2 + 0.05], [x, H / 2, -d / 2 - 0.05]);
    for (let z = -d / 2 + 0.6; z < d / 2; z += 1.2)
      ribs.push([w / 2 + 0.05, H / 2, z], [-w / 2 - 0.05, H / 2, z]);
    add(new BoxGeometry(0.1, H, 0.1), kit.mat(P.band), ribs);
    const doors: Xform[] = [];
    for (let x = -w / 2 + 5; x < w / 2 - 3; x += 8) doors.push([x, 1.2 + 2.5, d / 2 + 0.12]);
    add(new BoxGeometry(4, 5, 0.12), steel, doors);
    part(new BoxGeometry(w * 0.85, 1.2, 3.2), kit.mat(P.roadLight), 0, 0.6, d / 2 + 1.6);
  }
}

/**
 * A factory's chimney, in the building's own frame (origin at its centre): the back-right corner.
 * It scales with the building: full size from about 40 m of footprint side, a short stub on a tiny
 * shell. `r` is the radius of its base, which the machines inside must keep clear of.
 */
export function chimneyOf(w: number, d: number) {
  const scale = Math.min(1, Math.max(0.35, Math.sqrt(w * d) / 40));
  return { x: w / 2 - 3 * scale, z: -d / 2 + 3 * scale, r: 1.2 * scale, scale };
}

export interface BuildingOpts {
  w: number;
  d: number;
  floors: number;
  fh?: number;
  roofStyle?: RoofStyle;
  roofColor?: PaletteKey;
  under?: boolean;
  glass?: boolean;
  type?: string | null;
  /** False for a prototype that is only copied from and never added to the world: it does not rise. */
  rise?: boolean;
}

/**
 * Storeys as one body, a line per whole storey, and a roof in the roof material's colour.
 * Under construction: the lower half stands finished and the rest is bare frame, columns and
 * slabs, no walls or roof.
 */
export function building(kit: Kit, o: BuildingOpts) {
  const { P } = kit;
  const {
    w,
    d,
    floors,
    fh = FLOOR_H,
    roofStyle = 'flat',
    roofColor = 'roof',
    under = false,
    glass = false,
    type = null,
    rise = true,
  } = o;
  const g = new Group();
  const H = floors * fh;
  // ponytail: IsUnderConstruction is yes/no only, so the half-built split is assumed
  // (the real percentage lives in the construction inspection).
  const built = under ? (floors > 1 ? Math.floor(floors / 2) : 0) : floors;
  let body: Mesh | null = null;
  if (built > 0) {
    body = kit.box(
      w,
      built * fh,
      d,
      glass
        ? kit.glassMat(0.24)
        : type === '07'
          ? kit.mat(P.curtain, {
              roughness: 0.3,
              metalness: 0.05,
              emissive: P.curtain,
              emissiveIntensity: 0.12,
            })
          : kit.mat(P.mass),
      { cast: !glass },
    );
    body.position.y = (built * fh) / 2;
    kit.outline(body, glass ? 0.85 : 0.6);
    g.add(body);
  }
  const lines: Xform[] = [];
  for (let i = 1; i < built; i++) lines.push([0, i * fh, 0]);
  if (lines.length)
    g.add(
      kit.instanced(new BoxGeometry(w + 0.14, 0.12, d + 0.14), kit.mat(P.band), lines, {
        cast: false,
      }),
    );
  dress(kit, g, type, w, d, built, fh);

  let roofH = 0;
  if (under) {
    const rest = (floors - built) * fh;
    const y0 = built * fh;
    const frame = kit.box(w, rest, d, kit.glassMat(0.05), { cast: false });
    frame.position.y = y0 + rest / 2;
    kit.outline(frame, 0.9, P.amber, true);
    g.add(frame);
    body = body ?? frame;
    const cols: Xform[] = [];
    const nx = Math.max(2, Math.round(w / 4));
    const nz = Math.max(2, Math.round(d / 4));
    for (let i = 0; i <= nx; i++) {
      for (let j = 0; j <= nz; j++) {
        if (i > 0 && i < nx && j > 0 && j < nz) continue;
        cols.push([-w / 2 + (w * i) / nx, y0 + rest / 2, -d / 2 + (d * j) / nz]);
      }
    }
    const steel = kit.mat(P.steel, { roughness: 0.5, metalness: 0.3 });
    g.add(kit.instanced(new BoxGeometry(0.4, rest, 0.4), steel, cols));
    // A ring beam round every frame level, and the slab it carries.
    const bx: Xform[] = [];
    const bz: Xform[] = [];
    const slabs: Xform[] = [];
    for (let k = 1; k <= floors - built; k++) {
      const y = y0 + k * fh;
      bx.push([0, y, -d / 2], [0, y, d / 2]);
      bz.push([-w / 2, y, 0], [w / 2, y, 0]);
      slabs.push([0, y - 0.15, 0]);
    }
    g.add(kit.instanced(new BoxGeometry(w + 0.4, 0.4, 0.3), steel, bx));
    g.add(kit.instanced(new BoxGeometry(0.3, 0.4, d + 0.4), steel, bz));
    g.add(
      kit.instanced(
        new BoxGeometry(w - 0.2, 0.16, d - 0.2),
        kit.mat(P.band, { transparent: true, opacity: 0.6 }),
        slabs.slice(0, -1),
        {
          cast: false,
        },
      ),
    );
    roofH = 0.2;
  } else {
    const roof = roofMesh(
      kit,
      roofStyle,
      w,
      d,
      glass ? kit.glassMat(0.45, P[roofColor]) : kit.mat(P[roofColor], { flatShading: true }),
    );
    roof.object.position.y += H;
    g.add(roof.object);
    roofH = roof.height;
  }
  g.userData.top = H + roofH;
  if (rise) kit.risers.push(g);
  return { group: g, body: body as Mesh };
}

/** Footprint from the recorded area and the assumed depth/width ratio of the building type. */
export function footprint(area: number, floors: number, ratio: number) {
  const fp = area / Math.max(1, floors);
  const w = Math.sqrt(fp / ratio);
  return { w, d: fp / w };
}

/** FenceType says nothing about which sides, so it runs round the whole parcel. */
export function fence(kit: Kit, poly: Pt[], top: number, spec: FenceSpec, height?: number) {
  const { style } = spec;
  const solid = style === 'solid';
  const open = style === 'open';
  const full = IMPROVEMENT_HEIGHT.fence ?? 1.9;
  const h = height ?? (solid ? full : full * 0.8);
  const thick = solid || open ? h : 0.4;
  const material = solid ? kit.mat(kit.P.mass) : kit.glassMat(0.35, kit.P.band);
  for (let i = 0; i < poly.length; i++) {
    const a = poly[i];
    const b = poly[(i + 1) % poly.length];
    const dx = b.x - a.x;
    const dz = b.z - a.z;
    const m = kit.box(Math.hypot(dx, dz), thick, 0.2, material, { cast: solid });
    m.position.set((a.x + b.x) / 2, top + thick / 2, (a.z + b.z) / 2);
    m.rotation.y = -Math.atan2(dz, dx);
    kit.world.add(kit.pick(kit.outline(m, 0.6, kit.P.edge, !solid && !open), spec.info));
  }
}

/** Instanced trunks and crowns; the count and places are assumed. */
/** Trees; with no `info` they are scenery that answers nothing (an assumed garden). */
export function trees(kit: Kit, spots: [number, number][], y: number, info: Info | null) {
  if (!spots.length) return;
  const r = rng(spots.length * 31);
  const t = spots.map(([x, z]) => ({ x, z, s: 0.75 + r() * 0.6, rot: r() * 6 }));
  kit.world.add(
    kit.instanced(
      new CylinderGeometry(0.16, 0.22, 1.8, 5),
      kit.mat(kit.P.trunk),
      t.map(a => [a.x, y + 0.9 * a.s, a.z, 0, a.s] as Xform),
    ),
  );
  const crowns = kit.instanced(
    new IcosahedronGeometry(1.7, 0),
    kit.mat(kit.P.tree, { flatShading: true }),
    t.map(a => [a.x, y + 2.9 * a.s, a.z, a.rot, a.s] as Xform),
  );
  kit.world.add(info ? kit.pick(crowns, info) : crowns);
}

/** Swimming pool, fitness room and club house: shared by the condo deck and a village's common area. */
export function facilityPool(kit: Kit, x: number, y: number, z: number, info: Info | null) {
  const pool = kit.outline(
    kit.box(20, 0.12, 8, kit.mat(kit.P.water, { roughness: 0.15 }), { cast: false }),
    0.4,
  );
  pool.position.set(x, y + 0.07, z);
  kit.world.add(info ? kit.pick(pool, info) : pool);
}

export function facilityGym(kit: Kit, x: number, y: number, z: number, info: Info | null) {
  const gym = kit.outline(kit.box(10, 3.4, 7, kit.glassMat(0.35)), 0.8);
  gym.position.set(x, y + 1.7, z);
  kit.world.add(info ? kit.pick(gym, info) : gym);
}

export function facilityClub(kit: Kit, x: number, y: number, z: number, info: Info | null) {
  const club = kit.outline(kit.box(9, 3.4, 9, kit.mat(kit.P.mass)), 0.6);
  club.position.set(x, y + 1.7, z);
  const { object: roof } = roofMesh(kit, 'gable', 9, 9, kit.mat(kit.P.roof, { flatShading: true }));
  roof.position.set(x, y + 3.4, z);
  kit.world.add(info ? kit.pick(club, info) : club, roof);
}

/**
 * One machine inside a 3.4 x 2.2 x 2.2 m box about its centre: a base, a body, a hopper and a
 * control panel, merged into one geometry painted by vertex colour (the material stays white).
 */
export function machineGeometry(P: Palette): BufferGeometry {
  const part = (g: BufferGeometry, x: number, y: number, z: number, c: Color) => {
    g.translate(x, y, z);
    const n = g.getAttribute('position').count;
    g.setAttribute(
      'color',
      new Float32BufferAttribute(Array.from({ length: n }, () => [c.r, c.g, c.b]).flat(), 3),
    );
    return g;
  };
  return mergeGeometries([
    part(new BoxGeometry(3.4, 0.3, 2.2), 0, -0.95, 0, P.steel),
    part(new BoxGeometry(2.5, 1.3, 1.8), -0.45, -0.15, 0, P.machine),
    part(new CylinderGeometry(0.7, 0.35, 0.7, 8), -0.9, 0.85, 0, P.mass),
    part(new BoxGeometry(0.8, 1.5, 1.2), 1.25, -0.05, 0, P.steel),
  ])!;
}

/**
 * The yard the machines stand in when nothing else is on the request: a concrete apron with
 * painted edge lines and an open shed (posts and a see-through roof) over it, `side` m square
 * about (cx, cz). Scenery only; what stands where is assumed.
 */
export function machineYard(kit: Kit, cx: number, top: number, cz: number, side: number) {
  const { P } = kit;
  const g = new Group();
  const apron = side + 3;
  const slab = kit.box(apron, 0.14, apron, kit.mat(P.band), { cast: false });
  slab.position.set(cx, top + 0.07, cz);
  g.add(kit.outline(slab, 0.5));
  const line = kit.mat(P.amber);
  const half = apron / 2 - 0.45;
  for (const s of [-1, 1]) {
    const a = kit.box(apron - 0.9, 0.04, 0.18, line, { cast: false });
    a.position.set(cx, top + 0.16, cz + s * half);
    const b = kit.box(0.18, 0.04, apron - 0.9, line, { cast: false });
    b.position.set(cx + s * half, top + 0.16, cz);
    g.add(a, b);
  }
  const postH = 4.2;
  const post = kit.mat(P.steel);
  const pe = side / 2 - 0.4;
  for (const sx of [-1, 1])
    for (const sz of [-1, 1]) {
      const p = kit.box(0.4, postH, 0.4, post);
      p.position.set(cx + sx * pe, top + 0.14 + postH / 2, cz + sz * pe);
      g.add(p);
    }
  const { object: roof } = roofMesh(kit, 'gable-low', side, side, kit.glassMat(0.5, P.roofMetal));
  roof.position.set(cx, top + 0.14 + postH, cz);
  g.add(roof);
  return g;
}
