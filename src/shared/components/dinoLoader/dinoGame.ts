/**
 * Rules for the dino loader's mini game.
 *
 * Pure: no DOM, no React, no timers. Everything is driven by a fixed 120 Hz timestep so the
 * simulation is frame-rate independent (120 Hz displays, throttled tabs) and deterministic in
 * tests — 60 x 16.667ms and 30 x 33.333ms produce byte-identical state.
 *
 * Distances are expressed in *sprite pixels* and multiplied by the pixel scale in makeConfig,
 * so 1x / 2x / 3x play identically and only differ in size.
 */

import { CLOUD, DINO_RUN_A, OBSTACLE_L, OBSTACLE_S, SKYLINE, spriteSize } from './dinoSprites';
import type { SkylineKind } from './dinoSprites';

export const FIXED_STEP_MS = 1000 / 120;

/** At most ~100ms of catch-up per call: a backgrounded tab must not teleport the world. */
export const MAX_STEPS_PER_CALL = 12;

/** How long the overlay must stay up before the game becomes playable. */
export const ARM_AFTER_MS = 5000;

/**
 * CSS pixels per sprite pixel. Whole numbers only — anything else stops the nearest-neighbour
 * upscale landing on exact device pixels and the art goes soft.
 *
 * 1 gives a wide, slim strip (the loader is a background flourish, not the subject of the card).
 * On a DPR-1 display a sprite pixel is a single device pixel, so the art reads as fine line work
 * rather than chunky pixels; 2 is the chunkier alternative.
 */
export const PIXEL_SCALE = 1;

/** One period of the ground's pebble pattern, in sprite pixels. The renderer tiles it. */
export const GROUND_PATTERN_SPRITE_W = 700;

/**
 * How long after a crash a jump is ignored. A press landing right after the collision is nearly
 * always a late attempt at the obstacle, not a request to restart; without this "game over"
 * flashed for a single frame and the score reset under the player.
 */
export const RESTART_LOCKOUT_MS = 600;

export type DinoPhase = 'ambient' | 'armed' | 'playing' | 'gameOver';
export type JumpIntent = 'jump' | null;

const BASE = {
  SCORE_PER_SEC: 10,
  LEG_FRAME_MS: 90,
  CLOUD_PARALLAX: 0.45,
  /** The skyline is the far layer, so it barely crawls. */
  CITY_PARALLAX: 0.16,
  /** Hitbox inset per side, in sprite px — Chrome-style forgiveness. */
  HITBOX_INSET: 2,

  // per sprite-pixel, scaled in makeConfig
  GRAVITY: -1200,
  JUMP_VY: 310,
  BASE_SPEED: 130,
  SPEED_GAIN: 0.3,
  MAX_SPEED_GAIN: 120,
  DINO_X: 12,
  GAP_MIN: 150,
  GAP_MAX: 285,
  CLOUD_GAP_MIN: 130,
  CLOUD_GAP_MAX: 350,
  GROUND_PATTERN_W: GROUND_PATTERN_SPRITE_W,
  /** dino (26) + jump apex (~40) + headroom, plus 10 below the ground line. */
  CANVAS_H: 80,
  GROUND_Y: 70,
} as const;

export type GameConfig = {
  px: number;
  GRAVITY: number;
  JUMP_VY: number;
  BASE_SPEED: number;
  SPEED_GAIN: number;
  MAX_SPEED_GAIN: number;
  DINO_X: number;
  GAP_MIN: number;
  GAP_MAX: number;
  CLOUD_GAP_MIN: number;
  CLOUD_GAP_MAX: number;
  GROUND_PATTERN_W: number;
  CANVAS_H: number;
  GROUND_Y: number;
  HITBOX_INSET: number;
  SCORE_PER_SEC: number;
  LEG_FRAME_MS: number;
  CLOUD_PARALLAX: number;
  CITY_PARALLAX: number;
};

export function makeConfig(px: number = PIXEL_SCALE): GameConfig {
  return {
    px,
    GRAVITY: BASE.GRAVITY * px,
    JUMP_VY: BASE.JUMP_VY * px,
    BASE_SPEED: BASE.BASE_SPEED * px,
    SPEED_GAIN: BASE.SPEED_GAIN * px,
    MAX_SPEED_GAIN: BASE.MAX_SPEED_GAIN * px,
    DINO_X: BASE.DINO_X * px,
    GAP_MIN: BASE.GAP_MIN * px,
    GAP_MAX: BASE.GAP_MAX * px,
    CLOUD_GAP_MIN: BASE.CLOUD_GAP_MIN * px,
    CLOUD_GAP_MAX: BASE.CLOUD_GAP_MAX * px,
    GROUND_PATTERN_W: BASE.GROUND_PATTERN_W * px,
    CANVAS_H: BASE.CANVAS_H * px,
    GROUND_Y: BASE.GROUND_Y * px,
    HITBOX_INSET: BASE.HITBOX_INSET * px,
    SCORE_PER_SEC: BASE.SCORE_PER_SEC,
    LEG_FRAME_MS: BASE.LEG_FRAME_MS,
    CLOUD_PARALLAX: BASE.CLOUD_PARALLAX,
    CITY_PARALLAX: BASE.CITY_PARALLAX,
  };
}

