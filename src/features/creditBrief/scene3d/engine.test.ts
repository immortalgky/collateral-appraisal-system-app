import { afterEach, describe, expect, it, vi } from 'vitest';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { BoxGeometry, Group, Mesh, type PerspectiveCamera } from 'three';
import type { BriefAsset } from '../api/appraisalBrief';
import { SceneEngine } from './engine';
import { buildSceneSpec, type SceneEnv } from './model';

const gl = vi.hoisted(() => ({ dispose: vi.fn(), loss: vi.fn() }));

vi.mock('./webgl', () => ({ detectGpu: () => ({ available: true, software: false }) }));
// No GL context in jsdom: a renderer that has a canvas and loses its context like the real one does.
vi.mock('three', async importOriginal => {
  const real = await importOriginal<typeof import('three')>();
  class FakeRenderer {
    domElement = document.createElement('canvas');
    shadowMap = { enabled: false };
    setPixelRatio() {}
    setSize() {}
    render() {}
    dispose = gl.dispose;
    forceContextLoss = () => {
      gl.loss();
      this.domElement.dispatchEvent(new Event('webglcontextlost'));
    };
  }
  return { ...real, WebGLRenderer: FakeRenderer };
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
  gl.dispose.mockClear();
  gl.loss.mockClear();
});

describe('SceneEngine construction', () => {
  it('releases everything and reports nothing twice when a step after the renderer throws', () => {
    // The first observer the constructor makes throws, after the controls exist.
    vi.stubGlobal(
      'ResizeObserver',
      class {
        constructor() {
          throw new Error('observer unavailable');
        }
      },
    );
    const controlsDispose = vi.spyOn(OrbitControls.prototype, 'dispose');
    const added = vi.spyOn(document, 'addEventListener');
    const removed = vi.spyOn(document, 'removeEventListener');
    const host = document.createElement('div');
    const onUnavailable = vi.fn();

    expect(
      () =>
        new SceneEngine(
          host,
          document.createElement('div'),
          { onHover: vi.fn(), onUnavailable },
          false,
        ),
    ).toThrow('observer unavailable');

    // The canvas and the GL context are gone, the controls are disposed once, and no document
    // listener is left behind.
    expect(host.querySelector('canvas')).toBeNull();
    expect(gl.dispose).toHaveBeenCalledTimes(1);
    expect(gl.loss).toHaveBeenCalledTimes(1);
    expect(controlsDispose).toHaveBeenCalledTimes(1);
    for (const [type, fn] of added.mock.calls) expect(removed).toHaveBeenCalledWith(type, fn);
    // The losing of the context is not a second report: the throw is the one.
    expect(onUnavailable).not.toHaveBeenCalled();
  });
});

