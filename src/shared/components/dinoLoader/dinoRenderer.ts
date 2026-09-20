/**
 * Drawing for the dino loader. Canvas only — no game rules live here.
 *
 * Sprites are compiled once per (scale, palette) into offscreen canvases and then blitted, so a
 * frame costs a handful of drawImage calls rather than thousands of fillRects.
 */

import {
  CLOUD,
  DIGITS,
  DIGIT_HEIGHT,
  DINO_DEAD,
  DINO_RUN_A,
  DINO_RUN_B,
  HI,
  OBSTACLE_L,
  OBSTACLE_S,
  SKYLINE,
  spriteSize,
} from './dinoSprites';
import type { PixelRows, SkylineKind } from './dinoSprites';
import { CITY_LANDMARKS, GROUND_PATTERN_SPRITE_W, mulberry32 } from './dinoGame';
import type { GameState } from './dinoGame';

/**
 * Canvas pixels cannot carry Tailwind classes, so the theme is resolved to literals here.
 *
 * Light inks with primary-600 and backs off to primary-200/100; dark steps *up* to primary-400
 * because src/styles/theme.css does not override --color-primary under [data-theme=dark] and
 * #0D9488 only reaches ~3.2:1 against the oklch(18%) base.
 *
 * Keep the background tints far from the ink: a mid-tone skyline made the obstacles genuinely
 * hard to pick out, which is a gameplay bug rather than a matter of taste.
 */
export type Palette = {
  ink: string;
  ground: string;
  city: string;
  cityFar: string;
  cloud: string;
};

export const PALETTES: Record<'light' | 'dark', Palette> = {
  light: {
    ink: '#0D9488',
    ground: '#0D9488',
    city: '#99F6E4',
    cityFar: '#CCFBF1',
    cloud: '#CCFBF1',
  },
  dark: {
    ink: '#2DD4BF',
    ground: '#2DD4BF',
    // A step brighter than the teal-800/900 these started at: against an oklch(18-22%) ground
    // those read as black-on-black and the skyline simply vanished. Still three steps below the
    // ink, which is what keeps the obstacles pickable.
    city: '#0F766E',
    cityFar: '#115E59',
    cloud: '#115E59',
  },
};

type CompiledSprite = {
  img: HTMLCanvasElement;
  /** Size in sprite pixels, before the scale is applied. */
  w: number;
  h: number;
};

export type SpriteSet = {
  scale: number;
  runA: CompiledSprite;
  runB: CompiledSprite;
  dead: CompiledSprite;
  obsS: CompiledSprite;
  obsL: CompiledSprite;
  cloud: CompiledSprite;
  hi: CompiledSprite;
  digits: HTMLCanvasElement[];
  city: Record<SkylineKind, CompiledSprite>;
};

/** Rows to an offscreen canvas, one fillRect per horizontal run of '#'. */
export function buildSprite(rows: PixelRows, ink: string, scale: number): HTMLCanvasElement {
  const { w, h } = spriteSize(rows);
  const canvas = document.createElement('canvas');
  canvas.width = w * scale;
  canvas.height = h * scale;
  const g = canvas.getContext('2d');
  if (!g) return canvas; // happy-dom and friends have no 2D context
  g.fillStyle = ink;
  rows.forEach((row, y) => {
    let start = -1;
    for (let x = 0; x <= row.length; x++) {
      const on = row[x] === '#';
      if (on && start < 0) start = x;
      if (!on && start >= 0) {
        g.fillRect(start * scale, y * scale, (x - start) * scale, scale);
        start = -1;
      }
    }
  });
  return canvas;
}

export function buildSpriteSet(scale: number, palette: Palette): SpriteSet {
  const compile = (rows: PixelRows, ink: string): CompiledSprite => ({
    img: buildSprite(rows, ink, scale),
    ...spriteSize(rows),
  });

  const city = {} as Record<SkylineKind, CompiledSprite>;
  for (const kind of Object.keys(SKYLINE) as SkylineKind[]) {
    city[kind] = compile(SKYLINE[kind], CITY_LANDMARKS.has(kind) ? palette.city : palette.cityFar);
  }

  const digits: HTMLCanvasElement[] = [];
  for (let d = 0; d < 10; d++) {
    digits.push(
      buildSprite(DIGITS.slice(d * DIGIT_HEIGHT, (d + 1) * DIGIT_HEIGHT), palette.ground, scale),
    );
  }

  return {
    scale,
    runA: compile(DINO_RUN_A, palette.ink),
    runB: compile(DINO_RUN_B, palette.ink),
    dead: compile(DINO_DEAD, palette.ink),
    obsS: compile(OBSTACLE_S, palette.ink),
    obsL: compile(OBSTACLE_L, palette.ink),
    cloud: compile(CLOUD, palette.cloud),
    // Same ink as the digits. It was drawn in the cloud tint to look dim like Chrome's, which
    // measured 1.13:1 in light and 2.28:1 on the loading tab: too faint to tell which number
    // was the best.
    hi: compile(HI, palette.ground),
    digits,
    city,
  };
}

