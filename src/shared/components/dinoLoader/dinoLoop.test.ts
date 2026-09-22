import { describe, it, expect } from 'vitest';
import { startDinoLoop } from './dinoLoop';
import { getSessionBest } from './dinoGame';
import type { DinoPhase } from './dinoGame';

/** Just enough of a canvas and a window for the loop to start. No frame ever runs. */
const stubs = () => {
  const ctx = {
    fillStyle: '',
    imageSmoothingEnabled: true,
    setTransform: () => {},
    clearRect: () => {},
    fillRect: () => {},
    drawImage: () => {},
  };
  const canvas = {
    getContext: () => ctx,
    style: {},
    width: 0,
    height: 0,
  } as unknown as HTMLCanvasElement;
  const view = {
    devicePixelRatio: 1,
    requestAnimationFrame: () => 1,
    cancelAnimationFrame: () => {},
    document: { hidden: false, addEventListener: () => {}, removeEventListener: () => {} },
  } as unknown as Window;
  return { canvas, view };
};

describe('startDinoLoop', () => {
  // A resize or theme change stops the loop and starts a fresh game in 'ambient'. Callers drive
  // their hint from onPhaseChange, so the new game has to announce itself — otherwise "Press
  // Space to jump" stays up over a dino that ignores Space for the next five seconds.
  it('reports the starting phase, so a restarted game resets the hint', () => {
    const { canvas, view } = stubs();
    const phases: DinoPhase[] = [];
    const loop = startDinoLoop({
      canvas,
      width: 300,
      theme: 'light',
      view,
      onPhaseChange: phase => phases.push(phase),
    });
    expect(loop).not.toBeNull();
    expect(phases).toEqual(['ambient']);
    loop?.stop();
  });
});

describe('startDinoLoop session best', () => {
  // The loading tab and the overlay stop the loop the moment the wait is over, usually mid-run.
  it('saves a run still in progress when it is stopped', () => {
    const { canvas, view } = stubs();
    let frame: FrameRequestCallback | null = null;
    view.requestAnimationFrame = callback => {
      frame = callback;
      return 1;
    };
    // Wide enough that no obstacle spawns during the test, so the run cannot end in a crash.
    const loop = startDinoLoop({ canvas, width: 6000, theme: 'light', view });
    let now = 0;
    const advance = (ms: number) => {
      for (const end = now + ms; now < end; ) {
        now += 1000 / 60;
        frame?.(now);
      }
    };

    advance(5200); // past the arm delay
    loop?.jump(); // start playing
    advance(2000); // about 20 points
    expect(loop?.phase()).toBe('playing');

    const before = getSessionBest();
    loop?.stop();
    expect(getSessionBest()).toBeGreaterThan(before);
    expect(getSessionBest()).toBeGreaterThanOrEqual(15);
  });
});