export type Size = { w: number; h: number };

export type GameDims = {
  dino: Size;
  obsS: Size;
  obsL: Size;
  cloud: Size;
  city: Record<SkylineKind, Size>;
};

const scaled = (rows: Parameters<typeof spriteSize>[0], px: number): Size => {
  const { w, h } = spriteSize(rows);
  return { w: w * px, h: h * px };
};

export function makeDims(px: number = PIXEL_SCALE): GameDims {
  const city = {} as Record<SkylineKind, Size>;
  for (const kind of Object.keys(SKYLINE) as SkylineKind[]) {
    city[kind] = scaled(SKYLINE[kind], px);
  }
  return {
    dino: scaled(DINO_RUN_A, px),
    obsS: scaled(OBSTACLE_S, px),
    obsL: scaled(OBSTACLE_L, px),
    cloud: scaled(CLOUD, px),
    city,
  };
}

/**
 * Weighted pool for the skyline. Ordinary buildings outnumber landmarks roughly 4:1 — a skyline
 * that is mostly landmarks reads as a theme park, not as Bangkok.
 */
export const CITY_KINDS: readonly SkylineKind[] = [
  'SKY_SHOPHOUSE',
  'SKY_TOWER_A',
  'SKY_HOUSE',
  'SKY_TOWER_C',
  'SKY_WAT_ARUN',
  'SKY_TOWER_D',
  'SKY_HOUSE',
  'SKY_TOWER_B',
  'SKY_TOWER_E',
  'SKY_YAK',
  'SKY_SHOPHOUSE',
  'SKY_TOWER_A',
  'SKY_HOUSE',
  'SKY_MAHANAKHON',
  'SKY_TOWER_C',
  'SKY_TOWER_D',
  'SKY_BAIYOKE',
  'SKY_TOWER_B',
  'SKY_HOUSE',
  'SKY_TOWER_E',
  'SKY_GIANT_SWING',
  'SKY_TOWER_A',
  'SKY_SHOPHOUSE',
  'SKY_TOWER_D',
];

/** Landmarks are inked a shade stronger than the infill, for depth. */
export const CITY_LANDMARKS: ReadonlySet<SkylineKind> = new Set<SkylineKind>([
  'SKY_WAT_ARUN',
  'SKY_YAK',
  'SKY_MAHANAKHON',
  'SKY_BAIYOKE',
  'SKY_GIANT_SWING',
]);

export type Obstacle = { x: number; w: number; h: number; kind: 'S' | 'L' };
export type Cloud = { x: number; y: number };
export type Building = { x: number; kind: SkylineKind };

export type GameState = {
  cfg: GameConfig;
  dims: GameDims;
  phase: DinoPhase;
  elapsedMs: number;
  carryMs: number;
  width: number;
  armAfterMs: number;
  dinoY: number;
  dinoVy: number;
  speed: number;
  score: number;
  best: number;
  /** elapsedMs at the last crash; RESTART_LOCKOUT_MS counts from here. */
  gameOverAtMs: number;
  obstacles: Obstacle[];
  clouds: Cloud[];
  skyline: Building[];
  nextSpawnPx: number;
  nextCloudPx: number;
  runPhaseMs: number;
  groundOffset: number;
  /** A jump asked for but not yet handed to a tick. See stepGame. */
  pendingJump: boolean;
  /** Gameplay only: obstacle sizes and gaps. Nothing visual may draw from it. */
  rng: () => number;
  /** Everything purely visual — skyline and clouds. */
  sceneryRng: () => number;
};

/** Small, fast, seedable PRNG — lets tests pin an exact obstacle sequence. */
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const randomSeed = () => (Math.random() * 1e9) | 0;

export type CreateGameOptions = {
  width: number;
  scale?: number;
  armAfterMs?: number;
  best?: number;
  rng?: () => number;
  sceneryRng?: () => number;
};

