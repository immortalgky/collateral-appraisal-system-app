/**
 * The dino's render loop, split out of DinoLoader.
 *
 * DinoLoader is a React component and can only ever drive a canvas in this document. The
 * document-viewer loading tab (loadingTab.ts) has to drive one in a *different* window, which it
 * writes itself and where React never mounts — so the loop takes the window it runs in as an
 * argument and touches nothing global.
 *
 * Rules stay in dinoGame, drawing stays in dinoRenderer. This file owns only the canvas sizing,
 * the sprite compile, the frame loop and the session best.
 */

import {
  ARM_AFTER_MS,
  PIXEL_SCALE,
  bestSoFar,
  createGame,
  getSessionBest,
  makeConfig,
  setSessionBest,
  stepGame,
} from './dinoGame';
import type { DinoPhase, JumpIntent } from './dinoGame';
import { PALETTES, buildSpriteSet, drawGame } from './dinoRenderer';

export type DinoLoopOptions = {
  canvas: HTMLCanvasElement;
  /** CSS width of the canvas. Changing it means restarting the loop. */
  width: number;
  theme: 'light' | 'dark';
  scale?: number;
  armAfterMs?: number;
  /**
   * The window that owns the canvas — its requestAnimationFrame, devicePixelRatio and
   * visibilitychange drive the loop. Defaults to the one this module was loaded in.
   */
  view?: Window;
  onPhaseChange?: (phase: DinoPhase) => void;
};

export type DinoLoop = {
  /** Queue a jump for the next frame. The game itself ignores it while still ambient. */
  jump: () => void;
  phase: () => DinoPhase;
  /** Idempotent: safe to call from a cleanup, a pagehide handler and a navigation. */
  stop: () => void;
};

/** Returns null when the canvas has no 2D context (happy-dom): callers just skip the animation. */
export function startDinoLoop({
  canvas,
  width,
  theme,
  scale = PIXEL_SCALE,
  armAfterMs = ARM_AFTER_MS,
  view = window,
  onPhaseChange,
}: DinoLoopOptions): DinoLoop | null {
  const ctx = canvas.getContext('2d');
  if (!ctx) return null; // happy-dom has no 2D context — tests cover dinoGame instead

  const canvasHeight = makeConfig(scale).CANVAS_H;
  const palette = PALETTES[theme];
  const sprites = buildSpriteSet(scale, palette);

  const dpr = Math.max(1, Math.min(3, Math.round(view.devicePixelRatio || 1)));
  canvas.style.width = `${width}px`;
  canvas.style.height = `${canvasHeight}px`;
  canvas.width = width * dpr;
  canvas.height = canvasHeight * dpr;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.imageSmoothingEnabled = false; // keep the pixel art crisp

  const state = createGame({ width, scale, armAfterMs, best: getSessionBest() });

  let intent: JumpIntent = null;
  let raf = 0;
  let last: number | null = null;
  let lastPhase: DinoPhase = state.phase;
  let stopped = false;

  // Report the starting phase too. A restart (resize, theme change) begins a fresh game in
  // 'ambient', and without this the caller kept the previous game's hint on screen — "press
  // Space" over a dino that ignores Space for the next five seconds.
  onPhaseChange?.(state.phase);

  const frame = (now: number) => {
    raf = view.requestAnimationFrame(frame);
    const dt = last === null ? 0 : now - last;
    last = now;
    const jump = intent;
    intent = null;
    stepGame(state, dt, jump);
    if (state.phase !== lastPhase) {
      lastPhase = state.phase;
      onPhaseChange?.(state.phase);
    }
    drawGame(ctx, state, sprites, palette, width);
  };
  raf = view.requestAnimationFrame(frame);

  // rAF already pauses in a hidden tab; resetting `last` stops the return frame from
  // arriving with a minutes-long delta (stepGame clamps it too, as a second line of defence).
  const doc = view.document;
  const onVisibility = () => {
    view.cancelAnimationFrame(raf);
    if (!doc.hidden) {
      last = null;
      raf = view.requestAnimationFrame(frame);
    }
  };
  doc.addEventListener('visibilitychange', onVisibility);

  return {
    jump: () => {
      intent = 'jump';
    },
    phase: () => state.phase,
    stop: () => {
      // Must be exact: under StrictMode the React caller mounts twice in dev, and a surviving
      // loop would run the world at double speed.
      if (stopped) return;
      stopped = true;
      view.cancelAnimationFrame(raf);
      doc.removeEventListener('visibilitychange', onVisibility);
      setSessionBest(bestSoFar(state));
    },
  };
}