describe('SceneEngine rebuilds', () => {
  const env: SceneEnv = {
    t: key => key,
    label: (_group, code) => code ?? '—',
    nf: n => String(n),
  };
  const house = {
    propertyType: 'LB',
    buildingType: '01',
    numberOfFloors: 2,
    totalBuildingArea: 100,
    areaRai: 1,
    landUseType: [],
    boundaries: [],
    roofType: [],
    fenceType: [],
    improvements: [],
    facilityType: [],
    locationViewType: [],
  } as unknown as BriefAsset;

  it('restarts a running rise on the new world when a relabel lands, and frames nothing at 0x0', () => {
    vi.stubGlobal(
      'ResizeObserver',
      class {
        observe() {}
        disconnect() {}
      },
    );
    // A host with no layout (0x0): there is nothing to frame against, and no NaN may reach the camera.
    const engine = new SceneEngine(
      document.createElement('div'),
      document.createElement('div'),
      { onHover: vi.fn(), onUnavailable: vi.fn() },
      false,
    );
    const spec = buildSceneSpec([house], null, env)!;
    const inner = engine as unknown as { anim: unknown; camera: PerspectiveCamera };
    engine.load(spec, env);
    expect(inner.anim).not.toBeNull();
    // New labels for the same data while the buildings are still growing: they keep growing.
    engine.relabel(spec, env);
    expect(inner.anim).not.toBeNull();
    expect(Number.isFinite(inner.camera.aspect)).toBe(true);
    expect(inner.camera.projectionMatrix.elements.every(Number.isFinite)).toBe(true);
    engine.dispose();
  });

  it('reports the scene unavailable, and does not throw, when a rebuild for a new theme fails', () => {
    vi.stubGlobal(
      'ResizeObserver',
      class {
        observe() {}
        disconnect() {}
      },
    );
    const onUnavailable = vi.fn();
    const engine = new SceneEngine(
      document.createElement('div'),
      document.createElement('div'),
      { onHover: vi.fn(), onUnavailable },
      false,
    );
    engine.load(buildSceneSpec([house], null, env)!, env);
    // A spec the builders cannot draw, then the page flips to the other theme.
    (engine as unknown as { spec: unknown }).spec = {};
    document.documentElement.setAttribute('data-theme', 'dark');
    try {
      expect(() => engine.restyle()).not.toThrow();
    } finally {
      document.documentElement.removeAttribute('data-theme');
      engine.dispose();
    }
    expect(onUnavailable).toHaveBeenCalledTimes(1);
  });

  it('keeps the card of a pin the pointer moves onto from the canvas, and closes it for anywhere else', () => {
    vi.stubGlobal(
      'ResizeObserver',
      class {
        observe() {}
        disconnect() {}
      },
    );
    const host = document.createElement('div');
    const layer = document.createElement('div');
    const pin = document.createElement('div');
    layer.append(pin);
    const onHover = vi.fn();
    const engine = new SceneEngine(host, layer, { onHover, onUnavailable: vi.fn() }, false);
    const canvas = host.querySelector('canvas')!;
    // Leaving onto a pin is the pin's to show: the canvas does not report "nothing hovered".
    canvas.dispatchEvent(new MouseEvent('pointerleave', { relatedTarget: pin }));
    expect(onHover).not.toHaveBeenCalled();
    canvas.dispatchEvent(new MouseEvent('pointerleave', { relatedTarget: document.body }));
    expect(onHover).toHaveBeenCalledWith(null);
    engine.dispose();
  });

  describe('new data for the same appraisal', () => {
    type Inner = {
      w: number;
      h: number;
      camera: PerspectiveCamera;
      lastRadius: number;
      fitExtent: number;
      interacted: boolean;
    };
    const make = () => {
      vi.stubGlobal(
        'ResizeObserver',
        class {
          observe() {}
          disconnect() {}
        },
      );
      const engine = new SceneEngine(
        document.createElement('div'),
        document.createElement('div'),
        { onHover: vi.fn(), onUnavailable: vi.fn() },
        false,
      );
      const inner = engine as unknown as Inner;
      // A canvas with a size, so the camera is really placed.
      inner.w = 900;
      inner.h = 600;
      return { engine, inner };
    };
    const spec = (o: Partial<BriefAsset> = {}) => buildSceneSpec([{ ...house, ...o }], null, env)!;

    it("keeps the user's view for new labels, and when the drawing changes only a little", () => {
      const { engine, inner } = make();
      engine.load(spec(), env);
      inner.interacted = true;
      inner.camera.position.set(11, 22, 33);
      engine.relabel(spec(), env);
      expect(inner.camera.position.toArray()).toEqual([11, 22, 33]);
      // 5% more floor area: the same drawing to within the eye. The ground follows, the view stays.
      const before = inner.lastRadius;
      engine.relabel(spec({ totalBuildingArea: 105 }), env);
      expect(inner.camera.position.toArray()).toEqual([11, 22, 33]);
      expect(inner.fitExtent).toBeGreaterThan(0);
      expect(Math.abs(inner.lastRadius - before)).toBeLessThan(before * 0.15);
      engine.dispose();
    });

    it('re-frames, with the ground and depth following, when the drawing changes materially', () => {
      const { engine, inner } = make();
      engine.load(spec(), env);
      inner.interacted = true;
      inner.camera.position.set(11, 22, 33);
      const before = inner.lastRadius;
      // Ten times the land and the buildings: a different extent.
      engine.relabel(spec({ areaRai: 30, totalBuildingArea: 4000, numberOfFloors: 6 }), env);
      expect(inner.lastRadius).not.toBeCloseTo(before, 1);
      expect(inner.camera.position.toArray()).not.toEqual([11, 22, 33]);
      expect(inner.camera.far).toBeGreaterThan(0);
      engine.dispose();
    });

    it('adds up small growths: a re-frame is judged against what the camera was last framed on', () => {
      const { engine, inner } = make();
      const fit = vi.spyOn(engine as unknown as { fit: () => void }, 'fit');
      const house = (totalBuildingArea: number) => spec({ totalBuildingArea });
      engine.load(house(2400), env);
      const framed = inner.lastRadius;
      fit.mockClear();
      // A step within 15% of the framed size: the camera stays.
      engine.relabel(house(3200), env);
      expect(inner.lastRadius / framed).toBeGreaterThan(1.03);
      expect(inner.lastRadius / framed).toBeLessThan(1.15);
      expect(fit).not.toHaveBeenCalled();
      // The next small step is within 15% of the LAST build, but together they are over: it re-frames.
      engine.relabel(house(4000), env);
      expect(inner.lastRadius / framed).toBeGreaterThan(1.15);
      expect(fit).toHaveBeenCalledTimes(1);
      engine.dispose();
    });
  });

  it('does not pick what is hidden, or under something hidden', () => {
    vi.stubGlobal(
      'ResizeObserver',
      class {
        observe() {}
        disconnect() {}
      },
    );
    const onHover = vi.fn();
    const engine = new SceneEngine(
      document.createElement('div'),
      document.createElement('div'),
      { onHover, onUnavailable: vi.fn() },
      false,
    );
    const inner = engine as unknown as {
      w: number;
      h: number;
      camera: PerspectiveCamera;
      kit: { picks: Mesh[] };
      pickAt: (ev: MouseEvent) => void;
    };
    inner.w = 100;
    inner.h = 100;
    inner.camera.position.set(0, 0, 10);
    inner.camera.lookAt(0, 0, 0);
    inner.camera.updateMatrixWorld();
    const make = (title: string, z: number) => {
      const m = new Mesh(new BoxGeometry(2, 2, 2));
      m.position.z = z;
      m.updateMatrixWorld();
      m.userData.pick = { info: { title, rows: [] } };
      return m;
    };
    // A shown one behind a hidden one, and one under a hidden parent.
    const hidden = make('hidden', 3);
    hidden.visible = false;
    const parent = new Group();
    const child = make('under hidden', 2);
    parent.add(child);
    parent.visible = false;
    parent.updateMatrixWorld(true);
    const shown = make('shown', 0);
    inner.kit = { picks: [hidden, child, shown] };
    inner.pickAt(new MouseEvent('pointermove', { clientX: 50, clientY: 50 }));
    expect(onHover).toHaveBeenLastCalledWith(expect.objectContaining({ title: 'shown' }));
    shown.visible = false;
    inner.pickAt(new MouseEvent('pointermove', { clientX: 50, clientY: 50 }));
    expect(onHover).toHaveBeenLastCalledWith(null, false);
    engine.dispose();
  });

  it('re-frames once, in the next frame, however many observers asked for it', () => {
    vi.stubGlobal(
      'ResizeObserver',
      class {
        observe() {}
        disconnect() {}
      },
    );
    const engine = new SceneEngine(
      document.createElement('div'),
      document.createElement('div'),
      { onHover: vi.fn(), onUnavailable: vi.fn() },
      false,
    );
    const inner = engine as unknown as {
      w: number;
      h: number;
      refit: () => void;
      frame: () => void;
    };
    inner.w = 900;
    inner.h = 600;
    engine.load(buildSceneSpec([house], null, env)!, env);
    const fit = vi.spyOn(engine as unknown as { fit: () => void }, 'fit');
    for (let i = 0; i < 6; i++) inner.refit();
    expect(fit).not.toHaveBeenCalled();
    inner.frame();
    expect(fit).toHaveBeenCalledTimes(1);
    inner.frame();
    expect(fit).toHaveBeenCalledTimes(1);
    engine.dispose();
  });

  it('hides a pin element left over from a build with more callouts', () => {
    vi.stubGlobal(
      'ResizeObserver',
      class {
        observe() {}
        disconnect() {}
      },
    );
    const engine = new SceneEngine(
      document.createElement('div'),
      document.createElement('div'),
      { onHover: vi.fn(), onUnavailable: vi.fn() },
      false,
    );
    const inner = engine as unknown as {
      w: number;
      h: number;
      calloutEls: HTMLElement[];
      placeCallouts: () => void;
    };
    inner.w = 900;
    inner.h = 600;
    engine.load(buildSceneSpec([house], null, env)!, env);
    const stale = document.createElement('div');
    stale.hidden = false;
    // More elements than this build has callouts: the extra one is stale.
    const live = Array.from(
      { length: engine.load(buildSceneSpec([house], null, env)!, env).length },
      () => document.createElement('div'),
    );
    engine.setCalloutEls([...live, stale]);
    inner.placeCallouts();
    expect(stale.hidden).toBe(true);
    engine.dispose();
  });

  it('tells a press, tap or click on the canvas from the pointer moving over it', () => {
    vi.stubGlobal(
      'ResizeObserver',
      class {
        observe() {}
        disconnect() {}
      },
    );
    const frames: (() => void)[] = [];
    vi.stubGlobal('requestAnimationFrame', (cb: () => void) => frames.push(cb));
    const host = document.createElement('div');
    const onHover = vi.fn();
    const engine = new SceneEngine(
      host,
      document.createElement('div'),
      { onHover, onUnavailable: vi.fn() },
      false,
    );
    const inner = engine as unknown as { w: number; h: number; kit: { picks: never[] } };
    inner.w = 100;
    inner.h = 100;
    inner.kit = { picks: [] };
    const canvas = host.querySelector('canvas')!;
    const touch = (type: string, init: MouseEventInit = {}) => {
      const ev = new MouseEvent(type, { clientX: 10, clientY: 10, ...init });
      Object.defineProperty(ev, 'pointerType', { value: 'touch' });
      return ev;
    };
    // The pointer moving over empty canvas: nothing under it, and not a dismissal.
    canvas.dispatchEvent(touch('pointermove'));
    frames.splice(0).forEach(f => f());
    expect(onHover).toHaveBeenLastCalledWith(null, false);
    // A finger down on the canvas, a tap on it, a drag: all dismissals.
    canvas.dispatchEvent(touch('pointerdown'));
    expect(onHover).toHaveBeenLastCalledWith(null, true);
    canvas.dispatchEvent(touch('click'));
    expect(onHover).toHaveBeenLastCalledWith(null, true);
    canvas.dispatchEvent(touch('pointermove', { buttons: 1 }));
    expect(onHover).toHaveBeenLastCalledWith(null, true);
    engine.dispose();
  });

  it("does not place the previous build's pills against new callouts before the UI hands back its elements", () => {
    vi.stubGlobal(
      'ResizeObserver',
      class {
        observe() {}
        disconnect() {}
      },
    );
    const engine = new SceneEngine(
      document.createElement('div'),
      document.createElement('div'),
      { onHover: vi.fn(), onUnavailable: vi.fn() },
      false,
    );
    const inner = engine as unknown as { w: number; h: number; placeCallouts: () => void };
    inner.w = 900;
    inner.h = 600;
    const first = engine.load(buildSceneSpec([house], null, env)!, env);
    const els = first.map(() => {
      const el = document.createElement('div');
      el.hidden = true;
      return el;
    });
    engine.setCalloutEls(els);
    inner.placeCallouts();
    expect(els.some(el => !el.hidden)).toBe(true);
    // A rebuild: until its elements arrive, the old ones are left alone.
    engine.relabel(buildSceneSpec([house], null, env)!, env);
    els.forEach(el => (el.hidden = true));
    inner.placeCallouts();
    expect(els.every(el => el.hidden)).toBe(true);
    // And once they are handed back, they are placed again.
    engine.setCalloutEls(els);
    inner.placeCallouts();
    expect(els.some(el => !el.hidden)).toBe(true);
    engine.dispose();
  });

  it('keeps a little of the ground round a small building in the frame, so it does not fill the picture', () => {
    vi.stubGlobal(
      'ResizeObserver',
      class {
        observe() {}
        disconnect() {}
      },
    );
    const engine = new SceneEngine(
      document.createElement('div'),
      document.createElement('div'),
      { onHover: vi.fn(), onUnavailable: vi.fn() },
      false,
    );
    const inner = engine as unknown as { w: number; h: number; subjectPts: number[] };
    inner.w = 900;
    inner.h = 600;
    // A 40 m2 building on a parcel of 1 rai and more.
    engine.load(
      buildSceneSpec([{ ...house, totalBuildingArea: 40, numberOfFloors: 1 }], null, env)!,
      env,
    );
    const xs = inner.subjectPts.filter((_, i) => i % 3 === 0);
    // The frame spans the building and some ground round it, not the 6 m of the building alone,
    // and not the whole parcel either.
    const span = Math.max(...xs) - Math.min(...xs);
    expect(span).toBeGreaterThanOrEqual(16);
    expect(span).toBeLessThanOrEqual(44);
    engine.dispose();
  });

  it('frames machines alone on their yard and shed, not on the whole lot', () => {
    vi.stubGlobal(
      'ResizeObserver',
      class {
        observe() {}
        disconnect() {}
      },
    );
    const engine = new SceneEngine(
      document.createElement('div'),
      document.createElement('div'),
      { onHover: vi.fn(), onUnavailable: vi.fn() },
      false,
    );
    const inner = engine as unknown as { w: number; h: number; subjectPts: number[] };
    inner.w = 900;
    inner.h = 600;
    const machine = { ...house, propertyType: 'MAC', buildingType: null, totalBuildingArea: null };
    engine.load(buildSceneSpec([machine, machine] as never, null, env)!, env);
    const xs = inner.subjectPts.filter((_, i) => i % 3 === 0);
    // A 10 m yard with its shed and a ring of ground 1.5 times its width: well under the lot's 40 m.
    expect(Math.max(...xs) - Math.min(...xs)).toBeLessThan(30);
    engine.dispose();
  });
});
