import {
  Box3,
  CircleGeometry,
  DirectionalLight,
  Fog,
  Group,
  HemisphereLight,
  type InstancedMesh,
  Mesh,
  MeshStandardMaterial,
  type Object3D,
  PerspectiveCamera,
  Raycaster,
  Scene,
  Sphere,
  Vector2,
  Vector3,
  WebGLRenderer,
} from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { canZoomTo, depthPlanes, fitDistance, zoomOutCap } from './depth';
import { Kit, sceneSpheres, type BuiltCallout, type PickData } from './kit';
import {
  behindCameraEdge,
  DOT_REM,
  layoutCallouts,
  nearestPoint,
  PINNED,
  type Rect,
} from './layout';
import type { Row, SceneEnv, SceneSpec } from './model';
import { isDarkTheme, readPalette, type Palette } from './palette';
import { buildScene } from './site';
import { detectGpu } from './webgl';

/** A drawn subject this much (of its size) bigger, smaller or off-centre than the last is re-framed. */
const MATERIAL_CHANGE = 0.15;
/**
 * Half the width, m, of the ground kept in the picture round a land or condo subject, so a small
 * building does not fill it: 0.8 of the size of its main building, between these two bounds, so a big
 * parcel does not shrink a small building to a speck either.
 */
const CONTEXT_MIN = 8;
const CONTEXT_MAX = 22;
/** Air kept between the subject's projected box and the edge of the free rect, px. */
const FRAME_MARGIN = 16;
/** The subject may be this much of its size above the overview card and still be put beside it. */
const BESIDE_MIN = 0.8;
/** Air kept round a card or the title for callouts, px. */
const CARD_AIR = 6;

/** The elements the subject is framed around: what the cards and the title leave of the canvas. */
export interface FrameEls {
  title: HTMLElement | null;
  /** The right-hand column of cards (desk only). */
  column: HTMLElement | null;
  /** The overview card at the bottom left (desk only). */
  overview: HTMLElement | null;
}

interface FreeRect {
  x0: number;
  x1: number;
  y0: number;
  y1: number;
}

/** The 8 corners of a box. */
const boxCorners = (box: Box3) =>
  Array.from(
    { length: 8 },
    (_, i) =>
      new Vector3(
        i & 1 ? box.max.x : box.min.x,
        i & 2 ? box.max.y : box.min.y,
        i & 4 ? box.max.z : box.min.z,
      ),
  );

export interface HoverCard {
  /** Identity of what is under the pointer, so the UI re-renders only when it changes. */
  key: string;
  title: string;
  rows: Row[];
  /** Pointer position inside the host, px. */
  x: number;
  y: number;
}

export interface EngineHandlers {
  /**
   * The card for what is under the pointer, or null for nothing. `dismiss` marks a null that is the
   * user's act on the canvas (a press, a tap, a click, a drag), as against the pointer merely moving
   * over empty canvas: the first closes any card, the second leaves a pin's own card to its own rules.
   */
  onHover: (card: HoverCard | null, dismiss?: boolean) => void;
  /** The scene cannot be shown (GL context lost, or a degenerate scene): fall back to the CSS scene. */
  onUnavailable: () => void;
}

/**
 * Plain three.js renderer for the collateral scene. Renders ON DEMAND only: a frame is drawn when
 * something changed (orbit, damping, the rise animation, a resize) and the loop stops when
 * everything has settled, so an idle tab costs nothing.
 */
export class SceneEngine {
  readonly low: boolean;
  private readonly renderer: WebGLRenderer;
  private readonly scene = new Scene();
  private readonly fog = new Fog(0xffffff, 1, 2);
  private readonly camera = new PerspectiveCamera(30, 1, 0.5, 5000);
  private readonly controls: OrbitControls;
  private readonly sun = new DirectionalLight(0xffffff, 0.78 * Math.PI);
  private readonly hemi = new HemisphereLight(0xffffff, 0x9aa5b1, 0.72 * Math.PI);
  private readonly ground: Mesh<CircleGeometry, MeshStandardMaterial>;
  private readonly ray = new Raycaster();
  private readonly ndc = new Vector2();
  private readonly v3 = new Vector3();
  private readonly v4 = new Vector3();
  private readonly resizeObserver: ResizeObserver;

  private kit: Kit | null = null;
  private world: Group | null = null;
  private spec: SceneSpec | null = null;
  private env: SceneEnv | null = null;
  private dark = isDarkTheme();
  private palette: Palette = readPalette(this.dark);
  private callouts: BuiltCallout[] = [];
  private calloutEls: (HTMLElement | null)[] = [];
  private fitSphere: Sphere | null = null;
  /** What the camera was last FRAMED on (a fit, not a rescale): the yardstick for "materially changed", so small growths add up. */
  private framedOn: Sphere | null = null;
  /** Corners (x, y, z, ...) of every part of the subject's bounding boxes, instances included. */
  private subjectPts: number[] = [];
  private frameKey = 'A';
  private frameEls: FrameEls = { title: null, column: null, overview: null };
  private frameObserver: ResizeObserver | null = null;
  /** Radius of everything drawn, so the ground, the fog and the far plane cover a parcel the frame does not. */
  private fitExtent = 0;
  private reservedEls: (HTMLElement | null)[] = [];
  private reservedRects: Rect[] = [];
  /** World-space boxes of each building or tower (`userData.obstacle`); their screen rect keeps cards off it. */
  private obstacleCorners: Vector3[][] = [];
  /** Leader lines live in one layer under every pill; this maps a callout to its line. */
  private leaders = new Map<HTMLElement, SVGLineElement>();
  private cardObserver: ResizeObserver | null = null;
  private sizes = new Map<HTMLElement, { cw: number; ch: number }>();
  private measureDirty = true;
  /** `load`/`relabel` handed out new callouts and the UI has not yet handed back its elements for them. */
  private awaitingEls = false;
  /** A re-frame was asked for and has not run: it runs once, in the next frame. */
  private refitPending = false;
  /** Diameter of the collapsed-callout dot, px: rem-sized, so measured, not assumed. */
  private dot = 20;
  /** Canvas size in px, read when it changes and not every frame. */
  private w = 0;
  private h = 0;
  /** The user has orbited or zoomed: a resize must not undo that. Cleared by reset. */
  private interacted = false;
  private depthFor = 0;
  /** Counts rebuilds, so a hover card from before one is never mistaken for the one after. */
  private generation = 0;
  /** A pointer is down on the canvas (an orbit may be under way). */
  private dragging = false;
  private lastRadius = 0;
  private raf = 0;
  private anim: (() => boolean) | null = null;
  private disposed = false;
  private pendingMove: PointerEvent | null = null;
  private downAt: { x: number; y: number } | null = null;

