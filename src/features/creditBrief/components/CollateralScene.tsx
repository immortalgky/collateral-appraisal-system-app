import { useLayoutEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useParametersByGroup } from '@/shared/utils/parameterUtils';
import { buildScene, type Kind, type SceneItem } from '../sceneModel';
import type { BriefAsset, BriefProject } from '../api/appraisalBrief';

/**
 * The collateral on an application, drawn as a small isometric site.
 *
 * Answers "what is this secured on" faster than a list can: a reader sees one
 * parcel with a house on it, or a plant with twenty-eight machines, before
 * reading a word. It is a companion to CollateralList, not a replacement — the
 * rows carry the numbers, the scene carries the shape.
 *
 * CSS 3D throughout (see styles/collateralScene.css): no library, no GL
 * context, no animation loop, and one fixed camera so two applications can be
 * compared at a glance.
 */
interface CollateralSceneProps {
  assets: BriefAsset[];
  /** Set for a block appraisal, whose collateral is a project and not a list of assets. */
  project: BriefProject | null;
}

// ── palette ──────────────────────────────────────────────────────────────────

const PALETTE: Record<Kind, { top: string; front: string; side: string }> = {
  land: { top: '#a7d7cf', front: '#7fc0b6', side: '#6cb2a8' },
  building: { top: '#cbd5e1', front: '#a9b6c7', side: '#97a6ba' },
  condo: { top: '#bcd0e8', front: '#9ab4d4', side: '#88a4c8' },
  machine: { top: '#f5cf9a', front: '#e6b06a', side: '#d79f57' },
};

// ── geometry ─────────────────────────────────────────────────────────────────

const PLATE = { w: 122, d: 96, h: 3 };
const TOWER_PX = 92;
const TILT = 58;
const SPIN = -42;
const rad = (a: number) => (a * Math.PI) / 180;

const heightOf = (kind: Kind, storeys: number) => {
  if (kind === 'machine') return 22;
  if (kind === 'condo') return Math.max(2.6, Math.min(9, TOWER_PX / storeys)) * storeys;
  return 26 * storeys;
};

// ── component ────────────────────────────────────────────────────────────────

interface Placed {
  key: string;
  cls: string;
  style: React.CSSProperties;
  bands: { face: string; bh: number; bb: number }[];
}
interface Callout {
  key: string;
  side: 'left' | 'right';
  x: number;
  y: number;
  anchor: { x: number; y: number };
  item: SceneItem;
}

