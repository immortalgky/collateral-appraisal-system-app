/**
 * Assumed layout of a horizontal (LB) project, as plain geometry.
 *
 * The system records which plots exist and how big they are, not where they are. So the picture is
 * a convention: one entrance road from the frontage, an optional common area just inside it, then
 * internal roads with plots back to back along them, split in two halves by a spine road.
 *
 *            front (road side, +z)
 *     ───────────  entrance  ───────────
 *               [ common area ]
 *     ═══════════ internal road ═══════════
 *     [plot][plot]  ║  [plot][plot]   row A  (faces the road above)
 *     [plot][plot]  ║  [plot][plot]   row B  (back to back with A, faces the road below)
 *     ═══════════ internal road ═══════════
 *
 * Coordinates are metres, x to the right, +z toward the road, the whole layout centred on 0.
 */

export interface PlotIn {
  /** Plot width along the road and depth away from it, m. */
  w: number;
  d: number;
}

export interface Rect {
  x: number;
  z: number;
  w: number;
  d: number;
}

export interface PlacedPlot extends Rect {
  /** Index into the input list. */
  index: number;
  /** The side of the plot the house faces: +z (row A, road above) or -z (row B, road below). */
  facing: 1 | -1;
}

export interface VillageLayout {
  plots: PlacedPlot[];
  /** Entrance road, the spine through the plots, and the internal roads across them. */
  roads: Rect[];
  /** Central common area; null when the project records no facilities. */
  plaza: Rect | null;
  /** x of the spine road, which runs the full depth. */
  spineX: number;
  /** Everything's bounding box. */
  width: number;
  depth: number;
  rows: number;
}

export const ROAD_W = 6;
export const SPINE_W = 7;
/** Entrance road between the frontage and the first thing inside. */
export const ENTRANCE = 14;
export const PLAZA = { w: 44, d: 30 };
/** Plot depth / width. ponytail: assumed; the system records the area, not the shape. */
export const PLOT_RATIO = 2;

/** Plot rectangle for a land area in m2. */
export const plotSize = (sqm: number): PlotIn => {
  const w = Math.max(5, Math.sqrt(sqm / PLOT_RATIO));
  return { w, d: sqm / w };
};

interface Row {
  left: number[];
  right: number[];
  leftW: number;
  rightW: number;
  depth: number;
}

/**
 * Fill rows from the plot list, alternating left and right of the spine. A plot goes on the
 * narrower half only while that half stays within `half`, so a row never overshoots the width it
 * was asked to fill; a half always takes its first plot, even one wider than `half`.
 */
function fillRows(plots: PlotIn[], half: number): Row[] {
  const rows: Row[] = [];
  let i = 0;
  while (i < plots.length) {
    const row: Row = { left: [], right: [], leftW: 0, rightW: 0, depth: 0 };
    while (i < plots.length) {
      const p = plots[i];
      const toLeft = row.leftW <= row.rightW;
      const w = toLeft ? row.leftW : row.rightW;
      // The other half is at least as wide, so if this one is full the row is.
      if (w > 0 && w + p.w > half) break;
      if (toLeft) {
        row.left.push(i);
        row.leftW += p.w;
      } else {
        row.right.push(i);
        row.rightW += p.w;
      }
      row.depth = Math.max(row.depth, p.d);
      i++;
    }
    rows.push(row);
  }
  return rows;
}

/**
 * @param targetWidth width the plot rows should fill, e.g. a known rectangular parcel's width less
 *   its margins; omitted, the layout aims at a plan about 1.3 times wider than deep.
 */
export function layoutVillage(
  plots: PlotIn[],
  { plaza = false, targetWidth }: { plaza?: boolean; targetWidth?: number } = {},
): VillageLayout {
  if (plots.length === 0) {
    return { plots: [], roads: [], plaza: null, spineX: 0, width: 0, depth: 0, rows: 0 };
  }
  const maxW = Math.max(...plots.map(p => p.w));
  const area = plots.reduce((s, p) => s + p.w * p.d, 0);
  const wanted = targetWidth ?? Math.sqrt(area * 1.35 * 1.3);
  const half = Math.max(maxW, (wanted - SPINE_W) / 2);
  const rows = fillRows(plots, half);

  const leftMax = Math.max(...rows.map(r => r.leftW));
  const rightMax = Math.max(...rows.map(r => r.rightW));
  // Symmetric about the spine, which is the centre line, and wide enough for the common area.
  const reach = Math.max(leftMax, rightMax) + SPINE_W / 2;
  const width = 2 * Math.max(reach, plaza ? PLAZA.w / 2 : 0);
  const sx = 0;

  const placed: PlacedPlot[] = [];
  const roads: Rect[] = [];
  let z = 0; // moving toward the back, so z only decreases until the final centring
  const spineTop = z;
  z -= ENTRANCE;

  let plazaRect: Rect | null = null;
  if (plaza) {
    plazaRect = { x: sx, z: z - PLAZA.d / 2, w: PLAZA.w, d: PLAZA.d };
    z -= PLAZA.d;
  }
  const road = () => {
    roads.push({ x: 0, z: z - ROAD_W / 2, w: width, d: ROAD_W });
    z -= ROAD_W;
  };
  road();
  rows.forEach((row, r) => {
    const facing: 1 | -1 = r % 2 === 0 ? 1 : -1;
    const top = z;
    let cursor = sx - SPINE_W / 2;
    for (const idx of row.left) {
      const p = plots[idx];
      cursor -= p.w;
      placed.push({
        index: idx,
        x: cursor + p.w / 2,
        z: placeZ(top, row.depth, p.d, facing),
        w: p.w,
        d: p.d,
        facing,
      });
    }
    cursor = sx + SPINE_W / 2;
    for (const idx of row.right) {
      const p = plots[idx];
      placed.push({
        index: idx,
        x: cursor + p.w / 2,
        z: placeZ(top, row.depth, p.d, facing),
        w: p.w,
        d: p.d,
        facing,
      });
      cursor += p.w;
    }
    z -= row.depth;
    // A road closes each back-to-back pair. An odd last row has no road behind it: its back is the edge.
    if (r % 2 === 1) road();
  });

  const spineBottom = z;
  roads.push({ x: sx, z: (spineTop + spineBottom) / 2, w: SPINE_W, d: spineTop - spineBottom });

  const depth = spineTop - spineBottom;
  // Centre on z = 0 with the front at +depth / 2.
  const dz = depth / 2;
  const shift = (r: Rect): Rect => ({ ...r, z: r.z + dz });
  return {
    plots: placed.map(p => ({ ...p, ...shift(p) })),
    roads: roads.map(shift),
    plaza: plazaRect && shift(plazaRect),
    spineX: sx,
    width,
    depth,
    rows: rows.length,
  };
}

/** A plot sits against the road it faces: its front edge on the row's front line. */
const placeZ = (top: number, rowDepth: number, d: number, facing: 1 | -1) =>
  facing === 1 ? top - d / 2 : top - rowDepth + d / 2;
