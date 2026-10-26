import { describe, expect, it } from 'vitest';
import {
  behindCameraEdge,
  layoutCallouts,
  type LayoutItem,
  type Placement,
  type Rect,
} from './layout';

const item = (id: number, o: Partial<LayoutItem> = {}): LayoutItem => ({
  id,
  ax: 300,
  ay: 200,
  cw: 120,
  ch: 40,
  priority: 3,
  preferLeft: false,
  ...o,
});

/** The rectangle a full placement occupies, mirroring how the engine positions the card. */
const rectOf = (it: LayoutItem, p: Placement): Rect => {
  if (p.mode !== 'full') throw new Error('not full');
  const left = p.ax + p.dx;
  const top = p.ay + p.dy;
  return { left, top, right: left + it.cw, bottom: top + it.ch };
};
const clash = (a: Rect, b: Rect) =>
  a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top;

const fullRects = (items: LayoutItem[], res: Map<number, Placement>) =>
  items.filter(i => res.get(i.id)!.mode === 'full').map(i => rectOf(i, res.get(i.id)!));

describe('layoutCallouts', () => {
  it('puts a lone card above-right of its anchor', () => {
    const it = item(1);
    const r = layoutCallouts([it], [], [], 600, 400).get(1)!;
    expect(r).toMatchObject({ mode: 'full', dx: -18, dy: -26 - it.ch });
  });

  it('prefers above-left when asked', () => {
    const it = item(1, { preferLeft: true });
    const r = layoutCallouts([it], [], [], 600, 400).get(1)!;
    expect(r).toMatchObject({ mode: 'full', dx: 18 - it.cw });
  });

  it('never lets two full cards overlap', () => {
    const items = [
      item(1, { priority: 1 }),
      item(2, { ax: 310, ay: 205 }),
      item(3, { ax: 320, ay: 210 }),
      item(4, { ax: 330, ay: 215 }),
    ];
    const res = layoutCallouts(items, [], [], 700, 500);
    const rs = fullRects(items, res);
    expect(rs.length).toBeGreaterThanOrEqual(3);
    for (let a = 0; a < rs.length; a++)
      for (let b = a + 1; b < rs.length; b++) expect(clash(rs[a], rs[b])).toBe(false);
  });

  it('keeps full cards for the important items and collapses the rest when there is no room', () => {
    const items = [
      item(1, { priority: 4, ax: 80, ay: 120, cw: 150, ch: 120 }),
      item(2, { priority: 0, ax: 80, ay: 120, cw: 150, ch: 120 }),
      item(3, { priority: 1, ax: 80, ay: 120, cw: 150, ch: 120 }),
    ];
    const res = layoutCallouts(items, [], [], 160, 150);
    expect(res.get(2)!.mode).toBe('full');
    expect(res.get(1)!.mode).not.toBe('full');
    expect(res.get(3)!.mode).not.toBe('full');
  });

  it('keeps every card inside the canvas and clear of every other, at any anchor and width', () => {
    // a small deterministic generator: the same cases every run
    let seed = 7;
    const rnd = () => (seed = (seed * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff;
    for (const w of [340, 390, 520, 720]) {
      for (let trial = 0; trial < 60; trial++) {
        const items = Array.from({ length: 6 }, (_, i) =>
          item(i, {
            ax: rnd() * w,
            ay: rnd() * 380,
            cw: 110 + rnd() * 110,
            ch: 36 + rnd() * 50,
            priority: Math.floor(rnd() * 5),
            preferLeft: rnd() > 0.5,
          }),
        );
        const res = layoutCallouts(items, [], [], w, 380);
        const rs = fullRects(items, res);
        for (const r of rs) {
          expect(r.left).toBeGreaterThanOrEqual(0);
          expect(r.right).toBeLessThanOrEqual(w);
          expect(r.top).toBeGreaterThanOrEqual(0);
          expect(r.bottom).toBeLessThanOrEqual(380);
        }
        for (let a = 0; a < rs.length; a++)
          for (let b = a + 1; b < rs.length; b++) expect(clash(rs[a], rs[b])).toBe(false);
      }
    }
  });

  it('keeps clear of reserved areas such as the hint and the toolbar', () => {
    const reserved: Rect[] = [{ left: 240, top: 100, right: 420, bottom: 140 }];
    const it = item(1, { ay: 170 });
    const p = layoutCallouts([it], reserved, [], 700, 500).get(1)!;
    expect(clash(rectOf(it, p), reserved[0])).toBe(false);
  });

  it('keeps a card off the subject even when its anchor is on it', () => {
    const subject: Rect = { left: 220, top: 120, right: 420, bottom: 330 };
    const items = [
      item(1, { ax: 320, ay: 220, priority: 1 }),
      item(2, { ax: 260, ay: 300, priority: 1 }),
      item(3, { ax: 400, ay: 150, priority: 2 }),
    ];
    const res = layoutCallouts(items, [], [subject], 700, 380);
    const rs = fullRects(items, res);
    expect(rs.length).toBeGreaterThan(0);
    for (const r of rs) expect(clash(r, subject)).toBe(false);
  });

  it('collapses a card when the subject fills the canvas and there is no free spot', () => {
    const subject: Rect = { left: 0, top: 0, right: 400, bottom: 300 };
    const it = item(1, { ax: 200, ay: 150, cw: 150, ch: 60 });
    expect(layoutCallouts([it], [], [subject], 400, 300).get(1)!.mode).toBe('collapsed');
  });

  it('hides a low-priority card whose anchor left the canvas, but pins an important one', () => {
    const res = layoutCallouts(
      [item(1, { ax: -50, priority: 4 }), item(2, { ax: 900, ay: 700, priority: 0 })],
      [],
      [],
      600,
      400,
    );
    expect(res.get(1)!.mode).toBe('hidden');
    const legal = res.get(2)!;
    expect(legal.mode).toBe('full');
    if (legal.mode === 'full') {
      expect(legal.ax).toBeLessThanOrEqual(584);
      expect(legal.ay).toBeLessThanOrEqual(384);
    }
  });

  it('drops a numbered dot that would sit on top of another card', () => {
    const items = [
      item(1, { priority: 1, ax: 100, ay: 120, cw: 190, ch: 80 }),
      item(2, { priority: 4, ax: 100, ay: 90, cw: 190, ch: 80 }),
    ];
    const res = layoutCallouts(items, [], [], 200, 160);
    expect(res.get(1)!.mode).toBe('full');
    expect(res.get(2)!.mode).toBe('hidden');
  });

  it('uses the measured dot size, not a fixed one, to decide what a card covers', () => {
    const near = [
      item(1, { priority: 1, ax: 100, ay: 120, cw: 190, ch: 80 }),
      item(2, { priority: 4, ax: 170, ay: 118, cw: 190, ch: 80 }),
    ];
    expect(layoutCallouts(near, [], [], 200, 160, 20).get(2)!.mode).toBe('collapsed');
    expect(layoutCallouts(near, [], [], 200, 160, 60).get(2)!.mode).toBe('hidden');
  });

  it('keeps a lower-priority card off a collapsed dot, so the legal warning stays visible', () => {
    const items = [
      // Wider than the canvas: the legal card must collapse to a dot.
      item(1, { priority: 0, ax: 200, ay: 150, cw: 420, ch: 40 }),
      item(2, { priority: 2, ax: 200, ay: 200, cw: 100, ch: 40 }),
    ];
    const res = layoutCallouts(items, [], [], 400, 300);
    expect(res.get(1)!.mode).toBe('collapsed');
    expect(res.get(2)!.mode).toBe('full');
    const land = rectOf(items[1], res.get(2)!);
    expect(clash(land, { left: 190, top: 140, right: 210, bottom: 160 })).toBe(false);
  });

  it('keeps a pinned dot off the toolbar and drops an ordinary one that sits on it', () => {
    const toolbar: Rect = { left: 330, top: 8, right: 392, bottom: 44 };
    const res = layoutCallouts(
      [
        // Pinned, anchor far off the canvas: clamped into the toolbar's corner.
        item(1, { priority: 0, ax: 1000, ay: -50, cw: 420 }),
        item(2, { priority: 3, ax: 360, ay: 30, cw: 420 }),
      ],
      [toolbar],
      [],
      400,
      300,
    );
    const pinned = res.get(1)!;
    if (pinned.mode !== 'collapsed') throw new Error('expected a collapsed dot');
    const dot = {
      left: pinned.ax - 10,
      top: pinned.ay - 10,
      right: pinned.ax + 10,
      bottom: pinned.ay + 10,
    };
    expect(clash(dot, toolbar)).toBe(false);
    expect(res.get(2)!.mode).toBe('hidden');
  });

  it('keeps cards off several subject boxes, which one union box over both would not allow', () => {
    // Two buildings at opposite corners with open ground between them.
    const a: Rect = { left: 0, top: 0, right: 150, bottom: 300 };
    const b: Rect = { left: 250, top: 0, right: 400, bottom: 300 };
    const it = item(1, { ax: 200, ay: 150, cw: 90, ch: 40 });
    const apart = layoutCallouts([it], [], [a, b], 400, 300).get(1)!;
    expect(apart.mode).toBe('full');
    expect(clash(rectOf(it, apart), a)).toBe(false);
    expect(clash(rectOf(it, apart), b)).toBe(false);
    const union: Rect = { left: 0, top: 0, right: 400, bottom: 300 };
    expect(layoutCallouts([it], [], [union], 400, 300).get(1)!.mode).toBe('collapsed');
  });

  describe('dots', () => {
    const dotRect = (p: Placement): Rect => {
      if (p.mode === 'hidden') throw new Error('hidden');
      return { left: p.ax - 10, top: p.ay - 10, right: p.ax + 10, bottom: p.ay + 10 };
    };

    it('moves a pinned dot off the toolbar even when its own anchor is already there', () => {
      const toolbar: Rect = { left: 330, top: 8, right: 392, bottom: 44 };
      // Wider than the canvas: a collapsed dot, the thing a click lands on.
      const res = layoutCallouts(
        [item(1, { priority: 0, ax: 360, ay: 40, cw: 420, ch: 40 })],
        [toolbar],
        [],
        400,
        300,
      );
      expect(res.get(1)!.mode).toBe('collapsed');
      expect(clash(dotRect(res.get(1)!), toolbar)).toBe(false);
    });

    it('never hides a pinned dot, and keeps it off the cards placed before it', () => {
      const items = [
        item(1, { priority: 1, ax: 200, ay: 200, cw: 100, ch: 40 }),
        // Wider than the canvas, anchored under the first card.
        item(2, { priority: 2, ax: 230, ay: 150, cw: 420, ch: 40 }),
      ];
      const res = layoutCallouts(items, [], [], 400, 300);
      const card = rectOf(items[0], res.get(1)!);
      expect(res.get(2)!.mode).toBe('collapsed');
      expect(clash(dotRect(res.get(2)!), card)).toBe(false);
    });

    it('keeps a pinned dot even when every spot is covered', () => {
      const reserved: Rect[] = [{ left: 0, top: 100, right: 200, bottom: 160 }];
      const items = [
        item(1, { priority: 1, ax: 100, ay: 120, cw: 190, ch: 80 }),
        item(2, { priority: 2, ax: 100, ay: 60, cw: 420, ch: 40 }),
        item(3, { priority: 4, ax: 100, ay: 60, cw: 420, ch: 40 }),
      ];
      const res = layoutCallouts(items, reserved, [], 200, 160);
      expect(res.get(1)!.mode).toBe('full');
      // Warnings are never dropped; an ordinary dot in the same place is.
      expect(res.get(2)!.mode).toBe('collapsed');
      expect(res.get(3)!.mode).toBe('hidden');
    });

    it('leaves the dot of a full card on its object, whatever else is there', () => {
      const items = [
        item(1, { priority: 3, ax: 200, ay: 150, cw: 100, ch: 40 }),
        item(2, { priority: 3, ax: 200, ay: 150, cw: 100, ch: 40 }),
      ];
      const res = layoutCallouts(items, [], [], 400, 300);
      for (const it of items) {
        const p = res.get(it.id)!;
        expect(p.mode).toBe('full');
        if (p.mode === 'full') expect([p.ax, p.ay]).toEqual([it.ax, it.ay]);
      }
    });

    it('drops an ordinary pin whose object stands under a card, and moves a pinned one clear of it', () => {
      const card: Rect = { left: 300, top: 100, right: 396, bottom: 290 };
      const items = [
        item(1, { priority: 3, ax: 350, ay: 200, cw: 100, ch: 40 }),
        item(2, { priority: 0, ax: 350, ay: 200, cw: 100, ch: 40 }),
      ];
      const res = layoutCallouts(items, [card], [], 400, 300);
      expect(res.get(1)!.mode).toBe('hidden');
      const moved = res.get(2)!;
      if (moved.mode === 'hidden') throw new Error('a warning is never dropped');
      expect(clash(dotRect(moved), card)).toBe(false);
    });

    it('does not let a dot that is left out keep a later card away', () => {
      const items = [
        // Its card fills the top of the canvas, down to y = 84.
        item(1, { priority: 1, ax: 100, ay: 60, cw: 190, ch: 80 }),
        // Just under that card: hidden, so it reserves nothing.
        item(2, { priority: 3, ax: 230, ay: 94, cw: 420, ch: 40 }),
        // As wide as the canvas allows, so it can only go straight under the first card.
        item(3, { priority: 4, ax: 230, ay: 150, cw: 280, ch: 40 }),
      ];
      const res = layoutCallouts(items, [], [], 300, 160);
      expect(res.get(1)!.mode).toBe('full');
      expect(res.get(2)!.mode).toBe('hidden');
      const third = res.get(3)!;
      expect(third.mode).toBe('full');
      // Right under the first card, over the spot the hidden dot would have held.
      expect(rectOf(items[2], third).top).toBeLessThan(100);
    });

    it('keeps a numbered dot off the anchor of a full card placed after it', () => {
      const items = [
        // The legal warning collapses (wider than the canvas); the land card then takes its anchor.
        item(1, { priority: 0, ax: 200, ay: 150, cw: 420, ch: 40 }),
        item(2, { priority: 2, ax: 200, ay: 150, cw: 100, ch: 40 }),
      ];
      const res = layoutCallouts(items, [], [], 400, 300);
      const legal = res.get(1)!;
      const land = res.get(2)!;
      expect(legal.mode).toBe('collapsed');
      expect(land.mode).toBe('full');
      if (land.mode !== 'full') return;
      // The full card's dot stays on its object; the numbered dot moves clear of it.
      expect([land.ax, land.ay]).toEqual([200, 150]);
      expect(clash(dotRect(legal), dotRect(land))).toBe(false);
      // ...and a short leader ties the moved dot back to its object.
      expect(legal.mode === 'collapsed' && legal.from).toEqual({ x: 200, y: 150 });
    });

    it('leaves a full card whose anchor is on the canvas exactly on that anchor', () => {
      const res = layoutCallouts(
        [item(1, { priority: 3, ax: 5, ay: 8 }), item(2, { priority: 0, ax: 395, ay: 292 })],
        [],
        [],
        400,
        300,
      );
      for (const [id, x, y] of [
        [1, 5, 8],
        [2, 395, 292],
      ] as const) {
        const p = res.get(id)!;
        expect(p.mode).toBe('full');
        if (p.mode === 'full') expect([p.ax, p.ay]).toEqual([x, y]);
      }
    });

    it('fans out dots that share one anchor, so each can be hovered', () => {
      const items = [1, 2, 3, 4].map(id =>
        item(id, { priority: 0, ax: 200, ay: 150, cw: 420, ch: 40 }),
      );
      const res = layoutCallouts(items, [], [], 400, 300);
      const rs = items.map(i => dotRect(res.get(i.id)!));
      for (let a = 0; a < rs.length; a++)
        for (let b = a + 1; b < rs.length; b++) expect(clash(rs[a], rs[b])).toBe(false);
    });

    it('keeps a later card off the dot of an earlier one that has a full card', () => {
      const items = [
        item(1, { priority: 3, ax: 200, ay: 200, cw: 100, ch: 40 }),
        item(2, { priority: 4, ax: 200, ay: 250, cw: 100, ch: 40 }),
      ];
      const res = layoutCallouts(items, [], [], 400, 300);
      expect(res.get(1)!.mode).toBe('full');
      const second = res.get(2)!;
      if (second.mode === 'full')
        expect(clash(rectOf(items[1], second), dotRect(res.get(1)!))).toBe(false);
    });
  });
});

describe('behindCameraEdge', () => {
  // An object behind the camera projects mirrored through the centre; the edge point undoes that.
  it('puts an object behind and to the right on the right edge, not the left', () => {
    const p = behindCameraEdge(-0.5, 0.1, 400, 300);
    expect(p.x).toBeGreaterThan(400);
    expect(p.y).toBeGreaterThan(0);
    expect(p.y).toBeLessThan(300);
  });

  it('puts an object behind and to the left on the left edge', () => {
    expect(behindCameraEdge(0.5, 0, 400, 300).x).toBeLessThan(0);
  });

  it('puts an object behind and above on the top edge, and below on the bottom', () => {
    expect(behindCameraEdge(0, -0.5, 400, 300).y).toBeLessThan(0);
    expect(behindCameraEdge(0, 0.5, 400, 300).y).toBeGreaterThan(300);
  });

  it('points a diagonal NDC at the corner of the canvas it is drawn on', () => {
    const p = behindCameraEdge(-0.4, 0.4, 400, 300);
    expect(p.x).toBeCloseTo(400, -1);
    expect(p.y).toBeCloseTo(300, -1);
    expect(p.x).toBeGreaterThan(399);
    expect(p.y).toBeGreaterThan(299);
  });

  it('turns NDC into pixels first on a canvas that is not square', () => {
    // Mostly sideways in pixels (2240 px right, 746 px up) although NDC y is nearly x.
    const p = behindCameraEdge(-4.48, -3.73, 1000, 400);
    expect(p.x).toBeCloseTo(1001, 0);
    expect(p.y).toBeGreaterThan(0);
    expect(p.y).toBeLessThan(200);
  });

  it('is finite for an object dead behind the camera', () => {
    const p = behindCameraEdge(0, 0, 400, 300);
    expect(Number.isFinite(p.x + p.y)).toBe(true);
  });
});