  private readonly host: HTMLElement;
  private readonly layer: HTMLElement;
  private readonly handlers: EngineHandlers;
  private readonly reducedMotion: boolean;

  constructor(
    host: HTMLElement,
    layer: HTMLElement,
    handlers: EngineHandlers,
    reducedMotion: boolean,
  ) {
    this.host = host;
    this.layer = layer;
    this.handlers = handlers;
    this.reducedMotion = reducedMotion;
    const gpu = detectGpu();
    this.low = gpu.software;
    // Antialiasing is the first thing a software rasteriser chokes on.
    // Transparent: the sky is the CSS gradient behind the canvas.
    this.renderer = new WebGLRenderer({
      antialias: !this.low,
      alpha: true,
      powerPreference: 'low-power',
    });
    // A step below that throws must not leave a WebGL context and a canvas behind.
    try {
      const canvas = this.renderer.domElement;
      canvas.className = 'cs3d-canvas';
      host.prepend(canvas);

      this.renderer.shadowMap.enabled = !this.low;
      this.renderer.setPixelRatio(this.pixelRatio());

      this.sun.castShadow = !this.low;
      this.sun.shadow.mapSize.set(2048, 2048);
      this.sun.shadow.bias = -0.0004;
      this.sun.shadow.normalBias = 0.03;
      this.scene.fog = this.fog;
      this.scene.add(this.hemi, this.sun, this.sun.target);

      this.ground = new Mesh(new CircleGeometry(1, 64), new MeshStandardMaterial({ roughness: 1 }));
      this.ground.rotation.x = -Math.PI / 2;
      this.ground.position.y = -0.02;
      this.ground.receiveShadow = true;
      this.scene.add(this.ground);

      this.controls = new OrbitControls(this.camera, canvas);
      Object.assign(this.controls, {
        enableDamping: true,
        dampingFactor: 0.12,
        // The page scrolls with the wheel; +/- buttons zoom instead.
        enableZoom: false,
        enablePan: false,
        minPolarAngle: 0.2,
        maxPolarAngle: 1.38,
        rotateSpeed: 0.7,
      });
      // OrbitControls takes every touch (touch-action: none); the page must still scroll under a vertical
      // swipe over a canvas this tall. A horizontal drag still orbits; pinch stays off (zoom is the buttons).
      canvas.style.touchAction = 'pan-y';
      this.controls.addEventListener('change', this.onControlsChange);
      this.controls.addEventListener('start', this.onControlsStart);
      this.controls.addEventListener('end', this.onControlsEnd);

      canvas.addEventListener('webglcontextlost', this.onContextLost);
      canvas.addEventListener('pointermove', this.onPointerMove);
      canvas.addEventListener('pointerleave', this.onPointerLeave);
      canvas.addEventListener('pointerdown', this.onPointerDown);
      canvas.addEventListener('click', this.onClick);

      this.cardObserver = new ResizeObserver(entries => {
        for (const e of entries) {
          const el = e.target.parentElement as HTMLElement | null;
          const known = el && this.sizes.get(el);
          const t = e.target as HTMLElement;
          if (!t.offsetWidth || !t.offsetHeight || !known) continue;
          if (
            Math.abs(known.cw - t.offsetWidth) > 0.5 ||
            Math.abs(known.ch - t.offsetHeight) > 0.5
          ) {
            this.measureDirty = true;
            this.invalidate();
            return;
          }
        }
      });
      // Web fonts change how wide a card is once they arrive.
      void document.fonts?.ready.then(() => {
        this.measureDirty = true;
        this.invalidate();
      });
      this.resizeObserver = new ResizeObserver(this.resize);
      this.resizeObserver.observe(host);
      this.resize();
    } catch (e) {
      // One teardown path: dispose() copes with an engine built only part of the way.
      this.dispose();
      throw e;
    }
  }

  /** Device pixels per CSS pixel the renderer draws at: 1 on a software rasteriser, else the screen's up to 2. */
  private pixelRatio() {
    return this.low ? 1 : Math.min(window.devicePixelRatio, 2);
  }

  // ── scene ──────────────────────────────────────────────────────────────────

