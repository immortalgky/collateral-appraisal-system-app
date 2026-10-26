import {
  BoxGeometry,
  BufferGeometry,
  Color,
  type ColorRepresentation,
  EdgesGeometry,
  Group,
  InstancedMesh,
  LineBasicMaterial,
  LineDashedMaterial,
  LineSegments,
  type Material,
  Mesh,
  MeshStandardMaterial,
  type MeshStandardMaterialParameters,
  Box3,
  Object3D,
  Sphere,
  Vector3,
} from 'three';
import type { CalloutText, Info, Row, SceneEnv, Tone } from './model';
import type { Palette } from './palette';

/** A callout anchored at a point in the world; the engine projects it every frame. */
export interface BuiltCallout {
  /** Which callout this is across rebuilds (not its place in the list): its class and its number within the class. */
  key: string;
  pos: Vector3;
  title: string;
  sub: string;
  /** The pieces of `sub`, one per row of the card a pin opens. */
  rows?: Row[];
  badge?: string;
  tone?: Tone;
  priority?: number;
  left?: boolean;
}

/** What the hover card shows for a pickable object (or, for an instanced one, for each instance). */
export interface PickData {
  info: Info;
  /** For an instanced mesh: the card of one instance, built once per hover. */
  infoFor?: (instanceId: number) => Info;
}

/** x, y, z, rotation about y, x scale, y scale (defaults to the x scale), z scale (defaults to the x scale). */
export type Xform = [number, number, number, number?, number?, number?, number?];

export interface Pt {
  x: number;
  z: number;
}

/**
 * What the camera frames and where a callout anchors, from one reading of a built world: the
 * sphere round everything that counts (`all`), the sphere round the flagged subject (`subject`,
 * null when none is flagged), and whether the parcel is big next to the subject, so that the
 * subject alone is framed and the callouts stand at the middle where it is.
 */
export function sceneSpheres(world: Object3D) {
  const everything = new Box3();
  world.children.forEach(o => {
    if (!o.userData.noFit) everything.expandByObject(o);
  });
  const flagged = new Box3();
  world.traverse(o => {
    if (o.userData.subject) flagged.expandByObject(o);
  });
  const all = everything.getBoundingSphere(new Sphere());
  const subject = flagged.isEmpty() ? null : flagged.getBoundingSphere(new Sphere());
  return { all, subject, big: !!subject && all.radius > subject.radius * 3 };
}

/** mulberry32: the same data always draws the same trees. */
export function rng(seed: number) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function inPoly(x: number, z: number, poly: Pt[]) {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const a = poly[i];
    const b = poly[j];
    if (a.z > z !== b.z > z && x < ((b.x - a.x) * (z - a.z)) / (b.z - a.z) + a.x) inside = !inside;
  }
  return inside;
}

/**
 * Everything one scene build needs: the palette, the strings, the group being filled, and the
 * lists the engine reads afterwards (pickable meshes, callouts, things that rise on load).
 * The mock's module-level `ctx`, as an object, so a build is a pure function of (spec, kit).
 */
export class Kit {
  world = new Group();
  private readonly perKind = new Map<string, number>();
  /** The groups `enter` is inside of, the innermost last. */
  private readonly parents: { world: Group; group: Group }[] = [];
  readonly picks: Object3D[] = [];
  readonly callouts: BuiltCallout[] = [];
  /** Scaled up from the ground when a scene first appears. */
  readonly risers: Object3D[] = [];
  /** Hidden until the rise finishes, so they do not hang in the air. */
  readonly risersAfter: Object3D[] = [];

  readonly P: Palette;
  readonly env: SceneEnv;

  constructor(P: Palette, env: SceneEnv) {
    this.P = P;
    this.env = env;
  }

  mat(color: ColorRepresentation, o: MeshStandardMaterialParameters = {}) {
    return new MeshStandardMaterial({ color, roughness: 0.85, metalness: 0, ...o });
  }

  glassMat(opacity: number, color: ColorRepresentation = this.P.glass) {
    return this.mat(color, { transparent: true, opacity, depthWrite: false, roughness: 0.3 });
  }