const CollateralScene = ({ assets, project }: CollateralSceneProps) => {
  const { t } = useTranslation('appraisal');
  const hostRef = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ w: 0, h: 0 });

  // The fit depends on how wide the panel is, and the panel is a slide-over
  // that can be resized. Measured rather than assumed.
  useLayoutEffect(() => {
    const el = hostRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setSize({ w: el.clientWidth, h: el.clientHeight }));
    ro.observe(el);
    setSize({ w: el.clientWidth, h: el.clientHeight });
    return () => ro.disconnect();
  }, []);

  // Building type labels come from the global parameter store, the same source
  // the property screens read.
  const buildingTypes = useParametersByGroup('BuildingType');
  const items = useMemo(
    () =>
      buildScene(assets, project, t, code =>
        code ? (buildingTypes.find(p => p.code === code)?.description ?? '') : '',
      ),
    [assets, project, t, buildingTypes],
  );

  // Nothing drawable — an application of vehicles or vessels only. The rows
  // below still list them; a scene with an empty plot would say less than none.
  if (items.length === 0) return null;

  const landItem = items.find(i => i.kind === 'land') ?? null;
  const onTop = items.filter(i => i.kind !== 'land');

  // A parcel-less application — a building on leased ground, machines in a
  // rented plant — still needs a surface, or its structures float. One faint
  // apron stands in, unlabelled, because it is not collateral.
  // Every object that will stand on the plot, flattened out of its group.
  const standing = onTop.flatMap(item =>
    item.storeysEach.map((storeys, n) => ({ item, storeys, first: n === 0 })),
  );

  /**
   * Structures are spaced by their own WIDTH, and the plot grows to hold them.
   *
   * The spacing used to be the plot width divided by the object count, which
   * meant three houses on a single-parcel project were placed 35px apart while
   * each is 54px wide — they overlapped into one slab and the scene looked like
   * it had drawn one building instead of three. Deriving the step from the
   * object instead, and then sizing the ground to the row, keeps them apart at
   * any count; it is also the truer picture, since three houses do stand on
   * more land than one.
   */
  const SPACING = 68;
  const rowSpan = Math.max(0, standing.length - 1) * SPACING;
  const plateCount = Math.max(
    landItem?.storeysEach.length ?? 0,
    Math.ceil((rowSpan + 74) / PLATE.w),
    1,
  );
  const groundSpan = (plateCount - 1) * PLATE.w;
  const plotW = groundSpan + PLATE.w;
  const tallest = Math.max(0, ...standing.map(o => heightOf(o.item.kind, o.storeys)));

  const stageW = size.w || 720;
  const stageH = size.h || 250;

  // Reserve the gutters the callouts live in, then fit the scene to what is
  // left. Scaling UP matters as much as down: the average application holds one
  // property, which at 1x would sit tiny in the middle of a wide panel.
  const gutter = Math.min(190, stageW * 0.24);
  const spread = Math.abs(Math.cos(rad(SPIN))) + Math.abs(Math.sin(rad(SPIN)));
  const side = Math.max(plotW, PLATE.d);
  const projW = side * spread;
  const projH = side * spread * Math.cos(rad(TILT)) + tallest * Math.sin(rad(TILT));
  const zoom = Math.max(
    0.55,
    Math.min(2.2, 0.82 * Math.min((stageW - gutter * 2 - 24) / projW, (stageH - 40) / projH)),
  );
  /**
   * Put the drawing's own centre in the middle of the box, not the ground plane.
   *
   * `originY` is where ground level sits, and everything is drawn UPWARD from
   * it — so anchoring it near the middle left the scene hugging the top edge
   * with an empty half underneath. Centring means measuring how far the scene
   * actually reaches in each direction and splitting the difference.
   */
  const up = tallest * Math.sin(rad(TILT)) * zoom; // tallest roof, above origin
  const down = ((side * spread) / 2) * Math.cos(rad(TILT)) * zoom; // near plot corner, below
  const originY = Math.round(
    // Clamped so neither end can leave the stage, which is `overflow: hidden`.
    Math.min(Math.max(stageH / 2 + (up - down) / 2, up + 14), stageH - down - 14),
  );

  /** World point → stage px. Mirrors the CSS transform order, then perspective. */
  const toScreen = (x: number, y: number, z: number) => {
    const sx = x * zoom,
      sy = y * zoom,
      sz = z * zoom;
    const rx = sx * Math.cos(rad(SPIN)) - sy * Math.sin(rad(SPIN));
    const ry = sx * Math.sin(rad(SPIN)) + sy * Math.cos(rad(SPIN));
    const py = ry * Math.cos(rad(TILT)) - sz * Math.sin(rad(TILT));
    const pz = ry * Math.sin(rad(TILT)) + sz * Math.cos(rad(TILT));
    const ox = stageW * 0.5,
      oy = stageH * 0.44;
    const f = 1400 / (1400 - pz);
    return { x: ox + (stageW / 2 + rx - ox) * f, y: oy + (originY + py - oy) * f };
  };

  const boxes: Placed[] = [];
  const pins: { x: number; y: number; h: number; item: SceneItem }[] = [];

  for (let i = 0; i < plateCount; i++) {
    const x = -groundSpan / 2 + i * PLATE.w;
    boxes.push({
      key: `plate-${i}`,
      cls: `cscene-obj plate${landItem ? '' : ' apron'}`,
      style: cssVars({ ...PLATE, x, y: 0, z: 0, kind: 'land', storeys: 1 }),
      bands: [],
    });
    // One pin per kind, on the first object of it.
    if (landItem && i === 0) pins.push({ x, y: 0, h: PLATE.h, item: landItem });
  }

  standing.forEach((o, i) => {
    const { kind } = o.item;
    const h = heightOf(kind, o.storeys);
    const isMachine = kind === 'machine';
    const isCondo = kind === 'condo';
    const w = isMachine ? 38 : isCondo ? 44 : 54;
    const d = isMachine ? 32 : isCondo ? 40 : 44;
    const x = -rowSpan / 2 + i * SPACING;
    // Machines forward, structures back, so a plant and its equipment do not
    // overlap at this camera angle.
    const y = isMachine ? 22 : -16;

    const fl = h / o.storeys;
    const bands = isCondo
      ? o.item.occupied
          .filter(n => n >= 1 && n <= o.storeys)
          .flatMap(n =>
            ['n', 's', 'w', 'e'].map(face => ({
              face,
              bh: Math.max(2, fl - 1),
              bb: (n - 1) * fl,
            })),
          )
      : [];

    boxes.push({
      key: `obj-${i}`,
      cls: `cscene-obj${o.storeys > 1 ? ' storeys' : ''}`,
      style: cssVars({ w, d, h, x, y, z: PLATE.h, kind, storeys: o.storeys }),
      bands,
    });
    if (o.first) pins.push({ x, y, h: h + PLATE.h, item: o.item });
  });

  // Callouts hug the scene, not the panel edge — anchoring them to the edge
  // left the leader lines crossing empty background.
  const projected = pins.map((p, i) => ({ ...p, key: `pin-${i}`, at: toScreen(p.x, p.y, p.h) }));
  const xs = projected.map(p => p.at.x);
  const sceneL = Math.min(...xs);
  const sceneR = Math.max(...xs);
  const CARD = 170;
  const callouts: Callout[] = [];

  (['left', 'right'] as const).forEach(sideName => {
    const list = projected
      .filter(p => (p.at.x < stageW / 2 ? 'left' : 'right') === sideName)
      .sort((a, b) => a.at.y - b.at.y);
    let cursor = -Infinity;
    list.forEach(p => {
      const y = Math.min(stageH - 22, Math.max(22, Math.max(p.at.y, cursor + 44)));
      cursor = y;
      const x =
        sideName === 'left'
          ? Math.max(CARD + 10, sceneL - 34)
          : Math.min(stageW - CARD - 10, sceneR + 34);
      callouts.push({ key: p.key, side: sideName, x, y, anchor: p.at, item: p.item });
    });
  });

  return (
    <div
      ref={hostRef}
      className="cscene mb-3 h-[250px] rounded-xl bg-gradient-to-b from-white via-gray-50 to-gray-100/70 ring-1 ring-gray-200"
    >
      <div
        className="cscene-world"
        style={
          {
            top: `${originY}px`,
            '--tilt': `${TILT}deg`,
            '--spin': `${SPIN}deg`,
            '--zoom': String(zoom),
          } as React.CSSProperties
        }
      >
        <div className="cscene-grid" />
        {boxes.map(b => (
          <div key={b.key} className={b.cls} style={b.style}>
            <div className="cscene-shadow" />
            {(['top', 'n', 's', 'w', 'e'] as const).map(face => {
              const faceBands = b.bands.filter(x => x.face === face);
              return (
                <div
                  key={face}
                  className={`cscene-face ${face}${faceBands.length ? ' banded' : ''}`}
                >
                  {faceBands.map((band, i) => (
                    <i
                      key={i}
                      style={
                        { '--bh': `${band.bh}px`, '--bb': `${band.bb}px` } as React.CSSProperties
                      }
                    />
                  ))}
                </div>
              );
            })}
          </div>
        ))}
      </div>

      <div className="cscene-overlay">
        <svg className="cscene-leads">
          {callouts.map(c => {
            // `c.x` is the card's inner edge on either side — on the left the
            // card carries translate(-100%), so that value is its right edge.
            const midX = (c.anchor.x + c.x) / 2;
            return (
              <g key={c.key}>
                <path
                  d={`M ${c.anchor.x} ${c.anchor.y} L ${midX} ${c.anchor.y} L ${midX} ${c.y} L ${c.x} ${c.y}`}
                />
                <circle cx={c.anchor.x} cy={c.anchor.y} r={2.5} />
              </g>
            );
          })}
        </svg>
        {callouts.map(c => (
          <div
            key={c.key}
            className={`cscene-callout ${c.side}`}
            style={{ top: `${Math.round(c.y)}px`, left: `${Math.round(c.x)}px` }}
          >
            <span className="flex items-center gap-1.5 font-bold">
              <i
                className="h-[7px] w-[7px] flex-none rounded-full"
                style={{ background: PALETTE[c.item.kind].front }}
              />
              {c.item.label}
              {c.item.hidden > 0 && (
                <span className="font-normal text-gray-400">
                  {t('activityTracking.brief.collateral.morePlaces', { count: c.item.hidden })
                    .replace(/จังหวัด|province\(s\)/, '')
                    .trim()}
                </span>
              )}
              {c.item.count > 1 && (
                <span className="rounded-full bg-amber-600 px-1.5 text-[10.5px] font-bold text-white">
                  ×{c.item.count}
                </span>
              )}
            </span>
            {c.item.detail && (
              <span className="mt-px block truncate pl-[13px] text-[10.5px] font-normal text-gray-500">
                {c.item.detail}
              </span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

/** The custom properties one box needs, as an inline style object. */
function cssVars(o: {
  w: number;
  d: number;
  h: number;
  x: number;
  y: number;
  z: number;
  kind: Kind;
  storeys: number;
}): React.CSSProperties {
  const c = PALETTE[o.kind];
  return {
    '--w': `${o.w}px`,
    '--d': `${o.d}px`,
    '--h': `${o.h}px`,
    '--x': `${o.x}px`,
    '--y': `${o.y}px`,
    '--z': `${o.z}px`,
    '--ct': c.top,
    '--cf': c.front,
    '--cs': c.side,
    '--fl': `${o.storeys > 1 ? o.h / o.storeys : o.h}px`,
  } as React.CSSProperties;
}

export default CollateralScene;