  /** Build the scene for a spec and frame it. Returns the callouts for the UI to render. */
  load(spec: SceneSpec, env: SceneEnv): BuiltCallout[] {
    this.spec = spec;
    this.env = env;
    this.interacted = false;
    this.rebuild(true);
    this.awaitingEls = true;
    return this.callouts;
  }

  /**
   * New strings or labels for the SAME data (the parameter store resolved, the language changed):
   * rebuild without re-framing or replaying the rise, so the camera stays where the user left it.
   */
  relabel(spec: SceneSpec, env: SceneEnv): BuiltCallout[] {
    this.spec = spec;
    this.env = env;
    this.rebuild(false);
    this.awaitingEls = true;
    return this.callouts;
  }

  /** Rebuild with the palette of `dark`, e.g. after the theme flipped. The camera stays put. */
  restyle(dark = isDarkTheme()) {
    // The theme as it was is not a reason to rebuild.
    if (!this.spec || dark === this.dark) return;
    try {
      this.rebuild(false, dark);
    } catch {
      // Like a failed load: the CSS scene stands in.
      this.handlers.onUnavailable();
    }
  }

  /** What the canvas is, for assistive technology. */
  setLabel(text: string) {
    const canvas = this.renderer.domElement;
    canvas.setAttribute('role', 'img');
    canvas.setAttribute('aria-label', text);
  }

  /** The UI renders one element per callout, in order; the engine moves them. */
  setCalloutEls(els: (HTMLElement | null)[], lines: (SVGLineElement | null)[] = []) {
    if (this.disposed) return;
    this.calloutEls = els;
    this.awaitingEls = false;
    this.measureDirty = true;
    // A card changes size when its text wraps differently: a web font arriving, a language switch.
    // Watching the cards themselves catches all of them; sizes of 0 (hidden) are not changes.
    this.cardObserver?.disconnect();
    this.leaders = new Map();
    els.forEach((el, i) => {
      if (!el) return;
      const card = el.querySelector<HTMLElement>('.cs3d-co-card');
      if (card) this.cardObserver?.observe(card);
      const line = lines[i];
      if (line) this.leaders.set(el, line);
    });
    this.invalidate();
  }

  /** Elements over the canvas (hint, toolbar) that callout cards keep clear of. */
  setReserved(els: (HTMLElement | null)[]) {
    if (this.disposed) return;
    this.reservedEls = els;
    this.measureDirty = true;
    this.invalidate();
  }

  private rebuild(refit: boolean, dark = isDarkTheme()) {
    if (!this.spec || !this.env || this.disposed) return;
    this.disposeWorld();
    // The rise animation holds the old build's groups, and the callout layer may be mid-fade:
    // neither may outlive the build they belong to (a new rise starts below, if there is one).
    const rising = this.anim !== null;
    this.anim = null;
    this.layer.classList.remove('is-settling');
    this.generation++;
    // A card from the old build would show old text, and the pointer may not move to refresh it.
    this.handlers.onHover(null);
    this.dark = dark;
    this.palette = readPalette(this.dark);
    const kit = new Kit(this.palette, this.env);
    buildScene(kit, this.spec);
    this.kit = kit;
    this.world = kit.world;
    this.scene.add(kit.world);
    this.callouts = kit.callouts;
    this.measureDirty = true;
    this.ground.material.color.copy(this.palette.ground);
    // Shadows on / off recompile the shader.
    this.ground.material.needsUpdate = true;
    this.fog.color.copy(this.palette.bg);

    // Frame the subject (buildings, improvements, pond) with margin. The whole parcel is framed
    // only when it is not much bigger than that; on a big parcel it may run off the canvas, or the
    // buildings would be a few pixels wide.
    const { all: allSphere, subject: sub, big } = sceneSpheres(kit.world);
    let frame = allSphere;
    // One screen rect per flagged object: a building, a tower, or (small village) a house group's
    // whole block. Cards stand between them, not over the whole parcel.
    this.obstacleCorners = [];
    kit.world.traverse(o => {
      if (!o.userData.obstacle) return;
      const box = new Box3().setFromObject(o);
      if (box.isEmpty()) return;
      this.obstacleCorners.push(boxCorners(box));
    });
    // What the camera frames: everything, or (on a big parcel) only the flagged subject.
    let framed: Object3D[] = kit.world.children.filter(o => !o.userData.noFit);
    const yard = this.spec.kind === 'land' && this.spec.machineYard;
    if (sub && (big || yard)) {
      frame = new Sphere(sub.center, Math.max(sub.radius * 1.25, 12));
      framed = [];
      kit.world.traverse(o => {
        if (o.userData.subject) framed.push(o);
      });
    }
    this.subjectPts = this.cornersOf(framed);
    // A small building on a big parcel is not blown up to fill the picture: the framing keeps a
    // little of its surroundings (ground, road, trees) round it, as a house on a plot looks.
    if (sub && (this.spec.kind === 'land' || this.spec.kind === 'condo')) {
      const own = new Box3();
      for (let i = 0; i < this.subjectPts.length; i += 3)
        own.expandByPoint(
          this.v3.set(this.subjectPts[i], this.subjectPts[i + 1], this.subjectPts[i + 2]),
        );
      // The buildings (or the machines) set the size of the surroundings, not a pond or a shed beside them.
      const main = new Box3();
      kit.world.traverse(o => {
        if (o.userData.obstacle) main.expandByObject(o);
      });
      const size = (main.isEmpty() ? own : main).getSize(new Vector3());
      // Machines alone stand in a yard that is the whole picture: the ground round it is 1.5 times its width.
      const half = yard
        ? 0.75 * Math.max(own.max.x - own.min.x, own.max.z - own.min.z)
        : Math.min(CONTEXT_MAX, Math.max(CONTEXT_MIN, Math.max(size.x, size.y, size.z)));
      const mid = own.getCenter(new Vector3());
      for (const sx of [-1, 1])
        for (const sz of [-1, 1]) this.subjectPts.push(mid.x + sx * half, 0, mid.z + sz * half);
    }
    // A degenerate scene (NaN geometry) would leave a blank canvas: let the CSS scene take over.
    const c = frame.center;
    if (![frame.radius, c.x, c.y, c.z].every(Number.isFinite) || frame.radius <= 0) {
      this.handlers.onUnavailable();
      return;
    }
    // New data under the same appraisal keeps the camera where the user left it, unless what is
    // drawn is materially bigger, smaller or elsewhere; the ground, fog and shadow follow either way.
    const prev = this.framedOn;
    const material =
      !prev ||
      Math.abs(frame.radius - prev.radius) > prev.radius * MATERIAL_CHANGE ||
      frame.center.distanceTo(prev.center) > prev.radius * MATERIAL_CHANGE;
    if (refit || material) this.fit(frame, allSphere.radius);
    else {
      this.scaleWorld(frame, allSphere.radius);
      this.depthFor = 0;
      this.updateDepth();
    }
    // A rise that was running starts over on the new world, instead of the new build standing at full height.
    if (refit || rising) this.startRise();
    this.invalidate();
  }

