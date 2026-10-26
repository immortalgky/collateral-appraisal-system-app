/**
 * Where each callout card goes, as plain geometry so it can be tested without a DOM.
 *
 * A card is placed near its anchor dot, never over the canvas edge, another card, the hint and
 * toolbar (`reserved`) or the picture's subject (`obstacles`: the projected box of the buildings
 * or towers). The search starts from six spots round the anchor (above-right, above-left, right,
 * left, below-right, below-left) and, when a spot is blocked, tries the four ways out of the
 * blocker (beside it on either side, above it, below it), nearest to the anchor first. A leader
 * line joins the dot to the card, so the card may stand well away from it.
 *
 * Cards are placed in priority order. A card with no free spot within reach collapses to a numbered
 * dot that opens on hover or focus.
 */
export interface Rect {
  left: number;
  top: number;
  right: number;
  bottom: number;
}

export interface LayoutItem {
  id: number;
  /** Anchor in canvas px. */
  ax: number;
  ay: number;
  /** Card size in px. */
  cw: number;
  ch: number;
  /** Lower is more important: 0 legal warning, 1 the subject, 2 land, 3 pond / improvements, 4 boundaries. */
  priority: number;
  preferLeft: boolean;
}

export type Placement =
  | {
      mode: 'full';
      /** Anchor after clamping, for items that must stay on screen. */
      ax: number;
      ay: number;
      /** The card's top-left corner relative to the anchor, px. */
      dx: number;
      dy: number;
    }
  | {
      mode: 'collapsed';
      /** Where the numbered dot stands: the object's anchor, or the nearest free spot to it. */
      ax: number;
      ay: number;
      dx: number;
      dy: number;
      /** The object's own anchor, when the dot had to move off it (so a short leader can tie them). */
      from?: { x: number; y: number };
    }
  | { mode: 'hidden' };

/** Space kept between a card and the canvas edge, and between two cards. */
const EDGE = 4;
const GAP = 4;
/** Distance from the anchor dot to the near edge of a card at a base spot. */
const STEM = 26;
const SIDE = 16;
/** Cards of this priority or better stay on screen even when their anchor leaves the canvas. */
export const PINNED = 2;
/** Spots tried per card before giving up: bounds the work to a few hundred rect tests a frame. */
const MAX_TRIES = 90;
/** The numbered dot is 1.4286rem wide (collateralScene.css); the engine multiplies by the root font size. */
export const DOT_REM = 1.4286;
/** Dot diameter used when the caller has not measured one. */
const DEFAULT_DOT = 20;

const clamp = (v: number, lo: number, hi: number) => Math.min(Math.max(v, lo), Math.max(lo, hi));
const overlaps = (a: Rect, b: Rect) =>
  a.left < b.right + GAP &&
  a.right > b.left - GAP &&
  a.top < b.bottom + GAP &&
  a.bottom > b.top - GAP;

/** Distance from a point to a rectangle (0 inside it). */
const distTo = (x: number, y: number, r: Rect) =>
  Math.hypot(Math.max(r.left - x, 0, x - r.right), Math.max(r.top - y, 0, y - r.bottom));

/** The point of a card nearest its anchor: where its leader line ends. */
export const nearestPoint = (ax: number, ay: number, r: Rect) => ({
  x: clamp(ax, r.left, r.right),
  y: clamp(ay, r.top, r.bottom),
});

/**
 * Where an object BEHIND the camera goes on screen, as a point just outside the canvas edge in its
 * true direction. `x`, `y` are its projected NDC (after the divide by a negative w, which mirrors
 * the object through the centre), so the direction is the negation. The ray from the centre is
 * scaled to meet the edge: a side edge for a mostly sideways direction, not a corner.
 */
export function behindCameraEdge(x: number, y: number, w: number, h: number) {
  // NDC to pixels first: a direction in NDC is not one on a canvas that is not square.
  const dx = (-x * w) / 2;
  const dy = (y * h) / 2; // NDC y points up, the screen's down: -(-y)
  if (!dx && !dy) return { x: w / 2, y: -1 };
  const t = Math.min(
    dx ? (w / 2 + 1) / Math.abs(dx) : Infinity,
    dy ? (h / 2 + 1) / Math.abs(dy) : Infinity,
  );
  return { x: w / 2 + dx * t, y: h / 2 + dy * t };
}

/** Whether a dot of this size centred at (x, y) touches any rect: the one predicate for every dot test. */
const hitsAny = (list: Rect[], x: number, y: number, half: number) =>
  list.some(
    b => x > b.left - half && x < b.right + half && y > b.top - half && y < b.bottom + half,
  );

