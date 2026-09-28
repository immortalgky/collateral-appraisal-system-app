import { useEffect, useRef, useState } from 'react';
import { useMediaQuery } from '@shared/hooks/useMediaQuery';
import { useUIStore } from '../../store';
import LoadingSpinner from '../LoadingSpinner';
import { ARM_AFTER_MS, PIXEL_SCALE } from './dinoGame';
import type { DinoPhase } from './dinoGame';
import { startDinoLoop } from './dinoLoop';
import type { DinoLoop } from './dinoLoop';
import { keyBelongsToFocus } from './dinoInput';

const MIN_WIDTH = 280;
const DEFAULT_MAX_WIDTH = 760;

const measureWidth = (maxWidth: number) =>
  Math.round(Math.min(maxWidth, Math.max(MIN_WIDTH, window.innerWidth - 96)));

type DinoLoaderProps = {
  /** Arms the game after `armAfterMs`. Left off, the dino just runs and nothing binds input. */
  interactive?: boolean;
  /** Loading text under the canvas. This is the only part read by screen readers. */
  message?: string;
  /**
   * Pre-translated strings. This component deliberately does not call useTranslation: the root
   * Suspense boundary in src/main.tsx fires *while* i18n namespaces load and PageLoader is its
   * fallback, so a t() call here would suspend inside its own fallback.
   */
  hintText?: string;
  gameOverText?: string;
  armAfterMs?: number;
  /**
   * CSS pixels per sprite pixel. Must be a whole number or the nearest-neighbour upscale stops
   * landing on exact device pixels and the art goes soft. Defaults to PIXEL_SCALE — 1, a slim
   * strip; 2 doubles every sprite.
   */
  scale?: number;
  /** Upper bound on the canvas width; the real width also shrinks to fit the viewport. */
  maxWidth?: number;
};

/**
 * Chrome-offline-style runner used as a loading indicator.
 *
 * Stage 1 (ambient): the dino runs and hops the obstacles by itself, over a parallax Bangkok
 * skyline. Stage 2 (after `armAfterMs` of continued loading, and only when `interactive`): a hint
 * appears and Space / ArrowUp / tap takes over, with real collision, score and restart.
 *
 * The overlay above this is expected to unmount the moment loading finishes, mid-game or not —
 * a loading screen must never trap the user in a game.
 *
 * Keyboard contract for hosts: once armed, the game takes Space and ArrowUp — except from a
 * focused control, which keeps them (keyBelongsToFocus). The loader cannot tell a control the user
 * reached on purpose from one left focused behind it, so every `interactive` host must make sure
 * focus is not on a control when the game arms, or the Space the hint asks for goes to that
 * control instead:
 * - A host that covers the page moves focus into itself, onto a container that is not a control:
 *   a dialog root or panel with tabIndex={-1}. Headless UI's Dialog (2.2.9) does that by default
 *   on a mouse or keyboard device, with three exceptions: `initialFocus` or `data-autofocus` on
 *   its Cancel button focuses that Cancel; `autoFocus={false}` focuses the first focusable
 *   element, which may be the Cancel (in both, Space would cancel); and on a `(pointer: coarse)`
 *   device it moves no focus at all, so the host has to move it.
 * - An inline host moves focus off the control that started the wait. Browsers keep focus on a
 *   clicked button, and Space would press it a second time.
 * LoadingOverlay as it stands does neither (it only paints over the page), so it needs this
 * before it can host the dino.
 */
function DinoLoader({
  interactive = false,
  message,
  hintText,
  gameOverText,
  armAfterMs = ARM_AFTER_MS,
  scale = PIXEL_SCALE,
  maxWidth = DEFAULT_MAX_WIDTH,
}: DinoLoaderProps) {
  const reduceMotion = useMediaQuery('(prefers-reduced-motion: reduce)');
  const theme = useUIStore(state => state.theme);

  const wrapRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const loopRef = useRef<DinoLoop | null>(null);

  const [phase, setPhase] = useState<DinoPhase>('ambient');
  const [width, setWidth] = useState(() =>
    typeof window === 'undefined' ? maxWidth : measureWidth(maxWidth),
  );

  useEffect(() => {
    const onResize = () => setWidth(measureWidth(maxWidth));
    onResize();
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, [maxWidth]);

  // The render loop. Rebuilt when the theme, size or arm delay changes; never by a phase update,
  // which is why the loop lives in a ref and only the phase is mirrored into React.
  useEffect(() => {
    if (reduceMotion) return;
    const canvas = canvasRef.current;
    if (!canvas) return;

    const loop = startDinoLoop({
      canvas,
      width,
      theme: theme === 'dark' ? 'dark' : 'light',
      scale,
      armAfterMs,
      onPhaseChange: setPhase,
    });
    if (!loop) return; // no 2D context — tests cover dinoGame instead

    loopRef.current = loop;
    return () => {
      loop.stop();
      loopRef.current = null;
    };
  }, [reduceMotion, theme, width, armAfterMs, scale]);

  // Input. Bound only while the overlay is mounted, so there is no "is it visible" check to get
  // wrong. Escape is deliberately untouched — ConfirmDialog owns it in the capture phase.
  useEffect(() => {
    if (!interactive || reduceMotion) return;
    const wrap = wrapRef.current;

    // Before the game arms, the input is not touched at all: nothing behind the overlay should
    // lose a keystroke, and the page should still scroll normally.
    const armed = () => {
      const current = loopRef.current?.phase();
      return current !== undefined && current !== 'ambient';
    };

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.code !== 'Space' && event.code !== 'ArrowUp') return;
      if (!armed()) return;
      // A widget that is not in keyBelongsToFocus's list may still have used the key already.
      if (event.defaultPrevented) return;
      // A focused control keeps its keys; see the keyboard contract above.
      if (keyBelongsToFocus(event.target)) return;
      // Held keys too, or a held Space scrolls whatever is behind. Only the first press jumps.
      event.preventDefault();
      if (event.repeat) return;
      loopRef.current?.jump();
    };

    const onPointerDown = (event: PointerEvent) => {
      if (!armed()) return;
      event.preventDefault();
      loopRef.current?.jump();
    };

    document.addEventListener('keydown', onKeyDown);
    wrap?.addEventListener('pointerdown', onPointerDown);
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      wrap?.removeEventListener('pointerdown', onPointerDown);
    };
  }, [interactive, reduceMotion]);

  if (reduceMotion) {
    return <LoadingSpinner size="lg" variant="default" text={message} />;
  }

  const hint = phase === 'armed' ? hintText : phase === 'gameOver' ? gameOverText : '';

  return (
    <div className="flex flex-col items-center">
      {/* aria-hidden sits on the wrapper rather than role="presentation" on the canvas: canvas
          counts as an interactive element, so the role trips jsx-a11y and buys nothing here. */}
      <div ref={wrapRef} aria-hidden="true" className="touch-none select-none">
        <canvas ref={canvasRef} style={{ imageRendering: 'pixelated' }} />
      </div>
      {message ? (
        <p className="mt-2 text-center text-sm font-semibold text-base-content/80">{message}</p>
      ) : null}
      {/* Height reserved so the card does not jump when the hint appears. aria-hidden keeps the
          score and hint out of the overlay's live region. */}
      <div aria-hidden="true" className="mt-1 h-4 text-xs font-medium text-primary">
        {interactive ? hint : ''}
      </div>
    </div>
  );
}

export default DinoLoader;