  /** What follows the size of the subject, not the camera: the sun and its shadow box, the ground, the depth planes. */
  private scaleWorld(sphere: Sphere, extent: number) {
    this.fitSphere = sphere;
    this.fitExtent = Math.max(extent, sphere.radius);
    this.lastRadius = sphere.radius;
    const r = sphere.radius;
    const c = sphere.center;
    this.sun.position.set(c.x - r * 0.9, c.y + r * 2.2, c.z + r * 0.8);
    this.sun.target.position.copy(c);
    const sc = this.sun.shadow.camera;
    sc.left = sc.bottom = -r * 1.15;
    sc.right = sc.top = r * 1.15;
    sc.near = 1;
    sc.far = r * 6;
    sc.updateProjectionMatrix();
    this.ground.scale.setScalar(this.fitExtent * 6);
    this.ground.position.set(c.x, -0.02, c.z);
  }

  private fit(sphere: Sphere, extent = this.fitExtent) {
    // Damping keeps a little momentum after a drag: drop it before re-framing, or the view drifts.
    this.controls.enableDamping = false;
    this.controls.update();
    this.controls.enableDamping = true;
    this.scaleWorld(sphere, extent);
    this.framedOn = sphere.clone();
    // No canvas size yet (a host not laid out): nothing to frame against. The observers re-fit once it has one.
    if (!(this.w > 0 && this.h > 0)) return;
    const r = sphere.radius;
    const c = sphere.center;
    const dir = new Vector3(1, 0.78, 1.3).normalize();
    // The orbit target is the subject's centre and never moves; a projection shift (below) puts
    // that centre in the middle of the free part of the canvas instead.
    this.controls.target.copy(c);
    this.camera.aspect = this.w && this.h ? this.w / this.h : this.camera.aspect;
    const place = (d: number) => {
      this.camera.position.copy(c).addScaledVector(dir, d);
      this.camera.lookAt(c);
      this.camera.clearViewOffset();
      this.camera.updateProjectionMatrix();
      this.camera.updateMatrixWorld();
    };
    // Solve the distance for each free rect from the subject's real projected box; the size goes
    // as 1/distance, so scaling the distance by that ratio converges in a few steps.
    const base = fitDistance(r, this.camera.fov, this.camera.aspect);
    const cands: { key: string; rect: FreeRect; d: number }[] = [];
    if (this.subjectPts.length) {
      for (const [key, rect] of Object.entries(this.freeRects())) {
        let d = base;
        for (let it = 0; it < 8; it++) {
          place(d);
          const b = this.projectedBox();
          const bw = b.x1 - b.x0;
          const bh = b.y1 - b.y0;
          if (!(bw > 0 && bh > 0)) break;
          const s = Math.min(
            (rect.x1 - rect.x0 - 2 * FRAME_MARGIN) / bw,
            (rect.y1 - rect.y0 - 2 * FRAME_MARGIN) / bh,
          );
          if (!(s > 0)) break;
          if (s >= 0.995 && s <= 1.02) break;
          d = Math.min(base * 6, Math.max(base * 0.3, d / s));
        }
        cands.push({ key, rect, d });
      }
    }
    // Prefer the rect beside the overview card (the subject then stands near the vertical middle
    // of the canvas); the band above it only when beside would make the subject >20% smaller.
    const A = cands.find(k => k.key === 'A');
    const B = cands.find(k => k.key === 'B');
    const best = (B && A && B.d <= A.d / BESIDE_MIN ? B : A && (!B || A.d <= B.d) ? A : B) ?? null;
    this.frameKey = best?.key ?? 'A';
    place(best?.d ?? base);
    if (best) this.offsetTo(best.rect);
    this.depthFor = 0;
    this.updateDepth();
    this.controls.update();
  }

  // ── framing: the subject sits in what the cards and the title leave free ──