export function layoutCallouts(
  items: LayoutItem[],
  reserved: Rect[],
  obstacles: Rect[],
  w: number,
  h: number,
  dot = DEFAULT_DOT,
): Map<number, Placement> {
  const out = new Map<number, Placement>();
  const half = dot / 2 + GAP;
  const lo = dot / 2 + 2;
  const around = (x: number, y: number): Rect => ({
    left: x - dot / 2,
    top: y - dot / 2,
    right: x + dot / 2,
    bottom: y + dot / 2,
  });
  // What a later card or dot must keep off, grown as items are placed: the toolbar and hint, then
  // each card; and, separately, each dot that is shown (a hidden dot reserves nothing).
  const solid: Rect[] = [...reserved];
  const dots: Rect[] = [];
  const collapsed: { it: LayoutItem; rx: number; ry: number; k: number }[] = [];
  // Set when a full card is placed after a collapsed dot: only then can a dot have lost its spot.
  let lateFull = false;
  const order = [...items].sort((a, b) => a.priority - b.priority || b.ay - a.ay);
  /** How far from its dot a card may stand. */
  const reach = Math.max(140, 0.75 * h);

  /** A collapsed dot's place: near its object, inside the canvas, off every other dot, and (for a pinned one) off the cards and the toolbar. */
  const settle = (it: LayoutItem, rx: number, ry: number, others: Rect[]) => {
    const pinned = it.priority <= PINNED;
    const x = clamp(rx, lo, w - lo);
    const y = clamp(ry, lo, h - lo);
    return settleDot(x, y, pinned ? [solid, others] : [others], [solid, others], w, h, half, lo);
  };
  const collapsedAt = (
    it: LayoutItem,
    ax: number,
    ay: number,
    rx: number,
    ry: number,
  ): Placement => {
    // The card a hover reveals opens above-right of its dot, as far as the canvas allows.
    const left = clamp(ax - 18, EDGE, w - EDGE - it.cw);
    const top = clamp(ay - STEM - it.ch, EDGE, h - EDGE - it.ch);
    const moved = Math.hypot(ax - rx, ay - ry) > dot / 2;
    return {
      mode: 'collapsed',
      ax,
      ay,
      dx: left - ax,
      dy: top - ay,
      ...(moved ? { from: { x: rx, y: ry } } : {}),
    };
  };

  for (const it of order) {
    const inside = it.ax >= 0 && it.ax <= w && it.ay >= 0 && it.ay <= h;
    const pinned = it.priority <= PINNED;
    if (!inside && !pinned) {
      out.set(it.id, { mode: 'hidden' });
      continue;
    }
    // An anchor on the canvas is where the object is. Only a pinned anchor that left the canvas
    // is pulled back to its edge, so a warning is never lost to a zoom or an orbit.
    let ax = inside ? it.ax : clamp(it.ax, 16, w - 16);
    let ay = inside ? it.ay : clamp(it.ay, STEM + 6, h - 16);
    // An object that stands under a card, the title or the toolbar cannot be pointed at: a pin on
    // it is dropped, except a pinned warning, which moves to the nearest clear spot instead.
    if (hitsAny(reserved, ax, ay, 0)) {
      if (!pinned) {
        out.set(it.id, { mode: 'hidden' });
        continue;
      }
      [ax, ay] = settleDot(ax, ay, [reserved], [reserved], w, h, half, lo);
    }

    const spot = place(it, ax, ay, [solid, dots, obstacles], w, h, reach);
    if (spot) {
      // A card's dot stays on the object it marks, so its leader starts there.
      solid.push(spot.rect);
      out.set(it.id, { mode: 'full', ax, ay, dx: spot.rect.left - ax, dy: spot.rect.top - ay });
      dots.push(around(ax, ay));
      if (collapsed.length) lateFull = true;
      continue;
    }
    // No card: the dot is the hover and click target, so it may not share a spot with another
    // dot, and a pinned one (a warning) also keeps off the toolbar, the hint and the cards.
    const [dx, dy] = settle(it, ax, ay, dots);
    // A dot under a card would sit on its text, and one under the toolbar would take its clicks:
    // leave it out (the object's own hover card still carries the details). Never a pinned one.
    if (!pinned && hitsAny(solid, dx, dy, half)) {
      out.set(it.id, { mode: 'hidden' });
      continue;
    }
    out.set(it.id, collapsedAt(it, dx, dy, ax, ay));
    collapsed.push({ it, rx: ax, ry: ay, k: dots.length });
    dots.push(around(dx, dy));
  }

  // A full card placed after a collapsed dot may have taken its spot (a card's dot cannot move):
  // settle those dots once more against all the others, so no numbered dot sits on another
  // callout's anchor. A dot shown before is never hidden here: if it cannot move, it stays.
  for (const { it, rx, ry, k } of lateFull ? collapsed : []) {
    const [dx, dy] = settle(
      it,
      rx,
      ry,
      dots.filter((_, j) => j !== k),
    );
    if (it.priority <= PINNED || !hitsAny(solid, dx, dy, half)) {
      out.set(it.id, collapsedAt(it, dx, dy, rx, ry));
      dots[k] = around(dx, dy);
    }
  }
  return out;
}

