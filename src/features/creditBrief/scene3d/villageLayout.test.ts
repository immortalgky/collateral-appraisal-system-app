import { describe, expect, it } from 'vitest';
import {
  ENTRANCE,
  layoutVillage,
  type PlotIn,
  plotSize,
  PLAZA,
  type Rect,
  type VillageLayout,
} from './villageLayout';

const overlap = (a: Rect, b: Rect) =>
  Math.abs(a.x - b.x) < (a.w + b.w) / 2 - 1e-6 && Math.abs(a.z - b.z) < (a.d + b.d) / 2 - 1e-6;

const plots = (n: number, sqm = 200): PlotIn[] => Array.from({ length: n }, () => plotSize(sqm));

/**
 * Every plot against every other, every road and the plaza. Roads cross each other by design.
 * A sweep along x (a plot is compared only with those whose span starts before it ends) with one
 * assertion at the end: 800 plots stay well under a second, where all pairs and an `expect` each
 * took seconds.
 */
const noOverlaps = (l: VillageLayout) => {
  const left = (r: Rect) => r.x - r.w / 2;
  const right = (r: Rect) => r.x + r.w / 2;
  const sorted = [...l.plots].sort((a, b) => left(a) - left(b));
  const hits: [number, number][] = [];
  for (let i = 0; i < sorted.length; i++) {
    for (let j = i + 1; j < sorted.length && left(sorted[j]) < right(sorted[i]) - 1e-6; j++) {
      if (overlap(sorted[i], sorted[j])) hits.push([sorted[i].index, sorted[j].index]);
    }
    for (const r of l.roads) if (overlap(sorted[i], r)) hits.push([sorted[i].index, -1]);
    if (l.plaza && overlap(sorted[i], l.plaza)) hits.push([sorted[i].index, -2]);
  }
  expect(hits).toEqual([]);
};

const inside = (l: VillageLayout) => {
  for (const r of [...l.plots, ...l.roads, ...(l.plaza ? [l.plaza] : [])]) {
    expect(r.x - r.w / 2).toBeGreaterThanOrEqual(-l.width / 2 - 1e-6);
    expect(r.x + r.w / 2).toBeLessThanOrEqual(l.width / 2 + 1e-6);
    expect(r.z - r.d / 2).toBeGreaterThanOrEqual(-l.depth / 2 - 1e-6);
    expect(r.z + r.d / 2).toBeLessThanOrEqual(l.depth / 2 + 1e-6);
  }
};

describe('overlap helper', () => {
  it('sees touching rectangles as clear and overlapping ones as not', () => {
    expect(overlap({ x: 0, z: 0, w: 2, d: 2 }, { x: 2, z: 0, w: 2, d: 2 })).toBe(false);
    expect(overlap({ x: 0, z: 0, w: 2, d: 2 }, { x: 1, z: 0, w: 2, d: 2 })).toBe(true);
  });
});

describe('plotSize', () => {
  it('keeps the area and the assumed 1:2 shape', () => {
    const p = plotSize(200);
    expect(p.w * p.d).toBeCloseTo(200);
    expect(p.d / p.w).toBeCloseTo(2);
  });

  it('never makes a plot narrower than 5 m', () => {
    expect(plotSize(10).w).toBeGreaterThanOrEqual(5);
  });
});

describe('layoutVillage', () => {
  it('is empty for no plots', () => {
    const l = layoutVillage([]);
    expect(l.plots).toEqual([]);
    expect(l.width).toBe(0);
  });

  it.each([1, 2, 4, 5, 40, 300, 800])('places %i plots without overlapping anything', n => {
    const l = layoutVillage(plots(n), { plaza: n > 1 });
    expect(l.plots).toHaveLength(n);
    expect(new Set(l.plots.map(p => p.index)).size).toBe(n);
    noOverlaps(l);
    inside(l);
  });

  it('copes with plots of different sizes in one project', () => {
    const mixed = [...plots(10, 120), ...plots(14, 260), ...plots(6, 500)];
    const l = layoutVillage(mixed, { plaza: true });
    noOverlaps(l);
    inside(l);
  });

  it('puts plots back to back: rows alternate which road they face', () => {
    const l = layoutVillage(plots(40));
    const a = l.plots.filter(p => p.facing === 1);
    const b = l.plots.filter(p => p.facing === -1);
    expect(a.length).toBeGreaterThan(0);
    expect(b.length).toBeGreaterThan(0);
    // the first row faces the first road; a back-to-back row sits behind it
    expect(Math.min(...b.map(p => p.z))).toBeLessThan(Math.min(...a.map(p => p.z)) + 1e-6);
  });

  it('has one road more than pairs of rows, and a spine that runs the full depth', () => {
    for (const n of [4, 24, 60]) {
      const l = layoutVillage(plots(n));
      const spine = l.roads[l.roads.length - 1];
      expect(spine.d).toBeCloseTo(l.depth);
      expect(spine.x).toBeCloseTo(l.spineX);
      expect(l.roads.length - 1).toBe(Math.floor(l.rows / 2) + 1);
    }
  });

  it('leaves the entrance clear and the common area just inside it, on the spine', () => {
    const l = layoutVillage(plots(30), { plaza: true });
    expect(l.plaza).not.toBeNull();
    expect(l.plaza!.x).toBeCloseTo(l.spineX);
    expect(l.plaza!.w).toBe(PLAZA.w);
    // nothing but the spine between the frontage and the plaza
    expect(l.depth / 2 - (l.plaza!.z + l.plaza!.d / 2)).toBeCloseTo(ENTRANCE);
    expect(layoutVillage(plots(30)).plaza).toBeNull();
  });

  it('never makes a row wider than the width it was asked to fill', () => {
    for (const [n, sqm] of [
      [40, 200],
      [60, 200],
      [100, 200],
      [200, 200],
      [60, 450],
    ] as const) {
      for (const target of [120, 219, 320]) {
        const l = layoutVillage(plots(n, sqm), { plaza: true, targetWidth: target });
        expect(l.width).toBeLessThanOrEqual(target + 1e-6);
      }
    }
  });

  it('keeps the common area inside the layout, even beside one big plot', () => {
    const l = layoutVillage([plotSize(1800)], { plaza: true });
    expect(l.plaza!.x - l.plaza!.w / 2).toBeGreaterThanOrEqual(-l.width / 2 - 1e-6);
    expect(l.plaza!.x + l.plaza!.w / 2).toBeLessThanOrEqual(l.width / 2 + 1e-6);
    inside(l);
  });

  it('fills a target width when one is given', () => {
    const wide = layoutVillage(plots(80), { targetWidth: 220 });
    const narrow = layoutVillage(plots(80), { targetWidth: 90 });
    expect(wide.width).toBeGreaterThan(narrow.width);
    expect(wide.depth).toBeLessThan(narrow.depth);
  });

  it('is deterministic', () => {
    expect(layoutVillage(plots(60), { plaza: true })).toEqual(
      layoutVillage(plots(60), { plaza: true }),
    );
  });
});