  /** Bounding-box corners of every mesh under `roots`: 8 per mesh, an instanced mesh's box covering all its instances. */
  private cornersOf(roots: Object3D[]) {
    const pts: number[] = [];
    for (const root of roots) {
      root.updateWorldMatrix(true, true);
      root.traverse(n => {
        const mesh = n as Mesh;
        if (!mesh.isMesh) return;
        const inst = n as InstancedMesh;
        let box: Box3 | null;
        if (inst.isInstancedMesh) {
          inst.computeBoundingBox();
          box = inst.boundingBox;
        } else {
          if (!mesh.geometry.boundingBox) mesh.geometry.computeBoundingBox();
          box = mesh.geometry.boundingBox;
        }
        if (!box) return;
        for (const v of boxCorners(box)) {
          v.applyMatrix4(mesh.matrixWorld);
          pts.push(v.x, v.y, v.z);
        }
      });
    }
    return pts;
  }

  /** The subject's projected box in canvas px with the camera as it is now (view offset included). */
  private projectedBox() {
    const { w, h } = this;
    const pts = this.subjectPts;
    this.camera.updateMatrixWorld();
    this.camera.updateProjectionMatrix();
    let x0 = Infinity;
    let x1 = -Infinity;
    let y0 = Infinity;
    let y1 = -Infinity;
    for (let i = 0; i < pts.length; i += 3) {
      this.v3.set(pts[i], pts[i + 1], pts[i + 2]).project(this.camera);
      const x = ((this.v3.x + 1) / 2) * w;
      const y = ((1 - this.v3.y) / 2) * h;
      if (x < x0) x0 = x;
      if (x > x1) x1 = x;
      if (y < y0) y0 = y;
      if (y > y1) y1 = y;
    }
    return { x0, x1, y0, y1 };
  }

  /**
   * Whether the cards are laid over the canvas. Read from the layout itself (the column is
   * positioned absolutely only by the container query in collateralScene.css), so the engine and
   * the stylesheet cannot disagree about the breakpoint.
   */
  private overlaid() {
    const column = this.frameEls.column;
    return !!column && getComputedStyle(column).position === 'absolute';
  }

  /**
   * What the cards leave free, in canvas px. Stacked it is the canvas minus
   * the title band, closed at the height that puts the subject's centre at about 60% of the canvas.
   * On the desk there are two candidates: A, the band above the overview card, and B, beside it
   * between the card and the right column.
   */
  private freeRects(): Record<string, FreeRect> {
    const { w, h } = this;
    const hr = this.origin();
    const t = this.frameEls.title?.getBoundingClientRect();
    const y0 = t ? Math.min(h * 0.45, Math.max(0, t.bottom - hr.top + 6)) : 0;
    const titleRight = t ? t.right - hr.left : 0;
    if (!this.overlaid()) {
      return { A: { x0: 0, x1: w, y0, y1: Math.min(h - 14, Math.max(y0 + 120, 1.2 * h - y0)) } };
    }
    const col = this.frameEls.column?.getBoundingClientRect();
    const x1 = col?.width ? Math.max(w * 0.4, col.left - hr.left - 12) : w;
    const o = this.frameEls.overview?.getBoundingClientRect();
    if (!o?.width) return { A: { x0: 0, x1, y0, y1: h } };
    const rects: Record<string, FreeRect> = {
      A: { x0: 0, x1, y0, y1: Math.max(y0 + 120, o.top - hr.top - 12) },
    };
    const bx0 = o.right - hr.left + 12;
    if (x1 - bx0 > 160) rects.B = { x0: bx0, x1, y0: titleRight + 12 > bx0 ? y0 : 14, y1: h - 14 };
    return rects;
  }

  /** Shift the projection (not the target) so the centre of the subject's box is the centre of `R`. */
  private offsetTo(R: FreeRect) {
    const { w, h } = this;
    if (!(w > 0 && h > 0)) return;
    this.camera.clearViewOffset();
    this.camera.updateProjectionMatrix();
    const b = this.projectedBox();
    if (![b.x0, b.x1, b.y0, b.y1].every(Number.isFinite)) return;
    // Centred in R, then eased a little downward when there is slack (never up, never out of R,
    // and no lower than ~58% of the canvas): the subject should not hug the title.
    const slack = Math.max(0, R.y1 - R.y0 - (b.y1 - b.y0) - 2 * FRAME_MARGIN);
    const cyR = (R.y0 + R.y1) / 2;
    const want = Math.min(cyR + slack * 0.25, Math.max(cyR, h * 0.58));
    const sx = (b.x0 + b.x1) / 2 - (R.x0 + R.x1) / 2;
    const sy = (b.y0 + b.y1) / 2 - want;
    if (Math.abs(sx) > 0.5 || Math.abs(sy) > 0.5) this.camera.setViewOffset(w, h, sx, sy, w, h);
    this.camera.updateProjectionMatrix();
  }

  /** The cards or the title moved: keep the camera the user left, re-centre it in the free rect. */
  private reframe() {
    if (!this.subjectPts.length) return;
    this.camera.aspect = this.w / this.h;
    const rects = this.freeRects();
    this.offsetTo(rects[this.frameKey] ?? rects.A);
  }

  /**
   * Where the canvas's own box starts on the page: the host's padding box, which is what the
   * renderer's size (clientWidth/clientHeight) measures, not its border box.
   */
  private origin() {
    const r = this.host.getBoundingClientRect();
    return { left: r.left + this.host.clientLeft, top: r.top + this.host.clientTop };
  }