export function createGame(o: CreateGameOptions): GameState {
  const px = o.scale ?? PIXEL_SCALE;
  const cfg = makeConfig(px);
  const state: GameState = {
    cfg,
    dims: makeDims(px),
    phase: 'ambient',
    elapsedMs: 0,
    carryMs: 0,
    width: o.width,
    armAfterMs: o.armAfterMs ?? ARM_AFTER_MS,
    dinoY: 0,
    dinoVy: 0,
    speed: cfg.BASE_SPEED,
    score: 0,
    best: o.best ?? 0,
    gameOverAtMs: 0,
    obstacles: [],
    clouds: [
      { x: o.width * 0.35, y: px * 12 },
      { x: o.width * 0.82, y: px * 26 },
    ],
    skyline: [],
    nextSpawnPx: o.width * 0.8,
    nextCloudPx: cfg.CLOUD_GAP_MIN,
    runPhaseMs: 0,
    groundOffset: 0,
    pendingJump: false,
    rng: o.rng ?? mulberry32(randomSeed()),
    sceneryRng: o.sceneryRng ?? mulberry32(randomSeed()),
  };
  fillSkyline(state);
  return state;
}

/**
 * Extend the skyline until it runs past the right edge.
 *
 * Draws from sceneryRng, never rng. The two shared a stream once and adding a single building
 * re-rolled every obstacle after it, so editing background art silently changed the difficulty.
 */
export function fillSkyline(s: GameState): void {
  const last = () => s.skyline[s.skyline.length - 1];
  let edge = s.skyline.length ? last().x + s.dims.city[last().kind].w : 0;
  while (edge < s.width + s.cfg.px * 24) {
    let kind = CITY_KINDS[Math.floor(s.sceneryRng() * CITY_KINDS.length)];
    if (s.skyline.length && kind === last().kind) {
      kind = CITY_KINDS[Math.floor(s.sceneryRng() * CITY_KINDS.length)]; // one retry: avoid twins
    }
    // Breathing room: a 1-8px setback between neighbours, and roughly every sixth building gets
    // a wide break so the skyline reads as city blocks rather than one unbroken wall.
    let gap = 1 + Math.floor(s.sceneryRng() * 8);
    if (s.sceneryRng() < 0.17) gap += 8 + Math.floor(s.sceneryRng() * 8);
    const x = edge + s.cfg.px * gap;
    s.skyline.push({ x, kind });
    edge = x + s.dims.city[kind].w;
  }
}

function spawnObstacle(s: GameState): void {
  const large = s.rng() < 0.38;
  const d = large ? s.dims.obsL : s.dims.obsS;
  s.obstacles.push({ x: s.width + s.cfg.px * 4, w: d.w, h: d.h, kind: large ? 'L' : 'S' });
}

/** Gaps grow with the world speed so they stay jumpable as the game accelerates. */
function spawnGap(s: GameState): number {
  const k = s.speed / s.cfg.BASE_SPEED;
  return (s.cfg.GAP_MIN + s.rng() * (s.cfg.GAP_MAX - s.cfg.GAP_MIN)) * k;
}

type Box = { x: number; y: number; w: number; h: number };

/** The dino's hitbox. `y` is the height above ground of the box's bottom edge. */
export function dinoBox(s: GameState): Box {
  const i = s.cfg.HITBOX_INSET;
  return {
    x: s.cfg.DINO_X + i * 2,
    y: s.dinoY + i,
    w: s.dims.dino.w - i * 4,
    h: s.dims.dino.h - i * 2,
  };
}

/** An obstacle spans ground..o.h, so the vertical test is just "box bottom below its top". */
export function overlaps(box: Box, o: Obstacle): boolean {
  return box.x < o.x + o.w && box.x + box.w > o.x && box.y < o.h;
}

function restart(s: GameState): void {
  s.phase = 'playing';
  s.obstacles = [];
  s.score = 0;
  s.speed = s.cfg.BASE_SPEED;
  s.dinoY = 0;
  s.dinoVy = 0;
  s.nextSpawnPx = s.width * 0.7;
}

