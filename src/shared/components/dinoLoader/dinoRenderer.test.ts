import { describe, it, expect } from 'vitest';
import { createGame, mulberry32 } from './dinoGame';
import { PALETTES, buildSpriteSet, drawGame } from './dinoRenderer';

/** Records what drawGame paints instead of painting it — happy-dom has no 2D context. */
const recordingContext = () => {
  const rects: { x: number; y: number; w: number; h: number }[] = [];
  const ctx = {
    fillStyle: '',
    clearRect: () => {},
    drawImage: () => {},
    fillRect: (x: number, y: number, w: number, h: number) => {
      rects.push({ x, y, w, h });
    },
  };
  return { ctx: ctx as unknown as CanvasRenderingContext2D, rects };
};

describe('dinoRenderer ground', () => {
  // At scale 1 one pebble period is 700px, but the canvas can be 720-760px wide. Wrapping each
  // pebble only once left the rightmost strip bare, with pebbles popping in mid-ground.
  it('repeats the pebble pattern across the full width at every scroll offset', () => {
    const width = 760;
    const sprites = buildSpriteSet(1, PALETTES.light);
    const g = createGame({ width, scale: 1, rng: mulberry32(1), sceneryRng: mulberry32(2) });
    const period = g.cfg.GROUND_PATTERN_W;
    expect(width).toBeGreaterThan(period); // the case this test exists for

    let checked = 0;
    for (let offset = 0; offset < period; offset += 25) {
      g.groundOffset = offset;
      const { ctx, rects } = recordingContext();
      drawGame(ctx, g, sprites, PALETTES.light, width);

      // The ground line sits exactly on GROUND_Y; every pebble is drawn below it.
      const pebbles = rects.filter(r => r.y > g.cfg.GROUND_Y).map(r => r.x);
      const at = new Set(pebbles);
      // Any pebble with room for a copy one period to its right must have that copy.
      for (const x of pebbles) {
        if (x >= 0 && x + period < width) {
          expect(at.has(x + period)).toBe(true);
          checked += 1;
        }
      }
    }
    expect(checked).toBeGreaterThan(10); // not vacuous
  });
});