  /** The elements to frame around. Called again whenever they are (re)rendered. */
  setFrameEls(els: FrameEls) {
    if (this.disposed) return;
    this.frameEls = els;
    this.frameObserver?.disconnect();
    // A card, the title or the column changing size (a language, a web font) changes the free rect.
    // The observer reports each element once on starting to watch it: that is the one refit here.
    const watched = [els.title, els.column, els.overview].filter((e): e is HTMLElement => !!e);
    if (watched.length === 0) {
      this.refit();
      return;
    }
    this.frameObserver = new ResizeObserver(() => this.refit());
    for (const el of watched) this.frameObserver.observe(el);
  }

  /**
   * Ask for a re-frame from the elements' real rects: a fresh fit, unless the user has taken the
   * camera. It runs once, at the start of the next frame, however many observers (each element's
   * first report, a resize) asked in between.
   */
  private refit() {
    if (this.disposed || !this.fitSphere || !this.w) return;
    this.refitPending = true;
    this.invalidate();
  }

  private runRefit() {
    this.refitPending = false;
    if (!this.fitSphere || !this.w) return;
    if (this.interacted) this.reframe();
    else this.fit(this.fitSphere);
    this.measureDirty = true;
  }

  /**
   * Near plane, far plane and fog follow the camera's DISTANCE, so zooming out does not push the
   * scene past the fog and zooming in does not clip through the near plane. Orbiting keeps the
   * distance, so this is a no-op until the distance changes.
   */
  private updateDepth() {
    const r = this.lastRadius;
    const dist = this.camera.position.distanceTo(this.controls.target);
    if (!r || Math.abs(dist - this.depthFor) < 1e-3) return;
    this.depthFor = dist;
    ({ near: this.camera.near, far: this.camera.far } = depthPlanes(dist, this.fitExtent));
    this.camera.updateProjectionMatrix();
    this.fog.near = dist + r * 0.8;
    this.fog.far = dist + this.fitExtent * 4;
  }

  // OrbitControls fires 'start' on a plain click too; only an actual camera move with the pointer
  // down (or the zoom buttons) takes the camera from the engine.
  private onControlsStart = () => {
    this.dragging = true;
  };
  private onControlsEnd = () => {
    this.dragging = false;
  };
  private onControlsChange = () => {
    if (this.dragging) this.interacted = true;
    this.invalidate();
  };

  /** Buildings grow from the ground when a scene first appears. Skipped under reduced motion. */
  private startRise() {
    this.anim = null;
    const kit = this.kit;
    if (this.reducedMotion || !kit || !kit.risers.length) return;
    const t0 = performance.now();
    const items = kit.risers;
    const extras = kit.risersAfter;
    items.forEach(g => g.scale.setY(0.001));
    extras.forEach(m => (m.visible = false));
    this.anim = () => {
      const now = performance.now();
      let running = false;
      items.forEach((g, i) => {
        const k = Math.min(1, Math.max(0, (now - t0 - i * 110) / 700));
        g.scale.setY(Math.max(0.001, 1 - Math.pow(1 - k, 3)));
        if (k < 1) running = true;
      });
      if (!running) {
        extras.forEach(m => (m.visible = true));
        this.anim = null;
      }
      return running;
    };
  }

  private disposeWorld() {
    if (!this.world) return;
    this.world.traverse(o => {
      const m = o as Mesh;
      m.geometry?.dispose();
      const mat = m.material;
      if (mat) (Array.isArray(mat) ? mat : [mat]).forEach(x => x.dispose());
      if ((o as InstancedMesh).isInstancedMesh) (o as InstancedMesh).dispose();
    });
    this.scene.remove(this.world);
    this.world = null;
    this.kit = null;
  }

  // ── frames ─────────────────────────────────────────────────────────────────

  private invalidate = () => {
    if (!this.raf && !this.disposed) this.raf = requestAnimationFrame(this.frame);
  };

  private frame = () => {
    this.raf = 0;
    if (this.disposed) return;
    if (this.refitPending) this.runRefit();
    let more = this.controls.update();
    this.updateDepth();
    if (this.anim) more = this.anim() || more;
    // Callouts wait for the rise to finish, or they hang in the air over a building still growing.
    this.layer.classList.toggle('is-settling', !!this.anim);
    this.renderer.render(this.scene, this.camera);
    this.placeCallouts();
    if (more) this.invalidate();
  };

  private resize = () => {
    if (this.disposed) return;
    const w = this.host.clientWidth;
    const h = this.host.clientHeight;
    if (!w || !h) return;
    this.w = w;
    this.h = h;
    this.measureDirty = true;
    // The window may have moved to a screen of another density.
    this.renderer.setPixelRatio(this.pixelRatio());
    this.renderer.setSize(w, h, false);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    // Re-frame from the cards' real rects; if the user has taken the camera their orbit and zoom
    // survive a resize and only the projection shift is re-centred.
    this.refit();
    this.invalidate();
  };

  // ── callouts: DOM over the canvas, re-placed whenever a frame is drawn ──