/**
 * The nearest point to (x, y), inside the canvas, where a dot touches none of `avoid`: beside a
 * rect on any of its four sides, or one dot-width away in any direction (several dots on one spot
 * fan out). Only a dot that touches one of `need` moves at all; (x, y) itself when nothing is free.
 */
function settleDot(
  x: number,
  y: number,
  need: Rect[][],
  avoid: Rect[][],
  w: number,
  h: number,
  half: number,
  lo: number,
): [number, number] {
  if (!need.some(l => hitsAny(l, x, y, half))) return [x, y];
  const step = 2 * half;
  const spots: [number, number][] = avoid.flatMap(list =>
    list.flatMap((b): [number, number][] => [
      [b.left - half, y],
      [b.right + half, y],
      [x, b.top - half],
      [x, b.bottom + half],
    ]),
  );
  for (let r = 1; r <= 3; r++)
    for (const [dx, dy] of [
      [1, 0],
      [-1, 0],
      [0, 1],
      [0, -1],
      [1, 1],
      [-1, 1],
      [1, -1],
      [-1, -1],
    ])
      spots.push([x + dx * r * step, y + dy * r * step]);
  const free = spots
    .map(([px, py]): [number, number] => [clamp(px, lo, w - lo), clamp(py, lo, h - lo)])
    .filter(([px, py]) => !avoid.some(l => hitsAny(l, px, py, half)))
    .sort((a, b) => Math.hypot(a[0] - x, a[1] - y) - Math.hypot(b[0] - x, b[1] - y));
  return free[0] ?? [x, y];
}

interface Cand {
  x: number;
  y: number;
  cost: number;
}

/** The free spot for one card nearest its anchor, or null. */
function place(
  it: LayoutItem,
  ax: number,
  ay: number,
  blockers: Rect[][],
  w: number,
  h: number,
  reach: number,
): { rect: Rect } | null {
  const { cw, ch } = it;
  if (cw > w - 2 * EDGE || ch > h - 2 * EDGE) return null;
  const rectAt = (x: number, y: number): Rect => ({
    left: x,
    top: y,
    right: x + cw,
    bottom: y + ch,
  });
  const base: [number, number][] = it.preferLeft
    ? [
        [ax + 18 - cw, ay - STEM - ch],
        [ax - 18, ay - STEM - ch],
        [ax - SIDE - cw, ay - ch / 2],
        [ax + SIDE, ay - ch / 2],
        [ax + 18 - cw, ay + STEM],
        [ax - 18, ay + STEM],
      ]
    : [
        [ax - 18, ay - STEM - ch],
        [ax + 18 - cw, ay - STEM - ch],
        [ax + SIDE, ay - ch / 2],
        [ax - SIDE - cw, ay - ch / 2],
        [ax - 18, ay + STEM],
        [ax + 18 - cw, ay + STEM],
      ];
  const frontier: Cand[] = [];
  const seen = new Set<string>();
  const push = (x: number, y: number, penalty: number) => {
    // A spot is always inside the canvas: slide it in rather than drop it.
    const cx = clamp(x, EDGE, w - EDGE - cw);
    const cy = clamp(y, EDGE, h - EDGE - ch);
    const key = `${Math.round(cx)},${Math.round(cy)}`;
    if (seen.has(key)) return;
    seen.add(key);
    frontier.push({ x: cx, y: cy, cost: distTo(ax, ay, rectAt(cx, cy)) + penalty });
  };
  // The base spots keep their order (above-right first) whatever their distance; only the ways
  // out of a blocker compete on distance.
  base.forEach(([x, y], i) => push(x, y, i * 40));

  for (let tries = 0; tries < MAX_TRIES && frontier.length; tries++) {
    let best = 0;
    for (let i = 1; i < frontier.length; i++) if (frontier[i].cost < frontier[best].cost) best = i;
    const c = frontier.splice(best, 1)[0];
    // The frontier is taken nearest first: nothing past reach is any better.
    if (c.cost > reach) break;
    const r = rectAt(c.x, c.y);
    const hit = blockers.reduce<Rect | undefined>(
      (f, l) => f ?? l.find(b => overlaps(r, b)),
      undefined,
    );
    if (!hit) return { rect: r };
    // Out of the blocker: beside it on either side, above it, below it.
    push(hit.right + GAP, c.y, 1);
    push(hit.left - GAP - cw, c.y, 1);
    push(c.x, hit.top - GAP - ch, 1);
    push(c.x, hit.bottom + GAP, 1);
  }
  return null;
}