function tick(s: GameState, jump: boolean): void {
  const cfg = s.cfg;
  s.elapsedMs += FIXED_STEP_MS;
  const dt = FIXED_STEP_MS / 1000;

  if (s.phase === 'ambient' && s.elapsedMs >= s.armAfterMs) s.phase = 'armed';

  if (jump && s.phase !== 'ambient') {
    if (s.phase === 'gameOver') {
      if (s.elapsedMs - s.gameOverAtMs >= RESTART_LOCKOUT_MS) restart(s);
      return;
    }
    if (s.phase === 'armed') {
      s.phase = 'playing';
      s.score = 0;
    }
    if (s.dinoY === 0) s.dinoVy = cfg.JUMP_VY;
  }
  if (s.phase === 'gameOver') return; // world frozen

  s.speed =
    cfg.BASE_SPEED +
    (s.phase === 'playing' ? Math.min(s.score * cfg.SPEED_GAIN, cfg.MAX_SPEED_GAIN) : 0);

  s.dinoVy += cfg.GRAVITY * dt;
  s.dinoY += s.dinoVy * dt;
  if (s.dinoY <= 0) {
    s.dinoY = 0;
    s.dinoVy = 0;
  }
  s.runPhaseMs = (s.runPhaseMs + FIXED_STEP_MS) % (2 * cfg.LEG_FRAME_MS);

  const move = s.speed * dt;
  s.groundOffset = (s.groundOffset + move) % cfg.GROUND_PATTERN_W;

  for (const o of s.obstacles) o.x -= move;
  while (s.obstacles.length && s.obstacles[0].x + s.obstacles[0].w < -cfg.px * 4) {
    s.obstacles.shift();
  }
  s.nextSpawnPx -= move;
  if (s.nextSpawnPx <= 0) {
    spawnObstacle(s);
    s.nextSpawnPx = spawnGap(s);
  }

  const cityMove = move * cfg.CITY_PARALLAX;
  for (const b of s.skyline) b.x -= cityMove;
  while (s.skyline.length && s.skyline[0].x + s.dims.city[s.skyline[0].kind].w < 0) {
    s.skyline.shift();
  }
  fillSkyline(s);

  const cloudMove = move * cfg.CLOUD_PARALLAX;
  for (const c of s.clouds) c.x -= cloudMove;
  while (s.clouds.length && s.clouds[0].x + s.dims.cloud.w < -cfg.px * 4) s.clouds.shift();
  s.nextCloudPx -= cloudMove;
  if (s.nextCloudPx <= 0) {
    // Scenery stream, like the skyline: on the gameplay stream a cloud tweak re-rolled every
    // obstacle after it.
    s.clouds.push({ x: s.width + cfg.px * 6, y: cfg.px * (6 + s.sceneryRng() * 22) });
    s.nextCloudPx = cfg.CLOUD_GAP_MIN + s.sceneryRng() * (cfg.CLOUD_GAP_MAX - cfg.CLOUD_GAP_MIN);
  }

  // Ambient and armed: hop by itself, timed so the apex lands mid-crossing. Without this the
  // dino would visibly run through the obstacles it is not yet allowed to collide with.
  if (s.phase !== 'playing' && s.dinoY === 0) {
    const right = cfg.DINO_X + s.dims.dino.w;
    const next = s.obstacles.find(o => o.x > right);
    if (next) {
      const crossT = (s.dims.dino.w + next.w) / s.speed;
      const apexT = cfg.JUMP_VY / -cfg.GRAVITY;
      const leadT = Math.max(0.02, apexT - crossT / 2);
      if (next.x - right <= s.speed * leadT) s.dinoVy = cfg.JUMP_VY;
    }
  }

  if (s.phase === 'playing') {
    s.score += cfg.SCORE_PER_SEC * dt;
    const box = dinoBox(s);
    if (s.obstacles.some(o => overlaps(box, o))) {
      s.phase = 'gameOver';
      s.gameOverAtMs = s.elapsedMs;
      s.best = Math.max(s.best, Math.floor(s.score));
    }
  }
}

/**
 * Advance the world by `dtMs`. Deterministic given (state, dtMs, intent); mutates in place so
 * the loop allocates nothing per frame. The jump intent is consumed by the first tick that
 * actually runs.
 *
 * That last part matters: a frame can be shorter than one fixed step — 8.33ms at 120 Hz, less
 * on a 144 Hz panel — and such a call advances no tick at all. A jump arriving on one of those
 * frames used to be thrown away, which on a ProMotion display meant a visible share of presses
 * doing nothing. It is buffered until a tick can take it instead.
 */
export function stepGame(s: GameState, dtMs: number, intent: JumpIntent): GameState {
  if (intent === 'jump') s.pendingJump = true;

  const total = s.carryMs + dtMs;
  const steps = Math.min(Math.floor(total / FIXED_STEP_MS), MAX_STEPS_PER_CALL);
  s.carryMs = steps === MAX_STEPS_PER_CALL ? 0 : total - steps * FIXED_STEP_MS;

  let jump = s.pendingJump;
  if (steps > 0) s.pendingJump = false;
  for (let i = 0; i < steps; i++) {
    tick(s, jump);
    jump = false;
  }
  return s;
}

/**
 * Best score for this browser session. The overlay unmounts the moment loading finishes, so the
 * GameState is thrown away every time; only this survives.
 */
let sessionBest = 0;
export const getSessionBest = (): number => sessionBest;
export const setSessionBest = (value: number): void => {
  sessionBest = Math.max(sessionBest, value);
};

/**
 * The best score counting a run still in progress. A run usually ends because the loading
 * finished, not with a crash, and `best` only moves on a crash — so saving `best` alone threw
 * away the very run the player was in the middle of.
 */
export const bestSoFar = (s: GameState): number =>
  s.phase === 'playing' ? Math.max(s.best, Math.floor(s.score)) : s.best;