  /**
   * Card sizes and the areas to keep clear of change only when the content or the canvas size do, so they are measured then and cached. A frame only WRITES (transforms, classes,
   * variables); it never reads layout, which would force a reflow on every frame.
   */
  private measure() {
    this.measureDirty = false;
    this.dot = parseFloat(getComputedStyle(document.documentElement).fontSize) * DOT_REM;
    this.sizes = new Map();
    for (const el of this.calloutEls) {
      if (!el) continue;
      el.hidden = false;
      el.classList.remove('collapsed');
    }
    for (const el of this.calloutEls) {
      if (!el) continue;
      const card = el.querySelector<HTMLElement>('.cs3d-co-card');
      this.sizes.set(el, { cw: card?.offsetWidth ?? 0, ch: card?.offsetHeight ?? 0 });
    }
    // Cards and the title are not the canvas's children, so their rects are taken from the page
    // and made relative to it. One below the canvas (stacked cards) does not touch it: left out.
    const hr = this.origin();
    this.reservedRects = this.reservedEls
      .filter((e): e is HTMLElement => !!e)
      .map(e => {
        const r = e.getBoundingClientRect();
        return {
          left: r.left - hr.left - CARD_AIR,
          top: r.top - hr.top - CARD_AIR,
          right: r.right - hr.left + CARD_AIR,
          bottom: r.bottom - hr.top + CARD_AIR,
        };
      })
      .filter(r => r.right > 0 && r.left < this.w && r.bottom > 0 && r.top < this.h);
  }

  private showLeader(el: HTMLElement, on: boolean) {
    const line = this.leaders.get(el);
    if (line) line.style.display = on ? '' : 'none';
  }

  /** Distance of a world point in front of the camera along its view axis (<= 0 behind it). */
  private viewDepth(p: Vector3) {
    return -this.v4.copy(p).applyMatrix4(this.camera.matrixWorldInverse).z;
  }

  private placeCallouts() {
    const { w, h } = this;
    // The elements still belong to the previous build: pairing them with the new callouts would put
    // the old pills at the new places for a frame.
    if (!w || !h || this.awaitingEls) return;
    if (this.measureDirty) this.measure();

    const live: { el: HTMLElement; c: BuiltCallout; ax: number; ay: number }[] = [];
    this.calloutEls.forEach((el, i) => {
      const c = this.callouts[i];
      if (!el) return;
      // An element left over from a build with more callouts has nothing to say now.
      if (!c) {
        el.hidden = true;
        this.showLeader(el, false);
        return;
      }
      this.v3.copy(c.pos).project(this.camera);
      // A warning is never lost: a pinned callout behind the camera is passed on as off-canvas,
      // in its screen direction, so the layout pulls it to the edge.
      // Behind the camera is view-space depth; z > 1 alone is also a point past the far plane.
      const depth = this.viewDepth(c.pos);
      const behind = depth <= 0;
      const pinned = (c.priority ?? 3) <= PINNED;
      // Clipped (nearer than the near plane, or past the far one) is as good as not drawn.
      const clipped = depth < this.camera.near || this.v3.z > 1;
      const gone = clipped && !pinned;
      el.hidden = gone;
      this.showLeader(el, false);
      if (gone) return;
      el.classList.remove('collapsed');
      let ax = ((this.v3.x + 1) / 2) * w;
      let ay = ((1 - this.v3.y) / 2) * h;
      if (behind) {
        ({ x: ax, y: ay } = behindCameraEdge(this.v3.x, this.v3.y, w, h));
      }
      live.push({ el, c, ax, ay });
    });

    // Each building's or tower's screen rect: cards stay off the buildings they describe.
    const obstacles: Rect[] = [];
    for (const corners of this.obstacleCorners) {
      let left = Infinity;
      let top = Infinity;
      let right = -Infinity;
      let bottom = -Infinity;
      // A box with a corner nearer than the near plane has no usable screen rect: leave it out
      // (a card may then overlap it) rather than build a partial rect. Corners past the far plane
      // are skipped.
      let usable = true;
      for (const c of corners) {
        if (this.viewDepth(c) < this.camera.near) {
          usable = false;
          break;
        }
        this.v3.copy(c).project(this.camera);
        if (this.v3.z > 1) continue;
        const x = ((this.v3.x + 1) / 2) * w;
        const y = ((1 - this.v3.y) / 2) * h;
        left = Math.min(left, x);
        right = Math.max(right, x);
        top = Math.min(top, y);
        bottom = Math.max(bottom, y);
      }
      // A little air round it: a card against its edge reads as sitting on it.
      if (usable && [left, top, right, bottom].every(Number.isFinite))
        obstacles.push({ left: left - 8, top: top - 8, right: right + 8, bottom: bottom + 8 });
    }

    const result = layoutCallouts(
      live.map((it, k) => ({
        id: k,
        ax: it.ax,
        ay: it.ay,
        ...(this.sizes.get(it.el) ?? { cw: 0, ch: 0 }),
        priority: it.c.priority ?? 3,
        preferLeft: !!it.c.left,
      })),
      this.reservedRects,
      obstacles,
      w,
      h,
      this.dot,
    );

    live.forEach((it, k) => {
      const p = result.get(k);
      const { el } = it;
      if (!p || p.mode === 'hidden') {
        el.hidden = true;
        return;
      }
      el.style.transform = `translate(${p.ax.toFixed(1)}px, ${p.ay.toFixed(1)}px)`;
      el.style.setProperty('--cx', p.dx.toFixed(1));
      el.style.setProperty('--cy', p.dy.toFixed(1));
      if (p.mode === 'collapsed') {
        el.classList.add('collapsed');
        // A dot that had to move off its object keeps a short thin leader back to it.
        const tie = this.leaders.get(el);
        if (tie && p.from) {
          tie.setAttribute('x1', p.from.x.toFixed(1));
          tie.setAttribute('y1', p.from.y.toFixed(1));
          tie.setAttribute('x2', p.ax.toFixed(1));
          tie.setAttribute('y2', p.ay.toFixed(1));
          tie.style.display = '';
        }
        return;
      }
      const line = this.leaders.get(el);
      if (line) {
        // From the dot to the nearest point of the card; nothing when the dot is on the card.
        const { cw, ch } = this.sizes.get(el) ?? { cw: 0, ch: 0 };
        const end = nearestPoint(0, 0, {
          left: p.dx,
          top: p.dy,
          right: p.dx + cw,
          bottom: p.dy + ch,
        });
        const at = (n: number) => n.toFixed(1);
        line.setAttribute('x1', at(p.ax));
        line.setAttribute('y1', at(p.ay));
        line.setAttribute('x2', at(p.ax + end.x));
        line.setAttribute('y2', at(p.ay + end.y));
        this.showLeader(el, true);
      }
    });
  }