  mesh<M extends Material | Material[]>(
    geo: BufferGeometry,
    material: M,
    { cast = true, receive = true } = {},
  ) {
    const m = new Mesh(geo, material);
    m.castShadow = cast;
    m.receiveShadow = receive;
    return m;
  }

  box(
    w: number,
    h: number,
    d: number,
    material: Material,
    opt?: { cast?: boolean; receive?: boolean },
  ) {
    return this.mesh(new BoxGeometry(w, h, d), material, opt);
  }

  outline<T extends Mesh>(
    m: T,
    opacity = 0.55,
    color: ColorRepresentation = this.P.edge,
    dashed = false,
  ): T {
    const geo = new EdgesGeometry(m.geometry, 25);
    const lm = dashed
      ? new LineDashedMaterial({ color, dashSize: 0.6, gapSize: 0.4, transparent: true, opacity })
      : new LineBasicMaterial({ color, transparent: true, opacity });
    const l = new LineSegments(geo, lm);
    if (dashed) l.computeLineDistances();
    m.add(l);
    return m;
  }

  /** Make `obj` answer hover / tap with `info`. */
  pick<T extends Object3D>(obj: T, info: Info, infoFor?: (instanceId: number) => Info): T {
    const data: PickData = { info, infoFor };
    obj.userData.pick = data;
    this.picks.push(obj);
    return obj;
  }

  /**
   * Build inside `group` for a while: everything added goes to it, and the callouts made meanwhile
   * are given in its own coordinates and anchored in the world as they are made. `group` is added to
   * the world here, in its final place and orientation, so nothing is moved afterwards. Ends with `leave`.
   */
  enter(group: Group) {
    this.world.add(group);
    group.updateWorldMatrix(true, false);
    this.parents.push({ world: this.world, group });
    this.world = group;
  }

  leave() {
    const outer = this.parents.pop();
    if (outer) this.world = outer.world;
  }

  callout(pos: Vector3, text: CalloutText, left = false) {
    const inside = this.parents.at(-1);
    // Its class is what it is for (rank and tone: the legal warning, the subject, the land, the boundaries);
    // the nth of a class stays the nth when a callout of another class is added or taken away.
    const kind = `${text.priority ?? 3}:${text.tone ?? ''}`;
    const nth = this.perKind.get(kind) ?? 0;
    this.perKind.set(kind, nth + 1);
    this.callouts.push({
      key: `${kind}:${nth}`,
      pos: inside ? inside.group.localToWorld(pos.clone()) : pos,
      ...text,
      // A pin is never an empty pill: with no name at all it still says what it is, in a real noun.
      title: text.title.trim() || this.env.t('titles.collateral'),
      left,
    });
  }

  /** The same shape many times is one draw call. */
  instanced(
    geo: BufferGeometry,
    material: Material,
    transforms: Xform[],
    { cast = true, colors }: { cast?: boolean; colors?: Color[] } = {},
  ) {
    const im = new InstancedMesh(geo, material, Math.max(1, transforms.length));
    im.count = transforms.length;
    const o = new Object3D();
    transforms.forEach((t, i) => {
      o.position.set(t[0], t[1], t[2]);
      o.rotation.set(0, t[3] ?? 0, 0);
      const s = t[4] ?? 1;
      o.scale.set(s, t[5] ?? s, t[6] ?? s);
      o.updateMatrix();
      im.setMatrixAt(i, o.matrix);
      if (colors) im.setColorAt(i, colors[i]);
    });
    im.castShadow = cast;
    im.receiveShadow = true;
    // The base geometry's bounds do not cover the instances; culling by them would drop the lot.
    im.frustumCulled = false;
    return im;
  }

  /** A flat slab running along x or z, for roads, water and neighbour bands. */
  strip(
    alongX: boolean,
    along: number,
    across: number,
    len: number,
    thick: number,
    y: number,
    h: number,
    material: Material,
  ) {
    const m = this.mesh(
      alongX ? new BoxGeometry(len, h, thick) : new BoxGeometry(thick, h, len),
      material,
      { cast: false },
    );
    m.position.set(alongX ? along : across, y, alongX ? across : along);
    return m;
  }
}