/**
 * Deterministic pebble scatter for one period of the ground, in sprite pixels. Every pebble sits
 * inside the period, so tiling it never stacks two on the same spot at the seam.
 */
const SPECKLES = (() => {
  const rng = mulberry32(7);
  const out: { x: number; len: number; drop: number }[] = [];
  for (let x = 7 + rng() * 23; x < GROUND_PATTERN_SPRITE_W; x += 7 + rng() * 23) {
    out.push({ x, len: 2 + Math.floor(rng() * 5), drop: rng() < 0.35 ? 2 : 0 });
  }
  return out;
})();

/** Draws `value` zero-padded, right-aligned to `rightX`. Returns the resulting left edge. */
function drawNumber(
  ctx: CanvasRenderingContext2D,
  sp: SpriteSet,
  value: number,
  digits: number,
  rightX: number,
  y: number,
): number {
  const str = String(Math.max(0, Math.floor(value))).padStart(digits, '0');
  const advance = 5 * sp.scale; // 4px glyph + 1px letter-spacing
  const left = rightX - str.length * advance;
  let x = left;
  for (const ch of str) {
    ctx.drawImage(sp.digits[Number(ch)], Math.round(x), Math.round(y));
    x += advance;
  }
  return left;
}

export function drawGame(
  ctx: CanvasRenderingContext2D,
  s: GameState,
  sp: SpriteSet,
  palette: Palette,
  width: number,
): void {
  const cfg = s.cfg;
  const px = cfg.px;
  const snap = (v: number) => Math.round(v / px) * px;

  ctx.clearRect(0, 0, width, cfg.CANVAS_H);

  // Clouds sit furthest back; the skyline is drawn in front of them.
  for (const c of s.clouds) ctx.drawImage(sp.cloud.img, snap(c.x), snap(c.y));
  for (const b of s.skyline) {
    const sprite = sp.city[b.kind];
    ctx.drawImage(sprite.img, snap(b.x), cfg.GROUND_Y - sprite.h * px);
  }

  ctx.fillStyle = palette.ground;
  ctx.fillRect(0, cfg.GROUND_Y, width, px);
  // Repeat the period across the whole canvas. It can be wider than one period (760px against
  // 700px at scale 1), and wrapping each pebble just once left the right edge bare.
  const period = cfg.GROUND_PATTERN_W;
  for (const sk of SPECKLES) {
    const base = (((sk.x * px - s.groundOffset) % period) + period) % period;
    for (let x = base - period; x < width; x += period) {
      if (x + sk.len * px <= 0) continue; // entirely off the left edge
      ctx.fillRect(snap(x), cfg.GROUND_Y + px * (1 + sk.drop), sk.len * px, px);
    }
  }

  for (const o of s.obstacles) {
    ctx.drawImage(o.kind === 'L' ? sp.obsL.img : sp.obsS.img, snap(o.x), cfg.GROUND_Y - o.h);
  }

  const frame =
    s.phase === 'gameOver'
      ? sp.dead.img
      : s.dinoY > 0
        ? sp.runA.img
        : s.runPhaseMs < cfg.LEG_FRAME_MS
          ? sp.runA.img
          : sp.runB.img;
  ctx.drawImage(frame, snap(cfg.DINO_X), snap(cfg.GROUND_Y - s.dims.dino.h - s.dinoY));

  // Score, top right — only once the game is actually live.
  if (s.phase === 'playing' || s.phase === 'gameOver') {
    const y = px * 2;
    let left = drawNumber(ctx, sp, s.score, 5, width - px * 2, y);
    if (s.best > 0) {
      left = drawNumber(ctx, sp, s.best, 5, left - px * 6, y);
      ctx.drawImage(sp.hi.img, Math.round(left - px * (sp.hi.w + 3)), y);
    }
  }
}