  // ── toolbar ────────────────────────────────────────────────────────────────

  zoom(factor: number) {
    const off = this.camera.position.clone().sub(this.controls.target).multiplyScalar(factor);
    const len = off.length();
    if (!canZoomTo(len, this.lastRadius, zoomOutCap(this.lastRadius, this.fitExtent))) return;
    this.camera.position.copy(this.controls.target).add(off);
    this.interacted = true;
    this.invalidate();
  }

  reset() {
    this.interacted = false;
    if (this.fitSphere) this.fit(this.fitSphere);
    this.invalidate();
  }

  // ── hover / tap ────────────────────────────────────────────────────────────

  private pickAt(ev: MouseEvent, tap = false) {
    if (!this.kit) return;
    const o = this.origin();
    this.ndc.set(
      ((ev.clientX - o.left) / this.w) * 2 - 1,
      -((ev.clientY - o.top) / this.h) * 2 + 1,
    );
    this.ray.setFromCamera(this.ndc, this.camera);
    // Not what is hidden for now (the extras that wait for the rise to finish), nor under a hidden parent.
    const shown = (o: Object3D | null) => {
      for (let n = o; n; n = n.parent) if (!n.visible) return false;
      return true;
    };
    const hit = this.ray.intersectObjects(this.kit.picks, false).find(h => shown(h.object));
    const data = hit?.object.userData.pick as PickData | undefined;
    this.renderer.domElement.style.cursor = data ? 'pointer' : '';
    if (!hit || !data) {
      this.handlers.onHover(null, tap);
      return;
    }
    const id = hit.instanceId;
    const info = id != null && data.infoFor ? data.infoFor(id) : data.info;
    this.handlers.onHover({
      // The build generation is in the key: a rebuild (new labels, new theme) is a new card even
      // under the same pointer.
      key: `${this.generation}:${this.kit.picks.indexOf(hit.object as Object3D)}:${id ?? ''}`,
      title: info.title,
      rows: info.rows,
      x: ev.clientX - o.left,
      y: ev.clientY - o.top,
    });
  }

  private onPointerMove = (ev: PointerEvent) => {
    if (ev.buttons) {
      this.pendingMove = null;
      this.handlers.onHover(null, true);
      return;
    }
    if (!this.pendingMove) {
      requestAnimationFrame(() => {
        const e = this.pendingMove;
        this.pendingMove = null;
        if (e && !this.disposed) this.pickAt(e);
      });
    }
    this.pendingMove = ev;
  };

  private onPointerLeave = (ev: PointerEvent) => {
    this.pendingMove = null;
    // Onto a pin: the pin has opened its own card, and this must not close it (the browser
    // reports the pin's entry before this leave).
    if (ev.relatedTarget instanceof Node && this.layer.contains(ev.relatedTarget)) return;
    // On touch the finger lifts as the pointer "leaves"; the card from the tap has to stay.
    if (ev.pointerType !== 'touch') this.handlers.onHover(null);
  };

  private onPointerDown = (ev: PointerEvent) => {
    this.downAt = { x: ev.clientX, y: ev.clientY };
    this.pendingMove = null;
    this.handlers.onHover(null, true);
  };

  private onClick = (ev: MouseEvent) => {
    // A drag ends in a click too; only a tap should open the card.
    const d = this.downAt;
    if (d && Math.hypot(ev.clientX - d.x, ev.clientY - d.y) > 4) return;
    this.pickAt(ev, true);
  };

  private onContextLost = (ev: Event) => {
    ev.preventDefault();
    this.handlers.onUnavailable();
  };

  // ── teardown ───────────────────────────────────────────────────────────────

  /**
   * Free every GPU resource and listener; opening and closing the slide-over must not leak contexts.
   * Safe on an engine whose constructor threw part of the way: whatever was not made yet is skipped.
   */
  dispose() {
    if (this.disposed) return;
    this.disposed = true;
    cancelAnimationFrame(this.raf);
    this.resizeObserver?.disconnect();
    this.cardObserver?.disconnect();
    this.frameObserver?.disconnect();
    const canvas = this.renderer.domElement;
    canvas.removeEventListener('webglcontextlost', this.onContextLost);
    canvas.removeEventListener('pointermove', this.onPointerMove);
    canvas.removeEventListener('pointerleave', this.onPointerLeave);
    canvas.removeEventListener('pointerdown', this.onPointerDown);
    canvas.removeEventListener('click', this.onClick);
    this.controls?.removeEventListener('change', this.onControlsChange);
    this.controls?.removeEventListener('start', this.onControlsStart);
    this.controls?.removeEventListener('end', this.onControlsEnd);
    this.controls?.dispose();
    this.disposeWorld();
    this.ground?.geometry.dispose();
    this.ground?.material.dispose();
    this.sun.dispose();
    this.hemi.dispose();
    this.renderer.dispose();
    this.renderer.forceContextLoss();
    canvas.remove();
  }
}
